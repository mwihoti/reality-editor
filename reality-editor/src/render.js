// Canvas painting: stage, props, player, cut UI, HUD, screens, rewind treatment.

import { CONFIG } from './config.js';
import { paintTheme } from './themes.js';

const P = {
  ink: '#241d2e',
  ink2: '#3a3048',
  cream: '#fdf1de',
  cream2: '#f2ddc0',
  tan: '#edb262',
  tan2: '#cf9040',
  coral: '#ff6f7d',
  navy: '#314b7d',
  navy2: '#243962',
  sun: '#ffd166',
  mint: '#7ddcc0',
  hair: '#3b2a44',
  ghost: 'rgba(255,241,222,0.55)',
  scrim: 'rgba(9,7,16,0.78)'
};

export function screenRectToWorld(r, cam) {
  const x0 = (r.x - 960) / cam.zoom + cam.x + 960;
  const y0 = (r.y - 540) / cam.zoom + 540;
  return { x: x0, y: y0, w: r.w / cam.zoom, h: r.h / cam.zoom };
}

// ---- small drawing helpers -------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ui-monospace, Menlo, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

function hovered(buttons, p) {
  if (!p) return null;
  for (const b of buttons) {
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
  }
  return null;
}

// ---- entry -----------------------------------------------------------------
export function render(ctx, view, s) {
  const { game, input, now } = s;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b0a12';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const k = view.dpr * view.scale;
  ctx.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1920, 1080);
  ctx.clip();

  if (game.state === 'title') {
    drawTitle(ctx, game, input, now);
    ctx.restore();
    return;
  }

  drawScene(ctx, s);
  drawHUD(ctx, s);
  if (input.touchMode) drawTouch(ctx, input);
  if (game.state === 'paused') drawPause(ctx, game, input);
  if (game.state === 'won' || game.state === 'cleared') {
    drawWon(ctx, game, input, game.state === 'cleared');
  }

  ctx.restore();
}

// ---- world -----------------------------------------------------------------
function drawScene(ctx, s) {
  const { game, world, player, cam, input, now } = s;

  drawBackdrop(ctx, cam, now, world.level.theme);

  ctx.save();
  ctx.translate(960, 540);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-960, -540);

  const jitter = world.rewinding ? Math.sin(now * 55) * 1.3 : 0;
  const sx = game.shake ? (Math.random() * 2 - 1) * game.shake : 0;
  const sy = game.shake ? (Math.random() * 2 - 1) * game.shake : 0;
  ctx.translate(-cam.x + sx, jitter + sy);

  drawProps(ctx, world, game, now);
  drawLoad(ctx, world, game);
  drawPlayerFigure(ctx, player);
  drawCutUI(ctx, world, input, cam, now);
  if (game.state !== 'won') drawHints(ctx, world, player, now);

  ctx.restore();

  if (world.rewinding) drawRewindFX(ctx, now);
  if (game.state !== 'won') drawToasts(ctx, world, now);
}

function drawBackdrop(ctx, cam, now, theme) {
  paintTheme(ctx, theme || 'studio', cam, now);

  // the dark strip under the stage floor, same in every location
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(0, 986, 1920, 94);
}

// ---- the new set dressing ---------------------------------------------------
function drawGate(ctx, s) {
  const cx = s.x + s.w / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,241,222,.26)';
  ctx.lineWidth = 5;
  line(ctx, cx - 16, 0, cx - 16, s.y + 18);
  line(ctx, cx + 16, 0, cx + 16, s.y + 18);

  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fillStyle = '#2b2440';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,222,.22)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,111,125,.45)';
  for (let y = s.y + 26; y < s.y + s.h - 24; y += 58) {
    ctx.fillRect(s.x, y, s.w, 12);
  }
  ctx.restore();
  ctx.restore();
}

