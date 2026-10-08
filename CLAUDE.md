# 상식 퀴즈 웹 앱

4지선다 상식 퀴즈. 서버 없이 `index.html`을 열면 동작하는 정적 앱이다. 요구는 `PRD.md`, 구현 순서는 `IMPL-PLAN.md`를 따른다.

## 제약
- 앱 파일은 `index.html`, `style.css`, `script.js`, `questions.js` 4개뿐이다. 파일을 더 늘리지 않는다. (`tests/`는 개발용)
- `file://`로 열어도 동작해야 한다. `import`/`export`, `fetch`, ES 모듈을 쓰지 않는다. `questions.js`는 `window.QUESTIONS`로 노출한다.
- `script.js`는 위쪽이 DOM을 쓰지 않는 순수 로직(`window.Quiz`), 아래쪽이 화면이다. 규칙은 순수 로직에 둔다.

## 테스트
- `tests/tests.html`을 브라우저로 열면 제목 표시줄에 `PASS (n)` 또는 `FAIL n`이 나온다.
- 이 환경에는 node가 없다. 확인은 `python -m http.server`로 서버를 띄워 브라우저에서 연다. (앱 자체는 서버가 필요 없다.)
- 새 로직은 테스트를 먼저 쓰고 실패하는 것을 확인한 뒤 구현한다. 화면은 자동 테스트가 없으므로 `IMPL-PLAN.md`의 "직접 확인할 항목"으로 확인한다.

## 문항 규칙 (PRD §8)
1. 문항마다 정답은 하나만이다.
2. 해설은 한 줄이고 `(출처: …, 확인일 …)`을 쓴다. 출처는 실제로 열어 확인한 자료만 쓴다.
3. "가장/최초/최대" 같은 최상급은 기준과 시점을 문제에 쓴다. `tests/data.test.js`가 휴리스틱으로 검사하지만 사람이 읽는 검토를 대신하지 못한다.

## 작업 방식
- 단계는 `IMPL-PLAN.md`의 1→2→3 순서다. 사용자가 "시작하라"고 하기 전에는 다음 단계를 시작하지 않는다. 단계가 끝나면 멈추고 직접 확인할 항목을 알려 준다.
- 커밋 이메일은 이 저장소 전용으로 GitHub noreply 주소를 쓴다(`git config --local user.email`로 설정됨). 커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`을 붙인다.
- 푸시와 공개 저장소에 올라가는 변경은 사용자가 말했을 때만 한다.

## 배포
- 공개 저장소 `y4kun4s1/Study03_Quiz`의 `master` 루트를 GitHub Pages로 배포한다: https://y4kun4s1.github.io/Study03_Quiz/
- `.claude/`는 `.gitignore`에 들어 있어 올라가지 않는다.
