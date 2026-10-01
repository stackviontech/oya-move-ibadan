// =============================================================================
// TrafficManager.js — spawns, updates and recycles everything that moves (or
// sits) on the road: AI vehicles, potholes, broken-down cars and pedestrians.
//
// Traffic only exists near the camera. New vehicles appear just above the top
// of the screen; ones that fall far behind are switched off and reused.
// How many there are depends on the current area's `traffic.density`.
// =============================================================================
import { ROAD } from '../config/gameConfig.js';
import { DIFFICULTY } from '../config/route.js';
import { BODY_SIZES } from '../art/textures.js';
import { Pool } from './Pool.js';
import { RoadModel } from './RoadModel.js';
import { TrafficVehicle } from '../entities/TrafficVehicle.js';
import { Okada } from '../entities/Okada.js';
import { Keke } from '../entities/Keke.js';
import { Obstacle, Pothole } from '../entities/Pothole.js';
import { Pedestrian } from '../entities/Pedestrian.js';
import { rand, weightedPick } from '../utils/helpers.js';

const HW = ROAD.halfWidth;

export class TrafficManager {
  constructor(scene, model) {
    this.scene = scene;
    this.model = model;
    this.pools = {
      vehicle: new Pool(() => new TrafficVehicle(scene)),
      okada: new Pool(() => new Okada(scene)),
      keke: new Pool(() => new Keke(scene)),
    };
    this.potholes = new Pool(() => new Pothole(scene));
    this.obstacles = new Pool(() => new Obstacle(scene));
    this.peds = new Pool(() => new Pedestrian(scene));

    this.vehicles = []; // every active AI vehicle
    this.player = null;
    this.spawnTimer = 0;
    this.nextPotholeD = 300;
    this.nextObstacleD = 1400;
    this.junctionsHandled = new Set();
    this.graceUntilD = -Infinity; // see prefill()
    this.graceOffset = 0;

    // Re-used context object passed to each vehicle's step() (no garbage).
    this.ctx = { model, gap: Infinity, gapSpeed: 0, manager: this };
    this._gap = Infinity;
    this._gapSpeed = 0;
    this._gapObj = null;
  }

  setPlayer(player) {
    this.player = player;
  }

  // ---------------------------------------------------------------------------
  // Main update
  // ---------------------------------------------------------------------------
  update(dt, camTopY, camBottomY) {
    const topD = -camTopY;
    const bottomD = -camBottomY;
    const player = this.player;

    // 1. Spawn vehicles to keep the road as busy as the area says.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.12;
      const area = this.model.areaAt(topD + 150);
      const target = Math.round(DIFFICULTY.maxVehiclesAtFullDensity * area.traffic.density);
      if (this.countBetween(bottomD - 100, topD + 600) < target) {
        if (player && player.speed < 120 && Math.random() < 0.25) {
          // player is crawling: let someone come up from behind
          this.trySpawn(area, bottomD - 70, true);
        } else {
          this.trySpawn(area, topD + 60 + Math.random() * 450, false);
        }
      }
    }

    // 2. Potholes, broken-down cars and pedestrians ahead.
    this.spawnHazards(topD);
    this.spawnPedestrians(topD);

    // 3. Move pedestrians (before vehicles, so drivers react to fresh positions).
    this.peds.forEachActive((p) => {
      p.step(dt, this.model);
      if (p.d < bottomD - 100) p.kill();
    });

