-- 크리에이터 관리 시스템 데이터베이스 스키마 (RLS 포함)
-- Supabase Korea 프로젝트용

-- 1. 우리 채널 테이블
CREATE TABLE IF NOT EXISTS our_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  youtube_api_key TEXT,
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
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, video_id)
);

-- 5. AI 보고서 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_our_channels_company_id ON our_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_affiliated_creators_company_id ON affiliated_creators(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_stats_channel_id ON channel_statistics(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_stats_company_id ON channel_statistics(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_stats_recorded_at ON channel_statistics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id ON channel_videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_videos_company_id ON channel_videos(company_id);
CREATE INDEX IF NOT EXISTS idx_channel_videos_published_at ON channel_videos(published_at);
CREATE INDEX IF NOT EXISTS idx_ai_reports_channel_id ON ai_reports(channel_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_company_id ON ai_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON ai_reports(created_at);

-- RLS 활성화
ALTER TABLE our_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliated_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성

-- our_channels 정책
DROP POLICY IF EXISTS "Users can view their own channels" ON our_channels;
CREATE POLICY "Users can view their own channels"
  ON our_channels FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can insert their own channels" ON our_channels;
CREATE POLICY "Users can insert their own channels"
  ON our_channels FOR INSERT
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can update their own channels" ON our_channels;
CREATE POLICY "Users can update their own channels"
  ON our_channels FOR UPDATE
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can delete their own channels" ON our_channels;
CREATE POLICY "Users can delete their own channels"
  ON our_channels FOR DELETE
  USING (auth.uid() = company_id);

-- affiliated_creators 정책
DROP POLICY IF EXISTS "Users can view their own creators" ON affiliated_creators;
CREATE POLICY "Users can view their own creators"
  ON affiliated_creators FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can insert their own creators" ON affiliated_creators;
CREATE POLICY "Users can insert their own creators"
  ON affiliated_creators FOR INSERT
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can update their own creators" ON affiliated_creators;
CREATE POLICY "Users can update their own creators"
  ON affiliated_creators FOR UPDATE
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can delete their own creators" ON affiliated_creators;
CREATE POLICY "Users can delete their own creators"
  ON affiliated_creators FOR DELETE
  USING (auth.uid() = company_id);

-- channel_statistics 정책
DROP POLICY IF EXISTS "Users can view their own statistics" ON channel_statistics;
CREATE POLICY "Users can view their own statistics"
  ON channel_statistics FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can insert their own statistics" ON channel_statistics;
CREATE POLICY "Users can insert their own statistics"
  ON channel_statistics FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- channel_videos 정책
DROP POLICY IF EXISTS "Users can view their own videos" ON channel_videos;
CREATE POLICY "Users can view their own videos"
  ON channel_videos FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can insert their own videos" ON channel_videos;
CREATE POLICY "Users can insert their own videos"
  ON channel_videos FOR INSERT
  WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can update their own videos" ON channel_videos;
CREATE POLICY "Users can update their own videos"
  ON channel_videos FOR UPDATE
  USING (auth.uid() = company_id);

-- ai_reports 정책
DROP POLICY IF EXISTS "Users can view their own reports" ON ai_reports;
CREATE POLICY "Users can view their own reports"
  ON ai_reports FOR SELECT
  USING (auth.uid() = company_id);

DROP POLICY IF EXISTS "Users can insert their own reports" ON ai_reports;
CREATE POLICY "Users can insert their own reports"
  ON ai_reports FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- 코멘트 추가
COMMENT ON TABLE our_channels IS '우리가 운영하는 YouTube 채널 (최대 10개)';
COMMENT ON TABLE affiliated_creators IS '소속 크리에이터 (파트너 채널)';
COMMENT ON TABLE channel_statistics IS '채널 통계 스냅샷 (시계열 데이터)';
COMMENT ON TABLE channel_videos IS '채널별 영상 데이터';
COMMENT ON TABLE ai_reports IS 'Gemini API로 생성된 AI 분석 보고서';

