(function () {
  var Q = window.Quiz || {};
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

  t("hintCount: 힌트를 쓴 문항 수(틀려도 센다, 안 쓴 문항은 세지 않는다)", function () {
    var g = hintGame();
    eq(Q.hintCount(g), 0);
    Q.useHint(g, seeded(1)); Q.submitAnswer(g, 1); Q.nextQuestion(g);   // 힌트 쓰고 정답
    eq(Q.hintCount(g), 1);
    Q.submitAnswer(g, 0); Q.nextQuestion(g);                            // 힌트 없이 정답
    eq(Q.hintCount(g), 1);
    var h = hintGame();
    Q.useHint(h, seeded(2));
    var wrong = [0, 1, 2, 3].filter(function (i) { return i !== Q.currentQuestion(h).answer && h.hidden.indexOf(i) === -1; })[0];
    Q.submitAnswer(h, wrong);                                           // 힌트 쓰고 오답
    eq(Q.hintCount(h), 1);
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
})();
