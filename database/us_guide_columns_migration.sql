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

-- =====================================================
-- 4주 챌린지 가이드 컬럼들 (campaigns 테이블)
-- =====================================================

-- 챌린지 가이드 데이터 (JSONB)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_guide_data JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_guide_data_en JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_weekly_guides JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS challenge_weekly_guides_ai TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_generated_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_key_points TEXT;

-- 주차별 가이드 모드 (ai 또는 external)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_guide_mode TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_guide_mode TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_guide_mode TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_guide_mode TEXT;

-- 1주차 외부 가이드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_file_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_external_title TEXT;

-- 2주차 외부 가이드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_file_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_external_title TEXT;

-- 3주차 외부 가이드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_file_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_external_title TEXT;

-- 4주차 외부 가이드
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_file_name TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_external_title TEXT;

-- =====================================================
-- applications 테이블 - 영상/채널 관련 컬럼들
-- =====================================================

-- 업로드 채널 선택
ALTER TABLE applications ADD COLUMN IF NOT EXISTS main_channel TEXT;

-- 영상 관련 컬럼
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_file_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_file_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_file_size BIGINT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS video_uploaded_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS clean_video_file_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS clean_video_file_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS clean_video_uploaded_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS clean_video_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ad_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS partnership_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sns_upload_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS final_confirmed_at TIMESTAMPTZ;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS upload_deadline TEXT;

-- 4주 챌린지 주차별 URL/코드
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_url TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week1_partnership_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week2_partnership_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week3_partnership_code TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS week4_partnership_code TEXT;

-- =====================================================
-- campaign_applications 테이블 - 가이드 전달 컬럼들
-- =====================================================

-- 기획형 가이드 전달
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS google_drive_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS google_slides_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS drive_provided_at TIMESTAMPTZ;

-- 4주 챌린지 주차별 가이드 전달
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week1_guide_drive_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week1_guide_slides_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week2_guide_drive_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week2_guide_slides_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week3_guide_drive_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week3_guide_slides_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week4_guide_drive_url TEXT;
ALTER TABLE campaign_applications ADD COLUMN IF NOT EXISTS week4_guide_slides_url TEXT;

-- =====================================================
-- video_submissions 테이블 생성 (없으면)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  application_id UUID,
  user_id UUID,
  video_number INTEGER DEFAULT 1,
  week_number INTEGER,
  version INTEGER DEFAULT 1,
  video_file_url TEXT,
  video_file_name TEXT,
  video_file_size BIGINT,
  clean_video_url TEXT,
  sns_upload_url TEXT,
  ad_code TEXT,
  partnership_code TEXT,
  status TEXT DEFAULT 'submitted',
  final_confirmed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ US DB Campaign Guide Columns Migration Complete!';
  RAISE NOTICE '📊 Added product_description, product_features columns';
  RAISE NOTICE '🌏 Added all _en translation columns';
  RAISE NOTICE '📹 Added shooting scenes checkbox columns';
  RAISE NOTICE '🎯 Added 4-week challenge guide columns';
  RAISE NOTICE '📋 Added applications video/channel columns';
  RAISE NOTICE '🎬 Created video_submissions table';
END $$;
