// ===== 네이버 카페 최신글 홈 노출 =====
// 네이버 카페는 로그인·CORS 제약으로 브라우저가 직접 가져올 수 없습니다.
// 1) config.js 의 CAFE_RSS_URL 이 설정되어 있으면 → CORS 프록시로 RSS 를 받아 자동 표시
// 2) 실패하거나 미설정이면 → data/cafe.json 의 목록 표시 (관리자 갱신)
// 3) 그래도 없으면 → 카페 바로가기 안내

function _cafeEsc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function _cafeDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
}

function _cafeRender(target, items, cafeUrl) {
  target.innerHTML = items.map(function (p) {
    const link = p.link || cafeUrl;
    return (
      '<a class="cafe-item" href="' + _cafeEsc(link) + '" target="_blank" rel="noopener">' +
        '<span class="cafe-badge">NAVER 카페</span>' +
        '<span class="cafe-title">' + _cafeEsc(p.title || "(제목 없음)") + "</span>" +
        '<span class="cafe-date">' + _cafeDate(p.date) + " ›</span>" +
      "</a>"
    );
  }).join("");
}

async function loadCafePosts(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const cfg = window.KRS_CONFIG || {};
  const cafeUrl = cfg.CAFE_URL || "https://cafe.naver.com/korearose";
  limit = limit || 5;

  // 1) RSS + CORS 프록시 자동 수집
  if (cfg.CAFE_RSS_URL) {
    try {
      const proxy = cfg.CAFE_PROXY || "https://api.allorigins.win/raw?url=";
      const res = await fetch(proxy + encodeURIComponent(cfg.CAFE_RSS_URL));
      const text = await res.text();
      const xml = new DOMParser().parseFromString(text, "text/xml");
      const nodes = Array.prototype.slice.call(xml.querySelectorAll("item")).slice(0, limit);
      const items = nodes.map(function (it) {
        const get = function (tag) {
          const el = it.querySelector(tag);
          return el ? el.textContent : "";
        };
        return { title: get("title"), link: get("link"), date: get("pubDate") };
      });
      if (items.length) { _cafeRender(target, items, cafeUrl); return; }
    } catch (e) {
      // 프록시/RSS 실패 → 폴백
    }
  }

  // 2) data/cafe.json 폴백
  try {
    const res = await fetch("data/cafe.json");
    const items = await res.json();
    if (Array.isArray(items) && items.length) {
      _cafeRender(target, items.slice(0, limit), cafeUrl);
      return;
    }
  } catch (e) { /* fall through */ }

  // 3) 최종 폴백
  target.innerHTML =
    '<p style="text-align:center;color:var(--gray)">최신글을 불러오지 못했습니다. ' +
    '<a href="' + cafeUrl + '" target="_blank" rel="noopener" style="color:var(--rose-deep);font-weight:600;">네이버 카페에서 보기 →</a></p>';
}
