/* 합주팡 — 실제 악기 녹음(샘플) 재생기
 * samples/*.js 에 담긴 FluidR3 GM 사운드폰트(Frank Wen, CC BY 3.0) 음을 디코딩해 두고,
 * 필요한 음높이는 가장 가까운 녹음의 재생 속도를 바꿔 만든다.
 * 세트를 고를 때 그 세트에 필요한 악기만 불러온다. 불러오기 전에는 합성 소리가 대신 연주한다.
 */
(function () {
  'use strict';

  const banks = {};        // 악기 -> { keys, buf, off, gain }
  const loading = {};      // 악기 -> Promise
  const TARGET_RMS = 0.12; // 악기마다 녹음 음량이 달라서 이 크기로 맞춘다

  function loadScript(inst) {
    if (window.SAMPLES && window.SAMPLES[inst]) return Promise.resolve();
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'samples/' + inst + '.js';
      s.onload = resolve;
      s.onerror = resolve;   // 파일이 없으면 합성 소리로 계속한다
      document.head.appendChild(s);
    });
  }

  function decode(ctx, uri) {
    const bin = atob(uri.slice(uri.indexOf(',') + 1));
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Promise((resolve, reject) => ctx.decodeAudioData(arr.buffer, resolve, reject));
  }

  async function loadBank(ctx, inst) {
    await loadScript(inst);
    const src = window.SAMPLES && window.SAMPLES[inst];
    if (!src) return;
    const bank = { keys: [], buf: {}, off: {}, gain: 1 };
    const levels = [];
    await Promise.all(Object.keys(src).map(async (k) => {
      try {
        const buf = await decode(ctx, src[k]);
        const d = buf.getChannelData(0);
        // mp3 앞의 빈 구간을 건너뛴다
        let i = 0;
        while (i < d.length && Math.abs(d[i]) < 0.004) i++;
        const n = Math.min(d.length - i, Math.floor(buf.sampleRate * 0.4));
        let sum = 0;
        for (let j = 0; j < n; j++) sum += d[i + j] * d[i + j];
        if (n > 0) levels.push(Math.sqrt(sum / n));
        bank.buf[k] = buf;
        bank.off[k] = Math.max(0, i / buf.sampleRate - 0.002);
      } catch (e) { /* 디코딩 실패한 음은 건너뛴다 */ }
    }));
    bank.keys = Object.keys(bank.buf).map(Number).sort((a, b) => a - b);
    if (!bank.keys.length) return;
    const avg = levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length);
    bank.gain = avg > 0 ? TARGET_RMS / avg : 1;
    banks[inst] = bank;
  }

  function ensure(ctx, insts) {
    return Promise.all(insts.map((inst) => {
      if (!loading[inst]) loading[inst] = loadBank(ctx, inst);
      return loading[inst];
    }));
  }

  // 녹음 한 음을 재생한다. o: { v, a, r, vib(센트), min(최소 울림 길이) }
  function play(ctx, out, t, inst, note, len, o) {
    const bank = banks[inst];
    let key = bank.keys[0];
    for (const k of bank.keys) if (Math.abs(k - note) < Math.abs(key - note)) key = k;
    const buf = bank.buf[key];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (note - key) / 12);
    const sounding = Math.max(len, o.min || 0);
    const r = o.r || 0.15;
    const end = t + sounding + r;
    if (o.vib && src.detune) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = o.vibRate || 5.5;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(o.vib, t + Math.min(0.35, sounding));
      lfo.connect(depth); depth.connect(src.detune);
      lfo.start(t); lfo.stop(end + 0.05);
    }
    const peak = (o.v || 0.8) * bank.gain * (o.gain || 1);
    const g = ctx.createGain();
    const a = o.a || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, sounding));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    src.connect(g); g.connect(out);
    src.start(t, bank.off[key]);
    src.stop(end + 0.05);
  }

  window.Sampler = {
    ensure, play,
    has: (inst) => !!banks[inst],
  };
})();
