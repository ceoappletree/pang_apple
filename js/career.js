// 커리어 모드: 루키 시즌 (주간 육성 + 연애 + 리그 경기)
(() => {
'use strict';

const { TEAMS, GIRLS, PLACES, S } = Story;
const SAVE_KEY = 'homerunking_career_v1';
const WEEKS = 24;
const GIRL_KEYS = ['haneul', 'seoyun', 'minji'];

const $screen = document.getElementById('screen');
const $hud = document.getElementById('hud');
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const sleep = ms => new Promise(r => setTimeout(r, ms));

let C = null;      // 커리어 상태 (저장 대상)
let G = null;      // 진행 중인 경기
let onExit = null; // 타이틀로 돌아가기

// ---------- 저장 ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) {} }
function load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } }
function hasSave() { const s = load(); return !!(s && s.week && !s.over); }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

// ---------- 화면 헬퍼 ----------
function show(html, handlers = {}, opts = {}) {
  $screen.className = 'screen' + (opts.center ? ' center' : '');
  $screen.innerHTML = `<div class="wrap">${html}</div>`;
  $screen.scrollTop = 0;
  $screen.onclick = e => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    Engine.audio();
    const h = handlers[el.dataset.a];
    if (h) h(el.dataset.v, el);
  };
}
function hideScreen() { $screen.className = 'screen hidden'; $screen.innerHTML = ''; }
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
const team = id => TEAMS.find(t => t.id === id);
const vnCtx = () => ({ name: C.name, applyFx });
const playVN = steps => VN.play(steps, vnCtx());

// ---------- 새 커리어 ----------
function newCareer(name) {
  const opps = TEAMS.filter(t => !t.me).map(t => t.id);
  const schedule = [];
  while (schedule.length < WEEKS) {
    const round = opps.slice().sort(() => Math.random() - 0.5);
    schedule.push(...round);
  }
  C = {
    name, week: 1, slot: 0, over: false, injury: 0, injuries: 0,
    st: { meet: 35, power: 30, eye: 30, speed: 40, stamina: 100, cond: 2, fame: 5, charm: 20, trust: 30 },
    girls: {
      haneul: { met: true, aff: 15, last: 1, bomb: 0, evA: false, evB: false, lastPlace: null },
      seoyun: { met: false, aff: 0, last: 1, bomb: 0, evA: false, evB: false, lastPlace: null },
      minji: { met: false, aff: 0, last: 1, bomb: 0, evA: false, evB: false, lastPlace: null },
    },
    stats: { g: 0, pa: 0, ab: 0, h: 0, d2: 0, d3: 0, hr: 0, rbi: 0, bb: 0, k: 0, far: 0 },
    stand: Object.fromEntries(TEAMS.map(t => [t.id, { w: 0, l: 0, d: 0 }])),
    schedule: schedule.slice(0, WEEKS),
    flags: {}, weekEventsDone: 0, results: [],
  };
}

// ---------- 효과 적용 ----------
function applyFx(fx) {
  const st = C.st;
  for (const [k, v] of Object.entries(fx)) {
    if (GIRL_KEYS.includes(k)) {
      const g = C.girls[k];
      let d = v;
      if (d > 0 && k === 'seoyun' && st.fame < 30) d = Math.ceil(d * 0.6); // 서윤은 유명한 선수에게 끌린다
      g.aff = clamp(g.aff + d, 0, 100);
    } else if (k === 'cond') st.cond = clamp(st.cond + v, 0, 4);
    else if (k === 'stamina') st.stamina = clamp(st.stamina + v, 0, 100);
    else if (k in st) st[k] = clamp(st[k] + v, 0, 100);
  }
}

// ---------- 표시용 ----------
const monthLabel = w => w > WEEKS ? '한국시리즈' : `${4 + Math.floor((w - 1) / 4)}월 ${(w - 1) % 4 + 1}주`;
const COND = [['😫', '최악'], ['😞', '부진'], ['😐', '보통'], ['🙂', '좋음'], ['😆', '절호조']];
function grade(v) { return v >= 80 ? 'S' : v >= 70 ? 'A' : v >= 60 ? 'B' : v >= 50 ? 'C' : v >= 40 ? 'D' : v >= 30 ? 'E' : v >= 20 ? 'F' : 'G'; }
const GRADE_COL = { S: '#ff5c93', A: '#ff7a59', B: '#ffb820', C: '#ffd54a', D: '#a3e635', E: '#4ade80', F: '#6bc5ff', G: '#9fb0d4' };
function affLabel(a) { return a >= 80 ? '두근두근♥' : a >= 60 ? '설렘' : a >= 40 ? '친한 친구' : a >= 20 ? '친구' : '아는 사이'; }
function lineup() {
  const t = C.st.trust;
  if (t >= 70) return { label: '주전 4번 타자', inn: [1, 4, 6, 8] };
  if (t >= 45) return { label: '주전 6번 타자', inn: [2, 4, 7, 9] };
  if (t >= 25) return { label: '하위 타선 8번', inn: [3, 5, 8] };
  return { label: '벤치 (대타 대기)', inn: [8] };
}
function avg(h, ab) { return ab ? (h / ab).toFixed(3).replace(/^0/, '') : '.000'; }
function sortedStand() {
  return TEAMS.map(t => ({ t, ...C.stand[t.id] }))
    .sort((a, b) => (b.w / Math.max(1, b.w + b.l)) - (a.w / Math.max(1, a.w + a.l)) || b.w - a.w);
}
function standTable(compact) {
  const rows = sortedStand().map((r, i) => {
    const pct = r.w + r.l ? (r.w / (r.w + r.l)).toFixed(3).replace(/^0/, '') : '.000';
    return `<tr class="${r.t.me ? 'me' : ''}"><td>${i + 1}. <span class="tdot" style="background:${r.t.color}"></span>${r.t.short}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${pct}</td></tr>`;
  }).join('');
  return `<table class="stand"><tr><th>팀</th><th>승</th><th>패</th><th>무</th><th>승률</th></tr>${rows}</table>`;
}

