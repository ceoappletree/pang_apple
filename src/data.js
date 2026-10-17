// 상주 상판리 자기가마터 자료.
// 근거: 디지털상주문화대전 「상주 상판리 자기 요지」, 상주박물관 『상주 상판리 자기가마1 유적』(2015)·
// 『상주 상판리 자기가마6 유적』, 『세종실록』 지리지, 『태종실록』, 성현주(2017)·오영인(2019) 연구.
window.G = window.G || {};
G.STORE_KEY = 'sangpanri-dig-v1';

G.SANGPAN = {
  // 카카오 주소 검색으로 실제 좌표를 찾는다
  kilnAddrs: ['경상북도 상주시 모동면 상판리 산58-1', '경상북도 상주시 모동면 상판리 산69'],
  villageAddr: '경상북도 상주시 모동면 상판리',
  reservoir: '상판저수지',
  findRadius: 250, // m — 이 안에서 땅을 살펴야 결정적 증거가 나온다
  clue: '『세종실록』 지리지는 상주의 상품 자기소 한 곳을 "중모현 동쪽 이미외리"라고 적었어요. 오늘날의 상판리로 봐요. 가마터는 상판저수지 서쪽으로 1~1.7km 떨어진 산기슭에 있어요.',
};

// 강석진 발굴기. 실제 인물(본인 동의)의 블로그 글·보내 온 글과 신문 기사를 바탕으로 하고,
// 등장인물의 이름은 모두 가명으로 바꿨다. 그의 전망·주장은 그의 말로 밝혀 적는다.
G.CAST = {
  kang: { name: '강석진', role: '모동 포도 농부', skin: '#d9a77c', hair: '#d9d6cf', shirt: '#6b4a7a', hat: 'straw', glasses: true },
  kim: { name: '김태호', role: '보존회 총무', skin: '#e0b48a', hair: '#2b2622', shirt: '#4f6b4a', hat: 'cap' },
  lee: { name: '이정우', role: '보존회 총무', skin: '#d8a982', hair: '#3a332c', shirt: '#7a5a3a' },
  yoon: { name: '윤상혁', role: '조사 기관 원장', skin: '#e3b892', hair: '#55504a', shirt: '#2f4a6b', glasses: true },
  han: { name: '한지수', role: '학예사', skin: '#eec39c', hair: '#1f1a17', shirt: '#8a3f4f', long: true },
  narr: { name: '', role: '' },
};
G.STORY_NOTE = '실제 인물의 기록을 바탕으로 했으며, 등장인물의 이름은 모두 바꿨어요.';
G.STORY = [
  {
    title: '모동의 포도 농부', scene: 'vineyard',
    lines: [
      ['narr', '경북 상주 모동면. 해발 933m 백화산을 낀 산골 분지라 낮과 밤의 기온 차가 커서 포도가 잘 자라는 곳이에요.'],
      ['kang', '1979년에 고향으로 돌아와 포도 농사를 지었지. 화학비료랑 농약 대신 퇴비로 키웠고.'],
      ['narr', '강석진 씨는 국내에서 처음으로 포도송이에 봉지를 씌워 "모동포도"를 알린 농부예요.'],
    ],
  },
  {
    title: '텃밭에서 나오는 조각', scene: 'field',
    lines: [
      ['kang', '요즈음 땅콩 캐려고 집 뒤 텃밭을 파 보면, 도자기 파편이 심심찮게 나와.'],
      ['kang', '이 근처도 도요지 근처일지 모른다는 상상이 현실이 되는 거지.'],
      ['narr', '1925년 을축년 대홍수 같은 큰물은 모동의 지형을 바꿀 정도였다고 해요. 강석진 씨는 땅속 조각들이 그렇게 흩어졌을 수 있다고 봐요.'],
    ],
  },
  {
    title: '사라지는 가마터', scene: 'kiln',
    lines: [
      ['kang', '해마다 지금도 포크레인에 망가지고 파헤쳐져서 땅속으로 사라지는 유적들을 보면 참 막막해.'],
      ['narr', '강석진 씨와 보존회 회원들은 폭염 속에서도 도요지를 찾아다니며 조사하고 답사했어요.'],
      ['kim', '형님, 허리도 안 좋으신데 오늘은 여기까지 하시죠.'],
      ['kang', '아니야, 끝까지 가 보세. 포도는 날씨 탓에 절반도 못 거뒀지만, 이건 놓칠 수 없지.'],
    ],
  },
  {
    title: '국가 사적을 향해', scene: 'title',
    lines: [
      ['narr', '3년의 어려움 끝에 민족문화유산연구원의 「상주 상판리 분청사기 요지 정밀지표조사 보고서」가 제출됐어요.'],
      ['kang', '국가 사적 지정이 이제 막바지에 왔다고 봐. 상판리 발굴 도요지 근처랑 반계리에서만 도요지 20곳이 더 나올 거야.'],
      ['narr', '사적 지정 시기와 추가 도요지 수는 강석진 씨의 전망이에요.'],
      ['kang', '빨리 사적으로 지정되고 체계적으로 조사돼서, 조상들이 남긴 유산이 더 망가지지 않았으면 좋겠어.'],
    ],
  },
  {
    title: '물속에 잠긴 기억', scene: 'reservoir',
    lines: [
      ['narr', '상판저수지가 생기기 전, 초등학교 5학년 때 아버지를 따라 산소 이장에 갔다가 학 문양 도자기 편을 보았다는 후배의 이야기가 있었어요.'],
      ['kang', '몇 년 전에 그 근처를 답사해서 도자기 편 두 점을 찾았지. 그런데 물가에 어른거리던 조각이 자꾸 눈에 밟히더라고.'],
      ['narr', '농사철에 물이 5m쯤 빠졌을 때, 강석진 씨는 다시 저수지를 찾았어요.'],
      ['kang', '발굴된 상판리 도요지 못지않은 문양이야! 이건 청화백자 같고… 작은 요강에, 글자 찍힌 조각, 제기 조각까지.'],
      ['narr', '그는 언젠가 이곳이 다시 제대로 조사되기를 바라고 있어요.'],
    ],
  },
  {
    title: '가면 갈수록 유적이 나온다', scene: 'mountain',
    lines: [
      ['narr', '보존회가 찾아낸 상판리의 새 도요지 터 10곳과 반계리 3곳. 조사 기관의 원장과 함께 정밀 측량을 하는 날이에요.'],
      ['yoon', '여기는 가면 갈수록 유적이 나오네요. 경주에서나 듣던 말인데.'],
      ['lee', '지표조사가 끝나면 발굴 단계로 넘어간다고 하네요, 형님.'],
      ['kang', '17년 전 내가 처음 찾았던 상판리 도요지에 이어서, 새 명소가 나올지도 몰라.'],
      ['kang', '모동 출신 시인 황오가 그랬지. "상주 모동 시장에는 질그릇이 넘치고, 가마터 주인의 집은 고래 등보다 높다."'],
      ['kang', '역사는 잊으면 영원히 사라지는 거야.'],
    ],
  },
  {
    title: '반계리 산의 백자편', scene: 'mountain',
    lines: [
      ['narr', '반계리 카르투시오 수도원 산. 백자편만 나온다고 알던 곳에서 질 좋은 분청사기편이 나와 다시 살펴보기로 한 곳이에요.'],
      ['kim', '형님, 이거 보세요. 분청 사이에 하얀 게…'],
      ['kang', '세련된 고급 백자편이네! 어떻게 이렇게 세밀하게 만들었을까.'],
      ['narr', '강석진 씨는 조각을 씻어 말린 뒤, 상판리 발굴을 이끌었던 한지수 학예사에게 사진을 보냈어요.'],
      ['kang', '한 학예사가 놀랐다더라고. 상판리 발굴에선 백자가 드물어 아쉬웠다면서, 다음 답사에 꼭 같이 오고 싶대. 고령 사전리와 상판리를 잇는 논문도 준비한다고.'],
    ],
  },
  {
    title: '이제 우리 차례', scene: 'vineyard',
    lines: [
      ['kang', '자, 이제 자네 차례야. 상판리 가마터를 같이 찾아가 보세.'],
      ['narr', '지도에서 가마터를 찾고, 상주박물관이 발굴한 가마1유적과 가마6유적의 기록을 따라 조각을 찾아 그릇을 되살려 보세요. 상판저수지 물가와 반계리 수도원 뒷산에도 가 볼 수 있어요.'],
      ['kang', '단, 진짜 유적에서는 함부로 땅을 파면 안 돼. 유물을 보면 그대로 두고 30일 안에 시·군청이나 경찰서에 신고해야 하네.'],
    ],
  },
];

