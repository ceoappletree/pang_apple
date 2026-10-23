// 배경음악: Web Audio 신시사이저 + 스텝 시퀀서 (음원 파일 없이 실시간 연주)
(() => {
'use strict';

// ---------- 음 이름 ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function m(name) {                       // 'C#4' → MIDI 번호
  const r = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  return 12 * (+r[3] + 1) + NOTE[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
}
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
// 코드 이름 → 구성음 (근음 옥타브 oct)
function chord(name, oct = 4) {
  const r = /^([A-G][#b]?)(.*)$/.exec(name);
  const root = m(r[1] + oct);
  const q = r[2];
  const iv = {
    '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 14],
    maj9: [0, 4, 7, 11, 14], 9: [0, 4, 7, 10, 14], sus4: [0, 5, 7], add9: [0, 4, 7, 14], m7b5: [0, 3, 6, 10], 6: [0, 4, 7, 9],
  }[q] || [0, 4, 7];
  return { root, notes: iv.map(i => root + i) };
}

// ---------- 오디오 ----------
let ctx = null, master = null, musicOn = true, noiseBuf = null;
function ac() {
  const a = Engine.audio();
  if (!a) return null;
  if (a !== ctx) {
    ctx = a;
    master = a.createGain(); master.gain.value = musicOn ? 0.55 : 0;
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp); comp.connect(a.destination);
    noiseBuf = a.createBuffer(1, a.sampleRate * 1, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}
function env(g, t, a, peak, dur, rel) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

// ---------- 악기 ----------
const INST = {
  piano(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 2600;
    const len = Math.min(2.2, d + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    for (const [type, mul, gv] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sine', 3, 0.08]]) {
      const o = a.createOscillator(), og = a.createGain();
      o.type = type; o.frequency.value = hz(n) * mul; og.gain.value = gv;
      o.connect(og); og.connect(f); o.start(t); o.stop(t + len + 0.05);
    }
    f.connect(g); g.connect(out);
  },
  epiano(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), trem = a.createOscillator(), tg = a.createGain();
    trem.frequency.value = 4.5; tg.gain.value = 0.06 * v; trem.connect(tg); tg.connect(g.gain);
    const len = Math.min(2, d + 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    for (const [mul, gv] of [[1, 1], [2, 0.18], [4, 0.04]]) {
      const o = a.createOscillator(), og = a.createGain();
      o.type = 'sine'; o.frequency.value = hz(n) * mul; og.gain.value = gv;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
    trem.start(t); trem.stop(t + len + 0.05);
    g.connect(out);
  },
  pad(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 0.5;
    env(g, t, 0.35, 0.07 * v, d + 0.4, 0.5);
    for (const det of [-7, 7]) {
      const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + d + 0.5);
    }
    f.connect(g); g.connect(out);
  },
  strings(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 1800;
    lfo.frequency.value = 5.2; lg.gain.value = 5; lfo.connect(lg);
    env(g, t, 0.18, 0.06 * v, d + 0.25, 0.3);
    for (const det of [-9, 0, 9]) {
      const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      lg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + d + 0.35);
    }
    lfo.start(t); lfo.stop(t + d + 0.35);
    f.connect(g); g.connect(out);
  },
  bass(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 520;
    env(g, t, 0.008, 0.38 * v, Math.max(0.12, d), 0.08);
    const o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(n);
    const o2 = a.createOscillator(); o2.type = 'square'; o2.frequency.value = hz(n); const g2 = a.createGain(); g2.gain.value = 0.18;
    o.connect(f); o2.connect(g2); g2.connect(f);
    o.start(t); o.stop(t + d + 0.1); o2.start(t); o2.stop(t + d + 0.1);
    f.connect(g); g.connect(out);
  },
  lead(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 2400;
    lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg);
    env(g, t, 0.012, 0.11 * v, d, 0.06);
    const o = a.createOscillator(); o.type = 'square'; o.frequency.value = hz(n);
    lg.connect(o.detune); o.connect(f);
    o.start(t); o.stop(t + d + 0.05); lfo.start(t); lfo.stop(t + d + 0.05);
    f.connect(g); g.connect(out);
  },
  bell(t, n, d, v, out) {
    const a = ctx, g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    for (const [mul, gv] of [[1, 1], [2.76, 0.3], [5.4, 0.1]]) {
      const o = a.createOscillator(), og = a.createGain(); o.type = 'sine'; o.frequency.value = hz(n) * mul; og.gain.value = gv;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.45);
    }
    g.connect(out);
  },
  organ(t, n, d, v, out) {   // 야구장 오르간
    const a = ctx, g = a.createGain(), trem = a.createOscillator(), tg = a.createGain();
    trem.frequency.value = 6.5; tg.gain.value = 0.025 * v; trem.connect(tg); tg.connect(g.gain);
    env(g, t, 0.008, 0.1 * v, d, 0.04);
    for (const [mul, gv] of [[0.5, 0.5], [1, 1], [2, 0.7], [3, 0.35], [4, 0.25], [6, 0.12]]) {
      const o = a.createOscillator(), og = a.createGain(); o.type = 'sine'; o.frequency.value = hz(n) * mul; og.gain.value = gv;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.05);
    }
    trem.start(t); trem.stop(t + d + 0.05);
    g.connect(out);
  },
  brass(t, n, d, v, out) {
    const a = ctx, g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(2600, t + 0.06);
    env(g, t, 0.03, 0.09 * v, d, 0.08);
    for (const det of [-5, 5]) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det; o.connect(f); o.start(t); o.stop(t + d + 0.05); }
    f.connect(g); g.connect(out);
  },
  kick(t, n, d, v, out) {
    const a = ctx, o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.8 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
  },
  snare(t, n, d, v, out) {
    const a = ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.32 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + 0.2);
    const o = a.createOscillator(), og = a.createGain(); o.frequency.value = 190;
    og.gain.setValueAtTime(0.18 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.1);
  },
  hat(t, n, d, v, out) {
    const a = ctx, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
    g.gain.setValueAtTime(0.11 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
  },
  clap(t, n, d, v, out) {
    const a = ctx;
    for (const off of [0, 0.012, 0.026]) {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
      g.gain.setValueAtTime(0.22 * v, t + off); g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.09);
      s.connect(f); f.connect(g); g.connect(out); s.start(t + off, Math.random() * 0.5); s.stop(t + off + 0.1);
    }
  },
  timp(t, n, d, v, out) {
    const a = ctx, o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(hz(n) * 1.02, t); o.frequency.exponentialRampToValueAtTime(hz(n), t + 0.1);
    g.gain.setValueAtTime(0.45 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.25);
  },
};

