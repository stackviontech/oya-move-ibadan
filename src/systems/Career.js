// =============================================================================
// Career.js — your work-mode progress for each ride, saved on this device.
//
//   day       which working day is next
//   savings   money you've kept after paying Oga
//   paid      how many days you've paid Oga in full
//   strikes   how many times you couldn't pay (3 = Oga collects his motor)
//   owned     true once you've finished paying for the car
// =============================================================================
import { WORK } from '../config/work.js';
import { load, save } from '../utils/storage.js';

const fresh = () => ({ day: 1, savings: 0, paid: 0, strikes: 0, owned: false, totalPassengers: 0 });

export function loadCareer(vehicleId) {
  return { ...fresh(), ...load(`career:${vehicleId}`, {}) };
}

export function saveCareer(vehicleId, career) {
  save(`career:${vehicleId}`, career);
}

export function resetCareer(vehicleId) {
  save(`career:${vehicleId}`, fresh());
}

/** Net money made today (fares minus running costs). */
export function dayNet(day) {
  return day.fares - day.fuel - day.tickets - day.repairs;
}

/**
 * End of day: pay Oga out of today's money (and savings if needed).
 * Returns a summary for the end-of-day screen and saves the new career.
 */
export function settleDay(vehicle, day) {
  const career = loadCareer(vehicle.id);
  const net = dayNet(day);
  const due = career.owned ? 0 : vehicle.ogaDaily;
  let pot = career.savings + net; // everything you have
  const result = { dayNumber: career.day, net, due, paidAmount: 0, paidInFull: false, strike: false, justOwned: false, collected: false };

  if (due === 0) {
    result.paidInFull = true;
  } else if (pot >= due) {
    pot -= due;
    result.paidAmount = due;
    result.paidInFull = true;
    career.paid++;
    if (career.paid >= vehicle.paymentsToOwn) {
      career.owned = true;
      result.justOwned = true;
    }
  } else {
    // Can't pay in full: Oga takes whatever you have and gives you a warning.
    result.paidAmount = Math.max(0, pot);
    pot = 0;
    career.strikes++;
    result.strike = true;
    if (career.strikes >= WORK.strikesToLose) result.collected = true;
  }

  career.savings = Math.max(0, pot);
  career.day++;
  career.totalPassengers += day.passengers;
  result.career = { ...career };

  if (result.collected) resetCareer(vehicle.id); // start again from day 1
  else saveCareer(vehicle.id, career);
  return result;
}

/** Format naira: 4000 → "₦4,000" (negative → "-₦500"). */
export function naira(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}₦${Math.abs(Math.round(n)).toLocaleString('en-NG')}`;
}
