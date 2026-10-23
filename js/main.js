// 게임 루프, 그리기, 입력, NPC 행동(일정/배회/잡담), 대화 화면
(function () {
  'use strict';
  const { ITEMS, NPCS, WEATHERS } = window.GameData;
  const World = window.World;
  const { NpcBrain, converse, josa } = window.NpcBrain;
  const LLM = window.NpcLLM;
  const ClaudeAI = window.NpcClaude;

  const TILE = 32;
  const SAVE_KEY = 'appletree-village-save-v1';
  const PREF_KEY = 'appletree-village-prefs-v1';
  const PERIOD_NAME = { morning: '아침', day: '낮', evening: '저녁', night: '밤' };
  const PERIOD_ICON = { morning: '🌅', day: '☀️', evening: '🌇', night: '🌙' };
  const FONT = '"Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const PLAYER_EMOJI = '🧑‍🌾';

  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const cx = canvas.getContext('2d');
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---------- 저장 ----------
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 저장 불가 환경 */ } }
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }

  function newState() {
    return {
      version: 1, time: 8 * 60, day: 1, playTime: 0, coins: 5,
      inv: { apple: 0, ore: 0, flower: 0, fish: 0, letter: 0, pie: 0 },
      flags: {}, news: [], ground: [], follow: null, nextId: 1, introSeen: false,
      player: { x: 17, y: 9 }, npcs: {}, brains: {},
    };
  }

  let S = load(SAVE_KEY);
  if (!S || S.version !== 1) S = newState();
  const prefs = Object.assign({ ai: 'claude', model: 'small' }, load(PREF_KEY) || {});

  const player = { x: S.player.x, y: S.player.y, path: [], dir: 1, moving: false, talkTo: null };
  const brains = {};
  const npcs = NPCS.map(p => {
    brains[p.id] = new NpcBrain(p, S.brains[p.id]);
    const saved = S.npcs[p.id];
    const start = p.schedule.morning;
    return {
      id: p.id, p, brain: brains[p.id],
      x: saved ? saved.x : start[0], y: saved ? saved.y : start[1],
      path: [], dir: 1, state: 'idle', bubble: null,
      wanderT: rand(2, 6), idleT: rand(8, 20), chatCd: rand(5, 15), repathT: 0,
    };
  });
  const convos = [];
  let tapMarker = null;

  function save() {
    S.player = { x: Math.round(player.x), y: Math.round(player.y) };
    npcs.forEach(n => { S.npcs[n.id] = { x: Math.round(n.x), y: Math.round(n.y) }; S.brains[n.id] = n.brain.s; });
    store(SAVE_KEY, S);
  }

  // ---------- 시간 ----------
  const hour = () => Math.floor(S.time / 60) % 24;
  function period(h = hour()) { return h >= 6 && h < 11 ? 'morning' : h < 17 && h >= 11 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night'; }
  function clockText(t = S.time) {
    const h = Math.floor(t / 60) % 24, m = Math.floor((t % 60) / 10) * 10;
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (m ? ' ' + m + '분' : '');
  }
  const weather = () => WEATHERS[(S.day * 7 + 3) % WEATHERS.length];

  // ---------- 인벤토리 ----------
  const inv = {
    count: k => S.inv[k] || 0,
    add(k, n) { S.inv[k] = (S.inv[k] || 0) + n; toast(ITEMS[k].emoji + ' ' + ITEMS[k].name + ' +' + n); renderInv(); },
    remove(k, n) { S.inv[k] = Math.max(0, (S.inv[k] || 0) - n); toast(ITEMS[k].emoji + ' ' + ITEMS[k].name + ' −' + n); renderInv(); },
    coins: () => S.coins,
    addCoins(n) { S.coins += n; toast('🪙 ' + (n > 0 ? '+' : '−') + Math.abs(n) + '전'); renderInv(); },
  };

  function placeName(x, y) {
    if (x >= 12 && x <= 16 && y >= 12 && y <= 16) return '광장';
    if (x <= 13 && y <= 8) return '과수원';
    if (x >= 26 && y <= 12) return '바위 언덕';
    if (x >= 26) return '대장간 앞';
    if (x <= 11 && y >= 15) return '상점 앞';
    if (y >= 17) return '연못가';
    return '길가';
  }

  function rumorFor(npcId) {
    const list = S.news.filter(e => e.a !== npcId && e.b !== npcId);
    const e = list[list.length - 1] || S.news[S.news.length - 1];
    return e ? e.rumor : null;
  }

  function ctxFor(n) {
    const per = period();
    return {
      day: S.day, now: S.playTime, period: per, periodName: PERIOD_NAME[per], clock: clockText(), weather: weather(),
      sleeping: !!n && n.state === 'sleep', flags: S.flags, news: n ? rumorFor(n.id) : null, brains, inv,
      notify: toast,
      setFollow: id => { S.follow = id; toast('🐱 모모가 당신을 따라다니기 시작했다!'); },
    };
  }

  // ---------- 지도 그리기 ----------
  let baseCanvas = null;
  const windows = [];
  function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function buildBase() {
    const T = World.T;
    const c = document.createElement('canvas');
    c.width = World.W * TILE; c.height = World.H * TILE;
    const g = c.getContext('2d');
    const r = mulberry(7);
    const grass = (x, y) => {
      const v = r();
      g.fillStyle = v < 0.33 ? '#8fc46a' : v < 0.66 ? '#88bf64' : '#93c86f';
      g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'rgba(40,90,30,0.18)';
      for (let i = 0; i < 3; i++) g.fillRect(x + r() * 28, y + r() * 28, 2, 4);
    };
    for (let ty = 0; ty < World.H; ty++) for (let tx = 0; tx < World.W; tx++) {
      const x = tx * TILE, y = ty * TILE, t = World.get(tx, ty);
      if (t === T.PATH || t === T.DOOR) {
        g.fillStyle = '#dcc493'; g.fillRect(x, y, TILE, TILE);
        g.fillStyle = 'rgba(120,90,50,0.18)';
        for (let i = 0; i < 4; i++) g.fillRect(x + r() * 30, y + r() * 30, 2, 2);
      } else if (t === T.PLAZA || t === T.WELL) {
        g.fillStyle = '#d2c3a2'; g.fillRect(x, y, TILE, TILE);
        g.strokeStyle = 'rgba(110,90,60,0.25)'; g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, 16, 16); g.strokeRect(x + 16.5, y + 16.5, 15, 15);
        g.strokeRect(x + 16.5, y + 0.5, 15, 16); g.strokeRect(x + 0.5, y + 16.5, 16, 15);
      } else if (t === T.WATER || t === T.BRIDGE) {
        g.fillStyle = '#4f9fd8'; g.fillRect(x, y, TILE, TILE);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5;
        g.beginPath(); const wx = x + r() * 16, wy = y + 8 + r() * 16;
        g.moveTo(wx, wy); g.quadraticCurveTo(wx + 5, wy - 4, wx + 10, wy); g.stroke();
      } else grass(x, y);

      if (t === T.FLOWERS) {
        const cols = ['#ff8fb1', '#ffd54f', '#ffffff', '#ce93d8'];
        for (let i = 0; i < 5; i++) {
          g.fillStyle = cols[(r() * cols.length) | 0];
          g.beginPath(); g.arc(x + 5 + r() * 22, y + 5 + r() * 22, 2.6, 0, Math.PI * 2); g.fill();
        }
      } else if (t === T.BRIDGE) {
        g.fillStyle = '#a97b4c'; g.fillRect(x, y + 3, TILE, TILE - 6);
        g.strokeStyle = 'rgba(70,40,20,0.45)';
        for (let i = 0; i <= TILE; i += 8) { g.beginPath(); g.moveTo(x + i, y + 3); g.lineTo(x + i, y + TILE - 3); g.stroke(); }
      } else if (t === T.TREE || t === T.APPLE_TREE) {
        g.fillStyle = 'rgba(20,50,20,0.25)';
        g.beginPath(); g.ellipse(x + 16, y + 27, 12, 4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#7a5230'; g.fillRect(x + 13, y + 16, 6, 12);
        g.fillStyle = t === T.APPLE_TREE ? '#4f9a3b' : '#3d7d35';
        g.beginPath(); g.arc(x + 16, y + 12, 12, 0, Math.PI * 2); g.arc(x + 9, y + 16, 7, 0, Math.PI * 2); g.arc(x + 23, y + 16, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.beginPath(); g.arc(x + 12, y + 8, 5, 0, Math.PI * 2); g.fill();
        if (t === T.APPLE_TREE) {
          g.fillStyle = '#e53935';
          for (const [ax, ay] of [[10, 10], [20, 8], [16, 16], [24, 15], [8, 17]]) { g.beginPath(); g.arc(x + ax, y + ay, 2.6, 0, Math.PI * 2); g.fill(); }
        }
      } else if (t === T.ROCK) {
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x + 16, y + 26, 12, 4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8e939a';
        g.beginPath(); g.moveTo(x + 5, y + 25); g.lineTo(x + 8, y + 12); g.lineTo(x + 17, y + 6); g.lineTo(x + 27, y + 12); g.lineTo(x + 28, y + 25); g.closePath(); g.fill();
        g.fillStyle = '#b3b8be'; g.beginPath(); g.moveTo(x + 9, y + 13); g.lineTo(x + 17, y + 7); g.lineTo(x + 20, y + 14); g.closePath(); g.fill();
        g.fillStyle = '#c47a3a'; g.fillRect(x + 18, y + 17, 3, 3); g.fillRect(x + 11, y + 20, 2, 2);
      } else if (t === T.WELL) {
        g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(x + 16, y + 17, 12, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2f5d86'; g.beginPath(); g.arc(x + 16, y + 17, 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#6d4c33'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x + 5, y + 18); g.lineTo(x + 5, y + 2); g.lineTo(x + 27, y + 2); g.lineTo(x + 27, y + 18); g.stroke();
      }
    }
    // 집
    for (const b of World.buildings) {
      const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE;
      const roofH = Math.round(h * 0.5);
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 4, y + h - 2, w, 6);
      g.fillStyle = b.wall; g.fillRect(x + 2, y + roofH - 4, w - 4, h - roofH + 4);
      g.fillStyle = b.roof;
      g.beginPath(); g.moveTo(x - 4, y + roofH); g.lineTo(x + 10, y + 2); g.lineTo(x + w - 10, y + 2); g.lineTo(x + w + 4, y + roofH); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
      for (let i = 10; i < roofH; i += 8) { g.beginPath(); g.moveTo(x + 2, y + i); g.lineTo(x + w - 2, y + i); g.stroke(); }
      const dx = b.door.x * TILE;
      g.fillStyle = '#6b4226'; g.fillRect(dx + 8, y + h - 24, 16, 24);
      g.fillStyle = '#e0b84c'; g.fillRect(dx + 20, y + h - 13, 2, 2);
      for (const wx of [x + 14, x + w - 34]) {
        if (Math.abs(wx - dx) < 24) continue;
        g.fillStyle = '#5a6f80'; g.fillRect(wx, y + roofH + 8, 20, 14);
        g.strokeStyle = '#f5f0e6'; g.lineWidth = 2; g.strokeRect(wx, y + roofH + 8, 20, 14);
        windows.push({ x: wx, y: y + roofH + 8, w: 20, h: 14 });
      }
      g.font = 'bold 11px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(b.name).width + 10;
      g.fillStyle = '#5b3b22'; g.fillRect(x + w / 2 - tw / 2, y + roofH - 10, tw, 15);
      g.fillStyle = '#fff4dc'; g.fillText(b.name, x + w / 2, y + roofH - 2.5);
    }
    baseCanvas = c;
  }

  // ---------- 화면 ----------
  let dpr = 1, viewW = 0, viewH = 0, scale = 1, camX = 0, camY = 0, camShift = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    scale = clamp(Math.min(w / (11 * TILE), h / (9 * TILE)), 0.8, 2.2);
    viewW = w / scale; viewH = h / scale;
    document.documentElement.style.setProperty('--hud-h', $('hud').offsetHeight + 'px');
  }

  function updateCamera(dt) {
    const sheet = $('chat');
    const target = chatNpc && !sheet.hidden ? sheet.offsetHeight / 2 / scale : 0;
    camShift += (target - camShift) * Math.min(1, dt * 6);
    const px = player.x * TILE + TILE / 2, py = player.y * TILE + TILE / 2 + camShift;
    const ww = World.W * TILE, wh = World.H * TILE;
    camX = viewW >= ww ? (ww - viewW) / 2 : clamp(px - viewW / 2, 0, ww - viewW);
    camY = viewH >= wh ? (wh - viewH) / 2 : clamp(py - viewH / 2, 0, wh - viewH + camShift * 2);
  }

  function nightAlpha() {
    const h = S.time / 60 % 24;
    if (h >= 21 || h < 5) return 0.5;
    if (h >= 17.5) return (h - 17.5) / 3.5 * 0.5;
    if (h < 7) return (7 - h) / 2 * 0.5;
    return 0;
  }

  function wrap(text, maxW) {
    const lines = []; let cur = '';
    for (const ch of text) {
      if (cx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch.trim() ? ch : ''; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }

  function roundRect(x, y, w, h, r) {
    cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
  }

  function drawBubble(px, py, text, color) {
    cx.font = '12px ' + FONT;
    const lines = wrap(text, 140);
    const w = Math.max(...lines.map(l => cx.measureText(l).width)) + 14, h = lines.length * 15 + 9;
    const bx = clamp(px - w / 2, camX + 4, camX + viewW - w - 4), by = py - h - 8;
    cx.fillStyle = 'rgba(255,255,255,0.96)'; cx.strokeStyle = color || 'rgba(60,50,40,0.5)'; cx.lineWidth = 1.5;
    roundRect(bx, by, w, h, 8); cx.fill(); cx.stroke();
    cx.beginPath(); cx.moveTo(px - 5, by + h - 0.5); cx.lineTo(px, by + h + 6); cx.lineTo(px + 5, by + h - 0.5); cx.fill();
    cx.fillStyle = '#2a2420'; cx.textAlign = 'left'; cx.textBaseline = 'top';
    lines.forEach((l, i) => cx.fillText(l, bx + 7, by + 5 + i * 15));
  }

  function drawChar(e, emoji, t) {
    const px = e.x * TILE + TILE / 2, py = e.y * TILE + TILE / 2;
    const bob = e.moving ? Math.abs(Math.sin(t * 12)) * 3 : 0;
    cx.fillStyle = 'rgba(20,30,10,0.28)';
    cx.beginPath(); cx.ellipse(px, py + 11, 10, 4, 0, 0, Math.PI * 2); cx.fill();
    cx.save();
    cx.translate(px, py - 2 - bob);
    if (e.state === 'sleep') cx.rotate(-0.25);
    if (e.dir < 0) cx.scale(-1, 1);
    cx.font = '25px ' + EMOJI_FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = '#000';
    cx.fillText(emoji, 0, 0);
    cx.restore();
    return { px, py };
  }

  let lastT = performance.now() / 1000;
  function render(t) {
    cx.setTransform(dpr * scale, 0, 0, dpr * scale, -camX * dpr * scale, -camY * dpr * scale);
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#3d7d35'; cx.fillRect(camX, camY, viewW, viewH);
    cx.drawImage(baseCanvas, 0, 0);

    // 바닥 아이템
    cx.font = '16px ' + EMOJI_FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const it of S.ground) {
      const bob = Math.sin(t * 3 + it.id) * 1.5;
      cx.fillStyle = 'rgba(0,0,0,0.18)'; cx.beginPath(); cx.ellipse(it.x * TILE + 16, it.y * TILE + 24, 6, 2.5, 0, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#000';
      cx.fillText(ITEMS[it.item].emoji, it.x * TILE + 16, it.y * TILE + 16 + bob);
    }
    if (tapMarker) {
      cx.strokeStyle = 'rgba(255,255,255,' + tapMarker.t + ')'; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(tapMarker.x * TILE + 16, tapMarker.y * TILE + 16, 14 * (1.4 - tapMarker.t), 0, Math.PI * 2); cx.stroke();
    }

    // 캐릭터 (y 순서)
    const ents = npcs.map(n => ({ e: n, emoji: n.p.emoji, npc: n })).concat([{ e: player, emoji: PLAYER_EMOJI }]);
    ents.sort((a, b) => a.e.y - b.e.y);
    const heads = [];
    for (const it of ents) {
      const pos = drawChar(it.e, it.emoji, t);
      if (it.npc) heads.push({ n: it.npc, pos });
    }

    // 밤
    const na = nightAlpha();
    if (na > 0) {
      cx.fillStyle = 'rgba(16,24,64,' + na + ')'; cx.fillRect(camX, camY, viewW, viewH);
      cx.globalCompositeOperation = 'lighter';
      for (const w of windows) {
        cx.fillStyle = 'rgba(255,200,90,' + (na * 1.2) + ')'; cx.fillRect(w.x, w.y, w.w, w.h);
        const gr = cx.createRadialGradient(w.x + w.w / 2, w.y + w.h / 2, 2, w.x + w.w / 2, w.y + w.h / 2, 40);
        gr.addColorStop(0, 'rgba(255,190,80,' + na * 0.5 + ')'); gr.addColorStop(1, 'rgba(255,190,80,0)');
        cx.fillStyle = gr; cx.fillRect(w.x - 30, w.y - 30, w.w + 60, w.h + 60);
      }
      cx.globalCompositeOperation = 'source-over';
    }

    // 이름표와 말풍선은 밤 효과 위에
    for (const { n, pos } of heads) {
      cx.font = 'bold 10px ' + FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      const label = n.p.short;
      const tw = cx.measureText(label).width + 8;
      cx.fillStyle = 'rgba(30,25,20,0.62)'; roundRect(pos.px - tw / 2, pos.py + 14, tw, 13, 6); cx.fill();
      cx.fillStyle = '#fff'; cx.fillText(label, pos.px, pos.py + 20.5);
      if (n.state === 'sleep') {
        cx.font = 'bold 12px ' + FONT; cx.fillStyle = '#e8ecff';
        cx.fillText('z', pos.px + 12, pos.py - 16 - (t * 6 % 6)); cx.fillText('Z', pos.px + 18, pos.py - 24 - (t * 6 % 6));
      }
      if (n.bubble && n.bubble.until > t) drawBubble(pos.px, pos.py - 16, n.bubble.text, n.p.color);
    }
  }

  // ---------- 움직임 ----------
  function moveAlong(e, dt, speed) {
    e.moving = e.path.length > 0;
    while (e.path.length && dt > 0) {
      const tg = e.path[0];
      const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy);
      if (dx) e.dir = dx < 0 ? -1 : 1;
      const step = speed * dt;
      if (step >= d) { e.x = tg.x; e.y = tg.y; e.path.shift(); dt -= d / speed; }
      else { e.x += dx / d * step; e.y += dy / d * step; dt = 0; }
    }
  }
  const tileOf = e => ({ x: Math.round(e.x), y: Math.round(e.y) });

  function walkTo(e, tx, ty) {
    const s = tileOf(e);
    // 이동 중이면 지금 향하는 칸에서 이어서 계산해 순간이동을 막는다
    const from = e.path.length ? e.path[0] : s;
    const p = World.findPath(from.x, from.y, tx, ty);
    if (!p) return false;
    e.path = e.path.length ? [e.path[0]].concat(p) : p;
    return true;
  }

  function schedTarget(n) {
    if (S.follow === n.id) return null;
    const per = period();
    const t = n.p.schedule[per];
    if (t === 'home') {
      const b = World.buildings.find(b => b.id === n.p.home);
      return { x: b.front.x, y: b.front.y, sleep: true };
    }
    return { x: t[0], y: t[1], sleep: per === 'night' };
  }

  function updateNpc(n, dt, t) {
    n.chatCd -= dt;
    if (n.state === 'talk' || n.state === 'chat') { n.moving = false; return; }
    if (S.follow === n.id) {
      n.state = 'idle';
      n.repathT -= dt;
      if (dist(n, player) > 1.6 && n.repathT <= 0) {
        n.repathT = 0.5;
        const pt = tileOf(player);
        n.path = [];
        walkTo(n, pt.x, pt.y);
        if (n.path.length) n.path.pop(); // 바로 옆에 선다
      }
      moveAlong(n, dt, dist(n, player) > 4 ? 5 : 3.2);
      return;
    }
    const tg = schedTarget(n);
    if (n.path.length) { moveAlong(n, dt, 2.4); return; }
    n.moving = false;
    const d = Math.abs(n.x - tg.x) + Math.abs(n.y - tg.y);
    if (d > (tg.sleep ? 0.1 : 3)) {
      if (n.state === 'sleep') n.state = 'idle';
      if (!walkTo(n, tg.x, tg.y)) { n.x = tg.x; n.y = tg.y; }
      return;
    }
    if (tg.sleep) { if (n.state !== 'sleep') { n.state = 'sleep'; n.bubble = null; } return; }
    if (n.state === 'sleep') n.state = 'idle';
    n.wanderT -= dt;
    if (n.wanderT <= 0) {
      n.wanderT = rand(4, 10);
      for (let i = 0; i < 6; i++) {
        const wx = tg.x + Math.round(rand(-2, 2)), wy = tg.y + Math.round(rand(-2, 2));
        if (World.walkable(wx, wy)) { walkTo(n, wx, wy); break; }
      }
    }
    n.idleT -= dt;
    if (n.idleT <= 0) {
      n.idleT = rand(18, 40);
      if (!n.bubble || n.bubble.until < t) {
        const L = n.p.lines.idle;
        n.bubble = { text: L[(Math.random() * L.length) | 0], until: t + 3 };
      }
    }
  }

  // NPC끼리 마주치면 대화를 시작한다
  let convoCheck = 0;
  function updateConvos(dt, t) {
    convoCheck -= dt;
    if (convoCheck <= 0) {
      convoCheck = 1;
      const free = npcs.filter(n => n.state === 'idle' && !n.path.length && n.chatCd <= 0 && n !== chatNpc);
      for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
        const a = free[i], b = free[j];
        if (a.state !== 'idle' || b.state !== 'idle' || dist(a, b) > 3 || Math.random() > 0.3) continue;
        startConvo(a, b, t);
      }
    }
    for (let k = convos.length - 1; k >= 0; k--) {
      const c = convos[k];
      c.t -= dt;
      if (c.t > 0) continue;
      if (c.i >= c.lines.length) { endConvo(c); continue; }
      const [who, text] = c.lines[c.i++];
      const sp = who === c.a.id ? c.a : c.b;
      sp.bubble = { text, until: t + 3.2 };
      c.t = 3.2;
    }
  }

  function startConvo(a, b, t) {
    const res = converse(a.brain, b.brain, ctxFor(a));
    if (!res) { a.chatCd = b.chatCd = 30; return; }
    a.state = b.state = 'chat';
    a.dir = b.x < a.x ? -1 : 1; b.dir = -a.dir;
    convos.push({ a, b, lines: res.lines, i: 0, t: 0 });
    const name = id => brains[id].p.short;
    const place = placeName(Math.round(a.x), Math.round(a.y));
    const ja = name(a.id), jb = name(b.id);
    const entry = {
      day: S.day, clock: clockText(), a: a.id, b: b.id, place, gossip: res.gossip,
      lines: res.lines.map(([w, txt]) => name(w) + ': ' + txt),
      rumor: res.gossip
        ? josa(name(res.lines[0][0]) + '[이/가] ' + name(res.lines[1][0]) + '한테 네 얘기를 하던데?')
        : josa(ja + '[와/과] ' + jb + '[이/가] ' + place + '에서 이야기하는 걸 봤어.'),
    };
    S.news.push(entry);
    if (S.news.length > 30) S.news.shift();
    if (res.gossip) {
      toast('👂 ' + josa(name(res.lines[0][0]) + '[이/가] ' + name(res.lines[1][0]) + '에게 당신 이야기를 했어요'));
      $('btnJournal').classList.add('ping');
    }
  }
  function endConvo(c) {
    convos.splice(convos.indexOf(c), 1);
    for (const n of [c.a, c.b]) { if (n.state === 'chat') n.state = 'idle'; n.chatCd = rand(40, 80); }
  }

  // ---------- 자원 ----------
  let spawnClock = 0;
  const CAP = { apple: 8, ore: 5, flower: 4 };
  function spawnItems(force) {
    for (const node of World.resourceNodes) {
      if (!force && Math.random() > 0.35) continue;
      if (S.ground.filter(g => g.item === node.item).length >= CAP[node.item]) continue;
      const near = S.ground.filter(g => Math.abs(g.x - node.x) <= 2 && Math.abs(g.y - node.y) <= 2);
      if (near.length >= (node.area ? 2 : 1)) continue;
      const spots = [];
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const x = node.x + i, y = node.y + j;
        if (World.walkable(x, y) && !S.ground.some(g => g.x === x && g.y === y)) spots.push({ x, y });
      }
      if (!spots.length) continue;
      const s = spots[(Math.random() * spots.length) | 0];
      S.ground.push({ id: S.nextId++, item: node.item, x: s.x, y: s.y });
    }
  }
  function pickup() {
    for (let i = S.ground.length - 1; i >= 0; i--) {
      const g = S.ground[i];
      if (Math.abs(g.x - player.x) < 0.5 && Math.abs(g.y - player.y) < 0.5) {
        S.ground.splice(i, 1);
        inv.add(g.item, 1);
      }
    }
  }

  // ---------- 메인 루프 ----------
  const keys = new Set();
  let saveT = 0;
  function update(dt, t) {
    if (!chatNpc) {
      const allAsleep = npcs.every(n => n.state === 'sleep' || S.follow === n.id);
      const speed = period() === 'night' && allAsleep ? 20 : 4; // 게임 분 / 실제 초
      const before = S.time;
      S.time += dt * speed;
      if (S.time >= 1440) { S.time -= 1440; S.day++; toast('🌅 ' + S.day + '일차 아침이 밝았어요'); }
      spawnClock += S.time - before + (S.time < before ? 1440 : 0);
      if (spawnClock >= 30) { spawnClock = 0; spawnItems(false); }
      S.playTime += dt;
    }
    // 키보드 이동
    if (!chatNpc && !player.path.length && keys.size) {
      const p = tileOf(player);
      let dx = 0, dy = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) dx = -1; else if (keys.has('ArrowRight') || keys.has('d')) dx = 1;
      else if (keys.has('ArrowUp') || keys.has('w')) dy = -1; else if (keys.has('ArrowDown') || keys.has('s')) dy = 1;
      if ((dx || dy) && World.walkable(p.x + dx, p.y + dy)) { player.path = [{ x: p.x + dx, y: p.y + dy }]; player.talkTo = null; }
      if (dx) player.dir = dx;
    }
    const wasMoving = player.path.length > 0;
    moveAlong(player, dt, 4.5);
    pickup();
    if (wasMoving && !player.path.length && player.talkTo) {
      const n = player.talkTo;
      if (dist(n, player) <= 1.8) { player.talkTo = null; openChat(n); }
      else if ((player.talkTries = (player.talkTries || 0) + 1) < 4) approach(n);
      else player.talkTo = null;
    }
    npcs.forEach(n => { updateNpc(n, dt, t); n.brain.tick(dt); });
    if (chatNpc) chatNpc.dir = player.x < chatNpc.x ? -1 : 1;
    updateConvos(dt, t);
    if (tapMarker && (tapMarker.t -= dt * 1.5) <= 0) tapMarker = null;
    updateCamera(dt);
    renderClock();
    if ((saveT += dt) > 5) { saveT = 0; save(); }
  }

  function loop() {
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, t - lastT);
    lastT = t;
    update(dt, t);
    render(t);
    requestAnimationFrame(loop);
  }

  // ---------- 입력 ----------
  function approach(n) {
    const nt = tileOf(n);
    let best = null, bd = Infinity;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = nt.x + dx, y = nt.y + dy;
      if (!World.walkable(x, y)) continue;
      const d = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (d < bd) { bd = d; best = { x, y }; }
    }
    if (best) walkTo(player, best.x, best.y);
    if (!player.path.length && dist(n, player) <= 1.8) { player.talkTo = null; openChat(n); }
  }

  canvas.addEventListener('pointerdown', ev => {
    if (!$('intro').hidden) return;
    if (chatNpc) { closeChat(); return; }
    closePanels();
    const rect = canvas.getBoundingClientRect();
    const wx = (ev.clientX - rect.left) / scale + camX, wy = (ev.clientY - rect.top) / scale + camY;
    let hitN = null, hd = 22;
    for (const n of npcs) {
      const d = Math.hypot(n.x * TILE + 16 - wx, n.y * TILE + 12 - wy);
      if (d < hd) { hd = d; hitN = n; }
    }
    if (hitN) {
      player.talkTries = 0;
      if (dist(hitN, player) <= 1.8) { player.path = []; openChat(hitN); }
      else { player.talkTo = hitN; approach(hitN); }
      return;
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    player.talkTo = null;
    if (walkTo(player, tx, ty)) {
      const end = player.path[player.path.length - 1] || { x: tx, y: ty };
      tapMarker = { x: end.x, y: end.y, t: 1 };
    }
  });

  window.addEventListener('keydown', ev => {
    if (ev.target && ev.target.tagName === 'INPUT') {
      if (ev.key === 'Escape') closeChat();
      return;
    }
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(k)) { keys.add(k); ev.preventDefault(); }
    if ((k === ' ' || k === 'e' || k === 'Enter') && !chatNpc && $('intro').hidden) {
      const n = npcs.filter(n => dist(n, player) <= 1.8).sort((a, b) => dist(a, player) - dist(b, player))[0];
      if (n) { ev.preventDefault(); openChat(n); }
    }
    if (k === 'Escape') { closeChat(); closePanels(); }
  });
  window.addEventListener('keyup', ev => keys.delete(ev.key.length === 1 ? ev.key.toLowerCase() : ev.key));
  window.addEventListener('blur', () => keys.clear());

  // ---------- HUD ----------
  let lastClock = '';
  function renderClock() {
    const txt = S.day + '|' + clockText() + '|' + period();
    if (txt === lastClock) return;
    lastClock = txt;
    $('clockIcon').textContent = PERIOD_ICON[period()];
    $('dayLabel').textContent = S.day + '일차';
    $('clockLabel').textContent = clockText();
  }
  function renderInv() {
    const el = $('inv');
    const parts = Object.keys(ITEMS).filter(k => S.inv[k] > 0 || ['apple', 'ore', 'flower', 'fish'].includes(k))
      .map(k => '<span class="inv-item' + (S.inv[k] ? '' : ' empty') + '" title="' + ITEMS[k].name + '">' + ITEMS[k].emoji + '<b>' + (S.inv[k] || 0) + '</b></span>');
    parts.push('<span class="inv-item coin" title="동전">🪙<b>' + S.coins + '</b></span>');
    el.innerHTML = parts.join('');
  }

  function toast(text) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2400);
    setTimeout(() => el.remove(), 2900);
  }

  // ---------- 대화 ----------
  let chatNpc = null, busy = false, chatToken = 0;
  const log = $('chatLog');

  function openChat(n) {
    if (chatNpc) closeChat();
    closePanels();
    for (const c of convos.slice()) if (c.a === n || c.b === n) endConvo(c);
    chatNpc = n;
    player.path = []; player.talkTo = null;
    if (n.state !== 'sleep') n.state = 'talk';
    n.path = [];
    player.dir = n.x < player.x ? -1 : 1;
    log.innerHTML = '';
    $('giftBar').hidden = true;
    $('chat').hidden = false;
    renderChatHead();
    const res = n.brain.greet(ctxFor(n));
    npcSay(n, res.reply, null);
    renderChips();
  }

  function closeChat() {
    if (!chatNpc) return;
    const n = chatNpc;
    chatNpc = null; chatToken++; busy = false;
    if (n.state === 'talk') n.state = 'idle';
    n.chatCd = Math.max(n.chatCd, 10);
    $('chat').hidden = true;
    $('chatInput').blur();
    save();
  }

  function addMsg(kind, text) {
    const el = document.createElement('div');
    el.className = 'msg ' + kind;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function npcSay(n, draft, userText) {
    const token = ++chatToken;
    busy = true;
    const el = addMsg('npc typing', '');
    el.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    let text = draft;
    const ctx = ctxFor(n);
    if (userText && prefs.ai === 'llm' && LLM.status === 'ready' && n.state !== 'sleep') {
      try {
        text = await LLM.rephrase({ brain: n.brain, userText, draft, ctx }, partial => {
          if (token === chatToken && partial) { el.classList.remove('typing'); el.textContent = partial; log.scrollTop = log.scrollHeight; }
        });
      } catch (e) { text = draft; }
    } else {
      await sleep(260 + Math.min(900, draft.length * 16));
    }
    if (token !== chatToken) return;
    el.classList.remove('typing');
    el.textContent = text;
    log.scrollTop = log.scrollHeight;
    n.bubble = { text, until: performance.now() / 1000 + 4 };
    if (userText) n.brain.addHistory(userText, text);
    busy = false;
    renderChatHead();
    renderChips();
  }

  // 지금 실제로 쓰는 두뇌: 고른 방식을 쓸 수 없으면 규칙 기반으로 돌아간다
  function aiMode() {
    if (prefs.ai === 'claude' && ClaudeAI.available()) return 'claude';
    if (prefs.ai === 'llm' && LLM.status === 'ready') return 'llm';
    return 'rules';
  }

  // Claude가 대사와 게임 행동을 함께 정한다. 실패하면 규칙 기반 AI가 대신 대답한다.
  async function claudeSay(n, userText, note) {
    const token = ++chatToken;
    busy = true;
    const el = addMsg('npc typing', '');
    el.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    const ctx = ctxFor(n);
    let res;
    try {
      res = await ClaudeAI.talk({ brain: n.brain, text: userText, ctx, note }, partial => {
        if (token === chatToken && partial) { el.classList.remove('typing'); el.textContent = partial; log.scrollTop = log.scrollHeight; }
      });
    } catch (e) {
      if (token !== chatToken) return;
      const why = ClaudeAI.explain(e);
      if (note) res = { reply: note };
      else { const r = n.brain.talk(userText, ctx); res = { reply: r.reply, openGift: r.openGift, bye: r.intent === 'bye' }; }
      if (!res.reply) res.reply = '...';
      if (why) addMsg('sys', why);
    }
    if (token !== chatToken) return;
    el.classList.remove('typing');
    el.textContent = res.reply;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    n.bubble = { text: res.reply, until: performance.now() / 1000 + 4 };
    n.brain.addHistory(userText, res.reply);
    busy = false;
    renderChatHead();
    renderChips();
    if (res.openGift) openGiftBar();
    if (res.bye) setTimeout(() => { if (chatNpc === n && !busy) closeChat(); }, 1400);
    save();
  }

  function send(text) {
    text = String(text || '').trim();
    const n = chatNpc;
    if (!n || busy || !text) return;
    $('giftBar').hidden = true;
    addMsg('me', text);
    $('chatInput').value = '';
    if (aiMode() === 'claude' && n.state !== 'sleep') { claudeSay(n, text); return; }
    const res = n.brain.talk(text, ctxFor(n));
    if (res.openGift) {
      openGiftBar();
      addMsg('sys', '무엇을 건넬지 골라 주세요.');
      renderChips();
      return;
    }
    npcSay(n, res.reply, text).then(() => {
      if (res.intent === 'bye' && chatNpc === n) setTimeout(() => { if (chatNpc === n && !busy) closeChat(); }, 1100);
    });
  }

  function openGiftBar() {
    const bar = $('giftBar');
    const have = Object.keys(ITEMS).filter(k => S.inv[k] > 0);
    if (!have.length) {
      bar.hidden = true;
      addMsg('sys', '가진 물건이 없어요. 사과나무 밑, 바위 근처, 꽃밭에서 물건을 주울 수 있어요.');
      return;
    }
    bar.innerHTML = '';
    for (const k of have) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'gift';
      b.textContent = ITEMS[k].emoji + ' ' + ITEMS[k].name + ' ×' + S.inv[k];
      b.addEventListener('click', () => giveItem(k));
      bar.appendChild(b);
    }
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'gift cancel'; x.textContent = '그만두기';
    x.addEventListener('click', () => { bar.hidden = true; });
    bar.appendChild(x);
    bar.hidden = false;
  }

  function giveItem(k) {
    const n = chatNpc;
    if (!n || busy) return;
    $('giftBar').hidden = true;
    const name = ITEMS[k].name;
    const said = josa('(' + ITEMS[k].emoji + ' ' + name + '[을/를] 건넸다)');
    addMsg('me', said);
    const res = n.brain.receiveGift(k, ctxFor(n));
    const what = josa(name + '[을/를] 선물로 건넸다');
    if (aiMode() === 'claude' && n.state !== 'sleep') claudeSay(n, '(' + what + ')', '플레이어가 ' + what + '. 게임 처리 결과로 정해진 반응: "' + res.reply + '" 이 반응의 뜻대로 네 말투로 대답해라.');
    else npcSay(n, res.reply, what);
  }

  function renderChatHead() {
    const n = chatNpc; if (!n) return;
    const b = n.brain, mem = b.s.memory;
    $('chatPortrait').textContent = n.p.emoji;
    $('chatPortrait').style.setProperty('--npc', n.p.color);
    $('chatName').textContent = n.p.name;
    $('chatRole').textContent = n.state === 'sleep' ? '자는 중' : n.p.role;
    $('chatTier').textContent = b.tierLabel();
    $('chatMood').textContent = b.moodEmoji();
    const aff = b.s.affinity;
    const bar = $('chatAff');
    bar.style.left = (aff >= 0 ? 50 : 50 + aff / 2) + '%';
    bar.style.width = Math.abs(aff) / 2 + '%';
    bar.classList.toggle('neg', aff < 0);
    $('chatAffNum').textContent = (aff > 0 ? '+' : '') + aff;
    const known = [];
    known.push(mem.playerName ? '이름 "' + mem.playerName + '"' : '이름 모름');
    if (mem.playerLikes.length) known.push('좋아하는 것 ' + mem.playerLikes.slice(-2).join('·'));
    if (b.s.heard.length) known.push('들은 소문 ' + b.s.heard.length + '건');
    $('chatMemory').textContent = '기억: ' + known.join(' / ');
    $('chatAiBadge').textContent = { claude: 'Claude AI', llm: '기기 속 LLM', rules: '규칙 기반 AI' }[aiMode()];
  }

  function renderChips() {
    const n = chatNpc; if (!n) return;
    const b = n.brain, chips = [];
    if (n.state === 'sleep') chips.push('일어나 봐', '잘 자');
    else if (b.s.pending === 'quest_offer') chips.push('좋아, 할게!', '나중에 할게');
    else if (b.s.pending === 'ask_name') chips.push('비밀이야');
    else {
      const q = b.p.quest, st = b.s.quest.stage;
      if (st === 'active' && !q.target && b.hasNeed(ctxFor(n))) chips.push('부탁한 거 가져왔어!');
      if (st === 'none') chips.push('부탁할 거 있어?');
      chips.push('🎁 선물 주기');
      if (n.id === 'mina') chips.push('생선 살게요', '사과 다 팔게요');
      chips.push('넌 누구야?', '정말 멋져!', '요즘 소문 있어?', '내 이름 기억해?', '뭐 좋아해?', '잘 있어!');
    }
    const box = $('chips');
    box.innerHTML = '';
    for (const c of chips) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'chip'; el.textContent = c;
      el.addEventListener('click', () => (c === '🎁 선물 주기' ? openGiftBar() : send(c)));
      box.appendChild(el);
    }
    $('chatInput').placeholder = b.s.pending === 'ask_name' ? '이름을 알려 주세요' : '하고 싶은 말을 자유롭게 입력하세요';
  }

  $('chatForm').addEventListener('submit', ev => { ev.preventDefault(); send($('chatInput').value); });
  $('chatClose').addEventListener('click', closeChat);

  // 휴대폰 키보드가 올라오면 대화창을 키보드 위로 올린다
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const onVV = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb', kb + 'px');
    };
    vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV);
  }

  // ---------- 패널: 수첩, 설정, 안내 ----------
  function closePanels() { $('journal').hidden = true; $('settings').hidden = true; }
  function togglePanel(id) {
    const el = $(id), was = el.hidden;
    closePanels(); closeChat();
    el.hidden = !was;
    if (!el.hidden && id === 'journal') { $('btnJournal').classList.remove('ping'); renderJournal(); }
    if (!el.hidden && id === 'settings') renderSettings();
  }
  $('btnJournal').addEventListener('click', () => togglePanel('journal'));
  $('btnSettings').addEventListener('click', () => togglePanel('settings'));
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePanels));

  let journalTab = 'quests';
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { journalTab = b.dataset.tab; renderJournal(); }));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function renderJournal() {
    document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === journalTab)));
    const box = $('journalBody');
    if (journalTab === 'quests') {
      const rows = npcs.filter(n => n.brain.s.quest.stage !== 'none').map(n => {
        const q = n.p.quest, st = n.brain.s.quest.stage;
        const [item, need] = Object.entries(q.need)[0];
        const status = st === 'done' ? '<span class="pill ok">완료</span>'
          : st === 'delivered' ? '<span class="pill warn">' + esc(n.p.short) + '에게 알리기</span>'
            : q.target ? '<span class="pill">전달하기</span>'
              : '<span class="pill">' + ITEMS[item].emoji + ' ' + Math.min(S.inv[item] || 0, need) + '/' + need + '</span>';
        return '<li class="row"><span class="face">' + n.p.emoji + '</span><div class="grow"><b>' + esc(q.title) + '</b><p>' + esc(q.desc) + '</p></div>' + status + '</li>';
      });
      box.innerHTML = rows.length ? '<ul class="list">' + rows.join('') + '</ul>'
        : '<p class="empty-note">아직 받은 부탁이 없어요. 주민에게 다가가 "부탁할 거 있어?"라고 물어보세요.</p>';
    } else if (journalTab === 'people') {
      box.innerHTML = '<ul class="list">' + npcs.map(n => {
        const b = n.brain, mem = b.s.memory, a = b.s.affinity;
        const knows = [mem.playerName ? '이름을 앎 (' + esc(mem.playerName) + (mem.nameFrom ? ', 소문으로' : '') + ')' : '이름을 모름'];
        if (mem.playerLikes.length) knows.push('좋아하는 것: ' + esc(mem.playerLikes.join(', ')));
        if (b.s.heard.length) knows.push('들은 소문 ' + b.s.heard.length + '건');
        return '<li class="row"><span class="face">' + n.p.emoji + '</span><div class="grow"><b>' + esc(n.p.name) + '</b> <span class="muted">' + b.tierLabel() + ' ' + b.moodEmoji() + '</span>' +
          '<div class="aff small"><div class="aff-bar"><i class="' + (a < 0 ? 'neg' : '') + '" style="left:' + (a >= 0 ? 50 : 50 + a / 2) + '%;width:' + Math.abs(a) / 2 + '%"></i></div><span class="num">' + (a > 0 ? '+' : '') + a + '</span></div>' +
          '<p>' + knows.join(' · ') + '</p></div></li>';
      }).join('') + '</ul>';
    } else {
      const items = S.news.slice().reverse();
      box.innerHTML = items.length ? '<ul class="news">' + items.map(e =>
        '<li><div class="when">' + e.day + '일차 ' + esc(e.clock) + ' · ' + esc(e.place) + (e.gossip ? ' <span class="pill warn">당신 이야기</span>' : '') + '</div>' +
        e.lines.map(l => '<p>' + esc(l) + '</p>').join('') + '</li>').join('') + '</ul>'
        : '<p class="empty-note">주민들끼리 마주치면 이야기를 나눠요. 그 대화가 여기에 기록돼요.</p>';
    }
  }

  function renderSettings() {
    const sup = LLM.supported();
    document.querySelectorAll('input[name="aiMode"]').forEach(r => { r.checked = r.value === prefs.ai; });
    $('llmBox').hidden = prefs.ai !== 'llm';
    $('claudeNote').textContent = ClaudeAI.available() ? '지금 쓸 수 있어요.'
      : ClaudeAI.disabled ? 'Claude 사용이 허용되지 않아 지금은 규칙 기반 AI로 대화해요.'
        : 'claude.ai에서 열었을 때만 쓸 수 있어요. 지금은 규칙 기반 AI로 대화해요.';
    $('modelSelect').value = prefs.model;
    $('llmSupport').textContent = sup ? '이 브라우저는 WebGPU를 지원해요.' : '이 브라우저는 WebGPU를 지원하지 않아 LLM을 쓸 수 없어요. 규칙 기반 AI로 계속 플레이할 수 있어요.';
    $('btnLoadModel').disabled = !sup || LLM.status === 'loading';
    $('btnLoadModel').textContent = LLM.status === 'ready' ? '불러옴 ✓' : LLM.status === 'loading' ? '내려받는 중…' : '모델 내려받기';
    if (LLM.status === 'error') $('llmStatus').textContent = '불러오지 못했어요: ' + LLM.error;
  }
  document.querySelectorAll('input[name="aiMode"]').forEach(r => r.addEventListener('change', () => {
    prefs.ai = r.value; store(PREF_KEY, prefs); renderSettings();
  }));
  $('modelSelect').addEventListener('change', e => { prefs.model = e.target.value; store(PREF_KEY, prefs); });
  $('btnLoadModel').addEventListener('click', async () => {
    $('llmStatus').textContent = '준비 중…';
    $('llmProgress').hidden = false;
    renderSettings();
    try {
      await LLM.load(prefs.model, (p, text) => {
        $('llmProgress').value = p;
        $('llmStatus').textContent = Math.round(p * 100) + '% · ' + text.slice(0, 80);
      });
      $('llmStatus').textContent = '준비됐어요. 이제 주민들이 기기 속 LLM으로 말해요.';
      toast('🧠 기기 속 LLM 준비 완료');
    } catch (e) {
      $('llmStatus').textContent = '불러오지 못했어요: ' + ((e && e.message) || e);
    }
    $('llmProgress').hidden = LLM.status !== 'loading';
    renderSettings();
  });
  let resetArmed = false;
  $('btnReset').addEventListener('click', () => {
    if (!resetArmed) {
      resetArmed = true;
      $('btnReset').textContent = '한 번 더 누르면 모든 기록이 지워져요';
      setTimeout(() => { resetArmed = false; $('btnReset').textContent = '처음부터 다시 하기'; }, 4000);
      return;
    }
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
    window.removeEventListener('pagehide', save);
    location.reload();
  });

  $('btnStart').addEventListener('click', () => { $('intro').hidden = true; S.introSeen = true; save(); });

  // ---------- 시작 ----------
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  buildBase();
  resize();
  if (!S.ground.length) { spawnItems(true); spawnItems(true); }
  renderInv();
  if (!S.introSeen) $('intro').hidden = false;
  if (prefs.ai === 'llm' && LLM.supported()) {
    // 이미 내려받은 모델은 캐시에서 빠르게 불러온다
    LLM.load(prefs.model).then(() => toast('🧠 기기 속 LLM 준비 완료')).catch(() => { /* 설정에서 다시 시도 */ });
  }
  ClaudeAI.init().then(ok => { if (ok) { renderChatHead(); if (!$('settings').hidden) renderSettings(); } });
  requestAnimationFrame(loop);

  // 테스트와 디버깅용
  window.__village = { S, npcs, player, brains, openChat, send, closeChat, save };
})();
