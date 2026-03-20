-- =====================================================
-- CNEC BIZ - Complete Database Schema
-- Execute this file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: Base Tables (from supabase_setup_final.sql)
-- =====================================================

-- 1. Companies Table
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

-- 2. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- 4. Team Invitations Table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member', 'viewer')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- 5. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  
  -- Package Info
  package_type TEXT CHECK (package_type IN ('basic_200k', 'standard_300k', 'premium_400k', 'monthly_600k')),
  selected_regions TEXT[], -- ['japan', 'us', 'taiwan']
  total_amount INTEGER,
  
  -- Brand Info
  brand_name TEXT,
  product_name TEXT,
  product_url TEXT,
  brand_identity TEXT,
  
  -- Product Info
  required_dialogue TEXT,
  required_scenes TEXT,
  reference_urls TEXT[],
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'pending_payment', 'active', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payments Table (Base)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  company_id UUID REFERENCES auth.users(id),
  
  -- Payment Info
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  payment_method TEXT, -- 'stripe', 'bank_transfer'
  
  -- Stripe Info
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  
  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Featured Creators Table
CREATE TABLE IF NOT EXISTS featured_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  profile_image_url TEXT,
  platform TEXT CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'other')),
  channel_url TEXT,
  
  -- Regions
  active_regions TEXT[], -- ['japan', 'us', 'taiwan', 'korea']
  
  -- Stats
  followers INTEGER,
  avg_views INTEGER,
  engagement_rate DECIMAL(5,2),
  
  -- Sample Videos
  sample_videos TEXT[],
  
  -- AI Analysis
  ai_analysis JSONB, -- Gemini AI analysis results
  recommendation_score INTEGER, -- 0-100
  recommendation_badge TEXT CHECK (recommendation_badge IN ('excellent', 'strong', 'recommended', 'normal', 'review_needed')),
  
  -- Pricing
  custom_pricing JSONB, -- { "basic_200k": 500000, "standard_300k": 700000, ... }
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Guides Table
CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID, -- Reference to creator (if applicable)
  
  -- Guide Content
  original_content TEXT, -- Korean
  translated_content JSONB, -- { "ja": "...", "en": "...", "zh-TW": "..." }
  
  -- Sections
  shooting_scenes TEXT,
  required_dialogue TEXT,
  recommended_strategy TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'confirmed', 'sent')) DEFAULT 'draft',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Video Revisions Table
CREATE TABLE IF NOT EXISTS video_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  video_url TEXT,
  
  -- Revision Requests
  timestamp_requests JSONB, -- [{ "timestamp": "0:15", "request": "Make logo bigger" }]
  additional_requests TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Document Info
  type TEXT CHECK (type IN ('quotation', 'contract')),
  file_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Reference Videos Table
CREATE TABLE IF NOT EXISTS reference_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Video Info
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  platform TEXT CHECK (platform IN ('youtube', 'vimeo', 'other')),
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 2: Payment System Extensions
-- =====================================================

-- Update Payments Table with additional columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS region TEXT; -- 'japan', 'us', 'taiwan'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_transfer_info JSONB; -- Bank transfer details
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT; -- Receipt file URL
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id); -- Admin who confirmed
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- 12. Tax Invoices Table
CREATE TABLE IF NOT EXISTS tax_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  company_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  -- Company Tax Info
  business_registration_number TEXT NOT NULL,
  company_name TEXT NOT NULL,
  ceo_name TEXT NOT NULL,
  business_address TEXT NOT NULL,
  business_type TEXT, -- 업태
  business_category TEXT, -- 종목
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Invoice Info
  invoice_amount INTEGER NOT NULL,
  invoice_date DATE,
  invoice_number TEXT, -- Generated by admin
  
  -- Status
  status TEXT CHECK (status IN ('requested', 'issued', 'cancelled')) DEFAULT 'requested',
  
  -- File
  invoice_file_url TEXT, -- PDF file URL
  
  -- Admin
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 3: Points System
-- =====================================================

