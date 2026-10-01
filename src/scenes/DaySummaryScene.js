// =============================================================================
// DaySummaryScene — end of a working day: fares, costs, paying Oga, savings
// and how far you are from owning the motor. Drawn over the frozen game.
// =============================================================================
import Phaser from 'phaser';
import { COLORS, FONT, FONT_BOLD, GAME_HEIGHT, GAME_WIDTH, TITLE } from '../config/gameConfig.js';
import { VEHICLES, WORK } from '../config/work.js';
import { MESSAGES, fillVars } from '../config/messages.js';
import { naira } from '../systems/Career.js';
import { Button } from '../ui/Button.js';
import { shareMessage } from '../utils/share.js';
import { Sfx } from '../audio/Sfx.js';

export class DaySummaryScene extends Phaser.Scene {
  constructor() {
    super('DaySummary');
  }

  /** @param data { vehicleId, day, result } — see Career.settleDay() */
  init(data) {
    this.vehicle = VEHICLES[data.vehicleId];
    this.day = data.day;
    this.result = data.result;
    this.leaving = false;
  }

  create() {
    const W = GAME_WIDTH;
    const H = GAME_HEIGHT;
    const v = this.vehicle;
    const day = this.day;
    const r = this.result;
    const c = r.career;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0);
    const panel = this.add.container(W / 2, H / 2);

