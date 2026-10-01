// =============================================================================
// PassengerManager.js — work mode passengers.
//
// At the start of every trip we PLAN who is waiting where: a few people at
// each bus stop plus the odd person waving by the roadside, each with a
// destination further along the route and a fare (short or long drop).
// Passengers only become real game objects as they come into view (pooled).
//
// Rules:
//   • Stop beside them (right lane, slow) and they start haggling the fare.
//     Agree on a price and they climb in; ask too much and they may walk off.
//   • Drop:    stop in the yellow zone after their bus stop's junction.
//   • Drive past their stop and they come down angry — and don't pay.
//
// It talks to WorkScene / HUD through scene events:
//   'pax-negotiate' (n), 'pax-counter' (n, ask), 'pax-negotiate-end' (reason),
//   'pax-board' (entry, n), 'pax-walk' (n, impatient), 'pax-full' (passenger),
//   'pax-drop' (list, area), 'pax-missed' (list, area)
// =============================================================================
import { DEPTH, FONT_BOLD, ROAD } from '../config/gameConfig.js';
import { NEGOTIATION, WORK } from '../config/work.js';
import { Pool } from './Pool.js';
import { RoadModel } from './RoadModel.js';
import { Passenger } from '../entities/Passenger.js';
import { rand } from '../utils/helpers.js';

const RIGHT_LANE = RoadModel.laneOffset(ROAD.laneCount - 1);

