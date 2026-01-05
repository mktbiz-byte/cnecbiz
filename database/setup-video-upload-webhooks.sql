-- =====================================================
-- 영상 업로드 알림 Webhook 설정 (Supabase Korea DB)
-- =====================================================
-- 이 SQL은 Supabase Dashboard에서 실행하거나,
-- 수동으로 Database > Webhooks에서 설정할 수 있습니다.

-- =====================================================
-- 방법 1: Supabase Dashboard에서 수동 설정
-- =====================================================
--
-- 1. Korea Supabase 대시보드 접속
-- 2. Database > Webhooks > Create a new webhook
--
-- [Webhook 1: campaign_participants 영상 업로드]
-- - Name: video_upload_notification
-- - Table: campaign_participants
-- - Events: UPDATE
-- - Type: HTTP Request
-- - HTTP Method: POST
-- - URL: https://cnecbiz.com/.netlify/functions/webhook-video-upload
-- - HTTP Headers:
--   - Content-Type: application/json
--   - x-webhook-secret: [환경변수에 설정한 시크릿]
--
-- [Webhook 2: video_submissions 영상 제출]
-- - Name: video_submission_notification
-- - Table: video_submissions
-- - Events: INSERT, UPDATE
-- - Type: HTTP Request
-- - HTTP Method: POST
-- - URL: https://cnecbiz.com/.netlify/functions/webhook-video-submission
-- - HTTP Headers:
--   - Content-Type: application/json
--   - x-webhook-secret: [환경변수에 설정한 시크릿]

-- =====================================================
-- 방법 2: pg_net 확장 사용 (더 안정적)
-- =====================================================
-- pg_net 확장이 활성화되어 있어야 합니다.

-- pg_net 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. campaign_participants 영상 업로드 트리거 함수
CREATE OR REPLACE FUNCTION notify_video_upload()
RETURNS TRIGGER AS $$
DECLARE
  old_count INT;
  new_count INT;
  webhook_url TEXT := 'https://cnecbiz.com/.netlify/functions/webhook-video-upload';
BEGIN
  -- video_files 배열 길이 비교
  old_count := COALESCE(array_length(OLD.video_files::jsonb[], 1), 0);
  new_count := COALESCE(array_length(NEW.video_files::jsonb[], 1), 0);

  -- 새 영상이 추가된 경우에만 웹훅 호출
  IF new_count > old_count THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', current_setting('app.webhook_secret', true)
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'campaign_participants',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS on_video_upload ON campaign_participants;
CREATE TRIGGER on_video_upload
  AFTER UPDATE OF video_files ON campaign_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_upload();

-- 2. video_submissions 영상 제출 트리거 함수
CREATE OR REPLACE FUNCTION notify_video_submission()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT := 'https://cnecbiz.com/.netlify/functions/webhook-video-submission';
BEGIN
  -- INSERT인 경우 video_file_url이 있어야 함
  IF TG_OP = 'INSERT' AND NEW.video_file_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'video_submissions',
        'record', row_to_json(NEW)
      )
    );
  -- UPDATE인 경우 video_file_url이 변경되었어야 함
  ELSIF TG_OP = 'UPDATE' AND NEW.video_file_url IS DISTINCT FROM OLD.video_file_url AND NEW.video_file_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'video_submissions',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_video_submission ON video_submissions;
CREATE TRIGGER on_video_submission
  AFTER INSERT OR UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_video_submission();

-- =====================================================
-- 테스트 쿼리
-- =====================================================
--
-- 트리거가 제대로 설정되었는지 확인:
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%video%';
--
-- 함수가 제대로 생성되었는지 확인:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%video%';

-- =====================================================
-- 주의사항
-- =====================================================
-- 1. pg_net 확장은 Supabase Pro 플랜 이상에서만 사용 가능할 수 있습니다.
-- 2. 무료 플랜에서는 Dashboard의 Webhooks 기능을 사용하세요.
-- 3. 웹훅 시크릿은 Netlify 환경변수에 WEBHOOK_SECRET으로 설정해야 합니다.
