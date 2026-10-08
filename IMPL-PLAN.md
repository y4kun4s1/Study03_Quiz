# 상식 퀴즈 웹 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서버 없이 `index.html`을 열면 동작하는 4지선다 상식 퀴즈(연습·스피드·힌트 모드, 순위표)를 3단계로 만든다.

**Architecture:** 게임 규칙(셔플, 채점, 힌트, 타이머, 순위표 저장)은 DOM을 쓰지 않는 순수 함수로 `script.js` 위쪽에 두고 `window.Quiz`로 노출한다. 화면 그리기와 이벤트 처리는 `script.js` 아래쪽에 둔다. 순수 함수는 `tests/tests.html`을 더블클릭해 브라우저에서 검증하고, 화면은 단계마다 정해 둔 "직접 확인" 목록으로 사람이 확인한다.

**Tech Stack:** 순수 HTML/CSS/JavaScript(ES2015+), 빌드·번들러·서버 없음. 테스트는 직접 만든 20줄짜리 러너(`tests/tests.html`)를 쓴다.

**Spec:** `PRD.md`

## Global Constraints

- 앱 파일은 정확히 4개: `index.html`, `style.css`, `script.js`, `questions.js`. (`tests/` 폴더는 개발용이며 앱 동작에 필요 없다.)
- `file://`로 열었을 때 동작해야 한다. `import`/`export`, `fetch`, ES 모듈을 쓰지 않는다. `questions.js`는 `window.QUESTIONS`로 노출하고 `<script>` 태그로 읽는다.
- 카테고리 4개: `한국사`, `세계지리`, `과학`, `예술과 문화`. 카테고리마다 10문항, 총 40문항.
- 한 판 = 카테고리 1개의 10문항. 끝나면 점수를 보여 준다.
- 보기를 고르면 즉시 정답 여부와 한 줄 해설을 보여 준다.
- 틀린 문항은 모든 모드에서 0점.
- 연습: 시간 제한·힌트 없음, 정답 1점, 순위표 기록 안 함. 시작 화면과 결과 화면에 문구 **"순위표에 기록되지 않음"** 표시.
- 스피드: 문항마다 15초, 시간 초과는 오답. 해설이 나오면 타이머 정지, [다음]을 누르면 15초부터 다시 센다.
- 힌트: 문항마다 1번, 오답 보기 2개를 지운다. 힌트 쓰고 정답이면 0.5점(힌트 없이 정답은 1점).
- 순위표: `localStorage`, 모드(스피드/힌트)×카테고리별 8개, 점수 높은 순, 순위표마다 상위 10개. 연습은 기록하지 않는다.
- 문항 규칙: ① 정답은 하나만 ② 해설에 확인한 출처 명시 ③ "가장 ~한" 등 최상급 표현은 문제에 기준과 시점을 명시.

## Review Focus

1. **같은 문항에 보기를 두 번 누르거나, 해설이 나온 뒤 보기를 또 누름** → 점수가 한 번만 반영되고 결과도 한 번만 기록된다. (Task 2)
2. **타이머가 답한 뒤·화면을 벗어난 뒤에 만료됨 / 만료가 두 번 발생함** → 만료는 문항당 최대 1회이고, 정지(stop) 후에는 아무 일도 일어나지 않는다. (Task 4)
3. **힌트가 정답을 지움 / 힌트를 두 번 씀 / 답한 뒤에 씀 / 지워진 보기를 누름** → 정답은 절대 지워지지 않고, 힌트는 문항당 1번, 지워진 보기는 선택되지 않는다. 보기를 섞은 뒤에도 `answer` 인덱스가 맞다. (Task 2, 4)
4. **localStorage가 없거나(차단), 값이 깨진 JSON이거나, 항목 형식이 이상함** → 게임은 계속 동작하고, 순위표는 빈 것으로 취급하며, 저장 실패는 화면에 알린다. (Task 6)
5. **틀린 문제가 0개일 때 [틀린 문제 다시 풀기]** → 버튼이 나오지 않는다. 다시 풀기에서 또 틀리면 그 문항만 남아 반복할 수 있다. (Task 4, 5)

## 진행 메모

- 작업 폴더는 git 저장소가 아니다. 커밋 단계는 실행 전에 `git init`을 한 경우에만 수행하고, 아니면 건너뛴다.
- 파일 구성

| 파일 | 책임 |
|---|---|
| `questions.js` | 문제 데이터 40개 (`window.QUESTIONS`) |
| `script.js` | ① 순수 로직 → `window.Quiz` ② 화면/이벤트 |
| `index.html` | `<main id="app">` 와 스크립트 로드 |
| `style.css` | 스타일 |
| `tests/tests.html` | 테스트 러너(더블클릭으로 열기) |
| `tests/data.test.js`, `tests/logic.test.js`, `tests/storage.test.js` | 단계별 테스트 |

---

# 1단계: 연습 모드와 점수

## 만들 것
- 문제 40개(`questions.js`)와 형식 검증 테스트
- 순수 로직: 셔플, 채점, 한 판 진행 상태
- 화면: 시작(카테고리 선택, "순위표에 기록되지 않음" 문구) → 문제 → 해설 → 결과(점수)
- 아직 없는 것: 모드 선택 화면, 틀린 문제 다시 풀기

## 완료 기준
- `tests/tests.html`이 모두 PASS (제목 표시줄에 `PASS`).
- 4개 카테고리를 각각 끝까지 풀 수 있고, 결과에 `점수: n / 10`이 보인다.
- 정답 시 1점, 오답 시 0점. 보기를 누르는 즉시 정답/오답과 해설이 나온다.
- 시작 화면과 결과 화면에 "순위표에 기록되지 않음"이 보인다.
- 파일을 더블클릭(`file://`)해서 열어도 동작하고, 콘솔 에러가 없다.

## 직접 확인할 항목 (브라우저)
1. `index.html`을 더블클릭해 연다. 4개 카테고리 버튼과 "순위표에 기록되지 않음"이 보이는가?
2. 카테고리 하나를 골라 첫 문제에서 **정답**을 누른다 → "정답!"과 한 줄 해설(출처 포함)이 즉시 나오고, 정답 보기가 초록색인가? 보기를 더 눌러도 아무 일이 없는가?
3. 다음 문제에서 **오답**을 누른다 → "오답", 내가 고른 보기는 빨강, 정답 보기는 초록, 해설이 나오는가? 상단 점수는 그대로인가?
4. 10문제를 끝까지 푼다. 마지막 문제의 버튼이 [결과 보기]이고, 결과의 점수가 내가 맞힌 개수와 같은가?
5. 결과 화면에 "순위표에 기록되지 않음"이 있는가? [다시 하기]를 누르면 같은 카테고리가 **다른 순서**로 시작하는가? [처음으로]는 시작 화면으로 가는가?
6. 4개 카테고리를 각각 한 번씩 열어 10문제인지 확인한다. 문제·보기·해설에 오타나 깨진 글자가 없는가?
7. 문제를 무작위로 5개 골라 해설의 출처를 검색해 보고, 정답이 실제로 하나뿐인지 확인한다. "가장 ~한" 문항에는 기준·시점이 문제에 있는가?
8. F12 콘솔에 빨간 에러가 없는가?

---

### Task 1: 문제 데이터와 데이터 검증 테스트

**Files:**
- Create: `tests/tests.html`
- Create: `tests/data.test.js`
- Create: `questions.js`

**Interfaces:**
- Produces: `window.QUESTIONS` — `{ [category: string]: Array<{ question: string, choices: string[4], answer: 0|1|2|3, explanation: string }> }`. 키는 정확히 `한국사`, `세계지리`, `과학`, `예술과 문화`.
- Produces: 테스트 러너 전역 함수 `t(name, fn)`, `ok(cond, msg)`, `eq(a, b)`.

- [ ] **Step 1: 테스트 러너 만들기** — `tests/tests.html`

