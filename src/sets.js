/* 합주팡 — 세트(악기 묶음 + 노래) 정의
 *
 * 세트마다 11단계 악기, 템포, 4마디 화음 진행, 그리고 악기별 연주 방법이 있다.
 * 작은 악기 6개는 리듬, 큰 악기 5개는 선율과 화음을 맡는다.
 *
 * 같은 악기가 판 위에 여러 개 있으면 한 소절 묶음씩 차례로 다른 변주(A, B, C, D)를 연주해서
 * 리듬과 멜로디가 그만큼 길어진다.
 *
 * 리듬 표기: 16칸 문자열, '.' = 쉼, 1~9 = 세기. first = 묶음 첫 마디, bar = 보통 마디, fill = 묶음 마지막 마디
 * 선율 표기: '음이름옥타브:16분음표 개수', r = 쉼표. 한 마디는 16칸.
 */
(function () {
  'use strict';

  const RADII = [15, 20, 26, 32, 39, 47, 56, 65, 75, 86, 98];
  const UNLOCK_TIER = 7;   // 이전 세트에서 8번째 악기를 만들면 다음 세트가 열린다

  /* ---------- 리듬 ---------- */

  const ORCH_RHYTHM = {
    r0: [ // 빠른 잔리듬
      { bar: '9.57..8.6.75..8.' },
      { bar: '9.9.5.9.9.5.9.55' },
      { bar: '9..7..9..7..9.7.' },
      { bar: '9.57..8.6.75..8.', fill: '7898.7898.789999' },
    ],
    r1: [ // 마디 머리 강조
      { bar: '9.........5.....' },
      { bar: '9.......9.......' },
      { bar: '9.....6.....6...' },
      { bar: '9...5...9...5...', fill: '9.5.9.5.9.5.9999' },
    ],
    r2: [ // 2·4박 찰랑
      { bar: '....9..3....9.4.' },
      { bar: '..5.9.5...5.9.5.' },
      { bar: '4444944444449444' },
      { bar: '....9..3....9.4.', fill: '....9...9.9.9999' },
    ],
    r3: [ // 백비트
      { bar: '....9..2....9..3', fill: '....9..2....7899' },
      { bar: '....9..2..2.9..3', fill: '....9.....7.8899' },
      { bar: '..3.9..3..3.9.3.', fill: '9.9.9.9.99999999' },
      { bar: '....9..2....9..3', fill: '....9.5.6.7.8.99' },
    ],
    r4: [ // 심벌: 8 이상은 크래시, 그 아래는 라이드
      { first: '9.3.5.3.5.3.5.3.', bar: '5.3.5.3.5.3.5.3.' },
      { first: '9...5...9...5...', bar: '5...5...5...5...', fill: '5...5...9...9...' },
      { first: '9.......9.......', bar: '....5.......5...' },
      { first: '9.3.5.3.5.3.5.3.', bar: '5.3.5.3.5.3.5.3.', fill: '9.......9...9.9.' },
    ],
    r5: [ // 큰북
      { bar: '9.....7.9..5....', fill: '9.....7.9...7654' },
      { bar: '9..6..7.9..6....', fill: '9..6..7.9...7654' },
      { bar: '9.......9.6.....', fill: '9.......9.6.7654' },
      { bar: '9.....7.9..5..6.', fill: '9.....7.9.987654' },
    ],
  };

  const ELECTRO_RHYTHM = {
    r0: [
      { bar: '7.5.9.5.7.5.9.5.' },
      { bar: '7579757975797579' },
      { bar: '..9...9...9...9.' },
      { bar: '7.5.9.5.7.5.9.5.', fill: '7.5.9.5.99999999' },
    ],
    r1: [
      { bar: '9..6..9...6.9...' },
      { bar: '9.9..9.9..9.9...' },
      { bar: '...9...9...9...9' },
      { bar: '9..6..9...6.9...', fill: '9.9.9.9.9999....' },
    ],
    r2: [
      { bar: '....9.......9...' },
      { bar: '....9.......9..5' },
      { bar: '....9..5....9.5.' },
      { bar: '....9.......9...', fill: '....9...9.9.9999' },
    ],
    r3: [
      { bar: '............9...', fill: '....9...9.9.9999' },
      { bar: '....9..3....9..3', fill: '9.9.9.9.99999999' },
      { bar: '..5...5...5...9.', fill: '9999999999999999' },
      { bar: '....9.......9...', fill: '....9.5.6.7.8.99' },
    ],
    r4: [
      { first: '9.5...5...5...5.', bar: '..5...5...5...5.' },
      { first: '9...............', bar: '..5...5...5...5.' },
      { first: '9.5.5.5.5.5.5.5.', bar: '5.5.5.5.5.5.5.5.' },
      { first: '9.5...5...5...5.', bar: '..5...5...5...5.', fill: '..5...5...9...9.' },
    ],
    r5: [
      { bar: '9...9...9...9...' },
      { bar: '9...9...9...9.5.' },
      { bar: '9...9..59...9...' },
      { bar: '9...9...9...9...', fill: '9...9...9.9.9999' },
    ],
  };

  const CAT_RHYTHM = {
    r0: [
      { bar: '9.5.9.5.9.5.9.5.' },
      { bar: '9.59.59.9.59.5.5' },
      { bar: '..9...9...9...9.' },
      { bar: '9.5.9.5.9.5.9.5.', fill: '9.5.9.5.9.999999' },
    ],
    r1: ORCH_RHYTHM.r1,
    r2: [
      { bar: '....9.......9...' },
      { bar: '..5.9...5...9...' },
      { bar: '....9..5..5.9...' },
      { bar: '....9.......9...', fill: '....9...9.9.9.99' },
    ],
    r3: ORCH_RHYTHM.r3,
    r4: [
      { first: '9...............', bar: '..4...4...4...4.' },
      { first: '9.......5.......', bar: '....5.......5...' },
      { first: '9...4...4...4...', bar: '4...4...4...4...' },
      { first: '9...............', bar: '..4...4...4...4.', fill: '..4...4...9.....' },
    ],
    r5: [
      { bar: '9.....7.9.......', fill: '9.....7.9...9.9.' },
      { bar: '9..6..7.9..6....' },
      { bar: '9.......9.6.....' },
      { bar: '9.....7.9..5..6.', fill: '9.....7.9.9.9999' },
    ],
  };

  const CHINA_RHYTHM = {
    r0: [ // 목어: 또각또각
      { bar: '9...9...9.9.9...' },
      { bar: '9.5.9.5.9.5.9.55' },
      { bar: '9..9..9.9..9..9.' },
      { bar: '9...9...9.9.9...', fill: '9.9.9.9.99999999' },
    ],
    r1: [ // 바라
      { bar: '9.......5.......' },
      { bar: '9...5...9...5...' },
      { bar: '9.....9.....9...' },
      { bar: '9.......5.......', fill: '9.9.9.9.9.999999' },
    ],
    r2: [ // 박판: 박자 머리를 짚는다
      { bar: '9...5...9...5...' },
      { bar: '9.5.9...9.5.9...' },
      { bar: '9...........9.9.' },
      { bar: '9...5...9...5...', fill: '9...9...9.9.9999' },
    ],
    r3: [ // 판고: 경극의 날카로운 작은북
      { bar: '..5.9.5...5.9.55', fill: '9999999999999999' },
      { bar: '9.5.5.9.5.5.9.5.', fill: '9.5.9.5.99999999' },
      { bar: '....9..5....9..5', fill: '....9.9.99999999' },
      { bar: '..5.9.5...5.9.55', fill: '9.9.9.9.99999999' },
    ],
    r4: [ // 징: 9 = 큰 징, 그 아래 = 음이 올라가는 작은 징
      { first: '9...............', bar: '........5.......' },
      { first: '9.......5.......', bar: '5.......5.......' },
      { first: '9...5...5...5...', bar: '5...5...5...5...' },
      { first: '9...............', bar: '....5.......5...', fill: '5.5.5.5.9.......' },
    ],
    r5: [ // 대고
      { bar: '9.......9.......', fill: '9.9.9.9.99999999' },
      { bar: '9.....9.9.......' },
      { bar: '9..9..9.9.......' },
      { bar: '9.......9.......', fill: '9...9...9.9.9999' },
    ],
  };

  const INDIA_RHYTHM = {
    r0: [ // 만지라
      { bar: '9...5...9...5...' },
      { bar: '9.5.9.5.9.5.9.5.' },
      { bar: '9..5..9.9..5..9.' },
      { bar: '9...5...9...5...', fill: '9.9.9.9.99999999' },
    ],
    r1: [ // 가탐
      { bar: '9.5..59.9.5..5..' },
      { bar: '9..5.5..9..5.5..' },
      { bar: '9.55.5..9.55.5.5' },
      { bar: '9.5..59.9.5..5..', fill: '9.59.59.9.599999' },
    ],
    r2: [ // 칸제라
      { bar: '....9..5....9.55' },
      { bar: '..5.9.5...5.9.5.' },
      { bar: '5.5.9.5.5.5.9.5.' },
      { bar: '....9..5....9.55', fill: '..5.9.5.9.9.9999' },
    ],
    r3: [ // 타블라 케르와: 9 = 다, 6~8 = 나/틴, 그 아래 = 게/카
      { bar: '9.4.7.5.7.3.9.7.' },
      { bar: '9.47.57.3.9.77.7' },
      { bar: '9..9..7.9.7.7...' },
      { bar: '9.4.7.5.7.3.9.7.', fill: '9.7.9.7.9.7.9999' },
    ],
    r4: [ // 간타(사원 종): 9 = 큰 종, 그 아래 = 작은 종
      { first: '9...............', bar: '........5.......' },
      { first: '9.......5.......', bar: '5.......5.......' },
      { first: '9...5...5...5...', bar: '....5.......5...' },
      { first: '9...............', bar: '........5.......', fill: '5...5...5.5.9...' },
    ],
    r5: [ // 돌: 방그라 리듬
      { bar: '9..7..9...9..7..' },
      { bar: '9..7..9.9..7..9.' },
      { bar: '9.7.9.7.9.7.9.7.' },
      { bar: '9..7..9...9..7..', fill: '9.9.9.9.99999999' },
    ],
  };

  /* ---------- 세트 ---------- */

  const SETS = [
    {
      id: 'orchestra',
      name: '오케스트라',
      blurb: '캐스터네츠부터 피아노까지, 무대 위 오케스트라',
      bpm: 120,
      chords: [[48, [0, 4, 7]], [45, [9, 0, 4]], [41, [5, 9, 0]], [43, [7, 11, 2]]],   // C Am F G
      light: '255,196,110',
      rhythm: ORCH_RHYTHM,
      instruments: [
        { name: '캐스터네츠', color: '#c8693e', ink: '#fff3e6', icon: 'castanets', voice: 'castanets', part: { rhythm: 'r0' }, vol: 0.5, rev: 0.1 },
        { name: '트라이앵글', color: '#5fc4dc', ink: '#f2fbff', icon: 'triangle', voice: 'triangle', part: { rhythm: 'r1' }, vol: 0.3, rev: 0.35 },
        { name: '탬버린', color: '#ef5b6f', ink: '#fff0f2', icon: 'tambourine', voice: 'tambourine', part: { rhythm: 'r2' }, vol: 0.32, rev: 0.2 },
        { name: '작은북', color: '#4f74f0', ink: '#eef2ff', icon: 'snare', voice: 'snare', part: { rhythm: 'r3' }, vol: 0.5, rev: 0.2 },
        { name: '심벌즈', color: '#f2c53d', ink: '#6b4c00', icon: 'cymbals', voice: 'cymbal', part: { rhythm: 'r4' }, vol: 0.26, rev: 0.3 },
        { name: '드럼', color: '#9658e0', ink: '#f6eeff', icon: 'drum', voice: 'bassdrum', part: { rhythm: 'r5' }, vol: 0.85, rev: 0.08 },
        { name: '피리', color: '#33bf86', ink: '#effff7', icon: 'flute', voice: 'flute', part: { phrases: 'counter' }, vol: 0.2, rev: 0.4 },
        { name: '바이올린', color: '#b8432f', ink: '#ffe2b8', icon: 'violin', voice: 'violin', part: { gen: 'line', center: 74 }, vol: 0.13, rev: 0.45 },
        { name: '콘트라베이스', color: '#6e3f22', ink: '#f6cf94', icon: 'contrabass', voice: 'pizz', part: { gen: 'bass' }, vol: 0.7, rev: 0.12 },
        { name: '색소폰', color: '#127f86', ink: '#ffd36b', icon: 'sax', voice: 'sax', part: { phrases: 'riff' }, vol: 0.15, rev: 0.3 },
        { name: '피아노', color: '#262338', ink: '#fbf7ef', icon: 'piano', voice: 'piano', part: { main: true, comp: true }, vol: 0.32, rev: 0.35 },
      ],
      phrases: {
        counter: [
          ['G5:6 C6:2 B5:4 G5:4', 'A5:8 E5:4 G5:4', 'F5:6 A5:2 C6:8', 'B5:4 A5:4 G5:8'],
          ['E6:4 D6:2 C6:2 G5:8', 'A5:4 C6:4 E6:8', 'F6:4 E6:2 D6:2 C6:4 A5:4', 'B5:6 C6:2 D6:8'],
        ],
        riff: [
          ['r:2 G4:2 Bb4:1 C5:3 r:2 G4:2 E4:4', 'r:2 A4:2 C5:2 E5:4 r:2 D5:2 C5:2', 'r:2 F4:2 A4:2 C5:2 Eb5:1 E5:3 C5:4', 'B4:2 D5:2 F5:4 r:2 D5:2 B4:4'],
          ['C5:3 C5:1 r:2 E5:2 G5:4 E5:2 C5:2', 'A4:3 A4:1 r:2 C5:2 E5:4 D5:2 C5:2', 'F4:3 F4:1 r:2 A4:2 C5:2 D5:2 Eb5:2 E5:2', 'D5:4 B4:2 G4:2 r:2 A4:2 B4:2 D5:2'],
        ],
        main: [
          ['E5:4 G5:2 E5:2 C5:4 D5:2 E5:2', 'C5:4 A4:4 C5:2 E5:2 A5:4', 'G5:2 F5:2 E5:2 F5:2 A5:4 F5:4', 'D5:4 B4:2 D5:2 G5:8',
            'C6:4 B5:2 A5:2 G5:4 E5:4', 'A5:4 G5:2 E5:2 C5:4 E5:4', 'F5:2 E5:2 D5:2 C5:2 A4:4 D5:2 F5:2', 'G5:4 D5:4 B4:2 D5:2 C5:4'],
          ['G5:2 G5:2 A5:2 G5:2 E5:4 C5:4', 'E5:2 E5:2 F5:2 E5:2 C5:4 A4:4', 'A4:2 C5:2 F5:2 A5:2 G5:4 F5:4', 'D5:2 E5:2 F5:2 D5:2 B4:8',
            'E5:6 F5:2 G5:4 C6:4', 'B5:4 A5:2 G5:2 E5:8', 'F5:4 A5:4 C6:4 A5:4', 'G5:4 F5:2 D5:2 C5:8'],
        ],
      },
    },
    {
      id: 'electro',
      name: '일렉트로',
      blurb: '하이햇과 킥 위에 신스가 쏟아지는 전자 악기',
      bpm: 124,
      chords: [[45, [9, 0, 4]], [41, [5, 9, 0]], [48, [0, 4, 7]], [43, [7, 11, 2]]],   // Am F C G
      light: '80,230,255',
      rhythm: ELECTRO_RHYTHM,
      bassStyle: 'electro',
      instruments: [
        { name: '하이햇', color: '#3a4a6b', ink: '#9ff6ff', icon: 'hihat', voice: 'hihat', part: { rhythm: 'r0' }, vol: 0.32, rev: 0.05 },
        { name: '카우벨', color: '#e0a526', ink: '#2b1a00', icon: 'cowbell', voice: 'cowbell', part: { rhythm: 'r1' }, vol: 0.16, rev: 0.15 },
        { name: '클랩', color: '#ff4f9a', ink: '#fff0f7', icon: 'clap', voice: 'clap', part: { rhythm: 'r2' }, vol: 0.45, rev: 0.3 },
        { name: '스네어', color: '#2fb3a0', ink: '#eafffb', icon: 'pad', voice: 'esnare', part: { rhythm: 'r3' }, vol: 0.4, rev: 0.25 },
        { name: '크래시', color: '#c9d64a', ink: '#2e3300', icon: 'crash', voice: 'ecrash', part: { rhythm: 'r4' }, vol: 0.22, rev: 0.2 },
        { name: '킥', color: '#ff6a3d', ink: '#fff2ea', icon: 'speaker', voice: 'kick808', part: { rhythm: 'r5' }, vol: 0.95, rev: 0.02 },
        { name: '아르페지오', color: '#7a5cff', ink: '#f1edff', icon: 'arp', voice: 'arp', part: { gen: 'arp', center: 64 }, vol: 0.13, rev: 0.3 },
        { name: '신스 패드', color: '#1f8fff', ink: '#e9f4ff', icon: 'wave', voice: 'spad', part: { gen: 'pad', center: 62 }, vol: 0.09, rev: 0.5 },
        { name: '신스 베이스', color: '#14b85a', ink: '#eafff2', icon: 'saw', voice: 'sbass', part: { gen: 'bass' }, vol: 0.5, rev: 0.05 },
        { name: '플럭', color: '#e8384f', ink: '#fff0f2', icon: 'bolt', voice: 'pluck', part: { phrases: 'riff' }, vol: 0.18, rev: 0.35 },
        { name: '신디사이저', color: '#14121f', ink: '#5ff3ff', icon: 'synth', voice: 'lead', part: { main: true, comp: false }, vol: 0.12, rev: 0.35 },
      ],
      phrases: {
        riff: [
          ['A4:2 r:1 A4:1 C5:2 r:2 E5:2 r:2 A4:2 r:2', 'F4:2 r:1 F4:1 A4:2 r:2 C5:2 r:2 F4:2 r:2', 'C5:2 r:1 C5:1 E5:2 r:2 G5:2 r:2 C5:2 r:2', 'G4:2 r:1 G4:1 B4:2 r:2 D5:2 r:2 G4:2 r:2'],
          ['r:2 E5:2 r:2 E5:2 r:2 E5:2 D5:2 C5:2', 'r:2 C5:2 r:2 C5:2 r:2 C5:2 A4:2 F4:2', 'r:2 G5:2 r:2 G5:2 r:2 G5:2 E5:2 C5:2', 'r:2 D5:2 r:2 D5:2 r:2 B4:2 A4:2 G4:2'],
        ],
        main: [
          ['A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2', 'F5:4 E5:2 C5:2 A4:4 C5:4', 'G5:2 E5:2 C5:2 E5:2 G5:4 C6:4', 'B5:4 G5:2 D5:2 B4:4 D5:4',
            'A5:3 A5:3 G5:2 E5:4 C5:4', 'F5:3 F5:3 E5:2 C5:4 A4:4', 'E5:2 G5:2 C6:2 G5:2 E5:2 G5:2 C6:4', 'B5:4 D6:4 B5:4 G5:4'],
          ['E5:6 E5:2 D5:2 C5:2 B4:2 C5:2', 'A4:6 C5:2 F5:4 E5:4', 'G5:6 G5:2 F5:2 E5:2 D5:2 E5:2', 'D5:6 B4:2 G4:4 B4:4',
            'A5:2 r:2 A5:2 G5:2 r:2 E5:2 C5:4', 'F5:2 r:2 F5:2 E5:2 r:2 C5:2 A4:4', 'C6:2 r:2 C6:2 B5:2 r:2 G5:2 E5:4', 'D6:4 B5:4 G5:4 E5:4'],
        ],
      },
    },
    {
      id: 'cats',
      name: '고양이 아카펠라',
      blurb: '츳츳 비트박스부터 디바냥까지, 목소리만으로 하는 합창',
      bpm: 100,
      chords: [[41, [5, 9, 0]], [38, [2, 5, 9]], [43, [7, 10, 2]], [48, [0, 4, 7]]],   // F Dm Gm C
      light: '255,150,200',
      rhythm: CAT_RHYTHM,
      instruments: [
        { name: '츳츳냥', color: '#f3dcb4', ink: '#5a3a1e', icon: 'cat', cat: { eyes: 'dot', mouth: 'small' }, voice: 'tsk', part: { rhythm: 'r0' }, vol: 0.4, rev: 0.1 },
        { name: '골골냥', color: '#f0a050', ink: '#5a2e08', icon: 'cat', cat: { eyes: 'happy', mouth: 'w', stripes: true }, voice: 'purr', part: { rhythm: 'r1' }, vol: 0.55, rev: 0.1 },
        { name: '꾹꾹냥', color: '#a9adb8', ink: '#2c2e36', icon: 'cat', cat: { eyes: 'dot', mouth: 'w', paws: true }, voice: 'click', part: { rhythm: 'r2' }, vol: 0.45, rev: 0.2 },
        { name: '카냥', color: '#2c2a33', ink: '#f4f1ff', icon: 'cat', cat: { eyes: 'wide', mouth: 'open' }, voice: 'kah', part: { rhythm: 'r3' }, vol: 0.45, rev: 0.2 },
        { name: '하악냥', color: '#f6f3ee', ink: '#3b3530', icon: 'cat', cat: { eyes: 'angry', mouth: 'fang' }, voice: 'hiss', part: { rhythm: 'r4' }, vol: 0.22, rev: 0.25 },
        { name: '붐냥', color: '#8a5a3b', ink: '#fff1e2', icon: 'cat', cat: { eyes: 'happy', mouth: 'small', phones: true }, voice: 'boom', part: { rhythm: 'r5' }, vol: 0.9, rev: 0.05 },
        { name: '알토냥', color: '#e7c9a0', ink: '#4a2f17', icon: 'cat', cat: { eyes: 'happy', mouth: 'o', patches: true, bow: true }, voice: 'oo', part: { gen: 'line', center: 67 }, vol: 0.2, rev: 0.45 },
        { name: '테너냥', color: '#7d8fa6', ink: '#f1f5ff', icon: 'cat', cat: { eyes: 'dot', mouth: 'open', bow: true }, voice: 'ah', part: { gen: 'pad', center: 60 }, vol: 0.1, rev: 0.45 },
        { name: '베이스냥', color: '#4a3326', ink: '#ffe9cf', icon: 'cat', cat: { eyes: 'shades', mouth: 'o' }, voice: 'doom', part: { gen: 'bass' }, vol: 0.6, rev: 0.12 },
        { name: '소프라노냥', color: '#f7b8cf', ink: '#6b2440', icon: 'cat', cat: { eyes: 'sparkle', mouth: 'open', ribbon: true }, voice: 'nya', part: { phrases: 'riff' }, vol: 0.2, rev: 0.4 },
        { name: '디바냥', color: '#f2c14e', ink: '#4d3300', icon: 'cat', cat: { eyes: 'happy', mouth: 'open', crown: true, mic: true }, voice: 'meow', part: { main: true, comp: false }, vol: 0.22, rev: 0.45 },
      ],
      phrases: {
        riff: [
          ['r:4 A5:2 A5:2 r:4 C6:2 A5:2', 'r:4 F5:2 F5:2 r:4 A5:2 F5:2', 'r:4 G5:2 G5:2 r:4 Bb5:2 G5:2', 'r:4 E5:2 E5:2 r:4 G5:2 E5:2'],
          ['C6:2 r:2 A5:2 r:2 F5:2 r:2 A5:4', 'A5:2 r:2 F5:2 r:2 D5:2 r:2 F5:4', 'Bb5:2 r:2 G5:2 r:2 D5:2 r:2 G5:4', 'G5:2 r:2 E5:2 r:2 C5:2 r:2 E5:4'],
        ],
        main: [
          ['C5:4 F5:4 A5:6 G5:2', 'F5:4 D5:4 A4:8', 'Bb4:4 D5:4 G5:6 F5:2', 'E5:4 G5:4 C5:8',
            'A5:4 C6:4 A5:4 F5:4', 'A5:4 F5:2 D5:2 A4:8', 'G5:4 Bb5:4 D6:4 Bb5:4', 'G5:4 E5:4 C5:4 r:4'],
          ['F5:2 G5:2 A5:4 C6:8', 'D6:2 C6:2 A5:4 F5:8', 'G5:2 A5:2 Bb5:4 D6:8', 'C6:2 Bb5:2 G5:4 E5:8',
            'F5:6 A5:2 C6:8', 'D6:6 C6:2 A5:8', 'Bb5:6 A5:2 G5:4 Bb5:4', 'A5:4 G5:4 F5:8'],
        ],
      },
    },
    {
      id: 'china',
      name: '중국풍',
      blurb: '목어와 징 위로 얼후가 노래하는 오음계 가락',
      bpm: 96,
      chords: [[43, [7, 9, 2]], [40, [4, 7, 11]], [45, [9, 11, 4]], [38, [2, 4, 9]]],   // 오음계 G - Em - A sus2 - D sus2
      light: '255,90,60',
      rhythm: CHINA_RHYTHM,
      instruments: [
        { name: '목어', color: '#b5652e', ink: '#ffe8cc', icon: 'woodfish', voice: 'woodblock', part: { rhythm: 'r0' }, vol: 0.45, rev: 0.2 },
        { name: '바라', color: '#d9a62a', ink: '#5a3d00', icon: 'bo', voice: 'bo', part: { rhythm: 'r1' }, vol: 0.2, rev: 0.3 },
        { name: '박판', color: '#8c5a33', ink: '#ffe3c2', icon: 'paiban', voice: 'paiban', part: { rhythm: 'r2' }, vol: 0.45, rev: 0.25 },
        { name: '판고', color: '#2c2a2a', ink: '#ff6b5a', icon: 'bangu', voice: 'bangu', part: { rhythm: 'r3' }, vol: 0.4, rev: 0.25 },
        { name: '징', color: '#c9902a', ink: '#3b2600', icon: 'gong', voice: 'gong', part: { rhythm: 'r4' }, vol: 0.3, rev: 0.35 },
        { name: '대고', color: '#c8242d', ink: '#ffd76b', icon: 'barrel', voice: 'dagu', part: { rhythm: 'r5' }, vol: 0.85, rev: 0.15 },
        { name: '디즈', color: '#5c9e3e', ink: '#fff6dc', icon: 'dizi', voice: 'dizi', part: { phrases: 'counter' }, vol: 0.16, rev: 0.45 },
        { name: '생황', color: '#2f6f5e', ink: '#ffd76b', icon: 'sheng', voice: 'sheng', part: { gen: 'pad', center: 64 }, vol: 0.08, rev: 0.4 },
        { name: '구정', color: '#7a3b1e', ink: '#ffe0b0', icon: 'guzheng', voice: 'guzheng', part: { gen: 'bass' }, vol: 0.45, rev: 0.35 },
        { name: '비파', color: '#e06a3a', ink: '#fff1e0', icon: 'pipa', voice: 'pipa', part: { phrases: 'riff' }, vol: 0.28, rev: 0.3 },
        { name: '얼후', color: '#1e1a2e', ink: '#ffcf4a', icon: 'erhu', voice: 'erhu', part: { main: true, comp: false }, vol: 0.15, rev: 0.4 },
      ],
      phrases: {
        counter: [
          ['D6:2 E6:2 D6:2 B5:2 A5:8', 'G5:2 A5:2 B5:4 E6:8', 'A5:2 B5:2 D6:4 E6:4 D6:4', 'B5:4 A5:4 E5:8'],
          ['G6:4 E6:4 D6:8', 'E6:2 D6:2 B5:4 G5:8', 'A5:4 E6:4 D6:2 B5:2 A5:4', 'D6:6 B5:2 A5:8'],
        ],
        riff: [
          ['G4:2 B4:2 D5:2 B4:2 G4:2 B4:2 D5:4', 'E4:2 G4:2 B4:2 G4:2 E4:2 G4:2 B4:4', 'A4:2 B4:2 E5:2 B4:2 A4:2 B4:2 E5:4', 'D5:2 B4:2 A4:2 E4:2 D4:8'],
          ['r:4 D5:4 r:2 E5:2 D5:4', 'r:4 B4:4 r:2 D5:2 B4:4', 'r:4 E5:4 r:2 G5:2 E5:4', 'r:4 A4:4 r:2 B4:2 A4:4'],
        ],
        main: [
          ['D5:4 E5:2 G5:2 A5:6 G5:2', 'E5:4 G5:4 B5:6 A5:2', 'A5:4 B5:2 A5:2 E5:4 D5:4', 'E5:2 D5:2 B4:4 A4:8',
            'D6:4 B5:2 A5:2 G5:6 A5:2', 'B5:4 A5:2 G5:2 E5:8', 'A5:2 B5:2 A5:2 G5:2 E5:4 G5:4', 'A5:4 G5:2 E5:2 D5:8'],
          ['G5:2 A5:2 B5:4 D6:6 B5:2', 'E6:4 D6:2 B5:2 G5:8', 'A5:6 B5:2 A5:2 G5:2 E5:4', 'D5:6 E5:2 A5:8',
            'B5:3 A5:1 G5:4 E5:3 D5:1 E5:4', 'G5:3 E5:1 D5:4 B4:8', 'E5:2 G5:2 A5:4 B5:2 D6:2 E6:4', 'D6:4 B5:2 A5:2 G5:8'],
        ],
      },
    },
    {
      id: 'india',
      name: '인도',
      blurb: '타블라와 탄푸라 드론 위에 시타르가 휘어지는 라가',
      bpm: 108,
      chords: [[38, [2, 6, 9]], [36, [0, 4, 7]], [43, [7, 11, 2]], [38, [2, 6, 9]]],   // D - C - G - D (믹솔리디안)
      light: '255,160,40',
      rhythm: INDIA_RHYTHM,
      instruments: [
        { name: '만지라', color: '#d4a017', ink: '#4a3300', icon: 'manjira', voice: 'manjira', part: { rhythm: 'r0' }, vol: 0.22, rev: 0.3 },
        { name: '가탐', color: '#b4532a', ink: '#ffe2c8', icon: 'ghatam', voice: 'ghatam', part: { rhythm: 'r1' }, vol: 0.5, rev: 0.2 },
        { name: '칸제라', color: '#e0b97a', ink: '#5a3410', icon: 'tambourine', voice: 'kanjira', part: { rhythm: 'r2' }, vol: 0.4, rev: 0.2 },
        { name: '타블라', color: '#3d2a5c', ink: '#ffd7a0', icon: 'tabla', voice: 'tabla', part: { rhythm: 'r3' }, vol: 0.5, rev: 0.25 },
        { name: '간타', color: '#e8b33a', ink: '#5a3a00', icon: 'bell', voice: 'ghanta', part: { rhythm: 'r4' }, vol: 0.22, rev: 0.45 },
        { name: '돌', color: '#d6402f', ink: '#fff0d6', icon: 'dhol', voice: 'dhol', part: { rhythm: 'r5' }, vol: 0.85, rev: 0.12 },
        { name: '반수리', color: '#6aa84f', ink: '#fff7e0', icon: 'flute', voice: 'bansuri', part: { phrases: 'counter' }, vol: 0.16, rev: 0.45 },
        { name: '하모니움', color: '#8a3b5c', ink: '#ffe9f2', icon: 'harmonium', voice: 'harmonium', part: { gen: 'pad', center: 62 }, vol: 0.07, rev: 0.3 },
        { name: '탄푸라', color: '#a0672e', ink: '#fff0d8', icon: 'tanpura', voice: 'tanpura', part: { gen: 'drone', tonic: 50 }, vol: 0.32, rev: 0.4 },
        { name: '산투르', color: '#127a7a', ink: '#ffe08a', icon: 'santoor', voice: 'santoor', part: { phrases: 'riff' }, vol: 0.2, rev: 0.4 },
        { name: '시타르', color: '#1b2a4a', ink: '#ffb347', icon: 'sitar', voice: 'sitar', part: { main: true, comp: false }, vol: 0.3, rev: 0.4 },
      ],
      phrases: {
        counter: [
          ['F#6:8 E6:4 D6:4', 'E6:8 C6:4 E6:4', 'D6:8 B5:4 D6:4', 'A5:4 C6:4 D6:8'],
          ['A5:2 D6:2 F#6:4 E6:4 D6:4', 'C6:2 E6:2 G6:4 E6:4 C6:4', 'B5:2 D6:2 G6:4 F#6:4 D6:4', 'E6:4 D6:2 C6:2 D6:8'],
        ],
        riff: [
          ['D5:1 F#5:1 A5:1 D6:1 A5:1 F#5:1 D5:2 r:4 A5:2 F#5:2', 'C5:1 E5:1 G5:1 C6:1 G5:1 E5:1 C5:2 r:4 G5:2 E5:2',
            'B4:1 D5:1 G5:1 B5:1 G5:1 D5:1 B4:2 r:4 G5:2 D5:2', 'A4:1 D5:1 F#5:1 A5:1 F#5:1 D5:1 A4:2 r:4 F#5:2 D5:2'],
          ['r:2 A5:1 A5:1 r:2 F#5:1 F#5:1 r:2 D5:1 D5:1 E5:2 F#5:2', 'r:2 G5:1 G5:1 r:2 E5:1 E5:1 r:2 C5:1 C5:1 D5:2 E5:2',
            'r:2 B5:1 B5:1 r:2 G5:1 G5:1 r:2 D5:1 D5:1 E5:2 G5:2', 'r:2 A5:1 A5:1 r:2 F#5:1 F#5:1 r:2 E5:1 E5:1 D5:4'],
        ],
        main: [
          ['D5:4 E5:2 F#5:2 A5:6 G5:2', 'E5:4 G5:2 E5:2 C5:6 D5:2', 'B4:2 D5:2 G5:4 B5:4 A5:4', 'A5:2 G5:2 F#5:2 E5:2 D5:8',
            'A5:4 B5:2 C6:2 D6:6 C6:2', 'B5:2 C6:2 B5:2 G5:2 E5:8', 'G5:2 A5:2 B5:2 A5:2 G5:4 E5:4', 'F#5:4 E5:2 C5:2 D5:8'],
          ['A4:2 D5:2 F#5:4 A5:4 F#5:4', 'G5:2 E5:2 C5:4 E5:4 G5:4', 'D6:4 B5:2 G5:2 A5:4 B5:4', 'A5:6 F#5:2 E5:4 D5:4',
            'D5:1 E5:1 F#5:2 G5:2 A5:2 B5:2 C6:2 D6:4', 'C6:4 B5:2 A5:2 G5:4 E5:4', 'B5:4 G5:2 D5:2 E5:4 G5:4', 'A5:2 G5:2 F#5:2 E5:2 D5:8'],
        ],
      },
    },
  ];

  SETS.forEach((set) => {
    set.instruments.forEach((it, i) => {
      it.r = RADII[i];
      it.points = ((i + 1) * (i + 2)) / 2;
      it.secs = (it.part.main ? 32 : 16) * 60 / set.bpm;   // 한 변주의 길이(초)
    });
  });

  window.SETS = SETS;
  window.SET_RULES = { UNLOCK_TIER };
})();
