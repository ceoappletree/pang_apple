// 지도 어댑터. 카카오 키가 있으면 카카오 스카이뷰 + 로드뷰,
// 없으면 임시로 OpenStreetMap(Leaflet) + OSM 검색(Nominatim)을 쓴다.
(function () {
  const GEO_CACHE = 'sangpanri-geo-v1';

  function loadKakao() {
    const key = G.CONFIG.KAKAO_JS_KEY;
    if (!key) return Promise.reject(new Error('no key'));
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
      s.onload = () => window.kakao.maps.load(() => ok(window.kakao.maps));
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function markEl(html, cls, onTap) {
    const el = document.createElement('div');
    el.className = 'map-mark ' + cls;
    el.innerHTML = html;
    if (onTap) el.addEventListener('click', (e) => { e.stopPropagation(); onTap(); });
    return el;
  }

  // ---------- 카카오 ----------
  function kakaoMap(K, el, onClick) {
    const map = new K.Map(el, { center: new K.LatLng(36.3, 127.95), level: 6, mapTypeId: K.MapTypeId.HYBRID });
    K.event.addListener(map, 'click', (e) => onClick(e.latLng.getLat(), e.latLng.getLng()));
    let rv = null;
    return {
      kind: 'kakao',
      roadview: true,
      mark(lat, lng, html, cls, onTap) {
        const o = new K.CustomOverlay({ position: new K.LatLng(lat, lng), content: markEl(html, cls, onTap), xAnchor: 0, yAnchor: 0, clickable: !!onTap });
        o.setMap(map);
        return { remove: () => o.setMap(null) };
      },
      center(p, zoom) { map.setCenter(new K.LatLng(p.lat, p.lng)); map.setLevel(zoom === 'near' ? 4 : 6); },
      fit(pts) {
        if (!pts.length) return;
        const b = new K.LatLngBounds();
        pts.forEach((p) => b.extend(new K.LatLng(p.lat, p.lng)));
        map.setBounds(b, 70, 40, 70, 40);
      },
      relayout() { map.relayout(); },
      setRoadviewLayer(on) {
        if (on) map.addOverlayMapTypeId(K.MapTypeId.ROADVIEW);
        else map.removeOverlayMapTypeId(K.MapTypeId.ROADVIEW);
      },
      openRoadview(box, lat, lng, radius) {
        return new Promise((ok) => {
          const pos = new K.LatLng(lat, lng);
          new K.RoadviewClient().getNearestPanoId(pos, radius, (panoId) => {
            if (!panoId) return ok(false);
            if (!rv) rv = new K.Roadview(box);
            rv.setPanoId(panoId, pos);
            setTimeout(() => rv.relayout(), 50);
            ok(true);
          });
        });
      },
      geocode(addr) {
        return new Promise((ok) => new K.services.Geocoder().addressSearch(addr, (res, st) => {
          ok(st === K.services.Status.OK && res.length ? { lat: +res[0].y, lng: +res[0].x } : null);
        }));
      },
      keyword(q, near) {
        const opt = near ? { location: new K.LatLng(near.lat, near.lng), radius: 5000 } : {};
        return new Promise((ok) => new K.services.Places().keywordSearch(q, (res, st) => {
          ok(st === K.services.Status.OK && res.length ? { lat: +res[0].y, lng: +res[0].x } : null);
        }, opt));
      },
    };
  }

  // ---------- 임시: Leaflet + OpenStreetMap ----------
  function cacheGet(q) {
    try { return (JSON.parse(localStorage.getItem(GEO_CACHE)) || {})[q]; } catch (e) { return undefined; }
  }
  function cacheSet(q, v) {
    try {
      const all = JSON.parse(localStorage.getItem(GEO_CACHE)) || {};
      all[q] = v;
      localStorage.setItem(GEO_CACHE, JSON.stringify(all));
    } catch (e) { /* 무시 */ }
  }
  let lastAsk = 0;
  async function nominatim(q) {
    const hit = cacheGet(q);
    if (hit !== undefined) return hit;
    const wait = lastAsk + 1100 - Date.now(); // OSM 검색은 1초에 한 번까지
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAsk = Date.now();
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const v = j.length ? { lat: +j[0].lat, lng: +j[0].lon } : null;
      cacheSet(q, v);
      return v;
    } catch (e) {
      return null;
    }
  }

  function leafletMap(el, onClick) {
    const map = L.map(el, { zoomControl: false, minZoom: 7, maxZoom: 18 }).setView([36.3, 127.95], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> (임시 지도)',
    }).addTo(map);
    map.on('click', (e) => onClick(e.latlng.lat, e.latlng.lng));
    const icon = () => L.divIcon({ className: 'map-mark-wrap', html: '', iconSize: [0, 0], iconAnchor: [0, 0] });
    return {
      kind: 'leaflet',
      roadview: false,
      mark(lat, lng, html, cls, onTap) {
        const m = L.marker([lat, lng], { icon: icon(), interactive: false, keyboard: false }).addTo(map);
        const w = m.getElement();
        w.appendChild(markEl(html, cls, onTap));
        L.DomEvent.disableClickPropagation(w);
        return { remove: () => m.remove() };
      },
      center(p, zoom) { map.setView([p.lat, p.lng], zoom === 'near' ? 16 : 14); },
      fit(pts) {
        if (!pts.length) return;
        if (pts.length === 1) { map.setView([pts[0].lat, pts[0].lng], 15); return; }
        map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [60, 60], maxZoom: 16 });
      },
      relayout() { map.invalidateSize(); },
      geocode(addr) { return nominatim(addr); },
      keyword(q) { return nominatim(q); },
    };
  }

  G.createMap = async function (el, onClick) {
    try {
      const K = await loadKakao();
      return kakaoMap(K, el, onClick);
    } catch (e) {
      if (!window.L) return null;
      return leafletMap(el, onClick);
    }
  };

  G.geo = {
    dist(a, b, c, d) {
      const R = 6371000, r = Math.PI / 180;
      const x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    },
    dir(a, b, c, d) {
      const r = Math.PI / 180;
      const y = Math.sin((d - b) * r) * Math.cos(c * r);
      const x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r);
      const deg = (Math.atan2(y, x) / r + 360) % 360;
      return ['북', '북동', '동', '남동', '남', '남서', '서', '북서'][Math.round(deg / 45) % 8];
    },
    // p에서 서쪽으로 m미터 옮긴 점
    west(p, m) {
      return { lat: p.lat, lng: p.lng - m / (111320 * Math.cos(p.lat * Math.PI / 180)) };
    },
  };
})();
