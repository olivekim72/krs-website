// ===== 섹션별 사이트 콘텐츠 보드 (자료·이미지·텍스트, 날짜별 업데이트) =====
// 사용법: 페이지에 <div class="content-board" data-section="guide" data-label="장미 가꾸기 자료실"
//                       data-layout="list|grid"></div> 를 두고 이 모듈을 로드하세요.
// 권한(editor/executive/admin)이 있는 회원만 글·이미지·자료를 올릴 수 있고, 날짜 최신순으로 쌓입니다.
import { supabase, isConfigured } from "./supabase.js";
import { getUser, getProfile, canEditContent } from "./auth.js";

const BUCKET = "site-content";
const MAX_SIZE = 15 * 1024 * 1024;

function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
}
function todayStr() {
  // YYYY-MM-DD (브라우저 로컬 기준)
  const d = new Date();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}

function attHTML(atts) {
  if (!atts || !atts.length) return "";
  const items = atts.map(function (a) {
    const isImg = (a.type || "").indexOf("image/") === 0;
    if (isImg)
      return '<a class="att-img" href="' + esc(a.url) + '" target="_blank" rel="noopener"><img src="' + esc(a.url) + '" alt=""></a>';
    return '<a class="att-file" href="' + esc(a.url) + '" target="_blank" rel="noopener">📄 ' + esc(a.name) + "</a>";
  }).join("");
  return '<div class="att-wrap">' + items + "</div>";
}

async function uploadOne(file, section, userId) {
  const safe = (file.name || "file").replace(/[^\w.\-가-힣]+/g, "_");
  const path = section + "/" + (userId || "anon") + "/" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + "-" + safe;
  const up = await supabase.storage.from(BUCKET).upload(path, file);
  if (up.error) throw up.error;
  const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: pub.data.publicUrl, name: file.name, type: file.type || "" };
}

