// Small helper functions used all over the game.

/** Keep a number between min and max. */
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Linear interpolation from a to b by t (0..1). */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth 0→1 curve between edge0 and edge1 (used for gentle blending). */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Random float in [min, max). */
export const rand = (min, max) => min + Math.random() * (max - min);

/** Random item from an array. */
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Pick a key from an object of weights, e.g. { car: 3, okada: 1 }. */
export function weightedPick(weights, rng = Math.random) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = rng() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return Object.keys(weights)[0];
}

/**
 * Seeded random number generator (mulberry32). The same seed always gives the
 * same sequence, so scenery looks identical every time you play.
 */
export function seededRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Format seconds as m:ss, e.g. 134.2 → "2:14". */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest < 10 ? '0' : ''}${rest}`;
}

/** True on phones / tablets (anything with a touch screen). */
export function isTouchDevice() {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) &&
    // Touch laptops with a fine pointer (mouse/trackpad) still get keyboard mode
    !(window.matchMedia && window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches)
  );
}
