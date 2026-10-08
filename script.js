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
