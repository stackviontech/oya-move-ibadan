// =============================================================================
// dev/autopilot.js — DEVELOPMENT ONLY balancing tool (not included in builds).
//
// A simple bot that drives a whole work day super fast, so you can check if
// the money in config/work.js feels right. In the browser console (npm run dev):
//
//   __workDay('micra')        → plays one full day, returns a money summary
//   __workDays('maruwa', 5)   → plays 5 days in a row
//
// The bot keeps right, slows down for passengers, stops at drop zones and
// overtakes when blocked. A careful human should do about as well.
// =============================================================================

export function installAutopilot(game) {
  let t = performance.now();
  // Update the game without drawing it (much faster than real time).
  const fast = (ms) => {
    for (let i = 0; i < Math.round(ms / 16.667); i++) game.scene.update((t += 16.667), 16.667);
  };

  const workBot = () => {
    const w = game.scene.getScene('Work');
    const p = w.player;
    const input = w.touchInput;
    const pax = w.pax;
    // Haggling: always ask the normal fare, accept any counter-offer.
    const n = pax.negotiation;
    if (n && n.patience < 6) pax.choose(n.stage === 'open' ? 2 : 1);
    const objs = [
      ...w.traffic.vehicles.filter((v) => v.active),
      ...w.traffic.obstacles.items.filter((o) => o.active),
      ...w.traffic.peds.items.filter((q) => q.active && !q.fleeing),
    ];
    const gapFor = (off) => {
      let g = 9999;
      for (const o of objs) {
        if (o.d <= p.d - p.halfH - o.halfH - 10) continue;
        if (Math.abs(o.offset - off) < o.halfW + p.halfW + 14) g = Math.min(g, o.d - p.d - o.halfH - p.halfH);
      }
      return g;
    };
    let wantSlow = false;
    if (pax.seatsUsed < w.vehicle.seats) {
      for (const q of pax.pool.items) if (q.active && q.state === 'waiting' && q.d - p.d > -40 && q.d - p.d < 200) wantSlow = true;
    }
    const j = pax.nextDropStop();
    if (j >= 0) {
      const a = w.model.areas[j];
      if (p.d > a.start - 160 && p.d < a.start + 120) wantSlow = true;
    }
    const cur = p.offset;
    const curGap = gapFor(cur);
    let target = 76;
    if (curGap < 350) {
      let best = -1e9;
      for (const off of [-76, 0, 76]) {
        const s = Math.min(gapFor(off), 600) - Math.abs(off - cur) * 0.6 + (off === 76 ? (wantSlow ? 400 : 60) : 0);
        if (s > best) {
          best = s;
          target = off;
        }
      }
    }
    // only change lanes when the target lane is clear beside us
    const besideClear = objs.every((o) => Math.abs(o.d - p.d) > o.halfH + p.halfH + 12 || Math.abs(o.offset - target) > o.halfW + p.halfW + 6);
    input.left = besideClear && target < cur - 6;
    input.right = besideClear && target > cur + 6;
    const desired = pax.negotiation ? 0 : wantSlow ? 90 : 9999; // stay put while haggling
    const brakeGap = p.speed * 0.32 + 30;
    input.down = curGap < brakeGap || p.speed > desired + 12;
    input.up = !input.down && curGap > brakeGap + 40 && p.speed < desired - 8;
  };

  const workDay = (vehicleId = 'micra') => {
    // SceneManager.stop runs immediately here (a scene's own this.scene.stop()
    // would be queued and could stop the NEW day right after it starts).
    for (const k of ['Menu', 'Garage', 'Game', 'GameOver', 'Pause', 'DaySummary', 'Work']) {
      const s = game.scene.getScene(k);
      if (s.sys.isActive() || s.sys.isPaused()) game.scene.stop(k);
    }
    game.scene.start('Work', { vehicleId });
    fast(200);
    for (let i = 0; i < 220 * 20; i++) {
      if (game.scene.getScene('DaySummary').sys.isActive()) break;
      const w = game.scene.getScene('Work');
      if (w.sys.isActive() && !w.state.over) workBot();
      fast(50);
    }
    const S = game.scene.getScene('DaySummary');
    const d = S.day;
    const r = S.result;
    return `${vehicleId} day ${r.dayNumber}: ${d.passengers} pax, fares ₦${d.fares}, fuel ₦${Math.round(d.fuel)}, tickets ₦${d.tickets}, repairs ₦${d.repairs} (${d.crashes} crashes), trips ${d.trips}, missed ${d.missed}, jumped ${d.jumped} → NET ₦${Math.round(r.net)} vs Oga ₦${r.due}: ${r.paidInFull ? 'PAID' : 'SHORT'}`;
  };

  window.__fast = fast;
  window.__workDay = workDay;
  window.__workDays = (vehicleId, n = 3) => Array.from({ length: n }, () => workDay(vehicleId));
}
