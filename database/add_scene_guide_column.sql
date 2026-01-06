-- Add scene_guide column for US/Japan campaigns
-- This stores the 10-scene structured guide with dialogues and translations

-- For US database
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scene_guide JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS dialogue_style TEXT;

-- For applications table - track guide sending
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_sent BOOLEAN DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_sent_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN campaigns.scene_guide IS 'JSON array of scenes with order, scene_type, scene_description, dialogue, shooting_tip and their translations';
COMMENT ON COLUMN campaigns.dialogue_style IS 'Dialogue style preset: natural, enthusiastic, professional, friendly, storytelling';
COMMENT ON COLUMN applications.guide_sent IS 'Whether guide has been sent to creator';
COMMENT ON COLUMN applications.guide_sent_at IS 'Timestamp when guide was sent';