    // 4. Drive every AI vehicle, and recycle the ones far off screen.
    const ctx = this.ctx;
    let w = 0;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (!v.active) continue;
      if (v.d < bottomD - 250 || v.d > topD + 1500) {
        v.kill();
        continue;
      }
      this.computeGap(v);
      ctx.gap = this._gap;
      ctx.gapSpeed = this._gapSpeed;
      v.step(dt, ctx);
      // Stuck right behind the player? Honk at them!
      if (this._gapObj === player && this._gap < 30 && v.hornCooldown <= 0 && v.kind !== 'keke') {
        v.hornCooldown = rand(4, 8);
        this.scene.events.emit('ai-honk', v);
      }
      this.vehicles[w++] = v;
    }
    this.vehicles.length = w;

    this.potholes.forEachActive((p) => p.d < bottomD - 150 && p.kill());
    this.obstacles.forEachActive((o) => o.d < bottomD - 200 && o.kill());
  }

  // ---------------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------------

  /** Fill the road ahead at the start of a run so it's busy straight away. */
  prefill(fromD, toD) {
    const area = this.model.areaAt(fromD);
    const count = Math.round(DIFFICULTY.maxVehiclesAtFullDensity * area.traffic.density * 0.8);
    // Keep the player's starting lane open for a clean getaway (first ~3 seconds).
    this.graceUntilD = fromD + 1100;
    this.graceOffset = this.player.offset;
    for (let i = 0; i < count * 3 && this.vehicles.length < count; i++) {
      this.trySpawn(area, rand(fromD, toD), false);
    }
  }

  trySpawn(area, d, fromBehind) {
    let kind = weightedPick(area.traffic.mix);
    if (fromBehind && (kind === 'keke' || kind === 'truck')) kind = 'okada'; // only fast ones catch up
    const size = BODY_SIZES[kind];
    const offset = kind === 'okada' ? rand(-HW + 12, HW - 12) : RoadModel.laneOffset(Math.floor(Math.random() * ROAD.laneCount));
    if (d < this.graceUntilD && Math.abs(offset - this.graceOffset) < size.w / 2 + 30) return null;
    if (!this.isSpaceFree({ halfW: size.w / 2, halfH: size.h / 2 }, offset, d)) return null;
    if (kind !== 'okada' && this.wouldBlockRoad(offset, d)) return null;

    const pool = kind === 'okada' ? this.pools.okada : kind === 'keke' ? this.pools.keke : this.pools.vehicle;
    const v = pool.get().spawn(kind, d, offset);
    if (fromBehind) v.cruise *= 1.15;
    v.setPosition(this.model.centerX(d) + offset, -d);
    this.vehicles.push(v);
    return v;
  }

  spawnHazards(topD) {
    const model = this.model;
    const horizon = topD + 300;

    while (this.nextPotholeD < horizon) {
      const d = this.nextPotholeD;
      const a = model.areaAt(d);
      if (a.potholes > 0 && model.distanceToJunction(d) > ROAD.junctionSize && d < model.finishDistance) {
        this.potholes.get().spawn(model, d, rand(-HW + 20, HW - 20));
      }
      this.nextPotholeD += (1000 / Math.max(a.potholes, 0.2)) * rand(0.4, 1.6);
    }

    while (this.nextObstacleD < horizon) {
      const d = this.nextObstacleD;
      const a = model.areaAt(d);
      const offset = RoadModel.laneOffset(Math.random() < 0.6 ? ROAD.laneCount - 1 : Math.floor(Math.random() * ROAD.laneCount));
      const size = BODY_SIZES.obstacle;
      if (
        a.obstacles > 0 &&
        model.distanceToJunction(d) > 350 &&
        d < model.finishDistance - 400 &&
        this.isSpaceFree({ halfW: size.w / 2, halfH: size.h / 2 + 30 }, offset, d)
      ) {
        this.obstacles.get().spawn(model, d, offset);
      }
      this.nextObstacleD += (1000 / Math.max(a.obstacles, 0.05)) * rand(0.6, 1.4);
    }
  }

  /** People cross at a junction's zebra crossing as it comes into view. */
  spawnPedestrians(topD) {
    const model = this.model;
    for (let i = 0; i < model.areas.length; i++) {
      if (this.junctionsHandled.has(i)) continue;
      const a = model.areas[i];
      if (topD < a.start - 250) continue; // junction not close yet
      this.junctionsHandled.add(i);
      if (!this.player || a.start < this.player.d + 150) continue; // too late, already here
      if (Math.random() > a.pedestrians) continue;
      // pick the zebra before or after the junction
      const crossD = Math.random() < 0.65 ? a.start - ROAD.junctionSize / 2 - 24 : a.start + ROAD.junctionSize / 2 + 24;
      const n = 1 + Math.floor(Math.random() * 3);
      const side = Math.random() < 0.5 ? -1 : 1;
      for (let k = 0; k < n; k++) {
        this.peds.get().spawn(model, crossD + rand(-8, 8), k % 2 ? -side : side, rand(45, 70), 0.3 + k * rand(0.5, 1.2));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Queries used by the AI
  // ---------------------------------------------------------------------------

  countBetween(minD, maxD) {
    let n = 0;
    for (const v of this.vehicles) if (v.active && v.d > minD && v.d < maxD) n++;
    return n;
  }

  /**
   * Find the nearest thing ahead of vehicle v in its path (other vehicles, the
   * player, broken-down cars, people on the road). Results go into
   * this._gap / this._gapSpeed / this._gapObj.
   */
  computeGap(v) {
    this._gap = Infinity;
    this._gapSpeed = 0;
    this._gapObj = null;
    // Plain loops (no callbacks) because this runs for every vehicle, every frame.
    const vehicles = this.vehicles;
    for (let i = 0; i < vehicles.length; i++) {
      const o = vehicles[i];
      if (o !== v && o.active) this._testGap(v, o, o.speed, 3);
    }
    if (this.player) this._testGap(v, this.player, this.player.speed, 3);
    const obs = this.obstacles.items;
    for (let i = 0; i < obs.length; i++) if (obs[i].active) this._testGap(v, obs[i], 0, 3);
    const peds = this.peds.items;
    for (let i = 0; i < peds.length; i++) if (peds[i].onRoad) this._testGap(v, peds[i], 0, 14);
  }

  /** Is `o` ahead of `v` and in its path? Keep it if it's the closest so far. */
  _testGap(v, o, speed, extra) {
    const dd = o.d - v.d;
    if (dd <= 0 || dd > 380) return;
    const reach = o.halfW + v.halfW + extra;
    if (Math.abs(o.offset - v.offset) < reach || Math.abs(o.offset - v.targetOffset) < reach) {
      const gap = dd - o.halfH - v.halfH;
      if (gap < this._gap) {
        this._gap = gap;
        this._gapSpeed = speed;
        this._gapObj = o;
      }
    }
  }

  /**
   * Fairness rule: would a new vehicle at (offset, d) leave every lane occupied
   * around that spot? Traffic should be heavy, but there must always be a way
   * through (even if it's tight).
   */
  wouldBlockRoad(offset, d) {
    const newLane = RoadModel.laneFromOffset(offset);
    for (let lane = 0; lane < ROAD.laneCount; lane++) {
      if (lane === newLane) continue;
      const laneOff = RoadModel.laneOffset(lane);
      let occupied = false;
      for (const o of this.vehicles) {
        if (o.active && o.kind !== 'okada' && Math.abs(o.offset - laneOff) < 30 && Math.abs(o.d - d) < 170) {
          occupied = true;
          break;
        }
      }
      for (const o of this.obstacles.items) {
        if (o.active && Math.abs(o.offset - laneOff) < 30 && Math.abs(o.d - d) < 220) occupied = true;
      }
      if (!occupied) return false; // found an open lane
    }
    return true;
  }

  /** Free space ahead of vehicle v if it were at a different sideways offset (okada weaving). */
  gapAt(v, offset) {
    const saved = v.offset;
    const savedT = v.targetOffset;
    v.offset = offset;
    v.targetOffset = offset;
    this.computeGap(v);
    v.offset = saved;
    v.targetOffset = savedT;
    return this._gap;
  }

  /** Is there room for `self` ({halfW, halfH}) at this offset and distance? */
  isSpaceFree(self, offset, d) {
    const blocked = (o) => {
      const reach = o.halfW + self.halfW + 6;
      const lateral = Math.abs(o.offset - offset) < reach || (o.targetOffset !== undefined && Math.abs(o.targetOffset - offset) < reach);
      if (!lateral) return false;
      const dd = o.d - d;
      return dd > -(o.halfH + self.halfH + 30) && dd < o.halfH + self.halfH + 70;
    };
    for (const o of this.vehicles) if (o !== self && o.active && blocked(o)) return false;
    if (this.player && blocked(this.player)) return false;
    let free = true;
    this.obstacles.forEachActive((o) => {
      if (free && blocked(o)) free = false;
    });
    return free;
  }

  // ---------------------------------------------------------------------------
  // Events from the player
  // ---------------------------------------------------------------------------

  /** Player honked: okadas nearby move aside. Returns how many reacted. */
  onHorn(player, radius) {
    let n = 0;
    for (const v of this.vehicles) {
      if (!v.active || v.kind !== 'okada') continue;
      const dx = v.x - player.x;
      const dy = v.y - player.y;
      if (dx * dx + dy * dy < radius * radius && v.d > player.d - 60) {
        if (v.onHorn(player.x)) n++;
      }
    }
    return n;
  }

  /** Called by a Micra taxi when it slams on the brakes to pick up passengers. */
  onTaxiStop(taxi) {
    this.scene.events.emit('taxi-stop', taxi);
  }
}
