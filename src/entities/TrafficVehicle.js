// =============================================================================
// TrafficVehicle.js — AI private cars, Micra taxis and lorries.
//
// Every AI vehicle stores its position as:
//   d      — distance along the route (how far up the road it is)
//   offset — sideways distance from the road's centre line
// Its screen position is worked out from those each frame, so vehicles follow
// the bends of the road automatically.
//
// Okada and Keke extend this class and override `think()` to add their own
// personality (weaving, drifting).
// =============================================================================
import Phaser from 'phaser';
import { DEPTH, ROAD } from '../config/gameConfig.js';
import { DIFFICULTY } from '../config/route.js';
import { CAR_VARIANTS } from '../config/assets.js';
import { BODY_SIZES } from '../art/textures.js';
import { RoadModel } from '../systems/RoadModel.js';
import { clamp, rand } from '../utils/helpers.js';

export class TrafficVehicle extends Phaser.GameObjects.Image {
  constructor(scene) {
    super(scene, 0, 0, 'car-0');
    scene.add.existing(this);
    this.setDepth(DEPTH.vehicle);
    this.kill();
  }

  /**
   * Put this vehicle on the road.
   * @param {string} kind 'car' | 'micra' | 'truck' | 'okada' | 'keke'
   * @param {number} d distance along the route
   * @param {number} offset sideways offset from the road centre
   */
  spawn(kind, d, offset) {
    this.kind = kind;
    this.d = d;
    this.offset = offset;
    this.targetOffset = offset;
    this.cruise = rand(...DIFFICULTY.speeds[kind]); // this driver's preferred speed
    this.speed = this.cruise;
    this.accel = 160;
    this.decel = 520;
    this.lateralSpeed = 70; // how fast it changes lanes
    this.laneChangeCooldown = rand(1, 3);
    this.stopTimer = 0; // > 0 while a Micra taxi is stopped for passengers
    this.stopCooldown = rand(2, 5);
    this.blink = 0;
    this.hornCooldown = rand(3, 6);
    this.bumpTimer = 0;

    const size = BODY_SIZES[kind];
    this.halfW = size.w / 2;
    this.halfH = size.h / 2;
    this.setTexture(this.textureFor(kind));
    this.setAngle(0).setAlpha(1).setActive(true).setVisible(true);
    return this;
  }

  textureFor(kind) {
    if (kind === 'car') return `car-${Math.floor(Math.random() * CAR_VARIANTS)}`;
    return kind; // 'micra', 'truck' textures share the kind's name
  }

  kill() {
    this.setActive(false).setVisible(false);
  }

  /**
   * Called every frame by TrafficManager.
   * @param {number} dt seconds since last frame
   * @param {object} ctx { model, gap, gapSpeed, manager }
   *   gap      — free space (px) to the nearest thing ahead in our path
   *   gapSpeed — how fast that thing is moving
   */
  step(dt, ctx) {
    this.laneChangeCooldown -= dt;
    this.hornCooldown -= dt;
    this.bumpTimer -= dt;

    let desired = this.think(dt, ctx);

    // Car-following: slow down smoothly as the gap ahead shrinks.
    const minGap = 14;
    const safeGap = 40 + this.speed * 0.35;
    if (ctx.gap < safeGap) {
      const t = clamp((ctx.gap - minGap) / (safeGap - minGap), 0, 1);
      desired = Math.min(desired, ctx.gapSpeed + (desired - ctx.gapSpeed) * t);
      if (ctx.gap < minGap) desired = 0;
    }
    if (this.bumpTimer > 0) desired *= 0.4; // just got hit, driver is shaken

    // Accelerate / brake towards the desired speed.
    const diff = desired - this.speed;
    this.speed += diff > 0 ? Math.min(diff, this.accel * dt) : Math.max(diff, -this.decel * dt);
    if (this.speed < 0) this.speed = 0;

    // Try to overtake if stuck behind something slow.
    if (ctx.gap < 110 && ctx.gapSpeed < this.cruise * 0.7 && this.laneChangeCooldown <= 0) {
      this.tryLaneChange(ctx);
    }

    // Slide sideways towards the target offset.
    const dOff = this.targetOffset - this.offset;
    const maxMove = this.lateralSpeed * dt;
    this.offset += clamp(dOff, -maxMove, maxMove);

    this.d += this.speed * dt;
    const x = ctx.model.centerX(this.d) + this.offset;
    this.setPosition(x, RoadModel.dToY(this.d));
    // Lean slightly into lane changes.
    this.setAngle(clamp(dOff * 0.25, -12, 12));
  }

  /**
   * Personality hook: returns the speed this vehicle WANTS right now.
   * The base version handles Micra taxi passenger stops.
   */
  think(dt, ctx) {
    if (this.kind !== 'micra') return this.cruise;

    if (this.stopTimer > 0) {
      this.stopTimer -= dt;
      // hazard lights blink while stopped
      this.blink -= dt;
      if (this.blink <= 0) {
        this.blink = 0.25;
        this.setTexture(this.texture.key === 'micra' ? 'micra-hazard' : 'micra');
      }
      if (this.stopTimer <= 0) {
        this.setTexture('micra');
        this.stopCooldown = rand(4, 9);
        // rejoin the nearest lane after pulling over
        this.targetOffset = RoadModel.laneOffset(RoadModel.laneFromOffset(this.offset));
      }
      return 0;
    }

    this.stopCooldown -= dt;
    if (this.stopCooldown <= 0 && this.speed > 60 && Math.random() < DIFFICULTY.taxiStopChancePerSecond * dt) {
      this.stopTimer = rand(...DIFFICULTY.taxiStopTime);
      this.decel = 480; // a sudden (but not instant) stop
      this.blink = 0;
      // In the right lane they swing towards the kerb where passengers wait;
      // anywhere else they just stop dead in the lane (Ibadan style).
      if (RoadModel.laneFromOffset(this.offset) === ROAD.laneCount - 1) {
        this.targetOffset = ROAD.halfWidth - this.halfW + 4;
      }
      ctx.manager.onTaxiStop(this);
      return 0;
    }
    return this.cruise;
  }

  /** Move one lane left or right if there's room. */
  tryLaneChange(ctx) {
    this.laneChangeCooldown = rand(1.2, 2.5);
    const lane = RoadModel.laneFromOffset(this.offset);
    const options = [lane - 1, lane + 1].filter((l) => l >= 0 && l < ROAD.laneCount);
    if (Math.random() < 0.5) options.reverse();
    for (const l of options) {
      const off = RoadModel.laneOffset(l);
      if (ctx.manager.isSpaceFree(this, off, this.d)) {
        this.targetOffset = off;
        return true;
      }
    }
    return false;
  }

  /** Called when the player crashes into this vehicle. */
  bump(pushD) {
    this.bumpTimer = 1.0;
    this.d += pushD;
    if (this.kind === 'micra' && this.stopTimer > 0) this.stopTimer = Math.max(this.stopTimer, 0.8);
  }

  /** Player honked nearby. Base vehicles ignore it (okadas override). */
  onHorn() {}
}