```html
<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>tests</title>
<style>body{font:14px monospace;padding:16px}.fail{color:#b00020}.pass{color:#1b7f3b}</style></head>
<body><h1>테스트</h1><pre id="out"></pre>
<script>
var results = [];
function t(name, fn) {
  try { fn(); results.push({ pass: true, text: "PASS " + name }); }
  catch (e) { results.push({ pass: false, text: "FAIL " + name + " — " + e.message }); }
}
function ok(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function eq(a, b) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(JSON.stringify(a) + " !== " + JSON.stringify(b));
}
</script>
<script src="../questions.js"></script>
<script src="../script.js"></script>
<script src="data.test.js"></script>
<script>
var failed = results.filter(function (r) { return !r.pass; }).length;
document.title = (failed ? "FAIL " + failed : "PASS") + " (" + results.length + ")";
document.getElementById("out").innerHTML = results.map(function (r) {
  return '<div class="' + (r.pass ? "pass" : "fail") + '">' + r.text + "</div>";
}).join("") + "<hr>" + (failed ? failed + "개 실패" : "전부 통과") + " / 총 " + results.length + "개";
</script>
</body></html>
```

- [ ] **Step 2: 실패하는 데이터 테스트 작성** — `tests/data.test.js`

```js
(function () {
  var CATS = ["한국사", "세계지리", "과학", "예술과 문화"];
  var SUPERLATIVE = /가장|최초|최대|최고|최소|제일/;
  var HAS_BASIS = /기준|현재|년\s*기준|따르면|알려진|일반적으로/;

  t("QUESTIONS에 카테고리 4개만 있다", function () {
    eq(Object.keys(window.QUESTIONS).sort(), CATS.slice().sort());
  });

  CATS.forEach(function (cat) {
    var list = (window.QUESTIONS || {})[cat] || [];
    t(cat + ": 10문항", function () { eq(list.length, 10); });
    t(cat + ": 질문 문장이 서로 다르다", function () {
      eq(new Set(list.map(function (q) { return q.question; })).size, list.length);
    });
    list.forEach(function (q, i) {
      var label = cat + " #" + (i + 1);
      t(label + " 형식", function () {
        ok(typeof q.question === "string" && q.question.length > 0, "question");
        ok(Array.isArray(q.choices) && q.choices.length === 4, "보기 4개");
        ok(new Set(q.choices).size === 4, "보기 중복");
        ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, "answer 범위");
      });
      t(label + " 해설 한 줄 + 출처", function () {
        ok(typeof q.explanation === "string" && q.explanation.length > 0, "해설 없음");
        ok(q.explanation.indexOf("\n") === -1, "해설은 한 줄");
        ok(/출처\s*:/.test(q.explanation), "해설에 '출처:' 없음");
      });
      t(label + " 최상급은 기준 명시(휴리스틱)", function () {
        if (SUPERLATIVE.test(q.question)) ok(HAS_BASIS.test(q.question), "최상급 문항에 기준/시점이 없어 보임");
      });
    });
  });
})();
```

- [ ] **Step 3: 실패 확인**

`tests/tests.html`을 브라우저로 연다. Expected: `questions.js`가 아직 없으므로 대부분 FAIL (제목 표시줄 `FAIL n`).

- [ ] **Step 4: 문항 40개 작성** — `questions.js`

형식(아래는 형식 예시이며 실제 출처는 작성할 때 해당 자료를 열어 확인한 뒤 기재한다):

```js
window.QUESTIONS = {
  "한국사": [
    {
      question: "훈민정음을 창제한 조선의 왕은?",
      choices: ["태종", "세종", "문종", "성종"],
      answer: 1,
      explanation: "세종이 1443년 훈민정음을 창제하고 1446년 반포했다. (출처: 국사편찬위원회 우리역사넷 '훈민정음' 항목, 확인일 2026-10-08)"
    }
    // …카테고리마다 10개
  ],
  "세계지리": [ /* 10개 */ ],
  "과학": [ /* 10개 */ ],
  "예술과 문화": [ /* 10개 */ ]
};
```

작성 규칙(PRD §8):
1. 오답 보기가 정답이 될 여지가 없는지 문항마다 검토한다.
2. 해설 끝에 `(출처: 기관/자료명, 확인일)`을 쓴다. 출처는 실제로 열어 확인한 자료만 쓴다. 확인하지 못했으면 그 문항을 바꾼다.
3. "가장 ~한/최초/최대" 표현을 쓰면 문제 안에 기준과 시점을 쓴다. (예: "2024년 기준 공식 통계로, 면적이 가장 넓은 나라는?") 가능하면 최상급 문항 자체를 피한다.
4. 보기 4개는 서로 달라야 하고, 정답 위치(`answer`)가 한쪽으로 치우치지 않게 분산한다.

- [ ] **Step 5: 통과 확인**

`tests/tests.html`을 새로고침한다. Expected: 전부 PASS. (최상급 검사는 휴리스틱이므로, 통과해도 문항을 눈으로 한 번 더 읽는다.)

- [ ] **Step 6: 커밋(선택)**

```bash
git add questions.js tests/
git commit -m "feat: add 40 questions and data validation tests"
```

---

### Task 2: 순수 로직(셔플·채점·한 판 진행)

**Files:**
- Create: `script.js` (순수 로직 부분만)
- Create: `tests/logic.test.js`
- Modify: `tests/tests.html` (`logic.test.js` 로드 추가)