// ---------- 주간 흐름 ----------
async function startWeek() {
  const w = C.week;
  // 고정 이벤트
  if (w === 1 && !C.flags.opening) { C.flags.opening = 1; await playVN(S.opening); }
  if (w === 2 && !C.flags.seoyun) { C.flags.seoyun = 1; C.girls.seoyun.met = true; C.girls.seoyun.aff = 8; C.girls.seoyun.last = w; await playVN(S.meetSeoyun); }
  if (w === 3 && !C.flags.minji) { C.flags.minji = 1; C.girls.minji.met = true; C.girls.minji.aff = 8; C.girls.minji.last = w; await playVN(S.meetMinji); }
  if (w === 12 && !C.flags.allstar) { C.flags.allstar = 1; await playVN(C.st.fame >= 40 ? S.allstar : S.allstarMiss); }
  if (w === 18 && !C.flags.festival) { C.flags.festival = 1; await festival(); }

  // 호감도 이벤트 (주당 하나)
  if (!C.flags['ev' + w]) {
    C.flags['ev' + w] = 1;
    for (const k of GIRL_KEYS) {
      const g = C.girls[k];
      if (!g.met) continue;
      if (!g.evA && g.aff >= 35) { g.evA = true; g.last = w; await playVN(S[k + 'A']); break; }
      if (g.evA && !g.evB && g.aff >= 60) { g.evB = true; g.last = w; await playVN(S[k + 'B']); break; }
    }
    // 랜덤 이벤트
    if (w > 1 && Math.random() < 0.35) {
      const pool = S.randoms.filter(r => !r.need || C.girls[r.need].met);
      const tot = pool.reduce((a, r) => a + r.w, 0);
      let x = Math.random() * tot;
      const ev = pool.find(r => (x -= r.w) <= 0) || pool[0];
      await playVN(ev.steps);
    }
    // 서운함 💣
    for (const k of GIRL_KEYS) {
      const g = C.girls[k];
      if (!g.met || g.aff < 30) continue;
      const since = w - g.last;
      if (!g.bomb && since >= 5) { g.bomb = 1; toast(`💣 ${GIRLS[k].name}이(가) 서운해하고 있다…`); }
      else if (g.bomb && since >= 7) {
        g.bomb = 0; g.last = w;
        g.aff = clamp(g.aff - 12, 0, 100);
        GIRL_KEYS.filter(o => o !== k && C.girls[o].met).forEach(o => { C.girls[o].aff = clamp(C.girls[o].aff - 6, 0, 100); });
        await playVN([{ bg: 'linear-gradient(180deg,#2a1020,#5c1f2f)' },
          { who: k, mood: 'angry', text: '…요즘 나한테 관심도 없지? 됐어.' },
          { narr: `💥 폭탄이 터졌다! ${GIRLS[k].name}의 호감도가 크게 떨어지고, 소문이 퍼져 다른 사람들의 호감도도 내려갔다.` }]);
      }
    }
  }
  save();
  hub();
}

async function festival() {
  await playVN(S.festivalIntro);
  const cands = GIRL_KEYS.filter(k => C.girls[k].met && C.girls[k].aff >= 20);
  const steps = [{ choice: [
    ...cands.map(k => ({ text: `${GIRLS[k].name}에게 같이 가자고 한다`, fx: { [k]: C.girls[k].aff >= 40 ? 14 : 9 },
      pick: () => { C.girls[k].last = C.week; C.girls[k].bomb = 0; }, then: [{ bg: GIRLS[k].bg }, ...S.festival[k]] })),
    { text: '혼자 숙소에서 쉰다', fx: { stamina: 40 }, then: [{ narr: '창밖으로 터지는 불꽃을 보며 푹 쉬었다. (체력 회복)' }] },
  ] }];
  await playVN(steps);
}

