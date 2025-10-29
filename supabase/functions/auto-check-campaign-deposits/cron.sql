-- Supabase Cron Job 설정
-- 5분마다 캠페인 입금 자동 확인 실행

-- pg_cron extension 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 기존 cron job 삭제 (있을 경우)
SELECT cron.unschedule('auto-check-campaign-deposits');

-- 5분마다 실행되는 cron job 생성
SELECT cron.schedule(
  'auto-check-campaign-deposits',
  '*/5 * * * *', -- 5분마다 실행
  $$
  SELECT
    net.http_post(
      url := 'https://hbymozdhjseqebpomjsp.supabase.co/functions/v1/auto-check-campaign-deposits',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- cron job 확인
SELECT * FROM cron.job WHERE jobname = 'auto-check-campaign-deposits';