**Interfaces:**
- Consumes: `window.QUESTIONS` (Task 1)
- Produces: `window.Quiz` =
  - `CATEGORIES: string[]`
  - `shuffle<T>(arr: T[], rng?: () => number): T[]` — 새 배열 반환, 원본 불변
  - `prepareQuestions(list, rng?): Question[]` — 문항 순서와 보기 순서를 섞고 `answer`를 다시 계산한 새 배열
  - `scoreFor(mode: string, correct: boolean, hintUsed: boolean): number`
  - `createGame(mode, category, questions): Game` — `{ mode, category, questions, index, score, answered, hintUsed, results }`
  - `currentQuestion(g): Question`
  - `submitAnswer(g, choice: number): Result | null` — `Result = { index, correct, points, choice, hintUsed, timedOut }`; 이미 답했으면 `null`
  - `nextQuestion(g): void` — 답한 뒤에만 `index`를 올림
  - `isFinished(g): boolean`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/logic.test.js`

```js
(function () {
  var Q = window.Quiz;
  function seeded(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function sample() {
    return [
      { question: "a", choices: ["1", "2", "3", "4"], answer: 1, explanation: "e (출처: x)" },
      { question: "b", choices: ["1", "2", "3", "4"], answer: 0, explanation: "e (출처: x)" }
    ];
  }
  function game() { return Q.createGame("practice", "과학", sample()); }

  t("shuffle: 원본은 그대로, 원소는 같다", function () {
    var src = [1, 2, 3, 4, 5], out = Q.shuffle(src, seeded(7));
    eq(src, [1, 2, 3, 4, 5]);
    eq(out.slice().sort(), [1, 2, 3, 4, 5]);
  });

  t("prepareQuestions: 섞어도 정답 텍스트가 유지된다(여러 시드)", function () {
    var src = window.QUESTIONS["과학"];
    for (var seed = 1; seed <= 50; seed++) {
      Q.prepareQuestions(src, seeded(seed)).forEach(function (p) {
        var orig = src.filter(function (o) { return o.question === p.question; })[0];
        eq(p.choices[p.answer], orig.choices[orig.answer]);
        eq(p.choices.slice().sort(), orig.choices.slice().sort());
      });
    }
  });

  t("prepareQuestions: 원본 데이터를 바꾸지 않는다", function () {
    var before = JSON.stringify(window.QUESTIONS);
    Q.prepareQuestions(window.QUESTIONS["한국사"], seeded(3));
    eq(JSON.stringify(window.QUESTIONS), before);
  });

  t("scoreFor: 연습 정답 1, 오답 0", function () {
    eq(Q.scoreFor("practice", true, false), 1);
    eq(Q.scoreFor("practice", false, false), 0);
  });

  t("submitAnswer: 정답이면 1점", function () {
    var g = game(), r = Q.submitAnswer(g, 1);
    eq(r.correct, true); eq(r.points, 1); eq(g.score, 1);
  });

  t("submitAnswer: 오답이면 0점", function () {
    var g = game(), r = Q.submitAnswer(g, 0);
    eq(r.correct, false); eq(g.score, 0);
  });

  t("submitAnswer: 같은 문항에 두 번 제출해도 점수는 한 번", function () {
    var g = game();
    Q.submitAnswer(g, 1);
    eq(Q.submitAnswer(g, 1), null);
    eq(Q.submitAnswer(g, 0), null);
    eq(g.score, 1); eq(g.results.length, 1);
  });

  t("nextQuestion: 답하기 전에는 넘어가지 않는다", function () {
    var g = game();
    Q.nextQuestion(g);
    eq(g.index, 0);
  });

  t("끝까지 진행하면 isFinished", function () {
    var g = game();
    Q.submitAnswer(g, 1); Q.nextQuestion(g); eq(Q.isFinished(g), false);
    Q.submitAnswer(g, 0); Q.nextQuestion(g); eq(Q.isFinished(g), true);
    eq(g.score, 2);
  });
})();
```

`tests/tests.html`의 `data.test.js` 줄 아래에 추가:

```html
<script src="logic.test.js"></script>
```

- [ ] **Step 2: 실패 확인** — `tests/tests.html` 새로고침. Expected: `Quiz`가 없어 `logic` 테스트가 FAIL(TypeError).

- [ ] **Step 3: 최소 구현** — `script.js`

```js
(function () {
  "use strict";

  var CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];

  /* ===== 순수 로직 (DOM 사용 금지) ===== */

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function prepareQuestions(list, rng) {
    return shuffle(list, rng).map(function (q) {
      var order = shuffle(q.choices.map(function (_, i) { return i; }), rng);
      return {
        question: q.question,
        choices: order.map(function (i) { return q.choices[i]; }),
        answer: order.indexOf(q.answer),
        explanation: q.explanation
      };
    });
  }

  function scoreFor(mode, correct, hintUsed) {
    return correct ? 1 : 0;
  }

  function createGame(mode, category, questions) {
    return { mode: mode, category: category, questions: questions, index: 0, score: 0,
             answered: false, hintUsed: false, results: [] };
  }

  function currentQuestion(g) { return g.questions[g.index]; }

  function submitAnswer(g, choice) {
    if (g.answered || isFinished(g)) return null;
    var q = currentQuestion(g);
    var correct = choice === q.answer;
    var points = scoreFor(g.mode, correct, g.hintUsed);
    var r = { index: g.index, correct: correct, points: points, choice: choice,
              hintUsed: g.hintUsed, timedOut: false };
    g.score += points;
    g.answered = true;
    g.results.push(r);
    return r;
  }

  function nextQuestion(g) {
    if (!g.answered) return;
    g.index += 1;
    g.answered = false;
    g.hintUsed = false;
  }

  function isFinished(g) { return g.index >= g.questions.length; }

  window.Quiz = {
    CATEGORIES: CATEGORIES, shuffle: shuffle, prepareQuestions: prepareQuestions,
    scoreFor: scoreFor, createGame: createGame, currentQuestion: currentQuestion,
    submitAnswer: submitAnswer, nextQuestion: nextQuestion, isFinished: isFinished
  };

  /* ===== 화면 (Task 3에서 추가) ===== */
})();
```

- [ ] **Step 4: 통과 확인** — `tests/tests.html` 새로고침. Expected: 전부 PASS.

- [ ] **Step 5: 커밋(선택)**

```bash
git add script.js tests/
git commit -m "feat: add game logic with tests"
```

---

### Task 3: 연습 모드 화면

**Files:**
- Create: `index.html`
- Create: `style.css`
- Modify: `script.js` — "화면" 구역 추가 (IIFE 안, `window.Quiz = …` 다음)

**Interfaces:**
- Consumes: `window.QUESTIONS`, Task 2의 `Quiz` 함수 전부
- Produces: 화면 함수 `showStart()`, `startGame(category)`, `showQuestion()`, `onChoose(i)`, `onNext()`, `showResult()`. 클릭은 `data-action` 속성으로 `document` 한 곳에서 처리한다.

- [ ] **Step 1: `index.html`**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>상식 퀴즈</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main id="app"></main>
  <script src="questions.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css`**

```css
:root { --bg:#f6f7fb; --fg:#1d2433; --card:#fff; --line:#d5d9e4; --ok:#1b7f3b; --bad:#b00020; --accent:#2f5bea; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 system-ui, "Malgun Gothic", sans-serif; }
#app { max-width:640px; margin:0 auto; padding:24px 16px 64px; }
h1 { margin:8px 0 4px; } h2 { margin:12px 0 16px; font-size:1.25rem; }
.notice { display:inline-block; margin:0 0 16px; padding:2px 10px; border-radius:999px; background:#eef1fb; color:#44507a; font-size:.9rem; }
.progress { color:#5b6478; margin:0; }
.cats, .choices { display:grid; gap:10px; }
button { font:inherit; padding:12px 14px; border:1px solid var(--line); border-radius:10px; background:var(--card); color:inherit; text-align:left; cursor:pointer; }
button:hover:not(:disabled) { border-color:var(--accent); }
button:disabled { cursor:default; opacity:.85; }
.choice.correct { border-color:var(--ok); background:#e7f6ec; }
.choice.wrong { border-color:var(--bad); background:#fdeaed; }
#feedback { margin-top:16px; } #feedback .ok { color:var(--ok); font-weight:700; } #feedback .bad { color:var(--bad); font-weight:700; }
.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.row { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
.score { font-size:2rem; font-weight:700; margin:8px 0; }
```

- [ ] **Step 3: 화면 코드 추가** — `script.js`의 `/* ===== 화면 (Task 3에서 추가) ===== */` 자리를 아래로 교체

```js
  /* ===== 화면 ===== */

  if (!document.getElementById("app")) return; // 테스트 페이지에서는 화면을 만들지 않는다

  var game = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function show(html) { document.getElementById("app").innerHTML = html; }

  function showStart() {
    game = null;
    show(
      '<h1>상식 퀴즈</h1>' +
      '<p class="notice">연습 모드 · 순위표에 기록되지 않음</p>' +
      '<div class="cats">' + CATEGORIES.map(function (c) {
        return '<button data-action="start" data-category="' + esc(c) + '">' + esc(c) + '</button>';
      }).join("") + '</div>'
    );
  }

  function startGame(category) {
    game = Quiz.createGame("practice", category, Quiz.prepareQuestions(window.QUESTIONS[category]));
    showQuestion();
  }

  function showQuestion() {
    var q = Quiz.currentQuestion(game);
    show(
      '<p class="progress">' + esc(game.category) + ' · ' + (game.index + 1) + ' / ' + game.questions.length +
      ' · 점수 <span id="score">' + game.score + '</span></p>' +
      '<h2>' + esc(q.question) + '</h2>' +
      '<div class="choices">' + q.choices.map(function (c, i) {
        return '<button class="choice" data-action="choose" data-index="' + i + '">' + esc(c) + '</button>';
      }).join("") + '</div>' +
      '<div id="feedback" aria-live="polite"></div>'
    );
  }

  function onChoose(i) {
    var r = Quiz.submitAnswer(game, i);
    if (!r) return;
    var q = Quiz.currentQuestion(game);
    document.querySelectorAll(".choice").forEach(function (b, idx) {
      b.disabled = true;
      if (idx === q.answer) b.classList.add("correct");
      else if (idx === i) b.classList.add("wrong");
    });
    document.getElementById("score").textContent = game.score;
    var last = game.index === game.questions.length - 1;
    document.getElementById("feedback").innerHTML =
      '<p class="' + (r.correct ? "ok" : "bad") + '">' + (r.correct ? "정답!" : "오답") + '</p>' +
      '<p>' + esc(q.explanation) + '</p>' +
      '<button class="primary" data-action="next">' + (last ? "결과 보기" : "다음") + '</button>';
  }

  function onNext() {
    Quiz.nextQuestion(game);
    if (Quiz.isFinished(game)) showResult(); else showQuestion();
  }

  function showResult() {
    show(
      '<h1>결과</h1><p class="progress">' + esc(game.category) + '</p>' +
      '<p class="score">점수: ' + game.score + ' / ' + game.questions.length + '</p>' +
      '<p class="notice">순위표에 기록되지 않음</p>' +
      '<div class="row">' +
      '<button class="primary" data-action="start" data-category="' + esc(game.category) + '">다시 하기</button>' +
      '<button data-action="home">처음으로</button></div>'
    );
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var a = el.dataset.action;
    if (a === "start") startGame(el.dataset.category);
    else if (a === "choose") onChoose(Number(el.dataset.index));
    else if (a === "next") onNext();
    else if (a === "home") showStart();
  });

  showStart();
```

