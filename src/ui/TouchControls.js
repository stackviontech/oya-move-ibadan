// =============================================================================
// TouchControls.js — on-screen buttons for phones and tablets.
//
// Instead of relying on per-button "pointerdown/pointerup" events (which can
// get stuck when a finger slides off a button), every frame we look at ALL
// fingers touching the screen and light up the nearest button under each one.
// This makes multi-touch (steer + gas + horn together) reliable.
// =============================================================================
import { FONT_BOLD, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';

export class TouchControls {
  /**
   * @param {Phaser.Scene} scene the HUD scene
   * @param {object} state object whose left/right/up/down/horn flags we set
   */
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    this.buttons = [
      { id: 'left', x: 68, y: H - 100, r: 52, icon: 'left' },
      { id: 'right', x: 186, y: H - 100, r: 52, icon: 'right' },
      { id: 'horn', x: W / 2, y: H - 215, r: 38, label: 'HORN' },
      { id: 'down', x: W - 190, y: H - 84, r: 46, label: 'BRAKE' },
      { id: 'up', x: W - 72, y: H - 128, r: 60, label: 'GAS' },
    ];
    for (const b of this.buttons) {
      b.g = scene.add.graphics().setDepth(40);
      if (b.label) {
        b.t = scene.add
          .text(b.x, b.y, b.label, { fontFamily: FONT_BOLD, fontSize: b.id === 'up' ? '22px' : '16px', color: '#fff8e7' })
          .setOrigin(0.5)
          .setDepth(41);
      }
      b.pressed = false;
      this._draw(b);
    }
  }

  update() {
    for (const b of this.buttons) b.now = false;

    // Each finger presses the closest button within reach.
    const pointers = this.scene.input.manager.pointers;
    for (const p of pointers) {
      if (!p.isDown) continue;
      let best = null;
      let bestDist = Infinity;
      for (const b of this.buttons) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.r * 1.35 && dist < bestDist) {
          best = b;
          bestDist = dist;
        }
      }
      if (best) best.now = true;
    }

    for (const b of this.buttons) {
      if (b.now !== b.pressed) {
        b.pressed = b.now;
        this._draw(b);
      }
      this.state[b.id] = b.pressed;
    }
  }

  setVisible(v) {
    for (const b of this.buttons) {
      b.g.setVisible(v);
      if (b.t) b.t.setVisible(v);
    }
  }

  _draw(b) {
    const g = b.g;
    g.clear();
    const fill = b.id === 'up' ? 0x2e8b57 : b.id === 'down' ? 0xb3261e : b.id === 'horn' ? 0xf5c400 : 0x000000;
    g.fillStyle(fill, b.pressed ? 0.85 : 0.4);
    g.fillCircle(b.x, b.y, b.r);
    g.lineStyle(3, 0xffffff, b.pressed ? 0.95 : 0.55);
    g.strokeCircle(b.x, b.y, b.r);
    if (b.icon) {
      const s = b.r * 0.42;
      const dir = b.icon === 'left' ? -1 : 1;
      g.fillStyle(0xfff8e7, b.pressed ? 1 : 0.85);
      g.fillTriangle(b.x + dir * s, b.y, b.x - dir * s * 0.7, b.y - s, b.x - dir * s * 0.7, b.y + s);
    }
  }
}
