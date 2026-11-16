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
    this.plateGrace = Infinity;   // no plate pressed yet: the relay stays shut
    this.dollyBoard = null;
    this.rescue = false;
    this.fx = [];
    this.toasts = [];
    this.progress = { scene1: false, scene2: false, won: false };
  }

  byId(id) { return this.byIdmap.get(id); }

  // Each level is a fresh set: new props, same rules.
  setLevel(level) {
    this.level = level;
    this.byIdmap = new Map(level.props.map(p => [p.id, p]));
    this.reset();
  }

  hasMechanism() {
    return !!(this.level.drive && this.level.load && this.level.sensorCX != null);
  }

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

    // A relay door is hydraulic: it holds open for a moment after the weight
    // leaves the pad. Otherwise the plate window's last frame is also its last
    // open frame, and stopping the rewind the instant the door opens shuts it
    // in your face — which reads as "the gate does not open".
    if (this.byIdmap.has('plate')) {
      if (this.plateHeld()) this.plateGrace = 0;
      else if (!this.rewinding) this.plateGrace += dt;
    }

    // Rescue valve: tape only comes back once it is completely spent, so a
    // mistake near the end of a run can't end the run, but the budget still
    // bites for every rewind you make while any tape remains.
    if (this.tape <= 0.0001) this.rescue = true;
    if (this.rescue && !canRewind) {
      this.tape = Math.min(CONFIG.rules.maxTape, this.tape + dt * CONFIG.rules.tapeRefill);
      if (this.tape >= CONFIG.rules.maxTape) this.rescue = false;
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

    const vertical = m.axis === 'y';
    if (m.type === 'sine') {
      const u = 0.5 - 0.5 * Math.cos(Math.PI * 2 * (t / m.period + (m.phase || 0)));
      const v = m.from + (m.to - m.from) * u;
      if (vertical) out.y = v; else out.x = v;
    } else if (m.type === 'cycle') {
      // Parked at `from` for the first `hold` of every period, then one smooth
      // trip to `to` and back. The dwell is what makes a lift boardable: a
      // plain sine only touches the floor for a single frame.
      const u = ((t / m.period + (m.phase || 0)) % 1 + 1) % 1;
      const hold = m.hold ?? 0.45;
      const k = u < hold ? 0 : Math.sin(Math.PI * (u - hold) / (1 - hold));
      const v = m.from + (m.to - m.from) * k;
      if (vertical) out.y = v; else out.x = v;
    } else if (m.type === 'linear') {
      const lo = Math.min(m.from, m.to);
      const hi = Math.max(m.from, m.to);
      // The dolly parks at the ledge once the clock is rewound past its take.
      // If the player boards it there, the take resumes from that moment, so
      // stepping on always starts the ride instead of waiting for the clock.
      const base = (p.id === 'dolly' && this.dollyBoard !== null) ? this.dollyBoard : m.startTime;
      const v = clamp(m.from + m.speed * (t - base), lo, hi);
      if (vertical) out.y = v; else out.x = v;
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
    if (!this.level.drive) return Infinity;
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
    if (!L) return null;
    const t = this.lineTime();
    const cx = L.anchorCX - L.speed * (CONFIG.rules.startTime - t);
    return clamp(cx, L.minCX, L.anchorCX);
  }

  sensorLoaded() {
    if (!this.hasMechanism()) return true;   // no load line: the exit is simply open
    return Math.abs(this.loadCX() - this.level.sensorCX) <= CONFIG.mechanism.sensorHalfWindow;
  }

  // A hoist scene demands the whole edit: the load parked on the sensor AND
  // the drive wheel cut to freeze it there. Parked alone is not enough — the
  // load drifts off the sensor the moment the clock runs on.
  exitOpen() {
    if (!this.hasMechanism()) return true;
    return this.sensorLoaded() && !this.driveRunning();
  }

  // A pressure plate is held by weight: only the dolly is heavy enough.
  plateHeld() {
    const pad = this.byId('plate');
    if (!pad) return false;
    const p = this.stateAt(pad, this.time);
    for (const pr of this.level.props) {
      if (pr.kind !== 'dolly' || !this.alive(pr)) continue;
      const s = this.stateAt(pr, this.time);
      if (s.x + s.w > p.x && s.x < p.x + p.w) return true;
    }
    return false;
  }

  shutterOpen(p) {
    if (!p) return true;
    if (p.kind === 'relay') {
      return this.plateHeld() || this.plateGrace < CONFIG.mechanism.relayGrace;
    }
    return this.exitOpen();
  }

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
      if ((p.kind === 'shutter' || p.kind === 'relay') && this.shutterOpen(p)) continue;
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