- [ ] **Step 4: 테스트 재확인** — `tests/tests.html`을 새로고침한다. Expected: 여전히 전부 PASS. (화면 코드가 `#app`이 없을 때 조용히 빠져나오는지 확인)

- [ ] **Step 5: 위의 "직접 확인할 항목" 1~8번을 수행한다.** 실패한 항목이 있으면 고친 뒤 다시 확인한다.

- [ ] **Step 6: 커밋(선택)**

```bash
git add index.html style.css script.js
git commit -m "feat: practice mode UI (stage 1)"
```

---

# 2단계: 스피드 모드, 힌트 모드, 모드 선택 화면, 틀린 문제 다시 풀기

## 만들 것
- 순수 로직: 힌트 채점(0.5점), 시간 초과 처리, 힌트로 보기 2개 제거, 카운트다운 타이머, 틀린 문항 추출과 다시 풀기 판 만들기
- 화면: 모드 선택 → 카테고리 선택, 스피드의 15초 타이머 표시, 힌트 버튼, 결과 화면의 [틀린 문제 다시 풀기]
- 아직 없는 것: 점수 저장과 순위표

## 완료 기준
- `tests/tests.html` 전부 PASS (새 테스트 포함).
- 스피드: 15초가 지나면 오답 처리되고 정답·해설이 나온다. 해설 중에는 시간이 멈추고, [다음] 후 15초부터 다시 센다.
- 힌트: 문항당 1번 누를 수 있고 오답 2개가 사라진다. 힌트 쓰고 정답이면 0.5점, 안 쓰고 정답이면 1점, 오답이면 0점.
- 연습: 결과에서 틀린 문항만 다시 풀 수 있고, 원래 점수는 바뀌지 않는다. 틀린 게 없으면 버튼이 없다.
- 연습 선택 화면과 연습 결과에 "순위표에 기록되지 않음"이 계속 보인다.

## 직접 확인할 항목 (브라우저)
1. 첫 화면이 모드 선택(연습/스피드/힌트)인가? 연습 카드에 "순위표에 기록되지 않음"이 있는가? 모드를 고르면 카테고리 선택으로 가고, [뒤로]로 돌아올 수 있는가?
2. **스피드**: 문제가 뜨면 `15초`부터 줄어드는가? 가만히 두면 0초에서 자동으로 "오답(시간 초과)"과 정답·해설이 나오는가? 점수는 오르지 않는가?
3. 스피드에서 보기를 눌러 해설이 나온 상태로 10초 이상 기다린다 → 숫자가 멈춰 있는가? [다음]을 누르면 `15초`부터 다시 시작하는가?
4. 스피드에서 답을 누른 직후와 [다음] 직후에 이상한 중복 이벤트(두 번 오답 처리, 점수 변화)가 없는가? 결과 화면으로 간 뒤에도 숫자가 계속 줄지 않는가?
5. **힌트**: [힌트] 버튼을 누르면 오답 보기 2개가 사라지고 버튼이 비활성화되는가? 남은 두 보기 안에 정답이 있는가? 문제를 여러 번 반복해 봐도 정답이 사라진 적이 없는가?
6. 힌트를 쓰고 정답 → +0.5점, 힌트 없이 정답 → +1점, 오답 → +0점인가? 결과 점수가 합계와 같은가(예: `6.5 / 10`)? 다음 문제에서 힌트 버튼이 다시 활성화되는가?
7. 보기를 이미 누른 뒤(해설이 나온 상태)에는 힌트 버튼이 비활성인가?
8. **연습 다시 풀기**: 일부러 3문제를 틀리고 결과로 간다 → [틀린 문제 다시 풀기 (3)]이 보이는가? 누르면 틀린 3문제만, 보기 순서가 바뀐 채 나오는가? 끝나면 "n / 3 맞힘"이 나오고 **원래 점수(예: 7 / 10)는 바뀌지 않는가**? 또 틀리면 남은 문항만 다시 풀 수 있는가? 모두 맞히면 버튼이 사라지는가?
9. 10문제를 모두 맞힌 연습 결과에는 [틀린 문제 다시 풀기]가 없는가?
10. 스피드/힌트 결과에는 [틀린 문제 다시 풀기]가 없고(연습 전용), "순위표에 기록되지 않음" 문구도 없는가?

---

### Task 4: 모드 로직(힌트·시간 초과·다시 풀기·카운트다운)

**Files:**
- Modify: `script.js` (순수 로직 구역)
- Create: 테스트는 `tests/logic.test.js`에 추가

