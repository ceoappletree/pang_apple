// 홈런왕 — 타격 엔진 (3D 원근 렌더링 + 타구 물리 + 타석 진행)
(() => {
'use strict';

// ---------- 화면 / 좌표계 ----------
// 논리 해상도 400x720. 월드 좌표: x=좌우(m, +는 1루 방향), y=높이, z=홈에서 투수 방향 거리.
const W = 400, H = 720;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let scale = 1, offX = 0, offY = 0, dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  scale = Math.min(vw / W, vh / H);
  offX = (vw - W * scale) / 2;
  offY = (vh - H * scale) / 2;
}
window.addEventListener('resize', resize);
resize();

const F = 900, CX = 200, CY = 200;
const CAM_HOME = { x: 0, y: 1.45, z: -2.6, yaw: 0, pitch: 0, zoom: 1 };
const cam = { ...CAM_HOME };

function toCam(x, y, z) {
  const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
  return [x1, y2, z2];
}
function projC(c) {
  const s = F * cam.zoom / c[2];
  return [CX + c[0] * s, CY - c[1] * s, s];
}
function proj(x, y, z) {
  const c = toCam(x, y, z);
  if (c[2] < 0.15) return null;
  return projC(c);
}
const NEAR = 0.2;
// 카메라 공간에서 근평면 클리핑 후 화면 좌표 다각형 반환
function projPoly(pts) {
  const cs = pts.map(p => toCam(p[0], p[1], p[2]));
  const out = [];
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i], b = cs[(i + 1) % cs.length];
    const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  if (out.length < 3) return null;
  return out.map(projC);
}
function pathPoly(pts) {
  const sp = projPoly(pts);
  if (!sp) return false;
  ctx.beginPath();
  ctx.moveTo(sp[0][0], sp[0][1]);
  for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1]);
  ctx.closePath();
  return true;
}
function fillPoly(pts, color) { if (pathPoly(pts)) { ctx.fillStyle = color; ctx.fill(); } }
// 지면 위 다각형 (x,z 쌍)
const g = (pts, y = 0) => pts.map(p => [p[0], y, p[1]]);

// ---------- 구장 ----------
const DEG = Math.PI / 180;
const FENCE_H = 3.5;
function fenceR(phi) { // phi: 중견수 방향 0, +는 1루(우측)
  const a = Math.abs(phi);
  if (a <= 45 * DEG) return 98 + 22 * Math.cos(2 * phi);
  const t = Math.min(1, (a - 45 * DEG) / (65 * DEG));
  return 98 - 70 * t;
}
const polar = (phi, r) => [Math.sin(phi) * r, Math.cos(phi) * r];
const BASES = { h: [0, 0], b1: [19.4, 19.4], b2: [0, 38.8], b3: [-19.4, 19.4] };
const MOUND = [0, 18.4];

const fenceLine = [];
for (let d = -110; d <= 110; d += 2.5) fenceLine.push(d * DEG);

// 관중 점 미리 생성
const crowd = [];
(function () {
  const cols = ['#e8e0d0', '#d94848', '#3b6fd8', '#f0c040', '#ffffff', '#2a2a3a', '#7a4ad8', '#e07a30'];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) {
    const phi = (-108 + rnd() * 216) * DEG;
    const t = rnd();
    const tier = rnd() < 0.55 ? 0 : 1;
    const r0 = fenceR(phi) + (tier ? 18 : 2), r1 = r0 + (tier ? 22 : 15);
    const h0 = tier ? 15 : FENCE_H + 0.5, h1 = tier ? 32 : 13;
    const r = r0 + (r1 - r0) * t, h = h0 + (h1 - h0) * t;
    const p = polar(phi, r);
    crowd.push({ x: p[0], y: h + 0.5, z: p[1], c: cols[(rnd() * cols.length) | 0], ph: rnd() * 6.28 });
  }
})();

function standBand(r0off, r1off, h0, h1, color) {
  for (let i = 0; i < fenceLine.length - 1; i++) {
    const a = fenceLine[i], b = fenceLine[i + 1];
    const ra = fenceR(a), rb = fenceR(b);
    const pa0 = polar(a, ra + r0off), pb0 = polar(b, rb + r0off);
    const pa1 = polar(a, ra + r1off), pb1 = polar(b, rb + r1off);
    fillPoly([[pa0[0], h0, pa0[1]], [pb0[0], h0, pb0[1]], [pb1[0], h1, pb1[1]], [pa1[0], h1, pa1[1]]], color);
  }
}

function drawField(time) {
  // 하늘
  const sky = ctx.createLinearGradient(0, -400, 0, H);
  sky.addColorStop(0, '#050a1c');
  sky.addColorStop(0.45, '#14275a');
  sky.addColorStop(0.75, '#3a4f8a');
  sky.addColorStop(1, '#6d6fa0');
  ctx.fillStyle = sky;
  ctx.fillRect(-W, -H * 2, W * 3, H * 5);

  // 조명탑
  for (const phi of [-60, -25, 25, 60]) {
    const p = polar(phi * DEG, fenceR(phi * DEG) + 46);
    const top = proj(p[0], 46, p[1]), bot = proj(p[0], 30, p[1]);
    if (!top || !bot) continue;
    ctx.strokeStyle = '#22283c'; ctx.lineWidth = Math.max(1, top[2] * 0.6);
    ctx.beginPath(); ctx.moveTo(bot[0], bot[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
    const glow = ctx.createRadialGradient(top[0], top[1], 0, top[0], top[1], top[2] * 14);
    glow.addColorStop(0, 'rgba(255,250,220,.95)');
    glow.addColorStop(0.15, 'rgba(255,245,200,.45)');
    glow.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(top[0], top[1], top[2] * 14, 0, 7); ctx.fill();
  }

  // 관중석 (윗층 → 아랫층)
  standBand(18, 40, 15, 32, '#2b3350');
  standBand(16, 18, 13, 15, '#1b2138');
  standBand(1, 16, FENCE_H + 0.3, 13, '#323b5c');
  // 관중
  for (const c of crowd) {
    const p = proj(c.x, c.y + (cheer > 0 ? Math.max(0, Math.sin(time * 14 + c.ph)) * 0.6 * cheer : 0), c.z);
    if (!p) continue;
    const s = Math.max(1, p[2] * 0.45);
    ctx.fillStyle = c.c;
    ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }

  // 펜스
  for (let i = 0; i < fenceLine.length - 1; i++) {
    const a = fenceLine[i], b = fenceLine[i + 1];
    const pa = polar(a, fenceR(a)), pb = polar(b, fenceR(b));
    fillPoly([[pa[0], 0, pa[1]], [pb[0], 0, pb[1]], [pb[0], FENCE_H, pb[1]], [pa[0], FENCE_H, pa[1]]], i % 2 ? '#14513a' : '#175c42');
  }
  // 펜스 위 노란 라인
  ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  let first = true;
  for (const phi of fenceLine) {
    const p = polar(phi, fenceR(phi));
    const s = proj(p[0], FENCE_H, p[1]);
    if (!s) { first = true; continue; }
    if (first) { ctx.moveTo(s[0], s[1]); first = false; } else ctx.lineTo(s[0], s[1]);
  }
  ctx.stroke();
  // 거리 표시
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.textAlign = 'center';
  for (const [phi, label] of [[-30, '104'], [30, '104']]) {
    const p = polar(phi * DEG, fenceR(phi * DEG) - 0.2);
    const s = proj(p[0], 1.8, p[1]);
    if (!s) continue;
    ctx.font = `bold ${Math.max(6, s[2] * 1.3)}px sans-serif`;
    ctx.fillText(label, s[0], s[1]);
  }

  // 잔디
  const ground = fenceLine.map(phi => { const p = polar(phi, fenceR(phi)); return [p[0], 0, p[1]]; });
  ground.push([10, 0, -8], [-10, 0, -8]);
  if (pathPoly(ground)) {
    ctx.fillStyle = '#2f8a3e';
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let z = -8; z < 130; z += 9) {
      if (((z + 8) / 9) % 2 < 1) continue;
      fillPoly(g([[-140, z], [140, z], [140, z + 9], [-140, z + 9]]), '#2a7f38');
    }
    // 내야 흙 (페어 구역 근처로 제한)
    ctx.save();
    if (pathPoly(g([[0, -5], [-90, 85], [90, 85]]))) ctx.clip();
    const dirt = [];
    for (let a = 0; a < 360; a += 6) dirt.push([MOUND[0] + Math.sin(a * DEG) * 28.5, MOUND[1] + Math.cos(a * DEG) * 28.5]);
    fillPoly(g(dirt), '#b9844f');
    ctx.restore();
    // 내야 잔디
    fillPoly(g([[0, 2.6], [17.2, 19.4], [0, 36.4], [-17.2, 19.4]]), '#2f8a3e');
    // 홈 / 마운드 / 베이스 주변 흙
    const circ = (cx, cz, r, n = 20) => { const a = []; for (let i = 0; i < n; i++) a.push([cx + Math.sin(i / n * 6.283) * r, cz + Math.cos(i / n * 6.283) * r]); return a; };
    fillPoly(g(circ(0, 0, 4)), '#b9844f');
    fillPoly(g(circ(MOUND[0], MOUND[1], 2.8)), '#c08b56');
    for (const k of ['b1', 'b3']) fillPoly(g(circ(BASES[k][0], BASES[k][1], 2.2, 14)), '#b9844f');
    ctx.restore();
  }

  // 파울 라인
  const lineQuad = (x0, z0, x1, z1, w) => {
    const len = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / len * w, nz = (x1 - x0) / len * w;
    fillPoly(g([[x0 - nx, z0 - nz], [x1 - nx, z1 - nz], [x1 + nx, z1 + nz], [x0 + nx, z0 + nz]]), 'rgba(255,255,255,.9)');
  };
  const lend = fenceR(45 * DEG) * Math.SQRT1_2;
  lineQuad(0, 0, lend, lend, 0.07);
  lineQuad(0, 0, -lend, lend, 0.07);
  // 폴
  for (const sx of [-1, 1]) {
    const b = proj(sx * lend, 0, lend), t = proj(sx * lend, 22, lend);
    if (b && t) { ctx.strokeStyle = '#ffd400'; ctx.lineWidth = Math.max(1, b[2] * 0.25); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke(); }
  }
  // 베이스
  for (const k of ['b1', 'b2', 'b3']) {
    const [bx, bz] = BASES[k];
    fillPoly(g([[bx, bz - 0.27], [bx + 0.27, bz], [bx, bz + 0.27], [bx - 0.27, bz]], 0.02), '#fff');
  }
  // 투수판
  fillPoly(g([[-0.3, 18.3], [0.3, 18.3], [0.3, 18.45], [-0.3, 18.45]], 0.02), '#fff');
  // 홈플레이트
  fillPoly(g([[-0.215, 0], [0.215, 0], [0.215, -0.215], [0, -0.43], [-0.215, -0.215]], 0.01), '#f4f4f4');
}

// ---------- 사람 그리기 ----------
function drawPerson(x, z, opts) {
  const base = proj(x, opts.y0 || 0, z);
  if (!base) return;
  const s = base[2];
  const bx = base[0], by = base[1];
  const m = v => v * s;
  const run = opts.run || 0, t = opts.t || 0;
  const legSw = run ? Math.sin(t * 16) * 0.35 : 0;
  ctx.lineCap = 'round';
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(bx, by, m(0.45), m(0.12), 0, 0, 7); ctx.fill();
  // 다리
  ctx.strokeStyle = opts.pants; ctx.lineWidth = Math.max(1.2, m(0.16));
  ctx.beginPath();
  ctx.moveTo(bx - m(0.1), by - m(0.95)); ctx.lineTo(bx - m(0.18) + m(legSw), by);
  ctx.moveTo(bx + m(0.1), by - m(0.95)); ctx.lineTo(bx + m(0.18) - m(legSw), by);
  ctx.stroke();
  // 몸통
  ctx.fillStyle = opts.shirt;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx - m(0.22), by - m(1.5), m(0.44), m(0.6), m(0.1)) : ctx.rect(bx - m(0.22), by - m(1.5), m(0.44), m(0.6));
  ctx.fill();
  // 팔
  ctx.strokeStyle = opts.shirt; ctx.lineWidth = Math.max(1, m(0.11));
  ctx.beginPath();
  const armSw = run ? Math.sin(t * 16) * 0.25 : 0;
  ctx.moveTo(bx - m(0.2), by - m(1.42)); ctx.lineTo(bx - m(0.36) - m(armSw), by - m(1.0));
  ctx.moveTo(bx + m(0.2), by - m(1.42)); ctx.lineTo(bx + m(0.36) + m(armSw), by - m(1.0));
  ctx.stroke();
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath(); ctx.arc(bx + m(0.38) + m(armSw), by - m(0.98), Math.max(1, m(0.09)), 0, 7); ctx.fill();
  // 머리 + 모자
  ctx.fillStyle = '#e9b98f';
  ctx.beginPath(); ctx.arc(bx, by - m(1.64), Math.max(1, m(0.13)), 0, 7); ctx.fill();
  ctx.fillStyle = opts.cap;
  ctx.beginPath(); ctx.arc(bx, by - m(1.68), Math.max(1, m(0.135)), Math.PI, 0); ctx.fill();
}

