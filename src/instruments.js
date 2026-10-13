/* 합주팡 — 악기 정의와 그림
 * 작은 타악기에서 시작해 피아노까지 11단계로 커진다.
 * 그림은 모두 캔버스 도형으로 그리며, (0,0) 중심 / 반지름 r 기준이다.
 */
(function () {
  'use strict';

  const INSTRUMENTS = [
    { name: '캐스터네츠', r: 15, color: '#c8693e', ink: '#fff3e6', secs: 8 },
    { name: '마라카스', r: 20, color: '#ff8f3f', ink: '#fff6e8', secs: 8 },
    { name: '트라이앵글', r: 26, color: '#5fc4dc', ink: '#f2fbff', secs: 8 },
    { name: '탬버린', r: 32, color: '#ef5b6f', ink: '#fff0f2', secs: 8 },
    { name: '작은북', r: 39, color: '#4f74f0', ink: '#eef2ff', secs: 8 },
    { name: '심벌즈', r: 47, color: '#f2c53d', ink: '#6b4c00', secs: 8 },
    { name: '드럼', r: 56, color: '#9658e0', ink: '#f6eeff', secs: 8 },
    { name: '피리', r: 65, color: '#33bf86', ink: '#effff7', secs: 8 },
    { name: '콘트라베이스', r: 75, color: '#7b4526', ink: '#f6cf94', secs: 8 },
    { name: '색소폰', r: 86, color: '#127f86', ink: '#ffd36b', secs: 8 },
    { name: '피아노', r: 98, color: '#262338', ink: '#fbf7ef', secs: 16 },
  ];
  // 머지로 만들어졌을 때 얻는 점수
  INSTRUMENTS.forEach((it, i) => { it.points = ((i + 1) * (i + 2)) / 2; });

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function ellipse(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  }

  const ICONS = [
    // 캐스터네츠: 끈으로 묶인 조개 두 쪽
    function (c, r, ink, base) {
      c.fillStyle = ink;
      ellipse(c, 0, r * 0.12, r * 0.5, r * 0.36); c.fill();
      c.fillStyle = shade(base, -0.35);
      ellipse(c, 0, r * 0.02, r * 0.46, r * 0.08); c.fill();
      c.fillStyle = ink;
      ellipse(c, 0, -r * 0.1, r * 0.46, r * 0.3); c.fill();
      c.strokeStyle = ink; c.lineWidth = r * 0.09;
      c.beginPath(); c.arc(-r * 0.36, -r * 0.42, r * 0.14, 0, Math.PI * 2); c.stroke();
    },
    // 마라카스: 엇갈린 두 개
    function (c, r, ink, base) {
      for (const dir of [-1, 1]) {
        c.save();
        c.rotate(dir * 0.5);
        c.fillStyle = ink;
        c.fillRect(-r * 0.07, 0, r * 0.14, r * 0.62);
        ellipse(c, 0, -r * 0.18, r * 0.27, r * 0.34); c.fill();
        c.fillStyle = shade(base, -0.2);
        for (const [x, y] of [[-0.1, -0.28], [0.09, -0.14], [-0.04, -0.02], [0.08, -0.36]]) {
          c.beginPath(); c.arc(x * r, y * r, r * 0.045, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      }
    },
    // 트라이앵글: 한쪽 모서리가 열린 삼각형과 채
    function (c, r, ink) {
      c.strokeStyle = ink; c.lineWidth = r * 0.1; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-r * 0.06, -r * 0.46);
      c.lineTo(-r * 0.5, r * 0.38);
      c.lineTo(r * 0.44, r * 0.38);
      c.lineTo(r * 0.06, -r * 0.38);
      c.stroke();
      c.lineWidth = r * 0.07;
      c.beginPath(); c.moveTo(r * 0.18, -r * 0.05); c.lineTo(r * 0.62, -r * 0.42); c.stroke();
      c.beginPath(); c.moveTo(0, -r * 0.46); c.lineTo(0, -r * 0.66); c.stroke();
    },
    // 탬버린: 테두리와 징글
    function (c, r, ink, base) {
      c.strokeStyle = ink; c.lineWidth = r * 0.14;
      c.beginPath(); c.arc(0, 0, r * 0.5, 0, Math.PI * 2); c.stroke();
      c.fillStyle = shade(base, 0.35);
      c.beginPath(); c.arc(0, 0, r * 0.43, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const x = Math.cos(a) * r * 0.5, y = Math.sin(a) * r * 0.5;
        c.fillStyle = '#ffd86b';
        ellipse(c, x, y, r * 0.12, r * 0.08, a + Math.PI / 2); c.fill();
        c.strokeStyle = shade(base, -0.4); c.lineWidth = r * 0.025; c.stroke();
      }
    },
    // 작은북: 원통 + 줄 + 스틱 두 개
    function (c, r, ink, base) {
      const top = -r * 0.12, bot = r * 0.38, rx = r * 0.52, ry = r * 0.16;
      c.fillStyle = shade(base, -0.3);
      c.fillRect(-rx, top, rx * 2, bot - top);
      ellipse(c, 0, bot, rx, ry); c.fill();
      c.strokeStyle = ink; c.lineWidth = r * 0.04;
      c.beginPath();
      for (let i = 0; i <= 6; i++) {
        const x = -rx + (i / 6) * rx * 2;
        c.lineTo(x, i % 2 ? bot - r * 0.02 : top + r * 0.04);
      }
      c.stroke();
      c.fillStyle = ink;
      ellipse(c, 0, top, rx, ry); c.fill();
      c.lineWidth = r * 0.07; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.55, -r * 0.62); c.lineTo(r * 0.08, -r * 0.2); c.stroke();
      c.beginPath(); c.moveTo(r * 0.55, -r * 0.62); c.lineTo(-r * 0.08, -r * 0.2); c.stroke();
    },
    // 심벌즈: 스탠드 위의 두 장
    function (c, r, ink) {
      c.strokeStyle = ink; c.fillStyle = ink; c.lineCap = 'round';
      c.lineWidth = r * 0.05;
      c.beginPath(); c.moveTo(0, -r * 0.42); c.lineTo(0, r * 0.5); c.stroke();
      c.beginPath(); c.moveTo(0, r * 0.32); c.lineTo(-r * 0.3, r * 0.56); c.moveTo(0, r * 0.32); c.lineTo(r * 0.3, r * 0.56); c.stroke();
      for (const [y, flip] of [[-r * 0.26, -1], [-r * 0.12, 1]]) {
        ellipse(c, 0, y, r * 0.6, r * 0.09); c.fill();
        ellipse(c, 0, y + flip * r * 0.05, r * 0.14, r * 0.07); c.fill();
      }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * 0.03;
      c.beginPath(); c.moveTo(-r * 0.42, -r * 0.29); c.lineTo(-r * 0.15, -r * 0.31); c.stroke();
    },
    // 드럼: 앞에서 본 큰북과 스탠드
    function (c, r, ink, base) {
      c.fillStyle = ink;
      c.beginPath(); c.arc(0, -r * 0.02, r * 0.52, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(base, 0.55);
      c.beginPath(); c.arc(0, -r * 0.02, r * 0.42, 0, Math.PI * 2); c.fill();
      c.fillStyle = base;
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.1 : r * 0.24;
        c.lineTo(Math.cos(a) * rr, -r * 0.02 + Math.sin(a) * rr);
      }
      c.closePath(); c.fill();
      c.fillStyle = ink;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath(); c.arc(Math.cos(a) * r * 0.47, -r * 0.02 + Math.sin(a) * r * 0.47, r * 0.035, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = ink; c.lineWidth = r * 0.06; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.32, r * 0.42); c.lineTo(-r * 0.46, r * 0.64); c.moveTo(r * 0.32, r * 0.42); c.lineTo(r * 0.46, r * 0.64); c.stroke();
    },
    // 피리: 구멍이 뚫린 대나무 관
    function (c, r, ink, base) {
      c.save();
      c.rotate(-0.75);
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(-r * 0.68, -r * 0.07);
      c.lineTo(r * 0.5, -r * 0.09);
      c.lineTo(r * 0.68, -r * 0.15);
      c.lineTo(r * 0.68, r * 0.15);
      c.lineTo(r * 0.5, r * 0.09);
      c.lineTo(-r * 0.68, r * 0.07);
      c.closePath(); c.fill();
      c.fillStyle = shade(base, -0.45);
      c.fillRect(-r * 0.62, -r * 0.075, r * 0.1, r * 0.15);
      for (let i = 0; i < 6; i++) {
        c.beginPath(); c.arc(-r * 0.3 + i * r * 0.13, 0, r * 0.035, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = shade(base, -0.2); c.lineWidth = r * 0.02;
      for (const x of [-0.42, 0.42]) { c.beginPath(); c.moveTo(x * r, -r * 0.085); c.lineTo(x * r, r * 0.085); c.stroke(); }
      c.restore();
    },
    // 콘트라베이스: 몸통, f홀, 지판, 스크롤
    function (c, r, ink, base) {
      c.save();
      c.rotate(0.35);
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(0, -r * 0.3);
      c.bezierCurveTo(r * 0.3, -r * 0.32, r * 0.28, -r * 0.08, r * 0.2, 0);
      c.bezierCurveTo(r * 0.4, r * 0.1, r * 0.42, r * 0.56, 0, r * 0.58);
      c.bezierCurveTo(-r * 0.42, r * 0.56, -r * 0.4, r * 0.1, -r * 0.2, 0);
      c.bezierCurveTo(-r * 0.28, -r * 0.08, -r * 0.3, -r * 0.32, 0, -r * 0.3);
      c.fill();
      const dark = shade(base, -0.35);
      c.fillStyle = dark;
      c.fillRect(-r * 0.04, -r * 0.72, r * 0.08, r * 0.86);
      c.beginPath(); c.arc(0, -r * 0.76, r * 0.07, 0, Math.PI * 2); c.fill();
      c.strokeStyle = dark; c.lineWidth = r * 0.025;
      for (const x of [-0.15, 0.15]) {
        c.beginPath(); c.moveTo(x * r, r * 0.12); c.bezierCurveTo((x - 0.05) * r, r * 0.22, (x + 0.05) * r, r * 0.3, x * r, r * 0.4); c.stroke();
      }
      c.fillRect(-r * 0.1, r * 0.3, r * 0.2, r * 0.03);
      c.lineWidth = r * 0.04; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, r * 0.58); c.lineTo(0, r * 0.7); c.stroke();
      c.restore();
    },
    // 색소폰: 휘어진 관, 키, 벨
    function (c, r, ink, base) {
      c.strokeStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = r * 0.16;
      c.beginPath();
      c.moveTo(-r * 0.16, -r * 0.48);
      c.lineTo(-r * 0.16, r * 0.24);
      c.quadraticCurveTo(-r * 0.16, r * 0.56, r * 0.12, r * 0.56);
      c.quadraticCurveTo(r * 0.38, r * 0.56, r * 0.38, r * 0.24);
      c.lineTo(r * 0.38, r * 0.02);
      c.stroke();
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(r * 0.26, r * 0.06);
      c.lineTo(r * 0.2, -r * 0.24);
      c.quadraticCurveTo(r * 0.42, -r * 0.18, r * 0.62, -r * 0.3);
      c.lineTo(r * 0.5, r * 0.06);
      c.closePath(); c.fill();
      c.lineWidth = r * 0.07;
      c.beginPath(); c.moveTo(-r * 0.16, -r * 0.48); c.quadraticCurveTo(-r * 0.2, -r * 0.62, -r * 0.42, -r * 0.62); c.stroke();
      c.fillStyle = shade(base, -0.3);
      for (let i = 0; i < 5; i++) {
        c.beginPath(); c.arc(-r * 0.16, -r * 0.3 + i * r * 0.13, r * 0.035, 0, Math.PI * 2); c.fill();
      }
    },
    // 피아노: 뚜껑을 연 그랜드 피아노와 건반
    function (c, r, ink, base) {
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(-r * 0.62, -r * 0.06);
      c.lineTo(-r * 0.62, -r * 0.2);
      c.bezierCurveTo(-r * 0.62, -r * 0.42, -r * 0.3, -r * 0.44, -r * 0.05, -r * 0.3);
      c.bezierCurveTo(r * 0.18, -r * 0.18, r * 0.62, -r * 0.24, r * 0.62, -r * 0.06);
      c.closePath(); c.fill();
      c.strokeStyle = ink; c.lineWidth = r * 0.035; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.58, -r * 0.24); c.lineTo(r * 0.1, -r * 0.66); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.2, -r * 0.3); c.lineTo(-r * 0.08, -r * 0.5); c.stroke();
      const kx = -r * 0.62, ky = -r * 0.02, kw = r * 1.24, kh = r * 0.3, n = 10;
      c.fillStyle = ink;
      c.fillRect(kx, ky, kw, kh);
      c.strokeStyle = base; c.lineWidth = r * 0.02;
      for (let i = 1; i < n; i++) { c.beginPath(); c.moveTo(kx + (kw * i) / n, ky); c.lineTo(kx + (kw * i) / n, ky + kh); c.stroke(); }
      c.fillStyle = base;
      for (const i of [1, 2, 4, 5, 6, 8, 9]) c.fillRect(kx + (kw * i) / n - r * 0.035, ky, r * 0.07, kh * 0.6);
      c.fillStyle = ink;
      c.fillRect(-r * 0.56, ky + kh, r * 0.06, r * 0.26);
      c.fillRect(r * 0.5, ky + kh, r * 0.06, r * 0.26);
    },
  ];

  // 공 하나(배경 + 악기 그림) 그리기
  function drawBall(c, tier, r, opts) {
    const it = INSTRUMENTS[tier];
    const o = opts || {};
    c.save();
    if (o.glow) {
      c.shadowColor = it.color;
      c.shadowBlur = r * 0.6 * o.glow;
    }
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, shade(it.color, 0.28));
    g.addColorStop(1, it.color);
    c.fillStyle = g;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = shade(it.color, -0.3);
    c.lineWidth = Math.max(1.2, r * 0.06);
    c.stroke();
    if (o.angle) c.rotate(o.angle);
    ICONS[tier](c, r, it.ink, it.color);
    c.restore();
  }

  window.Instruments = { list: INSTRUMENTS, drawBall, shade };
})();
