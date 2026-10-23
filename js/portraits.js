// 캐릭터 초상화 (SVG 코드로 직접 그림)
(() => {
'use strict';

const SKIN = '#ffe3d1', SKIN_SH = '#f4c4ad';

const CHARS = {
  haneul: {
    hair: '#7b4a2c', hairHi: '#a3683f', eye: ['#6b3b1f', '#c98a4b'], style: 'long',
    outfit(o) {
      return `<path d="M30 340 Q42 262 112 250 L188 250 Q258 262 270 340 Z" fill="#f2e6d0"/>
        <path d="M112 250 L150 300 L188 250" fill="none" stroke="#e0cfb0" stroke-width="4"/>
        <path d="M96 340 L104 282 Q150 300 196 282 L204 340 Z" fill="#5f8f5a"/>
        <path d="M104 282 L96 262 M196 282 L204 262" stroke="#5f8f5a" stroke-width="6" stroke-linecap="round"/>
        <circle cx="150" cy="318" r="9" fill="#fff" opacity=".9"/><path d="M146 318 l4 -6 l4 6 z" fill="#e5484d"/>`;
    },
    acc: `<g transform="translate(206 92) rotate(20)"><path d="M0 0 L-20 -14 L-20 14 Z M0 0 L20 -14 L20 14 Z" fill="#ff7aa8"/><circle r="6" fill="#ff5c93"/></g>`,
  },
  seoyun: {
    hair: '#1d1b2b', hairHi: '#3e3a5c', eye: ['#3a2a5a', '#8a6fc2'], style: 'bob',
    outfit() {
      return `<path d="M30 340 Q42 262 112 250 L188 250 Q258 262 270 340 Z" fill="#23305e"/>
        <path d="M120 250 L150 320 L180 250 Z" fill="#fbfbff"/>
        <path d="M120 250 L138 300 L112 290 Z M180 250 L162 300 L188 290 Z" fill="#1a2550"/>
        <rect x="196" y="292" width="34" height="22" rx="4" fill="#ffd54a"/><text x="213" y="307" font-size="11" font-weight="900" text-anchor="middle" fill="#23305e">SBC</text>`;
    },
    acc: `<rect x="186" y="96" width="26" height="6" rx="3" fill="#e8c35a" transform="rotate(-25 199 99)"/>
      <circle cx="92" cy="182" r="4" fill="#e8c35a"/><circle cx="208" cy="182" r="4" fill="#e8c35a"/>`,
  },
  minji: {
    hair: '#a54a26', hairHi: '#d06a3a', eye: ['#1f5a3a', '#4fb07a'], style: 'pony',
    outfit() {
      return `<path d="M30 340 Q42 262 112 250 L188 250 Q258 262 270 340 Z" fill="#c8202e"/>
        <path d="M112 250 Q150 270 188 250 L182 270 Q150 290 118 270 Z" fill="#fff"/>
        <path d="M150 272 L150 340" stroke="#fff" stroke-width="5"/>
        <path d="M60 300 L95 340 M240 300 L205 340" stroke="#fff" stroke-width="6"/>
        <path d="M128 270 Q120 300 136 318" fill="none" stroke="#333" stroke-width="2"/><rect x="128" y="314" width="16" height="10" rx="3" fill="#cfd6e6"/>`;
    },
    acc: `<path d="M88 112 Q150 76 212 112" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`,
  },
};

function face() {
  return `<path d="M132 214 L132 262 Q150 272 168 262 L168 214 Z" fill="${SKIN_SH}"/>
    <path d="M150 236 Q140 235 122 219 Q94 190 92 140 Q92 76 150 70 Q208 76 208 140 Q206 190 178 219 Q160 235 150 236 Z" fill="${SKIN}"/>`;
}
function neckFront() { return ''; }

function backHair(c) {
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
  if (c.style === 'long') {
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

window.Portraits = { girl, coach, CHARS };
})();
