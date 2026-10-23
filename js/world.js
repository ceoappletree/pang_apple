// 오픈월드 도시 (2D 탑다운): 걷기 · 운전 · NPC · 장소 출입
(() => {
'use strict';

const G = 560, RW = 90, HR = RW / 2;         // 블록 간격, 도로 폭
const NX = 5, NY = 5;                           // 블록 수 (마지막 줄은 한강공원)
const MAXX = NX * G, MAXY = NY * G;
const RIVER_Y = MAXY + HR;                      // 이 아래는 강
const WORLD_H = RIVER_Y + 500;

const cv = document.getElementById('w');
const ctx = cv.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
const $act = document.getElementById('wact');
const $car = document.getElementById('wcar');
const $joy = document.getElementById('wjoy');
const $knob = $joy.querySelector('.knob');

let dpr = 1, vw = 0, vh = 0;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth; vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  mini.width = 220; mini.height = 220;
}
window.addEventListener('resize', resize);
resize();

// ---------- 시드 랜덤 ----------
let seed = 12345;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

// ---------- 지도 생성 ----------
const blockRect = (i, j) => ({ x: i * G + HR, y: j * G + HR, w: G - RW, h: G - RW });
const LOC_BLOCKS = {
  home: [0, 0], restaurant: [3, 0], studio: [4, 0],
  cafe: [1, 1], office: [2, 1], stadium: [3, 1],
  campus: [0, 2], mall: [2, 2], umpire: [4, 2],
  batting: [1, 3],
};
const buildings = [];   // 충돌 + 그리기
const trees = [];
const doors = {};       // locId → {x, y}
const props = [];       // 장식 (벤치 등)

function addB(b) { buildings.push(b); return b; }
function genBlock(i, j) {
  const r = blockRect(i, j);
  const loc = Object.keys(LOC_BLOCKS).find(k => LOC_BLOCKS[k][0] === i && LOC_BLOCKS[k][1] === j);
  const cx = r.x + r.w / 2;
  if (loc === 'stadium') {
    addB({ x: r.x + 30, y: r.y + 40, w: r.w - 60, h: r.h - 110, H: 60, type: 'stadium' });
    doors.stadium = { x: cx, y: r.y + r.h - 50 };
    return;
  }
  if (loc === 'campus') {
    r.lawn = true;
    addB({ x: r.x + 30, y: r.y + 30, w: 180, h: 110, H: 70, color: '#b5652e', roof: '#7a3a1f', type: 'brick', sign: '한국대' });
    addB({ x: r.x + 250, y: r.y + 40, w: 170, h: 90, H: 60, color: '#b5652e', roof: '#7a3a1f', type: 'brick' });
    addB({ x: r.x + 130, y: r.y + 220, w: 210, h: 110, H: 80, color: '#c47a3a', roof: '#8a4a25', type: 'brick', clock: true });
    for (let k = 0; k < 7; k++) trees.push({ x: r.x + 40 + k * 60, y: r.y + r.h - 60, r: 16 });
    doors.campus = { x: cx, y: r.y + r.h - 20 };
    return;
  }
  if (loc) {
    const spec = {
      home: { w: 260, h: 200, H: 170, color: '#2d3446', roof: '#1c2130', glass: true },
      restaurant: { w: 280, h: 170, H: 50, color: '#5a2a2a', roof: '#3a1717', awning: '#b3261e' },
      studio: { w: 340, h: 220, H: 70, color: '#3b3f52', roof: '#2a2d3c', type: 'studio' },
      cafe: { w: 320, h: 150, H: 45, color: '#8a5a3a', roof: '#5f3c26', awning: '#2f7a4a' },
      office: { w: 220, h: 220, H: 300, color: '#3a6ea8', roof: '#24486f', glass: true, logo: 'APPLE' },
      mall: { w: 360, h: 250, H: 110, color: '#d8d2c4', roof: '#a8a092', logo: '애플백화점' },
      umpire: { w: 280, h: 200, H: 90, color: '#6b7280', roof: '#474d5a' },
      batting: { w: 320, h: 230, H: 50, color: '#2f6d3a', roof: '#1f4a28', type: 'net' },
    }[loc];
    const b = addB({ x: cx - spec.w / 2, y: r.y + r.h - 70 - spec.h, ...spec, loc });
    doors[loc] = { x: cx, y: b.y + b.h + 18 };
    trees.push({ x: r.x + 26, y: r.y + r.h - 26, r: 15 }, { x: r.x + r.w - 26, y: r.y + r.h - 26, r: 15 });
    return;
  }
  // 일반 블록: 건물 2~4개 + 나무
  const pal = ['#8b93a7', '#a7856a', '#6f8aa0', '#9c8fb0', '#b49a72', '#7d9b8a', '#a87878', '#c2b8a3'];
  const n = 2 + Math.floor(srnd() * 3);
  const cols = n <= 2 ? 2 : 2, rows = n <= 2 ? 1 : 2;
  let k = 0;
  for (let a = 0; a < cols; a++) for (let c = 0; c < rows; c++) {
    if (k++ >= n) break;
    const cw = r.w / cols, ch = r.h / rows;
    const w = cw * (0.55 + srnd() * 0.25), h = ch * (0.45 + srnd() * 0.25);
    const x = r.x + a * cw + (cw - w) / 2, y = r.y + c * ch + (ch - h) / 2 + 10;
    const col = pal[Math.floor(srnd() * pal.length)];
    addB({ x, y, w, h, H: 40 + srnd() * 140, color: col, roof: shade(col, -0.25), glass: srnd() < 0.3 });
  }
  for (let t = 0; t < 4; t++) trees.push({ x: r.x + 20 + srnd() * (r.w - 40), y: r.y + r.h - 18 - srnd() * 20, r: 11 + srnd() * 6 });
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX; i++) genBlock(i, j);
// 한강공원 (마지막 줄 전체)
const PARK = { x: HR, y: (NY - 1) * G + HR, w: MAXX - RW, h: G - RW };
doors.park = { x: MAXX / 2, y: PARK.y + 40 };
for (let k = 0; k < 40; k++) {
  const x = PARK.x + 30 + srnd() * (PARK.w - 60), y = PARK.y + 90 + srnd() * (PARK.h - 120);
  if (Math.abs(y - (PARK.y + PARK.h / 2)) < 30) continue;
  trees.push({ x, y, r: 12 + srnd() * 10 });
}
for (let k = 0; k < 8; k++) props.push({ type: 'bench', x: PARK.x + 120 + k * 300, y: PARK.y + PARK.h / 2 - 34 });

// 황금 야구공 (수집 요소)
const BALLS = [
  [G * 0.5, G * 0.5], [G * 1.5, G * 2.85], [G * 4.5, G * 0.18], [G * 2.5, G * 3.5], [G * 0.2, G * 3.5],
  [G * 4.82, G * 3.5], [G * 1.2, PARK.y + 80], [G * 3.6, PARK.y + PARK.h - 40], [G * 2.5, G * 1.5 + 230], [G * 3.5, G * 2.5],
  [G * 4.6, G * 1.6], [G * 1.6, G * 0.85],
].map(([x, y], i) => ({ i, x, y }));

// ---------- 도로 그래프 (NPC 차량) ----------
const nodeX = k => k * G, nodeY = l => l * G;
function neighbors(k, l) {
  const r = [];
  if (k > 0) r.push([k - 1, l]); if (k < NX) r.push([k + 1, l]);
  if (l > 0) r.push([k, l - 1]); if (l < NY) r.push([k, l + 1]);
  return r;
}

// ---------- 엔티티 ----------
const P = { x: doors.home.x, y: doors.home.y + 30, dir: 0, vx: 0, vy: 0, inCar: false, walkT: 0 };
const CAR = { x: doors.home.x + 70, y: doors.home.y + 36, ang: 0, v: 0, color: '#ffcc00' };
const skids = [];
let npcCars = [], peds = [];
const CAR_COLS = ['#e5484d', '#3b82f6', '#f4f4f5', '#22252e', '#14b8a6', '#a855f7', '#f97316', '#9ca3af'];
function spawnNPCs() {
  npcCars = [];
  for (let i = 0; i < 14; i++) {
    const k = Math.floor(srnd() * (NX + 1)), l = Math.floor(srnd() * (NY + 1));
    const nb = neighbors(k, l); const to = nb[Math.floor(srnd() * nb.length)];
    npcCars.push({ from: [k, l], to, t: srnd(), speed: 110 + srnd() * 70, color: CAR_COLS[i % CAR_COLS.length], wait: 0, x: 0, y: 0, ang: 0 });
  }
  peds = [];
  const SKIN = ['#f1c7a5', '#e0ac85', '#c98e66'], SHIRT = ['#e5484d', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#f4f4f5', '#111827', '#ec4899'];
  for (let i = 0; i < 46; i++) {
    const bi = Math.floor(srnd() * NX), bj = Math.floor(srnd() * (NY - 1));
    peds.push({ bi, bj, p: srnd(), sp: (srnd() < 0.5 ? -1 : 1) * (22 + srnd() * 18), skin: SKIN[i % 3], shirt: SHIRT[i % SHIRT.length], event: false, dodge: 0, dx: 0, dy: 0, bubble: 0 });
  }
}
spawnNPCs();
function pedPos(pd) {
  const r = blockRect(pd.bi, pd.bj);
  const x0 = r.x + 7, y0 = r.y + 7, w = r.w - 14, h = r.h - 14;
  const per = 2 * (w + h);
  let d = ((pd.p % 1) + 1) % 1 * per;
  let x, y;
  if (d < w) { x = x0 + d; y = y0; }
  else if ((d -= w) < h) { x = x0 + w; y = y0 + d; }
  else if ((d -= h) < w) { x = x0 + w - d; y = y0 + h; }
  else { d -= w; x = x0; y = y0 + h - d; }
  return { x: x + pd.dx, y: y + pd.dy, per };
}

// ---------- 충돌 ----------
function solidAt(x, y, rad) {
  if (x < -HR + rad || x > MAXX + HR - rad || y < -HR + rad || y > RIVER_Y - rad) return true;
  for (const b of buildings) {
    if (x > b.x - rad && x < b.x + b.w + rad && y > b.y - rad && y < b.y + b.h + rad) return true;
  }
  return false;
}
function moveWithCollision(o, dx, dy, rad) {
  let hit = false;
  if (!solidAt(o.x + dx, o.y, rad)) o.x += dx; else hit = true;
  if (!solidAt(o.x, o.y + dy, rad)) o.y += dy; else hit = true;
  return hit;
}

// ---------- 입력 ----------
const keys = {};
const joy = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
window.addEventListener('keydown', e => {
  if (!running) return;
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doAction(); }
  if (e.key === 'f' || e.key === 'F') toggleCar();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
cv.addEventListener('pointerdown', e => {
  if (joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.sx = e.clientX; joy.sy = e.clientY; joy.x = 0; joy.y = 0;
  $joy.style.left = (e.clientX - 55) + 'px'; $joy.style.top = (e.clientY - 55) + 'px';
  $joy.classList.add('on'); $knob.style.transform = 'translate(0,0)';
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
});
cv.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.sx, dy = e.clientY - joy.sy;
  const d = Math.hypot(dx, dy), R = 50;
  if (d > R) { dx = dx / d * R; dy = dy / d * R; }
  joy.x = dx / R; joy.y = dy / R;
  $knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const endJoy = e => { if (e.pointerId !== joy.id) return; joy.active = false; joy.x = joy.y = 0; $joy.classList.remove('on'); };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);
$act.addEventListener('click', e => { e.stopPropagation(); doAction(); });
$car.addEventListener('click', e => { e.stopPropagation(); toggleCar(); });

function inputVec() {
  let x = joy.x, y = joy.y;
  if (keys.arrowleft || keys.a) x -= 1;
  if (keys.arrowright || keys.d) x += 1;
  if (keys.arrowup || keys.w) y -= 1;
  if (keys.arrowdown || keys.s) y += 1;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y, m: Math.min(1, m) };
}

// ---------- 상호작용 ----------
let hooks = {};
let running = false;
let slot = 0;
let target = null;
let near = null;          // 현재 가능한 행동
let collected = [];
let lastT = 0;
let time = 0;

function nearestAction() {
  const px = P.inCar ? CAR.x : P.x, py = P.inCar ? CAR.y : P.y;
  for (const [id, d] of Object.entries(doors)) {
    if (dist(px, py, d.x, d.y) < (P.inCar ? 70 : 55)) return { type: 'door', id, label: `🚪 ${Story.LOCS[id].name}` };
  }
  if (!P.inCar) {
    for (const pd of peds) {
      if (!pd.event) continue;
      const q = pedPos(pd);
      if (dist(P.x, P.y, q.x, q.y) < 40) return { type: 'npc', ped: pd, label: '💬 말 걸기' };
    }
    if (dist(P.x, P.y, CAR.x, CAR.y) < 50) return { type: 'car', label: '🏎 슈퍼카 타기' };
  }
  return null;
}
function doAction() {
  if (!running) return;
  const a = nearestAction();
  if (!a) return;
  if (a.type === 'car') return toggleCar();
  if (a.type === 'door') {
    if (P.inCar) toggleCar(true);
    stopMotion();
    hooks.onEnter && hooks.onEnter(a.id);
  } else if (a.type === 'npc') {
    a.ped.event = false;
    stopMotion();
    hooks.onNpc && hooks.onNpc();
  }
}
function stopMotion() { CAR.v = 0; joy.active = false; joy.x = joy.y = 0; $joy.classList.remove('on'); for (const k in keys) keys[k] = false; }
function toggleCar(force) {
  if (P.inCar) {
    // 내리기: 차 옆 빈 곳
    P.inCar = false;
    const ox = Math.cos(CAR.ang + Math.PI / 2) * 34, oy = Math.sin(CAR.ang + Math.PI / 2) * 34;
    P.x = CAR.x + ox; P.y = CAR.y + oy;
    if (solidAt(P.x, P.y, 8)) { P.x = CAR.x - ox; P.y = CAR.y - oy; }
    if (solidAt(P.x, P.y, 8)) { P.x = CAR.x; P.y = CAR.y; }
    CAR.v = 0;
    if (!force) Engine.sfx.catchBall();
  } else if (dist(P.x, P.y, CAR.x, CAR.y) < 60) {
    P.inCar = true;
    Engine.sfx.firework && engineSound();
  }
}
function engineSound() { try { const a = Engine.audio(); if (!a || Engine.muted) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60, a.currentTime); o.frequency.exponentialRampToValueAtTime(180, a.currentTime + 0.4); o.frequency.exponentialRampToValueAtTime(90, a.currentTime + 0.9); g.gain.setValueAtTime(0.12, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 1); } catch (e) {} }
function honk() { try { const a = Engine.audio(); if (!a || Engine.muted) return; for (const f of [392, 494]) { const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.35); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.4); } } catch (e) {} }

