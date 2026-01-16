-- =====================================================
-- Newsletter HTML Content Column
-- 뉴스레터 HTML 본문 저장을 위한 컬럼 추가
-- Created: 2026-01-16
-- =====================================================

-- HTML 본문 컬럼 추가
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS html_content TEXT;

COMMENT ON COLUMN newsletters.html_content IS '뉴스레터 HTML 본문 - 스티비에서 가져온 전체 HTML';
