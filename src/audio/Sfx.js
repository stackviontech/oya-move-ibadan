// =============================================================================
// Sfx.js — every sound in the game is synthesised live with the Web Audio API,
// so there are no audio files to download.
//
// Browsers only allow audio after the player taps/clicks something, so call
// Sfx.unlock() from a click handler (the Play button does this).
// =============================================================================
import { load, save } from '../utils/storage.js';

class SfxEngine {
  constructor() {
    this.ctx = null; // AudioContext, created on first unlock()
    this.master = null; // master volume node (mute = volume 0)
    this.noiseBuffer = null; // 1 second of white noise, reused for crashes
    this.engine = null; // looping engine hum {osc, gain, filter}
    this.muted = load('muted', false);
  }

  /** Create / resume the audio context. Must be called from a user gesture. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this._makeNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null; // audio not available — game still works silently
    }
  }

  get ready() {
    return !!this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    save('muted', muted);
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------------------------------------------------------------------------
  // Building blocks
  // ---------------------------------------------------------------------------

  _makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Play a single oscillator note with a quick attack/decay envelope. */
  _tone({ type = 'square', freq = 440, freqEnd = null, start = 0, dur = 0.2, vol = 0.2, filter = null }) {
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Play a burst of filtered noise (crashes, bumps). */
  _noise({ start = 0, dur = 0.3, vol = 0.3, filterFrom = 3000, filterTo = 200 }) {
    const t0 = this.ctx.currentTime + start;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFrom, t0);
    f.frequency.exponentialRampToValueAtTime(filterTo, t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // ---------------------------------------------------------------------------
  // Game sounds — each is guarded so a missing AudioContext never crashes.
  // ---------------------------------------------------------------------------

  /** Car horn: two slightly out-of-tune square waves = that classic "paaam". */
  horn() {
    if (!this.ready) return;
    this._tone({ type: 'square', freq: 392, dur: 0.32, vol: 0.12, filter: 1800 });
    this._tone({ type: 'square', freq: 494, dur: 0.32, vol: 0.1, filter: 1800 });
  }

  /** Short, higher beep from an AI car or okada. */
  aiHorn() {
    if (!this.ready) return;
    this._tone({ type: 'square', freq: 620, dur: 0.12, vol: 0.05, filter: 2500 });
    this._tone({ type: 'square', freq: 620, start: 0.16, dur: 0.12, vol: 0.05, filter: 2500 });
  }

  crash() {
    if (!this.ready) return;
    this._noise({ dur: 0.4, vol: 0.45, filterFrom: 4000, filterTo: 150 });
    this._tone({ type: 'sine', freq: 140, freqEnd: 40, dur: 0.3, vol: 0.35 });
  }

  pothole() {
    if (!this.ready) return;
    this._tone({ type: 'sine', freq: 110, freqEnd: 45, dur: 0.22, vol: 0.4 });
    this._noise({ dur: 0.15, vol: 0.2, filterFrom: 900, filterTo: 100 });
  }

  checkpoint() {
    if (!this.ready) return;
    [523, 659, 784].forEach((f, i) => this._tone({ type: 'triangle', freq: f, start: i * 0.09, dur: 0.22, vol: 0.2 }));
  }

  win() {
    if (!this.ready) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      this._tone({ type: 'triangle', freq: f, start: i * 0.12, dur: 0.25, vol: 0.2 })
    );
  }

  lose() {
    if (!this.ready) return;
    [392, 330, 262, 196].forEach((f, i) => this._tone({ type: 'sawtooth', freq: f, start: i * 0.18, dur: 0.3, vol: 0.1, filter: 1200 }));
  }

  /** Money collected: a bright "ka-ching". */
  cash() {
    if (!this.ready) return;
    this._noise({ dur: 0.05, vol: 0.12, filterFrom: 6000, filterTo: 3000 });
    this._tone({ type: 'triangle', freq: 1319, start: 0.04, dur: 0.12, vol: 0.18 });
    this._tone({ type: 'triangle', freq: 1760, start: 0.12, dur: 0.25, vol: 0.18 });
  }

  /** Passenger climbs in: a soft door thunk. */
  door() {
    if (!this.ready) return;
    this._tone({ type: 'sine', freq: 180, freqEnd: 90, dur: 0.12, vol: 0.3 });
    this._noise({ dur: 0.06, vol: 0.12, filterFrom: 1200, filterTo: 300 });
  }

  tick() {
    if (!this.ready) return;
    this._tone({ type: 'square', freq: 880, dur: 0.06, vol: 0.06, filter: 3000 });
  }

  click() {
    if (!this.ready) return;
    this._tone({ type: 'triangle', freq: 660, freqEnd: 990, dur: 0.08, vol: 0.15 });
  }

  // ---------------------------------------------------------------------------
  // Engine hum: one low oscillator whose pitch follows the car speed.
  // ---------------------------------------------------------------------------

  startEngine() {
    if (!this.ready || this.engine) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 45;
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 0.3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engine = { osc, gain, filter };
  }

  /** speed01: 0 (idle) … 1 (top speed) */
  updateEngine(speed01) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.osc.frequency.setTargetAtTime(42 + speed01 * 70, t, 0.1);
    this.engine.filter.frequency.setTargetAtTime(260 + speed01 * 500, t, 0.1);
  }

  stopEngine() {
    if (!this.engine) return;
    const { osc, gain } = this.engine;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0.0001, t, 0.08);
    osc.stop(t + 0.4);
    this.engine = null;
  }
}

// One shared instance for the whole game.
export const Sfx = new SfxEngine();
