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
  Engine.setBatterVisible(false);
  $hud.classList.add('hidden');
  const best = loadBest();
  const cont = Career.hasSave();
  show(`<div class="card">
      <h1 class="logo">홈런<span>왕</span> ⚾</h1>
      <p class="tagline">루키 시즌 · 그라운드 위의 두근두근</p>
      <div class="stack">
        ${cont ? '<button class="btn pink" data-a="resume">▶ 커리어 이어하기</button>' : ''}
        <button class="btn ${cont ? 'sub' : 'pink'}" data-a="career">💗 커리어 모드 (새로 시작)<small>훈련 · 연애 · 리그 24주</small></button>
        <button class="btn" data-a="quick">⚾ 빠른 경기<small>3이닝 타격전${best ? ` · 최고 ${best}점` : ''}</small></button>
        <button class="btn ghost" data-a="howto">타격 방법</button>
      </div>
    </div>`, {
    resume: () => { hide(); Career.resume(title); },
    career: () => { if (cont && !confirm('저장된 커리어를 지우고 새로 시작할까요?')) return; nameEntry(); },
    quick: quickStart,
    howto,
  });
}

function howto() {
  show(`<div class="card"><h2>타격 방법</h2>
    <div class="howto" style="margin:12px 0 16px">
      ⏱ 공이 <b>스트라이크 존</b>(흰 네모)에 도착하는 순간<br>
      👆 공이 지나갈 <b>위치를 터치</b>하면 스윙!<br>
      🎯 정확한 타이밍 + 정확한 위치 = <b>퍼펙트</b><br>
      ⬆️ 공보다 살짝 <b>아래</b>를 치면 타구가 높이 뜹니다 (홈런 각도)<br>
      ⬇️ 공 <b>위</b>를 치면 땅볼이 됩니다<br>
      ↔️ 빨리 치면 <b>당겨치기</b>(좌측), 늦으면 <b>밀어치기</b>(우측)<br>
      🙅 존 밖 공은 참으면 <b>볼</b>, 4개면 볼넷<br><br>
      커리어 모드에서는 <b>미트</b>가 높을수록 맞힐 수 있는 범위가 넓어지고, <b>파워</b>가 높을수록 멀리 날아가요.
      <b>선구안</b>이 45 이상이면 공을 던지는 순간 구종이 보여요.
    </div>
    <button class="btn" data-a="back">돌아가기</button></div>`, { back: title });
}

function nameEntry() {
  show(`<div class="card"><h2>신인 선수 등록</h2>
    <p class="muted small" style="margin:6px 0 14px">서울 애플즈에 입단할 당신의 이름은?</p>
    <input class="name" id="nm" maxlength="8" placeholder="이름 입력" value="김루키">
    <div style="margin-top:14px" class="stack"><button class="btn pink" data-a="ok">입단하기</button><button class="btn ghost" data-a="back">돌아가기</button></div></div>`,
  {
    ok: () => { const n = (document.getElementById('nm').value || '').trim() || '김루키'; hide(); Career.start(n, title); },
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