const AWAY_U = { shirt: '#cfd6e6', pants: '#aab3c8', cap: '#1d2f6b' };
const HOME_U = { shirt: '#f4f4f8', pants: '#e2e2ea', cap: '#c8202e' };
// 투수 모드에서는 수비가 우리 팀(애플즈)
let AWAY = AWAY_U;

function drawPitcher() {
  const z = 18.4;
  const base = proj(0, 0.25, z);
  if (!base) return;
  const s = base[2], bx = base[0], by = base[1];
  const m = v => v * s;
  // 와인드업 단계: 0~1 (1이 릴리스), 이후 팔로스루
  let ph = pitcherPhase;
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(bx, by, m(0.5), m(0.14), 0, 0, 7); ctx.fill();

  const lift = ph < 0.45 ? Math.sin(ph / 0.45 * Math.PI / 2) : ph < 0.75 ? 1 - (ph - 0.45) / 0.3 : 0;
  const stride = ph > 0.55 ? Math.min(1, (ph - 0.55) / 0.35) : 0;
  const lean = ph > 0.75 ? Math.min(1, (ph - 0.75) / 0.35) : 0;
  const hipY = by - m(0.95 - 0.08 * stride);
  const shX = bx + m(0.0), shY = hipY - m(0.55 - 0.12 * lean);
  // 다리 (투수 기준 왼다리가 화면 오른쪽)
  ctx.strokeStyle = AWAY.pants; ctx.lineWidth = Math.max(1.5, m(0.17));
  ctx.beginPath();
  ctx.moveTo(bx - m(0.08), hipY); ctx.lineTo(bx - m(0.2), by);
  ctx.moveTo(bx + m(0.08), hipY);
  ctx.lineTo(bx + m(0.2 + 0.1 * stride), by - m(0.75 * lift) + m(0.05 * stride));
  ctx.stroke();
  // 몸통
  ctx.fillStyle = AWAY.shirt;
  ctx.beginPath();
  ctx.ellipse(bx, (hipY + shY) / 2, m(0.24), (hipY - shY) / 2 + m(0.06), 0, 0, 7);
  ctx.fill();
  // 글러브 팔 (화면 오른쪽)
  ctx.strokeStyle = AWAY.shirt; ctx.lineWidth = Math.max(1.2, m(0.12));
  const gx = bx + m(0.25 + 0.2 * lift - 0.15 * lean), gy = shY + m(0.25 - 0.1 * lift + 0.2 * lean);
  ctx.beginPath(); ctx.moveTo(bx + m(0.2), shY + m(0.05)); ctx.lineTo(gx, gy); ctx.stroke();
  ctx.fillStyle = '#6b4220';
  ctx.beginPath(); ctx.arc(gx, gy, Math.max(1.5, m(0.12)), 0, 7); ctx.fill();
  // 투구 팔 (화면 왼쪽): 뒤로 젖혔다가 앞으로
  let ang;
  if (ph < 0.5) ang = 200 - ph * 80;          // 아래쪽
  else if (ph < 0.9) ang = 160 + (ph - 0.5) / 0.4 * 120; // 뒤로 젖혀 위로
  else if (ph <= 1) ang = 280 + (ph - 0.9) / 0.1 * 60;
  else ang = 340 + Math.min(1, (ph - 1) / 0.3) * 80;
  const ar = ang * DEG;
  const hx = bx - m(0.2) + Math.cos(ar) * m(0.62) * (ang > 200 ? 1 : 0.6) * -1;
  const hy = shY + Math.sin(ar) * m(0.62) * -1;
  ctx.strokeStyle = AWAY.shirt;
  ctx.beginPath(); ctx.moveTo(bx - m(0.2), shY + m(0.05)); ctx.lineTo(hx, hy); ctx.stroke();
  if (ph < 1 && state === 'windup') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(1, m(0.045)), 0, 7); ctx.fill();
  }
  // 머리
  ctx.fillStyle = '#e9b98f';
  ctx.beginPath(); ctx.arc(bx + m(0.02 * lean), shY - m(0.2), Math.max(1.5, m(0.13)), 0, 7); ctx.fill();
  ctx.fillStyle = AWAY.cap;
  ctx.beginPath(); ctx.arc(bx + m(0.02 * lean), shY - m(0.24), Math.max(1.5, m(0.135)), Math.PI, 0); ctx.fill();
}

// ---------- 수비수 ----------
const FIELDERS = [
  { name: 'P', home: [0, 17.4], speed: 6.0, react: 0.4, reach: 1.1, hmax: 2.3, inf: true },
  { name: '1B', home: [16, 25], speed: 6.5, react: 0.25, reach: 1.3, hmax: 2.4, inf: true },
  { name: '2B', home: [8.5, 35], speed: 6.8, react: 0.25, reach: 1.4, hmax: 2.4, inf: true },
  { name: 'SS', home: [-8.5, 35], speed: 6.8, react: 0.25, reach: 1.4, hmax: 2.4, inf: true },
  { name: '3B', home: [-16, 25], speed: 6.5, react: 0.25, reach: 1.3, hmax: 2.4, inf: true },
  { name: 'LF', home: [-29, 76], speed: 7.6, react: 0.35, reach: 1.7, hmax: 2.9, inf: false },
  { name: 'CF', home: [0, 90], speed: 8.0, react: 0.35, reach: 1.7, hmax: 2.9, inf: false },
  { name: 'RF', home: [29, 76], speed: 7.6, react: 0.35, reach: 1.7, hmax: 2.9, inf: false },
];
const fpos = FIELDERS.map(f => ({ x: f.home[0], z: f.home[1], run: 0 }));
function resetFielders() { FIELDERS.forEach((f, i) => { fpos[i].x = f.home[0]; fpos[i].z = f.home[1]; fpos[i].run = 0; }); }

