(function () {
  var CATS = ["한국사", "세계지리", "과학", "예술과 문화"];
  var SUPERLATIVE = /가장|최초|최대|최고|최소|제일/;
  var HAS_BASIS = /기준|현재|년\s*기준|따르면|알려진|일반적으로/;
  var NEGATIVE = /않|못\s|못하|아닌|아니|없는|없다|틀린/;
  var ALL_OR_NONE = /모두 맞|모두 정답|어느 것도|위의|해당 없음|전부 맞/;
  var SOURCE = /\(출처:\s*(.+?),\s*확인일\s*\d{4}-\d{2}-\d{2}\)\s*$/;

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
      t(label + " 해설 한 줄 + 출처 2곳 이상", function () {
        ok(typeof q.explanation === "string" && q.explanation.length > 0, "해설 없음");
        ok(q.explanation.indexOf("\n") === -1, "해설은 한 줄");
        var m = SOURCE.exec(q.explanation);
        ok(m, "해설 끝에 '(출처: …, 확인일 YYYY-MM-DD)' 형식이 없음");
        var sources = m[1].split(";").map(function (s) { return s.trim(); }).filter(Boolean);
        ok(sources.length >= 2, "출처가 2곳 미만");
        ok(new Set(sources).size === sources.length, "같은 출처를 중복해서 씀");
      });
      t(label + " 최상급은 기준 명시(휴리스틱)", function () {
        if (SUPERLATIVE.test(q.question)) ok(HAS_BASIS.test(q.question), "최상급 문항에 기준/시점이 없어 보임");
      });
      t(label + " 문제는 부정문이 아니다(휴리스틱)", function () {
        ok(!NEGATIVE.test(q.question), "부정 표현이 있음");
      });
      t(label + " '모두 맞음/어느 것도 아님' 보기 없음", function () {
        q.choices.forEach(function (c) { ok(!ALL_OR_NONE.test(c), "금지된 보기: " + c); });
      });
      t(label + " 보기 길이가 비슷하다(휴리스틱)", function () {
        var lens = q.choices.map(function (c) { return c.length; });
        ok(Math.max.apply(null, lens) <= 2 * Math.min.apply(null, lens) + 2, "보기 길이 편차가 큼: " + lens.join(","));
      });
    });
  });
})();