// ---------- 업데이트 ----------
let honkCd = 0;
function update(dt) {
  time += dt;
  honkCd -= dt;
  const inp = inputVec();
  if (!P.inCar) {
    const sp = 175;
    const dx = inp.x * sp * dt, dy = inp.y * sp * dt;
    if (inp.m > 0.1) { P.dir = Math.atan2(inp.y, inp.x); P.walkT += dt * 10 * inp.m; }
    moveWithCollision(P, dx, dy, 9);
  } else {
    // 아케이드 운전: 조이스틱 방향으로 회전 + 가속
    const maxV = 560;
    if (inp.m > 0.15) {
      const tgt = Math.atan2(inp.y, inp.x);
      let da = tgt - CAR.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const turn = 3.2 * dt * clamp(Math.abs(CAR.v) / 160, 0.35, 1);
      CAR.ang += clamp(da, -turn, turn);
      const facing = Math.abs(da) < 1.9;
      CAR.v += (facing ? 1 : -1) * 520 * inp.m * dt;
      if (Math.abs(da) > 0.6 && Math.abs(CAR.v) > 280) skids.push({ x: CAR.x, y: CAR.y, ang: CAR.ang, t: 0 });
    } else {
      CAR.v *= Math.pow(0.25, dt);
    }
    CAR.v = clamp(CAR.v, -200, maxV);
    const dx = Math.cos(CAR.ang) * CAR.v * dt, dy = Math.sin(CAR.ang) * CAR.v * dt;
    if (moveWithCollision(CAR, dx, dy, 14)) { if (Math.abs(CAR.v) > 200) { Engine.sfx.mitt(); hooks.onBump && hooks.onBump(); } CAR.v *= -0.3; }
    P.x = CAR.x; P.y = CAR.y;
  }
  for (const s of skids) s.t += dt;
  while (skids.length && skids[0].t > 4) skids.shift();
  if (skids.length > 300) skids.splice(0, skids.length - 300);

  // NPC 차량
  for (const c of npcCars) {
    const ax = nodeX(c.from[0]), ay = nodeY(c.from[1]), bx = nodeX(c.to[0]), by = nodeY(c.to[1]);
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const ox = -uy * 22, oy = ux * 22;             // 우측 차선
    c.x = ax + (bx - ax) * c.t + ox; c.y = ay + (by - ay) * c.t + oy; c.ang = Math.atan2(uy, ux);
    if (c.wait > 0) { c.wait -= dt; continue; }
    // 앞에 플레이어(보행자/차)가 있으면 정지
    const fx = c.x + ux * 40, fy = c.y + uy * 40;
    const pxx = P.inCar ? CAR.x : P.x, pyy = P.inCar ? CAR.y : P.y;
    if (dist(fx, fy, pxx, pyy) < (P.inCar ? 36 : 28)) {
      if (honkCd <= 0 && !P.inCar) { honk(); honkCd = 3; }
      continue;
    }
    c.t += c.speed * dt / len;
    if (c.t >= 1) {
      const nb = neighbors(c.to[0], c.to[1]).filter(n => !(n[0] === c.from[0] && n[1] === c.from[1]));
      c.from = c.to; c.to = nb[Math.floor(Math.random() * nb.length)] || c.from; c.t = 0;
    }
  }
  // 플레이어 차 ↔ NPC 차 충돌
  if (P.inCar) {
    for (const c of npcCars) {
      if (dist(CAR.x, CAR.y, c.x, c.y) < 34) {
        const nx = (CAR.x - c.x), ny = (CAR.y - c.y), d = Math.hypot(nx, ny) || 1;
        CAR.x += nx / d * 6; CAR.y += ny / d * 6;
        if (Math.abs(CAR.v) > 120) { Engine.sfx.mitt(); if (honkCd <= 0) { honk(); honkCd = 1.5; } hooks.onBump && hooks.onBump(); }
        CAR.v *= -0.35; c.wait = 1.2;
      }
    }
  }
  // 보행자
  for (const pd of peds) {
    const q = pedPos(pd);
    pd.p += pd.sp * dt / q.per;
    pd.dx *= Math.pow(0.3, dt); pd.dy *= Math.pow(0.3, dt);
    pd.bubble = Math.max(0, pd.bubble - dt);
    if (P.inCar && Math.abs(CAR.v) > 60) {
      const d = dist(CAR.x, CAR.y, q.x, q.y);
      if (d < 46) {  // 펄쩍 피함
        const nx = (q.x - CAR.x) / (d || 1), ny = (q.y - CAR.y) / (d || 1);
        pd.dx += nx * 40; pd.dy += ny * 40; pd.bubble = 1.2;
      }
    }
  }
  // 이벤트 NPC 유지 (항상 3명)
  if (peds.filter(p => p.event).length < 3) peds[Math.floor(Math.random() * peds.length)].event = true;
  // 황금 야구공
  for (const b of BALLS) {
    if (collected.includes(b.i)) continue;
    if (dist(P.x, P.y, b.x, b.y) < 28) {
      collected.push(b.i);
      Engine.sfx.ding();
      hooks.onBall && hooks.onBall(collected.length, BALLS.length);
    }
  }
  // 행동 버튼
  near = nearestAction();
  if (near && near.type !== 'car') { $act.textContent = near.label; $act.classList.remove('hidden'); }
  else if (near && near.type === 'car') { $act.textContent = near.label; $act.classList.remove('hidden'); }
  else $act.classList.add('hidden');
  $car.classList.toggle('hidden', !P.inCar);
}

