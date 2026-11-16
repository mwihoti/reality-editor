// The shoot list: nine scenes. Level 1 is the original studio set; the rest are
// new locations built from the same parts (crate walls, dollies, load lines).

import { LEVEL as STUDIO } from './level.js';

const floorY = 820;
const standY = 726;

// One builder for the new scenes so the geometry stays consistent:
// floors are [x, width] runs at y=820, gaps are whatever is left between them.
function makeLevel(spec) {
  let n = 0;
  const id = (p) => `${p}-${n++}`;
  const props = [];

  for (const [x, w] of spec.floors) {
    props.push({ id: id('floor'), kind: 'slab', x, y: floorY, w, h: 320, solid: true, cuttable: false });
  }

  for (const wall of spec.walls || []) {
    const rows = wall.rows ?? 3;
    const cols = wall.cols ?? 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        props.push({
          id: id('crate'), kind: 'crate',
          x: wall.x + c * 100, y: 720 - r * 100, w: 100, h: 100,
          solid: true, cuttable: true
        });
      }
    }
  }

  if (spec.dolly) {
    const d = spec.dolly;
    props.push({
      id: 'dolly', kind: 'dolly',
      x: d.from, y: floorY, w: 200, h: 26,
      solid: true, cuttable: false,
      motion: { type: 'linear', from: d.from, to: d.to, startTime: d.startTime ?? 22, speed: d.speed ?? 75 }
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
  props.push({ id: 'frame', kind: 'frame', x: doorX - 44, y: 566, w: 160, h: 254, solid: false, cuttable: false });
  props.push({ id: 'shutter', kind: 'shutter', x: doorX, y: 600, w: 64, h: 220, solid: true, cuttable: false });
  level.exit = { x: doorX + 64, y: 560, w: 240, h: 260, doorX };

  // A respawn at the start of every run of stage, plus one just before each gap.
  const cps = spec.floors.map(([x]) => ({ x: Math.max(180, x + 40), y: standY }));
  for (let i = 1; i < spec.floors.length; i++) {
    const [px, pw] = spec.floors[i - 1];
    const gapStart = px + pw;
    if (spec.floors[i][0] - gapStart > 120) cps.push({ x: Math.max(180, gapStart - 70), y: standY });
  }
  level.checkpoints = cps.sort((a, b) => a.x - b.x);

  return level;
}

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
      lines: ['SENSOR LOADED — GET TO THE EXIT!'], sub: '' },
    { from: 2260, need: 'crane', at: { x: 3120, y: 292 },
      lines: ['REWIND THE LOAD ONTO THE SENSOR,', 'THEN CUT THE DRIVE WHEEL'],
      sub: 'the cut is what freezes it in place' }
  ]
};

const wallHint = (from, until, at) => ({
  from, until, need: 'wall', at,
  lines: ['DRAG A BOX OVER THE CRATES'], sub: 'LMB drag, then release to cut'
});
const dollyHint = (from, until, at) => ({
  from, until, need: 'dollyAway', at,
  lines: ['HOLD R: THE DOLLY ROLLS BACK'], sub: 'you stand still — the footage moves'
});
const craneHint = (from, at) => ({
  from, need: 'crane', at,
  lines: ['REWIND THE LOAD ONTO THE SENSOR,', 'THEN CUT THE DRIVE WHEEL'],
  sub: 'the cut is what freezes it in place'
});

