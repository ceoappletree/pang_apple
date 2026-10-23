// 타이틀 메뉴 + 빠른 경기(3이닝 타격전)
(() => {
'use strict';

const $screen = document.getElementById('screen');
const $hud = document.getElementById('hud');
const BEST_KEY = 'homerunking_best';

function show(html, handlers) {
  $screen.className = 'screen center';
  $screen.innerHTML = `<div class="wrap">${html}</div>`;
  $screen.onclick = e => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    Engine.audio();
    handlers[el.dataset.a] && handlers[el.dataset.a](el.dataset.v);
  };
}
function hide() { $screen.className = 'screen hidden'; $screen.innerHTML = ''; }
const loadBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch (e) { return 0; } };
const saveBest = v => { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} };

// ---------- 타이틀 ----------
function title() {
  Engine.idle();
  Engine.setPaused(false);
  Engine.setBatterVisible(false);
  if (window.World && World.running) World.stop();
  document.getElementById('whud').classList.add('hidden');
  $hud.classList.add('hidden');
  const best = loadBest();
  const cont = Game.hasSave();
  show(`<div class="card">
      <h1 class="logo">홈런<span>왕</span> ⚾</h1>
      <p class="tagline">재벌 2세 구단주는 4번 타자 겸 에이스<br>야구 · 연애 · 구단 경영 · 오픈월드</p>
      <div class="stack">
        ${cont ? '<button class="btn pink" data-a="resume">▶ 시즌 이어하기</button>' : ''}
        <button class="btn ${cont ? 'sub' : 'pink'}" data-a="career">💗 시즌 모드 (새로 시작)<small>오픈월드 · 투타겸업 · 히로인 5명 · 구단 경영</small></button>
        <button class="btn" data-a="quick">⚾ 빠른 경기<small>3이닝 타격전${best ? ` · 최고 ${best}점` : ''}</small></button>
        <button class="btn ghost" data-a="howto">조작 방법</button>
      </div>
    </div>`, {
    resume: () => { hide(); Game.resume(title); },
    career: () => { if (cont && !confirm('저장된 시즌을 지우고 새로 시작할까요?')) return; nameEntry(); },
    quick: quickStart,
    howto,
  });
}

function howto() {
  show(`<div class="card"><h2>조작 방법</h2>
    <h3 style="margin-top:12px">🏙 도시 (오픈월드)</h3>
    <div class="howto" style="margin-bottom:10px">
      화면 아무 곳이나 <b>드래그</b> = 조이스틱 (PC: WASD/방향키)<br>
      건물 앞 노란 원에서 <b>🚪 버튼</b>으로 들어가기 (PC: E)<br>
      내 슈퍼카 옆에서 <b>🏎 타기</b>, 도시를 질주!<br>
      ❗ 시민에게 말 걸기 · ✨ 황금 야구공 12개 수집<br>
      📋 메뉴: 내 정보 · 인연 · 목적지 화살표 설정
    </div>
    <h3>⚾ 투구</h3>
    <div class="howto" style="margin-bottom:10px">구종 선택 → 던질 곳 <b>터치</b> → 제구 게이지를 <b>초록색</b>에서 터치<br>존 구석·유인구일수록 헛스윙이 늘지만 볼넷 주의!</div>
    <h3>🏏 타격</h3>
    <div class="howto" style="margin-bottom:10px">
      공이 <b>스트라이크 존</b>에 도착하는 순간, 공이 지나갈 <b>위치를 터치</b><br>
      공 살짝 <b>아래</b>를 치면 높이 뜸 (홈런 각도) · <b>위</b>를 치면 땅볼<br>
      빨리 치면 당겨치기, 늦으면 밀어치기 · 존 밖 공은 참기
    </div>
    <h3>🏃 도루</h3>
    <div class="howto" style="margin-bottom:16px">1루 출루 시 도루 시도 → 불이 <b>초록색</b>이 되는 순간 터치! (빨간불에 뛰면 견제사)</div>
    <button class="btn" data-a="back">돌아가기</button></div>`, { back: title });
}

