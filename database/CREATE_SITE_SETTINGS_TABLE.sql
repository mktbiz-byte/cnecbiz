-- =====================================================
-- Create site_settings table for footer/site info management
-- Run this SQL in Korea Supabase (cnec.co.kr database)
-- =====================================================

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT '',
  ceo_name TEXT DEFAULT '',
  business_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  customer_service_hours TEXT DEFAULT '',
  copyright_text TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  blog_url TEXT DEFAULT '',
  kakao_channel_url TEXT DEFAULT '',
  privacy_policy_url TEXT DEFAULT '',
  terms_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read site settings (for public footer display)
CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  USING (true);

-- Admins can manage site settings (allow all authenticated users for now)
CREATE POLICY "Authenticated users can insert site settings"
  ON site_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update site settings"
  ON site_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete site settings"
  ON site_settings FOR DELETE
  USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- Insert default site settings (modify values as needed)
INSERT INTO site_settings (
  company_name,
  ceo_name,
  business_number,
  address,
  phone,
  email,
  customer_service_hours,
  copyright_text,
  instagram_url,
  youtube_url,
  blog_url,
  kakao_channel_url,
  privacy_policy_url,
  terms_url
) VALUES (
  '하우랩주식회사',
  '박철용',
  '',
  '',
  '',
  'mkt@howlab.co.kr',
  '평일 09:00 - 18:00',
  '© 2024 CNEC Korea. All rights reserved.',
  '',
  '',
  '',
  '',
  '/privacy',
  '/terms'
) ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ site_settings table created successfully!';
  RAISE NOTICE '📋 Default settings inserted';
  RAISE NOTICE '🔒 RLS policies enabled';
END $$;
