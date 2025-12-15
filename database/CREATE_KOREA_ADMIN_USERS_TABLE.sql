-- =====================================================
-- Create admin_users table for Korea Supabase (cnec.co.kr)
-- Run this SQL in Korea Supabase database
-- =====================================================

-- Create admin_users table if not exists
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'support')) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin_users" ON admin_users;

-- RLS Policies
CREATE POLICY "Admins can view all admin_users"
  ON admin_users FOR SELECT
  USING (auth.role() = 'authenticated');

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
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Insert initial super admin (without permissions column)
INSERT INTO admin_users (email, role, is_active)
VALUES ('mkt_biz@cnec.co.kr', 'super_admin', true)
ON CONFLICT (email) DO UPDATE
SET role = 'super_admin', is_active = true;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ admin_users table ready for Korea!';
  RAISE NOTICE '👤 Super admin: mkt_biz@cnec.co.kr';
END $$;
