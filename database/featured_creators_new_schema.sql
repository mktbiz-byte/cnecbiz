-- Featured Creators Table (Auto-Matching System)
-- 크리에이터 프로필 기반 자동 매칭 및 추천 시스템

-- 기존 테이블 삭제 (데이터 없음)
DROP TABLE IF EXISTS featured_creators CASCADE;

-- 새로운 featured_creators 테이블 생성
CREATE TABLE featured_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- 기본 정보
  featured_type VARCHAR(20) DEFAULT 'auto' CHECK (featured_type IN ('auto', 'manual', 'ai_recommended', 'cnec_plus', 'capi')),
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
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약
  UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX idx_featured_creators_user_id ON featured_creators(user_id);
CREATE INDEX idx_featured_creators_country ON featured_creators(primary_country);
CREATE INDEX idx_featured_creators_active ON featured_creators(is_active);
CREATE INDEX idx_featured_creators_score ON featured_creators(overall_score DESC);
CREATE INDEX idx_featured_creators_badge ON featured_creators(recommendation_badge);
CREATE INDEX idx_featured_creators_regions ON featured_creators USING GIN(active_regions);
CREATE INDEX idx_featured_creators_category_scores ON featured_creators USING GIN(category_scores);
CREATE INDEX idx_featured_creators_platform_scores ON featured_creators USING GIN(platform_scores);

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

-- 자동 점수 계산 함수
CREATE OR REPLACE FUNCTION calculate_creator_score(creator_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER := 0;
  profile_data RECORD;
  platform_weight NUMERIC := 0.4;
  engagement_weight NUMERIC := 0.3;
  follower_weight NUMERIC := 0.3;
BEGIN
  -- user_profiles에서 크리에이터 정보 가져오기
  SELECT 
    instagram_followers,
    tiktok_followers,
    youtube_subscribers,
    engagement_rate
  INTO profile_data
  FROM user_profiles
  WHERE id = creator_user_id;
  
  -- 팔로워 점수 계산 (최대 30점)
  total_score := total_score + LEAST(30, 
    (COALESCE(profile_data.instagram_followers, 0) / 10000 +
     COALESCE(profile_data.tiktok_followers, 0) / 10000 +
     COALESCE(profile_data.youtube_subscribers, 0) / 5000)::INTEGER
  );
  
  -- 참여율 점수 계산 (최대 30점)
  total_score := total_score + LEAST(30, 
    (COALESCE(profile_data.engagement_rate, 0) * 100)::INTEGER
  );
  
  -- 플랫폼 다양성 점수 (최대 40점)
  IF profile_data.instagram_followers > 1000 THEN
    total_score := total_score + 13;
  END IF;
  IF profile_data.tiktok_followers > 1000 THEN
    total_score := total_score + 13;
  END IF;
  IF profile_data.youtube_subscribers > 500 THEN
    total_score := total_score + 14;
  END IF;
  
  RETURN LEAST(100, total_score);
END;
$$ LANGUAGE plpgsql;

-- 코멘트 추가
COMMENT ON TABLE featured_creators IS '자동 매칭 기반 추천 크리에이터 시스템';
COMMENT ON COLUMN featured_creators.user_id IS 'user_profiles 참조';
COMMENT ON COLUMN featured_creators.featured_type IS '추천 유형: auto(자동), manual(수동), ai_recommended(AI추천), cnec_plus(CNEC플러스), capi(CAPI분석)';
COMMENT ON COLUMN featured_creators.primary_country IS '주요 활동 국가';
COMMENT ON COLUMN featured_creators.active_regions IS '활동 가능 지역 배열';
COMMENT ON COLUMN featured_creators.category_scores IS '카테고리별 점수 (0-100)';
COMMENT ON COLUMN featured_creators.platform_scores IS '플랫폼별 최적화 점수 (0-100)';
COMMENT ON COLUMN featured_creators.overall_score IS '종합 추천 점수 (0-100)';
COMMENT ON COLUMN featured_creators.ai_analysis IS 'AI 분석 결과 (콘텐츠 스타일, 타겟 오디언스 등)';