// ---------- 오디오 ----------
let actx = null, muted = false, sfxBus = null;
// 효과음 전용 출력 (음악과 따로 켜고 끔)
function sfxOut() {
  const a = audio();
  if (!sfxBus) { sfxBus = a.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(a.destination); }
  return sfxBus;
}
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function noise(dur, type, freq, q, vol, attack = 0.002) {
  const a = audio(); if (!a || muted) return;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = a.createGain();
  const t = a.currentTime;
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(vol, t + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(gn); gn.connect(sfxOut());
  src.start(t); src.stop(t + dur + 0.05);
}
function tone(freq, dur, vol, type = 'sine', slide = 0) {
  const a = audio(); if (!a || muted) return;
  const o = a.createOscillator(), gn = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(gn); gn.connect(sfxOut()); o.start(t); o.stop(t + dur + 0.05);
}
// 경기장 관중 웅성거림 (계속 반복)
let crowdSrc = null, crowdGain = null;
function crowdSound(on) {
  const a = audio(); if (!a) return;
  if (on && !crowdSrc) {
    const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / len * Math.PI * 6));
    crowdSrc = a.createBufferSource(); crowdSrc.buffer = buf; crowdSrc.loop = true;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
    crowdGain = a.createGain(); crowdGain.gain.value = 0.0001;
    crowdSrc.connect(f); f.connect(crowdGain); crowdGain.connect(sfxOut());
    crowdSrc.start();
    crowdGain.gain.exponentialRampToValueAtTime(0.05, a.currentTime + 1.2);
  } else if (!on && crowdSrc) {
    const s = crowdSrc, g = crowdGain;
    g.gain.setTargetAtTime(0.0001, a.currentTime, 0.3);
    setTimeout(() => { try { s.stop(); } catch (e) {} }, 1500);
    crowdSrc = null; crowdGain = null;
  }
}
const sfx = {
  crack(power) {
    // 날카로운 '딱' + 묵직한 저음 + 짧은 잔향
    noise(0.05, 'highpass', 4200, 0.7, 0.8 * power + 0.25, 0.0005);
    noise(0.16, 'bandpass', 2300, 1.4, 0.9 * power + 0.2, 0.0008);
    tone(1150, 0.05, 0.35 * power + 0.1, 'square', -700);
    tone(95, 0.22, 0.6 * power, 'sine', -45);
  },
  bunt() { noise(0.06, 'bandpass', 1400, 2, 0.45, 0.001); tone(500, 0.05, 0.15, 'square', -200); },
  firework() { noise(0.5, 'lowpass', 300, 0.8, 0.5, 0.002); noise(0.9, 'highpass', 3000, 0.5, 0.08, 0.1); },
  foul() { noise(0.08, 'bandpass', 1800, 2, 0.5, 0.001); },
  whoosh() { noise(0.18, 'bandpass', 700, 0.8, 0.25, 0.04); },
  mitt() { noise(0.07, 'lowpass', 600, 1, 0.8, 0.001); tone(140, 0.08, 0.5, 'sine', -60); },
  release() { noise(0.05, 'highpass', 3000, 1, 0.12); },
  cheer(dur = 2.5, vol = 0.35) { noise(dur, 'bandpass', 1100, 0.5, vol, 0.25); },
  groan() { noise(0.9, 'lowpass', 500, 0.7, 0.2, 0.1); },
  catchBall() { noise(0.05, 'lowpass', 900, 1, 0.4); },
  click() { tone(1400, 0.035, 0.05, 'sine', -400); },
  blip() { tone(760 + Math.random() * 120, 0.03, 0.022, 'square'); },
  pop() { tone(520, 0.08, 0.08, 'sine', 380); },
  step() { noise(0.04, 'lowpass', 900, 0.7, 0.05, 0.002); },
  coin() { tone(1318, 0.09, 0.09, 'square'); setTimeout(() => tone(1760, 0.3, 0.08, 'square'), 80); },
  sparkle() { [1568, 2093, 2637, 3136].forEach((f, i) => setTimeout(() => tone(f, 0.18, 0.06, 'triangle'), i * 60)); },
  heart() { tone(988, 0.15, 0.08, 'sine'); setTimeout(() => tone(1319, 0.3, 0.08, 'sine'), 110); },
  sad() { tone(330, 0.25, 0.08, 'triangle', -80); setTimeout(() => tone(262, 0.4, 0.07, 'triangle', -60), 180); },
  boom() { noise(0.7, 'lowpass', 180, 0.8, 0.9, 0.003); tone(60, 0.5, 0.5, 'sine', -30); },
  ooh() { noise(1.1, 'bandpass', 520, 1.2, 0.18, 0.15); },
  ding() { tone(880, 0.25, 0.15, 'triangle'); setTimeout(() => tone(1320, 0.35, 0.12, 'triangle'), 90); },
};
function buzz(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} }

// ---------- 상수 ----------
const ZONE = { x0: -0.215, x1: 0.215, y0: 0.5, y1: 1.1 };
const BALL_R = 0.037;
const REL = { x: -0.32, y: 1.85, z: 16.9 };
const CATCH_Z = -1.55;
const PITCH_DEF = {
  FB: { name: '직구', k: 1, bx: [-0.08, 0.08], by: -0.12 },
  TW: { name: '투심', k: 0.97, bx: [-0.32, -0.2], by: -0.3 },
  CH: { name: '체인지업', k: 0.83, bx: [-0.25, -0.12], by: -0.55 },
  CU: { name: '커브', k: 0.76, bx: [0.2, 0.35], by: -1.25 },
  SL: { name: '슬라이더', k: 0.88, bx: [0.55, 0.8], by: -0.35 },
  FK: { name: '포크', k: 0.86, bx: [-0.05, 0.05], by: -0.95 },
};
const DEFAULT_MIX = { FB: 0.5, CH: 0.2, CU: 0.15, SL: 0.15 };

