// 캐릭터 초상화 (SVG 코드로 직접 그림)
(() => {
'use strict';

const SKIN = '#ffe3d1', SKIN_SH = '#f4c4ad';

const BODY = 'M30 340 Q42 262 112 250 L188 250 Q258 262 270 340 Z';
const CHARS = {
  // 여배우 차유나: 긴 웨이브 머리, 버건디 오프숄더 드레스
  yuna: {
    hair: '#3b2216', hairHi: '#6b4130', eye: ['#4a1d2a', '#b5546a'], style: 'wave',
    outfit() {
      return `<path d="${BODY}" fill="${SKIN}"/>
        <path d="M34 340 Q46 296 92 286 Q150 300 208 286 Q254 296 266 340 Z" fill="#7a1530"/>
        <path d="M92 286 Q150 306 208 286" fill="none" stroke="#a42a4a" stroke-width="5"/>
        <path d="M122 252 Q150 284 178 252" fill="none" stroke="#f4efe6" stroke-width="4" stroke-dasharray="1 7" stroke-linecap="round"/>`;
    },
    acc: `<path d="M92 184 l0 14" stroke="#e8c35a" stroke-width="2"/><circle cx="92" cy="202" r="5" fill="#f4efe6"/>
      <path d="M208 184 l0 14" stroke="#e8c35a" stroke-width="2"/><circle cx="208" cy="202" r="5" fill="#f4efe6"/>
      <circle cx="172" cy="196" r="1.8" fill="#5a3a2a"/>`,
  },
  // 여대생 서지우: 단발 + 동그란 안경, 니트 가디건
  jiwoo: {
    hair: '#2a1f1a', hairHi: '#4d3a30', eye: ['#3a2418', '#8a5a3a'], style: 'bob',
    outfit() {
      return `<path d="${BODY}" fill="#e9dcc3"/>
        <path d="M118 250 L150 286 L182 250 Z" fill="#fff"/>
        <path d="M118 250 L132 340 M182 250 L168 340" stroke="#d4c3a3" stroke-width="5"/>
        <circle cx="140" cy="300" r="3" fill="#b89f78"/><circle cx="140" cy="322" r="3" fill="#b89f78"/>
        <path d="M206 262 L232 340" stroke="#5a7a9a" stroke-width="9" stroke-linecap="round"/>`;
    },
    acc: `<g fill="none" stroke="#5a4a40" stroke-width="3.5"><circle cx="122" cy="156" r="22"/><circle cx="178" cy="156" r="22"/><path d="M144 154 Q150 150 156 154 M100 152 L90 148 M200 152 L210 148"/></g>
      <path d="M190 104 l16 -6" stroke="#ffd54a" stroke-width="5" stroke-linecap="round"/>`,
  },
  // 치어리더 박하린: 트윈테일, 애플즈 응원복
  harin: {
    hair: '#d99a48', hairHi: '#f5cf86', eye: ['#7a3b10', '#e08a3c'], style: 'twin',
    outfit() {
      return `<path d="${BODY}" fill="#d81e34"/>
        <path d="M112 250 Q150 272 188 250 L184 262 Q150 284 116 262 Z" fill="#fff"/>
        <path d="M44 318 Q150 296 256 318" fill="none" stroke="#fff" stroke-width="7"/>
        <text x="150" y="326" text-anchor="middle" font-size="22" font-weight="900" fill="#fff" font-family="sans-serif">APPLES</text>`;
    },
    acc: `<g transform="translate(150 66)"><path d="M0 0 L-30 -16 L-30 16 Z M0 0 L30 -16 L30 16 Z" fill="#e5484d"/><circle r="8" fill="#ff6b6b"/></g>
      <path d="M200 188 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" fill="#ffd54a"/>`,
  },
  // 여심판 정세아: 단정한 머리 + 심판 모자, 검정 유니폼
  sea: {
    hair: '#141418', hairHi: '#33333d', eye: ['#1d2a3a', '#4f6f8f'], style: 'cap',
    outfit() {
      return `<path d="${BODY}" fill="#1c1f2b"/>
        <path d="M118 250 L150 280 L182 250" fill="#cfd3dc"/>
        <rect x="190" y="282" width="38" height="20" rx="4" fill="#3b4258"/>
        <text x="209" y="296" text-anchor="middle" font-size="11" font-weight="900" fill="#fff" font-family="sans-serif">UMP</text>
        <path d="M70 300 L82 340 M230 300 L218 340" stroke="#3b4258" stroke-width="5"/>`;
    },
    acc: `<path d="M86 128 Q86 60 150 58 Q214 60 214 128 Z" fill="#1b1b22"/>
      <path d="M84 126 Q150 108 216 126 Q226 134 240 130 Q226 142 210 138 Q150 122 90 138 Z" fill="#0e0e14"/>
      <text x="150" y="104" text-anchor="middle" font-size="16" font-weight="900" fill="#cfd3dc" font-family="sans-serif">KBL</text>`,
  },
  // 여성팬 한소미: 짧은 머리, 등번호 27 유니폼
  somi: {
    hair: '#6b3a24', hairHi: '#9a5a38', eye: ['#5a2a1a', '#d2894a'], style: 'short',
    outfit() {
      return `<path d="${BODY}" fill="#f4f4f8"/>
        <path d="M112 250 Q150 270 188 250" fill="none" stroke="#d81e34" stroke-width="8"/>
        <path d="M40 300 L70 340 M260 300 L230 340" stroke="#d81e34" stroke-width="8"/>
        <text x="150" y="330" text-anchor="middle" font-size="40" font-weight="900" fill="#d81e34" font-family="sans-serif">27</text>`;
    },
    acc: `<path d="M196 96 l14 -12 l6 16 z" fill="#ffd54a"/>
      <path d="M190 190 c-3 -5 -10 -1 -6 4 l6 6 l6 -6 c4 -5 -3 -9 -6 -4z" fill="#e5484d"/>`,
  },
};

function face() {
  return `<path d="M132 214 L132 262 Q150 272 168 262 L168 214 Z" fill="${SKIN_SH}"/>
    <path d="M150 236 Q140 235 122 219 Q94 190 92 140 Q92 76 150 70 Q208 76 208 140 Q206 190 178 219 Q160 235 150 236 Z" fill="${SKIN}"/>`;
}
function neckFront() { return ''; }

function backHair(c) {
  if (c.style === 'wave') return `<path d="M76 140 Q62 46 150 36 Q238 46 224 140 Q240 200 226 250 Q248 292 230 328 Q190 342 150 334 Q110 342 70 328 Q52 292 74 250 Q60 200 76 140 Z" fill="${c.hair}"/>`;
  if (c.style === 'twin') return `<path d="M86 138 Q82 52 150 46 Q218 52 214 138 Z" fill="${c.hair}"/>
    <path d="M92 92 Q30 110 34 190 Q38 250 70 290 Q60 230 74 180 Q86 140 104 112 Z" fill="${c.hair}"/>
    <path d="M208 92 Q270 110 266 190 Q262 250 230 290 Q240 230 226 180 Q214 140 196 112 Z" fill="${c.hair}"/>
    <circle cx="94" cy="98" r="9" fill="#e5484d"/><circle cx="206" cy="98" r="9" fill="#e5484d"/>`;
  if (c.style === 'cap') return `<path d="M86 140 Q82 56 150 50 Q218 56 214 140 L216 196 Q204 208 196 196 L104 196 Q96 208 84 196 Z" fill="${c.hair}"/>`;
  if (c.style === 'short') return `<path d="M84 150 Q76 52 150 44 Q224 52 216 150 L218 200 Q206 214 194 204 L106 204 Q94 214 82 200 Z" fill="${c.hair}"/>`;
  if (c.style === 'long') return `<path d="M78 140 Q66 46 150 38 Q234 46 222 140 L236 318 Q150 336 64 318 Z" fill="${c.hair}"/>`;
  if (c.style === 'bob') return `<path d="M80 140 Q70 46 150 40 Q230 46 220 140 L228 232 Q214 246 196 236 L104 236 Q86 246 72 232 Z" fill="${c.hair}"/>`;
  // 포니테일
  return `<path d="M200 74 Q268 70 262 160 Q256 230 230 268 Q246 200 226 150 Q214 112 196 96 Z" fill="${c.hair}"/>
    <path d="M86 138 Q82 52 150 46 Q218 52 214 138 Z" fill="${c.hair}"/>
    <circle cx="206" cy="80" r="9" fill="#fff"/>`;
}
function bangs(c) {
  const h = c.hair, hi = c.hairHi;
  let d;
  if (c.style === 'wave') {
    d = 'M84 152 Q78 54 150 46 Q222 54 216 152 Q210 116 196 98 Q176 104 160 122 Q156 100 140 94 Q118 104 104 116 Q92 128 84 152 Z';
  } else if (c.style === 'cap') {
    d = 'M88 150 Q86 120 96 112 L204 112 Q214 120 212 150 Q206 128 192 124 L108 124 Q94 128 88 150 Z';
  } else if (c.style === 'long') {
    d = 'M86 150 Q80 56 150 50 Q220 56 214 150 Q206 112 192 96 Q186 122 170 132 Q174 104 166 92 Q146 120 112 128 Q126 110 128 94 Q104 112 86 150 Z';
  } else if (c.style === 'bob') {
    d = 'M86 148 Q80 54 150 50 Q220 54 214 148 Q210 124 204 116 L196 118 L190 112 L110 112 L104 118 L96 116 Q90 124 86 148 Z';
  } else {
    d = 'M88 140 Q84 58 150 54 Q216 58 212 140 Q204 116 190 104 Q186 124 172 128 Q170 108 160 98 Q150 120 128 126 Q132 110 126 100 Q104 116 88 140 Z';
  }
  return `<path d="${d}" fill="${h}"/><path d="M118 66 Q150 56 182 66" fill="none" stroke="${hi}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
}

function eye(c, mood) {
  // 왼쪽 눈 (오른쪽은 좌우반전)
  if (mood === 'happy' || mood === 'love') {
    return `<path d="M106 156 Q122 140 138 156" fill="none" stroke="#2a1a1a" stroke-width="5" stroke-linecap="round"/>`;
  }
  const ry = mood === 'surprised' ? 17 : mood === 'sad' ? 13 : 15.5;
  const lid = mood === 'angry' ? 'M104 146 Q120 136 141 148' : mood === 'sad' ? 'M104 141 Q122 136 140 146' : 'M103 147 Q121 129 142 144';
  const look = mood === 'shy' ? -4 : 0;
  const id = 'g' + Math.random().toString(36).slice(2, 7);
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.eye[0]}"/><stop offset="1" stop-color="${c.eye[1]}"/></linearGradient></defs>
    <ellipse cx="122" cy="155" rx="15" ry="${ry + 1}" fill="#fff"/>
    <ellipse cx="${122 + look}" cy="156" rx="12.5" ry="${ry}" fill="url(#${id})"/>
    <ellipse cx="${122 + look}" cy="158" rx="${mood === 'surprised' ? 4 : 6}" ry="${mood === 'surprised' ? 5 : 8}" fill="#1a1020"/>
    <circle cx="${117 + look}" cy="149" r="4.5" fill="#fff"/><circle cx="${127 + look}" cy="163" r="2" fill="#fff" opacity=".85"/>
    <path d="${lid}" fill="none" stroke="#2a1a1a" stroke-width="5" stroke-linecap="round"/>
    <path d="M140 145 l6 -4" stroke="#2a1a1a" stroke-width="3" stroke-linecap="round"/>`;
}
function brow(mood, hair) {
  const d = mood === 'angry' ? 'M106 122 L138 132' : mood === 'sad' ? 'M106 130 Q120 124 138 120' : mood === 'surprised' ? 'M106 118 Q122 110 138 117' : 'M106 127 Q122 119 138 124';
  return `<path d="${d}" fill="none" stroke="${hair}" stroke-width="4" stroke-linecap="round" opacity=".9"/>`;
}
function mouth(mood) {
  switch (mood) {
    case 'happy': case 'love':
      return `<path d="M136 196 Q150 218 164 196 Z" fill="#b8434f"/><path d="M142 206 Q150 212 158 206" fill="#ff8b96"/>`;
    case 'smile': case 'shy':
      return `<path d="M138 199 Q150 209 162 199" fill="none" stroke="#a8404a" stroke-width="3" stroke-linecap="round"/>`;
    case 'sad':
      return `<path d="M140 206 Q150 199 160 206" fill="none" stroke="#a8404a" stroke-width="3" stroke-linecap="round"/>`;
    case 'angry':
      return `<path d="M140 204 Q150 199 160 204" fill="none" stroke="#a8404a" stroke-width="3.5" stroke-linecap="round"/>`;
    case 'surprised':
      return `<ellipse cx="150" cy="203" rx="6" ry="8" fill="#b8434f"/>`;
    default:
      return `<path d="M142 201 Q150 205 158 201" fill="none" stroke="#a8404a" stroke-width="3" stroke-linecap="round"/>`;
  }
}
function blush(mood) {
  if (mood !== 'shy' && mood !== 'love' && mood !== 'happy') return '';
  const o = mood === 'happy' ? 0.35 : 0.6;
  return `<ellipse cx="112" cy="182" rx="15" ry="7" fill="#ff7f9a" opacity="${o}"/><ellipse cx="188" cy="182" rx="15" ry="7" fill="#ff7f9a" opacity="${o}"/>
    ${mood !== 'happy' ? '<path d="M104 182 l5 -6 M112 183 l5 -6 M184 183 l5 -6 M192 182 l5 -6" stroke="#e85d7a" stroke-width="2" stroke-linecap="round"/>' : ''}`;
}
function extra(mood) {
  if (mood === 'sad') return `<path d="M108 172 Q104 186 108 190 Q112 186 108 172 Z" fill="#9fd6ff" opacity=".85"/>`;
  if (mood === 'angry') return `<path d="M196 92 l10 -4 m-8 10 l10 2 m-4 -14 l2 -9" stroke="#e5484d" stroke-width="3" stroke-linecap="round"/>`;
  if (mood === 'love') return `<path d="M218 120 c-6 -10 -20 -2 -12 8 l12 12 l12 -12 c8 -10 -6 -18 -12 -8z" fill="#ff5c93"/>`;
  return '';
}

function girl(key, mood = 'normal') {
  const c = CHARS[key];
  const mirror = s => `<g transform="translate(300 0) scale(-1 1)">${s}</g>`;
  return `<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
    ${backHair(c)}
    ${c.outfit()}
    ${neckFront()}
    ${face()}
    ${eye(c, mood)}${mirror(eye(c, mood))}
    ${brow(mood, c.hair)}${mirror(brow(mood, c.hair))}
    <path d="M150 178 l-3 7 l5 1" fill="none" stroke="${SKIN_SH}" stroke-width="2.5" stroke-linecap="round"/>
    ${blush(mood)}
    ${mouth(mood)}
    ${bangs(c)}
    ${c.acc}
    ${extra(mood)}
  </svg>`;
}

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
function render(key, mood = 'normal') {
  const imgs = (window.CHAR_IMAGES || {})[key];
  if (imgs && imgs.length) {
    const m = imgs.includes(mood) ? mood : imgs.includes('normal') ? 'normal' : null;
    if (m) return `<img src="assets/characters/${key}_${m}.png" alt="" style="width:100%;height:auto;display:block">`;
  }
  if (key === 'coach') return coach(mood);
  if (key === 'chairman') return chairman(mood);
  return girl(key, mood);
}

window.Portraits = { girl, coach, chairman, render, CHARS };
})();
