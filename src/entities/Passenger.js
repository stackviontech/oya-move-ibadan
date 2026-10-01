// =============================================================================
// Passenger.js — someone waiting by the roadside (work mode), waving for a
// ride, with a little tag showing where they're going and what they'll pay.
// =============================================================================
import { DEPTH, FONT_BOLD, ROAD } from '../config/gameConfig.js';
import { PED_VARIANTS } from '../config/assets.js';

// They stand on the walkway just outside the right-hand kerb.
const STAND_OFFSET = ROAD.halfWidth + ROAD.shoulder + 12;

export class Passenger {
  constructor(scene) {
    this.scene = scene;
    this.sprite = scene.add.image(0, 0, 'ped-0').setDepth(DEPTH.pedestrian);
    this.label = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_BOLD,
        fontSize: '12px',
        color: '#1d1a16',
        backgroundColor: '#f5c400',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.worldText);
    this.kill();
  }

  /** @param entry one item from PassengerManager's plan ({ d, dest, fare, ... }) */
  spawn(model, entry, destName) {
    this.entry = entry;
    entry.obj = this;
    this.d = entry.d;
    this.offset = STAND_OFFSET;
    this.state = 'waiting';
    this.boardTimer = 0;
    this.fullWarned = false;
    this.phase = Math.random() * 6;
    const key = Math.random() < 0.2 ? 'hawker' : `ped-${Math.floor(Math.random() * PED_VARIANTS)}`;
    this.sprite.setTexture(key).setScale(1).setAlpha(1).setVisible(true);
    this.destName = destName;
    this.showDestination();
    this.label.setVisible(true).setAlpha(1);
    this.active = true;
    this.place(model, 0);
    return this;
  }

  kill() {
    this.active = false;
    this.sprite.setVisible(false);
    this.label.setVisible(false);
    if (this.entry) this.entry.obj = null;
    this.entry = null;
  }

  place(model, t) {
    const x = model.centerX(this.d) + this.offset;
    const y = -this.d;
    // facing the road and waving (a little wobble + bounce)
    this.sprite.setPosition(x, y).setAngle(-90 + Math.sin(t * 9 + this.phase) * 14);
    this.label.setPosition(x - 6, y - 14 - Math.abs(Math.sin(t * 4 + this.phase)) * 3);
  }

  step(dt, model, t) {
    if (this.state === 'waiting' || this.state === 'haggling') this.place(model, t);
  }

  /** Tag shows where they're going (the price gets agreed when you stop). */
  showDestination() {
    this.label.setText(`→ ${this.destName.toUpperCase()}`).setBackgroundColor('#f5c400');
  }

  /** Tag shows their price while haggling. */
  showHaggle(text) {
    this.label.setText(text).setBackgroundColor('#ffffff');
  }

  /** Deal failed: they turn and walk off the road, then disappear. */
  walkAway() {
    this.state = 'leaving';
    this.label.setVisible(false);
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 40,
      angle: 90,
      alpha: 0,
      duration: 700,
      onComplete: () => this.kill(),
    });
  }

  /** Walk into the car and disappear. */
  boardInto(player) {
    this.state = 'boarding';
    this.label.setVisible(false);
    this.scene.tweens.add({
      targets: this.sprite,
      x: player.x,
      y: player.y,
      scale: 0.5,
      alpha: 0,
      duration: 260,
      onComplete: () => this.kill(),
    });
  }
}