    // Header colour/title depends on how the day went.
    let title = `DAY ${r.dayNumber} DON END`;
    let headColor = 0x2e8b57;
    if (r.collected) {
      title = `OGA DON COLLECT IM ${v.name.toUpperCase()}!`;
      headColor = 0xb3261e;
    } else if (r.justOwned) {
      title = `THE ${v.name.toUpperCase()} NA YOUR OWN!`;
      headColor = 0xc99a00;
    } else if (r.strike) {
      headColor = 0xb3561e;
    }

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-238, -374, 484, 740, 24);
    bg.fillStyle(0x221e19);
    bg.fillRoundedRect(-242, -380, 484, 740, 24);
    bg.fillStyle(headColor);
    bg.fillRoundedRect(-242, -380, 484, 80, { tl: 24, tr: 24, bl: 0, br: 0 });
    panel.add(bg);
    panel.add(this.add.text(0, -340, title, { fontFamily: FONT_BOLD, fontSize: title.length > 22 ? '24px' : '30px', color: '#ffffff' }).setOrigin(0.5));

    // --- the money breakdown ---------------------------------------------------
    let y = -272;
    const row = (label, value, color = '#fff8e7', bold = false) => {
      const style = { fontFamily: bold ? FONT_BOLD : FONT, fontSize: bold ? '21px' : '19px', color };
      panel.add(this.add.text(-206, y, label, style).setOrigin(0, 0.5));
      panel.add(this.add.text(206, y, value, style).setOrigin(1, 0.5));
      y += bold ? 38 : 32;
    };
    const line = () => {
      const g = this.add.graphics();
      g.lineStyle(1, 0xffffff, 0.25);
      g.lineBetween(-206, y - 12, 206, y - 12);
      panel.add(g);
      y += 6;
    };

    row('Passengers carried', String(day.passengers));
    row('Fares collected', naira(day.fares), COLORS.good);
    if (day.haggles) {
      const gain = Math.round(day.haggleGain || 0);
      row(`  ↳ haggling (${day.walked} walked off)`, `${gain >= 0 ? '+' : '-'}${naira(Math.abs(gain))}`, gain >= 0 ? COLORS.accent : '#ffb3a8');
    }
    row('Fuel', `-${naira(day.fuel)}`, '#ffb3a8');
    row(`Agbero tickets (${day.trips} trips)`, `-${naira(day.tickets)}`, '#ffb3a8');
    row(`Repairs (${day.crashes} crash${day.crashes === 1 ? '' : 'es'})`, `-${naira(day.repairs)}`, '#ffb3a8');
    line();
    row("Today's money", naira(r.net), r.net >= 0 ? COLORS.good : COLORS.danger, true);
    if (r.due > 0) row(WORK.ogaWord, r.paidInFull ? `-${naira(r.due)}` : `-${naira(r.paidAmount)} of ${naira(r.due)}`, r.paidInFull ? '#fff8e7' : COLORS.danger);
    row('Your savings now', naira(c.savings), COLORS.accent, true);

    // --- Oga's verdict + progress to owning the motor --------------------------------
    y += 8;
    let verdict;
    if (r.collected) verdict = `You no pay ${WORK.strikesToLose} times. Oga don carry im ${v.name}.\nStart again from Day 1.`;
    else if (r.justOwned) verdict = `You don pay all ${v.paymentsToOwn} days. No more ${WORK.ogaWord}!\nEverything you make now na your own.`;
    else if (r.due === 0) verdict = 'Motor na your own. All the money na your own!';
    else if (r.strike) verdict = `Oga: "Next time, complete my money o!"\nWarning ${c.strikes}/${WORK.strikesToLose}`;
    else verdict = `Oga: "E se. See you tomorrow."`;
    panel.add(
      this.add
        .text(0, y + 18, verdict, { fontFamily: FONT_BOLD, fontSize: '18px', color: r.strike || r.collected ? '#ffb347' : '#fff8e7', align: 'center', wordWrap: { width: 430 } })
        .setOrigin(0.5)
    );
    y += 70;

    if (!r.collected) {
      const paid = Math.min(c.paid, v.paymentsToOwn);
      const bar = this.add.graphics();
      bar.fillStyle(0xffffff, 0.15);
      bar.fillRoundedRect(-206, y, 412, 18, 9);
      bar.fillStyle(c.owned ? 0xc99a00 : 0xf5c400);
      bar.fillRoundedRect(-206, y, Math.max(18, (412 * paid) / v.paymentsToOwn), 18, 9);
      panel.add(bar);
      panel.add(
        this.add
          .text(0, y + 34, c.owned ? `${v.name} na your own!` : `${v.name} paid: ${paid} of ${v.paymentsToOwn} days`, {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#cfc6b4',
          })
          .setOrigin(0.5)
      );
      y += 60;
    }

    // --- buttons --------------------------------------------------------------------
    const mainLabel = r.collected ? 'START AGAIN' : `START DAY ${c.day}`;
    panel.add(new Button(this, 0, 210, mainLabel, { width: 300, height: 64, onClick: () => this.nextDay() }));
    panel.add(new Button(this, -78, 286, 'GARAGE', { width: 144, height: 52, fontSize: 20, color: 0x6b5f50, textColor: '#ffffff', onClick: () => this.leave('Garage') }));
    panel.add(new Button(this, 78, 286, 'SHARE', { width: 144, height: 52, fontSize: 20, color: 0x2e8b57, textColor: '#ffffff', onClick: () => this.share() }));

    this.shareInfo = this.add.text(W / 2, H - 24, '', { fontFamily: FONT_BOLD, fontSize: '16px', color: COLORS.good }).setOrigin(0.5);

    if (r.justOwned) Sfx.win();
    else if (r.collected || r.strike) Sfx.lose();
    else Sfx.cash();

    panel.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.input.keyboard.once('keydown-ENTER', () => this.nextDay());
  }

  nextDay() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Work', { vehicleId: this.vehicle.id }); // closes this overlay and restarts Work
  }

  leave(key) {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop('Work');
    this.scene.start(key);
  }

  async share() {
    const r = this.result;
    const v = this.vehicle;
    const vars = {
      title: TITLE,
      vehicle: v.name,
      day: r.dayNumber,
      days: r.dayNumber,
      passengers: this.day.passengers,
      money: naira(r.net),
    };
    const template = r.justOwned ? MESSAGES.shareOwned : r.collected ? MESSAGES.shareCollected : MESSAGES.shareWork;
    const result = await shareMessage(fillVars(template, vars));
    const msg = { copied: 'Copied! Paste am for WhatsApp.', shared: 'Shared! E se!', cancelled: '', failed: 'Could not copy. Share the link manually.' }[result];
    this.shareInfo.setText(msg || '').setAlpha(1);
    this.tweens.killTweensOf(this.shareInfo);
    this.tweens.add({ targets: this.shareInfo, alpha: 0, delay: 2500, duration: 400 });
  }
}
