-- Fix featured_creators featured_type CHECK constraint
-- 기존 제약 조건은 'auto', 'manual'만 허용했으나,
-- 코드에서는 'ai_recommended', 'cnec_plus', 'capi' 등 다양한 값을 사용함
-- 이 마이그레이션은 CHECK 제약 조건을 업데이트하여 모든 값을 허용하도록 함

-- 기존 CHECK 제약 조건 삭제
ALTER TABLE featured_creators DROP CONSTRAINT IF EXISTS featured_creators_featured_type_check;

-- 새로운 CHECK 제약 조건 추가 (모든 사용되는 타입 포함)
ALTER TABLE featured_creators ADD CONSTRAINT featured_creators_featured_type_check
  CHECK (featured_type IN ('auto', 'manual', 'ai_recommended', 'cnec_plus', 'capi'));

-- 확인용 코멘트 업데이트
COMMENT ON COLUMN featured_creators.featured_type IS '추천 유형: auto(자동), manual(수동), ai_recommended(AI추천), cnec_plus(CNEC플러스), capi(CAPI분석)';
