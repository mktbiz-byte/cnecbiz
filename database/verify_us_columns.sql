-- =====================================================
-- US DB - 컬럼 존재 여부 검증 쿼리
-- cnecus Supabase SQL Editor에서 실행
-- =====================================================

-- ★★★ 먼저 video_submissions 테이블이 없으면 생성 ★★★
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
-- 검증: 모든 필수 컬럼 존재 여부 확인
-- =====================================================
DO $$
DECLARE
  missing_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'US DB Column Verification Start';
  RAISE NOTICE '========================================';

  -- ========== campaigns 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- campaigns 테이블 ---';

  -- 제품 정보
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_description') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_description'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_features') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_features'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='additional_shooting_requests') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.additional_shooting_requests'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='additional_details') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.additional_details'; missing_count := missing_count + 1;
  END IF;

  -- 영어 번역 컬럼
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='brand_name_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.brand_name_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_name_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_name_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_description_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_description_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_features_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_features_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_dialogues_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_dialogues_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_scenes_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_scenes_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_hashtags_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_hashtags_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_duration_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_duration_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_tempo_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_tempo_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_tone_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_tone_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='additional_details_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.additional_details_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='additional_shooting_requests_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.additional_shooting_requests_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_en'; missing_count := missing_count + 1;
  END IF;

  -- 가이드 기본 컬럼
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_dialogues') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_dialogues'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_scenes') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_scenes'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='required_hashtags') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.required_hashtags'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_duration') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_duration'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_tempo') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_tempo'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_tone') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.video_tone'; missing_count := missing_count + 1;
  END IF;

  -- 촬영 장면 체크박스
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_ba_photo') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_ba_photo'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_no_makeup') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_no_makeup'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_closeup') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_closeup'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_product_closeup') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_product_closeup'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_product_texture') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_product_texture'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_outdoor') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_outdoor'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_couple') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_couple'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_child') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_child'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_troubled_skin') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_troubled_skin'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='shooting_scenes_wrinkles') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.shooting_scenes_wrinkles'; missing_count := missing_count + 1;
  END IF;

  -- 메타광고코드
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='meta_ad_code_requested') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.meta_ad_code_requested'; missing_count := missing_count + 1;
  END IF;

  -- 4주 챌린지
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='challenge_guide_data') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.challenge_guide_data'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='challenge_guide_data_en') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.challenge_guide_data_en'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='challenge_weekly_guides') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.challenge_weekly_guides'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='challenge_weekly_guides_ai') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.challenge_weekly_guides_ai'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='guide_generated_at') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.guide_generated_at'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='product_key_points') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.product_key_points'; missing_count := missing_count + 1;
  END IF;

  -- 주차별 가이드 모드
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_guide_mode') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_guide_mode'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_guide_mode') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_guide_mode'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_guide_mode') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_guide_mode'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_guide_mode') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_guide_mode'; missing_count := missing_count + 1;
  END IF;

  -- 주차별 외부 가이드
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_external_type') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_external_type'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_external_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_external_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_external_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_external_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_external_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_external_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week1_external_title') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week1_external_title'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_external_type') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_external_type'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_external_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_external_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_external_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_external_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_external_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_external_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week2_external_title') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week2_external_title'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_external_type') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_external_type'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_external_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_external_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_external_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_external_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_external_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_external_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week3_external_title') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week3_external_title'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_external_type') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_external_type'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_external_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_external_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_external_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_external_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_external_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_external_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='week4_external_title') THEN
    RAISE NOTICE '  ❌ MISSING: campaigns.week4_external_title'; missing_count := missing_count + 1;
  END IF;

  -- ========== applications 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- applications 테이블 ---';

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='main_channel') THEN
    RAISE NOTICE '  ❌ MISSING: applications.main_channel'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='video_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.video_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='video_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: applications.video_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='video_file_size') THEN
    RAISE NOTICE '  ❌ MISSING: applications.video_file_size'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='video_uploaded_at') THEN
    RAISE NOTICE '  ❌ MISSING: applications.video_uploaded_at'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='clean_video_file_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.clean_video_file_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='clean_video_file_name') THEN
    RAISE NOTICE '  ❌ MISSING: applications.clean_video_file_name'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='clean_video_uploaded_at') THEN
    RAISE NOTICE '  ❌ MISSING: applications.clean_video_uploaded_at'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='clean_video_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.clean_video_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='ad_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.ad_code'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='partnership_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.partnership_code'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='sns_upload_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.sns_upload_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='final_confirmed_at') THEN
    RAISE NOTICE '  ❌ MISSING: applications.final_confirmed_at'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='upload_deadline') THEN
    RAISE NOTICE '  ❌ MISSING: applications.upload_deadline'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week1_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week1_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week2_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week2_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week3_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week3_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week4_url') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week4_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week1_partnership_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week1_partnership_code'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week2_partnership_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week2_partnership_code'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week3_partnership_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week3_partnership_code'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='week4_partnership_code') THEN
    RAISE NOTICE '  ❌ MISSING: applications.week4_partnership_code'; missing_count := missing_count + 1;
  END IF;

  -- ========== campaign_applications 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- campaign_applications 테이블 ---';

  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='google_drive_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.google_drive_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='google_slides_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.google_slides_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='drive_provided_at') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.drive_provided_at'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week1_guide_drive_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week1_guide_drive_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week1_guide_slides_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week1_guide_slides_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week2_guide_drive_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week2_guide_drive_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week2_guide_slides_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week2_guide_slides_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week3_guide_drive_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week3_guide_drive_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week3_guide_slides_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week3_guide_slides_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week4_guide_drive_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week4_guide_drive_url'; missing_count := missing_count + 1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='campaign_applications' AND column_name='week4_guide_slides_url') THEN
    RAISE NOTICE '  ❌ MISSING: campaign_applications.week4_guide_slides_url'; missing_count := missing_count + 1;
  END IF;

  -- ========== video_submissions 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- video_submissions 테이블 ---';

  IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='video_submissions') THEN
    RAISE NOTICE '  ❌ MISSING: video_submissions TABLE DOES NOT EXIST!';
    missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_submissions 테이블 존재';
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='campaign_id') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.campaign_id'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='application_id') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.application_id'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='user_id') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.user_id'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='video_number') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.video_number'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='week_number') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.week_number'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='version') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.version'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='video_file_url') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.video_file_url'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='video_file_name') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.video_file_name'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='video_file_size') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.video_file_size'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='clean_video_url') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.clean_video_url'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='sns_upload_url') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.sns_upload_url'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_submissions' AND column_name='status') THEN
      RAISE NOTICE '  ❌ MISSING: video_submissions.status'; missing_count := missing_count + 1;
    END IF;
  END IF;

  -- ========== 5. video_review_comments 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- [5] video_review_comments 테이블 ---';
  IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='video_review_comments') THEN
    RAISE NOTICE '  ❌ MISSING TABLE: video_review_comments'; missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_review_comments 테이블 존재';
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comments' AND column_name='submission_id') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comments.submission_id'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comments' AND column_name='timestamp') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comments.timestamp'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comments' AND column_name='comment') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comments.comment'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comments' AND column_name='box_x') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comments.box_x'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comments' AND column_name='attachment_url') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comments.attachment_url'; missing_count := missing_count + 1;
    END IF;
  END IF;

  -- ========== 6. video_review_comment_replies 테이블 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- [6] video_review_comment_replies 테이블 ---';
  IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='video_review_comment_replies') THEN
    RAISE NOTICE '  ❌ MISSING TABLE: video_review_comment_replies'; missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_review_comment_replies 테이블 존재';
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comment_replies' AND column_name='comment_id') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comment_replies.comment_id'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comment_replies' AND column_name='author_name') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comment_replies.author_name'; missing_count := missing_count + 1;
    END IF;
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='video_review_comment_replies' AND column_name='reply') THEN
      RAISE NOTICE '  ❌ MISSING: video_review_comment_replies.reply'; missing_count := missing_count + 1;
    END IF;
  END IF;

  -- ========== 7. RLS 정책 확인 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- [7] RLS 정책 확인 ---';
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='video_submissions') THEN
    RAISE NOTICE '  ❌ MISSING: video_submissions RLS policy'; missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_submissions RLS 정책 존재';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='video_review_comments') THEN
    RAISE NOTICE '  ❌ MISSING: video_review_comments RLS policy'; missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_review_comments RLS 정책 존재';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='video_review_comment_replies') THEN
    RAISE NOTICE '  ❌ MISSING: video_review_comment_replies RLS policy'; missing_count := missing_count + 1;
  ELSE
    RAISE NOTICE '  ✅ video_review_comment_replies RLS 정책 존재';
  END IF;

  -- ========== 8. 스토리지 동기화 상태 ==========
  RAISE NOTICE '';
  RAISE NOTICE '--- [8] 스토리지 동기화 상태 ---';
  DECLARE
    storage_count INTEGER;
    synced_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO storage_count FROM storage.objects WHERE bucket_id = 'campaign-videos' AND name LIKE '%_main.%';
    SELECT COUNT(*) INTO synced_count FROM video_submissions;
    RAISE NOTICE '  📦 스토리지 영상 파일: % 개', storage_count;
    RAISE NOTICE '  📋 video_submissions 레코드: % 개', synced_count;
    IF storage_count > synced_count THEN
      RAISE NOTICE '  ⚠️ 동기화 필요: % 개 파일 미등록', storage_count - synced_count;
    ELSE
      RAISE NOTICE '  ✅ 스토리지 동기화 완료';
    END IF;
  END;

  -- ========== 결과 요약 ==========
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF missing_count = 0 THEN
    RAISE NOTICE '✅ ALL VERIFIED - 테이블/컬럼/RLS 모두 정상!';
  ELSE
    RAISE NOTICE '❌ MISSING ITEMS: % 개', missing_count;
    RAISE NOTICE '→ us_guide_columns_migration.sql을 실행하세요';
  END IF;
  RAISE NOTICE '========================================';
END $$;
