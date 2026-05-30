// ===== 이벤트 자동 렌더링 =====
// data/events.json 에 { title, date, category, emoji, image } 를 추가하기만 하면
// 행사 카드가 자동으로 생성됩니다. (= "이미지 + 타이틀만 넣으면 자동 업로드" 데모)

async function loadEvents(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch("data/events.json");
    let events = await res.json();
    // 날짜순 정렬 (최신 행사 먼저)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (limit) events = events.slice(0, limit);

    target.innerHTML = events.map(ev => {
      const d = new Date(ev.date);
      const dateStr = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
      const thumb = ev.image
        ? `<div class="event-thumb" style="background-image:url('${ev.image}');background-size:cover;"></div>`
        : `<div class="event-thumb">${ev.emoji || "🌹"}</div>`;
      return `
        <article class="event-card">
          ${thumb}
          <div class="event-body">
            <span class="event-tag">${ev.category || "행사"}</span>
            <h3>${ev.title}</h3>
            <p class="event-date">📅 ${dateStr}</p>
          </div>
        </article>`;
    }).join("");
  } catch (e) {
    target.innerHTML = "<p style='color:#999'>행사 데이터를 불러오지 못했습니다. (data/events.json 확인)</p>";
  }
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
