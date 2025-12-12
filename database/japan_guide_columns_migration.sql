-- =====================================================
-- Japan DB - Campaign Guide Columns Migration
-- Run this in cnec-japan-platform Supabase SQL Editor
-- =====================================================

-- 제품 정보 컬럼 추가
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_features TEXT[] DEFAULT '{}';

-- 추가 촬영 요청사항 컬럼 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests TEXT;

-- 기타 디테일 요청사항 컬럼 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details TEXT;

-- 일본어 번역 컬럼들 추가
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_name_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_name_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_description_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_features_ja TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_dialogues_ja TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_scenes_ja TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_hashtags_ja TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_duration_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tempo_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tone_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests_ja TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_ja TEXT[] DEFAULT '{}';

-- 가이드 관련 기본 컬럼들 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_dialogues TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_scenes TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_hashtags TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_duration TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tempo TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tone TEXT;

-- 촬영 장면 체크박스 컬럼들 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_ba_photo BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_no_makeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_closeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_product_closeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_product_texture BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_outdoor BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_couple BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_child BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_troubled_skin BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_wrinkles BOOLEAN DEFAULT FALSE;

-- 메타광고코드 요청 컬럼 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_ad_code_requested BOOLEAN DEFAULT FALSE;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ Japan DB Campaign Guide Columns Migration Complete!';
  RAISE NOTICE '📊 Added product_description, product_features columns';
  RAISE NOTICE '🌏 Added all _ja translation columns';
  RAISE NOTICE '📹 Added shooting scenes checkbox columns';
END $$;
