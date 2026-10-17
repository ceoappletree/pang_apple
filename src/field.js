// 지표 조사: 땅을 내려다보며 풀을 뽑고, 흙을 털고, 보이는 조각을 줍는다.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const GROUND = {
    hill: { soil: '#a8744a', soil2: '#8e5f3a', speck: '#cf9f6c', dust: '#c49a6c', debris: 'needles' },
    mud: { soil: '#8d8b78', soil2: '#77766a', speck: '#aaa894', dust: '#a8a08a', water: true },
    forest: { soil: '#7a5a3a', soil2: '#62482e', speck: '#9a7a52', dust: '#9c7e58', debris: 'leaves' },
    field: { soil: '#a07a50', soil2: '#8a6844', speck: '#c49b6a', dust: '#b8946a', debris: 'straw' },
  };

  // 조각 모양(들쭉날쭉한 다각형)과 무늬
  function shardSVG(type, size, k) {
    const t = G.SURFACE[type];
    const n = t.round ? 10 : 5 + Math.floor(Math.random() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd(-0.25, 0.25);
      const r = t.round ? 0.42 : rnd(0.3, 0.5);
      pts.push([50 + Math.cos(a) * r * 100, 50 + Math.sin(a) * r * 100]);
    }
    const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z';
    let deco = '';
    if (t.dots) for (let y = 30; y < 75; y += 11) for (let x = 28 + (y % 22 ? 5 : 0); x < 76; x += 11) deco += `<circle cx="${x}" cy="${y}" r="3.2" fill="none" stroke="#f1ece0" stroke-width="1.6"/>`;
    if (t.crane) deco += `<circle cx="50" cy="48" r="16" fill="none" stroke="#f3f2e8" stroke-width="3"/><path d="M40,50 l10,-6 l10,6 M50,44 l2,-8" fill="none" stroke="#f3f2e8" stroke-width="3"/>`;
    if (t.glaze) deco += `<path d="M30,40 Q50,30 66,44 Q56,58 38,56Z" fill="${t.glaze}" opacity=".8"/><path d="M36,42 Q48,36 58,44" stroke="#9fb39a" stroke-width="2" fill="none"/>`;
    if (t.shine || type === 'bae') deco += `<path d="M34,36 Q50,28 64,36" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>`;
    if (type === 'cel') deco += `<path d="M34,40 Q50,32 66,42" stroke="#d6f0e2" stroke-width="3" fill="none" opacity=".8"/>`;
    if (t.round) deco += `<ellipse cx="50" cy="50" rx="18" ry="18" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`;
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}"><defs><clipPath id="fs${k}"><path d="${d}"/></clipPath></defs>` +
      `<g clip-path="url(#fs${k})"><rect width="100" height="100" fill="${t.fill}"/>${deco}<rect width="100" height="100" fill="url(#fsh)"/></g>` +
      `<path d="${d}" fill="none" stroke="#2a1d14" stroke-width="3" stroke-linejoin="round"/></svg>`;
  }

  function tuftSVG() {
    let s = '<svg viewBox="0 0 100 100">';
    const greens = ['#5f8c44', '#4f7a3a', '#76a052', '#3f6a30'];
    for (let i = 0; i < 14; i++) {
      const x = rnd(18, 82), h = rnd(40, 78), bend = rnd(-20, 20);
      s += `<path d="M${x},96 Q${x + bend * 0.4},${96 - h * 0.6} ${x + bend},${96 - h}" stroke="${greens[i % 4]}" stroke-width="${rnd(5, 8).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    }
    s += '<ellipse cx="50" cy="94" rx="34" ry="7" fill="rgba(0,0,0,.25)"/></svg>';
    return s;
  }

  G.Field = {
    start(opts, onEnd) {
      this.opts = opts;
      this.onEnd = onEnd;
      this.found = [];
      this.keyFound = false;
      this.over = false;
      $('#field-title').textContent = opts.title || '지표 조사';
      $('#field-sub').textContent = opts.sub || '풀을 뽑고 흙을 털어 조각을 찾으세요';
      $('#field-tray').innerHTML = '';
      $('#field-done').onclick = () => this.finish();
      requestAnimationFrame(() => this.build());
    },

    build() {
      const o = this.opts;
      const g = GROUND[o.ground] || GROUND.field;
      const wrap = $('.field-wrap').getBoundingClientRect();
      const side = Math.floor(Math.max(220, Math.min(wrap.width - 24, wrap.height - 8, 460)));
      this.side = side;
      const box = $('#ground');
      box.style.width = box.style.height = side + 'px';
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.dpr = dpr;

      // 1) 바탕 흙
      const base = $('#ground-base');
      base.width = base.height = side * dpr;
      base.style.width = base.style.height = side + 'px';
      const b = base.getContext('2d');
      b.scale(dpr, dpr);
      b.fillStyle = g.soil; b.fillRect(0, 0, side, side);
      for (let i = 0; i < 70; i++) { b.fillStyle = g.soil2 + '88'; b.beginPath(); b.arc(rnd(0, side), rnd(0, side), rnd(8, 40), 0, 7); b.fill(); }
      for (let i = 0; i < 500; i++) { b.fillStyle = Math.random() < 0.5 ? g.speck : g.soil2; b.fillRect(rnd(0, side), rnd(0, side), rnd(1, 3), rnd(1, 3)); }
      for (let i = 0; i < 14; i++) {
        const x = rnd(0, side), y = rnd(0, side), r = rnd(4, 11);
        b.fillStyle = '#8f8b84'; b.beginPath(); b.ellipse(x, y, r * 1.3, r, rnd(0, 3), 0, 7); b.fill();
        b.strokeStyle = '#4f4b45'; b.lineWidth = 1.5; b.stroke();
        b.fillStyle = 'rgba(255,255,255,.35)'; b.beginPath(); b.arc(x - r * 0.4, y - r * 0.3, r * 0.35, 0, 7); b.fill();
      }
      if (g.debris === 'needles') for (let i = 0; i < 90; i++) { const x = rnd(0, side), y = rnd(0, side), a = rnd(0, 7); b.strokeStyle = '#6b4a28'; b.lineWidth = 1.4; b.beginPath(); b.moveTo(x, y); b.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); b.stroke(); }
      if (g.debris === 'leaves') for (let i = 0; i < 40; i++) { const x = rnd(0, side), y = rnd(0, side); b.fillStyle = ['#c47a2a', '#a8552a', '#d9a03a', '#7a5a2a'][i % 4]; b.beginPath(); b.ellipse(x, y, 9, 5, rnd(0, 3), 0, 7); b.fill(); }
      if (g.debris === 'straw') for (let i = 0; i < 50; i++) { const x = rnd(0, side), y = rnd(0, side), a = rnd(0, 7); b.strokeStyle = '#d9c27a'; b.lineWidth = 2; b.beginPath(); b.moveTo(x, y); b.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); b.stroke(); }
      if (g.water) {
        const grd = b.createLinearGradient(0, 0, 0, side * 0.22);
        grd.addColorStop(0, '#4f86a6'); grd.addColorStop(1, '#7fb2cc');
        b.fillStyle = grd;
        b.beginPath(); b.moveTo(0, 0); b.lineTo(side, 0); b.lineTo(side, side * 0.16);
        for (let x = side; x >= 0; x -= 20) b.lineTo(x, side * 0.18 + Math.sin(x / 30) * 8);
        b.closePath(); b.fill();
        b.strokeStyle = '#d6ecf4'; b.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const x = rnd(10, side - 60), y = rnd(10, side * 0.13); b.beginPath(); b.moveTo(x, y); b.lineTo(x + 30, y); b.stroke(); }
      }

      // 2) 조각
      const shards = [];
      const n = o.count;
      const types = [];
      if (o.key) types.push(o.key);
      while (types.length < n) types.push(o.mix[Math.floor(Math.random() * o.mix.length)]);
      const top = g.water ? side * 0.26 : 30;
      types.forEach((type, i) => {
        let x, y, tries = 0;
        do { x = rnd(36, side - 36); y = rnd(top + 10, side - 36); tries++; }
        while (tries < 50 && shards.some((s) => Math.hypot(s.x - x, s.y - y) < 60));
        const key = !!G.SURFACE[type].key;
        const size = key ? rnd(44, 52) : rnd(28, 40);
        const r = Math.random();
        const cover = key ? (r < 0.65 ? 'dust' : 'grass') : r < 0.35 ? 'none' : r < 0.7 ? 'dust' : 'grass';
        shards.push({ type, x, y, size, cover, key, picked: false, id: i });
      });
      this.shards = shards;
      const sh = $('#ground-shards');
      sh.innerHTML = '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="fsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs></svg>';
      for (const s of shards) {
        const el = document.createElement('div');
        el.className = 'gshard' + (s.cover === 'none' && !s.key ? ' half' : '');
        el.style.cssText = `left:${s.x}px;top:${s.y}px;transform:translate(-50%,-50%) rotate(${rnd(0, 360).toFixed(0)}deg)`;
        el.innerHTML = shardSVG(s.type, s.size, s.id);
        sh.appendChild(el);
        s.el = el;
      }

      // 3) 흙먼지(문질러서 털어 내는 층)
      const dust = $('#ground-dust');
      dust.width = dust.height = side * dpr;
      dust.style.width = dust.style.height = side + 'px';
      const d = dust.getContext('2d');
      d.scale(dpr, dpr);
      this.dctx = d;
      const blob = (cx, cy, r) => {
        for (let i = 0; i < 16; i++) {
          d.fillStyle = g.dust;
          d.beginPath(); d.arc(cx + rnd(-r, r) * 0.6, cy + rnd(-r, r) * 0.6, rnd(r * 0.4, r * 0.75), 0, 7); d.fill();
        }
        for (let i = 0; i < 60; i++) { d.fillStyle = Math.random() < 0.5 ? g.soil2 : g.speck; d.fillRect(cx + rnd(-r, r), cy + rnd(-r, r), 2, 2); }
      };
      for (const s of shards) if (s.cover === 'dust') blob(s.x, s.y, s.size * 1.3);
      for (let i = 0; i < 5; i++) blob(rnd(40, side - 40), rnd(top + 20, side - 40), rnd(36, 60));
      // 그냥 보이는 조각 위의 흙은 걷어 둔다
      d.save();
      d.globalCompositeOperation = 'destination-out';
      for (const s of shards) if (s.cover === 'none') { d.beginPath(); d.arc(s.x, s.y, s.size * 0.75, 0, 7); d.fill(); }
      d.restore();

      // 4) 풀
      const grass = $('#ground-grass');
      grass.innerHTML = '';
      this.tufts = [];
      const addTuft = (x, y, size) => {
        const t = document.createElement('button');
        t.className = 'tuft';
        t.setAttribute('aria-label', '풀 뽑기');
        t.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px`;
        t.innerHTML = tuftSVG();
        const tuft = { x, y, r: size * 0.42, el: t, gone: false };
        t.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.pull(tuft); });
        grass.appendChild(t);
        this.tufts.push(tuft);
      };
      for (const s of shards) if (s.cover === 'grass') addTuft(s.x + rnd(-6, 6), s.y + rnd(-6, 6), s.size * 2 + 14);
      for (let i = 0; i < 8; i++) addTuft(rnd(30, side - 30), rnd(top + 10, side - 30), rnd(56, 84));

      this.bindDust(dust);
      this.paintCount();
      this.tip(o.tip || '풀을 누르면 뽑혀요. 손가락으로 문지르면 흙이 털려요. 보이는 조각은 눌러서 주워요.');
    },

    bindDust(cv) {
      let down = null, last = null, lastSnd = 0;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      cv.onpointerdown = (e) => {
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        down = { ...pos(e), t: Date.now(), moved: 0 };
        last = pos(e);
      };
      cv.onpointermove = (e) => {
        if (!down) return;
        const p = pos(e);
        down.moved += Math.hypot(p.x - last.x, p.y - last.y);
        if (down.moved > 8) {
          const d = this.dctx;
          d.save();
          d.globalCompositeOperation = 'destination-out';
          d.lineCap = 'round'; d.lineWidth = 30;
          d.beginPath(); d.moveTo(last.x, last.y); d.lineTo(p.x, p.y); d.stroke();
          d.restore();
          if (Date.now() - lastSnd > 90) { G.sfx.brush(); lastSnd = Date.now(); }
          this.puff(p.x, p.y);
        }
        last = p;
      };
      cv.onpointerup = (e) => {
        if (down && down.moved < 10 && Date.now() - down.t < 500) this.tap(pos(e));
        down = null;
      };
      cv.onpointercancel = () => { down = null; };
    },

    puff(x, y) {
      if (Math.random() < 0.6) return;
      const p = document.createElement('i');
      p.className = 'dustpuff';
      p.style.left = x + 'px'; p.style.top = y + 'px';
      $('#ground').appendChild(p);
      const a = p.animate([{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 0.8 }, { transform: `translate(${rnd(-30, 30)}px,${rnd(-40, -10)}px) scale(1.6)`, opacity: 0 }], { duration: 500 });
      a.onfinish = () => p.remove();
    },

    pull(t) {
      if (t.gone) return;
      t.gone = true;
      G.sfx.pull();
      t.el.classList.add('pulled');
      setTimeout(() => t.el.remove(), 500);
    },

    covered(s) {
      if (this.tufts.some((t) => !t.gone && Math.hypot(t.x - s.x, t.y - s.y) < t.r)) return 'grass';
      const dpr = this.dpr;
      let a = 0, n = 0;
      for (const [dx, dy] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
        const px = Math.round((s.x + dx * s.size) * dpr), py = Math.round((s.y + dy * s.size) * dpr);
        a += this.dctx.getImageData(px, py, 1, 1).data[3]; n++;
      }
      return a / n > 70 ? 'dust' : null;
    },

    tap(p) {
      let best = null;
      for (const s of this.shards) {
        if (s.picked) continue;
        const d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d < s.size * 0.7 && (!best || d < best.d)) best = { s, d };
      }
      if (!best) return;
      const s = best.s;
      const c = this.covered(s);
      if (c === 'grass') { G.ui.toast('풀에 가려 있어요. 풀을 먼저 뽑아요'); return; }
      if (c === 'dust') { G.ui.toast('뭔가 있어요! 흙을 더 털어 보세요'); G.sfx.probe(true); return; }
      this.pick(s);
    },

    pick(s) {
      s.picked = true;
      const t = G.SURFACE[s.type];
      this.found.push(s.type);
      s.el.classList.add('picked');
      setTimeout(() => s.el.remove(), 600);
      const icon = document.createElement('div');
      icon.className = 'find' + (t.key ? ' complete' : '');
      icon.innerHTML = shardSVG(s.type, 42, 'tray' + s.id) + `<span>${t.key ? '증거!' : '수습'}</span>`;
      $('#field-tray').appendChild(icon);
      this.paintCount();
      if (t.key) {
        this.keyFound = true;
        G.sfx.discover();
        G.ui.toast(`${t.name}! 결정적인 증거예요`);
        setTimeout(() => this.finish(), 900);
        return;
      }
      G.sfx.find(false);
      G.ui.toast(`${t.name}을 주웠어요`);
      if (this.shards.every((x) => x.picked)) {
        this.tip('이 땅의 조각은 다 찾았어요. 지도로 돌아가 다른 곳을 살펴봐요.');
        $('#field-done').classList.add('glow');
      }
    },

    paintCount() {
      $('#field-count').textContent = `주운 조각 ${this.found.length}`;
    },

    tip(text) {
      $('#field-tip').textContent = text;
    },

    finish() {
      if (this.over) return;
      this.over = true;
      $('#field-done').classList.remove('glow');
      this.onEnd({ found: this.found.slice(), key: this.keyFound, total: this.shards.length });
    },
  };
})();
