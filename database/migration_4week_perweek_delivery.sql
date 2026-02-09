-- ============================================================================
-- 4주 챌린지 주차별 가이드 발송 지원을 위한 마이그레이션
-- 실행 대상: supabaseBiz (중앙 비즈니스 DB), supabaseKorea, supabaseUS, supabaseJapan
-- ============================================================================

-- 1. applications 테이블에 주차별 가이드 전달 상태 컬럼 추가
-- (이미 존재하면 무시됨)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_guide_delivered boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_guide_delivered_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_guide_delivered boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_guide_delivered_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_guide_delivered boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_guide_delivered_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_guide_delivered boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_guide_delivered_at timestamptz;

-- 2. applications 테이블에 main_channel (업로드 플랫폼) 컬럼 추가
ALTER TABLE applications ADD COLUMN IF NOT EXISTS main_channel text;

-- 3. campaigns 테이블에 주차별 가이드 관리 컬럼 추가
-- 주차별 마감일
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_deadline timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_deadline timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_deadline timestamptz;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_deadline timestamptz;

-- 주차별 가이드 모드 (ai | external)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_guide_mode text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_guide_mode text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_guide_mode text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_guide_mode text;

-- 주차별 외부 가이드 (PDF/URL)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_type text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_name text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_title text;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_type text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_name text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_title text;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_type text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_name text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_title text;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_type text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_name text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_title text;

-- 4주 챌린지 가이드 데이터 (JSONB)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_guide_data jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_guide_data_en jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_guide_data_ja jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_weekly_guides jsonb;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_weekly_guides_ai text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_base_guide text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_generated_at timestamptz;

-- ============================================================================
-- 사용법:
-- 1. Supabase 대시보드 > SQL Editor에서 이 파일 내용을 실행
-- 2. 모든 리전 DB에서 실행 필요:
--    - supabaseBiz (중앙)
--    - supabaseKorea (한국)
--    - supabaseUS (미국)
--    - supabaseJapan (일본)
--
-- IF NOT EXISTS를 사용하므로 여러 번 실행해도 안전합니다.
-- ============================================================================