**Interfaces:**
- Consumes: Task 2의 `Game`, `scoreFor`, `submitAnswer`, `nextQuestion`, `shuffle`, `prepareQuestions`
- Produces (모두 `window.Quiz`에 추가):
  - `scoreFor("hint", true, true) === 0.5`
  - `Game.hidden: number[]` — 현재 문항에서 지워진 보기 인덱스(새 문항마다 `[]`)
  - `submitTimeout(g): Result | null` — `{ correct:false, points:0, choice:null, timedOut:true }`, 이미 답했으면 `null`
  - `useHint(g, rng?): number[] | null` — 힌트 모드·미답·미사용일 때만 지울 인덱스 2개 반환
  - `wrongQuestions(g): Question[]`
  - `createRetry(g, rng?): Game` — `mode:"practice"`, `isRetry:true`, 틀린 문항만 보기를 다시 섞어 구성
  - `createCountdown(seconds, onTick(left:number), onExpire(), now?: () => number): { start, stop, tick }`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/logic.test.js`의 마지막 `})();` 바로 위에 추가

```js
  /* ---- 2단계 ---- */
  function hintGame() { return Q.createGame("hint", "과학", sample()); }

  t("scoreFor: 힌트 모드 점수표", function () {
    eq(Q.scoreFor("hint", true, false), 1);
    eq(Q.scoreFor("hint", true, true), 0.5);
    eq(Q.scoreFor("hint", false, true), 0);
    eq(Q.scoreFor("hint", false, false), 0);
    eq(Q.scoreFor("speed", true, false), 1);
    eq(Q.scoreFor("speed", false, false), 0);
  });

  t("submitTimeout: 오답 0점, timedOut 표시", function () {
    var g = Q.createGame("speed", "과학", sample()), r = Q.submitTimeout(g);
    eq(r.correct, false); eq(r.points, 0); eq(r.timedOut, true); eq(r.choice, null);
    eq(g.score, 0); eq(g.answered, true);
  });

  t("submitTimeout: 이미 답했으면 무시(점수·기록 불변)", function () {
    var g = Q.createGame("speed", "과학", sample());
    Q.submitAnswer(g, 1);
    eq(Q.submitTimeout(g), null);
    eq(g.score, 1); eq(g.results.length, 1);
  });

  t("submitAnswer: 시간 초과 후 늦게 누른 답은 무시", function () {
    var g = Q.createGame("speed", "과학", sample());
    Q.submitTimeout(g);
    eq(Q.submitAnswer(g, 1), null);
    eq(g.score, 0);
  });

  t("useHint: 오답 2개만 지우고 정답은 지우지 않는다(여러 시드)", function () {
    for (var seed = 1; seed <= 200; seed++) {
      var g = hintGame(), h = Q.useHint(g, seeded(seed));
      eq(h.length, 2); ok(new Set(h).size === 2, "중복");
      ok(h.indexOf(Q.currentQuestion(g).answer) === -1, "정답을 지움");
      eq(g.hidden, h); eq(g.hintUsed, true);
    }
  });

  t("useHint: 한 문항에 한 번만", function () {
    var g = hintGame();
    ok(Q.useHint(g) !== null);
    eq(Q.useHint(g), null);
  });

  t("useHint: 답한 뒤에는 쓸 수 없다", function () {
    var g = hintGame();
    Q.submitAnswer(g, 1);
    eq(Q.useHint(g), null);
  });

  t("useHint: 힌트 모드가 아니면 쓸 수 없다", function () {
    eq(Q.useHint(game()), null);
    eq(Q.useHint(Q.createGame("speed", "과학", sample())), null);
  });

  t("submitAnswer: 지워진 보기는 선택할 수 없다", function () {
    var g = hintGame(), h = Q.useHint(g);
    eq(Q.submitAnswer(g, h[0]), null);
    eq(g.answered, false); eq(g.score, 0);
  });

  t("힌트 모드: 힌트 쓰고 정답 0.5점, 다음 문항에서 힌트 상태 초기화", function () {
    var g = hintGame();
    Q.useHint(g, seeded(5));
    var r = Q.submitAnswer(g, 1);
    eq(r.points, 0.5); eq(r.hintUsed, true); eq(g.score, 0.5);
    Q.nextQuestion(g);
    eq(g.hintUsed, false); eq(g.hidden, []);
    var r2 = Q.submitAnswer(g, 0);
    eq(r2.points, 1); eq(g.score, 1.5);
  });

  t("wrongQuestions: 틀린 문항(시간 초과 포함)만", function () {
    var g = Q.createGame("practice", "과학", sample());
    Q.submitAnswer(g, 0); Q.nextQuestion(g);   // 오답
    Q.submitAnswer(g, 0); Q.nextQuestion(g);   // 정답
    eq(Q.wrongQuestions(g).map(function (q) { return q.question; }), ["a"]);
    var s = Q.createGame("speed", "과학", sample());
    Q.submitTimeout(s);
    eq(Q.wrongQuestions(s).length, 1);
  });

  t("createRetry: 연습 모드, 틀린 문항만, 점수 0에서 시작, 정답 인덱스 유효", function () {
    var g = Q.createGame("practice", "과학", sample());
    Q.submitAnswer(g, 0); Q.nextQuestion(g);
    Q.submitAnswer(g, 0); Q.nextQuestion(g);
    var r = Q.createRetry(g, seeded(9));
    eq(r.mode, "practice"); eq(r.isRetry, true); eq(r.score, 0);
    eq(r.questions.length, 1); eq(r.questions[0].choices[r.questions[0].answer], "2");
    eq(g.score, 1); // 원래 판은 그대로
  });

  t("createCountdown: 만료 시 onExpire 1회, onTick 남은 초", function () {
    var now = 0, expired = 0, left = null;
    var c = Q.createCountdown(15, function (l) { left = l; }, function () { expired++; }, function () { return now; });
    c.start(); eq(left, 15);
    now = 14000; c.tick(); eq(left, 1); eq(expired, 0);
    now = 15000; c.tick(); eq(left, 0); eq(expired, 1);
    now = 16000; c.tick(); eq(expired, 1);
    c.stop();
  });

  t("createCountdown: stop 이후에는 tick을 무시한다", function () {
    var now = 0, expired = 0;
    var c = Q.createCountdown(15, function () {}, function () { expired++; }, function () { return now; });
    c.start(); c.stop();
    now = 20000; c.tick();
    eq(expired, 0);
  });

  t("createCountdown: 다시 start하면 15초부터", function () {
    var now = 0, left = null;
    var c = Q.createCountdown(15, function (l) { left = l; }, function () {}, function () { return now; });
    c.start(); now = 10000; c.tick(); eq(left, 5);
    c.start(); eq(left, 15);
    c.stop();
  });
```

- [ ] **Step 2: 실패 확인** — `tests/tests.html` 새로고침. Expected: 새 테스트들이 FAIL(`Q.submitTimeout is not a function` 등).

- [ ] **Step 3: 구현** — `script.js` 순수 로직 구역을 아래대로 수정

`scoreFor`를 교체:

```js
  function scoreFor(mode, correct, hintUsed) {
    if (!correct) return 0;
    if (mode === "hint" && hintUsed) return 0.5;
    return 1;
  }
```

`createGame`의 객체에 `hidden: []` 추가:

```js
  function createGame(mode, category, questions) {
    return { mode: mode, category: category, questions: questions, index: 0, score: 0,
             answered: false, hintUsed: false, hidden: [], results: [] };
  }
```

`submitAnswer`를 교체(지워진 보기 거부, 공통 기록 함수 사용):

```js
  function record(g, choice, correct, timedOut) {
    var points = scoreFor(g.mode, correct, g.hintUsed);
    var r = { index: g.index, correct: correct, points: points, choice: choice,
              hintUsed: g.hintUsed, timedOut: timedOut };
    g.score += points;
    g.answered = true;
    g.results.push(r);
    return r;
  }

  function submitAnswer(g, choice) {
    if (g.answered || isFinished(g)) return null;
    if (g.hidden.indexOf(choice) !== -1) return null;
    return record(g, choice, choice === currentQuestion(g).answer, false);
  }

  function submitTimeout(g) {
    if (g.answered || isFinished(g)) return null;
    return record(g, null, false, true);
  }
```

`nextQuestion`에서 `g.hidden = [];` 추가:

```js
  function nextQuestion(g) {
    if (!g.answered) return;
    g.index += 1;
    g.answered = false;
    g.hintUsed = false;
    g.hidden = [];
  }
```

`isFinished` 아래에 추가:

```js
  function useHint(g, rng) {
    if (g.mode !== "hint" || g.answered || g.hintUsed || isFinished(g)) return null;
    var q = currentQuestion(g);
    var wrong = q.choices.map(function (_, i) { return i; }).filter(function (i) { return i !== q.answer; });
    g.hidden = shuffle(wrong, rng).slice(0, 2);
    g.hintUsed = true;
    return g.hidden.slice();
  }

  function wrongQuestions(g) {
    return g.results.filter(function (r) { return !r.correct; })
                    .map(function (r) { return g.questions[r.index]; });
  }

  function createRetry(g, rng) {
    var r = createGame("practice", g.category, prepareQuestions(wrongQuestions(g), rng));
    r.isRetry = true;
    return r;
  }

  function createCountdown(seconds, onTick, onExpire, now) {
    now = now || Date.now;
    var deadline = 0, handle = null, fired = false;
    function stop() { if (handle !== null) { clearInterval(handle); handle = null; } }
    function tick() {
      if (handle === null) return;
      var left = Math.max(0, Math.ceil((deadline - now()) / 1000));
      onTick(left);
      if (left === 0 && !fired) { fired = true; stop(); onExpire(); }
    }
    function start() {
      stop(); fired = false;
      deadline = now() + seconds * 1000;
      handle = setInterval(tick, 200);
      tick();
    }
    return { start: start, stop: stop, tick: tick };
  }
```

`window.Quiz = {…}`에 `submitTimeout, useHint, wrongQuestions, createRetry, createCountdown`을 추가한다.

- [ ] **Step 4: 통과 확인** — `tests/tests.html` 새로고침. Expected: 전부 PASS (1단계 테스트 포함).

- [ ] **Step 5: 커밋(선택)**

```bash
git add script.js tests/
git commit -m "feat: speed/hint/retry logic with tests"
```

---

### Task 5: 모드 선택·타이머·힌트·다시 풀기 화면

**Files:**
- Modify: `script.js` (화면 구역)
- Modify: `style.css`

**Interfaces:**
- Consumes: Task 4의 `Quiz.*` 전부
- Produces: 화면 함수 `showModes()`, `showCategories(mode)`, 확장된 `startGame(mode, category)`, `showQuestion()`, `reveal(r)`, `onHint()`, `onRetry()`, `showResult()`. 타이머 변수 `timer`와 `stopTimer()`.

- [ ] **Step 1: 화면 코드 수정** — `script.js` 화면 구역

상수와 모드 정보를 `var game = null;` 아래에 추가:

```js
  var MODES = [
    { id: "practice", name: "연습", desc: "시간 제한·힌트 없음", note: "순위표에 기록되지 않음" },
    { id: "speed", name: "스피드", desc: "문항마다 15초, 시간이 지나면 오답" },
    { id: "hint", name: "힌트", desc: "문항마다 힌트 1번, 힌트 쓰고 맞히면 0.5점" }
  ];
  var SPEED_SECONDS = 15;
  var timer = null;

  function stopTimer() { if (timer) { timer.stop(); timer = null; } }
  function modeName(id) { return MODES.filter(function (m) { return m.id === id; })[0].name; }
