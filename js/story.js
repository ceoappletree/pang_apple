// 게임 데이터: 리그, 히로인, 장소, 선물, 경영, 이벤트 대사
(() => {
'use strict';

// ---------- 리그 ----------
const TEAMS = [
  { id: 'APL', name: '서울 애플즈', short: '애플즈', color: '#e5484d', off: 48, pit: 48, me: true },
  { id: 'SEA', name: '부산 씨걸스', short: '씨걸스', color: '#3b82f6', off: 55, pit: 52,
    ace: { name: '박해성', velo: 147, ctrl: 0.55, mix: { FB: 0.45, SL: 0.3, CH: 0.15, CU: 0.1 } } },
  { id: 'WAV', name: '인천 웨이브스', short: '웨이브스', color: '#14b8a6', off: 51, pit: 56,
    ace: { name: '최강윤', velo: 150, ctrl: 0.6, mix: { FB: 0.5, FK: 0.3, SL: 0.2 } } },
  { id: 'BLZ', name: '대구 블레이즈', short: '블레이즈', color: '#f97316', off: 57, pit: 47,
    ace: { name: '이도훈', velo: 144, ctrl: 0.45, mix: { FB: 0.4, TW: 0.25, CU: 0.2, CH: 0.15 } } },
  { id: 'PHX', name: '광주 피닉스', short: '피닉스', color: '#a855f7', off: 49, pit: 53,
    ace: { name: '김서준', velo: 141, ctrl: 0.7, mix: { TW: 0.35, CH: 0.3, CU: 0.2, FB: 0.15 } } },
  { id: 'CMT', name: '대전 코메츠', short: '코메츠', color: '#eab308', off: 47, pit: 49,
    ace: { name: '정우람', velo: 145, ctrl: 0.5, mix: { FB: 0.5, CU: 0.25, SL: 0.25 } } },
];

// ---------- 시간 ----------
const SLOTS = ['오전', '오후', '저녁'];

// ---------- 장소 (도시 지도 위 위치는 world.js) ----------
const LOCS = {
  home: { name: '펜트하우스', emoji: '🏠', desc: '휴식 · 저장' },
  stadium: { name: '애플파크', emoji: '🏟', desc: '훈련 · 경기 · 응원단' },
  office: { name: '애플타워 (구단 사무실)', emoji: '🏢', desc: '구단 경영' },
  studio: { name: '스타 스튜디오', emoji: '🎬', desc: '촬영장' },
  campus: { name: '한국대학교', emoji: '🎓', desc: '캠퍼스' },
  cafe: { name: '카페거리', emoji: '☕', desc: '카페' },
  mall: { name: '애플백화점', emoji: '🛍', desc: '선물 쇼핑' },
  park: { name: '한강공원', emoji: '🌳', desc: '산책 · 조깅' },
  umpire: { name: 'KBL 심판위원회', emoji: '⚖️', desc: '리그 사무국' },
  batting: { name: '홈런 배팅센터', emoji: '⚾', desc: '개인 타격 연습' },
  restaurant: { name: '레스토랑 라루체', emoji: '🍷', desc: '고급 레스토랑' },
};

// ---------- 히로인 ----------
// sched: 시간대(오전/오후/저녁)별 위치
// likes: 데이트 장소 선호 (-1 싫음 ~ 2 아주 좋아함), gifts: 선물 선호
const GIRLS = {
  yuna: {
    name: '차유나', age: 26, role: '톱 여배우', color: '#ff7aa8', bg: 'linear-gradient(180deg,#3a1030,#c0507a)',
    sched: ['studio', 'studio', 'restaurant'], needFame: 20,
    likes: { cafe: 0, movie: 1, park: 0, amusement: -1, restaurant: 2, museum: 2, karaoke: 0, batting: -1, drive: 1 },
    gifts: { flower: 1, perfume: 2, bag: 1, books: 0, bat: 0, shoes: 0, cake: 1 },
    lines: {
      2: ['"…당신, 취향이 꽤 고급이네요. 마음에 들어요."', '"카메라 없는 데서 이렇게 웃어 본 거, 오랜만이에요."'],
      1: ['"괜찮았어요. 다음에도 불러 줘요."', '"후후, 오늘은 기사 걱정 안 할래요."'],
      0: ['"…그럭저럭이네요."', '"다음엔 좀 더 기대할게요."'],
      '-1': ['"사람 많은 데는… 사진 찍힐까 봐 불편해요."', '"미안해요, 매니저가 찾아서 먼저 갈게요."'],
    },
  },
  jiwoo: {
    name: '서지우', age: 22, role: '한국대 스포츠통계학과', color: '#9fd3ff', bg: 'linear-gradient(180deg,#1f3a5c,#8fb8de)',
    sched: ['campus', 'campus', 'cafe'],
    likes: { cafe: 2, movie: 2, park: 1, amusement: 0, restaurant: 0, museum: 1, karaoke: -1, batting: 1, drive: 0 },
    gifts: { flower: 1, perfume: 0, bag: -1, books: 2, bat: 1, shoes: 0, cake: 1 },
    lines: {
      2: ['"오늘 데이터… 아니, 오늘 하루 완벽했어요!"', '"이런 데 같이 오고 싶었어요. 어떻게 알았어요?"'],
      1: ['"재밌었어요! 논문 스트레스가 다 풀렸어요."', '"다음에 또 와요, 꼭이요."'],
      0: ['"음… 나쁘진 않았어요."', '"같이 있어서 좋았어요. 장소는… 평범했지만요."'],
      '-1': ['"시끄러운 데는 좀… 머리가 아파요."', '"저 내일 발표라서 먼저 갈게요…"'],
    },
  },
  harin: {
    name: '박하린', age: 24, role: '애플즈 응원단장', color: '#ffb36b', bg: 'linear-gradient(180deg,#ff8a5c,#ffd27a)',
    sched: ['park', 'stadium', 'mall'],
    likes: { cafe: 0, movie: 0, park: 1, amusement: 2, restaurant: 0, museum: -1, karaoke: 2, batting: 0, drive: 1 },
    gifts: { flower: 2, perfume: 1, bag: 2, books: -1, bat: 1, shoes: 1, cake: 1 },
    lines: {
      2: ['"꺄아~ 최고! 오늘 텐션 완전 MAX예요!"', '"구단주님이랑 오니까 두 배로 신나요!"'],
      1: ['"재밌었어요! 다음 응원 때 힘이 날 것 같아요."', '"헤헤, 또 놀러 가요!"'],
      0: ['"음… 조용하네요."', '"다음엔 좀 신나는 데 가요!"'],
      '-1': ['"…저 여기 좀 졸려요."', '"으음, 응원 연습 있어서 먼저 갈게요!"'],
    },
  },
  sea: {
    name: '정세아', age: 28, role: 'KBL 최초 여성 1군 심판', color: '#a3b8d8', bg: 'linear-gradient(180deg,#141828,#3b4a6b)',
    sched: ['umpire', 'umpire', 'park'],
    likes: { cafe: 0, movie: 0, park: 2, amusement: 0, restaurant: 0, museum: 1, karaoke: -1, batting: 1, drive: -1 },
    gifts: { flower: 0, perfume: 1, bag: -1, books: 1, bat: -1, shoes: 2, cake: 1 },
    lines: {
      2: ['"…좋네요. 여기 오면 머리가 맑아져요."', '"오늘은 판정 생각 안 했어요. 당신 덕분에요."'],
      1: ['"괜찮은 선택이었어요."', '"다음 주에도… 시간 되면요."'],
      0: ['"평범하네요."', '"규정상 문제는 없는 데이트였어요."'],
      '-1': ['"…저 이런 데는 좀 불편해요."', '"과속은 원칙 위반이에요. 내릴게요."'],
    },
  },
  somi: {
    name: '한소미', age: 23, role: '애플즈 열성팬 · 유튜버', color: '#ff9ec0', bg: 'linear-gradient(180deg,#e5484d,#ffb0b8)',
    sched: ['cafe', 'batting', 'stadium'],
    likes: { cafe: 1, movie: 0, park: 0, amusement: 1, restaurant: 0, museum: -1, karaoke: 1, batting: 2, drive: 2 },
    gifts: { flower: 1, perfume: 0, bag: 1, books: -1, bat: 2, shoes: 0, cake: 2 },
    lines: {
      2: ['"꺄아아! 이거 영상으로 남겨도 돼요?! 아니 그냥 기억할래요!"', '"선수님이랑 여기라니… 오늘 성덕 완성이에요!"'],
      1: ['"너무 좋았어요! 구독자들한테 자랑하고 싶다~"', '"헤헤, 오늘은 팬 말고 친구로 놀았어요!"'],
      0: ['"음… 좋았어요! 아마도요!"', '"선수님이랑 있으면 어디든 좋아요. 진짜로."'],
      '-1': ['"여긴… 좀 졸려요. 헤헤."', '"아, 라이브 방송 시간이라 먼저 갈게요!"'],
    },
  },
};
const GIRL_KEYS = Object.keys(GIRLS);

const DATE_PLACES = [
  { id: 'cafe', name: '☕ 카페', cost: 5 }, { id: 'movie', name: '🎬 영화관', cost: 8 }, { id: 'park', name: '🌳 한강 산책', cost: 0 },
  { id: 'amusement', name: '🎡 놀이공원', cost: 20 }, { id: 'restaurant', name: '🍷 레스토랑', cost: 50 }, { id: 'museum', name: '🖼 미술관', cost: 10 },
  { id: 'karaoke', name: '🎤 노래방', cost: 5 }, { id: 'batting', name: '⚾ 배팅센터', cost: 3 }, { id: 'drive', name: '🏎 슈퍼카 드라이브', cost: 0 },
];

const GIFTS = [
  { id: 'flower', name: '💐 꽃다발', price: 20 }, { id: 'perfume', name: '🌸 향수', price: 50 },
  { id: 'bag', name: '👜 명품백', price: 500 }, { id: 'books', name: '📚 전문서적 세트', price: 10 },
  { id: 'bat', name: '🏏 친필 사인 배트', price: 30 }, { id: 'shoes', name: '👟 러닝화', price: 30 },
  { id: 'cake', name: '🍰 수제 케이크', price: 15 },
];

// ---------- 경영 ----------
const TICKETS = [
  { id: 0, name: '저가 (8천원)', price: 0.8, demand: 1.18 },
  { id: 1, name: '보통 (1만5천원)', price: 1.5, demand: 1.0 },
  { id: 2, name: '고가 (2만5천원)', price: 2.5, demand: 0.78 },
];
// 시설: 레벨당 비용(억)과 효과
const FACILITIES = {
  seats: { name: '🏟 관중석 확장', desc: '수용 인원 +5,000', cost: [25, 35, 50], max: 3 },
  training: { name: '🏋️ 훈련센터', desc: '훈련 효과 +1', cost: [15, 25, 40], max: 3 },
  medical: { name: '🏥 메디컬센터', desc: '부상 위험 -30%', cost: [10, 20, 30], max: 3 },
  screen: { name: '📺 초대형 전광판', desc: '팬 증가 속도 ↑', cost: [20, 35], max: 2 },
};
const FAS = [
  { id: 'fa1', name: '최대한', pos: '1루수 · 거포', type: 'off', boost: 6, cost: 22, salary: 0.35 },
  { id: 'fa2', name: '이민호', pos: '유격수 · 교타자', type: 'off', boost: 4, cost: 12, salary: 0.22 },
  { id: 'fa3', name: '마르티네스', pos: '외국인 선발투수', type: 'pit', boost: 7, cost: 28, salary: 0.45 },
  { id: 'fa4', name: '오승철', pos: '베테랑 마무리', type: 'pit', boost: 4, cost: 11, salary: 0.2 },
  { id: 'fa5', name: '로드리게스', pos: '외국인 중견수', type: 'off', boost: 5, cost: 18, salary: 0.3 },
];

// ---------- 스크립트 ----------
// 스텝: { who, mood, text } | { narr } | { bg } | { choice:[{ text, fx, then }] } | { fx }
const S = {};

S.opening = [
  { bg: 'linear-gradient(180deg,#141828,#3b2f2a)' },
  { narr: '애플그룹 본사 최상층, 회장실.' },
  { who: 'chairman', mood: 'normal', text: '{name}. 애플즈를 너한테 맡긴 건 장난감으로 주려던 게 아니다.' },
  { who: 'chairman', mood: 'angry', text: '시즌이 끝날 때까지 구단 흑자, 그리고 가을야구(3위 이내). 하나라도 못 하면 구단은 매각이다.' },
  { narr: '스물다섯, 재벌 2세. 애플즈 구단주이자 4번 타자, 그리고 에이스 투수— {name}.' },
  { bg: 'linear-gradient(180deg,#1b2a55,#3a4f8a)' },
  { who: 'coach', mood: 'normal', text: '구단주님이 직접 4번 타자에 선발 투수까지… 진심이십니까?' },
  { choice: [
    { text: '진심입니다. 실력으로 증명하죠.', fx: { morale: 8 }, then: [{ who: 'coach', mood: 'smile', text: '…좋습니다. 그 눈빛, 마음에 드는군요.' }] },
    { text: '제 구단이니까요. 제 마음이죠.', fx: { morale: -5 }, then: [{ who: 'coach', mood: 'angry', text: '…선수들 앞에선 그런 말씀 마십시오.' }] },
  ] },
  { narr: '도시를 자유롭게 돌아다닐 수 있다. 하루는 오전·오후·저녁, 장소에서 무언가 하면 시간이 흐른다.' },
  { narr: '3번 행동하면 주말 경기. 애플파크로 가자! (지도의 💗는 만난 사람이 있는 곳)' },
];

S.meet = {
  yuna: [
    { bg: 'linear-gradient(180deg,#3a1030,#c0507a)' },
    { narr: '스타 스튜디오. 화장품 CF 촬영이 한창이다. 조명 아래 그녀가 돌아봤다.' },
    { who: 'yuna', mood: 'normal', text: '…누구시죠? 관계자 외 출입금지인데요.' },
    { choice: [
      { text: '애플즈 구단주 겸 선수, {name}입니다.', fx: { yuna: 6 }, then: [{ who: 'yuna', mood: 'surprised', text: '아, 그 야구하는 재벌 2세? 기사로 봤어요.' }, { who: 'yuna', mood: 'smile', text: '…생각보다 괜찮네요, 실물이.' }] },
      { text: '팬입니다! 사인해 주세요!', fx: { yuna: 3 }, then: [{ who: 'yuna', mood: 'smile', text: '후후, 재벌 2세가 팬이라니. 영광인데요?' }] },
      { text: '광고 모델 계약하러 왔죠. 몸값이 얼마예요?', fx: { yuna: -6 }, then: [{ who: 'yuna', mood: 'angry', text: '…사람을 돈으로 사려는 사람, 제일 싫어요.' }] },
    ] },
  ],
  jiwoo: [
    { bg: 'linear-gradient(180deg,#1f3a5c,#8fb8de)' },
    { narr: '한국대 캠퍼스. 벤치에서 노트북으로 뭔가를 분석하던 여학생이 고개를 들었다.' },
    { who: 'jiwoo', mood: 'surprised', text: '어? 애플즈 {name} 선수…? 저, 선수님 타구 데이터로 졸업 논문 쓰고 있어요!' },
    { choice: [
      { text: '정말요? 어떤 데이터요?', fx: { jiwoo: 7, eye: 2 }, then: [{ who: 'jiwoo', mood: 'happy', text: '발사각 28도 근처에서 홈런 확률이 확 올라가요! 공 살짝 아래를 노려 보세요!' }, { narr: '(선구안 +2)' }] },
      { text: '논문에 제 이름 쓰면 저작권료 받아요.', fx: { jiwoo: 3 }, then: [{ who: 'jiwoo', mood: 'shy', text: '에, 에?! …농담이죠? 깜짝 놀랐잖아요.' }] },
    ] },
  ],
  harin: [
    { bg: 'linear-gradient(180deg,#ff8a5c,#ffd27a)' },
    { narr: '애플파크 응원단 연습실. 음악과 함께 회전하던 누군가가 부딪혔다.' },
    { who: 'harin', mood: 'surprised', text: '꺄! 죄송해요! …어, 구단주님?!' },
    { who: 'harin', mood: 'happy', text: '애플즈 응원단장 박하린이에요! 구단주님 등장곡 안무, 제가 짰어요!' },
    { choice: [
      { text: '그 안무, 보여 줄 수 있어요?', fx: { harin: 7 }, then: [{ who: 'harin', mood: 'love', text: '물론이죠! 하나, 둘, 셋— {name}! 홈런! 헤헤♪' }] },
      { text: '응원단 예산 좀 줄여야겠던데요.', fx: { harin: -6 }, then: [{ who: 'harin', mood: 'sad', text: '…저희 정말 열심히 하는데.' }] },
    ] },
  ],
  sea: [
    { bg: 'linear-gradient(180deg,#141828,#3b4a6b)' },
    { narr: 'KBL 심판위원회 로비. 서류를 든 여성이 단호하게 말했다.' },
    { who: 'sea', mood: 'normal', text: '구단주님께서 무슨 일이시죠? 판정 항의라면 정식 절차를 밟으세요.' },
    { choice: [
      { text: '항의 아니에요. 인사드리러 왔습니다.', fx: { sea: 5 }, then: [{ who: 'sea', mood: 'smile', text: '…특이한 분이네요. 심판한테 인사하러 오는 구단주라니.' }] },
      { text: '지난 경기 볼 판정, 솔직히 오심이었죠?', fx: { sea: -4 }, then: [{ who: 'sea', mood: 'angry', text: '제 판정은 정확했습니다. 영상 확인하세요.' }] },
    ] },
  ],
  somi: [
    { bg: 'linear-gradient(180deg,#e5484d,#ffb0b8)' },
    { narr: '옆에서 "딱!" 하는 경쾌한 소리. 27번 유니폼을 입은 여자가 이쪽을 보고 굳었다.' },
    { who: 'somi', mood: 'surprised', text: '헉… 진짜 {name} 선수?! 저 유튜브 \'소미의 직관일기\' 하는데요, 27번 유니폼만 세 벌이에요!' },
    { choice: [
      { text: '영상 같이 찍을까요?', fx: { somi: 7, fame: 2 }, then: [{ who: 'somi', mood: 'love', text: '꺄아아! 구독자 여러분, 저 지금 꿈꾸는 거 아니죠?!' }] },
      { text: '사적인 시간이라 촬영은 곤란해요.', fx: { somi: 1 }, then: [{ who: 'somi', mood: 'sad', text: '아… 그렇죠. 죄송해요! 그래도 응원할게요!' }] },
    ] },
  ],
};

// 호감도 이벤트 A(35↑) / B(60↑): 그 장소에서 대화할 때 발생
S.evA = {
  yuna: [
    { bg: 'linear-gradient(180deg,#1a0a18,#5a2040)' },
    { narr: '늦은 밤 레스토랑. 유나가 와인잔만 바라보고 있었다.' },
    { who: 'yuna', mood: 'sad', text: '다들 \'차유나\'만 봐요. 진짜 나는… 아무도 안 봐요.' },
    { choice: [
      { text: '오늘은 그냥 유나 씨랑 밥 먹으러 온 거예요.', fx: { yuna: 9 }, then: [{ who: 'yuna', mood: 'shy', text: '……그런 말, 처음 들어 봐요.' }] },
      { text: '스캔들 한 번 나면 홍보 효과 좋겠네요.', fx: { yuna: -7 }, then: [{ who: 'yuna', mood: 'angry', text: '당신도 똑같네요.' }] },
    ] },
  ],
  jiwoo: [
    { bg: 'linear-gradient(180deg,#0f1b30,#1f3a5c)' },
    { narr: '새벽 도서관. 지우가 노트북 앞에서 꾸벅꾸벅 졸고 있었다.' },
    { who: 'jiwoo', mood: 'sad', text: '교수님이… 데이터 분석으론 야구 못 이긴대요. 현장은 다르다고.' },
    { choice: [
      { text: '지우 씨 분석 덕에 제 타율이 올랐어요.', fx: { jiwoo: 9, eye: 2 }, then: [{ who: 'jiwoo', mood: 'love', text: '정말요?! …그럼 저 계속 해 볼게요!' }] },
      { text: '교수님 말도 일리 있죠.', fx: { jiwoo: -4 }, then: [{ who: 'jiwoo', mood: 'sad', text: '…그렇죠. 제가 괜히.' }] },
    ] },
  ],
  harin: [
    { bg: 'linear-gradient(180deg,#2a3a5c,#6b7a9a)' },
    { narr: '비 오는 평일 경기. 텅 빈 관중석 앞에서 하린이 혼자 응원 동작을 하고 있었다.' },
    { who: 'harin', mood: 'sad', text: '관중석이 비어 있으면… 저희가 무슨 의미가 있을까요.' },
    { choice: [
      { text: '한 명이라도 보고 있으면 의미 있어요. 제가 보고 있잖아요.', fx: { harin: 9 }, then: [{ who: 'harin', mood: 'love', text: '…구단주님. 반칙이에요, 그 말.' }] },
      { text: '그러니까 성적이 중요하죠.', fx: { harin: 2 }, then: [{ who: 'harin', mood: 'normal', text: '…네, 맞아요. 이겨 주세요.' }] },
    ] },
  ],
  sea: [
    { bg: 'linear-gradient(180deg,#0b0f20,#26304a)' },
    { narr: '밤의 한강공원. 조깅하던 세아가 숨을 고르며 멈췄다.' },
    { who: 'sea', mood: 'normal', text: '심판은 친구도, 연인도 만들면 안 된대요. 공정해야 하니까.' },
    { choice: [
      { text: '그래서 세아 씨가 멋있는 거예요.', fx: { sea: 9 }, then: [{ who: 'sea', mood: 'shy', text: '…그런 말 하면, 원칙이 흔들리잖아요.' }] },
      { text: '그럼 우리 경기 땐 좀 봐주세요. 하하.', fx: { sea: -9, seaFoul: 1 }, then: [{ who: 'sea', mood: 'angry', text: '…농담이라도 그런 말은 하지 마세요. 실망이에요.' }] },
    ] },
  ],
  somi: [
    { bg: 'linear-gradient(180deg,#3a1a2a,#e5484d)' },
    { narr: '카페 구석. 소미가 휴대폰을 보며 눈물을 참고 있었다.' },
    { who: 'somi', mood: 'sad', text: '악플이요… "재벌 2세한테 꼬리친다"래요. 저 그냥 팬인데.' },
    { choice: [
      { text: '소미 씨는 제일 진심인 팬이에요. 제가 알아요.', fx: { somi: 9 }, then: [{ who: 'somi', mood: 'love', text: '…헤헤. 그 한마디면 악플 백 개도 괜찮아요.' }] },
      { text: '그러게 너무 티 내지 말지 그랬어요.', fx: { somi: -7 }, then: [{ who: 'somi', mood: 'sad', text: '……네. 죄송해요.' }] },
    ] },
  ],
};
S.evB = {
  yuna: [
    { bg: 'linear-gradient(180deg,#1a0a18,#c0507a)' },
    { who: 'yuna', mood: 'surprised', text: '큰일이에요. 우리 같이 있는 사진, 파파라치한테 찍혔대요. 내일 기사 나간대요.' },
    { who: 'yuna', mood: 'sad', text: '…어떡할래요?' },
    { choice: [
      { text: '사실대로 말하죠. 숨길 거 없어요.', fx: { yuna: 12, fame: 6 }, then: [{ who: 'yuna', mood: 'love', text: '…바보. 그래서 당신이 좋은 거예요.' }] },
      { text: '구단 돈으로 기사 막을게요.', fx: { yuna: 2, money: -3 }, then: [{ who: 'yuna', mood: 'normal', text: '…또 돈이네요. 고마운데, 조금 서운해요.' }] },
    ] },
  ],
  jiwoo: [
    { bg: 'linear-gradient(180deg,#1f3a5c,#8fb8de)' },
    { who: 'jiwoo', mood: 'shy', text: '저기… 애플즈 데이터분석팀 인턴 공고 봤어요. 지원해도… 될까요?' },
    { choice: [
      { text: '구단주로서 정식 채용할게요. 지우 씨 실력이면 충분해요.', fx: { jiwoo: 12, eye: 3, morale: 3 }, then: [{ who: 'jiwoo', mood: 'love', text: '정말요?! 애플즈 우승, 제 데이터로 만들어 드릴게요!' }] },
      { text: '아는 사이라 특혜 논란이 생길 수도…', fx: { jiwoo: -3 }, then: [{ who: 'jiwoo', mood: 'sad', text: '…맞아요. 제가 너무 앞서갔네요.' }] },
    ] },
  ],
  harin: [
    { bg: 'linear-gradient(180deg,#ff8a5c,#ffd27a)' },
    { who: 'harin', mood: 'sad', text: '부산 씨걸스에서 연봉 두 배 준다고 오래요… 저, 어떡하죠?' },
    { choice: [
      { text: '애플즈에 남아 줘요. …내가 하린 씨 응원이 필요해.', fx: { harin: 12, fans: 1 }, then: [{ who: 'harin', mood: 'love', text: '…그럼 평생 구단주님 응원단장 할게요!' }] },
      { text: '더 좋은 조건이면 가야죠. 응원할게요.', fx: { harin: -6 }, then: [{ who: 'harin', mood: 'sad', text: '…잡아 줄 줄 알았는데.' }] },
    ] },
  ],
  sea: [
    { bg: 'linear-gradient(180deg,#141828,#3b4a6b)' },
    { who: 'sea', mood: 'normal', text: '다음 주 애플즈 경기 주심으로 배정됐어요. …기피 신청할까요? 당신이랑 가까워져서.' },
    { choice: [
      { text: '아니요. 세아 씨 판정을 믿어요. 공정하게 해 주세요.', fx: { sea: 12 }, then: [{ who: 'sea', mood: 'love', text: '……네. 그래서, 당신이 좋아요. 아, 방금 건 못 들은 걸로 해요.' }] },
      { text: '주심이면 저한테 좀 유리하겠네요?', fx: { sea: -12, seaFoul: 1 }, then: [{ who: 'sea', mood: 'angry', text: '기피 신청하겠습니다. …다신 그런 말 하지 마세요.' }] },
    ] },
  ],
  somi: [
    { bg: 'linear-gradient(180deg,#e5484d,#ffb0b8)' },
    { narr: '구장 앞. 소미가 밤새 만든 커다란 플래카드를 펼쳤다. "{name}, 너는 우리의 홈런왕!"' },
    { who: 'somi', mood: 'shy', text: '이거… 내일 경기 때 외야석에서 들 거예요.' },
    { choice: [
      { text: '다음 홈런은 저 플래카드 쪽으로 칠게요.', fx: { somi: 12, cond: 1 }, then: [{ who: 'somi', mood: 'love', text: '야, 약속했어요?! 저 그 공 받으면 평생 가보로 할 거예요!' }] },
      { text: '좀 부끄럽네요…', fx: { somi: 3 }, then: [{ who: 'somi', mood: 'smile', text: '헤헤, 부끄러워하는 것도 귀여워요!' }] },
    ] },
  ],
};

S.ending = {
  yuna: [{ bg: 'linear-gradient(180deg,#1a0a18,#ff7aa8)' }, { narr: '시즌이 끝난 밤, 레드카펫 행사장 뒤편. 유나가 드레스 차림으로 달려왔다.' },
    { who: 'yuna', mood: 'shy', text: '레드카펫보다… 당신 홈런 볼 때가 더 떨려요.' }, { who: 'yuna', mood: 'love', text: '연기 아니에요. 좋아해요, {name} 씨.' }],
  jiwoo: [{ bg: 'linear-gradient(180deg,#1f3a5c,#ffd27a)' }, { narr: '졸업식 날. 학사모를 쓴 지우가 논문 한 권을 내밀었다. 감사의 글에 내 이름이 있었다.' },
    { who: 'jiwoo', mood: 'shy', text: '제 데이터엔 오차가 없는데요… 당신 앞에선 계산이 안 돼요.' }, { who: 'jiwoo', mood: 'love', text: '좋아해요. 이건 99% 신뢰구간이에요!' }],
  harin: [{ bg: 'linear-gradient(180deg,#ff8a5c,#ffe27a)' }, { narr: '시즌 마지막 홈경기가 끝난 그라운드. 하린이 응원 단상에서 내려왔다.' },
    { who: 'harin', mood: 'shy', text: '앞으로 당신 응원은… 평생 저 혼자 할 거예요.' }, { who: 'harin', mood: 'love', text: '좋아해요, 구단주님. 아니— {name}!' }],
  sea: [{ bg: 'linear-gradient(180deg,#141828,#a3b8d8)' }, { narr: '시즌 종료 후, 한강공원. 심판복이 아닌 사복 차림의 세아가 서 있었다.' },
    { who: 'sea', mood: 'shy', text: '오늘은 판정 없이 말할게요.' }, { who: 'sea', mood: 'love', text: '…아웃이에요, 당신. 내 마음에서 못 나가요. 좋아해요.' }],
  somi: [{ bg: 'linear-gradient(180deg,#e5484d,#ffd0d6)' }, { narr: '팬 사인회가 끝난 뒤. 마지막 줄에 서 있던 소미가 사인 대신 편지를 내밀었다.' },
    { who: 'somi', mood: 'shy', text: '팬으로 시작했는데… 이제 팬으로만 있기 싫어요.' }, { who: 'somi', mood: 'love', text: '좋아해요, 진짜로! 이건 라이브 아니에요!' }],
};

// 길거리 랜덤 이벤트 (도시에서 ❗ NPC에게 말 걸기)
S.street = [
  { text: '"{name} 선수! 사인 한 장만요!" 팬에게 사인을 해 줬다.', fx: { fame: 1 } },
  { text: '꼬마가 글러브를 내밀었다. "캐치볼 해 주세요!" 잠깐 같이 놀아 줬다.', fx: { charm: 2 } },
  { text: '"구단주님, 이번 시즌 기대합니다!" 시민들이 응원해 줬다.', fx: { morale: 1 } },
  { text: '기자가 따라붙었다. "투타겸업 힘들지 않으세요?" 멋지게 답했다.', fx: { fame: 2 } },
  { text: '버스킹 중인 밴드가 애플즈 응원가를 불러 줬다. 기분이 좋아졌다.', fx: { cond: 1 } },
  { text: '할머니가 길을 물어봐서 안내해 드렸다. "복 받을 거여~"', fx: { charm: 1, cond: 1 } },
];

S.injury = [
  { bg: 'linear-gradient(180deg,#2a1020,#5c1f2f)' },
  { narr: '무리한 훈련 도중, 어깨에 날카로운 통증이 스쳤다.' },
  { who: 'coach', mood: 'angry', text: '구단주님! 그러다 선수 생명 끝납니다. 2주는 쉬셔야 합니다.' },
  { narr: '부상으로 2주간 경기에 나설 수 없다.' },
];
S.chairmanMid = [
  { bg: 'linear-gradient(180deg,#141828,#3b2f2a)' },
  { who: 'chairman', mood: 'normal', text: '시즌 절반이 지났다. 숫자는 보고 있다.' },
];
S.chairmanBad = [{ who: 'chairman', mood: 'angry', text: '적자에 성적까지 이 모양이면… 매각 서류 준비하라고 하겠다.' }];
S.chairmanGood = [{ who: 'chairman', mood: 'smile', text: '…생각보다 잘하고 있구나. 계속 이렇게만 해라.' }];

window.Story = { TEAMS, SLOTS, LOCS, GIRLS, GIRL_KEYS, DATE_PLACES, GIFTS, TICKETS, FACILITIES, FAS, S };
})();
