-- =====================================================
-- US DB - Campaign Guide Columns Migration
-- Run this in cnecus Supabase SQL Editor
-- =====================================================

-- 제품 정보 컬럼 추가
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_description TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_features TEXT[] DEFAULT '{}';

-- 추가 촬영 요청사항 컬럼 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests TEXT;

-- 기타 디테일 요청사항 컬럼 (없으면 추가)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details TEXT;

-- 영어 번역 컬럼들 추가
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_name_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_name_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_description_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_features_en TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_dialogues_en TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_scenes_en TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_hashtags_en TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_duration_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tempo_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tone_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests_en TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_en TEXT[] DEFAULT '{}';

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
  RAISE NOTICE '✅ US DB Campaign Guide Columns Migration Complete!';
  RAISE NOTICE '📊 Added product_description, product_features columns';
  RAISE NOTICE '🌏 Added all _en translation columns';
  RAISE NOTICE '📹 Added shooting scenes checkbox columns';
END $$;
