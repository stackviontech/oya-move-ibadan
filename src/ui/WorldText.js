// =============================================================================
// WorldText.js — small floating texts that live IN the world (they scroll
// with the road): "-3s" over a crash, a conductor shouting "Ojoo! Ojoo!",
// an angry driver behind you. Pooled like everything else.
// =============================================================================
import { DEPTH, FONT_BOLD } from '../config/gameConfig.js';

export class WorldText {
  constructor(scene, poolSize = 6) {
    this.scene = scene;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      const t = scene.add
        .text(0, 0, '', {
          fontFamily: FONT_BOLD,
          fontSize: '16px',
          color: '#fff8e7',
          stroke: '#1d1a16',
          strokeThickness: 5,
          align: 'center',
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.worldText)
        .setVisible(false);
      t.born = 0;
      this.pool.push(t);
    }
  }

  show(x, y, text, color = '#fff8e7', size = 16) {
    let t = this.pool.find((p) => !p.visible);
    if (!t) t = this.pool.reduce((a, b) => (a.born < b.born ? a : b));
    this.scene.tweens.killTweensOf(t);
    // keep the text inside the screen horizontally
    const cx = Math.max(90, Math.min(this.scene.scale.gameSize.width - 90, x));
    t.setText(text).setColor(color).setFontSize(size).setPosition(cx, y).setAlpha(1).setScale(0.6).setVisible(true);
    t.born = this.scene.time.now;
    this.scene.tweens.add({ targets: t, scale: 1, duration: 150, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      y: y - 45,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => t.setVisible(false),
    });
  }
}