export class PassengerManager {
  constructor(scene, model, vehicle) {
    this.scene = scene;
    this.model = model;
    this.vehicle = vehicle;
    this.onboard = []; // { dest, fare } for everyone in the car
    this.pool = new Pool(() => new Passenger(scene));
    this.plan = this.makePlan();
    this.nextIdx = 0; // next plan entry to bring to life
    this.dropTimer = 0;
    this.negotiation = null; // the fare haggle in progress, if any
    this.player = null;

    // Yellow "drop here" box painted on the road at the next drop stop.
    this.marker = scene.add.graphics().setDepth(DEPTH.pothole + 0.5).setVisible(false);
    this.markerText = scene.add
      .text(0, 0, 'DROP', { fontFamily: FONT_BOLD, fontSize: '16px', color: '#f5c400', stroke: '#1d1a16', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.pothole + 0.6)
      .setVisible(false);
    this.markerStop = -1;
    scene.tweens.add({ targets: [this.marker, this.markerText], alpha: 0.45, yoyo: true, repeat: -1, duration: 500 });
  }

  // ---------------------------------------------------------------------------
  // Planning
  // ---------------------------------------------------------------------------
  makePlan() {
    const areas = this.model.areas;
    const list = [];
    for (let i = 0; i < areas.length - 1; i++) {
      const a = areas[i];
      // a small crowd at the bus stop, just after the junction
      const crowd = Math.max(0, Math.round(a.waiting * rand(0.6, 1.4)));
      for (let k = 0; k < crowd; k++) list.push(this.makeEntry(i, a.start + 140 + k * 38));
      // and one or two people waving along the road before the next stop
      const wavers = Math.random() < 0.75 ? (Math.random() < 0.4 ? 2 : 1) : 0;
      for (let k = 0; k < wavers; k++) {
        if (a.end - a.start > 1400) list.push(this.makeEntry(i, rand(a.start + 600, a.end - 500)));
      }
    }
    return list.sort((p, q) => p.d - q.d);
  }

  makeEntry(from, d) {
    const last = this.model.areas.length - 1;
    // Some ride all the way to the terminus; the rest mostly take short hops.
    const hop = Math.floor(Math.pow(Math.random(), WORK.shortTripBias) * (last - from));
    const dest = Math.random() < WORK.terminusShare ? last : from + 1 + hop;
    const fares = this.vehicle.fares;
    const fare = dest - from >= fares.longFrom ? fares.long : fares.short;
    return { d, from, dest, fare, obj: null, done: false };
  }

  destName(entry) {
    return this.model.areas[entry.dest].name;
  }

  get seatsUsed() {
    return this.onboard.length;
  }

  // ---------------------------------------------------------------------------
  // Every frame
  // ---------------------------------------------------------------------------
  update(dt, player, camTopY, camBottomY) {
    const topD = -camTopY;
    const bottomD = -camBottomY;
    const t = this.scene.time.now / 1000;

    // Bring planned passengers to life as they come into view.
    while (this.nextIdx < this.plan.length && this.plan[this.nextIdx].d < topD + 120) {
      const e = this.plan[this.nextIdx++];
      if (!e.done) this.pool.get().spawn(this.model, e, this.destName(e));
    }

    this.player = player;
    const slow = player.speed < WORK.pickupSpeed;
    const inRightLane = player.offset > RIGHT_LANE - 26;

    // An ongoing haggle ends if you drive off, or if they run out of patience.
    const n = this.negotiation;
    if (n) {
      n.patience -= dt;
      n.p.step(dt, this.model, t);
      if (Math.abs(n.p.d - player.d) > WORK.pickupReach + 40 || player.speed > WORK.pickupSpeed + 40) this.endNegotiation('drove-off');
      else if (n.patience <= 0) this.walkAway(true);
    }

    // Waiting passengers: animate, start haggling, or forget once far behind.
    for (const p of this.pool.items) {
      if (!p.active || p.state !== 'waiting') continue;
      if (p.d < bottomD - 80) {
        p.kill();
        continue;
      }
      p.step(dt, this.model, t);
      if (!this.negotiation && Math.abs(p.d - player.d) < WORK.pickupReach && slow && inRightLane) {
        p.boardTimer += dt;
        if (p.boardTimer >= WORK.boardTime) this.startNegotiation(p);
      } else {
        p.boardTimer = 0;
      }
    }

    this.updateDrops(dt, player, slow && inRightLane);
    this.updateMarker();
  }

  // ---------------------------------------------------------------------------
  // Fare negotiation (see NEGOTIATION in config/work.js)
  // ---------------------------------------------------------------------------
  startNegotiation(p) {
    if (this.onboard.length >= this.vehicle.seats) {
      if (!p.fullWarned) {
        p.fullWarned = true;
        this.scene.events.emit('pax-full', p);
      }
      return;
    }
    const N = NEGOTIATION;
    const round = (v) => Math.round(v / N.roundTo) * N.roundTo;
    const fair = p.entry.fare; // the normal fare for this distance
    const offer = Math.max(N.roundTo, round(fair - rand(N.offerBelow[0], N.offerBelow[1])));
    const maxPay = Math.max(offer, round(fair + rand(N.maxPayRange[0], N.maxPayRange[1])));
    this.negotiation = {
      p,
      stop: this.destName(p.entry),
      fair,
      offer,
      high: fair + N.askAbove,
      maxPay, // secret!
      stage: 'open', // 'open' → (maybe) 'counter'
      counter: 0,
      patience: N.patience,
    };
    p.state = 'haggling';
    p.showHaggle(`${this.negotiation.stop.toUpperCase()} ₦${offer}?`);
    this.scene.events.emit('pax-negotiate', this.negotiation);
  }

  /**
   * The player's answer.
   *   open stage:    1 = take their offer, 2 = normal fare, 3 = ask for more
   *   counter stage: 1 = accept their counter-offer, 2 = refuse
   */
  choose(option) {
    const n = this.negotiation;
    if (!n) return;
    if (n.stage === 'open') {
      if (option === 1) return this.agree(n.offer);
      const ask = option === 2 ? n.fair : n.high;
      if (n.maxPay >= ask) return this.agree(ask);
      // Too much for them: a counter-offer, or they just walk off.
      if (Math.random() < NEGOTIATION.counterChance) {
        const round = (v) => Math.floor(v / NEGOTIATION.roundTo) * NEGOTIATION.roundTo;
        n.counter = Math.max(n.offer, round(Math.min(n.maxPay, ask - NEGOTIATION.roundTo)));
        n.stage = 'counter';
        n.patience = NEGOTIATION.patience;
        n.p.showHaggle(`₦${n.counter}?`);
        this.scene.events.emit('pax-counter', n, ask);
      } else {
        this.walkAway(false);
      }
    } else if (option === 1) {
      this.agree(n.counter);
    } else {
      this.walkAway(false);
    }
  }

  agree(price) {
    const n = this.negotiation;
    const p = n.p;
    const e = p.entry;
    e.fare = price;
    e.done = true;
    this.onboard.push({ dest: e.dest, fare: price });
    p.boardInto(this.player);
    this.endNegotiation('deal');
    this.scene.events.emit('pax-board', e, n);
  }

  /** They refuse and walk off (impatient = you took too long to answer). */
  walkAway(impatient) {
    const n = this.negotiation;
    n.p.entry.done = true;
    n.p.walkAway();
    this.endNegotiation('walked');
    this.scene.events.emit('pax-walk', n, impatient);
  }

  endNegotiation(reason) {
    const n = this.negotiation;
    if (!n) return;
    this.negotiation = null;
    if (reason === 'drove-off' && n.p.active) {
      n.p.state = 'waiting'; // still standing there if you come back
      n.p.boardTimer = -1; // short pause before they'd haggle again
      n.p.showDestination();
    }
    this.scene.events.emit('pax-negotiate-end', reason);
  }

  /** Drop people whose stop we are at, and lose the ones whose stop we passed. */
  updateDrops(dt, player, canStop) {
    if (this.onboard.length === 0) return;
    const areas = this.model.areas;
    let stopping = false;
    for (let j = 0; j < areas.length; j++) {
      if (!this.onboard.some((o) => o.dest === j)) continue;
      const a = areas[j];
      const z0 = a.start + WORK.dropZone.from;
      const z1 = a.start + WORK.dropZone.to;
      if (player.d > z1 && !a.finish) {
        this.scene.events.emit('pax-missed', this.takeOff(j), a);
      } else if (player.d >= z0 && player.d <= z1 && canStop) {
        stopping = true;
        this.dropTimer += dt;
        if (this.dropTimer >= WORK.boardTime) {
          this.dropTimer = 0;
          this.scene.events.emit('pax-drop', this.takeOff(j), a);
        }
      }
    }
    if (!stopping) this.dropTimer = 0;
  }

  /** Remove (and return) everyone going to stop j. */
  takeOff(j) {
    const leaving = this.onboard.filter((o) => o.dest === j);
    this.onboard = this.onboard.filter((o) => o.dest !== j);
    return leaving;
  }

  /** Everyone left in the car gets down (the terminus). */
  takeOffAll() {
    const all = this.onboard;
    this.onboard = [];
    return all;
  }

  /** After a crash, each passenger may jump out without paying. */
  jumpOut(chance) {
    const stay = [];
    const gone = [];
    for (const o of this.onboard) (Math.random() < chance ? gone : stay).push(o);
    this.onboard = stay;
    return gone;
  }

  /** The next stop someone in the car is going to (index), or -1. */
  nextDropStop() {
    let best = -1;
    for (const o of this.onboard) if (best === -1 || o.dest < best) best = o.dest;
    return best;
  }

  countFor(j) {
    let n = 0;
    for (const o of this.onboard) if (o.dest === j) n++;
    return n;
  }

  updateMarker() {
    const j = this.nextDropStop();
    if (j === this.markerStop) return;
    this.markerStop = j;
    if (j === -1) {
      this.marker.setVisible(false);
      this.markerText.setVisible(false);
      return;
    }
    // The road is straight around junctions, so the box is a simple rectangle.
    const a = this.model.areas[j];
    const x = this.model.centerX(a.start) + RIGHT_LANE;
    const yTop = -(a.start + WORK.dropZone.to);
    const h = WORK.dropZone.to - WORK.dropZone.from;
    const w = ROAD.laneWidth - 10;
    this.marker.clear();
    this.marker.fillStyle(0xf5c400, 0.22);
    this.marker.fillRoundedRect(-w / 2, 0, w, h, 8);
    this.marker.lineStyle(3, 0xf5c400, 0.9);
    this.marker.strokeRoundedRect(-w / 2, 0, w, h, 8);
    this.marker.setPosition(x, yTop).setVisible(true);
    this.markerText.setPosition(x, yTop + 22).setVisible(true);
  }
}
