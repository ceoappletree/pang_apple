// 사과나무 마을 지도, 충돌 판정, A* 길찾기
(function (g) {
  'use strict';

  const W = 36, H = 26;
  const T = {
    GRASS: 0, PATH: 1, WATER: 2, TREE: 3, APPLE_TREE: 4, BUILDING: 5,
    DOOR: 6, ROCK: 7, FLOWERS: 8, BRIDGE: 9, WELL: 10, PLAZA: 11,
  };
  const BLOCKING = new Set([T.WATER, T.TREE, T.APPLE_TREE, T.BUILDING, T.ROCK, T.WELL]);

  const buildings = [
    { id: 'grandma', name: '할머니 집', x: 15, y: 2, w: 5, h: 3, wall: '#e9d8b8', roof: '#b8402f' },
    { id: 'mina', name: '미나 상점', x: 4, y: 16, w: 6, h: 3, wall: '#f3e6c6', roof: '#3f7d8c' },
    { id: 'chulsu', name: '대장간', x: 28, y: 16, w: 5, h: 3, wall: '#cdbfae', roof: '#5b4a3f' },
  ];
  buildings.forEach(b => {
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    b.front = { x: b.door.x, y: b.door.y + 1 };
  });

  const appleTrees = [[3, 3], [6, 3], [9, 3], [12, 3], [3, 6], [6, 6], [9, 6], [12, 6]];
  const rocks = [[30, 8], [32, 9], [29, 10], [33, 7], [31, 6]];
  const decoTrees = [[22, 3], [21, 2], [10, 10], [2, 22], [5, 23], [9, 22], [33, 22], [31, 23],
    [34, 3], [27, 4], [22, 18], [11, 23], [2, 13], [20, 23], [28, 12], [34, 15]];
  const flowerPatches = [[20, 7, 3, 3], [3, 10, 3, 2], [19, 15, 3, 2], [27, 22, 3, 2], [8, 9, 2, 1]];

  const grid = new Uint8Array(W * H);
  const idx = (x, y) => y * W + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) grid[idx(x, y)] = t; };
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? T.TREE : grid[idx(x, y)];

  function hline(y, x1, x2, t) { for (let x = x1; x <= x2; x++) set(x, y, t); }
  function vline(x, y1, y2, t) { for (let y = y1; y <= y2; y++) set(x, y, t); }

  // 강, 연못
  vline(24, 1, H - 2, T.WATER); vline(25, 1, H - 2, T.WATER);
  for (let y = 18; y <= 24; y++) for (let x = 13; x <= 23; x++) {
    if (((x - 18) / 3.2) ** 2 + ((y - 21) / 2) ** 2 <= 1) set(x, y, T.WATER);
  }
  flowerPatches.forEach(([x, y, w, h]) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, T.FLOWERS); });

  // 길과 광장
  hline(13, 2, 33, T.PATH);
  set(24, 13, T.BRIDGE); set(25, 13, T.BRIDGE);
  vline(17, 5, 12, T.PATH);
  for (let y = 12; y <= 16; y++) for (let x = 12; x <= 16; x++) set(x, y, T.PLAZA);
  set(14, 14, T.WELL);
  hline(19, 7, 12, T.PATH); vline(12, 17, 19, T.PATH);
  vline(27, 14, 19, T.PATH); hline(19, 27, 30, T.PATH);
  vline(30, 11, 12, T.PATH);
  hline(8, 3, 13, T.PATH);

  buildings.forEach(b => {
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) set(b.x + i, b.y + j, T.BUILDING);
    set(b.door.x, b.door.y, T.DOOR);
  });
  appleTrees.forEach(([x, y]) => set(x, y, T.APPLE_TREE));
  rocks.forEach(([x, y]) => set(x, y, T.ROCK));
  decoTrees.forEach(([x, y]) => set(x, y, T.TREE));
  hline(0, 0, W - 1, T.TREE); hline(H - 1, 0, W - 1, T.TREE);
  vline(0, 0, H - 1, T.TREE); vline(W - 1, 0, H - 1, T.TREE);

  const walkable = (x, y) => !BLOCKING.has(get(x, y));

  // 4방향 A*. 경로는 시작점을 뺀 [{x,y}, ...] 이며, 목표가 막혀 있으면 가장 가까운 칸으로 간다.
  function findPath(sx, sy, tx, ty) {
    if (!walkable(tx, ty)) {
      const n = nearestWalkable(tx, ty, sx, sy);
      if (!n) return null;
      tx = n.x; ty = n.y;
    }
    if (sx === tx && sy === ty) return [];
    const N = W * H;
    const gScore = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const open = [idx(sx, sy)];
    const fScore = new Float32Array(N).fill(Infinity);
    gScore[idx(sx, sy)] = 0;
    fScore[idx(sx, sy)] = Math.abs(sx - tx) + Math.abs(sy - ty);
    const goal = idx(tx, ty);
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      if (cur === goal) {
        const path = [];
        for (let c = cur; c !== idx(sx, sy); c = came[c]) path.push({ x: c % W, y: (c / W) | 0 });
        return path.reverse();
      }
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(nx, ny)) continue;
        const ni = idx(nx, ny);
        if (closed[ni]) continue;
        // 길 위를 조금 더 선호해서 NPC가 길을 따라 걷게 한다
        const t = get(nx, ny);
        const cost = (t === T.PATH || t === T.PLAZA || t === T.BRIDGE) ? 0.8 : 1;
        const ng = gScore[cur] + cost;
        if (ng < gScore[ni]) {
          if (gScore[ni] === Infinity) open.push(ni);
          came[ni] = cur; gScore[ni] = ng;
          fScore[ni] = ng + (Math.abs(nx - tx) + Math.abs(ny - ty)) * 0.8;
        }
      }
    }
    return null;
  }

  function nearestWalkable(x, y, fromX, fromY) {
    let best = null, bd = Infinity;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r || !walkable(x + i, y + j)) continue;
        const d = Math.abs(i) + Math.abs(j) + (fromX == null ? 0 : 0.01 * (Math.abs(x + i - fromX) + Math.abs(y + j - fromY)));
        if (d < bd) { bd = d; best = { x: x + i, y: y + j }; }
      }
    }
    return best;
  }

  // 자원이 떨어지는 장소: 사과나무, 바위, 꽃밭
  const resourceNodes = [
    ...appleTrees.map(([x, y]) => ({ item: 'apple', x, y })),
    ...rocks.map(([x, y]) => ({ item: 'ore', x, y })),
    ...flowerPatches.map(([x, y, w, h]) => ({ item: 'flower', x: x + (w >> 1), y: y + (h >> 1), area: true })),
  ];

  g.World = { W, H, T, grid, get, walkable, findPath, nearestWalkable, buildings, appleTrees, rocks, resourceNodes };
  if (typeof module !== 'undefined') module.exports = g.World;
})(typeof window !== 'undefined' ? window : globalThis);
