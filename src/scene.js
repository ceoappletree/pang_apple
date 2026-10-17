// 게임 그림: 풍경 장면, 인물 초상, 도구·표식 아이콘 (모두 SVG)
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  // 산 능선: 부드러운 봉우리 여러 개
  function ridge(y, amp, seed, w = 400, h = 900) {
    let d = `M0,${h} L0,${y}`;
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const x = (w / n) * i;
      const yy = y - amp * (0.4 + 0.6 * Math.abs(Math.sin(seed * 1.7 + i * 1.3)));
      const cx = x - w / n / 2;
      d += ` Q${cx.toFixed(1)},${(yy - amp * 0.3).toFixed(1)} ${x.toFixed(1)},${yy.toFixed(1)}`;
    }
    return d + ` L${w},${h}Z`;
  }

  // 오름가마: 비탈을 따라 이어진 둥근 칸들 + 굴뚝 연기
  function kiln(x, y, k) {
    let s = '';
    for (let i = 0; i < 6; i++) {
      const cx = x + i * 22, cy = y - i * 9;
      s += `<path d="M${cx - 12},${cy + 6} Q${cx},${cy - 16} ${cx + 12},${cy + 6}Z" fill="#7a4a2c" stroke="#3a2214" stroke-width="2"/>`;
      s += `<path d="M${cx - 5},${cy + 6} Q${cx},${cy - 4} ${cx + 5},${cy + 6}Z" fill="#2a160c"/>`;
    }
    const tx = x + 6 * 22 - 4, ty = y - 6 * 9;
    s += `<rect x="${tx}" y="${ty - 18}" width="10" height="22" fill="#5c3620" stroke="#3a2214" stroke-width="2"/>`;
    s += `<g class="smoke">` +
      [0, 1, 2].map((i) => `<circle cx="${tx + 5}" cy="${ty - 22}" r="${7 + i * 2}" fill="#e9e4dc" opacity=".55" style="animation-delay:${i * 1.2}s"/>`).join('') +
      `</g>`;
    s += `<circle cx="${x - 2}" cy="${y + 2}" r="4" fill="#ffb347" class="fire"/>`;
    return s;
  }

  function vines(y, k) {
    let s = '';
    for (let r = 0; r < 3; r++) {
      const yy = y + r * 46, sc = 1 + r * 0.25;
      s += `<path d="M-10,${yy} L410,${yy - 8}" stroke="#5a3b22" stroke-width="${2 * sc}"/>`;
      for (let x = 10 + r * 9; x < 400; x += 38 * sc) {
        const yy2 = yy - 8 * (x / 400);
        s += `<line x1="${x}" y1="${yy2 - 2}" x2="${x}" y2="${yy2 + 34 * sc}" stroke="#4a2e17" stroke-width="${2.5 * sc}"/>`;
        s += `<ellipse cx="${x + 8 * sc}" cy="${yy2 - 2}" rx="${16 * sc}" ry="${8 * sc}" fill="#4f7a3a"/>`;
        s += `<ellipse cx="${x - 6 * sc}" cy="${yy2 + 2}" rx="${12 * sc}" ry="${7 * sc}" fill="#5f8c44"/>`;
        for (let g = 0; g < 6; g++) {
          const gx = x + 4 * sc + (g % 3) * 4 * sc - 4 * sc, gy = yy2 + 8 * sc + Math.floor(g / 3) * 4.5 * sc + (g % 3 === 1 ? 0 : 0);
          s += `<circle cx="${gx}" cy="${gy}" r="${2.6 * sc}" fill="#5b2f6e"/>`;
        }
        s += `<circle cx="${x + 4 * sc}" cy="${yy2 + 17 * sc}" r="${2.6 * sc}" fill="#4a2459"/>`;
      }
    }
    return s;
  }

  function pines(y, n, seed, col) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = ((seed * 97 + i * 61) % 400);
      const h = 34 + ((seed + i * 7) % 4) * 8;
      s += `<path d="M${x},${y - h} L${x + h * 0.32},${y} L${x - h * 0.32},${y}Z M${x},${y - h * 0.75} L${x + h * 0.4},${y - h * 0.15} L${x - h * 0.4},${y - h * 0.15}Z" fill="${col}"/>`;
    }
    return s;
  }

  function shards(y) {
    const cols = ['#8d9488', '#f1ede2', '#7d8a82', '#e6e0d0'];
    let s = '';
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 44 + (i % 2) * 10, yy = y + (i % 3) * 14;
      s += `<path d="M${x},${yy} l14,-6 l9,8 l-6,9 l-15,1Z" fill="${cols[i % 4]}" stroke="#3b2a1c" stroke-width="1.2"/>`;
      if (i % 2 === 0) s += `<circle cx="${x + 9}" cy="${yy + 1}" r="1.6" fill="#fff" opacity=".9"/>`;
    }
    return s;
  }

  // 장면. kind: title | vineyard | field | kiln | reservoir | mountain
  function scene(kind) {
    const k = ++uid;
    const dusk = kind === 'title' || kind === 'kiln';
    const sky = dusk ? ['#2e2a4a', '#8a5a7a', '#f0b27a'] : kind === 'reservoir' ? ['#7fb2d6', '#bcd9e6', '#f2ead2'] : ['#86b9d9', '#cfe3e6', '#f4e9cc'];
    let s = `<svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" xmlns="${NS}" class="scene-svg">` +
      `<defs><linearGradient id="sk${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".55" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>` +
      `<linearGradient id="wt${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d8fa8"/><stop offset="1" stop-color="#2f5a70"/></linearGradient></defs>` +
      `<rect width="400" height="900" fill="url(#sk${k})"/>`;
    s += dusk
      ? `<circle cx="300" cy="200" r="46" fill="#ffe2a8" opacity=".95"/><circle cx="300" cy="200" r="70" fill="#ffe2a8" opacity=".18"/>`
      : `<circle cx="80" cy="150" r="34" fill="#fff6d6" opacity=".9"/>`;
    if (!dusk) {
      s += `<g class="clouds"><ellipse cx="260" cy="130" rx="46" ry="12" fill="#fff" opacity=".8"/><ellipse cx="290" cy="122" rx="30" ry="12" fill="#fff" opacity=".8"/><ellipse cx="120" cy="230" rx="38" ry="9" fill="#fff" opacity=".7"/></g>`;
    }
    const m = dusk ? ['#4a3f66', '#3b3354', '#2d2742'] : ['#8aa3b8', '#6f8c7a', '#5a7a5c'];
    s += `<path d="${ridge(400, 120, 1)}" fill="${m[0]}"/>`;
    s += `<path d="${ridge(470, 80, 2.4)}" fill="${m[1]}"/>`;
    s += pines(500, 9, 3, m[2]);
    s += `<path d="${ridge(540, 50, 4.1)}" fill="${m[2]}"/>`;
    if (kind === 'title' || kind === 'kiln' || kind === 'mountain') {
      s += `<path d="M0,640 Q120,560 260,600 T400,590 L400,900 L0,900Z" fill="${dusk ? '#4b3a2c' : '#7a8a4a'}"/>`;
      s += kiln(150, 610, k);
    }
    if (kind === 'reservoir') {
      s += `<path d="M0,600 Q200,580 400,600 L400,720 Q200,700 0,720Z" fill="url(#wt${k})"/>`;
      s += `<path d="M0,712 Q200,692 400,712 L400,760 Q200,742 0,760Z" fill="#9a8a6a"/>`;
      s += `<g class="ripples"><path d="M60,640 h40 M220,630 h60 M300,670 h30" stroke="#cfe6f0" stroke-width="2" opacity=".7"/></g>`;
      s += `<path d="M0,750 Q200,735 400,750 L400,900 L0,900Z" fill="#7a6a4c"/>`;
      s += shards(780);
    }
    if (kind === 'title' || kind === 'vineyard') {
      s += `<path d="M0,680 Q200,650 400,670 L400,900 L0,900Z" fill="${dusk ? '#3a4a2c' : '#8aa35a'}"/>`;
      s += vines(700, k);
    }
    if (kind === 'field') {
      s += `<path d="M0,640 Q200,610 400,630 L400,900 L0,900Z" fill="#8a6a44"/>`;
      for (let r = 0; r < 5; r++) s += `<path d="M-10,${680 + r * 40} Q200,${670 + r * 40} 410,${680 + r * 40}" stroke="#6e5232" stroke-width="10" fill="none"/>`;
      for (let i = 0; i < 12; i++) s += `<path d="M${20 + i * 34},${690 + (i % 4) * 40} q4,-14 8,0 q4,-12 8,0" fill="#6a9a46"/>`;
      s += shards(820);
    }
    if (kind === 'mountain') {
      s += `<path d="M0,700 Q200,660 400,690 L400,900 L0,900Z" fill="#6a7a44"/>`;
      s += pines(760, 7, 11, '#3f5a32');
      s += shards(820);
    }
    s += `<g class="petals">${[0, 1, 2, 3, 4, 5].map((i) => `<ellipse cx="${30 + i * 66}" cy="-10" rx="4" ry="2.5" fill="${dusk ? '#f6c' : '#fff'}" opacity=".7" style="animation-delay:${i * 1.3}s;animation-duration:${7 + (i % 3)}s"/>`).join('')}</g>`;
    return s + '</svg>';
  }

  // 인물 초상(상반신)
  function portrait(id) {
    const c = G.CAST[id];
    if (!c || !c.skin) return '';
    let s = `<svg viewBox="0 0 120 140" xmlns="${NS}" class="portrait-svg">`;
    s += `<path d="M10,140 Q14,98 60,94 Q106,98 110,140Z" fill="${c.shirt}" stroke="#2a1d14" stroke-width="3"/>`;
    s += `<path d="M48,94 L60,112 L72,94" fill="none" stroke="#2a1d14" stroke-width="2.5"/>`;
    s += `<rect x="50" y="78" width="20" height="20" rx="6" fill="${c.skin}" stroke="#2a1d14" stroke-width="3"/>`;
    if (c.long) s += `<path d="M28,52 Q24,98 40,104 L80,104 Q96,98 92,52Z" fill="${c.hair}" stroke="#2a1d14" stroke-width="3"/>`;
    s += `<ellipse cx="60" cy="56" rx="30" ry="33" fill="${c.skin}" stroke="#2a1d14" stroke-width="3"/>`;
    s += `<ellipse cx="29" cy="60" rx="5" ry="8" fill="${c.skin}" stroke="#2a1d14" stroke-width="2.5"/><ellipse cx="91" cy="60" rx="5" ry="8" fill="${c.skin}" stroke="#2a1d14" stroke-width="2.5"/>`;
    // 머리
    s += c.long
      ? `<path d="M30,50 Q34,18 60,18 Q88,18 90,50 Q76,34 60,38 Q44,32 30,50Z" fill="${c.hair}" stroke="#2a1d14" stroke-width="3"/>`
      : `<path d="M31,50 Q30,22 60,20 Q90,22 89,50 Q84,36 72,34 Q60,40 46,34 Q36,38 31,50Z" fill="${c.hair}" stroke="#2a1d14" stroke-width="3"/>`;
    // 눈·볼·입
    s += `<ellipse cx="48" cy="60" rx="3.2" ry="4.2" fill="#2a1d14"/><ellipse cx="72" cy="60" rx="3.2" ry="4.2" fill="#2a1d14"/>`;
    s += `<circle cx="49" cy="58.5" r="1.1" fill="#fff"/><circle cx="73" cy="58.5" r="1.1" fill="#fff"/>`;
    s += `<path d="M42,50 q6,-4 12,0 M66,50 q6,-4 12,0" stroke="#2a1d14" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="42" cy="71" rx="6" ry="3.5" fill="#e8846c" opacity=".45"/><ellipse cx="78" cy="71" rx="6" ry="3.5" fill="#e8846c" opacity=".45"/>`;
    s += `<path d="M52,76 Q60,83 68,76" stroke="#2a1d14" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if (c.glasses) s += `<circle cx="48" cy="60" r="9" fill="none" stroke="#2a1d14" stroke-width="2.4"/><circle cx="72" cy="60" r="9" fill="none" stroke="#2a1d14" stroke-width="2.4"/><path d="M57,60 h6" stroke="#2a1d14" stroke-width="2.4"/>`;
    if (c.hat === 'straw') {
      s += `<ellipse cx="60" cy="34" rx="46" ry="11" fill="#e2c27a" stroke="#2a1d14" stroke-width="3"/>`;
      s += `<path d="M36,34 Q38,6 60,6 Q82,6 84,34Z" fill="#e8cd8a" stroke="#2a1d14" stroke-width="3"/>`;
      s += `<path d="M37,28 Q60,34 83,28" stroke="#8a3f2a" stroke-width="5" fill="none"/>`;
    } else if (c.hat === 'cap') {
      s += `<path d="M30,40 Q30,12 60,12 Q90,12 90,40Z" fill="#3f6b8a" stroke="#2a1d14" stroke-width="3"/>`;
      s += `<path d="M30,40 Q60,46 104,36 L100,44 Q60,52 30,44Z" fill="#2f5470" stroke="#2a1d14" stroke-width="3"/>`;
    }
    return s + '</svg>';
  }

  // 도구 아이콘
  const ICON = {
    pick: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M14,52 L40,22" stroke="#8a5a32" stroke-width="7" stroke-linecap="round"/><path d="M14,52 L40,22" stroke="#b07a48" stroke-width="3" stroke-linecap="round"/><path d="M22,14 Q42,8 56,26 Q44,18 36,24 Q30,18 22,14Z" fill="#9aa4ad" stroke="#2a1d14" stroke-width="2.5" stroke-linejoin="round"/><circle cx="38" cy="22" r="4" fill="#5d666e" stroke="#2a1d14" stroke-width="2"/></svg>`,
    trowel: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M30,32 L12,52" stroke="#8a5a32" stroke-width="8" stroke-linecap="round"/><path d="M30,32 L12,52" stroke="#c08a52" stroke-width="3.5" stroke-linecap="round"/><path d="M28,30 L52,8 Q60,22 50,40 Q40,44 28,30Z" fill="#c9d1d8" stroke="#2a1d14" stroke-width="2.5" stroke-linejoin="round"/><path d="M34,30 L50,14" stroke="#fff" stroke-width="2" opacity=".7"/></svg>`,
    probe: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M32,16 L32,58" stroke="#5d666e" stroke-width="4" stroke-linecap="round"/><path d="M32,48 L32,58" stroke="#2a1d14" stroke-width="4" stroke-linecap="round"/><path d="M18,14 L46,14" stroke="#8a5a32" stroke-width="8" stroke-linecap="round"/><path d="M18,14 L46,14" stroke="#c08a52" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="58" r="3" fill="#ffd36b"/></svg>`,
    book: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M8,14 Q20,8 32,14 Q44,8 56,14 L56,52 Q44,46 32,52 Q20,46 8,52Z" fill="#f3e9d2" stroke="#2a1d14" stroke-width="3"/><path d="M32,14 V52" stroke="#2a1d14" stroke-width="3"/><path d="M14,22 h12 M14,30 h12 M38,22 h12 M38,30 h12" stroke="#8a6a44" stroke-width="2.5"/></svg>`,
    home: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M8,30 L32,10 L56,30" fill="none" stroke="#2a1d14" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14,28 V54 H50 V28" fill="#e8cd8a" stroke="#2a1d14" stroke-width="4"/><rect x="27" y="38" width="10" height="16" fill="#8a5a32" stroke="#2a1d14" stroke-width="3"/></svg>`,
    road: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M22,58 L28,10 H36 L42,58Z" fill="#6b6f74" stroke="#2a1d14" stroke-width="3"/><path d="M32,16 V24 M32,32 V40 M32,48 V56" stroke="#ffd36b" stroke-width="3"/></svg>`,
    sound: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M10,24 H22 L36,12 V52 L22,40 H10Z" fill="#e8cd8a" stroke="#2a1d14" stroke-width="4" stroke-linejoin="round"/><path d="M44,22 Q52,32 44,42 M50,14 Q64,32 50,50" fill="none" stroke="#2a1d14" stroke-width="4" stroke-linecap="round"/></svg>`,
    mute: `<svg viewBox="0 0 64 64" xmlns="${NS}"><path d="M10,24 H22 L36,12 V52 L22,40 H10Z" fill="#c9bfa8" stroke="#2a1d14" stroke-width="4" stroke-linejoin="round"/><path d="M44,24 L58,40 M58,24 L44,40" stroke="#b8461f" stroke-width="5" stroke-linecap="round"/></svg>`,
    scroll: `<svg viewBox="0 0 64 64" xmlns="${NS}"><rect x="14" y="12" width="36" height="40" fill="#f3e9d2" stroke="#2a1d14" stroke-width="3"/><rect x="10" y="8" width="44" height="8" rx="4" fill="#8a5a32" stroke="#2a1d14" stroke-width="3"/><rect x="10" y="48" width="44" height="8" rx="4" fill="#8a5a32" stroke="#2a1d14" stroke-width="3"/><path d="M20,24 h24 M20,32 h24 M20,40 h16" stroke="#8a6a44" stroke-width="2.5"/></svg>`,
  };

  // 지도 표식
  function pin(kind, label) {
    const fill = { kiln: '#8a3f2a', water: '#2f6fd0', hill: '#4f7a3a', rumor: '#e8b64a' }[kind];
    const glyph = {
      kiln: '<path d="M14,24 Q22,8 30,24Z" fill="#f3e9d2"/><rect x="26" y="11" width="4" height="8" fill="#f3e9d2"/>',
      water: '<path d="M22,8 Q30,20 22,26 Q14,20 22,8Z" fill="#f3e9d2"/>',
      hill: '<path d="M10,26 L18,12 L24,20 L28,14 L36,26Z" fill="#f3e9d2"/>',
      rumor: '<text x="22" y="25" font-size="18" text-anchor="middle" fill="#2a1d14" font-weight="700">?</text>',
    }[kind];
    return `<div class="pin2 pin-${kind}"><svg viewBox="0 0 44 54"><path d="M22,52 Q4,30 4,20 A18,18 0 1 1 40,20 Q40,30 22,52Z" fill="${fill}" stroke="#2a1d14" stroke-width="3"/><g transform="translate(0,0)">${glyph}</g></svg>${label ? `<b>${label}</b>` : ''}</div>`;
  }

  // 탐사대(강석진 씨) 표식
  function walker() {
    return `<div class="walker"><div class="walker-face">${portrait('kang')}</div><i></i></div>`;
  }

  // 그림 지도: 지도 서버를 쓸 수 없을 때 까는 상판리 그림(실제 지형과 다를 수 있음)
  function villageMap(pts, b) {
    const W = 1000, H = 1000;
    const X = (lng) => ((lng - b[0][1]) / (b[1][1] - b[0][1])) * W;
    const Y = (lat) => ((b[1][0] - lat) / (b[1][0] - b[0][0])) * H;
    const R = pts.reservoir, Kp = pts.kiln, M = pts.monastery;
    let s = `<rect width="${W}" height="${H}" fill="#c9d6a2"/>`;
    // 밭 무늬
    for (let i = 0; i < 26; i++) {
      const x = (i * 137) % W, y = (i * 241) % H, w = 70 + (i % 4) * 22, h = 46 + (i % 3) * 18;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${i % 3 ? '#d6dfae' : '#bccb8e'}" stroke="#a8b77a" stroke-width="2" transform="rotate(${(i % 5) * 7 - 14} ${x} ${y})"/>`;
    }
    // 산(가마터 서쪽 비탈, 수도원 뒷산, 북쪽 능선)
    const hill = (cx, cy, r, c1, c2) => {
      let h = '';
      for (let k = 4; k >= 1; k--) h += `<ellipse cx="${cx}" cy="${cy}" rx="${r * k / 4 * 1.25}" ry="${r * k / 4}" fill="${k % 2 ? c1 : c2}" stroke="#6f8a52" stroke-width="2" opacity=".95"/>`;
      return h;
    };
    s += hill(X(Kp.lng) - 120, Y(Kp.lat) - 10, 230, '#9db36e', '#8aa65e');
    s += hill(X(M.lng) + 40, Y(M.lat) + 60, 170, '#9db36e', '#87a35a');
    s += hill(W * 0.5, 40, 200, '#a9bd78', '#93ad66');
    // 소나무
    for (let i = 0; i < 70; i++) {
      const x = (i * 173 + 31) % W, y = (i * 97 + 57) % H;
      const near = Math.hypot(x - X(Kp.lng) + 120, y - Y(Kp.lat)) < 260 || Math.hypot(x - X(M.lng) - 40, y - Y(M.lat) - 60) < 190;
      if (!near) continue;
      s += `<path d="M${x},${y - 16} l10,18 h-20z" fill="#4f7a3a" stroke="#2f4a22" stroke-width="1.5"/>`;
    }
    // 개울과 길
    s += `<path d="M${X(R.lng) + 60},${Y(R.lat) + 40} C${X(R.lng) + 200},${Y(R.lat) + 160} ${W * 0.85},${H * 0.6} ${W},${H * 0.7}" fill="none" stroke="#7fb2d6" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="M0,${H * 0.62} C${W * 0.3},${H * 0.55} ${W * 0.55},${H * 0.66} ${W},${H * 0.5}" fill="none" stroke="#efe2bf" stroke-width="16" stroke-linecap="round"/>`;
    s += `<path d="M${X(Kp.lng)},${Y(Kp.lat) + 40} Q${(X(Kp.lng) + X(R.lng)) / 2},${Y(R.lat) + 120} ${X(R.lng) - 40},${Y(R.lat) + 50}" fill="none" stroke="#efe2bf" stroke-width="9" stroke-dasharray="1 0" stroke-linecap="round"/>`;
    s += `<path d="M${X(M.lng)},${Y(M.lat)} Q${X(M.lng) + 80},${H * 0.62} ${W * 0.62},${H * 0.6}" fill="none" stroke="#efe2bf" stroke-width="8" stroke-linecap="round"/>`;
    // 저수지
    const rx = X(R.lng), ry = Y(R.lat);
    s += `<path d="M${rx - 110},${ry - 20} C${rx - 90},${ry - 90} ${rx + 40},${ry - 100} ${rx + 120},${ry - 50} C${rx + 160},${ry - 10} ${rx + 90},${ry + 60} ${rx + 10},${ry + 50} C${rx - 60},${ry + 70} ${rx - 130},${ry + 30} ${rx - 110},${ry - 20}Z" fill="#6fa7c8" stroke="#3f7396" stroke-width="5"/>`;
    s += `<path d="M${rx - 60},${ry - 30} h40 M${rx + 20},${ry} h50 M${rx - 20},${ry + 25} h30" stroke="#cfe6f0" stroke-width="4" stroke-linecap="round"/>`;
    // 포도밭
    for (let v = 0; v < 6; v++) {
      const vx = W * 0.58 + (v % 3) * 95, vy = H * 0.7 + Math.floor(v / 3) * 80;
      s += `<rect x="${vx}" y="${vy}" width="80" height="60" rx="4" fill="#cbd59a" stroke="#8a9a5a" stroke-width="2"/>`;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) s += `<circle cx="${vx + 8 + c * 13}" cy="${vy + 9 + r * 14}" r="4" fill="#6b3f7a"/>`;
    }
    // 마을 집
    for (let i = 0; i < 12; i++) {
      const hx = W * 0.3 + (i % 4) * 46 + (i * 13) % 20, hy = H * 0.74 + Math.floor(i / 4) * 44;
      s += `<path d="M${hx},${hy} l16,-14 l16,14 v16 h-32z" fill="#f3e9d2" stroke="#2a1d14" stroke-width="2"/><path d="M${hx - 3},${hy + 1} l19,-17 l19,17" fill="none" stroke="#8a3f2a" stroke-width="5"/>`;
    }
    s += `<text x="${W - 20}" y="${H - 20}" text-anchor="end" font-size="22" fill="#5a4a2a" font-family="sans-serif">그림 지도 · 실제 지형과 다를 수 있어요</text>`;
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.setAttribute('preserveAspectRatio', 'none');
    el.innerHTML = s;
    return el;
  }

  G.scene = { scene, portrait, ICON, pin, walker, villageMap };
})();
