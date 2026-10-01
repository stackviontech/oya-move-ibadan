// =============================================================================
// WorkScene — WORK MODE: drive your Micra or Maruwa up and down your route
// from 6am to 8pm, carry passengers, collect fares, then pay Oga.
//
// It reuses all the driving, traffic and collision code from GameScene and
// only replaces the "mode hooks": what the HUD shows, what crashes cost,
// what happens at stops (passengers) and when the run ends (trip / day).
//
// One scene run = one TRIP (e.g. Toll Gate → Ojoo). At the terminus the
// scene restarts going the other way, carrying the day's money along.
// =============================================================================
import { GameScene, START_D } from './GameScene.js';
import { COLORS, GAME_HEIGHT } from '../config/gameConfig.js';
import { ROUTES } from '../config/route.js';
import { VEHICLES, WORK } from '../config/work.js';
import { MESSAGES, pickLine } from '../config/messages.js';
import { Player } from '../entities/Player.js';
import { PassengerManager } from '../systems/PassengerManager.js';
import { dayNet, loadCareer, naira, settleDay } from '../systems/Career.js';
import { reverseRoute } from '../utils/routeUtils.js';
import { Sfx } from '../audio/Sfx.js';

const freshDay = () => ({
  clock: 0,
  fares: 0,
  fuel: 0,
  tickets: 0,
  repairs: 0,
  passengers: 0,
  trips: 0,
  crashes: 0,
  missed: 0,
  jumped: 0,
  haggles: 0, // fare negotiations started
  haggleGain: 0, // total above (+) or below (-) the normal fares you agreed
  walked: 0, // people who walked off after haggling
});

/** Day clock seconds → "10:45 AM" */
export function clockText(seconds) {
  const hours = WORK.dayStartHour + ((WORK.dayEndHour - WORK.dayStartHour) * Math.min(seconds, WORK.dayLength)) / WORK.dayLength;
  let h = Math.floor(hours);
  const m = Math.floor(((hours - h) * 60) / 5) * 5; // 5-minute steps
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
}

export class WorkScene extends GameScene {
  constructor() {
    super('Work');
    this.mode = 'work';
  }

  /** @param data { vehicleId, reverse, day } — `day` carries money between trips */
  init(data = {}) {
    this.vehicle = VEHICLES[data.vehicleId] || VEHICLES.micra;
    this.reverse = !!data.reverse;
    this.day = data.day || freshDay();
    this.career = loadCareer(this.vehicle.id);
    this.routeId = this.vehicle.routeId;
  }

  // --- mode hooks --------------------------------------------------------------
  getRoute() {
    const route = ROUTES[this.vehicle.routeId];
    return this.reverse ? reverseRoute(route) : route;
  }

  createPlayer() {
    const v = this.vehicle;
    return new Player(this, this.model, START_D, { texture: v.texture, body: v.body, stats: v.stats });
  }

  createState() {
    return {
      mode: 'work',
      clockText: clockText(this.day.clock),
      earned: dayNet(this.day),
      target: this.career.owned ? 0 : this.vehicle.ogaDaily,
      seats: this.vehicle.seats,
      seatsUsed: 0,
      nextName: null,
      nextDrop: 0,
      dayNumber: this.career.day,
      won: false,
    };
  }

  onCreated() {
    this.pax = new PassengerManager(this, this.model, this.vehicle);
    this.lastFuelD = this.player.d;
    this.endReason = null;
    this.lateWarned = WORK.dayLength - this.day.clock < 20;
    this.dropTipShown = false;
    this.haggleTipShown = this.day.haggles > 0; // the tip shows once per day
    this.events.on('pax-board', this.onBoard, this);
    this.events.on('pax-full', this.onFull, this);
    this.events.on('pax-drop', this.onDrop, this);
    this.events.on('pax-missed', this.onMissed, this);
    this.events.on('pax-walk', this.onWalk, this);
    this.events.on('pax-negotiate', this.onNegotiate, this);

    // Every trip starts with the agbero collecting his ticket.
    this.day.tickets += this.vehicle.ticket;
    this.day.trips++;
    const firstTrip = this.day.trips === 1;
    const first = this.model.areas[0].name;
    const last = this.model.areas[this.model.areas.length - 1].name;
    this.time.delayedCall(300, () => {
      if (firstTrip) {
        const owe = this.state.target > 0 ? `${WORK.ogaWord}: ${naira(this.state.target)}` : 'The motor na your own!';
        this.popup(`DAY ${this.career.day}\n${owe}\nOya hustle!`, { color: COLORS.accent, size: 30, duration: 2000 });
      } else {
        this.popup(`${first} → ${last}\n${pickLine(MESSAGES.work.turnBack)}`, { color: COLORS.accent, size: 28 });
      }
    });
    this.time.delayedCall(firstTrip ? 2600 : 1900, () =>
      this.popup(`Agbero don collect ${naira(this.vehicle.ticket)} ticket`, { color: '#ffb347', size: 22, duration: 1100 })
    );
    if (firstTrip && this.career.day <= 2) {
      this.time.delayedCall(4200, () => this.popup(MESSAGES.work.tip, { color: '#fff8e7', size: 22, duration: 3200 }));
    }
    this.updateState();
  }

