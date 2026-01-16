-- =====================================================
-- Newsletters Display Order Column
-- 뉴스레터 표시 순서 컬럼 추가
-- Created: 2026-01-16
-- =====================================================

-- 표시 순서 컬럼 추가
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 인덱스 추가 (정렬 성능 향상)
CREATE INDEX IF NOT EXISTS idx_newsletters_display_order ON newsletters(display_order);

COMMENT ON COLUMN newsletters.display_order IS '표시 순서 (낮을수록 먼저 표시)';