export const LEVELS = [
  studio,

  // 02 — forest, one wall: the cut verb again in a new place ------------------
  makeLevel({
    label: 'THE CLEARING', theme: 'forest', width: 2700,
    floors: [[-160, 2600]],
    walls: [{ x: 900, rows: 3, cols: 3 }],
    exitX: 2200,
    hints: [wallHint(0, 1500, { x: 1050, y: 300 })]
  }),

  // 03 — forest, a stream too wide to jump: rewind the dolly ------------------
  makeLevel({
    label: 'THE STREAM', theme: 'forest', width: 2900,
    floors: [[-160, 1560], [1800, 1000]],
    dolly: { from: 1410, to: 1600, startTime: 22 },
    exitX: 2500,
    hints: [dollyHint(1150, 2050, { x: 1600, y: 420 })]
  }),

  // 04 — city scaffold: cut the crates, then ride the lift across -------------
  makeLevel({
    label: 'SCAFFOLD', theme: 'urban', width: 2900,
    floors: [[-160, 1660], [1900, 900]],
    walls: [{ x: 700, rows: 3, cols: 3 }],
    dolly: { from: 1510, to: 1700, startTime: 22 },
    exitX: 2450,
    hints: [
      wallHint(0, 1350, { x: 850, y: 300 }),
      dollyHint(1280, 2150, { x: 1700, y: 420 })
    ]
  }),

  // 05 — city hoist: the load line on its own ---------------------------------
  makeLevel({
    label: 'THE HOIST', theme: 'urban', width: 2700,
    floors: [[-160, 2760]],
    crane: { railX: 1200, railW: 600, sensorCX: 1620, anchorCX: 1760, minCX: 1300, wheelX: 1080 },
    exitX: 2000,
    hints: [craneHint(900, { x: 1620, y: 292 })]
  }),

  // 06 — town crossing: all three beats in one street ------------------------
  makeLevel({
    label: 'CROSSING', theme: 'town', width: 3300,
    floors: [[-160, 1660], [1900, 1500]],
    walls: [{ x: 650, rows: 3, cols: 3 }],
    dolly: { from: 1510, to: 1700, startTime: 22 },
    crane: { railX: 2200, railW: 560, sensorCX: 2500, anchorCX: 2640, minCX: 2300, wheelX: 2080 },
    exitX: 2900,
    hints: [
      wallHint(0, 1300, { x: 800, y: 300 }),
      dollyHint(1250, 2150, { x: 1700, y: 420 }),
      craneHint(2000, { x: 2500, y: 292 })
    ]
  }),

  // 07 — town alley: a wall in front of the hoist ----------------------------
  makeLevel({
    label: 'THE ALLEY', theme: 'town', width: 2700,
    floors: [[-160, 2760]],
    walls: [{ x: 800, rows: 3, cols: 3 }],
    crane: { railX: 1600, railW: 560, sensorCX: 1900, anchorCX: 2040, minCX: 1700, wheelX: 1480 },
    exitX: 2300,
    hints: [
      wallHint(0, 1450, { x: 950, y: 300 }),
      craneHint(1350, { x: 1900, y: 292 })
    ]
  }),

  // 08 — beach tide: a long crossing, then the last wall ---------------------
  makeLevel({
    label: 'THE TIDE', theme: 'beach', width: 3200,
    floors: [[-160, 1360], [1800, 1300]],
    dolly: { from: 1210, to: 1600, startTime: 22 },
    walls: [{ x: 2300, rows: 3, cols: 3 }],
    exitX: 2900,
    hints: [
      dollyHint(950, 2050, { x: 1500, y: 420 }),
      wallHint(1950, 2900, { x: 2450, y: 300 })
    ]
  }),

  // 09 — beach finale: wall, crossing, hoist ---------------------------------
  makeLevel({
    label: 'LAST TAKE', theme: 'beach', width: 3000,
    floors: [[-160, 1560], [1800, 1400]],
    walls: [{ x: 700, rows: 3, cols: 3 }],
    dolly: { from: 1410, to: 1600, startTime: 22 },
    crane: { railX: 2100, railW: 560, sensorCX: 2400, anchorCX: 2540, minCX: 2200, wheelX: 1980 },
    exitX: 2800,
    hints: [
      wallHint(0, 1350, { x: 850, y: 300 }),
      dollyHint(1200, 2050, { x: 1600, y: 420 }),
      craneHint(1950, { x: 2400, y: 292 })
    ]
  })
];

export const levelCount = LEVELS.length;
