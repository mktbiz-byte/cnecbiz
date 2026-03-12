-- ============================================================
-- CNEC Package System - Database Migration
-- Target: Supabase BIZ DB (hbymozdhjseqebpomjsp)
-- Created: 2026-03-12
-- ============================================================

-- 1. package_settings: 월별 패키지 설정
CREATE TABLE IF NOT EXISTS package_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month VARCHAR(7) NOT NULL UNIQUE, -- '2026-03' 형식
  is_active BOOLEAN NOT NULL DEFAULT false,
  title VARCHAR(200) DEFAULT '크넥 10인 10색',
  subtitle VARCHAR(500),
  per_creator_price INTEGER NOT NULL DEFAULT 300000,
  total_creators INTEGER NOT NULL DEFAULT 20,
  discount_rate INTEGER NOT NULL DEFAULT 10,
  max_companies INTEGER NOT NULL DEFAULT 10,
  current_companies INTEGER NOT NULL DEFAULT 0,
  show_creator_count INTEGER,
  landing_description TEXT,
  deadline_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. package_creators: 크리에이터 풀 (월별 최대 30명)
CREATE TABLE IF NOT EXISTS package_creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_setting_id UUID NOT NULL REFERENCES package_settings(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  creator_name VARCHAR(200) NOT NULL,
  display_name VARCHAR(200),
  category VARCHAR(50),
  avg_views VARCHAR(20),
  avg_views_number INTEGER,
  content_style VARCHAR(200),
  highlight VARCHAR(50),
  sample_video_url_1 VARCHAR(500),
  sample_video_url_2 VARCHAR(500),
  sample_video_url_3 VARCHAR(500),
  youtube_channel_url VARCHAR(500),
  subscriber_count VARCHAR(20),
  is_visible_on_landing BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. package_applications: 기업 신청
CREATE TABLE IF NOT EXISTS package_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_setting_id UUID NOT NULL REFERENCES package_settings(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  brand_name VARCHAR(200),
  product_url VARCHAR(500),
  note TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  campaign_url VARCHAR(500),
  campaign_id UUID,
  company_id UUID,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. package_campaign_creators: 캠페인-크리에이터 매칭
CREATE TABLE IF NOT EXISTS package_campaign_creators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  package_creator_id UUID NOT NULL REFERENCES package_creators(id) ON DELETE CASCADE,
  application_id UUID REFERENCES package_applications(id),
  status VARCHAR(30) NOT NULL DEFAULT 'selected',
  selected_at TIMESTAMPTZ DEFAULT now(),
  product_shipped_at TIMESTAMPTZ,
  tracking_number VARCHAR(100),
  video_url VARCHAR(500),
  video_submitted_at TIMESTAMPTZ,
  revision_requests JSONB DEFAULT '[]'::jsonb,
  revision_count INTEGER DEFAULT 0,
  final_video_url VARCHAR(500),
  approved_at TIMESTAMPTZ,
  upload_url VARCHAR(500),
  uploaded_at TIMESTAMPTZ,
  creator_declined BOOLEAN DEFAULT false,
  replaced_by_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_package_settings_month ON package_settings(month);
CREATE INDEX IF NOT EXISTS idx_package_settings_active ON package_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_package_creators_setting ON package_creators(package_setting_id);
CREATE INDEX IF NOT EXISTS idx_package_creators_month ON package_creators(month);
CREATE INDEX IF NOT EXISTS idx_package_applications_setting ON package_applications(package_setting_id);
CREATE INDEX IF NOT EXISTS idx_package_applications_status ON package_applications(status);
CREATE INDEX IF NOT EXISTS idx_package_applications_email ON package_applications(email);
CREATE INDEX IF NOT EXISTS idx_package_campaign_creators_campaign ON package_campaign_creators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_package_campaign_creators_status ON package_campaign_creators(status);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_package_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_package_settings_updated') THEN
    CREATE TRIGGER tr_package_settings_updated BEFORE UPDATE ON package_settings
      FOR EACH ROW EXECUTE FUNCTION update_package_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_package_creators_updated') THEN
    CREATE TRIGGER tr_package_creators_updated BEFORE UPDATE ON package_creators
      FOR EACH ROW EXECUTE FUNCTION update_package_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_package_applications_updated') THEN
    CREATE TRIGGER tr_package_applications_updated BEFORE UPDATE ON package_applications
      FOR EACH ROW EXECUTE FUNCTION update_package_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_package_campaign_creators_updated') THEN
    CREATE TRIGGER tr_package_campaign_creators_updated BEFORE UPDATE ON package_campaign_creators
      FOR EACH ROW EXECUTE FUNCTION update_package_updated_at();
  END IF;
END;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE package_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_campaign_creators ENABLE ROW LEVEL SECURITY;

-- Service role full access (Netlify Functions)
CREATE POLICY "service_role_package_settings" ON package_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_package_creators" ON package_creators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_package_applications" ON package_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_package_campaign_creators" ON package_campaign_creators FOR ALL USING (true) WITH CHECK (true);

-- Authenticated read access (frontend)
CREATE POLICY "auth_read_package_settings" ON package_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_package_creators" ON package_creators FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_package_applications" ON package_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_package_campaign_creators" ON package_campaign_creators FOR SELECT TO authenticated USING (true);

-- Anon read for active package settings and visible creators (landing page)
CREATE POLICY "anon_read_active_settings" ON package_settings FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_visible_creators" ON package_creators FOR SELECT TO anon USING (is_visible_on_landing = true AND is_available = true);
-- Anon can insert applications (public form)
CREATE POLICY "anon_insert_applications" ON package_applications FOR INSERT TO anon WITH CHECK (true);
