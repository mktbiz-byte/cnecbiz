-- Add capi_reliability column to featured_creators table

ALTER TABLE featured_creators 
ADD COLUMN IF NOT EXISTS capi_reliability INTEGER DEFAULT 0;

COMMENT ON COLUMN featured_creators.capi_reliability IS 'CAPI 분석 신뢰도 점수 (0-100)';
