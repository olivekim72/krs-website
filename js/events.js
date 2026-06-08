// ===== 이벤트 자동 렌더링 =====
// data/events.json 에 행사를 추가하면 카드가 자동 생성됩니다.
//   필수: title, date(YYYY-MM-DD)
//   선택: category, emoji, image, time, place, summary, details
//   · summary/details 가 있으면 카드를 클릭했을 때 전체 공지가 모달로 열립니다.
//   · "다가오는 행사"는 오늘 이후 행사만 가까운 날짜순으로 보여줍니다.

function _krsTodayStr() {
  const d = new Date();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}
function _krsFmtDate(s) {
  const d = new Date(s);
  if (isNaN(d)) return String(s || "");
  return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
}
function _krsEscAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function _krsEvtKey(ev) { return (ev.date || "") + "|" + ev.title; }

const _krsEventsByKey = {};

async function loadEvents(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch("data/events.json");
    let events = await res.json();
    const today = _krsTodayStr();
    // 다가오는 행사: 오늘 이후(포함)만, 가까운 날짜 먼저
    events = events
      .filter(function (ev) { return !ev.date || ev.date >= today; })
      .sort(function (a, b) { return (a.date || "") < (b.date || "") ? -1 : 1; });
    events.forEach(function (ev) { _krsEventsByKey[_krsEvtKey(ev)] = ev; });
    if (limit) events = events.slice(0, limit);

    if (!events.length) {
      target.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">예정된 행사가 곧 공지됩니다. 🌹</p>';
      return;
    }

    target.innerHTML = events.map(function (ev) {
      const dateStr = _krsFmtDate(ev.date) + (ev.time ? " " + ev.time : "");
      const thumb = ev.image
        ? '<div class="event-thumb" style="background-image:url(\'' + ev.image + "');background-size:cover;\"></div>"
        : '<div class="event-thumb">' + (ev.emoji || "🌹") + "</div>";
      const hasDetail = !!(ev.details || ev.summary);
      return "" +
        '<article class="event-card' + (hasDetail ? " has-detail" : "") + '"' +
          (hasDetail ? ' data-evt="' + _krsEscAttr(_krsEvtKey(ev)) + '"' : "") + ">" +
          thumb +
          '<div class="event-body">' +
            '<span class="event-tag">' + (ev.category || "행사") + "</span>" +
            "<h3>" + ev.title + "</h3>" +
            '<p class="event-date">📅 ' + dateStr + "</p>" +
            (ev.summary ? '<p class="event-summary">' + ev.summary + "</p>" : "") +
            (hasDetail ? '<span class="event-more">자세히 보기 →</span>' : "") +
          "</div>" +
        "</article>";
    }).join("");

    _ensureEventModal();
  } catch (e) {
    target.innerHTML = "<p style='color:#999'>행사 데이터를 불러오지 못했습니다. (data/events.json 확인)</p>";
  }
}

// 행사 상세 모달 (한 번만 생성, 카드 클릭 위임)
function _ensureEventModal() {
  if (!document.getElementById("event-modal")) {
    const m = document.createElement("div");
    m.className = "modal";
    m.id = "event-modal";
    m.innerHTML =
      '<div class="modal-card"><button class="modal-close" aria-label="닫기">✕</button>' +
      '<div class="modal-body" id="event-modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) {
      if (e.target === m || e.target.classList.contains("modal-close")) m.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") m.classList.remove("open");
    });
  }
  if (!window._krsEvtClickBound) {
    window._krsEvtClickBound = true;
    document.addEventListener("click", function (e) {
      const card = e.target.closest ? e.target.closest(".event-card.has-detail") : null;
      if (!card) return;
      const ev = _krsEventsByKey[card.getAttribute("data-evt")];
      if (ev) _openEventModal(ev);
    });
  }
}

function _openEventModal(ev) {
  const m = document.getElementById("event-modal");
  const body = document.getElementById("event-modal-body");
  if (!m || !body) return;
  const meta = [];
  if (ev.date) meta.push("📅 " + _krsFmtDate(ev.date) + (ev.time ? " " + ev.time : ""));
  if (ev.place) meta.push("📍 " + ev.place);
  body.innerHTML =
    (ev.image ? '<img class="modal-img" src="' + ev.image + '" alt="">' : "") +
    '<span class="event-tag" style="margin:22px 28px 0;">' + (ev.category || "행사") + "</span>" +
    '<h2 style="color:var(--rose-deep);margin:10px 28px 4px;font-size:24px;">' + ev.title + "</h2>" +
    (meta.length ? '<p class="modal-meta">' + meta.join("<br>") + "</p>" : "") +
    (ev.summary ? '<p class="modal-text" style="margin:0 28px 4px;font-weight:600;color:var(--ink);">주제 · ' + ev.summary + "</p>" : "") +
    (ev.details ? '<div class="modal-text" style="white-space:pre-wrap;margin-top:10px;">' + ev.details + "</div>" : "");
  m.classList.add("open");
}

// ===== 2026 연간 운영계획 (출처: 한국장미회 2026년 운영계획안) =====
// 월별 정기 프로그램 + 핵심 이벤트. 행사 일정 페이지의 "연간 캘린더"로 렌더링됩니다.
const ANNUAL_PLAN_2026 = [
  { month: "1~2월", emoji: "🗂️", title: "운영위원회 · 연간계획 수립" },
  { month: "3월",   emoji: "🌱", title: "푸르닝데이 · 정기총회(AGM)" },
  { month: "4월",   emoji: "🌷", title: "봄 장미 교육" },
  { month: "5월",   emoji: "🌹", title: "서울장미축제 참여 (중랑구 MOU)" },
  { month: "6월",   emoji: "☀️", title: "여름철 장미 관리 교육" },
  { month: "7~8월", emoji: "🛠️", title: "운영 정비" },
  { month: "9월",   emoji: "🚌", title: "장미정원 투어 (1박 2일)" },
  { month: "10월",  emoji: "🕊️", title: "세계평화의 장미정원 조성" },
  { month: "11월",  emoji: "📚", title: "장미 집중 교육" },
  { month: "12월",  emoji: "🎉", title: "송년회" },
];

function loadAnnualPlan(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = ANNUAL_PLAN_2026.map(function (m) {
    return (
      '<div class="plan-item">' +
        '<div class="plan-month">' + m.month + "</div>" +
        '<div class="plan-emoji">' + m.emoji + "</div>" +
        '<div class="plan-title">' + m.title + "</div>" +
      "</div>"
    );
  }).join("");
}
