// =============================================================================
// work.js — everything about WORK MODE money and vehicles, in one place.
// All money is in naira (₦). Change these to rebalance the hustle.
// =============================================================================

export const WORK = {
  dayLength: 170, // real seconds in one working day
  dayStartHour: 6, // 6:00 AM
  dayEndHour: 20, // 8:00 PM
  pickupSpeed: 110, // you must be slower than this (px/s, about 20 km/h) to pick up / drop
  boardTime: 0.25, // seconds you must stay slow beside them
  pickupReach: 60, // how close (px, along the road) you must be to a waiting passenger
  // Drop zone for each bus stop: this stretch just AFTER the junction, in the
  // right lane, beside the bus stop shelter (distances past the junction line).
  dropZone: { from: 40, to: 320 },
  repairCost: 400, // each crash
  jumpOutChance: 0.25, // chance EACH passenger jumps out (without paying) after a crash
  terminusShare: 0.2, // share of passengers going all the way to the last stop
  strikesToLose: 3, // fail to pay Oga this many times and he collects his motor
  ogaWord: "Oga's money", // what the HUD calls the daily payment
  // How far people ride: higher = more short hops (1 = evenly spread).
  shortTripBias: 1.6,
};

/**
 * FARE NEGOTIATION. When you stop beside someone, they make an offer first
 * (a bit below the normal fare) and you pick:
 *   1 = take their offer   2 = ask the normal fare   3 = ask for more
 * Every passenger secretly has a most they'll pay. Ask above it and they
 * either make a counter-offer or walk away.
 */
export const NEGOTIATION = {
  offerBelow: [50, 100], // their first offer is normal fare minus this (₦)
  askAbove: 100, // option 3 asks normal fare + this
  maxPayRange: [-100, 150], // their secret limit = normal fare + random in this range
  counterChance: 0.75, // if you ask too much: chance they counter instead of walking off
  roundTo: 50, // prices are rounded to ₦50
  patience: 7, // seconds they wait for your answer before walking off
};

/**
 * The rides you can pick in the garage.
 * fares.longFrom = how many stops away counts as a "long" drop.
 */
export const VEHICLES = {
  micra: {
    id: 'micra',
    name: 'Micra',
    texture: 'player', // see art/textures.js
    body: 'player', // collision size key in BODY_SIZES
    routeId: 'tollgate-ojoo',
    seats: 5,
    seatsNote: '2 for front, 3 for back',
    fares: { short: 300, long: 400, longFrom: 3 },
    fuelPer1000px: 28, // fuel money burnt per 1000 px driven
    ticket: 200, // agbero / union ticket paid at the start of every trip
    ogaDaily: 3500,
    paymentsToOwn: 10, // pay Oga this many days and the Micra is yours
    stats: { maxSpeed: 470, acceleration: 300, lateralSpeed: 300 },
    blurb: 'Fast, carries 5. Oga wants more money.',
  },
  maruwa: {
    id: 'maruwa',
    name: 'Maruwa',
    texture: 'player-keke',
    body: 'maruwa',
    routeId: 'kuola-agodi',
    seats: 4,
    seatsNote: '3 for back, 1 beside driver',
    fares: { short: 300, long: 400, longFrom: 5 }, // 5+ stops away = long drop
    fuelPer1000px: 16,
    ticket: 100,
    ogaDaily: 2500,
    paymentsToOwn: 8,
    stats: { maxSpeed: 340, acceleration: 320, lateralSpeed: 340 },
    blurb: 'Slower but squeezes through. Cheaper to run.',
  },
};
