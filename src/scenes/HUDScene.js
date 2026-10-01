// =============================================================================
// HUDScene — the heads-up display drawn ON TOP of the game: timer, current
// area, next checkpoint, route progress, speed, popups and touch controls.
//
// It runs as a separate scene so camera shake in the game doesn't shake the
// HUD. It reads the numbers from GameScene.state every frame.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH, TIME } from '../config/gameConfig.js';
import { MuteButton } from '../ui/MuteButton.js';
import { PauseButton } from '../ui/PauseButton.js';
import { PopupManager } from '../ui/Popup.js';
import { TouchControls } from '../ui/TouchControls.js';
import { formatTime } from '../utils/helpers.js';
import { naira } from '../systems/Career.js';
import { NEGOTIATION } from '../config/work.js';
import { MESSAGES, pickLine } from '../config/messages.js';
import { Button } from '../ui/Button.js';

const METERS_PER_PX = 0.5; // for the "Next: Dugbe · 1.2 km" display

export class HUDScene extends Phaser.Scene {
  constructor() {
    super('HUD');
  }

  init(data) {
    this.gs = data.gameScene; // the running GameScene
  }

  create() {
    const W = GAME_WIDTH;
    const gs = this.gs;
    this.last = {}; // last text values, so we only re-render text when it changes
    this.bonusY = 44; // where "+16s" / "+₦700" flashes appear

    // --- top panel -----------------------------------------------------------
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.55);
    panel.fillRoundedRect(8, 8, W - 16, 112, 16);

    this.add.text(24, 16, 'TIME', { fontFamily: FONT_BOLD, fontSize: '13px', color: COLORS.accent });
    this.timerText = this.add.text(22, 30, '0:00', {
      fontFamily: FONT_BOLD,
      fontSize: '44px',
      color: COLORS.hud,
    });
    this.bonusText = this.add
      .text(130, 44, '', { fontFamily: FONT_BOLD, fontSize: '22px', color: COLORS.good, stroke: '#000', strokeThickness: 4 })
      .setAlpha(0);

    this.areaText = this.add
      .text(W / 2 + 20, 38, '', { fontFamily: FONT_BOLD, fontSize: '26px', color: COLORS.accent })
      .setOrigin(0.5);
    this.nextText = this.add
      .text(W / 2 + 20, 70, '', { fontFamily: FONT, fontSize: '17px', color: COLORS.hud })
      .setOrigin(0.5);

    new MuteButton(this, W - 44, 50, 38);
    this.pauseBtn = new PauseButton(this, W - 96, 50, 38, () => gs.pauseGame());

    // --- route progress bar with a dot for every checkpoint ------------------
    this.barX0 = 26;
    this.barX1 = W - 26;
    this.barY = 100;
    const bar = this.add.graphics();
    bar.fillStyle(0xffffff, 0.25);
    bar.fillRoundedRect(this.barX0, this.barY - 3, this.barX1 - this.barX0, 6, 3);
    for (const area of gs.model.areas) {
      if (area.start > gs.model.finishDistance) continue;
      const x = this.progressX(area.start);
      bar.fillStyle(area.finish ? 0xffffff : 0xf5c400);
      bar.fillCircle(x, this.barY, area.finish ? 6 : 4.5);
    }
    this.marker = this.add.graphics();
    this.marker.fillStyle(0x000000);
    this.marker.fillRoundedRect(-7, -11, 14, 22, 4);
    this.marker.fillStyle(0xf7c600);
    this.marker.fillRoundedRect(-5.5, -9.5, 11, 19, 3);
    this.marker.setPosition(this.barX0, this.barY);

    // --- speedometer badge -----------------------------------------------------
    const sp = this.add.graphics();
    sp.fillStyle(0x000000, 0.55);
    sp.fillRoundedRect(W - 128, 128, 120, 50, 14);
    this.speedText = this.add.text(W - 76, 153, '0', { fontFamily: FONT_BOLD, fontSize: '30px', color: COLORS.hud }).setOrigin(1, 0.5);
    this.add.text(W - 72, 158, 'km/h', { fontFamily: FONT, fontSize: '15px', color: COLORS.hud }).setOrigin(0, 0.5);
    this.speedBar = this.add.graphics();

    // --- work mode extras: smaller clock text and a seats badge -----------------
    this.work = gs.state.mode === 'work';
    if (this.work) {
      this.timerText.setFontSize(30).setY(36);
      this.bonusText.setX(172); // money flashes appear next to the seats badge
      this.bonusY = 140;
      this.areaText.setFontSize(24);
      const sb = this.add.graphics();
      sb.fillStyle(0x000000, 0.55);
      sb.fillRoundedRect(8, 128, 150, 50, 14);
      this.add.text(20, 134, 'SEATS', { fontFamily: FONT_BOLD, fontSize: '12px', color: COLORS.accent });
      this.seatDots = this.add.graphics();
      this.buildHaggle();
    }

