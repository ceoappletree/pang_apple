// 화면 흐름: 타이틀 → 이야기(강석진 발굴기) → 지도(가마터 찾기) → 발굴 → 도감
(function () {
  const $ = (sel) => document.querySelector(sel);
  const S = G.store.S;
  const P = G.SANGPAN;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let map = null;
  let mapReady = null;
  const place = { village: null, reservoir: null, monastery: null, kilns: [] };
  let marks = [], flags = [];
  let rvMode = false;
  let tries = 0, lastSurvey = null;
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

  const SCREENS = ['title-screen', 'map-screen', 'dig-screen', 'story-screen'];
  // 배경음악: 브라우저는 사용자가 한 번 누른 뒤에야 소리를 낼 수 있어서, 첫 탭에 시작한다
  const MOOD = { 'title-screen': 'title', 'map-screen': 'map', 'dig-screen': 'dig', 'story-screen': 'story' };
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

  // ---------- 지도 ----------
  function ensureMap() {
    if (mapReady) return mapReady;
    mapReady = (async () => {
      $('#map-loading').classList.remove('hidden');
      renderSheet(); // 지도를 불러오는 동안에도 발굴지 목록은 보여 준다
      const m = await G.createMap($('#map'), onMapClick);
      if (!m) { noMap('지도를 불러오지 못했어요.'); return; }
      map = m;
      $('#map-kind').textContent = map.kind === 'kakao' ? '카카오 스카이뷰' : '임시 지도 · OpenStreetMap';
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
        const base = place.reservoir || place.village;
        // 임시 지도: 기록("상판저수지 서쪽 1~1.7km")에 맞춘 대략 위치
        if (base) place.kilns = [Object.assign(G.geo.west(base, 1300), { label: '가마터 (대략 위치)', approx: true })];
        findRadius = 450;
      }
      $('#map-loading').classList.add('hidden');
      if (!place.kilns.length && !place.reservoir && !place.village) { noMap('지도에서 상판리를 찾지 못했어요.'); return; }
      drawMarks();
      if (surveying()) map.center(place.reservoir || place.village || place.kilns[0], 'far');
      else fitAll();
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

  function surveying() { return !!(map && place.kilns.length && !S.found.kiln); }

  function drawMarks() {
    marks.forEach((m) => m.remove());
    marks = [];
    const open = (id) => () => (surveying() ? G.ui.toast('먼저 가마터를 찾아보세요') : openSite(G.siteById(id)));
    if (place.reservoir) marks.push(map.mark(place.reservoir.lat, place.reservoir.lng, G.scene.pin('water', '상판저수지'), 'site', open('reservoir')));
    if (place.monastery && !surveying()) marks.push(map.mark(place.monastery.lat, place.monastery.lng, G.scene.pin('hill', '반계리 수도원 뒷산'), 'site', open('bangye')));
    if (S.found.kiln) {
      for (const k of place.kilns) marks.push(map.mark(k.lat, k.lng, G.scene.pin('kiln', k.label), 'site', openSites));
    }
  }

  function fitAll() {
    const pts = place.kilns.concat(place.reservoir ? [place.reservoir] : []);
    if (pts.length) map.fit(pts);
    else if (place.village) map.center(place.village, 'far');
  }

  function clearFlags() { flags.forEach((f) => f.remove()); flags = []; }

  function onMapClick(lat, lng) {
    if (rvMode) {
      map.openRoadview($('#roadview'), lat, lng, 80).then((ok) => {
        if (ok) $('#roadview-box').classList.remove('hidden');
        else G.ui.toast('근처에 로드뷰 사진이 없어요. 파란 길 위를 눌러 보세요');
      });
      return;
    }
    if (!surveying()) return;
    tries += 1;
    S.surveys += 1;
    let best = null;
    for (const k of place.kilns) {
      const d = G.geo.dist(lat, lng, k.lat, k.lng);
      if (!best || d < best.d) best = { d, k };
    }
    if (best.d <= findRadius) {
      S.found.kiln = true;
      G.store.save();
      clearFlags();
      G.sfx.discover();
      drawMarks();
      fitAll();
      modal(
        `<div class="banner">발견!</div><h2>상주 상판리 자기가마터</h2>` +
        `<p>2010년 지표조사에서 상판리 일대 가마터 7곳이 확인됐어요. 그중 가마1유적(2015)과 가마6유적(2016)을 상주박물관이 발굴했어요.</p>` +
        (best.k.approx ? '<p class="dim center">임시 지도라서 가마터 위치는 기록에 맞춘 대략 위치예요.</p>' : '') +
        `<p class="dim center">지표 조사 ${tries}번 만에 찾았어요.</p>`,
        [['발굴 현장으로', 1, 'primary']], 'celebrate'
      ).then(openSites);
      return;
    }
    G.store.save();
    const m = best.d;
    const heat = m < 600 ? 'hot' : m < 1300 ? 'warm' : 'cold';
    const txt = m < 1000 ? `${Math.round(m / 10) * 10}m` : `${(m / 1000).toFixed(1)}km`;
    const d8 = G.geo.dir(lat, lng, best.k.lat, best.k.lng);
    flags.push(map.mark(lat, lng, `<span class="flag-txt ${heat}">${d8} ${txt}</span>`, 'flag'));
    lastSurvey = { d8, txt, heat };
    G.sfx.flag();
    if (heat === 'hot') G.sfx.probe(true);
    renderSheet();
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

  function renderSheet() {
    const sh = $('#sheet');
    if (surveying()) {
      const hint = lastSurvey
        ? `<p class="survey ${lastSurvey.heat}">가마터는 <b>${lastSurvey.d8}쪽 ${lastSurvey.txt}</b> ${lastSurvey.heat === 'hot' ? '— 아주 가까워요!' : lastSurvey.heat === 'warm' ? '— 가까워지고 있어요' : '— 아직 멀어요'}</p>`
        : '<p class="survey">지도를 눌러 <b>지표 조사</b>를 하세요. 가마터가 어느 쪽으로 얼마나 떨어져 있는지 알려 줘요.</p>';
      sh.innerHTML =
        `<div class="sheet-head"><span class="quest">임무</span><h3>상품 자기소를 찾아라</h3></div>` +
        `<p class="clue">${esc(P.clue)}</p>${hint}` +
        `<p class="dim">${tries ? `조사 ${tries}번 · ` : ''}가마터 ${findRadius}m 안을 찍으면 발견해요.${map.roadview ? ' 길 버튼으로 로드뷰도 볼 수 있어요.' : ''}</p>`;
    } else {
      const sites = G.SITES.map((s) => {
        let prog;
        if (s.finds) {
          const list = G.FINDS.filter((x) => x.place === s.finds);
          prog = `답사품 ${list.filter((x) => S.extras[x.id]).length}/${list.length}`;
        } else {
          prog = `그릇 복원 ${s.pots.filter((p) => S.restored[p]).length}/${s.pots.length}${s.inscriptions ? ' · 명문 조각' : ''}`;
        }
        return `<button class="site-card" data-id="${s.id}"><span class="ic">${siteIcon(s)}</span><span class="txt"><b>${esc(s.name)}</b><small>${esc(s.sub)}</small><em>${prog}</em></span><span class="go">▶</span></button>`;
      }).join('');
      sh.innerHTML =
        `<div class="sheet-head"><span class="quest">발굴지</span><h3>상주 상판리 자기가마터</h3></div>` +
        `<p class="lead">조선 초(1400~1420년 무렵) 왕실과 중앙 관청에 바칠 분청사기를 굽던 곳으로 봐요. 『세종실록』 지리지의 전국 상품 자기소 4곳 가운데 2곳이 상주에 있었어요.</p>` +
        `<div class="site-list">${sites}</div>`;
      sh.querySelectorAll('.site-card').forEach((b) => { b.onclick = () => openSite(G.siteById(b.dataset.id)); });
    }
    if (map) map.relayout();
  }

  function openSites() {
    clearFlags();
    renderSheet();
  }

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
      `<button class="btn primary wide big" id="go-dig">${site.finds ? '답사하러 가기' : '발굴하러 가기'}</button>`;
    $('#sheet-back').onclick = openSites;
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
