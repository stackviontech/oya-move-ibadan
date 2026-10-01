// =============================================================================
// Popup.js — short messages that pop in the middle of the screen
// ("Welcome to Dugbe! +18s", "Pothole don catch you!"). A small pool of Text
// objects is reused so we never create new objects during play.
// =============================================================================
import { FONT_BOLD } from '../config/gameConfig.js';

export class PopupManager {
  constructor(scene, x, y, poolSize = 4) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      const t = scene.add
        .text(x, y, '', {
          fontFamily: FONT_BOLD,
          fontSize: '32px',
          color: '#fff8e7',
          stroke: '#1d1a16',
          strokeThickness: 7,
          align: 'center',
          wordWrap: { width: 480 },
        })
        .setOrigin(0.5)
        .setDepth(50)
        .setVisible(false);
      t.setShadow(0, 4, '#000000', 6, true, true);
      t.born = 0;
      t.targetY = y;
      t.pushTween = null;
      this.pool.push(t);
    }
  }

  /**
   * Show a message.
   * @param {string} text
   * @param {object} opts { color, size, duration (ms) }
   */
  show(text, { color = '#fff8e7', size = 32, duration = 1500 } = {}) {
    // Reuse a free text, or the oldest one if all are busy.
    let t = this.pool.find((p) => !p.visible);
    if (!t) t = this.pool.reduce((a, b) => (a.born < b.born ? a : b));
    this.scene.tweens.killTweensOf(t);
    t.pushTween = null;

    t.setText(text).setColor(color).setFontSize(size);

    // Push any messages already on screen up so they don't overlap. We track
    // an absolute target Y so several quick pushes in a row add up correctly.
    for (const other of this.pool) {
      if (other !== t && other.visible) {
        other.targetY -= t.height / 2 + other.height / 2 + 6;
        if (other.pushTween) other.pushTween.stop();
        other.pushTween = this.scene.tweens.add({ targets: other, y: other.targetY, duration: 150 });
      }
    }
    t.targetY = this.y;

    t.setPosition(this.x, this.y).setAlpha(1).setScale(0.5).setVisible(true);
    t.born = this.scene.time.now;

    this.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.Out' });
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: duration,
      duration: 350,
      onComplete: () => t.setVisible(false),
    });
  }
}
