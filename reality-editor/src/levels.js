// The shoot list: nine scenes, each with its own object and its own verb.
//
//   01 studio   crate wall -> dolly ride -> load line + wheel
//   02 clearing SWING GATE      rewind until the gate swings clear, then run
//   03 stream   LIFT            rewind it down, ride it up to a high door
//   04 scaffold PRESSURE PLATE  park the dolly on the pad to hold a door open
//   05 hoist    STRICT HOIST    park the load AND cut the wheel
//   06 crossing gate + lift
//   07 alley    plate + gate
//   08 tide     lift + hoist
//   09 last take gate + plate + lift
//
// Nothing after the studio repeats the studio's beats: no crate walls, no
// dolly rides across a gap. The dolly only appears as dead weight on a pad.

import { LEVEL as STUDIO } from './level.js';

const floorY = 820;
const standY = 726;

function makeLevel(spec) {
  let n = 0;
  const id = (p) => `${p}-${n++}`;
  const props = [];

  for (const [x, w] of spec.floors) {
    props.push({ id: id('floor'), kind: 'slab', x, y: floorY, w, h: 320, solid: true, cuttable: false });
  }
  for (const [x, w, y] of spec.ledges || []) {
    props.push({ id: id('ledge'), kind: 'slab', x, y, w, h: 320, solid: true, cuttable: false });
  }

  // A heavy bar hanging in a doorway. It is held up (clear) for part of every
  // cycle, then drops and lifts again: a dwell you can walk through, not a
  // single frame of daylight.
  for (const g of spec.gates || []) {
    const low = g.y ?? 360;
    const high = low - (g.lift ?? 240);
    props.push({
      id: id('gate'), kind: 'gate',
      x: g.x, y: high, w: g.w ?? 72, h: 460,
      solid: true, cuttable: false,
      motion: {
        type: 'cycle', axis: 'y',
        from: high, to: low,
        hold: g.hold ?? 0.42,
        period: g.period ?? 7, phase: g.phase ?? 0
      }
    });
  }

  // A platform that only moves on one axis: the clock lifts it.
  if (spec.lift) {
    const l = spec.lift;
    props.push({
      id: 'lift', kind: 'lift',
      x: l.x, y: l.down ?? floorY, w: l.w ?? 200, h: 26,
      solid: true, cuttable: false,
      // Periodic on purpose: a one-way trip would be unreachable once the
      // clock has run far past it. The dwell keeps it at the floor long enough
      // to step on, and a short rewind always finds it back down there.
      motion: {
        type: 'cycle', axis: 'y',
        from: l.down ?? floorY, to: l.up ?? 600,
        hold: l.hold ?? 0.45,
        period: l.period ?? 7, phase: l.phase ?? 0
      }
    });
  }

  // Dead weight on a rail, and the pad it has to rest on.
  if (spec.dolly) {
    const d = spec.dolly;
    props.push({
      id: 'dolly', kind: 'dolly',
      x: d.from, y: floorY, w: 200, h: 26,
      solid: true, cuttable: false,
      motion: { type: 'linear', from: d.from, to: d.to, startTime: d.startTime ?? 22, speed: d.speed ?? 45 }
    });
  }
  if (spec.plate) {
    props.push({
      id: 'plate', kind: 'plate',
      x: spec.plate.x, y: floorY - 10, w: spec.plate.w ?? 240, h: 10,
      solid: false, cuttable: false
    });
  }
  if (spec.relay) {
    props.push({
      id: 'relay', kind: 'relay',
      x: spec.relay.x, y: 600, w: 64, h: 220,
      solid: true, cuttable: false
    });
  }

  const level = {
    label: spec.label,
    theme: spec.theme,
    room: { width: spec.width, height: 1080, floorY },
    spawn: { x: 170, y: standY },
    props,
    zones: [],
    hints: spec.hints || []
  };

  if (spec.crane) {
    const c = spec.crane;
    props.push({ id: 'rail', kind: 'rail', x: c.railX, y: 516, w: c.railW, h: 18, solid: false, cuttable: false });
    props.push({ id: 'sensor', kind: 'sensor', x: c.sensorCX - 42, y: 516, w: 84, h: 18, solid: false, cuttable: false });
    props.push({ id: 'wheel', kind: 'wheel', x: c.wheelX, y: 542, w: 124, h: 124, solid: false, cuttable: true });
    level.drive = { id: 'wheel' };
    level.load = { anchorCX: c.anchorCX, minCX: c.minCX, speed: 45, size: 84, hangY: 566 };
    level.sensorCX = c.sensorCX;
  }

  const doorX = spec.exitX;
  const doorY = spec.exitY ?? floorY;
  props.push({ id: 'frame', kind: 'frame', x: doorX - 44, y: doorY - 254, w: 160, h: 254, solid: false, cuttable: false });
  props.push({ id: 'shutter', kind: 'shutter', x: doorX, y: doorY - 220, w: 64, h: 220, solid: true, cuttable: false });
  level.exit = { x: doorX + 64, y: doorY - 60, w: 240, h: 260, doorX, doorY };

  level.checkpoints = [{ x: 180, y: standY }];
  return level;
}

