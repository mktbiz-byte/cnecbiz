-- =====================================================
-- Create admin_users table for Korea Supabase (cnec.co.kr)
-- Run this SQL in Korea Supabase database
-- =====================================================

-- Create admin_users table (same as admin_users in BIZ, for Korea site management)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'support')) DEFAULT 'admin',
  permissions JSONB DEFAULT '{"manage_companies": true, "manage_campaigns": true, "manage_payments": true, "manage_creators": true, "manage_admins": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view themselves and others
CREATE POLICY "Admins can view all admin_users"
  ON admin_users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Super admins can manage admin_users
CREATE POLICY "Super admins can insert admin_users"
  ON admin_users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Super admins can update admin_users"
  ON admin_users FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Super admins can delete admin_users"
  ON admin_users FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- Insert initial super admin (same email as BIZ admin)
INSERT INTO admin_users (email, role, permissions, is_active)
VALUES (
  'mkt_biz@cnec.co.kr',
  'super_admin',
  '{"manage_companies": true, "manage_campaigns": true, "manage_payments": true, "manage_creators": true, "manage_admins": true}'::jsonb,
  true
)
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin',
    permissions = '{"manage_companies": true, "manage_campaigns": true, "manage_payments": true, "manage_creators": true, "manage_admins": true}'::jsonb,
    is_active = true;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ admin_users table created successfully for Korea!';
  RAISE NOTICE '👤 Super admin registered: mkt_biz@cnec.co.kr';
  RAISE NOTICE '🔒 RLS policies enabled';
END $$;
