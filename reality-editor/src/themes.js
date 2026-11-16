// Backdrops. The stage itself stays the same cream soundstage in every scene —
// what changes is the world behind it, so each level reads as a different shoot.

export const THEMES = {
  studio: {
    skyTop: '#171326', skyMid: '#221b38', skyBot: '#120f1d',
    glow: 'rgba(255,238,208,0.24)', ink: '#3d3258', art: 'studio'
  },
  forest: {
    skyTop: '#0d2118', skyMid: '#173a2a', skyBot: '#0a1712',
    glow: 'rgba(190,255,215,0.15)', ink: '#1e4432', art: 'forest'
  },
  urban: {
    skyTop: '#121a2c', skyMid: '#1e2a45', skyBot: '#0b1020',
    glow: 'rgba(175,210,255,0.16)', ink: '#2b3550', art: 'urban'
  },
  town: {
    skyTop: '#241726', skyMid: '#3b2438', skyBot: '#150e18',
    glow: 'rgba(255,186,140,0.18)', ink: '#4a3244', art: 'town'
  },
  beach: {
    skyTop: '#0e3340', skyMid: '#1d5a63', skyBot: '#0a2530',
    glow: 'rgba(255,238,175,0.20)', ink: '#27656e', art: 'beach'
  }
};

const wrap = (v, span) => ((v % span) + span) % span;

function studio(ctx, t, cam, now) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 12;
  const off = -wrap(cam.x * 0.55, 480);
  const top = 70 + Math.sin(now * 0.7) * 3;
  for (let i = -1; i < 6; i++) {
    const x = off + i * 480;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 260 + top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 26, 260 + top);
    ctx.lineTo(x, 300 + top);
    ctx.lineTo(x + 26, 260 + top);
    ctx.stroke();
  }
  ctx.restore();
}

function forest(ctx, t, cam, now) {
  // far hills
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = t.ink;
  const f1 = -wrap(cam.x * 0.18, 640);
  for (let i = -1; i < 5; i++) {
    const x = f1 + i * 640;
    ctx.beginPath();
    ctx.moveTo(x, 780);
    ctx.quadraticCurveTo(x + 160, 560, x + 320, 780);
    ctx.quadraticCurveTo(x + 480, 540, x + 640, 780);
    ctx.lineTo(x + 640, 1080);
    ctx.lineTo(x, 1080);
    ctx.closePath();
    ctx.fill();
  }
  // near pines
  ctx.globalAlpha = 0.85;
  const f2 = -wrap(cam.x * 0.42, 320);
  for (let i = -1; i < 9; i++) {
    const x = f2 + i * 320;
    const h = 300 + ((i * 97) % 130);
    ctx.fillStyle = '#12301f';
    for (let k = 0; k < 3; k++) {
      const y = 760 - k * 78;
      const sp = 120 - k * 30;
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.18);
      ctx.lineTo(x + sp, y);
      ctx.lineTo(x - sp, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - 9, 700, 18, 90);
  }
  ctx.restore();

  // drifting motes
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(220,255,220,.5)';
  for (let i = 0; i < 26; i++) {
    const px = wrap(i * 137 - cam.x * 0.25 + Math.sin(now * 0.4 + i) * 22, 1980) - 30;
    const py = 160 + ((i * 211) % 620) + Math.sin(now * 0.6 + i * 1.7) * 12;
    ctx.fillRect(px, py, 3, 3);
  }
  ctx.restore();
}

