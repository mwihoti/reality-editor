// The slice itself, independent of the animation frame loop: create it, step it,
// draw it. main.js only owns timing.

import { CONFIG } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { render, screenRectToWorld } from './render.js';
import { audio } from './audio.js';
import { readSave, writeSave, resumeIndex } from './save.js';

const W = CONFIG.view.w;
const H = CONFIG.view.h;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function hit(buttons, p) {
  if (!p) return null;
  for (const b of buttons) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}

export function createGame(canvas, levelsOrLevel) {
  const levels = Array.isArray(levelsOrLevel) ? levelsOrLevel : [levelsOrLevel];
  let level = levels[0];
  const ctx = canvas.getContext('2d');
  const view = { dpr: 1, scale: 1, ox: 0, oy: 0 };
  const cam = { x: 0, zoom: 1 };

  const save = readSave();
  const world = new World(level);
  const player = new Player(level.spawn.x, level.spawn.y);

  let prevJump = false;
  let wasRewinding = false;
  let wasGround = false;
  let wasOpen = false;

  const game = {
    state: 'title',              // title | playing | paused | cleared | won
    shake: 0,
    playTime: 0,
    checkpoint: { x: level.spawn.x, y: level.spawn.y },
    wallOpened: false,
    visual: { shutter: 0, sensor: 0, spin: 0 },
    levels,
    levelIndex: 0,
    levelCount: levels.length,
    level,
    save,
    stats: null
  };

  const toLogical = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - view.ox) / view.scale,
      y: (clientY - r.top - view.oy) / view.scale
    };
  };

  const input = new Input(canvas, toLogical);

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.view.maxDpr);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.dpr = dpr;
    view.scale = Math.min(w / W, h / H);
    view.ox = (w - W * view.scale) / 2;
    view.oy = (h - H * view.scale) / 2;
  }

  function startRun(index = game.levelIndex) {
    game.levelIndex = Math.max(0, Math.min(levels.length - 1, index));
    level = levels[game.levelIndex];
    game.level = level;
    if (world.level !== level) world.setLevel(level);
    else world.reset();
    player.place(level.spawn.x, level.spawn.y);
    cam.x = 0;
    cam.zoom = 1;
    game.state = 'playing';
    game.shake = 0;
    game.playTime = 0;
    game.checkpoint = { x: level.spawn.x, y: level.spawn.y };
    game.wallOpened = false;
    game.visual = { shutter: 0, sensor: 0, spin: 0 };
    prevJump = false;
    wasRewinding = false;
    wasGround = false;
    wasOpen = false;
    input.cancelDrag();
    input.releasedRect = null;
  }

  function togglePause() {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
  }

  function nextLevel() {
    if (game.levelIndex + 1 < levels.length) startRun(game.levelIndex + 1);
  }

  function step(dt) {
    const jumpPressed = input.jump && !prevJump;
    prevJump = input.jump;

    if (input.pausePressed) {
      input.pausePressed = false;
      togglePause();
    }

    const click = input.clicked;
    input.clicked = null;

    if (input.resetPressed) {
      input.resetPressed = false;
      startRun();
      return;
    }

    if (game.state === 'title') {
      const canContinue = save.unlocked > 0;
      if (canContinue && hit(CONFIG.ui.titleContinue, click)) {
        audio.init();
        audio.click();
        startRun(resumeIndex(save, levels.length));
        return;
      }
      if (jumpPressed || hit(CONFIG.ui.title, click)) {
        audio.init();
        audio.click();
        startRun(0);
      }
      return;
    }

    if (game.state === 'cleared') {
      if (jumpPressed || hit(CONFIG.ui.won, click)) {
        audio.click();
        nextLevel();
      }
      return;
    }

    if (game.state === 'won') {
      if (jumpPressed || hit(CONFIG.ui.won, click)) startRun(0);
      return;
    }

    if (game.state === 'paused') {
      const b = hit(CONFIG.ui.pause, click);
      if (b) {
        audio.click();
        if (b.id === 'resume') game.state = 'playing';
        else startRun();
      }
      return;
    }

    // ---- playing ---------------------------------------------------------
    game.playTime += dt;

    if (click) {
      const hud = hit(CONFIG.ui.hud, click);
      if (hud && hud.id === 'pause') {
        audio.click();
        togglePause();
        return;
      }
    }

    const frameInput = {
      left: input.left,
      right: input.right,
      jump: input.jump,
      jumpPressed,
      rewind: input.rewind
    };

    // 1. the footage
    const t0 = world.time;
    world.update(dt, frameInput);

    // 2. a moving platform carries the player in both directions, so riding the
    //    dolly back while scrubbing behaves like riding it forward
    if (player.groundId) {
      const p = world.byId(player.groundId);
      if (p && p.motion) {
        const a = world.stateAt(p, world.time);
        const b = world.stateAt(p, t0);
        player.x += a.x - b.x;
        player.y += a.y - b.y;
      }
    }

    // 3. the player: off-tape, always forward
    const solids = world.solids(player.groundId);
    if (jumpPressed && (player.onGround || player.coyote > 0)) audio.jump();
    player.update(dt, frameInput, solids);
    player.depenetrate(solids);

    if (!wasGround && player.onGround) audio.land();
    wasGround = player.onGround;

    // boarding a parked dolly starts its take from that moment (see stateAt)
    if (player.groundId === 'dolly' && world.dollyBoard === null) {
      const d = world.byId('dolly');
      if (d && d.motion && world.stateAt(d, world.time).x <= d.motion.from + 1) {
        world.dollyBoard = world.time;
      }
    }

    // 4. cutting
    if (input.releasedRect) {
      const rect = screenRectToWorld(input.releasedRect, cam);
      input.releasedRect = null;
      const res = world.commitCut(rect);
      if (res.ok) {
        audio.cut();
        game.shake = CONFIG.feel.shakeCut;
        if (res.ids.indexOf(level.drive.id) !== -1) audio.clunk();

        const wallLeft = level.props.some(p => p.id.indexOf('wall-') === 0 && world.alive(p));
        if (!wallLeft && !game.wallOpened) {
          game.wallOpened = true;
          audio.chime();
          world.toast('PATH OPEN');
          game.shake = CONFIG.feel.shakeOpen;
        }
      } else if (res.reason !== 'tiny' && res.reason !== 'rewinding') {
        audio.denied();
      }
    }

    // 5. door feedback
    const open = world.exitOpen();
    if (open !== wasOpen) {
      if (open) {
        audio.door();
        game.shake = CONFIG.feel.shakeOpen;
      }
      wasOpen = open;
    }

    // 6. rewind audio
    if (world.rewinding && !wasRewinding) audio.rewindStart();
    if (!world.rewinding && wasRewinding) audio.rewindStop();
    wasRewinding = world.rewinding;

    // 7. progression
    const events = world.checkProgress(player);
    for (const ev of events) {
      if (ev === 'scene1' || ev === 'scene2') {
        audio.chime();
        game.shake = CONFIG.feel.shakeOpen;
      }
      if (ev === 'won') {
        game.stats = {
          time: game.playTime,
          blades: world.cutsLeft(),
          tape: world.tape
        };
        save.cleared = [...new Set([...save.cleared, game.levelIndex])];

        if (game.levelIndex + 1 < levels.length) {
          save.unlocked = Math.max(save.unlocked, game.levelIndex + 1);
          writeSave(save);
          audio.chime();
          game.state = 'cleared';
        } else {
          save.unlocked = Math.max(save.unlocked, game.levelIndex);
          save.finished = true;
          if (!save.best || game.stats.time < save.best.time) {
            save.best = { time: game.stats.time };
          }
          writeSave(save);
          audio.win();
          game.state = 'won';
        }
      }
    }

    // 8. checkpoints and falls
    for (const cp of level.checkpoints) {
      if (player.x + player.w / 2 > cp.x) game.checkpoint = cp;
    }
    if (player.y > level.room.height + CONFIG.respawn.belowRoom) {
      player.place(game.checkpoint.x, game.checkpoint.y);
      game.shake = 5;
    }

    // 9. camera
    const target = player.x + player.w / 2 - W / 2 + player.vx * CONFIG.camera.lookahead;
    cam.x += (target - cam.x) * (1 - Math.exp(-CONFIG.camera.follow * dt));
    cam.x = clamp(cam.x, 0, level.room.width - W);
    const zTarget = world.rewinding ? CONFIG.camera.rewindZoom
      : (game.state === 'won' ? CONFIG.camera.winZoom : 1);
    cam.zoom += (zTarget - cam.zoom) * (1 - Math.exp(-CONFIG.camera.zoomLerp * dt));

    // 10. smoothed visual state for the renderer
    game.visual.shutter += ((open ? 1 : 0) - game.visual.shutter) * Math.min(1, dt * 9);
    game.visual.sensor += ((world.sensorLoaded() ? 1 : 0) - game.visual.sensor) * Math.min(1, dt * 12);
    game.visual.spin = world.lineTime() * 2.6;
    game.shake *= Math.exp(-CONFIG.feel.shakeDecay * dt);
    if (game.shake < 0.05) game.shake = 0;
  }

  function draw(nowMs) {
    render(ctx, view, { game, world, player, cam, input, now: nowMs / 1000 });
  }

  return {
    view, cam, world, player, input, game,
    resize, step, draw,
    startRun, togglePause, nextLevel,
    get save() { return save; },
    get level() { return level; },
    get state() { return game.state; }
  };
}
