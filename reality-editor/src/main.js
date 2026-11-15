// Timing only: fixed 120 Hz simulation, one draw per frame.

import { LEVEL } from './level.js';
import { CONFIG } from './config.js';
import { createGame } from './game.js';
import { audio } from './audio.js';

const STEP = CONFIG.step;

const canvas = document.getElementById('game');
const game = createGame(canvas, LEVEL);

let acc = 0;
let last = performance.now();

function resize() {
  game.resize();
}

addEventListener('resize', resize);
resize();

const kick = () => audio.init();
addEventListener('keydown', kick, { once: true });
addEventListener('pointerdown', kick, { once: true });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  acc += dt;
  let guard = 0;
  while (acc >= STEP && guard++ < 8) {
    game.step(STEP);
    acc -= STEP;
  }

  game.draw(now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// console handle for poking at state
window.__reality = game;