// ---------- 작곡 도우미 (16분음표 스텝 단위) ----------
// 반복 리듬: 'x' 강, 'o' 약, '.' 쉼
function rhythm(bars, pat, fn) {
  const ev = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < 16; i++) {
    const c = pat[i % pat.length];
    if (c === 'x' || c === 'o') ev.push(...fn(b, b * 16 + i, c === 'x' ? 1 : 0.6));
  }
  return ev;
}
const drum = (inst, bars, pat, vel = 1) => rhythm(bars, pat, (b, s, v) => [{ s, inst, n: 0, d: 1, v: v * vel }]);
function comp(inst, prog, pat, len, vel = 1, oct = 4) {
  return rhythm(prog.length, pat, (b, s, v) => chord(prog[b], oct).notes.map(n => ({ s, inst, n, d: len, v: v * vel })));
}
function sustain(inst, prog, vel = 1, oct = 4, bars = 1) {
  const ev = [];
  prog.forEach((c, b) => { if (b % bars === 0) chord(c, oct).notes.forEach(n => ev.push({ s: b * 16, inst, n, d: 16 * bars, v: vel })); });
  return ev;
}
function bassLine(prog, pat, vel = 1, fifth = false) {
  return rhythm(prog.length, pat, (b, s, v) => {
    const r = chord(prog[b], 2).root;
    const alt = fifth && (s % 16) >= 8 && v < 1;
    return [{ s, inst: 'bass', n: alt ? r + 7 : r, d: 3, v: v * vel }];
  });
}
function arp(inst, prog, order, vel = 1, oct = 4, len = 2) {
  const ev = [];
  prog.forEach((c, b) => {
    const ns = chord(c, oct).notes, all = [...ns, ...ns.map(n => n + 12)];
    for (let i = 0; i < 16 / len; i++) {
      const k = order[i % order.length];
      if (k < 0) continue;
      ev.push({ s: b * 16 + i * len, inst, n: all[k % all.length], d: len * 1.6, v: vel * (i % 2 ? 0.75 : 1) });
    }
  });
  return ev;
}
// 멜로디: 'E5:4 D5:2 -:2' (음:길이, '-' 쉼표)
function melody(inst, str, vel = 1, start = 0) {
  const ev = []; let s = start;
  for (const tok of str.trim().split(/\s+/)) {
    const [nn, len] = tok.split(':'); const L = +len;
    if (nn !== '-') ev.push({ s, inst, n: m(nn), d: L * 0.92, v: vel });
    s += L;
  }
  return ev;
}

