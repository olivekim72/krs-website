// ===== 회원 스토리: 업로드 · 목록 · 상세 · 수정/삭제 =====
import { supabase, isConfigured, STORY_BUCKET } from "./supabase.js";
import { getUser, nicknameOf } from "./auth.js";

export const CATEGORIES = ["자유글", "가꾸기 후기", "사진 자랑", "질문답변", "정원 자랑"];

// ---------- 유틸 ----------
function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function fmtDate(s) {
  const d = new Date(s);
  return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
}
function snippet(t, n) {
  t = String(t || "");
  return esc(t.slice(0, n)) + (t.length > n ? "…" : "");
}

// ---------- 데이터 ----------
async function fetchStories(limit) {
  if (!supabase) return [];
  let q = supabase.from("stories").select("*").order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const res = await q;
  if (res.error) {
    console.error("스토리 불러오기 실패:", res.error);
    return null; // 오류 구분용
  }
  return res.data || [];
}

async function uploadImage(file, userId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = userId + "/" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + "." + ext;
  const up = await supabase.storage.from(STORY_BUCKET).upload(path, file, { upsert: false });
  if (up.error) throw up.error;
  const pub = supabase.storage.from(STORY_BUCKET).getPublicUrl(path);
  return pub.data.publicUrl;
}

// ---------- 카드 렌더 ----------
function cardHTML(s) {
  const thumb = s.image_url
    ? '<div class="event-thumb" style="background-image:url(\'' + esc(s.image_url) + "');background-size:cover;background-position:center;\"></div>"
    : '<div class="event-thumb">🌹</div>';
  return (
    '<article class="event-card story-card" data-id="' + esc(s.id) + '">' +
      thumb +
      '<div class="event-body">' +
        '<span class="event-tag">' + esc(s.category || "자유글") + "</span>" +
        "<h3>" + esc(s.title) + "</h3>" +
        '<p class="story-snippet">' + snippet(s.content, 80) + "</p>" +
        '<p class="event-date">✍️ ' + esc(s.author_name || "회원") + " · " + fmtDate(s.created_at) + "</p>" +
      "</div>" +
    "</article>"
  );
}

function notConfiguredHTML() {
  return (
    '<div class="notice notice-warn">' +
      "<b>⚙️ 스토리 기능 설정이 필요합니다.</b><br>" +
      "<code>js/config.js</code> 에 Supabase 정보를 입력하면 회원 스토리 업로드·공유가 활성화됩니다. " +
      '자세한 방법은 <b>스토리업로드방법.md</b> 를 참고하세요.' +
    "</div>"
  );
}

// =====================================================================
// 1) 홈 미리보기 (index.html 의 #story-preview)
// =====================================================================
async function initPreview(el) {
  if (!isConfigured) {
    el.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">' +
      "회원 스토리 기능 준비 중입니다. 🌹</p>";
    return;
  }
  const data = await fetchStories(3);
  if (!data || data.length === 0) {
    el.innerHTML =
      '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">' +
      "아직 등록된 스토리가 없어요. 첫 번째 이야기를 남겨보세요! 🌱</p>";
    return;
  }
  el.innerHTML = data.map(cardHTML).join("");
  wireCardClicks(el, data);
}

