// ===== Supabase 설정 예시 파일 =====
// 이 파일을 복사해서 같은 폴더에 "config.js" 로 저장한 뒤,
// 아래 두 값을 본인 Supabase 프로젝트 값으로 바꿔주세요.
//
//  - SUPABASE_URL      : 프로젝트 설정 > API > Project URL
//  - SUPABASE_ANON_KEY : 프로젝트 설정 > API > Project API keys > anon public
//
// ⚠️ anon key 는 웹에 공개되어도 안전합니다. (RLS 보안 정책으로 데이터가 보호됩니다)
// 자세한 방법은 "스토리업로드방법.md" 를 참고하세요.

window.KRS_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",

  // 네이버 카페 최신글 (선택): 공개 게시판 RSS 주소를 넣으면 홈에서 자동 표시.
  // 비워두면 data/cafe.json 의 목록을 보여줍니다.
  CAFE_URL: "https://cafe.naver.com/korearose",
  CAFE_RSS_URL: "",
};