// ---------- 곡 ----------
const TRACKS = {};
function track(name, bpm, bars, parts, vol = 1) {
  TRACKS[name] = { bpm, steps: bars * 16, ev: parts.flat().sort((a, b) => a.s - b.s), vol };
}

// 1) 타이틀: 경쾌한 응원가풍 테마
{
  const P = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'];
  track('title', 126, 8, [
    melody('lead', `G4:2 C5:2 E5:4 D5:2 C5:2 D5:4  E5:2 D5:2 B4:4 G4:8  A4:2 C5:2 E5:4 D5:2 C5:2 E5:4  F5:4 E5:2 D5:2 C5:8
      G4:2 C5:2 E5:4 G5:4 E5:4  D5:4 B4:2 D5:2 G5:8  A5:4 G5:2 F5:2 E5:4 D5:4  D5:4 E5:2 F5:2 G5:8`, 1),
    melody('brass', '-:112 G4:2 B4:2 D5:2 F5:2 G5:8', 0.8),
    comp('piano', P, 'x...x...x...x.o.', 3, 0.7),
    sustain('strings', P, 0.7, 4),
    bassLine(P, 'x.....x.x...x...', 1, true),
    drum('kick', 8, 'x.......x.x.....'), drum('snare', 8, '....x.......x...'), drum('hat', 8, 'x.o.x.o.x.o.x.o.', 0.9),
  ], 0.72);
}
// 2) 도시 낮: 로파이 팝
{
  const P = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', 'G7'];
  track('city', 92, 8, [
    melody('bell', `-:4 A5:2 G5:2 E5:4 -:4  D5:2 E5:2 G5:4 -:8  -:4 F5:2 E5:2 D5:4 C5:4  E5:8 -:8
      -:4 A5:2 C6:2 A5:4 G5:4  E5:4 G5:4 -:8  F5:2 E5:2 D5:2 C5:2 D5:4 E5:4  D5:8 -:8`, 0.9),
    comp('epiano', P, 'x..o..x...o..o..', 4, 0.8, 3),
    bassLine(P, 'x.....x...x.....', 0.9),
    drum('kick', 8, 'x......x..x.....', 0.8), drum('snare', 8, '....x.......x...', 0.6), drum('hat', 8, 'x.ooxoo.x.ooxoo.', 0.5),
  ], 0.9);
}
// 3) 도시 밤: 재즈 발라드
{
  const P = ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7'];
  track('night', 70, 8, [
    arp('piano', P, [0, 2, 1, 3, 2, 4, 3, 1], 0.55, 3, 2),
    sustain('pad', P, 0.8, 3),
    bassLine(P, 'x.......x.......', 0.8, true),
    melody('epiano', `E5:6 D5:2 C5:8  F5:6 E5:2 D5:8  D5:4 B4:4 G4:8  -:16  A5:6 G5:2 E5:8  D5:6 C5:2 A4:8  G#4:4 B4:4 E5:8  -:16`, 0.7),
    drum('hat', 8, '....x.......x..o', 0.35),
  ], 1.15);
}
// 4) 로맨스: 피아노 발라드
{
  const P = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'];
  track('romance', 78, 8, [
    arp('piano', P, [0, 1, 2, 3, 2, 1, 0, 1], 0.5, 3, 2),
    melody('piano', `F#5:4 E5:2 D5:2 A4:8  C#5:4 D5:2 E5:2 E5:8  D5:4 C#5:2 B4:2 F#5:8  G5:4 F#5:2 E5:2 D5:8
      F#5:4 A5:4 F#5:4 E5:4  E5:4 C#5:4 A4:8  B4:4 D5:4 G5:4 F#5:2 E5:2  E5:12 -:4`, 1),
    sustain('strings', P, 0.6, 4),
    bassLine(P, 'x.......x.......', 0.6),
  ], 1.2);
}
// 5) 드라마: 무거운 단조
{
  const P = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'];
  track('drama', 64, 8, [
    sustain('strings', P, 0.9, 3, 2),
    sustain('pad', P, 0.7, 2, 2),
    melody('piano', `A4:8 C5:4 B4:4  A4:16  F4:8 A4:4 C5:4  E5:16  D5:8 C5:4 B4:4  A4:16  G#4:8 B4:4 E5:4  E4:16`, 0.8),
    rhythm(8, 'x...............', (b, s, v) => (b % 2 === 0 ? [{ s, inst: 'timp', n: chord(P[b], 2).root, d: 8, v: 0.8 }] : [])),
  ], 1.3);
}
// 6) 경기장: 야구장 오르간 응원곡
{
  const P = ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'C'];
  track('stadium', 132, 8, [
    melody('organ', `C5:2 E5:2 G5:2 E5:2 A5:4 G5:4  F5:2 A5:2 C6:2 A5:2 G5:8  G5:2 F5:2 E5:2 D5:2 B4:4 D5:4  C5:4 G4:2 C5:2 E5:8
      E5:2 G5:2 C6:4 B5:2 A5:2 G5:4  A5:2 G5:2 F5:4 A5:4 C6:4  B5:2 A5:2 G5:2 F5:2 E5:2 D5:2 B4:4  C5:4 E5:4 C5:8`, 1),
    comp('organ', P, 'x..x..x...x.x...', 2, 0.45, 3),
    bassLine(P, 'x...x...x...x...', 0.8, true),
    drum('kick', 8, 'x...x...x...x...', 0.8), drum('clap', 8, '....x.......x...', 0.9), drum('hat', 8, '..x...x...x...x.', 0.5),
  ], 0.8);
}
// 7) 엔딩/시상식: 장엄한 팡파르
{
  const P = ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'];
  track('ending', 84, 8, [
    melody('brass', `E5:6 D5:2 C5:4 G4:4  A4:6 B4:2 C5:8  F5:6 E5:2 D5:4 C5:4  D5:12 -:4
      E5:6 F5:2 G5:4 E5:4  B4:6 C5:2 D5:8  A5:6 G5:2 F5:4 E5:4  D5:4 E5:4 G5:8`, 1),
    sustain('strings', P, 0.9, 4),
    arp('piano', P, [0, 1, 2, 4, 2, 1], 0.4, 3, 2),
    bassLine(P, 'x.......x.......', 0.8),
    rhythm(8, 'x...............', (b, s) => [{ s, inst: 'timp', n: chord(P[b], 2).root, d: 8, v: 0.6 }]),
  ], 0.95);
}

