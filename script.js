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

  function hintCount(g) {
    return g.results.filter(function (r) { return r.hintUsed; }).length;
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
    hintCount: hintCount, createRetry: createRetry, createCountdown: createCountdown
  };

  /* ===== 화면 ===== */

  if (!document.getElementById("app")) return; // 테스트 페이지에서는 화면을 만들지 않는다

  var game = null;

  var MODES = [
    { id: "practice", name: "연습", desc: "시간 제한·힌트 없음", note: "순위표에 기록되지 않음" },
    { id: "speed", name: "스피드", desc: "문항마다 15초, 시간이 지나면 오답" },
    { id: "hint", name: "힌트", desc: "문항마다 힌트 1번, 힌트 쓰고 맞히면 0.5점" }
  ];
  var SPEED_SECONDS = 15;
  var LOW_SECONDS = 5; // 이 값 이하로 남으면 타이머를 빨갛게 보여 준다
  var timer = null;

  function stopTimer() { if (timer) { timer.stop(); timer = null; } }
  function modeName(id) { return MODES.filter(function (m) { return m.id === id; })[0].name; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function show(html) { document.getElementById("app").innerHTML = html; }

  function showStart() {
    stopTimer(); game = null;
    show(
      '<p class="student">학번 2601977&nbsp;&nbsp;이름 정지수</p>' +
      '<h1>상식 퀴즈</h1><div class="cats">' + CATEGORIES.map(function (c) {
        return '<button data-action="category" data-category="' + esc(c) + '">' + esc(c) + '</button>';
      }).join("") + '</div>'
    );
  }

  function showModeSelect(category) {
    show(
      '<h1>' + esc(category) + '</h1><p class="progress">모드를 고르세요</p>' +
      '<div class="cats">' + MODES.map(function (m) {
        return '<button data-action="start" data-mode="' + m.id + '" data-category="' + esc(category) + '"><strong>' +
               esc(m.name) + '</strong><br>' + esc(m.desc) +
               (m.note ? '<br><span class="notice">' + esc(m.note) + '</span>' : '') + '</button>';
      }).join("") + '</div>' +
      '<div class="row"><button data-action="home">뒤로</button></div>'
    );
  }

  function startGame(mode, category) {
    game = Quiz.createGame(mode, category, Quiz.prepareQuestions(window.QUESTIONS[category]));
    showQuestion();
  }

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
        if (!el) return;
        el.textContent = left + "초";
        el.classList.toggle("low", left <= LOW_SECONDS);
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
      (game.mode === "hint" ? '<p class="hint-summary">힌트 사용: ' + Quiz.hintCount(game) + ' / ' + total + '문항</p>' : '') +
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

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var a = el.dataset.action;
    if (a === "category") showModeSelect(el.dataset.category);
    else if (a === "start") startGame(el.dataset.mode, el.dataset.category);
    else if (a === "choose") onChoose(Number(el.dataset.index));
    else if (a === "hint") onHint();
    else if (a === "next") onNext();
    else if (a === "retry") onRetry();
    else if (a === "home") showStart();
  });

  showStart();
})();