G.SITES = [
  {
    id: 'kiln1', name: '가마1유적', era: '조선 초 (1410~1420년 무렵)', need: 0,
    sub: '2015년 발굴 · 가마 1기, 폐기장 1기 · 약 400점 출토',
    story: '길이 22m, 너비 1.6~1.8m인 반지하식 단실 오름가마예요. 불을 때는 곳 위쪽과 굴뚝 쪽에 초벌 칸이 있어 초벌구이와 재벌구이를 함께 할 수 있었어요. 2015년 상주박물관이 발굴했어요.',
    pots: ['daejeop', 'bo', 'gojokbae', 'begae', 'janggo', 'hwabun', 'hap', 'jarabyeong'],
  },
  {
    id: 'kiln6', name: '가마6유적', era: '조선 초 (1400~1420년 무렵)', need: 0,
    sub: '2016년 발굴 · 가마 1기, 폐기장 2기 · 1,850점 출토',
    story: '남은 길이 21m, 너비 1.8~2.2m인 반지하식 단실 가마예요. 분청 발과 접시가 가장 많이 나왔고, 의자(돈)·화분·향완·베개·고족배 같은 특수한 그릇과 글자가 새겨진 명문 자기 76점이 함께 나왔어요.',
    pots: ['daejeop', 'hyangro', 'gojokbae', 'begae', 'hwabun', 'don', 'hap', 'jarabyeong'],
    inscriptions: true,
  },
  {
    id: 'reservoir', name: '상판저수지 물가', era: '강석진 씨의 답사 기록', need: 0, sea: true, finds: 'reservoir',
    sub: '농사철에 물이 5m쯤 빠졌을 때 · 강석진 씨의 답사',
    digSub: '물 빠진 바닥의 펄을 걷어 내세요',
    story: '저수지가 생기기 전, 학 문양 도자기 편을 보았다는 후배의 기억을 따라 강석진 씨가 찾은 곳이에요. 물이 빠진 물가에서 문양 있는 도자기 편, 청화백자로 추정되는 조각, 작은 요강, 글자가 찍힌 조각, 제기 조각을 보았다고 해요.',
    pots: [],
  },
  {
    id: 'bangye', name: '반계리 수도원 뒷산', era: '강석진 씨와 보존회의 답사', need: 0, finds: 'bangye',
    sub: '반계리 카르투시오 수도원 산 · 지표 답사',
    digSub: '겉흙을 걷어 내세요',
    story: '백자편만 나온다고 알던 산에서 질 좋은 분청사기편이 나오고, 이어서 세련된 고급 백자편까지 찾은 곳이에요. 강석진 씨는 이곳을 다시 조사해야 한다고 봐요.',
    pots: [],
  },
];
G.SANGPAN.monastery = '카르투시오 수도원';

