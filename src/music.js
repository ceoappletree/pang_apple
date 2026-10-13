/* 합주팡 — 음악 엔진
 * 모든 소리는 Web Audio API로 합성한다(샘플 파일 없음).
 *
 * 지휘 규칙
 * - 4마디가 한 소절 묶음이다(오케스트라 120 BPM에서 8초).
 * - 판 위에 있는 악기는 판에 남아 있는 동안 쉬지 않고 계속 연주한다.
 * - 새 악기는 다음 소절 묶음의 첫 박에 다른 악기들과 같은 순간에 들어간다.
 *   무대가 조용할 때 온 악기는 그 순간을 첫 박으로 삼아 바로 시작한다.
 * - 판에서 사라진 악기는 다음 마디가 시작될 때 멈춘다.
 * - 같은 악기가 k개 있으면 한 소절 묶음마다 차례로 변주 A, B, C, D… 를 이어서 연주한다.
 *   그래서 2개면 2배, 3개면 3배 길이의 리듬이나 멜로디가 된다(피아노 같은 주선율은 묶음 2개가 한 변주).
 */
(function () {
  'use strict';

  const LOOKAHEAD = 0.15;             // 미리 예약하는 시간(초)

  let ctx = null, master = null, reverbIn = null, noiseBuf = null, timer = null, muted = false;
  let song = null, STEP = 0.125, BAR = 2, CYCLE = 8;
  let t0 = 0, nextStep = 0, running = false;
  let buses = [];
  let counts = [];
  const active = {};                  // tier -> { fromStep, from, until, phrase, slot, k }
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


  // 리듬이나 소리를 아주 짧게 합성하는 신스 플럭(아르페지오, 신스 베이스, 플럭)
  function synthPluck(out, t, o) {
    const f = midi(o.note);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = o.q || 4;
    lp.frequency.setValueAtTime(Math.min(f * (o.open || 8), 12000), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * (o.close || 1.2), 80), t + (o.sweep || 0.2));
    const g = ctx.createGain();
    const d = o.d;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    lp.connect(g); g.connect(out);
    for (const [type, mul, det, gv] of o.layers) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * mul;
      if (o.bend) {
        // 줄을 눌러 음을 밀어 올린다(구정, 시타르의 미끄러짐)
        osc.frequency.setValueAtTime(f * mul * Math.pow(2, -o.bend / 12), t);
        osc.frequency.exponentialRampToValueAtTime(f * mul, t + (o.bendTime || 0.1));
      }
      osc.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = gv;
      osc.connect(og); og.connect(lp);
      osc.start(t); osc.stop(t + d + 0.05);
    }
  }

  // 여러 사인파 부분음을 겹친 종소리(징, 사원 종, 만지라)
  function bell(out, t, partials, v, d) {
    for (const [f, gv, dm] of partials) tone(out, t, { f, v: v * gv, a: 0.003, d: d * (dm || 1) });
  }

  // 고양이 목소리: 톱니파를 모음 포먼트 필터 3개에 통과시킨다
  const VOWELS = {
    a: [850, 1300, 2700], i: [330, 2500, 3200], u: [380, 850, 2400],
    o: [500, 900, 2700], e: [500, 2100, 2800], n: [280, 1600, 2700],
  };
  const CAT = 1.18;   // 고양이는 성도가 짧아서 포먼트가 조금 높다
  function catVoice(out, t, dur, o) {
    const f = midi(o.note);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * (o.scoop || 1), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.09, dur * 0.4));
    if (o.fall) {
      osc.frequency.setValueAtTime(f, t + dur * 0.7);
      osc.frequency.exponentialRampToValueAtTime(f * o.fall, t + dur);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vibRate || 5.8;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * (o.vib || 0.012), t + Math.min(0.35, dur));
    lfo.connect(lg); lg.connect(osc.frequency);

    const g = ctx.createGain();
    const a = o.a || 0.03;
    if (o.pluck) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.v, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    } else {
      const r = Math.min(o.r || 0.08, dur * 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.v, t + a);
      g.gain.setValueAtTime(o.v * 0.85, t + Math.max(a, dur - r));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    }
    const gains = [1, 0.55, 0.22], qs = [7, 11, 13];
    for (let k = 0; k < 3; k++) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = qs[k];
      const keys = o.vowels;
      bp.frequency.setValueAtTime(VOWELS[keys[0][1]][k] * CAT, t);
      for (const [at, v] of keys.slice(1)) bp.frequency.linearRampToValueAtTime(VOWELS[v][k] * CAT, t + dur * at);
      const fg = ctx.createGain();
      fg.gain.value = gains[k] * 3;
      osc.connect(bp); bp.connect(fg); fg.connect(g);
    }
    g.connect(out);
    osc.start(t); osc.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
  }

  /* ---------- 악기 소리 ----------
   * 리듬 악기: (out, t, { v, s, fill })
   * 선율 악기: (out, t, { note, len, v })   len 은 초
   */
  const VOICES = {
    // 오케스트라
    castanets(out, t, o) {
      noise(out, t, { type: 'bandpass', f: 2600, q: 4, v: o.v * 0.9, d: 0.035 });
      tone(out, t, { type: 'triangle', f: 1300, v: o.v * 0.25, d: 0.025 });
    },
    triangle(out, t, o) {
      tone(out, t, { f: 1820, v: o.v * 0.5, d: 1.4 });
      tone(out, t, { f: 2950, v: o.v * 0.3, d: 1.0 });
      tone(out, t, { f: 4330, v: o.v * 0.18, d: 0.7 });
    },
    tambourine(out, t, o) {
      for (let i = 0; i < 3; i++) noise(out, t + i * 0.011, { type: 'highpass', f: 7500, q: 1, v: o.v * (0.7 - i * 0.18), d: 0.12 });
      noise(out, t, { type: 'bandpass', f: 9500, q: 8, v: o.v * 0.5, d: 0.2 });
    },
    snare(out, t, o) {
      noise(out, t, { type: 'bandpass', f: 1900, q: 0.7, v: o.v * 0.9, d: 0.17 });
      tone(out, t, { type: 'triangle', f: 210, f2: 160, v: o.v * 0.6, d: 0.1 });
    },
    cymbal(out, t, o) {
      if (o.v > 0.85) {
        metal(out, t, { v: 0.9, d: 1.8, hp: 5000, bp: 8000, base: 47 });
        noise(out, t, { type: 'highpass', f: 6000, q: 0.5, v: 0.5, d: 1.6 });
      } else metal(out, t, { v: o.v * 0.6, d: 0.3, hp: 8000, bp: 11000 });
    },
    bassdrum(out, t, o) {
      if (o.fill && o.s >= 12) {
        const f = [220, 180, 140, 110][o.s - 12];
        tone(out, t, { f, f2: f * 0.6, slide: 0.15, v: o.v * 0.75, d: 0.3 });
        return;
      }
      tone(out, t, { f: 150, f2: 45, slide: 0.12, v: o.v, d: 0.38 });
      noise(out, t, { type: 'lowpass', f: 1200, v: o.v * 0.25, d: 0.02 });
    },
    flute(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.06, r: 0.12, vib: 0.006, vibRate: 5.2, breath: 0.12,
        layers: [{ type: 'sine', v: 1 }, { type: 'triangle', mul: 2, v: 0.08 }],
      });
    },
    violin(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: Math.min(0.15, o.len * 0.3), r: 0.15, vib: 0.007, vibRate: 5.6, filter: 6, q: 1.5,
        layers: [{ type: 'sawtooth', v: 0.7 }, { type: 'sawtooth', mul: 1.004, v: 0.5 }],
      });
    },
    pizz(out, t, o) {
      const f = midi(o.note);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(f * 6, t);
      lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.35);
      lp.connect(out);
      const d = Math.min(0.9, Math.max(0.3, o.len));
      tone(lp, t, { type: 'triangle', f, v: 0.8, a: 0.006, d });
      tone(lp, t, { type: 'sawtooth', f, v: 0.25, a: 0.006, d: d * 0.6 });
    },
    sax(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.03, r: 0.06, vib: 0.01, vibRate: 5.8, scoop: true, filter: 5, q: 3,
        layers: [{ type: 'sawtooth', v: 0.8 }, { type: 'square', v: 0.2 }],
      });
    },
    piano(out, t, o) { pianoNote(out, t, o.note, o.v || 0.6, o.len); },

    // 일렉트로
    hihat(out, t, o) { metal(out, t, { v: o.v * 0.7, d: o.v > 0.9 ? 0.09 : 0.045, hp: 9000, bp: 11000 }); },
    cowbell(out, t, o) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.5;
      bp.connect(out);
      tone(bp, t, { type: 'square', f: 545, v: o.v * 0.6, d: 0.28 });
      tone(bp, t, { type: 'square', f: 815, v: o.v * 0.5, d: 0.22 });
    },
    clap(out, t, o) {
      for (let i = 0; i < 3; i++) noise(out, t + i * 0.011, { type: 'bandpass', f: 1150, q: 1.4, v: o.v * 0.8, d: 0.018 });
      noise(out, t + 0.033, { type: 'bandpass', f: 1150, q: 1.1, v: o.v * 0.7, d: 0.2 });
    },
    esnare(out, t, o) {
      noise(out, t, { type: 'highpass', f: 1800, q: 0.7, v: o.v * 0.8, d: 0.16 });
      tone(out, t, { type: 'triangle', f: 240, f2: 180, v: o.v * 0.6, d: 0.1 });
    },
    ecrash(out, t, o) {
      if (o.v > 0.85) {
        metal(out, t, { v: 0.8, d: 1.6, hp: 5500, bp: 9000, base: 45 });
        noise(out, t, { type: 'highpass', f: 7000, q: 0.5, v: 0.45, d: 1.4 });
      } else metal(out, t, { v: o.v * 0.8, d: 0.22, hp: 8000, bp: 10000 });
    },
    kick808(out, t, o) {
      tone(out, t, { f: 165, f2: 42, slide: 0.11, v: o.v, d: 0.5 });
      noise(out, t, { type: 'lowpass', f: 3000, v: o.v * 0.2, d: 0.012 });
    },
    arp(out, t, o) {
      synthPluck(out, t, { note: o.note, v: 0.7, d: Math.max(0.12, o.len * 1.2), open: 10, close: 1.5, sweep: 0.12, q: 6,
        layers: [['square', 1, 0, 0.6], ['sawtooth', 1, 7, 0.4]] });
    },
    spad(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.8, a: Math.min(0.3, o.len * 0.3), r: Math.min(0.3, o.len * 0.3), vib: 0.002, vibRate: 0.8, filter: 3, q: 1,
        layers: [{ type: 'sawtooth', v: 0.6 }, { type: 'sawtooth', mul: 1.006, v: 0.6 }, { type: 'sawtooth', mul: 0.995, v: 0.5 }],
      });
    },
    sbass(out, t, o) {
      synthPluck(out, t, { note: o.note, v: 0.8, d: Math.max(0.15, o.len * 0.95), open: 7, close: 1.4, sweep: 0.18, q: 5,
        layers: [['sawtooth', 1, 0, 0.6], ['square', 0.5, 0, 0.6]] });
    },
    pluck(out, t, o) {
      const opts = { note: o.note, v: 0.8, d: 0.35, open: 14, close: 1.2, sweep: 0.15, q: 3,
        layers: [['sawtooth', 1, -6, 0.5], ['sawtooth', 1, 6, 0.5]] };
      synthPluck(out, t, opts);
      synthPluck(out, t + STEP * 3, Object.assign({}, opts, { v: 0.28 }));   // 점8분 메아리
    },
    lead(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.02, r: 0.08, vib: 0.006, vibRate: 5.5, filter: 6, q: 2,
        layers: [{ type: 'sawtooth', v: 0.5 }, { type: 'sawtooth', mul: 1.007, v: 0.45 }, { type: 'sawtooth', mul: 0.993, v: 0.45 }, { type: 'square', mul: 0.5, v: 0.25 }],
      });
    },

    // 고양이 아카펠라
    tsk(out, t, o) { noise(out, t, { type: 'bandpass', f: 7000, q: 1.6, v: o.v * 0.9, d: o.v > 0.9 ? 0.09 : 0.03 }); },
    purr(out, t, o) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'bandpass'; lp.frequency.value = 160; lp.Q.value = 0.8;
      const am = ctx.createGain();
      am.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 26;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG); lfoG.connect(am.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.v * 2.2, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      src.connect(lp); lp.connect(am); am.connect(g); g.connect(out);
      src.start(t, Math.random()); src.stop(t + 0.55);
      lfo.start(t); lfo.stop(t + 0.55);
    },
    click(out, t, o) {
      tone(out, t, { f: 1250, f2: 650, slide: 0.025, v: o.v * 0.8, d: 0.035 });
      noise(out, t, { type: 'bandpass', f: 2500, q: 2, v: o.v * 0.3, d: 0.015 });
    },
    kah(out, t, o) {
      noise(out, t, { type: 'bandpass', f: 1800, q: 1.2, v: o.v * 0.8, d: 0.11 });
      catVoice(out, t + 0.015, 0.09, { note: 62, v: o.v * 0.25, a: 0.01, pluck: true, vowels: [[0, 'a']] });
    },
    hiss(out, t, o) {
      if (o.v > 0.85) noise(out, t, { type: 'bandpass', f: 4800, q: 1, v: 0.6, a: 0.04, d: 0.55 });
      else noise(out, t, { type: 'highpass', f: 6000, q: 0.7, v: o.v * 0.7, a: 0.01, d: 0.1 });
    },
    boom(out, t, o) {
      tone(out, t, { f: 130, f2: 50, slide: 0.1, v: o.v * 0.95, d: 0.32 });
      catVoice(out, t, 0.12, { note: 43, v: o.v * 0.25, a: 0.005, pluck: true, vowels: [[0, 'u']] });
    },
    oo(out, t, o) {
      catVoice(out, t, o.len, { note: o.note, v: 0.8, a: 0.08, r: 0.15, vib: 0.01, vowels: [[0, 'u'], [0.6, 'o']] });
    },
    ah(out, t, o) {
      catVoice(out, t, o.len, { note: o.note, v: 0.7, a: 0.1, r: 0.15, vib: 0.008, vowels: [[0, 'a'], [1, 'a']] });
    },
    doom(out, t, o) {
      catVoice(out, t, Math.min(0.5, Math.max(0.2, o.len)), { note: o.note + 12, v: 0.9, a: 0.01, pluck: true, vib: 0.004, vowels: [[0, 'u'], [0.5, 'o']] });
    },
    nya(out, t, o) {
      catVoice(out, t, Math.max(0.12, o.len * 0.9), { note: o.note, v: 0.8, a: 0.02, r: 0.05, scoop: 0.94, vowels: [[0, 'n'], [0.2, 'a'], [1, 'a']] });
    },
    meow(out, t, o) {
      catVoice(out, t, o.len, { note: o.note, v: 0.85, a: 0.04, r: 0.1, scoop: 0.9, fall: o.len > 0.4 ? 0.93 : 0, vib: 0.014,
        vowels: [[0, 'i'], [0.25, 'a'], [0.8, 'a'], [1, 'u']] });
    },

    // 중국풍
    woodblock(out, t, o) {
      tone(out, t, { f: 1150, f2: 980, slide: 0.03, v: o.v * 0.8, d: 0.07 });
      noise(out, t, { type: 'bandpass', f: 1600, q: 3, v: o.v * 0.25, d: 0.02 });
    },
    bo(out, t, o) {
      metal(out, t, { v: o.v * 0.8, d: o.v > 0.85 ? 0.7 : 0.35, hp: 4500, bp: 7000, base: 52 });
      bell(out, t, [[1480, 0.25], [2210, 0.15]], o.v, 0.4);
    },
    paiban(out, t, o) {
      noise(out, t, { type: 'bandpass', f: 2300, q: 3, v: o.v * 0.9, d: 0.03 });
      noise(out, t + 0.012, { type: 'bandpass', f: 1800, q: 3, v: o.v * 0.6, d: 0.03 });
      tone(out, t, { type: 'triangle', f: 760, v: o.v * 0.3, d: 0.03 });
    },
    bangu(out, t, o) {
      tone(out, t, { type: 'triangle', f: 430, f2: 380, slide: 0.05, v: o.v * 0.7, d: 0.08 });
      noise(out, t, { type: 'bandpass', f: 3200, q: 1.5, v: o.v * 0.4, d: 0.03 });
    },
    gong(out, t, o) {
      if (o.v > 0.85) {
        bell(out, t, [[98, 0.6, 1], [147, 0.4, 0.9], [196, 0.3, 0.8], [261, 0.2, 0.6], [339, 0.12, 0.5]], 1, 2.6);
        noise(out, t, { type: 'lowpass', f: 500, v: 0.25, a: 0.02, d: 0.8 });
      } else {
        // 경극의 작은 징: 치고 나서 음이 올라간다
        tone(out, t, { type: 'triangle', f: 520, f2: 690, slide: 0.25, v: o.v * 0.6, d: 0.6 });
        metal(out, t, { v: o.v * 0.25, d: 0.3, hp: 3500, bp: 6000, base: 60 });
      }
    },
    dagu(out, t, o) {
      tone(out, t, { f: 115, f2: 62, slide: 0.15, v: o.v, d: 0.55 });
      noise(out, t, { type: 'lowpass', f: 700, v: o.v * 0.3, d: 0.06 });
    },
    dizi(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.04, r: 0.1, vib: 0.011, vibRate: 6, scoop: true, breath: 0.1,
        layers: [{ type: 'sine', v: 1 }, { type: 'square', v: 0.05 }, { type: 'sine', mul: 3, v: 0.06 }],
      });
      // 디즈 특유의 막 떨림 소리
      noise(out, t, { type: 'bandpass', f: midi(o.note) * 3, q: 10, v: 0.12, a: 0.05, d: Math.max(0.1, o.len * 0.8) });
    },
    sheng(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.8, a: Math.min(0.15, o.len * 0.3), r: 0.15, vib: 0.002, vibRate: 4, filter: 4, q: 2,
        layers: [{ type: 'square', v: 0.5 }, { type: 'sawtooth', mul: 2, v: 0.3 }],
      });
    },
    guzheng(out, t, o) {
      synthPluck(out, t, { note: o.note + 12, v: 0.75, d: Math.max(0.6, o.len + 0.5), open: 9, close: 2, sweep: 0.4, q: 2,
        bend: o.len > STEP * 3 ? 2 : 0, bendTime: 0.12,
        layers: [['triangle', 1, 0, 0.7], ['sawtooth', 1, 4, 0.25], ['sine', 2, 0, 0.15]] });
    },
    pipa(out, t, o) {
      // 긴 음은 빠른 트레몰로로 뜯는다
      const n = o.len > STEP * 1.5 ? Math.max(2, Math.round(o.len / 0.055)) : 1;
      for (let i = 0; i < n; i++) {
        synthPluck(out, t + i * 0.055, { note: o.note, v: 0.7 * (i ? 0.55 : 1), d: 0.2, open: 12, close: 2, sweep: 0.08, q: 3,
          layers: [['triangle', 1, 0, 0.6], ['sawtooth', 1, 0, 0.35]] });
      }
    },
    erhu(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.07, r: 0.1, vib: 0.016, vibRate: 6.2, scoop: true, filter: 4, q: 4,
        layers: [{ type: 'sawtooth', v: 0.8 }, { type: 'square', v: 0.15 }],
      });
    },

    // 인도
    manjira(out, t, o) { bell(out, t, [[2380, 0.5], [3620, 0.35], [5210, 0.2, 0.6]], o.v * 0.8, o.v > 0.85 ? 0.7 : 0.35); },
    ghatam(out, t, o) {
      if (o.v > 0.6) {
        tone(out, t, { f: 310, f2: 265, slide: 0.05, v: o.v * 0.8, d: 0.14 });
        noise(out, t, { type: 'bandpass', f: 1200, q: 2, v: o.v * 0.3, d: 0.04 });
      } else tone(out, t, { type: 'triangle', f: 900, f2: 820, slide: 0.02, v: o.v * 0.6, d: 0.05 });
    },
    kanjira(out, t, o) {
      tone(out, t, { f: 380, f2: 290, slide: 0.08, v: o.v * 0.7, d: 0.16 });
      noise(out, t, { type: 'highpass', f: 7000, q: 1, v: o.v * 0.4, d: 0.1 });
    },
    tabla(out, t, o) {
      if (o.v > 0.85) {
        // 다: 바얀(왼손 큰북)의 음이 밀려 올라가고 다얀이 울린다
        tone(out, t, { f: 85, f2: 140, slide: 0.25, v: 0.9, d: 0.45 });
        bell(out, t, [[520, 0.5], [1045, 0.2], [1310, 0.12]], 0.8, 0.45);
      } else if (o.v > 0.55) {
        bell(out, t, [[520, 0.55], [1045, 0.25], [1560, 0.1]], o.v, 0.35);
      } else {
        noise(out, t, { type: 'bandpass', f: 1500, q: 2, v: o.v * 0.7, d: 0.03 });
        tone(out, t, { f: 210, v: o.v * 0.4, d: 0.05 });
      }
    },
    ghanta(out, t, o) {
      if (o.v > 0.85) bell(out, t, [[415, 0.5, 1], [1040, 0.35, 0.8], [1680, 0.2, 0.6], [2600, 0.1, 0.4]], 1, 2.6);
      else bell(out, t, [[1310, 0.4], [3260, 0.2, 0.6]], o.v, 0.7);
    },
    dhol(out, t, o) {
      if (o.v > 0.85) {
        tone(out, t, { f: 98, f2: 55, slide: 0.12, v: o.v, d: 0.45 });
        noise(out, t, { type: 'lowpass', f: 450, v: o.v * 0.3, d: 0.06 });
      } else {
        noise(out, t, { type: 'bandpass', f: 2600, q: 1.5, v: o.v * 0.7, d: 0.04 });
        tone(out, t, { f: 620, f2: 560, slide: 0.03, v: o.v * 0.45, d: 0.06 });
      }
    },
    bansuri(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.9, a: 0.07, r: 0.14, vib: 0.009, vibRate: 5, scoop: true, breath: 0.2,
        layers: [{ type: 'sine', v: 1 }, { type: 'triangle', mul: 2, v: 0.06 }],
      });
    },
    harmonium(out, t, o) {
      sustained(out, t, o.len, {
        note: o.note, v: 0.8, a: 0.06, r: 0.1, vib: 0.001, vibRate: 3, filter: 3.5, q: 1.5,
        layers: [{ type: 'square', v: 0.5 }, { type: 'sawtooth', mul: 1.003, v: 0.4 }],
      });
    },
    tanpura(out, t, o) {
      // 자와리: 브리지에 닿는 줄 때문에 배음이 천천히 밝아진다
      const f = midi(o.note);
      const len = Math.max(0.8, o.len + 1.2);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 3;
      bp.frequency.setValueAtTime(f * 1.5, t);
      bp.frequency.exponentialRampToValueAtTime(f * 7, t + Math.min(1.2, len * 0.7));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      osc.connect(bp); bp.connect(g); g.connect(out);
      tone(out, t, { f, v: 0.35, a: 0.01, d: len });
      osc.start(t); osc.stop(t + len + 0.05);
    },
    santoor(out, t, o) {
      synthPluck(out, t, { note: o.note, v: 0.6, d: 0.7, open: 14, close: 3, sweep: 0.3, q: 1,
        layers: [['triangle', 1, -5, 0.5], ['triangle', 1, 5, 0.5], ['sine', 2, 0, 0.2]] });
    },
    sitar(out, t, o) {
      const long = o.len > STEP * 2.5;
      synthPluck(out, t, { note: o.note, v: 0.7, d: o.len + 0.45, open: 16, close: 3, sweep: 0.5, q: 6,
        bend: long ? 1.5 : 0, bendTime: 0.15,
        layers: [['sawtooth', 1, 0, 0.6], ['square', 1, 3, 0.2]] });
      // 공명현이 은은하게 따라 울린다
      tone(out, t + 0.02, { f: midi(o.note + 12), v: 0.06, a: 0.05, d: 1.2 });
    },
  };

  /* ---------- 연주 패턴 ---------- */

  const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function parseBar(str) {
    const m = {};
    let pos = 0;
    for (const tok of str.trim().split(/\s+/)) {
      const [name, len] = tok.split(':');
      const l = parseInt(len, 10);
      if (name !== 'r') {
        const mm = /^([A-G])(b|#)?(\d)$/.exec(name);
        const n = 12 * (parseInt(mm[3], 10) + 1) + NOTE_PC[mm[1]] + (mm[2] === 'b' ? -1 : mm[2] === '#' ? 1 : 0);
        m[pos] = [n, l];
      }
      pos += l;
    }
    if (pos !== 16) console.warn('마디 길이가 16이 아님:', str);
    return m;
  }

  // 변주 C, D 는 A, B 를 한 옥타브 옮긴 것
  function phraseSet(list, limit) {
    const parsed = list.map((bars) => bars.map(parseBar));
    const out = parsed.slice();
    parsed.forEach((bars) => {
      let max = 0;
      bars.forEach((b) => { for (const k in b) max = Math.max(max, b[k][0]); });
      const shift = max + 12 <= limit ? 12 : -12;
      out.push(bars.map((b) => { const m = {}; for (const k in b) m[k] = [b[k][0] + shift, b[k][1]]; return m; }));
    });
    return out;
  }

  function prepare(set) {
    if (set._phr) return;
    set._phr = {};
    for (const k in set.phrases) set._phr[k] = phraseSet(set.phrases[k], k === 'main' ? 96 : 88);
  }

  // 화음의 pc 를 center 가까이에 놓는다
  function near(pc, center) {
    let n = center - ((center - pc) % 12 + 12) % 12;
    if (center - n > 6) n += 12;
    return n;
  }

  const LINE = [
    [[0, 1, 16]],
    [[0, 2, 8], [8, 1, 8]],
    [[0, 0, 4], [4, 1, 4], [8, 2, 4], [12, 1, 4]],
    [[0, 1, 6], [6, 2, 2], [8, 3, 8]],
  ];
  const PAD = [
    [[0, 16]],
    [[0, 8], [8, 8]],
    [[2, 2], [6, 2], [10, 2], [14, 2]],
    [[0, 6], [6, 6], [12, 4]],
  ];
  const BASS = {
    acoustic: [
      [[0, 'R', 6], [8, 'R', 4], [12, '5', 4]],
      [[0, 'R', 4], [4, '3', 4], [8, '5', 4], [12, 'A', 4]],
      [[0, 'R', 2], [2, 'O', 2], [4, 'R', 2], [6, 'O', 2], [8, 'R', 2], [10, 'O', 2], [12, 'R', 2], [14, 'O', 2]],
      [[0, 'R', 3], [3, 'R', 3], [6, '5', 2], [8, 'O', 3], [11, '5', 3], [14, 'A', 2]],
    ],
    electro: [
      [[2, 'R', 2], [6, 'R', 2], [10, 'R', 2], [14, 'R', 2]],
      [[0, 'R', 2], [2, 'R', 2], [4, 'O', 2], [6, 'R', 2], [8, 'R', 2], [10, 'R', 2], [12, 'O', 2], [14, '5', 2]],
      [[0, 'R', 3], [3, 'R', 3], [6, 'R', 2], [8, '5', 3], [11, 'O', 3], [14, 'R', 2]],
      [[0, 'R', 1], [2, 'R', 1], [3, 'O', 1], [6, 'R', 1], [8, 'R', 1], [10, '5', 1], [11, 'O', 1], [14, 'R', 2]],
    ],
  };
  // 탄푸라 드론: 빠(낮은 5도) - 사 - 사 - 낮은 사 를 반복해서 뜯는다
  const DRONE = [
    [[0, 'P', 4], [4, 'S', 4], [8, 'S', 4], [12, 'L', 4]],
    [[0, 'P', 8], [8, 'L', 8]],
    [[0, 'M', 4], [4, 'S', 4], [8, 'S', 4], [12, 'L', 4]],
    [[0, 'P', 2], [2, 'S', 2], [4, 'S', 2], [6, 'L', 2], [8, 'P', 2], [10, 'S', 2], [12, 'S', 2], [14, 'L', 2]],
  ];

  const ARP = [
    { step: 1, seq: [0, 1, 2, 3] },
    { step: 1, seq: [0, 1, 2, 3, 4, 3, 2, 1] },
    { step: 2, seq: [0, 2, 3, 5] },
    { step: 1, seq: [0, 3, 1, 4, 2, 5, 1, 4] },
  ];

  function at(list, s) {
    for (const e of list) if (e[0] === s) return e;
    return null;
  }

  // 한 악기의 한 16분음표를 연주한다. 소리를 냈으면 true.
  function playPart(tier, a, n, t) {
    const it = song.instruments[tier];
    const part = it.part;
    const voice = VOICES[it.voice];
    const out = buses[tier];
    const rel = n - a.fromStep;
    const phraseLen = part.main ? 128 : 64;
    const ph = Math.floor(rel / phraseLen);
    if (ph !== a.phrase) {
      // 소절 묶음이 바뀔 때마다 다음 차례의 악기가 이어받는다
      const k = Math.max(1, counts[tier] || 1);
      a.slot = ph === 0 ? 0 : (a.slot + 1) % k;
      a.k = k;
      a.phrase = ph;
    }
    const v = a.slot % 4;
    const inPhrase = rel % phraseLen;
    const bar = Math.floor(inPhrase / 16), s = inPhrase % 16;
    const ci = Math.floor(n / 16) % 4;
    const [root, pcs] = song.chords[ci];
    const nextRoot = song.chords[(ci + 1) % 4][0];
    const L = (steps) => steps * STEP * 0.95;

    if (part.rhythm) {
      const pv = song.rhythm[part.rhythm][v];
      const str = bar === 0 && pv.first ? pv.first : bar === 3 && pv.fill ? pv.fill : pv.bar;
      const c = str[s];
      if (c === '.') return false;
      voice(out, t, { v: (c.charCodeAt(0) - 48) / 9, s, fill: bar === 3 && !!pv.fill });
      return true;
    }

    if (part.phrases || part.main) {
      let hit = false;
      if (part.comp && (s === 0 || s === 6 || s === 10)) {
        const vel = s === 0 ? 0.32 : 0.2;
        if (s === 0) voice(out, t, { note: root, len: STEP * 6, v: 0.5 });
        for (const pc of pcs) voice(out, t, { note: near(pc, 60), len: STEP * 3, v: vel });
        hit = true;
      }
      const m = song._phr[part.main ? 'main' : part.phrases][v][bar][s];
      if (m) { voice(out, t, { note: m[0], len: L(m[1]), v: 0.6 }); hit = true; }
      return hit;
    }

    if (part.gen === 'line') {
      const e = at(LINE[v], s);
      if (!e) return false;
      const deg = e[1];
      const note = deg === 3 ? near(pcs[0], part.center + 7) : near(pcs[deg], part.center);
      voice(out, t, { note, len: L(e[2]) });
      return true;
    }
    if (part.gen === 'pad') {
      const e = at(PAD[v], s);
      if (!e) return false;
      for (const pc of pcs) voice(out, t, { note: near(pc, part.center), len: L(e[1]) });
      return true;
    }
    if (part.gen === 'bass') {
      const e = at(BASS[song.bassStyle || 'acoustic'][v], s);
      if (!e) return false;
      const third = root + ((pcs[1] - root) % 12 + 12) % 12;
      let nr = nextRoot;
      while (nr - root > 6) nr -= 12;
      while (root - nr > 6) nr += 12;
      const note = { R: root, 5: root + 7, 3: third, O: root + 12, A: nr === root ? root + 7 : nr + (nr > root ? -1 : 1) }[e[1]];
      voice(out, t, { note, len: L(e[2]) });
      return true;
    }
    if (part.gen === 'drone') {
      const e = at(DRONE[v], s);
      if (!e) return false;
      const tn = part.tonic;
      voice(out, t, { note: { P: tn - 5, S: tn, L: tn - 12, M: tn - 7 }[e[1]], len: L(e[2]) });
      return true;
    }
    if (part.gen === 'arp') {
      const p = ARP[v];
      if (s % p.step) return false;
      const tones = pcs.map((pc) => near(pc, part.center)).sort((x, y) => x - y);
      const all = tones.concat(tones.map((x) => x + 12));
      const idx = p.seq[(s / p.step) % p.seq.length];
      voice(out, t, { note: all[idx], len: L(p.step) });
      return true;
    }
    return false;
  }

  /* ---------- 스케줄러 ---------- */

  function schedule() {
    if (!ctx || !running || !song) return;
    const now = ctx.currentTime;
    while (t0 + nextStep * STEP < now + LOOKAHEAD) {
      const n = nextStep, t = t0 + n * STEP;
      if (t >= now - 0.02) {
        for (const key in active) {
          const a = active[key];
          if (n < a.fromStep || t >= a.until - 1e-4) continue;
          const tier = +key;
          if (playPart(tier, a, n, t) && hitListener) hitListener(tier, t, a.slot);
        }
      }
      nextStep++;
    }
  }

  function buildBuses() {
    buses.forEach((b) => b.disconnect());
    buses = song.instruments.map((it) => {
      const g = ctx.createGain();
      g.gain.value = it.vol;
      g.connect(master);
      const send = ctx.createGain();
      send.gain.value = it.rev;
      g.connect(send); send.connect(reverbIn);
      return g;
    });
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

    if (song) buildBuses();
    timer = setInterval(schedule, 25);
  }

  // 세트(노래) 바꾸기. 연주 중인 것은 모두 멈춘다.
  function setSong(s) {
    stopAll();
    song = s;
    prepare(song);
    STEP = 60 / song.bpm / 4;
    BAR = 16 * STEP;
    CYCLE = 64 * STEP;
    if (ctx) buildBuses();
  }

  function busy(now) {
    for (const k in active) if (active[k].until > now) return true;
    return false;
  }

  function begin(tier, now) {
    let fromStep;
    if (!running || !busy(now)) {
      // 무대가 조용하면 지금이 첫 박
      for (const k in active) delete active[k];
      t0 = now + 0.06;
      nextStep = 0;
      running = true;
      fromStep = 0;
    } else {
      fromStep = Math.max(0, Math.ceil((now + 0.03 - t0) / CYCLE)) * 64;
    }
    active[tier] = { fromStep, from: t0 + fromStep * STEP, until: Infinity, phrase: -1, slot: 0, k: 1 };
  }

  // 판 위 악기 수를 알려준다(매 프레임). 있는 악기는 계속 연주하고, 사라진 악기는 다음 마디에 멈춘다.
  function sync(cs) {
    if (!ctx || !song) return;
    counts = cs;
    const now = ctx.currentTime;
    let changed = false;
    for (let i = 0; i < cs.length; i++) {
      const a = active[i];
      const alive = a && a.until > now;
      if (cs[i] > 0) {
        if (!alive) { begin(i, now); changed = true; }
        else if (a.until !== Infinity) a.until = Infinity;
      } else if (alive && a.until === Infinity) {
        if (a.from > now) delete active[i];
        else a.until = t0 + Math.ceil((now + 0.03 - t0) / BAR) * BAR;
      }
    }
    if (changed) schedule();
  }

  // 악기 상태: 연주 중이면 { playing, slot, k, variation }, 첫 박을 기다리면 { waiting, wait }
  function status(tier) {
    const a = active[tier];
    if (!ctx || !a) return null;
    const now = ctx.currentTime;
    if (a.until <= now) return null;
    if (now < a.from) return { waiting: true, wait: a.from - now };
    return { playing: true, slot: a.slot, k: a.k, variation: a.slot % 4 };
  }

  function conductor() {
    if (!ctx || !running) return null;
    const now = ctx.currentTime;
    if (now < t0 || !busy(now)) return null;
    const pos = (now - t0) % CYCLE;
    return { bar: Math.floor(pos / BAR), beat: Math.floor((pos % BAR) / (STEP * 4)), toNext: CYCLE - pos, beatLen: STEP * 4 };
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
    init, setSong, sync, status, conductor, stopAll, setMuted,
    isMuted: () => muted,
    now: () => (ctx ? ctx.currentTime : 0),
    onHit: (fn) => { hitListener = fn; },
    cycle: () => CYCLE,
  };
})();
