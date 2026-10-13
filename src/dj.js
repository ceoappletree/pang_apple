/* 합주팡 — 상단 DJ 부스
 * 세트마다 다른 동물이 헤드폰을 쓰고 지휘 박자에 맞춰 고개를 흔든다.
 * 박마다 고개를 끄덕이며 좌우로 기울이고, 소절 묶음 첫 박에는 손을 번쩍 든다.
 */
(function () {
  'use strict';

  const ANIMALS = {
    bear: { fur: '#8a5a3b', face: '#d9b48f', ear: 'round', inner: '#c98f6b' },
    rabbit: { fur: '#eef0f6', face: '#ffffff', ear: 'long', inner: '#ffb3c7', shades: true },
    cat: { fur: '#f0a050', face: '#ffe2bf', ear: 'pointy', inner: '#ffb3c7' },
    panda: { fur: '#f7f7f2', face: '#ffffff', ear: 'round', inner: '#1d1d22', earColor: '#1d1d22', patches: true },
    elephant: { fur: '#9aa3b5', face: '#b4bccb', ear: 'big', inner: '#e9b8c4', trunk: true },
  };

  function ellipse(c, x, y, rx, ry, rot) {
    c.beginPath();
    c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  }

  function ears(c, a) {
    const ec = a.earColor || a.fur;
    if (a.ear === 'round') {
      for (const d of [-1, 1]) {
        c.fillStyle = ec; c.beginPath(); c.arc(d * 15, -15, 7.5, 0, Math.PI * 2); c.fill();
        c.fillStyle = a.inner; c.beginPath(); c.arc(d * 15, -15, 4, 0, Math.PI * 2); c.fill();
      }
    } else if (a.ear === 'long') {
      for (const d of [-1, 1]) {
        c.fillStyle = a.fur; ellipse(c, d * 8, -30, 5.5, 15, d * 0.15); c.fill();
        c.fillStyle = a.inner; ellipse(c, d * 8, -29, 2.6, 11, d * 0.15); c.fill();
      }
    } else if (a.ear === 'pointy') {
      for (const d of [-1, 1]) {
        c.fillStyle = a.fur;
        c.beginPath(); c.moveTo(d * 19, -24); c.lineTo(d * 20, -6); c.lineTo(d * 6, -17); c.closePath(); c.fill();
        c.fillStyle = a.inner;
        c.beginPath(); c.moveTo(d * 17, -20); c.lineTo(d * 17.5, -9); c.lineTo(d * 9, -16); c.closePath(); c.fill();
      }
    } else if (a.ear === 'big') {
      for (const d of [-1, 1]) {
        c.fillStyle = a.fur; ellipse(c, d * 22, 2, 12, 16, d * 0.2); c.fill();
        c.fillStyle = a.inner; ellipse(c, d * 22, 3, 7, 11, d * 0.2); c.fill();
      }
    }
  }

  function head(c, a, s) {
    ears(c, a);
    c.fillStyle = a.fur;
    c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.fill();
    if (a.patches) {
      c.fillStyle = '#1d1d22';
      for (const d of [-1, 1]) { ellipse(c, d * 7.5, -1, 5, 6.5, d * -0.5); c.fill(); }
    }
    c.fillStyle = a.face;
    ellipse(c, 0, 8, 10, 7.5); c.fill();

    // 눈: 연주 중엔 신나서 눈을 감고, 쉬는 중엔 동그랗게
    const eyeInk = a.patches ? '#ffffff' : '#2a1f1a';
    c.strokeStyle = eyeInk; c.fillStyle = eyeInk; c.lineCap = 'round'; c.lineWidth = 2;
    if (a.shades) {
      c.fillStyle = '#121016';
      for (const d of [-1, 1]) { c.beginPath(); c.roundRect(d * 7.5 - 6, -5, 12, 7, 3); c.fill(); }
      c.fillRect(-2, -3, 4, 1.6);
      c.fillStyle = 'rgba(255,255,255,.5)';
      c.fillRect(-11, -4, 3, 1.4); c.fillRect(4, -4, 3, 1.4);
    } else if (s.playing) {
      for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 7.5, 0, 3.2, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
    } else {
      for (const d of [-1, 1]) { c.beginPath(); c.arc(d * 7.5, -1, 2.2, 0, Math.PI * 2); c.fill(); }
    }

    if (a.trunk) {
      c.strokeStyle = a.fur; c.lineWidth = 6;
      c.beginPath(); c.moveTo(0, 6); c.quadraticCurveTo(2, 20, 9 + s.swing * 3, 22); c.stroke();
      c.fillStyle = '#fffaf0';
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(d * 5, 10); c.lineTo(d * 7, 16); c.lineTo(d * 3, 11); c.fill(); }
    } else {
      c.fillStyle = '#3a2620';
      ellipse(c, 0, 5, 2.6, 1.8); c.fill();
      c.strokeStyle = '#3a2620'; c.lineWidth = 1.4;
      if (s.shout) {
        c.fillStyle = '#7a2b3a'; ellipse(c, 0, 11, 3.2, 3); c.fill();
      } else {
        c.beginPath(); c.arc(-2.5, 8, 2.5, 0.1, Math.PI - 0.1); c.arc(2.5, 8, 2.5, 0.1, Math.PI - 0.1); c.stroke();
      }
    }

    // 헤드폰
    c.strokeStyle = '#1b1820'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(0, 0, 23, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.fillStyle = s.accent;
    for (const d of [-1, 1]) { c.beginPath(); c.roundRect(d * 22 - 4, -6, 8, 13, 3); c.fill(); }
  }

  // s: { animal, accent, setName, phase(박 안 위치 0~1), beat, bar, playing, time }
  function draw(c, w, h, s) {
    const a = ANIMALS[s.animal] || ANIMALS.bear;
    c.clearRect(0, 0, w, h);
    const cx = w / 2;
    const k = s.playing ? Math.exp(-s.phase * 5) : 0;           // 박 머리에서 1, 점점 0
    const side = s.beat % 2 ? 1 : -1;
    const idle = Math.sin(s.time / 700);
    const nod = s.playing ? k * 5 : idle * 1.2;
    const tilt = s.playing ? side * 0.16 * (1 - s.phase) : idle * 0.05;
    const downbeat = s.playing && s.bar === 0 && s.beat === 0;
    s.swing = s.playing ? side * (1 - s.phase) : 0;
    s.shout = downbeat && s.phase < 0.6;

    // 몸통
    const by = h - 18;
    c.fillStyle = a.fur;
    c.beginPath(); c.roundRect(cx - 20, by - 26 + nod * 0.4, 40, 30, 12); c.fill();

    // 팔: 왼손은 판을 긁고, 오른손은 첫 박에 번쩍
    c.strokeStyle = a.fur; c.lineCap = 'round'; c.lineWidth = 8;
    const scratch = s.playing ? Math.sin(s.phase * Math.PI * 2) * 6 : 0;
    c.beginPath(); c.moveTo(cx - 16, by - 18 + nod * 0.4); c.lineTo(cx - 34 + scratch, by - 6); c.stroke();
    if (downbeat) {
      c.beginPath(); c.moveTo(cx + 16, by - 20 + nod * 0.4); c.lineTo(cx + 30, by - 46); c.stroke();
    } else {
      c.beginPath(); c.moveTo(cx + 16, by - 18 + nod * 0.4); c.lineTo(cx + 34, by - 6); c.stroke();
    }

    // 부스와 턴테이블
    c.fillStyle = '#16131d';
    c.beginPath(); c.roundRect(cx - 60, by - 6, 120, 22, 6); c.fill();
    c.fillStyle = s.accent;
    c.globalAlpha = 0.22 + k * 0.4;
    c.beginPath(); c.roundRect(cx - 56, by + 1, 112, 12, 4); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = s.accent;
    c.font = '11px "Jua", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(s.setName, cx, by + 7.5);
    for (const d of [-1, 1]) {
      const tx = cx + d * 38, ty = by - 6;
      c.fillStyle = '#2c2833'; ellipse(c, tx, ty, 17, 5); c.fill();
      c.fillStyle = '#0d0b11'; ellipse(c, tx, ty, 13, 3.8); c.fill();
      const ang = s.time / (s.playing ? 120 : 600) * d;
      c.strokeStyle = s.accent; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + Math.cos(ang) * 12, ty + Math.sin(ang) * 3.5); c.stroke();
    }

    // 머리
    c.save();
    c.translate(cx, by - 42 + nod);
    c.rotate(tilt);
    head(c, a, s);
    c.restore();

    // 첫 박 반짝이
    if (downbeat) {
      c.fillStyle = s.accent;
      c.globalAlpha = 1 - s.phase;
      c.font = '14px "Jua", sans-serif';
      c.fillText('♪', cx + 44, by - 52 - s.phase * 8);
      c.fillText('♫', cx - 46, by - 48 - s.phase * 10);
      c.globalAlpha = 1;
    }
  }

  window.DJ = { draw };
})();
