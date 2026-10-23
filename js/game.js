// 커리어 본체: 오픈월드 · 투타겸업 · 구단 경영 · 연애
(() => {
'use strict';

const { TEAMS, SLOTS, LOCS, GIRLS, GIRL_KEYS, DATE_PLACES, GIFTS, TICKETS, FACILITIES, FAS, S } = Story;
const SAVE_KEY = 'homerunking_tycoon_v2';
const WEEKS = 20;

const $screen = document.getElementById('screen');
const $hud = document.getElementById('hud');
const $whud = document.getElementById('whud');
const $clock = document.getElementById('wclock');
const $money = document.getElementById('wmoney');
const $banner = document.getElementById('wbanner');
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const eok = n => (Math.round(n * 10) / 10).toLocaleString('ko-KR');

let C = null;      // 저장 상태
let G = null;      // 경기 진행
let onExit = null;

// ---------- 저장 ----------
function save() { if (!C) return; C.world = World.getState(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(C)); } catch (e) {} }
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
const monthLabel = w => w > WEEKS ? '한국시리즈' : `${4 + Math.floor((w - 1) / 4)}월 ${(w - 1) % 4 + 1}주`;
const COND = [['😫', '최악'], ['😞', '부진'], ['😐', '보통'], ['🙂', '좋음'], ['😆', '절호조']];
function grade(v) { return v >= 80 ? 'S' : v >= 70 ? 'A' : v >= 60 ? 'B' : v >= 50 ? 'C' : v >= 40 ? 'D' : v >= 30 ? 'E' : v >= 20 ? 'F' : 'G'; }
const GRADE_COL = { S: '#ff5c93', A: '#ff7a59', B: '#ffb820', C: '#ffd54a', D: '#a3e635', E: '#4ade80', F: '#6bc5ff', G: '#9fb0d4' };
function affLabel(a) { return a >= 80 ? '두근두근♥' : a >= 60 ? '설렘' : a >= 40 ? '친한 사이' : a >= 20 ? '친구' : '아는 사이'; }
function avg(h, ab) { return ab ? (h / ab).toFixed(3).replace(/^0/, '') : '.000'; }
function era() { const p = C.pstats; return p.outs ? (p.er * 27 / p.outs).toFixed(2) : '-.--'; }

// ---------- 새 게임 ----------
function newGame(name) {
  const opps = TEAMS.filter(t => !t.me).map(t => t.id);
  const schedule = [];
  while (schedule.length < WEEKS) schedule.push(...opps.slice().sort(() => Math.random() - 0.5));
  C = {
    name, week: 1, slot: 0, over: false, injury: 0, injuries: 0,
    st: { meet: 45, power: 48, eye: 35, speed: 62, velo: 146, control: 40, breaking: 35, pstam: 45,
          stamina: 100, cond: 2, fame: 15, charm: 40, morale: 50 },
    money: 3000,                       // 개인 자산 (만원)
    club: { money: 30, fans: 10, ticket: 1, fac: { seats: 0, training: 0, medical: 0, screen: 0 }, signed: [], off: 0, pit: 0,
            last: null, adCont: false },
    girls: Object.fromEntries(GIRL_KEYS.map(k => [k, { met: false, aff: 0, last: 1, bomb: 0, evA: false, evB: false, lastPlace: null }])),
    inv: {},
    stats: { g: 0, pa: 0, ab: 0, h: 0, d2: 0, d3: 0, hr: 0, rbi: 0, bb: 0, k: 0, sb: 0, cs: 0, far: 0 },
    pstats: { outs: 0, k: 0, bb: 0, h: 0, er: 0, w: 0, l: 0 },
    stand: Object.fromEntries(TEAMS.map(t => [t.id, { w: 0, l: 0, d: 0 }])),
    schedule: schedule.slice(0, WEEKS), flags: {}, results: [], seaFoul: 0,
  };
  World.reset();
}

// ---------- 효과 ----------
function applyFx(fx) {
  const st = C.st;
  for (const [k, v] of Object.entries(fx)) {
    if (GIRL_KEYS.includes(k)) {
      const g = C.girls[k];
      g.aff = clamp(g.aff + v, 0, 100);
      if (v > 0) { g.last = C.week; g.bomb = 0; }
    } else if (k === 'cond') st.cond = clamp(st.cond + v, 0, 4);
    else if (k === 'money') C.club.money += v;
    else if (k === 'fans') C.club.fans += v;
    else if (k === 'seaFoul') C.seaFoul += v;
    else if (k === 'velo') st.velo = clamp(st.velo + v, 130, 165);
    else if (k in st) st[k] = clamp(st[k] + v, 0, 100);
  }
}
function capacity() { return 15000 + C.club.fac.seats * 5000; }
function teamOff() { return TEAMS[0].off + C.club.off + (C.st.morale - 50) / 10; }
function teamPit() { return TEAMS[0].pit + C.club.pit + (C.st.morale - 50) / 12; }
function myPitRating() { const s = C.st; return 30 + (s.velo - 135) * 0.9 + s.control * 0.17 + s.breaking * 0.15; }
function reps() {
  const r = ['FB', 'SL', 'CH'];
  if (C.st.breaking >= 45) r.push('CU');
  if (C.st.breaking >= 65) r.push('FK');
  return r;
}
function girlsAt(loc) {
  if (C.slot >= 3) return [];
  return GIRL_KEYS.filter(k => GIRLS[k].sched[C.slot] === loc);
}

// ---------- 오픈월드 ----------
function updateWorldHUD() {
  const slotTxt = C.slot >= 3 ? '⚾ 주말 경기' : `${SLOTS[C.slot]} (${C.slot + 1}/3)`;
  $clock.innerHTML = `${monthLabel(C.week)} · <b>${slotTxt}</b>`;
  $money.innerHTML = `💰 ${fmt(C.money)}만 · 🏦 ${eok(C.club.money)}억 · ${COND[C.st.cond][0]} 체력 ${C.st.stamina}`;
  if (C.slot >= 3) { $banner.textContent = '⚾ 경기 시간! 애플파크로 가세요'; $banner.classList.add('on'); }
  else $banner.classList.remove('on');
}
function enterWorld() {
  hideScreen();
  $hud.classList.add('hidden');
  Engine.idle();
  World.setSlot(Math.min(C.slot, 2));
  if (C.slot >= 3) World.setTarget('stadium');
  else if (World.target === 'stadium') World.setTarget(null);
  updateWorldHUD();
  $whud.classList.remove('hidden');
  World.start({
    onEnter: id => { leaveWorld(); openLoc(id); },
    onNpc: streetEvent,
    onBall: (n, tot) => {
      const k = pick(['meet', 'power', 'eye', 'speed', 'control', 'breaking']);
      C.st[k] = clamp(C.st[k] + 2, 0, 100);
      toast(`✨ 황금 야구공 ${n}/${tot} 발견! ${statName(k)} <span class="gain">+2</span>`);
      if (n === tot) { C.st.fame = clamp(C.st.fame + 15, 0, 100); toast('🏆 황금 야구공 전부 수집! 인기 +15'); }
      save();
    },
    hearts: () => {
      const h = {};
      for (const k of GIRL_KEYS) {
        if (!C.girls[k].met || C.slot >= 3) continue;
        const loc = GIRLS[k].sched[C.slot];
        h[loc] = (h[loc] || 0) + 1;
      }
      return h;
    },
  });
}
function leaveWorld() { World.stop(); $whud.classList.add('hidden'); }
document.getElementById('wmenu').addEventListener('click', e => {
  e.stopPropagation();
  if (!World.running || !C) return;
  leaveWorld();
  statusScreen(() => { save(); enterWorld(); });
});
const STAT_NAMES = { meet: '미트', power: '파워', eye: '선구안', speed: '주력', velo: '구속', control: '제구', breaking: '변화구', pstam: '투구 스태미나', charm: '매력', fame: '인기', morale: '팀 사기' };
const statName = k => STAT_NAMES[k] || k;

async function streetEvent() {
  leaveWorld();
  const ev = pick(S.street);
  await playVN([{ bg: 'linear-gradient(180deg,#2a3a5c,#6b7a9a)' }, { narr: ev.text }, { fx: ev.fx }]);
  save();
  enterWorld();
}

// 시간 진행 (장소에서 행동)
async function useSlot() {
  C.slot++;
  if (C.slot === 3) toast('🌙 하루가 끝났다. 주말 경기가 기다린다!');
  save();
  enterWorld();
}

// ---------- 주 시작 ----------
async function startWeek() {
  const w = C.week;
  if (w === 1 && !C.flags.opening) { C.flags.opening = 1; await playVN(S.opening); }
  if (!C.flags['wk' + w]) {
    C.flags['wk' + w] = 1;
    if (w > 1) { C.money += 500; toast('💰 아버지 용돈 +500만원'); }
    if (w === Math.floor(WEEKS / 2) + 1) await chairmanCheck(false);
    // 서운함 💣
    for (const k of GIRL_KEYS) {
      const g = C.girls[k];
      if (!g.met || g.aff < 30) continue;
      const since = w - g.last;
      if (!g.bomb && since >= 4) { g.bomb = 1; toast(`💣 ${GIRLS[k].name}이(가) 서운해하고 있다…`); }
      else if (g.bomb && since >= 6) {
        g.bomb = 0; g.last = w;
        g.aff = clamp(g.aff - 12, 0, 100);
        GIRL_KEYS.filter(o => o !== k && C.girls[o].met).forEach(o => { C.girls[o].aff = clamp(C.girls[o].aff - 5, 0, 100); });
        await playVN([{ bg: GIRLS[k].bg }, { who: k, mood: 'angry', text: '…요즘 나한테 관심도 없죠? 됐어요.' },
          { narr: `💥 폭탄 폭발! ${GIRLS[k].name}의 호감도가 크게 떨어지고, 소문이 퍼져 다른 사람들의 호감도도 내려갔다.` }]);
      }
    }
  }
  save();
  enterWorld();
}
async function chairmanCheck(final) {
  const r = rankOf();
  const good = C.club.money >= 30 && r <= 3;
  await playVN([...S.chairmanMid, { narr: `현재 ${r}위 · 구단 자금 ${eok(C.club.money)}억 (목표: 3위 이내 + 30억 이상)` }, ...(good ? S.chairmanGood : S.chairmanBad)]);
}

// ---------- 장소 ----------
function heroBlock(loc) {
  const here = girlsAt(loc);
  if (!here.length) return '';
  return here.map(k => {
    const g = C.girls[k], d = GIRLS[k];
    const mood = g.bomb ? 'angry' : g.aff >= 60 ? 'love' : g.aff >= 35 ? 'smile' : 'normal';
    const hearts = '♥'.repeat(Math.round(g.aff / 20)) + '♡'.repeat(5 - Math.round(g.aff / 20));
    const btns = !g.met
      ? `<button class="btn pink" data-a="meet" data-v="${k}">👋 말 걸기</button>`
      : `<div class="row"><button class="btn pink" data-a="talk" data-v="${k}">💬 대화<small>시간 사용</small></button>
         <button class="btn sub" data-a="gift" data-v="${k}">🎁 선물</button></div>
         <button class="btn pink" data-a="date" data-v="${k}" style="margin-top:8px">💕 데이트 신청<small>시간 사용</small></button>`;
    return `<div class="card herocard">
      <div class="row" style="align-items:center"><div class="face" style="flex:0 0 76px">${Portraits.render(k, mood)}</div>
      <div><div style="font-weight:900;font-size:18px">${g.met ? d.name : '???'} ${g.bomb ? '💣' : ''}</div>
      <div class="small muted">${d.role} · ${d.age}세</div>
      ${g.met ? `<div style="color:${d.color};font-size:13px">${hearts} ${affLabel(g.aff)}</div>` : '<div class="small muted">처음 보는 사람이다</div>'}</div></div>
      <div style="margin-top:10px">${btns}</div></div>`;
  }).join('');
}
function locShell(loc, body, extra = '') {
  const L = LOCS[loc];
  const slotTxt = C.slot >= 3 ? '주말 경기 시간' : SLOTS[C.slot];
  return `<div class="card"><div class="hub-head"><div class="week">${L.emoji} ${L.name}<small>${monthLabel(C.week)} · ${slotTxt}</small></div>
    <span class="pill">체력 ${C.st.stamina}</span></div>${body}</div>${extra}
    <div style="margin-top:12px"><button class="btn ghost" data-a="out">🚶 밖으로 나가기</button></div>`;
}
function act(a, label, sub, v = '') { return `<button class="act" data-a="${a}" data-v="${v}">${label}<small>${sub}</small></button>`; }

const commonHandlers = {
  out: () => { save(); enterWorld(); },
  meet: k => meetGirl(k),
  talk: k => talkGirl(k),
  gift: k => giftMenu(k),
  date: k => dateMenu(k),
};

function openLoc(loc) {
  C.curLoc = loc;
  if (C.slot >= 3 && loc !== 'stadium' && loc !== 'home' && loc !== 'mall' && loc !== 'office') {
    show(locShell(loc, '<p class="muted">경기 시간이에요! 먼저 애플파크로 가세요. ⚾</p>'), commonHandlers, { center: true });
    return;
  }
  const busy = C.slot >= 3;
  const inj = C.injury > 0;
  let body = '', h = { ...commonHandlers };
  switch (loc) {
    case 'home':
      body = `<div class="actions">
        ${busy ? '' : act('rest', '😴 휴식', '체력 +45 · 컨디션 ↑')}
        ${act('status', '📊 내 정보', '능력치 · 기록 · 인연')}
        ${act('taxi', '🚕 콜택시', '원하는 장소로 이동 (3만원)')}
        ${act('save', '💾 저장', '현재 진행 저장')}
        ${act('title', '🏁 타이틀로', '저장 후 종료')}</div>`;
      h.rest = () => { C.st.stamina = clamp(C.st.stamina + 45, 0, 100); if (Math.random() < 0.55) C.st.cond = clamp(C.st.cond + 1, 0, 4); toast('푹 쉬었다! 체력 <span class="gain">+45</span>'); useSlot(); };
      h.status = () => statusScreen(() => openLoc('home'));
      h.taxi = () => taxiMenu();
      h.save = () => { save(); toast('💾 저장했어요'); };
      h.title = () => { save(); leaveWorld(); onExit && onExit(); };
      break;
    case 'stadium':
      if (busy) {
        body = `<p class="muted" style="margin-bottom:10px">vs ${team(C.schedule[C.week - 1]).short} — 관중이 입장하고 있다!</p>
          <button class="btn" data-a="match">⚾ 경기 시작</button>`;
        h.match = preMatch;
      } else {
        body = `<h3>🏋️ 훈련 (시간 사용)</h3><div class="actions">
          ${act('train', '🏏 타격 훈련', '미트 ↑ · 체력 -16', 'meet')}
          ${act('train', '💪 웨이트', '파워 ↑ · 체력 -20', 'power')}
          ${act('train', '👀 선구안 훈련', '선구안 ↑ · 체력 -10', 'eye')}
          ${act('train', '🏃 주루·도루 훈련', '주력 ↑ · 체력 -14', 'speed')}
          ${act('train', '🔥 불펜 투구', '구속 ↑ 제구 ↑ · 체력 -18', 'pitch')}
          ${act('train', '🌀 변화구 연마', '변화구 ↑ · 체력 -14', 'breaking')}
          ${act('train', '🫁 러닝 (지구력)', '투구 스태미나 ↑ · 체력 -14', 'pstam')}
        </div>${inj ? '<p class="small loss" style="margin-top:8px">🤕 부상 중에는 훈련할 수 없어요</p>' : ''}
        ${C.st.stamina < 35 ? '<p class="small loss" style="margin-top:8px">⚠️ 체력이 낮아요. 부상 위험!</p>' : ''}`;
        h.train = k => { if (inj) return toast('🤕 부상 중이에요'); train(k); };
      }
      break;
    case 'office':
      body = `<p class="muted small" style="margin-bottom:10px">구단주 업무는 시간을 쓰지 않아요.</p><button class="btn" data-a="biz">📈 경영 메뉴 열기</button>`;
      h.biz = officeMenu;
      break;
    case 'studio':
      body = `<div class="actions">${act('job', '🎥 CF 촬영 (내 광고)', '개인 +300만 · 인기 +3 · 체력 -12', 'cf')}</div>`;
      break;
    case 'campus':
      body = `<div class="actions">${act('job', '🎤 특별 강연', '매력 +3 · 인기 +1 · 체력 -6', 'lecture')}${act('job', '📊 데이터 분석 수업', '선구안 +2 · 체력 -6', 'data')}</div>`;
      break;
    case 'cafe':
      body = `<div class="actions">${act('job', '☕ 카페에서 휴식', '체력 +20 · 컨디션 ↑ (5만원)', 'cafe')}</div>`;
      break;
    case 'mall':
      body = `<h3>🛍 선물 쇼핑 (시간 안 씀)</h3><div class="actions">${GIFTS.map(g => act('buy', g.name, `${fmt(g.price)}만원 · 보유 ${C.inv[g.id] || 0}`, g.id)).join('')}</div>
        ${busy ? '' : `<h3 style="margin-top:12px">✨ 플렉스</h3><div class="actions">${act('job', '👔 명품 쇼핑', '매력 +4 · 컨디션 ↑ (200만원)', 'flex')}</div>`}`;
      h.buy = id => {
        const g = GIFTS.find(x => x.id === id);
        if (C.money < g.price) return toast('💸 개인 자산이 부족해요');
        C.money -= g.price; C.inv[id] = (C.inv[id] || 0) + 1;
        toast(`${g.name} 구매! (-${fmt(g.price)}만)`); save(); openLoc('mall');
      };
      break;
    case 'park':
      body = `<div class="actions">${act('job', '🏃 한강 조깅', '주력 +1 · 투구 스태미나 +3 · 체력 -10', 'jog')}${act('job', '🧺 피크닉', '체력 +25 · 컨디션 ↑', 'picnic')}</div>`;
      break;
    case 'umpire':
      body = `<div class="actions">${act('job', '📘 규칙 세미나', '선구안 +2 · 제구 +1 · 체력 -6', 'rules')}</div>`;
      break;
    case 'batting':
      body = `<div class="actions">${act('job', '⚾ 개인 타격 연습', '미트 +2 · 파워 +1 · 체력 -10 (3만원)', 'bat')}</div>`;
      break;
    case 'restaurant':
      body = `<div class="actions">${act('job', '🍽 코스 요리', '체력 +15 · 컨디션 ↑ (30만원)', 'dine')}</div>`;
      break;
  }
  if (!h.job) h.job = id => doJob(id);
  show(locShell(loc, body, heroBlock(loc)), h);
}

const JOBS = {
  cf: { fx: { fame: 3, stamina: -12 }, money: 300, text: 'CF 촬영 완료! 개인 +300만원, 인기 +3' },
  lecture: { fx: { charm: 3, fame: 1, stamina: -6 }, text: '학생들 앞에서 강연했다. 매력 +3' },
  data: { fx: { eye: 2, stamina: -6 }, text: '세이버메트릭스 수업을 들었다. 선구안 +2' },
  cafe: { fx: { stamina: 20 }, cost: 5, cond: 0.6, text: '향긋한 커피 한 잔. 체력 +20' },
  flex: { fx: { charm: 4 }, cost: 200, cond: 0.7, text: '명품 쇼핑! 매력 +4' },
  jog: { fx: { speed: 1, pstam: 3, stamina: -10 }, text: '한강을 달렸다. 주력 +1, 투구 스태미나 +3' },
  picnic: { fx: { stamina: 25 }, cond: 0.6, text: '잔디밭에서 낮잠. 체력 +25' },
  rules: { fx: { eye: 2, control: 1, stamina: -6 }, text: '스트라이크 존을 공부했다. 선구안 +2, 제구 +1' },
  bat: { fx: { meet: 2, power: 1, stamina: -10 }, cost: 3, text: '배팅센터에서 땀을 흘렸다. 미트 +2, 파워 +1' },
  dine: { fx: { stamina: 15 }, cost: 30, cond: 0.8, text: '최고급 코스 요리. 체력 +15' },
};
function doJob(id) {
  const j = JOBS[id];
  if (j.cost && C.money < j.cost) return toast('💸 개인 자산이 부족해요');
  if (j.cost) C.money -= j.cost;
  if (j.money) C.money += j.money;
  applyFx(j.fx);
  if (j.cond && Math.random() < j.cond) C.st.cond = clamp(C.st.cond + 1, 0, 4);
  toast(j.text);
  Engine.sfx.ding();
  useSlot();
}

async function train(kind) {
  const st = C.st;
  const cost = { meet: 16, power: 20, eye: 10, speed: 14, pitch: 18, breaking: 14, pstam: 14 }[kind];
  let risk = st.stamina < 35 ? (35 - st.stamina) / 35 * 0.55 + 0.05 : 0;
  risk *= Math.pow(0.7, C.club.fac.medical);
  if (Math.random() < risk) {
    C.injury = 2; C.injuries++;
    st.stamina = clamp(st.stamina - 10, 0, 100); st.cond = clamp(st.cond - 1, 0, 4);
    await playVN(S.injury);
    return useSlot();
  }
  const base = () => Math.max(1, Math.round((3 + Math.random() * 3 + (st.cond - 2) * 0.7) + C.club.fac.training));
  let msg;
  if (kind === 'pitch') {
    const v = Math.max(1, Math.round(base() / 2)), c = Math.max(1, Math.round(base() * (1 - st.control / 140)));
    st.velo = clamp(st.velo + v, 130, 165); st.control = clamp(st.control + c, 0, 100);
    msg = `구속 <span class="gain">+${v}km/h</span> · 제구 <span class="gain">+${c}</span>`;
  } else {
    const g = Math.max(1, Math.round(base() * (1 - st[kind] / 140)));
    const before = st.breaking;
    st[kind] = clamp(st[kind] + g, 0, 100);
    msg = `${statName(kind)} <span class="gain">+${g}</span>`;
    if (kind === 'breaking' && before < 45 && st.breaking >= 45) setTimeout(() => toast('🌈 새 구종 습득: 커브!'), 600);
    if (kind === 'breaking' && before < 65 && st.breaking >= 65) setTimeout(() => toast('⬇️ 새 구종 습득: 포크볼!'), 600);
  }
  st.stamina = clamp(st.stamina - cost, 0, 100);
  st.morale = clamp(st.morale + 1, 0, 100);
  toast(`${msg} · 체력 <span class="loss">-${cost}</span>`);
  Engine.sfx.ding();
  useSlot();
}

function taxiMenu() {
  show(`<div class="card"><h2>🚕 어디로 갈까요?</h2><p class="muted small" style="margin:6px 0 12px">기본요금 3만원 · 시간은 흐르지 않아요</p>
    <div class="places">${Object.entries(LOCS).map(([id, L]) => `<button class="act" data-a="go" data-v="${id}">${L.emoji} ${L.name}</button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">취소</button></div></div>`,
  { go: id => { if (C.money < 3) return toast('💸 돈이 부족해요'); C.money -= 3; World.warp(id); save(); enterWorld(); }, back: () => openLoc(C.curLoc) }, { center: true });
}

// ---------- 히로인 ----------
async function meetGirl(k) {
  const d = GIRLS[k];
  if (k === 'yuna' && C.st.fame < d.needFame && !C.club.adCont) {
    await playVN([{ bg: d.bg }, { narr: '매니저가 앞을 막아섰다. "촬영 중입니다. 관계자 외엔 곤란해요."' },
      { narr: `(인기 ${d.needFame} 이상이거나, 구단 사무실에서 광고모델 계약을 하면 만날 수 있다)` }]);
    return openLoc(C.curLoc);
  }
  C.girls[k].met = true; C.girls[k].aff = Math.max(C.girls[k].aff, 10); C.girls[k].last = C.week;
  await playVN(S.meet[k]);
  save();
  openLoc(C.curLoc);
}
async function talkGirl(k) {
  const g = C.girls[k], d = GIRLS[k];
  if (!g.evA && g.aff >= 35) { g.evA = true; g.last = C.week; await playVN(S.evA[k]); return useSlot(); }
  if (g.evA && !g.evB && g.aff >= 60) { g.evB = true; g.last = C.week; await playVN(S.evB[k]); return useSlot(); }
  const delta = ri(2, 4) + Math.floor(C.st.charm / 40);
  await playVN([{ bg: d.bg }, { who: k, mood: g.aff >= 50 ? 'smile' : 'normal', text: pick(d.lines[1]).replace(/"/g, '') }, { fx: { [k]: delta } },
    { narr: `${d.name}와(과) 즐겁게 이야기했다. (호감도 +${delta})` }]);
  useSlot();
}
function giftMenu(k) {
  const owned = GIFTS.filter(g => C.inv[g.id] > 0);
  if (!owned.length) return toast('🎁 가진 선물이 없어요. 애플백화점에서 사 오세요!');
  show(`<div class="card"><h2>🎁 ${GIRLS[k].name}에게 무엇을?</h2>
    <div class="places" style="margin-top:12px">${owned.map(g => `<button class="act" data-a="give" data-v="${g.id}">${g.name}<small>보유 ${C.inv[g.id]}</small></button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">취소</button></div></div>`,
  { give: id => giveGift(k, id), back: () => openLoc(C.curLoc) }, { center: true });
}
async function giveGift(k, id) {
  const pref = GIRLS[k].gifts[id];
  C.inv[id]--;
  const delta = { '-1': -5, 0: 2, 1: 5, 2: 9 }[pref];
  const mood = { '-1': 'angry', 0: 'normal', 1: 'smile', 2: 'love' }[pref];
  const say = {
    '-1': k === 'sea' ? '…심판에게 이런 선물은 곤란해요. 규정 위반이에요.' : '…이건 좀 부담스러워요.',
    0: '고마워요. 잘 쓸게요.', 1: '와, 마음에 들어요! 고마워요.', 2: '어떻게 알았어요?! 이거 진짜 갖고 싶었어요!',
  }[pref];
  await playVN([{ bg: GIRLS[k].bg }, { who: k, mood, text: say }, { fx: { [k]: delta } }, { narr: `호감도 ${delta >= 0 ? '+' : ''}${delta}` }]);
  save();
  openLoc(C.curLoc);
}
function dateMenu(k) {
  const d = GIRLS[k];
  show(`<div class="card"><h2>💕 ${d.name}와(과) 어디 갈까?</h2><p class="muted small" style="margin:6px 0 12px">개인 자산 ${fmt(C.money)}만원 · 상대가 좋아하는 곳을 고르면 호감도 UP</p>
    <div class="places">${DATE_PLACES.map(p => `<button class="act" data-a="go" data-v="${p.id}">${p.name}<small>${p.cost ? fmt(p.cost) + '만원' : '무료'}</small></button>`).join('')}</div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">취소</button></div></div>`,
  { go: p => doDate(k, p), back: () => openLoc(C.curLoc) }, { center: true });
}
async function doDate(k, placeId) {
  const g = C.girls[k], d = GIRLS[k];
  const place = DATE_PLACES.find(p => p.id === placeId);
  if (C.money < place.cost) return toast('💸 개인 자산이 부족해요');
  C.money -= place.cost;
  let pref = d.likes[placeId];
  const again = g.lastPlace === placeId;
  if (again) pref = Math.max(-1, pref - 1);
  const delta = { '-1': -4, 0: 3, 1: 6, 2: 10 }[pref] + (pref >= 0 ? Math.floor(C.st.charm / 30) : 0);
  const mood = { '-1': 'angry', 0: 'normal', 1: 'smile', 2: 'happy' }[pref];
  g.lastPlace = placeId;
  C.st.stamina = clamp(C.st.stamina - 5, 0, 100);
  const fx = { [k]: delta };
  if (pref >= 1) fx.cond = 1;
  await playVN([
    { bg: d.bg },
    { narr: placeId === 'drive' ? `${d.name}을(를) 태우고 슈퍼카로 밤거리를 달렸다.` : `${d.name}와(과) ${place.name.slice(2)}에 갔다.` },
    ...(again ? [{ who: k, mood: 'normal', text: '…또 여기예요? 지난번에도 왔잖아요.' }] : []),
    { who: k, mood, text: pick(d.lines[pref]).replace(/"/g, '') },
    { fx },
    { narr: `${d.name}의 호감도 ${delta >= 0 ? '+' : ''}${delta}${pref >= 1 ? ' · 컨디션 UP' : ''}` },
  ]);
  useSlot();
}

// ---------- 구단 경영 ----------
function officeMenu() {
  const cl = C.club, last = cl.last;
  const facs = Object.entries(FACILITIES).map(([id, f]) => {
    const lv = cl.fac[id];
    const maxed = lv >= f.max;
    return `<button class="act" data-a="fac" data-v="${id}" ${maxed ? 'disabled' : ''}>${f.name} <span class="muted">Lv.${lv}</span><small>${f.desc} · ${maxed ? '최대' : f.cost[lv] + '억'}</small></button>`;
  }).join('');
  const fas = FAS.filter(f => !cl.signed.includes(f.id)).map(f =>
    `<button class="act" data-a="fa" data-v="${f.id}">${f.name}<small>${f.pos} · ${f.type === 'off' ? '타선' : '투수진'} +${f.boost} · 계약금 ${f.cost}억 · 주급 ${f.salary}억</small></button>`).join('');
  show(`<div class="card">
      <div class="hub-head"><div class="week">📈 구단 경영<small>애플즈 구단주 집무실</small></div><span class="pill">🏦 ${eok(cl.money)}억</span></div>
      <div class="stats" style="margin:0 0 10px">
        <div class="stat"><div class="k">팬덤</div><div class="v">${eok(cl.fans)}만</div></div>
        <div class="stat"><div class="k">수용 인원</div><div class="v">${fmt(capacity())}</div></div>
        <div class="stat"><div class="k">팀 타선</div><div class="v">${Math.round(teamOff())}</div></div>
        <div class="stat"><div class="k">팀 투수진</div><div class="v">${Math.round(teamPit())}</div></div>
        <div class="stat"><div class="k">팀 사기</div><div class="v">${C.st.morale}</div></div>
        <div class="stat"><div class="k">순위</div><div class="v">${rankOf()}위</div></div>
      </div>
      ${last ? `<div class="howto small">지난 경기: 관중 ${fmt(last.att)}명 · 수입 ${eok(last.rev)}억 · 지출 ${eok(last.cost)}억 → <b class="${last.rev - last.cost >= 0 ? 'gain' : 'loss'}">${last.rev - last.cost >= 0 ? '+' : ''}${eok(last.rev - last.cost)}억</b></div>` : '<div class="howto small">경기를 치르면 관중 수입·지출 보고서가 나옵니다.</div>'}
      <p class="small muted" style="margin-top:8px">🎯 아버지의 조건: 시즌 종료 시 <b>3위 이내</b> + 구단 자금 <b>30억 이상</b></p>
    </div>
    <div class="card"><h3>🎟 티켓 가격</h3><div class="actions">${TICKETS.map(t => `<button class="act ${cl.ticket === t.id ? 'date' : ''}" data-a="ticket" data-v="${t.id}">${t.name}<small>관중 ${t.demand > 1 ? '↑' : t.demand < 1 ? '↓' : '-'} · 객단가 ${t.price}만</small></button>`).join('')}</div></div>
    <div class="card"><h3>🏗 시설 투자</h3><div class="actions">${facs}</div></div>
    <div class="card"><h3>✍️ FA 선수 영입</h3><div class="stack">${fas || '<p class="muted small">영입 가능한 선수가 없어요</p>'}</div></div>
    <div class="card"><h3>📣 마케팅</h3><div class="actions">
      <button class="act" data-a="mk" data-v="cheer">💃 응원단 지원<small>5억 · 팬 +1만 · 사기 +3</small></button>
      <button class="act" data-a="mk" data-v="ad" ${cl.adCont ? 'disabled' : ''}>🎬 차유나 광고모델<small>${cl.adCont ? '계약 완료' : '15억 · 팬 +3만 · 인기 +5'}</small></button>
      <button class="act" data-a="mk" data-v="fan">🎉 팬 사인회<small>3억 · 팬 +1.2만 · 인기 +2</small></button>
      <button class="act" data-a="mk" data-v="party">🍖 선수단 회식<small>2억 · 팀 사기 +8</small></button>
    </div></div>
    <div style="margin-top:12px"><button class="btn ghost" data-a="back">사무실로</button></div>`,
  {
    back: () => openLoc('office'),
    ticket: v => { cl.ticket = +v; toast(`티켓 가격: ${TICKETS[+v].name}`); save(); officeMenu(); },
    fac: id => {
      const f = FACILITIES[id], lv = cl.fac[id], cost = f.cost[lv];
      if (cl.money < cost) return toast('💸 구단 자금이 부족해요');
      cl.money -= cost; cl.fac[id]++;
      toast(`${f.name} Lv.${cl.fac[id]} 완공!`); Engine.sfx.ding(); save(); officeMenu();
    },
    fa: id => {
      const f = FAS.find(x => x.id === id);
      if (cl.money < f.cost) return toast('💸 구단 자금이 부족해요');
      cl.money -= f.cost; cl.signed.push(id); cl[f.type] += f.boost;
      C.st.morale = clamp(C.st.morale + 4, 0, 100);
      toast(`✍️ ${f.name} 영입! ${f.type === 'off' ? '타선' : '투수진'} +${f.boost}`); Engine.sfx.ding(); save(); officeMenu();
    },
    mk: async v => {
      const M = { cheer: [5, { fans: 1, morale: 3 }], ad: [15, { fans: 3, fame: 5 }], fan: [3, { fans: 1.2, fame: 2 }], party: [2, { morale: 8 }] }[v];
      if (cl.money < M[0]) return toast('💸 구단 자금이 부족해요');
      cl.money -= M[0];
      applyFx(M[1]);
      if (v === 'cheer' && C.girls.harin.met) applyFx({ harin: 5 });
      if (v === 'fan' && C.girls.somi.met) applyFx({ somi: 5 });
      if (v === 'ad') {
        cl.adCont = true;
        const g = C.girls.yuna;
        g.met = true; g.aff = Math.max(g.aff, 10) + 8; g.last = C.week;
        await playVN([{ bg: GIRLS.yuna.bg }, { who: 'yuna', mood: 'smile', text: '애플즈 광고모델 차유나입니다. 잘 부탁드려요, 구단주님.' },
          { who: 'yuna', mood: 'shy', text: '…광고 찍으면서 야구 좀 공부했어요. 직관 가도 돼요?' }, { narr: '차유나와 알게 되었다! (스튜디오 · 레스토랑에서 만날 수 있다)' }]);
      }
      toast('📣 마케팅 완료!'); save(); officeMenu();
    },
  });
}

// ---------- 상태 화면 ----------
function statusScreen(back) {
  const st = C.st, s = C.stats, p = C.pstats;
  const bar = (label, v, col, max = 100, txt) => {
    const gd = grade(v / max * 100);
    return `<span>${label}</span><div class="bar"><i style="width:${clamp(v / max * 100, 0, 100)}%;background:${col}"></i></div><span class="num"><span class="grade" style="color:${GRADE_COL[gd]}">${gd}</span>${txt || v}</span>`;
  };
  const plain = (label, v, col) => `<span>${label}</span><div class="bar"><i style="width:${v}%;background:${col}"></i></div><span class="num">${v}</span>`;
  const girls = GIRL_KEYS.map(k => {
    const g = C.girls[k], d = GIRLS[k];
    if (!g.met) return `<div class="girl unknown"><div class="face">${Portraits.render(k)}</div><div class="nm">???</div><div class="lv">${LOCS[d.sched[0]].emoji} 어딘가에…</div></div>`;
    const hearts = '♥'.repeat(Math.round(g.aff / 20)) + '♡'.repeat(5 - Math.round(g.aff / 20));
    const now = C.slot < 3 ? LOCS[d.sched[C.slot]] : null;
    return `<div class="girl">${g.bomb ? '<span class="bomb">💣</span>' : ''}<div class="face">${Portraits.render(k, g.aff >= 60 ? 'love' : 'smile')}</div>
      <div class="nm">${d.name}</div><div class="hearts" style="color:${d.color}">${hearts}</div><div class="lv">${now ? '지금 ' + now.emoji : '경기 날'}</div></div>`;
  }).join('');
  const inv = GIFTS.filter(g => C.inv[g.id] > 0).map(g => `<span class="pill">${g.name} ×${C.inv[g.id]}</span>`).join('') || '<span class="muted small">없음</span>';
  show(`<div class="card">
      <div class="hub-head"><div class="week">${C.name}<small>25세 · #27 · 4번 타자 겸 에이스 · 구단주</small></div>
      <div style="text-align:center;font-size:28px;line-height:1">${COND[st.cond][0]}<div class="small muted">${COND[st.cond][1]}</div></div></div>
      <h3>🏏 타격 · 주루</h3><div class="bars">
        ${bar('미트', st.meet, '#ffd54a')}${bar('파워', st.power, '#ff7a59')}${bar('선구안', st.eye, '#6bc5ff')}${bar('주력', st.speed, '#4ade80')}</div>
      <h3 style="margin-top:12px">⚾ 투구</h3><div class="bars">
        ${bar('구속', st.velo - 130, '#ff5c93', 35, st.velo + 'km')}${bar('제구', st.control, '#c084fc')}${bar('변화구', st.breaking, '#22d3ee')}${bar('스태미나', st.pstam, '#a3e635')}</div>
      <p class="small muted" style="margin-top:6px">구종: ${reps().map(r => ({ FB: '직구', SL: '슬라이더', CH: '체인지업', CU: '커브', FK: '포크' })[r]).join(' · ')}</p>
      <h3 style="margin-top:12px">💗 컨디션</h3><div class="bars">
        ${plain('체력', st.stamina, st.stamina < 35 ? '#e5484d' : '#a3e635')}${plain('인기', st.fame, '#ff7aa8')}${plain('매력', st.charm, '#c084fc')}${plain('팀 사기', st.morale, '#facc15')}</div>
      <div class="chips">
        <span class="pill">타율 ${avg(s.h, s.ab)}</span><span class="pill">${s.hr}홈런</span><span class="pill">${s.rbi}타점</span><span class="pill">🏃 ${s.sb}도루</span>
        <span class="pill">${p.w}승 ${p.l}패</span><span class="pill">ERA ${era()}</span><span class="pill">${p.k}탈삼진</span>
      </div>
      <div class="chips"><span class="pill">💰 개인 ${fmt(C.money)}만원</span><span class="pill">🏦 구단 ${eok(C.club.money)}억</span><span class="pill">✨ 황금공 ${World.getState().balls.length}/${World.ballsTotal}</span></div>
    </div>
    <div class="card"><h3>💗 인연 (지금 있는 곳)</h3><div class="girls five">${girls}</div>
      <p class="small muted" style="margin-top:8px">🎁 선물: ${inv}</p></div>
    <div class="card"><h3>🗺 목적지 설정 (지도에 화살표 표시)</h3><div class="places">${Object.entries(LOCS).map(([id, L]) => `<button class="act" data-a="tgt" data-v="${id}">${L.emoji} ${L.name}</button>`).join('')}</div></div>
    <div class="card"><h3>🏆 리그 순위</h3>${standTable()}</div>
    <div style="margin-top:12px"><button class="btn" data-a="back">돌아가기</button></div>`,
  { back, tgt: id => { World.setTarget(id); toast(`📍 목적지: ${LOCS[id].name}`); enterWorld(); } });
}

// ---------- 리그 ----------
function sortedStand() {
  return TEAMS.map(t => ({ t, ...C.stand[t.id] }))
    .sort((a, b) => (b.w / Math.max(1, b.w + b.l)) - (a.w / Math.max(1, a.w + a.l)) || b.w - a.w);
}
function rankOf() { return sortedStand().findIndex(r => r.t.me) + 1; }
function standTable() {
  const rows = sortedStand().map((r, i) => {
    const pct = r.w + r.l ? (r.w / (r.w + r.l)).toFixed(3).replace(/^0/, '') : '.000';
    return `<tr class="${r.t.me ? 'me' : ''}"><td>${i + 1}. <span class="tdot" style="background:${r.t.color}"></span>${r.t.short}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${pct}</td></tr>`;
  }).join('');
  return `<table class="stand"><tr><th>팀</th><th>승</th><th>패</th><th>무</th><th>승률</th></tr>${rows}</table>`;
}
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; }

// ---------- 경기 ----------
const TACTICS = {
  attack: { name: '🔥 적극 공격', us: 1.15, them: 1.08, desc: '득점 ↑ · 실점 소폭 ↑' },
  normal: { name: '⚖️ 균형', us: 1, them: 1, desc: '기본 운영' },
  defend: { name: '🛡 지키는 야구', us: 0.9, them: 0.85, desc: '실점 ↓ · 득점 ↓' },
};
const OPP_BATTERS = ['김강타', '박거포', '이정확', '최클러치', '정해결', '한방이', '오장타', '윤선구'];
function oppPitcher(opp, inning) {
  const base = clamp(0.2 + (opp.pit - 45) * 0.04 + (C.week - 1) * 0.02, 0, 1.25);
  if (inning >= 7) return { name: `${opp.short} 불펜`, lv: base - 0.05, velo: ri(141, 151), ctrl: 0.45, mix: { FB: 0.55, SL: 0.25, FK: 0.2 } };
  return { ...opp.ace, lv: base };
}

function preMatch() {
  const final = C.week > WEEKS;
  const opp = team(final ? C.finalOpp : C.schedule[C.week - 1]);
  const ace = opp.ace;
  const mixNames = Object.entries(ace.mix).sort((a, b) => b[1] - a[1]).map(([k]) => ({ FB: '직구', TW: '투심', CH: '체인지업', CU: '커브', SL: '슬라이더', FK: '포크' })[k]);
  const ump = C.girls.sea.met && Math.random() < 0.3;
  if (C.injury > 0) {
    show(`<div class="card sitcard"><h3>${monthLabel(C.week)}</h3><div class="big">애플즈 vs ${opp.short}</div>
      <p class="muted">부상으로 결장… 구단주석에서 지켜본다.</p><div style="margin-top:14px"><button class="btn" data-a="go">경기 결과 보기</button></div></div>`,
    { go: () => startMatch('normal', true, true) }, { center: true });
    return;
  }
  show(`<div class="card sitcard">
      <h3>${final ? '🏆 한국시리즈 최종전' : monthLabel(C.week) + ' · 주말 홈경기'}</h3>
      <div class="big"><span style="color:#e5484d">애플즈</span> vs <span style="color:${opp.color}">${opp.short}</span></div>
      <p class="small muted">상대 타선 ${opp.off} / 투수진 ${opp.pit} · 우리 타선 ${Math.round(teamOff())} / 투수진 ${Math.round(teamPit())}</p>
      <div class="howto" style="margin:12px 0;text-align:left">
        상대 선발 <b>${ace.name}</b> · 최고 ${ace.velo}km/h · 주무기 ${mixNames.slice(0, 2).join(', ')}<br>
        나: <b>4번 타자 겸 선발 투수</b> (투구 ${C.st.pstam >= 50 ? 3 : 2}이닝 장면 · 타석 4번)<br>
        ${ump ? '⚖️ 오늘의 주심: <b>정세아</b> 심판' : ''}
      </div>
      <h3 style="text-align:left">팀 작전</h3>
      <div class="stack">${Object.entries(TACTICS).map(([k, t]) => `<button class="btn sub" data-a="tac" data-v="${k}">${t.name}<small>${t.desc}</small></button>`).join('')}</div>
    </div>`,
  { tac: v => chooseMode(v) }, { center: true });
}
function chooseMode(tac) {
  show(`<div class="card sitcard"><h2>진행 방식</h2><p class="muted small" style="margin:6px 0 14px">직접: 타격·투구·도루를 모두 직접! 자동: 능력치로 계산.</p>
    <div class="stack"><button class="btn" data-a="m" data-v="play">⚾ 직접 플레이</button><button class="btn sub" data-a="m" data-v="auto">⏩ 결과만 보기</button></div></div>`,
  { m: v => startMatch(tac, false, v === 'auto') }, { center: true });
}

async function startMatch(tac, benched, auto) {
  const final = C.week > WEEKS;
  const opp = team(final ? C.finalOpp : C.schedule[C.week - 1]);
  const T = TACTICS[tac];
  const lUs = 4.0 * (teamOff() / opp.pit) * T.us;
  const starter = benched ? teamPit() : myPitRating();
  const lStart = 4.2 * (opp.off / starter) * T.them, lPen = 4.2 * (opp.off / teamPit()) * T.them;
  const pInn = benched ? [] : (C.st.pstam >= 50 ? [1, 4, 7] : [1, 4]);
  const lastStarterInn = C.st.pstam >= 50 ? 7 : 6;
  G = {
    opp, tac, auto, benched, final,
    them: Array.from({ length: 9 }, (_, i) => poisson((i < lastStarterInn ? lStart : lPen) / 9)),
    usOther: Array.from({ length: 9 }, () => poisson(lUs * 0.8 / 9)),
    line: { us: Array(9).fill(null), them: Array(9).fill(null) }, score: { us: 0, them: 0 },
    pInn: pInn.slice(), bInn: benched ? [] : [1, 4, 6, 8],
    inn: 1, half: 'top', my: { pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, d2: 0, d3: 0, sb: 0, cs: 0, far: 0, log: [] },
    mp: { outs: 0, k: 0, bb: 0, h: 0, er: 0, scenes: 0 }, log: [], cond: C.st.cond,
  };
  // 응원 보너스
  if (!benched) {
    const best = GIRL_KEYS.filter(k => C.girls[k].met).sort((a, b) => C.girls[b].aff - C.girls[a].aff)[0];
    if (best && C.girls[best].aff >= 50 && Math.random() < C.girls[best].aff / 140) {
      G.cond = clamp(G.cond + 1, 0, 4);
      await playVN([{ bg: GIRLS[best].bg }, { who: best, mood: 'happy', text: pick(['오늘 응원하러 왔어요! 힘내요!', '관중석에서 보고 있을게요. …잘해요.', '홈런 치면 오늘 저녁은 제가 쏠게요!']) },
        { narr: `${GIRLS[best].name}의 응원! 이번 경기 컨디션 UP` }]);
    }
  }
  proceed();
}

function linescore(curInn) {
  const head = Array.from({ length: 9 }, (_, i) => `<th>${i + 1}</th>`).join('');
  const row = (nm, arr, total) => `<tr><td>${nm}</td>${arr.map((v, i) => `<td class="${i + 1 === curInn ? 'cur' : ''}">${v == null ? '' : v}</td>`).join('')}<td class="r">${total}</td></tr>`;
  return `<table class="linescore"><tr><th></th>${head}<th>R</th></tr>${row(G.opp.short, G.line.them, G.score.them)}${row('애플즈', G.line.us, G.score.us)}</table>`;
}
function addThem(i, r) { G.line.them[i] = (G.line.them[i] || 0) + r; G.score.them += r; if (r) G.log.push(`${i + 1}회초 ${G.opp.short} ${r}점`); }
function addUs(i, r) { G.line.us[i] = (G.line.us[i] || 0) + r; G.score.us += r; if (r) G.log.push(`${i + 1}회말 애플즈 ${r}점`); }

function proceed() {
  while (G.inn <= 9) {
    const i = G.inn - 1;
    if (G.half === 'top') {
      if (G.pInn[0] === G.inn) { G.pInn.shift(); return presentPitch(); }
      if (G.line.them[i] == null) addThem(i, G.them[i]);
      G.half = 'bot';
    }
    if (G.inn === 9 && G.score.us > G.score.them) { G.line.us[i] = 'X'; break; }
    if (G.bInn[0] === G.inn) { G.bInn.shift(); return presentAB(); }
    if (G.line.us[i] == null) {
      addUs(i, G.usOther[i]);
      if (G.inn === 9 && G.score.us > G.score.them) break;
    }
    G.inn++; G.half = 'top';
  }
  endMatch();
}
function randSit(crisis) {
  const outs = Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2;
  const p = crisis ? [0.45, 0.32, 0.2] : [0.33, 0.24, 0.16];
  return { outs, bases: p.map(x => (Math.random() < x ? 1 : 0)) };
}
function sitText(inn, half, sit) {
  const runners = sit.bases.reduce((a, b) => a + b, 0);
  const baseTxt = runners === 0 ? '주자 없음' : runners === 3 ? '만루' : ['1', '2', '3'].filter((_, j) => sit.bases[j]).join(',') + '루';
  return `${inn}회${half} ${sit.outs}사 ${baseTxt}`;
}
function scoreTxt() { const d = G.score.us - G.score.them; return d > 0 ? `${d}점 앞섬` : d < 0 ? `${-d}점 뒤짐` : '동점'; }

// 투구 장면
function presentPitch() {
  const inn = G.inn, opp = G.opp;
  const sit = randSit(inn >= 4);
  const batter = { name: pick(OPP_BATTERS), contact: clamp(opp.off + ri(-6, 10), 30, 80), power: clamp(opp.off + ri(-10, 12), 30, 85), eye: ri(35, 65), speed: ri(35, 70), color: opp.color };
  show(`<div class="card sitcard"><h3>${monthLabel(C.week)} · vs ${opp.short}</h3>${linescore(inn)}
    <div class="big">⚾ ${sitText(inn, '초', sit)}</div><div>${scoreTxt()} · <b>마운드: ${C.name}</b></div>
    <p class="small muted" style="margin:6px 0 14px">상대 타자 ${batter.name} (컨택 ${batter.contact} · 파워 ${batter.power})</p>
    <button class="btn" data-a="go">🔥 마운드로</button></div>`,
  { go: () => playPitch(inn, sit, batter) }, { center: true });
}
function playPitch(inn, sit, batter) {
  const st = C.st;
  const fatigue = G.mp.scenes * (1 - st.pstam / 120) * 3;
  const me = { velo: Math.round(st.velo - fatigue + (G.cond - 2)), control: clamp(st.control + (G.cond - 2) * 4 - fatigue * 2, 5, 100), breaking: st.breaking, reps: reps() };
  const finish = res => afterPitch(res, inn, sit);
  if (G.auto) return finish(autoPitch(me, batter, sit));
  hideScreen(); $hud.classList.remove('hidden');
  Engine.pitchAB({
    pitcher: me, batter,
    sit: { inningLabel: `${inn}회초`, scoreLabel: `애플즈 : ${G.opp.short}`, scoreText: `${G.score.us} : ${G.score.them}`, outs: sit.outs, bases: sit.bases },
    onEnd: res => { $hud.classList.add('hidden'); finish(res); },
  });
}
function autoPitch(me, bt, sit) {
  const q = (me.velo - 140) / 20 + me.control / 120 + me.breaking / 150;
  const pK = clamp(0.14 + q * 0.12, 0.08, 0.4), pBB = clamp(0.12 - me.control / 1000, 0.03, 0.12);
  const pH = clamp(0.27 + bt.contact / 500 - q * 0.08, 0.12, 0.38);
  const r = Math.random(), runners = sit.bases.reduce((a, b) => a + b, 0);
  if (r < pK) return { kind: 'k', text: '삼진', outs: sit.outs + 1, rbi: 0, hit: false };
  if (r < pK + pBB) return { kind: 'bb', text: '볼넷', outs: sit.outs, rbi: sit.bases.every(Boolean) ? 1 : 0 };
  if (r < pK + pBB + pH) {
    if (Math.random() < 0.05 + bt.power / 900) return { kind: 'hr', text: '홈런', outs: sit.outs, rbi: runners + 1, hit: true };
    return { kind: 'hit', text: '안타', outs: sit.outs, rbi: sit.bases[2] + (Math.random() < 0.5 ? sit.bases[1] : 0), hit: true };
  }
  return { kind: 'out', text: '범타', outs: sit.outs + 1, rbi: 0 };
}
async function afterPitch(res, inn, sit) {
  const i = inn - 1, mp = G.mp;
  mp.scenes++;
  const recorded = Math.max(0, (res.outs || 0) - sit.outs);
  mp.outs += recorded;
  if (res.kind === 'k') mp.k++;
  if (res.kind === 'bb') mp.bb++;
  if (res.hit) mp.h++;
  const runs = (res.rbi || 0) + (res.runs || 0);
  mp.er += runs;
  G.log.push(`${inn}회초 ${C.name} 투구: ${res.text}${runs ? ` (${runs}실점)` : ''}`);
  // 남은 아웃카운트는 시뮬레이션
  let rest = 0;
  if (res.outs < 3) { rest = Math.random() < 0.25 + (3 - res.outs) * 0.05 ? poisson(0.6) : 0; mp.outs += 3 - res.outs; mp.er += rest; }
  addThem(i, runs + rest);
  G.line.them[i] = G.line.them[i] || 0;
  G.half = 'bot';
  proceed();
}

// 타격 장면
function presentAB() {
  const inn = G.inn;
  const sit = randSit(false);
  const d = G.score.us - G.score.them, runners = sit.bases.reduce((a, b) => a + b, 0);
  let chance = '';
  if (inn >= 7 && d <= 0 && d + runners + 1 > 0) chance = inn === 9 ? '🔥 끝내기 찬스!' : '🔥 역전 찬스!';
  else if (runners >= 2) chance = '득점 찬스!';
  const canBunt = sit.outs < 2 && (sit.bases[0] || sit.bases[1]) && !sit.bases[2];
  const canHR = sit.outs < 2 && sit.bases[0] && !sit.bases[1];
  const pitcher = oppPitcher(G.opp, inn);
  show(`<div class="card sitcard"><h3>${monthLabel(C.week)} · vs ${G.opp.short}</h3>${linescore(inn)}
      <div class="big">🏏 ${sitText(inn, '말', sit)}</div>
      <div>${scoreTxt()} ${chance ? `<span class="chance">${chance}</span>` : ''}</div>
      <p class="small muted" style="margin:6px 0 14px">4번 타자 ${C.name} · 마운드: ${pitcher.name} · ${G.my.log.length ? '오늘 ' + G.my.log.join(', ') : '첫 타석'}</p>
      <div class="stack"><button class="btn" data-a="t" data-v="normal">💥 강공</button>
        ${canBunt ? '<button class="btn sub" data-a="t" data-v="bunt">🤏 희생번트<small>공에 갖다 대기만 하면 OK</small></button>' : ''}
        ${canHR ? '<button class="btn sub" data-a="t" data-v="hitrun">🏃 히트앤런<small>안타 시 1루 주자 3루까지 · 병살 없음</small></button>' : ''}</div>
      ${G.log.length ? `<div class="log" style="margin-top:12px;text-align:left">${G.log.slice(-4).join('<br>')}</div>` : ''}
    </div>`,
  { t: v => playAB(v, sit, pitcher, inn) }, { center: true });
}
function playAB(tactic, sit, pitcher, inn) {
  const st = C.st;
  const batter = { meet: st.meet, power: st.power, eye: st.eye, speed: st.speed, cond: G.cond };
  const finish = res => afterAB(res, inn, sit);
  if (G.auto) return finish(autoAB(batter, sit, tactic));
  hideScreen(); $hud.classList.remove('hidden');
  Engine.atBat({
    batter, pitcher, tactic,
    sit: { inningLabel: `${inn}회말`, scoreLabel: `애플즈 : ${G.opp.short}`, scoreText: `${G.score.us} : ${G.score.them}`, outs: sit.outs, bases: sit.bases },
    onEnd: res => { $hud.classList.add('hidden'); finish(res); },
  });
}
function autoAB(b, sit, tactic) {
  const c = (b.cond - 2) * 0.012;
  const pBB = 0.05 + b.eye * 0.0011, pK = clamp(0.27 - b.meet * 0.0013 - b.eye * 0.0006, 0.08, 0.3), pH = 0.16 + b.meet * 0.002 + c;
  const bs = sit.bases, runners = bs.reduce((a, x) => a + x, 0), r = Math.random();
  if (tactic === 'bunt') return { kind: 'out', text: '희생번트', sac: true, ab: false, rbi: 0, outs: sit.outs + 1, bases: [0, bs[0], bs[1] || bs[2]] };
  if (r < pBB) return { kind: 'bb', text: '볼넷', ab: false, rbi: bs.every(Boolean) ? 1 : 0, outs: sit.outs, bases: [1, bs[0] || bs[1], bs[2] || (bs[0] && bs[1]) ? 1 : 0] };
  if (r < pBB + pK) return { kind: 'k', text: '삼진', ab: true, rbi: 0, outs: sit.outs + 1, bases: bs };
  if (r < pBB + pK + pH) {
    const x = Math.random(), pHR = 0.03 + b.power * 0.003;
    if (x < pHR) return { kind: 'hr', text: '홈런', ab: true, hit: true, rbi: runners + 1, outs: sit.outs, dist: ri(100, 100 + b.power / 2), bases: [0, 0, 0] };
    if (x < pHR + 0.02 + b.speed * 0.0003) return { kind: 'hit', text: '3루타', nb: 3, ab: true, hit: true, rbi: runners, outs: sit.outs, bases: [0, 0, 1] };
    if (x < pHR + 0.2) return { kind: 'hit', text: '2루타', nb: 2, ab: true, hit: true, rbi: bs[1] + bs[2], outs: sit.outs, bases: [0, 1, bs[0]] };
    return { kind: 'hit', text: '안타', nb: 1, ab: true, hit: true, rbi: bs[2], outs: sit.outs, bases: [1, bs[0], bs[1]] };
  }
  if (bs[2] && sit.outs < 2 && Math.random() < 0.35) return { kind: 'out', text: '희생플라이', sac: true, ab: false, rbi: 1, outs: sit.outs + 1, bases: [bs[0], bs[1], 0] };
  return { kind: 'out', text: pick(['땅볼 아웃', '플라이 아웃', '라인드라이브 아웃']), ab: true, rbi: 0, outs: sit.outs + 1, bases: bs };
}
async function afterAB(res, inn, sit) {
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
  addUs(i, runs);
  if (G.auto) G.log.push(`${inn}회말 ${C.name}: ${res.text}${res.rbi ? ` ${res.rbi}타점` : ''}`);
  if (inn === 9 && G.score.us > G.score.them) return walkoff(res);
  // 도루 기회: 내가 1루에 있고 2루가 비었을 때
  const onFirst = (res.kind === 'bb' || (res.kind === 'hit' && (res.nb === 1 || !res.nb))) && res.outs < 3;
  let bonus = 0;
  if (onFirst && res.bases && !res.bases[1]) {
    const ok = await stealChance();
    if (ok === true) { m.sb++; bonus = Math.random() < 0.45 ? 1 : 0; }
    else if (ok === false) { m.cs++; }
  }
  const others = res.outs >= 3 ? 0 : G.usOther[i] + bonus;
  addUs(i, others);
  G.line.us[i] = G.line.us[i] || 0;
  if (inn === 9 && G.score.us > G.score.them) return walkoff(null);
  G.inn++; G.half = 'top';
  proceed();
}
async function walkoff(res) {
  G.walkoff = true; G.walkoffMe = !!res;
  if (!G.auto && res) { Engine.showMsg('끝내기!!', '#ffd54a', `${C.name} 끝내기 ${res.text}!`); Engine.sfx.cheer(3, 0.45); await sleep(1800); }
  endMatch();
}

// 도루 미니게임: 투수가 투구 동작에 들어가는 순간(초록불) 터치
function stealChance() {
  if (G.auto) {
    if (C.st.speed < 55 || Math.random() < 0.4) return Promise.resolve(null);
    return Promise.resolve(Math.random() < 0.3 + C.st.speed * 0.006);
  }
  return new Promise(resolve => {
    show(`<div class="card sitcard"><h2>🏃 1루 출루! 도루할까?</h2>
      <p class="muted small" style="margin:6px 0 14px">주력 ${C.st.speed} · 도루 ${G.my.sb + C.stats.sb}개</p>
      <div class="stack"><button class="btn" data-a="go">🏃 도루 시도!</button><button class="btn ghost" data-a="no">가만히 있기</button></div></div>`,
    { no: () => resolve(null), go: () => stealGame(resolve) }, { center: true });
  });
}
function stealGame(resolve) {
  show(`<div class="card sitcard steal"><h2 id="stTitle">리드 중…</h2>
    <div class="light" id="stLight"></div>
    <p class="muted small">투수가 <b>투구 동작</b>에 들어가 불이 <b style="color:#4ade80">초록색</b>이 되는 순간 터치!<br>빨간불에 뛰면 견제사!</p>
    <button class="btn" data-a="run" style="margin-top:12px;padding:26px">🏃 뛰어!</button></div>`, {
    run: () => {
      if (done) return;
      done = true; clearTimeout(tm);
      const now = performance.now();
      const st = C.st;
      let ok, txt;
      if (!green) { ok = Math.random() < 0.15; txt = ok ? '견제를 뚫었다!' : '견제사…'; }
      else {
        const react = (now - greenAt) / 1000;
        const p = clamp(0.3 + st.speed * 0.0065 + (0.45 - react) * 0.9, 0.05, 0.97);
        ok = Math.random() < p;
        txt = `반응 ${react.toFixed(2)}초 · 성공 확률 ${Math.round(p * 100)}%`;
      }
      Engine.sfx[ok ? 'ding' : 'groan']();
      show(`<div class="card sitcard"><div class="big">${ok ? '🏃💨 도루 성공!' : '😵 도루 실패'}</div><p class="muted">${txt}</p>
        <button class="btn" data-a="ok" style="margin-top:12px">계속</button></div>`, { ok: () => resolve(ok) }, { center: true });
    },
  }, { center: true });
  let green = false, greenAt = 0, done = false;
  const light = document.getElementById('stLight');
  const tm = setTimeout(() => {
    green = true; greenAt = performance.now();
    light.classList.add('go');
    document.getElementById('stTitle').textContent = '지금!!';
  }, 1000 + Math.random() * 2200);
}

async function endMatch() {
  for (let i = 0; i < 9; i++) { if (G.line.them[i] == null) G.line.them[i] = 0; if (G.line.us[i] == null) G.line.us[i] = G.inn > i + 1 ? 0 : 'X'; }
  Engine.idle();
  const st = C.st, m = G.my, s = C.stats, mp = G.mp, ps = C.pstats;
  const win = G.score.us > G.score.them, lose = G.score.us < G.score.them;
  const res = win ? 'W' : lose ? 'L' : 'D';
  const sd = C.stand;
  if (!G.final) {
    if (win) { sd.APL.w++; sd[G.opp.id].l++; } else if (lose) { sd.APL.l++; sd[G.opp.id].w++; } else { sd.APL.d++; sd[G.opp.id].d++; }
    simOtherGames();
  }
  if (!G.benched) {
    s.g++;
    for (const k of ['pa', 'ab', 'h', 'hr', 'rbi', 'bb', 'k', 'd2', 'd3', 'sb', 'cs']) s[k] += m[k];
    s.far = Math.max(s.far, m.far);
    ps.outs += mp.outs; ps.k += mp.k; ps.bb += mp.bb; ps.h += mp.h; ps.er += mp.er;
    if (win) ps.w++; else if (lose) ps.l++;
  }
  // 성장 & 컨디션
  let fame = 0;
  if (!G.benched) {
    fame = m.h + m.hr * 3 + m.sb + mp.k + (win ? 1 : 0) + (G.walkoffMe ? 5 : 0);
    st.stamina = clamp(st.stamina - 12 - mp.scenes * 3, 0, 100);
    if (m.h >= 2 || m.hr || (mp.er === 0 && mp.scenes)) st.cond = clamp(st.cond + 1, 0, 4);
    else if (m.h === 0 && Math.random() < 0.5) st.cond = clamp(st.cond - 1, 0, 4);
  } else st.stamina = clamp(st.stamina + 30, 0, 100);
  st.fame = clamp(st.fame + fame, 0, 100);
  st.morale = clamp(st.morale + (win ? 3 : lose ? -2 : 0), 0, 100);
  if (C.injury > 0) C.injury--;
  C.results.push(res);
  // 구단 재무
  const cl = C.club, tk = TICKETS[cl.ticket];
  const winPct = (sd.APL.w + 1) / (sd.APL.w + sd.APL.l + 2);
  const att = Math.round(Math.min(capacity(), cl.fans * 10000 * 0.11 * tk.demand * (0.7 + winPct * 0.6) * (1 + st.fame / 250) * rand(0.92, 1.08)));
  const rev = att * tk.price / 10000 + cl.fans * 0.03 + 0.6 + st.fame / 150;
  const salary = cl.signed.reduce((a, id) => a + FAS.find(f => f.id === id).salary, 0);
  const cost = 1.9 + salary + Object.values(cl.fac).reduce((a, b) => a + b, 0) * 0.08;
  cl.money += rev - cost;
  cl.fans = Math.round((cl.fans + (win ? 0.25 : 0.05) + m.hr * 0.12 + mp.k * 0.02 + (G.walkoffMe ? 0.4 : 0)) * (1 + cl.fac.screen * 0.015) * 100) / 100;
  cl.last = { att, rev, cost };

  const line = G.benched ? '부상으로 결장' : `타격 ${m.ab}타수 ${m.h}안타${m.hr ? ` ${m.hr}홈런` : ''} ${m.rbi}타점${m.sb ? ` ${m.sb}도루` : ''}<br>투구 ${Math.floor(mp.outs / 3)}${mp.outs % 3 ? '.' + (mp.outs % 3) : ''}이닝 ${mp.er}실점 ${mp.k}탈삼진`;
  const title = win ? (G.walkoff ? '🎉 끝내기 승리!' : '🎉 승리!') : lose ? '😢 패배' : '🤝 무승부';
  if (win) Engine.sfx.cheer(2, 0.3);
  show(`<div class="card sitcard">
      <h3>${monthLabel(C.week)} · 경기 종료</h3><div class="big">${title}</div>
      <div style="font-size:28px;font-weight:900">애플즈 ${G.score.us} : ${G.score.them} ${G.opp.short}</div>
      ${linescore(0)}
      <div class="howto" style="text-align:left"><b>${C.name}</b><br>${line}</div>
      <div class="howto small" style="text-align:left;margin-top:8px">🏦 관중 ${fmt(att)}명 · 수입 ${eok(rev)}억 · 지출 ${eok(cost)}억 → <b class="${rev - cost >= 0 ? 'gain' : 'loss'}">${rev - cost >= 0 ? '+' : ''}${eok(rev - cost)}억</b> · 팬덤 ${eok(cl.fans)}만</div>
      ${G.benched ? '' : `<p class="small" style="margin:8px 0">인기 <span class="gain">+${fame}</span></p>`}
      <div style="margin-top:10px"><button class="btn" data-a="next">${G.final ? '시즌 결산' : '다음 주로'}</button></div>
    </div>`,
  { next: () => (G.final ? finishFinal() : nextWeek()) }, { center: true });
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
    C.finalOpp = opp.id;
    await playVN([{ bg: 'linear-gradient(180deg,#1b2a55,#e5484d)' },
      { who: 'coach', mood: 'smile', text: `정규시즌 ${rank}위. 한국시리즈입니다, 구단주님.` },
      { who: 'coach', mood: 'normal', text: `상대는 ${opp.short}. 단판 승부… 마운드도, 4번도 구단주님께 맡기겠습니다.` }]);
    C.slot = 3;
    save();
    preMatch();
    return;
  }
  awards();
}
function finishFinal() { C.champion = C.results[C.results.length - 1] === 'W'; awards(); }

async function awards() {
  const s = C.stats, p = C.pstats;
  const a = s.ab ? s.h / s.ab : 0;
  const L = { hr: ri(7, 10), avg: rand(0.318, 0.345), sb: ri(8, 12), w: ri(9, 12), k: ri(30, 40) };
  const list = [];
  if (C.champion) list.push('🏆 한국시리즈 우승!');
  else if (C.finalOpp) list.push('🥈 한국시리즈 준우승');
  if (s.hr >= L.hr) list.push(`👑 홈런왕 (${s.hr}개)`);
  if (s.ab >= 45 && a >= L.avg) list.push(`🎯 타격왕 (${avg(s.h, s.ab)})`);
  if (s.sb >= L.sb) list.push(`🏃 도루왕 (${s.sb}개)`);
  if (p.w >= L.w) list.push(`⚾ 다승왕 (${p.w}승)`);
  if (p.k >= L.k) list.push(`🔥 탈삼진왕 (${p.k}개)`);
  if (list.filter(x => /왕/.test(x)).length >= 2) list.push('🌟 시즌 MVP — 진짜 투타겸업 괴물!');
  const ownerOK = C.rank <= 3 && C.club.money >= 30;
  C.awards = list; C.ownerOK = ownerOK;
  save();
  show(`<div class="card"><h2 style="text-align:center">시즌 종료</h2>
    <p class="muted small" style="text-align:center;margin:6px 0">정규시즌 ${C.rank}위 · 구단 자금 ${eok(C.club.money)}억 · 팬덤 ${eok(C.club.fans)}만</p>
    <div class="stats">
      <div class="stat"><div class="k">타율</div><div class="v">${avg(s.h, s.ab)}</div></div>
      <div class="stat"><div class="k">홈런 / 타점</div><div class="v">${s.hr} / ${s.rbi}</div></div>
      <div class="stat"><div class="k">도루</div><div class="v">${s.sb}</div></div>
      <div class="stat"><div class="k">투수 성적</div><div class="v">${p.w}승 ${p.l}패</div></div>
      <div class="stat"><div class="k">평균자책</div><div class="v">${era()}</div></div>
      <div class="stat"><div class="k">탈삼진</div><div class="v">${p.k}</div></div>
    </div>
    <h3>수상</h3><div class="howto">${list.length ? list.join('<br>') : '수상 없음… 내년을 기약하자.'}</div>
    <h3 style="margin-top:12px">구단주 평가</h3><div class="howto">${ownerOK ? '✅ 아버지의 조건 달성! 애플즈는 계속 내 손에.' : '❌ 조건 미달성… 애플즈 매각 위기!'}</div>
    ${standTable()}
    <div style="margin-top:14px"><button class="btn pink" data-a="go">💗 그리고…</button></div></div>`,
  { go: ending }, { center: true });
}

async function ending() {
  hideScreen();
  await playVN([{ bg: 'linear-gradient(180deg,#141828,#3b2f2a)' },
    ...(C.ownerOK ? [{ who: 'chairman', mood: 'smile', text: `…잘했다, ${C.name}. 애플즈는 이제 네 구단이다. 진짜로.` }]
      : [{ who: 'chairman', mood: 'angry', text: '약속은 약속이다. 애플즈는 매각한다.' }, { narr: '…하지만 선수로서의 {name}은 아직 끝나지 않았다.' }])]);
  const ranked = GIRL_KEYS.filter(k => C.girls[k].met).sort((a, b) => C.girls[b].aff - C.girls[a].aff);
  const best = ranked[0], g = best && C.girls[best];
  const cond = { yuna: C.st.fame >= 50, jiwoo: C.st.eye >= 55, harin: C.club.fans >= 14, sea: C.seaFoul === 0, somi: true };
  const hint = { yuna: '인기 50 이상', jiwoo: '선구안 55 이상', harin: '팬덤 14만 이상', sea: '공정한 태도', somi: '' };
  if (g && g.aff >= 80 && cond[best]) {
    await playVN(S.ending[best]);
    await VN.titleCard(`♥ ${GIRLS[best].name} 엔딩 ♥`, `${C.ownerOK ? '구단주 겸 선수' : '선수'} ${C.name}의 다음 시즌이 시작된다`, GIRLS[best].bg);
  } else if (g && g.aff >= 50) {
    await playVN([{ bg: GIRLS[best].bg }, { who: best, mood: 'smile', text: `시즌 수고했어요, ${C.name} 씨. 다음 시즌에도… 응원할게요.` },
      { narr: `${GIRLS[best].name}와(과)는 소중한 사이로 남았다.${g.aff >= 80 && hint[best] ? ` (고백 조건: ${hint[best]})` : ''}` }]);
    await VN.titleCard('우정 엔딩', `${GIRLS[best].name}와(과) 좋은 사이로`, 'linear-gradient(180deg,#1b2a55,#3a4f8a)');
  } else {
    await playVN([{ bg: 'linear-gradient(180deg,#1b2a55,#3a4f8a)' }, { who: 'coach', mood: 'smile', text: `구단주님은 정말 야구밖에 모르시는군요. …나쁘지 않습니다.` }]);
    await VN.titleCard('야구가 연인 엔딩', '배트와 글러브와 함께한 청춘', 'linear-gradient(180deg,#0b1530,#1b2a55)');
  }
  C.over = true;
  clearSave();
  onExit && onExit();
}

// ---------- 공개 API ----------
window.Game = {
  hasSave,
  start(name, exitCb) { onExit = exitCb; newGame(name || '강태양'); save(); startWeek(); },
  resume(exitCb) {
    onExit = exitCb; C = load(); if (!C) return false;
    World.setState(C.world);
    if (C.week > WEEKS) { preMatch(); return true; }
    startWeek(); return true;
  },
  _debug: { get C() { return C; }, get G() { return G; }, openLoc, enterWorld, stealChance },
};
})();
