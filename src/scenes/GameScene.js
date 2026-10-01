// =============================================================================
// GameScene — where the driving happens.
//
// Each frame:  read input → move car → move camera → paint road chunks →
//              update traffic → check crashes/potholes → checkpoints → timer
// The HUD is a separate scene (HUDScene) that reads `this.state`.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, PLAYER, SPEED_TO_KMH, TIME } from '../config/gameConfig.js';
import { DEFAULT_ROUTE_ID, ROUTES } from '../config/route.js';
import { MESSAGES, pickLine } from '../config/messages.js';
import { RoadModel } from '../systems/RoadModel.js';
import { RoadRenderer } from '../systems/RoadRenderer.js';
import { TrafficManager } from '../systems/TrafficManager.js';
import { createSignboards, cullSignboards } from '../systems/Signboards.js';
import { Player } from '../entities/Player.js';
import { WorldText } from '../ui/WorldText.js';
import { Sfx } from '../audio/Sfx.js';
import { load, save } from '../utils/storage.js';
import { formatTime, isTouchDevice } from '../utils/helpers.js';

export const START_D = -330; // your car starts a little before the first junction
const NO_INPUT = { up: false, down: false, left: false, right: false, horn: false };

export class GameScene extends Phaser.Scene {
  // WorkScene (work mode) extends this class and overrides the "mode hooks"
  // marked below: getRoute, createPlayer, createState, onCreated,
  // checkCheckpoints, updateTimer, applyCrashPenalty, finish, showResults.
  constructor(key = 'Game') {
    super(key);
    this.mode = 'race';
  }

  init(data) {
    this.routeId = (data && data.routeId) || DEFAULT_ROUTE_ID;
  }

  /** Mode hook: which route to drive. */
  getRoute() {
    return ROUTES[this.routeId];
  }

  /** Mode hook: the vehicle you drive. */
  createPlayer() {
    return new Player(this, this.model, START_D);
  }

  /** Mode hook: the numbers the HUD shows (race mode: countdown timer). */
  createState() {
    return {
      mode: 'race',
      timeLeft: this.route.startTime,
      elapsed: 0,
      nextName: this.model.areas[1].name,
      nextDist: 0,
      won: false,
    };
  }

  /** Mode hook: runs at the end of create(). */
  onCreated() {
    this.time.delayedCall(300, () => this.popup(pickLine(MESSAGES.start), { color: COLORS.accent, size: 36 }));
  }

  create() {
    this.route = this.getRoute();
    this.model = new RoadModel(this.route);
    this.road = new RoadRenderer(this, this.model);

    // Touch controls on phones/tablets (or force them with ?touch=1 in the URL).
    this.useTouch = isTouchDevice() || new URLSearchParams(window.location.search).has('touch');
    this.touchInput = { left: false, right: false, up: false, down: false, horn: false };
    this.inputState = { up: false, down: false, left: false, right: false, horn: false };
    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE');

    this.player = this.createPlayer();
    this.traffic = new TrafficManager(this, this.model);
    this.traffic.setPlayer(this.player);
    this.signboards = createSignboards(this, this.model);
    this.worldText = new WorldText(this);
    this.hornRing = this.add.circle(0, 0, 34).setStrokeStyle(4, 0xf5c400).setDepth(7).setVisible(false);

    // Game state (the HUD reads this): shared fields + the mode's own fields.
    this.state = {
      distance: 0,
      areaName: this.model.areas[0].name,
      speedKmh: 0,
      speed01: 0,
      over: false,
      ...this.createState(),
    };
    this.stats = { crashes: 0, potholes: 0 };
    this.nextCheckpoint = 1; // index of the next area junction to reach
    this.lastCheckpointName = this.model.areas[0].name;
    this.prevHorn = false;
    this.nextHornAt = 0;
    this.lastMsg = { horn: 0, pothole: 0, shout: 0, honk: 0 };
    this.lowTimeWarned = false;
    this.lastTick = -1;
    this.outroTimer = 0;
    this.resultsShown = false;
    this.paused = false;

    // Camera: your car sits in the lower part of the screen so you see ahead.
    this.screenY = this.useTouch ? PLAYER.screenYTouch : PLAYER.screenY;
    const cam = this.cameras.main;
    cam.scrollY = this.player.y - GAME_HEIGHT * this.screenY;
    cam.fadeIn(300, 29, 26, 22);
    this.road.update(cam.scrollY, cam.scrollY + GAME_HEIGHT);
    this.traffic.prefill(this.player.d + 280, -cam.scrollY + 450);

    this.scene.launch('HUD', { gameScene: this });

    this.events.on('taxi-stop', this.onTaxiStop, this);
    this.events.on('ai-honk', this.onAiHonk, this);
    this.events.once('shutdown', this.cleanup, this);

    // Pause: P or Esc, or automatically when the tab/app goes into the background.
    this.input.keyboard.on('keydown-P', this.pauseGame, this);
    this.input.keyboard.on('keydown-ESC', this.pauseGame, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseGame, this);

    Sfx.startEngine();
    this.onCreated();
  }

