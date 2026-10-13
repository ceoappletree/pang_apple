/* 합주팡 — 게임 진행(물리, 입력, 그리기) */
(function () {
  'use strict';

  const { Engine, Bodies, Composite, Events, Body } = Matter;
  const INST = Instruments.list;
  const W = 400, H = 640;            // 게임 판의 논리 크기
  const DROP_Y = 46;                 // 악기를 드는 높이
  const LINE_Y = 92;                 // 이 선 위로 악기가 머무르면 끝
  const DROP_COOLDOWN = 520;
  const SPAWN_TIERS = 5;             // 떨어뜨릴 수 있는 건 작은 악기 5종

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const c = canvas.getContext('2d');
  const nextCanvas = $('next');
  const nc = nextCanvas.getContext('2d');

  let engine, scale = 1, dpr = 1;
  let current, next, aimX = W / 2, canDropAt = 0;
  let score = 0, best = 0, over = false, started = false;
  let dangerMs = 0, lastTime = 0, acc = 0;
  const mergeQueue = [];
  const particles = [];
  const pulse = new Array(INST.length).fill(-10);
  const pendingHits = [];
  const lastNote = new Array(INST.length).fill(0);

  try { best = parseInt(localStorage.getItem('hapjupang.best') || '0', 10) || 0; } catch (e) { best = 0; }

  /* ---------- 준비 ---------- */

  function randomTier() {
    const w = [32, 28, 20, 13, 7];
    let x = Math.random() * 100;
    for (let i = 0; i < SPAWN_TIERS; i++) { if ((x -= w[i]) < 0) return i; }
    return 0;
  }

  function setupWorld() {
    engine = Engine.create({ gravity: { y: 1.1 } });
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    const opt = { isStatic: true, friction: 0.4, label: 'wall' };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + 30, W + 200, 60, opt),
      Bodies.rectangle(-30, H / 2, 60, H * 3, opt),
      Bodies.rectangle(W + 30, H / 2, 60, H * 3, opt),
    ]);
    Events.on(engine, 'collisionStart', collide);
    Events.on(engine, 'collisionActive', collide);
  }

  function collide(e) {
    for (const p of e.pairs) {
      const a = p.bodyA, b = p.bodyB;
      if (a.tier === undefined || a.tier !== b.tier || a.merging || b.merging) continue;
      a.merging = b.merging = true;
      mergeQueue.push([a, b]);
    }
  }

  function makeBody(tier, x, y) {
    const r = INST[tier].r;
    const b = Bodies.circle(x, y, r, {
      restitution: 0.15, friction: 0.12, frictionStatic: 0.4, frictionAir: 0.004,
      density: 0.0012, label: 'inst',
    });
    b.tier = tier;
    b.born = performance.now();
    b.pop = 1;
    return b;
  }

  function newGame() {
    if (engine) {
      Events.off(engine);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    }
    setupWorld();
    score = 0; over = false; dangerMs = 0;
    particles.length = 0; mergeQueue.length = 0;
    current = randomTier(); next = randomTier();
    canDropAt = performance.now() + 300;
    Music.stopAll();
    updateHud();
    $('over').hidden = true;
  }

  /* ---------- 입력 ---------- */

  function toWorldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * W;
  }
  function clampAim(x, tier) {
    const r = INST[tier].r;
    return Math.max(r + 2, Math.min(W - r - 2, x));
  }

  canvas.addEventListener('pointermove', (e) => { aimX = toWorldX(e.clientX); });
  canvas.addEventListener('pointerdown', (e) => { aimX = toWorldX(e.clientX); });
  canvas.addEventListener('pointerup', (e) => { aimX = toWorldX(e.clientX); drop(); });
  window.addEventListener('keydown', (e) => {
    if (!started || over) return;
    if (e.key === 'ArrowLeft') aimX -= 18;
    else if (e.key === 'ArrowRight') aimX += 18;
    else if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); drop(); }
  });

  function drop() {
    if (!started || over || current === null) return;
    const now = performance.now();
    if (now < canDropAt) return;
    const x = clampAim(aimX, current);
    const b = makeBody(current, x, DROP_Y);
    Body.setVelocity(b, { x: 0, y: 2 });
    Composite.add(engine.world, b);
    Music.trigger(current, INST[current].secs);
    current = next;
    next = randomTier();
    canDropAt = now + DROP_COOLDOWN;
    updateHud();
  }

  /* ---------- 머지 ---------- */

  function processMerges() {
    while (mergeQueue.length) {
      const [a, b] = mergeQueue.shift();
      if (!Composite.get(engine.world, a.id, 'body') || !Composite.get(engine.world, b.id, 'body')) continue;
      Composite.remove(engine.world, [a, b]);
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const tier = a.tier;
      if (tier < INST.length - 1) {
        const nt = tier + 1;
        const nb = makeBody(nt, x, y);
        nb.pop = 0.6;
        Body.setVelocity(nb, { x: (a.velocity.x + b.velocity.x) / 2, y: Math.min(0, (a.velocity.y + b.velocity.y) / 2) });
        Composite.add(engine.world, nb);
        score += INST[nt].points;
        Music.trigger(nt, INST[nt].secs);
        burst(x, y, INST[nt].color, 10 + nt * 2);
        toast(INST[nt].name + ' 합류!');
      } else {
        // 피아노 두 대가 만나면 사라지면서 모든 악기의 대합주
        score += 100;
        burst(x, y, '#ffd36b', 60);
        for (let i = 0; i < INST.length; i++) Music.trigger(i, 16);
        toast('대합주! +100');
      }
      updateHud();
    }
  }

  /* ---------- 효과 ---------- */

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 4;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 1, decay: 0.02 + Math.random() * 0.02, color, size: 2 + Math.random() * 3, kind: 'dot' });
    }
  }

  function noteFrom(body) {
    const chars = ['♪', '♫', '♩', '♬'];
    particles.push({
      x: body.position.x + (Math.random() - 0.5) * body.circleRadius,
      y: body.position.y - body.circleRadius * 0.8,
      vx: (Math.random() - 0.5) * 0.6, vy: -1.1 - Math.random() * 0.6,
      life: 1, decay: 0.012, color: INST[body.tier].color,
      size: 12 + body.circleRadius * 0.12, kind: 'note', ch: chars[(Math.random() * 4) | 0],
    });
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1300);
  }

  Music.onHit((tier, t) => { pendingHits.push([tier, t]); });

  /* ---------- 화면 ---------- */

  function resize() {
    const wrap = $('stage');
    const availW = wrap.clientWidth, availH = wrap.clientHeight;
    scale = Math.min(availW / W, availH / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
  }

  function bodies() {
    return Composite.allBodies(engine.world).filter((b) => b.tier !== undefined);
  }

  function drawBoard(now, audioNow) {
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    // 무대 바닥 조명: 박자에 맞춰 살짝 밝아진다
    const beat = Math.max(0, 1 - ((audioNow / (Music.STEP * 4)) % 1) * 2.2);
    const anyActive = INST.some((_, i) => Music.remaining(i) > 0);
    const glow = c.createRadialGradient(W / 2, H + 40, 20, W / 2, H + 40, H * 0.9);
    glow.addColorStop(0, `rgba(255,196,110,${0.16 + (anyActive ? beat * 0.12 : 0)})`);
    glow.addColorStop(1, 'rgba(255,196,110,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);

    // 경계선
    const danger = dangerMs > 400;
    c.save();
    c.setLineDash([8, 8]);
    c.strokeStyle = danger ? `rgba(255,90,90,${0.5 + 0.5 * Math.sin(now / 90)})` : 'rgba(255,240,220,.22)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, LINE_Y); c.lineTo(W, LINE_Y); c.stroke();
    c.restore();

    // 들고 있는 악기와 조준선
    if (started && !over && current !== null) {
      const x = clampAim(aimX, current);
      const ready = now >= canDropAt;
      c.strokeStyle = 'rgba(255,240,220,.18)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, DROP_Y); c.lineTo(x, H); c.stroke();
      c.save();
      c.globalAlpha = ready ? 1 : 0.45;
      c.translate(x, DROP_Y);
      Instruments.drawBall(c, current, INST[current].r);
      c.restore();
    }

    // 판 위의 악기들
    for (const b of bodies()) {
      const r = b.circleRadius;
      b.pop = Math.min(1, b.pop + 0.08);
      const playing = Music.remaining(b.tier) > 0;
      const hitAge = audioNow - pulse[b.tier];
      const bump = playing && hitAge >= 0 ? Math.exp(-hitAge * 14) : 0;
      const s = easeBack(b.pop) * (1 + bump * 0.07);
      c.save();
      c.translate(b.position.x, b.position.y);
      c.scale(s, s);
      Instruments.drawBall(c, b.tier, r, { angle: b.angle, glow: playing ? 0.5 + bump : 0 });
      c.restore();
    }

    // 파티클
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.kind === 'dot') p.vy += 0.12;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      c.globalAlpha = Math.min(1, p.life * 1.4);
      if (p.kind === 'note') {
        c.fillStyle = p.color;
        c.font = `${p.size}px "Jua", sans-serif`;
        c.textAlign = 'center';
        c.fillText(p.ch, p.x + Math.sin(p.life * 8) * 3, p.y);
      } else {
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function easeBack(t) {
    const k = 1.7;
    return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2);
  }

  /* ---------- HUD ---------- */

  const chips = [];
  function buildChain() {
    const chain = $('chain');
    INST.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'chip';
      li.title = it.name;
      const cv = document.createElement('canvas');
      const size = 64;
      cv.width = size; cv.height = size;
      const cc = cv.getContext('2d');
      cc.translate(size / 2, size / 2);
      Instruments.drawBall(cc, i, size / 2 - 3);
      li.appendChild(cv);
      const bar = document.createElement('span');
      bar.className = 'bar';
      li.appendChild(bar);
      chain.appendChild(li);
      chips.push({ li, bar });
    });

    // 시작 화면의 악기 목록
    const roster = $('roster');
    INST.forEach((it, i) => {
      const li = document.createElement('li');
      const cv = document.createElement('canvas');
      cv.width = 72; cv.height = 72;
      const cc = cv.getContext('2d');
      cc.translate(36, 36);
      Instruments.drawBall(cc, i, 33);
      const name = document.createElement('span');
      name.textContent = it.name;
      li.append(cv, name);
      roster.appendChild(li);
    });
  }

  function updateHud() {
    $('score').textContent = score.toLocaleString('ko-KR');
    if (score > best) {
      best = score;
      try { localStorage.setItem('hapjupang.best', String(best)); } catch (e) { /* 저장 불가 */ }
    }
    $('best').textContent = best.toLocaleString('ko-KR');
    nc.setTransform(1, 0, 0, 1, 0, 0);
    nc.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (next !== undefined && next !== null) {
      nc.translate(nextCanvas.width / 2, nextCanvas.height / 2);
      Instruments.drawBall(nc, next, nextCanvas.width / 2 - 4);
    }
  }

  let lastPlaying = '';
  function updateChain() {
    const names = [];
    chips.forEach((ch, i) => {
      const rem = Music.remaining(i);
      ch.li.classList.toggle('on', rem > 0);
      ch.bar.style.transform = `scaleX(${rem})`;
      if (rem > 0) names.push(INST[i].name);
    });
    const text = names.length ? names.join(' · ') : '악기를 떨어뜨리면 연주가 시작돼요';
    if (text !== lastPlaying) {
      $('playing').textContent = text;
      $('playing').classList.toggle('idle', !names.length);
      $('count').textContent = names.length ? names.length + '중주' : '쉼표';
      lastPlaying = text;
    }
  }

  /* ---------- 루프 ---------- */

  function step(now) {
    requestAnimationFrame(step);
    const dt = Math.min(50, now - (lastTime || now));
    lastTime = now;

    if (started && !over) {
      acc += dt;
      let n = 0;
      while (acc >= 1000 / 60 && n < 4) {
        Engine.update(engine, 1000 / 60);
        processMerges();
        acc -= 1000 / 60; n++;
      }
      if (n === 4) acc = 0;

      // 경계선 위에 오래 머물면 게임 끝
      let above = false;
      for (const b of bodies()) {
        if (now - b.born > 1200 && b.position.y - b.circleRadius < LINE_Y) { above = true; break; }
      }
      dangerMs = above ? dangerMs + dt : 0;
      if (dangerMs > 2600) endGame();
    }

    // 스케줄된 타격이 실제로 울리는 순간에 맞춰 효과를 낸다
    const audioNow = Music.now();
    for (let i = pendingHits.length - 1; i >= 0; i--) {
      const [tier, t] = pendingHits[i];
      if (t > audioNow) continue;
      pendingHits.splice(i, 1);
      pulse[tier] = t;
      if (now - lastNote[tier] > 380) {
        const list = bodies().filter((b) => b.tier === tier);
        if (list.length) { noteFrom(list[(Math.random() * list.length) | 0]); lastNote[tier] = now; }
      }
    }

    if (engine) drawBoard(now, audioNow);
    updateChain();
  }

  function endGame() {
    over = true;
    // 판에 남은 모든 악기가 마지막으로 함께 연주한다
    const tiers = new Set(bodies().map((b) => b.tier));
    tiers.forEach((t) => Music.trigger(t, 8));
    $('final').textContent = score.toLocaleString('ko-KR');
    $('finalCount').textContent = tiers.size;
    $('over').hidden = false;
    updateHud();
  }

  function ensemble() {
    if (!started) return;
    const tiers = new Set(bodies().map((b) => b.tier));
    if (!tiers.size) { toast('판에 악기가 없어요'); return; }
    tiers.forEach((t) => Music.trigger(t, INST[t].secs));
    toast(tiers.size + '중주 합주!');
  }

  /* ---------- 시작 ---------- */

  $('startBtn').addEventListener('click', () => {
    Music.init();
    started = true;
    $('intro').hidden = true;
    newGame();
  });
  $('againBtn').addEventListener('click', () => { Music.init(); newGame(); });
  $('ensembleBtn').addEventListener('click', () => { Music.init(); ensemble(); });
  $('muteBtn').addEventListener('click', () => {
    Music.init();
    const m = !Music.isMuted();
    Music.setMuted(m);
    $('muteBtn').setAttribute('aria-pressed', String(m));
    $('muteBtn').textContent = m ? '소리 켜기' : '소리 끄기';
  });
  document.addEventListener('visibilitychange', () => { lastTime = 0; });

  window.addEventListener('resize', resize);
  buildChain();
  setupWorld();
  current = randomTier(); next = randomTier();
  updateHud();
  resize();
  requestAnimationFrame(step);
})();
