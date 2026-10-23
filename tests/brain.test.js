// 실행: node tests/brain.test.js
const assert = require('assert');
require('../js/data.js');
require('../js/world.js');
const { NpcBrain, analyze, josa, converse } = require('../js/brain.js');
const { NPCS, ITEMS } = globalThis.GameData;
const World = globalThis.World;

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.error('✗ ' + name + '\n  ' + e.message); process.exitCode = 1; }
}

function makeCtx(brains, extra) {
  const inv = { apple: 0, ore: 0, flower: 0, fish: 0, letter: 0, pie: 0 };
  let coins = 5;
  const notes = [];
  const ctx = Object.assign({
    day: 1, now: 1000, period: 'day', periodName: '낮', clock: '오후 2시', weather: '햇살 좋은',
    sleeping: false, flags: {}, news: null, brains,
    inv: {
      count: k => inv[k] || 0, add: (k, n) => { inv[k] = (inv[k] || 0) + n; },
      remove: (k, n) => { inv[k] -= n; }, coins: () => coins, addCoins: n => { coins += n; },
    },
    notify: t => notes.push(t), setFollow: id => { ctx.following = id; },
  }, extra || {});
  ctx._inv = inv; ctx._coins = () => coins; ctx._notes = notes;
  return ctx;
}
function brains() {
  const b = {};
  NPCS.forEach(p => { b[p.id] = new NpcBrain(p); });
  return b;
}

test('조사 처리', () => {
  assert.strictEqual(josa('철민[이/가] 왔다'), '철민이 왔다');
  assert.strictEqual(josa('미나[이/가] 왔다'), '미나가 왔다');
  assert.strictEqual(josa('철민[아/야]'), '철민아');
  assert.strictEqual(josa('"바보야"[이라고/라고]'), '"바보야"라고');
});

test('의도 분석', () => {
  const cases = [
    ['안녕하세요!', 'greet'], ['넌 누구야?', 'ask_name'], ['내 이름은 철민이야', 'tell_name'],
    ['내 이름 기억해?', 'mem_name'], ['나 사과 좋아해', 'tell_like'], ['뭐 좋아해?', 'ask_like'],
    ['너 정말 멋지다', 'compliment'], ['바보야', 'insult'], ['미안해', 'sorry'], ['사과할게', 'sorry'],
    ['부탁할 거 있어?', 'quest'], ['생선 살게요', 'buy'], ['사과 팔게요', 'sell'], ['선물이야', 'give'],
    ['고마워', 'thanks'], ['잘 가', 'bye'], ['몇 살이야?', 'age'], ['요즘 소문 있어?', 'rumor'],
    ['철수는 어때?', 'about_npc'], ['사과 좋아해?', 'item_talk'], ['날씨 좋다', 'weather'],
    ['너 사랑해', 'love'], ['나 생선 싫어', 'tell_dislike'], ['너 싫어', 'insult'], ['뭐 하고 있어?', 'doing'],
    ['안 예쁘다', 'insult'], ['미나 예쁘지?', 'about_npc'], ['제 이름은 김지은입니다', 'tell_name'],
  ];
  for (const [t, want] of cases) assert.strictEqual(analyze(t, 'grandma').intent, want, t);
  assert.strictEqual(analyze('내 이름은 철민이야', 'grandma').name, '철민');
  assert.strictEqual(analyze('제 이름은 김지은입니다', 'grandma').name, '김지은');
  assert.strictEqual(analyze('나 사과 좋아해', 'grandma').like, '사과');
  assert.strictEqual(analyze('내 이름은 토이야', 'grandma').name, '토이');
  assert.strictEqual(analyze('제 이름은 토이에요', 'grandma').name, '토이');
  assert.strictEqual(analyze('내 이름은 미나야', 'grandma').name, '미나');
  assert.strictEqual(analyze('내 이름은 철수다', 'grandma').name, '철수');
});

test('첫 만남에 이름을 묻고 짧은 대답으로 기억한다', () => {
  const b = brains(), ctx = makeCtx(b);
  const g = b.grandma.greet(ctx);
  assert.ok(g.reply.includes('이름이 뭐니'));
  const r = b.grandma.talk('철민', ctx);
  assert.strictEqual(b.grandma.s.memory.playerName, '철민');
  assert.ok(r.reply.includes('철민'), r.reply);
  const r2 = b.grandma.talk('내 이름 기억해?', ctx);
  assert.ok(r2.reply.includes('철민'), r2.reply);
});

test('좋아하는 것 기억', () => {
  const b = brains(), ctx = makeCtx(b);
  b.mina.talk('나는 고양이 좋아해', ctx);
  const r = b.mina.talk('내가 뭘 좋아한다고 했지?', ctx);
  assert.ok(r.reply.includes('고양이'), r.reply);
});

test('칭찬과 욕설은 호감도를 바꾸고 연속 칭찬은 덜 먹힌다', () => {
  const b = brains(), ctx = makeCtx(b);
  const a0 = b.chulsu.s.affinity;
  b.chulsu.talk('정말 멋져요', ctx);
  const a1 = b.chulsu.s.affinity;
  assert.ok(a1 > a0);
  const r = b.chulsu.talk('진짜 최고야', ctx);
  assert.strictEqual(b.chulsu.s.affinity, a1, '연속 칭찬은 호감도 변화 없음');
  assert.ok(r.reply.length > 0);
  b.chulsu.talk('바보', ctx);
  assert.ok(b.chulsu.s.affinity < a1);
  const before = b.chulsu.s.affinity;
  b.chulsu.talk('미안해', ctx);
  assert.ok(b.chulsu.s.affinity > before, '사과하면 용서');
});

