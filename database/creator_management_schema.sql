-- 크리에이터 관리 시스템 데이터베이스 스키마
-- Supabase 대시보드 SQL Editor에서 실행

-- 1. 우리 채널 테이블
CREATE TABLE IF NOT EXISTS our_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  youtube_api_key TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 소속 크리에이터 테이블
CREATE TABLE IF NOT EXISTS affiliated_creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_id TEXT,
  youtube_api_key TEXT,
  use_api BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  platform TEXT DEFAULT 'youtube',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 채널 통계 스냅샷 테이블 (시계열 데이터)
CREATE TABLE IF NOT EXISTS channel_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  channel_type TEXT NOT NULL, -- 'our_channel' or 'affiliated_creator'
  subscriber_count BIGINT,
  video_count INTEGER,
  view_count BIGINT,
  avg_views BIGINT,
  comment_count BIGINT,
  like_count BIGINT,
  upload_frequency_days NUMERIC,
  last_upload_date TIMESTAMP WITH TIME ZONE,
  data_source TEXT DEFAULT 'api', -- 'api' or 'crawling'
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 영상 데이터 테이블
CREATE TABLE IF NOT EXISTS channel_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  duration TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AI 보고서 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  report_type TEXT DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  summary TEXT,
  strengths TEXT,
  improvements TEXT,
  predictions TEXT,
  recommendations TEXT,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_channel_stats_channel_id ON channel_statistics(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_stats_recorded_at ON channel_statistics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id ON channel_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_videos_published_at ON channel_videos(published_at);
CREATE INDEX IF NOT EXISTS idx_ai_reports_channel_id ON ai_reports(channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON ai_reports(created_at);

-- 코멘트 추가
COMMENT ON TABLE our_channels IS '우리가 운영하는 YouTube 채널 (최대 10개)';
COMMENT ON TABLE affiliated_creators IS '소속 크리에이터 (파트너 채널)';
COMMENT ON TABLE channel_statistics IS '채널 통계 스냅샷 (시계열 데이터)';
COMMENT ON TABLE channel_videos IS '채널별 영상 데이터';
COMMENT ON TABLE ai_reports IS 'Gemini API로 생성된 AI 분석 보고서';

