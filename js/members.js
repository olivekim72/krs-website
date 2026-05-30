// ===== 회원관리 명부 (집행위원 · 관리자 전용) =====
import { supabase } from "./supabase.js";
import { guardPage, PAGE_ACCESS } from "./auth.js";

function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

(async function () {
  const app = document.getElementById("members-app");
  if (!app) return;

  const ok = await guardPage(PAGE_ACCESS.members, "members-gate");
  if (!ok) return;
  app.style.display = "";

  const form = document.getElementById("member-form");
  const addBtn = document.getElementById("add-member-btn");
  const table = document.getElementById("members-table");
  const status = document.getElementById("members-status");
  let editingId = null;

  function setStatus(type, text) {
    status.innerHTML = text
      ? '<div class="notice ' + (type === "ok" ? "notice-ok" : "notice-warn") + '">' + text + "</div>"
      : "";
  }

  const formTitle = document.getElementById("member-form-title");
  function openForm(member) {
    editingId = member ? member.id : null;
    if (formTitle) formTitle.textContent = member ? "회원 정보 수정" : "회원 추가";
    form.elements.name.value = member ? member.name || "" : "";
    form.phone.value = member ? member.phone || "" : "";
    form.address.value = member ? member.address || "" : "";
    form.email.value = member ? member.email || "" : "";
    form.member_type.value = member ? member.member_type || "일반회원" : "일반회원";
    form.fee_paid.checked = member ? !!member.fee_paid : false;
    form.join_date.value = member && member.join_date ? member.join_date : "";
    form.note.value = member ? member.note || "" : "";
    form.style.display = "block";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  addBtn.addEventListener("click", function () { openForm(null); });
  form.querySelector(".cancel-btn").addEventListener("click", function () {
    form.style.display = "none"; editingId = null;
  });

  async function load() {
    const res = await supabase
      .from("members")
      .select("*")
      .order("join_date", { ascending: false, nullsFirst: false });
    if (res.error) {
      table.innerHTML = "";
      setStatus("warn", "불러오기 실패: " + esc(res.error.message));
      return;
    }
    const rows = res.data || [];
    const head =
      "<thead><tr>" +
      ["이름", "연락처", "주소", "이메일", "구분", "회비", "입회일", "비고", ""]
        .map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead>";
    const body = rows.length
      ? rows.map(function (m) {
          return (
            "<tr>" +
            "<td><b>" + esc(m.name) + "</b></td>" +
            "<td>" + esc(m.phone) + "</td>" +
            "<td>" + esc(m.address) + "</td>" +
            "<td>" + esc(m.email) + "</td>" +
            "<td>" + esc(m.member_type) + "</td>" +
            "<td>" + (m.fee_paid ? '<span class="fee-yes">납부</span>' : '<span class="fee-no">미납</span>') + "</td>" +
            "<td>" + esc(m.join_date) + "</td>" +
            "<td>" + esc(m.note) + "</td>" +
            '<td><button class="row-btn" data-edit="' + m.id + '">수정</button>' +
            '<button class="row-btn del" data-del="' + m.id + '">삭제</button></td>' +
            "</tr>"
          );
        }).join("")
      : '<tr><td colspan="9" style="text-align:center;color:var(--gray);padding:30px;">등록된 회원이 없습니다. "+ 회원 추가"로 등록하세요.</td></tr>';
    table.innerHTML = head + "<tbody>" + body + "</tbody>";

    // 통계
    const paid = rows.filter(function (m) { return m.fee_paid; }).length;
    setStatus("ok", "총 <b>" + rows.length + "</b>명 · 회비 납부 <b>" + paid + "</b>명 / 미납 <b>" + (rows.length - paid) + "</b>명");

    table.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        const m = rows.find(function (x) { return x.id === b.dataset.edit; });
        if (m) openForm(m);
      });
    });
    table.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (!confirm("이 회원을 삭제할까요?")) return;
        const r = await supabase.from("members").delete().eq("id", b.dataset.del);
        if (r.error) { alert("삭제 실패: " + r.error.message); return; }
        await load();
      });
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const payload = {
      name: form.elements.name.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      email: form.email.value.trim(),
      member_type: form.member_type.value,
      fee_paid: form.fee_paid.checked,
      join_date: form.join_date.value || null,
      note: form.note.value.trim(),
    };
    let res;
    if (editingId) res = await supabase.from("members").update(payload).eq("id", editingId);
    else res = await supabase.from("members").insert(payload);
    if (res.error) { setStatus("warn", "저장 실패: " + esc(res.error.message)); return; }
    form.reset(); form.style.display = "none"; editingId = null;
    await load();
  });

  await load();
})();
