-- ============================================================
--  한국장미회 — 회원 스토리 Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run] 하세요.
-- ============================================================

-- 1) 스토리 테이블 --------------------------------------------
create table if not exists public.stories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  category    text not null default '자유글',
  title       text not null,
  content     text not null,
  image_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists stories_created_at_idx on public.stories (created_at desc);

-- 2) 행 수준 보안(RLS) ----------------------------------------
alter table public.stories enable row level security;

-- 읽기: 누구나 가능 (비회원도 스토리 열람)
drop policy if exists "stories read all" on public.stories;
create policy "stories read all"
  on public.stories for select
  using (true);

-- 쓰기: 로그인한 본인 글만
drop policy if exists "stories insert own" on public.stories;
create policy "stories insert own"
  on public.stories for insert
  with check (auth.uid() = user_id);

drop policy if exists "stories update own" on public.stories;
create policy "stories update own"
  on public.stories for update
  using (auth.uid() = user_id);

drop policy if exists "stories delete own" on public.stories;
create policy "stories delete own"
  on public.stories for delete
  using (auth.uid() = user_id);

-- 3) 이미지 스토리지 버킷 -------------------------------------
insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', true)
on conflict (id) do nothing;

-- 버킷 정책
drop policy if exists "story images public read" on storage.objects;
create policy "story images public read"
  on storage.objects for select
  using (bucket_id = 'story-images');

drop policy if exists "story images authed upload" on storage.objects;
create policy "story images authed upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'story-images');

drop policy if exists "story images owner delete" on storage.objects;
create policy "story images owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'story-images' and owner = auth.uid());

-- ============================================================
--  4) 회원 등급(역할) — profiles
--     member(일반) < operating(운영위원) < executive(집행위원) < admin(관리자)
-- ============================================================
create table if not exists public.profiles (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  role     text not null default 'member'
           check (role in ('member','operating','executive','admin')),
  created_at timestamptz not null default now()
);

-- 가입 시 profiles 행 자동 생성
--  · 관리자 이메일(아래 목록)로 가입하면 자동으로 'admin' 권한 부여
--  · 그 외는 'member'
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, nickname, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email,'@',1)),
          case when lower(new.email) in ('korea-rose@naver.com')
               then 'admin' else 'member' end)
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 현재 로그인 사용자의 역할 (RLS 재귀 방지를 위해 security definer)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where user_id = auth.uid()), 'member');
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles read self or staff" on public.profiles;
create policy "profiles read self or staff"
  on public.profiles for select
  using (user_id = auth.uid() or public.my_role() in ('executive','admin'));

-- 등급 변경은 관리자만 (일반 가입자는 트리거로만 생성됨)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
  on public.profiles for update
  using (public.my_role() = 'admin');

-- ============================================================
--  5) 회원관리 명부 — members  (집행위원 · 관리자만 접근)
-- ============================================================
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  email       text,
  member_type text default '일반회원',
  fee_paid    boolean not null default false,
  join_date   date,
  note        text,
  created_at  timestamptz not null default now()
);

alter table public.members enable row level security;

drop policy if exists "members staff all" on public.members;
create policy "members staff all"
  on public.members for all
  using (public.my_role() in ('executive','admin'))
  with check (public.my_role() in ('executive','admin'));

-- ============================================================
--  6) 위원회 게시판 — committee_posts
--     committee = 'operating'(운영위원회) | 'executive'(집행위원회)
-- ============================================================
create table if not exists public.committee_posts (
  id          uuid primary key default gen_random_uuid(),
  committee   text not null check (committee in ('operating','executive')),
  author_name text not null,
  author_id   uuid references auth.users (id) on delete set null,
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists committee_posts_idx on public.committee_posts (committee, created_at desc);

alter table public.committee_posts enable row level security;

-- 운영위원회: 운영위원/집행위원/관리자 / 집행위원회: 집행위원/관리자
drop policy if exists "committee read" on public.committee_posts;
create policy "committee read"
  on public.committee_posts for select
  using (
    (committee = 'operating' and public.my_role() in ('operating','executive','admin'))
    or (committee = 'executive' and public.my_role() in ('executive','admin'))
  );

drop policy if exists "committee write" on public.committee_posts;
create policy "committee write"
  on public.committee_posts for insert
  with check (
    author_id = auth.uid() and (
      (committee = 'operating' and public.my_role() in ('operating','executive','admin'))
      or (committee = 'executive' and public.my_role() in ('executive','admin'))
    )
  );

drop policy if exists "committee delete own or admin" on public.committee_posts;
create policy "committee delete own or admin"
  on public.committee_posts for delete
  using (author_id = auth.uid() or public.my_role() in ('executive','admin'));

-- ============================================================
--  7) 위원회 첨부파일 (문서·이미지 공유) — 비공개 버킷 + 서명 URL
-- ============================================================
-- 게시글에 첨부 메타데이터 배열 저장: [{ "path": "...", "name": "...", "type": "..." }]
alter table public.committee_posts
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- 비공개 버킷 (public=false → 권한 있는 회원만 서명 URL로 접근)
insert into storage.buckets (id, name, public)
values ('committee-files', 'committee-files', false)
on conflict (id) do nothing;

