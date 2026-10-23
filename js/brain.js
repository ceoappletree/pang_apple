// NPC 대화 AI: 의도 분석, 기억, 호감도/기분, 퀘스트, NPC끼리 소문 퍼뜨리기.
// 외부 API 없이 규칙과 상태만으로 동작한다.
(function (g) {
  'use strict';
  const D = () => g.GameData;

  // ---------- 한국어 유틸 ----------
  function hasBatchim(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0;
    if (/[0136-8]/.test(ch)) return true; // 영, 일, 삼, 육, 칠, 팔
    return /[lmnLMN]/.test(ch);
  }
  // "철민[이/가]" -> "철민이", "미나[이/가]" -> "미나가"
  function josa(text) {
    return text.replace(/([^\s\[\]])\[([^\/\]]*)\/([^\]]*)\]/g, (m, ch, a, b) => ch + (hasBatchim(ch) ? a : b));
  }
  function fill(tpl, vars) {
    return josa(tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)));
  }
  function norm(t) {
    return String(t).toLowerCase()
      .replace(/[~!?.,…·^;:'"()\[\]{}<>♡♥]/g, ' ')
      .replace(/[ㅋㅎㅠㅜ]{2,}/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  const rand = (n) => Math.floor(Math.random() * n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const STOP_WORDS = new Set(['너', '니', '당신', '널', '너를', '네가', '너가', '정말', '진짜', '나', '난', '저', '제', '그거', '이거', '그게',
    '이게', '다', '것', '거', '뭐', '누구', '몰라', '비밀', '그냥', '아니', '응', '네', '어', '그래', '좋아', '싫어', '음', '글쎄', '많이', '완전', '너무', '엄청']);
  const COPULA = /(이라고\s*해요|이라고\s*해|라고\s*해요|라고\s*해|이라고\s*합니다|라고\s*합니다|이라고|라고|이에요|예요|에요|입니다|이야|이다|야|다|요|임)$/;

  // 조사 떼기. "고양이"의 '이'처럼 낱말의 일부인 경우는 남긴다.
  const KEEP_I = /(고양이|거북이|원숭이|놀이|오이|아이|어린이|이야기|갈매기|토끼)$/;
  function stripJosa(w) {
    if (w.length < 2) return w;
    const last = w[w.length - 1], prev = w[w.length - 2], b = hasBatchim(prev);
    if ((last === '을' || last === '은') && b) return w.slice(0, -1);
    if ((last === '를' || last === '는') && !b) return w.slice(0, -1);
    if (last === '가' && !b && w.length > 2) return w.slice(0, -1);
    if (last === '이' && b && !KEEP_I.test(w)) return w.slice(0, -1);
    return w;
  }
  // "철민이야" -> 철민, "토이야" -> 토이 (받침 없는 글자 뒤의 '이'는 이름의 일부)
  function cleanName(w) {
    const m = w.match(COPULA);
    if (!m) return w.slice(0, 8);
    let n = w.slice(0, w.length - m[0].length);
    if (m[0][0] === '이' && n && !hasBatchim(n[n.length - 1])) n += '이';
    return (n || w).slice(0, 8);
  }
  function validWord(w) { return w && w.length <= 10 && !STOP_WORDS.has(w); }

  // ---------- 의도 분석 ----------
  const R = {
    sorry: /(미안|죄송|ㅈㅅ|용서|사과\s*(할게|할께|해|드릴|드려|드립|합니다|하고\s*싶))/,
    memName: /((내|제)\s*이름\s*(이|은|을)?\s*(뭐|뭔|머|알아|기억|아세요|알고|맞춰))|(나\s*(누군지|기억\s*해|기억나|알아\?|알지))/,
    memLike: /(내가|제가|나|난)\s*(뭘|뭐|무엇을?)\s*좋아/,
    askName: /((이름|성함)\s*(이|은|가)?\s*(뭐|뭔|머|무엇|어떻게))|(누구(야|세요|니|신지|예요|십니까|냐|신가요|냥)?$)|(넌\s*누구|너\s*누구|누구신)/,
    love: /(사랑해|너\s*좋아|너를\s*좋아|널\s*좋아|당신을?\s*좋아|결혼하자|사귀자|사귈래)/,
    askLike: /((뭐|뭘|무엇|무슨\s*\S+)\s*(을|를)?\s*좋아)|(좋아하는\s*(거|것|게|음식|건|색))|취미/,
    quest: /(부탁|도와\s*줄|도와줄|도와드|도움이?\s*(필요|될)|할\s*(일|거|만한)|퀘스트|일\s*(있|줘|시켜|없)|뭐\s*필요|필요한\s*(거|게|것)|심부름|미션|임무)/,
    sell: /(팔게|팔께|팔래|팔고\s*싶|팔\s*거|사\s*줄래|사줄래|사\s*주세요|매입|팔러)/,
    buy: /(사고\s*싶|살게|살께|살래|살\s*수|팔아\s*줘|팔아줘|팔아|구매|사려고|얼마|뭐\s*팔|파는\s*거|파는\s*게)/,
    give: /(가져왔|가지고\s*왔|챙겨\s*왔|여기\s*있|받아|줄게|줄께|선물|드릴게|드릴께|드려요|드립니다|모았|완료|다\s*했|전해|전달)/,
    insult: /(바보|멍청|못생|꺼져|짜증|병신|닥쳐|재수\s*없|구려|못났|한심|미워|시끄러|저리\s*가|최악|별로야|냄새\s*나|게을|돼지|느려\s*터|싫어)/,
    compliment: /(예쁘|이쁘|예뻐|이뻐|멋지|멋져|멋있|귀엽|귀여|최고|짱|잘생|대단|훌륭|좋은\s*(사람|분|고양이|이웃)|친절|착하|착해|천재|사랑스|아름다|센스|든든|믿음직|똑똑|부지런)/,
    negation: /(안|않|못)\s*(예|이|멋|귀|잘생|대단|친절|착|똑똑|훌륭)|별로/,
    thanks: /(고마|감사|땡큐|thank|ㄱㅅ|고맙)/,
    greet: /^(안녕|하이|ㅎㅇ|hi|hello|hey|반가|좋은\s*(아침|저녁|밤|하루)|안뇽|헬로|여보세요|어이|야호|굿모닝|냐옹|야옹)/,
    bye: /(잘\s*가|잘\s*있어|안녕히|bye|바이바이|^바이$|다음에\s*(봐|봬|올게|또)|나\s*갈게|갈게요?$|간다$|또\s*봐|또\s*올게|잘\s*자|수고하|이만\s*(갈|가))/,
    howAreYou: /(잘\s*지내|기분\s*(어때|은|이\s*어때|좋아\?|어떠)|요즘\s*어때|괜찮아\?|괜찮으세요|별일\s*없|컨디션|건강은|어떻게\s*지내|잘\s*있었)/,
    doing: /(뭐\s*해|뭐하|뭐\s*하고\s*(있|계)|뭐\s*하는\s*중|뭐\s*하세요|뭐\s*하니|뭐하냥|뭐\s*하는\s*거)/,
    job: /(무슨\s*일\s*(해|하|을)|직업|하는\s*일|뭐\s*하는\s*사람|생업)/,
    age: /(몇\s*살|나이|연세|몇\s*년\s*생)/,
    home: /(어디\s*(살|사|사세요|있어)|집이?\s*(어디|어딨))/,
    weather: /(날씨|비가?\s*(와|오|온)|맑|더워|덥|추워|춥|바람)/,
    time: /(몇\s*시|지금\s*시간|시간\s*이?\s*(몇|어떻게)|몇시)/,
    joke: /(농담|웃긴|재밌는\s*(거|얘기|이야기|말)|웃겨|개그|유머)/,
    rumor: /(소문|소식|뉴스|요즘\s*마을|무슨\s*일\s*있)/,
    story: /(이야기|얘기\s*해|썰|옛날)/,
    village: /(마을|이\s*동네|여기\s*(어디|는|가)|이곳)/,
    yes: /^(응|웅|어|네|넵|예|그래|좋아|ㅇㅇ|ok|오케|당연|물론|알겠|콜|할게|할께|그럴게|도와줄게|맡겨|좋지|좋아요|ㅇㅋ|그럼|들어줄게|해줄게|해\s*줄게)/,
    no: /^(아니|싫|노|ㄴㄴ|안\s*할|됐어|별로|나중에|못\s*해|안\s*돼|글쎄|다음에)/,
    nameTell1: /(?:내|제)\s*이름은?\s*([가-힣a-z0-9]{1,10})/,
    nameTell2: /(?:^|\s)(?:나는|난|저는|전)\s*([가-힣a-z0-9]{1,10}?)(?:이야|야|이에요|예요|에요|입니다|이라고\s*해|라고\s*해|이라고\s*합니다|라고\s*합니다|임)$/,
    nameTell3: /([가-힣a-z0-9]{1,10}?)(?:이라고|라고)\s*(?:불러|해|합니다|해요|부르)/,
    likeTell: /(?:^|\s)(?:(?:나는?|난|저는?|내가|제가)\s+)?([가-힣a-z]{1,10})\s*(?:정말|진짜|너무|엄청|완전|제일|가장)?\s*(?:좋아해|좋아함|좋아요|좋아합니다|좋더라|사랑해|최고야|최애|좋아$)/,
    dislikeTell: /(?:^|\s)(?:(?:나는?|난|저는?|내가|제가)\s+)?([가-힣a-z]{1,10})\s*(?:정말|진짜|너무|엄청|완전|제일)?\s*(?:싫어|싫음|싫어요|싫어합니다|별로야)/,
  };
  const JOB_WORDS = /^(학생|여행자|모험가|농부|회사원|선생님|개발자|사람|인간|사장)$/;

  function findItems(n) {
    const items = D().ITEMS;
    return Object.keys(items).filter(k => items[k].re.test(n));
  }
  function findNpcs(n, selfId) {
    return D().NPCS.filter(p => p.id !== selfId && p.aliases.test(n)).map(p => p.id);
  }
  function keyword(n) {
    const words = n.split(' ').map(stripJosa).filter(w => /[가-힣a-z]/.test(w) && validWord(w));
    words.sort((a, b) => b.length - a.length);
    return words[0] || n.slice(0, 8);
  }

  function analyze(raw, selfId) {
    const n = norm(raw);
    const isQ = /\?\s*$/.test(raw) || /(니|냐|까|나요|가요|죠|냥)\s*$/.test(n);
    const a = { n, raw, isQ, intent: 'unknown', items: findItems(n), npcs: findNpcs(n, selfId), kw: keyword(n) };
    const hit = (k) => R[k].test(n);
    let m;
    if (!n) a.intent = 'empty';
    else if (hit('sorry')) a.intent = 'sorry';
    else if (hit('memName')) a.intent = 'mem_name';
    else if (hit('memLike')) a.intent = 'mem_like';
    else if ((m = n.match(R.nameTell1) || n.match(R.nameTell2) || n.match(R.nameTell3)) && !isQ) {
      const name = cleanName(m[1]);
      if (validWord(name) && !JOB_WORDS.test(name)) { a.intent = 'tell_name'; a.name = name; }
      else if (/비밀|안\s*알려/.test(n)) a.intent = 'name_secret';
    }
    if (a.intent !== 'unknown' && a.intent !== 'empty') return a;
    if (!n) return a;

    if (hit('love')) a.intent = 'love';
    else if (hit('askLike')) a.intent = 'ask_like';
    else if (!isQ && (m = n.match(R.likeTell)) && validWord(stripJosa(m[1]))) {
      a.intent = 'tell_like'; a.like = stripJosa(m[1]);
    } else if (!isQ && (m = n.match(R.dislikeTell)) && validWord(stripJosa(m[1]))) {
      a.intent = 'tell_dislike'; a.dislike = stripJosa(m[1]);
    } else if (hit('askName')) a.intent = 'ask_name';
    else if (/무슨\s*일\s*있/.test(n)) a.intent = 'rumor';
    else if (hit('quest')) a.intent = 'quest';
    else if (hit('sell')) a.intent = 'sell';
    else if (hit('buy')) a.intent = 'buy';
    else if (hit('give')) a.intent = 'give';
    else if ((hit('insult') || hit('compliment')) && a.npcs.length) a.intent = 'about_npc';
    else if (hit('insult') || (hit('compliment') && hit('negation'))) a.intent = 'insult';
    else if (hit('compliment')) a.intent = 'compliment';
    else if (hit('thanks')) a.intent = 'thanks';
    else if (hit('greet')) a.intent = 'greet';
    else if (hit('bye')) a.intent = 'bye';
    else if (hit('howAreYou')) a.intent = 'how_are_you';
    else if (hit('doing')) a.intent = 'doing';
    else if (hit('job')) a.intent = 'job';
    else if (hit('age')) a.intent = 'age';
    else if (hit('home')) a.intent = 'home';
    else if (hit('weather')) a.intent = 'weather';
    else if (hit('time')) a.intent = 'time';
    else if (hit('joke')) a.intent = 'joke';
    else if (hit('rumor')) a.intent = 'rumor';
    else if (a.npcs.length) a.intent = 'about_npc';
    else if (hit('story')) a.intent = 'story';
    else if (a.items.length) a.intent = 'item_talk';
    else if (hit('village')) a.intent = 'village';
    else if (hit('yes')) a.intent = 'yes';
    else if (hit('no')) a.intent = 'no';
    if (a.intent === 'insult') a.detail = raw.trim().slice(0, 14);
    return a;
  }

  // ---------- 상태 ----------
  function defaultState(p) {
    return {
      affinity: p.baseAffinity, mood: 0, met: 0, lastTalkDay: -1,
      memory: { playerName: null, nameFrom: null, playerLikes: [], playerDislikes: [] },
      events: [],   // 플레이어가 이 NPC에게 한 일 (소문 재료)
      heard: [],    // 다른 NPC에게서 들은 플레이어 이야기
      quest: { stage: 'none' },
      pending: null, recent: [], lastLine: {}, lastCompliment: -999, lastInsult: -999,
      history: [],
    };
  }

  class NpcBrain {
    constructor(persona, state) {
      this.p = persona;
      this.id = persona.id;
      this.s = Object.assign(defaultState(persona), state || {});
    }

    tier() {
      const a = this.s.affinity;
      return a < -15 ? 'cold' : a > 35 ? 'warm' : 'normal';
    }
    tierLabel() {
      const a = this.s.affinity;
      return a < -40 ? '적대' : a < -15 ? '서먹' : a < 15 ? '보통' : a < 45 ? '친근' : '절친';
    }
    moodEmoji() {
      const m = this.s.mood;
      return m < -0.5 ? '😠' : m < -0.15 ? '😟' : m < 0.15 ? '😐' : m < 0.5 ? '🙂' : '😄';
    }

    addAff(d) { this.s.affinity = clamp(Math.round(this.s.affinity + d), -100, 100); }
    addMood(d) { this.s.mood = clamp(this.s.mood + d, -1, 1); }
    tick(dt) { this.s.mood += (0 - this.s.mood) * Math.min(1, dt * 0.01); }

    vars(ctx, extra) {
      const mem = this.s.memory;
      const name = mem.playerName;
      const likes = mem.playerLikes;
      return Object.assign({
        player: name || this.p.defaultAddress,
        pn: name ? name + '님' : this.p.politeAddress,
        them: name || this.p.thirdPerson,
        me: this.p.short,
        time: ctx.periodName, clock: ctx.clock, weather: ctx.weather,
        like: this.p.likeWords[rand(this.p.likeWords.length)],
        plike: likes[likes.length - 1] || '',
        plikes: likes.slice(-3).join(', '),
        pdislike: mem.playerDislikes[mem.playerDislikes.length - 1] || '',
        news: ctx.news || '',
      }, extra || {});
    }

    // 같은 키에서 방금 쓴 대사는 피해서 고른다
    pick(key, list, vars) {
      if (!list || !list.length) return '';
      let i = rand(list.length);
      if (list.length > 1 && this.s.lastLine[key] === i) i = (i + 1) % list.length;
      this.s.lastLine[key] = i;
      return fill(list[i], vars);
    }
    line(key, ctx, extra) {
      let L = this.p.lines[key];
      if (L && !Array.isArray(L)) L = L[this.tier()] || L.normal;
      return this.pick(key, L, this.vars(ctx, extra));
    }

    remember(type, detail, ctx) {
      this.s.events.push({ type, detail, day: ctx.day, told: [] });
      if (this.s.events.length > 8) this.s.events.shift();
    }

    // ---------- 대화 시작 ----------
    greet(ctx) {
      const s = this.s;
      if (ctx.sleeping) return { reply: this.line('sleeping', ctx), sleeping: true };
      s.met++;
      if (s.lastTalkDay !== ctx.day) { s.lastTalkDay = ctx.day; if (s.met > 1) this.addAff(1); }
      if (s.quest.stage === 'delivered') return { reply: this.line('greet', ctx) + ' ' + this.questTalk(ctx) };
      if (s.met === 1 && !s.memory.playerName) {
        s.pending = 'ask_name';
        return { reply: this.line('firstMeet', ctx) };
      }
      let reply = this.line('greet', ctx);
      const heard = s.heard.find(h => !h.mentioned);
      if (heard) {
        heard.mentioned = true;
        reply += ' ' + fill(this.p.lines.heard[heard.good ? 'good' : 'bad'], this.vars(ctx, { other: npcShort(heard.from) }));
      } else if (s.memory.nameFrom && !s.memory.nameAck) {
        s.memory.nameAck = true;
        reply += ' ' + this.line('nameHeard', ctx, { from: npcShort(s.memory.nameFrom) });
      } else if (s.memory.playerLikes.length && Math.random() < 0.35) {
        reply += ' ' + this.line('greetRemember', ctx);
      } else if (this.s.quest.stage === 'none' && this.canOffer() && Math.random() < 0.4) {
        reply += ' ' + this.offerQuest(ctx);
      } else if (!s.memory.playerName && Math.random() < 0.5) {
        s.pending = 'ask_name';
        reply += ' ' + this.line('nameForgot', ctx);
      }
      return { reply };
    }

    canOffer() { const q = this.p.quest; return q && this.s.affinity >= q.minAff; }
    offerQuest(ctx) {
      this.s.pending = 'quest_offer';
      return this.pick('q_offer', this.p.quest.offer, this.vars(ctx));
    }

    // ---------- 대화 ----------
    talk(raw, ctx) {
      const s = this.s, L = this.p.lines;
      const out = { reply: '', intent: '' };
      if (ctx.sleeping) {
        s.pokes = (s.pokes || 0) + 1;
        if (s.pokes >= 2) { s.pokes = 0; this.addAff(-2); this.addMood(-0.3); out.reply = this.line('wakeGrumpy', ctx); }
        else out.reply = this.line('sleeping', ctx);
        out.intent = 'sleeping';
        return out;
      }
      const a = analyze(raw, this.id);
      out.intent = a.intent;

      s.recent.push(a.n);
      if (s.recent.length > 6) s.recent.shift();
      if (a.n && s.recent.filter(x => x === a.n).length >= 3) {
        this.addMood(-0.15);
        out.reply = this.line('repeat', ctx);
        out.intent = 'repeat';
        return out;
      }

      const pending = s.pending;
      s.pending = null;
      const pr = pending && this.handlePending(pending, a, ctx);
      if (pr) { out.reply = pr; out.intent = 'pending:' + pending; return out; }

      out.reply = this.respond(a, ctx);
      if (out.reply == null) { out.reply = ''; out.openGift = true; }
      return out;
    }

    handlePending(pending, a, ctx) {
      const s = this.s, mem = s.memory;
      if (pending === 'ask_name') {
        if (a.intent === 'tell_name') return null;
        if (a.intent === 'name_secret' || /비밀|안\s*알려|몰라/.test(a.n)) return this.line('nameSecret', ctx);
        const words = a.n.split(' ');
        if (words.length <= 2 && a.intent === 'unknown') {
          const name = cleanName(words[words.length - 1]);
          if (/^[가-힣a-z0-9]{1,8}$/.test(name) && validWord(name)) return this.learnName(name, ctx);
        }
        return null;
      }
      if (pending === 'ask_like') {
        if (a.intent === 'tell_like' || a.intent === 'no') return null;
        if (a.n.split(' ').length <= 3 && ['unknown', 'item_talk', 'yes'].includes(a.intent)) {
          const w = a.items.length ? D().ITEMS[a.items[0]].name : stripJosa(a.n.split(' ')[0]);
          if (validWord(w)) return this.learnLike(w, ctx);
        }
        return null;
      }
      if (pending === 'ask_opinion') {
        if (a.intent === 'yes' || a.intent === 'compliment' || /좋|마음에\s*들/.test(a.n)) { this.addAff(2); return this.line('opinionYes', ctx); }
        if (a.intent === 'no' || a.intent === 'insult') return this.line('opinionNo', ctx);
        return null;
      }
      if (pending === 'quest_offer') {
        if (a.intent === 'yes' || a.intent === 'quest' || /할게|해볼게|도와줄게|좋아|맡겨/.test(a.n)) return this.acceptQuest(ctx);
        if (a.intent === 'no') return this.pick('q_decline', this.p.quest.decline, this.vars(ctx));
        return null;
      }
      return null;
    }

    learnName(name, ctx) {
      const mem = this.s.memory;
      const old = mem.playerName;
      mem.playerName = name; mem.nameFrom = null;
      if (old && old !== name) return this.line('nameChanged', ctx, { old });
      this.addAff(3);
      return this.line('nameLearned', ctx);
    }
    learnLike(w, ctx) {
      const mem = this.s.memory;
      mem.playerLikes = mem.playerLikes.filter(x => x !== w).concat(w).slice(-5);
      const same = this.p.likeWords.some(x => x.includes(w)) ||
        (this.p.likes.love.concat(this.p.likes.like)).some(id => D().ITEMS[id].name === w);
      if (same) { this.addAff(3); this.addMood(0.2); return this.line('tellLikeSame', ctx, { plike: w }); }
      return this.line('tellLike', ctx, { plike: w });
    }

    respond(a, ctx) {
      const s = this.s, mem = s.memory, L = this.p.lines;
      switch (a.intent) {
        case 'empty': return '...?';
        case 'tell_name': return this.learnName(a.name, ctx);
        case 'name_secret': return this.line('nameSecret', ctx);
        case 'mem_name':
          if (mem.playerName) return this.line('nameRemember', ctx);
          s.pending = 'ask_name'; return this.line('nameForgot', ctx);
        case 'mem_like':
          if (mem.playerLikes.length) return this.line('likeRemember', ctx);
          s.pending = 'ask_like'; return this.line('likeForgot', ctx);
        case 'ask_name': {
          let r = this.line('whoAmI', ctx);
          if (!mem.playerName) { s.pending = 'ask_name'; r += ' ' + this.line('nameForgot', ctx); }
          return r;
        }
        case 'tell_like': return this.learnLike(a.like, ctx);
        case 'tell_dislike':
          mem.playerDislikes = mem.playerDislikes.filter(x => x !== a.dislike).concat(a.dislike).slice(-5);
          return this.line('tellDislike', ctx, { pdislike: a.dislike });
        case 'ask_like': s.pending = 'ask_like'; return this.line('askLike', ctx);
        case 'love': {
          if (s.affinity > 35) this.addMood(0.3);
          return this.line('love', ctx);
        }
        case 'compliment': {
          if (ctx.now - s.lastCompliment < 60) return this.line('complimentRepeat', ctx);
          s.lastCompliment = ctx.now;
          this.addAff(4); this.addMood(0.35);
          this.remember('compliment', '', ctx);
          return this.line('compliment', ctx);
        }
        case 'insult': {
          const t = this.line('insult', ctx);
          this.addAff(-8); this.addMood(-0.6);
          s.lastInsult = ctx.now;
          this.remember('insult', a.detail, ctx);
          return t;
        }
        case 'sorry':
          if (ctx.now - s.lastInsult < 600) {
            s.lastInsult = -999; this.addAff(4); this.addMood(0.3);
            return this.pick('sorry_f', L.sorry.forgive, this.vars(ctx));
          }
          return this.pick('sorry_n', L.sorry.none, this.vars(ctx));
        case 'thanks': this.addMood(0.1); return this.line('thanks', ctx);
        case 'greet': return this.line('greet', ctx);
        case 'bye': return this.line('bye', ctx);
        case 'how_are_you':
          return this.pick('hay', L.howAreYou[s.mood < -0.15 || s.affinity < -30 ? 'bad' : 'good'], this.vars(ctx));
        case 'doing': return this.pick('doing', L.doing[ctx.period], this.vars(ctx));
        case 'job': return this.line('job', ctx);
        case 'age': return this.line('age', ctx);
        case 'home': return this.line('home', ctx);
        case 'weather': return this.line('weather', ctx);
        case 'time': return this.line('time', ctx);
        case 'joke': this.addMood(0.1); return this.line('joke', ctx);
        case 'story': return this.line('story', ctx);
        case 'village': return this.line('village', ctx);
        case 'rumor': {
          const withNews = L.rumor.filter(x => x.includes('{news}'));
          const plain = L.rumor.filter(x => !x.includes('{news}'));
          return this.pick('rumor', ctx.news ? withNews : plain, this.vars(ctx));
        }
        case 'about_npc': {
          const other = a.npcs[0];
          return this.pick('op_' + other, this.opinionsFor(other, ctx), this.vars(ctx));
        }
        case 'item_talk': {
          const item = a.items[0];
          return fill(L.itemTalk[this.pref(item)], this.vars(ctx, { item: D().ITEMS[item].name }));
        }
        case 'quest': return this.questTalk(ctx);
        case 'give': {
          const item = a.items[0];
          if (s.quest.stage === 'delivered') return this.questTalk(ctx);
          if (item) return this.receiveGift(item, ctx).reply;
          if (s.quest.stage === 'active' && !this.p.quest.target) return this.tryComplete(ctx);
          return null; // 무엇을 줄지 고르게 한다
        }
        case 'buy': case 'sell':
          if (this.id === 'mina') return this.trade(a, ctx);
          return this.line('shop', ctx);
        case 'yes': return this.line('yes', ctx);
        case 'no': return this.line('no', ctx);
      }
      // 그 밖의 말: 캐릭터별 화제 -> 되묻기 -> 모르는 척
      const topic = this.p.topics.find(t => t.k.test(a.n));
      if (topic) return this.pick('topic', topic.lines, this.vars(ctx));
      if (Math.random() < 0.3) {
        const q = L.askBack[rand(L.askBack.length)];
        s.pending = q.pending;
        return fill(q.q, this.vars(ctx));
      }
      return this.line('unknown', ctx, { kw: a.kw });
    }

    opinionsFor(other, ctx) {
      if (ctx.flags && ctx.flags.letterDelivered && this.id === 'chulsu' && other === 'mina')
        return ['...미나가 준 편지, 아직도 가지고 있다. 답장은... 했다.'];
      if (ctx.flags && ctx.flags.letterDelivered && this.id === 'mina' && other === 'chulsu')
        return ['철수 씨요? 헤헤... 요즘 저한테 다정해요!'];
      return this.p.opinions[other] || ['...'];
    }

    pref(item) {
      const l = this.p.likes;
      return l.love.includes(item) ? 'love' : l.like.includes(item) ? 'like' : l.dislike.includes(item) ? 'dislike' : 'neutral';
    }

    // ---------- 퀘스트 ----------
    questTalk(ctx) {
      const q = this.p.quest, st = this.s.quest, v = this.vars(ctx);
      if (st.stage === 'none') {
        if (!this.canOffer()) return this.pick('q_refuse', q.refuse, v);
        return this.offerQuest(ctx);
      }
      if (st.stage === 'active') {
        if (!q.target && this.hasNeed(ctx)) return this.tryComplete(ctx);
        const [item, n] = Object.entries(q.need)[0];
        return this.pick('q_remind', q.remind, Object.assign(v, { have: ctx.inv.count(item), n }));
      }
      if (st.stage === 'delivered') return this.finishQuest(ctx, q.delivered);
      return this.pick('q_done', q.done, v);
    }
    acceptQuest(ctx) {
      const q = this.p.quest;
      this.s.quest.stage = 'active';
      if (q.startItems) for (const [k, n] of Object.entries(q.startItems)) ctx.inv.add(k, n);
      ctx.notify && ctx.notify('📜 새 부탁: ' + q.title);
      return this.pick('q_accept', q.accept, this.vars(ctx));
    }
    hasNeed(ctx) {
      return Object.entries(this.p.quest.need).every(([k, n]) => ctx.inv.count(k) >= n);
    }
    tryComplete(ctx) {
      const q = this.p.quest;
      if (!this.hasNeed(ctx)) {
        const [item, n] = Object.entries(q.need)[0];
        return this.pick('q_remind', q.remind, Object.assign(this.vars(ctx), { have: ctx.inv.count(item), n }));
      }
      for (const [k, n] of Object.entries(q.need)) ctx.inv.remove(k, n);
      return this.finishQuest(ctx, q.complete);
    }
    finishQuest(ctx, lines) {
      const q = this.p.quest, r = q.reward;
      this.s.quest.stage = 'done';
      if (r.coins) ctx.inv.addCoins(r.coins);
      if (r.items) for (const [k, n] of Object.entries(r.items)) ctx.inv.add(k, n);
      if (r.follow) ctx.setFollow && ctx.setFollow(this.id);
      this.addAff(15); this.addMood(0.6);
      this.remember('quest', q.title, ctx);
      ctx.notify && ctx.notify('✅ 부탁 완료: ' + q.title);
      return this.pick('q_complete', lines, this.vars(ctx));
    }

    // ---------- 선물 ----------
    receiveGift(item, ctx) {
      const L = this.p.lines;
      const name = D().ITEMS[item].name;
      if (ctx.inv.count(item) < 1) return { reply: this.line('giftNone', ctx) };
      // 다른 NPC가 맡긴 배달 물건인가?
      for (const b of Object.values(ctx.brains || {})) {
        const q = b.p.quest;
        if (q && q.target === this.id && b.s.quest.stage === 'active' && q.need[item]) {
          ctx.inv.remove(item, q.need[item]);
          b.s.quest.stage = 'delivered';
          if (ctx.flags) ctx.flags.letterDelivered = true;
          this.addAff(6); this.addMood(0.5);
          ctx.notify && ctx.notify('✉️ 전달 완료! ' + b.p.short + '에게 알려주자');
          return { reply: this.pick('letter', L.letterReact || L.thanks, this.vars(ctx)) };
        }
      }
      // 내 퀘스트 물건인가?
      const q = this.p.quest;
      if (q && !q.target && this.s.quest.stage === 'active' && q.need[item]) return { reply: this.tryComplete(ctx) };
      if (item === 'letter') return { reply: '(편지를 받지 않는다. 다른 사람에게 전할 편지인 것 같다.)' };

      ctx.inv.remove(item, 1);
      const pref = this.pref(item);
      const delta = { love: 12, like: 6, neutral: 2, dislike: -3 }[pref];
      this.addAff(delta); this.addMood(delta / 20);
      if (pref !== 'dislike') this.remember('gift', name, ctx);
      return { reply: this.pick('gift_' + pref, L.gift[pref], this.vars(ctx, { item: name })), pref };
    }

    // ---------- 상점 (미나 전용) ----------
    trade(a, ctx) {
      const items = D().ITEMS;
      const v = this.vars(ctx);
      const item = a.items[0];
      if (a.intent === 'buy') {
        if (item !== 'fish') return this.pick('shopMenu', this.p.lines.shopMenu, v);
        const n = Math.max(1, parseInt((a.n.match(/(\d+)\s*(마리|개)/) || [])[1] || '1', 10));
        const cost = items.fish.buy * n;
        if (ctx.inv.coins() < cost) return this.pick('noMoney', this.p.lines.noMoney, v);
        ctx.inv.addCoins(-cost); ctx.inv.add('fish', n);
        return fill(this.p.lines.bought[0], Object.assign(v, { n, cost }));
      }
      if (!item) return this.pick('shopMenu', this.p.lines.shopMenu, v);
      if (!items[item].sell) return this.pick('cantBuy', this.p.lines.cantBuy, v);
      const have = ctx.inv.count(item);
      if (!have) return fill(this.p.lines.noneToSell[0], Object.assign(v, { item: items[item].name }));
      const n = /다|전부|모두|몽땅/.test(a.n) ? have : 1;
      const cost = items[item].sell * n;
      ctx.inv.remove(item, n); ctx.inv.addCoins(cost);
      return fill(this.p.lines.sold[0], Object.assign(v, { item: items[item].name, n, cost }));
    }

    // ---------- 소문 ----------
    gossipFor(otherId) {
      const ev = this.s.events.slice().reverse().find(e => !e.told.includes(otherId));
      return ev || null;
    }
    hear(ev, from, ctx) {
      const good = ev.type !== 'insult';
      this.s.heard.push({ from: from.id, type: ev.type, good, day: ctx.day, mentioned: false });
      if (this.s.heard.length > 6) this.s.heard.shift();
      this.addAff(good ? 3 : -4);
      const fm = from.s.memory;
      if (fm.playerName && !this.s.memory.playerName) {
        this.s.memory.playerName = fm.playerName;
        this.s.memory.nameFrom = from.id;
      }
      return this.pick('hearReact', this.p.lines.hearReact[good ? 'good' : 'bad'], this.vars(ctx));
    }

    addHistory(user, npc) {
      this.s.history.push({ u: user, n: npc });
      if (this.s.history.length > 6) this.s.history.shift();
    }

    // LLM에게 넘길 기억 요약
    summary() {
      const s = this.s, mem = s.memory;
      const parts = [];
      parts.push('플레이어 이름: ' + (mem.playerName || '모름'));
      if (mem.playerLikes.length) parts.push('플레이어가 좋아하는 것: ' + mem.playerLikes.join(', '));
      if (mem.playerDislikes.length) parts.push('플레이어가 싫어하는 것: ' + mem.playerDislikes.join(', '));
      parts.push('호감도: ' + s.affinity + ' (' + this.tierLabel() + ')');
      const evs = s.events.slice(-3).map(e => ({ insult: '나에게 막말함', compliment: '나를 칭찬함', gift: '선물(' + e.detail + ')을 줌', quest: '부탁을 들어줌' })[e.type]);
      if (evs.length) parts.push('최근 플레이어가 한 일: ' + evs.join(', '));
      const hs = s.heard.slice(-2).map(h => npcShort(h.from) + '에게서 플레이어가 ' + (h.good ? '좋은 일' : '못된 일') + '을 했다고 들음');
      if (hs.length) parts.push(hs.join(', '));
      return parts.join('\n');
    }
  }

  function npcShort(id) {
    const p = D().NPCS.find(x => x.id === id);
    return p ? p.short : id;
  }

  // 두 NPC가 만났을 때의 대화. 소문이 있으면 소문을, 없으면 잡담을 나눈다.
  function converse(a, b, ctx) {
    let speaker = a, listener = b;
    let ev = a.gossipFor(b.id);
    if (!ev) { ev = b.gossipFor(a.id); if (ev) { speaker = b; listener = a; } }
    if (ev) {
      ev.told.push(listener.id);
      const text = fill(speaker.p.lines.gossip[ev.type], speaker.vars(ctx, { detail: ev.detail }));
      const react = listener.hear(ev, speaker, ctx);
      return { gossip: true, about: ev.type, lines: [[speaker.id, text], [listener.id, react]] };
    }
    const key = [a.id, b.id].sort().join('|');
    const love = key === 'chulsu|mina' && ctx.flags && ctx.flags.letterDelivered;
    const pool = D().SMALL_TALK[love ? key + ':love' : key];
    if (!pool) return null;
    return { gossip: false, lines: pool[rand(pool.length)] };
  }

  g.NpcBrain = { NpcBrain, analyze, converse, fill, josa, norm, defaultState };
  if (typeof module !== 'undefined') module.exports = g.NpcBrain;
})(typeof window !== 'undefined' ? window : globalThis);
