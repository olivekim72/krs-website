-- 관리자 계정(korea-rose@naver.com) 이메일 인증 강제 + admin 권한 보장
-- (Supabase 기본 이메일 인증이 켜져 있어 로그인이 막힌 경우 해제용)

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where lower(email) = 'korea-rose@naver.com';

update public.profiles
set role = 'admin'
where user_id in (select id from auth.users where lower(email) = 'korea-rose@naver.com');