function drawLift(ctx, s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,241,222,.14)';
  ctx.lineWidth = 6;
  line(ctx, s.x + 12, s.y, s.x + 12, 828);
  line(ctx, s.x + s.w - 12, s.y, s.x + s.w - 12, 828);

  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fillStyle = '#3a3156';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,222,.34)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = 'rgba(242,193,78,.8)';
  ctx.fillRect(s.x + 18, s.y + s.h - 6, s.w - 36, 4);
  ctx.restore();
}

function drawPlate(ctx, s, world) {
  const held = world.plateHeld();
  ctx.save();
  rr(ctx, s.x, s.y, s.w, s.h + 8, 6);
  ctx.fillStyle = held ? 'rgba(242,193,78,.85)' : 'rgba(255,241,222,.16)';
  ctx.fill();
  ctx.strokeStyle = held ? 'rgba(255,241,222,.55)' : 'rgba(255,241,222,.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawRelay(ctx, s, world) {
  const open = world.shutterOpen({ kind: 'relay' });
  ctx.save();
  if (open) ctx.globalAlpha = 0.25;
  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fillStyle = '#2b2440';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,241,222,.22)';
  for (let y = s.y + 14; y < s.y + s.h - 8; y += 26) {
    ctx.fillRect(s.x + 6, y, s.w - 12, 8);
  }
  ctx.restore();
}