// ---------- 허브 ----------
function hub() {
  Engine.idle();
  $hud.classList.add('hidden');
  const st = C.st, s = C.stats;
  const opp = team(C.schedule[C.week - 1]);
  const lu = lineup();
  const bar = (label, v, col, max = 100) => {
    const gd = grade(v);
    return `<span>${label}</span><div class="bar"><i style="width:${v / max * 100}%;background:${col}"></i></div><span class="num"><span class="grade" style="color:${GRADE_COL[gd]}">${gd}</span>${v}</span>`;
  };
  const plain = (label, v, col) => `<span>${label}</span><div class="bar"><i style="width:${v}%;background:${col}"></i></div><span class="num">${v}</span>`;
  const girls = GIRL_KEYS.map(k => {
    const g = C.girls[k], d = GIRLS[k];
    if (!g.met) return `<div class="girl unknown"><div class="face">${Portraits.girl(k)}</div><div class="nm">???</div><div class="lv">미등장</div></div>`;
    const hearts = '♥'.repeat(Math.round(g.aff / 20)) + '♡'.repeat(5 - Math.round(g.aff / 20));
    const mood = g.bomb ? 'angry' : g.aff >= 60 ? 'love' : g.aff >= 35 ? 'smile' : 'normal';
    return `<div class="girl">${g.bomb ? '<span class="bomb">💣</span>' : ''}<div class="face">${Portraits.girl(k, mood)}</div>
      <div class="nm">${d.name}</div><div class="hearts" style="color:${d.color}">${hearts}</div><div class="lv">${affLabel(g.aff)}</div></div>`;
  }).join('');
  const slotsLeft = 2 - C.slot;
  const inj = C.injury > 0;
  const acts = slotsLeft > 0 ? `
    <div class="actions">
      <button class="act" data-a="train" data-v="meet" ${inj ? 'disabled' : ''}>🏏 타격 훈련<small>미트 ↑ · 체력 -18</small></button>
      <button class="act" data-a="train" data-v="power" ${inj ? 'disabled' : ''}>🏋️ 웨이트<small>파워 ↑ · 체력 -22</small></button>
      <button class="act" data-a="train" data-v="eye" ${inj ? 'disabled' : ''}>📹 영상 분석<small>선구안 ↑ · 체력 -12</small></button>
      <button class="act" data-a="train" data-v="speed" ${inj ? 'disabled' : ''}>🏃 주루 훈련<small>주력 ↑ · 체력 -15</small></button>
      <button class="act" data-a="rest">😴 휴식<small>체력 +40 · 컨디션 ↑</small></button>
      <button class="act" data-a="study">👔 자기계발<small>매력 ↑ · 체력 -6</small></button>
      <button class="act date" data-a="date" style="grid-column:1/-1">💕 데이트 신청<small>호감도 ↑ · 컨디션 ↑ · 체력 -5</small></button>
    </div>` : `
    <div class="actions"><button class="act match" data-a="match">⚾ 주말 경기 vs ${opp.short}<small>${inj ? `부상으로 결장 (남은 ${C.injury}주)` : lu.label + ' 출전'}</small></button></div>`;

  show(`
    <div class="card">
      <div class="hub-head">
        <div class="week">${monthLabel(C.week)}<small>시즌 ${C.week} / ${WEEKS}주차</small></div>
        <div class="slots">${[0, 1].map(i => `<i class="${i < C.slot ? 'used' : ''}"></i>`).join('')}</div>
      </div>
      <div class="row" style="align-items:center;margin-bottom:12px">
        <div><div style="font-size:20px;font-weight:900">${C.name} <span class="muted small">#27 외야수</span></div>
        <div class="muted small">${lu.label}${inj ? ' · <span class="loss">🤕 부상</span>' : ''}</div></div>
        <div style="flex:0;text-align:center;font-size:30px;line-height:1">${COND[st.cond][0]}<div class="small muted" style="white-space:nowrap">${COND[st.cond][1]}</div></div>
      </div>
      <div class="bars">
        ${bar('미트', st.meet, '#ffd54a')}${bar('파워', st.power, '#ff7a59')}${bar('선구안', st.eye, '#6bc5ff')}${bar('주력', st.speed, '#4ade80')}
        ${plain('체력', st.stamina, st.stamina < 35 ? '#e5484d' : '#a3e635')}
        ${plain('인기', st.fame, '#ff7aa8')}${plain('매력', st.charm, '#c084fc')}${plain('감독신뢰', st.trust, '#facc15')}
      </div>
      <div class="chips">
        <span class="pill">타율 ${avg(s.h, s.ab)}</span><span class="pill">홈런 ${s.hr}</span><span class="pill">타점 ${s.rbi}</span><span class="pill">안타 ${s.h}</span>
      </div>
    </div>
    <div class="card"><h3>💗 인연</h3><div class="girls">${girls}</div></div>
    <div class="card"><h3>📅 이번 주 할 일 ${slotsLeft > 0 ? `(남은 행동 ${slotsLeft})` : ''}</h3>${acts}
      ${st.stamina < 35 && slotsLeft > 0 ? '<p class="small loss" style="margin-top:8px">⚠️ 체력이 낮아요. 이대로 훈련하면 부상 위험!</p>' : ''}</div>
    <div class="card"><h3>🏆 리그 순위</h3>${standTable()}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="exit">타이틀로 (자동 저장됨)</button></div>
  `, {
    train: v => train(v), rest, study, date: dateMenu, match: preMatch,
    exit: () => { save(); onExit && onExit(); },
  });
}

async function useSlot() {
  C.slot++;
  save();
  hub();
}

async function train(kind) {
  const st = C.st;
  const cost = { meet: 18, power: 22, eye: 12, speed: 15 }[kind];
  const label = { meet: '미트', power: '파워', eye: '선구안', speed: '주력' }[kind];
  // 부상 판정
  let risk = st.stamina < 35 ? (35 - st.stamina) / 35 * 0.6 + 0.05 : 0;
  if (C.girls.minji.aff >= 50) risk *= 0.5;
  if (Math.random() < risk) {
    C.injury = 2; C.injuries++;
    st.stamina = clamp(st.stamina - 10, 0, 100);
    st.cond = clamp(st.cond - 1, 0, 4);
    await playVN(S.injury);
    return useSlot();
  }
  let gain = Math.round((3 + Math.random() * 3 + (st.cond - 2) * 0.7) * (1 - st[kind] / 140));
  if (C.girls.minji.aff >= 40) gain += 1;
  gain = Math.max(1, gain);
  st[kind] = clamp(st[kind] + gain, 0, 100);
  st.stamina = clamp(st.stamina - cost, 0, 100);
  st.trust = clamp(st.trust + 1, 0, 100);
  toast(`${label} <span class="gain">+${gain}</span> · 체력 <span class="loss">-${cost}</span>`);
  Engine.sfx.ding();
  useSlot();
}
function rest() {
  const st = C.st;
  st.stamina = clamp(st.stamina + 40, 0, 100);
  let msg = '체력 <span class="gain">+40</span>';
  if (Math.random() < 0.55) { st.cond = clamp(st.cond + 1, 0, 4); msg += ' · 컨디션 <span class="gain">UP</span>'; }
  if (C.girls.minji.met && C.girls.minji.aff < 60 && Math.random() < 0.3) { C.girls.minji.aff = clamp(C.girls.minji.aff - 1, 0, 100); }
  toast(msg);
  useSlot();
}
function study() {
  const g = ri(3, 5);
  C.st.charm = clamp(C.st.charm + g, 0, 100);
  C.st.stamina = clamp(C.st.stamina - 6, 0, 100);
  toast(`매력 <span class="gain">+${g}</span>`);
  useSlot();
}

