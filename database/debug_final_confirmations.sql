-- =====================================================
-- 캠페인 최종 확정 관리 디버그 쿼리
-- Korea DB의 Supabase SQL Editor에서 실행
-- =====================================================

-- 1. video_submissions 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'video_submissions'
ORDER BY ordinal_position;

-- 2. video_submissions 샘플 데이터 (final_confirmed_at 있는 것)
SELECT *
FROM video_submissions
WHERE final_confirmed_at IS NOT NULL
LIMIT 5;

-- 3. video_submissions의 application_id가 있는지 확인
SELECT
  id,
  user_id,
  campaign_id,
  application_id,
  status,
  final_confirmed_at
FROM video_submissions
WHERE final_confirmed_at IS NOT NULL
LIMIT 10;

-- 4. applications 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'applications'
ORDER BY ordinal_position;

-- 5. 특정 user_id로 applications 조회 (스크린샷의 user_id 사용)
-- User: 5001020e... | Campaign: f2461f67...
SELECT *
FROM applications
WHERE user_id LIKE '5001020e%'
   OR campaign_id LIKE 'f2461f67%'
LIMIT 5;

-- 6. video_submissions와 applications 조인 테스트
-- application_id 기반
SELECT
  vs.id as submission_id,
  vs.user_id,
  vs.campaign_id,
  vs.application_id,
  vs.final_confirmed_at,
  a.id as app_id,
  a.applicant_name,
  a.channel_name,
  a.nickname,
  a.email
FROM video_submissions vs
LEFT JOIN applications a ON vs.application_id = a.id
WHERE vs.final_confirmed_at IS NOT NULL
LIMIT 10;

-- 7. video_submissions와 applications 조인 테스트
-- user_id + campaign_id 기반 (application_id가 없는 경우)
SELECT
  vs.id as submission_id,
  vs.user_id,
  vs.campaign_id,
  vs.application_id,
  vs.final_confirmed_at,
  a.id as app_id,
  a.applicant_name,
  a.channel_name,
  a.nickname,
  a.email
FROM video_submissions vs
LEFT JOIN applications a ON vs.user_id = a.user_id AND vs.campaign_id = a.campaign_id
WHERE vs.final_confirmed_at IS NOT NULL
LIMIT 10;

-- 8. campaigns 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'campaigns'
ORDER BY ordinal_position;

-- 9. 캠페인 정보 조회
SELECT id, title, brand, campaign_type, point_amount, reward_points, estimated_cost
FROM campaigns
WHERE id LIKE 'f2461f67%'
   OR id LIKE 'ee62bfb2%'
LIMIT 5;

-- 10. 종합: video_submissions + applications + campaigns 조인
SELECT
  vs.id as submission_id,
  vs.user_id,
  vs.campaign_id,
  vs.application_id,
  vs.final_confirmed_at,
  -- applications
  a.applicant_name,
  a.channel_name as app_channel_name,
  a.nickname as app_nickname,
  a.email as app_email,
  -- campaigns
  c.title as campaign_title,
  c.brand as campaign_brand,
  c.point_amount,
  c.reward_points
FROM video_submissions vs
LEFT JOIN applications a ON
  (vs.application_id IS NOT NULL AND vs.application_id = a.id)
  OR (vs.application_id IS NULL AND vs.user_id = a.user_id AND vs.campaign_id = a.campaign_id)
LEFT JOIN campaigns c ON vs.campaign_id = c.id
WHERE vs.final_confirmed_at IS NOT NULL
LIMIT 20;
