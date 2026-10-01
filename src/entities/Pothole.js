// =============================================================================
// Pothole.js — potholes (some full of muddy rain water). Driving over one
// slows your car down and gives the camera a little shake.
//
// Also exports Obstacle: a broken-down car with tree branches behind it — the
// Nigerian roadside "warning triangle". Hitting it counts as a crash.
// =============================================================================
import Phaser from 'phaser';
import { DEPTH } from '../config/gameConfig.js';
import { BODY_SIZES } from '../art/textures.js';
import { rand } from '../utils/helpers.js';

export class Pothole extends Phaser.GameObjects.Image {
  constructor(scene) {
    super(scene, 0, 0, 'pothole');
    scene.add.existing(this);
    this.setDepth(DEPTH.pothole);
    this.halfW = BODY_SIZES.pothole.w / 2;
    this.halfH = BODY_SIZES.pothole.h / 2;
    this.kill();
  }

  spawn(model, d, offset) {
    this.d = d;
    this.offset = offset;
    this.hit = false; // each pothole only "catches" you once
    this.setTexture(Math.random() < 0.35 ? 'pothole-puddle' : 'pothole');
    this.setPosition(model.centerX(d) + offset, -d);
    this.setAngle(rand(-15, 15)).setScale(rand(0.85, 1.2));
    this.setActive(true).setVisible(true);
    return this;
  }

  kill() {
    this.setActive(false).setVisible(false);
  }
}

export class Obstacle extends Phaser.GameObjects.Image {
  constructor(scene) {
    super(scene, 0, 0, 'broken-car');
    scene.add.existing(this);
    this.setDepth(DEPTH.vehicle);
    // The texture has leaves below the car; put the origin on the car body.
    this.setOrigin(0.5, 38 / 124);
    this.halfW = BODY_SIZES.obstacle.w / 2;
    this.halfH = BODY_SIZES.obstacle.h / 2;
    this.speed = 0; // it isn't going anywhere
    this.kill();
  }

  spawn(model, d, offset) {
    this.d = d;
    this.offset = offset;
    this.setPosition(model.centerX(d) + offset, -d);
    this.setActive(true).setVisible(true);
    return this;
  }

  kill() {
    this.setActive(false).setVisible(false);
  }
}
