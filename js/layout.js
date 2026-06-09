// ===== 공통 헤더/푸터 주입 =====
// 모든 페이지에 동일한 내비게이션과 푸터를 한 곳에서 관리합니다.
// 각 페이지 <body> 안에 <div id="site-header"></div> 와 <div id="site-footer"></div> 만 두면 됩니다.
(function () {
  // 상단 메뉴 — 제목만 봐도 내용을 알 수 있게 구성
  const PAGES = [
    { href: "about.html",   label: "한국장미회 소개" },
    { href: "guide.html",   label: "장미 가꾸기" },
    { label: "교육행사", match: "events.html", dropdown: [
      { href: "events.html#sat",    label: "토요장미모임" },
      { href: "events.html#tour",   label: "장미정원투어" },
      { href: "events.html#events", label: "행사 & 이벤트" },
    ] },
    { href: "gallery.html", label: "활동" },
    { href: "stories.html", label: "회원이야기" },
    { href: "shop.html",    label: "굿즈샵" },
  ];

  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const menu = PAGES.map(function (p) {
    if (p.dropdown) {
      const sub = p.dropdown.map(function (c) {
        return '<li><a href="' + c.href + '">' + c.label + "</a></li>";
      }).join("");
      const active = p.match && p.match === current ? " active" : "";
      return '<li class="nav-dd"><a href="#" class="menu-link' + active + '">' + p.label +
        ' ▾</a><ul class="dd-list">' + sub + "</ul></li>";
    }
    const active = p.href.toLowerCase() === current ? " active" : "";
    return '<li><a href="' + p.href + '" class="menu-link' + active + '">' + p.label + "</a></li>";
  }).join("") +
  // 회원 전용 드롭다운 (기본 숨김 — auth.js 가 로그인 역할에 따라 표시/구성)
  '<li class="nav-dd" id="member-menu" style="display:none;">' +
    '<a href="#" class="menu-link" id="member-menu-toggle">회원 전용 ▾</a>' +
    '<ul class="dd-list" id="member-menu-list"></ul>' +
  "</li>";

  const header =
    '<header class="site-header">' +
      '<div class="container nav">' +
        '<a href="index.html" class="brand">' +
          '<span class="logo"><img src="images/logo.png" alt="한국장미회 로고"></span>' +
          '<span class="name">한국장미회<small>KOREA ROSE SOCIETY</small></span>' +
        "</a>" +
        '<button class="nav-toggle" id="nav-toggle" aria-label="메뉴 열기">☰</button>' +
        '<ul class="menu" id="nav-menu">' + menu + "</ul>" +
        '<div class="nav-right">' +
          // 로그인 링크는 공개 메뉴에서 제거. (관리자는 login.html 직접 접속)
          // auth.js 가 로그인 상태일 때만 이 슬롯에 닉네임/로그아웃을 채웁니다.
          '<span id="auth-slot" class="auth-slot"></span>' +
          '<a href="join.html" class="nav-cta">입회신청</a>' +
        "</div>" +
      "</div>" +
    "</header>";

  const year = "2026";
  const footer =
    '<footer class="footer" id="contact">' +
      '<div class="container">' +
        '<div class="cols">' +
          "<div>" +
            '<h4 class="footer-brand"><img src="images/logo.png" alt="" class="footer-logo">' +
              '<span class="footer-brand-name">한국장미회<small>KOREA ROSE SOCIETY</small></span></h4>' +
            '<p style="opacity:.85;font-size:14px;max-width:300px;">세계장미회(WFRS) 회원 단체.<br>장미 문화의 보급·교육과 국제 교류, 회원 간 배움과 나눔을 이어갑니다.</p>' +
            '<p style="opacity:.9;font-size:14px;margin-top:12px;">📧 <a href="mailto:korea-rose@naver.com" style="display:inline;padding:0;">korea-rose@naver.com</a></p>' +
          "</div>" +
          "<div>" +
            "<h4>바로가기</h4>" +
            '<a href="about.html">한국장미회 소개</a>' +
            '<a href="guide.html">장미 가꾸기</a>' +
            '<a href="events.html">교육행사</a>' +
            '<a href="gallery.html">활동</a>' +
            '<a href="stories.html">회원이야기</a>' +
          "</div>" +
          "<div>" +
            "<h4>함께하기 · 연락처</h4>" +
            '<a href="join.html">회원 입회신청</a>' +
            '<a href="shop.html">굿즈샵 (오픈 예정)</a>' +
            '<a href="mailto:korea-rose@naver.com">📧 korea-rose@naver.com</a>' +
            '<a href="https://cafe.naver.com/korearose" target="_blank" rel="noopener">☕ 네이버 카페 바로가기</a>' +
          "</div>" +
        "</div>" +
        '<div class="copy">© ' + year + " 한국장미회 (Korea Rose Society) · 시안(prototype) — 내용은 임시 예시입니다.</div>" +
      "</div>" +
    "</footer>";

  // outerHTML 로 교체 — 헤더를 body 직속으로 두어야 position:sticky 가 정상 동작합니다.
  const h = document.getElementById("site-header");
  if (h) h.outerHTML = header;
  const f = document.getElementById("site-footer");
  if (f) f.outerHTML = footer;

  // 파비콘(브라우저 탭 아이콘) — 전 페이지 공통 주입
  if (!document.querySelector('link[rel="icon"]')) {
    const fav = document.createElement("link");
    fav.rel = "icon";
    fav.href = "images/logo.jpg";
    document.head.appendChild(fav);
  }

  // ===== SEO/소셜 공유 메타 자동 주입 =====
  // 각 페이지는 <title> 과 <meta name="description"> 만 직접 두면,
  // 아래 코드가 OG(오픈그래프)·트위터 카드·theme-color 등 공통 메타를 자동으로 채웁니다.
  (function injectMeta() {
    const head = document.head;
    function ensureMeta(attr, key, content) {
      if (!content) return;
      let el = head.querySelector("meta[" + attr + '="' + key + '"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        head.appendChild(el);
      }
      if (!el.getAttribute("content")) el.setAttribute("content", content);
    }
    const SITE = "한국장미회 (Korea Rose Society)";
    const title = document.title || SITE;
    const descEl = head.querySelector('meta[name="description"]');
    const desc = descEl ? descEl.getAttribute("content") : "";
    // 절대 URL 기준(소셜 미리보기 이미지는 절대경로 권장)
    const origin = location.origin && location.origin !== "null" ? location.origin : "";
    const base = origin + location.pathname.replace(/[^/]*$/, "");
    const ogImage = base + "images/garden/hero.jpg";

    ensureMeta("name", "theme-color", "#A6324F");
    ensureMeta("property", "og:site_name", SITE);
    ensureMeta("property", "og:type", "website");
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:description", desc);
    ensureMeta("property", "og:image", ogImage);
    ensureMeta("property", "og:url", origin + location.pathname);
    ensureMeta("property", "og:locale", "ko_KR");
    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "twitter:title", title);
    ensureMeta("name", "twitter:description", desc);
    ensureMeta("name", "twitter:image", ogImage);
  })();

  // 웹폰트 — 우아한 한글 명조(제목) + 고딕(본문) + 라틴 세리프(영문 장식)
  if (!document.getElementById("krs-fonts")) {
    const p1 = document.createElement("link"); p1.rel = "preconnect"; p1.href = "https://fonts.googleapis.com"; document.head.appendChild(p1);
    const p2 = document.createElement("link"); p2.rel = "preconnect"; p2.href = "https://fonts.gstatic.com"; p2.crossOrigin = "anonymous"; document.head.appendChild(p2);
    const f = document.createElement("link");
    f.id = "krs-fonts"; f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap";
    document.head.appendChild(f);
  }

  // 모바일 햄버거 토글
  const toggle = document.getElementById("nav-toggle");
  const navMenu = document.getElementById("nav-menu");
  if (toggle && navMenu) {
    toggle.addEventListener("click", function () {
      navMenu.classList.toggle("open");
    });
  }

  // 드롭다운 토글 — 행사·정원, 회원 전용 등 모든 .nav-dd 공통
  const dropdowns = Array.prototype.slice.call(document.querySelectorAll(".nav-dd"));
  dropdowns.forEach(function (dd) {
    const toggle = dd.querySelector(":scope > .menu-link");
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        dropdowns.forEach(function (o) { if (o !== dd) o.classList.remove("open"); });
        dd.classList.toggle("open");
      });
    }
  });
  document.addEventListener("click", function (e) {
    dropdowns.forEach(function (dd) {
      if (!dd.contains(e.target)) dd.classList.remove("open");
    });
  });
})();