```

`showStart`, `startGame`을 아래로 교체하고 `showModes`, `showCategories`를 추가:

```js
  function showModes() {
    stopTimer(); game = null;
    show(
      '<h1>상식 퀴즈</h1><div class="cats">' + MODES.map(function (m) {
        return '<button data-action="mode" data-mode="' + m.id + '"><strong>' + esc(m.name) + '</strong><br>' +
               esc(m.desc) + (m.note ? '<br><span class="notice">' + esc(m.note) + '</span>' : '') + '</button>';
      }).join("") + '</div>'
    );
  }

  function showCategories(mode) {
    show(
      '<h1>' + esc(modeName(mode)) + ' 모드</h1>' +
      (mode === "practice" ? '<p class="notice">순위표에 기록되지 않음</p>' : '') +
      '<div class="cats">' + CATEGORIES.map(function (c) {
        return '<button data-action="start" data-mode="' + mode + '" data-category="' + esc(c) + '">' + esc(c) + '</button>';
      }).join("") + '</div>' +
      '<div class="row"><button data-action="home">뒤로</button></div>'
    );
  }

  function startGame(mode, category) {
    game = Quiz.createGame(mode, category, Quiz.prepareQuestions(window.QUESTIONS[category]));
    showQuestion();
  }
```

`showQuestion`, `onChoose`, `onNext`을 아래로 교체(`reveal`, `onTimeout`, `onHint` 추가):

```js
  function showQuestion() {
    stopTimer();
    var q = Quiz.currentQuestion(game);
    show(
      '<p class="progress">' + esc(modeName(game.mode)) + (game.isRetry ? ' (다시 풀기)' : '') + ' · ' + esc(game.category) +
      ' · ' + (game.index + 1) + ' / ' + game.questions.length +
      (game.isRetry ? '' : ' · 점수 <span id="score">' + game.score + '</span>') +
      (game.mode === "speed" ? ' · <span id="timer">' + SPEED_SECONDS + '초</span>' : '') + '</p>' +
      '<h2>' + esc(q.question) + '</h2>' +
      '<div class="choices">' + q.choices.map(function (c, i) {
        return '<button class="choice" data-action="choose" data-index="' + i + '">' + esc(c) + '</button>';
      }).join("") + '</div>' +
      (game.mode === "hint" ? '<div class="row"><button id="hint-btn" data-action="hint">힌트 (오답 2개 지우기)</button></div>' : '') +
      '<div id="feedback" aria-live="polite"></div>'
    );
    if (game.mode === "speed") {
      timer = Quiz.createCountdown(SPEED_SECONDS, function (left) {
        var el = document.getElementById("timer");
        if (el) el.textContent = left + "초";
      }, onTimeout);
      timer.start();
    }
  }

  function onHint() {
    var hidden = Quiz.useHint(game);
    if (!hidden) return;
    var buttons = document.querySelectorAll(".choice");
    hidden.forEach(function (i) { buttons[i].hidden = true; });
    document.getElementById("hint-btn").disabled = true;
  }

  function onChoose(i) {
    stopTimer();
    var r = Quiz.submitAnswer(game, i);
    if (r) reveal(r);
  }

  function onTimeout() {
    stopTimer();
    var r = Quiz.submitTimeout(game);
    if (r) reveal(r);
  }

  function reveal(r) {
    stopTimer();
    var q = Quiz.currentQuestion(game);
    document.querySelectorAll(".choice").forEach(function (b, idx) {
      b.disabled = true;
      if (idx === q.answer) { b.hidden = false; b.classList.add("correct"); }
      else if (idx === r.choice) b.classList.add("wrong");
    });
    var hb = document.getElementById("hint-btn");
    if (hb) hb.disabled = true;
    var sc = document.getElementById("score");
    if (sc) sc.textContent = game.score;
    var last = game.index === game.questions.length - 1;
    document.getElementById("feedback").innerHTML =
      '<p class="' + (r.correct ? "ok" : "bad") + '">' +
      (r.timedOut ? "시간 초과 (오답)" : r.correct ? "정답!" : "오답") +
      (game.isRetry ? '' : ' · +' + r.points + '점') + '</p>' +
      '<p>' + esc(q.explanation) + '</p>' +
      '<button class="primary" data-action="next">' + (last ? "결과 보기" : "다음") + '</button>';
  }

  function onNext() {
    Quiz.nextQuestion(game);
    if (Quiz.isFinished(game)) showResult(); else showQuestion();
  }
```

`showResult`와 `onRetry`를 아래로 교체:

```js
  function showResult() {
    stopTimer();
    var total = game.questions.length;
    var wrong = Quiz.wrongQuestions(game).length;
    var head = game.isRetry
      ? '<p class="score">다시 풀기: ' + (total - wrong) + ' / ' + total + ' 맞힘</p>'
      : '<p class="score">점수: ' + game.score + ' / ' + total + '</p>';
    show(
      '<h1>' + (game.isRetry ? '다시 풀기 결과' : '결과') + '</h1>' +
      '<p class="progress">' + esc(modeName(game.mode)) + ' · ' + esc(game.category) + '</p>' + head +
      (game.mode === "practice" ? '<p class="notice">순위표에 기록되지 않음</p>' : '') +
      (game.mode === "practice" && wrong === 0 && game.isRetry ? '<p>모두 맞혔어요!</p>' : '') +
      '<div class="row">' +
      (game.mode === "practice" && wrong > 0
        ? '<button class="primary" data-action="retry">틀린 문제 다시 풀기 (' + wrong + ')</button>' : '') +
      '<button data-action="start" data-mode="' + game.mode + '" data-category="' + esc(game.category) + '">새로 하기</button>' +
      '<button data-action="home">처음으로</button></div>'
    );
  }

  function onRetry() {
    if (Quiz.wrongQuestions(game).length === 0) return;
    game = Quiz.createRetry(game);
    showQuestion();
  }
```

클릭 핸들러와 마지막 줄을 교체:

```js
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var a = el.dataset.action;
    if (a === "mode") showCategories(el.dataset.mode);
    else if (a === "start") startGame(el.dataset.mode, el.dataset.category);
    else if (a === "choose") onChoose(Number(el.dataset.index));
    else if (a === "hint") onHint();
    else if (a === "next") onNext();
    else if (a === "retry") onRetry();
    else if (a === "home") showModes();
  });

  showModes();
