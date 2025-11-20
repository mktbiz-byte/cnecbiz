-- Add columns for personalized guide management in applications table
-- These columns track guide generation, sharing, and updates

-- Add personalized_guide column if not exists (for storing AI-generated guide)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS personalized_guide TEXT;

-- Add guide_generated_at column (timestamp when guide was generated)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS guide_generated_at TIMESTAMPTZ;

-- Add guide_shared_to_company column (flag indicating if guide was shared to company)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS guide_shared_to_company BOOLEAN DEFAULT FALSE;

-- Add guide_shared_at column (timestamp when guide was shared to company)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS guide_shared_at TIMESTAMPTZ;

-- Add guide_updated_at column (timestamp when guide was last updated)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS guide_updated_at TIMESTAMPTZ;

-- Add comment to explain the columns
COMMENT ON COLUMN applications.personalized_guide IS 'AI-generated personalized guide content for the creator';
COMMENT ON COLUMN applications.guide_generated_at IS 'Timestamp when the personalized guide was first generated';
COMMENT ON COLUMN applications.guide_shared_to_company IS 'Flag indicating if the guide has been shared with the company';
COMMENT ON COLUMN applications.guide_shared_at IS 'Timestamp when the guide was shared to the company';
COMMENT ON COLUMN applications.guide_updated_at IS 'Timestamp when the guide was last updated';