// ---------- 그리기 ----------
let cam = { x: P.x, y: P.y, z: 1 };
function render() {
  const baseZ = Math.min(vw, vh * 0.75) / 430;
  const tz = P.inCar ? baseZ * (0.82 - Math.min(0.22, Math.abs(CAR.v) / 2400)) : baseZ;
  cam.z = lerp(cam.z, tz, 0.08);
  const leadX = P.inCar ? Math.cos(CAR.ang) * CAR.v * 0.25 : 0, leadY = P.inCar ? Math.sin(CAR.ang) * CAR.v * 0.25 : 0;
  cam.x = lerp(cam.x, P.x + leadX, 0.12); cam.y = lerp(cam.y, P.y + leadY, 0.12);
  const z = cam.z;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#4c8a3c';
  ctx.fillRect(0, 0, vw, vh);
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (vw / 2 - cam.x * z), dpr * (vh / 2 - cam.y * z));
  const vx0 = cam.x - vw / 2 / z - 100, vx1 = cam.x + vw / 2 / z + 100;
  const vy0 = cam.y - vh / 2 / z - 200, vy1 = cam.y + vh / 2 / z + 100;
  const vis = (x, y, w, h) => x + w > vx0 && x < vx1 && y + h > vy0 && y < vy1;

  // 강
  if (vy1 > RIVER_Y) {
    ctx.fillStyle = '#2d6ea6'; ctx.fillRect(-500, RIVER_Y, MAXX + 1000, 600);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
    for (let k = 0; k < 30; k++) {
      const wx = (k * 173 + time * 25) % (MAXX + 400) - 200, wy = RIVER_Y + 40 + (k * 61) % 400;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 15, wy - 5, wx + 30, wy); ctx.stroke();
    }
  }
  // 도로
  ctx.fillStyle = '#3a3f4b';
  for (let k = 0; k <= NX; k++) ctx.fillRect(k * G - HR, -HR, RW, MAXY + RW);
  for (let l = 0; l <= NY; l++) ctx.fillRect(-HR, l * G - HR, MAXX + RW, RW);
  // 중앙선
  ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 2.5; ctx.setLineDash([18, 16]);
  ctx.beginPath();
  for (let k = 0; k <= NX; k++) { ctx.moveTo(k * G, -HR); ctx.lineTo(k * G, MAXY + HR); }
  for (let l = 0; l <= NY; l++) { ctx.moveTo(-HR, l * G); ctx.lineTo(MAXX + HR, l * G); }
  ctx.stroke(); ctx.setLineDash([]);
  // 횡단보도
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let k = 0; k <= NX; k++) for (let l = 0; l <= NY; l++) {
    const x = k * G, y = l * G;
    if (!vis(x - 60, y - 60, 120, 120)) continue;
    ctx.fillStyle = '#3a3f4b'; ctx.fillRect(x - HR, y - HR, RW, RW);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let s = -36; s <= 30; s += 12) { ctx.fillRect(x + s, y - HR - 14, 7, 12); ctx.fillRect(x + s, y + HR + 2, 7, 12); ctx.fillRect(x - HR - 14, y + s, 12, 7); ctx.fillRect(x + HR + 2, y + s, 12, 7); }
  }
  // 블록 바닥 (인도 + 광장/잔디)
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX; i++) {
    const r = blockRect(i, j);
    if (!vis(r.x, r.y, r.w, r.h)) continue;
    ctx.fillStyle = '#a9aeb8'; ctx.fillRect(r.x, r.y, r.w, r.h);
    const loc = Object.keys(LOC_BLOCKS).find(k => LOC_BLOCKS[k][0] === i && LOC_BLOCKS[k][1] === j);
    ctx.fillStyle = loc === 'campus' || loc === 'stadium' ? '#5a9a48' : '#cfc8b8';
    ctx.fillRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
    if (!loc) { ctx.fillStyle = '#5a9a48'; ctx.fillRect(r.x + 14, r.y + r.h - 50, r.w - 28, 36); }
  }
  // 공원
  if (vis(PARK.x, PARK.y, PARK.w, PARK.h)) {
    ctx.fillStyle = '#a9aeb8'; ctx.fillRect(PARK.x, PARK.y, PARK.w, PARK.h);
    ctx.fillStyle = '#5fa34c'; ctx.fillRect(PARK.x + 14, PARK.y + 14, PARK.w - 28, PARK.h - 14);
    ctx.fillStyle = '#d8c9a3'; ctx.fillRect(PARK.x + 14, PARK.y + PARK.h / 2 - 18, PARK.w - 28, 36);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(PARK.x + 14, PARK.y + PARK.h - 30, PARK.w - 28, 30);
  }
  // 스키드 마크
  ctx.fillStyle = 'rgba(20,20,20,.35)';
  for (const s of skids) {
    if (!vis(s.x - 20, s.y - 20, 40, 40)) continue;
    ctx.globalAlpha = 1 - s.t / 4;
    const c = Math.cos(s.ang), sn = Math.sin(s.ang);
    for (const side of [-9, 9]) ctx.fillRect(s.x - sn * side - 2, s.y + c * side - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  // 황금 야구공
  for (const b of BALLS) {
    if (collected.includes(b.i) || !vis(b.x - 20, b.y - 20, 40, 40)) continue;
    const bob = Math.sin(time * 4 + b.i) * 3;
    ctx.fillStyle = 'rgba(255,213,74,.25)'; ctx.beginPath(); ctx.arc(b.x, b.y, 18 + bob, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(b.x, b.y - 4 + bob, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x - 6, b.y - 4 + bob, 6, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x + 6, b.y - 4 + bob, 6, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
  }

  // y 정렬 그리기 (건물, 나무, 사람, 차)
  const items = [];
  for (const b of buildings) if (vis(b.x, b.y - b.H * 0.5, b.w, b.h + b.H)) items.push({ y: b.y + b.h, d: () => drawBuilding(b) });
  for (const t of trees) if (vis(t.x - 30, t.y - 50, 60, 60)) items.push({ y: t.y, d: () => drawTree(t) });
  for (const p of props) if (vis(p.x - 30, p.y - 20, 60, 30)) items.push({ y: p.y, d: () => drawBench(p) });
  for (const c of npcCars) if (vis(c.x - 40, c.y - 40, 80, 80)) items.push({ y: c.y, d: () => drawCar(c.x, c.y, c.ang, c.color, false) });
  for (const pd of peds) { const q = pedPos(pd); if (vis(q.x - 20, q.y - 40, 40, 50)) items.push({ y: q.y, d: () => drawPed(q.x, q.y, pd) }); }
  items.push({ y: CAR.y, d: () => drawCar(CAR.x, CAR.y, CAR.ang, CAR.color, true) });
  if (!P.inCar) items.push({ y: P.y, d: drawPlayer });
  items.sort((a, b) => a.y - b.y).forEach(it => it.d());

  // 밤 조명
  if (slot === 2) {
    ctx.fillStyle = 'rgba(8,14,45,.55)';
    ctx.fillRect(vx0 - 200, vy0 - 200, vx1 - vx0 + 400, vy1 - vy0 + 400);
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k <= NX; k++) for (let l = 0; l <= NY; l++) {
      const x = k * G + HR + 6, y = l * G + HR + 6;
      if (!vis(x - 80, y - 80, 160, 160)) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 90);
      gr.addColorStop(0, 'rgba(255,200,120,.35)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 90, y - 90, 180, 180);
    }
    if (P.inCar) {
      const hx = CAR.x + Math.cos(CAR.ang) * 30, hy = CAR.y + Math.sin(CAR.ang) * 30;
      const gr = ctx.createRadialGradient(hx + Math.cos(CAR.ang) * 60, hy + Math.sin(CAR.ang) * 60, 0, hx + Math.cos(CAR.ang) * 60, hy + Math.sin(CAR.ang) * 60, 90);
      gr.addColorStop(0, 'rgba(255,250,210,.35)'); gr.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = gr; ctx.fillRect(hx - 100, hy - 100, 320, 320);
      ctx.fillRect(hx - 220, hy - 220, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 창문 불빛
    ctx.fillStyle = 'rgba(255,220,130,.85)';
    for (const b of buildings) {
      if (!vis(b.x, b.y - b.H * 0.5, b.w, b.h + b.H) || b.type === 'stadium') continue;
      const wallH = b.H * 0.5, top = b.y + b.h - wallH;
      for (let wy = top + 8; wy < b.y + b.h - 10; wy += 16) for (let wx = b.x + 10; wx < b.x + b.w - 12; wx += 20) {
        if (((wx * 7 + wy * 13) | 0) % 3 === 0) ctx.fillRect(wx, wy, 8, 7);
      }
    }
  } else if (slot === 0) {
    ctx.fillStyle = 'rgba(255,230,200,.08)';
    ctx.fillRect(vx0 - 200, vy0 - 200, vx1 - vx0 + 400, vy1 - vy0 + 400);
  }

  // 장소 간판 + 하트
  const hearts = hooks.hearts ? hooks.hearts() : {};
  for (const [id, d] of Object.entries(doors)) {
    if (!vis(d.x - 120, d.y - 160, 240, 200)) continue;
    const L = Story.LOCS[id];
    const label = `${L.emoji} ${L.name}`;
    ctx.font = '700 15px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    const tw = ctx.measureText(label).width + 18;
    const ly = d.y - 30;
    ctx.fillStyle = id === target ? 'rgba(255,213,74,.95)' : 'rgba(10,16,36,.85)';
    roundRect(d.x - tw / 2, ly - 14, tw, 26, 9); ctx.fill();
    ctx.fillStyle = id === target ? '#1b1300' : '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, d.x, ly);
    if (hearts[id]) {
      ctx.font = '18px sans-serif';
      ctx.fillText('💗'.repeat(Math.min(3, hearts[id])), d.x, ly - 26 + Math.sin(time * 4) * 3);
    }
    // 문 표시
    ctx.fillStyle = 'rgba(255,213,74,.35)'; ctx.beginPath(); ctx.ellipse(d.x, d.y, 26, 10, 0, 0, 7); ctx.fill();
  }
  // 이벤트 NPC 말풍선
  ctx.font = '900 18px sans-serif'; ctx.textAlign = 'center';
  for (const pd of peds) {
    const q = pedPos(pd);
    if (!vis(q.x - 30, q.y - 60, 60, 70)) continue;
    if (pd.event) { ctx.fillStyle = '#ffd54a'; ctx.fillText('❗', q.x, q.y - 38 + Math.sin(time * 5) * 3); }
    if (pd.bubble > 0) { ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.fillText('어머!', q.x, q.y - 40); ctx.font = '900 18px sans-serif'; }
  }
  // 목적지 화살표
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (target && doors[target]) {
    const d = doors[target];
    const sx = vw / 2 + (d.x - cam.x) * z, sy = vh / 2 + (d.y - cam.y) * z;
    if (sx < 20 || sx > vw - 20 || sy < 80 || sy > vh - 20) {
      const ang = Math.atan2(sy - vh / 2, sx - vw / 2);
      const R = Math.min(vw, vh) / 2 - 50;
      const ax = vw / 2 + Math.cos(ang) * R, ay = vh / 2 + Math.sin(ang) * R;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
      ctx.fillStyle = '#ffd54a'; ctx.strokeStyle = '#1b1300'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = '800 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(dist(P.x, P.y, d.x, d.y) / 10)}m`, ax, ay + 26);
    }
  }
  drawMinimap(hearts);
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function drawBuilding(b) {
  const k = 0.5, lift = b.H * k;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(b.x + 8, b.y + 8, b.w, b.h);
  if (b.type === 'stadium') return drawStadium(b);
  const top = b.y - lift;
  // 플레이어가 건물 뒤에 가려지면 반투명
  const hide = P.x > b.x - 12 && P.x < b.x + b.w + 12 && P.y > top - 10 && P.y < b.y + 4;
  ctx.save();
  if (hide) ctx.globalAlpha = 0.4;
  // 앞면
  ctx.fillStyle = shade(b.color, -0.15);
  ctx.fillRect(b.x, b.y + b.h - lift, b.w, lift);
  // 창문
  ctx.fillStyle = b.glass ? 'rgba(160,210,255,.55)' : 'rgba(40,50,70,.45)';
  for (let wy = b.y + b.h - lift + 8; wy < b.y + b.h - 10; wy += 16) for (let wx = b.x + 10; wx < b.x + b.w - 12; wx += 20) ctx.fillRect(wx, wy, 8, 7);
  // 지붕
  ctx.fillStyle = b.roof || shade(b.color, -0.25);
  ctx.fillRect(b.x, top, b.w, b.h);
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, top + 1, b.w - 2, b.h - 2);
  if (b.glass) { ctx.fillStyle = 'rgba(255,255,255,.08)'; for (let gx = b.x + 12; gx < b.x + b.w; gx += 26) ctx.fillRect(gx, top + 6, 10, b.h - 12); }
  if (b.awning) { ctx.fillStyle = b.awning; for (let ax = b.x; ax < b.x + b.w; ax += 24) { ctx.fillRect(ax, b.y + b.h - 10, 12, 10); } }
  if (b.type === 'studio') { ctx.fillStyle = '#ffd54a'; ctx.font = '900 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎬 STAR', b.x + b.w / 2, top + b.h / 2); }
  if (b.type === 'net') { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; for (let nx = b.x; nx < b.x + b.w; nx += 14) { ctx.beginPath(); ctx.moveTo(nx, top); ctx.lineTo(nx, top + b.h); ctx.stroke(); } ctx.fillStyle = '#fff'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚾ HOMERUN', b.x + b.w / 2, top + b.h / 2); }
  if (b.logo) { ctx.fillStyle = b.logo === 'APPLE' ? '#ff6b6b' : '#7a1530'; ctx.font = `900 ${b.logo === 'APPLE' ? 30 : 22}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.logo === 'APPLE' ? '🍎 APPLE' : b.logo, b.x + b.w / 2, top + b.h / 2); }
  if (b.sign) { ctx.fillStyle = '#fff'; ctx.font = '900 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎓 ' + b.sign, b.x + b.w / 2, top + b.h / 2); }
  if (b.clock) { ctx.fillStyle = '#f4efe6'; ctx.beginPath(); ctx.arc(b.x + b.w / 2, top + b.h / 2, 18, 0, 7); ctx.fill(); ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, top + b.h / 2); ctx.lineTo(b.x + b.w / 2, top + b.h / 2 - 12); ctx.moveTo(b.x + b.w / 2, top + b.h / 2); ctx.lineTo(b.x + b.w / 2 + 9, top + b.h / 2); ctx.stroke(); }
  if (b.loc === 'home') { ctx.fillStyle = '#ffd54a'; ctx.font = '900 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🏠 PENTHOUSE', b.x + b.w / 2, top + b.h / 2); }
  ctx.restore();
}
function drawStadium(b) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2 - 20;
  ctx.fillStyle = '#c9ccd4'; ctx.beginPath(); ctx.ellipse(cx, cy + 20, b.w / 2, b.h / 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8f94a3'; ctx.beginPath(); ctx.ellipse(cx, cy, b.w / 2, b.h / 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.ellipse(cx, cy, b.w / 2 - 14, b.h / 2 - 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3d8a3a'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, b.w / 2 - 44, b.h / 2 - 36, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c08b56';
  ctx.beginPath(); ctx.moveTo(cx, cy + b.h / 2 - 50); ctx.lineTo(cx + 60, cy + 10); ctx.lineTo(cx, cy - 50); ctx.lineTo(cx - 60, cy + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d8a3a';
  ctx.beginPath(); ctx.moveTo(cx, cy + b.h / 2 - 72); ctx.lineTo(cx + 40, cy + 10); ctx.lineTo(cx, cy - 30); ctx.lineTo(cx - 40, cy + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('APPLE PARK', cx, b.y + 18);
}
function drawTree(t) {
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(t.x + 4, t.y + 2, t.r, t.r * 0.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(t.x - 3, t.y - 14, 6, 14);
  ctx.fillStyle = '#2f7a38'; ctx.beginPath(); ctx.arc(t.x, t.y - 18 - t.r * 0.4, t.r, 0, 7); ctx.fill();
  ctx.fillStyle = '#3f9446'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - 22 - t.r * 0.5, t.r * 0.55, 0, 7); ctx.fill();
}
function drawBench(p) { ctx.fillStyle = '#7a5a3a'; ctx.fillRect(p.x - 24, p.y - 8, 48, 8); ctx.fillStyle = '#5a3a20'; ctx.fillRect(p.x - 24, p.y - 16, 48, 5); }
function drawCar(x, y, ang, color, mine) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-22, -11, 48, 26);
  ctx.fillStyle = color; roundRect(-25, -13, 50, 26, 7); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,.85)'; roundRect(-6, -10, 16, 20, 4); ctx.fill();
  ctx.fillStyle = 'rgba(20,30,45,.6)'; ctx.fillRect(-19, -9, 8, 18);
  ctx.fillStyle = '#fff8c0'; ctx.fillRect(21, -11, 4, 6); ctx.fillRect(21, 5, 4, 6);
  ctx.fillStyle = '#ff4040'; ctx.fillRect(-25, -11, 3, 5); ctx.fillRect(-25, 6, 3, 5);
  if (mine) { ctx.fillStyle = '#1b1300'; ctx.fillRect(-25, -2, 50, 4); }
  ctx.restore();
  if (mine && !P.inCar) {
    ctx.fillStyle = '#ffd54a'; ctx.font = '800 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MY CAR', x, y - 22);
  }
}
function drawPed(x, y, pd) {
  const bob = Math.sin(time * 9 + pd.p * 50) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = pd.shirt; ctx.beginPath(); ctx.ellipse(x, y - 9 + bob, 7, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = pd.skin; ctx.beginPath(); ctx.arc(x, y - 21 + bob, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.arc(x, y - 23 + bob, 6, Math.PI, 0); ctx.fill();
}
function drawPlayer() {
  const moving = inputVec().m > 0.1;
  const bob = moving ? Math.sin(P.walkT) * 2 : 0;
  const x = P.x, y = P.y;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, 7); ctx.fill();
  // 다리
  ctx.strokeStyle = '#f4f4f8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x - 4 + bob, y); ctx.moveTo(x + 3, y - 6); ctx.lineTo(x + 4 - bob, y); ctx.stroke();
  // 몸 (27번 유니폼)
  ctx.fillStyle = '#d81e34'; ctx.beginPath(); ctx.ellipse(x, y - 13, 8, 10, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('27', x, y - 12);
  ctx.fillStyle = '#f1c7a5'; ctx.beginPath(); ctx.arc(x, y - 26, 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#b3261e'; ctx.beginPath(); ctx.arc(x, y - 28, 7.5, Math.PI, 0); ctx.fill();
  ctx.fillRect(x + (Math.cos(P.dir) >= 0 ? 2 : -10), y - 29, 8, 3);
  // 내 위치 표시
  ctx.strokeStyle = 'rgba(255,213,74,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 14, 7, 0, 0, 7); ctx.stroke();
}

function drawMinimap(hearts) {
  const W = mini.width, H = mini.height;
  const s = W / (MAXX + RW);
  const oy = 0;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.fillStyle = '#244a2a'; mctx.fillRect(0, 0, W, H);
  mctx.setTransform(s, 0, 0, s, HR * s, HR * s + oy);
  mctx.fillStyle = '#2d6ea6'; mctx.fillRect(-HR, RIVER_Y, MAXX + RW, 800);
  mctx.fillStyle = '#5c6270';
  for (let k = 0; k <= NX; k++) mctx.fillRect(k * G - HR, -HR, RW, MAXY + RW);
  for (let l = 0; l <= NY; l++) mctx.fillRect(-HR, l * G - HR, MAXX + RW, RW);
  mctx.fillStyle = '#7d8494';
  for (const b of buildings) mctx.fillRect(b.x, b.y, b.w, b.h);
  mctx.font = '150px sans-serif'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  for (const [id, d] of Object.entries(doors)) {
    if (id === target) { mctx.fillStyle = '#ffd54a'; mctx.beginPath(); mctx.arc(d.x, d.y - 120, 150, 0, 7); mctx.fill(); }
    mctx.fillText(hearts[id] ? '💗' : Story.LOCS[id].emoji, d.x, d.y - 120);
  }
  mctx.fillStyle = '#ffcc00'; mctx.fillRect(CAR.x - 40, CAR.y - 25, 80, 50);
  mctx.fillStyle = '#fff'; mctx.strokeStyle = '#e5484d'; mctx.lineWidth = 40;
  mctx.beginPath(); mctx.arc(P.x, P.y, 70, 0, 7); mctx.fill(); mctx.stroke();
}

// ---------- 루프 ----------
function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.World = {
  start(h) {
    hooks = h || hooks;
    if (running) return;
    running = true;
    document.body.classList.add('in-world');
    Engine.setPaused(true);
    lastT = performance.now();
    requestAnimationFrame(frame);
  },
  stop() {
    running = false;
    stopMotion();
    document.body.classList.remove('in-world');
    Engine.setPaused(false);
  },
  get running() { return running; },
  setSlot(s) { slot = s; },
  setTarget(id) { target = id; },
  get target() { return target; },
  // 장소 앞으로 순간 이동 (택시)
  warp(id) { const d = doors[id]; if (!d) return; if (P.inCar) toggleCar(true); P.x = d.x; P.y = d.y + 30; CAR.x = d.x + 60; CAR.y = d.y + 40; cam.x = P.x; cam.y = P.y; },
  getState() { return { px: P.x, py: P.y, cx: CAR.x, cy: CAR.y, ca: CAR.ang, inCar: P.inCar, balls: collected.slice() }; },
  setState(s) {
    if (!s) return;
    P.x = s.px; P.y = s.py; CAR.x = s.cx; CAR.y = s.cy; CAR.ang = s.ca || 0; P.inCar = !!s.inCar;
    collected = (s.balls || []).slice(); cam.x = P.x; cam.y = P.y;
  },
  reset() { P.x = doors.home.x; P.y = doors.home.y + 30; CAR.x = doors.home.x + 70; CAR.y = doors.home.y + 36; CAR.ang = 0; P.inCar = false; collected = []; cam.x = P.x; cam.y = P.y; },
  ballsTotal: BALLS.length,
  _debug: { P, CAR, doors, peds, npcCars, doAction, nearestAction },
};
})();