```

(1단계의 `showStart`는 `showModes`로 대체되므로 삭제한다.)

- [ ] **Step 2: 스타일 추가** — `style.css` 끝에

```css
.choice[hidden] { display:none; }
#timer { font-weight:700; color:var(--bad); }
.cats .notice { margin:6px 0 0; }
```

- [ ] **Step 3: 테스트 재확인** — `tests/tests.html` 새로고침. Expected: 전부 PASS.

- [ ] **Step 4: "2단계 직접 확인할 항목" 1~10번을 수행한다.** 실패한 항목은 고친 뒤 다시 확인한다.

- [ ] **Step 5: 커밋(선택)**

```bash
git add script.js style.css
git commit -m "feat: mode select, speed timer, hint, retry UI (stage 2)"
```

---

# 3단계: 점수 저장과 순위표 (localStorage)

## 만들 것
- 순수 로직: 순위표 읽기/쓰기(주입 가능한 storage), 정렬·상위 10개·동점 처리, 깨진 데이터와 저장 불가 대응
- 화면: 스피드/힌트 결과에서 자동 저장 후 순위 표시, 순위표 화면(모드×카테고리 선택)

## 완료 기준
- `tests/tests.html` 전부 PASS (storage 테스트 포함).
- 스피드·힌트 한 판이 끝나면 점수와 날짜가 해당 모드×카테고리 순위표에 저장되고, 결과에 순위가 나온다.
- 연습은 저장되지 않는다(순위표에 나타나지 않고 localStorage에도 쓰지 않는다).
- 새로고침·브라우저 재시작 후에도 순위표가 남아 있다.
- 순위표는 점수 높은 순, 동점이면 먼저 기록한 것이 위, 순위표마다 최대 10개.
- localStorage를 쓸 수 없거나 값이 깨져 있어도 게임은 정상 동작한다.

## 직접 확인할 항목 (브라우저)
1. 모드 선택 화면에 [순위표] 버튼이 있는가? 아직 기록이 없을 때 "아직 기록이 없습니다"가 나오는가?
2. 스피드 모드로 "과학"을 한 판 끝낸다 → 결과에 `순위: 1위`가 나오는가? [순위표]에서 스피드 × 과학을 고르면 방금 점수와 오늘 날짜가 보이는가?
3. 같은 방식으로 한 판 더 한다 → 점수가 더 높으면 1위, 낮으면 2위로 정렬되는가? 같은 점수면 먼저 한 쪽이 위인가?
4. 스피드 × 한국사, 힌트 × 과학 순위표를 열어 본다 → **비어 있는가**(모드·카테고리별로 따로 저장)?
5. 힌트 모드 한 판 후 점수가 `0.5` 단위로 표시되고 정렬이 맞는가?
6. **연습** 한 판을 끝낸다 → 결과에 순위 문구가 없고 "순위표에 기록되지 않음"이 있는가? 순위표 어디에도 연습 항목이 없는가?
7. 새로고침(F5) 후에도 순위표가 그대로인가? 판 도중에 새로고침하면 그 판은 기록되지 않는가?
8. 같은 순위표에 11판 이상 쌓으면 10개까지만 보이는가? 10위 안에 못 드는 점수는 결과에 "순위권 밖"으로 나오는가?
9. F12 → Application → Local Storage에서 `quiz.leaderboard.v1` 값을 `abc`처럼 깨뜨린 뒤 새로고침 → 게임이 정상 동작하고 순위표가 빈 것으로 보이며, 한 판 끝내면 다시 정상 저장되는가?
10. (선택) 브라우저 설정에서 사이트 데이터 차단 또는 시크릿 창으로 열기 → 게임은 되고, 결과에 "순위표를 저장하지 못했습니다" 같은 안내가 나오는가?

---

### Task 6: 순위표 저장 로직

**Files:**
- Modify: `script.js` (순수 로직 구역)
- Create: `tests/storage.test.js`
- Modify: `tests/tests.html` (`storage.test.js` 로드 추가)

**Interfaces:**
- Consumes: 없음(독립). 
- Produces (`window.Quiz`에 추가):
  - `BOARD_KEY = "quiz.leaderboard.v1"`, `BOARD_LIMIT = 10`
  - `getStorage(): Storage | null` — `window.localStorage` 접근이 예외를 던지면 `null`
  - `getBoard(storage, mode, category): Array<{ score: number, date: string }>` — 점수 내림차순(동점이면 날짜 오름차순), 깨진 데이터는 `[]`
  - `addScore(storage, mode, category, score, dateIso): null | { rank: number | null, saved: boolean }` — 연습이면 `null`(아무것도 쓰지 않음); `rank`는 1부터, 10위 밖이면 `null`; 저장 실패나 `storage === null`이면 `saved:false`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/storage.test.js`

```js
(function () {
  var Q = window.Quiz;
  function fake(init) {
    var m = {}; for (var k in (init || {})) m[k] = init[k];
    return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = v; }, _m: m };
  }
  function d(n) { return "2026-10-" + (n < 10 ? "0" : "") + n + "T00:00:00.000Z"; }

  t("연습은 기록하지 않고 저장소에 쓰지도 않는다", function () {
    var s = fake();
    eq(Q.addScore(s, "practice", "과학", 10, d(1)), null);
    eq(Object.keys(s._m), []);
  });

  t("스피드 기록이 저장되고 1위가 된다", function () {
    var s = fake(), r = Q.addScore(s, "speed", "과학", 7, d(1));
    eq(r, { rank: 1, saved: true });
    eq(Q.getBoard(s, "speed", "과학"), [{ score: 7, date: d(1) }]);
  });

  t("점수 높은 순으로 정렬된다", function () {
    var s = fake();
    Q.addScore(s, "hint", "과학", 5, d(1));
    var r = Q.addScore(s, "hint", "과학", 8.5, d(2));
    eq(r.rank, 1);
    eq(Q.getBoard(s, "hint", "과학").map(function (e) { return e.score; }), [8.5, 5]);
  });

  t("동점이면 먼저 기록한 것이 위", function () {
    var s = fake();
    Q.addScore(s, "speed", "과학", 6, d(1));
    var r = Q.addScore(s, "speed", "과학", 6, d(2));
    eq(r.rank, 2);
    eq(Q.getBoard(s, "speed", "과학").map(function (e) { return e.date; }), [d(1), d(2)]);
  });

  t("모드×카테고리별로 따로 저장된다", function () {
    var s = fake();
    Q.addScore(s, "speed", "과학", 9, d(1));
    eq(Q.getBoard(s, "speed", "한국사"), []);
    eq(Q.getBoard(s, "hint", "과학"), []);
    eq(Q.getBoard(s, "speed", "과학").length, 1);
  });

  t("상위 10개만 남기고, 11위 점수는 rank null", function () {
    var s = fake();
    for (var i = 1; i <= 10; i++) Q.addScore(s, "speed", "과학", 5 + i * 0.5, d(i)); // 5.5 ~ 10
    var low = Q.addScore(s, "speed", "과학", 1, d(11));
    eq(low.rank, null); eq(low.saved, true);
    eq(Q.getBoard(s, "speed", "과학").length, 10);
    var top = Q.addScore(s, "speed", "과학", 10, d(12));
    eq(top.rank, 2); // 먼저 기록된 10점 아래
    eq(Q.getBoard(s, "speed", "과학").length, 10);
    eq(Q.getBoard(s, "speed", "과학")[9].score, 6); // 5.5가 밀려남
  });

  t("깨진 JSON이면 빈 순위표로 취급하고 다음 저장은 정상", function () {
    var s = fake(); s._m[Q.BOARD_KEY] = "abc{";
    eq(Q.getBoard(s, "speed", "과학"), []);
    eq(Q.addScore(s, "speed", "과학", 3, d(1)), { rank: 1, saved: true });
    eq(Q.getBoard(s, "speed", "과학").length, 1);
  });

  t("배열/숫자 등 엉뚱한 최상위 값도 무시", function () {
    var s = fake(); s._m[Q.BOARD_KEY] = "[1,2,3]";
    eq(Q.getBoard(s, "speed", "과학"), []);
    s._m[Q.BOARD_KEY] = "42";
    eq(Q.getBoard(s, "speed", "과학"), []);
  });

  t("형식이 이상한 항목은 걸러낸다", function () {
    var s = fake();
    var bad = {}; bad["speed|과학"] = [{ score: "x", date: d(1) }, null, { score: 4, date: d(2) }, { date: d(3) }];
    s._m[Q.BOARD_KEY] = JSON.stringify(bad);
    eq(Q.getBoard(s, "speed", "과학"), [{ score: 4, date: d(2) }]);
  });

  t("setItem이 예외를 던지면 saved:false (게임은 계속)", function () {
    var s = fake(); s.setItem = function () { throw new Error("quota"); };
    var r = Q.addScore(s, "speed", "과학", 5, d(1));
    eq(r.saved, false);
  });

  t("storage가 null이면 saved:false", function () {
    eq(Q.addScore(null, "speed", "과학", 5, d(1)), { rank: null, saved: false });
    eq(Q.getBoard(null, "speed", "과학"), []);
  });
})();
```

`tests/tests.html`의 `logic.test.js` 줄 아래에 추가:

```html
<script src="storage.test.js"></script>
```

- [ ] **Step 2: 실패 확인** — `tests/tests.html` 새로고침. Expected: storage 테스트 FAIL(`Q.addScore is not a function`).

- [ ] **Step 3: 구현** — `script.js` 순수 로직 구역(`createCountdown` 아래)에 추가

