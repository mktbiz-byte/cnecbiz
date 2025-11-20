-- Add guide revision request columns to applications table
-- These columns track company requests for guide modifications

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS guide_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'revision_requested'
ADD COLUMN IF NOT EXISTS guide_revision_request TEXT, -- Company's revision request message
ADD COLUMN IF NOT EXISTS guide_revision_requested_at TIMESTAMP WITH TIME ZONE, -- When revision was requested
ADD COLUMN IF NOT EXISTS guide_editable_by_company BOOLEAN DEFAULT false; -- Whether company can edit guide directly

-- Add comments for documentation
COMMENT ON COLUMN applications.guide_status IS 'Status of guide: pending (기획중), in_progress (작업중), completed (완료), revision_requested (수정요청됨)';
COMMENT ON COLUMN applications.guide_revision_request IS 'Company revision request message sent to admin';
COMMENT ON COLUMN applications.guide_revision_requested_at IS 'Timestamp when company requested guide revision';
COMMENT ON COLUMN applications.guide_editable_by_company IS 'Whether company has permission to edit guide directly';

-- Update existing records to set guide_status based on personalized_guide
UPDATE applications 
SET guide_status = CASE 
  WHEN personalized_guide IS NOT NULL AND personalized_guide != '' THEN 'completed'
  ELSE 'pending'
END
WHERE guide_status IS NULL OR guide_status = 'pending';