// ---------- 상태 ----------
let state = 'idle';
let stateT = 0, waitFor = 0;
let pitcherPhase = 0;
let ab = null;      // 현재 타석
let pitch = null;   // 현재 투구
let swing = null;   // 스윙 정보
let play = null;    // 타구 진행
let marks = null;   // 투구 위치 표시
let cheer = 0, shake = 0, flash = 0, hitStop = 0;
let particles = [], impacts = [], fireworks = [];
let clock = 0;
let lastTrail = [];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- HUD ----------
const $ = id => document.getElementById(id);
function updateHUD() {
  if (!ab) return;
  const s = ab.sit;
  $('inning').textContent = s.inningLabel || '';
  $('scoreLbl').textContent = s.scoreLabel || '득점';
  $('score').textContent = s.scoreText != null ? s.scoreText : '';
  document.querySelectorAll('.dot.b').forEach((d, i) => d.classList.toggle('on', i < ab.balls));
  document.querySelectorAll('.dot.s').forEach((d, i) => d.classList.toggle('on', i < ab.strikes));
  document.querySelectorAll('.dot.o').forEach((d, i) => d.classList.toggle('on', i < ab.outs));
  $('b1').classList.toggle('on', !!ab.bases[0]);
  $('b2').classList.toggle('on', !!ab.bases[1]);
  $('b3').classList.toggle('on', !!ab.bases[2]);
}
const FLIP = { '#ff8a7a': '#8ef0a8', '#7fe0ff': '#ff8a7a', '#ffd54a': '#ff6b6b', '#8ef0a8': '#ffb38a' };
function showMsg(text, color = '#fff', sub = '') {
  if (ab && ab.mode === 'pitch' && FLIP[color]) color = FLIP[color];
  const el = $('msg');
  el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  el.style.color = color;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function showTiming(text, color) {
  const el = $('timing');
  el.textContent = text; el.style.color = color;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function showPitchInfo(text) { const el = $('pitchInfo'); el.textContent = text; el.classList.add('show'); }
function hidePitchInfo() { $('pitchInfo').classList.remove('show'); }

// ---------- 타자 능력 → 타격 파라미터 ----------
const COND_MUL = [0.84, 0.92, 1, 1.08, 1.16];
function batterParams(b) {
  const cond = COND_MUL[b.cond == null ? 2 : b.cond];
  return {
    hitR: (0.125 + 0.0013 * b.meet) * cond,                 // 미트 커서 반경 (m)
    evMax: 40 + 12 * b.power / 100,                          // 최대 타구 속도 (m/s)
    winE: 0.105 + 0.0004 * b.eye,                            // 빠른 타이밍 허용
    winL: 0.062 + 0.0003 * b.eye,                            // 늦은 타이밍 허용
    showType: b.eye >= 45,                                   // 릴리스 순간 구종 간파
    run1B: 4.6 - 0.008 * b.speed,                            // 1루까지 주루 시간 (s)
  };
}

// ---------- 투구 ----------
function choosePitch() {
  const pc = ab.pitcher, lv = pc.lv;
  const mix = pc.mix || DEFAULT_MIX;
  const entries = Object.entries(mix);
  const tot = entries.reduce((a, e) => a + e[1], 0);
  let r = Math.random() * tot, type = entries[0][0];
  for (const [t, p] of entries) { if ((r -= p) <= 0) { type = t; break; } }
  const def = PITCH_DEF[type];
  const kmh = Math.round(((pc.velo || (128 + 20 * lv)) + rand(-3, 3)) * def.k);
  const slow = 1.5 - 0.32 * clamp(lv, 0, 1.3);
  const T = 18.0 / (kmh / 3.6) * slow;
  const ctrl = pc.ctrl == null ? 0.5 : pc.ctrl;
  const zoneP = clamp(0.48 + ctrl * 0.16 + ab.balls * 0.1 - ab.strikes * 0.09, 0.3, 0.92);
  let tx, ty;
  if (Math.random() < zoneP) {
    tx = rand(ZONE.x0 + 0.03, ZONE.x1 - 0.03);
    ty = rand(ZONE.y0 + 0.04, ZONE.y1 - 0.04);
  } else {
    const side = (Math.random() * 4) | 0;
    const o = rand(0.07, 0.26);
    if (side === 0) { tx = ZONE.x0 - o; ty = rand(ZONE.y0 - 0.1, ZONE.y1); }
    else if (side === 1) { tx = ZONE.x1 + o; ty = rand(ZONE.y0 - 0.1, ZONE.y1); }
    else if (side === 2) { tx = rand(ZONE.x0, ZONE.x1); ty = ZONE.y0 - o; }
    else { tx = rand(ZONE.x0, ZONE.x1); ty = ZONE.y1 + o * 0.8; }
  }
  const inZone = tx > ZONE.x0 - BALL_R && tx < ZONE.x1 + BALL_R && ty > ZONE.y0 - BALL_R && ty < ZONE.y1 + BALL_R;
  return { type, name: def.name, kmh, T, tx, ty, bx: rand(def.bx[0], def.bx[1]), by: def.by, t: 0, inZone };
}
function pitchPos(p, t) {
  const s = t / p.T;
  if (s <= 1) {
    const q = s * s - s;
    return { x: REL.x + (p.tx - REL.x) * s + p.bx * q, y: REL.y + (p.ty - REL.y) * s + p.by * q, z: REL.z * (1 - s) };
  }
  // 홈 통과 후: 접선 방향으로 연장
  const e = 0.001;
  const a = pitchPos(p, p.T * (1 - e));
  const k = (s - 1) / e;
  return { x: p.tx + (p.tx - a.x) * k, y: p.ty + (p.ty - a.y) * k, z: Math.max(CATCH_Z, -a.z * k) };
}

// ---------- 타구 물리 ----------
const SIM_DT = 1 / 60;
const DRAG = 0.0042;
function simulateHit(x, y, z, ev, launch, spray) {
  const cl = Math.cos(launch), vh = ev * cl;
  let vx = vh * Math.sin(spray), vz = vh * Math.cos(spray), vy = ev * Math.sin(launch);
  const pts = [];
  let bounced = false, hr = -1, grd = -1, rolling = false, stopped = false, wallHit = false;
  for (let i = 0; i < 60 * 12; i++) {
    pts.push({ x, y, z, b: bounced });
    if (stopped) continue;
    if (!rolling) {
      const sp = Math.hypot(vx, vy, vz);
      vx += -DRAG * sp * vx * SIM_DT;
      vz += -DRAG * sp * vz * SIM_DT;
      vy += (-9.8 - DRAG * sp * vy) * SIM_DT;
      x += vx * SIM_DT; y += vy * SIM_DT; z += vz * SIM_DT;
      if (y <= 0 && vy < 0) {
        y = 0; bounced = true;
        vy = -vy * 0.38; vx *= 0.72; vz *= 0.72;
        if (vy < 1.2) { rolling = true; vy = 0; }
      }
    } else {
      const sp = Math.hypot(vx, vz);
      const ns = Math.max(0, sp - 5.5 * SIM_DT);
      if (ns < 0.2) { stopped = true; vx = vz = 0; }
      else { vx *= ns / sp; vz *= ns / sp; }
      x += vx * SIM_DT; z += vz * SIM_DT;
    }
    if (hr < 0 && grd < 0) {
      const r = Math.hypot(x, z), phi = Math.atan2(x, z), R = fenceR(phi);
      if (r >= R && Math.abs(phi) <= 45 * DEG) {
        if (y > FENCE_H) {
          if (!bounced) hr = i; else grd = i;
        } else if (!wallHit) {
          wallHit = true;
          const nx = Math.sin(phi), nz = Math.cos(phi);
          const dot = vx * nx + vz * nz;
          vx -= 1.3 * dot * nx; vz -= 1.3 * dot * nz;
          x = nx * (R - 0.3); z = nz * (R - 0.3);
        }
      }
    }
  }
  return { pts, hr, grd };
}

function estimateCarry(sim) {
  const pts = sim.pts;
  for (let i = sim.hr; i < pts.length; i++) if (pts[i].y <= 0.5) return Math.hypot(pts[i].x, pts[i].z);
  const l = pts[pts.length - 1];
  return Math.hypot(l.x, l.z);
}

function planPlay(startPos, ev, launch, spray, info) {
  const sim = simulateHit(startPos.x, startPos.y, startPos.z, ev, launch, spray);
  const foul = Math.abs(spray) > 45 * DEG;
  const p = { ...sim, ev, launch, spray, foul, t: 0, end: 0, fielder: -1, catchI: -1, outcome: null, throwTo: null, info };
  if (foul) { p.end = 1.6; p.outcome = { kind: 'foul' }; return p; }

  // 각 수비수가 공을 잡을 수 있는 가장 빠른 시점
  let best = { t: Infinity, f: -1, i: -1 };
  const limit = sim.hr >= 0 ? sim.hr : sim.grd >= 0 ? sim.grd : sim.pts.length;
  FIELDERS.forEach((f, fi) => {
    for (let i = 1; i < limit; i++) {
      const pt = sim.pts[i];
      const t = i * SIM_DT;
      if (t < f.react || pt.y > f.hmax) continue;
      const d = Math.hypot(pt.x - f.home[0], pt.z - f.home[1]) - f.reach;
      if (d <= f.speed * (t - f.react)) {
        if (t < best.t) best = { t, f: fi, i };
        break;
      }
    }
  });

  if (sim.hr >= 0 && (best.f < 0 || best.i > sim.hr)) {
    p.dist = Math.round(estimateCarry(sim));
    p.outcome = { kind: 'hr' };
    p.end = sim.hr * SIM_DT + 1.6;
    return p;
  }
  if (sim.grd >= 0 && (best.f < 0 || best.i > sim.grd)) {
    p.outcome = { kind: 'hit', bases: 2, text: '인정 2루타!' };
    p.end = sim.grd * SIM_DT + 1.0;
    return p;
  }
  const pt = sim.pts[best.i];
  const f = FIELDERS[best.f];
  p.fielder = best.f; p.catchI = best.i;
  p.catchPt = { x: pt.x, z: pt.z };
  const tF = best.t;
  if (!pt.b) {
    const deg = launch / DEG;
    let text = '플라이 아웃';
    if (deg < 16) text = '라인드라이브 아웃';
    else if (f.inf) text = '내야 플라이 아웃';
    p.outcome = { kind: 'out', text, fly: true, deep: !f.inf && pt.z > 55 };
    p.end = tF + 1.0;
    return p;
  }
  const fp = [pt.x, pt.z];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const run1B = ab.P.run1B;
  if (f.inf) {
    let tArr;
    if (best.f === 1 && dist(fp, BASES.b1) < 5) tArr = tF + dist(fp, BASES.b1) / 6;
    else tArr = tF + 0.45 + dist(fp, BASES.b1) / 33;
    p.throwTo = BASES.b1; p.throwAt = tF + 0.35;
    if (tArr < run1B) p.outcome = { kind: 'out', text: '땅볼 아웃', ground: true, quick: tArr < run1B - 0.9 };
    else p.outcome = { kind: 'hit', bases: 1, text: '내야 안타!' };
    p.end = tF + 0.35 + dist(fp, BASES.b1) / 33 + 0.6;
    return p;
  }
  const k = run1B / 4.25;
  let bases = 1;
  const tTo2 = tF + 0.5 + dist(fp, BASES.b2) / 30;
  const tTo3 = tF + 0.5 + dist(fp, BASES.b3) / 30;
  if (tTo2 > 8.3 * k) bases = 2;
  if (tTo3 > 12.2 * k) bases = 3;
  p.throwTo = bases >= 2 ? BASES.b3 : BASES.b2; p.throwAt = tF + 0.45;
  p.outcome = { kind: 'hit', bases, text: ['', '안타!', '2루타!', '3루타!'][bases] };
  p.end = tF + 0.45 + dist(fp, p.throwTo) / 30 + 0.5;
  return p;
}

// ---------- 입력 ----------
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  audio();
  const lx = (e.clientX - offX) / scale, ly = (e.clientY - offY) / scale;
  trySwing(lx, ly);
});

function trySwing(sx, sy) {
  if (ab && ab.mode === 'pitch') { pitchTap(sx, sy); return; }
  if (state !== 'pitch' || swing) return;
  const P = ab.P;
  // 화면 터치 위치 → 홈플레이트 평면(z=0) 상의 월드 좌표
  const s = F / (0 - CAM_HOME.z);
  const wx = (sx - CX) / s, wy = CAM_HOME.y - (sy - CY) / s;
  const dt = pitch.t - pitch.T; // 음수 = 빠름
  const bunt = ab.tactic === 'bunt';
  swing = { sx, sy, wx, wy, t: 0, contact: false, bunt };
  if (!bunt) sfx.whoosh();
  const dx = wx - pitch.tx, dy = wy - pitch.ty;
  const dist = Math.hypot(dx, dy);
  const winE = bunt ? 0.22 : P.winE, winL = bunt ? 0.09 : P.winL, hitR = bunt ? P.hitR * 1.5 : P.hitR;
  if (dt < -winE || dt > winL || dist > hitR) {
    swing.miss = true;
    if (dt < -winE) showTiming('너무 빨라요', '#9fd3ff');
    else if (dt > winL) showTiming('너무 늦어요', '#ffb38a');
    else showTiming(dy > 0 ? '공 위로 헛스윙' : '공 아래로 헛스윙', '#ffe08a');
    return;
  }
  const pos = pitchPos(pitch, pitch.t);
  swing.contact = true;
  hidePitchInfo();
  if (bunt) {
    const ev = rand(7, 12.5), launch = rand(-20, 5) + (pitch.ty - wy) / hitR * 25, spray = rand(-32, 32);
    play = planPlay(pos, ev, launch * DEG, spray * DEG, { q: 0.3, perfect: false, bunt: true });
    sfx.bunt();
    hitStop = 0.04;
    setState('hit');
    return;
  }
  // 정타 품질
  const tq = dt < 0 ? 1 - (-dt) / winE : 1 - dt / winL;
  const lq = 1 - dist / hitR;
  const q = clamp(0.55 * tq + 0.45 * lq, 0, 1);
  const perfect = Math.abs(dt) < 0.022 && dist < hitR * 0.3;
  const ev = 18 + (P.evMax - 18) * Math.pow(q, 0.8) + (perfect ? 3 : 0) + rand(-1.5, 1.5);
  let launch = 20 + ((pitch.ty - wy) / hitR) * 40 + rand(-5, 5);
  if (q < 0.3) launch += rand(-18, 22);
  launch = clamp(launch, -25, 80);
  const tnorm = dt < 0 ? dt / winE : dt / winL; // -1(빠름) ~ 1(늦음)
  const spray = tnorm * 58 + (dx / hitR) * 8 + rand(-5, 5);
  play = planPlay(pos, ev, launch * DEG, spray * DEG, { q, perfect });
  const big = perfect || play.outcome.kind === 'hr';
  if (perfect) showTiming('🔥 퍼펙트!', '#ffd54a');
  else if (tnorm < -0.45) showTiming('조금 빨라요', '#9fd3ff');
  else if (tnorm > 0.45) showTiming('조금 늦어요', '#ffb38a');
  else showTiming('정타!', '#b5f5a0');
  const power = play.foul ? 0.45 : clamp(q + 0.15, 0.3, 1);
  sfx.crack(power);
  buzz(big ? [70] : 25);
  // 타격감: 히트스톱 + 화면 흔들림 + 임팩트
  hitStop = play.foul ? 0.03 : big ? 0.16 : 0.05 + q * 0.06;
  shake = big ? 12 : 3 + q * 5;
  flash = big ? 1 : 0.35 + q * 0.3;
  if (big) play.slow = 0.55;
  impacts.push({ x: sx, y: sy, t: 0, big, word: big ? '따악!!' : q > 0.55 ? '딱!' : '틱', power });
  spawnParticles(sx, sy, big ? 34 : 10 + (q * 12) | 0);
  setState('hit');
}