```js
  var BOARD_KEY = "quiz.leaderboard.v1";
  var BOARD_LIMIT = 10;

  function getStorage() {
    try { return window.localStorage || null; } catch (e) { return null; }
  }

  function boardId(mode, category) { return mode + "|" + category; }

  function readAll(storage) {
    if (!storage) return {};
    try {
      var raw = storage.getItem(BOARD_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (e) { return {}; }
  }

  function byRank(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  }

  function cleanList(v) {
    if (!Array.isArray(v)) return [];
    return v.filter(function (e) {
      return e && typeof e.score === "number" && isFinite(e.score) && typeof e.date === "string";
    }).map(function (e) { return { score: e.score, date: e.date }; }).sort(byRank);
  }

  function getBoard(storage, mode, category) {
    return cleanList(readAll(storage)[boardId(mode, category)]);
  }

  function addScore(storage, mode, category, score, dateIso) {
    if (mode === "practice") return null;
    if (!storage) return { rank: null, saved: false };
    var all = readAll(storage);
    var entry = { score: score, date: dateIso };
    var sorted = cleanList(all[boardId(mode, category)]).concat(entry).sort(byRank);
    var pos = sorted.indexOf(entry);
    var rank = pos < BOARD_LIMIT ? pos + 1 : null;
    all[boardId(mode, category)] = sorted.slice(0, BOARD_LIMIT);
    try {
      storage.setItem(BOARD_KEY, JSON.stringify(all));
      return { rank: rank, saved: true };
    } catch (e) {
      return { rank: rank, saved: false };
    }
  }
```

`window.Quiz = {…}`에 `BOARD_KEY, BOARD_LIMIT, getStorage, getBoard, addScore`를 추가한다.

주의: `sort`가 안정 정렬이어야 동점·같은 날짜 처리가 맞다(최신 브라우저는 안정 정렬). 같은 `date` 문자열이 겹쳐도 `entry`가 뒤에 붙으므로 앞의 기존 항목이 위에 온다.

- [ ] **Step 4: 통과 확인** — `tests/tests.html` 새로고침. Expected: 전부 PASS.

- [ ] **Step 5: 커밋(선택)**

```bash
git add script.js tests/
git commit -m "feat: leaderboard storage logic with tests"
```

---

### Task 7: 저장 연동과 순위표 화면

**Files:**
- Modify: `script.js` (화면 구역)
- Modify: `style.css`

**Interfaces:**
- Consumes: `Quiz.getStorage`, `Quiz.addScore`, `Quiz.getBoard`, `Quiz.CATEGORIES`, Task 5의 `showResult`, `showModes`
- Produces: `showBoard(mode, category)`; `showResult`가 스피드/힌트 결과에서 한 번만 저장하고 `game.saveInfo`에 결과를 보관.

- [ ] **Step 1: 결과 화면에서 저장** — `showResult`를 수정

`showResult` 맨 위(`stopTimer();` 다음)에 추가:

```js
    if (game.mode !== "practice" && !game.isRetry && !game.saveInfo) {
      game.saveInfo = Quiz.addScore(Quiz.getStorage(), game.mode, game.category, game.score, new Date().toISOString());
    }
```

`show(...)` 안의 `(game.mode === "practice" ? '<p class="notice">…' : '') +` 바로 뒤에 추가:

```js
      boardMessage() +
```

`showResult` 위에 함수 추가:

```js
  function boardMessage() {
    var s = game.saveInfo;
    if (!s) return "";
    if (!s.saved) return '<p class="bad">순위표를 저장하지 못했습니다. (브라우저 저장소를 사용할 수 없음)</p>';
    return s.rank ? '<p class="ok">순위: ' + s.rank + '위</p>' : '<p>순위권 밖입니다. (상위 ' + Quiz.BOARD_LIMIT + '개만 기록)</p>';
  }
```

결과 화면 버튼 줄에 `<button data-action="board" data-mode="…" data-category="…">순위표 보기</button>`를 추가(스피드/힌트일 때만):

```js
      (game.mode !== "practice"
        ? '<button data-action="board" data-mode="' + game.mode + '" data-category="' + esc(game.category) + '">순위표 보기</button>' : '') +
```

- [ ] **Step 2: 순위표 화면 추가** — `showModes` 아래

```js
  function showBoard(mode, category) {
    stopTimer();
    var rows = Quiz.getBoard(Quiz.getStorage(), mode, category);
    show(
      '<h1>순위표</h1>' +
      '<div class="row">' + ["speed", "hint"].map(function (m) {
        return '<button class="' + (m === mode ? "primary" : "") + '" data-action="board" data-mode="' + m +
               '" data-category="' + esc(category) + '">' + modeName(m) + '</button>';
      }).join("") + '</div>' +
      '<div class="row">' + CATEGORIES.map(function (c) {
        return '<button class="' + (c === category ? "primary" : "") + '" data-action="board" data-mode="' + mode +
               '" data-category="' + esc(c) + '">' + esc(c) + '</button>';
      }).join("") + '</div>' +
      (rows.length === 0 ? '<p>아직 기록이 없습니다.</p>' :
        '<table><thead><tr><th>순위</th><th>점수</th><th>날짜</th></tr></thead><tbody>' +
        rows.map(function (e, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + e.score + '</td><td>' +
                 esc(new Date(e.date).toLocaleDateString("ko-KR")) + '</td></tr>';
        }).join("") + '</tbody></table>') +
      '<div class="row"><button data-action="home">처음으로</button></div>'
    );
  }
```

`showModes`의 `'</div>'` 뒤(모드 버튼 목록 다음)에 순위표 진입 버튼 추가:

```js
      '<div class="row"><button data-action="board" data-mode="speed" data-category="' + esc(CATEGORIES[0]) + '">순위표</button></div>'
```

클릭 핸들러에 한 줄 추가:

```js
    else if (a === "board") showBoard(el.dataset.mode, el.dataset.category);
```

- [ ] **Step 3: 스타일 추가** — `style.css` 끝에

```css
table { width:100%; border-collapse:collapse; margin-top:16px; background:var(--card); }
th, td { padding:8px 10px; border-bottom:1px solid var(--line); text-align:left; }
.ok { color:var(--ok); font-weight:700; } .bad { color:var(--bad); }
button.primary.active, .row .primary { background:var(--accent); color:#fff; }
```

- [ ] **Step 4: 테스트 재확인** — `tests/tests.html` 새로고침. Expected: 전부 PASS.

- [ ] **Step 5: "3단계 직접 확인할 항목" 1~10번을 수행한다.** 실패한 항목은 고친 뒤 다시 확인한다.

- [ ] **Step 6: 최종 점검 (전체 회귀)**
  - 1·2·3단계의 직접 확인 목록 중 각 단계의 1~3번 항목을 다시 한 번씩 수행한다.
  - 앱 파일이 정확히 4개인지 확인한다: `index.html`, `style.css`, `script.js`, `questions.js`.
  - `index.html`을 더블클릭(`file://`)으로 열었을 때 콘솔 에러가 없는지 확인한다.

- [ ] **Step 7: 커밋(선택)**

```bash
git add script.js style.css
git commit -m "feat: save scores and leaderboard UI (stage 3)"
```

---

## Self-Review 결과

- **PRD 커버리지**: 카테고리·문항 수·출처·최상급 규칙(Task 1), 연습 점수·문구(Task 2·3), 스피드 15초·정지·재시작(Task 4·5), 힌트 0.5점·2개 제거(Task 4·5), 연습 다시 풀기(별도 라운드·점수 미합산)(Task 4·5), 순위표 모드×카테고리·상위 10·localStorage(Task 6·7), `file://` 동작(Global Constraints, 직접 확인), 가정 중 "문항·보기 섞기"(Task 2).
- **타입 일관성**: `submitAnswer/submitTimeout → Result|null`, `useHint → number[]|null`, `addScore → {rank, saved}|null` 이름과 시그니처를 Task 2·4·6·7에서 동일하게 사용한다.
- **한계**: 문항 40개의 실제 내용과 출처는 작성 시점에 자료를 열어 확인해야 한다(Task 1 Step 4). 테스트의 최상급 검사는 휴리스틱이라 사람이 읽는 검토를 대체하지 못한다. 화면은 자동 테스트가 없고 "직접 확인할 항목"으로 검증한다.
