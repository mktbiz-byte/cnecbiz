-- ============================================
-- 채널 모니터링 시스템 테이블
-- 매일 오전 10시 자동 체크 및 네이버 웍스 알림
-- ============================================

-- 1. channel_monitoring_snapshots 테이블 (일일 스냅샷)
CREATE TABLE IF NOT EXISTS channel_monitoring_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  channel_name TEXT NOT NULL,
  channel_type TEXT CHECK (channel_type IN ('affiliated_creator', 'our_channel')),
  
  -- 채널 통계
  subscriber_count INTEGER,
  video_count INTEGER,
  total_view_count BIGINT,
  
  -- 최근 영상 정보
  latest_video_id TEXT,
  latest_video_title TEXT,
  latest_video_published_at TIMESTAMP WITH TIME ZONE,
  latest_video_views INTEGER,
  
  -- 평균 지표
  avg_views_last_10 INTEGER,
  avg_likes_last_10 INTEGER,
  avg_comments_last_10 INTEGER,
  
  -- 스냅샷 시간
  snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. channel_alerts 테이블 (알림 기록)
CREATE TABLE IF NOT EXISTS channel_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  channel_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'no_upload_3days',
    'views_drop',
    'subscriber_surge',
    'video_viral'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  
  -- 알림 내용
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  
  -- 전송 상태
  sent_to_naver_works BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- 확인 상태
  is_read BOOLEAN DEFAULT false,
  read_by TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. naver_works_config 테이블 (네이버 웍스 설정)
CREATE TABLE IF NOT EXISTS naver_works_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name TEXT UNIQUE NOT NULL DEFAULT 'default',
  
  -- 네이버 웍스 Bot 정보
  bot_id TEXT NOT NULL,
  bot_secret TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  
  -- 알림 설정
  enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '10:00:00',
  
  -- 임계값 설정
  no_upload_days INTEGER DEFAULT 3,
  views_drop_threshold DECIMAL DEFAULT 0.30,  -- 30% 하락
  subscriber_surge_threshold DECIMAL DEFAULT 0.20,  -- 20% 증가
  viral_video_multiplier DECIMAL DEFAULT 2.0,  -- 평균 대비 2배
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_monitoring_snapshots_channel_id ON channel_monitoring_snapshots(channel_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_snapshots_snapshot_at ON channel_monitoring_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_channel_id ON channel_alerts(channel_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON channel_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON channel_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON channel_alerts(alert_type);

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_naver_works_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_naver_works_config_updated_at
  BEFORE UPDATE ON naver_works_config
  FOR EACH ROW
  EXECUTE FUNCTION update_naver_works_config_updated_at();

-- 6. RLS (Row Level Security) 설정
ALTER TABLE channel_monitoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_works_config ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Anyone can view monitoring data"
  ON channel_monitoring_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view alerts"
  ON channel_alerts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view naver works config"
  ON naver_works_config
  FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자가 생성 가능
CREATE POLICY "Authenticated users can create monitoring data"
  ON channel_monitoring_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create alerts"
  ON channel_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 인증된 사용자가 수정 가능
CREATE POLICY "Authenticated users can update alerts"
  ON channel_alerts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update naver works config"
  ON naver_works_config
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. 기본 네이버 웍스 설정 삽입
INSERT INTO naver_works_config (config_name, bot_id, bot_secret, channel_id)
VALUES ('default', 'YOUR_BOT_ID', 'YOUR_BOT_SECRET', 'YOUR_CHANNEL_ID')
ON CONFLICT (config_name) DO NOTHING;

-- 8. 코멘트 추가
COMMENT ON TABLE channel_monitoring_snapshots IS '채널 일일 스냅샷 데이터';
COMMENT ON TABLE channel_alerts IS '채널 알림 기록';
COMMENT ON TABLE naver_works_config IS '네이버 웍스 Bot 설정';

COMMENT ON COLUMN channel_alerts.alert_type IS 'no_upload_3days: 3일 이상 업로드 없음, views_drop: 조회수 급락, subscriber_surge: 구독자 급증, video_viral: 영상 바이럴';

-- 완료!
SELECT '채널 모니터링 시스템 테이블이 성공적으로 생성되었습니다!' AS message;
