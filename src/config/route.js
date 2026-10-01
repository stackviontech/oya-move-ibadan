// =============================================================================
// route.js — THE file to edit when you want to change or add places.
//
// A route is a list of AREAS. Each area starts at a junction (with a big
// signboard) and runs for `length` pixels until the next area's junction.
// The last area is the finish line.
//
// To add a new area: copy one of the objects below, change the name and
// numbers, and put it where it belongs in the list. No game code changes.
// To make a brand new route (e.g. Challenge → Bodija), add another entry to
// ROUTES and point DEFAULT_ROUTE_ID at it.
// =============================================================================

// Traffic "mix" numbers are relative weights: { car: 4, micra: 2 } means cars
// appear twice as often as Micra taxis. Vehicle types: car, micra, truck, okada, keke.

// Ready-made traffic mixes for the work routes.
const EXPRESSWAY = { car: 4, micra: 4, okada: 2, keke: 1, truck: 3 }; // lorries and tankers
const CITY = { car: 3, micra: 4, okada: 4, keke: 4, truck: 1 }; // inner-city roads

/**
 * Shortcut for a work-mode bus stop. Pass only what differs from the defaults.
 * @param {string} name bus stop name shown on the signboard and to passengers
 * @param {number} length distance (px) to the next bus stop
 */
function stop(name, length, o = {}) {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    sign: name.toUpperCase(),
    subSign: o.subSign || 'Bus stop',
    length,
    bonusTime: 0,
    curve: o.finish ? 0 : (o.curve ?? 45),
    traffic: { density: o.density ?? 0.7, mix: o.mix || { car: 3, micra: 5, okada: 3, keke: 2, truck: 1 } },
    potholes: o.finish ? 0 : (o.potholes ?? 0.9),
    pedestrians: o.pedestrians ?? 0.7,
    obstacles: o.finish ? 0 : (o.obstacles ?? 0.1),
    waiting: o.waiting ?? 2,
    scenery: o.scenery || { buildings: 0.9, hawkers: 0.9, trees: 0.4, hills: 0.5 },
    finish: !!o.finish,
  };
}

