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
})();