test('같은 말 반복 감지', () => {
  const b = brains(), ctx = makeCtx(b);
  b.momo.talk('냥냥', ctx); b.momo.talk('냥냥', ctx);
  const r = b.momo.talk('냥냥', ctx);
  assert.strictEqual(r.intent, 'repeat');
});

test('할머니 사과 퀘스트', () => {
  const b = brains(), ctx = makeCtx(b);
  const offer = b.grandma.talk('도와드릴 일 있어요?', ctx);
  assert.ok(offer.reply.includes('사과 5개'), offer.reply);
  b.grandma.talk('응 할게', ctx);
  assert.strictEqual(b.grandma.s.quest.stage, 'active');
  ctx._inv.apple = 3;
  const remind = b.grandma.talk('부탁 어떻게 됐어?', ctx);
  assert.ok(remind.reply.includes('3/5'), remind.reply);
  ctx._inv.apple = 5;
  const g = b.grandma.receiveGift('apple', ctx);
  assert.strictEqual(b.grandma.s.quest.stage, 'done', g.reply);
  assert.strictEqual(ctx._inv.apple, 0);
  assert.strictEqual(ctx._inv.pie, 1);
  assert.strictEqual(ctx._coins(), 15);
});

test('미나 편지 배달 퀘스트', () => {
  const b = brains(), ctx = makeCtx(b);
  b.mina.talk('부탁 있어요?', ctx);
  b.mina.talk('네 할게요', ctx);
  assert.strictEqual(ctx._inv.letter, 1);
  b.chulsu.receiveGift('letter', ctx);
  assert.strictEqual(b.mina.s.quest.stage, 'delivered');
  assert.ok(ctx.flags.letterDelivered);
  const g = b.mina.greet(ctx);
  assert.strictEqual(b.mina.s.quest.stage, 'done', g.reply);
  assert.strictEqual(ctx._inv.fish, 1);
});

test('미나 상점 거래', () => {
  const b = brains(), ctx = makeCtx(b);
  b.mina.talk('생선 살게요', ctx);
  assert.strictEqual(ctx._inv.fish, 1);
  assert.strictEqual(ctx._coins(), 2);
  b.mina.talk('생선 살게요', ctx);
  assert.strictEqual(ctx._inv.fish, 1, '돈이 모자라면 못 산다');
  ctx._inv.ore = 2;
  b.mina.talk('광석 전부 팔게요', ctx);
  assert.strictEqual(ctx._inv.ore, 0);
  assert.strictEqual(ctx._coins(), 6);
});

test('모모에게 생선을 주면 따라온다', () => {
  const b = brains(), ctx = makeCtx(b);
  b.momo.talk('뭐 필요한 거 있어?', ctx);
  b.momo.talk('그래', ctx);
  ctx._inv.fish = 1;
  b.momo.talk('생선 가져왔어', ctx);
  assert.strictEqual(ctx.following, 'momo');
});

test('NPC끼리 소문이 퍼지고 이름도 전해진다', () => {
  const b = brains(), ctx = makeCtx(b);
  b.mina.talk('내 이름은 지은이야', ctx);
  b.mina.talk('바보 같아', ctx);
  const before = b.chulsu.s.affinity;
  const c = converse(b.mina, b.chulsu, ctx);
  assert.ok(c.gossip);
  assert.ok(c.lines[0][1].includes('지은'), c.lines[0][1]);
  assert.ok(b.chulsu.s.affinity < before);
  assert.strictEqual(b.chulsu.s.memory.playerName, '지은');
  const g = b.chulsu.greet(ctx);
  assert.ok(g.reply.includes('미나'), g.reply);
  // 같은 소문은 두 번 전하지 않는다
  const c2 = converse(b.mina, b.chulsu, ctx);
  assert.ok(!c2.gossip);
});

test('자는 NPC를 두 번 깨우면 화낸다', () => {
  const b = brains(), ctx = makeCtx(b, { sleeping: true });
  b.chulsu.talk('일어나', ctx);
  const r = b.chulsu.talk('일어나라고', ctx);
  assert.ok(r.reply.includes('내일'), r.reply);
});

test('모든 대사 템플릿이 변수 없이 채워진다', () => {
  const b = brains(), ctx = makeCtx(b, { news: '미나와 철수가 이야기했다.' });
  for (const p of NPCS) {
    const br = b[p.id];
    br.s.memory.playerName = '철민'; br.s.memory.playerLikes = ['사과']; br.s.memory.playerDislikes = ['비'];
    const walk = (v, key) => {
      if (typeof v === 'string') {
        const out = br.pick(key, [v], br.vars(ctx, { item: '사과', other: '미나', from: '미나', old: '영희', kw: '구름', detail: '바보', have: 1, n: 3, cost: 3 }));
        assert.ok(!/[{}\[\]]/.test(out), p.id + '.' + key + ': ' + out);
      } else if (Array.isArray(v)) v.forEach(x => walk(typeof x === 'object' && x.q ? x.q : x, key));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, key + '.' + k));
    };
    walk(p.lines, 'lines');
    walk(p.quest, 'quest');
  }
});

test('일정 장소는 걸을 수 있고 서로 이어져 있다', () => {
  const start = [17, 9];
  for (const p of NPCS) {
    for (const [per, t] of Object.entries(p.schedule)) {
      const pt = t === 'home' ? World.buildings.find(bd => bd.id === p.home).front : { x: t[0], y: t[1] };
      assert.ok(World.walkable(pt.x, pt.y), p.id + ' ' + per + ' 막힌 칸');
      assert.ok(World.findPath(start[0], start[1], pt.x, pt.y), p.id + ' ' + per + ' 경로 없음');
    }
  }
});

console.log(passed + '개 테스트 통과' + (process.exitCode ? ' (실패 있음)' : ''));
