// 화면 흐름: 타이틀 → 이야기(강석진 발굴기) → 지도(가마터 찾기) → 발굴 → 도감
(function () {
  const $ = (sel) => document.querySelector(sel);
  const S = G.store.S;
  const P = G.SANGPAN;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let map = null;
  let mapReady = null;
  const place = { village: null, reservoir: null, monastery: null, kilns: [] };
  let marks = [];
  let rvMode = false;
  let findRadius = P.findRadius;

  // ---------- 공통 UI ----------
  let toastTimer = 0;
  G.ui = {
    toast(msg) {
      const t = $('#toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
    },
  };

  function modal(html, buttons, cls) {
    const m = $('#modal');
    m.className = cls || '';
    $('#modal-body').innerHTML = html;
    const row = $('#modal-buttons');
    row.innerHTML = '';
    return new Promise((ok) => {
      for (const [label, value, bcls] of buttons) {
        const b = document.createElement('button');
        b.className = 'btn ' + (bcls || '');
        b.textContent = label;
        b.onclick = () => { m.classList.remove('show'); ok(value); };
        row.appendChild(b);
      }
      requestAnimationFrame(() => m.classList.add('show'));
    });
  }

  const SCREENS = ['title-screen', 'map-screen', 'dig-screen', 'story-screen', 'field-screen'];
  // 배경음악: 브라우저는 사용자가 한 번 누른 뒤에야 소리를 낼 수 있어서, 첫 탭에 시작한다
  const MOOD = { 'title-screen': 'title', 'map-screen': 'map', 'dig-screen': 'dig', 'story-screen': 'story', 'field-screen': 'map' };
  let mood = null, unlocked = false;
  function setMood(m) { mood = m; if (unlocked) G.audio.music(m); }
  document.addEventListener('pointerdown', () => {
    if (unlocked) return;
    unlocked = true;
    G.audio.unlock();
    G.audio.music(mood);
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn, .hud-btn, .tool, .site-card, .card:not(:disabled), .ch-row, .back, .skip')) G.sfx.click();
  }, true);
  function paintSnd() {
    const icon = G.scene.ICON[G.audio.isOn() ? 'sound' : 'mute'];
    document.querySelectorAll('.snd').forEach((b) => { b.innerHTML = icon; });
  }

  function show(screen) {
    for (const id of SCREENS) $('#' + id).classList.toggle('hidden', id !== screen);
    setMood(MOOD[screen]);
    if (screen === 'map-screen') {
      renderHud();
      ensureMap().then(() => { if (map) setTimeout(() => map.relayout(), 0); });
    }
  }

  function counts() {
    return {
      pots: G.store.fame(),
      ins: G.INSCRIPTIONS.filter((x) => S.extras[x.id]).length,
      finds: G.FINDS.filter((x) => S.extras[x.id]).length,
    };
  }
  function renderHud() {
    const c = counts();
    $('#hud-pots').textContent = `${c.pots}/${G.POT_IDS.length}`;
    $('#hud-ins').textContent = `${c.ins}/${G.INSCRIPTIONS.length}`;
    $('#btn-rv').classList.toggle('hidden', !(map && map.roadview));
  }

  // ---------- 이야기 ----------
  let story = null;
  function playStory(from, to, onDone) {
    story = { ch: from, to, line: -1, onDone, typing: null };
    show('story-screen');
    chapterCard();
  }
  function chapterCard() {
    const ch = G.STORY[story.ch];
    $('#story-bg').innerHTML = G.scene.scene(ch.scene || 'vineyard');
    $('#story-dialog').classList.add('hidden');
    const pt = $('#story-portrait');
    pt.innerHTML = '';
    pt.dataset.who = '';
    const card = $('#story-card');
    card.innerHTML = `<small>제 ${story.ch + 1} 장</small><b>${esc(ch.title)}</b>`;
    card.classList.remove('hidden', 'in');
    void card.offsetWidth;
    card.classList.add('in');
    if (unlocked) G.sfx.unroll();
    story.line = -1;
    story.cardUntil = Date.now() + 500;
  }
  function nextLine() {
    if (!story) return;
    if (story.typing) { finishTyping(); return; }
    const ch = G.STORY[story.ch];
    if (story.line === -1 && Date.now() < story.cardUntil) return;
    $('#story-card').classList.add('hidden');
    story.line += 1;
    if (story.line >= ch.lines.length) {
      if (story.ch < story.to) { story.ch += 1; chapterCard(); return; }
      endStory();
      return;
    }
    const [who, text] = ch.lines[story.line];
    const c = G.CAST[who];
    const dlg = $('#story-dialog');
    dlg.classList.remove('hidden');
    dlg.classList.toggle('narr', who === 'narr');
    $('#story-name').innerHTML = who === 'narr' ? '' : `${esc(c.name)} <small>${esc(c.role)}</small>`;
    const pt = $('#story-portrait');
    if (who === 'narr') {
      pt.classList.add('dim');
    } else {
      if (pt.dataset.who !== who) {
        pt.innerHTML = G.scene.portrait(who);
        pt.dataset.who = who;
        pt.classList.remove('pop');
        void pt.offsetWidth;
        pt.classList.add('pop');
      }
      pt.classList.remove('dim');
    }
    typeText(text);
  }
  function typeText(text) {
    const el = $('#story-text');
    let i = 0;
    el.textContent = '';
    $('#story-next').classList.add('hidden');
    story.full = text;
    story.typing = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i % 6 === 0) G.sfx.blip();
      if (i >= text.length) finishTyping();
    }, 28);
  }
  function finishTyping() {
    clearInterval(story.typing);
    story.typing = null;
    $('#story-text').textContent = story.full;
    $('#story-next').classList.remove('hidden');
  }
  function endStory() {
    if (!story) return;
    if (story.typing) clearInterval(story.typing);
    const done = story.onDone;
    story = null;
    S.storySeen = true;
    G.store.save();
    if (done) done();
  }
  function storyMenu() {
    const rows = G.STORY.map((ch, i) => `<button class="ch-row" data-i="${i}"><span>제 ${i + 1} 장</span><b>${esc(ch.title)}</b></button>`).join('');
    modal(`<h2>강석진 발굴기</h2><div class="ch-list">${rows}</div><p class="dim center">${esc(G.STORY_NOTE)}</p>`, [['닫기', -1]]);
    document.querySelectorAll('.ch-row').forEach((b) => {
      b.onclick = () => {
        $('#modal').classList.remove('show');
        playStory(+b.dataset.i, +b.dataset.i, () => show('map-screen'));
      };
    });
  }

  // ---------- 지도: 걸어 다니며 땅 살펴보기 ----------
  const pos = { kiln: [], reservoir: [], bangye: [] }; // 중요 지점 위치
  let me = null, walker = null, trail = null, walking = false;
  let lastLook = null;

  function ensureMap() {
    if (mapReady) return mapReady;
    mapReady = (async () => {
      $('#map-loading').classList.remove('hidden');
      renderSheet();
      const m = await G.createMap($('#map'), onMapClick);
      if (!m) { noMap('지도를 불러오지 못했어요.'); return; }
      map = m;
      if (map.kind === 'kakao') {
        place.village = await map.geocode(P.villageAddr);
        place.kilns = (await Promise.all(P.kilnAddrs.map(async (a) => {
          const p = await map.geocode(a);
          return p && Object.assign(p, { label: '가마터 ' + a.split(' ').pop() });
        }))).filter(Boolean);
        place.reservoir = await map.keyword(P.reservoir, place.village);
        place.monastery = await map.keyword(P.monastery, place.village);
      } else {
        place.village = await map.geocode('상판리, 모동면, 상주시');
        place.reservoir = await map.keyword('상판저수지');
        place.monastery = await map.keyword('카르투시오 수도원 상주');
        findRadius = 450;
        if (!place.reservoir && !place.village) {
          // 지도 서버를 쓸 수 없으면 그림 지도로 바꾼다(위치는 기록을 바탕으로 한 그림)
          const R = { lat: 36.33, lng: 127.95 };
          place.reservoir = R;
          place.monastery = G.geo.offset(R, -1300, 500);
          const b = [[R.lat - 0.022, R.lng - 0.03], [R.lat + 0.016, R.lng + 0.022]];
          const k = G.geo.west(R, 1300);
          map.illustrate(G.scene.villageMap({ reservoir: R, kiln: k, monastery: place.monastery }, b), b);
        }
        const base = place.reservoir || place.village;
        // 기록("상판저수지 서쪽 1~1.7km")에 맞춘 대략 위치
        place.kilns = [Object.assign(G.geo.west(base, 1300), { label: '가마터', approx: true })];
        if (!place.monastery) place.monastery = G.geo.offset(base, -1300, 500);
      }
      $('#map-loading').classList.add('hidden');
      if (!place.kilns.length && !place.reservoir) { noMap('지도에서 상판리를 찾지 못했어요.'); return; }
      $('#map-kind').textContent = { kakao: '카카오 스카이뷰', leaflet: '임시 지도 · OpenStreetMap', illustrated: '그림 지도 · 실제 지형과 다를 수 있어요' }[map.kind];
      pos.kiln = place.kilns;
      pos.reservoir = place.reservoir ? [place.reservoir] : [];
      pos.bangye = place.monastery ? [place.monastery] : [];
      // 탐사대 출발점: 저수지 남동쪽 마을 길
      me = S.me || G.geo.offset(place.reservoir || place.kilns[0], -500, 650);
      walker = map.mark(me.lat, me.lng, G.scene.walker(), 'walker');
      drawMarks();
      map.center(me, 'far');
      renderHud();
      renderSheet();
    })();
    return mapReady;
  }

  function noMap(why) {
    map = null;
    $('#map-loading').classList.add('hidden');
    $('#nomap-why').textContent = why;
    $('#nomap').classList.remove('hidden');
    renderSheet();
  }

  // 가장 가까운 중요 지점 (unfound: 아직 못 찾은 곳만)
  function nearest(p, unfound) {
    let best = null;
    for (const pt of G.POINTS) {
      if (unfound && S.found[pt.id]) continue;
      for (const q of pos[pt.id]) {
        const d = G.geo.dist(p.lat, p.lng, q.lat, q.lng);
        if (!best || d < best.d) best = { point: pt, d, at: q };
      }
    }
    return best;
  }

  function drawMarks() {
    marks.forEach((m) => m.remove());
    marks = [];
    const tap = (id, at) => () => (S.found[id] ? openPoint(G.pointById(id)) : walkTo(at));
    if (place.reservoir) marks.push(map.mark(place.reservoir.lat, place.reservoir.lng, G.scene.pin('water', '상판저수지'), 'site', tap('reservoir', place.reservoir)));
    if (place.monastery) marks.push(map.mark(place.monastery.lat, place.monastery.lng, G.scene.pin('hill', S.found.bangye ? '반계리 수도원 뒷산' : '수도원'), 'site', tap('bangye', place.monastery)));
    if (S.found.kiln) for (const k of place.kilns) marks.push(map.mark(k.lat, k.lng, G.scene.pin('kiln', k.label), 'site', () => openPoint(G.pointById('kiln'))));
  }

  function onMapClick(lat, lng) {
    if (rvMode) {
      map.openRoadview($('#roadview'), lat, lng, 80).then((ok) => {
        if (ok) $('#roadview-box').classList.remove('hidden');
        else G.ui.toast('근처에 로드뷰 사진이 없어요. 파란 길 위를 눌러 보세요');
      });
      return;
    }
    walkTo({ lat, lng });
  }

  // 탐사대가 걸어간다(발자국을 남기며)
  function walkTo(dest) {
    if (walking || !me) return;
    const from = { ...me };
    const dist = G.geo.dist(from.lat, from.lng, dest.lat, dest.lng);
    if (dist < 15) { renderSheet(); return; }
    walking = true;
    lastLook = null;
    if (trail) trail.remove();
    trail = map.path([from]);
    const dur = Math.max(500, Math.min(2600, dist * 1.3));
    const t0 = performance.now();
    let lastStep = 0, lastDot = 0;
    $('#walker-status').textContent = '걷는 중…';
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = { lat: from.lat + (dest.lat - from.lat) * e, lng: from.lng + (dest.lng - from.lng) * e };
      walker.move(p.lat, p.lng);
      if (now - lastDot > 90) { trail.add(p); lastDot = now; }
      if (now - lastStep > 260) { G.sfx.step(); lastStep = now; }
      if (k < 1) { requestAnimationFrame(tick); return; }
      walking = false;
      me = dest;
      S.me = me;
      G.store.save();
      map.panTo(me);
      $('#walker-status').textContent = '';
      renderSheet();
    };
    requestAnimationFrame(tick);
  }

  // 지표 조사 시작
  function look() {
    if (!me) return;
    const n = nearest(me, false);
    const nu = nearest(me, true);
    const d = n ? n.d : 9999;
    const keyR = findRadius;
    const count = d < keyR ? 7 : d < 600 ? 5 : d < 1200 ? 3 : d < 2500 ? 2 : 1;
    const key = nu && nu.d <= keyR ? nu.point.key : null;
    S.surveys += 1;
    G.store.save();
    show('field-screen');
    G.Field.start({
      count, key,
      mix: d < 1500 ? n.point.mix : ['ong', 'ong', 'bun', 'bae'],
      ground: d < 900 ? n.point.ground : 'field',
      title: '지표 조사',
      sub: d < 500 ? `${n.point.name} 근처` : '상판리 들판',
    }, (r) => endLook(r, nu));
  }

  async function endLook(r, nu) {
    S.surface = (S.surface || 0) + r.found.length;
    G.store.save();
    show('map-screen');
    if (r.key && nu) {
      const pt = nu.point;
      S.found[pt.id] = true;
      G.store.save();
      drawMarks();
      const v = await modal(
        `<div class="banner">중요 지점 발견!</div><h2>${esc(pt.name)}</h2><p>${esc(pt.found)}</p>` +
        (map && map.kind !== 'kakao' && pt.id === 'kiln' ? '<p class="dim center">카카오 지도를 연결하기 전에는 가마터 위치가 기록에 맞춘 대략 위치예요.</p>' : '') +
        '<p class="center">이제 이곳을 <b>정밀 조사</b>할 수 있어요.</p>',
        [['정밀 조사 시작', 1, 'primary'], ['나중에', 0]], 'celebrate'
      );
      if (v) openPoint(pt, true);
      else renderSheet();
      return;
    }
    lastLook = { total: r.total, found: r.found.length, nu, near: nu && nu.d <= findRadius };
    renderSheet();
  }

  // 찾은 중요 지점의 정밀 조사 목록
  function openPoint(pt, go) {
    const sites = pt.sites.map(G.siteById);
    if (go && sites.length === 1) { startDig(sites[0]); return; }
    if (sites.length === 1) { openSite(sites[0]); return; }
    $('#sheet').innerHTML =
      `<div class="sheet-head"><button class="back" id="sheet-back">‹</button><span class="quest">정밀 조사</span><h3>${esc(pt.name)}</h3></div>` +
      `<p class="lead">2010년 지표조사에서 상판리 일대 가마터 7곳이 확인됐어요. 그중 상주박물관이 발굴한 두 곳을 정밀 조사할 수 있어요.</p>` +
      `<div class="site-list">${sites.map(siteCard).join('')}</div>`;
    $('#sheet-back').onclick = renderSheet;
    bindSiteCards();
    if (map) map.relayout();
  }

  function setRvMode(on) {
    rvMode = on;
    $('#btn-rv').classList.toggle('on', on);
    $('#rv-hint').classList.toggle('hidden', !on);
    map.setRoadviewLayer(on);
  }

  // ---------- 아래 패널 ----------
  function potProgress(potId) {
    const n = G.store.pieces(potId).filter(Boolean).length;
    return S.restored[potId] ? '복원 완료' : `조각 ${n}/${G.PIECES}`;
  }
  function siteIcon(s) {
    return G.scene.pin(s.finds === 'reservoir' ? 'water' : s.finds === 'bangye' ? 'hill' : 'kiln');
  }
  function siteCard(s) {
    let prog;
    if (s.finds) {
      const list = G.FINDS.filter((x) => x.place === s.finds);
      prog = `답사품 ${list.filter((x) => S.extras[x.id]).length}/${list.length}`;
    } else {
      prog = `그릇 복원 ${s.pots.filter((p) => S.restored[p]).length}/${s.pots.length}${s.inscriptions ? ' · 명문 조각' : ''}`;
    }
    return `<button class="site-card" data-id="${s.id}"><span class="ic">${siteIcon(s)}</span><span class="txt"><b>${esc(s.name)}</b><small>${esc(s.sub)}</small><em>${prog}</em></span><span class="go">▶</span></button>`;
  }
  function bindSiteCards() {
    $('#sheet').querySelectorAll('.site-card').forEach((b) => { b.onclick = () => openSite(G.siteById(b.dataset.id)); });
  }

  function hintText() {
    const L = lastLook;
    if (!L.nu) return '중요한 곳은 다 찾았어! 이제 정밀 조사로 그릇을 되살려 보세.';
    if (L.near) return '이 근처에 뭔가 있을 거야. 다시 살펴보면서 흙을 더 털어 보세.';
    const amount = L.total >= 5 ? '조각이 꽤 많네! 거의 다 왔어.' : L.total >= 3 ? '조각이 제법 보이네.' : '조각이 드문드문하네.';
    const d8 = G.geo.dir(me.lat, me.lng, L.nu.at.lat, L.nu.at.lng);
    return `${amount} ${d8}쪽으로 가 보면 조각이 더 많을 것 같아.`;
  }

  function renderSheet() {
    const sh = $('#sheet');
    if (!map) {
      // 지도가 없을 때: 모든 발굴지를 바로 고른다
      sh.innerHTML = `<div class="sheet-head"><span class="quest">발굴지</span><h3>상주 상판리 자기가마터</h3></div><div class="site-list">${G.SITES.map(siteCard).join('')}</div>`;
      bindSiteCards();
      return;
    }
    const found = G.POINTS.filter((pt) => S.found[pt.id]);
    const left = G.POINTS.length - found.length;
    const talk = lastLook
      ? `<div class="talk"><span class="talk-face">${G.scene.portrait('kang')}</span><p><b>강석진</b>${esc(hintText())}</p></div>`
      : `<p class="clue">${esc(found.length ? '조각이 많아지는 쪽으로 걸어가 땅을 살펴보세요. 중요한 곳에서는 결정적인 증거가 나와요.' : P.clue)}</p>`;
    sh.innerHTML =
      `<div class="sheet-head"><span class="quest">탐사</span><h3>${left ? '상판리를 걸으며 조각을 찾아라' : '모든 중요 지점을 찾았어요'}</h3><span id="walker-status" class="dim"></span></div>` +
      talk +
      `<button class="btn primary wide big" id="go-look">🔍 여기 땅 살펴보기</button>` +
      `<p class="dim center">지도를 누르면 그곳으로 걸어가요.${map.roadview ? ' 길 버튼으로 로드뷰도 볼 수 있어요.' : ''} 남은 중요 지점 ${left}곳</p>` +
      (found.length ? `<h4 class="sheet-sub">정밀 조사할 수 있는 곳</h4><div class="site-list">${found.flatMap((pt) => pt.sites).map((id) => siteCard(G.siteById(id))).join('')}</div>` : '');
    $('#go-look').onclick = look;
    bindSiteCards();
    map.relayout();
  }

  function openSites() { renderSheet(); }

  function openSite(site) {
    let rows = site.pots.map((p) => {
      const pot = G.POTS[p];
      const have = G.store.pieces(p);
      const known = S.restored[p] || have.some(Boolean);
      return `<div class="pot-row ${S.restored[p] ? 'done' : ''}">${G.art.potSVG(p, S.restored[p] ? null : have)}<div><b>${known ? esc(pot.name) : '아직 모르는 그릇'}</b><small>${potProgress(p)}</small></div></div>`;
    }).join('');
    if (site.finds) {
      rows += G.FINDS.filter((x) => x.place === site.finds).map((x) => {
        const n = S.extras[x.id];
        return `<div class="pot-row ${n ? 'done' : ''}">${n ? G.art.extraSVG(x) : '<svg viewBox="0 0 100 100"></svg>'}<div><b>${n ? esc(x.name) : '아직 못 찾은 답사품'}</b><small>${n ? '찾음' : '미발견'}</small></div></div>`;
      }).join('');
    }
    $('#sheet').innerHTML =
      `<div class="sheet-head"><button class="back" id="sheet-back">‹</button><span class="quest">${site.finds ? '답사지' : '유적'}</span><h3>${esc(site.name)}</h3></div>` +
      `<p class="dim">${esc(site.sub)}</p><p class="lead">${esc(site.story)}</p><div class="pot-grid">${rows}</div>` +
      `<button class="btn primary wide big" id="go-dig">정밀 조사 시작</button>`;
    $('#sheet-back').onclick = renderSheet;
    $('#go-dig').onclick = () => startDig(site);
    if (map) map.relayout();
  }

  // ---------- 발굴 ----------
  function startDig(site) {
    show('dig-screen');
    G.Dig.start(site, (r) => endDig(site, r));
  }

  async function endDig(site, r) {
    const head = r.why === 'collapse' ? '<div class="banner bad">흙벽 붕괴!</div>'
      : r.why === 'clear' ? '<div class="banner">완벽한 발굴!</div>' : '<div class="banner plain">발굴 종료</div>';
    const rows = r.results.map((x) => {
      if (x.extra) {
        const tag = x.extra.kind === 'inscription' ? (x.res === 'new' ? '새 명문!' : '이미 있는 명문')
          : x.extra.kind === 'find' ? (x.res === 'new' ? '새 답사품!' : '이미 있는 답사품') : '가마 도구';
        return `<li class="${x.res === 'new' && x.extra.kind !== 'tool' ? 'new' : ''}">${G.art.extraSVG(x.extra)}<div><b>${esc(x.extra.name)}</b><small>${tag}</small></div></li>`;
      }
      const one = Array(G.PIECES).fill(false); one[x.piece] = true;
      const tag = x.res === 'dup' ? '중복 · 연구 +1' : x.res === 'complete' ? '복원 완료!' : '새 조각';
      return `<li class="${x.res !== 'dup' ? 'new' : ''}">${G.art.potSVG(x.pot, one)}<div><b>${esc(G.POTS[x.pot].name)}</b><small>${G.art.PIECE_NAMES[x.piece]} · ${tag}</small></div></li>`;
    }).join('');
    const extra = [r.broken ? `부서진 조각 ${r.broken}개` : '', r.lost ? `흙에 묻힌 채 남은 조각 ${r.lost}개` : ''].filter(Boolean).join(' · ');
    await modal(head + (rows ? `<ul class="results">${rows}</ul>` : '<p class="center">이번에는 아무것도 건지지 못했어요.</p>') + (extra ? `<p class="dim center">${extra}</p>` : ''), [['확인', 1, 'primary']]);
    for (const x of r.results) {
      if (x.extra && x.res === 'new' && x.extra.kind !== 'tool') {
        const title = x.extra.kind === 'inscription' ? `${esc(x.extra.label)} (${esc(x.extra.read)})` : esc(x.extra.name);
        G.sfx.find(true);
        await modal(`<div class="banner">${x.extra.kind === 'inscription' ? '명문 발견' : '답사품 발견'}</div><div class="restored">${G.art.extraSVG(x.extra)}</div><p class="big">${title}</p><p>${esc(x.extra.mean)}</p>`, [['도감에 기록', 1, 'primary']], 'celebrate');
      }
      if (x.res === 'complete') await showRestored(x.pot);
    }
    show('map-screen');
    openSite(site);
  }

  function showRestored(id) {
    const pot = G.POTS[id];
    G.sfx.fanfare();
    return modal(
      `<div class="banner">복원 완료!</div><div class="restored">${G.art.potSVG(id, null, { cracks: true })}</div>` +
      `<p class="big">${esc(pot.name)}</p><p class="dim center">${esc(pot.era)} · 상주 상판리 출토</p><p>${esc(pot.desc)}</p>`,
      [['도감에 등록', 1, 'primary']], 'celebrate'
    );
  }

  // ---------- 도감 ----------
  const ghost = (d) => `<svg viewBox="0 0 100 100" class="pot-svg"><path d="${d}" fill="rgba(0,0,0,.06)" stroke="rgba(0,0,0,.3)" stroke-dasharray="3 2"/></svg>`;
  function openBook() {
    $('#book-grid').innerHTML = G.POT_IDS.map((id) => {
      const pot = G.POTS[id];
      const have = G.store.pieces(id);
      const known = S.restored[id] || have.some(Boolean);
      return `<button class="card ${S.restored[id] ? 'done' : ''}" data-pot="${id}" ${known ? '' : 'disabled'}>` +
        G.art.potSVG(id, S.restored[id] ? null : have, { cracks: !!S.restored[id] }) +
        `<b>${known ? esc(pot.name) : '???'}</b><small>${potProgress(id)}</small></button>`;
    }).join('');
    $('#ins-grid').innerHTML = G.INSCRIPTIONS.map((x) => {
      const n = S.extras[x.id] || 0;
      return `<button class="card ${n ? 'done' : ''}" data-ex="${x.id}" ${n ? '' : 'disabled'}>` +
        (n ? G.art.extraSVG(x) : ghost('M14,22 L58,10 L88,30 L84,78 L46,90 L12,70Z')) +
        `<b>${n ? esc(x.label) : '???'}</b><small>${n ? esc(x.read) : '미발견'}</small></button>`;
    }).join('');
    $('#find-grid').innerHTML = G.FINDS.map((x) => {
      const n = S.extras[x.id] || 0;
      return `<button class="card ${n ? 'done' : ''}" data-ex="${x.id}" ${n ? '' : 'disabled'}>` +
        (n ? G.art.extraSVG(x) : ghost('M16,30 L46,12 L80,22 L90,58 L64,88 L24,80 L10,54Z')) +
        `<b>${n ? esc(x.name) : '???'}</b><small>${x.place === 'reservoir' ? '상판저수지 물가' : '반계리 수도원 뒷산'}</small></button>`;
    }).join('');
    $('#tool-grid').innerHTML = G.KILN_TOOLS.map((x) => {
      const n = S.extras[x.id] || 0;
      return `<button class="card ${n ? 'done' : ''}" data-ex="${x.id}" ${n ? '' : 'disabled'}>${G.art.extraSVG(x)}<b>${esc(x.name)}</b><small>${n}개 찾음</small></button>`;
    }).join('');
    $('#sources').innerHTML = G.SOURCES.map((s) => `<li>${esc(s)}</li>`).join('');
    const c = counts();
    $('#cnt-pots').textContent = `${c.pots} / ${G.POT_IDS.length}`;
    $('#cnt-ins').textContent = `${c.ins} / ${G.INSCRIPTIONS.length}`;
    $('#cnt-finds').textContent = `${c.finds} / ${G.FINDS.length}`;
    $('#book-stats').textContent = `발굴 ${S.digs}번 · 지표 조사 ${S.surveys}번 · 연구 점수 ${S.research}`;
    $('#book').classList.add('show');
    $('#book').querySelectorAll('.card').forEach((card) => {
      card.onclick = () => {
        if (card.dataset.pot) {
          const id = card.dataset.pot, pot = G.POTS[id], done = S.restored[id];
          modal(
            `<div class="restored">${G.art.potSVG(id, done ? null : G.store.pieces(id), { cracks: !!done })}</div>` +
            `<p class="big">${esc(pot.name)}</p><p class="dim center">${esc(pot.era)} · 상주 상판리 출토</p>` +
            (done ? `<p>${esc(pot.desc)}</p>` : `<p class="center">조각을 모두 모으면 설명을 볼 수 있어요. (${potProgress(id)})</p>`),
            [['닫기', 1]]
          );
        } else {
          const x = G.INSCRIPTIONS.concat(G.KILN_TOOLS, G.FINDS).find((i) => i.id === card.dataset.ex);
          modal(`<div class="restored">${G.art.extraSVG(x)}</div><p class="big">${esc(x.label || x.name)}${x.read ? ` (${esc(x.read)})` : ''}</p><p>${esc(x.mean)}</p>`, [['닫기', 1]]);
        }
      };
    });
  }

  // ---------- 시작 ----------
  function init() {
    $('#title-bg').innerHTML = G.scene.scene('title');
    $('#title-note').textContent = G.STORY_NOTE;
    for (const [id, icon] of [['btn-home', 'home'], ['btn-book', 'book'], ['btn-rv', 'road'], ['btn-story', 'scroll']]) $('#' + id).innerHTML = G.scene.ICON[icon];
    document.querySelectorAll('.tool').forEach((b) => { b.querySelector('.t-ic').innerHTML = G.scene.ICON[b.dataset.tool]; });

    paintSnd();
    document.querySelectorAll('.snd').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); unlocked = true; G.audio.toggle(); G.audio.music(mood); paintSnd(); };
    });
    $('#go-story').onclick = () => playStory(0, G.STORY.length - 1, () => show('map-screen'));
    $('#go-map').onclick = () => show('map-screen');
    $('#go-book').onclick = openBook;
    $('#btn-home').onclick = () => show('title-screen');
    $('#btn-book').onclick = openBook;
    $('#btn-story').onclick = storyMenu;
    $('#btn-rv').onclick = () => setRvMode(!rvMode);
    $('#rv-close').onclick = () => $('#roadview-box').classList.add('hidden');
    $('#story-screen').onclick = nextLine;
    $('#story-skip').onclick = (e) => { e.stopPropagation(); endStory(); };
    $('#book-close').onclick = () => $('#book').classList.remove('show');
    $('#book-reset').onclick = async () => {
      const v = await modal('<h2>기록을 지울까요?</h2><p class="center">찾은 가마터, 조각, 도감이 모두 사라져요.</p>', [['지우기', 1, 'danger'], ['취소', 0]]);
      if (!v) return;
      G.store.reset();
      location.reload();
    };
    window.addEventListener('resize', () => {
      if (!$('#dig-screen').classList.contains('hidden') && !G.Dig.over) G.Dig.render();
    });
    $('#go-story').textContent = S.storySeen ? '이야기 다시 보기' : '이야기 시작';
    $('#go-map').textContent = S.storySeen || S.digs ? '발굴 계속하기' : '바로 지도로';
    show('title-screen');
  }

  init();
})();