// 짧은 효과 음악 (1회)
const JINGLES = {
  win: { bpm: 150, ev: [...melody('brass', 'C5:2 E5:2 G5:2 C6:6 G5:2 C6:8'), ...melody('organ', 'C4:2 E4:2 G4:2 E5:14', 0.6), { s: 6, inst: 'kick', n: 0, d: 1, v: 1 }, { s: 6, inst: 'clap', n: 0, d: 1, v: 1 }] },
  lose: { bpm: 90, ev: [...melody('piano', 'E5:4 D#5:4 D5:4 C#5:12'), ...melody('pad', 'A3:24', 0.8)] },
  charge: { bpm: 160, ev: [...melody('organ', 'G4:2 C5:2 E5:2 G5:4 E5:2 G5:8', 2.2), { s: 12, inst: 'clap', n: 0, d: 1, v: 1 }, { s: 14, inst: 'clap', n: 0, d: 1, v: 1 }] },
  levelup: { bpm: 180, ev: melody('bell', 'C5:1 E5:1 G5:1 C6:4') },
  love: { bpm: 120, ev: [...melody('bell', 'E5:2 G#5:2 B5:2 E6:6', 1.8), ...melody('strings', 'E4:12', 1.2)] },
};

// ---------- 시퀀서 ----------
let cur = null;          // { name, t, bus, step, t0 }
let wanted = null;
let duckLevel = 1;
function startTrack(name) {
  const a = ac(); if (!a) return;
  const T = TRACKS[name];
  const bus = a.createGain();
  bus.gain.setValueAtTime(0.0001, a.currentTime);
  bus.gain.exponentialRampToValueAtTime(T.vol * duckLevel, a.currentTime + 1.2);
  bus.connect(master);
  cur = { name, T, bus, idx: 0, loop: 0, t0: a.currentTime + 0.12 };
}
function stopCur(fade = 0.8) {
  if (!cur || !ctx) { cur = null; return; }
  const b = cur.bus, t = ctx.currentTime;
  b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(Math.max(0.0001, b.gain.value), t);
  b.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { try { b.disconnect(); } catch (e) {} }, fade * 1000 + 3000);
  cur = null;
}
function tick() {
  if (!cur || !ctx || ctx.state !== 'running') return;
  const T = cur.T, sd = 60 / T.bpm / 4, ahead = ctx.currentTime + 0.25;
  for (let guard = 0; guard < 200; guard++) {
    if (cur.idx >= T.ev.length) { cur.idx = 0; cur.loop++; }
    const e = T.ev[cur.idx];
    const t = cur.t0 + (cur.loop * T.steps + e.s) * sd;
    if (t > ahead) break;
    if (t > ctx.currentTime - 0.05) { try { INST[e.inst](t, e.n, e.d * sd, e.v, cur.bus); } catch (err) {} }
    cur.idx++;
  }
}
setInterval(tick, 40);
// 오디오가 막혀 있으면 첫 터치에서 시작
document.addEventListener('pointerdown', () => { const a = Engine.audio(); if (a && wanted && (!cur || cur.name !== wanted)) play(wanted); }, true);