function dateMenu() {
  const met = GIRL_KEYS.filter(k => C.girls[k].met);
  show(`<div class="card"><h2>💕 누구에게 연락할까?</h2><p class="muted small" style="margin:6px 0 12px">상대가 좋아하는 장소를 고르면 호감도가 크게 올라요.</p>
    <div class="girls">${met.map(k => `<button class="girl" data-a="girl" data-v="${k}" style="border:none;color:#fff;cursor:pointer">
      <div class="face">${Portraits.girl(k, 'smile')}</div><div class="nm">${GIRLS[k].name}</div><div class="lv">${GIRLS[k].role}</div></button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">돌아가기</button></div></div>`,
  { girl: k => placeMenu(k), back: hub }, { center: true });
}
function placeMenu(k) {
  const d = GIRLS[k];
  if (d.needFame && C.st.fame < d.needFame) {
    playVN([{ bg: d.bg }, { who: k, mood: 'normal', text: '죄송해요, 이번 주는 촬영 일정이 꽉 찼어요. …좀 더 유명해지면 생각해 볼게요.' },
      { narr: `(인기가 ${d.needFame} 이상이어야 데이트할 수 있다)` }]).then(hub);
    return;
  }
  show(`<div class="card"><h2>${d.name}와(과) 어디 갈까?</h2><p class="muted small" style="margin:6px 0 12px">${d.role}</p>
    <div class="places">${PLACES.map(p => `<button class="act" data-a="go" data-v="${p.id}">${p.name}</button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">돌아가기</button></div></div>`,
  { go: p => doDate(k, p), back: dateMenu }, { center: true });
}
async function doDate(k, placeId) {
  const g = C.girls[k], d = GIRLS[k];
  let pref = d.likes[placeId];
  const again = g.lastPlace === placeId;
  if (again) pref = Math.max(-1, pref - 1);
  const delta = { '-1': -4, 0: 3, 1: 6, 2: 10 }[pref] + (pref >= 0 ? Math.floor(C.st.charm / 25) : 0);
  const mood = { '-1': 'angry', 0: 'normal', 1: 'smile', 2: 'happy' }[pref];
  const place = PLACES.find(p => p.id === placeId).name;
  g.last = C.week; g.bomb = 0; g.lastPlace = placeId;
  C.st.stamina = clamp(C.st.stamina - 5, 0, 100);
  const fx = { [k]: delta };
  if (pref >= 1) fx.cond = 1;
  await playVN([
    { bg: d.bg },
    { narr: `${d.name}와(과) ${place}에 갔다.` },
    ...(again ? [{ who: k, mood: 'normal', text: '…또 여기야? 지난번에도 왔잖아.' }] : []),
    { who: k, mood, text: pick(d.lines[pref]) },
    { fx },
    { narr: `${d.name}의 호감도 ${delta >= 0 ? '+' : ''}${delta}${pref >= 1 ? ' · 컨디션 UP' : ''}` },
  ]);
  useSlot();
}

// ---------- 경기 ----------
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }
function oppPitcher(opp, inning) {
  const base = clamp(0.15 + (opp.pit - 45) * 0.04 + (C.week - 1) * 0.018, 0, 1.25);
  if (inning >= 7) return { name: `${opp.short} 불펜`, lv: base - 0.05, velo: ri(140, 151), ctrl: 0.45, mix: { FB: 0.55, SL: 0.25, FK: 0.2 } };
  return { ...opp.ace, lv: base };
}
const TACTICS = {
  attack: { name: '🔥 적극 공격', us: 1.15, them: 1.08, desc: '득점 ↑ · 실점 소폭 ↑' },
  normal: { name: '⚖️ 균형', us: 1, them: 1, desc: '기본 운영' },
  defend: { name: '🛡 지키는 야구', us: 0.9, them: 0.84, desc: '실점 ↓ · 득점 ↓' },
};

