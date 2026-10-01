// =============================================================================
// textures.js — draws every vehicle, person and obstacle with code and turns
// each drawing into a reusable texture (like a sprite sheet made at runtime).
//
// Every vehicle is drawn FACING UP, centred in its texture, with a soft shadow
// baked in. If you add a PNG with the same key in config/assets.js, that image
// is loaded instead and the matching drawing here is skipped automatically.
// =============================================================================
import { CAR_VARIANTS, PED_VARIANTS } from '../config/assets.js';

const PAD = 6; // empty border around each vehicle so the shadow fits

/** Make a colour lighter (amt > 0) or darker (amt < 0). amt is -1..1. */
export function shade(color, amt) {
  let r = (color >> 16) & 255;
  let g = (color >> 8) & 255;
  let b = color & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Draw with a temporary Graphics object and save the result as a texture. */
function make(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return; // a real sprite was loaded — keep it
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Soft drop shadow under a vehicle body. */
function shadow(g, x, y, w, h, r) {
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(x + 2, y + 3, w + 2, h + 2, r);
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(x + 3, y + 4, w, h, r);
}

// -----------------------------------------------------------------------------
// Micra taxi (player and AI) — the Nissan Micra K11 "bubble" hatchback that
// rules Ibadan roads, in Oyo State's yellow and maroon ("omi obe ati gbegiri").
// -----------------------------------------------------------------------------
const MAROON = 0x6b2318;

function drawMicra(g, { body, roof, outline = false, hazard = false, rusty = false }) {
  const bw = 34;
  const bh = 62;
  const x = PAD;
  const y = PAD;
  shadow(g, x, y, bw, bh, 12);

  // the player's car gets a thin white outline so you can spot it in traffic
  if (outline) {
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(x - 2, y - 2, bw + 4, bh + 4, 14);
  }

  // side mirrors
  g.fillStyle(0x151515);
  g.fillRect(x - 3, y + 19, 4, 5);
  g.fillRect(x + bw - 1, y + 19, 4, 5);

  // round "bubble" body
  g.fillStyle(body);
  g.fillRoundedRect(x, y, bw, bh, 12);

  // maroon lower band showing along both sides, plus maroon bumpers
  g.fillStyle(MAROON);
  g.fillRoundedRect(x, y + 11, 5, bh - 20, 2);
  g.fillRoundedRect(x + bw - 5, y + 11, 5, bh - 20, 2);
  g.fillRoundedRect(x + 5, y, bw - 10, 4, 2);
  g.fillRoundedRect(x + 5, y + bh - 4, bw - 10, 4, 2);

  // short bonnet with round headlights
  g.fillStyle(0xfff4c8);
  g.fillEllipse(x + 8, y + 6, 7, 4);
  g.fillEllipse(x + bw - 8, y + 6, 7, 4);

  // big curved windscreen with a reflection
  g.fillStyle(0x1f2f40);
  g.fillRoundedRect(x + 5, y + 14, bw - 10, 11, 4);
  g.fillStyle(0x4f6f8f);
  g.fillRect(x + 9, y + 16, 7, 2);

  // roof
  g.fillStyle(roof);
  g.fillRoundedRect(x + 6, y + 26, bw - 12, 21, 5);

  // rear hatch window
  g.fillStyle(0x1f2f40);
  g.fillRoundedRect(x + 7, y + 48, bw - 14, 7, 3);

  // tail lights
  g.fillStyle(hazard ? 0xffb020 : 0xb3261e);
  g.fillRect(x + 4, y + bh - 8, 4, 4);
  g.fillRect(x + bw - 8, y + bh - 8, 4, 4);

  if (hazard) {
    // blinking orange corner lights for "I dey stop here!"
    g.fillStyle(0xffb020);
    g.fillCircle(x + 3, y + 7, 3.5);
    g.fillCircle(x + bw - 3, y + 7, 3.5);
    g.fillStyle(0xffe08a, 0.55);
    g.fillCircle(x + 3, y + bh - 5, 6);
    g.fillCircle(x + bw - 3, y + bh - 5, 6);
  }

  if (rusty) {
    // old taxis: a few rust spots and dents
    g.fillStyle(0x8b5a2b, 0.8);
    g.fillCircle(x + 10, y + 32, 2);
    g.fillCircle(x + 25, y + 42, 1.8);
    g.fillCircle(x + 22, y + 9, 1.6);
  }
}

// -----------------------------------------------------------------------------
// Cars, trucks, okadas, kekes
// -----------------------------------------------------------------------------
const CAR_COLORS = [0xc0392b, 0x2c6fbb, 0xcfd3d6, 0xf2f2ee, 0x26282b, 0x2e8b57];

function drawCar(g, color) {
  const bw = 36;
  const bh = 68;
  const x = PAD;
  const y = PAD;
  shadow(g, x, y, bw, bh, 9);
  g.fillStyle(0x151515);
  g.fillRect(x - 3, y + 17, 4, 5);
  g.fillRect(x + bw - 1, y + 17, 4, 5);
  g.fillStyle(color);
  g.fillRoundedRect(x, y, bw, bh, 9);
  g.fillStyle(shade(color, -0.18));
  g.fillRect(x, y + 12, 3, bh - 22);
  g.fillRect(x + bw - 3, y + 12, 3, bh - 22);
  // bonnet line
  g.lineStyle(1, shade(color, -0.25), 0.8);
  g.lineBetween(x + bw / 2, y + 3, x + bw / 2, y + 14);
  // headlights
  g.fillStyle(0xfff4c8);
  g.fillRoundedRect(x + 4, y + 2, 7, 3, 1);
  g.fillRoundedRect(x + bw - 11, y + 2, 7, 3, 1);
  // windscreen, roof, rear window
  g.fillStyle(0x1f2f40);
  g.fillRoundedRect(x + 4, y + 16, bw - 8, 12, 3);
  g.fillStyle(shade(color, 0.12));
  g.fillRoundedRect(x + 5, y + 29, bw - 10, 20, 3);
  g.fillStyle(0x1f2f40);
  g.fillRoundedRect(x + 5, y + 50, bw - 10, 8, 2);
  g.fillStyle(0x4f6f8f);
  g.fillRect(x + 8, y + 18, 8, 2);
  // tail lights
  g.fillStyle(0xb3261e);
  g.fillRect(x + 3, y + bh - 4, 8, 3);
  g.fillRect(x + bw - 11, y + bh - 4, 8, 3);
}

function drawTruck(g) {
  const bw = 48;
  const bh = 118;
  const x = PAD;
  const y = PAD;
  shadow(g, x, y, bw, bh, 5);
  // cab
  g.fillStyle(0x1b5e9e);
  g.fillRoundedRect(x + 2, y, bw - 4, 30, 6);
  g.fillStyle(0x1f2f40);
  g.fillRect(x + 6, y + 6, bw - 12, 9);
  g.fillStyle(0xfff4c8);
  g.fillRect(x + 5, y + 1, 7, 3);
  g.fillRect(x + bw - 12, y + 1, 7, 3);
  // wooden cargo body (the classic painted lorry)
  g.fillStyle(0x8a5a2b);
  g.fillRect(x, y + 32, bw, bh - 32);
  g.fillStyle(0x6d4520);
  for (let py = y + 38; py < y + bh; py += 9) g.fillRect(x, py, bw, 2);
  g.lineStyle(3, 0xc0392b);
  g.strokeRect(x + 1.5, y + 33.5, bw - 3, bh - 35);
  // sacks of goods on top
  g.fillStyle(0xd8c79a);
  g.fillEllipse(x + 14, y + 52, 18, 14);
  g.fillEllipse(x + 33, y + 58, 18, 14);
  g.fillEllipse(x + 22, y + 76, 18, 14);
  g.fillEllipse(x + 13, y + 95, 16, 12);
  g.fillStyle(0xb9a878);
  g.fillEllipse(x + 35, y + 90, 16, 12);
}

function drawOkada(g, passenger, shirt) {
  const cx = 14;
  const y = PAD;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(cx + 3, y + 22, 18, 40);
  // wheels
  g.fillStyle(0x111111);
  g.fillRoundedRect(cx - 2.5, y, 5, 9, 2);
  g.fillRoundedRect(cx - 2.5, y + 28, 5, 9, 2);
  // frame + tank
  g.fillStyle(0x8b1e1e);
  g.fillRoundedRect(cx - 3.5, y + 6, 7, 26, 3);
  // handlebar
  g.lineStyle(2, 0x222222);
  g.lineBetween(cx - 9, y + 9, cx + 9, y + 9);
  // rider (shoulders + head)
  g.fillStyle(shirt);
  g.fillEllipse(cx, y + 17, 16, 9);
  g.fillStyle(0x4a2f1c);
  g.fillCircle(cx, y + 16, 4.2);
  g.fillStyle(0x222222, 0.7);
  g.fillCircle(cx, y + 15.5, 3); // cap
  if (passenger) {
    g.fillStyle(0xd9a13b);
    g.fillEllipse(cx, y + 26, 15, 9);
    g.fillStyle(0x5a3a22);
    g.fillCircle(cx, y + 25, 4);
    g.fillStyle(0x6a4c93);
    g.fillCircle(cx, y + 24.5, 3); // gele (head wrap)
  }
}

function drawKeke(g, { body = 0xf2c230, canopy = 0x236b34, stripe = 0x2f8a45, outline = false } = {}) {
  const bw = 30;
  const bh = 46;
  const x = PAD;
  const y = PAD;
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x + 3, y + 4, bw, bh, 8);
  if (outline) {
    // the player's Maruwa gets a white outline so you can find it in traffic
    g.fillStyle(0xffffff, 0.95);
    g.fillTriangle(x + bw / 2, y - 3, x - 1, y + 17, x + bw + 1, y + 17);
    g.fillRoundedRect(x - 2, y + 10, bw + 4, bh - 8, 8);
  }
  // body: narrow nose at the front, wide at the back
  g.fillStyle(body);
  g.fillTriangle(x + bw / 2, y, x + 2, y + 16, x + bw - 2, y + 16);
  g.fillRoundedRect(x, y + 12, bw, bh - 12, 6);
  // canopy (roof)
  g.fillStyle(canopy);
  g.fillRoundedRect(x + 2, y + 15, bw - 4, bh - 18, 5);
  g.fillStyle(stripe);
  g.fillRect(x + 5, y + 20, bw - 10, 3);
  // windscreen + headlight
  g.fillStyle(0x223a52);
  g.fillRect(x + 7, y + 11, bw - 14, 5);
  g.fillStyle(0xfff4c8);
  g.fillCircle(x + bw / 2, y + 3, 2.2);
  // rear wheels peeking out
  g.fillStyle(0x111111);
  g.fillRect(x - 2, y + bh - 14, 3, 9);
  g.fillRect(x + bw - 1, y + bh - 14, 3, 9);
}

// -----------------------------------------------------------------------------
// Road hazards and people
// -----------------------------------------------------------------------------
function drawPothole(g, w, h, puddle) {
  g.fillStyle(0x2b2b2d);
  g.fillEllipse(w / 2, h / 2, w - 2, h - 4);
  g.fillEllipse(w / 2 - 8, h / 2 + 3, w * 0.5, h * 0.6);
  g.fillStyle(puddle ? 0x5c4b33 : 0x19191a);
  g.fillEllipse(w / 2 + 1, h / 2, w - 12, h - 12);
  if (puddle) {
    g.fillStyle(0x8a7654, 0.8);
    g.fillEllipse(w / 2 - 4, h / 2 - 3, 10, 3);
  }
  // cracks around the edge
  g.lineStyle(1, 0x555558, 0.9);
  g.lineBetween(2, h / 2, 8, h / 2 - 2);
  g.lineBetween(w - 2, h / 2 + 3, w - 9, h / 2 + 1);
  g.lineBetween(w / 2, 1, w / 2 + 3, 5);
}

const SHIRTS = [0xd94f3d, 0x2e86ab, 0xf2a541, 0x6a4c93, 0x3aa655, 0xe06aa3];
const SKIN = [0x5a3a22, 0x6b4428, 0x4a2f1c, 0x7a4e2d];

function drawPerson(g, shirt, skin, wrap) {
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(13, 13, 18, 11);
  g.fillStyle(shirt);
  g.fillEllipse(11, 11, 18, 10);
  g.fillStyle(skin);
  g.fillCircle(3, 12, 2.5);
  g.fillCircle(19, 12, 2.5);
  g.fillCircle(11, 10, 4.5);
  if (wrap) {
    g.fillStyle(wrap);
    g.fillCircle(11, 9.5, 3.4);
  }
}

function drawHawker(g) {
  drawPerson(g, 0x2e86ab, 0x5a3a22, null);
  // tray on the head with oranges and bread
  g.fillStyle(0x9c6b3a);
  g.fillCircle(11, 10, 8);
  g.fillStyle(0xf28c28);
  g.fillCircle(8, 8, 2.2);
  g.fillCircle(13, 7, 2.2);
  g.fillCircle(10, 12, 2.2);
  g.fillStyle(0xe3c18a);
  g.fillEllipse(14.5, 12, 5, 3);
}

function drawBrokenCar(g) {
  // A broken-down car with tree branches placed behind it as a warning —
  // the classic Nigerian roadside "warning triangle".
  const x = 8;
  const y = 4;
  const bw = 36;
  const bh = 68;
  shadow(g, x, y, bw, bh, 9);
  g.fillStyle(0x8a8a82);
  g.fillRoundedRect(x, y, bw, bh, 9);
  g.fillStyle(0x6f6f68);
  g.fillRect(x, y + 12, 3, bh - 22);
  g.fillRect(x + bw - 3, y + 12, 3, bh - 22);
  // open bonnet (lifted up, lighter)
  g.fillStyle(0xa9a9a0);
  g.fillRect(x + 3, y - 2, bw - 6, 16);
  g.fillStyle(0x8b5a2b, 0.9);
  g.fillCircle(x + 9, y + 40, 3);
  g.fillCircle(x + 26, y + 55, 2.5);
  g.fillStyle(0x1f2f40);
  g.fillRoundedRect(x + 4, y + 17, bw - 8, 11, 3);
  g.fillRoundedRect(x + 5, y + 50, bw - 10, 8, 2);
  // hazard lights
  g.fillStyle(0xffb020);
  g.fillCircle(x + 4, y + bh - 3, 3);
  g.fillCircle(x + bw - 4, y + bh - 3, 3);
  // branches and leaves behind the car
  const leaf = (lx, ly) => {
    g.lineStyle(2, 0x5a3d1e);
    g.lineBetween(lx, ly - 7, lx, ly + 7);
    g.fillStyle(0x2f7d32);
    g.fillEllipse(lx - 4, ly - 3, 8, 5);
    g.fillEllipse(lx + 4, ly, 8, 5);
    g.fillEllipse(lx - 3, ly + 4, 8, 5);
    g.fillStyle(0x43a047);
    g.fillEllipse(lx + 2, ly - 5, 6, 4);
  };
  leaf(x + 6, y + bh + 22);
  leaf(x + bw / 2, y + bh + 36);
  leaf(x + bw - 6, y + bh + 24);
  leaf(x + bw / 2 + 2, y + bh + 12);
}

// -----------------------------------------------------------------------------
// Public: generate every texture the game needs.
// -----------------------------------------------------------------------------
export function generateTextures(scene) {
  const micraSize = [34 + PAD * 2, 62 + PAD * 2];
  make(scene, 'player', ...micraSize, (g) => drawMicra(g, { body: 0xf7c600, roof: 0xffd83a, outline: true }));
  // AI taxis are a little faded and rusty, so your shiny one stands out
  make(scene, 'micra', ...micraSize, (g) => drawMicra(g, { body: 0xe0ae2a, roof: 0xe9bf4c, rusty: true }));
  make(scene, 'micra-hazard', ...micraSize, (g) => drawMicra(g, { body: 0xe0ae2a, roof: 0xe9bf4c, rusty: true, hazard: true }));
  for (let i = 0; i < CAR_VARIANTS; i++) {
    make(scene, `car-${i}`, 36 + PAD * 2, 68 + PAD * 2, (g) => drawCar(g, CAR_COLORS[i % CAR_COLORS.length]));
  }
  make(scene, 'truck', 48 + PAD * 2, 118 + PAD * 2, (g) => drawTruck(g));
  make(scene, 'okada', 28, 48, (g) => drawOkada(g, false, 0x2e86ab));
  make(scene, 'okada-2', 28, 48, (g) => drawOkada(g, true, 0x3aa655));
  make(scene, 'keke', 30 + PAD * 2, 46 + PAD * 2, (g) => drawKeke(g));
  // Your own Maruwa in work mode: Oyo yellow with a maroon canopy
  make(scene, 'player-keke', 30 + PAD * 2, 46 + PAD * 2, (g) =>
    drawKeke(g, { body: 0xf7c600, canopy: MAROON, stripe: 0x8a3324, outline: true })
  );
  make(scene, 'pothole', 44, 30, (g, w, h) => drawPothole(g, w, h, false));
  make(scene, 'pothole-puddle', 44, 30, (g, w, h) => drawPothole(g, w, h, true));
  const wraps = [null, 0xf2a541, 0x6a4c93, null];
  for (let i = 0; i < PED_VARIANTS; i++) {
    make(scene, `ped-${i}`, 24, 24, (g) => drawPerson(g, SHIRTS[i % SHIRTS.length], SKIN[i % SKIN.length], wraps[i % wraps.length]));
  }
  make(scene, 'hawker', 24, 24, (g) => drawHawker(g));
  make(scene, 'broken-car', 52, 124, (g) => drawBrokenCar(g));

  // A tiny white dot, handy for simple particles (dust puffs).
  make(scene, 'dot', 8, 8, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
  });
}

// Physical (collision) sizes of each body, smaller than the texture.
export const BODY_SIZES = {
  player: { w: 30, h: 56 },
  car: { w: 32, h: 62 },
  micra: { w: 30, h: 56 },
  maruwa: { w: 26, h: 42 }, // the player's keke in work mode
  truck: { w: 44, h: 112 },
  okada: { w: 14, h: 32 },
  keke: { w: 28, h: 42 },
  pothole: { w: 32, h: 18 },
  pedestrian: { w: 14, h: 12 },
  obstacle: { w: 34, h: 64 },
};
