// Tiny wrapper around localStorage. Some browsers (private mode, embedded
// webviews) throw when you touch localStorage, so every call is guarded and
// the game simply works without saving in that case.

const PREFIX = 'oya-move-ibadan:';

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore: saving is a nice-to-have */
  }
}
