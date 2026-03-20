-- =====================================================
-- Reference Videos Table for Landing Page
-- =====================================================

-- 1. Create reference_videos table if not exists
CREATE TABLE IF NOT EXISTS reference_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index for ordering
CREATE INDEX IF NOT EXISTS idx_reference_videos_display_order 
ON reference_videos(display_order) 
WHERE is_active = true;

-- 3. Enable RLS
ALTER TABLE reference_videos ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view active videos" ON reference_videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON reference_videos;

-- 5. Create RLS policies

-- Anyone can view active videos (for landing page)
CREATE POLICY "Anyone can view active videos"
ON reference_videos
FOR SELECT
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage videos"
ON reference_videos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.is_active = true
  )
);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_reference_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reference_videos_updated_at ON reference_videos;

CREATE TRIGGER update_reference_videos_updated_at
BEFORE UPDATE ON reference_videos
FOR EACH ROW
EXECUTE FUNCTION update_reference_videos_updated_at();

-- 7. Insert sample data (optional)
-- Uncomment if you want to add sample videos
/*
INSERT INTO reference_videos (youtube_url, thumbnail_url, display_order, is_active)
VALUES 
  ('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 1, true),
  ('https://www.youtube.com/shorts/9bZkp7q19f0', 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg', 2, true)
ON CONFLICT DO NOTHING;
*/

-- 8. Grant permissions
GRANT SELECT ON reference_videos TO anon, authenticated;
GRANT ALL ON reference_videos TO authenticated;

COMMENT ON TABLE reference_videos IS '랜딩 페이지에 표시될 레퍼런스 영상 관리';

