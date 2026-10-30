# 합주팡 — 새 세션에서 이어서 작업하기

## GitHub 주소

| | |
|---|---|
| 저장소 | https://github.com/ceoappletree/pang_apple |
| 작업 브랜치 | `ccr-dc74fa54-6ze5eq` (아직 `main`에 합치지 않았어요) |
| 브랜치 바로 가기 | https://github.com/ceoappletree/pang_apple/tree/ccr-dc74fa54-6ze5eq |
| 공유 플레이 링크 | https://claude.ai/artifact/MdyRaraCwS6RzM2EQ4a7XM (Claude 아티팩트, 공유하기 전에는 본인만 열 수 있어요) |

## 1. 내 컴퓨터로 받기

```bash
git clone -b ccr-dc74fa54-6ze5eq https://github.com/ceoappletree/pang_apple.git
cd pang_apple
```

이미 받아 둔 폴더라면 `git pull` 로 최신 상태를 받으세요.

## 2. 게임 실행

`index.html` 을 더블클릭하면 브라우저에서 바로 실행돼요. 설치할 것은 없어요.

## 3. 새 세션 시작

- **Claude 데스크톱 앱**: Claude Code에서 받은 `pang_apple` 폴더를 열고 새 세션을 시작하세요.
- **터미널**: `pang_apple` 폴더 안에서 `claude` 를 실행하세요.
- **웹(claude.ai/code)**: 저장소 `ceoappletree/pang_apple` 를 골라 새 세션을 시작하세요.

새 세션은 이전 대화를 기억하지 못해요. 첫 메시지로 아래 상자 안 내용을 통째로 붙여 넣고, 맨 아래 **[이번에 할 일]** 만 고쳐 쓰세요.

