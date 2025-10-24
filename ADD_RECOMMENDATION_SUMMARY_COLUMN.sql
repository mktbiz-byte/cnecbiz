-- Add recommendation_summary column to campaign_creator_matches table

ALTER TABLE campaign_creator_matches 
ADD COLUMN IF NOT EXISTS recommendation_summary TEXT;

COMMENT ON COLUMN campaign_creator_matches.recommendation_summary IS 'AI가 생성한 전체 추천 요약 (2-3문장)';

