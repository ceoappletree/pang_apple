// 캐릭터 초상화 (SVG 코드 일러스트) — 애니메이션 스타일 바스트업
// 실제 일러스트 PNG가 assets/characters/manifest.js 에 등록되면 그것을 우선 사용
(() => {
'use strict';

const SKIN = { base: '#ffece2', mid: '#fcd9c8', sh: '#f1b9a4', line: '#c27f6c' };
const LIP = '#c45d6b';
const f = n => Math.round(n * 10) / 10;
let uidN = 0;
const uid = () => 'p' + (++uidN).toString(36) + Math.random().toString(36).slice(2, 5);

// 머리카락 한 가닥(덩어리): 뿌리(x1,y1) → 끝(x2,y2), 폭 w, 휘어짐 bend
function clump(x1, y1, x2, y2, w, bend = 0) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
  const lx = x1 + nx * w / 2, ly = y1 + ny * w / 2, rx = x1 - nx * w / 2, ry = y1 - ny * w / 2;
  return `M${f(lx)} ${f(ly)}Q${f(mx + nx * w * 0.38)} ${f(my + ny * w * 0.38)} ${f(x2)} ${f(y2)}Q${f(mx - nx * w * 0.38)} ${f(my - ny * w * 0.38)} ${f(rx)} ${f(ry)}Z`;
}
// 가닥 안쪽 결 (얇은 선)
function strand(x1, y1, x2, y2, bend = 0) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  const sx = x1 + dx * 0.3, sy = y1 + dy * 0.3, ex = x1 + dx * 0.86, ey = y1 + dy * 0.86;
  const mx = (sx + ex) / 2 + nx * bend * 0.7, my = (sy + ey) / 2 + ny * bend * 0.7;
  return `M${f(sx)} ${f(sy)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
}
const clumps = list => list.map(c => clump(...c)).join('');
// 겹친 조각들을 한 덩어리처럼: 외곽선을 전부 먼저 그리고 그 위에 채우기
function layer(parts, fill, line, sw = 3.4) {
  return `<g fill="none" stroke="${line}" stroke-width="${sw}" stroke-linejoin="round">${parts.map(d => `<path d="${d}"/>`).join('')}</g>
    <g fill="${fill}">${parts.map(d => `<path d="${d}"/>`).join('')}</g>`;
}
const strands = list => list.map(c => strand(c[0], c[1], c[2], c[3], c[5] || 0)).join('');

const FACE = 'M120 178 Q121 250 166 289 Q186 305 200 307 Q214 305 234 289 Q279 250 280 178 Q280 92 200 88 Q120 92 120 178 Z';
const DOME = 'M110 200 Q98 70 200 60 Q302 70 290 200 Q286 150 264 124 Q200 100 136 124 Q114 150 110 200 Z';
const BODY = 'M36 520 Q48 404 140 368 Q170 356 200 356 Q230 356 260 368 Q352 404 364 520 Z';

// ---------- 캐릭터 디자인 ----------
// hair: [기본, 그림자, 하이라이트, 외곽선], eye: [위쪽, 아래쪽, 반사광]
const CHARS = {
  // 여배우 차유나: 가르마 옆머리 + 긴 웨이브, 버건디 오프숄더 드레스
  yuna: {
    hair: ['#4a2a1e', '#2a140d', '#8a5a44', '#1e0e08'], eye: ['#5a1d33', '#c2577a', '#ffb3c8'], lash: '#2a1416', brow: '#3a2018',
    back: 'M104 200 Q84 78 200 56 Q316 78 296 200 Q320 282 300 362 Q328 424 306 484 Q252 504 200 498 Q148 504 94 484 Q72 424 100 362 Q80 282 104 200Z',
    backClumps: [[118, 400, 88, 508, 46, 22], [158, 430, 146, 516, 42, -16], [242, 430, 254, 516, 42, 16], [282, 400, 312, 508, 46, -22], [110, 300, 84, 400, 40, 18], [290, 300, 316, 400, 40, -18]],
    bangs: [[172, 94, 256, 176, 50, 16], [166, 96, 220, 186, 42, 10], [162, 98, 186, 192, 34, 5], [154, 100, 152, 186, 30, -4], [146, 104, 128, 192, 28, -8], [180, 94, 282, 160, 42, 16]],
    side: [[128, 128, 112, 340, 36, -14], [142, 140, 134, 312, 22, -8], [272, 126, 292, 350, 38, 14], [260, 150, 266, 316, 20, 8]],
    outfit: 'dress', skinShoulder: true,
    acc(id) {
      return `<path d="M120 236 l0 22" stroke="#e8c35a" stroke-width="2"/><circle cx="120" cy="263" r="6" fill="url(#${id}pearl)"/>
        <path d="M280 236 l0 22" stroke="#e8c35a" stroke-width="2"/><circle cx="280" cy="263" r="6" fill="url(#${id}pearl)"/>
        <circle cx="236" cy="262" r="2" fill="#6a3a2a"/>`;
    },
  },
  // 여대생 서지우: 단발 + 일자 앞머리, 동그란 안경, 니트 가디건
  jiwoo: {
    hair: ['#2f2420', '#17110e', '#5e4a40', '#120c0a'], eye: ['#3a2216', '#9a6a44', '#e8c6a0'], lash: '#1e1410', brow: '#2a1e18',
    back: 'M106 200 Q94 74 200 62 Q306 74 294 200 Q302 266 292 324 Q282 342 262 336 L138 336 Q118 342 108 324 Q98 266 106 200Z',
    backClumps: [[120, 300, 128, 344, 30, 8], [150, 310, 160, 344, 30, 4], [250, 310, 240, 344, 30, -4], [280, 300, 272, 344, 30, -8]],
    bangs: [[134, 108, 132, 180, 26, -3], [150, 102, 150, 184, 24, -2], [166, 98, 166, 186, 24, 0], [182, 96, 184, 188, 24, 2], [198, 96, 200, 186, 24, 0], [214, 96, 216, 188, 24, -2], [230, 98, 234, 186, 24, 0], [246, 102, 250, 184, 24, 2], [262, 108, 266, 180, 26, 3]],
    side: [[124, 140, 124, 330, 34, -10], [276, 140, 276, 330, 34, 10], [134, 150, 142, 300, 18, -4], [266, 150, 258, 300, 18, 4]],
    outfit: 'knit',
    acc() {
      return `<g fill="rgba(200,230,255,.18)" stroke="#6a5446" stroke-width="3.2"><circle cx="160" cy="214" r="34"/><circle cx="240" cy="214" r="34"/></g>
        <path d="M194 210 Q200 204 206 210 M126 206 L114 200 M274 206 L286 200" stroke="#6a5446" stroke-width="3" fill="none"/>
        <path d="M138 196 l12 -10 M146 198 l6 -5 M218 196 l12 -10 M226 198 l6 -5" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
        <path d="M246 120 l26 -8" stroke="#ffd54a" stroke-width="7" stroke-linecap="round"/><path d="M248 120 l22 -7" stroke="#fff3b0" stroke-width="2" stroke-linecap="round"/>`;
    },
  },
  // 치어리더 박하린: 하이 트윈테일 + 더듬이, 빨간 리본, 응원복
  harin: {
    hair: ['#e7a94e', '#b87422', '#ffe0a0', '#8a5212'], eye: ['#7a3010', '#e8892e', '#ffd9a0'], lash: '#3a1a0c', brow: '#a86a2a',
    back: 'M110 200 Q98 74 200 62 Q302 74 290 200 Q292 244 282 268 L118 268 Q108 244 110 200Z',
    backClumps: [
      [112, 112, 54, 360, 92, -46], [112, 120, 80, 420, 60, -30], [104, 130, 36, 300, 50, -30],
      [288, 112, 346, 360, 92, 46], [288, 120, 320, 420, 60, 30], [296, 130, 364, 300, 50, 30]],
    bangs: [[200, 94, 200, 190, 32, 0], [182, 96, 160, 184, 36, -8], [218, 96, 240, 184, 36, 8], [162, 102, 132, 176, 32, -8], [238, 102, 268, 176, 32, 8], [192, 96, 178, 194, 22, -4], [208, 96, 222, 194, 22, 4], [146, 110, 124, 196, 24, -10], [254, 110, 276, 196, 24, 10]],
    side: [[128, 136, 120, 260, 26, -8], [272, 136, 280, 260, 26, 8]],
    ahoge: [204, 64, 232, 22, 12, 14],
    outfit: 'cheer', skinShoulder: true,
    acc(id) {
      const bow = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s} 1)">
        <path d="M0 0 Q-34 -30 -42 -6 Q-46 18 0 0Z M0 0 Q34 -30 42 -6 Q46 18 0 0Z" fill="url(#${id}red)" stroke="#8a1020" stroke-width="2"/>
        <path d="M-4 2 L-16 34 L-6 30 L0 38 L6 30 L16 34 L4 2Z" fill="#c8202e" stroke="#8a1020" stroke-width="2"/>
        <circle r="9" fill="#ff5a6a" stroke="#8a1020" stroke-width="2"/><path d="M-30 -12 Q-20 -14 -12 -6" stroke="#ff9aa6" stroke-width="3" fill="none"/></g>`;
      return bow(108, 112, 1) + bow(292, 112, -1) +
        `<path d="M256 254 l4 9 l10 1 l-7 7 l2 10 l-9 -5 l-9 5 l2 -10 l-7 -7 l10 -1z" fill="#ffd54a" stroke="#e8a020" stroke-width="1.5"/>`;
    },
  },
  // 여심판 정세아: 심판 모자 + 단정한 흑발, 남색 심판복
  sea: {
    hair: ['#1c1c24', '#0a0a10', '#4a4a5c', '#050508'], eye: ['#1e2c40', '#55789c', '#bcd4ea'], lash: '#0e1018', brow: '#1a1a22',
    back: 'M110 200 Q100 88 200 74 Q300 88 290 200 Q294 262 282 296 L118 296 Q106 262 110 200Z',
    backClumps: [[120, 260, 112, 312, 30, -6], [280, 260, 288, 312, 30, 6]],
    bangs: [[150, 150, 130, 200, 30, -8], [176, 150, 166, 196, 28, -4], [228, 150, 238, 194, 26, 4], [252, 150, 272, 198, 30, 8], [200, 150, 204, 184, 22, 0]],
    side: [[124, 166, 118, 300, 28, -8], [276, 166, 282, 300, 28, 8]],
    noDome: true, eyeliner: true,
    outfit: 'umpire',
    front(id) {
      // 낮게 묶은 머리 (어깨 앞)
      return `<path d="${clump(270, 270, 300, 440, 50, 14)}" fill="url(#${id}hairBack)" stroke="#050508" stroke-width="1.5"/>
        <path d="${strand(270, 270, 300, 440, 14)}" stroke="#4a4a5c" stroke-width="2" fill="none" opacity=".6"/>
        <rect x="262" y="276" width="24" height="12" rx="5" fill="#c8202e" transform="rotate(20 274 282)"/>`;
    },
    acc(id) {
      return `<path d="M108 164 Q100 58 200 50 Q300 58 292 164 Q200 136 108 164Z" fill="url(#${id}cap)" stroke="#050510" stroke-width="2"/>
        <path d="M150 64 Q160 110 150 152 M250 64 Q240 110 250 152 M200 50 L200 142" stroke="#2c3550" stroke-width="2" fill="none"/>
        <circle cx="200" cy="52" r="7" fill="#1b2238" stroke="#050510" stroke-width="1.5"/>
        <path d="M98 160 Q200 128 302 160 Q312 174 298 182 Q200 152 102 182 Q88 174 98 160Z" fill="url(#${id}brim)" stroke="#050510" stroke-width="2"/>
        <text x="200" y="118" text-anchor="middle" font-size="24" font-weight="900" fill="#d8dde8" font-family="sans-serif" letter-spacing="2">UMP</text>
`;
    },
  },
  // 여성팬 한소미: 층진 숏컷 + 27 머리핀, 애플즈 유니폼
  somi: {
    hair: ['#7a4428', '#4a2412', '#b8784e', '#30160a'], eye: ['#6a2a12', '#e0843c', '#ffcf9a'], lash: '#2a140a', brow: '#5a3020',
    back: 'M106 204 Q94 72 200 60 Q306 72 294 204 Q298 252 286 284 Q270 294 258 282 L142 282 Q130 294 114 284 Q102 252 106 204Z',
    backClumps: [[118, 250, 90, 300, 30, 12], [282, 250, 310, 300, 30, -12], [140, 266, 128, 306, 26, 6], [260, 266, 272, 306, 26, -6]],
    bangs: [[186, 94, 150, 186, 40, -10], [206, 94, 196, 194, 34, -2], [222, 96, 244, 184, 36, 8], [168, 100, 130, 174, 30, -8], [240, 100, 270, 174, 30, 8], [196, 94, 176, 188, 24, -6]],
    side: [[126, 136, 116, 262, 30, -12], [274, 136, 284, 262, 30, 12], [136, 150, 142, 250, 16, -4]],
    ahoge: [190, 62, 168, 30, 10, -10],
    outfit: 'jersey',
    acc() {
      return `<g transform="rotate(-24 258 134)"><rect x="236" y="126" width="46" height="16" rx="6" fill="#e5484d" stroke="#8a1020" stroke-width="2"/>
        <text x="259" y="139" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="sans-serif">27</text></g>
        <path d="M248 258 c-4 -7 -14 -2 -8 6 l8 8 l8 -8 c6 -8 -4 -13 -8 -6z" fill="#ff5a6a" stroke="#c02838" stroke-width="1.5"/>`;
    },
  },
};

