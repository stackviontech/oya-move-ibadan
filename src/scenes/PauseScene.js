// =============================================================================
// PauseScene — shown over the frozen game when you pause (HUD button, P / Esc,
// or automatically when you switch apps / lock your phone).
// =============================================================================
import Phaser from 'phaser';
import { COLORS, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { MESSAGES, pickLine } from '../config/messages.js';
import { Button } from '../ui/Button.js';
import { MuteButton } from '../ui/MuteButton.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  /** @param info { gameScene, status, restartLabel, restartData } */
  init(info) {
    this.info = info;
    this.leaving = false; // scenes are reused, so reset per-visit flags here
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const info = this.info;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0);

    const panel = this.add.container(W / 2, H / 2);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-206, -214, 420, 440, 24);
    bg.fillStyle(0x221e19);
    bg.fillRoundedRect(-210, -220, 420, 440, 24);
    bg.fillStyle(0xf5c400);
    bg.fillRoundedRect(-210, -220, 420, 84, { tl: 24, tr: 24, bl: 0, br: 0 });
    panel.add(bg);

    panel.add(this.add.text(0, -178, 'PAUSED', { fontFamily: FONT_BOLD, fontSize: '40px', color: '#1d1a16' }).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, -100, pickLine(MESSAGES.pause), { fontFamily: FONT_BOLD, fontSize: '20px', color: '#fff8e7', align: 'center', wordWrap: { width: 360 } })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(0, -56, info.status, { fontFamily: FONT, fontSize: '18px', color: '#cfc6b4' })
        .setOrigin(0.5)
    );

    panel.add(new Button(this, 0, 20, 'RESUME', { width: 280, height: 66, onClick: () => this.resume() }));
    panel.add(
      new Button(this, 0, 100, info.restartLabel || 'RESTART', {
        width: 280,
        height: 58,
        color: 0x2e8b57,
        textColor: '#ffffff',
        fontSize: 24,
        onClick: () => this.restart(),
      })
    );
    const menu = this.add
      .text(0, 166, 'Main menu', { fontFamily: FONT, fontSize: '18px', color: '#cfc6b4' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menu.on('pointerup', () => this.toMenu());
    panel.add(menu);

    panel.add(new MuteButton(this, 170, -178, 34));

    this.add
      .text(W / 2, H / 2 + 250, 'P / Esc / Enter to resume', { fontFamily: FONT, fontSize: '15px', color: COLORS.hud })
      .setOrigin(0.5)
      .setAlpha(0.7);

    for (const key of ['P', 'ESC', 'ENTER']) this.input.keyboard.on(`keydown-${key}`, () => this.resume());

    // Pop the panel in.
    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 180, ease: 'Back.Out' });
  }

  resume() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop();
    this.info.gameScene.resumeGame();
  }

  restart() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(this.info.gameScene.scene.key, this.info.restartData);
  }

  toMenu() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(this.info.gameScene.scene.key);
    this.scene.start('Menu');
  }
}