const wallHint = (from, until, at) => ({
  from, until, need: 'wall', at,
  lines: ['DRAG A BOX OVER THE CRATES'], sub: 'LMB drag · every crate you box disappears'
});
const dollyHint = (from, until, at) => ({
  from, until, need: 'dollyAway', at,
  lines: ['HOLD R: REWIND THE DOLLY', 'BACK TO THE LEDGE'], sub: 'you stand still — the room moves'
});
const gateHint = (from, until, at) => ({
  from, until, need: 'gate', at,
  lines: ['HOLD R: RAISE THE GATE'], sub: 'scrub until it lifts, then run through'
});
const liftHint = (from, until, at) => ({
  from, until, need: 'lift', at,
  lines: ['HOLD R: LOWER THE LIFT'], sub: 'step on, then let the take run'
});
const plateHint = (from, until, at) => ({
  from, until, need: 'plate', at,
  lines: ['REWIND THE DOLLY ONTO THE PAD'], sub: 'the door only holds while weight sits on it'
});
const craneHint = (from, at) => ({
  from, need: 'crane', at,
  lines: ['PARK THE LOAD ON THE SENSOR,', 'THEN CUT THE DRIVE WHEEL'],
  sub: 'both — parked alone is not an edit'
});

// The original set, with the same data-driven hints the new levels use.
const studio = {
  ...STUDIO,
  label: 'THE STUDIO',
  theme: 'studio',
  hints: [
    { from: 0, until: 1500, need: 'wall', at: { x: 1010, y: 300 },
      lines: ['DRAG A BOX OVER THE CRATES', 'TO CUT THEM OUT OF THE SCENE'],
      sub: 'LMB drag · every crate you box disappears' },
    { from: 900, until: 2050, need: 'dollyAway', at: { x: 1830, y: 486 },
      lines: ['HOLD R: REWIND THE DOLLY', 'BACK TO THE LEDGE'],
      sub: 'you stand still — the room moves' },
    { from: 2260, need: 'craneFrozen', at: { x: 3120, y: 292 },
      lines: ['THE LINE IS FROZEN OFF THE SENSOR'],
      sub: 'rewind past the cut — the wheel comes back' },
    { from: 2260, need: 'craneLoaded', at: { x: 3120, y: 300 },
      lines: ['SENSOR LOADED — NOW CUT THE WHEEL'], sub: '' },
    { from: 2260, need: 'crane', at: { x: 3120, y: 292 },
      lines: ['REWIND THE LOAD ONTO THE SENSOR,', 'THEN CUT THE DRIVE WHEEL'],
      sub: 'the cut is what freezes it in place' }
  ]
};

