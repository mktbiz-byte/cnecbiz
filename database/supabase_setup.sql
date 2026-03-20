-- ============================================
-- CNEC BIZ Database Setup Script
-- ============================================
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. 기업 정보 테이블
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_registration_number TEXT,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 팀 테이블
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 팀원 테이블
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. 팀 초대 테이블
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE
);

-- 5. 캠페인 테이블 (중앙 관리용)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 패키지 정보
  package_type TEXT NOT NULL CHECK (package_type IN ('basic', 'standard', 'premium', 'four_week')),
  package_price INTEGER NOT NULL,
  
  -- 지역 정보
  selected_regions TEXT[] NOT NULL, -- ['japan', 'us', 'taiwan']
  
  -- 기업 정보
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT,
  brand_identity TEXT,
  
  -- 제품 정보
  required_dialogue TEXT,
  required_scenes TEXT,
  reference_urls TEXT[],
  
  -- 상태
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'active', 'in_progress', 'completed', 'cancelled')),
  
  -- 결제 정보
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  total_amount INTEGER,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. 결제 내역 테이블
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Stripe 정보
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_payment_method_id TEXT,
  
  -- 결제 정보
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- 메타데이터
  metadata JSONB,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- 7. 추천 크리에이터 테이블
CREATE TABLE IF NOT EXISTS featured_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 기본 정보
  name TEXT NOT NULL,
  profile_image_url TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  channel_url TEXT NOT NULL,
  
  -- 통계
  followers INTEGER,
  avg_views INTEGER,
  engagement_rate DECIMAL(5,2),
  
  -- 활동 지역
  regions TEXT[] NOT NULL, -- ['japan', 'us', 'taiwan', 'korea']
  
  -- 콘텐츠 정보
  content_category TEXT,
  target_audience TEXT,
  sample_video_urls TEXT[],
  
  -- AI 분석
  ai_analysis JSONB, -- Gemini 분석 결과 저장
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  recommendation_level TEXT CHECK (recommendation_level IN ('excellent', 'strong', 'good', 'normal', 'review_needed')),
  
  -- 가격 정보
  pricing JSONB, -- { "basic": 500000, "standard": 700000, "premium": 1000000, "four_week": 3000000 }
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. AI 가이드 테이블
CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- 가이드 내용
  content_ko TEXT, -- 한국어 원본
  content_ja TEXT, -- 일본어 번역
  content_en TEXT, -- 영어 번역
  content_zh_tw TEXT, -- 중국어(번체) 번역
  
  -- AI 생성 정보
  ai_generated BOOLEAN DEFAULT false,
  ai_model TEXT, -- 'gemini-2.5-flash'
  
  -- 크리에이터 정보
  creator_info JSONB,
  
  -- 상태
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'sent')),
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 9. 영상 수정 요청 테이블
CREATE TABLE IF NOT EXISTS video_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- 영상 정보
  video_url TEXT NOT NULL,
  creator_name TEXT,
  
  -- 수정 요청
  revisions JSONB NOT NULL, -- [{ "timestamp": "0:15", "comment": "제품 로고 더 크게" }]
  additional_notes TEXT,
  
  -- 상태
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 10. 견적서/계약서 테이블
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- 문서 정보
  document_type TEXT NOT NULL CHECK (document_type IN ('quotation', 'contract')),
  document_url TEXT, -- PDF URL
  
  -- 문서 내용
  content JSONB,
  
  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloaded_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Companies: 본인 회사만 조회/수정 가능
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Teams: 팀원만 조회 가능
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Team Members: 팀원만 조회 가능
CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Campaigns: 팀원만 조회 가능
CREATE POLICY "Team members can view team campaigns"
  ON campaigns FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Campaigns: Owner/Admin만 생성 가능
CREATE POLICY "Owners and admins can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Featured Creators: 모두 조회 가능 (공개 정보)
CREATE POLICY "Everyone can view featured creators"
  ON featured_creators FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Featured Creators: 관리자만 생성/수정 가능
-- (실제 운영 시 슈퍼 관리자 역할 추가 필요)

-- Payments: 본인 회사 결제 내역만 조회
CREATE POLICY "Companies can view their own payments"
  ON payments FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_team_id ON campaigns(team_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_payments_campaign_id ON payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_featured_creators_regions ON featured_creators USING GIN(regions);
CREATE INDEX IF NOT EXISTS idx_guides_campaign_id ON guides(campaign_id);
CREATE INDEX IF NOT EXISTS idx_video_revisions_campaign_id ON video_revisions(campaign_id);

-- ============================================
-- 트리거 (자동 updated_at 업데이트)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_creators_updated_at BEFORE UPDATE ON featured_creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guides_updated_at BEFORE UPDATE ON guides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_revisions_updated_at BEFORE UPDATE ON video_revisions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 완료!
-- ============================================
-- 이제 Netlify 환경 변수에 다음을 추가하세요:
-- VITE_SUPABASE_BIZ_URL=https://your-project.supabase.co
-- VITE_SUPABASE_BIZ_ANON_KEY=your-anon-key
-- ============================================