function preMatch() {
  const opp = team(C.schedule[C.week - 1]);
  const lu = lineup();
  const ace = opp.ace;
  const mixNames = Object.entries(ace.mix).sort((a, b) => b[1] - a[1]).map(([k]) => ({ FB: '직구', TW: '투심', CH: '체인지업', CU: '커브', SL: '슬라이더', FK: '포크' })[k]);
  if (C.injury > 0) {
    show(`<div class="card sitcard"><h3>${monthLabel(C.week)} 주말 경기</h3><div class="big">애플즈 vs ${opp.short}</div>
      <p class="muted">부상으로 결장합니다. 덕아웃에서 응원…</p><div style="margin-top:14px"><button class="btn" data-a="go">경기 결과 보기</button></div></div>`,
    { go: () => startMatch('normal', true) }, { center: true });
    return;
  }
  show(`<div class="card sitcard">
      <h3>${monthLabel(C.week)} · 주말 경기 (홈)</h3>
      <div class="big"><span style="color:#e5484d">애플즈</span> vs <span style="color:${opp.color}">${opp.short}</span></div>
      <p class="small muted">상대 전력 · 타선 ${opp.off} / 투수진 ${opp.pit}</p>
      <div class="howto" style="margin:12px 0;text-align:left">
        상대 선발 <b>${ace.name}</b> · 최고 ${ace.velo}km/h<br>주무기: ${mixNames.join(', ')}<br>
        내 타순: <b>${lu.label}</b> (타석 ${lu.inn.length}회 예정)
      </div>
      <h3 style="text-align:left">팀 작전 (감독에게 건의)</h3>
      <div class="stack">${Object.entries(TACTICS).map(([k, t]) => `<button class="btn sub" data-a="tac" data-v="${k}">${t.name}<small>${t.desc}</small></button>`).join('')}</div>
    </div>`,
  { tac: v => chooseMode(v) }, { center: true });
}
function chooseMode(tac) {
  show(`<div class="card sitcard"><h2>타석 진행 방식</h2><p class="muted small" style="margin:6px 0 14px">직접 치면 결과가 실력대로! 자동은 능력치로 계산돼요.</p>
    <div class="stack"><button class="btn" data-a="m" data-v="play">⚾ 직접 타격</button><button class="btn sub" data-a="m" data-v="auto">⏩ 결과만 보기 (자동)</button></div></div>`,
  { m: v => startMatch(tac, false, v === 'auto') }, { center: true });
}

async function startMatch(tac, benched, auto) {
  const opp = team(C.schedule[C.week - 1]);
  const T = TACTICS[tac];
  const myTeam = TEAMS[0];
  const lu = lineup();
  const lUs = 4.0 * (myTeam.off / opp.pit) * T.us;
  const lThem = 4.0 * (opp.off / (myTeam.pit + 2)) * T.them;
  G = {
    opp, tac, auto, benched,
    them: Array.from({ length: 9 }, () => poisson(lThem / 9)),
    usOther: Array.from({ length: 9 }, () => poisson(lUs * 0.85 / 9)),
    line: { us: Array(9).fill(null), them: Array(9).fill(null) },
    score: { us: 0, them: 0 },
    abInn: benched ? [] : lu.inn.slice(),
    inn: 1, my: { pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, d2: 0, d3: 0, far: 0, log: [] },
    log: [], walkoff: false, cond: C.st.cond,
  };
  // 응원 보너스
  if (!benched) {
    const best = GIRL_KEYS.filter(k => C.girls[k].met).sort((a, b) => C.girls[b].aff - C.girls[a].aff)[0];
    if (best && C.girls[best].aff >= 50 && Math.random() < C.girls[best].aff / 140) {
      G.cond = clamp(G.cond + 1, 0, 4);
      G.cheerBy = best;
      await playVN([{ bg: GIRLS[best].bg }, { who: best, mood: 'happy', text: pick(['오늘 응원하러 왔어! 힘내!', '관중석에서 보고 있을게. …잘해.', '홈런 치면 오늘 저녁은 내가 쏜다!']) },
        { narr: `${GIRLS[best].name}의 응원! 이번 경기 컨디션 UP` }]);
    }
  }
  proceed();
}

function linescore(curInn) {
  const head = Array.from({ length: 9 }, (_, i) => `<th>${i + 1}</th>`).join('');
  const row = (nm, arr, total) => `<tr><td>${nm}</td>${arr.map((v, i) => `<td class="${i + 1 === curInn ? 'cur' : ''}">${v == null ? '' : v}</td>`).join('')}<td class="r">${total}</td></tr>`;
  return `<table class="linescore"><tr><th></th>${head}<th>R</th></tr>
    ${row(G.opp.short, G.line.them, G.score.them)}${row('애플즈', G.line.us, G.score.us)}</table>`;
}

// 다음 내 타석까지 시뮬레이션 진행
function proceed() {
  while (G.inn <= 9) {
    const i = G.inn - 1;
    if (G.line.them[i] == null) {
      G.line.them[i] = G.them[i];
      G.score.them += G.them[i];
      if (G.them[i]) G.log.push(`${G.inn}회초 ${G.opp.short} ${G.them[i]}득점`);
    }
    if (G.inn === 9 && G.score.us > G.score.them) { G.line.us[i] = 'X'; break; }
    if (G.abInn[0] === G.inn) {
      G.abInn.shift();
      return presentAB();
    }
    if (G.line.us[i] == null) {
      addUs(i, G.usOther[i]);
      if (G.inn === 9 && G.score.us > G.score.them) { G.walkoff = G.usOther[i] > 0; break; }
    }
    G.inn++;
  }
  endMatch();
}
function addUs(i, r) {
  G.line.us[i] = (G.line.us[i] || 0) + r;
  G.score.us += r;
  if (r) G.log.push(`${i + 1}회말 애플즈 ${r}득점`);
}

