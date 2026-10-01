// A simple chunky button: rounded rectangle + label, with hover/press feedback.
import Phaser from 'phaser';
import { FONT_BOLD } from '../config/gameConfig.js';
import { Sfx } from '../audio/Sfx.js';
import { shade } from '../art/textures.js';

export class Button extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x centre x
   * @param {number} y centre y
   * @param {string} label
   * @param {object} opts { width, height, color, textColor, fontSize, onClick }
   */
  constructor(scene, x, y, label, opts = {}) {
    super(scene, x, y);
    const { width = 260, height = 66, color = 0xf5c400, textColor = '#1d1a16', fontSize = 28, onClick = () => {} } = opts;
    this.w = width;
    this.h = height;
    this.color = color;
    this.onClick = onClick;

    this.bg = scene.add.graphics();
    this.text = scene.add
      .text(0, -2, label, { fontFamily: FONT_BOLD, fontSize: `${fontSize}px`, color: textColor })
      .setOrigin(0.5);
    this.add([this.bg, this.text]);
    this._draw(false);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.setScale(1.04));
    this.on('pointerout', () => {
      this.setScale(1);
      this._draw(false);
    });
    this.on('pointerdown', () => {
      this.setScale(0.97);
      this._draw(true);
    });
    this.on('pointerup', () => {
      this.setScale(1);
      this._draw(false);
      Sfx.unlock(); // any click is a chance to enable audio
      Sfx.click();
      this.onClick();
    });
    scene.add.existing(this);
  }

  setLabel(label) {
    this.text.setText(label);
    return this;
  }

  _draw(pressed) {
    const g = this.bg;
    const { w, h } = this;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + (pressed ? 3 : 6), w, h, 16);
    g.fillStyle(shade(this.color, -0.3));
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 4), w, h, 16);
    g.fillStyle(this.color);
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 2 : 0), w, h - 4, 16);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + (pressed ? 6 : 4), w - 16, 10, 5);
  }
}
