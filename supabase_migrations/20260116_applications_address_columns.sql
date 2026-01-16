-- =====================================================
-- Applications Address Columns
-- 지원자 주소 관련 컬럼 추가
-- Created: 2026-01-16
-- =====================================================

-- 우편번호 컬럼 추가
ALTER TABLE applications ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- 기본 주소 컬럼 (이미 있을 수 있음)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS address TEXT;

-- 연락처 컬럼 (이미 있을 수 있음)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- 배송 요청사항 컬럼
ALTER TABLE applications ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

COMMENT ON COLUMN applications.postal_code IS '우편번호';
COMMENT ON COLUMN applications.address IS '기본 주소';
COMMENT ON COLUMN applications.phone_number IS '연락처';
COMMENT ON COLUMN applications.delivery_notes IS '배송 요청사항';
