/* 합주팡 — 악기 그림
 * 그림은 모두 캔버스 도형으로 그리며, (0,0) 중심 / 반지름 r 기준이다.
 * 세트 정의(sets.js)의 icon 이름으로 찾아 쓴다.
 */
(function () {
  'use strict';

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

  const ICONS = {
    // 캐스터네츠: 끈으로 묶인 조개 두 쪽
    castanets(c, r, ink, base) {
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
    maracas(c, r, ink, base) {
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
    triangle(c, r, ink) {
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
    tambourine(c, r, ink, base) {
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
    snare(c, r, ink, base) {
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
    cymbals(c, r, ink) {
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
    drum(c, r, ink, base) {
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
    flute(c, r, ink, base) {
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
    contrabass(c, r, ink, base) {
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
    sax(c, r, ink, base) {
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
    piano(c, r, ink, base) {
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

    // 바이올린: 몸통, f홀, 지판, 활
    violin(c, r, ink, base) {
      c.save();
      c.rotate(-0.5);
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(0, -r * 0.26);
      c.bezierCurveTo(r * 0.26, -r * 0.28, r * 0.24, -r * 0.06, r * 0.16, 0);
      c.bezierCurveTo(r * 0.34, r * 0.08, r * 0.34, r * 0.46, 0, r * 0.48);
      c.bezierCurveTo(-r * 0.34, r * 0.46, -r * 0.34, r * 0.08, -r * 0.16, 0);
      c.bezierCurveTo(-r * 0.24, -r * 0.06, -r * 0.26, -r * 0.28, 0, -r * 0.26);
      c.fill();
      const dark = shade(base, -0.35);
      c.fillStyle = dark;
      c.fillRect(-r * 0.035, -r * 0.66, r * 0.07, r * 0.76);
      c.beginPath(); c.arc(0, -r * 0.7, r * 0.06, 0, Math.PI * 2); c.fill();
      c.strokeStyle = dark; c.lineWidth = r * 0.025;
      for (const x of [-0.12, 0.12]) {
        c.beginPath(); c.moveTo(x * r, r * 0.08); c.bezierCurveTo((x - 0.04) * r, r * 0.16, (x + 0.04) * r, r * 0.24, x * r, r * 0.32); c.stroke();
      }
      c.restore();
      c.strokeStyle = ink; c.lineWidth = r * 0.04; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.62, r * 0.12); c.lineTo(r * 0.5, -r * 0.48); c.stroke();
    },

    // 하이햇: 겹친 두 장과 페달 막대
    hihat(c, r, ink) {
      c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round';
      c.lineWidth = r * 0.06;
      c.beginPath(); c.moveTo(0, -r * 0.35); c.lineTo(0, r * 0.55); c.stroke();
      ellipse(c, 0, -r * 0.2, r * 0.56, r * 0.1); c.fill();
      ellipse(c, 0, -r * 0.06, r * 0.56, r * 0.1); c.fill();
      c.beginPath(); c.moveTo(-r * 0.3, r * 0.55); c.lineTo(r * 0.3, r * 0.55); c.stroke();
    },
    // 카우벨: 사다리꼴 종
    cowbell(c, r, ink, base) {
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(-r * 0.2, -r * 0.45); c.lineTo(r * 0.2, -r * 0.45);
      c.lineTo(r * 0.42, r * 0.45); c.lineTo(-r * 0.42, r * 0.45);
      c.closePath(); c.fill();
      c.fillStyle = base;
      c.fillRect(-r * 0.3, r * 0.1, r * 0.6, r * 0.08);
      c.strokeStyle = ink; c.lineWidth = r * 0.07; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -r * 0.45); c.lineTo(0, -r * 0.62); c.stroke();
    },
    // 클랩: 마주치는 두 손바닥
    clap(c, r, ink) {
      c.fillStyle = ink;
      for (const d of [-1, 1]) {
        c.save();
        c.translate(d * r * 0.16, r * 0.05);
        c.rotate(d * 0.35);
        c.beginPath();
        c.roundRect(-r * 0.17, -r * 0.42, r * 0.34, r * 0.72, r * 0.15);
        c.fill();
        c.restore();
      }
      c.strokeStyle = ink; c.lineWidth = r * 0.06; c.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[-0.55, -0.45, -0.42, -0.32], [0, -0.68, 0, -0.52], [0.55, -0.45, 0.42, -0.32]]) {
        c.beginPath(); c.moveTo(x1 * r, y1 * r); c.lineTo(x2 * r, y2 * r); c.stroke();
      }
    },
    // 전자 드럼 패드: 육각형
    pad(c, r, ink, base) {
      c.fillStyle = ink;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        c.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
      }
      c.closePath(); c.fill();
      c.strokeStyle = base; c.lineWidth = r * 0.07;
      c.beginPath(); c.arc(0, 0, r * 0.3, 0, Math.PI * 2); c.stroke();
      c.fillStyle = base;
      c.beginPath(); c.arc(0, 0, r * 0.1, 0, Math.PI * 2); c.fill();
    },
    // 크래시: 기울어진 큰 심벌과 퍼지는 선
    crash(c, r, ink) {
      c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round';
      ellipse(c, 0, -r * 0.05, r * 0.6, r * 0.16, -0.3); c.fill();
      c.lineWidth = r * 0.05;
      c.beginPath(); c.moveTo(0, -r * 0.05); c.lineTo(0, r * 0.6); c.stroke();
      for (const a of [-2.4, -1.9, -1.2, -0.7]) {
        c.beginPath();
        c.moveTo(Math.cos(a) * r * 0.5, -r * 0.1 + Math.sin(a) * r * 0.35);
        c.lineTo(Math.cos(a) * r * 0.7, -r * 0.1 + Math.sin(a) * r * 0.55);
        c.stroke();
      }
    },
    // 킥: 스피커 콘
    speaker(c, r, ink, base) {
      c.fillStyle = ink;
      c.beginPath(); c.arc(0, 0, r * 0.58, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(base, -0.25);
      c.beginPath(); c.arc(0, 0, r * 0.44, 0, Math.PI * 2); c.fill();
      c.fillStyle = ink;
      c.beginPath(); c.arc(0, 0, r * 0.2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = ink; c.lineWidth = r * 0.03;
      c.beginPath(); c.arc(0, 0, r * 0.32, 0, Math.PI * 2); c.stroke();
    },
    // 아르페지오: 올라가는 계단 음표
    arp(c, r, ink) {
      c.fillStyle = ink;
      for (let i = 0; i < 4; i++) {
        const x = -r * 0.5 + i * r * 0.28, h = r * (0.22 + i * 0.2);
        c.beginPath(); c.roundRect(x, r * 0.45 - h, r * 0.2, h, r * 0.05); c.fill();
      }
    },
    // 패드: 부드러운 사인파
    wave(c, r, ink) {
      c.strokeStyle = ink; c.lineWidth = r * 0.1; c.lineCap = 'round';
      for (const [dy, a] of [[-0.18, 1], [0.18, 0.5]]) {
        c.globalAlpha = a;
        c.beginPath();
        for (let i = 0; i <= 24; i++) {
          const x = -0.55 + (i / 24) * 1.1;
          const y = dy + Math.sin((i / 24) * Math.PI * 2) * 0.16;
          if (i) c.lineTo(x * r, y * r); else c.moveTo(x * r, y * r);
        }
        c.stroke();
      }
      c.globalAlpha = 1;
    },
    // 신스 베이스: 톱니파
    saw(c, r, ink) {
      c.strokeStyle = ink; c.lineWidth = r * 0.1; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(-r * 0.58, r * 0.3);
      for (let i = 0; i < 3; i++) {
        const x = -r * 0.58 + i * r * 0.39;
        c.lineTo(x + r * 0.39, -r * 0.3);
        c.lineTo(x + r * 0.39, r * 0.3);
      }
      c.stroke();
    },
    // 플럭: 번개
    bolt(c, r, ink) {
      c.fillStyle = ink;
      c.beginPath();
      c.moveTo(r * 0.12, -r * 0.62); c.lineTo(-r * 0.34, r * 0.06); c.lineTo(-r * 0.02, r * 0.06);
      c.lineTo(-r * 0.14, r * 0.62); c.lineTo(r * 0.34, -r * 0.08); c.lineTo(r * 0.02, -r * 0.08);
      c.closePath(); c.fill();
    },
    // 신디사이저: 노브 줄과 건반
    synth(c, r, ink, base) {
      c.fillStyle = shade(base, 0.25);
      c.beginPath(); c.roundRect(-r * 0.66, -r * 0.4, r * 1.32, r * 0.8, r * 0.08); c.fill();
      c.fillStyle = ink;
      for (let i = 0; i < 5; i++) {
        c.beginPath(); c.arc(-r * 0.44 + i * r * 0.22, -r * 0.2, r * 0.07, 0, Math.PI * 2); c.fill();
      }
      const kx = -r * 0.58, ky = r * 0.02, kw = r * 1.16, kh = r * 0.3, n = 9;
      c.fillStyle = '#ffffff';
      c.fillRect(kx, ky, kw, kh);
      c.fillStyle = base;
      for (let i = 1; i < n; i++) c.fillRect(kx + (kw * i) / n - r * 0.008, ky, r * 0.016, kh);
      for (const i of [1, 2, 4, 5, 7]) c.fillRect(kx + (kw * i) / n - r * 0.03, ky, r * 0.06, kh * 0.6);
    },

    // 고양이 얼굴: 공 자체가 얼굴, 옵션으로 표정과 소품이 바뀐다
    cat(c, r, ink, base, o) {
      o = o || {};
      const dark = shade(base, -0.3);
      // 귀
      c.fillStyle = dark;
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(d * r * 0.72, -r * 0.62);
        c.lineTo(d * r * 0.62, -r * 0.18);
        c.lineTo(d * r * 0.25, -r * 0.5);
        c.closePath(); c.fill();
      }
      c.fillStyle = '#ffb3c7';
      for (const d of [-1, 1]) {
        c.beginPath();
        c.moveTo(d * r * 0.64, -r * 0.5);
        c.lineTo(d * r * 0.58, -r * 0.28);
        c.lineTo(d * r * 0.38, -r * 0.45);
        c.closePath(); c.fill();
      }
      if (o.stripes) {
        c.strokeStyle = dark; c.lineWidth = r * 0.06; c.lineCap = 'round';
        for (const x of [-0.12, 0, 0.12]) { c.beginPath(); c.moveTo(x * r, -r * 0.62); c.lineTo(x * r, -r * 0.42); c.stroke(); }
      }
      if (o.patches) {
        c.fillStyle = '#5a3a22';
        ellipse(c, -r * 0.4, -r * 0.2, r * 0.22, r * 0.18, 0.4); c.fill();
        c.fillStyle = '#f2f0ea';
        ellipse(c, r * 0.36, r * 0.3, r * 0.2, r * 0.16, -0.3); c.fill();
      }
      // 눈
      const ey = -r * 0.08, ex = r * 0.26;
      c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round';
      c.lineWidth = r * 0.06;
      for (const d of [-1, 1]) {
        const x = d * ex;
        if (o.eyes === 'happy') { c.beginPath(); c.arc(x, ey + r * 0.04, r * 0.09, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
        else if (o.eyes === 'wide') {
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, ey, r * 0.12, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#1a1820'; c.beginPath(); c.arc(x, ey, r * 0.06, 0, Math.PI * 2); c.fill();
          c.fillStyle = ink;
        } else if (o.eyes === 'angry') {
          c.beginPath(); c.moveTo(x - d * r * 0.1, ey - r * 0.08); c.lineTo(x + d * r * 0.08, ey); c.stroke();
          c.beginPath(); c.arc(x, ey + r * 0.04, r * 0.04, 0, Math.PI * 2); c.fill();
        } else if (o.eyes === 'sparkle') {
          c.beginPath(); c.arc(x, ey, r * 0.08, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#ffffff';
          c.beginPath(); c.arc(x + r * 0.03, ey - r * 0.03, r * 0.03, 0, Math.PI * 2); c.fill();
          c.fillStyle = ink;
        } else if (o.eyes !== 'shades') { c.beginPath(); c.arc(x, ey, r * 0.06, 0, Math.PI * 2); c.fill(); }
      }
      if (o.eyes === 'shades') {
        c.fillStyle = '#121016';
        for (const d of [-1, 1]) { c.beginPath(); c.roundRect(d * ex - r * 0.17, ey - r * 0.09, r * 0.34, r * 0.17, r * 0.06); c.fill(); }
        c.strokeStyle = '#121016'; c.lineWidth = r * 0.04;
        c.beginPath(); c.moveTo(-ex + r * 0.17, ey - r * 0.03); c.lineTo(ex - r * 0.17, ey - r * 0.03); c.stroke();
        c.strokeStyle = ink;
      }
      // 코와 입
      const ny = r * 0.12;
      c.fillStyle = '#ff8fab';
      c.beginPath(); c.moveTo(-r * 0.06, ny - r * 0.03); c.lineTo(r * 0.06, ny - r * 0.03); c.lineTo(0, ny + r * 0.03); c.closePath(); c.fill();
      c.strokeStyle = ink; c.fillStyle = ink; c.lineWidth = r * 0.04;
      const my = ny + r * 0.06;
      if (o.mouth === 'w') {
        c.beginPath(); c.arc(-r * 0.06, my, r * 0.06, 0, Math.PI); c.arc(r * 0.06, my, r * 0.06, 0, Math.PI); c.stroke();
      } else if (o.mouth === 'o') {
        c.fillStyle = '#7a2b3a'; ellipse(c, 0, my + r * 0.06, r * 0.07, r * 0.09); c.fill();
      } else if (o.mouth === 'open' || o.mouth === 'fang') {
        c.fillStyle = '#7a2b3a';
        c.beginPath(); c.moveTo(-r * 0.12, my); c.quadraticCurveTo(0, my + r * 0.3, r * 0.12, my); c.closePath(); c.fill();
        if (o.mouth === 'fang') {
          c.fillStyle = '#ffffff';
          for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * r * 0.09, my); c.lineTo(d * r * 0.05, my + r * 0.08); c.lineTo(d * r * 0.02, my); c.fill(); }
        }
      } else {
        c.beginPath(); c.moveTo(0, ny + r * 0.03); c.lineTo(0, my); c.stroke();
      }
      // 수염
      c.strokeStyle = ink; c.globalAlpha = 0.55; c.lineWidth = r * 0.025;
      for (const d of [-1, 1]) for (const k of [-1, 1]) {
        c.beginPath(); c.moveTo(d * r * 0.22, ny + k * r * 0.02); c.lineTo(d * r * 0.58, ny + k * r * 0.08); c.stroke();
      }
      c.globalAlpha = 1;
      // 소품
      if (o.paws) {
        c.fillStyle = shade(base, 0.35);
        for (const d of [-1, 1]) { ellipse(c, d * r * 0.3, r * 0.62, r * 0.16, r * 0.12); c.fill(); }
      }
      if (o.bow) {
        c.fillStyle = '#d6304a';
        const by = r * 0.62;
        c.beginPath(); c.moveTo(0, by); c.lineTo(-r * 0.2, by - r * 0.1); c.lineTo(-r * 0.2, by + r * 0.1); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(0, by); c.lineTo(r * 0.2, by - r * 0.1); c.lineTo(r * 0.2, by + r * 0.1); c.closePath(); c.fill();
        c.beginPath(); c.arc(0, by, r * 0.05, 0, Math.PI * 2); c.fill();
      }
      if (o.ribbon) {
        c.fillStyle = '#e8336a';
        const bx = r * 0.48, by = -r * 0.55;
        ellipse(c, bx - r * 0.1, by, r * 0.1, r * 0.07, 0.4); c.fill();
        ellipse(c, bx + r * 0.1, by, r * 0.1, r * 0.07, -0.4); c.fill();
        c.beginPath(); c.arc(bx, by, r * 0.04, 0, Math.PI * 2); c.fill();
      }
      if (o.phones) {
        c.strokeStyle = '#222'; c.lineWidth = r * 0.07;
        c.beginPath(); c.arc(0, -r * 0.05, r * 0.62, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
        c.fillStyle = '#ff4f6d';
        for (const d of [-1, 1]) { c.beginPath(); c.roundRect(d * r * 0.62 - r * 0.09, -r * 0.2, r * 0.18, r * 0.3, r * 0.06); c.fill(); }
      }
      if (o.crown) {
        c.fillStyle = '#ffe066'; c.strokeStyle = '#b8860b'; c.lineWidth = r * 0.02;
        c.beginPath();
        c.moveTo(-r * 0.22, -r * 0.5); c.lineTo(-r * 0.22, -r * 0.72); c.lineTo(-r * 0.11, -r * 0.6);
        c.lineTo(0, -r * 0.78); c.lineTo(r * 0.11, -r * 0.6); c.lineTo(r * 0.22, -r * 0.72); c.lineTo(r * 0.22, -r * 0.5);
        c.closePath(); c.fill(); c.stroke();
      }
      if (o.mic) {
        c.fillStyle = '#2b2b33';
        c.save(); c.translate(r * 0.42, r * 0.42); c.rotate(-0.6);
        c.fillRect(-r * 0.04, 0, r * 0.08, r * 0.32);
        c.fillStyle = '#c9c9d4';
        c.beginPath(); c.arc(0, 0, r * 0.1, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    },
  };

  // 공 하나(배경 + 악기 그림) 그리기. it 은 세트의 악기 정의.
  function drawBall(c, it, r, opts) {
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
    ICONS[it.icon](c, r, it.ink, it.color, it.cat);
    c.restore();
  }

  window.Icons = { drawBall, shade };
})();
