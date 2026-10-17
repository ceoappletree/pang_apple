// 발굴 화면: 흙판을 파서 도자기 조각을 찾는다.
(function () {
  const COLS = 8, ROWS = 9;
  const STABILITY = 60;
  const TOOLS = {
    pick: { name: '곡괭이', cost: 2 },
    trowel: { name: '꽃삽', cost: 1 },
    probe: { name: '탐침', cost: 0 },
  };
  const PROBES = 3;
  const SHAPES = [
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]],
  ];

  const SMALL_SHAPES = [[[0, 0], [1, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0]]];

  const rnd = (n) => Math.floor(Math.random() * n);
  const $ = (sel, root = document) => root.querySelector(sel);

  // 이번 판에 묻을 조각 고르기: 아직 없는 조각을 우선한다.
  function pickPieces(site, count) {
    const missing = [], all = [];
    for (const pot of site.pots) {
      const have = G.store.pieces(pot);
      for (let i = 0; i < G.PIECES; i++) {
        all.push([pot, i]);
        if (!have[i]) missing.push([pot, i]);
      }
    }
    const chosen = [];
    const key = (p) => p[0] + p[1];
    while (chosen.length < count) {
      const pool = missing.length && Math.random() < 0.75 ? missing : all;
      const left = pool.filter((p) => !chosen.some((c) => key(c) === key(p)));
      const src = left.length ? left : all.filter((p) => !chosen.some((c) => key(c) === key(p)));
      if (!src.length) break;
      chosen.push(src[rnd(src.length)]);
    }
    return chosen;
  }

  function makeBoard(site) {
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) cells.push({ c, r, depth: 1 + rnd(3), shard: -1, probe: '' });
    }
    // 흙 두께를 이웃과 섞어 덩어리지게, 군데군데 단단한 돌(4)
    for (const cell of cells) {
      if (Math.random() < 0.18) cell.depth = Math.min(3, cell.depth + 1);
      if (Math.random() < 0.06) cell.depth = 4;
    }
    const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? null : cells[r * COLS + c]);
    const shards = [];
    const place = (props, shapes) => {
      for (let t = 0; t < 300; t++) {
        let shape = shapes[rnd(shapes.length)];
        if (Math.random() < 0.5) shape = shape.map(([x, y]) => [y, x]);
        const w = Math.max(...shape.map((p) => p[0])) + 1, h = Math.max(...shape.map((p) => p[1])) + 1;
        const ox = rnd(COLS - w + 1), oy = rnd(ROWS - h + 1);
        const spots = shape.map(([x, y]) => at(ox + x, oy + y));
        if (spots.some((s) => s.shard !== -1)) continue;
        const idx = shards.length;
        spots.forEach((s) => { s.shard = idx; if (s.depth === 4) s.depth = 3; });
        shards.push(Object.assign({ cells: spots, x: ox, y: oy, w, h, hp: 2, state: 'buried' }, props));
        return;
      }
    };
    const count = 3 + (Math.random() < 0.5 ? 1 : 0);
    for (const [pot, piece] of pickPieces(site, count)) place({ pot, piece }, SHAPES);
    // 그릇 조각 말고 따로 모으는 발굴품(명문 조각, 가마 도구) — 게임마다 G.digExtras로 정한다
    for (const extra of G.digExtras ? G.digExtras(site) : []) place({ extra }, SMALL_SHAPES);
    return { cells, shards, at };
  }

  function edgesSVG(shard, size) {
    const set = new Set(shard.cells.map((s) => s.c + ',' + s.r));
    let d = '';
    for (const s of shard.cells) {
      const x = (s.c - shard.x) * size, y = (s.r - shard.y) * size;
      if (!set.has(s.c + ',' + (s.r - 1))) d += `M${x},${y}h${size}`;
      if (!set.has(s.c + ',' + (s.r + 1))) d += `M${x},${y + size}h${size}`;
      if (!set.has(s.c - 1 + ',' + s.r)) d += `M${x},${y}v${size}`;
      if (!set.has(s.c + 1 + ',' + s.r)) d += `M${x + size},${y}v${size}`;
    }
    return d;
  }

  G.Dig = {
    start(site, onEnd) {
      this.site = site;
      this.onEnd = onEnd;
      this.board = makeBoard(site);
      this.stab = STABILITY;
      this.probes = PROBES;
      this.tool = 'trowel';
      this.results = [];
      this.over = false;
      G.store.S.digs += 1;
      G.store.save();
      this.render();
    },

    render() {
      const site = this.site;
      const scr = $('#dig-screen');
      scr.classList.toggle('sea', !!site.sea);
      $('#dig-title').textContent = site.name;
      $('#dig-sub').textContent = '정밀 조사 · ' + (site.digSub || '흙을 걷어 내세요');
      const board = $('#board');
      // 판을 비운 채로 남은 자리를 재서, 그 안에 꼭 맞게 칸 크기를 정한다(틀 두께 26px)
      board.style.width = board.style.height = '0px';
      const room = $('.board-wrap').getBoundingClientRect();
      const availW = Math.min(room.width - 24 - 26, 440);
      const availH = room.height - 8 - 26;
      const size = Math.max(22, Math.floor(Math.min(availW / COLS, availH / ROWS)));
      this.size = size;
      board.style.width = COLS * size + 'px';
      board.style.height = ROWS * size + 'px';
      board.innerHTML = '';
      // 조각(흙 아래)
      this.board.shards.forEach((sh, i) => {
        const w = sh.w * size, h = sh.h * size;
        const el = document.createElement('div');
        el.className = 'shard';
        el.style.cssText = `left:${sh.x * size}px;top:${sh.y * size}px;width:${w}px;height:${h}px`;
        const clip = sh.cells.map((s) => `<rect x="${(s.c - sh.x) * size}" y="${(s.r - sh.y) * size}" width="${size}" height="${size}"/>`).join('');
        el.innerHTML =
          `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><clipPath id="sc${i}">${clip}</clipPath></defs>` +
          `<g clip-path="url(#sc${i})"><g transform="scale(${size / 30})">${sh.extra ? G.art.extraFill(sh.extra, w / (size / 30), h / (size / 30)) : G.art.shardFill(sh.pot, w / (size / 30), h / (size / 30))}</g>` +
          `<path class="crack" d="M${w * 0.2},${h * 0.1} l${w * 0.2},${h * 0.3} l-${w * 0.1},${h * 0.2} l${w * 0.3},${h * 0.35}" fill="none" stroke="#2b1d12" stroke-width="2"/>` +
          `<rect class="rubble" width="${w}" height="${h}" fill="url(#rubble)"/></g>` +
          `<path d="${edgesSVG(sh, size)}" stroke="#3b2a1c" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
        board.appendChild(el);
        sh.el = el;
      });
      // 흙
      for (const cell of this.board.cells) {
        const el = document.createElement('button');
        el.className = 'soil';
        el.style.cssText = `left:${cell.c * size}px;top:${cell.r * size}px;width:${size}px;height:${size}px`;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.hit(cell); });
        board.appendChild(el);
        cell.el = el;
      }
      // 발굴 구획 실(2칸마다)
      const strings = document.createElement('div');
      strings.className = 'grid-strings';
      strings.style.backgroundSize = `${size * 2}px ${size * 2}px`;
      board.appendChild(strings);
      this.board.cells.forEach((c) => this.paint(c));
      this.board.shards.forEach((s) => this.paintShard(s));
      this.paintHud();
      document.querySelectorAll('.tool').forEach((b) => {
        b.onclick = () => { this.tool = b.dataset.tool; this.paintHud(); };
      });
      $('#dig-quit').onclick = () => this.finish('quit');
      $('#finds').innerHTML = '';
    },

    paint(cell) {
      cell.el.className = 'soil d' + cell.depth + (cell.probe ? ' probe-' + cell.probe : '');
    },

    paintShard(sh) {
      sh.el.classList.toggle('cracked', sh.hp === 1 && sh.state !== 'broken');
      sh.el.classList.toggle('broken', sh.state === 'broken');
      sh.el.classList.toggle('found', sh.state === 'found');
    },

    paintHud() {
      const pct = Math.max(0, this.stab / STABILITY) * 100;
      $('#stab-fill').style.width = pct + '%';
      $('#stab-fill').classList.toggle('low', pct < 30);
      $('#stab-num').textContent = Math.max(0, this.stab);
      document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === this.tool));
      $('#probe-left').textContent = this.probes;
      const left = this.board.shards.filter((s) => s.state === 'buried').length;
      $('#dig-left').textContent = `남은 조각 ${left}`;
    },

    hit(cell) {
      if (this.over) return;
      const tool = this.tool;
      if (tool === 'probe') {
        if (this.probes <= 0 || cell.probe) return;
        this.probes -= 1;
        const sh = this.board.shards[cell.shard];
        cell.probe = sh && sh.state === 'buried' ? 'yes' : 'no';
        G.sfx.probe(cell.probe === 'yes');
        this.paint(cell);
        if (this.probes === 0) this.tool = 'trowel';
        this.paintHud();
        return;
      }
      const cost = TOOLS[tool].cost;
      const touched = [];
      if (tool === 'trowel') {
        if (cell.depth === 0) return; // 빈 칸을 긁어도 힘만 든다 — 막아 둔다
        this.dig(cell, 1, true, touched);
      } else {
        this.dig(cell, 2, false, touched);
        const { at } = this.board;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = at(cell.c + dx, cell.r + dy);
          if (n) this.dig(n, 1, false, touched);
        }
      }
      this.stab -= cost;
      this.burst(cell, tool === 'pick' ? 14 : 7);
      G.sfx.dig(tool === 'pick');
      this.shake(tool === 'pick');
      touched.forEach((c) => this.paint(c));
      this.checkFinds();
      this.paintHud();
      if (this.board.shards.every((s) => s.state !== 'buried')) {
        this.over = true;
        setTimeout(() => this.finish('clear'), 700);
      } else if (this.stab <= 0) {
        this.over = true;
        G.sfx.collapse();
        $('#board').classList.add('collapse');
        setTimeout(() => this.finish('collapse'), 900);
      }
    },

    // amount 만큼 흙을 걷는다. 흙보다 세게 치면 남는 힘이 조각에 닿아 금이 간다.
    dig(cell, amount, safe, touched) {
      const excess = Math.max(0, amount - cell.depth);
      cell.depth = Math.max(0, cell.depth - amount);
      if (cell.depth === 0) cell.probe = '';
      touched.push(cell);
      const sh = this.board.shards[cell.shard];
      if (!safe && excess > 0 && sh && sh.state === 'buried') {
        sh.hp -= 1; // 한 번 칠 때마다 금 하나, 두 번이면 부서진다
        if (sh.hp <= 0) {
          sh.state = 'broken';
          G.sfx.crack(true);
          this.toast('쨍그랑! 조각이 부서졌어요');
        } else {
          G.sfx.crack(false);
          this.toast('앗, 조각에 금이 갔어요. 한 번 더 치면 부서져요');
        }
        this.paintShard(sh);
      }
    },

    checkFinds() {
      for (const sh of this.board.shards) {
        if (sh.state !== 'buried' || !sh.cells.every((c) => c.depth === 0)) continue;
        sh.state = 'found';
        this.paintShard(sh);
        this.sparkle(sh);
        if (sh.extra) {
          const res = G.store.addExtra(sh.extra.id);
          G.store.save();
          this.results.push({ extra: sh.extra, res });
          G.sfx.find(res === 'new' && sh.extra.kind !== 'tool');
          this.addExtraFind(sh.extra, res);
          continue;
        }
        const res = G.store.addPiece(sh.pot, sh.piece);
        G.store.save();
        this.results.push({ pot: sh.pot, piece: sh.piece, res });
        G.sfx.find(res === 'complete');
        this.addFind(sh, res);
      }
    },

    addFind(sh, res) {
      const pot = G.POTS[sh.pot];
      const el = document.createElement('div');
      el.className = 'find ' + res;
      const pieces = Array(G.PIECES).fill(false);
      pieces[sh.piece] = true;
      el.innerHTML = G.art.potSVG(sh.pot, pieces) +
        `<span>${res === 'dup' ? '중복' : res === 'complete' ? '복원!' : '새 조각'}</span>`;
      el.title = pot.name;
      $('#finds').appendChild(el);
      this.toast(res === 'dup'
        ? `${pot.name} 조각(이미 있음) → 연구 점수 +1`
        : `${pot.name}의 ${G.art.PIECE_NAMES[sh.piece]}을 찾았어요!`);
    },

    addExtraFind(item, res) {
      const el = document.createElement('div');
      const tool = item.kind === 'tool';
      el.className = 'find ' + (tool ? 'dup' : 'complete');
      el.innerHTML = G.art.extraSVG(item) + `<span>${item.kind === 'inscription' ? '명문!' : tool ? '도구' : '발견!'}</span>`;
      el.title = item.name;
      $('#finds').appendChild(el);
      this.toast(item.kind === 'inscription'
        ? `글자가 새겨진 조각! "${item.label}" ${res === 'new' ? '— 도감에 기록했어요' : '(이미 있는 명문)'}`
        : `${item.name}${res === 'new' || tool ? '' : '(이미 있음)'} — 찾았어요`);
    },

    // 흙 부스러기가 튀는 효과
    burst(cell, n) {
      const board = $('#board');
      const size = this.size;
      const cols = this.site.sea ? ['#78857f', '#5f6c6c', '#a29c86'] : ['#b08654', '#8e6a42', '#6c4c2e', '#d4ad7a'];
      for (let i = 0; i < n; i++) {
        const p = document.createElement('i');
        p.className = 'particle';
        p.style.left = (cell.c + 0.5) * size + 'px';
        p.style.top = (cell.r + 0.5) * size + 'px';
        p.style.background = cols[i % cols.length];
        board.appendChild(p);
        const ang = Math.random() * Math.PI * 2, dist = size * (0.6 + Math.random() * 1.2);
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - size * 0.6;
        const a = p.animate([
          { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.6 },
          { transform: `translate(${dx * 1.1}px,${dy + size}px) rotate(${Math.random() * 360}deg)`, opacity: 0 },
        ], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.2,.7,.4,1)' });
        a.onfinish = () => p.remove();
      }
    },

    sparkle(sh) {
      const board = $('#board');
      const size = this.size;
      for (let i = 0; i < 6; i++) {
        const sp = document.createElement('span');
        sp.className = 'sparkle';
        sp.textContent = '✦';
        sp.style.left = (sh.x + Math.random() * sh.w) * size + 'px';
        sp.style.top = (sh.y + Math.random() * sh.h) * size + 'px';
        board.appendChild(sp);
        const a = sp.animate([
          { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
          { transform: 'translate(-50%,-80%) scale(1.3)', opacity: 1, offset: 0.4 },
          { transform: 'translate(-50%,-160%) scale(.4)', opacity: 0 },
        ], { duration: 900, delay: i * 70, easing: 'ease-out' });
        a.onfinish = () => sp.remove();
      }
    },

    shake(big) {
      const b = $('#board');
      b.classList.remove('shake', 'shake-big');
      void b.offsetWidth;
      b.classList.add(big ? 'shake-big' : 'shake');
    },

    toast(msg) { G.ui.toast(msg); },

    finish(why) {
      this.over = true;
      $('#board').classList.remove('collapse');
      const lost = this.board.shards.filter((s) => s.state === 'buried').length;
      const broken = this.board.shards.filter((s) => s.state === 'broken').length;
      this.onEnd({ why, results: this.results, lost, broken });
    },
  };

})();
