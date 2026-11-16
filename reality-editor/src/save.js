// Local progress, kept in localStorage.
//
// Nothing here is allowed to break the game: a browser that blocks storage
// (private mode, file://, an embedded itch iframe with strict settings) simply
// gets a blank save and no persistence. Every read is validated, so a stale or
// hand-edited entry from an older build can't produce NaN or a scene index
// that doesn't exist.

const KEY = 'reality-editor.v1';

const DEFAULTS = {
  unlocked: 0,      // highest scene index the player may start from
  cleared: [],      // scene indices finished at least once
  best: null,       // { time } — fastest full run, in seconds
  finished: false   // the ninth scene has been played through
};

function store() {
  try {
    const s = window.localStorage;
    const probe = '__reality_editor_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function clean(raw) {
  const out = { ...DEFAULTS, cleared: [] };
  if (!raw || typeof raw !== 'object') return out;

  if (Number.isFinite(raw.unlocked)) {
    out.unlocked = Math.max(0, Math.floor(raw.unlocked));
  }
  if (Array.isArray(raw.cleared)) {
    out.cleared = [...new Set(raw.cleared.filter(n => Number.isInteger(n) && n >= 0))];
    out.unlocked = Math.max(out.unlocked, ...out.cleared.map(n => n + 1), 0);
  }
  if (raw.best && Number.isFinite(raw.best.time) && raw.best.time > 0) {
    out.best = { time: raw.best.time };
  }
  out.finished = !!raw.finished;
  return out;
}

export function readSave() {
  const s = store();
  if (!s) return { ...DEFAULTS, cleared: [] };
  try {
    return clean(JSON.parse(s.getItem(KEY) || 'null'));
  } catch {
    return { ...DEFAULTS, cleared: [] };
  }
}

export function writeSave(progress) {
  const s = store();
  if (!s) return false;
  try {
    const v = clean(progress);
    s.setItem(KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  const s = store();
  if (!s) return;
  try {
    s.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

// Clamp a saved scene index to the scenes this build actually has.
export function resumeIndex(progress, levelCount) {
  if (!levelCount) return 0;
  return Math.min(Math.max(0, progress.unlocked | 0), levelCount - 1);
}
