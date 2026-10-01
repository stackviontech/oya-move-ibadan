// =============================================================================
// SceneryGenerator.js — decides WHAT goes WHERE beside the road, one chunk at
// a time. It uses a seeded random generator, so the same chunk always gets the
// same buildings (the route looks the same every time you play it).
//
// It only produces plain data objects ({ type: 'building', x, y, ... }).
// RoadRenderer turns them into pixels using the functions in sceneryArt.js.
// =============================================================================
import { COLORS, GAME_WIDTH, ROAD } from '../config/gameConfig.js';
import { CAR_VARIANTS, PED_VARIANTS } from '../config/assets.js';
import { seededRng } from '../utils/helpers.js';

// Distance from road centre to the outer edge of the gutter.
export const EDGE = ROAD.halfWidth + ROAD.shoulder + 8;

const WALLS = [0xe8dcc0, 0xd9c7a0, 0xc9d6c0, 0xe0c9b5, 0xd6d0c4];
const KIOSK_COLORS = [0x1e88e5, 0xe53935, 0xfdd835, 0x43a047, 0x8e24aa, 0xff7043];

export class SceneryGenerator {
  constructor(model) {
    this.model = model;
    this.cache = new Map(); // chunk index → items array
  }

  /** Items for chunk k (cached, since neighbours ask for them too). */
  itemsFor(k) {
    let items = this.cache.get(k);
    if (!items) {
      items = this._generate(k);
      this.cache.set(k, items);
    }
    return items;
  }

  /** Forget chunks we've driven past, to keep memory flat. */
  prune(minK) {
    for (const k of this.cache.keys()) if (k < minK) this.cache.delete(k);
  }

  _generate(k) {
    const model = this.model;
    const CH = ROAD.chunkHeight;
    const d0 = k * CH;
    const d1 = d0 + CH;
    const rng = seededRng(k * 7919 + 1234);
    const items = [];
    const areaMid = model.areaAt(d0 + CH / 2);

    // --- ground patches: red laterite earth and darker grass -----------------
    for (let i = 0; i < 4; i++) {
      const laterite = rng() < 0.55;
      items.push({
        type: 'patch',
        x: rng() * GAME_WIDTH,
        y: -(d0 + rng() * CH),
        w: 40 + rng() * 90,
        h: 30 + rng() * 60,
        color: laterite ? COLORS.laterite : COLORS.groundDark,
        alpha: laterite ? 0.55 : 0.7,
      });
    }

    // --- hills far from the road -------------------------------------------------
    for (const side of [-1, 1]) {
      if (rng() < areaMid.scenery.hills * 0.7) {
        items.push({
          type: 'hill',
          x: side < 0 ? -40 + rng() * 50 : GAME_WIDTH + 40 - rng() * 50,
          y: -(d0 + rng() * CH),
          r: 110 + rng() * 70,
          seed: rng(),
        });
      }
    }

    // --- asphalt patches, tar repairs, cracks -----------------------------------------
    for (let i = 0; i < 6; i++) {
      const r = rng();
      items.push({
        type: 'roadpatch',
        kind: r < 0.3 ? 'tar' : r < 0.7 ? 'worn' : 'crack',
        d: d0 + rng() * CH,
        off: (rng() - 0.5) * ROAD.halfWidth * 1.7,
        w: 16 + rng() * 34,
        h: 10 + rng() * 22,
      });
    }

    // --- landmarks (e.g. Cocoa House) and reserved zones -------------------------
    const reserved = []; // { side, from, to } ranges where normal lots are skipped
    for (const lm of model.landmarks) {
      reserved.push({ side: lm.side, from: lm.d - 70, to: lm.d + 290 });
      if (lm.d >= d0 && lm.d < d1) {
        const x = model.centerX(lm.d) + lm.side * (EDGE + 54);
        if (lm.id === 'cocoa-house') {
          items.push({ type: 'cocoa', x, y: -lm.d });
          items.push({ type: 'label', text: 'COCOA HOUSE', x, y: -lm.d + 16 });
        }
      }
    }

    // --- bus stops just after each junction, with people waiting ----------------
    for (let i = 0; i < model.junctions.length; i++) {
      const jd = model.junctions[i] + 190;
      reserved.push({ side: 1, from: jd - 60, to: jd + 60 });
      if (jd >= d0 && jd < d1) {
        const x = model.centerX(jd) + EDGE + 4;
        items.push({ type: 'busstop', x, y: -jd - 8, w: 54 });
        const n = 2 + Math.floor(rng() * 3);
        for (let p = 0; p < n; p++) {
          items.push({ type: 'sprite', key: `ped-${Math.floor(rng() * PED_VARIANTS)}`, x: x + 10 + p * 13, y: -jd + 18 + rng() * 6 });
        }
      }
    }

    // --- lots along both sides: buildings, shops, trees, open ground ------------
    for (const side of [-1, 1]) {
      let d = d0 + rng() * 20;
      while (true) {
        const len = 46 + rng() * 70;
        if (d + len > d1) {
          // leftover space at the end of the chunk: a tree if there's room
          if (d1 - d > 30) this._tree(items, model, side, d + (d1 - d) / 2, rng, 0);
          break;
        }
        const mid = d + len / 2;
        const clearOfJunction = model.distanceToJunction(mid) > ROAD.junctionSize / 2 + len / 2 + 22;
        const clearOfReserved = !reserved.some((r) => r.side === side && d + len > r.from && d < r.to);
        if (clearOfJunction && clearOfReserved) this._lot(items, model, side, d, len, rng);
        d += len + 4 + rng() * 14;
      }

      // electric poles along the kerb
      for (let pd = d0 + 40; pd < d1; pd += 150) {
        if (model.distanceToJunction(pd) < ROAD.junctionSize) continue;
        if (side === 1 && rng() < 0.9) items.push({ type: 'pole', x: model.centerX(pd) + EDGE - 3, y: -pd });
      }
    }
    return items;
  }

