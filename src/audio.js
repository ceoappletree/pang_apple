// 소리: 배경음악(가야금 같은 뜯는 소리 + 장구 장단 + 지속음)과 효과음. 모두 Web Audio로 합성한다.
(function () {
  const KEY = 'sangpanri-sound';
  let ac = null, master = null, bgmBus = null, sfxBus = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* 무시 */ }

  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = ac.createGain();
      master.gain.value = on ? 0.9 : 0;
      master.connect(ac.destination);
      bgmBus = ac.createGain(); bgmBus.gain.value = 0.32; bgmBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      // 은은한 울림(짧은 피드백 딜레이)
      const d = ac.createDelay(); d.delayTime.value = 0.23;
      const fb = ac.createGain(); fb.gain.value = 0.28;
      const wet = ac.createGain(); wet.gain.value = 0.25;
      bgmBus.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(master);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // ---------- 소리 재료 ----------
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 뜯는 줄 소리(가야금 비슷하게): 처음에 살짝 높았다가 내려앉고, 끝에 농현(떨림)
  function pluck(t, midi, dur, gain, bus, bend = true) {
    const a = ac;
    const f = hz(midi);
    const g = a.createGain();
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    for (const [type, mul, lv] of [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.12]]) {
      const o = a.createOscillator(); o.type = type;
      const og = a.createGain(); og.gain.value = lv;
      o.frequency.setValueAtTime(f * mul * (bend ? 1.03 : 1), t);
      o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.06);
      if (bend && dur > 0.5) {
        const lfo = a.createOscillator(); lfo.frequency.value = 5.5;
        const lg = a.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * mul * 0.012, t + dur * 0.6);
        lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
      }
      o.connect(og).connect(lp);
      o.start(t); o.stop(t + dur + 0.05);
    }
    lp.connect(g).connect(bus);
  }

  function tone(t, f, dur, type, gain, bus, f2) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  let noiseBuf = null;
  function noise(t, dur, type, freq, gain, bus, q = 1, freq2) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // 장구: 덩(양편), 쿵(북편), 덕(채편)
  function janggu(t, kind, bus, lv = 1) {
    if (kind === 'kung' || kind === 'deong') tone(t, 110, 0.35, 'sine', 0.55 * lv, bus, 55);
    if (kind === 'deok' || kind === 'deong') { noise(t, 0.07, 'bandpass', 2600, 0.35 * lv, bus, 1.5); tone(t, 520, 0.06, 'triangle', 0.08 * lv, bus, 300); }
    if (kind === 'gi') noise(t, 0.04, 'highpass', 4000, 0.12 * lv, bus);
  }

  // ---------- 배경음악 ----------
  // 평조(Eb F Ab Bb C) 5음
  const SCALE = [0, 2, 5, 7, 9];
  const ROOT = 63; // Eb4
  const note = (deg) => ROOT + SCALE[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5);
  const MOODS = {
    title: { bpm: 66, drum: [], lo: -3, hi: 6, dens: 0.55, drone: true, len: [2, 3, 3, 6] },
    story: { bpm: 60, drum: [], lo: -2, hi: 5, dens: 0.4, drone: true, len: [3, 3, 6] },
    map: { bpm: 84, drum: ['kung', 0, 0, 'deok', 0, 0, 'kung', 0, 'deok', 0, 'deok', 0], lo: 0, hi: 8, dens: 0.6, drone: false, len: [1, 2, 2, 3] },
    // 세마치 장단 느낌: 덩 . . | 덩 . 덕 | 쿵 덕 .  (한 박을 셋으로)
    dig: { bpm: 104, drum: ['deong', 0, 0, 'deong', 0, 'deok', 'kung', 'deok', 0, 'deong', 'gi', 'deok'], lo: -2, hi: 7, dens: 0.7, drone: true, len: [1, 1, 2, 3] },
  };
  let mood = null, timer = null, step = 0, nextT = 0, deg = 2, rest = 0, droneNodes = [];

  function startDrone() {
    stopDrone();
    for (const [m, lv] of [[ROOT - 24, 0.12], [ROOT - 17, 0.07]]) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
      const g = ac.createGain(); g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(lv, ac.currentTime + 2);
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.15;
      const lg = ac.createGain(); lg.gain.value = lv * 0.5;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(bgmBus);
      o.start(); lfo.start();
      droneNodes.push({ o, g, lfo });
    }
  }
  function stopDrone() {
    const t = ac.currentTime;
    for (const n of droneNodes) {
      n.g.gain.cancelScheduledValues(t);
      n.g.gain.setValueAtTime(n.g.gain.value, t);
      n.g.gain.linearRampToValueAtTime(0, t + 0.8);
      n.o.stop(t + 1); n.lfo.stop(t + 1);
    }
    droneNodes = [];
  }

  function schedule() {
    const M = MOODS[mood];
    const sub = 60 / M.bpm / 3; // 한 박을 셋으로 나눈 길이
    while (nextT < ac.currentTime + 0.15) {
      const s = step % 12;
      const d = M.drum[s];
      if (d) janggu(nextT, d, bgmBus, 0.8);
      if (rest > 0) rest -= 1;
      else if (Math.random() < M.dens || s === 0) {
        // 가락: 이웃 음으로 걷다가 가끔 뛴다. 장단 첫 박에는 으뜸음 쪽으로.
        const r = Math.random();
        deg += r < 0.4 ? 1 : r < 0.8 ? -1 : r < 0.9 ? 2 : -2;
        if (s === 0 && Math.random() < 0.5) deg = Math.round(deg / 5) * 5;
        deg = Math.max(M.lo, Math.min(M.hi, deg));
        const len = M.len[Math.floor(Math.random() * M.len.length)];
        pluck(nextT, note(deg), sub * len * 1.6 + 0.3, 0.32, bgmBus);
        if (s === 0) pluck(nextT, note(deg) - 12, sub * 6, 0.18, bgmBus, false);
        rest = len - 1;
      }
      nextT += sub;
      step += 1;
    }
  }

  function music(name) {
    if (!ctx() || name === mood) return;
    clearInterval(timer);
    mood = name;
    if (!name) { stopDrone(); return; }
    step = 0; rest = 0; deg = 2;
    nextT = ac.currentTime + 0.1;
    if (MOODS[name].drone) startDrone(); else stopDrone();
    timer = setInterval(schedule, 40);
  }

  // ---------- 효과음 ----------
  const fx = (fn) => (...args) => { if (!ctx()) return; fn(ac.currentTime, ...args); };
  G.sfx = {
    dig: fx((t, big) => {
      if (big) {
        tone(t, 1900, 0.18, 'square', 0.06, sfxBus, 1500); // 쇠 부딪히는 소리
        tone(t, 2650, 0.12, 'sine', 0.05, sfxBus);
        noise(t, 0.25, 'lowpass', 700, 0.7, sfxBus);
        tone(t, 90, 0.2, 'sine', 0.5, sfxBus, 45);
      } else {
        noise(t, 0.16, 'bandpass', 1600, 0.45, sfxBus, 0.8, 600); // 흙 긁는 소리
        noise(t + 0.05, 0.1, 'lowpass', 900, 0.25, sfxBus);
      }
    }),
    probe: fx((t, yes) => {
      tone(t, yes ? 1480 : 520, yes ? 0.45 : 0.18, 'sine', 0.18, sfxBus);
      if (yes) tone(t + 0.08, 1976, 0.4, 'sine', 0.12, sfxBus);
    }),
    crack: fx((t, broke) => {
      noise(t, 0.12, 'highpass', 3000, 0.5, sfxBus);
      tone(t, 3200, 0.08, 'square', 0.05, sfxBus, 2200);
      if (broke) for (let i = 0; i < 6; i++) { tone(t + 0.04 + i * 0.035, 2500 + Math.random() * 2500, 0.12, 'triangle', 0.08, sfxBus); noise(t + i * 0.03, 0.06, 'highpass', 5000, 0.2, sfxBus); }
    }),
    find: fx((t, big) => {
      const seq = big ? [0, 2, 4, 5, 7, 10] : [2, 4, 7];
      seq.forEach((d, i) => pluck(t + i * 0.09, note(d), 0.9, 0.3, sfxBus));
      tone(t + seq.length * 0.09, hz(note(big ? 12 : 9)), 0.8, 'sine', 0.1, sfxBus);
    }),
    fanfare: fx((t) => {
      [0, 0, 2, 4, 5].forEach((d, i) => pluck(t + i * 0.13, note(d + 3), 1.1, 0.32, sfxBus));
      [[0, 0.6], [5, 0.75]].forEach(([d, dt]) => { pluck(t + dt, note(d + 5), 1.6, 0.3, sfxBus); pluck(t + dt, note(d + 3), 1.6, 0.2, sfxBus); });
      janggu(t, 'deong', sfxBus); janggu(t + 0.6, 'deong', sfxBus); janggu(t + 0.75, 'deok', sfxBus);
    }),
    collapse: fx((t) => {
      noise(t, 1.2, 'lowpass', 400, 0.9, sfxBus, 1, 80);
      for (let i = 0; i < 8; i++) tone(t + i * 0.09, 70 + Math.random() * 50, 0.3, 'sine', 0.35, sfxBus, 40);
    }),
    step: fx((t) => { noise(t, 0.07, 'lowpass', 600, 0.35, sfxBus); }),
    brush: fx((t) => { noise(t, 0.12, 'bandpass', 2400 + Math.random() * 800, 0.18, sfxBus, 0.6); }),
    pull: fx((t) => {
      noise(t, 0.18, 'bandpass', 900, 0.4, sfxBus, 1, 3000); // 뿌리가 뜯기는 소리
      tone(t + 0.12, 520, 0.12, 'triangle', 0.12, sfxBus, 900);
    }),
    click: fx((t) => { tone(t, 880, 0.06, 'triangle', 0.12, sfxBus, 660); }),
    blip: fx((t) => { tone(t, 600 + Math.random() * 120, 0.035, 'triangle', 0.035, sfxBus); }),
    unroll: fx((t) => { noise(t, 0.45, 'bandpass', 900, 0.35, sfxBus, 0.7, 2600); janggu(t + 0.35, 'deok', sfxBus, 0.8); }),
    flag: fx((t) => { tone(t, 300, 0.12, 'sine', 0.3, sfxBus, 120); noise(t, 0.08, 'lowpass', 1500, 0.3, sfxBus); }),
    discover: fx((t) => {
      janggu(t, 'deong', sfxBus);
      [0, 2, 4, 7, 9, 12].forEach((d, i) => pluck(t + 0.12 + i * 0.08, note(d), 1.2, 0.28, sfxBus));
    }),
  };

  G.audio = {
    music,
    isOn: () => on,
    toggle() {
      on = !on;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* 무시 */ }
      if (ctx()) master.gain.setTargetAtTime(on ? 0.9 : 0, ac.currentTime, 0.05);
      return on;
    },
    // 브라우저는 사용자가 한 번 누른 뒤에야 소리를 낼 수 있다
    unlock() { ctx(); },
  };
})();
