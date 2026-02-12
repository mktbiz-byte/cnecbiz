-- ============================================
-- AI 크리에이터 추천 테이블 마이그레이션
-- 글로우~블룸 등급 크리에이터 중 AI가 추천한 5명을 캠페인별로 고정 저장
-- ============================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS ai_creator_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  creator_email TEXT,
  creator_data JSONB NOT NULL DEFAULT '{}',
  recommendation_score INTEGER DEFAULT 0,
  recommendation_reason TEXT DEFAULT '',
  rank INTEGER DEFAULT 0,
  is_top_performer BOOLEAN DEFAULT false,
  invitation_sent BOOLEAN DEFAULT false,
  invitation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ai_creator_recs_campaign_id ON ai_creator_recommendations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_creator_recs_creator_id ON ai_creator_recommendations(creator_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_creator_recs_campaign_creator ON ai_creator_recommendations(campaign_id, creator_id);

-- RLS 정책 (필요 시)
ALTER TABLE ai_creator_recommendations ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "ai_creator_recs_select" ON ai_creator_recommendations
  FOR SELECT USING (true);

-- 서비스 역할만 삽입/수정 가능
CREATE POLICY "ai_creator_recs_insert" ON ai_creator_recommendations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "ai_creator_recs_update" ON ai_creator_recommendations
  FOR UPDATE USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ai_creator_recs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_creator_recs_updated_at
  BEFORE UPDATE ON ai_creator_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_creator_recs_updated_at();

-- ============================================
-- 상담 신청 테이블 (크리에이터 매칭 요청)
-- 기업이 원하는 스타일의 크리에이터 매칭을 관리자에게 요청
-- ============================================

CREATE TABLE IF NOT EXISTS creator_matching_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  company_id UUID,
  company_email TEXT,
  company_name TEXT,
  desired_sns_url TEXT,
  desired_video_style_url TEXT,
  request_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  admin_response TEXT,
  naver_works_sent BOOLEAN DEFAULT false,
  naver_works_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_matching_requests_campaign_id ON creator_matching_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_matching_requests_status ON creator_matching_requests(status);

-- RLS 정책
ALTER TABLE creator_matching_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matching_requests_select" ON creator_matching_requests
  FOR SELECT USING (true);

CREATE POLICY "matching_requests_insert" ON creator_matching_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "matching_requests_update" ON creator_matching_requests
  FOR UPDATE USING (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_matching_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matching_requests_updated_at
  BEFORE UPDATE ON creator_matching_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_matching_requests_updated_at();
