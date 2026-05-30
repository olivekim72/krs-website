// ===== Supabase 설정 =====
// 아래 두 값을 본인 Supabase 프로젝트 값으로 채우세요.
// (방법: "스토리업로드방법.md" 참고 / anon key 는 공개되어도 안전합니다 — RLS 로 보호)

window.KRS_CONFIG = {
  SUPABASE_URL: "https://mdvjbbnrisiddaxrgvme.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdmpiYm5yaXNpZGRheHJndm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwODIwNDgsImV4cCI6MjA5NTY1ODA0OH0.lmaSmLIO31PouGxsQfRXVHYNUEiEdiLcuqk6dq4Fi2c",

  // ----- 네이버 카페 최신글 (선택) -----
  // 카페 게시판 RSS 주소를 넣으면 홈에서 최신글을 자동으로 불러옵니다.
  // (RSS 가 공개된 게시판만 가능. 비워두면 data/cafe.json 목록을 표시합니다.)
  CAFE_URL: "https://cafe.naver.com/korearose",
  CAFE_RSS_URL: "",
};