```text
합주팡 게임 작업을 이어서 하자. 대답은 한국어로 해 줘.

[저장소]
- GitHub: https://github.com/ceoappletree/pang_apple
- 작업 브랜치: ccr-dc74fa54-6ze5eq (main에는 아직 합치지 않았어. 이 브랜치에서 작업하고, 끝나면 커밋해서 이 브랜치로 푸시해)
- 지금 폴더에 저장소가 없으면 먼저 받아: git clone -b ccr-dc74fa54-6ze5eq https://github.com/ceoappletree/pang_apple.git
- 시작 전에 README.md 를 읽고 구조와 규칙을 파악해.

[게임 요약]
수박 게임처럼 악기를 떨어뜨려서 같은 악기 둘을 합치면 한 단계 큰 악기가 되는 휴대폰용 웹 게임이야.
판 위 악기들이 같은 박자에 맞춰 함께 연주해서 하나의 합주가 돼.
빌드 과정 없는 순수 HTML/CSS/JS(ES 모듈 아님)라서 index.html 을 더블클릭하면 바로 실행돼. 물리는 lib/matter.min.js 를 써.

[이미 정한 규칙 — 내가 바꾸라고 하기 전에는 유지해]
1. 세트 5개: 오케스트라, 일렉트로, 고양이 아카펠라, 중국풍, 인도. 세트마다 악기 11단계, 템포, 화음, 화면 색, DJ 동물이 달라. 이전 세트에서 8번째 악기를 만들면 다음 세트가 열리고, 11번째(가장 큰 악기)를 만들면 그 세트는 클리어.
2. 모든 악기는 하나의 지휘(공용 박자)를 따라. 4마디 묶음 단위로 돌고, 새 악기는 다음 묶음의 첫 박에 다른 악기들과 같은 순간에 들어가. 무대가 조용할 때는 그 순간이 첫 박이야.
3. 판 위에 있는 악기는 판에 있는 동안 계속 연주해. 합쳐져서 판에서 사라지면 다음 마디에 멈춰.
4. 1~4단계 리듬은 쉬지 않아. 5단계부터(보컬 포함)는 악기마다 3~5번 연주하고 1~3번 쉬기를 무작위로 반복해. (src/music.js 의 STEADY_TIERS, PLAY_TIMES, REST_TIMES)
5. 같은 악기가 k개면 묶음마다 차례로 변주 A→B→C→D 를 맡아서 k배 긴 리듬이나 멜로디가 돼. 지금 차례인 공에는 점선 테두리가 돌아.
6. 가장 큰 악기(피아노, 신디사이저, 디바냥, 얼후, 시타르)의 멜로디는 한 변주가 8마디야(오케스트라 기준 16초).
7. 선율 악기와 보컬은 실제 녹음(FluidR3 GM 사운드폰트, Frank Wen, CC BY 3.0 — 출처 표시는 꼭 유지)이고, 타악기·일렉트로 신스·고양이 소리는 Web Audio 합성이야. 녹음은 세트마다 필요한 것만 불러오고, 다 불러오기 전에는 합성 소리로 대신 연주해. 녹음별 음량 보정은 src/music.js 의 SAMPLED 에 있어.
8. 보컬은 판 위 공이 아니야. 연주 중인 악기가 5종 이상이면 합창단, 7종 이상이면 리드 보컬이 들어와(주선율을 한 옥타브 아래에서, 가사 없이 모음으로). (VOCAL_AT)
9. 상단 DJ 동물(오케스트라 곰, 일렉트로 토끼, 고양이 아카펠라 고양이, 중국풍 판다, 인도 코끼리)이 박자에 맞춰 고개를 흔들고, 묶음 첫 박에 손을 들고, 리드 보컬이 부를 때 마이크를 들어.
10. 악기 공은 소리가 날 때마다 커졌다 작아지고, 쉬는 공은 흐리게 보여.
11. 진행 중인 판, 해금, 세트별 최고 점수, 클리어 기록은 localStorage(hapjupang.*)에 자동 저장되고, 다시 열면 '저장된 판 이어서' 버튼으로 불러와.
12. 화면은 휴대폰 세로가 우선이고, 화면 글자는 모두 한국어야.

[파일]
- index.html, style.css: 화면
- src/sets.js: 세트, 악기, 리듬, 멜로디 데이터
- src/music.js: 음악 엔진(지휘, 변주 차례, 쉬기, 보컬, 합성 소리, 녹음 음량 보정)
- src/sampler.js: 녹음 불러오기와 재생
- src/icons.js: 악기와 고양이 그림 / src/dj.js: DJ 동물
- src/game.js: 물리, 입력, 저장, 화면 갱신
- samples/: 녹음 파일(tools/build_samples.py 로 생성)
- tools/build_artifact.py: 공유 플레이 링크용으로 모든 파일을 HTML 하나로 묶기

[작업 방식]
- 고친 뒤에는 가능하면 헤드리스 브라우저(Playwright + Chromium)로 index.html 을 열어 오류와 화면을 확인해. 테스트용 함수가 있어: window.__game.unlockAll(), window.__game.spawn(단계번호, x좌표), Music.status(i), Music.conductor(), Music._buses()(음량 측정용).
- 너는 소리를 직접 들을 수 없으니, 소리를 바꾸면 내가 무엇을 들어 봐야 하는지 알려 줘.
- 공유 플레이 링크: https://claude.ai/artifact/MdyRaraCwS6RzM2EQ4a7XM
  아티팩트 도구가 있으면, 고친 뒤 python3 tools/build_artifact.py 로 dist/hapjupang-artifact.html 을 만들고, 이 링크를 먼저 읽은 다음 같은 링크에 덮어써서 게시해.

[아직 정하지 않은 것]
- 녹음을 다 불러오기 전에 '불러오는 중'으로 기다리게 할지(지금은 합성 소리로 대신 연주함)
- 작업 브랜치를 main 에 합칠지

[이번에 할 일]
(여기에 하고 싶은 작업을 적으세요)
```