// 중요 지점: 지표 조사로 찾아내면 정밀 조사(발굴판)가 열린다
G.POINTS = [
  { id: 'kiln', name: '가마터', sites: ['kiln1', 'kiln6'], key: 'kilnwall', mix: ['bun', 'bun', 'bun', 'dochim', 'gapbal', 'ong'], ground: 'hill',
    found: '불에 타 붉게 굳은 가마 벽 조각이에요. 이 근처에서 그릇을 구웠다는 증거예요!' },
  { id: 'reservoir', name: '상판저수지 물가', sites: ['reservoir'], key: 'pattern', mix: ['bun', 'bae', 'cel', 'ong', 'bun'], ground: 'mud',
    found: '물가에서 발굴된 상판리 도요지 못지않은 문양의 조각이 나왔어요. 저수지 물가를 자세히 조사해 볼 만해요.' },
  { id: 'bangye', name: '반계리 수도원 뒷산', sites: ['bangye'], key: 'finebae', mix: ['bae', 'bun', 'bun', 'ong'], ground: 'forest',
    found: '분청사기 편 사이에서 세련된 백자편이 나왔어요. 이 산을 다시 조사해야겠어요.' },
];
G.pointById = (id) => G.POINTS.find((p) => p.id === id);

// 땅 위에서 줍는 조각(지표 수습품)
G.SURFACE = {
  bun: { name: '분청사기 조각', fill: '#8d9488', dots: true },
  bae: { name: '백자 조각', fill: '#f3f1ea' },
  cel: { name: '청자 조각', fill: '#8fb9a3' },
  ong: { name: '질그릇 조각', fill: '#9a6a44' },
  dochim: { name: '도침', fill: '#b08a62', round: true },
  gapbal: { name: '갑발 조각', fill: '#8a7d6c' },
  kilnwall: { name: '불탄 가마 벽 조각', fill: '#8a3f2a', key: true, glaze: '#3a4a3a' },
  pattern: { name: '문양 있는 도자기 편', fill: '#8d9488', key: true, crane: true },
  finebae: { name: '세련된 백자편', fill: '#fbfaf6', key: true, shine: true },
};