    // --- popups + touch controls ------------------------------------------------
    this.popups = new PopupManager(this, W / 2, GAME_HEIGHT * 0.36);
    if (gs.useTouch) this.touch = new TouchControls(this, gs.touchInput);

    // --- listen to the game --------------------------------------------------------
    const onPopup = (text, opts) => this.popups.show(text, opts);
    const onBonus = (text, color) => this.flashBonus(text, color);
    const onEnd = () => {
      if (this.touch) this.touch.setVisible(false);
      this.pauseBtn.setVisible(false);
      if (this.haggle) this.haggle.setVisible(false);
    };
    gs.events.on('hud-popup', onPopup);
    gs.events.on('hud-bonus', onBonus);
    gs.events.on('game-end', onEnd);
    // fare haggling (work mode)
    const onNegotiate = (n) => this.showHaggle(n);
    const onCounter = (n) => this.showCounter(n);
    const onHaggleEnd = () => this.haggle && this.haggle.setVisible(false);
    gs.events.on('pax-negotiate', onNegotiate);
    gs.events.on('pax-counter', onCounter);
    gs.events.on('pax-negotiate-end', onHaggleEnd);
    this.events.once('shutdown', () => {
      gs.events.off('hud-popup', onPopup);
      gs.events.off('hud-bonus', onBonus);
      gs.events.off('game-end', onEnd);
      gs.events.off('pax-negotiate', onNegotiate);
      gs.events.off('pax-counter', onCounter);
      gs.events.off('pax-negotiate-end', onHaggleEnd);
    });
  }

  // ---------------------------------------------------------------------------
  // Fare haggling panel (work mode)
  // ---------------------------------------------------------------------------
  buildHaggle() {
    const W = GAME_WIDTH;
    // Sits just above your car, below the popup messages.
    this.haggle = this.add.container(W / 2, 470).setDepth(45).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(-236, -78, 476, 168, 18);
    bg.fillStyle(0xfff8e7);
    bg.fillRoundedRect(-240, -84, 476, 168, 18);
    bg.fillTriangle(150, 84, 190, 84, 200, 110); // speech-bubble tail towards the kerb
    this.haggleText = this.add
      .text(0, -50, '', { fontFamily: FONT_BOLD, fontSize: '22px', color: '#1d1a16', align: 'center', wordWrap: { width: 440 } })
      .setOrigin(0.5);
    this.haggleBar = this.add.graphics();
    this.haggle.add([bg, this.haggleText, this.haggleBar]);
    const colors = [0x2e8b57, 0xf5c400, 0xe0662d];
    this.haggleBtns = [1, 2, 3].map((i) => {
      const b = new Button(this, (i - 2) * 152, 14, '', {
        width: 144,
        height: 56,
        fontSize: 20,
        color: colors[i - 1],
        textColor: i === 2 ? '#1d1a16' : '#ffffff',
        onClick: () => this.pickHaggle(i),
      });
      this.haggle.add(b);
      return b;
    });
    this.haggleHint = this.add
      .text(0, 62, '', { fontFamily: FONT, fontSize: '14px', color: '#6b5f50' })
      .setOrigin(0.5);
    this.haggle.add(this.haggleHint);
    // keyboard: 1 / 2 / 3
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pickHaggle(i + 1)));
  }

  pickHaggle(i) {
    const pax = this.gs.pax;
    if (!this.haggle.visible || !pax || !pax.negotiation) return;
    if (pax.negotiation.stage === 'counter' && i === 3) return;
    pax.choose(i);
  }

  showHaggle(n) {
    this.haggleText.setText(pickLine(MESSAGES.work.offer, { stop: n.stop, price: naira(n.offer) }));
    this.haggleBtns[0].setLabel(`OK ${naira(n.offer)}`).setVisible(true);
    this.haggleBtns[1].setLabel(naira(n.fair)).setVisible(true);
    this.haggleBtns[2].setLabel(naira(n.high)).setVisible(true);
    this.haggleHint.setText(this.gs.useTouch ? 'Their price · Normal · Ask more' : 'Keys: 1 their price · 2 normal · 3 ask more');
    this.haggle.setVisible(true).setScale(0.8);
    this.tweens.add({ targets: this.haggle, scale: 1, duration: 150, ease: 'Back.Out' });
  }

  showCounter(n) {
    this.haggleText.setText(pickLine(MESSAGES.work.counter, { counter: naira(n.counter) }));
    this.haggleBtns[0].setLabel(`OK ${naira(n.counter)}`);
    this.haggleBtns[1].setLabel('NO');
    this.haggleBtns[2].setVisible(false);
    this.haggleHint.setText(this.gs.useTouch ? 'Accept or refuse' : 'Keys: 1 accept · 2 refuse');
  }

  progressX(d) {
    const t = Phaser.Math.Clamp(d / this.gs.model.finishDistance, 0, 1);
    return this.barX0 + (this.barX1 - this.barX0) * t;
  }

  /** "+16s" / "-3s" next to the timer. */
  flashBonus(text, color) {
    this.tweens.killTweensOf(this.bonusText);
    this.bonusText.setText(text).setColor(color).setAlpha(1).setY(this.bonusY);
    this.tweens.add({ targets: this.bonusText, alpha: 0, y: this.bonusY - 14, delay: 700, duration: 500 });
    if (color === COLORS.danger) {
      this.tweens.add({ targets: this.timerText, x: 28, yoyo: true, repeat: 3, duration: 40, onComplete: () => this.timerText.setX(22) });
    }
  }

  /** Only call setText when the string actually changed (text re-rendering is costly). */
  setIfChanged(key, textObj, value) {
    if (this.last[key] !== value) {
      this.last[key] = value;
      textObj.setText(value);
    }
  }

  update(time) {
    const s = this.gs.state;
    if (this.touch && !s.over) this.touch.update();

    if (this.work) {
      this.updateWork(s);
    } else {
      // Timer (turns red and pulses when time is short)
      this.setIfChanged('timer', this.timerText, formatTime(Math.ceil(s.timeLeft)));
      const low = s.timeLeft < TIME.lowTimeWarning && !s.over;
      this.timerText.setColor(low ? COLORS.danger : COLORS.hud);
      this.timerText.setScale(low ? 1 + Math.abs(Math.sin(time / 180)) * 0.08 : 1);

      this.setIfChanged('area', this.areaText, s.areaName.toUpperCase());
      let next = 'Final stretch!';
      if (s.nextName) {
        const m = Math.max(0, s.nextDist * METERS_PER_PX);
        const dist = m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 50) * 50} m`;
        next = `Next: ${s.nextName} · ${dist}`;
      }
      this.setIfChanged('next', this.nextText, next);
    }

    this.setIfChanged('speed', this.speedText, String(s.speedKmh));
    this.speedBar.clear();
    this.speedBar.fillStyle(s.speedKmh > 70 ? 0xff7a3d : 0x7ee07a);
    this.speedBar.fillRect(GAME_WIDTH - 118, 170, 100 * s.speed01, 4);

    this.marker.x = this.progressX(s.distance);
  }

  /** Work mode panel: clock, money vs Oga's money, next stop, seats. */
  updateWork(s) {
    this.setIfChanged('timer', this.timerText, s.clockText);
    const money = s.target > 0 ? `${naira(s.earned)} / ${naira(s.target)}` : `${naira(s.earned)} today`;
    this.setIfChanged('area', this.areaText, money);
    this.areaText.setColor(s.target > 0 && s.earned >= s.target ? COLORS.good : s.earned < 0 ? COLORS.danger : COLORS.accent);

    let next = 'Terminus!';
    if (s.nextName) next = s.nextDrop > 0 ? `Next: ${s.nextName} · ${s.nextDrop} dey drop` : `Next stop: ${s.nextName}`;
    this.setIfChanged('next', this.nextText, next);

    // patience bar under the haggling bubble
    const n = this.gs.pax && this.gs.pax.negotiation;
    if (n && this.haggle.visible) {
      const f = Math.max(0, n.patience / NEGOTIATION.patience);
      this.haggleBar.clear();
      this.haggleBar.fillStyle(f > 0.35 ? 0x2e8b57 : 0xd83a2e);
      this.haggleBar.fillRoundedRect(-220, 74, 440 * f, 5, 2);
    }

    // seat dots: filled = passenger inside
    if (this.last.seats !== s.seatsUsed) {
      this.last.seats = s.seatsUsed;
      const g = this.seatDots;
      g.clear();
      for (let i = 0; i < s.seats; i++) {
        const x = 26 + i * 25;
        g.fillStyle(i < s.seatsUsed ? 0xf5c400 : 0xffffff, i < s.seatsUsed ? 1 : 0.25);
        g.fillCircle(x, 162, 9);
      }
    }
  }
}