export const LEVELS = [
  studio,

  // 02 — forest: a gate on a cable, and nothing else. Rewind, don't cut.
  makeLevel({
    label: 'THE CLEARING', theme: 'forest', width: 2600,
    floors: [[-160, 2760]],
    // phase chosen so the bar is DOWN when the player reaches it (~world 33s).
    // With phase 0.5 the bar's whole low window passed while the player was
    // still crossing the room, so the gate was decorative and the rewind the
    // hint asks for did nothing at all.
    gates: [{ x: 1180, period: 7.5, phase: 0.24 }],
    exitX: 2100,
    hints: [gateHint(600, 1500, { x: 1180, y: 300 })]
  }),

  // 03 — forest: the door is up on the bank, and the lift is the only way up.
  // The lift hangs in a hole in the floor, so you can only get across by riding.
  makeLevel({
    label: 'THE STREAM', theme: 'forest', width: 2900,
    floors: [[-160, 1860]],
    ledges: [[1900, 1000, 600]],
    lift: { x: 1700, w: 200, up: 594, down: 820 },
    exitX: 2150, exitY: 600,
    hints: [liftHint(850, 1700, { x: 1800, y: 430 })]
  }),

  // 04 — city: a door that only holds while the dolly sits on the pad.
  // The dolly rolled over the pad before the take starts: rewind to put it back.
  makeLevel({
    label: 'SCAFFOLD', theme: 'urban', width: 2900,
    floors: [[-160, 3060]],
    dolly: { from: 700, to: 1500, startTime: 20, speed: 90 },
    plate: { x: 700, w: 360 },
    relay: { x: 1200 },
    exitX: 1400,
    hints: [plateHint(300, 1200, { x: 880, y: 520 })]
  }),

  // 05 — city: the hoist, and it takes the whole edit.
  makeLevel({
    label: 'THE HOIST', theme: 'urban', width: 2700,
    floors: [[-160, 2860]],
    crane: { railX: 1200, railW: 600, sensorCX: 1620, anchorCX: 1760, minCX: 1300, wheelX: 1080 },
    exitX: 2000,
    hints: [craneHint(900, { x: 1620, y: 292 })]
  }),

  // 06 — town: a gate in the street, then the lift to the raised door.
  makeLevel({
    label: 'CROSSING', theme: 'town', width: 3200,
    floors: [[-160, 2160]],
    gates: [{ x: 900, period: 6.5, phase: 0.2 }],
    ledges: [[2200, 1000, 600]],
    lift: { x: 2000, w: 200, up: 594, down: 820 },
    exitX: 2450, exitY: 600,
    hints: [gateHint(500, 1100, { x: 900, y: 300 }), liftHint(1500, 2000, { x: 2100, y: 430 })]
  }),

  // 07 — town: the pad buys you a dash, the gate buys you a wait.
  makeLevel({
    label: 'THE ALLEY', theme: 'town', width: 2900,
    floors: [[-160, 3060]],
    dolly: { from: 700, to: 1500, startTime: 20, speed: 90 },
    plate: { x: 700, w: 360 },
    relay: { x: 1400 },
    gates: [{ x: 1900, period: 8, phase: 0.35 }],
    exitX: 2300,
    hints: [plateHint(300, 1400, { x: 880, y: 520 }), gateHint(1600, 2100, { x: 1900, y: 300 })]
  }),

  // 08 — beach: ride up to the hoist deck and make the edit up there.
  makeLevel({
    label: 'THE TIDE', theme: 'beach', width: 3300,
    floors: [[-160, 2060]],
    ledges: [[2100, 1200, 600]],
    lift: { x: 1900, w: 200, up: 594, down: 820 },
    crane: { railX: 2200, railW: 520, sensorCX: 2400, anchorCX: 2500, minCX: 2250, wheelX: 2200 },
    exitX: 2700, exitY: 600,
    hints: [craneHint(1200, { x: 2400, y: 292 }), liftHint(1500, 1900, { x: 2000, y: 430 })]
  }),

  // 09 — beach finale: pad, gate, then the lift to the last door.
  makeLevel({
    label: 'LAST TAKE', theme: 'beach', width: 3400,
    floors: [[-160, 2460]],
    // the finale stacks three objects, so its pad is the most generous in the
    // game: at speed 90 the door held for 4s and the run through it was down
    // to a frame; 60 gives 6s, which leaves the dash some slack
    dolly: { from: 700, to: 1500, startTime: 20, speed: 60 },
    plate: { x: 700, w: 360 },
    relay: { x: 1300 },
    gates: [{ x: 1700, period: 7, phase: 0.65 }],
    ledges: [[2500, 1000, 600]],
    lift: { x: 2300, w: 200, up: 594, down: 820 },
    exitX: 2750, exitY: 600,
    hints: [
      plateHint(300, 1300, { x: 880, y: 520 }),
      gateHint(1400, 1800, { x: 1700, y: 300 }),
      liftHint(1900, 2300, { x: 2400, y: 430 })
    ]
  })
];

export const levelCount = LEVELS.length;

// kept for the studio's own hints
export const hintHelpers = { wallHint, dollyHint };
