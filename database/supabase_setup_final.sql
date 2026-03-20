-- =====================================================
-- CNEC BIZ - Complete Database Setup
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Companies Table
-- =====================================================
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

-- =====================================================
-- 2. Teams Table
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Team Members Table
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- =====================================================
-- 4. Team Invitations Table
-- =====================================================
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

-- =====================================================
-- 5. Campaigns Table
-- =====================================================
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

-- =====================================================
-- 6. Payments Table
-- =====================================================
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

-- =====================================================
-- 7. Featured Creators Table
-- =====================================================
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

-- =====================================================
-- 8. Guides Table
-- =====================================================
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

-- =====================================================
-- 9. Video Revisions Table
-- =====================================================
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

-- =====================================================
-- 10. Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Document Info
  type TEXT CHECK (type IN ('quotation', 'contract')),
  file_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. Reference Videos Table (NEW!)
-- =====================================================
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
-- Indexes
-- =====================================================
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

-- =====================================================
-- Triggers for updated_at
-- =====================================================
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

CREATE TRIGGER update_reference_videos_updated_at BEFORE UPDATE ON reference_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
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

-- Admin Policies (for admin@cnecbiz.com)
CREATE POLICY "Admin can do everything on companies"
  ON companies FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can do everything on campaigns"
  ON campaigns FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can do everything on featured_creators"
  ON featured_creators FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can do everything on reference_videos"
  ON reference_videos FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ CNEC BIZ Database Setup Complete!';
  RAISE NOTICE '📊 Created 11 tables with indexes and triggers';
  RAISE NOTICE '🔒 Row Level Security enabled';
  RAISE NOTICE '🎉 Ready to use!';
END $$;

