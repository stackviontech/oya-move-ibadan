// =============================================================================
// sceneryArt.js — functions that DRAW the road and roadside scenery onto a
// Phaser Graphics object. RoadRenderer calls these once per road chunk and
// bakes the result into a texture, so none of this runs every frame.
//
// Every function takes `oy` = the world Y of the top of the chunk being drawn,
// so it can convert world positions into chunk-local positions (y - oy).
// =============================================================================
import { COLORS, ROAD } from '../config/gameConfig.js';
import { seededRng } from '../utils/helpers.js';
import { shade } from './textures.js';

const GUTTER = 7; // open drain width beside the kerb

// -----------------------------------------------------------------------------
// Ground, hills, patches
// -----------------------------------------------------------------------------
export function drawGround(g, width, height) {
  g.fillStyle(COLORS.ground);
  g.fillRect(0, 0, width, height);
}

export function drawPatch(g, p, oy) {
  g.fillStyle(p.color, p.alpha);
  g.fillEllipse(p.x, p.y - oy, p.w, p.h);
}

/** A hill: stacked ellipses, lighter towards the top-left like sunlight. */
export function drawHill(g, h, oy) {
  const cols = [0x55763a, 0x648544, 0x74954e, 0x86a55b, 0x98b267];
  const y = h.y - oy;
  for (let i = 0; i < cols.length; i++) {
    const rr = h.r * (1 - i * 0.18);
    const off = i * h.r * 0.07;
    g.fillStyle(cols[i]);
    g.fillEllipse(h.x - off, y - off, rr * 2, rr * 1.7);
  }
  // a few tiny rusty roofs dotted on the hillside (Ibadan's famous view)
  const rng = seededRng(Math.floor(h.seed * 1e6));
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const dist = rng() * h.r * 0.75;
    const hx = h.x + Math.cos(a) * dist;
    const hy = y + Math.sin(a) * dist * 0.8;
    g.fillStyle(COLORS.rustRoofs[i % COLORS.rustRoofs.length], 0.9);
    g.fillRect(hx, hy, 9 + rng() * 6, 6 + rng() * 4);
  }
}

// -----------------------------------------------------------------------------
// The road itself (a curved strip made of polygons)
// -----------------------------------------------------------------------------
export function drawRoadStrip(g, model, d0, d1, oy) {
  const step = 12;
  const hw = ROAD.halfWidth;
  const sh = ROAD.shoulder;
  const pts = [];
  for (let d = d0 - step; d <= d1 + step; d += step) pts.push({ d, y: -d - oy, cx: model.centerX(d) });

  // Fill the area between two offsets from the road centre.
  const band = (off0, off1, color) => {
    const poly = [];
    for (let i = 0; i < pts.length; i++) poly.push({ x: pts[i].cx + off0, y: pts[i].y });
    for (let i = pts.length - 1; i >= 0; i--) poly.push({ x: pts[i].cx + off1, y: pts[i].y });
    g.fillStyle(color);
    g.fillPoints(poly, true);
  };

  band(-hw - sh - GUTTER, -hw - sh, COLORS.gutter);
  band(hw + sh, hw + sh + GUTTER, COLORS.gutter);
  band(-hw - sh, -hw, COLORS.kerb);
  band(hw, hw + sh, COLORS.kerb);
  band(-hw, hw, COLORS.asphalt);

  // kerb joints
  g.lineStyle(1, COLORS.kerbDark, 0.8);
  for (let d = Math.ceil(d0 / 26) * 26; d < d1; d += 26) {
    const cx = model.centerX(d);
    const y = -d - oy;
    g.lineBetween(cx - hw - sh, y, cx - hw, y);
    g.lineBetween(cx + hw, y, cx + hw + sh, y);
  }

  // faded edge lines
  g.lineStyle(2, COLORS.laneMark, 0.45);
  g.strokePoints(pts.map((p) => ({ x: p.cx - hw + 4, y: p.y })));
  g.strokePoints(pts.map((p) => ({ x: p.cx + hw - 4, y: p.y })));

  // dashed lane lines (skipped inside junctions)
  g.lineStyle(3, COLORS.laneMark, 0.8);
  const dash = 30;
  const gap = 34;
  for (let lane = 1; lane < ROAD.laneCount; lane++) {
    const off = -hw + lane * ROAD.laneWidth;
    for (let d = Math.floor(d0 / (dash + gap)) * (dash + gap); d < d1 + dash; d += dash + gap) {
      if (model.distanceToJunction(d + dash / 2) < ROAD.junctionSize / 2 + 60) continue;
      g.lineBetween(model.centerX(d) + off, -d - oy, model.centerX(d + dash) + off, -(d + dash) - oy);
    }
  }
}

