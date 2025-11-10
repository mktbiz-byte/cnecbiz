import os
from supabase import create_client, Client

url = "https://vluqhvuhykncicgvkosd.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8"

supabase: Client = create_client(url, key)

# 마이그레이션 SQL
sql = """
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
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_shooting_requests TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS meta_ad_code_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_dialogues TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_scenes TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_hashtags TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_duration TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tempo TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS video_tone TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS additional_details TEXT;
"""

try:
    result = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print("마이그레이션 성공!")
    print(result)
except Exception as e:
    print(f"오류 발생: {e}")