function drawProps(ctx, world, game, now) {
  for (const p of world.level.props) {
    if (!world.alive(p)) continue;
    const st = world.stateAt(p, world.time);
    const ghost = world.rewinding && p.motion;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.4;

    switch (p.kind) {
      case 'slab': drawSlab(ctx, st); break;
      case 'crate': drawCrate(ctx, st); break;
      case 'dolly': drawDolly(ctx, st); break;
      case 'rail': drawRail(ctx, st, world, game); break;
      case 'sensor': drawSensor(ctx, st, game); break;
      case 'wheel': drawWheel(ctx, st, game); break;
      case 'frame': drawFrame(ctx, st, game); break;
      case 'shutter': drawShutter(ctx, st, game); break;
      case 'gate': drawGate(ctx, st); break;
      case 'lift': drawLift(ctx, st); break;
      case 'plate': drawPlate(ctx, st, world); break;
      case 'relay': drawRelay(ctx, st, world); break;
      default: break;
    }

    if (ghost) {
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = P.ghost;
      ctx.strokeRect(st.x, st.y - 6, st.w, st.h + 6);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

function drawSlab(ctx, s) {
  rr(ctx, s.x, s.y, s.w, s.h, 6);
  ctx.fillStyle = P.cream;
  ctx.fill();
  ctx.fillStyle = P.cream2;
  ctx.fillRect(s.x, s.y + 14, s.w, 10);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y + 5);
  ctx.lineTo(s.x + s.w, s.y + 5);
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 10;
  ctx.stroke();
}

function drawCrate(ctx, s) {
  rr(ctx, s.x, s.y, s.w, s.h, 9);
  ctx.fillStyle = P.tan;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  rr(ctx, s.x, s.y, s.w, s.h, 9);
  ctx.clip();
  ctx.strokeStyle = 'rgba(70,45,20,.28)';
  ctx.lineWidth = 6;
  line(ctx, s.x + 6, s.y + 10, s.x + s.w - 6, s.y + 10);
  line(ctx, s.x + 6, s.y + s.h - 22, s.x + s.w - 6, s.y + s.h - 22);
  line(ctx, s.x + 8, s.y + s.h - 8, s.x + s.w - 8, s.y + 8);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(s.x + s.w / 2, s.y + s.h * 0.72, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(70,45,20,.35)';
  ctx.fill();
}

function drawDolly(ctx, s) {
  rr(ctx, s.x, s.y - 2, s.w, 26, 8);
  ctx.fillStyle = P.navy;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(s.x + 16, s.y + 8);
  ctx.lineTo(s.x + s.w - 16, s.y + 8);
  ctx.strokeStyle = P.sun;
  ctx.lineWidth = 5;
  ctx.stroke();

  for (const wx of [s.x + 38, s.x + s.w - 38]) {
    ctx.beginPath();
    ctx.arc(wx, s.y + 36, 12, 0, Math.PI * 2);
    ctx.fillStyle = P.ink;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(wx, s.y + 36, 5, 0, Math.PI * 2);
    ctx.fillStyle = P.cream;
    ctx.fill();
  }
}

// ---- puzzle 3 machinery ----------------------------------------------------
function drawRail(ctx, s, world, game) {
  // hanger rods
  ctx.strokeStyle = P.ink2;
  ctx.lineWidth = 8;
  line(ctx, s.x + 18, s.y, s.x + 18, s.y - 210);
  line(ctx, s.x + s.w - 18, s.y, s.x + s.w - 18, s.y - 210);

  rr(ctx, s.x, s.y, s.w, s.h, 9);
  ctx.fillStyle = P.navy2;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.stroke();

  const running = world.driveRunning();
  text(ctx, running ? 'LOAD LINE: RUNNING' : 'LOAD LINE: STOPPED',
    s.x + 4, s.y - 40, 17, running ? 'rgba(255,209,102,.9)' : 'rgba(125,220,192,.95)');
}

function drawSensor(ctx, s, game) {
  const load = game.visual.sensor;
  ctx.save();
  rr(ctx, s.x, s.y - 4, s.w, s.h + 8, 6);
  ctx.fillStyle = load > 0.05
    ? `rgba(125,220,192,${0.35 + 0.55 * load})`
    : 'rgba(253,241,222,0.28)';
  ctx.fill();
  ctx.strokeStyle = load > 0.05 ? P.mint : 'rgba(253,241,222,0.6)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // chevrons
  ctx.strokeStyle = load > 0.05 ? 'rgba(20,60,50,.55)' : 'rgba(36,29,46,.5)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    const x = s.x + 18 + i * 24;
    ctx.beginPath();
    ctx.moveTo(x, s.y + 2);
    ctx.lineTo(x + 9, s.y + 9);
    ctx.lineTo(x, s.y + 16);
    ctx.stroke();
  }

  text(ctx, load > 0.5 ? 'SENSOR: LOADED' : 'SENSOR: —',
    s.x + s.w / 2, s.y + 42, 15,
    load > 0.5 ? P.mint : 'rgba(255,241,222,.45)', 'center');
  ctx.restore();
}

function drawWheel(ctx, s, game) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const r = s.w / 2 - 6;

  ctx.strokeStyle = P.ink2;
  ctx.lineWidth = 9;
  line(ctx, cx, s.y - 4, cx, cy - r);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = P.navy;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(game.visual.spin);
  ctx.strokeStyle = 'rgba(255,241,222,.65)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    line(ctx, Math.cos(a) * (r - 10), Math.sin(a) * (r - 10),
      -Math.cos(a) * (r - 10), -Math.sin(a) * (r - 10));
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = P.coral;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  text(ctx, 'DRIVE', cx, cy + r + 26, 15, 'rgba(255,241,222,.5)', 'center');
}

function drawLoad(ctx, world, game) {
  const L = world.level.load;
  if (!L) return;                        // this location has no load line
  const cx = world.loadCX();
  const railY = 516;

  // trolley
  rr(ctx, cx - 26, railY - 6, 52, 22, 5);
  ctx.fillStyle = P.ink2;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // chain
  ctx.strokeStyle = 'rgba(255,241,222,.5)';
  ctx.lineWidth = 4;
  line(ctx, cx, railY + 16, cx, L.hangY);

  // hanging counterweight
  const half = L.size / 2;
  rr(ctx, cx - half, L.hangY, L.size, L.size, 10);
  ctx.fillStyle = P.cream2;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - half + 10, L.hangY + 18);
  ctx.lineTo(cx + half - 10, L.hangY + 18);
  ctx.moveTo(cx - half + 10, L.hangY + 40);
  ctx.lineTo(cx + half - 10, L.hangY + 40);
  ctx.strokeStyle = 'rgba(255,111,125,.85)';
  ctx.lineWidth = 7;
  ctx.stroke();

  text(ctx, 'LOAD', cx, L.hangY + L.size + 22, 15, 'rgba(255,241,222,.5)', 'center');
}

