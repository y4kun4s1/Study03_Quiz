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