  cleanup() {
    this.events.off('taxi-stop', this.onTaxiStop, this);
    this.events.off('ai-honk', this.onAiHonk, this);
    this.input.keyboard.off('keydown-P', this.pauseGame, this);
    this.input.keyboard.off('keydown-ESC', this.pauseGame, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    Sfx.stopEngine();
    this.road.destroy();
    this.scene.stop('HUD');
  }

  // ---------------------------------------------------------------------------
  // Pause / resume
  // ---------------------------------------------------------------------------

  /** Freeze the game and HUD and show the pause menu. */
  pauseGame() {
    if (this.paused || this.state.over || !this.scene.isActive()) return;
    this.paused = true;
    Sfx.stopEngine();
    this.scene.launch('Pause', {
      gameScene: this,
      status: this.pauseStatus(),
      ...this.restartInfo(),
    });
    this.scene.pause('HUD');
    this.scene.pause();
  }

  /** Mode hook: what the pause screen's restart button says and does. */
  restartInfo() {
    return { restartLabel: 'RESTART', restartData: { routeId: this.routeId } };
  }

  /** Mode hook: the little status line on the pause screen. */
  pauseStatus() {
    return `${formatTime(Math.ceil(this.state.timeLeft))} left  ·  ${this.state.areaName}`;
  }

  /** Called by PauseScene's Resume button. */
  resumeGame() {
    this.paused = false;
    // Keys released while paused never reached us, so clear them to avoid a
    // "stuck" accelerator or steering after resuming.
    this.input.keyboard.resetKeys();
    for (const k in this.touchInput) this.touchInput[k] = false;
    this.prevHorn = false;
    this.scene.resume('HUD');
    this.scene.resume();
    Sfx.startEngine();
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05); // cap so a lag spike can't teleport the car

    if (this.state.over) {
      this.updateOutro(dt);
      return;
    }

    const input = this.readInput();
    this.player.step(dt, input);
    if (input.horn && !this.prevHorn) this.honk();
    this.prevHorn = input.horn;

    this.followCamera();
    this.traffic.update(dt, this.cameras.main.scrollY, this.cameras.main.scrollY + GAME_HEIGHT);
    this.checkCollisions();
    this.checkCheckpoints(dt);
    if (!this.state.over) this.updateTimer(dt);
    this.updateState();
    Sfx.updateEngine(this.player.speed / this.player.stats.maxSpeed);
  }

  readInput() {
    const k = this.keys;
    const t = this.touchInput;
    const s = this.inputState;
    s.up = k.UP.isDown || k.W.isDown || t.up;
    s.down = k.DOWN.isDown || k.S.isDown || t.down;
    s.left = k.LEFT.isDown || k.A.isDown || t.left;
    s.right = k.RIGHT.isDown || k.D.isDown || t.right;
    s.horn = k.SPACE.isDown || t.horn;
    return s;
  }

  followCamera() {
    const cam = this.cameras.main;
    cam.scrollY = this.player.y - GAME_HEIGHT * this.screenY;
    this.road.update(cam.scrollY, cam.scrollY + GAME_HEIGHT);
    cullSignboards(this.signboards, cam.scrollY, cam.scrollY + GAME_HEIGHT);
  }

  updateState() {
    const s = this.state;
    const p = this.player;
    s.distance = Math.max(0, p.d);
    s.areaName = this.model.areaAt(p.d).name;
    const next = this.model.areas[this.nextCheckpoint];
    s.nextName = next ? next.name : null;
    s.nextDist = next ? next.start - p.d : 0;
    s.speedKmh = Math.round(p.speed * SPEED_TO_KMH);
    s.speed01 = p.speed / p.stats.maxSpeed;
  }

  // ---------------------------------------------------------------------------
  // Horn
  // ---------------------------------------------------------------------------
  honk() {
    const now = this.time.now;
    if (now < this.nextHornAt) return;
    this.nextHornAt = now + PLAYER.hornCooldown * 1000;
    Sfx.horn();

    const p = this.player;
    this.tweens.killTweensOf(this.hornRing);
    this.hornRing.setPosition(p.x, p.y - p.halfH).setScale(0.6).setAlpha(1).setVisible(true);
    this.tweens.add({ targets: this.hornRing, scale: 3.2, alpha: 0, duration: 450, onComplete: () => this.hornRing.setVisible(false) });

    const moved = this.traffic.onHorn(p, PLAYER.hornRadius);
    if (now - this.lastMsg.horn > 2500) {
      if (moved > 0) {
        this.lastMsg.horn = now;
        this.worldText.show(p.x, p.y - 80, pickLine(MESSAGES.hornOkada), COLORS.accent, 18);
      } else if (Math.random() < 0.35) {
        this.lastMsg.horn = now;
        this.worldText.show(p.x, p.y - 80, pickLine(MESSAGES.horn), COLORS.accent, 18);
      }
    }
  }