export const ROUTES = {
  'iwo-road-ojoo': {
    id: 'iwo-road-ojoo',
    title: 'Iwo Road to Ojoo',
    startTime: 32, // seconds on the clock when you set off
    // Star rating: finish within these many seconds of total driving time.
    stars: { three: 90, two: 110 },
    areas: [
      {
        id: 'iwo-road',
        name: 'Iwo Road',
        sign: 'IWO ROAD',
        subSign: 'Interchange',
        length: 3600,
        bonusTime: 0, // start junction, no bonus
        curve: 30, // how wiggly the road is in this stretch (0 = straight)
        traffic: { density: 1.0, mix: { car: 3, micra: 6, okada: 3, keke: 2, truck: 1 } },
        potholes: 0.5, // potholes per 1000 px of road
        pedestrians: 0.8, // chance of people crossing at this junction (0..1)
        obstacles: 0.15, // broken-down vehicles per 1000 px
        scenery: { buildings: 0.9, hawkers: 1.0, trees: 0.3, hills: 0.4 },
      },
      {
        id: 'beere',
        name: 'Beere',
        sign: 'BEERE',
        subSign: 'Roundabout',
        length: 5000,
        bonusTime: 20,
        curve: 60,
        traffic: { density: 0.65, mix: { car: 3, micra: 5, okada: 3, keke: 3, truck: 1 } },
        potholes: 0.9,
        pedestrians: 0.7,
        obstacles: 0.12,
        scenery: { buildings: 1.0, hawkers: 0.8, trees: 0.3, hills: 0.6 },
      },
      {
        id: 'dugbe',
        name: 'Dugbe',
        sign: 'DUGBE',
        subSign: 'Market',
        length: 5000,
        bonusTime: 22,
        curve: 45,
        landmark: 'cocoa-house', // draws the Cocoa House tower beside the road
        traffic: { density: 0.75, mix: { car: 4, micra: 5, okada: 2, keke: 2, truck: 1 } },
        potholes: 0.6,
        pedestrians: 0.9,
        obstacles: 0.1,
        scenery: { buildings: 1.0, hawkers: 1.0, trees: 0.2, hills: 0.3 },
      },
      {
        id: 'mokola',
        name: 'Mokola',
        sign: 'MOKOLA',
        subSign: 'Roundabout',
        length: 4600,
        bonusTime: 22,
        curve: 35,
        traffic: { density: 1.0, mix: { car: 3, micra: 6, okada: 4, keke: 3, truck: 1 } },
        potholes: 0.8,
        pedestrians: 0.9,
        obstacles: 0.15,
        scenery: { buildings: 0.9, hawkers: 1.0, trees: 0.3, hills: 0.5 },
      },
      {
        id: 'sango',
        name: 'Sango',
        sign: 'SANGO',
        subSign: '',
        length: 5200,
        bonusTime: 21,
        curve: 70,
        traffic: { density: 0.6, mix: { car: 3, micra: 5, okada: 3, keke: 2, truck: 1 } },
        potholes: 1.0,
        pedestrians: 0.6,
        obstacles: 0.12,
        scenery: { buildings: 0.8, hawkers: 0.6, trees: 0.6, hills: 0.8 },
      },
      {
        id: 'ui-gate',
        name: 'UI Gate',
        sign: 'UI GATE',
        subSign: 'University of Ibadan',
        length: 5000,
        bonusTime: 22,
        curve: 55,
        traffic: { density: 0.7, mix: { car: 4, micra: 5, okada: 3, keke: 3, truck: 1 } },
        potholes: 0.7,
        pedestrians: 1.0,
        obstacles: 0.1,
        scenery: { buildings: 0.7, hawkers: 0.7, trees: 0.9, hills: 0.7 },
      },
      {
        id: 'ojoo',
        name: 'Ojoo',
        sign: 'OJOO',
        subSign: 'Finish',
        finish: true,
        length: 1400, // a little road past the finish so it doesn't end in a void
        bonusTime: 0,
        curve: 0,
        traffic: { density: 0.5, mix: { car: 2, micra: 7, okada: 2, keke: 2, truck: 1 } },
        potholes: 0,
        pedestrians: 0.8,
        obstacles: 0,
        scenery: { buildings: 1.0, hawkers: 1.0, trees: 0.3, hills: 0.5 },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // WORK MODE routes. Every area is a bus stop where passengers wait.
  // `waiting` = average number of people waiting at that stop.
  // The bus stop order can be edited freely — just keep the terminus last.
  // ---------------------------------------------------------------------------
  'tollgate-ojoo': {
    id: 'tollgate-ojoo',
    title: 'Toll Gate ↔ Ojoo',
    areas: [
      stop('Toll Gate', 2600, { subSign: 'Lagos-Ibadan Expressway', waiting: 4.5, mix: EXPRESSWAY }),
      stop('Boluwaji', 2200, { waiting: 3.5, mix: EXPRESSWAY }),
      stop('Academy', 2200, { waiting: 3.5, mix: EXPRESSWAY }),
      stop('Muslim', 2000, { waiting: 3.5, mix: EXPRESSWAY, pedestrians: 0.9 }),
      stop('Olorunsogo', 2400, { mix: EXPRESSWAY, waiting: 4 }),
      stop('Oremeji', 2200, { waiting: 3.5, mix: EXPRESSWAY }),
      stop('Iwo Road', 3400, { subSign: 'Interchange', density: 1.0, waiting: 4.5 }),
      stop('Ojoo', 1400, { subSign: 'Terminus', finish: true, waiting: 4.5 }),
    ],
  },
  // Maruwa route: Akala Expressway (Kuola → New Garage), through Challenge,
  // then the Molete → Oja'ba → Beere → Oje → Gate corridor. Short hops, busy
  // inner-city stops. Stops marked "check" are best guesses — reorder freely.
  'kuola-agodi': {
    id: 'kuola-agodi',
    title: 'Kuola ↔ Agodi Gate',
    areas: [
      stop('Kuola', 1300, { waiting: 3, mix: CITY }),
      stop('Elebu', 1100, { waiting: 2, mix: CITY }),
      stop('Ologede', 1000, { waiting: 1.5, mix: CITY }), // check
      stop('Tipper Garage', 1000, { waiting: 1.5, mix: CITY }),
      stop('New Garage', 1300, { waiting: 3, density: 0.9, mix: CITY }),
      stop('Adeoye', 1000, { waiting: 1.5, mix: CITY }), // check
      stop('Challenge', 1400, { subSign: 'Roundabout', waiting: 3, density: 1.0, mix: CITY }),
      stop('Felele', 1000, { waiting: 2, mix: CITY }),
      stop('Molete', 1200, { subSign: 'Under bridge', waiting: 3, density: 0.9, mix: CITY }),
      stop("Oja'ba", 1000, { subSign: 'Market', waiting: 3, density: 1.0, mix: CITY, pedestrians: 1 }),
      stop('Mapo', 1000, { subSign: 'Mapo Hall', waiting: 2, mix: CITY }), // check
      stop('Oranyan', 1000, { waiting: 1.5, mix: CITY }), // check
      stop('Beere', 1200, { subSign: 'Roundabout', waiting: 3, density: 1.0, mix: CITY }),
      stop('Orita Mefa', 1000, { waiting: 1.5, mix: CITY }), // check
      stop('Oje', 1100, { subSign: 'Market', waiting: 2.5, mix: CITY, pedestrians: 1 }),
      stop('Agodi Gate', 1400, { subSign: 'Terminus', finish: true, mix: CITY }),
    ],
  },
};

export const DEFAULT_ROUTE_ID = 'iwo-road-ojoo';

// -----------------------------------------------------------------------------
// Difficulty — global multipliers applied on top of the per-area numbers.
// -----------------------------------------------------------------------------
export const DIFFICULTY = {
  // How many vehicles are on the road around you at density 1.0.
  maxVehiclesAtFullDensity: 16,
  // Speeds of AI vehicles in px/s: [min, max] (the player tops out at ~470).
  speeds: {
    car: [220, 310],
    micra: [220, 300],
    truck: [170, 220],
    okada: [250, 340],
    keke: [140, 185],
  },
  // Micra taxi "sudden stop to pick/drop passengers" behaviour.
  taxiStopChancePerSecond: 0.06, // per taxi — Micras are everywhere, so keep this low
  taxiStopTime: [1.6, 3.2],
  // Okada lane-weaving.
  okadaWeaveInterval: [0.7, 1.8],
  // Keke lane drifting.
  kekeDriftChancePerSecond: 0.18,
};