function spawnParticles(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), v = rand(80, 380);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.7), t: 0, c: Math.random() < 0.5 ? '#fff6c8' : '#ffd54a', g: 600 });
  }
}
function launchFireworks() {
  const cols = ['#ffd54a', '#ff6b6b', '#6bd5ff', '#b98aff', '#7dffa8', '#ffffff'];
  for (let k = 0; k < 5; k++) {
    fireworks.push({ x: rand(40, 360), y: rand(110, 260), delay: k * 0.28 + rand(0, 0.1), c: cols[(Math.random() * cols.length) | 0], fired: false });
  }
}

// ---------- 결과 처리 ----------
function forceWalk(b) {
  const nb = b.slice(); let runs = 0;
  if (nb[0]) { if (nb[1]) { if (nb[2]) runs++; nb[2] = 1; } nb[1] = 1; }
  nb[0] = 1;
  return { nb, runs };
}
// 주자 진루: adv[i] = i루 주자가 진루할 베이스 수, batterTo = 타자 도착 루(0이면 아웃)
function moveRunners(b, adv, batterTo) {
  const nb = [0, 0, 0]; let runs = 0;
  for (let i = 2; i >= 0; i--) {
    if (!b[i]) continue;
    let to = i + adv[i];
    while (to < 3 && nb[to]) to++;
    if (to >= 3) runs++; else nb[to] = 1;
  }
  if (batterTo >= 4) runs++; else if (batterTo > 0) nb[batterTo - 1] = 1;
  return { nb, runs };
}

function endAB(res) {
  ab.result = res;
  ab.outs = res.outs; ab.bases = res.bases;
  ab.balls = 0; ab.strikes = 0;
  updateHUD();
  setState('done', res.wait || 1.8);
}

function resolvePitchNoContact() {
  const swung = !!swing;
  marks = { x: pitch.tx, y: pitch.ty, sw: swing ? { x: swing.wx, y: swing.wy } : null, t: 0 };
  if (swung || pitch.inZone) {
    ab.strikes++;
    if (ab.strikes >= 3) {
      sfx.groan();
      showMsg('삼진 아웃!', '#ff8a7a', swung ? '헛스윙 삼진' : '루킹 삼진');
      if (ab.mode === 'pitch') sfx.cheer(1.6, 0.3); else sfx.ooh();
      endAB({ kind: 'k', text: '삼진', ab: true, hit: false, rbi: 0, outs: ab.outs + 1, bases: ab.bases.slice() });
      return;
    }
    updateHUD();
    showMsg(swung ? (ab.tactic === 'bunt' ? '번트 실패' : '헛스윙!') : '스트라이크!', '#ffe08a');
  } else {
    ab.balls++;
    if (ab.balls >= 4) {
      const { nb, runs } = forceWalk(ab.bases);
      showMsg('볼넷', '#8ef0a8', runs ? `밀어내기 +${runs}점` : '1루 진루');
      if (runs) sfx.cheer(1.4, 0.2);
      endAB({ kind: 'bb', text: '볼넷', ab: false, hit: false, rbi: runs, outs: ab.outs, bases: nb });
      return;
    }
    updateHUD();
    showMsg('볼', '#8ef0a8');
  }
  setState('wait', 1.1);
}

function resolvePlay() {
  const o = play.outcome;
  const b = ab.bases, outs = ab.outs;
  const hitrun = ab.tactic === 'hitrun', bunt = !!play.info.bunt;
  if (o.kind === 'foul') {
    if (bunt && ab.strikes >= 2) {
      sfx.groan();
      showMsg('삼진 아웃!', '#ff8a7a', '스리번트 파울');
      endAB({ kind: 'k', text: '삼진', ab: true, hit: false, rbi: 0, outs: outs + 1, bases: b.slice() });
      return;
    }
    if (ab.strikes < 2) ab.strikes++;
    updateHUD();
    showMsg('파울', '#ffe08a');
    setState('wait', 0.6);
    return;
  }
  if (o.kind === 'hr') {
    const runners = b.reduce((a, c) => a + c, 0);
    const r = runners + 1;
    showMsg(runners === 3 ? '만루 홈런!!' : '홈런!', '#ffd54a', `비거리 ${play.dist}m · ${r}타점`);
    sfx.ding();
    endAB({ kind: 'hr', text: '홈런', ab: true, hit: true, bases: [0, 0, 0], rbi: r, outs, dist: play.dist, wait: 2.0 });
    return;
  }
  if (o.kind === 'hit') {
    const n = o.bases;
    const adv = [n, n, n];
    if (n === 1) { adv[1] = 2; if (hitrun) adv[0] = 2; }
    if (n === 2 && (hitrun || Math.random() < 0.5)) adv[0] = 3;
    const { nb, runs } = moveRunners(b, adv, n);
    showMsg(o.text, '#7fe0ff', runs ? `${runs}타점!` : '');
    if (runs) sfx.cheer(1.6, 0.25);
    endAB({ kind: 'hit', text: o.text.replace('!', ''), bases: nb, ab: true, hit: true, nb: n, rbi: runs, outs });
    return;
  }
  // 아웃
  sfx.groan();
  if (o.ground) {
    // 병살 / 진루타 / 희생번트
    if (b[0] && outs < 2 && o.quick && !hitrun && !bunt) {
      const no = outs + 2;
      let nb = [0, 0, 0], runs = 0;
      if (no < 3) { const m = moveRunners([0, b[1], b[2]], [1, 1, 1], 0); nb = m.nb; runs = m.runs; }
      showMsg('병살타…', '#ff8a7a', no >= 3 ? '이닝 종료' : '');
      endAB({ kind: 'out', text: '병살타', ab: true, hit: false, rbi: 0, outs: no, bases: nb, runs });
      return;
    }
    const no = outs + 1;
    let nb = b.slice(), runs = 0;
    const anyRunner = b.some(Boolean);
    if (no < 3 && anyRunner) { const m = moveRunners(b, [1, 1, 1], 0); nb = m.nb; runs = m.runs; }
    if (bunt && anyRunner && no < 3) {
      showMsg('희생번트 성공', '#7fe0ff', runs ? `+${runs}점` : '주자 진루');
      endAB({ kind: 'out', text: '희생번트', sac: true, ab: false, hit: false, rbi: runs, outs: no, bases: nb });
      return;
    }
    showMsg(anyRunner && no < 3 ? '진루타' : o.text, '#ff8a7a', runs ? `+${runs}점` : '');
    endAB({ kind: 'out', text: o.text, ab: true, hit: false, rbi: runs, outs: no, bases: nb });
    return;
  }
  if (o.fly && o.deep && b[2] && outs < 2) {
    const nb = [b[0], 0, b[1] ? 1 : 0];
    showMsg('희생플라이!', '#7fe0ff', '1타점');
    sfx.cheer(1.2, 0.2);
    endAB({ kind: 'out', text: '희생플라이', sac: true, ab: false, hit: false, rbi: 1, outs: outs + 1, bases: nb });
    return;
  }
  showMsg(o.text, '#ff8a7a', outs + 1 >= 3 ? '이닝 종료' : '');
  endAB({ kind: 'out', text: o.text, ab: true, hit: false, rbi: 0, outs: outs + 1, bases: b.slice() });
}

function setState(s, wait = 0) { state = s; stateT = 0; waitFor = wait; }