function initBoard(board) {
  const section = board.dataset.section;
  const label = board.dataset.label || "콘텐츠";
  const layout = board.dataset.layout || "list";
  if (!section) return;

  // Supabase 미설정이면 보드 숨김 (공개 페이지가 깔끔하게 유지됨)
  if (!isConfigured) { board.style.display = "none"; return; }

  board.innerHTML =
    '<div class="board-head">' +
      '<div><h2 class="content-label">' + esc(label) + "</h2>" +
      '<p class="content-sub">날짜순으로 자료·소식이 업데이트됩니다.</p></div>' +
      '<button class="btn btn-primary cb-new" style="background:var(--rose-deep);color:#fff;border:none;cursor:pointer;display:none;">＋ 새 글</button>' +
    "</div>" +
    '<form class="form-wrap cb-form" style="display:none;">' +
      '<input type="hidden" name="id">' +
      '<div class="form-row">' +
        '<div class="field" style="flex:2;"><label>제목 *</label><input type="text" name="title" required></div>' +
        '<div class="field" style="flex:1;"><label>날짜</label><input type="date" name="content_date"></div>' +
      "</div>" +
      '<div class="field"><label>내용</label><textarea name="body" placeholder="자료 설명·소식을 입력하세요."></textarea></div>' +
      '<div class="field"><label>대표 이미지 (선택)</label><input type="file" name="image" accept="image/*"></div>' +
      '<div class="field"><label>첨부 파일·이미지 (여러 개 가능)</label>' +
        '<input type="file" name="files" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.zip"></div>' +
      '<div style="display:flex;gap:12px;">' +
        '<button type="submit" class="btn btn-primary" style="background:var(--rose-deep);color:#fff;border:none;cursor:pointer;flex:1;">저장</button>' +
        '<button type="button" class="btn cb-cancel" style="background:none;border:1px solid var(--line);color:var(--gray);">취소</button>' +
      "</div>" +
    "</form>" +
    '<div class="cb-status"></div>' +
    '<div class="' + (layout === "grid" ? "content-grid" : "content-list") + ' cb-list"></div>';

  const newBtn = board.querySelector(".cb-new");
  const form = board.querySelector(".cb-form");
  const list = board.querySelector(".cb-list");
  const status = board.querySelector(".cb-status");

  let canEdit = false;

  newBtn.addEventListener("click", function () {
    form.reset();
    form.elements.id.value = "";
    form.elements.content_date.value = todayStr();
    form.style.display = form.style.display === "none" ? "block" : "none";
  });
  form.querySelector(".cb-cancel").addEventListener("click", function () {
    form.reset(); form.style.display = "none";
  });

  function cardHTML(c) {
    const img = c.image_url
      ? '<div class="content-img" style="background-image:url(\'' + esc(c.image_url) + "')\"></div>"
      : "";
    const body = c.body ? '<div class="content-body">' + esc(c.body).replace(/\n/g, "<br>") + "</div>" : "";
    const editBtns = canEdit
      ? '<div class="content-actions"><button class="row-btn cb-edit" data-id="' + c.id + '">수정</button>' +
        '<button class="row-btn del cb-del" data-id="' + c.id + '">삭제</button></div>'
      : "";
    return (
      '<article class="content-card">' +
        '<div class="content-date">📅 ' + fmtDate(c.content_date) + "</div>" +
        img +
        "<h3>" + esc(c.title) + "</h3>" +
        body +
        attHTML(c.attachments) +
        '<div class="content-meta">' + (c.author_name ? "✍️ " + esc(c.author_name) : "") + "</div>" +
        editBtns +
      "</article>"
    );
  }

  async function load() {
    const res = await supabase
      .from("site_contents")
      .select("*")
      .eq("section", section)
      .order("content_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (res.error) {
      list.innerHTML = '<p style="color:var(--gray)">불러오기 실패: ' + esc(res.error.message) + "</p>";
      return;
    }
    const rows = res.data || [];
    if (!rows.length) {
      list.innerHTML = '<p class="content-empty">아직 등록된 자료가 없습니다.' +
        (canEdit ? ' "＋ 새 글" 로 첫 자료를 올려보세요.' : "") + "</p>";
      return;
    }
    list.innerHTML = rows.map(cardHTML).join("");
    if (canEdit) {
      const byId = {};
      rows.forEach(function (r) { byId[r.id] = r; });
      list.querySelectorAll(".cb-edit").forEach(function (b) {
        b.addEventListener("click", function () { openEdit(byId[b.dataset.id]); });
      });
      list.querySelectorAll(".cb-del").forEach(function (b) {
        b.addEventListener("click", async function () {
          if (!confirm("이 자료를 삭제할까요?")) return;
          const r = await supabase.from("site_contents").delete().eq("id", b.dataset.id);
          if (r.error) { alert("삭제 실패: " + r.error.message); return; }
          await load();
        });
      });
    }
  }

  function openEdit(c) {
    form.elements.id.value = c.id;
    form.elements.title.value = c.title || "";
    form.elements.content_date.value = c.content_date || todayStr();
    form.elements.body.value = c.body || "";
    form.elements.image.value = "";
    form.elements.files.value = "";
    form.dataset.keepImage = c.image_url || "";
    form.dataset.keepAtts = JSON.stringify(c.attachments || []);
    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const user = await getUser();
    const profile = await getProfile();

    const imgFile = form.elements.image.files[0];
    const files = form.elements.files.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) { status.innerHTML = '<div class="notice notice-warn">⚠️ 파일은 개당 15MB 이하만 가능합니다.</div>'; return; }
    }
    if (imgFile && imgFile.size > MAX_SIZE) { status.innerHTML = '<div class="notice notice-warn">⚠️ 이미지는 15MB 이하만 가능합니다.</div>'; return; }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = "저장 중…";

    try {
      const editing = form.elements.id.value;
      let imageUrl = editing ? (form.dataset.keepImage || null) : null;
      if (imgFile) { const up = await uploadOne(imgFile, section, user && user.id); imageUrl = up.url; }

      let atts = editing && form.dataset.keepAtts ? JSON.parse(form.dataset.keepAtts) : [];
      for (let i = 0; i < files.length; i++) {
        atts.push(await uploadOne(files[i], section, user && user.id));
      }

      const payload = {
        section: section,
        title: form.elements.title.value.trim(),
        body: form.elements.body.value.trim(),
        content_date: form.elements.content_date.value || todayStr(),
        image_url: imageUrl,
        attachments: atts,
        author_name: (profile && profile.nickname) || "편집자",
      };

      let res;
      if (editing) {
        res = await supabase.from("site_contents").update(payload).eq("id", editing);
      } else {
        payload.author_id = user ? user.id : null;
        res = await supabase.from("site_contents").insert(payload);
      }
      if (res.error) throw res.error;

      form.reset(); form.style.display = "none";
      delete form.dataset.keepImage; delete form.dataset.keepAtts;
      status.innerHTML = '<div class="notice notice-ok">✅ 저장되었습니다.</div>';
      setTimeout(function () { status.innerHTML = ""; }, 3000);
      await load();
    } catch (err) {
      console.error(err);
      status.innerHTML = '<div class="notice notice-warn">저장 실패: ' + esc(err.message || err) + "</div>";
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = "저장";
    }
  });

  // 편집 권한 확인 후 버튼 노출
  canEditContent().then(function (ok) {
    canEdit = ok;
    if (ok) newBtn.style.display = "";
    load();
  });
}

// 페이지의 모든 콘텐츠 보드 초기화
(function () {
  const boards = document.querySelectorAll(".content-board");
  boards.forEach(initBoard);
})();