const BUN = { body: '#8d9488', line: '#4f574d' }; // 분청 회청색 바탕
G.POTS = {
  daejeop: Object.assign({
    name: '분청사기 인화문 대접', era: '조선 초', motif: 'inhwa',
    shape: [[44, 30], [41, 48], [30, 64], [14, 70], [15, 78], [0, 78]],
    desc: '작은 국화 도장을 빽빽하게 찍고 흰 흙을 메워 넣는 인화 기법으로 꾸민 대접이에요. 상판리 가마6유적에서는 발과 접시가 가장 많이 나왔어요.',
  }, BUN),
  hyangro: Object.assign({
    name: '분청사기 향완', era: '조선 초', motif: 'inhwa',
    shape: [[34, 22], [34, 28], [28, 42], [10, 48], [8, 58], [14, 66], [24, 82], [25, 88], [0, 88]],
    desc: '향을 피우는 그릇이에요. 넓은 몸통 아래에 높은 받침이 달렸어요. 가마6유적에서 나온 특수한 그릇 가운데 하나예요.',
  }, BUN),
  jarabyeong: Object.assign({
    name: '상감분청 자라병', era: '조선 초', motif: 'dragon',
    shape: [[6, 14], [6, 24], [11, 30], [36, 40], [44, 54], [37, 68], [20, 75], [0, 76]],
    desc: '자라처럼 납작하고 둥근 병이에요. 그동안 대대로 전해 온 물건(전세품)으로만 알려졌는데, 상판리에서 처음으로 그 조각이 출토됐어요. 그림의 용무늬는 상판리 분청에 흑백상감 용무늬가 많다는 연구(오영인 2019)를 바탕으로 그린 것이에요.',
  }, BUN),
  gojokbae: Object.assign({
    name: '분청사기 고족배', era: '조선 초', motif: 'inhwa',
    shape: [[30, 20], [29, 28], [20, 42], [6, 46], [5, 64], [14, 80], [16, 84], [0, 84]],
    desc: '굽다리가 높은 잔이에요. 제사 같은 의례에 쓰였어요. 가마1유적과 가마6유적에서 모두 나왔어요.',
  }, BUN),
  hap: Object.assign({
    name: '분청사기 인화문 합', era: '조선 초', motif: 'inhwa',
    shape: [[4, 14], [6, 18], [30, 24], [36, 32], [36, 48], [38, 50], [36, 52], [35, 70], [28, 78], [0, 78]],
    desc: '뚜껑을 덮는 둥근 그릇이에요. 뚜껑과 몸통 모두 인화 무늬로 꾸몄어요.',
  }, BUN),
  begae: Object.assign({
    name: '분청사기 인화문 베개', era: '조선 초', motif: 'inhwa',
    path: 'M10,38 Q50,50 90,38 L90,76 Q50,82 10,76Z',
    desc: '도자기로 만든 베개예요. 2015년 가마1유적 발굴에서 인화문이 찍힌 분청사기 베개가 나왔어요.',
  }, BUN),
  janggo: Object.assign({
    name: '분청사기 장고', era: '조선 초', motif: 'inhwa',
    shape: [[34, 12], [34, 18], [26, 26], [10, 42], [7, 50], [10, 58], [26, 74], [34, 82], [34, 88], [0, 88]],
    desc: '장구의 몸통을 도자기로 만든 것이에요. 양쪽에 가죽을 메워 쳤어요. 가마1유적에서 나왔어요.',
  }, BUN),
  hwabun: Object.assign({
    name: '분청사기 화분과 받침', era: '조선 초', motif: 'inhwa',
    shape: [[34, 20], [36, 25], [32, 28], [26, 64], [24, 66], [38, 68], [38, 76], [0, 76]],
    desc: '꽃을 기르는 화분과 그 받침이에요. 연구자들이 상판리의 특수 기종으로 꼽는 그릇이에요. 『태종실록』에는 1411년 왕실이 중모·화령 등에 사람을 보내 화기(花器) 만드는 일을 감독하게 했다는 기록이 있어요.',
  }, BUN),
  bo: Object.assign({
    name: '분청사기 제기 보(簠)', era: '조선 초', motif: 'inhwa',
    path: 'M10,32 L90,32 L80,64 L76,64 L78,80 L68,80 L66,64 L34,64 L32,80 L22,80 L24,64 L20,64Z',
    desc: '곡식을 담아 제사상에 올리던 네모난 제기예요. 가마1유적에서 보·궤·잔탁·고족배 같은 제기류가 나왔어요.',
  }, BUN),
  don: Object.assign({
    name: '분청사기 돈(墩)', era: '조선 초', motif: 'inhwa', extra: 'stool',
    shape: [[22, 16], [28, 22], [33, 40], [33, 62], [28, 80], [22, 86], [0, 86]],
    desc: '도자기로 만든 둥근 의자예요. 가마6유적에서 나온 특수한 그릇 가운데 하나예요.',
  }, BUN),
};
for (const id in G.POTS) G.POTS[id].id = id;
G.POT_IDS = Object.keys(G.POTS);
G.PIECES = 4;
G.siteById = (id) => G.SITES.find((s) => s.id === id);

