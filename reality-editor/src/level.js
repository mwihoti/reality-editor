// One continuous studio set, three puzzle beats.
// World units, y down. Floor tops sit at 820.

const WALL_X = 860;
const WALL_ROWS = [720, 620, 520, 420];
const WALL_COLS = [860, 960, 1060];

const wallCrates = [];
WALL_ROWS.forEach((y, r) => {
  WALL_COLS.forEach((x, c) => {
    wallCrates.push({
      id: `wall-r${r}c${c}`,
      kind: 'crate',
      x, y, w: 100, h: 100,
      solid: true,
      cuttable: true
    });
  });
});

export const LEVEL = {
  room: { width: 4200, height: 1080, floorY: 820 },
  spawn: { x: 170, y: 726 },

  // Respawn ledges: falling into a gap costs time, not a life.
  checkpoints: [
    { x: 170, y: 726 },
    { x: 1300, y: 726 },
    { x: 1560, y: 726 },   // the near ledge, so falling in the gap is cheap
    { x: 2150, y: 726 },
    { x: 2950, y: 726 }
  ],

  zones: [
    { id: 'scene1', x: 1200, label: 'SCENE ONE CLEARED' },
    { id: 'scene2', x: 2150, label: 'SCENE TWO CLEARED' }
  ],

  // ---- puzzle 3 mechanics ------------------------------------------------
  // A load hangs from a rail. The drive wheel has been running since the
  // scene started, so the load has already reached the end stop. Rewinding
  // walks it back over the sensor; cutting the drive wheel parks it there.
  drive: { id: 'wheel' },
  load: { anchorCX: 3310, minCX: 2806, speed: 45, size: 84, hangY: 566 },
  sensorCX: 3102,

  exit: { x: 3560, y: 560, w: 240, h: 260, doorX: 3496 },

  props: [
    // ---- stage floor -----------------------------------------------------
    { id: 'floor-a', kind: 'slab', x: -160, y: 820, w: 1780, h: 320, solid: true, cuttable: false },
    { id: 'floor-b', kind: 'slab', x: 2120, y: 820, w: 2240, h: 320, solid: true, cuttable: false },

    // ---- puzzle 1: the impossible wall -----------------------------------
    ...wallCrates,

    // ---- puzzle 2: the moving dolly --------------------------------------
    {
      id: 'dolly', kind: 'dolly', x: 1630, y: 820, w: 200, h: 26,
      solid: true, cuttable: false,
      motion: { type: 'linear', from: 1630, to: 1920, startTime: 30, speed: 75 }
    },

    // ---- puzzle 3: the final edit ----------------------------------------
    { id: 'rail', kind: 'rail', x: 2740, y: 516, w: 660, h: 18, solid: false, cuttable: false },
    { id: 'sensor', kind: 'sensor', x: 3060, y: 516, w: 84, h: 18, solid: false, cuttable: false },
    { id: 'wheel', kind: 'wheel', x: 2700, y: 542, w: 124, h: 124, solid: false, cuttable: true },
    { id: 'frame', kind: 'frame', x: 3452, y: 566, w: 160, h: 254, solid: false, cuttable: false },
    { id: 'shutter', kind: 'shutter', x: 3496, y: 600, w: 64, h: 220, solid: true, cuttable: false }
  ]
};