// ---------- 의상 ----------
function outfit(c, id) {
  switch (c.outfit) {
    case 'dress':
      return `<path d="M58 520 Q64 452 110 432 Q158 448 200 446 Q242 448 290 432 Q336 452 342 520Z" fill="url(#${id}cloth)"/>
        <path d="M110 432 Q158 448 200 446 Q242 448 290 432" fill="none" stroke="#b03050" stroke-width="5"/>
        <path d="M120 440 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0" fill="none" stroke="#5a0c22" stroke-width="2" opacity=".6"/>
        <path d="M150 470 Q160 500 152 520 M250 470 Q240 500 248 520 M200 470 L200 520" stroke="#4a0a1c" stroke-width="2" opacity=".35" fill="none"/>
        <path d="M150 382 Q172 392 192 386 M250 382 Q228 392 208 386" stroke="${SKIN.sh}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M168 352 Q200 396 232 352" fill="none" stroke="#e8c35a" stroke-width="1.5"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const t = i / 8, x = 168 + 64 * t, y = 352 + Math.sin(t * Math.PI) * 30; return `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="url(#${id}pearl)"/>`; }).join('')}
        <path d="M200 386 l-7 9 l7 9 l7 -9z" fill="#ff8ab0" stroke="#e8c35a" stroke-width="1.5"/>`;
    case 'knit':
      return `<path d="${BODY}" fill="url(#${id}cloth)"/>
        <path d="M168 350 L200 392 L232 350 L246 362 L214 420 L200 400 L186 420 L154 362Z" fill="#fff" stroke="#d8d8e0" stroke-width="2"/>
        <path d="M200 392 L200 520" stroke="#efe8dc" stroke-width="4"/>
        <path d="M140 368 L178 520 M260 368 L222 520" stroke="#cdb894" stroke-width="10" opacity=".55"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<path d="M${60 + i * 28} 430 L${56 + i * 30} 520" stroke="#d9c6a2" stroke-width="2" opacity=".6"/>`).join('')}
        <circle cx="190" cy="450" r="5" fill="#a88c66"/><circle cx="190" cy="488" r="5" fill="#a88c66"/>
        <path d="M296 392 L330 520" stroke="#6a8aaa" stroke-width="12" stroke-linecap="round"/><path d="M296 392 L330 520" stroke="#8aaaca" stroke-width="4"/>`;
    case 'cheer':
      return `<path d="M86 520 Q90 432 134 404 Q200 424 266 404 Q310 432 314 520Z" fill="url(#${id}cloth)"/>
        <path d="M134 404 Q200 424 266 404 L258 420 Q200 446 142 420Z" fill="#fff"/>
        <path d="M150 412 L200 470 L250 412" fill="none" stroke="#fff" stroke-width="10"/>
        <path d="M150 412 L200 470 L250 412" fill="none" stroke="#8a1020" stroke-width="2"/>
        <text x="200" y="508" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" font-family="sans-serif" stroke="#8a1020" stroke-width="1.5">APPLES</text>
        <path d="M130 392 L140 420 M270 392 L260 420" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
        <path d="M150 380 Q172 390 190 386 M250 380 Q228 390 210 386" stroke="${SKIN.sh}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    case 'umpire':
      return `<path d="${BODY}" fill="url(#${id}cloth)"/>
        <path d="M160 356 L200 400 L240 356 L262 370 L222 418 L200 404 L178 418 L138 370Z" fill="#2a3352" stroke="#0e1424" stroke-width="2"/>
        <path d="M184 372 L200 404 L216 372Z" fill="#d8dde8"/>
        <path d="M200 404 L200 520" stroke="#0e1424" stroke-width="3"/>
        <circle cx="200" cy="440" r="4" fill="#9aa4bc"/><circle cx="200" cy="476" r="4" fill="#9aa4bc"/><circle cx="200" cy="510" r="4" fill="#9aa4bc"/>
        <path d="M72 440 Q92 420 120 412 M328 440 Q308 420 280 412" stroke="#7a86a2" stroke-width="4" fill="none"/>
        <rect x="236" y="440" width="58" height="34" rx="6" fill="#3b4a72" stroke="#c8d0e0" stroke-width="2"/>
        <text x="265" y="463" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="sans-serif">KBL</text>`;
    case 'jersey':
      return `<path d="${BODY}" fill="url(#${id}cloth)"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<path d="M${68 + i * 30} 404 L${64 + i * 30} 520" stroke="#e8a0a8" stroke-width="2" opacity=".5"/>`).join('')}
        <path d="M150 362 L200 424 L250 362" fill="none" stroke="#d81e34" stroke-width="12"/>
        <path d="M58 470 Q80 410 128 380 M342 470 Q320 410 272 380" stroke="#d81e34" stroke-width="10" fill="none"/>
        <text x="258" y="482" text-anchor="middle" font-size="44" font-weight="900" fill="#d81e34" font-family="sans-serif" stroke="#fff" stroke-width="2">27</text>
        <text x="150" y="464" text-anchor="middle" font-size="22" font-weight="900" fill="#d81e34" font-family="Georgia,serif" font-style="italic">Apples</text>`;
  }
  return '';
}
const CLOTH = {
  dress: ['#a01e3e', '#5a0a20'], knit: ['#f2e6cc', '#d8c6a0'], cheer: ['#e5283c', '#9a1020'],
  umpire: ['#1e2640', '#0c1020'], jersey: ['#ffffff', '#e4e4ec'],
};

// ---------- 얼굴 파츠 ----------
// 왼쪽 눈 (오른쪽은 좌우 반전), look: 시선 좌우 이동
function eye(c, mood, id, look) {
  if (mood === 'happy' || mood === 'love') {
    return `<path d="M128 222 Q160 188 194 220" fill="none" stroke="${c.lash}" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M130 220 l-9 6 M190 216 l9 1" stroke="${c.lash}" stroke-width="3" stroke-linecap="round"/>
      <path d="M140 226 Q160 216 182 224" fill="none" stroke="${c.lash}" stroke-width="1.5" opacity=".4"/>`;
  }
  // 윗눈꺼풀 곡선 (표정별)
  let sx = 128, sy = 212, top = 'Q134 182 162 180 Q187 180 197 200';
  let irx = 21, iry = 27, ix = 163 + look, iy = 216, prx = 8.5, pry = 12.5;
  if (mood === 'surprised') { sy = 206; top = 'Q133 172 162 170 Q190 170 198 196'; irx = 17; iry = 21; prx = 4.5; pry = 6; iy = 210; }
  if (mood === 'sad') { sy = 214; top = 'Q140 192 164 192 Q186 194 196 206'; }
  if (mood === 'angry') { sy = 206; top = 'Q142 190 166 194 Q186 198 198 214'; }
  if (mood === 'shy') { top = 'Q136 186 162 185 Q187 185 197 202'; }
  const white = `M${sx} ${sy} ${top} Q192 236 162 242 Q136 238 ${sx} ${sy}Z`;
  const cid = id + 'e' + (look >= 0 ? 'a' : 'b') + Math.abs(look);
  return `<defs><clipPath id="${cid}"><path d="${white}"/></clipPath></defs>
    <path d="${white}" fill="url(#${id}white)"/>
    <g clip-path="url(#${cid})">
      <ellipse cx="${ix}" cy="${iy}" rx="${irx}" ry="${iry}" fill="url(#${id}iris)"/>
      <ellipse cx="${ix}" cy="${iy - iry * 0.62}" rx="${irx}" ry="${iry * 0.5}" fill="${c.eye[0]}" opacity=".55"/>
      <ellipse cx="${ix}" cy="${iy + iry * 0.45}" rx="${irx * 0.68}" ry="${iry * 0.33}" fill="${c.eye[2]}" opacity=".55"/>
      <ellipse cx="${ix}" cy="${iy}" rx="${irx}" ry="${iry}" fill="none" stroke="${c.eye[0]}" stroke-width="2"/>
      <ellipse cx="${ix}" cy="${iy + 1}" rx="${prx}" ry="${pry}" fill="#140a14"/>
      <ellipse cx="${ix - 8}" cy="${iy - 10}" rx="6.5" ry="8.5" fill="#fff"/>
      <circle cx="${ix + 9}" cy="${iy + 12}" r="3.2" fill="#fff" opacity=".9"/>
      <circle cx="${ix + 11}" cy="${iy - 13}" r="1.8" fill="#fff" opacity=".85"/>
      <path d="${white}" fill="none" stroke="#b9a6c8" stroke-width="4" opacity=".35" transform="translate(0 -3)"/>
    </g>
    <path d="M${sx - 3} ${sy + 1} ${top}" fill="none" stroke="${c.lash}" stroke-width="${c.eyeliner ? 7.5 : 6.5}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${sx + 2} ${sy - 4} Q${sx - 8} ${sy - 8} ${sx - (c.eyeliner ? 20 : 14)} ${sy - (c.eyeliner ? 16 : 12)}" fill="none" stroke="${c.lash}" stroke-width="4" stroke-linecap="round"/>
    <path d="M${sx + 1} ${sy + 2} l-12 2 M${sx + 6} ${sy - 10} l-8 -8" stroke="${c.lash}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M138 236 Q162 247 186 233" fill="none" stroke="${c.lash}" stroke-width="1.7" opacity=".5"/>
    ${mood !== 'angry' && mood !== 'sad' ? `<path d="M136 ${sy - 20} Q162 ${sy - 42} 190 ${sy - 30}" fill="none" stroke="${c.lash}" stroke-width="1.6" opacity=".35"/>` : ''}`;
}
function brow(c, mood) {
  const d = mood === 'angry' ? 'M134 160 Q164 162 190 176' : mood === 'sad' ? 'M134 172 Q162 164 190 154'
    : mood === 'surprised' ? 'M136 152 Q160 140 186 146' : 'M134 166 Q160 156 188 162';
  return `<path d="${d}" fill="none" stroke="${c.brow}" stroke-width="4.5" stroke-linecap="round"/>`;
}
function mouth(mood) {
  switch (mood) {
    case 'happy': case 'love':
      return `<path d="M182 266 Q200 271 218 266 Q215 292 200 294 Q185 292 182 266Z" fill="#8e3242" stroke="#7a2232" stroke-width="1.5"/>
        <path d="M185 267 Q200 272 215 267 L214 272 Q200 276 186 272Z" fill="#fff"/>
        <path d="M189 285 Q200 278 211 285 Q207 293 200 294 Q193 293 189 285Z" fill="#ff8b98"/>`;
    case 'smile':
      return `<path d="M184 268 Q200 283 216 268" fill="none" stroke="${LIP}" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M194 279 Q200 281 206 279" stroke="#e8a0a8" stroke-width="2" fill="none"/>`;
    case 'shy':
      return `<path d="M188 274 q4 -4 8 0 q4 4 8 0 q4 -4 8 0" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`;
    case 'sad':
      return `<path d="M188 278 Q200 268 212 278" fill="none" stroke="${LIP}" stroke-width="3" stroke-linecap="round"/>`;
    case 'angry':
      return `<path d="M186 276 Q200 266 214 276 Q200 272 186 276Z" fill="#8e3242" stroke="${LIP}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'surprised':
      return `<ellipse cx="200" cy="278" rx="8" ry="10" fill="#8e3242"/><ellipse cx="200" cy="283" rx="5" ry="4" fill="#ff8b98"/>`;
    default:
      return `<path d="M189 272 Q200 277 211 271" fill="none" stroke="${LIP}" stroke-width="2.8" stroke-linecap="round"/>`;
  }
}
function blush(mood, id) {
  const o = mood === 'shy' || mood === 'love' ? 0.9 : mood === 'happy' ? 0.6 : 0.35;
  const lines = mood === 'shy' || mood === 'love'
    ? `<path d="M134 254 l7 -9 M145 256 l7 -9 M156 257 l7 -9 M238 257 l7 -9 M249 256 l7 -9 M260 254 l7 -9" stroke="#e8607a" stroke-width="2.2" stroke-linecap="round"/>` : '';
  return `<ellipse cx="148" cy="252" rx="28" ry="13" fill="url(#${id}blush)" opacity="${o}"/>
    <ellipse cx="252" cy="252" rx="28" ry="13" fill="url(#${id}blush)" opacity="${o}"/>${lines}`;
}
function extra(mood) {
  if (mood === 'sad') return `<path d="M134 240 Q127 260 134 268 Q141 260 134 240Z" fill="#a8dcff" stroke="#6ab0e8" stroke-width="1.5"/>
    <path d="M266 240 Q259 256 266 262 Q273 256 266 240Z" fill="#a8dcff" stroke="#6ab0e8" stroke-width="1.5"/>`;
  if (mood === 'angry') return `<g transform="translate(300 118)" stroke="#e5484d" stroke-width="4.5" stroke-linecap="round" fill="none">
    <path d="M-14 -4 Q-4 -4 -4 -14 M4 -14 Q4 -4 14 -4 M14 4 Q4 4 4 14 M-4 14 Q-4 4 -14 4"/></g>`;
  if (mood === 'love') return `<path d="M306 132 c-8 -14 -28 -4 -16 12 l16 16 l16 -16 c12 -16 -8 -26 -16 -12z" fill="#ff5c93" stroke="#d83a72" stroke-width="2"/>
    <path d="M334 186 c-4 -8 -16 -2 -9 7 l9 9 l9 -9 c7 -9 -5 -15 -9 -7z" fill="#ff8ab0"/>`;
  if (mood === 'surprised') return `<path d="M292 150 Q284 170 292 178 Q300 170 292 150Z" fill="#bfe6ff" stroke="#6ab0e8" stroke-width="1.5"/>
    <path d="M300 120 l8 -14 M314 128 l14 -8 M306 140 l16 0" stroke="#3a3a4a" stroke-width="3" stroke-linecap="round"/>`;
  return '';
}

// 천사링 (머리 윗부분 윤기)
function shine(col) {
  let d = '';
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, a = (-0.46 + t * 0.92);                  // 정수리 기준 각도
    const cx = 200, cy = 240, R = 160;
    const x = cx + Math.sin(a) * R, y = cy - Math.cos(a) * R;
    const ux = Math.sin(a), uy = -Math.cos(a), len = 16 + Math.cos(a * 2.2) * 8;
    d += clump(x + ux * len * 0.5, y + uy * len * 0.5, x - ux * len * 0.5, y - uy * len * 0.5, 6 + (i % 2) * 3, 0);
  }
  return `<path d="${d}" fill="${col}" opacity=".7"/>`;
}

// ---------- 조립 ----------
function defs(c, id) {
  const [hb, hs, hl] = c.hair;
  const cl = CLOTH[c.outfit] || ['#888', '#555'];
  return `<defs>
    <linearGradient id="${id}hairBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hb}"/><stop offset="1" stop-color="${hs}"/></linearGradient>
    <linearGradient id="${id}hairFront" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="330"><stop offset="0" stop-color="${hl}"/><stop offset=".22" stop-color="${hb}"/><stop offset=".55" stop-color="${hb}"/><stop offset="1" stop-color="${hs}"/></linearGradient>
    <linearGradient id="${id}skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKIN.base}"/><stop offset="1" stop-color="${SKIN.mid}"/></linearGradient>
    <linearGradient id="${id}white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2d6ee"/><stop offset=".4" stop-color="#ffffff"/></linearGradient>
    <linearGradient id="${id}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.eye[0]}"/><stop offset="1" stop-color="${c.eye[1]}"/></linearGradient>
    <radialGradient id="${id}blush"><stop offset="0" stop-color="#ff8fa6" stop-opacity=".9"/><stop offset="1" stop-color="#ff8fa6" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cl[0]}"/><stop offset="1" stop-color="${cl[1]}"/></linearGradient>
    <radialGradient id="${id}pearl" cx=".35" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d8cfc4"/></radialGradient>
    <linearGradient id="${id}red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a6a"/><stop offset="1" stop-color="#c8202e"/></linearGradient>
    <linearGradient id="${id}cap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e3a5c"/><stop offset="1" stop-color="#141a2e"/></linearGradient>
    <linearGradient id="${id}brim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e2640"/><stop offset="1" stop-color="#080a14"/></linearGradient>
    <clipPath id="${id}face"><path d="${FACE}"/></clipPath>
  </defs>`;
}

function girl(key, mood = 'normal', crop) {
  const c = CHARS[key];
  const id = uid();
  const [hb, hs, hl, hline] = c.hair;
  const mirror = s => `<g transform="translate(400 0) scale(-1 1)">${s}</g>`;
  const look = mood === 'shy' ? -7 : 0;
  const frontParts = [...(c.noDome ? [] : [DOME]), ...c.side.map(x => clump(...x)), ...c.bangs.map(x => clump(...x))];
  const frontHair = frontParts.join('');
  const backParts = [c.back, ...(c.backClumps || []).map(x => clump(...x))];
  const vb = crop === 'face' ? '96 40 208 250' : '0 0 400 520';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${defs(c, id)}
    ${layer(backParts, `url(#${id}hairBack)`, hline)}
    <path d="${strands(c.backClumps || [])}" stroke="${hl}" stroke-width="2" fill="none" opacity=".35"/>
    <path d="M172 276 L170 356 Q200 372 230 356 L228 276Z" fill="url(#${id}skin)" stroke="${SKIN.line}" stroke-width="1.4"/>
    <path d="M170 286 Q200 324 230 286 L230 318 Q200 342 170 318Z" fill="${SKIN.sh}" opacity=".8"/>
    ${c.skinShoulder ? `<path d="${BODY}" fill="url(#${id}skin)" stroke="${SKIN.line}" stroke-width="1.4"/>` : ''}
    ${outfit(c, id)}
    <path d="M124 196 Q106 190 109 214 Q112 240 132 244Z M276 196 Q294 190 291 214 Q288 240 268 244Z" fill="${SKIN.mid}" stroke="${SKIN.line}" stroke-width="1.4"/>
    <path d="${FACE}" fill="url(#${id}skin)" stroke="${SKIN.line}" stroke-width="1.8"/>
    <g clip-path="url(#${id}face)">
      <path d="M268 190 Q266 252 230 290 Q262 266 284 214Z" fill="${SKIN.mid}" opacity=".9"/>
      <g fill="${SKIN.sh}" opacity=".75" transform="translate(4 11)">${frontParts.map(d => `<path d="${d}"/>`).join('')}</g>
    </g>
    ${mirror(`<g transform="translate(152 214) scale(.87) translate(-160 -214)">${eye(c, mood, id, -look)}</g>`)}<g transform="translate(152 214) scale(.87) translate(-160 -214)">${eye(c, mood, id, look)}</g>
    <path d="M204 242 Q198 254 203 258" fill="none" stroke="${SKIN.line}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
    ${blush(mood, id)}
    ${mouth(mood)}
    ${c.front ? c.front(id) : ''}
    ${layer(frontParts, `url(#${id}hairFront)`, hline)}
    <path d="${strands(c.bangs)}${strands(c.side)}" stroke="${hs}" stroke-width="1.6" fill="none" opacity=".45"/>
    ${c.noDome ? '' : shine(hl)}
    ${c.ahoge ? `<path d="${clump(...c.ahoge)}" fill="url(#${id}hairFront)" stroke="${hline}" stroke-width="1.6"/>` : ''}
    <g opacity=".72">${brow(c, mood)}${mirror(brow(c, mood))}</g>
    ${c.acc ? c.acc(id) : ''}
    ${extra(mood)}
  </svg>`;
}

// ---------- 남자 캐릭터 ----------
function coach(mood = 'normal') {
  const eyes = mood === 'smile'
    ? '<path d="M108 158 Q120 150 134 158 M166 158 Q180 150 192 158" fill="none" stroke="#222" stroke-width="4.5" stroke-linecap="round"/>'
    : '<path d="M108 158 L134 157 M166 157 L192 158" stroke="#222" stroke-width="5" stroke-linecap="round"/><circle cx="121" cy="161" r="3.5" fill="#222"/><circle cx="179" cy="161" r="3.5" fill="#222"/>';
  const brows = mood === 'angry'
    ? '<path d="M104 136 L136 146 M196 136 L164 146" stroke="#555" stroke-width="7" stroke-linecap="round"/>'
    : '<path d="M104 142 L136 140 M196 142 L164 140" stroke="#555" stroke-width="7" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 340 Q36 258 110 248 L190 248 Q264 258 276 340 Z" fill="#c8202e"/>
    <path d="M118 248 L150 290 L182 248" fill="#fff"/>
    <path d="M130 212 L130 258 Q150 268 170 258 L170 212 Z" fill="#e2ad8e"/>
    <path d="M150 238 Q130 236 116 222 Q90 196 88 146 Q88 84 150 80 Q212 84 212 146 Q210 196 184 222 Q170 236 150 238 Z" fill="#f0c3a2"/>
    <path d="M110 214 Q150 246 190 214 Q186 232 150 240 Q114 232 110 214 Z" fill="#9a9a9a" opacity=".55"/>
    ${eyes}${brows}
    <path d="M150 166 l-4 16 l8 0" fill="none" stroke="#c99478" stroke-width="3" stroke-linecap="round"/>
    <path d="M128 196 Q150 188 172 196" fill="none" stroke="#666" stroke-width="7" stroke-linecap="round"/>
    <path d="M136 208 Q150 ${mood === 'smile' ? 216 : 206} 164 208" fill="none" stroke="#8a4a3a" stroke-width="3" stroke-linecap="round"/>
    <path d="M84 132 Q84 62 150 60 Q216 62 216 132 L222 126 Q224 118 214 112 L86 112 Q76 118 78 126 Z" fill="#c8202e"/>
    <path d="M78 126 Q150 106 222 126 Q232 132 250 128 Q236 140 214 136 Q150 120 86 136 Z" fill="#9a1620"/>
    <text x="150" y="102" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" font-family="sans-serif">A</text>
    <path d="M84 132 L86 150 M216 132 L214 150" stroke="#888" stroke-width="5"/>
  </svg>`;
}
function chairman(mood = 'normal') {
  const eyes = mood === 'smile'
    ? '<path d="M110 160 Q122 152 134 160 M166 160 Q178 152 190 160" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round"/>'
    : '<circle cx="122" cy="160" r="4" fill="#222"/><circle cx="178" cy="160" r="4" fill="#222"/>';
  const brows = mood === 'angry'
    ? '<path d="M104 138 L138 148 M196 138 L162 148" stroke="#bbb" stroke-width="6" stroke-linecap="round"/>'
    : '<path d="M104 144 L138 142 M196 144 L162 142" stroke="#bbb" stroke-width="6" stroke-linecap="round"/>';
  return `<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 340 Q36 258 110 248 L190 248 Q264 258 276 340 Z" fill="#1d2440"/>
    <path d="M122 248 L150 300 L178 248 Z" fill="#fff"/><path d="M144 256 L156 256 L160 320 L150 330 L140 320 Z" fill="#b3261e"/>
    <path d="M130 212 L130 258 Q150 268 170 258 L170 212 Z" fill="#e2ad8e"/>
    <path d="M150 238 Q130 236 116 222 Q90 196 88 146 Q88 84 150 80 Q212 84 212 146 Q210 196 184 222 Q170 236 150 238 Z" fill="#f0c3a2"/>
    <path d="M86 140 Q80 70 150 64 Q220 70 214 140 Q208 104 186 96 Q150 90 120 98 Q96 106 86 140 Z" fill="#c9c9cf"/>
    <path d="M110 96 Q150 80 196 98" fill="none" stroke="#e8e8ee" stroke-width="5"/>
    ${eyes}${brows}
    <g fill="none" stroke="#333" stroke-width="3"><rect x="102" y="146" width="40" height="28" rx="6"/><rect x="158" y="146" width="40" height="28" rx="6"/><path d="M142 158 L158 158"/></g>
    <path d="M150 168 l-4 16 l8 0" fill="none" stroke="#c99478" stroke-width="3" stroke-linecap="round"/>
    <path d="M136 206 Q150 ${mood === 'smile' ? 214 : mood === 'angry' ? 200 : 206} 164 206" fill="none" stroke="#8a4a3a" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

// 일러스트 이미지가 있으면 우선 사용 (assets/characters/manifest.js 에 등록)
// crop: 'face' 면 얼굴 부분만 (썸네일용)
function render(key, mood = 'normal', crop) {
  const imgs = (window.CHAR_IMAGES || {})[key];
  if (imgs && imgs.length) {
    const m = imgs.includes(mood) ? mood : imgs.includes('normal') ? 'normal' : null;
    if (m) {
      const st = crop === 'face' ? 'width:100%;height:100%;object-fit:cover;object-position:50% 12%' : 'width:100%;height:auto';
      return `<img src="assets/characters/${key}_${m}.png" alt="" style="${st};display:block">`;
    }
  }
  if (key === 'coach') return coach(mood);
  if (key === 'chairman') return chairman(mood);
  return girl(key, mood, crop);
}

window.Portraits = { girl, coach, chairman, render, CHARS };
})();