function presentAB() {
  const inn = G.inn;
  // 상황 생성
  const outs = Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2;
  const bases = [Math.random() < 0.33 ? 1 : 0, Math.random() < 0.24 ? 1 : 0, Math.random() < 0.16 ? 1 : 0];
  const diff = G.score.us - G.score.them;
  const runners = bases.reduce((a, b) => a + b, 0);
  const baseTxt = runners === 0 ? '주자 없음' : runners === 3 ? '만루' : ['1', '2', '3'].filter((_, j) => bases[j]).join(',') + '루';
  const scoreTxt = diff > 0 ? `${diff}점 앞섬` : diff < 0 ? `${-diff}점 뒤짐` : '동점';
  let chance = '';
  if (inn >= 7 && diff <= 0 && diff + runners + 1 > 0) chance = inn === 9 ? '🔥 끝내기 찬스!' : '🔥 역전 찬스!';
  else if (runners >= 2) chance = '득점 찬스!';
  const sit = { outs, bases };
  const canBunt = outs < 2 && (bases[0] || bases[1]) && !bases[2];
  const canHR = outs < 2 && bases[0] && !bases[1];
  const pitcher = oppPitcher(G.opp, inn);
  show(`<div class="card sitcard">
      <h3>${monthLabel(C.week)} · vs ${G.opp.short}</h3>
      ${linescore(inn)}
      <div class="big">${inn}회말 ${outs}사 ${baseTxt}</div>
      <div>${scoreTxt} ${chance ? `<span class="chance">${chance}</span>` : ''}</div>
      <p class="small muted" style="margin:6px 0 14px">마운드: ${pitcher.name} · ${G.my.log.length ? '오늘 ' + G.my.log.join(', ') : '오늘 첫 타석'}</p>
      <h3 style="text-align:left">작전</h3>
      <div class="stack">
        <button class="btn" data-a="t" data-v="normal">💥 강공</button>
        ${canBunt ? '<button class="btn sub" data-a="t" data-v="bunt">🤏 희생번트<small>공 위치에 갖다 대기만 하면 OK · 주자 진루</small></button>' : ''}
        ${canHR ? '<button class="btn sub" data-a="t" data-v="hitrun">🏃 히트앤런<small>1루 주자 스타트 · 안타 시 3루까지, 병살 없음</small></button>' : ''}
      </div>
      ${G.log.length ? `<div class="log" style="margin-top:12px;text-align:left">${G.log.slice(-4).join('<br>')}</div>` : ''}
    </div>`,
  { t: v => playAB(v, sit, pitcher, inn) }, { center: true });
}

function playAB(tactic, sit, pitcher, inn) {
  const st = C.st;
  const batter = { meet: st.meet, power: st.power, eye: st.eye, speed: st.speed, cond: G.cond };
  const finish = res => afterAB(res, inn, tactic);
  if (G.auto) { finish(autoAB(batter, sit, tactic)); return; }
  hideScreen();
  $hud.classList.remove('hidden');
  Engine.atBat({
    batter, pitcher, tactic,
    sit: { inningLabel: `${inn}회말`, scoreLabel: `애플즈 : ${G.opp.short}`, scoreText: `${G.score.us} : ${G.score.them}`, outs: sit.outs, bases: sit.bases },
    onEnd: res => { $hud.classList.add('hidden'); finish(res); },
  });
}

// 자동 타석: 능력치 기반 확률 계산
function autoAB(b, sit, tactic) {
  const c = (b.cond - 2) * 0.012;
  const pBB = 0.05 + b.eye * 0.0011;
  const pK = clamp(0.27 - b.meet * 0.0013 - b.eye * 0.0006, 0.08, 0.3);
  const pH = 0.16 + b.meet * 0.002 + c;
  const bs = sit.bases.slice();
  const runners = bs.reduce((a, x) => a + x, 0);
  const r = Math.random();
  if (tactic === 'bunt') {
    const nb = [0, bs[0], bs[1] || bs[2]];
    return { kind: 'out', text: '희생번트', sac: true, ab: false, rbi: 0, outs: sit.outs + 1, bases: nb };
  }
  if (r < pBB) {
    let runs = 0; if (bs[0] && bs[1] && bs[2]) runs = 1;
    return { kind: 'bb', text: '볼넷', ab: false, rbi: runs, outs: sit.outs };
  }
  if (r < pBB + pK) return { kind: 'k', text: '삼진', ab: true, rbi: 0, outs: sit.outs + 1 };
  if (r < pBB + pK + pH) {
    const x = Math.random();
    const pHR = 0.03 + b.power * 0.003;
    if (x < pHR) return { kind: 'hr', text: '홈런', ab: true, hit: true, rbi: runners + 1, outs: sit.outs, dist: ri(100, 100 + b.power / 2) };
    if (x < pHR + 0.02 + b.speed * 0.0003) return { kind: 'hit', text: '3루타', nb: 3, ab: true, hit: true, rbi: runners, outs: sit.outs };
    if (x < pHR + 0.2) return { kind: 'hit', text: '2루타', nb: 2, ab: true, hit: true, rbi: bs[1] + bs[2] + (Math.random() < 0.5 ? bs[0] : 0), outs: sit.outs };
    return { kind: 'hit', text: '안타', nb: 1, ab: true, hit: true, rbi: bs[2] + (Math.random() < 0.6 ? bs[1] : 0), outs: sit.outs };
  }
  if (bs[2] && sit.outs < 2 && Math.random() < 0.35) return { kind: 'out', text: '희생플라이', sac: true, ab: false, rbi: 1, outs: sit.outs + 1 };
  return { kind: 'out', text: pick(['땅볼 아웃', '플라이 아웃', '라인드라이브 아웃']), ab: true, rbi: 0, outs: sit.outs + 1 };
}

