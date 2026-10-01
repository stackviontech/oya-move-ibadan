// Speaker icon that toggles all game sound on/off (remembered between visits).
import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx.js';

export class MuteButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, size = 44) {
    super(scene, x, y);
    this.size = size;
    this.icon = scene.add.graphics();
    this.add(this.icon);
    this.setSize(size + 12, size + 12);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => {
      Sfx.unlock();
      Sfx.toggleMute();
      if (!Sfx.muted) Sfx.click();
      this.redraw();
    });
    this.redraw();
    scene.add.existing(this);
  }

  redraw() {
    const g = this.icon;
    const s = this.size;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(0, 0, s / 2 + 4);
    g.fillStyle(0xfff8e7);
    // speaker body + cone
    g.fillRect(-s * 0.3, -s * 0.12, s * 0.16, s * 0.24);
    g.fillTriangle(-s * 0.16, -s * 0.12, -s * 0.16, s * 0.12, s * 0.06, 0);
    g.fillTriangle(-s * 0.16, -s * 0.12, s * 0.06, -s * 0.3, s * 0.06, 0);
    g.fillTriangle(-s * 0.16, s * 0.12, s * 0.06, s * 0.3, s * 0.06, 0);
    if (Sfx.muted) {
      g.lineStyle(4, 0xff4d3d);
      g.lineBetween(s * 0.14, -s * 0.14, s * 0.34, s * 0.14);
      g.lineBetween(s * 0.34, -s * 0.14, s * 0.14, s * 0.14);
    } else {
      g.lineStyle(3, 0xfff8e7);
      g.beginPath();
      g.arc(s * 0.08, 0, s * 0.16, -0.9, 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(s * 0.08, 0, s * 0.28, -0.9, 0.9);
      g.strokePath();
    }
  }
}
