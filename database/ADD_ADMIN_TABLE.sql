-- =====================================================
-- Add Admin Table and Initial Admin User
-- =====================================================

-- Create admin table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'support')) DEFAULT 'admin',
  permissions JSONB DEFAULT '{"manage_companies": true, "manage_campaigns": true, "manage_payments": true, "manage_creators": true, "manage_admins": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
-- Super admins can do everything
CREATE POLICY "Super admins can view all admins"
  ON admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_admin'
      AND is_active = true
    )
  );

CREATE POLICY "Super admins can insert admins"
  ON admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_admin'
      AND is_active = true
    )
  );

CREATE POLICY "Super admins can update admins"
  ON admins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_admin'
      AND is_active = true
    )
  );

CREATE POLICY "Super admins can delete admins"
  ON admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_admin'
      AND is_active = true
    )
  );

-- Admins can view themselves
CREATE POLICY "Admins can view themselves"
  ON admins FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);

-- Insert initial super admin (mkt_biz@cnec.co.kr)
-- Note: user_id will be null until they sign up, but email is registered
INSERT INTO admins (email, role, permissions, is_active)
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

-- Function to sync admin user_id when they sign up
CREATE OR REPLACE FUNCTION sync_admin_user_id()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE admins
  SET user_id = NEW.id
  WHERE email = NEW.email
  AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync admin user_id on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_sync_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_user_id();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin table created successfully!';
  RAISE NOTICE '👤 Super admin registered: mkt_biz@cnec.co.kr';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '🔄 Auto-sync trigger created';
END $$;

