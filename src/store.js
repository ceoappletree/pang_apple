// 진행 상황 저장 (브라우저 localStorage)
(function () {
  const KEY = G.STORE_KEY || 'dojagi-dig-v1';

  function fresh() {
    return { found: {}, pieces: {}, restored: {}, extras: {}, research: 0, digs: 0, surveys: 0 };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* 저장소를 못 쓰면 새로 시작 */ }
    return fresh();
  }

  const S = load();

  G.store = {
    S,
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ }
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
      Object.assign(S, fresh());
    },
    fame() { return Object.keys(S.restored).length; },
    pieces(potId) { return S.pieces[potId] || Array(G.PIECES).fill(false); },
    // 조각을 얻는다. 반환: 'new' | 'dup' | 'complete'
    addPiece(potId, idx) {
      const p = this.pieces(potId).slice();
      if (p[idx]) { S.research += 1; return 'dup'; }
      p[idx] = true;
      S.pieces[potId] = p;
      if (p.every(Boolean)) { S.restored[potId] = true; return 'complete'; }
      return 'new';
    },
    // 조각 말고 따로 모으는 발굴품(명문, 가마 도구 등). 반환: 'new' | 'dup'
    addExtra(id) {
      const n = S.extras[id] || 0;
      S.extras[id] = n + 1;
      return n ? 'dup' : 'new';
    },
    unlocked(site) { return this.fame() >= site.need; },
  };
})();
