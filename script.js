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
    if (!correct) return 0;
    if (mode === "hint" && hintUsed) return 0.5;
    return 1;
  }

  function createGame(mode, category, questions) {
    return { mode: mode, category: category, questions: questions, index: 0, score: 0,
             answered: false, hintUsed: false, hidden: [], results: [] };
  }

  function currentQuestion(g) { return g.questions[g.index]; }

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

  function nextQuestion(g) {
    if (!g.answered) return;
    g.index += 1;
    g.answered = false;
    g.hintUsed = false;
    g.hidden = [];
  }

  function isFinished(g) { return g.index >= g.questions.length; }

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

  window.Quiz = {
    CATEGORIES: CATEGORIES, shuffle: shuffle, prepareQuestions: prepareQuestions,
    scoreFor: scoreFor, createGame: createGame, currentQuestion: currentQuestion,
    submitAnswer: submitAnswer, submitTimeout: submitTimeout, nextQuestion: nextQuestion,
    isFinished: isFinished, useHint: useHint, wrongQuestions: wrongQuestions,
    createRetry: createRetry, createCountdown: createCountdown
  };

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
})();