-- 13. Points Balance Table
CREATE TABLE IF NOT EXISTS points_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_charged INTEGER DEFAULT 0, -- Total points ever charged
  total_spent INTEGER DEFAULT 0, -- Total points ever spent
  total_granted INTEGER DEFAULT 0, -- Total points granted by admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Points Transactions Table
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Info
  type TEXT CHECK (type IN ('charge', 'spend', 'grant', 'refund')) NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Description
  description TEXT,
  
  -- Related Records
  payment_id UUID REFERENCES payments(id), -- For charge transactions
  campaign_id UUID REFERENCES campaigns(id), -- For spend transactions
  granted_by UUID REFERENCES auth.users(id), -- For grant transactions
  grant_reason TEXT, -- Reason for admin grant
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Points Charge Requests Table
CREATE TABLE IF NOT EXISTS points_charge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Charge Info
  amount INTEGER NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'bank_transfer')),
  
  -- Stripe Info
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  
  -- Bank Transfer Info
  bank_transfer_info JSONB,
  
  -- Tax Invoice
  needs_tax_invoice BOOLEAN DEFAULT false,
  tax_invoice_id UUID REFERENCES tax_invoices(id),
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  
  -- Admin
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 4: Terms System
-- =====================================================

-- 16. Terms Table
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Term Info
  type TEXT CHECK (type IN ('service', 'privacy', 'marketing', 'third_party', 'payment')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Version
  version TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. User Term Agreements Table
CREATE TABLE IF NOT EXISTS user_term_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  
  -- Agreement Info
  agreed BOOLEAN DEFAULT true,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- IP and User Agent
  ip_address INET,
  user_agent TEXT,
  
  -- Unique constraint
  UNIQUE(user_id, term_id)
);

-- =====================================================
-- PART 5: Indexes
-- =====================================================

-- Base Tables Indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_company_id ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_payments_campaign_id ON payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_featured_creators_active ON featured_creators(is_active);
CREATE INDEX IF NOT EXISTS idx_guides_campaign_id ON guides(campaign_id);
CREATE INDEX IF NOT EXISTS idx_video_revisions_campaign_id ON video_revisions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reference_videos_active ON reference_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_reference_videos_order ON reference_videos(display_order);

-- Payment System Indexes
CREATE INDEX IF NOT EXISTS idx_payments_region ON payments(region);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_company_id ON tax_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_status ON tax_invoices(status);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_payment_id ON tax_invoices(payment_id);