-- 파일 경로는 'operating/...' 또는 'executive/...' 로 시작하도록 업로드합니다.
drop policy if exists "committee files read" on storage.objects;
create policy "committee files read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'committee-files' and (
      (name like 'operating/%' and public.my_role() in ('operating','executive','admin'))
      or (name like 'executive/%' and public.my_role() in ('executive','admin'))
    )
  );

drop policy if exists "committee files upload" on storage.objects;
create policy "committee files upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'committee-files' and (
      (name like 'operating/%' and public.my_role() in ('operating','executive','admin'))
      or (name like 'executive/%' and public.my_role() in ('executive','admin'))
    )
  );

drop policy if exists "committee files delete" on storage.objects;
create policy "committee files delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'committee-files' and (owner = auth.uid() or public.my_role() in ('executive','admin'))
  );

-- ============================================================
--  8) 섹션별 사이트 콘텐츠 (자료·이미지·텍스트, 날짜별 업데이트)
--     협회소개/장미가꾸기/행사·정원/갤러리/굿즈 등 각 페이지에 콘텐츠 보드로 노출
-- ============================================================

-- 콘텐츠 편집 권한용 'editor' 역할 추가
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member','editor','operating','executive','admin'));

create table if not exists public.site_contents (
  id           uuid primary key default gen_random_uuid(),
  section      text not null,                        -- about|guide|events|gallery|shop ...
  title        text not null,
  body         text,
  image_url    text,                                 -- 대표 이미지
  attachments  jsonb not null default '[]'::jsonb,   -- [{url,name,type}]
  content_date date not null default current_date,   -- 날짜별 정렬 기준
  author_id    uuid references auth.users (id) on delete set null,
  author_name  text,
  created_at   timestamptz not null default now()
);
create index if not exists site_contents_idx
  on public.site_contents (section, content_date desc, created_at desc);

alter table public.site_contents enable row level security;

-- 읽기: 누구나 (공개 콘텐츠)
drop policy if exists "site_contents read" on public.site_contents;
create policy "site_contents read" on public.site_contents for select using (true);

-- 쓰기/수정/삭제: 편집자 · 임원 · 관리자
drop policy if exists "site_contents insert" on public.site_contents;
create policy "site_contents insert" on public.site_contents for insert
  with check (public.my_role() in ('editor','executive','admin'));
drop policy if exists "site_contents update" on public.site_contents;
create policy "site_contents update" on public.site_contents for update
  using (public.my_role() in ('editor','executive','admin'));
drop policy if exists "site_contents delete" on public.site_contents;
create policy "site_contents delete" on public.site_contents for delete
  using (public.my_role() in ('editor','executive','admin'));

-- 공개 이미지·자료 버킷
insert into storage.buckets (id, name, public)
values ('site-content', 'site-content', true)
on conflict (id) do nothing;

drop policy if exists "site-content read" on storage.objects;
create policy "site-content read" on storage.objects for select
  using (bucket_id = 'site-content');
drop policy if exists "site-content write" on storage.objects;
create policy "site-content write" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-content' and public.my_role() in ('editor','executive','admin'));
drop policy if exists "site-content delete" on storage.objects;
create policy "site-content delete" on storage.objects for delete to authenticated
  using (bucket_id = 'site-content' and public.my_role() in ('editor','executive','admin'));

-- ============================================================
--  ★ 관리자(어드민) 계정 지정
--    • 사이트 로그인 화면에서 아래 이메일로 "회원가입" 하면 자동으로 관리자가 됩니다.
--    • 이미 그 이메일로 가입돼 있다면, 아래 UPDATE 한 줄을 실행해 관리자로 승격하세요.
--    • 관리자 이메일을 바꾸려면 위 handle_new_user() 함수와 아래 줄의 이메일을 함께 수정하세요.
-- ============================================================
update public.profiles set role = 'admin'
where user_id in (select id from auth.users where lower(email) = 'korea-rose@naver.com');

-- ============================================================
--  완료! 이제 홈페이지에서 회원가입 → 로그인 → 스토리 업로드가 가능합니다.
--  (참고) 쉬운 테스트를 위해 Authentication > Providers > Email 에서
--         "Confirm email" 을 꺼두면 가입 즉시 로그인됩니다.
--
--  ▶ 등급(권한) 부여 방법:
--    Supabase > Table Editor > profiles 에서 해당 회원의 role 값을
--    operating / executive / admin 으로 바꾸면 됩니다.
--    (가장 먼저 본인 계정을 admin 으로 지정하세요.)
-- ============================================================
