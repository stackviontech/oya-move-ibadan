// =============================================================================
// RoadModel.js — the "maths" of the road. No drawing happens here.
//
// Coordinates: your car drives UP the screen, so world Y gets more negative as
// you go forward. We mostly work with DISTANCE `d` instead:
//     d = -y      (d = 0 is the Iwo Road start junction, d grows forward)
//
// The road is always 3 lanes wide, but its centre wiggles left and right to
// make gentle bends. The wiggle is zero at every junction so the crossroads
// and signboards always sit on a straight piece of road.
// =============================================================================
import { GAME_WIDTH, ROAD } from '../config/gameConfig.js';
import { smoothstep } from '../utils/helpers.js';

export class RoadModel {
  /** @param route one entry from ROUTES in config/route.js */
  constructor(route) {
    this.route = route;

    // Work out where each area starts and ends along the road.
    let d = 0;
    this.areas = route.areas.map((area, index) => {
      const a = { ...area, index, start: d, end: d + area.length };
      d += area.length;
      return a;
    });
    this.totalLength = d;

    const finishArea = this.areas.find((a) => a.finish) || this.areas[this.areas.length - 1];
    this.finishDistance = finishArea.start;

    // Junction distances (one per area start) — used for crossroads, zebra
    // crossings, signboards and pedestrians.
    this.junctions = this.areas.map((a) => a.start);

    // Landmarks declared on areas (e.g. Cocoa House in Dugbe).
    this.landmarks = this.areas
      .filter((a) => a.landmark)
      .map((a) => ({ id: a.landmark, d: a.start + 430, side: -1, area: a }));
  }

  // Convert between distance along the route and world Y.
  static dToY(d) {
    return -d;
  }

  static yToD(y) {
    return -y;
  }

  /** The area you are in at distance d (before the start counts as area 0). */
  areaAt(d) {
    const areas = this.areas;
    if (d < areas[0].end) return areas[0];
    for (let i = 1; i < areas.length; i++) {
      if (d < areas[i].end) return areas[i];
    }
    return areas[areas.length - 1];
  }

  /** How strongly the road bends at distance d (0 near junctions). */
  curveAmount(d) {
    if (d <= 0) return 0;
    const a = this.areaAt(d);
    if (!a.curve) return 0;
    const fade = 650; // how gradually bends fade in/out near junctions
    const envelope = smoothstep(a.start, a.start + fade, d) * smoothstep(a.end, a.end - fade, d);
    return a.curve * envelope;
  }

  /** World X of the road's centre line at distance d. */
  centerX(d) {
    const amp = this.curveAmount(d);
    if (amp === 0) return GAME_WIDTH / 2;
    // Two sine waves of different lengths make bends feel less repetitive.
    const wave = 0.62 * Math.sin(d / 820 + 0.4) + 0.38 * Math.sin(d / 330 + 2.1);
    return GAME_WIDTH / 2 + amp * wave;
  }

  /** Offset (from road centre) of the middle of lane i (0 = left lane). */
  static laneOffset(i) {
    return (i - (ROAD.laneCount - 1) / 2) * ROAD.laneWidth;
  }

  /** Which lane (0..laneCount-1) an offset from the road centre is closest to. */
  static laneFromOffset(offset) {
    const i = Math.round(offset / ROAD.laneWidth + (ROAD.laneCount - 1) / 2);
    return Math.max(0, Math.min(ROAD.laneCount - 1, i));
  }

  /** Distance to the nearest junction (used to keep scenery off crossroads). */
  distanceToJunction(d) {
    let best = Infinity;
    for (const j of this.junctions) {
      const dist = Math.abs(d - j);
      if (dist < best) best = dist;
    }
    return best;
  }

  /** The next checkpoint area ahead of distance d, or null after the finish. */
  nextCheckpoint(d) {
    for (let i = 1; i < this.areas.length; i++) {
      if (this.areas[i].start > d) return this.areas[i];
    }
    return null;
  }
}
