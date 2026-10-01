// =============================================================================
// GameOverScene — win / lose results, drawn over the frozen game.
// Shows total time, star rating, best time, and Play again / Share buttons.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH, TITLE } from '../config/gameConfig.js';
import { MESSAGES, fillVars, pickLine } from '../config/messages.js';
import { Button } from '../ui/Button.js';
import { shareMessage } from '../utils/share.js';
import { formatTime } from '../utils/helpers.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = data;
    this.leaving = false; // scenes are reused, so reset per-visit flags here
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const r = this.result;

    // Dim the game behind us.
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.62).setOrigin(0).setAlpha(0);
    this.tweens.add({ targets: dim, alpha: 1, duration: 250 });

    // Panel slides up.
    const panel = this.add.container(W / 2, H / 2 + 40).setAlpha(0);
    this.tweens.add({ targets: panel, y: H / 2, alpha: 1, duration: 320, ease: 'Back.Out' });

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-232, -318, 470, 640, 24);
    bg.fillStyle(0x221e19);
    bg.fillRoundedRect(-236, -324, 472, 640, 24);
    bg.fillStyle(r.won ? 0x2e8b57 : 0xb3261e);
    bg.fillRoundedRect(-236, -324, 472, 92, { tl: 24, tr: 24, bl: 0, br: 0 });
    panel.add(bg);

    const title = r.won ? 'OJOO DON REACH!' : 'TIME DON FINISH!';
    panel.add(this.add.text(0, -278, title, { fontFamily: FONT_BOLD, fontSize: '34px', color: '#ffffff' }).setOrigin(0.5));

    // Main line + big time
    const line = r.won ? `${r.start} → ${r.finish}` : `Traffic held you after ${r.reached}`;
    panel.add(this.add.text(0, -200, line, { fontFamily: FONT_BOLD, fontSize: '20px', color: COLORS.hud }).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, -140, formatTime(r.time), { fontFamily: FONT_BOLD, fontSize: '64px', color: COLORS.accent, stroke: '#000', strokeThickness: 6 })
        .setOrigin(0.5)
    );
    panel.add(this.add.text(0, -96, 'total driving time', { fontFamily: FONT, fontSize: '15px', color: '#cfc6b4' }).setOrigin(0.5));

    // Stars (pop in one by one)
    for (let i = 0; i < 3; i++) {
      const star = this.add.graphics();
      this.drawStar(star, i < r.stars);
      star.setPosition((i - 1) * 76, -32).setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, delay: 350 + i * 180, duration: 260, ease: 'Back.Out' });
    }

    // Funny verdict
    panel.add(
      this.add
        .text(0, 30, pickLine(r.won ? MESSAGES.win : MESSAGES.lose), {
          fontFamily: FONT_BOLD,
          fontSize: '20px',
          color: '#fff8e7',
          align: 'center',
          wordWrap: { width: 420 },
        })
        .setOrigin(0.5)
    );

    // Best time + stats
    let bestLine = '';
    if (r.newBest) bestLine = 'NEW PERSONAL BEST!';
    else if (r.best) bestLine = `Your best: ${formatTime(r.best.time)}`;
    panel.add(this.add.text(0, 66, bestLine, { fontFamily: FONT_BOLD, fontSize: '18px', color: COLORS.good }).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, 94, `Crashes: ${r.crashes}   ·   Potholes: ${r.potholes}`, { fontFamily: FONT, fontSize: '16px', color: '#cfc6b4' })
        .setOrigin(0.5)
    );

    // Buttons
    panel.add(new Button(this, 0, 158, 'PLAY AGAIN', { width: 300, height: 66, onClick: () => this.playAgain() }));
    panel.add(
      new Button(this, 0, 236, 'SHARE', {
        width: 300,
        height: 60,
        color: 0x2e8b57,
        textColor: '#ffffff',
        fontSize: 24,
        onClick: () => this.share(),
      })
    );
    const menu = this.add
      .text(0, 290, 'Main menu', { fontFamily: FONT, fontSize: '17px', color: '#cfc6b4' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menu.on('pointerup', () => this.toMenu());
    panel.add(menu);

    this.shareInfo = this.add
      .text(W / 2, H / 2 + 350, '', { fontFamily: FONT_BOLD, fontSize: '18px', color: COLORS.good, align: 'center' })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-ENTER', () => this.playAgain());
  }

  drawStar(g, filled) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? 14 : 32;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
    }
    g.fillStyle(0x000000, 0.35);
    g.fillPoints(
      pts.map((p) => ({ x: p.x + 3, y: p.y + 4 })),
      true
    );
    g.fillStyle(filled ? 0xf5c400 : 0x4a443b);
    g.fillPoints(pts, true);
    g.lineStyle(3, filled ? 0xfff1a8 : 0x6b6356);
    g.strokePoints(pts, true);
  }

  async share() {
    const r = this.result;
    const vars = { start: r.start, finish: r.finish, time: formatTime(r.time), title: TITLE, area: r.reached };
    const text = fillVars(r.won ? MESSAGES.share : MESSAGES.shareLose, vars);
    const result = await shareMessage(text);
    const msg = {
      copied: 'Copied! Paste am for WhatsApp or anywhere.',
      shared: 'Shared! E se!',
      cancelled: '',
      failed: 'Could not copy. Share the link manually.',
    }[result];
    this.shareInfo.setText(msg || '').setColor(result === 'failed' ? COLORS.danger : COLORS.good).setAlpha(1);
    this.tweens.killTweensOf(this.shareInfo);
    this.tweens.add({ targets: this.shareInfo, alpha: 0, delay: 2500, duration: 400 });
  }

  playAgain() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Game', { routeId: this.result.routeId });
  }

  toMenu() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop('Game');
    this.scene.start('Menu');
  }
}