  cleanup() {
    this.events.off('pax-board', this.onBoard, this);
    this.events.off('pax-full', this.onFull, this);
    this.events.off('pax-drop', this.onDrop, this);
    this.events.off('pax-missed', this.onMissed, this);
    this.events.off('pax-walk', this.onWalk, this);
    this.events.off('pax-negotiate', this.onNegotiate, this);
    super.cleanup();
  }

  /** Bus stops: passengers on and off, and the terminus ends the trip. */
  checkCheckpoints(dt) {
    const cam = this.cameras.main;
    this.pax.update(dt, this.player, cam.scrollY, cam.scrollY + GAME_HEIGHT);
    if (!this.dropTipShown && this.pax.seatsUsed > 0 && this.career.day <= 2) {
      this.dropTipShown = true;
      this.time.delayedCall(1200, () => this.popup(MESSAGES.work.dropTip, { color: '#fff8e7', size: 22, duration: 2600 }));
    }
    if (this.player.d >= this.model.finishDistance) this.endTrip();
  }

  /** The day clock, and fuel burning as you drive. */
  updateTimer(dt) {
    const day = this.day;
    day.clock += dt;
    const moved = this.player.d - this.lastFuelD;
    this.lastFuelD = this.player.d;
    if (moved > 0) day.fuel += (moved * this.vehicle.fuelPer1000px) / 1000;
    if (!this.lateWarned && WORK.dayLength - day.clock < 20) {
      this.lateWarned = true;
      this.popup(pickLine(MESSAGES.work.late), { color: COLORS.danger, size: 28 });
    }
    if (day.clock >= WORK.dayLength) this.endDay();
  }

  updateState() {
    super.updateState();
    const s = this.state;
    s.clockText = clockText(this.day.clock);
    s.earned = dayNet(this.day);
    s.seatsUsed = this.pax ? this.pax.seatsUsed : 0;
    const next = this.model.nextCheckpoint(this.player.d - WORK.dropZone.to); // still "at" a stop until its zone ends
    s.nextName = next ? next.name : null;
    s.nextDist = next ? next.start - this.player.d : 0;
    s.nextDrop = next && this.pax ? this.pax.countFor(next.index) : 0;
  }

  /** Crashes cost repair money, and scared passengers may jump out. */
  applyCrashPenalty(x, y) {
    this.day.repairs += WORK.repairCost;
    this.day.crashes++;
    this.events.emit('hud-bonus', `-${naira(WORK.repairCost)}`, COLORS.danger);
    this.worldText.show(x, y - 50, `-${naira(WORK.repairCost)} repair`, COLORS.danger, 18);
    const gone = this.pax.jumpOut(WORK.jumpOutChance);
    if (gone.length) {
      this.day.jumped += gone.length;
      const who = gone.length === 1 ? 'One passenger' : `${gone.length} passengers`;
      this.time.delayedCall(600, () =>
        this.popup(`${who} jump down!\n${pickLine(MESSAGES.work.jump)}`, { color: COLORS.danger, size: 22, duration: 1500 })
      );
    }
  }

  pauseStatus() {
    return `Day ${this.career.day}  ·  ${this.state.clockText}  ·  ${naira(this.state.earned)} today`;
  }

  restartInfo() {
    return { restartLabel: 'RESTART DAY', restartData: { vehicleId: this.vehicle.id } };
  }

  // --- passenger events -----------------------------------------------------------
  onNegotiate() {
    this.day.haggles++;
    if (!this.haggleTipShown && this.career.day <= 2) {
      this.haggleTipShown = true;
      this.popup(MESSAGES.work.negotiateTip, { color: '#fff8e7', size: 22, duration: 2600 });
    }
  }