function nameEntry() {
  show(`<div class="card"><h2>구단주 등록</h2>
    <p class="muted small" style="margin:6px 0 14px">애플그룹 회장의 아들, 25세. 서울 애플즈의 구단주이자 4번 타자 겸 에이스 투수, 그리고 도루왕을 노리는 당신의 이름은?</p>
    <input class="name" id="nm" maxlength="8" placeholder="이름 입력" value="강태양">
    <div style="margin-top:14px" class="stack"><button class="btn pink" data-a="ok">시즌 시작</button><button class="btn ghost" data-a="back">돌아가기</button></div></div>`,
  {
    ok: () => { const n = (document.getElementById('nm').value || '').trim() || '강태양'; hide(); Game.start(n, title); },
    back: title,
  });
  setTimeout(() => { const el = document.getElementById('nm'); el && el.select(); }, 50);
}

// ---------- 빠른 경기 ----------
const QUICK_BATTER = { meet: 60, power: 62, eye: 55, speed: 50, cond: 2 };
const QUICK_PITCHERS = [
  { name: '루키 투수', lv: 0.15, velo: 132, ctrl: 0.6, mix: { FB: 0.6, CH: 0.25, CU: 0.15 } },
  { name: '베테랑 투수', lv: 0.6, velo: 141, ctrl: 0.55, mix: { FB: 0.45, CH: 0.2, CU: 0.15, SL: 0.2 } },
  { name: '에이스', lv: 1.0, velo: 149, ctrl: 0.5, mix: { FB: 0.4, SL: 0.25, FK: 0.2, CU: 0.15 } },
];
let Q = null;
function quickStart() {
  hide();
  Q = { inning: 1, outs: 0, bases: [0, 0, 0], runs: 0, hits: 0, hr: 0, k: 0, far: 0 };
  $hud.classList.remove('hidden');
  Engine.showMsg('플레이 볼!', '#ffd54a');
  nextAB(1.3);
}
function nextAB(delay) {
  Engine.atBat({
    batter: QUICK_BATTER, pitcher: QUICK_PITCHERS[Q.inning - 1], delay,
    sit: { inningLabel: Q.inning + '회', scoreLabel: '득점', scoreText: Q.runs, outs: Q.outs, bases: Q.bases },
    onEnd: res => {
      Q.runs += (res.rbi || 0) + (res.runs || 0);
      if (res.hit) Q.hits++;
      if (res.kind === 'hr') { Q.hr++; Q.far = Math.max(Q.far, res.dist || 0); }
      if (res.kind === 'k') Q.k++;
      Q.outs = res.outs; Q.bases = res.bases || Q.bases;
      if (Q.outs >= 3) {
        if (Q.inning >= 3) return quickOver();
        Q.inning++; Q.outs = 0; Q.bases = [0, 0, 0];
        Engine.showMsg(Q.inning + '회', '#ffd54a', `${QUICK_PITCHERS[Q.inning - 1].name} 등판! 공이 더 빨라져요`);
        return nextAB(1.8);
      }
      nextAB(0.3);
    },
  });
}
function quickOver() {
  Engine.idle();
  $hud.classList.add('hidden');
  const best = loadBest();
  const isBest = Q.runs > best;
  if (isBest) saveBest(Q.runs);
  show(`<div class="card" style="text-align:center"><h2>경기 종료</h2>
    ${isBest && Q.runs > 0 ? '<p class="gain">🏆 최고 기록 달성!</p>' : ''}
    <div class="stats">
      <div class="stat big"><div class="k">총 득점</div><div class="v">${Q.runs}</div></div>
      <div class="stat"><div class="k">안타</div><div class="v">${Q.hits}</div></div>
      <div class="stat"><div class="k">홈런</div><div class="v">${Q.hr}</div></div>
      <div class="stat"><div class="k">삼진</div><div class="v">${Q.k}</div></div>
      <div class="stat"><div class="k">최장 비거리</div><div class="v">${Q.far ? Q.far + 'm' : '-'}</div></div>
    </div>
    <div class="stack"><button class="btn" data-a="again">다시 하기</button><button class="btn ghost" data-a="title">타이틀로</button></div>
    <p class="muted small" style="margin-top:10px">최고 기록: ${Math.max(best, Q.runs)}점</p></div>`,
  { again: quickStart, title });
}

// ---------- 음소거 ----------
const muteBtn = document.getElementById('mute');
muteBtn.addEventListener('pointerdown', e => {
  e.stopPropagation();
  Engine.setMuted(!Engine.muted);
  muteBtn.textContent = Engine.muted ? '🔇' : '🔊';
});

title();
})();
