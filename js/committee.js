// ===== 위원회 비공개 게시판 (운영위원회 / 집행위원회) =====
// 페이지의 #committee-app 요소에 data-committee="operating" | "executive" 를 설정합니다.
// 문서·이미지 첨부는 비공개 버킷(committee-files)에 저장하고, 권한 있는 회원만 서명 URL로 봅니다.
import { supabase } from "./supabase.js";
import { getUser, getProfile, guardPage, PAGE_ACCESS } from "./auth.js";

const BUCKET = "committee-files";
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function fmtDate(s) {
  const d = new Date(s);
  return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate();
}

(async function () {
  const app = document.getElementById("committee-app");
  if (!app) return;

  const committee = app.dataset.committee; // 'operating' | 'executive'
  const allowed = committee === "operating" ? PAGE_ACCESS.operating : PAGE_ACCESS.executive;

  const ok = await guardPage(allowed, "committee-gate");
  if (!ok) return;
  app.style.display = "";

  const form = document.getElementById("committee-form");
  const newBtn = document.getElementById("committee-new-btn");
  const list = document.getElementById("committee-posts");
  const status = document.getElementById("committee-status");
  const fileInput = form.elements.files;

  const user = await getUser();
  const profile = await getProfile();
  const myName = (profile && profile.nickname) || "위원";

  newBtn.addEventListener("click", function () {
    form.style.display = form.style.display === "none" ? "block" : "none";
  });
  form.querySelector(".cancel-btn").addEventListener("click", function () {
    form.reset(); form.style.display = "none";
  });

  // ----- 첨부 업로드 -----
  async function uploadFiles(files) {
    const atts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safe = (file.name || "file").replace(/[^\w.\-가-힣]+/g, "_");
      const path = committee + "/" + user.id + "/" + Date.now() + "-" + i + "-" + safe;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      atts.push({ path: path, name: file.name, type: file.type || "" });
    }
    return atts;
  }

  // ----- 첨부 렌더 (서명 URL 매핑 signed[path] 사용) -----
  function attachmentsHTML(atts, signed) {
    if (!atts || !atts.length) return "";
    const items = atts.map(function (a) {
      const url = signed[a.path];
      const isImg = (a.type || "").indexOf("image/") === 0;
      if (!url) return '<span class="att-file">📎 ' + esc(a.name) + " (열 수 없음)</span>";
      if (isImg)
        return '<a href="' + url + '" target="_blank" rel="noopener" class="att-img"><img src="' + url + '" alt="' + esc(a.name) + '" loading="lazy"></a>';
      return '<a href="' + url + '" target="_blank" rel="noopener" class="att-file">📄 ' + esc(a.name) + "</a>";
    }).join("");
    return '<div class="att-wrap">' + items + "</div>";
  }

  async function load() {
    const res = await supabase
      .from("committee_posts")
      .select("*")
      .eq("committee", committee)
      .order("created_at", { ascending: false });
    if (res.error) {
      list.innerHTML = '<p style="color:var(--gray)">불러오기 실패: ' + esc(res.error.message) + "</p>";
      return;
    }
    const posts = res.data || [];
    if (!posts.length) {
      list.innerHTML = '<p style="color:var(--gray);text-align:center;padding:24px;">아직 게시글이 없습니다. 첫 안건이나 자료를 올려보세요.</p>';
      return;
    }

    // 모든 첨부 경로에 대해 서명 URL 일괄 생성 (1시간 유효)
    const paths = [];
    posts.forEach(function (p) {
      (p.attachments || []).forEach(function (a) { if (a && a.path) paths.push(a.path); });
    });
    const signed = {};
    if (paths.length) {
      const sres = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (sres.data) sres.data.forEach(function (d) { if (d.path && d.signedUrl) signed[d.path] = d.signedUrl; });
    }

    list.innerHTML = posts.map(function (p) {
      const canDel = (user && p.author_id === user.id) || (profile && (profile.role === "executive" || profile.role === "admin"));
      return (
        '<div class="post-item">' +
          (canDel ? '<button class="post-del" data-del="' + p.id + '">삭제</button>' : "") +
          "<h4>" + esc(p.title) + "</h4>" +
          '<div class="post-meta">✍️ ' + esc(p.author_name) + " · " + fmtDate(p.created_at) + "</div>" +
          '<div class="post-body">' + esc(p.content) + "</div>" +
          attachmentsHTML(p.attachments, signed) +
        "</div>"
      );
    }).join("");

    list.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!confirm("이 글을 삭제할까요?")) return;
        const r = await supabase.from("committee_posts").delete().eq("id", b.dataset.del);
        if (r.error) { alert("삭제 실패: " + r.error.message); return; }
        await load();
      });
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const files = fileInput && fileInput.files ? fileInput.files : [];

    // 용량 점검
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > MAX_SIZE) {
        status.innerHTML = '<div class="notice notice-warn">⚠️ "' + esc(files[i].name) + '" 파일이 너무 큽니다. (개당 15MB 이하)</div>';
        return;
      }
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = files.length ? "업로드 중…" : "등록 중…";

    try {
      let atts = [];
      if (files.length) atts = await uploadFiles(files);

      const res = await supabase.from("committee_posts").insert({
        committee: committee,
        author_id: user.id,
        author_name: myName,
        title: form.elements.title.value.trim(),
        content: form.elements.content.value.trim(),
        attachments: atts,
      });
      if (res.error) throw res.error;

      form.reset(); form.style.display = "none";
      status.innerHTML = '<div class="notice notice-ok">✅ 등록되었습니다.' + (atts.length ? " (첨부 " + atts.length + "개)" : "") + "</div>";
      setTimeout(function () { status.innerHTML = ""; }, 3500);
      await load();
    } catch (err) {
      console.error(err);
      status.innerHTML = '<div class="notice notice-warn">등록 실패: ' + esc(err.message || err) + "</div>";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "등록";
    }
  });

  await load();
})();
