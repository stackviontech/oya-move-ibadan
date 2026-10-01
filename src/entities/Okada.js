// =============================================================================
// Okada.js — motorcycle taxis. Small, quick, and they NEVER stay in a lane:
// they keep weaving and squeeze into any gap. Honk at them and they shift
// aside (a little).
// =============================================================================
import { ROAD } from '../config/gameConfig.js';
import { DIFFICULTY } from '../config/route.js';
import { TrafficVehicle } from './TrafficVehicle.js';
import { clamp, rand } from '../utils/helpers.js';

const LIMIT = ROAD.halfWidth - 12; // okadas can ride right up to the road edge

export class Okada extends TrafficVehicle {
  spawn(kind, d, offset) {
    super.spawn('okada', d, offset);
    this.accel = 260;
    this.decel = 600;
    this.lateralSpeed = 125;
    this.weaveTimer = rand(...DIFFICULTY.okadaWeaveInterval);
    this.hornDodge = 0;
    return this;
  }

  textureFor() {
    return Math.random() < 0.45 ? 'okada-2' : 'okada'; // sometimes carrying a passenger
  }

  think(dt, ctx) {
    this.weaveTimer -= dt;
    this.hornDodge -= dt;
    const stuck = ctx.gap < 70 && ctx.gapSpeed < this.cruise * 0.8;
    if (this.hornDodge <= 0 && (this.weaveTimer <= 0 || stuck)) this.weave(ctx);
    return this.cruise;
  }

  /** Look at a few sideways positions and ride towards the one with most room. */
  weave(ctx) {
    this.weaveTimer = rand(...DIFFICULTY.okadaWeaveInterval);
    let best = this.targetOffset;
    let bestGap = ctx.manager.gapAt(this, this.offset);
    for (let i = 0; i < 4; i++) {
      const off = rand(-LIMIT, LIMIT);
      const gap = ctx.manager.gapAt(this, off);
      if (gap > bestGap + 25) {
        best = off;
        bestGap = gap;
      }
    }
    this.targetOffset = best;
  }

  // Okadas don't do polite lane changes — they weave instead.
  tryLaneChange(ctx) {
    this.laneChangeCooldown = 0.4;
    if (this.hornDodge <= 0) this.weave(ctx);
  }

  /** Player honked: move away from your car. Returns true so a message can show. */
  onHorn(playerX) {
    const away = Math.sign(this.x - playerX) || (Math.random() < 0.5 ? -1 : 1);
    this.targetOffset = clamp(this.offset + away * 60, -LIMIT, LIMIT);
    this.hornDodge = 1.3;
    this.weaveTimer = 1.6;
    return true;
  }
}
