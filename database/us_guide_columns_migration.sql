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

-- =====================================================
-- video_review_comments 테이블 생성 (없으면)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES video_submissions(id) ON DELETE CASCADE,
  timestamp FLOAT NOT NULL DEFAULT 0,
  comment TEXT NOT NULL,
  box_x FLOAT,
  box_y FLOAT,
  box_width FLOAT DEFAULT 120,
  box_height FLOAT DEFAULT 120,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- video_review_comment_replies 테이블 생성 (없으면)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_review_comment_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES video_review_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS 정책 설정
-- =====================================================
ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_review_comment_replies ENABLE ROW LEVEL SECURITY;

-- 모든 접근 허용 정책
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_submissions' AND policyname = 'Allow all for video_submissions') THEN
    CREATE POLICY "Allow all for video_submissions" ON video_submissions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_review_comments' AND policyname = 'Allow all for video_review_comments') THEN
    CREATE POLICY "Allow all for video_review_comments" ON video_review_comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'video_review_comment_replies' AND policyname = 'Allow all for video_review_comment_replies') THEN
    CREATE POLICY "Allow all for video_review_comment_replies" ON video_review_comment_replies FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 스토리지 → video_submissions 동기화
-- (campaign-videos 버킷의 기존 영상을 video_submissions에 등록)
-- =====================================================
INSERT INTO video_submissions (campaign_id, user_id, video_file_url, video_file_name, video_file_size, version, status, submitted_at, created_at, updated_at)
SELECT
  split_part(name, '/', 2)::uuid as campaign_id,
  split_part(name, '/', 1)::uuid as user_id,
  'https://ybsibqlaipsbvbyqlcny.supabase.co/storage/v1/object/public/campaign-videos/' || name as video_file_url,
  split_part(name, '/', 4) as video_file_name,
  (metadata->>'size')::bigint as video_file_size,
  1 as version,
  'submitted' as status,
  created_at as submitted_at,
  created_at,
  created_at as updated_at
FROM storage.objects
WHERE bucket_id = 'campaign-videos'
AND name LIKE '%_main.%'
AND NOT EXISTS (
  SELECT 1 FROM video_submissions vs
  WHERE vs.video_file_url = 'https://ybsibqlaipsbvbyqlcny.supabase.co/storage/v1/object/public/campaign-videos/' || storage.objects.name
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
  RAISE NOTICE '📝 Created video_review_comments + replies tables';
  RAISE NOTICE '🔒 Configured RLS policies';
  RAISE NOTICE '🔄 Synced storage videos to video_submissions';
END $$;
