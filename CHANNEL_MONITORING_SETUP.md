# 채널 모니터링 시스템 설정 가이드

매일 오전 10시에 자동으로 크리에이터 채널을 모니터링하고 네이버 웍스로 알림을 전송하는 시스템입니다.

## 📋 모니터링 항목

1. **영상 업로드 중단** - 3일 이상 새 영상이 없을 경우
2. **조회수 급락** - 평균 조회수가 20% 이상 하락할 경우
3. **구독자 급증** - 구독자가 100명 이상 증가할 경우
4. **영상 바이럴** - 신규 영상 조회수가 평균 대비 1.5배 이상일 경우

---

## 🔧 설정 단계

### 1. Supabase 테이블 생성

Supabase 대시보드에서 SQL Editor를 열고 다음 파일을 실행하세요:

```bash
# 1. 보고서 테이블
supabase_creator_reports_table.sql

# 2. 모니터링 테이블
supabase_channel_monitoring.sql
```

**URL**: https://supabase.com/dashboard/project/dqvdmzwbgvdwpqzwqvkx/editor

---

### 2. 네이버 웍스 Bot 생성

#### 2.1 네이버 웍스 Developer Console 접속
- URL: https://developers.worksmobile.com/

#### 2.2 Bot 생성
1. **Developer Console** → **Bot** → **새 Bot 만들기**
2. Bot 이름: `CNEC 채널 모니터링`
3. Bot 설명: `크리에이터 채널 자동 모니터링 및 알림`
4. Bot ID와 Bot Secret 저장

#### 2.3 Bot 권한 설정
- `bot` 스코프 추가
- `bot.message` 권한 활성화

#### 2.4 Bot을 채널에 추가
1. 네이버 웍스 앱에서 알림 받을 채널 생성 (예: `#채널-모니터링`)
2. 채널 설정 → Bot 추가 → 생성한 Bot 선택
3. 채널 ID 확인 (채널 URL에서 확인 가능)

---

### 3. Supabase에 네이버 웍스 설정 저장

Supabase SQL Editor에서 실행:

```sql
UPDATE naver_works_config
SET 
  bot_id = 'YOUR_BOT_ID',
  bot_secret = 'YOUR_BOT_SECRET',
  channel_id = 'YOUR_CHANNEL_ID',
  enabled = true
WHERE config_name = 'default';
```

**임계값 조정 (선택사항)**:

```sql
UPDATE naver_works_config
SET 
  no_upload_days = 3,                    -- 업로드 없음 기준 (일)
  views_drop_threshold = 0.20,           -- 조회수 하락 기준 (20%)
  subscriber_surge_count = 100,          -- 구독자 증가 기준 (100명)
  viral_video_multiplier = 1.5           -- 바이럴 영상 기준 (평균 대비 1.5배)
WHERE config_name = 'default';
```

---

### 4. Supabase Edge Function 배포

#### 4.1 Supabase CLI 설치

```bash
npm install -g supabase
```

#### 4.2 Supabase 프로젝트 연결

```bash
cd /home/ubuntu/cnecbiz
supabase login
supabase link --project-ref dqvdmzwbgvdwpqzwqvkx
```

#### 4.3 Edge Function 배포

```bash
supabase functions deploy channel-monitoring
```

#### 4.4 환경 변수 설정

```bash
supabase secrets set YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
```

---

### 5. Cron 스케줄 설정

Supabase 대시보드에서 Cron Job 설정:

1. **Database** → **Extensions** → `pg_cron` 활성화
2. SQL Editor에서 실행:

```sql
-- 매일 오전 10시 (한국 시간 기준: UTC+9 = 01:00 UTC)
SELECT cron.schedule(
  'channel-monitoring-daily',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://dqvdmzwbgvdwpqzwqvkx.supabase.co/functions/v1/channel-monitoring',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Anon Key 확인**:
- Supabase Dashboard → Settings → API → `anon` `public` key

---

### 6. 수동 테스트

Edge Function을 수동으로 실행하여 테스트:

```bash
curl -X POST \
  https://dqvdmzwbgvdwpqzwqvkx.supabase.co/functions/v1/channel-monitoring \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

또는 Supabase Dashboard에서:
1. **Edge Functions** → `channel-monitoring` → **Invoke**

---

## 📊 알림 확인

### 네이버 웍스에서 확인
- 설정한 채널에서 매일 오전 10시에 알림 수신

### 관리자 페이지에서 확인
- URL: https://cnectotal.netlify.app/admin/alerts (구현 예정)
- 모든 알림 기록 조회 가능
- 읽음 처리, 필터링, 상세 정보 확인

---

## 🔍 문제 해결

### 알림이 오지 않을 경우

1. **Cron Job 확인**
```sql
SELECT * FROM cron.job WHERE jobname = 'channel-monitoring-daily';
```

2. **Edge Function 로그 확인**
- Supabase Dashboard → Edge Functions → channel-monitoring → Logs

3. **네이버 웍스 설정 확인**
```sql
SELECT * FROM naver_works_config WHERE config_name = 'default';
```

4. **최근 알림 확인**
```sql
SELECT * FROM channel_alerts ORDER BY created_at DESC LIMIT 10;
```

---

## 📝 추가 기능

### 알림 끄기/켜기

```sql
-- 알림 끄기
UPDATE naver_works_config SET enabled = false WHERE config_name = 'default';

-- 알림 켜기
UPDATE naver_works_config SET enabled = true WHERE config_name = 'default';
```

### 알림 시간 변경

```sql
-- 오후 3시로 변경 (UTC 06:00)
SELECT cron.unschedule('channel-monitoring-daily');
SELECT cron.schedule(
  'channel-monitoring-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(...) AS request_id;
  $$
);
```

---

## 🎯 다음 단계

1. ✅ Supabase 테이블 생성
2. ✅ 네이버 웍스 Bot 설정
3. ✅ Edge Function 배포
4. ✅ Cron Job 설정
5. ⏳ 관리자 페이지에서 알림 조회 UI 구현
6. ⏳ 크리에이터 보고서 시스템 완성

---

**문의**: mkt_biz@cnec.co.kr