// ---------- 업데이트 ----------
function update(dt) {
  clock += dt;
  particles = particles.filter(p => (p.t += dt) < p.life);
  particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.99; });
  impacts = impacts.filter(m => (m.t += dt) < 0.75);
  flash = Math.max(0, flash - dt * 3);
  fireworks = fireworks.filter(fw => {
    fw.delay -= dt;
    if (fw.delay <= 0 && !fw.fired) {
      fw.fired = true; sfx.firework();
      for (let i = 0; i < 46; i++) {
        const a = i / 46 * 6.283, v = rand(110, 170);
        particles.push({ x: fw.x, y: fw.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.9, 1.4), t: 0, c: fw.c, g: 70 });
      }
    }
    return !fw.fired;
  });
  if (window.Music) Music.duck(state === 'windup' || state === 'pitch' || state === 'gauge');
  if (hitStop > 0) { hitStop -= dt; return; } // 히트스톱: 세계 정지
  stateT += dt;
  cheer = Math.max(0, cheer - dt * 0.3);
  shake = Math.max(0, shake - dt * 30);
  if (marks) { marks.t += dt; if (marks.t > 1.6) marks = null; }
  if (swing) swing.t += dt;

  // 카메라: 타구를 따라감
  let tgt = CAM_HOME;
  if (state === 'hit' && play) {
    const b = playBallPos();
    const hd = Math.max(1, Math.hypot(b.x, b.z - cam.z));
    const zoom = 1 + clamp((hd - 25) / 90, 0, 1) * 1.1;
    tgt = {
      yaw: clamp(Math.atan2(b.x, b.z - cam.z), -1.25, 1.25),
      pitch: clamp(Math.atan2(b.y - cam.y, hd) + Math.atan(110 / (F * zoom)), 0, 1.2),
      zoom,
    };
  }
  const k = Math.min(1, dt * (state === 'hit' ? 6 : 4));
  cam.yaw = lerp(cam.yaw, tgt.yaw, k);
  cam.pitch = lerp(cam.pitch, tgt.pitch, k);
  cam.zoom = lerp(cam.zoom, tgt.zoom, k);

  switch (state) {
    case 'wait':
      if (stateT >= waitFor) { if (ab.mode === 'pitch') beginAim(); else nextPitch(); }
      break;
    case 'aim':
      break;
    case 'gauge':
      gaugeT += dt;
      break;
    case 'windup': {
      const dur = 1.05;
      pitcherPhase = Math.min(1, stateT / dur);
      if (stateT >= dur) {
        sfx.release();
        if (ab.P.showType && ab.mode !== 'pitch') showPitchInfo(`${pitch.name}!`);
        setState('pitch');
      }
      break;
    }
    case 'pitch':
      pitch.t += dt;
      pitcherPhase = 1 + pitch.t;
      if (ab.mode === 'pitch' && !pitch.aiDone && pitch.t >= pitch.T - 0.004) { aiBat(); if (state !== 'pitch') break; }
      if (pitchPos(pitch, pitch.t).z <= CATCH_Z) {
        sfx.mitt();
        showPitchInfo(`${pitch.name} ${pitch.kmh}km/h`);
        resolvePitchNoContact();
      }
      break;
    case 'hit': {
      pitcherPhase = 2;
      let ts = 1.35;
      if (play.slow > 0) { play.slow -= dt; ts = 0.35; }
      play.t += dt * ts;
      updateFielders(dt * ts);
      const ti = Math.floor(play.t / SIM_DT);
      if (play.outcome.kind === 'hr' && ti >= play.hr && !play.cheered) {
        play.cheered = true;
        if (ab.mode !== 'pitch') { cheer = 1; sfx.cheer(3.4, 0.45); buzz([40, 60, 40]); launchFireworks(); play.slow = 0.5; }
        else sfx.groan();
      }
      if (play.catchI >= 0 && ti >= play.catchI && !play.caught) { play.caught = true; sfx.catchBall(); }
      if (play.t >= play.end) resolvePlay();
      break;
    }
    case 'done':
      if (stateT >= waitFor) {
        const cb = ab.onEnd, res = ab.result;
        hidePitchUI();
        setState('idle');
        swing = null; play = null; marks = null;
        resetFielders();
        if (cb) cb(res);
      }
      break;
  }
}

function nextPitch() {
  swing = null; play = null;
  resetFielders();
  pitch = choosePitch();
  pitcherPhase = 0;
  setState('windup');
}

function updateFielders(dt) {
  if (play.fielder < 0) {
    const b = playBallPos();
    for (let i = 5; i < 8; i++) chase(i, b.x, b.z, play.t, dt);
    return;
  }
  const f = FIELDERS[play.fielder];
  const fp = fpos[play.fielder];
  const t = play.t;
  if (t > f.react && t < play.catchI * SIM_DT) {
    const dx = play.catchPt.x - fp.x, dz = play.catchPt.z - fp.z, d = Math.hypot(dx, dz);
    const target = Math.max(0, d - f.reach * 0.6);
    const step = Math.min(target, f.speed * dt);
    if (d > 0.01 && target > 0) { fp.x += dx / d * step; fp.z += dz / d * step; fp.run = 1; }
    else fp.run = 0;
  } else fp.run = 0;
}
function chase(i, x, z, t, dt) {
  const f = FIELDERS[i], fp = fpos[i];
  if (t < f.react) return;
  const dx = x - fp.x, dz = z - fp.z, d = Math.hypot(dx, dz);
  if (d < 2 || Math.hypot(fp.x, fp.z) > fenceR(Math.atan2(fp.x, fp.z)) - 2) { fp.run = 0; return; }
  const step = f.speed * 0.6 * dt;
  fp.x += dx / d * step; fp.z += dz / d * step; fp.run = 1;
}

// 타구 진행 중 공 위치 (잡힌 후에는 수비수 손 / 송구)
function playBallPos() {
  const p = play;
  const i = Math.min(p.pts.length - 1, Math.floor(p.t / SIM_DT));
  if (p.catchI >= 0 && i >= p.catchI) {
    const fp = fpos[p.fielder];
    if (p.throwTo && p.t >= p.throwAt) {
      const [tx, tz] = p.throwTo;
      const d = Math.hypot(tx - fp.x, tz - fp.z);
      const u = clamp((p.t - p.throwAt) / (d / 30), 0, 1);
      return { x: lerp(fp.x, tx, u), y: 1.6 + Math.sin(u * Math.PI) * d * 0.05 - u * 0.4, z: lerp(fp.z, tz, u), held: u >= 1 };
    }
    return { x: fp.x + 0.3, y: 1.2, z: fp.z, held: true };
  }
  const a = p.pts[i], b = p.pts[Math.min(p.pts.length - 1, i + 1)];
  const f = p.t / SIM_DT - i;
  return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), z: lerp(a.z, b.z, f) };
}
// ---------- 그리기 ----------
function drawBall(x, y, z, trail) {
  const sh = proj(x, 0, z);
  const p = proj(x, y, z);
  if (!p) return;
  if (sh) {
    const r = Math.max(1.2, BALL_R * sh[2] * 1.3);
    ctx.fillStyle = `rgba(0,0,0,${clamp(0.35 - y * 0.01, 0.08, 0.35)})`;
    ctx.beginPath(); ctx.ellipse(sh[0], sh[1], r, r * 0.4, 0, 0, 7); ctx.fill();
  }
  if (trail && trail.length > 1) {
    ctx.lineCap = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = proj(trail[i - 1].x, trail[i - 1].y, trail[i - 1].z), b = proj(trail[i].x, trail[i].y, trail[i].z);
      if (!a || !b) continue;
      ctx.strokeStyle = `rgba(255,255,255,${i / trail.length * 0.5})`;
      ctx.lineWidth = Math.max(1, BALL_R * b[2] * 1.4 * i / trail.length);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }
  const r = Math.max(2.2, BALL_R * p[2]);
  ctx.fillStyle = '#fbfbf6';
  ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
  if (r > 5) {
    ctx.strokeStyle = '#d33'; ctx.lineWidth = r * 0.12;
    const rot = clock * 30;
    ctx.beginPath(); ctx.arc(p[0] - r * 0.9, p[1], r * 0.75, -0.9 + rot * 0, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(p[0] + r * 0.9, p[1], r * 0.75, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.arc(p[0] + r * 0.25, p[1] + r * 0.25, r * 0.8, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.stroke();
  }
}

function drawZone() {
  const tl = proj(ZONE.x0, ZONE.y1, 0), br = proj(ZONE.x1, ZONE.y0, 0);
  if (!tl || !br) return;
  const w = br[0] - tl[0], h = br[1] - tl[1];
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 3; i++) {
    ctx.moveTo(tl[0] + w * i / 3, tl[1]); ctx.lineTo(tl[0] + w * i / 3, br[1]);
    ctx.moveTo(tl[0], tl[1] + h * i / 3); ctx.lineTo(br[0], tl[1] + h * i / 3);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
  ctx.strokeRect(tl[0], tl[1], w, h);
}

function drawMarks() {
  if (!marks) return;
  const a = clamp(1.6 - marks.t, 0, 1);
  const p = proj(marks.x, marks.y, 0);
  if (p) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * a})`;
    ctx.beginPath(); ctx.arc(p[0], p[1], BALL_R * p[2], 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,80,80,${a})`; ctx.lineWidth = 2; ctx.stroke();
  }
  if (marks.sw) {
    const q = proj(marks.sw.x, marks.sw.y, 0);
    if (q) {
      ctx.strokeStyle = `rgba(255,213,74,${a})`; ctx.lineWidth = 2.5;
      const r = 9;
      ctx.beginPath(); ctx.moveTo(q[0] - r, q[1] - r); ctx.lineTo(q[0] + r, q[1] + r);
      ctx.moveTo(q[0] + r, q[1] - r); ctx.lineTo(q[0] - r, q[1] + r); ctx.stroke();
    }
  }
}

