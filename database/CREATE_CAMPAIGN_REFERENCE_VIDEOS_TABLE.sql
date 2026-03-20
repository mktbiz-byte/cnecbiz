-- Create campaign_reference_videos table
CREATE TABLE IF NOT EXISTS campaign_reference_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_type VARCHAR(50) NOT NULL, -- 'regular', 'oliveyoung', '4week'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaign_reference_videos_type ON campaign_reference_videos(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_reference_videos_active ON campaign_reference_videos(is_active);

-- Add RLS policies
ALTER TABLE campaign_reference_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON campaign_reference_videos
  FOR SELECT USING (is_active = true);

-- Allow authenticated users to manage
CREATE POLICY "Allow authenticated users to insert" ON campaign_reference_videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON campaign_reference_videos
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete" ON campaign_reference_videos
  FOR DELETE USING (auth.role() = 'authenticated');
