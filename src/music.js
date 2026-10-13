/* 합주팡 — 음악 엔진
 * 모든 소리는 Web Audio API로 합성한다(샘플 파일 없음).
 * 120 BPM, 16분음표 = 0.125초, 1마디 = 2초, 4마디 = 8초.
 * 모든 악기는 하나의 지휘(공용 박자)를 따르고, 새 악기는 항상 다음 4마디 묶음의 첫 박에 함께 들어간다.
 */
(function () {
  'use strict';

  const BPM = 120;
  const STEP = 60 / BPM / 4;          // 16분음표 길이(초)
  const LOOKAHEAD = 0.15;             // 미리 예약하는 시간(초)
  const CHORDS = [                    // 마디별 화음: C - Am - F - G
    { root: 48, tones: [60, 64, 67, 72] },
    { root: 45, tones: [57, 60, 64, 69] },
    { root: 41, tones: [53, 57, 60, 65] },
    { root: 43, tones: [55, 59, 62, 67] },
  ];

  let ctx = null, master = null, reverbIn = null, noiseBuf = null;
  let t0 = 0, nextStep = 0, timer = null, muted = false, running = false;
  const buses = [];
  const active = {};                  // tier -> { from, until }
  let hitListener = null;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- 기본 소리 블록 ---------- */

  function makeNoise() {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // 짧게 울리고 사라지는 엔벨로프
  function perc(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // 필터를 거친 노이즈 한 방
  function noise(out, t, o) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.value = o.f || 1000;
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    perc(g, t, o.v, o.a || 0.001, o.d);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + (o.a || 0.001) + o.d + 0.05);
  }

  // 음정이 있는 짧은 타격음(필요하면 음높이가 미끄러짐)
  function tone(out, t, o) {
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || 0.08));
    const g = ctx.createGain();
    perc(g, t, o.v, o.a || 0.002, o.d);
    osc.connect(g); g.connect(out);
    osc.start(t);
    osc.stop(t + (o.a || 0.002) + o.d + 0.05);
  }

  // 808 하이햇 방식의 금속성 소리(사각파 여러 개를 섞음)
  const METAL = [2, 3, 4.16, 5.43, 6.79, 8.21];
  function metal(out, t, o) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = o.hp || 7000;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = o.bp || 10000; bp.Q.value = 0.6;
    const g = ctx.createGain();
    perc(g, t, o.v, o.a || 0.002, o.d);
    bp.connect(hp); hp.connect(g); g.connect(out);
    const base = o.base || 40;
    for (const r of METAL) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = base * r;
      osc.connect(bp);
      osc.start(t);
      osc.stop(t + o.d + 0.1);
    }
  }

  // 지속음(피리, 색소폰). 비브라토와 어택/릴리스를 가진다.
  function sustained(out, t, dur, o) {
    const freq = midi(o.note);
    const g = ctx.createGain();
    const a = o.a || 0.04, r = Math.min(o.r || 0.08, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.v, t + a);
    g.gain.setValueAtTime(o.v * (o.sustain || 0.85), t + Math.max(a, dur - r));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vibRate || 5.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.linearRampToValueAtTime(freq * (o.vib || 0.008), t + Math.min(0.3, dur));
    lfo.connect(lfoGain);

    let last = g;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = Math.min(freq * o.filter, 9000);
      f.Q.value = o.q || 1;
      f.connect(g);
      last = f;
    }
    for (const layer of o.layers) {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(freq * (layer.mul || 1) * (o.scoop ? 0.97 : 1), t);
      if (o.scoop) osc.frequency.exponentialRampToValueAtTime(freq * (layer.mul || 1), t + 0.06);
      lfoGain.connect(osc.frequency);
      const lg = ctx.createGain();
      lg.gain.value = layer.v;
      osc.connect(lg); lg.connect(last);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
    lfo.start(t); lfo.stop(t + dur + 0.05);
    g.connect(out);

    if (o.breath) noise(out, t, { type: 'bandpass', f: freq * 2, q: 2, v: o.breath, a: 0.02, d: Math.min(dur, 0.25) });
  }

  // 피아노 한 음
  function pianoNote(out, t, note, v, len) {
    const f = midi(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(f * 8, 7000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 600), t + len + 0.6);
    lp.connect(g); g.connect(out);
    const parts = [['triangle', 1, 0.9, 0], ['sine', 2, 0.25, 3], ['sine', 1, 0.5, -4], ['sine', 3, 0.08, 0]];
    for (const [type, mul, gv, det] of parts) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * mul;
      osc.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = gv;
      osc.connect(og); og.connect(lp);
      osc.start(t); osc.stop(t + len + 1);
    }
  }

  /* ---------- 악기별 연주 패턴 ----------
   * play(out, t, s, bar, rel) : s = 마디 안의 16분음표 위치(0-15), bar = 전체 마디 번호, rel = 이 악기가 합류한 뒤 지난 마디 수
   * 소리를 냈으면 true 를 돌려준다(화면 효과용).
   */
  const N = (list) => { const m = {}; for (const [s, n, l] of list) m[s] = [n, l]; return m; };

  const FLUTE = [
    N([[0, 79, 6], [6, 84, 2], [8, 83, 4], [12, 79, 4]]),
    N([[0, 81, 8], [8, 76, 4], [12, 79, 4]]),
    N([[0, 77, 6], [6, 81, 2], [8, 84, 8]]),
    N([[0, 83, 4], [4, 81, 4], [8, 79, 8]]),
  ];
  const BASS = [
    [36, 40, 43, 44],
    [45, 43, 40, 42],
    [41, 45, 48, 42],
    [43, 47, 50, 35],
  ];
  const SAX = [
    N([[2, 67, 2], [4, 70, 1], [5, 72, 3], [10, 67, 2], [12, 64, 4]]),
    N([[2, 69, 2], [4, 72, 2], [6, 76, 4], [12, 74, 2], [14, 72, 2]]),
    N([[2, 65, 2], [4, 69, 2], [6, 72, 2], [8, 75, 1], [9, 76, 3], [12, 72, 4]]),
    N([[0, 71, 2], [2, 74, 2], [4, 77, 4], [10, 74, 2], [12, 71, 4]]),
  ];
  // 피아노 멜로디는 8마디(16초)짜리
  const PIANO = [
    N([[0, 76, 4], [4, 79, 2], [6, 76, 2], [8, 72, 4], [12, 74, 2], [14, 76, 2]]),
    N([[0, 72, 4], [4, 69, 4], [8, 72, 2], [10, 76, 2], [12, 81, 4]]),
    N([[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 77, 2], [8, 81, 4], [12, 77, 4]]),
    N([[0, 74, 4], [4, 71, 2], [6, 74, 2], [8, 79, 8]]),
    N([[0, 84, 4], [4, 83, 2], [6, 81, 2], [8, 79, 4], [12, 76, 4]]),
    N([[0, 81, 4], [4, 79, 2], [6, 76, 2], [8, 72, 4], [12, 76, 4]]),
    N([[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 69, 4], [12, 74, 2], [14, 77, 2]]),
    N([[0, 79, 4], [4, 74, 4], [8, 71, 2], [10, 74, 2], [12, 72, 4]]),
  ];

  const PATTERNS = [
    // 0 캐스터네츠: 탁탁 튀는 16분음표
    { vol: 0.55, rev: 0.1, play(out, t, s) {
      const v = [1, 0, 0.5, 0.7, 0, 0, 0.9, 0, 0.6, 0, 0.8, 0.5, 0, 0, 0.9, 0][s];
      if (!v) return false;
      noise(out, t, { type: 'bandpass', f: 2600, q: 4, v: v * 0.9, d: 0.035 });
      tone(out, t, { type: 'triangle', f: 1300, v: v * 0.25, d: 0.025 });
      return true;
    } },
    // 1 마라카스: 쉬지 않는 셰이크
    { vol: 0.4, rev: 0.1, play(out, t, s) {
      const v = [0.5, 0.25, 0.9, 0.3][s % 4];
      noise(out, t, { type: 'highpass', f: 6500, q: 0.7, v, a: 0.012, d: 0.05 });
      return s % 2 === 0;
    } },
    // 2 트라이앵글: 마디 첫 박에 땡-
    { vol: 0.3, rev: 0.35, play(out, t, s) {
      if (s !== 0 && s !== 10) return false;
      const v = s === 0 ? 1 : 0.45;
      tone(out, t, { f: 1820, v: v * 0.5, d: 1.4 });
      tone(out, t, { f: 2950, v: v * 0.3, d: 1.0 });
      tone(out, t, { f: 4330, v: v * 0.18, d: 0.7 });
      return true;
    } },
    // 3 탬버린: 2·4박 찰랑
    { vol: 0.35, rev: 0.2, play(out, t, s) {
      const v = { 4: 1, 12: 1, 14: 0.4, 7: 0.3 }[s];
      if (!v) return false;
      for (let i = 0; i < 3; i++) noise(out, t + i * 0.011, { type: 'highpass', f: 7500, q: 1, v: v * (0.7 - i * 0.18), d: 0.12 });
      noise(out, t, { type: 'bandpass', f: 9500, q: 8, v: v * 0.5, d: 0.2 });
      return true;
    } },
    // 4 작은북: 백비트와 고스트 노트, 마지막 마디에 필인
    { vol: 0.55, rev: 0.2, play(out, t, s, bar) {
      let v = { 4: 1, 12: 1, 7: 0.25, 15: 0.3 }[s];
      if (bar % 4 === 3 && s >= 12) v = 0.55 + (s - 12) * 0.15;
      if (!v) return false;
      noise(out, t, { type: 'bandpass', f: 1900, q: 0.7, v: v * 0.9, d: 0.17 });
      tone(out, t, { type: 'triangle', f: 210, f2: 160, v: v * 0.6, d: 0.1 });
      return true;
    } },
    // 5 심벌즈: 두 마디마다 크래시, 사이사이 라이드
    { vol: 0.28, rev: 0.3, play(out, t, s, bar) {
      if (s === 0 && bar % 2 === 0) {
        metal(out, t, { v: 0.9, d: 1.8, hp: 5000, bp: 8000, base: 47 });
        noise(out, t, { type: 'highpass', f: 6000, q: 0.5, v: 0.5, d: 1.6 });
        return true;
      }
      if (s % 4 === 2 || s === 8) {
        metal(out, t, { v: s === 8 ? 0.35 : 0.25, d: 0.3, hp: 8000, bp: 11000 });
        return true;
      }
      return false;
    } },
    // 6 드럼: 쿵 쿵 큰북과 탐 필인
    { vol: 0.9, rev: 0.08, play(out, t, s, bar) {
      if (bar % 4 === 3 && s >= 12) {
        const f = [220, 180, 140, 110][s - 12];
        tone(out, t, { f, f2: f * 0.6, slide: 0.15, v: 0.7, d: 0.3 });
        return true;
      }
      const v = { 0: 1, 6: 0.7, 8: 0.95, 11: 0.5 }[s];
      if (!v) return false;
      tone(out, t, { f: 150, f2: 45, slide: 0.12, v, d: 0.38 });
      noise(out, t, { type: 'lowpass', f: 1200, v: v * 0.25, d: 0.02 });
      return true;
    } },
    // 7 피리: 높고 길게 흐르는 대선율
    { vol: 0.2, rev: 0.4, play(out, t, s, bar) {
      const n = FLUTE[bar % 4][s];
      if (!n) return false;
      sustained(out, t, n[1] * STEP * 0.95, {
        note: n[0], v: 0.9, a: 0.06, r: 0.12, vib: 0.006, vibRate: 5.2, breath: 0.12,
        layers: [{ type: 'sine', v: 1 }, { type: 'triangle', mul: 2, v: 0.08 }],
      });
      return true;
    } },
    // 8 콘트라베이스: 4분음표 워킹 베이스
    { vol: 0.75, rev: 0.12, play(out, t, s, bar) {
      if (s % 4 !== 0) return false;
      const note = BASS[bar % 4][s / 4];
      const f = midi(note);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(f * 6, t);
      lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.35);
      lp.connect(out);
      tone(lp, t, { type: 'triangle', f, v: 0.8, a: 0.006, d: 0.45 });
      tone(lp, t, { type: 'sawtooth', f, v: 0.25, a: 0.006, d: 0.3 });
      return true;
    } },
    // 9 색소폰: 블루스 느낌의 싱코페이션 리프
    { vol: 0.16, rev: 0.3, play(out, t, s, bar) {
      const n = SAX[bar % 4][s];
      if (!n) return false;
      sustained(out, t, n[1] * STEP * 0.92, {
        note: n[0], v: 0.9, a: 0.03, r: 0.06, vib: 0.01, vibRate: 5.8, scoop: true, filter: 5, q: 3,
        layers: [{ type: 'sawtooth', v: 0.8 }, { type: 'square', v: 0.2 }],
      });
      return true;
    } },
    // 10 피아노: 왼손 화음 + 오른손 8마디(16초) 멜로디. 멜로디는 피아노가 합류한 마디부터 첫 음으로 시작한다.
    { vol: 0.32, rev: 0.35, play(out, t, s, bar, rel) {
      let hit = false;
      const ch = CHORDS[bar % 4];
      if (s === 0 || s === 6 || s === 10) {
        const v = s === 0 ? 0.32 : 0.2;
        if (s === 0) pianoNote(out, t, ch.root, 0.5, STEP * 6);
        for (const n of ch.tones.slice(0, 3)) pianoNote(out, t, n, v, STEP * 3);
        hit = true;
      }
      const m = PIANO[rel % 8][s];
      if (m) { pianoNote(out, t, m[0], 0.6, m[1] * STEP); hit = true; }
      return hit;
    } },
  ];

  /* ---------- 스케줄러 ----------
   * 합주는 4마디(8초)짜리 '소절 묶음'을 단위로 돈다.
   * 새 악기는 언제 생기든 다음 소절 묶음의 첫 박에 다 같이 들어가고, 소절 묶음이 끝나는 순간에 멈춘다.
   * 그래서 모든 악기의 연주 시작점이 항상 같다.
   * 아무 악기도 연주하지 않을 때 새 악기가 오면, 그 순간을 첫 박으로 삼아 지휘를 새로 시작한다.
   */
  const CYCLE_STEPS = 64;
  const CYCLE = CYCLE_STEPS * STEP;   // 8초
  const BAR = 16 * STEP;              // 2초

  function schedule() {
    if (!ctx || !running) return;
    const now = ctx.currentTime;
    while (t0 + nextStep * STEP < now + LOOKAHEAD) {
      const t = t0 + nextStep * STEP;
      if (t >= now - 0.02) {
        const s = nextStep % 16, bar = Math.floor(nextStep / 16);
        for (let i = 0; i < PATTERNS.length; i++) {
          const a = active[i];
          if (!a || t < a.from - 1e-4 || t >= a.until - 1e-4) continue;
          const rel = bar - Math.round((a.from - t0) / BAR);
          if (PATTERNS[i].play(buses[i], t, s, bar, rel) && hitListener) hitListener(i, t, s);
        }
      }
      nextStep++;
    }
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    noiseBuf = makeNoise();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(comp); comp.connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(2.2, 3);
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 0.9;
    reverbIn.connect(conv); conv.connect(master);

    PATTERNS.forEach((p, i) => {
      const g = ctx.createGain();
      g.gain.value = p.vol;
      g.connect(master);
      const send = ctx.createGain();
      send.gain.value = p.rev;
      g.connect(send); send.connect(reverbIn);
      buses[i] = g;
    });

    timer = setInterval(schedule, 25);
  }

  // 연주 중이거나 합류를 기다리는 악기가 하나라도 있는가
  function busy(now) {
    for (const k in active) if (active[k].until > now) return true;
    return false;
  }

  // 지금 이후 가장 가까운 소절 묶음의 첫 박
  function nextDownbeat(now) {
    const k = Math.ceil((now + 0.03 - t0) / CYCLE);
    return t0 + Math.max(0, k) * CYCLE;
  }

  // 악기를 연주 목록에 올린다. seconds 는 8의 배수(소절 묶음 단위).
  // 같은 악기가 이미 이어서 연주 중이면 끝나는 시간만 늘어난다.
  // 돌려주는 값: 이 악기 소리가 들리기 시작할 때까지 남은 초(이미 연주 중이면 0)
  function trigger(tier, seconds) {
    if (!ctx) return;
    const now = ctx.currentTime;
    let start;
    if (!running || !busy(now)) {
      // 무대가 조용하면 지금이 첫 박
      t0 = now + 0.06;
      nextStep = 0;
      running = true;
      for (const k in active) delete active[k];
      start = t0;
    } else {
      start = nextDownbeat(now);
    }
    const len = Math.max(1, Math.round(seconds / CYCLE)) * CYCLE;
    const a = active[tier];
    if (a && a.until >= start - 1e-3) {
      // 이미 연주(또는 대기) 중이면 끊지 않고 끝나는 시간만 늘린다
      a.until = Math.max(a.until, start + len);
      schedule();
      return Math.max(0, a.from - now);
    }
    active[tier] = { from: start, until: start + len };
    schedule();
    return start - now;
  }

  // 악기 상태: playing(연주 중) / waiting(다음 첫 박을 기다림), rem = 남은 연주 비율, wait = 합류까지 남은 초
  function status(tier) {
    const a = active[tier];
    if (!ctx || !a) return null;
    const now = ctx.currentTime;
    if (a.until <= now) return null;
    if (now < a.from) return { waiting: true, wait: a.from - now, rem: 1 };
    return { playing: true, rem: (a.until - now) / (a.until - a.from) };
  }

  // 지휘 정보: 소절 묶음 안의 위치
  function conductor() {
    if (!ctx || !running) return null;
    const now = ctx.currentTime;
    if (now < t0 || !busy(now)) return null;
    const pos = (now - t0) % CYCLE;
    return { bar: Math.floor(pos / BAR), beat: Math.floor((pos % BAR) / (STEP * 4)), toNext: CYCLE - pos };
  }

  function stopAll() {
    for (const k in active) delete active[k];
    running = false;
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
  }

  window.Music = {
    init, trigger, status, conductor, stopAll, setMuted,
    isMuted: () => muted,
    now: () => (ctx ? ctx.currentTime : 0),
    onHit: (fn) => { hitListener = fn; },
    STEP, CYCLE,
  };
})();