  onBoard(entry, n) {
    Sfx.door();
    const p = this.player;
    const extra = n ? entry.fare - n.fair : 0; // how well you haggled vs the normal fare
    this.day.haggleGain += extra;
    const deal = n ? `Deal ${naira(entry.fare)}! ` : '';
    this.worldText.show(p.x, p.y - 50, `${deal}→ ${this.model.areas[entry.dest].name}`, extra > 0 ? COLORS.accent : COLORS.good, 16);
    if (n) this.worldText.show(p.x + 70, p.y - 90, pickLine(MESSAGES.work.accept), '#fff8e7', 14);
    if (this.pax.seatsUsed >= this.vehicle.seats) this.popup(pickLine(MESSAGES.work.full), { color: '#ffb347', size: 26, duration: 900 });
  }

  onWalk(n, impatient) {
    this.day.walked++;
    const line = impatient ? 'Driver, you dey reason?! I dey go.' : pickLine(MESSAGES.work.walk);
    this.worldText.show(n.p.sprite.x - 60, n.p.sprite.y - 30, line, '#ffb3a8', 15);
  }

  onFull(passenger) {
    this.worldText.show(passenger.sprite.x - 50, passenger.sprite.y - 30, pickLine(MESSAGES.work.full), '#ffb347', 15);
  }

  onDrop(list, area, line) {
    if (!list.length) return;
    const total = list.reduce((sum, o) => sum + o.fare, 0);
    this.day.fares += total;
    this.day.passengers += list.length;
    Sfx.cash();
    const who = list.length === 1 ? '1 passenger' : `${list.length} passengers`;
    this.popup(`${line || area.name}\n${who}: +${naira(total)}`, { color: COLORS.good, size: 28, duration: 1300 });
    this.events.emit('hud-bonus', `+${naira(total)}`, COLORS.good);
    this.worldText.show(this.player.x + 40, this.player.y - 40, pickLine(MESSAGES.work.drop), '#fff8e7', 15);
  }

  onMissed(list, area) {
    this.day.missed += list.length;
    Sfx.aiHorn();
    this.popup(`${pickLine(MESSAGES.work.missed, { area: area.name })}\nNo money for that one.`, { color: COLORS.danger, size: 24, duration: 1500 });
  }

  // --- end of trip / end of day ----------------------------------------------------
  endTrip() {
    if (this.state.over) return;
    const terminus = this.model.areas[this.model.areas.length - 1];
    // Everyone still inside comes down at the terminus and pays.
    const line = pickLine(MESSAGES.work.terminus, { area: terminus.name });
    const all = this.pax.takeOffAll();
    if (all.length) this.onDrop(all, terminus, line);
    else this.popup(line, { color: COLORS.accent, size: 28 });
    this.endReason = 'trip';
    this.state.over = true;
    this.state.won = true; // coast through the outro instead of braking
    this.updateState();
    Sfx.stopEngine();
    this.events.emit('game-end', true);
    this.outroTimer = 1.5;
  }

  endDay() {
    if (this.state.over) return;
    // It's 8pm: whoever is still in the car pays and comes down.
    const left = this.pax.takeOffAll();
    if (left.length) this.onDrop(left, this.model.areaAt(this.player.d), 'Everybody come down!');
    this.endReason = 'day';
    this.state.over = true;
    this.state.won = false; // brake to a stop
    this.updateState();
    Sfx.stopEngine();
    Sfx.checkpoint();
    this.events.emit('game-end', false);
    this.popup(pickLine(MESSAGES.work.night), { color: COLORS.accent, size: 34, duration: 1500 });
    this.outroTimer = 1.8;
  }

  showResults() {
    this.resultsShown = true;
    if (this.endReason === 'trip') {
      // Turn around and work the route the other way, same day.
      const cam = this.cameras.main;
      cam.fadeOut(300, 29, 26, 22);
      cam.once('camerafadeoutcomplete', () =>
        this.scene.restart({ vehicleId: this.vehicle.id, reverse: !this.reverse, day: this.day })
      );
      return;
    }
    const result = settleDay(this.vehicle, this.day);
    this.scene.launch('DaySummary', { vehicleId: this.vehicle.id, day: { ...this.day }, result });
    this.scene.pause();
  }
}