function drawFrame(ctx, s, game) {
  ctx.fillStyle = P.ink2;
  ctx.fillRect(s.x, s.y, 18, s.h);
  ctx.fillRect(s.x + s.w - 18, s.y, 18, s.h);
  ctx.fillStyle = P.navy2;
  ctx.fillRect(s.x, s.y, s.w, 22);

  const open = game.visual.shutter;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * open;
  rr(ctx, s.x + s.w / 2 - 62, s.y - 62, 124, 44, 8);
  ctx.fillStyle = open > 0.5 ? P.mint : P.ink2;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  text(ctx, 'EXIT', s.x + s.w / 2, s.y - 40, 20, open > 0.5 ? '#12352c' : P.cream, 'center');
  ctx.restore();
}

function drawShutter(ctx, s, game) {
  const lift = 208 * game.visual.shutter;
  const y = s.y - lift;

  rr(ctx, s.x, y, s.w, s.h, 6);
  ctx.fillStyle = P.ink2;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,241,222,.16)';
  ctx.lineWidth = 4;
  for (let i = 1; i < 6; i++) {
    line(ctx, s.x + 6, y + i * (s.h / 6), s.x + s.w - 6, y + i * (s.h / 6));
  }

  ctx.fillStyle = P.sun;
  ctx.fillRect(s.x + 8, y + s.h - 26, s.w - 16, 14);
}

// ---- player ---------------------------------------------------------------
function drawPlayerFigure(ctx, pl) {
  const { x, y, w, h } = pl;
  const cx = x + w / 2;
  const air = !pl.onGround;
  const speed = Math.min(1, Math.abs(pl.vx) / 300);
  const swing = Math.sin(pl.walk) * 17 * speed;

  const hipY = y + h - 42;
  const footY = y + h - 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 16;
  line(ctx, cx - 2, hipY, cx + swing, footY);
  line(ctx, cx - 2, hipY, cx - swing, footY);
  ctx.strokeStyle = P.navy;
  ctx.lineWidth = 10;
  line(ctx, cx - 2, hipY, cx + swing, footY);
  line(ctx, cx - 2, hipY, cx - swing, footY);

  rr(ctx, x + 4, y + 32, w - 8, h - 66, 14);
  ctx.fillStyle = P.coral;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.stroke();

  const armX = cx + (air ? 20 : 12 + Math.sin(pl.walk) * 5);
  const armY = air ? y + 60 : y + 78;
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 12;
  line(ctx, cx + 4, y + 52, armX, armY);
  ctx.strokeStyle = P.coral;
  ctx.lineWidth = 7;
  line(ctx, cx + 4, y + 52, armX, armY);

  ctx.beginPath();
  ctx.arc(cx, y + 26, 24, 0, Math.PI * 2);
  ctx.fillStyle = P.cream;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, y + 26, 24, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fillStyle = P.hair;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 18, y + 16);
  ctx.quadraticCurveTo(cx - 46, y + 26, cx - 42, y + 56);
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 13;
  ctx.stroke();
  ctx.strokeStyle = P.hair;
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 9, y + 32, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = P.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 5, y + 40);
  ctx.quadraticCurveTo(cx + 12, y + 45, cx + 18, y + 38);
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ---- cut UI ---------------------------------------------------------------
function drawCutUI(ctx, world, input, cam, now) {
  for (const f of world.fx) {
    const age = now - f.born;
    if (age < CONFIG.feel.cutFlash) {
      const a = 1 - age / CONFIG.feel.cutFlash;
      ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`;
      ctx.fillRect(f.rect.x - 6, f.rect.y - 6, f.rect.w + 12, f.rect.h + 12);
    }
    const fa = Math.max(0, 1 - age / CONFIG.feel.cutGhost);
    if (fa > 0) {
      ctx.save();
      ctx.setLineDash([16, 12]);
      ctx.lineDashOffset = -age * 40;
      ctx.strokeStyle = `rgba(255,241,222,${0.55 * fa})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(f.rect.x, f.rect.y, f.rect.w, f.rect.h);
      ctx.restore();
    }
  }

  if (world.rewinding || !input.dragging || !input.dragRect) return;

  const r = screenRectToWorld(input.dragRect, cam);

  ctx.fillStyle = 'rgba(255,111,125,0.10)';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineDashOffset = -now * 40;
  ctx.strokeStyle = 'rgba(255,111,125,0.95)';
  ctx.lineWidth = 3;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();

  let count = 0;
  for (const p of world.cuttableProps()) {
    const s = world.stateAt(p, world.time);
    const ax = s.x + s.w / 2;
    const ay = s.y + s.h / 2;
    if (ax < r.x || ax > r.x + r.w || ay < r.y || ay > r.y + r.h) continue;
    count++;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(255,241,222,0.95)';
    ctx.lineWidth = 3;
    ctx.strokeRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8);
    ctx.restore();
  }

  if (count > 0) {
    text(ctx, `WILL CUT ${count}`, r.x, r.y - 16, 20, 'rgba(255,241,222,0.95)');
  }
}