// 타자 (화면 왼쪽, 포수 시점) + 배트
function drawBatter() {
  // 고정 화면 좌표로 그리되 카메라가 돌아가면 함께 밀려나가게
  const shiftX = -cam.yaw * 520, shiftY = cam.pitch * 520;
  // 카메라가 타구를 따라가면 타자는 화면 밖으로 사라짐
  const vis = clamp(1 - (Math.abs(cam.yaw) + Math.abs(cam.pitch)) * 4, 0, 1);
  if (vis <= 0) return;
  ctx.save();
  ctx.translate(shiftX, shiftY);
  const baseAlpha = vis;
  // 몸 (반투명 실루엣)
  ctx.globalAlpha = 0.92 * baseAlpha;
  ctx.fillStyle = batCol().body;
  ctx.beginPath();
  ctx.moveTo(-40, 330); ctx.quadraticCurveTo(30, 320, 45, 420);
  ctx.lineTo(55, 560); ctx.quadraticCurveTo(40, 620, 20, 760); ctx.lineTo(-60, 760); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e8ee';
  ctx.beginPath(); ctx.moveTo(-30, 575); ctx.lineTo(50, 570); ctx.lineTo(35, 760); ctx.lineTo(-40, 760); ctx.closePath(); ctx.fill();
  // 헬멧
  ctx.fillStyle = batCol().helmet;
  ctx.beginPath(); ctx.arc(-8, 278, 46, 0, 7); ctx.fill();
  ctx.fillStyle = batCol().hi;
  ctx.beginPath(); ctx.arc(-14, 270, 40, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
  ctx.fillStyle = batCol().dark;
  ctx.beginPath(); ctx.ellipse(28, 300, 22, 9, -0.2, 0, 7); ctx.fill();
  ctx.globalAlpha = baseAlpha;

  // 배트
  let hx, hy, ang, len = 300;
  const buntPose = ab && ab.tactic === 'bunt' && state !== 'idle';
  const restH = buntPose ? [70, 450] : [42, 400], restA = buntPose ? -12 * DEG : -78 * DEG;
  const restL = buntPose ? 250 : 300;
  if (!swing) { hx = restH[0]; hy = restH[1]; ang = restA; len = restL; }
  else if (swing.bunt) {
    const cH = [80, clamp(swing.sy + 20, 300, 640)];
    const cA = Math.atan2(swing.sy - cH[1], swing.sx - cH[0]);
    const cL = Math.max(180, Math.hypot(swing.sx - cH[0], swing.sy - cH[1]) * 1.2);
    const u = clamp(swing.t / 0.06, 0, 1);
    hx = lerp(restH[0], cH[0], u); hy = lerp(restH[1], cH[1], u); ang = lerp(restA, cA, u); len = lerp(restL, cL, u);
  } else {
    const t = swing.t;
    const cH = [70, clamp(swing.sy + 35, 300, 600)];
    const cA = Math.atan2(swing.sy - cH[1], swing.sx - cH[0]);
    const cL = Math.max(200, Math.hypot(swing.sx - cH[0], swing.sy - cH[1]) * 1.18);
    if (t < 0.05) {
      const u = t / 0.05;
      hx = lerp(restH[0], cH[0], u); hy = lerp(restH[1], cH[1], u); ang = lerp(restA, cA, u); len = lerp(300, cL, u);
    } else if (t < 0.3) {
      const u = (t - 0.05) / 0.25, e = 1 - (1 - u) * (1 - u);
      hx = lerp(cH[0], 210, e); hy = lerp(cH[1], 330, e); ang = lerp(cA, -115 * DEG, e); len = lerp(cL, 150, Math.sin(e * Math.PI / 2));
    } else if (t < 0.9) {
      hx = 210; hy = 330; ang = -115 * DEG; len = 150;
    } else {
      const u = Math.min(1, (t - 0.9) / 0.35);
      hx = lerp(210, restH[0], u); hy = lerp(330, restH[1], u); ang = lerp(-115 * DEG, restA, u); len = lerp(150, 300, u);
    }
    // 스윙 궤적
    if (t < 0.16) {
      const a = 1 - t / 0.16;
      ctx.fillStyle = `rgba(255,255,255,${0.22 * a})`;
      ctx.beginPath();
      ctx.moveTo(cH[0], cH[1]);
      ctx.arc(cH[0], cH[1], cL, restA, cA);
      ctx.closePath(); ctx.fill();
    }
  }
  const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const w0 = 6, w1 = 15;
  const grad = ctx.createLinearGradient(hx, hy, tx, ty);
  grad.addColorStop(0, '#5a3418'); grad.addColorStop(0.35, '#c58a4a'); grad.addColorStop(1, '#e2b072');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(hx + nx * w0, hy + ny * w0);
  ctx.lineTo(tx + nx * w1, ty + ny * w1);
  ctx.arc(tx, ty, w1, ang + Math.PI / 2, ang - Math.PI / 2, true);
  ctx.lineTo(hx - nx * w0, hy - ny * w0);
  ctx.closePath(); ctx.fill();
  // 장갑
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath(); ctx.arc(hx, hy, 15, 0, 7); ctx.fill();
  ctx.fillStyle = '#d7263d';
  ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * 22, hy + Math.sin(ang) * 22, 13, 0, 7); ctx.fill();
  ctx.restore();
}