// =====================================================================
// 2) 스토리 게시판 (stories.html)
// =====================================================================
async function initBoard(board) {
  const notice = document.getElementById("auth-notice");
  const form = document.getElementById("story-form");
  const newBtn = document.getElementById("new-story-btn");
  const status = document.getElementById("story-status");

  if (!isConfigured) {
    if (notice) notice.innerHTML = notConfiguredHTML();
    if (newBtn) newBtn.style.display = "none";
    board.innerHTML = "";
    return;
  }

  // 카테고리 select 채우기
  const catSel = form.querySelector('[name="category"]');
  if (catSel && !catSel.dataset.filled) {
    catSel.innerHTML = CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + "</option>";
    }).join("");
    catSel.dataset.filled = "1";
  }

  let currentUser = await getUser();

  // 로그인 안내
  function refreshAuthNotice() {
    if (currentUser) {
      notice.innerHTML =
        '<div class="notice notice-ok">🌹 <b>' + nicknameOf(currentUser) +
        "</b>님, 환영합니다. 자유롭게 스토리를 올려보세요!</div>";
      newBtn.style.display = "";
    } else {
      notice.innerHTML =
        '<div class="notice">스토리를 올리려면 <a href="login.html"><b>로그인</b></a> 이 필요합니다. ' +
        "(읽기는 누구나 가능해요)</div>";
      newBtn.style.display = "none";
      form.style.display = "none";
    }
  }
  refreshAuthNotice();

  // 글쓰기 토글
  newBtn.addEventListener("click", function () {
    form.style.display = form.style.display === "none" ? "block" : "none";
    if (form.style.display === "block") form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // 이미지 미리보기
  const fileInput = form.querySelector('[name="image"]');
  const preview = form.querySelector(".image-preview");
  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    if (file) {
      preview.style.backgroundImage = "url('" + URL.createObjectURL(file) + "')";
      preview.classList.add("has-image");
    } else {
      preview.style.backgroundImage = "";
      preview.classList.remove("has-image");
    }
  });

  // 취소
  const cancelBtn = form.querySelector(".cancel-btn");
  if (cancelBtn) cancelBtn.addEventListener("click", function () {
    form.reset();
    preview.style.backgroundImage = "";
    preview.classList.remove("has-image");
    form.style.display = "none";
  });

  // 제출
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    currentUser = await getUser();
    if (!currentUser) { location.href = "login.html"; return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "올리는 중…";

    try {
      const title = form.elements.title.value.trim();
      const category = form.elements.category.value;
      const content = form.elements.content.value.trim();
      const file = fileInput.files[0];

      let imageUrl = null;
      if (file) imageUrl = await uploadImage(file, currentUser.id);

      const ins = await supabase.from("stories").insert({
        user_id: currentUser.id,
        author_name: nicknameOf(currentUser),
        category: category,
        title: title,
        content: content,
        image_url: imageUrl,
      });
      if (ins.error) throw ins.error;

      form.reset();
      preview.style.backgroundImage = "";
      preview.classList.remove("has-image");
      form.style.display = "none";
      status.innerHTML = '<div class="notice notice-ok">✅ 스토리가 등록되었습니다!</div>';
      setTimeout(function () { status.innerHTML = ""; }, 4000);
      await loadBoard();
    } catch (err) {
      console.error(err);
      status.innerHTML =
        '<div class="notice notice-warn">⚠️ 등록에 실패했습니다: ' + esc(err.message || err) + "</div>";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "스토리 올리기";
    }
  });

  // 목록 로드
  async function loadBoard() {
    board.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">불러오는 중…</p>';
    const data = await fetchStories();
    currentUser = await getUser();
    if (data === null) {
      board.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">목록을 불러오지 못했습니다. Supabase 설정/스키마를 확인해주세요.</p>';
      return;
    }
    if (data.length === 0) {
      board.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--gray)">아직 스토리가 없어요. 첫 이야기를 남겨보세요! 🌱</p>';
      return;
    }
    board.innerHTML = data.map(cardHTML).join("");
    wireCardClicks(board, data, currentUser, loadBoard);
  }

  await loadBoard();
}

// =====================================================================
// 상세 모달
// =====================================================================
function ensureModal() {
  let modal = document.getElementById("story-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "story-modal";
    modal.className = "modal";
    modal.innerHTML =
      '<div class="modal-card">' +
        '<button class="modal-close" aria-label="닫기">✕</button>' +
        '<div class="modal-body"></div>' +
      "</div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.classList.contains("modal-close")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    function close() { modal.classList.remove("open"); }
    modal._close = close;
  }
  return modal;
}

function openModal(s, currentUser, onChange) {
  const modal = ensureModal();
  const body = modal.querySelector(".modal-body");
  const isOwner = currentUser && currentUser.id === s.user_id;
  const img = s.image_url
    ? '<img class="modal-img" src="' + esc(s.image_url) + '" alt="">'
    : "";
  body.innerHTML =
    img +
    '<span class="event-tag">' + esc(s.category || "자유글") + "</span>" +
    "<h2>" + esc(s.title) + "</h2>" +
    '<p class="modal-meta">✍️ ' + esc(s.author_name || "회원") + " · " + fmtDate(s.created_at) + "</p>" +
    '<div class="modal-text">' + esc(s.content).replace(/\n/g, "<br>") + "</div>" +
    (isOwner
      ? '<div class="modal-actions"><button class="btn btn-ghost del-btn" style="color:var(--rose-deep);border-color:var(--rose-light)">삭제</button></div>'
      : "");
  modal.classList.add("open");

  if (isOwner) {
    const del = body.querySelector(".del-btn");
    del.addEventListener("click", async function () {
      if (!confirm("이 스토리를 삭제할까요?")) return;
      const res = await supabase.from("stories").delete().eq("id", s.id);
      if (res.error) { alert("삭제 실패: " + res.error.message); return; }
      modal._close();
      if (onChange) onChange();
    });
  }
}

function wireCardClicks(container, data, currentUser, onChange) {
  const byId = {};
  data.forEach(function (s) { byId[s.id] = s; });
  container.querySelectorAll(".story-card").forEach(function (card) {
    card.addEventListener("click", function () {
      const s = byId[card.dataset.id];
      if (s) openModal(s, currentUser, onChange);
    });
  });
}

// =====================================================================
// 부트스트랩 — 페이지에 맞는 기능 자동 실행
// =====================================================================
(function () {
  const board = document.getElementById("story-board");
  const preview = document.getElementById("story-preview");
  if (board) initBoard(board);
  if (preview) initPreview(preview);
})();