// ---- hints ----------------------------------------------------------------
// Hints are data on the level (level.hints), so every scene explains itself
// without the renderer knowing which scene it is.
function hintFor(world, player) {
  const px = player.x + player.w / 2;
  const dolly = world.byId('dolly');
  const dollyX = dolly && dolly.motion ? world.stateAt(dolly, world.time).x : null;

  if (player.groundId === 'dolly' && dolly && dollyX < dolly.motion.to - 60) {
    return {
      x: px, y: 470, anchor: 'down',
      lines: ['STAND STILL — IT CARRIES YOU'],
      sub: 'step off when it reaches the far side'
    };
  }

  for (const h of world.level.hints || []) {
    if (px < (h.from ?? 0) || px > (h.until ?? Infinity)) continue;
    if (h.need === 'wall' && world.cutsUsed() > 0) continue;
    if (h.need === 'dollyAway' && !(dollyX !== null && dollyX > dolly.motion.from + 40)) continue;
    if (h.need === 'craneFrozen' && (world.driveRunning() || world.exitOpen())) continue;
    if (h.need === 'craneLoaded' && !world.exitOpen()) continue;
    if (h.need === 'crane' && world.exitOpen()) continue;
    if (h.need === 'lift') {
      const l = world.byId('lift');
      if (!l || world.stateAt(l, world.time).y > 780) continue;   // already down
    }
    if (h.need === 'plate' && world.plateHeld()) continue;        // already held

    let sub = h.sub;
    if (h.need === 'craneFrozen' && world.tape <= 0.2) {
      sub = 'wait for the tape, then rewind past the cut';
    }

    return { x: h.at.x, y: h.at.y, anchor: 'down', lines: h.lines, sub };
  }
  return null;
}

function drawHints(ctx, world, player, now) {
  const h = hintFor(world, player);
  if (!h) return;

  const w = 520;
  const hh = h.sub ? 132 : 104;
  const x = h.x - w / 2;
  const y = h.y;

  ctx.save();
  ctx.globalAlpha = 0.92;
  rr(ctx, x, y, w, hh, 14);
  ctx.fillStyle = 'rgba(253,241,222,0.94)';
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // pointer down to the thing being described
  ctx.beginPath();
  ctx.moveTo(h.x - 14, y + hh);
  ctx.lineTo(h.x, y + hh + 18);
  ctx.lineTo(h.x + 14, y + hh);
  ctx.closePath();
  ctx.fillStyle = 'rgba(253,241,222,0.94)';
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  h.lines.forEach((l, i) => {
    text(ctx, l, h.x, y + 38 + i * 30, 20, P.ink, 'center');
  });
  if (h.sub) text(ctx, h.sub, h.x, y + hh - 22, 15, 'rgba(36,29,46,.6)', 'center');

  ctx.restore();
}

