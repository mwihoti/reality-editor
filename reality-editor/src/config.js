// Every tuning number lives here. Nothing else should hard-code a feel value.

export const CONFIG = {
  view: { w: 1920, h: 1080, maxDpr: 2 },
  step: 1 / 120,

  physics: {
    gravity: 2600,
    maxFall: 1750,
    run: 335,
    accel: 3000,
    airAccel: 1900,
    friction: 2800,
    jumpVelocity: 905,
    coyote: 0.09,
    jumpBuffer: 0.12,
    jumpCutGravity: 1.85,
    landingVelocity: 380,
    width: 44,
    height: 94
  },

  camera: { follow: 6, lookahead: 0.16, zoomLerp: 8, rewindZoom: 0.94, winZoom: 1.04 },

  // tape budget: the intended route spends ~6s rewinding the dolly and ~7s
  // parking the load, so 30 leaves room for a player who takes their time
  // tapeRefill: tape seconds recovered per second of forward play. Without it
  // a run that spends the last of its tape can only be recovered by resetting
  // the whole room, which is too harsh for a mistake in the last scene.
  rules: { maxCuts: 4, maxTape: 30, rewindRate: 1.6, startTime: 30, tapeRefill: 0.4 },

  // relayGrace: seconds of forward time a pressure-plate door stays open after
  // the weight leaves the pad. Without it the door shuts on the same frame the
  // rewind ends, so stopping the scrub the moment it opens gives you no runway.
  mechanism: { sensorHalfWindow: 80, sensorLoadDisplay: 0.9, relayGrace: 3 },

  feel: {
    cutFlash: 0.22,
    cutGhost: 2.4,
    toast: 3.2,
    shakeCut: 7,
    shakeOpen: 6,
    shakeDecay: 26
  },

  respawn: { belowRoom: 260 },

  ui: {
    title: [{ id: 'start', x: 700, y: 712, w: 520, h: 96, label: 'START GAME' }],
    titleContinue: [{ id: 'continue', x: 700, y: 832, w: 520, h: 84, label: 'CONTINUE' }],
    pause: [
      { id: 'resume', x: 660, y: 600, w: 600, h: 88, label: 'RESUME' },
      { id: 'restart', x: 660, y: 712, w: 600, h: 88, label: 'RESTART SCENE' }
    ],
    won: [{ id: 'again', x: 710, y: 742, w: 500, h: 96, label: 'PLAY AGAIN' }],
    hud: [{ id: 'pause', x: 1712, y: 150, w: 160, h: 52, label: 'II  PAUSE' }],
    touch: [
      { id: 'left', x: 84, y: 880, w: 128, h: 128, label: '◀' },
      { id: 'right', x: 232, y: 880, w: 128, h: 128, label: '▶' },
      { id: 'jump', x: 1720, y: 872, w: 140, h: 140, label: 'JUMP' },
      { id: 'rewind', x: 1548, y: 896, w: 150, h: 116, label: 'REW' }
    ]
  }
};