// 명문(글자를 새긴) 조각 — 모두 가마6유적 출토. 분류는 성현주(2017)·오영인(2019).
G.INSCRIPTIONS = [
  { id: 'saseon', label: '司膳', read: '사선', mean: '궁중 음식을 맡은 관청 사선서(司膳署)를 가리켜요. 같은 글자는 합천 장대리, 함안 옥렬리 가마터에서도 나왔어요.' },
  { id: 'nyeong', label: '寧', read: '녕', mean: '승녕부(1400~1408)를 가리키는 글자로 봐요.' },
  { id: 'sun', label: '順', read: '순', mean: '의순고(~1403)를 가리키는 글자로 봐요.' },
  { id: 'se', label: '世', read: '세', mean: '세자부(~1398)를 가리키는 글자로 봐요.' },
  { id: 'jeong', label: '定', read: '정', mean: '관청이나 왕실 기관 이름으로 분류해요. 구체적인 뜻은 아직 밝혀지지 않았어요.' },
  { id: 'sang', label: '上', read: '상', mean: '공물과 관련된 글자로 분류해요.' },
  { id: 'dae', label: '大', read: '대', mean: '공물과 관련된 글자로 분류해요.' },
  { id: 'gyeongju', label: '上州京主人', read: '상주 경주인', mean: '경주인은 서울에 머물며 지방의 공물 바치는 일을 주선하던 향리예요. 이 글자가 그릇에서 정확히 어떤 구실을 했는지는 아직 확정되지 않았어요.' },
  { id: 'ssangrim', label: '雙林', read: '쌍림', mean: '절과 관련된 글자로 분류해요(9점 출토). 뜻은 아직 확인되지 않았어요.' },
  { id: 'man', label: '卍', read: '만', mean: '절과 관련된 표시로 분류해요(2점 출토).' },
].map((x) => Object.assign({ kind: 'inscription', name: `명문 조각 "${x.label}"` }, x));

G.KILN_TOOLS = [
  { id: 'dochim', kind: 'tool', name: '도침', mean: '그릇을 가마 바닥에 앉힐 때 밑에 받치던 흙 받침이에요. 가마터에서 아주 흔하게 나와요.' },
  { id: 'gapbal', kind: 'tool', name: '갑발', mean: '불길과 재가 그릇에 직접 닿지 않도록 그릇을 넣어 굽던 흙 상자예요. 상판리에서는 갑발에 넣어 구운 그릇의 비중이 높다는 연구가 있어요(오영인 2019).' },
];

