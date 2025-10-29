-- Featured Creators Table for cnectotal
-- 모든 국가의 크리에이터를 통합 관리하는 추천 시스템

-- 기존 테이블 삭제 (있다면)
DROP TABLE IF EXISTS featured_creators CASCADE;

-- 새로운 featured_creators 테이블 생성
CREATE TABLE featured_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 원본 크리에이터 정보 (각 국가 DB에서 동기화)
  source_user_id UUID NOT NULL,
  source_country VARCHAR(2) NOT NULL CHECK (source_country IN ('KR', 'JP', 'US', 'TW')),
  
  -- 크리에이터 기본 정보
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_image_url TEXT,
  bio TEXT,
  
  -- SNS 정보
  instagram_handle VARCHAR(255),
  instagram_followers INTEGER DEFAULT 0,
  tiktok_handle VARCHAR(255),
  tiktok_followers INTEGER DEFAULT 0,
  youtube_handle VARCHAR(255),
  youtube_subscribers INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0.0,
  
  -- 크리에이터 속성
  gender VARCHAR(20),
  age INTEGER,
  region TEXT,
  
  -- 추천 시스템
  featured_type VARCHAR(20) DEFAULT 'auto' CHECK (featured_type IN ('auto', 'manual')),
  is_active BOOLEAN DEFAULT true,
  
  -- 국가 및 지역
  primary_country VARCHAR(2) NOT NULL CHECK (primary_country IN ('KR', 'JP', 'US', 'TW')),
  active_regions TEXT[] DEFAULT ARRAY['KR'],
  
  -- 카테고리별 점수 (0-100)
  category_scores JSONB DEFAULT '{
    "beauty": 0,
    "skincare": 0,
    "makeup": 0,
    "haircare": 0,
    "fitness": 0,
    "food": 0,
    "fashion": 0,
    "lifestyle": 0,
    "technology": 0,
    "travel": 0
  }'::jsonb,
  
  -- 플랫폼별 최적화 점수 (0-100)
  platform_scores JSONB DEFAULT '{
    "youtube": 0,
    "instagram": 0,
    "tiktok": 0
  }'::jsonb,
  
  -- 종합 추천 점수 (0-100)
  overall_score INTEGER DEFAULT 0,
  recommendation_badge VARCHAR(20) DEFAULT 'normal' CHECK (
    recommendation_badge IN ('excellent', 'strong', 'recommended', 'normal', 'review_needed')
  ),
  
  -- AI 분석 결과
  ai_analysis JSONB DEFAULT '{
    "content_style": [],
    "target_audience": [],
    "strengths": [],
    "best_categories": []
  }'::jsonb,
  
  -- 매칭 통계
  total_matched_campaigns INTEGER DEFAULT 0,
  successful_campaigns INTEGER DEFAULT 0,
  average_performance_score NUMERIC(5,2) DEFAULT 0.0,
  
  -- 관리자 메모
  admin_notes TEXT,
  
  -- 타임스탬프
  featured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약
  UNIQUE(source_user_id, source_country)
);

-- 인덱스 생성
CREATE INDEX idx_featured_creators_source ON featured_creators(source_user_id, source_country);
CREATE INDEX idx_featured_creators_country ON featured_creators(primary_country);
CREATE INDEX idx_featured_creators_active ON featured_creators(is_active);
CREATE INDEX idx_featured_creators_score ON featured_creators(overall_score DESC);
CREATE INDEX idx_featured_creators_badge ON featured_creators(recommendation_badge);
CREATE INDEX idx_featured_creators_regions ON featured_creators USING GIN(active_regions);

-- RLS (Row Level Security) 활성화
ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 추천 크리에이터 조회 가능
CREATE POLICY "Anyone can view active featured creators"
  ON featured_creators
  FOR SELECT
  USING (is_active = true);

-- 관리자만 삽입 가능
CREATE POLICY "Admin can insert featured creators"
  ON featured_creators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 관리자만 업데이트 가능
CREATE POLICY "Admin can update featured creators"
  ON featured_creators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 관리자만 삭제 가능
CREATE POLICY "Admin can delete featured creators"
  ON featured_creators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_featured_creators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER featured_creators_updated_at
  BEFORE UPDATE ON featured_creators
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_creators_updated_at();
