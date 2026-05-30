# 🚀 Vercel + Supabase 로 웹서비스 배포하기

이 홈페이지는 **빌드가 필요 없는 정적 사이트 + Supabase(인증·DB·이미지)** 구조입니다.
Vercel 에 그대로 올리면 누구나 접속할 수 있는 웹서비스가 됩니다. (약 15분)

---

## 0단계 — 미리 준비 (필수)

1. **Supabase 준비 완료** — `스토리업로드방법.md` 를 따라
   - `supabase/schema.sql` 실행(테이블·권한·버킷 생성)
   - Authentication > Email 의 "Confirm email" 설정 확인
2. **`js/config.js` 에 실제 값 입력**
   ```js
   window.KRS_CONFIG = {
     SUPABASE_URL: "https://실제프로젝트.supabase.co",
     SUPABASE_ANON_KEY: "실제-anon-public-키",
     CAFE_URL: "https://cafe.naver.com/korearose",
     CAFE_RSS_URL: "",
   };
   ```
   > ✅ `anon` 키는 공개되어도 안전합니다(RLS 로 보호). 깃에 올려도 됩니다.
   > ⛔ `service_role`(비밀) 키는 **절대** 넣지 마세요.

---

## 방법 A — GitHub + Vercel (추천, 자동 재배포)

### A-1. GitHub 에 코드 올리기
이 폴더(`krs-website`)를 GitHub 저장소로 올립니다.
- GitHub Desktop 앱을 쓰거나, 터미널에서:
  ```bash
  git init
  git add .
  git commit -m "한국장미회 홈페이지"
  git branch -M main
  git remote add origin https://github.com/<내계정>/krs-website.git
  git push -u origin main
  ```

### A-2. Vercel 로 배포
1. https://vercel.com 가입(GitHub 계정으로 로그인하면 편함).
2. **Add New… → Project → 방금 만든 저장소 Import**.
3. 설정 화면에서:
   - **Framework Preset: Other**
   - **Root Directory: ./** (그대로)
   - **Build Command / Output: 비워둠** (정적 사이트라 빌드 없음)
4. **Deploy** 클릭 → 1~2분 후 `https://krs-website-xxxx.vercel.app` 주소가 생성됩니다.

> 이후 GitHub 에 push 할 때마다 **자동으로 다시 배포**됩니다.

---

## 방법 B — Vercel CLI (깃허브 없이 빠르게)

1. Node.js 설치 후 터미널에서:
   ```bash
   npm i -g vercel
   cd krs-website
   vercel          # 첫 실행 시 로그인 → 질문은 기본값 Enter
   vercel --prod   # 운영 배포
   ```
2. 출력되는 `.vercel.app` 주소가 서비스 주소입니다.

---

## 1단계 — 배포 후 Supabase 설정 (중요)

배포 주소(예: `https://krs-website.vercel.app`)가 생기면 Supabase 에 등록합니다.

1. Supabase > **Authentication > URL Configuration**
   - **Site URL**: `https://krs-website.vercel.app`
   - **Redirect URLs** 에도 같은 주소 추가
2. (이메일 인증을 쓰는 경우) 인증 메일의 링크가 이 주소로 돌아오게 됩니다.

> Supabase 는 키 + RLS 로 보안하므로 도메인별 CORS 설정은 따로 필요 없습니다.
> Vercel 주소에서 바로 로그인·스토리·파일이 동작합니다.

---

## 2단계 — (선택) 내 도메인 연결

Vercel 프로젝트 > **Settings > Domains** 에서 `korearose.org` 같은 도메인을 연결할 수 있습니다.
도메인을 연결하면, 위 1단계의 Supabase Site URL 도 그 도메인으로 바꿔주세요.

---

## 업데이트하는 법

- **방법 A**: 파일 수정 → GitHub 에 push → 자동 재배포.
- **방법 B**: 파일 수정 → `vercel --prod` 다시 실행.

행사/굿즈/카페글은 `data/*.json`, 내용은 각 `.html` 만 고치면 됩니다. (빌드 불필요)

---

## 점검 체크리스트
- [ ] `js/config.js` 에 실제 Supabase URL·anon 키 입력
- [ ] `supabase/schema.sql` 실행 완료(테이블·RLS·버킷)
- [ ] 본인 계정 `profiles.role` = `admin` 지정(회원관리/위원회 접근)
- [ ] 배포 후 Supabase Site URL/Redirect URL 에 Vercel 주소 등록
- [ ] 가입 → 로그인 → 스토리 업로드 → 다른 기기에서 공유 확인