// 강석진 씨가 답사에서 본 것들. 그의 기록에 나온 것만, 그의 추정은 추정으로 적는다.
G.FINDS = [
  { id: 'r_pattern', place: 'reservoir', name: '문양 있는 도자기 편', fill: '#8d9488', motif: 'crane', mean: '강석진 씨는 발굴된 상판리 도요지 것에 못지않은 문양이라고 적었어요. 저수지가 생기기 전 이곳에서 학 문양 도자기 편을 보았다는 후배의 기억이 답사의 시작이었어요.' },
  { id: 'r_cheonghwa', place: 'reservoir', name: '청화백자로 추정되는 조각', fill: '#f4f4ef', motif: 'blue', mean: '흰 바탕에 푸른 무늬가 있는 조각이에요. 강석진 씨는 청화백자로 추정해요. 청화백자는 순도 높은 백자에 코발트 안료로 무늬를 그리고 투명 유약을 입혀 구운 도자기예요.' },
  { id: 'r_body', place: 'reservoir', name: '그릇 몸통 조각', fill: '#9b9a8c', motif: 'plain', mean: '그릇 몸통 벽의 조각이에요.' },
  { id: 'r_yogang', place: 'reservoir', name: '작은 요강', fill: '#ece8dc', motif: 'blue', mean: '무늬가 조화로운 작은 요강이에요. 강석진 씨도 근대에 만든 것인지는 분명하지 않다고 적었어요.' },
  { id: 'r_mark', place: 'reservoir', name: '"大音精製" 글자 조각', fill: '#f1efe8', label: '大音精製', mean: '"大音精製"라는 글자가 있는 조각이에요. 강석진 씨는 구한말 일본에서 수출하던 도자기의 표시일 수 있다고 봐요. 아직 확인이 필요해요.' },
  { id: 'r_jegi', place: 'reservoir', name: '제기 조각', fill: '#8d9488', motif: 'inhwa', mean: '제사 그릇(제기) 종류의 조각이에요.' },
  { id: 'b_buncheong', place: 'bangye', name: '반계리 분청사기편', fill: '#8d9488', motif: 'inhwa', mean: '그동안 백자편만 나온다고 알던 반계리 수도원 산에서 질 좋은 분청사기 조각이 나왔어요. 강석진 씨는 이곳을 다시 조사해야 한다고 봐요.' },
  { id: 'b_baekja', place: 'bangye', name: '반계리 고급 백자편', fill: '#f6f5f0', motif: 'plain', mean: '분청사기 편 사이에서 나온 세련된 백자 조각이에요. 강석진 씨에 따르면, 상판리 발굴을 이끈 한지수 학예사가 사진을 보고 놀라며 다음 답사에 함께하고 싶다고 했대요. 상판리 발굴에서는 백자편이 드물었거든요.' },
].map((x) => Object.assign({ kind: 'find' }, x));

// 발굴판에 함께 묻는 발굴품
G.digExtras = function (site) {
  if (site.finds) {
    const list = G.FINDS.filter((x) => x.place === site.finds);
    const have = G.store.S.extras;
    const out = [];
    const n = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const missing = list.filter((x) => !have[x.id] && !out.includes(x));
      const pool = missing.length && Math.random() < 0.75 ? missing : list;
      out.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return out;
  }
  const out = [];
  if (site.inscriptions && Math.random() < 0.5) {
    const have = G.store.S.extras;
    const missing = G.INSCRIPTIONS.filter((x) => !have[x.id]);
    const pool = missing.length && Math.random() < 0.75 ? missing : G.INSCRIPTIONS;
    out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  if (Math.random() < 0.6) out.push(G.KILN_TOOLS[Math.floor(Math.random() * 2)]);
  return out;
};

G.SOURCES = [
  '디지털상주문화대전 「상주 상판리 자기 요지」',
  '상주박물관, 『상주 상판리 자기가마1 유적』, 2015',
  '상주박물관(전옥연 외), 『상주 상판리 자기가마6 유적』',
  '대동문화재연구원, 『상주 지역 자기요지 정밀 지표조사 보고서』, 2010',
  '『세종실록』 지리지 상주목 조 / 『태종실록』 1411년 4월 29일',
  '성현주(2017), 오영인(2019) 연구',
  '강석진 발굴기: 실제 인물(본인 동의)의 글과 신문 기사를 바탕으로 했으며, 등장인물 이름은 모두 가명이에요',
];