  onTaxiStop(taxi) {
    const cam = this.cameras.main;
    const now = this.time.now;
    const onScreen = taxi.y > cam.scrollY + 60 && taxi.y < cam.scrollY + GAME_HEIGHT - 60;
    if (onScreen && now - this.lastMsg.shout > 2500) {
      this.lastMsg.shout = now;
      this.worldText.show(taxi.x, taxi.y - 60, pickLine(MESSAGES.taxiStop), '#fff8e7', 15);
    }
  }

  onAiHonk(vehicle) {
    Sfx.aiHorn();
    const now = this.time.now;
    if (now - this.lastMsg.honk > 3000) {
      this.lastMsg.honk = now;
      this.worldText.show(vehicle.x, vehicle.y + 10, pickLine(MESSAGES.aiHonk), '#ffd6d0', 15);
    }
  }

  // ---------------------------------------------------------------------------
  // Collisions (simple box-vs-box checks — cheap and good enough here)
  // ---------------------------------------------------------------------------
  overlaps(a, b) {
    return Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.y - b.y) < a.halfH + b.halfH;
  }

  /**
   * Was this a real crash, or just a gentle nudge? Creeping into the back of
   * a stopped taxi shouldn't cost you 3 seconds every second.
   */
  isHardHit(other) {
    const p = this.player;
    // Stopped or crawling straight (e.g. loading passengers)? Then whoever
    // hits you is at fault — no penalty for you.
    if (p.speed < 60 && Math.abs(p.lateralV) < 100) return false;
    return Math.abs(p.speed - (other.speed || 0)) > 80 || Math.abs(p.lateralV) > 140;
  }

  checkCollisions() {
    const p = this.player;
    for (const v of this.traffic.vehicles) {
      if (v.active && this.overlaps(p, v)) {
        const hard = this.isHardHit(v);
        this.separate(v, true);
        if (hard && !p.invulnerable) this.crash('crashVehicle', v.x, v.y);
      }
    }
    for (const o of this.traffic.obstacles.items) {
      if (o.active && this.overlaps(p, o)) {
        const hard = this.isHardHit(o);
        this.separate(o, false);
        if (hard && !p.invulnerable) this.crash('crashObstacle', o.x, o.y);
      }
    }
    for (const ped of this.traffic.peds.items) {
      if (ped.active && !ped.fleeing && this.overlaps(p, ped)) {
        ped.flee(); // they always jump clear
        if (p.speed > 50 && !p.invulnerable) this.crash('crashPerson', ped.x, ped.y);
      }
    }
    for (const hole of this.traffic.potholes.items) {
      if (hole.active && !hole.hit && this.overlaps(p, hole)) this.hitPothole(hole);
    }
  }

  /** Push your car and the thing it hit apart so they don't stay overlapped. */
  separate(other, movable) {
    const p = this.player;
    const penX = p.halfW + other.halfW - Math.abs(p.x - other.x);
    const penY = p.halfH + other.halfH - Math.abs(p.y - other.y);
    if (penY < penX) {
      // front / back collision
      if (p.d < other.d) {
        p.d -= penY + 1;
        p.speed = Math.min(p.speed, (other.speed || 0) * 0.8);
        if (movable) other.bump(6);
      } else if (movable) {
        other.d -= penY + 1; // they drove into the back of us
        other.speed = Math.min(other.speed, p.speed * 0.8);
      }
      p.y = -p.d;
    } else {
      // side swipe: shove sideways
      const dir = Math.sign(p.x - other.x) || 1;
      p.x += dir * penX * (movable ? 0.7 : 1);
      p.lateralV = dir * 90;
      if (movable) {
        other.offset -= dir * penX * 0.3;
        other.targetOffset = other.offset;
      }
    }
  }

  crash(kind, x, y) {
    this.player.crash();
    this.stats.crashes++;
    this.cameras.main.shake(180, 0.008);
    Sfx.crash();
    this.popup(pickLine(MESSAGES[kind]), { color: COLORS.danger, size: 30, duration: 1100 });
    this.applyCrashPenalty(x, y);
  }

  /** Mode hook: what a crash costs you (race mode: seconds off the clock). */
  applyCrashPenalty(x, y) {
    this.state.timeLeft -= TIME.crashPenalty;
    this.events.emit('hud-bonus', `-${TIME.crashPenalty}s`, COLORS.danger);
    this.worldText.show(x, y - 50, `-${TIME.crashPenalty}s`, COLORS.danger, 22);
  }

  hitPothole(hole) {
    hole.hit = true;
    this.stats.potholes++;
    this.player.hitPothole();
    this.cameras.main.shake(220, 0.005);
    Sfx.pothole();
    const now = this.time.now;
    if (now - this.lastMsg.pothole > 3500) {
      this.lastMsg.pothole = now;
      this.popup(pickLine(MESSAGES.pothole), { color: '#ffb347', size: 28, duration: 1000 });
    }
  }

  // ---------------------------------------------------------------------------
  // Checkpoints, timer, finish
  // ---------------------------------------------------------------------------
  /** Mode hook: race checkpoints (WorkScene uses this slot for bus stops). */
  checkCheckpoints() {
    const areas = this.model.areas;
    while (this.nextCheckpoint < areas.length && this.player.d >= areas[this.nextCheckpoint].start) {
      const a = areas[this.nextCheckpoint];
      this.nextCheckpoint++;
      this.lastCheckpointName = a.name;
      if (a.finish) {
        this.finish(true);
        return;
      }
      this.state.timeLeft += a.bonusTime;
      Sfx.checkpoint();
      const lines = MESSAGES.checkpoint[a.id] || MESSAGES.checkpoint.default;
      this.popup(`${pickLine(lines, { area: a.name })}\n+${a.bonusTime}s`, { color: COLORS.good, size: 34, duration: 1800 });
      this.events.emit('hud-bonus', `+${a.bonusTime}s`, COLORS.good);
    }
  }

  /** Mode hook: race countdown (WorkScene runs the day clock here). */
  updateTimer(dt) {
    const s = this.state;
    s.elapsed += dt;
    s.timeLeft -= dt;
    if (s.timeLeft < TIME.lowTimeWarning && !this.lowTimeWarned) {
      this.lowTimeWarned = true;
      this.popup(pickLine(MESSAGES.lowTime), { color: COLORS.danger, size: 30 });
    } else if (s.timeLeft > TIME.lowTimeWarning + 3) {
      this.lowTimeWarned = false;
    }
    const whole = Math.ceil(s.timeLeft);
    if (s.timeLeft <= 5 && whole !== this.lastTick) {
      this.lastTick = whole;
      Sfx.tick();
    }
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      this.finish(false);
    }
  }

  /** Mode hook: the run is over. */
  finish(won) {
    const s = this.state;
    if (s.over) return;
    s.over = true;
    s.won = won;
    if (won) s.timeLeft = Math.max(0, s.timeLeft);
    this.updateState();
    Sfx.stopEngine();
    if (won) Sfx.win();
    else Sfx.lose();
    this.events.emit('game-end', won);
    this.popup(won ? pickLine(MESSAGES.finish) : 'Time don finish!', { color: won ? COLORS.good : COLORS.danger, size: 40, duration: 1400 });
    this.outroTimer = 1.4; // let the car roll to a stop before the results
  }

  /** Short moment after the finish/timeout: the car rolls on, then results. */
  updateOutro(dt) {
    if (this.resultsShown) return;
    this.outroTimer -= dt;
    this.player.step(dt, this.state.won ? NO_INPUT : { ...NO_INPUT, down: true });
    this.followCamera();
    this.traffic.update(dt, this.cameras.main.scrollY, this.cameras.main.scrollY + GAME_HEIGHT);
    Sfx.updateEngine(0);
    if (this.outroTimer <= 0) this.showResults();
  }

  /** Mode hook: what appears after the short outro. */
  showResults() {
    this.resultsShown = true;
    const s = this.state;
    const time = s.elapsed;
    const stars = s.won ? (time <= this.route.stars.three ? 3 : time <= this.route.stars.two ? 2 : 1) : 0;

    // Save personal best (only for finished runs).
    const key = `best:${this.routeId}`;
    const best = load(key, null);
    let newBest = false;
    if (s.won && (!best || time < best.time)) {
      newBest = true;
      save(key, { time, stars });
    }

    this.scene.launch('GameOver', {
      routeId: this.routeId,
      won: s.won,
      time,
      stars,
      best: newBest ? { time, stars } : best,
      newBest,
      reached: this.lastCheckpointName,
      start: this.model.areas[0].name,
      finish: this.model.areas.find((a) => a.finish).name,
      crashes: this.stats.crashes,
      potholes: this.stats.potholes,
    });
    this.scene.pause();
  }

  popup(text, opts) {
    this.events.emit('hud-popup', text, opts);
  }
}
