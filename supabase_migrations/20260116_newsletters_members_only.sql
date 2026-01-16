-- =====================================================
-- Newsletters Members Only Column
-- 뉴스레터 회원 전용 컬럼 추가
-- Created: 2026-01-16
-- =====================================================

-- 회원 전용 컬럼 추가
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS is_members_only BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN newsletters.is_members_only IS '회원 전용 여부 (true: 로그인 필요)';
