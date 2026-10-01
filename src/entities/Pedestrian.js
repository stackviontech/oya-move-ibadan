// =============================================================================
// Pedestrian.js — people crossing the road at junctions (sometimes a hawker
// with a tray on her head). AI drivers stop for them; the player should too!
// =============================================================================
import Phaser from 'phaser';
import { DEPTH, ROAD } from '../config/gameConfig.js';
import { PED_VARIANTS } from '../config/assets.js';
import { BODY_SIZES } from '../art/textures.js';

const SIDEWALK = ROAD.halfWidth + ROAD.shoulder + 14; // where they start/finish

export class Pedestrian extends Phaser.GameObjects.Image {
  constructor(scene) {
    super(scene, 0, 0, 'ped-0');
    scene.add.existing(this);
    this.setDepth(DEPTH.pedestrian);
    this.halfW = BODY_SIZES.pedestrian.w / 2;
    this.halfH = BODY_SIZES.pedestrian.h / 2;
    this.speed = 0;
    this.kill();
  }

  /**
   * @param model RoadModel
   * @param d distance along the route where they cross
   * @param fromSide -1 = start on the left, +1 = start on the right
   * @param walkSpeed px/s
   * @param delay seconds to wait on the kerb before stepping out
   */
  spawn(model, d, fromSide, walkSpeed, delay) {
    this.d = d;
    this.dir = -fromSide;
    this.offset = fromSide * SIDEWALK;
    this.walkSpeed = walkSpeed;
    this.delay = delay;
    this.walk = 0;
    this.fleeing = false; // true after a near-miss: they run off and can't be hit again
    const key = Math.random() < 0.25 ? 'hawker' : `ped-${Math.floor(Math.random() * PED_VARIANTS)}`;
    this.setTexture(key).setAngle(this.dir > 0 ? 90 : -90).setScale(1).setAlpha(1);
    this.setPosition(model.centerX(d) + this.offset, -d);
    this.setActive(true).setVisible(true);
    return this;
  }

  kill() {
    this.setActive(false).setVisible(false);
  }

  /** True while they are actually on the tarmac (so drivers must wait). */
  get onRoad() {
    return this.active && !this.fleeing && Math.abs(this.offset) < ROAD.halfWidth + 6;
  }

  step(dt, model) {
    if (this.delay > 0) {
      this.delay -= dt;
    } else {
      const speed = this.fleeing ? this.walkSpeed * 3 : this.walkSpeed;
      this.offset += this.dir * speed * dt;
      this.walk += dt;
    }
    this.setPosition(model.centerX(this.d) + this.offset, -this.d);
    this.setScale(1 + Math.sin(this.walk * 14) * 0.06); // little walking bob
    if (this.offset * this.dir > SIDEWALK + 10) this.kill(); // reached the other side
  }

  /** The car came too close — they dash to safety. */
  flee() {
    this.fleeing = true;
  }
}
