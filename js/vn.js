// 비주얼 노벨 대화 시스템
(() => {
'use strict';

const root = document.getElementById('vn');
const bgEl = root.querySelector('.bg');
const portEl = root.querySelector('.portrait');
const boxEl = root.querySelector('.box');
const textEl = root.querySelector('.text');
const tagEl = root.querySelector('.nametag');
const nextEl = root.querySelector('.next');
const choicesEl = root.querySelector('.choices');

const NAMES = { coach: '김대호 감독', chairman: '강철민 회장 (아버지)' };
let curWho = null, curMood = null;
let tapResolve = null;

root.addEventListener('pointerdown', e => {
  if (e.target.closest('.choices')) return;
  if (tapResolve) { const r = tapResolve; tapResolve = null; r(); }
});
const waitTap = () => new Promise(r => { tapResolve = r; });

function setPortrait(who, mood) {
  if (!who || who === 'narr') { portEl.classList.add('hide'); curWho = null; return; }
  if (who === curWho && mood === curMood) return;
  portEl.innerHTML = Portraits.render(who, mood);
  portEl.classList.remove('hide');
  curWho = who; curMood = mood;
}
function hearts(n) {
  for (let i = 0; i < Math.min(6, Math.ceil(n / 2)); i++) {
    const h = document.createElement('div');
    h.className = 'heart'; h.textContent = n > 0 ? '💗' : '💔';
    h.style.left = (35 + Math.random() * 30) + '%';
    h.style.top = (30 + Math.random() * 20) + '%';
    h.style.animationDelay = (i * 0.12) + 's';
    root.appendChild(h);
    setTimeout(() => h.remove(), 1600 + i * 120);
  }
}

async function say(who, mood, text, ctx) {
  text = fill(text, ctx);
  setPortrait(who, mood);
  if (who && who !== 'narr') {
    tagEl.textContent = NAMES[who] || Story.GIRLS[who].name;
    tagEl.style.background = NAMES[who] ? '#ffd54a' : Story.GIRLS[who].color;
    tagEl.classList.remove('hidden');
  } else tagEl.classList.add('hidden');
  nextEl.style.visibility = 'hidden';
  textEl.textContent = '';
  // 타자기 효과 (탭하면 즉시 완성)
  let skip = false;
  tapResolve = () => { skip = true; };
  for (let i = 0; i < text.length && !skip; i++) {
    textEl.textContent = text.slice(0, i + 1);
    if (i % 3 === 0 && text[i] !== ' ') Engine.sfx.blip();
    await new Promise(r => setTimeout(r, 22));
  }
  textEl.textContent = text;
  tapResolve = null;
  nextEl.style.visibility = 'visible';
  await waitTap();
}

function choose(options) {
  return new Promise(resolve => {
    choicesEl.innerHTML = '';
    nextEl.style.visibility = 'hidden';
    options.forEach(o => {
      const b = document.createElement('button');
      b.textContent = o.text;
      b.addEventListener('click', e => { e.stopPropagation(); choicesEl.innerHTML = ''; resolve(o); });
      choicesEl.appendChild(b);
    });
  });
}

function fill(t, ctx) { return t.replace(/\{name\}/g, ctx.name || '나'); }

async function run(steps, ctx) {
  for (const st of steps) {
    if (st.bg) { bgEl.style.background = st.bg; continue; }
    if (st.fx) { applyFx(st.fx, ctx); continue; }
    if (st.narr) { await say('narr', null, st.narr, ctx); continue; }
    if (st.text) { await say(st.who, st.mood || 'normal', st.text, ctx); continue; }
    if (st.choice) {
      const opts = st.choice.filter(o => !o.if || o.if(ctx));
      const o = await choose(opts);
      if (o.fx) applyFx(o.fx, ctx);
      if (o.pick) o.pick(ctx);
      if (o.then) await run(o.then, ctx);
    }
  }
}
function applyFx(fx, ctx) {
  if (ctx.applyFx) ctx.applyFx(fx);
  const love = Story.GIRL_KEYS.reduce((a, k) => a + (fx[k] || 0), 0);
  if (love) { hearts(love); Engine.sfx[love > 0 ? 'heart' : 'sad'](); }
}

// 장면 분위기에 맞는 배경음악
function sceneTrack(steps) {
  const whos = steps.filter(s => s.who).map(s => s.who);
  if (whos.some(w => Story.GIRLS[w])) return 'romance';
  if (whos.includes('chairman') || steps.some(s => s.bg && /#2a1020|#141828/.test(s.bg))) return 'drama';
  return null;
}
async function play(steps, ctx = {}) {
  const tr = sceneTrack(steps);
  if (window.Music) Music.push(tr);
  root.classList.remove('hidden');
  curWho = null;
  portEl.classList.add('hide');
  choicesEl.innerHTML = '';
  root.querySelectorAll('.title-card').forEach(e => e.remove());
  boxEl.style.display = '';
  await run(steps, ctx);
  root.classList.add('hidden');
  if (window.Music) Music.pop();
}

// 엔딩 등 큰 타이틀 카드
function titleCard(title, sub, bg) {
  if (window.Music) Music.play('ending');
  return new Promise(resolve => {
    root.classList.remove('hidden');
    if (bg) bgEl.style.background = bg;
    portEl.classList.add('hide');
    boxEl.style.display = 'none';
    const el = document.createElement('div');
    el.className = 'title-card';
    el.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    root.appendChild(el);
    setTimeout(() => {
      tapResolve = () => { el.remove(); boxEl.style.display = ''; root.classList.add('hidden'); resolve(); };
    }, 700);
  });
}

window.VN = { play, titleCard };
})();
