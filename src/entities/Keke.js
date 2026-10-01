// =============================================================================
// Keke.js — tricycles (keke NAPEP). Slow, wobbly, and they drift across lanes
// without warning.
// =============================================================================
import { ROAD } from '../config/gameConfig.js';
import { DIFFICULTY } from '../config/route.js';
import { TrafficVehicle } from './TrafficVehicle.js';
import { clamp, rand } from '../utils/helpers.js';

const LIMIT = ROAD.halfWidth - 18;

export class Keke extends TrafficVehicle {
  spawn(kind, d, offset) {
    super.spawn('keke', d, offset);
    this.accel = 90;
    this.lateralSpeed = 30; // slow, lazy drift
    this.wobble = Math.random() * 10;
    return this;
  }

  think(dt, ctx) {
    this.wobble += dt;
    if (Math.random() < DIFFICULTY.kekeDriftChancePerSecond * dt) {
      // drift part of the way into the next lane (if nobody is there)
      const target = clamp(this.offset + rand(-55, 55), -LIMIT, LIMIT);
      if (ctx.manager.isSpaceFree(this, target, this.d)) this.targetOffset = target;
    }
    return this.cruise;
  }

  step(dt, ctx) {
    super.step(dt, ctx);
    // a little side-to-side wobble — kekes are never quite straight
    this.setAngle(this.angle + Math.sin(this.wobble * 5) * 2.5);
  }
}
