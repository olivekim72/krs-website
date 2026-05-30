// ===== 인증(로그인/회원가입/로그아웃) + 네비 로그인상태 표시 =====
import { supabase, isConfigured } from "./supabase.js";

export { isConfigured };

// 현재 로그인한 사용자 (없으면 null)
export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return (data && data.user) || null;
}

// 표시용 닉네임
export function nicknameOf(user) {
  if (!user) return "회원";
  return (
    (user.user_metadata && user.user_metadata.nickname) ||
    (user.email ? user.email.split("@")[0] : "회원")
  );
}

// ===== 역할(권한) =====
// member(일반) < operating(운영위원) < executive(집행위원) < admin(관리자)
export const ROLE_LABEL = {
  member: "일반회원",
  editor: "콘텐츠 편집자",
  operating: "운영위원",
  executive: "집행위원",
  admin: "관리자",
};

// 사이트 콘텐츠(자료·이미지·텍스트)를 편집할 수 있는 역할
export const EDITOR_ROLES = ["editor", "executive", "admin"];
export async function canEditContent() {
  const role = await getRole();
  return EDITOR_ROLES.indexOf(role) !== -1;
}

let _profileCache = null;
export async function getProfile() {
  if (!supabase) return null;
  const user = await getUser();
  if (!user) { _profileCache = null; return null; }
  if (_profileCache && _profileCache.user_id === user.id) return _profileCache;
  const res = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  _profileCache = (res.data) || { user_id: user.id, role: "member", nickname: nicknameOf(user) };
  return _profileCache;
}
export async function getRole() {
  const p = await getProfile();
  return p ? (p.role || "member") : null;
}

// 비공개 페이지별 접근 가능 역할
export const PAGE_ACCESS = {
  members:   ["executive", "admin"],               // 회원관리
  operating: ["operating", "executive", "admin"],  // 운영위원회
  executive: ["executive", "admin"],               // 집행위원회
};

// 비공개 페이지 가드 — 컨테이너에 결과를 그려주고, 통과시 true 반환
export async function guardPage(allowedRoles, mountId) {
  const mount = document.getElementById(mountId);
  if (!isConfigured) {
    if (mount) mount.innerHTML =
      '<div class="notice notice-warn"><b>⚙️ 설정이 필요합니다.</b> <code>js/config.js</code> 에 Supabase 정보를 입력하세요. (스토리업로드방법.md 참고)</div>';
    return false;
  }
  const user = await getUser();
  if (!user) {
    if (mount) mount.innerHTML =
      '<div class="notice">이 영역은 회원 전용입니다. 먼저 <a href="login.html"><b>로그인</b></a> 해주세요.</div>';
    return false;
  }
  const role = await getRole();
  if (allowedRoles.indexOf(role) === -1) {
    if (mount) mount.innerHTML =
      '<div class="notice notice-warn">🔒 <b>접근 권한이 없습니다.</b><br>이 영역은 ' +
      allowedRoles.map(function (r) { return ROLE_LABEL[r]; }).join(" · ") +
      ' 전용입니다. 현재 등급: <b>' + (ROLE_LABEL[role] || role) + "</b>. 권한이 필요하면 사무국(관리자)에 문의하세요.</div>";
    return false;
  }
  if (mount) mount.innerHTML = "";
  return true;
}

// 네비게이션의 "회원 전용" 드롭다운을 역할에 맞게 구성
async function renderMemberMenu() {
  const menu = document.getElementById("member-menu");
  const list = document.getElementById("member-menu-list");
  if (!menu || !list) return;
  const role = await getRole();
  const items = [];
  if (role && PAGE_ACCESS.members.indexOf(role) !== -1)
    items.push('<li><a href="members.html">회원관리</a></li>');
  if (role && PAGE_ACCESS.operating.indexOf(role) !== -1)
    items.push('<li><a href="committee-operating.html">운영위원회</a></li>');
  if (role && PAGE_ACCESS.executive.indexOf(role) !== -1)
    items.push('<li><a href="committee-executive.html">집행위원회</a></li>');
  if (items.length) {
    list.innerHTML = items.join("");
    menu.style.display = "";
  } else {
    menu.style.display = "none";
  }
}

// 회원가입 (닉네임을 user_metadata 에 저장)
export async function signUp(email, password, nickname) {
  if (!supabase) throw new Error("Supabase 미설정");
  return await supabase.auth.signUp({
    email: email,
    password: password,
    options: { data: { nickname: nickname } },
  });
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase 미설정");
  return await supabase.auth.signInWithPassword({ email: email, password: password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// 네비게이션의 #auth-slot 을 로그인 상태에 맞게 갱신
async function renderAuthSlot() {
  const slot = document.getElementById("auth-slot");
  if (!slot) return;
  const user = await getUser();
  if (user) {
    slot.innerHTML =
      '<span class="auth-name">🌹 ' + nicknameOf(user) + "님</span>" +
      ' <a href="#" id="logout-link" class="auth-link">로그아웃</a>';
    const link = document.getElementById("logout-link");
    if (link) {
      link.addEventListener("click", async function (e) {
        e.preventDefault();
        await signOut();
        location.href = "index.html";
      });
    }
  } else {
    slot.innerHTML = '<a href="login.html" class="auth-link">로그인</a>';
  }
}

// 페이지 로드시 갱신 (layout.js 가 먼저 #auth-slot / #member-menu 를 주입함)
renderAuthSlot();
renderMemberMenu();
if (supabase) {
  supabase.auth.onAuthStateChange(function () {
    _profileCache = null; // 역할 캐시 초기화
    renderAuthSlot();
    renderMemberMenu();
  });
}
