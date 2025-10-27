-- pg_cron으로 1분마다 입금 확인 Edge Function 호출

-- 기존 스케줄 삭제 (있다면)
SELECT cron.unschedule('check-deposits-every-minute');

-- 1분마다 Edge Function 호출
SELECT cron.schedule(
  'check-deposits-every-minute',
  '* * * * *',  -- 매 분마다 실행
  $$
  SELECT
    net.http_post(
      url:='https://hbymozdhjseqebpomjsp.supabase.co/functions/v1/check-deposits',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);

-- 스케줄 확인
SELECT * FROM cron.job;
