// Round "II" button in the HUD that pauses the game.
import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx.js';

export class PauseButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, size, onClick) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(0, 0, size / 2 + 4);
    g.fillStyle(0xfff8e7);
    g.fillRoundedRect(-size * 0.22, -size * 0.25, size * 0.15, size * 0.5, 2);
    g.fillRoundedRect(size * 0.07, -size * 0.25, size * 0.15, size * 0.5, 2);
    this.add(g);

    this.setSize(size + 12, size + 12);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => this.setScale(0.92));
    this.on('pointerout', () => this.setScale(1));
    this.on('pointerup', () => {
      this.setScale(1);
      Sfx.click();
      onClick();
    });
    scene.add.existing(this);
  }
}