function drawToasts(ctx, world, now) {
  let i = 0;
  for (const t of world.toasts) {
    const age = now - t.born;
    const life = CONFIG.feel.toast;
    const fadeIn = Math.min(1, age / 0.2);
    const fadeOut = Math.min(1, Math.max(0, (life - age) / 0.6));
    const a = Math.min(fadeIn, fadeOut);
    if (a <= 0) continue;

    const y = 180 + i * 64;
    ctx.save();
    ctx.globalAlpha = a;
    const w = 660;
    rr(ctx, 960 - w / 2, y - 34, w, 60, 12);
    ctx.fillStyle = 'rgba(16,12,26,.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,241,222,.2)';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, t.text, 960, y - 2, 26, P.cream, 'center');
    ctx.restore();
    i++;
  }
}

// ---- rewind treatment -----------------------------------------------------
function drawRewindFX(ctx, now) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffb6cd';
  for (let y = 0; y < 1080; y += 6) ctx.fillRect(0, y, 1920, 2);
  ctx.restore();

  const bandY = ((now * 520) % 1500) - 220;
  const g = ctx.createLinearGradient(0, bandY, 0, bandY + 180);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY, 1920, 180);

  const v = ctx.createRadialGradient(960, 540, 520, 960, 540, 1080);
  v.addColorStop(0, 'rgba(10,8,18,0)');
  v.addColorStop(1, 'rgba(10,8,18,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1920, 1080);
}

// ---- HUD ------------------------------------------------------------------
function tc(t) {
  const p = (n) => String(n).padStart(2, '0');
  const total = Math.max(0, t);
  return `${p(Math.floor(total / 60))}:${p(Math.floor(total) % 60)}:${p(Math.floor((total % 1) * 24))}`;
}

