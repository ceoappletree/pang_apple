// 소리: 파일 없이 Web Audio로 만드는 배경음악, 자연 소리, 효과음, 주민 목소리.
// 브라우저 정책상 첫 터치나 키 입력 뒤에야 소리가 난다.
(function (g) {
  'use strict';

  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, noise: null,
    muted: false, musicVol: 0.5, sfxVol: 0.7,
    period: 'morning', timer: null,
    nextBar: 0, bar: 0, motif: null, nextAmbient: 0, lastMelody: 7,
    voiceUntil: 0,

    // 첫 사용자 입력에서 호출
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return; }
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      // 소리가 겹쳐도 찢어지지 않게 살짝 눌러 준다
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVol * 0.6;
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.sfxVol;
      this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.nextBar = ctx.currentTime + 0.3;
      this.nextAmbient = ctx.currentTime + 2;
      this.timer = setInterval(() => this.schedule(), 60);
    },

    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    },
    setMusicVolume(v) { this.musicVol = v; if (this.musicBus) this.musicBus.gain.setTargetAtTime(v * 0.6, this.ctx.currentTime, 0.1); },
    setSfxVolume(v) { this.sfxVol = v; if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05); },
    setPeriod(p) { if (p !== this.period) { this.period = p; this.motif = null; } },
    pause() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    // ---------- 기본 소리 재료 ----------
    tone(t, freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, bus, to, slide = 0, filter } = {}) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + (slide || dur));
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(gain, t + attack);
      e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (filter) {
        const f = ctx.createBiquadFilter();
        f.type = filter.type || 'lowpass'; f.frequency.value = filter.freq; f.Q.value = filter.q || 0.7;
        node.connect(f); node = f;
      }
      node.connect(e); e.connect(bus || this.sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
      return o;
    },
    burst(t, dur, { gain = 0.1, freq = 1000, type = 'lowpass', q = 0.7, bus, rate = 1 } = {}) {
      const ctx = this.ctx;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain();
      s.buffer = this.noise; s.playbackRate.value = rate;
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(e); e.connect(bus || this.sfxBus);
      s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    },
    midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

    // ---------- 효과음 ----------
    play(name) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + 0.01;
      switch (name) {
        case 'step': this.burst(t, 0.05, { gain: 0.05, freq: 500 + Math.random() * 200, rate: 0.6 }); break;
        case 'pickup': this.tone(t, 784, 0.1, { gain: 0.14 }); this.tone(t + 0.07, 1175, 0.22, { gain: 0.14 }); break;
        case 'coin': this.tone(t, 988, 0.08, { type: 'square', gain: 0.05 }); this.tone(t + 0.07, 1319, 0.32, { type: 'square', gain: 0.05 }); break;
        case 'pay': this.tone(t, 784, 0.08, { type: 'square', gain: 0.04 }); this.tone(t + 0.07, 523, 0.2, { type: 'square', gain: 0.04 }); break;
        case 'open': this.tone(t, 330, 0.12, { gain: 0.12, to: 660, slide: 0.08 }); break;
        case 'close': this.tone(t, 600, 0.12, { gain: 0.1, to: 300, slide: 0.1 }); break;
        case 'send': this.tone(t, 1400, 0.05, { type: 'triangle', gain: 0.07 }); break;
        case 'click': this.tone(t, 900, 0.04, { type: 'triangle', gain: 0.05 }); break;
        case 'quest':
          [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.09, f, 0.3, { type: 'triangle', gain: 0.12 }));
          break;
        case 'fanfare':
          [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.1, f, 0.25, { type: 'triangle', gain: 0.12 }));
          [523, 659, 784, 1047].forEach(f => this.tone(t + 0.32, f, 0.9, { type: 'triangle', gain: 0.07, attack: 0.02 }));
          break;
        case 'up': [1319, 1568, 2093].forEach((f, i) => this.tone(t + i * 0.05, f, 0.18, { gain: 0.07 })); break;
        case 'down': this.tone(t, 240, 0.4, { type: 'triangle', gain: 0.14, to: 150, slide: 0.35 }); break;
        case 'whisper':
          this.burst(t, 0.12, { gain: 0.08, freq: 3200, type: 'bandpass', q: 1.2 });
          this.burst(t + 0.18, 0.2, { gain: 0.1, freq: 3600, type: 'bandpass', q: 1.2 });
          break;
        case 'chime': this.tone(t, 1047, 1.2, { gain: 0.1 }); this.tone(t, 1047 * 2.76, 0.6, { gain: 0.02 }); this.tone(t + 0.25, 1568, 1.4, { gain: 0.08 }); break;
        case 'meow': this.meow(t); break;
      }
    },

    meow(t) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), e = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(560, t + 0.42);
      f.type = 'bandpass'; f.Q.value = 4;
      f.frequency.setValueAtTime(1100, t);
      f.frequency.exponentialRampToValueAtTime(1900, t + 0.12);
      f.frequency.exponentialRampToValueAtTime(900, t + 0.42);
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(f); f.connect(e); e.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.5);
    },

    // 주민이 말할 때 나는 "뾰로롱" 목소리. 글자 수만큼 짧은 소리를 낸다.
    VOICES: {
      grandma: { base: 300, type: 'triangle', spread: 3, formant: 900 },
      chulsu: { base: 150, type: 'square', spread: 2, formant: 600 },
      mina: { base: 520, type: 'triangle', spread: 5, formant: 1600 },
      momo: { base: 760, type: 'sine', spread: 6, formant: 2000 },
    },
    voice(id, text) {
      if (!this.ctx || this.muted) return;
      const v = this.VOICES[id];
      if (!v) return;
      const ctx = this.ctx;
      let t = Math.max(ctx.currentTime + 0.02, this.voiceUntil);
      if (t > ctx.currentTime + 1) return; // 이미 길게 말하는 중
      const chars = Array.from(String(text).replace(/[\s.,!?~…"'()]/g, ''));
      const n = Math.min(14, Math.max(2, Math.ceil(chars.length / 3)));
      for (let i = 0; i < n; i++) {
        const code = chars[(i * 3) % chars.length] ? chars[(i * 3) % chars.length].charCodeAt(0) : i;
        const semi = (code % (v.spread * 2 + 1)) - v.spread;
        const f = v.base * Math.pow(2, semi / 12);
        this.tone(t, f, 0.06, { type: v.type, gain: v.type === 'square' ? 0.12 : 0.28, filter: { type: 'bandpass', freq: v.formant, q: 0.7 } });
        t += 0.07;
      }
      this.voiceUntil = t;
    },

    // ---------- 배경음악 ----------
    // 시간대마다 코드 진행, 빠르기, 악기 밀도가 다르다
    STYLES: {
      morning: { bpm: 92, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], density: 0.55, bass: 2, shaker: true, birds: 0.8 },
      day: { bpm: 100, chords: [[53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64]], density: 0.6, bass: 2, shaker: true, birds: 0.5 },
      evening: { bpm: 80, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], density: 0.4, bass: 1, shaker: false, birds: 0.15 },
      night: { bpm: 64, chords: [[57, 60, 64], [53, 57, 60], [52, 55, 59], [55, 59, 62]], density: 0.22, bass: 1, shaker: false, birds: 0, crickets: true },
    },
    PENTA: [0, 2, 4, 7, 9], // 다장조 5음 음계

    schedule() {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (this.nextBar < now - 0.5) this.nextBar = now + 0.1;
      while (this.nextBar < now + 0.4) { this.playBar(this.nextBar); }
      if (this.nextAmbient < now + 0.4) this.ambient(Math.max(now, this.nextAmbient));
    },

    playBar(t0) {
      const st = this.STYLES[this.period] || this.STYLES.day;
      const beat = 60 / st.bpm, step = beat / 2;
      const chord = st.chords[this.bar % st.chords.length];
      const bus = this.musicBus;
      if (!this.motif || this.bar % 8 === 0) this.motif = this.makeMotif(st);
      // 패드: 부드럽게 깔리는 화음
      chord.forEach(n => {
        const o = this.tone(t0, this.midi(n), beat * 4.2, { type: 'triangle', gain: 0.035, attack: 0.5, bus, filter: { freq: 1100 } });
        o.detune.value = (Math.random() - 0.5) * 8;
      });
      // 베이스
      for (let b = 0; b < st.bass; b++) this.tone(t0 + b * beat * 2, this.midi(chord[0] - 12), beat * 1.6, { gain: 0.11, attack: 0.01, bus });
      // 셰이커
      if (st.shaker) for (let i = 1; i < 8; i += 2) this.burst(t0 + i * step, 0.05, { gain: 0.012, freq: 7000, type: 'highpass', bus });
      // 멜로디: 2마디 동기를 되풀이하며 코드에 맞춰 옮긴다
      const half = (this.bar % 2) * 8;
      for (let i = 0; i < 8; i++) {
        const deg = this.motif[half + i];
        if (deg == null) continue;
        const oct = Math.floor(deg / 5), pc = this.PENTA[((deg % 5) + 5) % 5];
        let n = 72 + oct * 12 + pc;
        if (i === 0 && !chord.some(c => (c - n) % 12 === 0)) n = chord[0] + 12 + (chord[0] + 12 < 70 ? 12 : 0);
        const tt = t0 + i * step + (Math.random() * 0.012);
        if (this.period === 'night') {
          this.tone(tt, this.midi(n), 1.6, { gain: 0.05, bus });
          this.tone(tt, this.midi(n) * 2.76, 0.5, { gain: 0.008, bus });
        } else {
          this.tone(tt, this.midi(n), 0.7, { gain: 0.06, bus });
          this.tone(tt, this.midi(n) * 2, 0.25, { type: 'triangle', gain: 0.012, bus });
        }
      }
      this.bar++;
      this.nextBar = t0 + beat * 4;
    },

    makeMotif(st) {
      const m = new Array(16).fill(null);
      let d = this.lastMelody;
      for (let i = 0; i < 16; i++) {
        const strong = i % 4 === 0;
        if (Math.random() < (strong ? st.density + 0.25 : st.density)) {
          d += Math.round((Math.random() - 0.5) * 4);
          d = Math.max(0, Math.min(9, d));
          m[i] = d;
        }
      }
      m[15] = null;
      this.lastMelody = d;
      return m;
    },

    // 새소리, 귀뚜라미
    ambient(t) {
      const st = this.STYLES[this.period] || this.STYLES.day;
      const bus = this.musicBus;
      if (st.crickets) {
        const f = 4200 + Math.random() * 600;
        const k = 3 + (Math.random() * 3 | 0);
        for (let i = 0; i < k; i++) this.tone(t + i * 0.045, f, 0.03, { type: 'square', gain: 0.006, bus, filter: { type: 'bandpass', freq: f, q: 8 } });
        this.nextAmbient = t + 0.8 + Math.random() * 2;
        return;
      }
      if (Math.random() < st.birds) {
        const base = 2400 + Math.random() * 1400;
        const k = 2 + (Math.random() * 3 | 0);
        for (let i = 0; i < k; i++) {
          const s = t + i * (0.09 + Math.random() * 0.05);
          this.tone(s, base, 0.08, { gain: 0.025, to: base * (1.2 + Math.random() * 0.3), slide: 0.06, bus });
        }
      }
      this.nextAmbient = t + 3 + Math.random() * 6;
    },
  };

  g.GameAudio = A;
})(typeof window !== 'undefined' ? window : globalThis);