function render() {
  const vw = canvas.width, vh = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b1530';
  ctx.fillRect(0, 0, vw, vh);
  const sx = shake ? rand(-shake, shake) : 0, sy = shake ? rand(-shake, shake) : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));

  drawField(clock);

  // 수비수 (먼 순서대로)
  const order = fpos.map((p, i) => i).filter(i => i !== 0).sort((a, b) => fpos[b].z - fpos[a].z);
  for (const i of order) drawPerson(fpos[i].x, fpos[i].z, { ...AWAY, run: fpos[i].run, t: clock });
  if (state === 'hit' && fpos[0].run) drawPerson(fpos[0].x, fpos[0].z, { ...AWAY, run: 1, t: clock, y0: 0.2 });
  else drawPitcher();

  // 공
  if (state !== 'hit') lastTrail = [];
  if (state === 'aim' || state === 'gauge') {
    drawZone();
    drawAim();
  }
  if (state === 'pitch') {
    drawZone();
    const b = pitchPos(pitch, pitch.t);
    drawBall(b.x, b.y, b.z);
  } else if (state === 'hit' && play) {
    const b = playBallPos();
    if (!b.held) { lastTrail.push(b); if (lastTrail.length > 12) lastTrail.shift(); } else lastTrail = [];
    drawBall(b.x, b.y, b.z, lastTrail);
  } else if (state === 'windup' || state === 'wait') {
    if (cam.pitch < 0.05 && Math.abs(cam.yaw) < 0.05) drawZone();
    drawMarks();
  }

  if (state !== 'idle' || showBatterIdle) drawBatter();
  drawImpacts();

  // 파티클 & 플래시
  for (const p of particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,240,${flash * 0.35})`;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
}


// ---------- 투수 모드 ----------
const PITCH_EMOJI = { FB: '🔥', TW: '↙️', CH: '🌀', CU: '🌈', SL: '➡️', FK: '⬇️' };
const pitchUI = document.createElement('div');
pitchUI.id = 'pitchUI';
pitchUI.className = 'hidden';
document.body.appendChild(pitchUI);
pitchUI.addEventListener('pointerdown', e => {
  e.stopPropagation();
  const b = e.target.closest('[data-p]');
  if (!b || !ab) return;
  ab.ptype = b.dataset.p;
  renderPitchUI();
});
function renderPitchUI() {
  const me = ab.me;
  pitchUI.innerHTML = `<div class="ptitle">${state === 'gauge' ? '⏱ 제구 게이지를 초록색에서 터치!' : '🎯 구종을 고르고, 던질 곳을 터치!'}</div>
    <div class="ptypes">${me.reps.map(t => `<button data-p="${t}" class="${t === ab.ptype ? 'on' : ''}">${PITCH_EMOJI[t] || ''} ${PITCH_DEF[t].name}</button>`).join('')}</div>`;
  pitchUI.classList.remove('hidden');
}
function hidePitchUI() { pitchUI.classList.add('hidden'); }
let aimPt = null, gaugeT = 0;
function beginAim() {
  swing = null; play = null;
  resetFielders();
  pitcherPhase = 0;
  setState('aim');
  renderPitchUI();
}
function pitchTap(sx, sy) {
  if (state === 'aim') {
    const s = F / (0 - CAM_HOME.z);
    aimPt = { x: clamp((sx - CX) / s, -0.7, 0.7), y: clamp(CAM_HOME.y - (sy - CY) / s, 0.05, 1.8), sx, sy };
    gaugeT = 0;
    setState('gauge');
    renderPitchUI();
  } else if (state === 'gauge') {
    throwPitch(gaugeValue());
  }
}
function gaugeSpeed() { return 2.4 + (1 - ab.me.control / 100) * 2.6; }
function gaugeValue() { return (Math.sin(gaugeT * gaugeSpeed() - Math.PI / 2) + 1) / 2; }
function sweetW() { return 0.1 + ab.me.control / 100 * 0.16; }
function throwPitch(m) {
  hidePitchUI();
  const me = ab.me, def = PITCH_DEF[ab.ptype];
  const off = Math.abs(m - 0.5);
  const acc = off < sweetW() / 2 ? 1 : clamp(1 - (off - sweetW() / 2) * 2.4, 0, 1);
  const errR = (1 - acc) * 0.3 * (1.25 - me.control / 100 * 0.7) + rand(0, 0.025);
  const ea = rand(0, Math.PI * 2);
  const tx = aimPt.x + Math.cos(ea) * errR, ty = aimPt.y + Math.sin(ea) * errR;
  const bm = 0.55 + me.breaking / 100 * 0.85;
  const kmh = Math.round(me.velo * def.k + (acc === 1 ? 2 : 0) + rand(-1.5, 1.5));
  const T = 18.0 / (kmh / 3.6) * 1.2;
  const inZone = tx > ZONE.x0 - BALL_R && tx < ZONE.x1 + BALL_R && ty > ZONE.y0 - BALL_R && ty < ZONE.y1 + BALL_R;
  pitch = { type: ab.ptype, name: def.name, kmh, T, tx, ty, bx: rand(def.bx[0], def.bx[1]) * bm, by: def.by * bm, t: 0, inZone, acc };
  if (acc === 1) showTiming('👌 나이스 피치!', '#b5f5a0');
  else if (acc < 0.4) showTiming('앗, 손에서 빠졌다…', '#ffb38a');
  marks = null;
  setState('windup');
}
// AI 타자 판단 (공이 홈에 도착하는 순간)
function aiBat() {
  pitch.aiDone = true;
  const bt = ab.batter, me = ab.me;
  const ex = Math.max(0, Math.abs(pitch.tx) - 0.215), ey = Math.max(0, ZONE.y0 - pitch.ty, pitch.ty - ZONE.y1);
  const outDist = Math.hypot(ex, ey);                                    // 존에서 벗어난 거리
  const cx = Math.abs(pitch.tx) / 0.215, cy = Math.abs(pitch.ty - 0.8) / 0.3;
  const edge = clamp(Math.max(cx, cy), 0, 1);                             // 존 안에서 가장자리일수록 1
  const breaking = pitch.type !== 'FB';
  const deceive = breaking ? 0.12 + me.breaking / 600 : 0;
  let swingP;
  if (pitch.inZone) swingP = 0.6 + ab.strikes * 0.12 - edge * 0.12;
  else swingP = clamp(0.32 + deceive + ab.strikes * 0.12 - outDist * 2.2 - bt.eye / 400, 0.02, 0.7);
  if (Math.random() > swingP) return; // 지켜봄 → 볼/스트라이크 판정은 그대로
  const p0 = proj(pitch.tx, pitch.ty, 0);
  swing = { sx: p0[0] + rand(-25, 25), sy: p0[1] + rand(-20, 20), wx: pitch.tx, wy: pitch.ty, t: 0, ai: true };
  sfx.whoosh();
  const velo = pitch.kmh;
  let contactP = 0.45 + bt.contact / 220 - (velo - 140) / 110 - (breaking ? me.breaking / 450 : 0) - edge * 0.15 - outDist * 1.6;
  if (pitch.acc === 1) contactP -= 0.05;
  if (Math.random() > clamp(contactP, 0.12, 0.92)) return; // 헛스윙
  // 맞힘
  let q = clamp(Math.pow(Math.random(), 0.9) * (0.55 + bt.power / 220) - edge * 0.2 - outDist * 1.5 - (velo - 145) / 140, 0, 1);
  const foul = Math.random() < 0.28 + edge * 0.25 + outDist;
  const ev = 18 + (22 + bt.power * 0.09) * q + rand(-2, 2);
  let launch = 12 + (pitch.ty - 0.8) * 55 + rand(-18, 24);
  if (pitch.type === 'FK' || pitch.type === 'CH') launch -= 8;
  let spray = rand(-38, 38);
  if (foul) spray = (Math.random() < 0.5 ? -1 : 1) * rand(48, 75);
  const pos = pitchPos(pitch, pitch.t);
  play = planPlay(pos, ev, clamp(launch, -20, 70) * DEG, spray * DEG, { q, perfect: false });
  sfx.crack(play.foul ? 0.4 : clamp(q + 0.2, 0.3, 1));
  hitStop = play.foul ? 0.02 : 0.05;
  shake = 2 + q * 4;
  setState('hit');
}
function drawAim() {
  // 조준점
  if (state === 'gauge' && aimPt) {
    const p = proj(aimPt.x, aimPt.y, 0);
    ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p[0], p[1], 16, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p[0] - 24, p[1]); ctx.lineTo(p[0] + 24, p[1]); ctx.moveTo(p[0], p[1] - 24); ctx.lineTo(p[0], p[1] + 24); ctx.stroke();
    // 게이지
    const gx = 60, gy = 600, gw = 280, gh = 22;
    ctx.fillStyle = 'rgba(8,14,32,.8)'; ctx.fillRect(gx - 4, gy - 4, gw + 8, gh + 8);
    const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    grad.addColorStop(0, '#e5484d'); grad.addColorStop(0.5, '#ffd54a'); grad.addColorStop(1, '#e5484d');
    ctx.fillStyle = grad; ctx.fillRect(gx, gy, gw, gh);
    const sw = sweetW() * gw;
    ctx.fillStyle = '#4ade80'; ctx.fillRect(gx + gw / 2 - sw / 2, gy, sw, gh);
    const m = gaugeValue();
    ctx.fillStyle = '#fff'; ctx.fillRect(gx + m * gw - 3, gy - 8, 6, gh + 16);
  }
}
function batCol() {
  if (ab && ab.mode === 'pitch') {
    const c = ab.batter.color || '#3b82f6';
    return { body: shadeHex(c, -0.45), helmet: shadeHex(c, -0.2), hi: c, dark: shadeHex(c, -0.6) };
  }
  return { body: '#7a1420', helmet: '#9c1b2a', hi: '#c0283a', dark: '#5c0f18' };
}
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 임팩트: 충격파 링 + 방사선 + 의성어
function drawImpacts() {
  for (const m of impacts) {
    const u = m.t / 0.75;
    const a = 1 - u;
    const R = (m.big ? 30 : 18) + u * (m.big ? 170 : 90);
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`;
    ctx.lineWidth = (m.big ? 7 : 4) * a + 1;
    ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, 7); ctx.stroke();
    if (m.t < 0.25) {
      const v = 1 - m.t / 0.25;
      ctx.strokeStyle = `rgba(255,236,150,${v})`;
      ctx.lineWidth = m.big ? 4 : 2.5;
      ctx.beginPath();
      const n = m.big ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const an = i / n * 6.283 + (i % 2) * 0.2;
        const r0 = R * 0.6, r1 = R * 0.6 + (m.big ? 90 : 45) * v;
        ctx.moveTo(m.x + Math.cos(an) * r0, m.y + Math.sin(an) * r0);
        ctx.lineTo(m.x + Math.cos(an) * r1, m.y + Math.sin(an) * r1);
      }
      ctx.stroke();
    }
    // 의성어
    const sc = m.t < 0.08 ? 0.6 + m.t / 0.08 * 0.6 : 1.2 - Math.min(0.2, m.t - 0.08);
    const size = (m.big ? 58 : 34 + m.power * 10) * sc;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.translate(clamp(m.x + 30, 100, W - 100), clamp(m.y - 60 - u * 30, 120, H));
    ctx.rotate(-0.12);
    ctx.font = `900 ${size}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.18;
    ctx.strokeStyle = m.big ? '#b3261e' : '#1b2a55';
    ctx.strokeText(m.word, 0, 0);
    ctx.fillStyle = m.big ? '#ffe14d' : '#ffffff';
    ctx.fillText(m.word, 0, 0);
    ctx.restore();
  }
}

// ---------- 루프 ----------
let showBatterIdle = false;
let last = performance.now();
let paused = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) { update(dt); render(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { last = performance.now(); });

// ---------- 공개 API ----------
window.Engine = {
  // opts: { batter:{meet,power,eye,speed,cond}, pitcher:{lv,velo,ctrl,mix,name},
  //         sit:{inningLabel,scoreLabel,scoreText,outs,bases}, tactic:'normal'|'bunt'|'hitrun', onEnd(res) }
  atBat(opts) {
    const sit = opts.sit || {};
    AWAY = AWAY_U;
    hidePitchUI();
    ab = {
      batter: opts.batter, pitcher: opts.pitcher || { lv: 0.5 }, sit,
      tactic: opts.tactic || 'normal', onEnd: opts.onEnd,
      P: batterParams(opts.batter), balls: 0, strikes: 0,
      outs: sit.outs || 0, bases: (sit.bases || [0, 0, 0]).slice(),
    };
    Object.assign(cam, CAM_HOME);
    hidePitchInfo();
    updateHUD();
    crowdSound(true);
    if ((ab.bases[1] || ab.bases[2]) && window.Music) setTimeout(() => Music.jingle('charge'), 400);
    setState('wait', opts.delay == null ? 0.9 : opts.delay);
  },
  // 투수 모드: 내가 던지고 AI 타자가 친다
  // opts: { pitcher:{velo,control,breaking,reps:[...]}, batter:{name,contact,power,eye,speed,color}, sit, onEnd }
  pitchAB(opts) {
    const sit = opts.sit || {};
    const bt = opts.batter;
    ab = {
      mode: 'pitch', me: opts.pitcher, batter: bt, pitcher: { lv: 0.5 }, sit, tactic: 'normal', onEnd: opts.onEnd,
      P: { run1B: 4.6 - 0.008 * (bt.speed || 50), hitR: 0.2, winE: 0.1, winL: 0.06 },
      balls: 0, strikes: 0, outs: sit.outs || 0, bases: (sit.bases || [0, 0, 0]).slice(),
      ptype: opts.pitcher.reps[0],
    };
    AWAY = HOME_U;
    crowdSound(true);
    Object.assign(cam, CAM_HOME);
    hidePitchInfo();
    updateHUD();
    setState('wait', opts.delay == null ? 0.6 : opts.delay);
  },
  setPaused(v) { paused = v; if (!v) last = performance.now(); },
  idle() { ab = null; AWAY = AWAY_U; hidePitchUI(); crowdSound(false); setState('idle'); swing = null; play = null; marks = null; resetFielders(); Object.assign(cam, CAM_HOME); hidePitchInfo(); },
  get state() { return state; },
  showMsg, showTiming, sfx, audio, buzz,
  setMuted(m) { muted = m; },
  sfxOut,
  get muted() { return muted; },
  setBatterVisible(v) { showBatterIdle = v; },
  // 테스트용
  _debug: { get pitch() { return pitch; }, get play() { return play; }, get ab() { return ab; }, trySwing, proj, DEG },
};
})();
