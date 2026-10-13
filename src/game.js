/* 합주팡 — 게임 진행(물리, 입력, 세트, 그리기) */
(function () {
  'use strict';

  const { Engine, Bodies, Composite, Events, Body } = Matter;
  const W = 400, H = 640;            // 게임 판의 논리 크기
  const DROP_Y = 46;                 // 악기를 드는 높이
  const LINE_Y = 92;                 // 이 선 위로 악기가 머무르면 끝
  const DROP_COOLDOWN = 520;
  const SPAWN_TIERS = 5;             // 떨어뜨릴 수 있는 건 작은 악기 5종
  const N = 11;

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const c = canvas.getContext('2d');
  const nextCanvas = $('next');
  const nc = nextCanvas.getContext('2d');
  const djCanvas = $('dj');
  const djc = djCanvas.getContext('2d');

  let setIdx = 0, SET = SETS[0], INST = SET.instruments;
  let pickIdx = 0;                   // 시작 화면에서 고른 세트
  let engine, scale = 1, dpr = 1;
  let current, next, aimX = W / 2, canDropAt = 0;
  let score = 0, over = false, playing = false, inGame = false;
  let dangerMs = 0, lastTime = 0, acc = 0;
  const mergeQueue = [];
  const particles = [];
  const pulse = new Array(N).fill(-10);
  const pendingHits = [];
  const lastNote = new Array(N).fill(0);

  /* ---------- 저장(해금, 최고 점수) ---------- */

  const store = {
    get(k, d) { try { const v = localStorage.getItem('hapjupang.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('hapjupang.' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } },
  };
  let unlocked = Math.max(0, Math.min(SETS.length - 1, store.get('unlocked', 0) | 0));
  const bests = store.get('bests', {}) || {};
  const cleared = store.get('cleared', {}) || {};   // 가장 큰 악기를 만든 세트
  let saved = store.get('save', null);              // 진행 중이던 판
  let lastSave = 0;

  // 진행 중인 판(점수, 다음 악기, 판 위 악기 위치)을 저장한다
  function saveGame() {
    if (!inGame || over || !engine) return;
    saved = {
      set: SET.id, score, current, next,
      bodies: bodies().filter((b) => !b.merging).map((b) => [b.tier, Math.round(b.position.x * 10) / 10, Math.round(b.position.y * 10) / 10, Math.round(b.angle * 100) / 100]),
    };
    store.set('save', saved);
  }
  function dropSave() { saved = null; store.set('save', null); }

  function restoreGame(sv) {
    const i = SETS.findIndex((x) => x.id === sv.set);
    if (i < 0 || i > unlocked) return false;
    useSet(i);
    newGame();
    score = sv.score | 0;
    if (sv.current >= 0 && sv.current < SPAWN_TIERS) current = sv.current;
    if (sv.next >= 0 && sv.next < SPAWN_TIERS) next = sv.next;
    const now = performance.now();
    for (const [tier, x, y, angle] of sv.bodies || []) {
      if (!(tier >= 0 && tier < N)) continue;
      const b = makeBody(tier, x, y);
      Body.setAngle(b, angle || 0);
      b.born = now - 5000;
      Composite.add(engine.world, b);
    }
    updateHud();
    return true;
  }

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

  function useSet(i) {
    setIdx = i;
    SET = SETS[i];
    INST = SET.instruments;
    document.documentElement.dataset.set = SET.id;
    Music.setSong(SET);
    buildChain();
  }

  function newGame() {
    if (engine) {
      Events.off(engine);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    }
    setupWorld();
    score = 0; over = false; dangerMs = 0;
    particles.length = 0; mergeQueue.length = 0; pendingHits.length = 0;
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
    if (!playing || over) return;
    if (e.key === 'ArrowLeft') aimX -= 18;
    else if (e.key === 'ArrowRight') aimX += 18;
    else if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); drop(); }
  });

  function drop() {
    if (!playing || over || current === null) return;
    const now = performance.now();
    if (now < canDropAt) return;
    const x = clampAim(aimX, current);
    const b = makeBody(current, x, DROP_Y);
    Body.setVelocity(b, { x: 0, y: 2 });
    Composite.add(engine.world, b);
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
      if (tier < N - 1) {
        const nt = tier + 1;
        const nb = makeBody(nt, x, y);
        nb.pop = 0.6;
        Body.setVelocity(nb, { x: (a.velocity.x + b.velocity.x) / 2, y: Math.min(0, (a.velocity.y + b.velocity.y) / 2) });
        Composite.add(engine.world, nb);
        score += INST[nt].points;
        burst(x, y, INST[nt].color, 10 + nt * 2);
        const same = bodies().filter((o) => o.tier === nt).length;
        const st = Music.status(nt);
        if (same > 1) toast(`${INST[nt].name} ${same}개 · ${same}배 긴 연주`);
        else toast(INST[nt].name + (st && st.playing ? '!' : ' 등장 · 다음 첫 박에 합류'));
        checkUnlock(nt);
        if (nt === N - 1 && !cleared[SET.id]) {
          cleared[SET.id] = true;
          store.set('cleared', cleared);
          setTimeout(() => toast(`${SET.name} 클리어!`), 1400);
          burst(x, y, '#ffffff', 40);
        }
      } else {
        // 가장 큰 악기 두 개가 만나면 박수와 함께 사라진다
        score += 100;
        burst(x, y, '#ffd36b', 60);
        toast('앙코르! +100');
      }
      updateHud();
    }
  }

  function checkUnlock(tier) {
    if (tier < SET_RULES.UNLOCK_TIER || setIdx + 1 >= SETS.length || unlocked > setIdx) return;
    unlocked = setIdx + 1;
    store.set('unlocked', unlocked);
    setTimeout(() => toast(`새 세트 해금: ${SETS[unlocked].name}`), 1400);
    buildSetPicker();
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

  Music.onHit((tier, t, slot) => { if (tier < N) pendingHits.push([tier, t, slot]); });
  Music.onSamples((ok) => { if (ok && inGame) toast('실제 악기 소리 준비 완료'); });

  /* ---------- 화면 ---------- */

  function resize() {
    const wrap = $('stage');
    scale = Math.min(wrap.clientWidth / W, wrap.clientHeight / H);
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.style.width = W * scale + 'px';
    canvas.style.height = H * scale + 'px';
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
  }

  function bodies() {
    return engine ? Composite.allBodies(engine.world).filter((b) => b.tier !== undefined) : [];
  }

  // 같은 악기 중 지금 차례인 것(먼저 온 순서대로 돌아간다)
  function soloist(list, tier) {
    const st = Music.status(tier);
    if (!st || !st.playing || st.resting) return null;
    const same = list.filter((b) => b.tier === tier).sort((a, b) => a.born - b.born);
    return same.length ? same[st.slot % same.length] : null;
  }

  let accent = '#ffc65c';
  function readAccent() {
    accent = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#ffc65c';
  }

  function drawBoard(now, audioNow) {
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    // 지휘 박자에 맞춰 바닥 조명이 밝아지고, 소절 묶음의 첫 박에는 크게 번쩍인다
    const cond = Music.conductor();
    let light = 0;
    if (cond) {
      const inBeat = 1 - ((cond.toNext % cond.beatLen) / cond.beatLen);
      const k = Math.max(0, 1 - inBeat * 2.2);
      light = (cond.bar === 0 && cond.beat === 0 ? 0.35 : 0.12) * k;
    }
    const glow = c.createRadialGradient(W / 2, H + 40, 20, W / 2, H + 40, H * 0.9);
    glow.addColorStop(0, `rgba(${SET.light},${0.16 + light})`);
    glow.addColorStop(1, `rgba(${SET.light},0)`);
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
    if (playing && !over && current !== null) {
      const x = clampAim(aimX, current);
      c.strokeStyle = 'rgba(255,240,220,.18)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, DROP_Y); c.lineTo(x, H); c.stroke();
      c.save();
      c.globalAlpha = now >= canDropAt ? 1 : 0.45;
      c.translate(x, DROP_Y);
      Icons.drawBall(c, INST[current], INST[current].r);
      c.restore();
    }

    // 판 위의 악기들
    const list = bodies();
    const solo = [];
    for (let i = 0; i < N; i++) solo[i] = soloist(list, i);
    for (const b of list) {
      const r = b.circleRadius;
      b.pop = Math.min(1, b.pop + 0.08);
      const st = Music.status(b.tier);
      const isSolo = solo[b.tier] === b;
      // 소리가 날 때마다 커졌다가 작아진다. 지금 차례인 악기는 더 크게.
      const hitAge = audioNow - pulse[b.tier];
      const sounding = !!(st && st.playing && !st.resting);
      const bump = sounding && hitAge >= 0 ? Math.exp(-hitAge * 10) : 0;
      const s = easeBack(b.pop) * (1 + bump * (isSolo ? 0.16 : 0.09));
      c.save();
      c.translate(b.position.x, b.position.y);
      c.scale(s, s);
      const glowAmt = isSolo ? 0.6 + bump : sounding ? 0.18 : 0;
      if (st && st.resting) c.globalAlpha = 0.72;   // 쉬는 악기는 살짝 흐리게
      Icons.drawBall(c, INST[b.tier], r, { angle: b.angle, glow: glowAmt });
      if (st && st.waiting) {
        // 합류 대기: 다음 첫 박까지 남은 시간을 테두리 호로 보여준다
        const left = Math.min(1, st.wait / Music.cycle());
        c.lineWidth = 3;
        c.strokeStyle = 'rgba(255,231,199,.25)';
        c.beginPath(); c.arc(0, 0, r + 4, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = accent;
        c.beginPath(); c.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - left)); c.stroke();
      } else if (isSolo && st.k > 1) {
        // 차례 표시: 같은 악기 중 지금 연주하는 것
        c.lineWidth = 2.5;
        c.strokeStyle = 'rgba(255,255,255,.85)';
        c.setLineDash([5, 5]);
        c.lineDashOffset = -now / 40;
        c.beginPath(); c.arc(0, 0, r + 4, 0, Math.PI * 2); c.stroke();
      }
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
      c.fillStyle = p.color;
      if (p.kind === 'note') {
        c.font = `${p.size}px "Jua", sans-serif`;
        c.textAlign = 'center';
        c.fillText(p.ch, p.x + Math.sin(p.life * 8) * 3, p.y);
      } else {
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

  function ballCanvas(it, size) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const cc = cv.getContext('2d');
    cc.translate(size / 2, size / 2);
    Icons.drawBall(cc, it, size / 2 - 3);
    return cv;
  }

  let chips = [];
  function buildChain() {
    const chain = $('chain');
    chain.textContent = '';
    chips = INST.map((it) => {
      const li = document.createElement('li');
      li.className = 'chip';
      li.title = it.name;
      li.appendChild(ballCanvas(it, 64));
      const badge = document.createElement('b');
      badge.className = 'badge';
      li.appendChild(badge);
      const bar = document.createElement('span');
      bar.className = 'bar';
      li.appendChild(bar);
      chain.appendChild(li);
      return { li, bar, badge, k: -1 };
    });
    lastPlaying = '';
  }

  function buildRoster(set) {
    const roster = $('roster');
    roster.textContent = '';
    set.instruments.forEach((it) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = it.name;
      li.append(ballCanvas(it, 72), name);
      roster.appendChild(li);
    });
  }

  function buildSetPicker() {
    const box = $('sets');
    box.textContent = '';
    SETS.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'set' + (i === pickIdx ? ' picked' : '');
      btn.id = 'set-' + s.id;
      const locked = i > unlocked;
      btn.disabled = locked;
      btn.setAttribute('aria-pressed', String(i === pickIdx));
      const num = document.createElement('span');
      num.className = 'set-no';
      num.textContent = i + 1 + '세트' + (locked ? ' · 잠김' : cleared[s.id] ? ' · 클리어' : '');
      if (cleared[s.id]) btn.classList.add('cleared');
      const nm = document.createElement('span');
      nm.className = 'set-name';
      nm.textContent = s.name;
      const sub = document.createElement('span');
      sub.className = 'set-sub';
      const best = bests[s.id] || 0;
      sub.textContent = locked
        ? `${SETS[i - 1].name}에서 ${SETS[i - 1].instruments[SET_RULES.UNLOCK_TIER].name} 만들면 열려요`
        : best ? `최고 ${best.toLocaleString('ko-KR')}점` : s.blurb;
      btn.append(num, nm, sub);
      btn.addEventListener('click', () => {
        if (locked) return;
        pickIdx = i;
        buildSetPicker();
        buildRoster(SETS[i]);
        document.documentElement.dataset.set = SETS[i].id;
        updateResume();
      });
      box.appendChild(btn);
    });
  }

  function updateHud() {
    $('score').textContent = score.toLocaleString('ko-KR');
    const prev = bests[SET.id] || 0;
    if (score > prev) { bests[SET.id] = score; store.set('bests', bests); }
    $('best').textContent = (bests[SET.id] || 0).toLocaleString('ko-KR');
    djCanvas.setAttribute('aria-label', `DJ 부스: ${SET.name}`);
    nc.setTransform(1, 0, 0, 1, 0, 0);
    nc.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (next !== undefined && next !== null) {
      nc.translate(nextCanvas.width / 2, nextCanvas.height / 2);
      Icons.drawBall(nc, INST[next], nextCanvas.width / 2 - 4);
    }
  }

  let lastPlaying = '', lastBeat = -2;
  const wasWaiting = new Array(N + 2).fill(false);
  const beats = [];
  function buildBaton() {
    const baton = $('baton');
    for (let bar = 0; bar < 4; bar++) {
      const g = document.createElement('span');
      g.className = 'measure';
      for (let b = 0; b < 4; b++) {
        const d = document.createElement('i');
        if (bar === 0 && b === 0) d.className = 'one';
        g.appendChild(d);
        beats.push(d);
      }
      baton.appendChild(g);
    }
  }

  function updateChain(counts) {
    const names = [], waiting = [], joined = [], resting = [];
    let waitSec = 0;
    chips.forEach((ch, i) => {
      const st = Music.status(i);
      const live = !!(st && st.playing), wait = !!(st && st.waiting);
      const rest = live && st.resting, on = live && !rest;
      ch.li.classList.toggle('on', on);
      ch.li.classList.toggle('rest', rest);
      ch.li.classList.toggle('wait', wait);
      if (ch.k !== counts[i]) {
        ch.k = counts[i];
        ch.badge.textContent = counts[i] > 1 ? '×' + counts[i] : '';
      }
      // 같은 악기가 여러 개면 막대가 지금 몇 번째 차례인지 보여준다
      ch.bar.style.transform = `scaleX(${on ? (st.slot + 1) / Math.max(1, counts[i], st.slot + 1) : 0})`;
      if (on) names.push(INST[i].name + (counts[i] > 1 ? `×${counts[i]}` : ''));
      if (rest) resting.push(INST[i].name);
      if (wait) { waiting.push(INST[i].name); waitSec = st.wait; }
      if (live && wasWaiting[i]) joined.push(INST[i].name);
      wasWaiting[i] = wait;
    });
    // 합주가 커지면 들어오는 보컬
    (SET.vocals || []).forEach((vc, j) => {
      const i = N + j;
      const st = Music.status(i);
      const live = !!(st && st.playing), wait = !!(st && st.waiting);
      if (live && !st.resting) names.push(vc.name);
      if (live && st.resting) resting.push(vc.name);
      if (wait) { waiting.push(vc.name); waitSec = st.wait; }
      if (live && wasWaiting[i]) joined.push(vc.name);
      wasWaiting[i] = wait;
    });
    if (joined.length) toast(joined.join(' · ') + ' 합류!');

    let text = names.length ? names.join(' · ') : '악기를 떨어뜨리면 첫 박부터 연주가 시작돼요';
    if (resting.length) text += (names.length ? ' · ' : '') + '쉬는 중: ' + resting.join(', ');
    if (waiting.length) text = `다음 첫 박까지 ${Math.ceil(waitSec)}초 · ${waiting.join(' · ')} 대기`;
    if (text !== lastPlaying) {
      $('playing').textContent = text;
      $('playing').classList.toggle('idle', !names.length && !waiting.length && !resting.length);
      $('count').textContent = names.length ? names.length + '중주' : waiting.length ? '준비' : '쉼표';
      lastPlaying = text;
    }

    const cond = Music.conductor();
    const cur = cond ? cond.bar * 4 + cond.beat : -1;
    if (cur !== lastBeat) {
      beats.forEach((el, i) => el.classList.toggle('cur', i === cur));
      lastBeat = cur;
    }
  }

  /* ---------- 루프 ---------- */

  function step(now) {
    requestAnimationFrame(step);
    const dt = Math.min(50, now - (lastTime || now));
    lastTime = now;

    if (playing && !over) {
      acc += dt;
      let n = 0;
      while (acc >= 1000 / 60 && n < 4) {
        Engine.update(engine, 1000 / 60);
        processMerges();
        acc -= 1000 / 60; n++;
      }
      if (n === 4) acc = 0;

      let above = false;
      for (const b of bodies()) {
        if (now - b.born > 1200 && b.position.y - b.circleRadius < LINE_Y) { above = true; break; }
      }
      dangerMs = above ? dangerMs + dt : 0;
      if (dangerMs > 2600) endGame();
    }

    // 판 위의 악기는 판에 있는 동안 계속 연주한다
    const list = bodies();
    const counts = new Array(N).fill(0);
    if (inGame) for (const b of list) counts[b.tier]++;
    Music.sync(counts);

    // 예약된 타격이 실제로 울리는 순간에 맞춰 효과를 낸다
    const audioNow = Music.now();
    for (let i = pendingHits.length - 1; i >= 0; i--) {
      const [tier, t] = pendingHits[i];
      if (t > audioNow) continue;
      pendingHits.splice(i, 1);
      pulse[tier] = t;
      if (now - lastNote[tier] > 380) {
        const b = soloist(list, tier);
        if (b) { noteFrom(b); lastNote[tier] = now; }
      }
    }

    if (engine) drawBoard(now, audioNow);
    updateChain(counts);
    drawDJ(now);

    if (inGame && !over && now - lastSave > 1500) { saveGame(); lastSave = now; }
  }

  function drawDJ(now) {
    const cond = Music.conductor();
    const phase = cond ? 1 - ((cond.toNext % cond.beatLen) / cond.beatLen) : 0;
    const dw = djCanvas.width, dh = djCanvas.height;
    const want = Math.round(djCanvas.clientWidth * dpr);
    if (want && dw !== want) {
      djCanvas.width = want;
      djCanvas.height = Math.round(want * 110 / 160);
    }
    const k = djCanvas.width / 160;
    djc.setTransform(k, 0, 0, k, 0, 0);
    DJ.draw(djc, 160, 110, {
      animal: SET.dj, accent, setName: SET.name, phase: phase >= 1 ? 0 : phase,
      beat: cond ? cond.beat : 0, bar: cond ? cond.bar : 0, playing: !!cond, time: now,
      singing: (() => { const v = Music.status(N + 1); return !!(v && v.playing && !v.resting); })(),
    });
  }

  function endGame() {
    over = true;
    dropSave();
    const tiers = new Set(bodies().map((b) => b.tier));
    $('final').textContent = score.toLocaleString('ko-KR');
    $('finalCount').textContent = tiers.size;
    $('over').hidden = false;
    updateHud();
  }

  /* ---------- 시작 화면 ---------- */

  function updateResume() {
    const btn = $('resumeBtn');
    if (inGame && !over && pickIdx === setIdx) {
      btn.hidden = false;
      btn.textContent = '이어서 연주';
    } else if (!inGame && saved && SETS[pickIdx].id === saved.set) {
      btn.hidden = false;
      btn.textContent = `저장된 판 이어서 · ${(saved.score | 0).toLocaleString('ko-KR')}점`;
    } else btn.hidden = true;
  }

  function openIntro() {
    saveGame();
    pickIdx = setIdx;
    playing = false;
    buildSetPicker();
    buildRoster(SETS[pickIdx]);
    updateResume();
    $('intro').hidden = false;
    $('over').hidden = true;
  }

  $('startBtn').addEventListener('click', () => {
    Music.init();
    useSet(pickIdx);
    readAccent();
    $('intro').hidden = true;
    inGame = true;
    playing = true;
    newGame();
  });
  $('resumeBtn').addEventListener('click', () => {
    Music.init();
    if (!inGame) {
      if (!saved || !restoreGame(saved)) return;
      inGame = true;
      toast('저장된 판을 불러왔어요');
    }
    $('intro').hidden = true;
    document.documentElement.dataset.set = SET.id;
    readAccent();
    playing = true;
  });
  $('againBtn').addEventListener('click', () => { Music.init(); playing = true; newGame(); });
  $('overSetBtn').addEventListener('click', openIntro);
  $('setBtn').addEventListener('click', openIntro);
  $('muteBtn').addEventListener('click', () => {
    Music.init();
    const m = !Music.isMuted();
    Music.setMuted(m);
    $('muteBtn').setAttribute('aria-pressed', String(m));
    $('muteBtn').textContent = m ? '소리 켜기' : '소리 끄기';
  });
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) saveGame();
  });
  window.addEventListener('pagehide', saveGame);
  window.addEventListener('resize', resize);

  pickIdx = unlocked;
  if (saved) {
    const si = SETS.findIndex((x) => x.id === saved.set);
    if (si >= 0 && si <= unlocked) pickIdx = si; else saved = null;
  }
  useSet(pickIdx);
  readAccent();
  buildBaton();
  buildSetPicker();
  buildRoster(SET);
  updateResume();
  setupWorld();
  current = randomTier(); next = randomTier();
  updateHud();
  resize();
  requestAnimationFrame(step);

  // 테스트용
  window.__game = {
    unlockAll() { unlocked = SETS.length - 1; store.set('unlocked', unlocked); buildSetPicker(); },
    spawn(tier, x) { if (engine) Composite.add(engine.world, makeBody(tier, x || W / 2, 140)); },
  };
})();
