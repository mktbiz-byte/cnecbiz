-- Add new columns to campaigns table for shooting scenes checkboxes
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_ba_photo BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_no_makeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_closeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_product_closeup BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_product_texture BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_outdoor BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_couple BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_child BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_troubled_skin BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS shooting_scenes_wrinkles BOOLEAN DEFAULT FALSE;

-- Add additional shooting requests field
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests TEXT;

-- Add meta ad code requested field
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_ad_code_requested BOOLEAN DEFAULT FALSE;

-- Add array fields if they don't exist
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_dialogues TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_scenes TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_hashtags TEXT[] DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_duration TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tempo TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tone TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details TEXT;