function play(name) {
  wanted = name;
  if (!name) { stopCur(); return; }
  if (cur && cur.name === name) return;
  const a = ac(); if (!a) return;
  stopCur();
  startTrack(name);
}
const stack = [];
window.Music = {
  play,
  push(name) { stack.push(wanted); if (name) play(name); },
  pop() { const p = stack.pop(); if (p !== undefined) play(p); },
  stop() { play(null); },
  get current() { return wanted; },
  // 효과 음악: 배경음악을 잠깐 줄이고 1회 연주
  jingle(name) {
    const a = ac(); if (!a || !musicOn) return;
    const J = JINGLES[name], sd = 60 / J.bpm / 4, t0 = a.currentTime + 0.05;
    const bus = a.createGain(); bus.gain.value = 1; bus.connect(master);
    let end = 0;
    for (const e of J.ev) { INST[e.inst](t0 + e.s * sd, e.n, e.d * sd, e.v, bus); end = Math.max(end, (e.s + e.d) * sd); }
    if (cur) {
      const g = cur.bus.gain, t = a.currentTime, v = cur.T.vol * duckLevel;
      g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.exponentialRampToValueAtTime(0.08, t + 0.15); g.setValueAtTime(0.08, t + end + 0.2); g.exponentialRampToValueAtTime(v, t + end + 1.2);
    }
    setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, (end + 3) * 1000);
  },
  // 투구 순간 등 배경음악을 작게
  duck(on) {
    const lv = on ? 0.3 : 1;
    if (lv === duckLevel) return;
    duckLevel = lv;
    if (cur && ctx) { const g = cur.bus.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.exponentialRampToValueAtTime(cur.T.vol * lv, t + 0.4); }
  },
  setOn(v) { musicOn = v; if (master && ctx) master.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.1); },
  get on() { return musicOn; },
  tracks: Object.keys(TRACKS),
  _tracks: TRACKS,
  // 미리듣기/테스트용: 곡을 오프라인으로 렌더링해 샘플 배열 반환
  async render(name, secs = 10, sr = 22050) {
    const off = new OfflineAudioContext(1, Math.floor(sr * secs), sr);
    const saveCtx = ctx, saveNoise = noiseBuf;
    ctx = off;
    noiseBuf = off.createBuffer(1, sr, sr);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const T = TRACKS[name] || JINGLES[name], sd = 60 / T.bpm / 4;
    const bus = off.createGain(); bus.gain.value = (T.vol || 1) * 0.55;
    const comp = off.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    bus.connect(comp); comp.connect(off.destination);
    const loopLen = (T.steps || 0) * sd;
    for (let k = 0; k === 0 || (loopLen && k * loopLen < secs); k++) {
      for (const e of T.ev) { const t = k * loopLen + e.s * sd + 0.05; if (t < secs) INST[e.inst](t, e.n, e.d * sd, e.v, bus); }
    }
    ctx = saveCtx; noiseBuf = saveNoise;
    const buf = await off.startRendering();
    return Array.from(buf.getChannelData(0));
  },
};
})();
