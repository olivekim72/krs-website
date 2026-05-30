// ===== Supabase 클라이언트 초기화 =====
// CDN(ESM)에서 직접 불러오므로 npm 설치/빌드가 필요 없습니다.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.KRS_CONFIG || {};

// 설정값이 아직 예시 그대로면 "미설정" 상태로 간주합니다.
export const isConfigured =
  !!cfg.SUPABASE_URL &&
  !!cfg.SUPABASE_ANON_KEY &&
  !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
  !cfg.SUPABASE_ANON_KEY.includes("YOUR-ANON");

export const supabase = isConfigured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
  : null;

// 스토리지 버킷 이름 (schema.sql 과 일치해야 함)
export const STORY_BUCKET = "story-images";