  /** One roadside lot, from d to d+len on one side of the road. */
  _lot(items, model, side, d, len, rng) {
    const area = model.areaAt(d + len / 2);
    const sc = area.scenery;
    const cxs = [model.centerX(d), model.centerX(d + len / 2), model.centerX(d + len)];
    // the nearest the road gets to this lot, so buildings never overlap it
    const edge = side > 0 ? Math.max(...cxs) + EDGE : Math.min(...cxs) - EDGE;
    const r = rng();

    if (area.finish && rng() < 0.6) {
      // Ojoo motor park: open red ground packed with Micra taxis waiting to load
      const x0 = side > 0 ? edge + 6 : edge - 6 - 110;
      items.push({ type: 'patch', x: x0 + 55, y: -(d + len / 2), w: 120, h: len + 10, color: COLORS.laterite, alpha: 0.85 });
      for (let i = 0; i < 3; i++) {
        items.push({ type: 'sprite', key: 'micra', x: x0 + 20 + i * 38, y: -(d + len / 2) });
      }
      return;
    }

    if (r < sc.buildings * 0.78) {
      const frontage = rng() < sc.hawkers * 0.65; // shops/umbrellas in front
      const setback = frontage ? 34 : 6 + rng() * 10;
      const w = 54 + rng() * 56;
      const x = side > 0 ? edge + setback : edge - setback - w;
      items.push(this._building(x, -(d + len), w, len, rng));
      // a second building further back sometimes
      if (rng() < 0.55) {
        const w2 = 40 + rng() * 50;
        const len2 = len * (0.6 + rng() * 0.4);
        const x2 = side > 0 ? x + w + 8 : x - 8 - w2;
        items.push(this._building(x2, -(d + len2), w2, len2, rng));
      }
      if (frontage) this._frontage(items, side, edge, d, len, rng);
    } else if (r < sc.buildings * 0.78 + sc.trees * 0.5) {
      this._tree(items, model, side, d + len / 2, rng, 10 + rng() * 30);
      if (rng() < 0.5) this._tree(items, model, side, d + len / 2, rng, 50 + rng() * 40);
    } else {
      // open ground: red earth, maybe a parked car and a hawker
      const x0 = side > 0 ? edge + 10 : edge - 10 - 80;
      items.push({ type: 'patch', x: x0 + 40, y: -(d + len / 2), w: 90, h: len, color: COLORS.laterite, alpha: 0.7 });
      if (rng() < 0.6) {
        items.push({ type: 'sprite', key: `car-${Math.floor(rng() * CAR_VARIANTS)}`, x: x0 + 30, y: -(d + len / 2) });
      }
      if (rng() < sc.hawkers) this._frontage(items, side, edge, d, len, rng);
    }
  }

  _building(x, y, w, h, rng) {
    const rusty = rng() < 0.85;
    const roofs = rusty ? COLORS.rustRoofs : COLORS.newRoofs;
    return {
      type: 'building',
      x,
      y,
      w,
      h,
      roof: roofs[Math.floor(rng() * roofs.length)],
      wall: WALLS[Math.floor(rng() * WALLS.length)],
      hip: rng() < 0.5,
      rusty,
      seed: rng(),
    };
  }

  /** Kiosks, umbrella stands and hawkers between the gutter and a building. */
  _frontage(items, side, edge, d, len, rng) {
    const kind = rng();
    const midY = -(d + len / 2);
    const x = side > 0 ? edge + 4 : edge - 4;
    if (kind < 0.4) {
      const w = 18 + rng() * 8;
      items.push({ type: 'kiosk', x: side > 0 ? x : x - w, y: midY - 9, w, h: 15 + rng() * 5, color: KIOSK_COLORS[Math.floor(rng() * KIOSK_COLORS.length)] });
    } else {
      items.push({ type: 'umbrella', x: x + side * 15, y: midY, r: 11 + rng() * 4, colors: Math.floor(rng() * 4) });
    }
    if (rng() < 0.7) {
      items.push({ type: 'sprite', key: rng() < 0.6 ? 'hawker' : `ped-${Math.floor(rng() * PED_VARIANTS)}`, x: x + side * 10, y: midY + len * 0.3 });
    }
  }

  _tree(items, model, side, d, rng, extra) {
    if (model.distanceToJunction(d) < ROAD.junctionSize / 2 + 30) return; // keep crossroads clear
    const x = model.centerX(d) + side * (EDGE + 16 + extra);
    items.push({ type: 'tree', x, y: -d, r: 12 + rng() * 10, palm: rng() < 0.35, rot: rng() * Math.PI });
  }
}