async function afterAB(res, inn, tactic) {
  const m = G.my, i = inn - 1;
  m.pa++;
  if (res.ab) m.ab++;
  if (res.hit) m.h++;
  if (res.kind === 'hr') { m.hr++; m.far = Math.max(m.far, res.dist || 0); }
  if (res.nb === 2) m.d2++;
  if (res.nb === 3) m.d3++;
  if (res.kind === 'bb') m.bb++;
  if (res.kind === 'k') m.k++;
  const runs = (res.rbi || 0) + (res.runs || 0);
  m.rbi += res.rbi || 0;
  m.log.push(res.text + (res.rbi ? `(${res.rbi}타점)` : ''));
  // 이번 이닝 득점: 내 타석 + 나머지 타자
  const others = res.outs >= 3 ? 0 : G.usOther[i];
  addUs(i, runs);
  if (G.auto) G.log.push(`${inn}회말 ${C.name}: ${res.text}${res.rbi ? ` ${res.rbi}타점` : ''}`);
  if (inn === 9 && G.score.us > G.score.them) {
    G.walkoff = true; G.walkoffMe = runs > 0;
    if (!G.auto) { Engine.showMsg('끝내기!!', '#ffd54a', `${C.name} 끝내기 ${res.text}!`); Engine.sfx.cheer(3, 0.45); await sleep(1800); }
    return endMatch();
  }
  addUs(i, others);
  G.line.us[i] = G.line.us[i] || 0;
  if (inn === 9 && G.score.us > G.score.them) { G.walkoff = true; return endMatch(); }
  if (G.auto) await sleep(10);
  G.inn++;
  proceed();
}

async function endMatch() {
  for (let i = 0; i < 9; i++) { if (G.line.them[i] == null) G.line.them[i] = 0; if (G.line.us[i] == null) G.line.us[i] = G.inn > i + 1 ? 0 : 'X'; }
  Engine.idle();
  const st = C.st, m = G.my, s = C.stats;
  const win = G.score.us > G.score.them, lose = G.score.us < G.score.them;
  const res = win ? 'W' : lose ? 'L' : 'D';
  // 순위
  const sd = C.stand;
  if (!(C.isFinal && C.week > WEEKS)) {
    if (win) { sd.APL.w++; sd[G.opp.id].l++; } else if (lose) { sd.APL.l++; sd[G.opp.id].w++; } else { sd.APL.d++; sd[G.opp.id].d++; }
    simOtherGames();
  }
  // 개인 기록
  if (!G.benched) {
    s.g++;
    for (const k of ['pa', 'ab', 'h', 'hr', 'rbi', 'bb', 'k', 'd2', 'd3']) s[k] += m[k];
    s.far = Math.max(s.far, m.far);
  }
  // 보상
  let fame = 0, trust = 0;
  if (!G.benched) {
    fame = m.h + m.hr * 3 + (win ? 1 : 0) + (G.walkoffMe ? 5 : 0);
    trust = m.h * 2 + m.hr * 3 + m.rbi + m.bb - m.k - (m.h === 0 && m.pa >= 2 ? 3 : 0) + (G.walkoffMe ? 6 : 0);
    st.stamina = clamp(st.stamina - 10, 0, 100);
    if (m.h >= 2 || m.hr) st.cond = clamp(st.cond + 1, 0, 4);
    else if (m.h === 0 && Math.random() < 0.5) st.cond = clamp(st.cond - 1, 0, 4);
  } else {
    st.stamina = clamp(st.stamina + 30, 0, 100);
  }
  st.fame = clamp(st.fame + fame, 0, 100);
  st.trust = clamp(st.trust + trust, 0, 100);
  if (C.injury > 0) C.injury--;
  C.results.push(res);

  const line = G.benched ? '부상으로 결장' : `${m.ab}타수 ${m.h}안타${m.hr ? ` ${m.hr}홈런` : ''} ${m.rbi}타점${m.bb ? ` ${m.bb}볼넷` : ''}${m.k ? ` ${m.k}삼진` : ''}`;
  const title = win ? (G.walkoff ? '🎉 끝내기 승리!' : '🎉 승리!') : lose ? '😢 패배' : '🤝 무승부';
  if (win) Engine.sfx.cheer(2, 0.3);
  show(`<div class="card sitcard">
      <h3>${monthLabel(C.week)} · 경기 종료</h3>
      <div class="big">${title}</div>
      <div style="font-size:30px;font-weight:900">애플즈 ${G.score.us} : ${G.score.them} ${G.opp.short}</div>
      ${linescore(0)}
      <div class="howto" style="text-align:left"><b>${C.name}</b> · ${line}<br>${m.log.length ? m.log.join(' → ') : ''}</div>
      ${G.benched ? '' : `<p class="small" style="margin:10px 0">인기 <span class="gain">+${fame}</span> · 감독 신뢰 <span class="${trust >= 0 ? 'gain' : 'loss'}">${trust >= 0 ? '+' : ''}${trust}</span></p>`}
      <div style="margin-top:12px"><button class="btn" data-a="next">다음 주로</button></div>
    </div>`,
  { next: () => (C.isFinal && C.week > WEEKS ? finishFinal() : nextWeek()) }, { center: true });
}

function simOtherGames() {
  const others = TEAMS.filter(t => !t.me && t.id !== G.opp.id).sort(() => Math.random() - 0.5);
  for (let i = 0; i + 1 < others.length; i += 2) {
    const a = others[i], b = others[i + 1];
    const ra = poisson(4 * a.off / b.pit), rb = poisson(4 * b.off / a.pit);
    const sd = C.stand;
    if (ra > rb) { sd[a.id].w++; sd[b.id].l++; } else if (rb > ra) { sd[b.id].w++; sd[a.id].l++; } else { sd[a.id].d++; sd[b.id].d++; }
  }
}

function nextWeek() {
  G = null;
  C.week++; C.slot = 0;
  if (C.week > WEEKS) return seasonEnd();
  save();
  startWeek();
}

