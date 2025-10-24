-- =====================================================
-- Fix Companies Table Schema
-- =====================================================

-- Add missing columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active';

-- Make contact_person nullable (optional)
ALTER TABLE companies 
ALTER COLUMN contact_person DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Companies table schema updated!';
  RAISE NOTICE '📋 Added: status column';
  RAISE NOTICE '🔓 Made contact_person nullable';
  RAISE NOTICE '⚡ Added performance indexes';
END $$;