/** Worn patches, tar repairs and cracks on the asphalt. */
export function drawRoadPatch(g, p, model, oy) {
  const x = model.centerX(p.d) + p.off;
  const y = -p.d - oy;
  if (p.kind === 'tar') {
    g.fillStyle(COLORS.asphaltPatchDark);
    g.fillRect(x - p.w / 2, y - p.h / 2, p.w, p.h);
  } else if (p.kind === 'worn') {
    g.fillStyle(COLORS.asphaltPatch, 0.9);
    g.fillEllipse(x, y, p.w, p.h);
  } else {
    g.lineStyle(1, 0x2a2a2d, 0.9);
    g.lineBetween(x, y, x + p.w * 0.4, y - p.h * 0.3);
    g.lineBetween(x + p.w * 0.4, y - p.h * 0.3, x + p.w * 0.6, y + p.h * 0.2);
  }
}

/** Crossroad, zebra crossings and (for the finish) a chequered line. */
export function drawJunction(g, model, jd, oy, width, isFinish) {
  const y = -jd - oy;
  const JS = ROAD.junctionSize;
  const hw = ROAD.halfWidth;
  const sh = ROAD.shoulder;
  const cx = model.centerX(jd);

  // the side road crossing the whole screen
  g.fillStyle(COLORS.gutter);
  g.fillRect(0, y - JS / 2 - sh - GUTTER, width, JS + (sh + GUTTER) * 2);
  g.fillStyle(COLORS.kerb);
  g.fillRect(0, y - JS / 2 - sh, width, JS + sh * 2);
  g.fillStyle(COLORS.junctionRoad);
  g.fillRect(0, y - JS / 2, width, JS);
  // main road runs straight through (no kerb across it)
  g.fillRect(cx - hw, y - JS / 2 - sh - GUTTER - 2, hw * 2, JS + (sh + GUTTER + 2) * 2);

  // side-road centre dashes
  g.fillStyle(COLORS.laneMark, 0.7);
  for (let x = 6; x < width; x += 44) {
    if (x > cx - hw - 20 && x < cx + hw) continue;
    g.fillRect(x, y - 2, 24, 3);
  }

  // zebra crossings on both sides of the junction
  g.fillStyle(COLORS.zebra, 0.9);
  for (const zy of [y + JS / 2 + 10, y - JS / 2 - 38]) {
    for (let x = cx - hw + 6; x < cx + hw - 6; x += 19) g.fillRect(x, zy, 10, 28);
  }
  // stop line
  g.fillStyle(COLORS.laneMark, 0.8);
  g.fillRect(cx - hw + 4, y + JS / 2 + 44, hw * 2 - 8, 4);

  if (isFinish) {
    const sq = 12;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i * sq < hw * 2; i++) {
        g.fillStyle((i + row) % 2 ? 0x111111 : 0xffffff);
        g.fillRect(cx - hw + i * sq, y - sq + row * sq, sq, sq);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Buildings with Ibadan's rusty brown roofs
// -----------------------------------------------------------------------------
export function drawBuilding(g, b, oy) {
  const x = b.x;
  const y = b.y - oy;
  const w = b.w;
  const h = b.h;
  const wallH = 7;
  const rh = h - wallH; // roof height

  // shadow
  g.fillStyle(0x000000, 0.22);
  g.fillRect(x + 5, y + 6, w, h);
  // front wall with windows/door (a hint of 3D)
  g.fillStyle(b.wall);
  g.fillRect(x, y + rh, w, wallH);
  g.fillStyle(0x3b2f25);
  for (let wx = x + 5; wx < x + w - 8; wx += 14) g.fillRect(wx, y + rh + 2, 6, 4);

  const light = shade(b.roof, 0.12);
  const mid = b.roof;
  const dark = shade(b.roof, -0.2);
  const darker = shade(b.roof, -0.32);

  if (b.hip) {
    // hip roof: four sloped faces meeting at a ridge
    if (w >= rh) {
      const i = rh / 2;
      g.fillStyle(light);
      g.fillPoints([{ x, y }, { x: x + w, y }, { x: x + w - i, y: y + i }, { x: x + i, y: y + i }], true);
      g.fillStyle(dark);
      g.fillPoints([{ x: x + i, y: y + i }, { x: x + w - i, y: y + i }, { x: x + w, y: y + rh }, { x, y: y + rh }], true);
      g.fillStyle(mid);
      g.fillTriangle(x, y, x + i, y + i, x, y + rh);
      g.fillStyle(darker);
      g.fillTriangle(x + w, y, x + w, y + rh, x + w - i, y + i);
    } else {
      const i = w / 2;
      g.fillStyle(light);
      g.fillPoints([{ x, y }, { x: x + i, y: y + i }, { x: x + i, y: y + rh - i }, { x, y: y + rh }], true);
      g.fillStyle(dark);
      g.fillPoints([{ x: x + w, y }, { x: x + w, y: y + rh }, { x: x + i, y: y + rh - i }, { x: x + i, y: y + i }], true);
      g.fillStyle(mid);
      g.fillTriangle(x, y, x + w, y, x + i, y + i);
      g.fillStyle(darker);
      g.fillTriangle(x, y + rh, x + i, y + rh - i, x + w, y + rh);
    }
  } else {
    // gable roof: two halves either side of a ridge
    if (w >= rh) {
      g.fillStyle(light);
      g.fillRect(x, y, w, rh / 2);
      g.fillStyle(dark);
      g.fillRect(x, y + rh / 2, w, rh / 2);
      g.lineStyle(1, darker, 0.35);
      for (let cx = x + 4; cx < x + w; cx += 5) g.lineBetween(cx, y, cx, y + rh);
    } else {
      g.fillStyle(light);
      g.fillRect(x, y, w / 2, rh);
      g.fillStyle(dark);
      g.fillRect(x + w / 2, y, w / 2, rh);
      g.lineStyle(1, darker, 0.35);
      for (let cy = y + 4; cy < y + rh; cy += 5) g.lineBetween(x, cy, x + w, cy);
    }
  }

  // rust patches — the signature Ibadan look
  if (b.rusty) {
    const rng = seededRng(Math.floor(b.seed * 1e6));
    const n = 3 + Math.floor(rng() * 4);
    for (let k = 0; k < n; k++) {
      g.fillStyle(rng() < 0.5 ? 0x4a2412 : 0xc0703a, 0.3);
      g.fillEllipse(x + 6 + rng() * (w - 12), y + 5 + rng() * (rh - 10), 6 + rng() * 14, 4 + rng() * 8);
    }
  }
}

// -----------------------------------------------------------------------------
// Small roadside details
// -----------------------------------------------------------------------------
export function drawTree(g, t, oy) {
  const y = t.y - oy;
  if (t.palm) {
    g.fillStyle(0x000000, 0.18);
    g.fillCircle(t.x + 6, y + 7, t.r * 0.8);
    g.lineStyle(5, 0x2f7d32);
    for (let i = 0; i < 7; i++) {
      const a = t.rot + (i / 7) * Math.PI * 2;
      g.lineBetween(t.x, y, t.x + Math.cos(a) * t.r, y + Math.sin(a) * t.r);
    }
    g.fillStyle(0x6d4c2a);
    g.fillCircle(t.x, y, 4);
    return;
  }
  g.fillStyle(0x000000, 0.2);
  g.fillCircle(t.x + 6, y + 7, t.r);
  g.fillStyle(0x2e6b2a);
  g.fillCircle(t.x, y, t.r);
  g.fillStyle(0x3f8a36);
  g.fillCircle(t.x - t.r * 0.25, y - t.r * 0.25, t.r * 0.7);
  g.fillStyle(0x58a64a);
  g.fillCircle(t.x - t.r * 0.4, y - t.r * 0.45, t.r * 0.3);
}

export function drawKiosk(g, k, oy) {
  const y = k.y - oy;
  g.fillStyle(0x000000, 0.25);
  g.fillRect(k.x + 3, y + 4, k.w, k.h);
  g.fillStyle(k.color);
  g.fillRect(k.x, y, k.w, k.h);
  g.fillStyle(0xffffff, 0.85);
  g.fillRect(k.x, y, k.w, 4);
  g.fillStyle(shade(k.color, -0.35));
  g.fillRect(k.x, y + k.h - 3, k.w, 3);
}

const UMBRELLA_COLORS = [
  [0xd83a2e, 0xf4f1e8],
  [0x1f6fbf, 0xf2c230],
  [0x2e8b57, 0xf4f1e8],
  [0xf08a24, 0x1f4e8c],
];

export function drawUmbrella(g, u, oy) {
  const y = u.y - oy;
  const [c1, c2] = UMBRELLA_COLORS[u.colors % UMBRELLA_COLORS.length];
  g.fillStyle(0x000000, 0.22);
  g.fillCircle(u.x + 4, y + 5, u.r);
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    g.fillStyle(i % 2 ? c1 : c2);
    g.beginPath();
    g.slice(u.x, y, u.r, (i / segs) * Math.PI * 2, ((i + 1) / segs) * Math.PI * 2, false);
    g.fillPath();
  }
  g.fillStyle(0x333333);
  g.fillCircle(u.x, y, 2);
}

export function drawPole(g, p, oy) {
  const y = p.y - oy;
  g.fillStyle(0x000000, 0.25);
  g.fillRect(p.x, y + 2, 16, 3);
  g.fillStyle(0x6b6258);
  g.fillCircle(p.x, y, 3.5);
}

export function drawBusStop(g, s, oy) {
  const y = s.y - oy;
  g.fillStyle(0x000000, 0.25);
  g.fillRect(s.x + 4, y + 5, s.w, 16);
  g.fillStyle(0x1f5f9e);
  g.fillRect(s.x, y, s.w, 16);
  g.fillStyle(0x2c7bc7);
  g.fillRect(s.x, y, s.w, 5);
}

/**
 * Cocoa House — drawn as a tall tower seen at an angle so its height reads
 * even from above: window bands on the front face, roof, and the mast.
 */
export function drawCocoaHouse(g, c, oy) {
  const baseY = c.y - oy;
  const w = 84;
  const height = 176;
  const depth = 40;
  const side = 10; // visible side wall thickness
  const x = c.x - w / 2;
  const top = baseY - height;

  // shadow falling to the left
  g.fillStyle(0x000000, 0.22);
  g.fillPoints([{ x, y: baseY }, { x: x - 60, y: baseY + 30 }, { x: x - 60, y: top + 30 - depth }, { x, y: top - depth }], true);
  // podium
  g.fillStyle(0xb8b09c);
  g.fillRect(x - 10, baseY - 8, w + 20, 14);
  // front face
  g.fillStyle(0xe9e3d3);
  g.fillRect(x, top, w, height);
  // window bands (many storeys)
  g.fillStyle(0x34506b);
  for (let yy = top + 10; yy < baseY - 12; yy += 8) g.fillRect(x + 5, yy, w - 10, 4);
  // vertical fins
  g.fillStyle(0xd5ccb6);
  for (let xx = x + 12; xx < x + w - 4; xx += 17) g.fillRect(xx, top + 6, 3, height - 18);
  // side face (right) for depth
  g.fillStyle(0xc9c1ad);
  g.fillPoints([{ x: x + w, y: top }, { x: x + w + side, y: top - depth }, { x: x + w + side, y: baseY - depth }, { x: x + w, y: baseY }], true);
  // roof
  g.fillStyle(0xf6f2e8);
  g.fillPoints([{ x, y: top }, { x: x + side, y: top - depth }, { x: x + w + side, y: top - depth }, { x: x + w, y: top }], true);
  g.fillStyle(0xbdb5a2);
  g.fillRect(x + w / 2 - 14, top - depth + 10, 34, 18);
  // mast
  const mx = x + w / 2 + 3;
  g.lineStyle(3, 0xb3312a);
  g.lineBetween(mx, top - depth + 12, mx, top - depth - 44);
  g.lineStyle(3, 0xffffff);
  g.lineBetween(mx, top - depth - 12, mx, top - depth - 22);
}