// ---------- 시즌 종료 ----------
async function seasonEnd() {
  const table = sortedStand();
  const rank = table.findIndex(r => r.t.me) + 1;
  C.rank = rank;
  save();
  if (rank <= 2) {
    const opp = rank === 1 ? table[1].t : table[0].t;
    await playVN([{ bg: 'linear-gradient(180deg,#1b2a55,#e5484d)' },
      { who: 'coach', mood: 'smile', text: `정규시즌 ${rank}위. 한국시리즈다, ${C.name}.` },
      { who: 'coach', mood: 'normal', text: `상대는 ${opp.short}. 단판 승부. …네 방망이에 걸어 보겠다.` }]);
    C.finalOpp = opp.id;
    C.schedule.push(opp.id);
    C.week = WEEKS + 1;
    C.isFinal = true;
    finalMatch();
    return;
  }
  awards();
}
function finalMatch() {
  // 한국시리즈: 일반 경기 흐름을 재사용
  const opp = team(C.finalOpp);
  C.st.trust = Math.max(C.st.trust, 45);
  show(`<div class="card sitcard"><h3>🏆 한국시리즈 최종전</h3><div class="big">애플즈 vs <span style="color:${opp.color}">${opp.short}</span></div>
    <p class="muted small" style="margin:8px 0 14px">우승까지 단 한 경기!</p>
    <div class="stack"><button class="btn" data-a="go" data-v="play">⚾ 직접 타격</button><button class="btn sub" data-a="go" data-v="auto">⏩ 결과만 보기</button></div></div>`,
  { go: v => { startMatch('normal', false, v === 'auto'); } }, { center: true });
}

async function awards() {
  const s = C.stats;
  const a = s.ab ? s.h / s.ab : 0;
  const leaderHR = ri(6, 9), leaderAvg = rand(0.318, 0.345);
  const list = [];
  if (C.isFinal) list.push(C.champion ? '🏆 한국시리즈 우승!' : '🥈 한국시리즈 준우승');
  if (s.hr >= leaderHR) list.push(`👑 홈런왕 (${s.hr}개)`);
  if (s.ab >= 50 && a >= leaderAvg) list.push(`🎯 타격왕 (타율 ${avg(s.h, s.ab)})`);
  if (s.ab >= 35 && (a >= 0.27 || s.hr >= 4 || s.rbi >= 18)) list.push('🌟 신인왕');
  if (C.st.fame >= 80) list.push('📣 올해의 인기 선수');
  C.awards = list;
  save();
  show(`<div class="card"><h2 style="text-align:center">시즌 종료</h2>
    <p class="muted small" style="text-align:center;margin:6px 0">정규시즌 ${C.rank}위</p>
    <div class="stats">
      <div class="stat big"><div class="k">${C.name} 시즌 성적</div><div class="v">${avg(s.h, s.ab)}</div><div class="k">타율</div></div>
      <div class="stat"><div class="k">홈런</div><div class="v">${s.hr}</div></div>
      <div class="stat"><div class="k">타점</div><div class="v">${s.rbi}</div></div>
      <div class="stat"><div class="k">안타</div><div class="v">${s.h}</div></div>
      <div class="stat"><div class="k">최장 비거리</div><div class="v">${s.far ? s.far + 'm' : '-'}</div></div>
    </div>
    <h3>수상</h3><div class="howto">${list.length ? list.join('<br>') : '수상 없음… 내년을 기약하자.'}</div>
    ${standTable()}
    <div style="margin-top:14px"><button class="btn pink" data-a="go">💗 그리고…</button></div></div>`,
  { go: ending }, { center: true });
}

async function ending() {
  hideScreen();
  const ranked = GIRL_KEYS.filter(k => C.girls[k].met).sort((a, b) => C.girls[b].aff - C.girls[a].aff);
  const best = ranked[0];
  const g = best && C.girls[best];
  const ok = g && g.aff >= 80 && (best !== 'seoyun' || C.st.fame >= 50) && (best !== 'minji' || C.injuries <= 1);
  if (ok) {
    await playVN(S.ending[best]);
    await VN.titleCard(`♥ ${GIRLS[best].name} 엔딩 ♥`, '두 사람의 다음 시즌이 시작된다', GIRLS[best].bg);
  } else if (g && g.aff >= 50) {
    await playVN([{ bg: GIRLS[best].bg }, { who: best, mood: 'smile', text: `시즌 수고했어, ${C.name}. 다음 시즌에도… 응원할게.` },
      { narr: `${GIRLS[best].name}와(과)는 소중한 친구로 남았다. 조금만 더 다가갔더라면…` }]);
    await VN.titleCard('우정 엔딩', `${GIRLS[best].name}와(과) 좋은 친구로`, 'linear-gradient(180deg,#1b2a55,#3a4f8a)');
  } else {
    await playVN([{ bg: 'linear-gradient(180deg,#1b2a55,#3a4f8a)' }, { who: 'coach', mood: 'smile', text: `${C.name}. 넌 야구밖에 모르는 놈이군. …나쁘지 않다.` }]);
    await VN.titleCard('야구가 연인 엔딩', '배트와 함께한 청춘', 'linear-gradient(180deg,#0b1530,#1b2a55)');
  }
  C.over = true;
  save();
  clearSave();
  onExit && onExit();
}

function finishFinal() {
  C.champion = C.results[C.results.length - 1] === 'W';
  awards();
}

// ---------- 공개 API ----------
window.Career = {
  hasSave,
  start(name, exitCb) { onExit = exitCb; newCareer(name || '루키'); save(); startWeek(); },
  resume(exitCb) { onExit = exitCb; C = load(); if (!C) return false; if (C.isFinal && C.week > WEEKS) { finalMatch(); return true; } startWeek(); return true; },
  _debug: { get C() { return C; }, get G() { return G; } },
};
})();
