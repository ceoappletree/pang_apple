// 도자기 SVG 그림. 모든 그림은 viewBox 0 0 100 100 기준입니다.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  // 반쪽 윤곽을 좌우로 펼쳐 부드러운 닫힌 경로로 만든다.
  function silhouette(shape) {
    const right = shape.map(([x, y]) => [50 + x, y]);
    const left = shape.slice().reverse().map(([x, y]) => [50 - x, y]);
    return smooth(right.concat(left.slice(1)), true);
  }

  // Catmull-Rom 곡선 → 베지어 경로
  function smooth(pts, closed) {
    const n = pts.length;
    const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d + (closed ? 'Z' : '');
  }

  const DUCK =
    'M18,52 C16,40 24,30 32,34 C30,22 38,14 46,18 C52,21 52,30 46,34 C56,38 70,36 84,28 ' +
    'C82,40 78,52 68,58 C58,64 34,64 24,60 C20,58 18,56 18,52Z';

  function outline(pot) {
    if (pot.path) return pot.path;
    return pot.custom === 'duck' ? DUCK : silhouette(pot.shape);
  }

  // 무늬. w×h 영역을 채우도록 그린다.
  function motif(pot, w, h) {
    const L = pot.line;
    let s = '';
    switch (pot.motif) {
      case 'comb':
        for (let y = 6; y < h; y += 9) {
          const flip = Math.floor(y / 9) % 2 ? -1 : 1;
          for (let x = 0; x < w + 6; x += 4) {
            s += `<line x1="${x}" y1="${y}" x2="${x + 3 * flip}" y2="${y + 6}" stroke="${L}" stroke-width="1"/>`;
          }
        }
        break;
      case 'bands':
        for (let y = 10; y < h; y += 14) {
          s += `<path d="M0,${y} ${wave(w, y, 2.2)}" fill="none" stroke="${L}" stroke-width="1"/>`;
          s += `<line x1="0" y1="${y + 5}" x2="${w}" y2="${y + 5}" stroke="${L}" stroke-width="0.8"/>`;
        }
        break;
      case 'plain':
        for (let y = 12; y < h; y += 16) {
          s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${L}" stroke-width="0.8" opacity="0.6"/>`;
        }
        break;
      case 'duck':
        for (let x = 6; x < w; x += 10) {
          s += `<path d="M${x},${h * 0.3} q4,6 0,12" fill="none" stroke="${L}" stroke-width="1"/>`;
        }
        break;
      case 'crane':
        for (let y = 14, r = 0; y < h + 10; y += 26, r++) {
          for (let x = r % 2 ? 26 : 10; x < w + 10; x += 32) {
            s += `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#f3f2e8" stroke-width="1.4"/>`;
            s += `<path d="M${x - 5},${y + 1} l5,-3 l5,3 M${x},${y - 2} l1,-4" fill="none" stroke="#f3f2e8" stroke-width="1.6"/>`;
            s += `<circle cx="${x + 1}" cy="${y - 6}" r="0.9" fill="#2b2b2b"/>`;
            s += `<path d="M${x + 12},${y + 12} c3,-3 6,0 4,2 c3,0 4,3 1,4" fill="none" stroke="#f3f2e8" stroke-width="1.1"/>`;
            s += `<path d="M${x + 13},${y + 13} l4,2" stroke="#2b2b2b" stroke-width="0.9"/>`;
          }
        }
        break;
      case 'ridges':
        for (let x = 4; x < w; x += 7) {
          s += `<path d="M${x},0 Q${x + 3},${h / 2} ${x},${h}" fill="none" stroke="${L}" stroke-width="1" opacity="0.7"/>`;
        }
        break;
      case 'lotus':
        for (let x = 0; x < w + 10; x += 11) {
          s += `<path d="M${x},${h} Q${x - 5},${h - 18} ${x + 5},${h - 26} Q${x + 15},${h - 18} ${x + 10},${h}" fill="none" stroke="${L}" stroke-width="1.1"/>`;
        }
        break;
      case 'fish':
        for (let y = 18, r = 0; y < h + 10; y += 30, r++) {
          for (let x = r % 2 ? 4 : 18; x < w + 10; x += 34) {
            s += `<path d="M${x},${y} q12,-10 24,0 q-12,10 -24,0 M${x + 24},${y} l6,-5 l0,10 z" fill="none" stroke="${L}" stroke-width="1.8" stroke-linejoin="round"/>`;
            s += `<circle cx="${x + 18}" cy="${y - 1.5}" r="1.2" fill="${L}"/>`;
            s += `<path d="M${x + 6},${y + 1} l4,-3 m2,4 l4,-4" stroke="${L}" stroke-width="1"/>`;
          }
        }
        break;
      case 'moon':
        s += `<ellipse cx="${w * 0.35}" cy="${h * 0.35}" rx="${w * 0.3}" ry="${h * 0.25}" fill="#fff" opacity="0.55"/>`;
        s += `<path d="M0,${h * 0.52} Q${w / 2},${h * 0.56} ${w},${h * 0.5}" fill="none" stroke="${L}" stroke-width="0.8"/>`;
        break;
      case 'plum':
        for (let x = -10; x < w; x += 40) {
          s += `<path d="M${x},${h} q8,-30 22,-46 m-12,22 q10,-4 18,-14" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
          for (const [dx, dy] of [[14, -30], [22, -46], [28, -36], [8, -20]]) {
            s += `<circle cx="${x + dx}" cy="${h + dy}" r="2.4" fill="none" stroke="${L}" stroke-width="1.2"/>`;
          }
          s += `<path d="M${x + 32},${h} l0,-${h * 0.8} m0,${h * 0.3} l7,-8 m-7,22 l-7,-6" fill="none" stroke="${L}" stroke-width="1.6"/>`;
        }
        break;
      case 'inhwa': // 인화: 작은 국화 도장을 촘촘히 찍고 흰 흙을 메운 무늬
        for (let y = 6, r = 0; y < h + 4; y += 7, r++) {
          if (r % 4 === 3) {
            s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#f1ece0" stroke-width="1.6"/>`;
            continue;
          }
          for (let x = r % 2 ? 3.5 : 0; x < w + 4; x += 7) {
            s += `<circle cx="${x}" cy="${y}" r="2.1" fill="none" stroke="#f1ece0" stroke-width="1.1"/>`;
            s += `<circle cx="${x}" cy="${y}" r="0.6" fill="#f1ece0"/>`;
          }
        }
        break;
      case 'dragon': // 흑백상감 용무늬
        for (let y = 18; y < h + 20; y += 34) {
          s += `<path d="M-4,${y} C${w * 0.2},${y - 14} ${w * 0.35},${y + 14} ${w * 0.55},${y} S${w * 0.85},${y - 12} ${w + 4},${y}" fill="none" stroke="#2b2b2b" stroke-width="5"/>`;
          s += `<path d="M-4,${y} C${w * 0.2},${y - 14} ${w * 0.35},${y + 14} ${w * 0.55},${y} S${w * 0.85},${y - 12} ${w + 4},${y}" fill="none" stroke="#f1ece0" stroke-width="2" stroke-dasharray="2 3"/>`;
          for (let x = 8; x < w; x += 22) s += `<path d="M${x},${y + 10} l3,6 l3,-6" fill="none" stroke="#f1ece0" stroke-width="1.2"/>`;
        }
        break;
      case 'rays':
        for (let x = 0; x < w; x += 5) {
          s += `<line x1="${w / 2}" y1="${h * 1.4}" x2="${x}" y2="0" stroke="${L}" stroke-width="0.8" opacity="0.7"/>`;
        }
        break;
    }
    return s;
  }

  function wave(w, y, a) {
    let d = '';
    for (let x = 0; x <= w; x += 4) d += `L${x},${y + (x / 4) % 2 * a} `;
    return d;
  }

  // 몸통 뒤(back)와 앞(front)에 덧그리는 부분
  function extra(pot) {
    const c = pot.body, L = pot.line;
    if (pot.extra === 'windows') {
      return {
        back: '',
        front: '<rect x="45" y="62" width="4" height="9" fill="#2c3133"/><rect x="51" y="62" width="4" height="9" fill="#2c3133"/>' +
          '<rect x="39" y="64" width="3" height="8" fill="#2c3133" opacity="0.7"/><rect x="58" y="64" width="3" height="8" fill="#2c3133" opacity="0.7"/>',
      };
    }
    if (pot.extra === 'legs') {
      return {
        back: `<path d="M27,56 L23,80 L29,80 L33,58Z" fill="${c}" stroke="${L}" stroke-width="1"/>` +
          `<path d="M47,60 L46,84 L54,84 L53,60Z" fill="${c}" stroke="${L}" stroke-width="1"/>` +
          `<path d="M73,56 L77,80 L71,80 L67,58Z" fill="${c}" stroke="${L}" stroke-width="1"/>`,
        front: '',
      };
    }
    if (pot.extra === 'stool') {
      return {
        back: '',
        front: `<ellipse cx="38" cy="50" rx="6" ry="9" fill="#2c2a26"/><ellipse cx="62" cy="50" rx="6" ry="9" fill="#2c2a26"/>` +
          `<ellipse cx="50" cy="18" rx="22" ry="3" fill="none" stroke="${L}" stroke-width="1"/>`,
      };
    }
    if (pot.custom === 'duck') {
      return {
        back: `<path d="M36,62 L32,74 L68,74 L62,62Z" fill="${c}" stroke="${L}" stroke-width="1"/>` +
          `<path d="M28,80 L72,80 L66,74 L34,74Z" fill="${c}" stroke="${L}" stroke-width="1"/>`,
        front: `<path d="M46,20 C50,19 54,21 56,24 L48,25Z" fill="${L}"/>` +
          `<circle cx="42" cy="22" r="1.4" fill="#222"/>` +
          `<ellipse cx="62" cy="38" rx="5" ry="2" fill="#3a3733"/>`,
      };
    }
    return { back: '', front: '' };
  }

  // 조각 경계: 위(0) / 왼쪽 몸통(1) / 오른쪽 몸통(2) /아래(3). 들쭉날쭉한 깨진 선.
  function zig(x1, y1, x2, y2, n, amp, seed) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : ((seed * 7 + i * 13) % 5 - 2) / 2 * amp;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      pts.push(x1 === x2 ? [x + j, y] : [x, y + j]);
    }
    return pts;
  }
  const TOP = zig(0, 38, 100, 38, 10, 3, 1);
  const BOT = zig(0, 70, 100, 70, 10, 3, 2);
  const MID = zig(50, 38, 50, 70, 5, 3, 3);
  MID[0] = TOP[5];
  MID[MID.length - 1] = BOT[5];
  const poly = (pts) => 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z';
  const PIECE_PATHS = [
    poly([[-5, -5], [105, -5], ...TOP.slice().reverse()]),
    poly([...TOP.slice(0, 6), ...MID, ...BOT.slice(0, 6).reverse()]),
    poly([...TOP.slice(5), ...BOT.slice(5).reverse(), ...MID.slice().reverse()]),
    poly([...BOT, [105, 105], [-5, 105]]),
  ];

  // 완성 도자기(또는 일부 조각만) SVG 문자열.
  // pieces: [bool×4] — 보이는 조각. 없으면 전부.
  function potSVG(id, pieces, opts = {}) {
    const pot = G.POTS[id];
    const k = ++uid;
    const all = !pieces || pieces.every(Boolean);
    const out = outline(pot);
    const grad = `<radialGradient id="sh${k}" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient>`;
    let clip = '';
    if (!all) {
      clip = `<clipPath id="pc${k}">` + PIECE_PATHS.filter((_, i) => pieces[i]).map((d) => `<path d="${d}"/>`).join('') + '</clipPath>';
    }
    const body =
      `<g clip-path="url(#ol${k})"><rect width="100" height="100" fill="${pot.body}"/>${motif(pot, 100, 100)}` +
      `<rect width="100" height="100" fill="url(#sh${k})"/></g>` +
      `<path d="${out}" fill="none" stroke="${pot.line}" stroke-width="1.2"/>`;
    const ex = extra(pot);
    const filled = ex.back + body + ex.front;
    const cracks = !all || opts.cracks
      ? PIECE_PATHS.map((d, i) => (!pieces || pieces[i] ? `<path d="${d}" fill="none" stroke="rgba(60,40,20,.55)" stroke-width="0.8"/>` : '')).join('')
      : '';
    const ghost = all ? '' : `<path d="${out}" fill="rgba(0,0,0,.06)" stroke="rgba(0,0,0,.3)" stroke-width="1" stroke-dasharray="3 2"/>`;
    return (
      `<svg viewBox="0 0 100 100" xmlns="${NS}" class="pot-svg">` +
      `<defs>${grad}<clipPath id="ol${k}"><path d="${out}"/></clipPath>${clip}</defs>` +
      ghost +
      (all ? filled : `<g clip-path="url(#pc${k})">${filled}<g clip-path="url(#ol${k})">${cracks}</g></g>`) +
      (all && opts.cracks ? `<g clip-path="url(#ol${k})">${cracks}</g>` : '') +
      `</svg>`
    );
  }

  // 발굴판에 묻힌 조각 무늬(사각 영역을 채우는 유약 표면).
  function shardFill(id, w, h) {
    const pot = G.POTS[id];
    return `<rect width="${w}" height="${h}" fill="${pot.body}"/>${motif(pot, w, h)}`;
  }

  // 명문 조각, 가마 도구 같은 따로 모으는 발굴품
  // 답사품: 들쭉날쭉한 조각 모양에 바탕색과 무늬
  function findMotif(item, w, h) {
    if (item.label) {
      const fs = Math.min(w, h) * 0.2;
      return `<text x="${w / 2}" y="${h / 2}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" fill="#3a5a9a" font-family="serif" font-weight="700">${item.label}</text>`;
    }
    if (item.motif === 'blue') {
      return `<path d="M${w * 0.15},${h * 0.7} q${w * 0.2},-${h * 0.45} ${w * 0.45},-${h * 0.4} m-${w * 0.2},${h * 0.05} q${w * 0.05},-${h * 0.2} ${w * 0.25},-${h * 0.25}" fill="none" stroke="#2f4f9a" stroke-width="${Math.max(2, w * 0.035)}" stroke-linecap="round"/>` +
        `<circle cx="${w * 0.62}" cy="${h * 0.3}" r="${w * 0.06}" fill="none" stroke="#2f4f9a" stroke-width="${Math.max(1.5, w * 0.025)}"/>`;
    }
    if (item.motif === 'plain') return '';
    return motif({ motif: item.motif, line: '#3d5c4d' }, w, h);
  }
  function extraSVG(item) {
    if (item.kind === 'find') {
      const k = ++uid;
      return `<svg viewBox="0 0 100 100" xmlns="${NS}" class="pot-svg"><defs><clipPath id="fd${k}"><path d="M16,30 L46,12 L80,22 L90,58 L64,88 L24,80 L10,54Z"/></clipPath></defs>` +
        `<g clip-path="url(#fd${k})"><rect width="100" height="100" fill="${item.fill}"/>${findMotif(item, 100, 100)}</g>` +
        `<path d="M16,30 L46,12 L80,22 L90,58 L64,88 L24,80 L10,54Z" fill="none" stroke="rgba(0,0,0,.4)" stroke-width="2"/></svg>`;
    }
    if (item.kind === 'inscription') {
      const t = item.label;
      const fs = t.length > 3 ? 13 : t.length > 1 ? 24 : 40;
      const lines = t.length > 3 ? [t.slice(0, 3), t.slice(3)] : [t];
      const text = lines.map((l, i) => `<text x="50" y="${54 + (i - (lines.length - 1) / 2) * (fs + 4)}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" fill="#2b2b2b" font-family="serif" font-weight="700">${l}</text>`).join('');
      return `<svg viewBox="0 0 100 100" xmlns="${NS}" class="pot-svg"><path d="M14,22 L58,10 L88,30 L84,78 L46,90 L12,70Z" fill="#9aa293" stroke="#5f6658" stroke-width="2"/>` +
        `<path d="M24,30 L56,20 L78,36 L75,70 L48,80 L22,64Z" fill="#e9e3d3"/>${text}</svg>`;
    }
    if (item.id === 'dochim') {
      return `<svg viewBox="0 0 100 100" xmlns="${NS}" class="pot-svg"><path d="M30,40 L70,40 L64,72 L36,72Z" fill="#a8835e" stroke="#6d5034" stroke-width="2"/><ellipse cx="50" cy="40" rx="20" ry="5" fill="#b9946c" stroke="#6d5034" stroke-width="2"/><path d="M38,56 h24" stroke="#6d5034" stroke-width="1.5"/></svg>`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="${NS}" class="pot-svg"><path d="M22,30 L78,30 L74,80 L26,80Z" fill="#9b8d7c" stroke="#5e5346" stroke-width="2"/><ellipse cx="50" cy="30" rx="28" ry="7" fill="#7d705f" stroke="#5e5346" stroke-width="2"/><path d="M30,48 q20,6 40,0 M30,62 q20,6 40,0" fill="none" stroke="#5e5346" stroke-width="1.5"/></svg>`;
  }
  function extraFill(item, w, h) {
    if (item.kind === 'find') return `<rect width="${w}" height="${h}" fill="${item.fill}"/>${findMotif(item, w, h)}`;
    if (item.kind === 'inscription') {
      return `<rect width="${w}" height="${h}" fill="#9aa293"/><rect x="3" y="3" width="${w - 6}" height="${h - 6}" fill="#e9e3d3"/>` +
        `<text x="${w / 2}" y="${h / 2}" font-size="${Math.min(w, h) * (item.label.length > 2 ? 0.28 : 0.55)}" text-anchor="middle" dominant-baseline="middle" fill="#2b2b2b" font-family="serif" font-weight="700">${item.label.length > 4 ? item.label.slice(0, 2) + '…' : item.label}</text>`;
    }
    const c = item.id === 'dochim' ? '#a8835e' : '#9b8d7c';
    return `<rect width="${w}" height="${h}" fill="${c}"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.3}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2"/>`;
  }

  G.art = { potSVG, shardFill, extraSVG, extraFill, PIECE_NAMES: ['입·어깨 조각', '왼쪽 몸통 조각', '오른쪽 몸통 조각', '굽·바닥 조각'] };
})();