-- Points System Indexes
CREATE INDEX IF NOT EXISTS idx_points_balance_company_id ON points_balance(company_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_company_id ON points_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON points_transactions(type);
CREATE INDEX IF NOT EXISTS idx_points_charge_requests_company_id ON points_charge_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_points_charge_requests_status ON points_charge_requests(status);

-- Terms System Indexes
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(type);
CREATE INDEX IF NOT EXISTS idx_terms_is_active ON terms(is_active);
CREATE INDEX IF NOT EXISTS idx_user_term_agreements_user_id ON user_term_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_term_agreements_term_id ON user_term_agreements(term_id);

-- =====================================================
-- PART 6: Functions and Triggers
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
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

CREATE TRIGGER update_reference_videos_updated_at BEFORE UPDATE ON reference_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_invoices_updated_at BEFORE UPDATE ON tax_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_points_balance_updated_at BEFORE UPDATE ON points_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_points_charge_requests_updated_at BEFORE UPDATE ON points_charge_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Points System Functions
CREATE OR REPLACE FUNCTION get_points_balance(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance
  FROM points_balance
  WHERE company_id = user_id;
  
  RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_points(
  user_id UUID,
  points INTEGER,
  transaction_type TEXT,
  transaction_description TEXT DEFAULT NULL,
  admin_id UUID DEFAULT NULL,
  admin_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Create balance record if not exists
  INSERT INTO points_balance (company_id, balance)
  VALUES (user_id, 0)
  ON CONFLICT (company_id) DO NOTHING;
  
  -- Update balance
  UPDATE points_balance
  SET 
    balance = balance + points,
    total_charged = CASE WHEN transaction_type = 'charge' THEN total_charged + points ELSE total_charged END,
    total_granted = CASE WHEN transaction_type = 'grant' THEN total_granted + points ELSE total_granted END,
    updated_at = NOW()
  WHERE company_id = user_id
  RETURNING balance INTO new_balance;
  
  -- Record transaction
  INSERT INTO points_transactions (
    company_id,
    type,
    amount,
    balance_after,
    description,
    granted_by,
    grant_reason
  ) VALUES (
    user_id,
    transaction_type,
    points,
    new_balance,
    transaction_description,
    admin_id,
    admin_reason
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION spend_points(
  user_id UUID,
  points INTEGER,
  campaign_uuid UUID,
  transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM points_balance
  WHERE company_id = user_id;
  
  -- Check if enough balance
  IF current_balance IS NULL OR current_balance < points THEN
    RETURN FALSE;
  END IF;
  
  -- Update balance
  UPDATE points_balance
  SET 
    balance = balance - points,
    total_spent = total_spent + points,
    updated_at = NOW()
  WHERE company_id = user_id
  RETURNING balance INTO new_balance;
  
  -- Record transaction
  INSERT INTO points_transactions (
    company_id,
    type,
    amount,
    balance_after,
    description,
    campaign_id
  ) VALUES (
    user_id,
    'spend',
    points,
    new_balance,
    transaction_description,
    campaign_uuid
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Revenue Statistics View
CREATE OR REPLACE VIEW revenue_stats AS
SELECT
  -- Total Revenue
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
  
  -- By Region
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND region = 'japan') as japan_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND region = 'us') as us_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND region = 'taiwan') as taiwan_revenue,
  
  -- By Payment Method
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND payment_method = 'stripe') as stripe_revenue,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND payment_method = 'bank_transfer') as bank_transfer_revenue,
  
  -- Counts
  (SELECT COUNT(*) FROM payments WHERE status = 'completed') as total_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
  (SELECT COUNT(*) FROM tax_invoices WHERE status = 'requested') as pending_tax_invoices;

-- =====================================================
-- PART 7: Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
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
ALTER TABLE reference_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_charge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_term_agreements ENABLE ROW LEVEL SECURITY;

-- Companies Policies
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (auth.uid() = user_id);

-- Campaigns Policies
CREATE POLICY "Users can view their own campaigns"
  ON campaigns FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own campaigns"
  ON campaigns FOR UPDATE
  USING (auth.uid() = company_id);

-- Featured Creators Policies (Public Read)
CREATE POLICY "Anyone can view active featured creators"
  ON featured_creators FOR SELECT
  USING (is_active = true);

-- Reference Videos Policies (Public Read)
CREATE POLICY "Anyone can view active reference videos"
  ON reference_videos FOR SELECT
  USING (is_active = true);

-- Tax Invoices Policies
CREATE POLICY "Users can view their own tax invoices"
  ON tax_invoices FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own tax invoices"
  ON tax_invoices FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- Points Balance Policies
CREATE POLICY "Users can view their own points balance"
  ON points_balance FOR SELECT
  USING (auth.uid() = company_id);

-- Points Transactions Policies
CREATE POLICY "Users can view their own points transactions"
  ON points_transactions FOR SELECT
  USING (auth.uid() = company_id);

-- Points Charge Requests Policies
CREATE POLICY "Users can view their own charge requests"
  ON points_charge_requests FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own charge requests"
  ON points_charge_requests FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- Terms Policies
CREATE POLICY "Anyone can view active terms"
  ON terms FOR SELECT
  USING (is_active = true);

-- User Term Agreements Policies
CREATE POLICY "Users can view their own agreements"
  ON user_term_agreements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agreements"
  ON user_term_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PART 8: Admin Policies (mkt_biz@cnec.co.kr)
-- =====================================================

-- Admin can do everything on companies
CREATE POLICY "Admin can do everything on companies"
  ON companies FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can do everything on campaigns
CREATE POLICY "Admin can do everything on campaigns"
  ON campaigns FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can do everything on featured_creators
CREATE POLICY "Admin can do everything on featured_creators"
  ON featured_creators FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can do everything on reference_videos
CREATE POLICY "Admin can do everything on reference_videos"
  ON reference_videos FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can do everything on tax_invoices
CREATE POLICY "Admin can do everything on tax_invoices"
  ON tax_invoices FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can view all payments
CREATE POLICY "Admin can view all payments"
  ON payments FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can update payments
CREATE POLICY "Admin can update payments"
  ON payments FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can view all points balances
CREATE POLICY "Admin can view all points balances"
  ON points_balance FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can update points balances
CREATE POLICY "Admin can update points balances"
  ON points_balance FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can view all points transactions
CREATE POLICY "Admin can view all points transactions"
  ON points_transactions FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can insert points transactions
CREATE POLICY "Admin can insert points transactions"
  ON points_transactions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can view all charge requests
CREATE POLICY "Admin can view all charge requests"
  ON points_charge_requests FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can update charge requests
CREATE POLICY "Admin can update charge requests"
  ON points_charge_requests FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can manage terms
CREATE POLICY "Admin can manage terms"
  ON terms FOR ALL
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- Admin can view all agreements
CREATE POLICY "Admin can view all agreements"
  ON user_term_agreements FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mkt_biz@cnec.co.kr');

-- =====================================================
-- PART 9: Insert Default Terms
-- =====================================================

-- Service Terms
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('service', '서비스 이용약관', '
제1조 (목적)
이 약관은 CNEC BIZ(이하 "회사")가 제공하는 인플루언서 마케팅 플랫폼 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 인플루언서 마케팅 캠페인 관리 플랫폼을 의미합니다.
2. "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 기업 회원을 말합니다.
3. "캠페인"이란 이용자가 인플루언서를 통해 진행하는 마케팅 활동을 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.

제4조 (서비스의 제공)
1. 회사는 다음과 같은 서비스를 제공합니다:
   - 인플루언서 매칭 및 캠페인 관리
   - 콘텐츠 가이드 생성 및 번역
   - 성과 분석 및 보고서
2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.

제5조 (이용자의 의무)
1. 이용자는 서비스 이용 시 다음 행위를 하여서는 안 됩니다:
   - 타인의 정보 도용
   - 허위 정보 제공
   - 저작권 등 타인의 권리 침해
   - 불법적이거나 부적절한 콘텐츠 요청

제6조 (결제 및 환불)
1. 서비스 이용료는 사전에 공지된 요금표에 따릅니다.
2. 환불은 회사의 환불 정책에 따라 처리됩니다.

제7조 (면책조항)
1. 회사는 천재지변, 전쟁, 기타 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

제8조 (분쟁 해결)
1. 이 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
2. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.

부칙
이 약관은 2025년 1월 1일부터 시행합니다.
', '1.0', true, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Privacy Policy
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('privacy', '개인정보 처리방침', '
CNEC BIZ(이하 "회사")는 이용자의 개인정보를 중요시하며, 개인정보 보호법 등 관련 법령을 준수하고 있습니다.

제1조 (개인정보의 수집 항목 및 방법)
1. 수집 항목:
   - 필수: 회사명, 사업자등록번호, 담당자명, 이메일, 전화번호
   - 선택: 마케팅 수신 동의 여부
2. 수집 방법: 회원가입, 서비스 이용 과정에서 수집

제2조 (개인정보의 수집 및 이용 목적)
1. 회원 관리: 본인 확인, 서비스 제공
2. 서비스 제공: 캠페인 관리, 결제 처리
3. 마케팅 활용: 신규 서비스 안내 (동의 시)

제3조 (개인정보의 보유 및 이용 기간)
1. 회원 탈퇴 시까지 보유
2. 관련 법령에 따라 일정 기간 보관:
   - 계약 또는 청약철회 기록: 5년
   - 대금결제 및 재화 공급 기록: 5년
   - 소비자 불만 또는 분쟁처리 기록: 3년

제4조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:
1. 이용자가 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

제5조 (이용자의 권리)
1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.
2. 이용자는 언제든지 회원 탈퇴를 통해 개인정보의 수집 및 이용 동의를 철회할 수 있습니다.

제6조 (개인정보 보호책임자)
회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
- 이메일: privacy@cnecbiz.com
- 전화: 02-1234-5678

부칙
이 방침은 2025년 1월 1일부터 시행합니다.
', '1.0', true, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Marketing Agreement
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('marketing', '마케팅 정보 수신 동의', '
CNEC BIZ는 다음과 같은 마케팅 정보를 제공합니다:

1. 제공 내용:
   - 신규 서비스 및 이벤트 안내
   - 프로모션 및 할인 정보
   - 서비스 개선 및 업데이트 소식

2. 제공 방법:
   - 이메일
   - SMS/MMS
   - 앱 푸시 알림

3. 철회 방법:
   - 마이페이지에서 언제든지 수신 거부 가능
   - 수신 거부 시에도 서비스 이용에는 영향이 없습니다

본 동의는 선택사항이며, 동의하지 않아도 서비스 이용이 가능합니다.
', '1.0', false, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Third Party Agreement
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('third_party', '제3자 정보 제공 동의', '
CNEC BIZ는 서비스 제공을 위해 다음과 같이 이용자의 개인정보를 제3자에게 제공합니다:

1. 제공받는 자: 제휴 인플루언서, 결제 대행사
2. 제공 목적: 캠페인 진행, 결제 처리
3. 제공 항목: 회사명, 담당자명, 이메일, 전화번호
4. 보유 및 이용 기간: 캠페인 종료 시까지

본 동의는 선택사항이나, 동의하지 않을 경우 일부 서비스 이용이 제한될 수 있습니다.
', '1.0', false, '2025-01-01')
ON CONFLICT DO NOTHING;

-- Payment Terms
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('payment', '결제 약관', '
제1조 (결제 수단)
1. 신용카드 (Stripe)
2. 계좌이체
3. 포인트

제2조 (결제 금액)
1. 모든 금액은 부가세 별도입니다.
2. 공급가액 + 부가세(10%) = 총 결제 금액

제3조 (환불 정책)
1. 캠페인 시작 전: 전액 환불
2. 캠페인 진행 중: 진행률에 따라 부분 환불
3. 캠페인 완료 후: 환불 불가

제4조 (세금계산서)
1. 계좌이체 결제 시 세금계산서 발행 가능
2. 발행 요청 후 영업일 기준 2-3일 내 이메일 발송

제5조 (포인트)
1. 1포인트 = 1원
2. 유효기간: 충전일로부터 5년
3. 환불 시 수수료 10% 차감

본 약관에 동의하시면 결제를 진행할 수 있습니다.
', '1.0', true, '2025-01-01')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ CNEC BIZ Complete Database Setup Finished!';
  RAISE NOTICE '📊 Created 17 tables with all relationships';
  RAISE NOTICE '🔧 Created helper functions and views';
  RAISE NOTICE '🔒 Row Level Security enabled with admin policies';
  RAISE NOTICE '📋 Default terms inserted';
  RAISE NOTICE '🎉 Database is ready to use!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Create admin user with email: mkt_biz@cnec.co.kr (Google OAuth)r';
END $$;