function drawHUD(ctx, s) {
  const { world, input, game } = s;
  const blades = world.cutsLeft();
  const sceneNo = String((game.levelIndex ?? 0) + 1).padStart(2, '0');

  rr(ctx, 48, 40, 356, 104, 16);
  ctx.fillStyle = 'rgba(16,12,26,.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,222,.16)';
  ctx.lineWidth = 3;
  ctx.stroke();

  text(ctx, `${sceneNo} · ${world.level.label || 'TAKE 01'}`, 74, 70, 15, 'rgba(255,241,222,.62)');
  text(ctx, 'BLADES', 74, 112, 18, P.cream);

  for (let i = 0; i < CONFIG.rules.maxCuts; i++) {
    const x = 190 + i * 46;
    rr(ctx, x, 103, 34, 18, 6);
    if (i < blades) {
      ctx.fillStyle = P.coral;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,241,222,.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  text(ctx, world.rewinding ? 'REWINDING' : 'TIMECODE', 1872, 60, 15, 'rgba(255,241,222,.5)', 'right');
  text(ctx, tc(world.time), 1872, 106, 44, world.rewinding ? P.coral : P.cream, 'right');

  // pause button
  const pb = CONFIG.ui.hud[0];
  const ph = hovered(CONFIG.ui.hud, input.pointer) === pb;
  rr(ctx, pb.x, pb.y, pb.w, pb.h, 10);
  ctx.fillStyle = ph ? 'rgba(255,241,222,.18)' : 'rgba(16,12,26,.6)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,222,.24)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, pb.label, pb.x + pb.w / 2, pb.y + pb.h / 2, 15,
    ph ? P.cream : 'rgba(255,241,222,.6)', 'center');

  // tape
  const barX = input.touchMode ? 640 : 980;
  const barY = 1008, barW = input.touchMode ? 420 : 520, barH = 18;
  rr(ctx, barX - 92, barY - 20, barW + 208, barH + 40, 14);
  ctx.fillStyle = 'rgba(14,11,22,.72)';
  ctx.fill();

  rr(ctx, barX, barY, barW, barH, 9);
  ctx.fillStyle = 'rgba(16,12,26,.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,241,222,.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const frac = Math.max(0, Math.min(1, world.tape / CONFIG.rules.maxTape));
  if (frac > 0.001) {
    rr(ctx, barX + 2, barY + 2, (barW - 4) * frac, barH - 4, 7);
    ctx.fillStyle = world.rewinding ? P.coral : P.sun;
    ctx.fill();
  }

  text(ctx, 'TAPE', barX - 16, barY + 9, 14, 'rgba(255,241,222,.7)', 'right');
  text(ctx, `${world.tape.toFixed(1)}s`, barX + barW + 16, barY + 9, 14, 'rgba(255,241,222,.7)');

  if (world.tape <= 0.001) {
    text(ctx, 'TAPE SPENT — LET THE TAKE RUN TO REFILL', 1240, barY - 22, 16, P.coral, 'center');
  }

  // hints (keyboard layout) or a touch note
  if (input.touchMode) {
    text(ctx, 'DRAG ON THE STAGE TO CUT', 960, 944, 15, 'rgba(58,48,38,.55)', 'center');
    return;
  }

  rr(ctx, 32, 990, 548, 66, 14);
  ctx.fillStyle = 'rgba(14,11,22,.62)';
  ctx.fill();
  text(ctx, 'A / D  move      SPACE  jump      BACKSPACE  reset the room', 48, 1014, 13,
    'rgba(255,241,222,.62)');
  text(ctx, 'LMB drag  CUT      hold R  REWIND      ESC  pause', 48, 1042, 13,
    'rgba(255,241,222,.62)');
}

// ---- touch ----------------------------------------------------------------
function drawTouch(ctx, input) {
  for (const b of CONFIG.ui.touch) {
    const on = input.touch.has(b.id);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(b.w, b.h) / 2, 0, Math.PI * 2);
    ctx.fillStyle = on ? 'rgba(255,111,125,.55)' : 'rgba(16,12,26,.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,241,222,.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    text(ctx, b.label, cx, cy, 20, P.cream, 'center');
  }
}

// ---- screens ---------------------------------------------------------------
function drawButton(ctx, b, isHover, now) {
  rr(ctx, b.x, b.y, b.w, b.h, 16);
  ctx.fillStyle = isHover ? '#ff8a96' : P.coral;
  ctx.fill();
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = 6;
  ctx.stroke();

  if (isHover) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 8);
    rr(ctx, b.x - 8, b.y - 8, b.w + 16, b.h + 16, 20);
    ctx.strokeStyle = P.cream;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 2, 32, P.ink, 'center');
}

