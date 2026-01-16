-- =====================================================
-- Newsletters HTML Content Column
-- 뉴스레터 HTML 콘텐츠 저장 컬럼 추가
-- Created: 2026-01-16
-- =====================================================

-- HTML 콘텐츠 저장 컬럼 추가
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS html_content TEXT;

-- 콘텐츠 소스 구분 (stibee: 스티비에서 가져옴, custom: 직접 수정됨)
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS content_source VARCHAR(20) DEFAULT 'stibee';

COMMENT ON COLUMN newsletters.html_content IS '뉴스레터 HTML 콘텐츠';
COMMENT ON COLUMN newsletters.content_source IS '콘텐츠 소스 (stibee: 원본, custom: 수정됨)';
