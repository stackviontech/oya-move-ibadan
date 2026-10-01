// =============================================================================
// Player.js — the yellow-and-maroon Micra taxi you drive.
//
// Arcade-style handling: UP/DOWN change forward speed, LEFT/RIGHT slide the
// car sideways. The car also follows the road's bends on its own a little
// ("curve assist") so steering buttons on a phone feel good.
// =============================================================================
import Phaser from 'phaser';
import { DEPTH, PLAYER, ROAD } from '../config/gameConfig.js';
import { BODY_SIZES } from '../art/textures.js';
import { clamp } from '../utils/helpers.js';

const CURVE_ASSIST = 0.85; // 0 = you steer every bend yourself, 1 = fully automatic

export class Player extends Phaser.GameObjects.Image {
  /**
   * @param opts optional { texture, body, stats } — work mode uses this to
   *   drive a Maruwa instead of the Micra (see config/work.js).
   */
  constructor(scene, model, startD, opts = {}) {
    super(scene, 0, 0, opts.texture || 'player');
    scene.add.existing(this);
    this.setDepth(DEPTH.player);
    this.model = model;
    // Handling numbers: the defaults from gameConfig.js, overridden per vehicle.
    this.stats = { ...PLAYER, ...(opts.stats || {}) };
    const body = BODY_SIZES[opts.body || 'player'];

    this.d = startD; // distance along the route
    this.x = model.centerX(startD);
    this.speed = 0; // forward speed, px/s
    this.lateralV = 0; // sideways speed, px/s
    this.slowTimer = 0; // > 0 right after a crash (top speed reduced)
    this.invulnTimer = 0; // > 0 = blinking, can't crash again yet
    this.offRoad = false; // scraping the kerb
    this.halfW = body.w / 2;
    this.halfH = body.h / 2;
    this.y = -startD;
  }

  /** Current top speed, taking crashes and the kerb into account. */
  get maxSpeed() {
    let max = this.stats.maxSpeed;
    if (this.slowTimer > 0) max *= this.stats.crashSlowFactor;
    if (this.offRoad) max *= this.stats.offRoadMaxSpeedFactor;
    return max;
  }

  /** Sideways position relative to the road centre. */
  get offset() {
    return this.x - this.model.centerX(this.d);
  }

  /**
   * @param {number} dt seconds
   * @param {{up:boolean,down:boolean,left:boolean,right:boolean}} input
   */
  step(dt, input) {
    this.slowTimer -= dt;
    this.invulnTimer -= dt;

    // --- forward speed ---------------------------------------------------------
    if (input.up) this.speed += this.stats.acceleration * dt;
    else if (input.down) this.speed -= this.stats.brakeForce * dt;
    else this.speed -= this.stats.coastDrag * dt;

    const max = this.maxSpeed;
    if (this.speed > max) this.speed = Math.max(max, this.speed - this.stats.brakeForce * 0.7 * dt);
    if (this.speed < 0) this.speed = 0;

    // --- steering ----------------------------------------------------------------
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const steerFactor = Math.max(this.stats.minSteerFactor, Math.min(1, this.speed / 250));
    const targetLat = steer * this.stats.lateralSpeed * steerFactor;
    // ease towards the target so steering feels smooth, not twitchy
    this.lateralV += (targetLat - this.lateralV) * Math.min(1, dt * 12);

    // --- move ----------------------------------------------------------------------
    const oldCenter = this.model.centerX(this.d);
    this.d += this.speed * dt;
    const newCenter = this.model.centerX(this.d);
    this.x += (newCenter - oldCenter) * CURVE_ASSIST + this.lateralV * dt;

    // Keep the car on the road: it can put its wheels on the kerb but no further.
    const limit = ROAD.halfWidth + ROAD.shoulder - this.halfW + 6;
    let off = this.x - newCenter;
    if (off > limit || off < -limit) {
      off = clamp(off, -limit, limit);
      this.x = newCenter + off;
      this.lateralV *= 0.3;
    }
    this.offRoad = Math.abs(off) > ROAD.halfWidth - this.halfW + 8;
    this.y = -this.d;

    // --- looks -------------------------------------------------------------------
    // Tilt into the steering direction and along the road's bend.
    const bend = (newCenter - oldCenter) / Math.max(1, this.speed * dt);
    this.setAngle(clamp((this.lateralV / this.stats.lateralSpeed) * 14 + bend * 25, -20, 20));
    this.setAlpha(this.invulnTimer > 0 ? (Math.floor(this.invulnTimer * 12) % 2 ? 0.35 : 1) : 1);
  }

  /** Crashed into something: lose most of your speed and blink for a moment. */
  crash() {
    this.speed *= 0.3;
    this.slowTimer = this.stats.crashSlowTime;
    this.invulnTimer = this.stats.invulnerableTime;
  }

  get invulnerable() {
    return this.invulnTimer > 0;
  }

  hitPothole() {
    this.speed *= this.stats.potholeSpeedFactor;
  }
}