function drawTitle(ctx, game, input, now) {
  const g = ctx.createLinearGradient(0, 0, 0, 1080);
  g.addColorStop(0, '#1a1530');
  g.addColorStop(1, '#0e0b18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);

  const light = ctx.createRadialGradient(960, 420, 60, 960, 420, 780);
  light.addColorStop(0, 'rgba(255,238,208,0.16)');
  light.addColorStop(1, 'rgba(255,238,208,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 1920, 1080);

  // a crate waiting to be cut
  drawCrate(ctx, { x: 1560, y: 620, w: 120, h: 120 });
  drawCrate(ctx, { x: 1560, y: 500, w: 120, h: 120 });
  ctx.save();
  ctx.setLineDash([16, 12]);
  ctx.lineDashOffset = -now * 30;
  ctx.strokeStyle = 'rgba(255,111,125,.9)';
  ctx.lineWidth = 4;
  ctx.strokeRect(1526, 466, 188, 308);
  ctx.restore();
  text(ctx, 'CUT', 1620, 430, 22, 'rgba(255,111,125,.95)', 'center');

  text(ctx, 'REALITY EDITOR', 960, 330, 116, P.cream, 'center');
  text(ctx, 'YOUR VISION. YOUR EDITS. YOUR FINAL CUT.', 960, 424, 28, P.coral, 'center');

  text(ctx, 'DRAG TO CUT      ·      HOLD R TO REWIND      ·      A / D TO WALK', 960, 560, 21,
    'rgba(255,241,222,.72)', 'center');

  const b = CONFIG.ui.title[0];
  // clamped by the game, so the button can never name a scene that isn't there
  const saved = game.continueIndex ? game.continueIndex() : 0;
  const startLabel = saved > 0 ? 'START FROM SCENE 01' : b.label;
  drawButton(ctx, { ...b, label: startLabel }, hovered(CONFIG.ui.title, input.pointer) === b, now);

  if (saved > 0) {
    const c = CONFIG.ui.titleContinue[0];
    const sceneNo = String(saved + 1).padStart(2, '0');
    drawButton(ctx, { ...c, label: `CONTINUE · SCENE ${sceneNo}` },
      hovered(CONFIG.ui.titleContinue, input.pointer) === c, now);
  }

  text(ctx, `browser prototype · ${game.levelCount || 9} scenes · not an Unreal build`, 960, 985, 16,
    'rgba(255,241,222,.35)', 'center');
}

function drawPause(ctx, game, input) {
  ctx.fillStyle = P.scrim;
  ctx.fillRect(0, 0, 1920, 1080);

  text(ctx, 'PAUSED', 960, 420, 84, P.cream, 'center');
  text(ctx, 'ESC or P to resume', 960, 492, 20, 'rgba(255,241,222,.6)', 'center');

  for (const b of CONFIG.ui.pause) {
    drawButton(ctx, b, hovered(CONFIG.ui.pause, input.pointer) === b, performance.now() / 1000);
  }
}

function drawWon(ctx, game, input, cleared = false) {
  ctx.fillStyle = 'rgba(9,7,16,0.74)';
  ctx.fillRect(0, 0, 1920, 1080);

  if (cleared) {
    const done = (game.levelIndex ?? 0) + 1;
    const total = game.levelCount ?? 1;
    text(ctx, 'SCENE CLEARED', 960, 300, 84, P.cream, 'center');
    text(ctx, `${String(done).padStart(2, '0')} in the can · ${total - done} to go`, 960, 386, 24, P.coral, 'center');
  } else {
    text(ctx, "THAT'S A WRAP", 960, 320, 92, P.cream, 'center');
    text(ctx, 'the final cut is yours', 960, 400, 24, P.coral, 'center');
  }

  const st = game.stats || { time: game.playTime, blades: 0, tape: 0 };
  const mins = Math.floor(st.time / 60);
  const secs = Math.floor(st.time % 60);

  const rows = [
    ['RUN TIME', `${mins}:${String(secs).padStart(2, '0')}`],
    ['BLADES LEFT', `${st.blades}`],
    ['TAPE LEFT', `${st.tape.toFixed(1)}s`]
  ];

  const best = game.save && game.save.best;
  if (!cleared && best) {
    const bm = Math.floor(best.time / 60);
    const bs = Math.floor(best.time % 60);
    rows.push(['BEST RUN', `${bm}:${String(bs).padStart(2, '0')}`]);
  }
  rows.forEach((r, i) => {
    const y = 508 + i * 54;
    text(ctx, r[0], 780, y, 20, 'rgba(255,241,222,.55)', 'left');
    text(ctx, r[1], 1140, y, 24, P.cream, 'right');
  });

  const b = CONFIG.ui.won[0];
  const shown = cleared ? { ...b, label: 'NEXT SCENE' } : b;
  drawButton(ctx, shown, hovered(CONFIG.ui.won, input.pointer) === b, performance.now() / 1000);
}
