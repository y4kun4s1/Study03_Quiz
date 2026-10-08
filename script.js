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
