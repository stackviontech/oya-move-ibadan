// Helpers for route data.

/**
 * The same route driven the other way (e.g. Ojoo → Toll Gate).
 * Each area's `length` is the distance to the NEXT stop, so lengths shift by
 * one when the order flips. The new last stop becomes the terminus.
 */
export function reverseRoute(route) {
  const src = route.areas;
  const n = src.length;
  const areas = [];
  for (let i = n - 1; i >= 0; i--) {
    const a = { ...src[i] };
    a.length = i > 0 ? src[i - 1].length : 1400; // runout past the new terminus
    a.finish = i === 0;
    if (a.finish) {
      a.subSign = 'Terminus';
      a.curve = 0;
      a.potholes = 0;
      a.obstacles = 0;
    } else if (src[i].finish) {
      // the old terminus is now the starting stop
      a.subSign = 'Bus stop';
      a.curve = src[i - 1] ? src[i - 1].curve || 40 : 40;
      a.potholes = 0.8;
      a.obstacles = 0.1;
    }
    areas.push(a);
  }
  const [first, last] = [areas[0].name, areas[n - 1].name];
  return { ...route, id: `${route.id}-back`, title: `${first} → ${last}`, areas };
}
