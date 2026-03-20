-- Add guide_confirmed column to applications table
-- This column tracks whether the campaign guide has been delivered to the creator

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS guide_confirmed BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN applications.guide_confirmed IS 'Whether the campaign guide has been delivered to the creator';
