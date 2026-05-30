// ===== 장미회 Q&A 자동응답 (키워드 매칭, 서버/AI 불필요) =====
// data/faq.json 의 질문·키워드와 사용자 입력을 비교해 가장 알맞은 답을 보여줍니다.

(function () {
  const box = document.getElementById("chat-box");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const chips = document.getElementById("chat-chips");
  if (!box || !form) return;

  let FAQ = [];

  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmtDate(s) {
    const d = new Date(s);
    if (isNaN(d)) return String(s || "");
    return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
  }

  // 행사 데이터(events.json) → Q&A 자동 생성
  function dynamicFromEvents(events) {
    if (!Array.isArray(events) || !events.length) return [];
    const sorted = events.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    const out = sorted.map(function (ev) {
      const words = norm(ev.title).split(" ").filter(function (w) { return w.length >= 2; });
      return {
        category: "행사",
        q: ev.title + " 언제 하나요?",
        keywords: words.concat([ev.category || "", "언제", "날짜", "일정", "행사"]),
        a: "<b>" + esc(ev.title) + "</b> 은(는) <b>" + fmtDate(ev.date) + "</b>에 예정되어 있습니다. (" +
           esc(ev.category || "행사") + ") 자세한 일정은 <a href='events.html'>행사 일정</a> 페이지를 참고하세요.",
      };
    });
    const list = sorted.slice(0, 6).map(function (ev) {
      return "· " + esc(ev.title) + " (" + fmtDate(ev.date) + ")";
    }).join("<br>");
    out.push({
      category: "행사",
      q: "다가오는 행사 알려줘",
      keywords: ["다가오는", "행사", "일정", "이벤트", "스케줄", "예정", "뭐 있어", "달력"],
      a: "다가오는 주요 행사입니다:<br>" + list + "<br><a href='events.html'>전체 행사 일정 보기 →</a>",
    });
    return out;
  }

  // 굿즈 데이터(products.json) → Q&A 자동 생성
  function dynamicFromProducts(products) {
    if (!Array.isArray(products) || !products.length) return [];
    const list = products.map(function (p) {
      const price = p.price ? Number(p.price).toLocaleString("ko-KR") + "원" : "가격 미정";
      return "· " + esc(p.name) + " — " + price;
    }).join("<br>");
    return [{
      category: "굿즈",
      q: "굿즈 종류와 가격을 알려줘",
      keywords: ["굿즈", "상품", "가격", "얼마", "종류", "모종 가격", "씨앗 가격", "기념품", "판매"],
      a: "준비 중인 굿즈입니다 (정식 판매는 사단법인 등록 후):<br>" + list +
         "<br><a href='shop.html'>굿즈샵 둘러보기 →</a>",
    }];
  }

  function addMsg(text, who) {
    const div = document.createElement("div");
    div.className = "chat-msg " + (who === "user" ? "chat-user" : "chat-bot");
    div.innerHTML = text; // FAQ 답변은 내부 데이터라 신뢰 가능
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  // 입력과 FAQ 항목의 적합도 점수
  function score(q, item) {
    const text = norm(q);
    let s = 0;
    (item.keywords || []).forEach(function (k) {
      if (text.indexOf(norm(k)) !== -1) s += 2;
    });
    // 질문 원문 단어와 겹치면 가산
    norm(item.q).split(" ").forEach(function (w) {
      if (w.length >= 2 && text.indexOf(w) !== -1) s += 1;
    });
    return s;
  }

  function answer(q) {
    let best = null, bestScore = 0, second = null;
    FAQ.forEach(function (item) {
      const sc = score(q, item);
      if (sc > bestScore) { second = best; best = item; bestScore = sc; }
    });
    if (!best || bestScore === 0) {
      return (
        "음… 제가 정확히 이해하지 못했어요. 😅 아래 자주 묻는 질문을 눌러보시거나, " +
        "다른 표현으로 다시 질문해 주세요. 더 궁금한 점은 <a href='about.html'>협회 소개</a> 와 " +
        "<a href='guide.html'>장미 가꾸기</a> 페이지에도 정보가 있습니다."
      );
    }
    let out = best.a;
    if (second && score(q, second) >= bestScore - 1 && second !== best) {
      out += "<br><br><span style='color:var(--gray);font-size:13px;'>혹시 이게 궁금하셨나요? — " + second.q + "</span>";
    }
    return out;
  }

  function ask(q) {
    if (!q) return;
    addMsg(q, "user");
    setTimeout(function () { addMsg(answer(q), "bot"); }, 250);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    ask(q);
  });

  // FAQ + 라이브 데이터(행사·굿즈) 로드 → 자동 Q&A 구성
  function getJSON(url) {
    return fetch(url).then(function (r) { return r.json(); }).catch(function () { return []; });
  }

  Promise.all([
    getJSON("data/faq.json"),
    getJSON("data/events.json"),
    getJSON("data/products.json"),
  ]).then(function (arr) {
    const base = Array.isArray(arr[0]) ? arr[0] : [];
    // 손으로 정리한 FAQ + 데이터에서 자동 생성한 Q&A 를 합칩니다.
    FAQ = base
      .concat(dynamicFromEvents(arr[1]))
      .concat(dynamicFromProducts(arr[2]));

    addMsg(
      "안녕하세요! 🌹 한국장미회 도우미예요. 가입·회비·모임·장미 관리는 물론, " +
      "<b>행사 일정</b>과 <b>굿즈 가격</b>도 데이터에서 자동으로 찾아 답해드려요. 무엇이 궁금하세요?",
      "bot"
    );

    // 추천 질문 칩: 기본 FAQ 일부 + 데이터 기반 질문
    const picks = base.slice(0, 6).map(function (f) { return f.q; });
    picks.push("다가오는 행사 알려줘");
    picks.push("굿즈 종류와 가격을 알려줘");
    chips.innerHTML = picks.map(function (q, i) {
      return '<button class="chip" data-i="' + i + '">' + q + "</button>";
    }).join("");
    chips.querySelectorAll(".chip").forEach(function (b) {
      b.addEventListener("click", function () { ask(picks[b.dataset.i]); });
    });
  });
})();
