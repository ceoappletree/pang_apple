// 커리어 모드 데이터: 팀, 히로인, 이벤트 스크립트
(() => {
'use strict';

// ---------- 리그 ----------
// off: 타선 / pit: 투수진 (높을수록 강함), ace: 선발 투수
const TEAMS = [
  { id: 'APL', name: '서울 애플즈', short: '애플즈', color: '#e5484d', off: 52, pit: 53, me: true },
  { id: 'SEA', name: '부산 씨걸스', short: '씨걸스', color: '#3b82f6', off: 56, pit: 52,
    ace: { name: '박해성', velo: 147, ctrl: 0.55, mix: { FB: 0.45, SL: 0.3, CH: 0.15, CU: 0.1 } } },
  { id: 'WAV', name: '인천 웨이브스', short: '웨이브스', color: '#14b8a6', off: 51, pit: 57,
    ace: { name: '최강윤', velo: 150, ctrl: 0.6, mix: { FB: 0.5, FK: 0.3, SL: 0.2 } } },
  { id: 'BLZ', name: '대구 블레이즈', short: '블레이즈', color: '#f97316', off: 58, pit: 47,
    ace: { name: '이도훈', velo: 144, ctrl: 0.45, mix: { FB: 0.4, TW: 0.25, CU: 0.2, CH: 0.15 } } },
  { id: 'PHX', name: '광주 피닉스', short: '피닉스', color: '#a855f7', off: 49, pit: 53,
    ace: { name: '김서준', velo: 141, ctrl: 0.7, mix: { TW: 0.35, CH: 0.3, CU: 0.2, FB: 0.15 } } },
  { id: 'CMT', name: '대전 코메츠', short: '코메츠', color: '#eab308', off: 47, pit: 49,
    ace: { name: '정우람', velo: 145, ctrl: 0.5, mix: { FB: 0.5, CU: 0.25, SL: 0.25 } } },
];

// ---------- 히로인 ----------
const GIRLS = {
  haneul: {
    name: '윤하늘', role: '소꿉친구 · 카페 사장', color: '#ff9ec0', bg: 'linear-gradient(180deg,#ffd9b8,#f7a8a0)',
    // 데이트 장소 선호도: -1 싫어함, 0 보통, 1 좋아함, 2 아주 좋아함
    likes: { cafe: 1, movie: 1, park: 2, amusement: 2, restaurant: 0, museum: 0, bowling: 0, batting: 1 },
    lines: {
      2: ['"여기 와 보고 싶었어! 오늘 진짜 행복하다~"', '"헤헤, 우리 어릴 때도 이렇게 놀았었지?"'],
      1: ['"재밌었어! 다음에 또 오자, 응?"', '"너랑 오니까 더 좋네."'],
      0: ['"음… 나쁘진 않았어."', '"그래도 같이 있어서 좋았어."'],
      '-1': ['"…나 이런 데 별로인 거 알면서."', '"좀 피곤하다. 오늘은 일찍 들어갈게."'],
    },
  },
  seoyun: {
    name: '한서윤', role: '스포츠 아나운서', color: '#b7a6ff', bg: 'linear-gradient(180deg,#2b2f63,#7b5ea7)', needFame: 30,
    likes: { cafe: 0, movie: 1, park: 0, amusement: -1, restaurant: 2, museum: 2, bowling: -1, batting: 0 },
    lines: {
      2: ['"…취향이 좋네요. 조금 놀랐어요."', '"오늘은 방송 생각 안 하고 즐겼어요. 고마워요."'],
      1: ['"괜찮은 선택이에요."', '"생각보다 즐거웠어요."'],
      0: ['"그럭저럭이네요."', '"다음엔 좀 더 기대할게요."'],
      '-1': ['"…저 이런 시끄러운 곳 별로예요."', '"내일 아침 생방송이라 먼저 갈게요."'],
    },
  },
  minji: {
    name: '강민지', role: '구단 트레이너', color: '#ffb36b', bg: 'linear-gradient(180deg,#ffcf70,#ff7a59)',
    likes: { cafe: 0, movie: -1, park: 1, amusement: 1, restaurant: 0, museum: -1, bowling: 2, batting: 2 },
    lines: {
      2: ['"오! 이런 데 좋아! 한 판 더 해!"', '"너 의외로 센스 있다? …칭찬 아니거든!"'],
      1: ['"땀 좀 흘리니까 개운하네."', '"뭐, 나쁘지 않았어."'],
      0: ['"…그냥 그랬어."', '"다음엔 몸 좀 움직이는 데 가자."'],
      '-1': ['"가만히 앉아만 있으니까 좀이 쑤셔…"', '"…졸려. 나 간다."'],
    },
  },
};

const PLACES = [
  { id: 'cafe', name: '☕ 카페' }, { id: 'movie', name: '🎬 영화관' }, { id: 'park', name: '🌳 공원 산책' },
  { id: 'amusement', name: '🎡 놀이공원' }, { id: 'restaurant', name: '🍝 레스토랑' }, { id: 'museum', name: '🖼 미술관' },
  { id: 'bowling', name: '🎳 볼링장' }, { id: 'batting', name: '⚾ 배팅센터' },
];

// ---------- 스크립트 ----------
// 스텝: { who, mood, text } | { narr } | { bg } | { choice:[{ text, fx, then:[...] }] } | { fx }
// fx: { haneul:+5, seoyun:.., minji:.., fame, trust, cond, stamina, meet, power, eye, speed, charm }
const S = {};

S.opening = [
  { bg: 'linear-gradient(180deg,#1b2a55,#3a4f8a)' },
  { narr: '봄. 서울 애플즈 홈구장, 애플파크.' },
  { narr: '드래프트 2라운드로 입단한 신인 타자, {name}.' },
  { who: 'coach', mood: 'normal', text: '네가 {name}인가. 감독 김대호다.' },
  { who: 'coach', mood: 'angry', text: '신인이라고 봐주는 건 없다. 시즌은 24주. 결과로 증명해라.' },
  { who: 'coach', mood: 'normal', text: '평일 시간은 네가 알아서 써라. 훈련을 하든, 쉬든. 대신 주말 경기에서 못 치면 벤치다.' },
  { narr: '사무실을 나서자 익숙한 목소리가 들렸다.' },
  { bg: 'linear-gradient(180deg,#ffd9b8,#f7a8a0)' },
  { who: 'haneul', mood: 'happy', text: '{name}! 진짜 프로 선수가 됐네! 축하해!!' },
  { who: 'haneul', mood: 'smile', text: '나 구장 앞에 카페 차렸다? \'하늘정원\'. 훈련 끝나면 꼭 들러!' },
  { choice: [
    { text: '당연하지. 단골 될게.', fx: { haneul: 6 }, then: [{ who: 'haneul', mood: 'love', text: '약속했다? 아메리카노는 평생 공짜로 해 줄게!' }] },
    { text: '바빠서 자주는 못 갈 것 같아.', fx: { haneul: -2 }, then: [{ who: 'haneul', mood: 'sad', text: '…그래도 가끔은 와야 해?' }] },
  ] },
];

S.meetSeoyun = [
  { bg: 'linear-gradient(180deg,#2b2f63,#7b5ea7)' },
  { narr: '경기가 끝나고, 카메라 조명 앞에 선 아나운서가 다가왔다.' },
  { who: 'seoyun', mood: 'normal', text: 'SBC 스포츠 한서윤입니다. 신인 {name} 선수, 데뷔 첫 주 소감 부탁드려요.' },
  { choice: [
    { text: '팀 승리에 보탬이 되겠습니다.', fx: { seoyun: 3, fame: 2 }, then: [{ who: 'seoyun', mood: 'smile', text: '교과서 같은 답변이네요. 나쁘지 않아요.' }] },
    { text: '올 시즌 홈런왕, 제가 가져가겠습니다!', fx: { seoyun: 6, fame: 5 }, then: [
      { who: 'seoyun', mood: 'surprised', text: '…신인이 큰소리네요?' },
      { who: 'seoyun', mood: 'smile', text: '그 말, 기억해 둘게요. 시즌 끝나고 다시 인터뷰하죠.' }] },
    { text: '아나운서님이 예뻐서 긴장되네요.', fx: { seoyun: -4 }, then: [{ who: 'seoyun', mood: 'angry', text: '…방송 중입니다. 프로답게 해 주세요.' }] },
  ] },
];

S.meetMinji = [
  { bg: 'linear-gradient(180deg,#ffcf70,#ff7a59)' },
  { narr: '아침 일찍 실내 훈련장. 배트를 휘두르려는 순간—' },
  { who: 'minji', mood: 'angry', text: '거기 신인! 스트레칭도 안 하고 배트 휘두르면 어깨 나가요!' },
  { who: 'minji', mood: 'normal', text: '트레이너 강민지. 앞으로 부상당하면 나한테 혼날 줄 알아요.' },
  { choice: [
    { text: '죄송합니다. 스트레칭 가르쳐 주세요.', fx: { minji: 6 }, then: [{ who: 'minji', mood: 'shy', text: '…흥, 말은 잘 듣네. 따라 해요.' }] },
    { text: '괜찮아요, 저 튼튼해요.', fx: { minji: -3 }, then: [{ who: 'minji', mood: 'angry', text: '그런 사람이 제일 먼저 다쳐요. 두고 봐요.' }] },
  ] },
];

// 호감도 이벤트 (A: 35 이상, B: 60 이상)
S.haneulA = [
  { bg: 'linear-gradient(180deg,#3b3f6b,#8b6f8f)' },
  { narr: '비 오는 밤. 문 닫을 시간이 지난 \'하늘정원\'에 불이 켜져 있다.' },
  { who: 'haneul', mood: 'smile', text: '왔네? 단백질 라테. 너 전용 메뉴야.' },
  { who: 'haneul', mood: 'normal', text: '있잖아… 어릴 때 동네 공터에서 했던 약속, 기억해?' },
  { who: 'haneul', mood: 'shy', text: '네가 프로 가서 홈런 치면… 아, 아니다. 아무것도 아냐!' },
  { choice: [
    { text: '기억하고 있어.', fx: { haneul: 8 }, then: [{ who: 'haneul', mood: 'love', text: '……바보. 그럼 꼭 쳐야 해, 홈런.' }] },
    { text: '그런 약속을 했었나?', fx: { haneul: -3 }, then: [{ who: 'haneul', mood: 'sad', text: '…그렇구나. 응, 별거 아니었어.' }] },
  ] },
];
S.haneulB = [
  { bg: 'linear-gradient(180deg,#0f1b3d,#3a4f8a)' },
  { narr: '야간 훈련이 끝난 구장 출입구. 하늘이가 보자기를 들고 서 있었다.' },
  { who: 'haneul', mood: 'smile', text: '도시락! 그리고… 이건 부적. 직접 만들었어.' },
  { who: 'haneul', mood: 'sad', text: '다치지 마. …네가 다치면, 나 진짜 속상해.' },
  { choice: [
    { text: '고마워. 다음 홈런은 너한테 바칠게.', fx: { haneul: 10, cond: 1 }, then: [{ who: 'haneul', mood: 'love', text: '정말? …기대할게. 엄청 엄청 기대할게!' }] },
    { text: '부적 같은 거 안 믿는데…', fx: { haneul: -5 }, then: [{ who: 'haneul', mood: 'angry', text: '그래도 들고 다녀! 정성이야, 정성!' }] },
  ] },
];
S.seoyunA = [
  { bg: 'linear-gradient(180deg,#2b2f63,#7b5ea7)' },
  { narr: '방송국 복도. 서윤이 떨어뜨린 취재 노트를 주웠다.' },
  { narr: '펼쳐진 페이지엔 내 타석 기록이 빼곡히 적혀 있었다.' },
  { who: 'seoyun', mood: 'surprised', text: '아… 그거 제 거예요!' },
  { who: 'seoyun', mood: 'shy', text: '…취재용이에요. 오해하지 마세요.' },
  { choice: [
    { text: '이렇게 꼼꼼히 봐 줘서 고마워요.', fx: { seoyun: 7 }, then: [{ who: 'seoyun', mood: 'smile', text: '…당연하죠. 일이니까요. 그래도, 천만에요.' }] },
    { text: '혹시 제 팬이세요?', fx: { seoyun: 4 }, then: [{ who: 'seoyun', mood: 'angry', text: '아, 아니거든요?! …아마도.' }] },
  ] },
];
S.seoyunB = [
  { bg: 'linear-gradient(180deg,#0d0f24,#2b2f63)' },
  { narr: '늦은 밤 방송국 주차장. 차 안에서 서윤이 혼자 울고 있었다.' },
  { who: 'seoyun', mood: 'sad', text: '…보셨죠? 오늘 생방송 실수. 완벽해야 하는데.' },
  { who: 'seoyun', mood: 'sad', text: '저, 실수하는 제가 너무 싫어요.' },
  { choice: [
    { text: '완벽하지 않아도, 서윤 씨 방송이 제일 좋아요.', fx: { seoyun: 10 }, then: [
      { who: 'seoyun', mood: 'shy', text: '……' }, { who: 'seoyun', mood: 'love', text: '그런 말, 반칙이에요. …고마워요.' }] },
    { text: '다음에 잘하면 되죠.', fx: { seoyun: 3 }, then: [{ who: 'seoyun', mood: 'smile', text: '…그렇죠. 맞는 말이에요.' }] },
  ] },
];
S.minjiA = [
  { bg: 'linear-gradient(180deg,#ffcf70,#ff7a59)' },
  { narr: '트레이닝실. 민지가 손목에 테이핑을 감아 주고 있다.' },
  { who: 'minji', mood: 'normal', text: '너 요즘 훈련 열심히 하더라.' },
  { who: 'minji', mood: 'shy', text: '…조금은, 아주 조금은 인정해 줄게.' },
  { choice: [
    { text: '민지 씨 덕분이에요.', fx: { minji: 8 }, then: [{ who: 'minji', mood: 'love', text: '뭐, 뭐래! 테이핑 다 됐어! 가!' }] },
    { text: '원래 잘했는데요?', fx: { minji: -2 }, then: [{ who: 'minji', mood: 'angry', text: '그 입만 좀 덜 놀리면 완벽할 텐데.' }] },
  ] },
];
S.minjiB = [
  { bg: 'linear-gradient(180deg,#1b2a55,#ff7a59)' },
  { narr: '노을 지는 불펜. 민지가 오래된 소프트볼 글러브를 만지고 있었다.' },
  { who: 'minji', mood: 'sad', text: '나, 고등학교 때 소프트볼 국가대표 후보였어. 무릎 다치기 전까진.' },
  { who: 'minji', mood: 'normal', text: '그래서 선수들 다치는 거 못 봐. …특히 너는.' },
  { choice: [
    { text: '민지 씨 몫까지 뛸게요. 다치지 않고.', fx: { minji: 10, stamina: 20 }, then: [{ who: 'minji', mood: 'love', text: '……약속이야. 어기면 죽어.' }] },
    { text: '그럼 왜 트레이너를 하게 됐어요?', fx: { minji: 3 }, then: [{ who: 'minji', mood: 'smile', text: '야구장이 좋아서. …그냥, 그게 다야.' }] },
  ] },
];

S.allstar = [
  { bg: 'linear-gradient(180deg,#1b2a55,#e5484d)' },
  { narr: '전반기 종료. 팬 투표 결과가 발표됐다.' },
  { who: 'coach', mood: 'smile', text: '{name}, 올스타 선정이다. 신인이 제법이군.' },
  { fx: { fame: 10, trust: 6 } },
  { narr: '올스타전에서 팬들의 환호를 한 몸에 받았다! (인기 +10, 신뢰 +6)' },
];
S.allstarMiss = [
  { bg: 'linear-gradient(180deg,#1b2a55,#3a4f8a)' },
  { narr: '전반기 종료. 올스타에는 뽑히지 못했다.' },
  { who: 'coach', mood: 'normal', text: '쉬는 것도 실력이다. 후반기엔 이름값 좀 해 봐라.' },
  { fx: { stamina: 100, cond: 1 } },
  { narr: '올스타 브레이크 동안 푹 쉬었다. (체력 회복, 컨디션 UP)' },
];

S.festivalIntro = [
  { bg: 'linear-gradient(180deg,#0b0f2a,#3a1f5c)' },
  { narr: '한여름 밤, 한강 불꽃축제. 누구와 함께 갈까?' },
];
S.festival = {
  haneul: [
    { who: 'haneul', mood: 'happy', text: '와아—! 봤어? 하트 모양이었어!' },
    { who: 'haneul', mood: 'shy', text: '…내년에도, 그다음 해에도, 같이 보러 오자.' }],
  seoyun: [
    { who: 'seoyun', mood: 'smile', text: '방송으로만 보던 불꽃을 이렇게 보니… 다르네요.' },
    { who: 'seoyun', mood: 'shy', text: '…오늘은 아나운서 말고, 그냥 서윤이로 있을게요.' }],
  minji: [
    { who: 'minji', mood: 'happy', text: '야, 저기! 저거 봐! 진짜 크다!' },
    { who: 'minji', mood: 'shy', text: '…손 잡은 거, 사람 많아서 놓칠까 봐 그런 거야. 진짜야.' }],
};

S.injury = [
  { bg: 'linear-gradient(180deg,#2a1020,#5c1f2f)' },
  { narr: '무리한 훈련 도중, 옆구리에 날카로운 통증이 스쳤다.' },
  { who: 'minji', mood: 'angry', text: '거봐! 내가 쉬라고 했잖아! …2주는 절대 안정이야.' },
  { narr: '부상으로 2주간 경기에 나설 수 없다.' },
];

S.randoms = [
  { id: 'fanletter', w: 3, steps: [{ narr: '구단 사무실에 내 앞으로 팬레터가 도착했다! "{name} 선수 홈런 보고 야구가 좋아졌어요!"' }, { fx: { fame: 3, cond: 1 } }] },
  { id: 'coachTip', w: 2, steps: [{ who: 'coach', mood: 'normal', text: '{name}. 하체가 먼저 나가고 손이 따라와야 한다. …잘 봐라.' }, { fx: { meet: 2, trust: 2 } }, { narr: '감독의 특별 지도! (미트 +2)' }] },
  { id: 'slump', w: 2, steps: [{ narr: '요즘 공이 잘 안 보인다. 슬럼프인가…' }, { fx: { cond: -1 } }] },
  { id: 'haneulStreet', w: 2, need: 'haneul', steps: [{ who: 'haneul', mood: 'smile', text: '어? {name}! 장 보러 나왔어. 짐 좀 들어 줄래?' }, { fx: { haneul: 3 } }] },
  { id: 'seoyunNews', w: 2, need: 'seoyun', steps: [{ who: 'seoyun', mood: 'smile', text: '오늘 뉴스에 {name} 선수 하이라이트 나갔어요. …제가 넣었어요.' }, { fx: { seoyun: 3, fame: 2 } }] },
  { id: 'minjiCheck', w: 2, need: 'minji', steps: [{ who: 'minji', mood: 'normal', text: '컨디션 체크. …흠, 나쁘지 않네. 오늘은 이거 먹어.' }, { fx: { minji: 3, stamina: 15 } }, { narr: '민지가 준 에너지바를 먹었다. (체력 +15)' }] },
  { id: 'blackout', w: 1, steps: [{ narr: '숙소가 정전돼서 한숨도 못 잤다…' }, { fx: { stamina: -15 } }] },
];

// 고백 엔딩
S.ending = {
  haneul: [
    { bg: 'linear-gradient(180deg,#0f1b3d,#f7a8a0)' },
    { narr: '시즌이 끝난 밤. 텅 빈 애플파크 그라운드에 하늘이가 서 있었다.' },
    { who: 'haneul', mood: 'shy', text: '어릴 때 약속… 네가 프로에서 홈런 치면, 내가 먼저 말하기로 했잖아.' },
    { who: 'haneul', mood: 'love', text: '좋아해, {name}. 아주 오래전부터.' }],
  seoyun: [
    { bg: 'linear-gradient(180deg,#0d0f24,#7b5ea7)' },
    { narr: '시즌 결산 인터뷰가 끝나고, 서윤이 마이크를 내려놓았다.' },
    { who: 'seoyun', mood: 'shy', text: '사실 취재 핑계였어요. 그냥… 당신을 보고 싶어서 매주 구장에 왔어요.' },
    { who: 'seoyun', mood: 'love', text: '이건 방송 아니에요. 좋아해요, {name} 씨.' }],
  minji: [
    { bg: 'linear-gradient(180deg,#1b2a55,#ffcf70)' },
    { narr: '마지막 경기 후 트레이닝실. 민지가 내 손목 테이핑을 천천히 풀었다.' },
    { who: 'minji', mood: 'shy', text: '다음 시즌에도, 그 다음에도… 네 몸은 내가 관리할 거야. 평생.' },
    { who: 'minji', mood: 'love', text: '…그런 의미로 하는 말이야. 바보야.' }],
};

window.Story = { TEAMS, GIRLS, PLACES, S };
})();
