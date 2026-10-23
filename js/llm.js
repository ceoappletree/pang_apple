// 선택 기능: 브라우저 안에서 도는 소형 언어 모델(WebLLM + WebGPU).
// API 키도 서버도 필요 없고, 모델은 처음 한 번 내려받은 뒤 브라우저에 캐시된다.
// 게임 규칙(호감도, 퀘스트, 기억)은 언제나 brain.js가 정하고, LLM은 그 대답을 캐릭터 말투로 자연스럽게 다듬기만 한다.
(function (g) {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm';
  const MODELS = {
    small: { label: '가벼운 모델 (약 0.5GB)', f16: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC' },
    large: { label: '똑똑한 모델 (약 1.6GB)', f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC' },
  };

  const LLM = {
    MODELS,
    status: 'off', // off | loading | ready | error
    error: '',
    engine: null,
    modelKey: null,

    supported() { return typeof navigator !== 'undefined' && !!navigator.gpu; },

    async load(key, onProgress) {
      if (!this.supported()) throw new Error('이 브라우저는 WebGPU를 지원하지 않아요. 최신 크롬이나 엣지에서 시도해 주세요.');
      this.status = 'loading'; this.error = '';
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('그래픽 장치를 찾지 못했어요.');
        const m = MODELS[key] || MODELS.small;
        const id = adapter.features.has('shader-f16') ? m.f16 : m.f32;
        const webllm = await import(LIB);
        if (this.engine) { try { await this.engine.unload(); } catch (e) { /* 무시 */ } }
        this.engine = await webllm.CreateMLCEngine(id, {
          initProgressCallback: r => onProgress && onProgress(r.progress || 0, r.text || ''),
        });
        this.modelKey = key;
        this.status = 'ready';
      } catch (e) {
        this.status = 'error';
        this.error = (e && e.message) || String(e);
        this.engine = null;
        throw e;
      }
    },

    async unload() {
      if (this.engine) { try { await this.engine.unload(); } catch (e) { /* 무시 */ } }
      this.engine = null; this.status = 'off';
    },

    // draft: 규칙 기반 AI가 만든 대답. 모델은 이 내용을 바꾸지 않고 말투만 다듬는다.
    async rephrase({ brain, userText, draft, ctx }, onToken) {
      if (this.status !== 'ready' || !this.engine) return draft;
      const p = brain.p;
      const system = [
        '너는 한국어 게임 "사과나무 마을"의 NPC "' + p.name + '"이다.',
        '성격: ' + p.llm.persona,
        '말투: ' + p.llm.style,
        '지금: ' + ctx.day + '일차 ' + ctx.periodName + ', 날씨는 ' + ctx.weather + ' 날.',
        '네가 기억하는 것:\n' + brain.summary(),
        '규칙: 반드시 한국어로만, 1~2문장으로 짧게 말한다. 게임이 정해 준 대답의 뜻과 사실(숫자, 아이템, 이름)을 그대로 지킨다.',
        '새로운 사실이나 약속을 지어내지 않는다. 따옴표나 이름표 없이 대사만 출력한다.',
      ].join('\n');
      const messages = [{ role: 'system', content: system }];
      for (const h of brain.s.history.slice(-4)) {
        messages.push({ role: 'user', content: h.u });
        messages.push({ role: 'assistant', content: h.n });
      }
      messages.push({ role: 'user', content: userText + '\n\n(게임이 정한 대답: "' + draft + '" — 이 뜻을 네 말투로 자연스럽게 말해.)' });

      let text = '';
      const chunks = await this.engine.chat.completions.create({ messages, stream: true, temperature: 0.7, max_tokens: 90 });
      for await (const c of chunks) {
        const d = c.choices && c.choices[0] && c.choices[0].delta && c.choices[0].delta.content;
        if (d) { text += d; onToken && onToken(clean(text)); }
      }
      text = clean(text);
      // 한자나 영어 문장이 섞이거나 비어 있으면 규칙 기반 대답으로 돌아간다
      if (!text || /[一-鿿]/.test(text) || /[a-zA-Z]{6,}/.test(text) || !/[가-힣]/.test(text)) return draft;
      return text;
    },
  };

  function clean(t) {
    return t.replace(/^[\s"'“”]*(?:[^\s:：]{1,10}\s*[:：])?\s*/, '').replace(/["“”]/g, '')
      .split(/(?<=[.!?~])\s+/).slice(0, 3).join(' ').trim();
  }

  g.NpcLLM = LLM;
})(typeof window !== 'undefined' ? window : globalThis);