function urban(ctx, t, cam, now) {
  const layers = [
    { f: 0.22, h: 420, w: 150, col: '#161d2e', alpha: 0.9 },
    { f: 0.4, h: 300, w: 190, col: '#101623', alpha: 0.95 }
  ];
  for (const L of layers) {
    ctx.save();
    ctx.globalAlpha = L.alpha;
    ctx.fillStyle = L.col;
    const off = -wrap(cam.x * L.f, L.w);
    for (let i = -1; i < Math.ceil(1920 / L.w) + 2; i++) {
      const x = off + i * L.w;
      const seed = Math.abs(Math.round((x + cam.x * L.f) / L.w));
      const h = L.h + ((seed * 73) % 170);
      ctx.fillRect(x, 820 - h, L.w - 12, h);
      // windows
      ctx.fillStyle = 'rgba(255,214,140,.28)';
      for (let wy = 820 - h + 26; wy < 790; wy += 44) {
        for (let wx = x + 16; wx < x + L.w - 30; wx += 36) {
          if ((wx + wy + seed) % 3 === 0) ctx.fillRect(wx, wy, 14, 20);
        }
      }
      ctx.fillStyle = L.col;
    }
    ctx.restore();
  }
  // moon
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(230,240,255,.5)';
  ctx.beginPath();
  ctx.arc(1520 - cam.x * 0.1, 210, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function town(ctx, t, cam, now) {
  ctx.save();
  const off = -wrap(cam.x * 0.26, 260);
  for (let i = -1; i < 9; i++) {
    const x = off + i * 260;
    const h = 200 + ((i * 61) % 150);
    ctx.fillStyle = '#2a1a26';
    ctx.fillRect(x, 800 - h, 220, h);
    ctx.beginPath();               // roof
    ctx.moveTo(x - 16, 800 - h);
    ctx.lineTo(x + 110, 800 - h - 70);
    ctx.lineTo(x + 236, 800 - h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,186,120,.32)';
    for (let wy = 800 - h + 40; wy < 780; wy += 60) {
      for (let wx = x + 26; wx < x + 200; wx += 56) {
        if ((wx + wy) % 5 < 2) ctx.fillRect(wx, wy, 22, 26);
      }
    }
  }
  // street lamps
  ctx.globalAlpha = 0.75;
  const lo = -wrap(cam.x * 0.5, 420);
  for (let i = -1; i < 6; i++) {
    const x = lo + i * 420;
    ctx.strokeStyle = '#3a2836';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x, 820); ctx.lineTo(x, 600); ctx.stroke();
    const glow = ctx.createRadialGradient(x, 588, 6, x, 588, 120);
    glow.addColorStop(0, 'rgba(255,206,150,.5)');
    glow.addColorStop(1, 'rgba(255,206,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, 588, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,222,170,.9)';
    ctx.beginPath(); ctx.arc(x, 588, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function beach(ctx, t, cam, now) {
  // sun
  ctx.save();
  const sx = 1420 - cam.x * 0.08;
  const glow = ctx.createRadialGradient(sx, 300, 20, sx, 300, 300);
  glow.addColorStop(0, 'rgba(255,236,170,.55)');
  glow.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 320, 0, 640, 640);
  ctx.fillStyle = 'rgba(255,240,190,.85)';
  ctx.beginPath(); ctx.arc(sx, 300, 62, 0, Math.PI * 2); ctx.fill();

  // sea band
  ctx.fillStyle = 'rgba(28,92,104,.75)';
  ctx.fillRect(0, 560, 1920, 260);
  ctx.strokeStyle = 'rgba(220,255,255,.30)';
  ctx.lineWidth = 4;
  for (let r = 0; r < 7; r++) {
    ctx.beginPath();
    for (let x = 0; x <= 1920; x += 24) {
      const y = 590 + r * 26 + Math.sin((x + cam.x * 0.12) * 0.012 + now * 0.9 + r) * 5;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // dunes
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#12333a';
  const off = -wrap(cam.x * 0.3, 720);
  for (let i = -1; i < 5; i++) {
    const x = off + i * 720;
    ctx.beginPath();
    ctx.moveTo(x, 840);
    ctx.quadraticCurveTo(x + 220, 690, x + 460, 840);
    ctx.lineTo(x + 720, 840);
    ctx.lineTo(x + 720, 1080);
    ctx.lineTo(x, 1080);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const ART = { studio, forest, urban, town, beach };

export function paintTheme(ctx, key, cam, now) {
  const theme = THEMES[key] || THEMES.studio;
  const g = ctx.createLinearGradient(0, 0, 0, 1080);
  g.addColorStop(0, theme.skyTop);
  g.addColorStop(0.55, theme.skyMid);
  g.addColorStop(1, theme.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);

  const lx = 980 - cam.x * 0.30;
  const light = ctx.createRadialGradient(lx, 500, 40, lx, 500, 760);
  light.addColorStop(0, theme.glow);
  light.addColorStop(0.55, 'rgba(255,222,180,0.07)');
  light.addColorStop(1, 'rgba(255,222,180,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 1920, 1080);

  (ART[theme.art] || studio)(ctx, theme, cam, now);
}
