// claude.ai 아티팩트로 열었을 때: 페이지 안에서 Claude에게 직접 물어 자연어로 대화한다.
// API 키도 서버도 필요 없고, 보는 사람의 Claude 사용량을 쓴다 (처음 한 번 허용을 묻는다).
// Claude는 대사와 함께 "게임에 반영할 행동"을 JSON으로 돌려주고, 게임은 규칙에 맞는 것만 반영한다.
(function (g) {
  'use strict';
  const D = () => g.GameData;

  const API = {
    sample: null,
    disabled: false,
    ready: null,

    init() {
      if (this.ready) return this.ready;
      const c = g.claude;
      this.ready = (c && typeof c.use === 'function')
        ? c.use('sample').then(s => { this.sample = s; return !!s; }).catch(() => false)
        : Promise.resolve(false);
      return this.ready;
    },
    available() { return !!this.sample && !this.disabled; },

    // 대화 한 번. 실패하면 {code, message}로 reject 된다.
    async talk({ brain, text, ctx, note }, onPartial) {
      const prompt = buildPrompt(brain, text, ctx, note);
      const out = await this.sample.json(prompt, {
        modelTier: 'quick',
        cache: false,
        onText: ({ text: raw }) => {
          const m = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
          if (m && onPartial) { try { onPartial(JSON.parse('"' + m[1] + '"')); } catch (e) { /* 이스케이프 중간 */ } }
        },
      });
      if (!out || typeof out.reply !== 'string' || !out.reply.trim()) throw { code: 'invalid_json', message: 'reply 없음' };
      return applyResult(brain, out, ctx, !!note);
    },

    // 오류 코드를 사람이 읽을 문장으로. 다시는 쓰지 말아야 하는 경우 disabled를 켠다.
    explain(e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
        this.disabled = true;
        return 'Claude 사용이 허용되지 않아 규칙 기반 AI로 대화해요.';
      }
      if (code === 'rate_limited') return 'Claude 사용 한도에 걸렸어요. 잠시 뒤에 다시 말을 걸어 주세요. 이번 대답은 규칙 기반 AI가 했어요.';
      if (code === 'session_expired') return 'claude.ai에 다시 로그인해야 해요. 이번 대답은 규칙 기반 AI가 했어요.';
      if (code === 'cancelled') return '';
      return 'Claude가 대답하지 못해 이번엔 규칙 기반 AI가 대답했어요.';
    },
  };

  function itemName(id) { const it = D().ITEMS[id]; return it ? it.name : id; }
  function idFromName(name) {
    const items = D().ITEMS;
    return Object.keys(items).find(k => k === name || items[k].name === name || items[k].re.test(String(name))) || null;
  }

  function questInfo(brain, ctx) {
    const q = brain.p.quest, st = brain.s.quest.stage;
    if (!q) return '없음';
    const need = Object.entries(q.need).map(([k, n]) => itemName(k) + ' ' + n + '개 (플레이어가 지금 ' + ctx.inv.count(k) + '개 가짐)').join(', ');
    const stage = brain.s.pending === 'quest_offer' && st === 'none'
      ? '방금 네가 이 부탁을 제안했고 플레이어의 대답을 기다리는 중이다. 받아들이면 accept_quest'
      : {
      none: brain.canOffer() ? '아직 제안 안 함. 플레이어가 도울 일을 묻거나 대화 흐름이 맞으면 제안해도 된다' : '아직 제안 안 함. 호감도가 낮아 지금은 부탁하지 않는다',
      active: '진행 중',
      delivered: '플레이어가 이미 배달을 마쳤다. 고마워하며 보상을 줘라 (complete_quest)',
      done: '이미 끝남',
    }[st];
    let s = '"' + q.title + '": ' + q.desc + '. 필요한 것: ' + need + '. 상태: ' + stage + '.';
    if (q.target) s += ' (배달 대상: ' + D().NPCS.find(p => p.id === q.target).short + ')';
    return s;
  }

  function buildPrompt(brain, text, ctx, note) {
    const p = brain.p, L = p.lines;
    const likes = k => p.likes[k].map(itemName).join(', ') || '없음';
    const others = Object.entries(p.opinions).map(([id, v]) => D().NPCS.find(x => x.id === id).short + ': ' + v[0]).join(' / ');
    const invText = Object.keys(D().ITEMS).filter(k => ctx.inv.count(k) > 0).map(k => itemName(k) + ' ' + ctx.inv.count(k)).join(', ') || '빈손';
    const examples = [L.firstMeet[0], (L.greet.normal || [])[0], (L.compliment.normal || [])[0], (L.insult.normal || [])[0]].filter(Boolean).map(s => '- ' + g.NpcBrain.fill(s, brain.vars(ctx))).join('\n');
    const history = brain.s.history.slice(-6).map(h => '플레이어: ' + h.u + '\n' + p.short + ': ' + h.n).join('\n');
    const shop = p.id === 'mina'
      ? '\n상점: 생선을 한 마리 3전에 판다. 사과·꽃은 1전, 광석은 2전에 사들인다. 다른 물건은 안 사고판다.'
      : '\n장사: 너는 물건을 사고팔지 않는다. 그런 요청은 미나 상점으로 안내한다.';

    return [
      '너는 한국어 마을 게임 "사과나무 마을"의 주민 "' + p.name + '"(' + p.role + ')을 연기한다. 플레이어가 한 말에 캐릭터로서 대답하고, 게임에 반영할 행동을 고른다.',
      '',
      '## 캐릭터',
      '성격: ' + p.llm.persona,
      '말투: ' + p.llm.style,
      '말투 예시:\n' + examples,
      '아주 좋아하는 물건: ' + likes('love') + ' / 좋아하는 물건: ' + likes('like') + ' / 싫어하는 물건: ' + likes('dislike'),
      '다른 주민에 대한 생각: ' + others,
      '',
      '## 지금 상황',
      '시간: ' + ctx.day + '일차 ' + ctx.clock + ' (' + ctx.periodName + '), 날씨: ' + ctx.weather + ' 날',
      '플레이어에 대해 기억하는 것:\n' + brain.summary(),
      '플레이어의 가방: ' + invText + ', 동전 ' + ctx.inv.coins() + '전',
      '네 부탁: ' + questInfo(brain, ctx) + shop,
      ctx.news ? '최근 마을 소식: ' + ctx.news : '',
      '',
      history ? '## 최근 대화\n' + history + '\n' : '',
      note ? '## 방금 일어난 일 (게임에 이미 반영됨, actions는 비워라)\n' + note + '\n' : '',
      '## 플레이어가 방금 한 말',
      text,
      '',
      '## 대답 규칙',
      '- reply: 캐릭터 말투의 한국어 대사 1~3문장. 이름표, 따옴표, 괄호 속 해설은 쓰지 않는다 (행동 묘사는 모모처럼 짧게만).',
      '- 게임 사실(가방, 동전, 부탁 상태)과 어긋나는 말을 하지 않는다. 물건이 모자라면 받았다고 하지 않는다.',
      '- 너는 게임 속 주민이다. AI라는 말을 하지 않고, 게임 밖 이야기는 캐릭터답게 넘긴다.',
      '- 무례한 말에는 캐릭터답게 서운해하거나 화내고 호감도를 낮춘다.',
      '',
      '## 출력 (JSON 객체 하나만)',
      '{"reply": "대사", "affinity": 정수 -8~6 (말 때문에 생긴 호감도 변화, 보통 0~2), "mood": 실수 -0.6~0.6 (기분 변화), "actions": [행동들]}',
      '고를 수 있는 행동 (해당할 때만):',
      '- {"type":"learn_name","name":"이름"}: 플레이어가 자기 이름을 밝혔다',
      '- {"type":"learn_like","value":"것"} / {"type":"learn_dislike","value":"것"}: 플레이어가 좋아하는/싫어하는 것을 말했다',
      '- {"type":"offer_quest"}: 네 부탁을 제안한다 (상태가 "아직 제안 안 함"일 때만)',
      '- {"type":"accept_quest"}: 플레이어가 부탁을 받아들였다',
      '- {"type":"complete_quest"}: 플레이어가 부탁한 물건을 건네거나 가져왔고, 가방에 충분히 있다. 또는 배달을 마친 걸 알렸다',
      '- {"type":"take_gift","item":"물건 이름"}: 플레이어가 가방에 있는 물건을 선물로 준다',
      '- {"type":"open_gift"}: 플레이어가 선물을 주고 싶은데 무엇인지 말하지 않았다',
      p.id === 'mina' ? '- {"type":"buy_fish","count":1}: 플레이어가 생선을 산다\n- {"type":"sell","item":"사과|꽃|광석","count":개수 (전부면 -1)}: 플레이어가 물건을 판다' : '',
      '- {"type":"gossip","kind":"insult|compliment","detail":"플레이어가 한 말 짧게"}: 다른 주민에게 소문낼 만큼 무례하거나 다정한 말이었다',
      '- {"type":"end_conversation"}: 플레이어가 작별 인사를 했다',
    ].filter(x => x !== '').join('\n');
  }

  function applyResult(brain, out, ctx, noted) {
    const s = brain.s, q = brain.p.quest;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
    const res = { reply: out.reply.trim(), openGift: false, bye: false, applied: [] };
    if (!noted) {
      brain.addAff(clamp(out.affinity, -8, 6));
      brain.addMood(clamp(out.mood, -0.6, 0.6));
    }
    const actions = Array.isArray(out.actions) && !noted ? out.actions.slice(0, 6) : [];
    for (const a of actions) {
      if (!a || typeof a.type !== 'string') continue;
      switch (a.type) {
        case 'learn_name': {
          const n = String(a.name || '').trim().slice(0, 8);
          if (n) { const old = s.memory.playerName; s.memory.playerName = n; s.memory.nameFrom = null; if (!old) brain.addAff(3); res.applied.push(a.type); }
          break;
        }
        case 'learn_like': {
          const v = String(a.value || '').trim().slice(0, 12);
          if (v) { s.memory.playerLikes = s.memory.playerLikes.filter(x => x !== v).concat(v).slice(-5); res.applied.push(a.type); }
          break;
        }
        case 'learn_dislike': {
          const v = String(a.value || '').trim().slice(0, 12);
          if (v) { s.memory.playerDislikes = s.memory.playerDislikes.filter(x => x !== v).concat(v).slice(-5); res.applied.push(a.type); }
          break;
        }
        case 'offer_quest':
          if (q && s.quest.stage === 'none' && brain.canOffer()) { s.pending = 'quest_offer'; res.applied.push(a.type); }
          break;
        case 'accept_quest':
          if (q && s.quest.stage === 'none' && brain.canOffer()) { s.pending = null; brain.acceptQuest(ctx); res.applied.push(a.type); }
          break;
        case 'complete_quest':
          if (q && s.quest.stage === 'delivered') { brain.finishQuest(ctx, q.delivered); res.applied.push(a.type); }
          else if (q && s.quest.stage === 'active' && !q.target && brain.hasNeed(ctx)) { brain.tryComplete(ctx); res.applied.push(a.type); }
          break;
        case 'take_gift': {
          const id = idFromName(a.item);
          if (id && ctx.inv.count(id) > 0) { brain.receiveGift(id, ctx); res.applied.push(a.type); }
          break;
        }
        case 'open_gift': res.openGift = true; break;
        case 'buy_fish': {
          if (brain.id !== 'mina') break;
          const n = Math.max(1, Math.min(9, parseInt(a.count, 10) || 1));
          const cost = D().ITEMS.fish.buy * n;
          if (ctx.inv.coins() >= cost) { ctx.inv.addCoins(-cost); ctx.inv.add('fish', n); res.applied.push(a.type); }
          break;
        }
        case 'sell': {
          if (brain.id !== 'mina') break;
          const id = idFromName(a.item);
          if (!id || !D().ITEMS[id].sell) break;
          const have = ctx.inv.count(id);
          const n = parseInt(a.count, 10) === -1 ? have : Math.min(have, Math.max(1, parseInt(a.count, 10) || 1));
          if (n > 0) { ctx.inv.remove(id, n); ctx.inv.addCoins(D().ITEMS[id].sell * n); res.applied.push(a.type); }
          break;
        }
        case 'gossip':
          if (a.kind === 'insult' || a.kind === 'compliment') {
            brain.remember(a.kind, String(a.detail || '').slice(0, 14), ctx);
            if (a.kind === 'insult') s.lastInsult = ctx.now;
            res.applied.push(a.type);
          }
          break;
        case 'end_conversation': res.bye = true; break;
      }
    }
    if (!actions.some(a => a && a.type === 'offer_quest') && s.pending === 'quest_offer' && !res.applied.includes('accept_quest')) s.pending = null;
    return res;
  }

  g.NpcClaude = API;
})(typeof window !== 'undefined' ? window : globalThis);
