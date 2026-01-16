-- 외부 가이드 (PDF/URL) 지원을 위한 컬럼 추가
-- 적용 순서: 기획형 -> 4주 -> 올영

-- =====================================================
-- 1. 기획형 캠페인용 외부 가이드 컬럼
-- =====================================================

-- 가이드 전달 모드 (ai: AI 생성, external: 외부 파일/URL)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_delivery_mode TEXT DEFAULT 'ai';

-- 외부 가이드 URL (구글 슬라이드/시트/독스 등)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_guide_url TEXT;

-- 외부 가이드 파일 URL (Supabase Storage에 업로드된 PDF 등)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_guide_file_url TEXT;

-- 외부 가이드 타입 (pdf, google_slides, google_sheets, google_docs, other)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_guide_type TEXT;

-- 외부 가이드 제목 (크리에이터에게 표시용)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_guide_title TEXT;

-- 외부 가이드 파일 원본 이름
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_guide_file_name TEXT;

-- =====================================================
-- 2. 4주 챌린지용 주차별 외부 가이드 컬럼 (향후 적용)
-- =====================================================

-- Week 1
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_name TEXT;

-- Week 2
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_name TEXT;

-- Week 3
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_name TEXT;

-- Week 4
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_name TEXT;

-- =====================================================
-- 3. 올리브영용 STEP별 외부 가이드 컬럼 (향후 적용)
-- =====================================================

-- Step 1
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_external_file_name TEXT;

-- Step 2
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_external_file_name TEXT;

-- Step 3
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_guide_mode TEXT DEFAULT 'ai';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_external_title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_external_file_name TEXT;

-- =====================================================
-- 코멘트 추가
-- =====================================================

COMMENT ON COLUMN campaigns.guide_delivery_mode IS '가이드 전달 모드: ai(AI 생성) | external(외부 파일/URL)';
COMMENT ON COLUMN campaigns.external_guide_url IS '외부 가이드 URL (구글 슬라이드/시트/독스)';
COMMENT ON COLUMN campaigns.external_guide_file_url IS 'Supabase Storage에 업로드된 PDF 파일 URL';
COMMENT ON COLUMN campaigns.external_guide_type IS '외부 가이드 타입: pdf | google_slides | google_sheets | google_docs | other';
COMMENT ON COLUMN campaigns.external_guide_title IS '외부 가이드 제목 (크리에이터 표시용)';
COMMENT ON COLUMN campaigns.external_guide_file_name IS '업로드된 파일 원본 이름';
