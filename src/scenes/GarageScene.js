// =============================================================================
// GarageScene — "Choose your ride" for work mode. Shows each vehicle's route,
// seats, Oga's daily money and your saved progress, then starts the day.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig.js';
import { ROUTES } from '../config/route.js';
import { VEHICLES, WORK } from '../config/work.js';
import { loadCareer, naira, resetCareer } from '../systems/Career.js';
import { Button } from '../ui/Button.js';
import { MuteButton } from '../ui/MuteButton.js';
import { Sfx } from '../audio/Sfx.js';

export class GarageScene extends Phaser.Scene {
  constructor() {
    super('Garage');
  }

  create() {
    const W = GAME_WIDTH;
    this.leaving = false;
    this.confirmReset = null;
    this.cameras.main.setBackgroundColor('#1d1a16');
    this.cameras.main.fadeIn(250, 29, 26, 22);

    this.add.text(W / 2, 62, 'CHOOSE YOUR RIDE', { fontFamily: FONT_BOLD, fontSize: '36px', color: COLORS.accent }).setOrigin(0.5);
    this.add
      .text(W / 2, 104, 'Carry passengers, make money, pay Oga.\nPay enough days and the motor na your own!', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#fff8e7',
        align: 'center',
      })
      .setOrigin(0.5);

    this.drawCard(VEHICLES.micra, 330);
    this.drawCard(VEHICLES.maruwa, 650);

    const back = this.add
      .text(W / 2, GAME_HEIGHT - 60, '←  Back to menu', { fontFamily: FONT_BOLD, fontSize: '20px', color: '#cfc6b4' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.go('Menu'));
    new MuteButton(this, W - 40, 40);
    this.input.keyboard.once('keydown-ESC', () => this.go('Menu'));
  }

  drawCard(v, cy) {
    const W = GAME_WIDTH;
    const career = loadCareer(v.id);
    const route = ROUTES[v.routeId];
    const top = cy - 145;

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(24, top + 6, W - 44, 290, 20);
    g.fillStyle(0x2a251f);
    g.fillRoundedRect(20, top, W - 40, 290, 20);
    g.lineStyle(2, 0xf5c400, 0.5);
    g.strokeRoundedRect(20, top, W - 40, 290, 20);

    // the vehicle, drawn big
    this.add.image(92, top + 118, v.texture).setScale(2.1);

    const x = 170;
    this.add.text(x, top + 18, v.name.toUpperCase(), { fontFamily: FONT_BOLD, fontSize: '30px', color: COLORS.accent });
    this.add.text(x, top + 58, route.title, { fontFamily: FONT_BOLD, fontSize: '17px', color: '#fff8e7' });
    const lines = [
      `Seats: ${v.seats} (${v.seatsNote})`,
      `${WORK.ogaWord}: ${naira(v.ogaDaily)} a day`,
      `Pay ${v.paymentsToOwn} days → the ${v.name} na your own`,
      v.blurb,
    ];
    this.add.text(x, top + 86, lines.join('\n'), {
      fontFamily: FONT,
      fontSize: '15px',
      color: '#d9d0bd',
      lineSpacing: 5,
      wordWrap: { width: W - x - 34 },
    });

    // saved progress
    let status = 'New driver. Oya start!';
    if (career.owned) status = `MOTOR NA YOUR OWN · Day ${career.day} · Savings ${naira(career.savings)}`;
    else if (career.day > 1)
      status = `Day ${career.day} · Savings ${naira(career.savings)} · Paid ${career.paid}/${v.paymentsToOwn} · Warnings ${career.strikes}/${WORK.strikesToLose}`;
    this.add
      .text(W / 2, top + 200, status, {
        fontFamily: FONT_BOLD,
        fontSize: '14px',
        color: career.strikes > 0 && !career.owned ? '#ffb347' : COLORS.good,
        align: 'center',
        wordWrap: { width: W - 80 },
      })
      .setOrigin(0.5);

    new Button(this, career.day > 1 ? W / 2 - 50 : W / 2, top + 248, career.day > 1 ? `START DAY ${career.day}` : 'START WORK', {
      width: 250,
      height: 54,
      fontSize: 22,
      onClick: () => this.go('Work', { vehicleId: v.id }),
    });

    if (career.day > 1) {
      const reset = this.add
        .text(W - 56, top + 248, 'Start\nafresh', { fontFamily: FONT, fontSize: '13px', color: '#a89f8c', align: 'center' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      reset.on('pointerup', () => {
        // tap twice to confirm, so nobody wipes their progress by accident
        if (this.confirmReset === v.id) {
          resetCareer(v.id);
          Sfx.click();
          this.scene.restart();
        } else {
          this.confirmReset = v.id;
          reset.setText('Tap again\nto reset').setColor(COLORS.danger);
        }
      });
    }
  }

  go(key, data) {
    if (this.leaving) return;
    this.leaving = true;
    Sfx.unlock();
    this.cameras.main.fadeOut(220, 29, 26, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
