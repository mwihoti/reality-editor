// The footage. Every moving prop is a pure function of world.time.
// A cut is stamped with the time it happened, so scrubbing the clock back
// past it undoes the edit — and scrubbing forward re-applies it.

import { CONFIG } from './config.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class World {
  constructor(level) {
    this.level = level;
    this.byIdmap = new Map(level.props.map(p => [p.id, p]));
    this.reset();
  }

  reset() {
    this.time = CONFIG.rules.startTime;
    this.tape = CONFIG.rules.maxTape;
    this.cuts = [];
    this.rewinding = false;
    this.dollyBoard = null;
    this.fx = [];
    this.toasts = [];
    this.progress = { scene1: false, scene2: false, won: false };
  }

  byId(id) { return this.byIdmap.get(id); }

  // ---- footage clock ------------------------------------------------------
  update(dt, input) {
    const canRewind = input.rewind && this.tape > 0.0001 && this.time > 0.0001;
    this.rewinding = canRewind;

    if (canRewind) {
      const spend = Math.min(dt, this.tape);
      const back = Math.min(this.time, CONFIG.rules.rewindRate * spend);
      this.time -= back;
      this.tape = Math.max(0, this.tape - back / CONFIG.rules.rewindRate);
    } else if (!(input.rewind && this.time <= 0.0001)) {
      // holding rewind at the head of the tape parks the clock
      this.time += dt;
    }

    // the take records while it plays, so spent tape comes back slowly
    if (!canRewind) {
      this.tape = Math.min(CONFIG.rules.maxTape, this.tape + dt * CONFIG.rules.tapeRefill);
    }

    const now = performance.now() / 1000;
    if (this.fx.length) this.fx = this.fx.filter(f => now - f.born < CONFIG.feel.cutGhost);
    if (this.toasts.length) this.toasts = this.toasts.filter(t => now - t.born < CONFIG.feel.toast);
  }

  // ---- props --------------------------------------------------------------
  stateAt(p, t) {
    const out = { x: p.x, y: p.y, w: p.w, h: p.h };
    const m = p.motion;
    if (!m) return out;

    if (m.type === 'sine') {
      const u = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (t / m.period + (m.phase || 0)));
      out.x = m.from + (m.to - m.from) * u;
    } else if (m.type === 'linear') {
      const lo = Math.min(m.from, m.to);
      const hi = Math.max(m.from, m.to);
      // The dolly parks at the ledge once the clock is rewound past its take.
      // If the player boards it there, the take resumes from that moment, so
      // stepping on always starts the ride instead of waiting for the clock.
      const base = (p.id === 'dolly' && this.dollyBoard !== null) ? this.dollyBoard : m.startTime;
      out.x = clamp(m.from + m.speed * (t - base), lo, hi);
    }
    return out;
  }

  alive(p) {
    for (const c of this.cuts) {
      if (c.t <= this.time && c.ids.indexOf(p.id) !== -1) return false;
    }
    return true;
  }

  // ---- puzzle 3 mechanism -------------------------------------------------
  // The drive wheel freezes the load line at the moment it was cut.
  driveCutTime() {
    let t = Infinity;
    for (const c of this.cuts) {
      if (c.t <= this.time && c.ids.indexOf(this.level.drive.id) !== -1) t = Math.min(t, c.t);
    }
    return t;
  }

  driveRunning() { return this.driveCutTime() === Infinity; }

  lineTime() {
    const cut = this.driveCutTime();
    return cut === Infinity ? this.time : cut;
  }

  loadCX() {
    const L = this.level.load;
    const t = this.lineTime();
    const cx = L.anchorCX - L.speed * (CONFIG.rules.startTime - t);
    return clamp(cx, L.minCX, L.anchorCX);
  }

  sensorLoaded() {
    return Math.abs(this.loadCX() - this.level.sensorCX) <= CONFIG.mechanism.sensorHalfWindow;
  }

  exitOpen() { return this.sensorLoaded(); }

  // ---- cutting ------------------------------------------------------------
  cutsUsed() {
    let n = 0;
    for (const c of this.cuts) if (c.t <= this.time) n++;
    return n;
  }

  cutsLeft() { return Math.max(0, CONFIG.rules.maxCuts - this.cutsUsed()); }

  cuttableProps() {
    return this.level.props.filter(p => p.cuttable && this.alive(p));
  }

  commitCut(rect) {
    if (this.rewinding) return { ok: false, reason: 'rewinding' };
    if (this.cutsLeft() <= 0) return { ok: false, reason: 'no-blades' };
    if (!rect || rect.w < 10 || rect.h < 10) return { ok: false, reason: 'tiny' };

    const ids = [];
    for (const p of this.cuttableProps()) {
      const s = this.stateAt(p, this.time);
      const ax = s.x + s.w / 2;
      const ay = s.y + s.h / 2;
      if (ax >= rect.x && ax <= rect.x + rect.w && ay >= rect.y && ay <= rect.y + rect.h) {
        ids.push(p.id);
      }
    }
    if (!ids.length) return { ok: false, reason: 'nothing' };

    this.cuts.push({ t: this.time, rect, ids });
    this.fx.push({ kind: 'cut', rect, born: performance.now() / 1000 });
    return { ok: true, ids };
  }

  // ---- collision ----------------------------------------------------------
  solids(groundedOn = null) {
    const list = [];
    for (const p of this.level.props) {
      if (!p.solid || !this.alive(p)) continue;
      if (p.kind === 'shutter' && this.exitOpen()) continue;
      // during rewind the footage is a ghost: it cannot drag or crush you —
      // except the thing you are standing on, which must not vanish underfoot
      if (p.motion && this.rewinding && p.id !== groundedOn) continue;
      const s = this.stateAt(p, this.time);
      list.push({ id: p.id, x: s.x, y: s.y, w: s.w, h: s.h, moving: !!p.motion });
    }
    return list;
  }

  // ---- progression --------------------------------------------------------
  toast(text) {
    this.toasts.push({ text, born: performance.now() / 1000 });
  }

  checkProgress(player) {
    const events = [];
    const cx = player.x + player.w / 2;

    for (const z of this.level.zones) {
      if (!this.progress[z.id] && cx > z.x) {
        this.progress[z.id] = true;
        this.toast(z.label);
        events.push(z.id);
      }
    }

    const e = this.level.exit;
    const inExit = cx > e.x && cx < e.x + e.w && player.y + player.h > e.y;
    if (!this.progress.won && this.exitOpen() && inExit) {
      this.progress.won = true;
      events.push('won');
    }

    return events;
  }
}
