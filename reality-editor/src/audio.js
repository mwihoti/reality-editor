// All sound is synthesised: no assets, no loading, no licensing.

let ctx = null;
let master = null;
let noiseBuf = null;
let rewindNodes = null;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return true;
}

function noise(dur, gain, filterType, freq) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
  src.stop(ctx.currentTime + dur);
}

function tone(type, from, to, dur, gain, delay = 0) {
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const audio = {
  init() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  },

  cut() {
    if (!ctx) return;
    noise(0.16, 0.5, 'highpass', 1800);
    tone('sawtooth', 420, 60, 0.18, 0.18);
  },

  jump() {
    if (!ctx) return;
    tone('sine', 330, 620, 0.12, 0.12);
  },

  land() {
    if (!ctx) return;
    tone('sine', 150, 70, 0.1, 0.16);
  },

  denied() {
    if (!ctx) return;
    tone('square', 180, 120, 0.1, 0.09);
  },

  click() {
    if (!ctx) return;
    tone('square', 520, 380, 0.06, 0.07);
  },

  clunk() {
    if (!ctx) return;
    tone('sawtooth', 120, 40, 0.22, 0.2);
    noise(0.1, 0.25, 'lowpass', 400);
  },

  chime() {
    if (!ctx) return;
    tone('sine', 523, 523, 0.18, 0.16, 0);
    tone('sine', 659, 659, 0.18, 0.14, 0.09);
    tone('sine', 784, 784, 0.32, 0.14, 0.18);
  },

  door() {
    if (!ctx) return;
    tone('sawtooth', 90, 180, 0.5, 0.1);
    noise(0.5, 0.12, 'bandpass', 1200);
  },

  win() {
    if (!ctx) return;
    tone('sine', 523, 523, 0.2, 0.16, 0);
    tone('sine', 659, 659, 0.2, 0.15, 0.16);
    tone('sine', 784, 784, 0.24, 0.15, 0.32);
    tone('sine', 1046, 1046, 0.6, 0.14, 0.5);
  },

  rewindStart() {
    if (!ctx || rewindNodes) return;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o2.type = 'triangle';
    o.frequency.value = 88;
    o2.frequency.value = 132;
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.06);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o.start(); o2.start();

    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    src.connect(nf); nf.connect(ng); ng.connect(master);
    src.start();

    rewindNodes = { o, o2, g, src, ng };
  },

  rewindStop() {
    if (!ctx || !rewindNodes) return;
    const { o, o2, g, src, ng } = rewindNodes;
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    ng.gain.setValueAtTime(ng.gain.value, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.stop(t + 0.1); o2.stop(t + 0.1); src.stop(t + 0.1);
    rewindNodes = null;
  }
};
