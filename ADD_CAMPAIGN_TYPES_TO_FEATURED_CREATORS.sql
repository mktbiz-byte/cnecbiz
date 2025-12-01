-- Add campaign types and country to featured_creator_applications
-- =====================================================

-- 1. Add available_campaign_types column
ALTER TABLE featured_creator_applications
ADD COLUMN IF NOT EXISTS available_campaign_types TEXT[] DEFAULT '{}';

-- 2. Add country column (korea, japan, usa, taiwan)
ALTER TABLE featured_creator_applications
ADD COLUMN IF NOT EXISTS country VARCHAR(20) DEFAULT 'korea' CHECK (country IN ('korea', 'japan', 'usa', 'taiwan'));

-- 3. Add participation statistics columns
ALTER TABLE featured_creator_applications
ADD COLUMN IF NOT EXISTS total_participations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS personalized_participations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS oliveyoung_participations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fourweek_participations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2) DEFAULT 0;

-- 4. Create index for country filtering
CREATE INDEX IF NOT EXISTS idx_featured_creator_applications_country 
ON featured_creator_applications(country);

-- 5. Create index for campaign types filtering
CREATE INDEX IF NOT EXISTS idx_featured_creator_applications_campaign_types 
ON featured_creator_applications USING GIN (available_campaign_types);

-- 6. Add comments
COMMENT ON COLUMN featured_creator_applications.available_campaign_types IS '참여 가능한 캠페인 타입: personalized(기획형), oliveyoung(올영), fourweek(4주 챌린지)';
COMMENT ON COLUMN featured_creator_applications.country IS '크리에이터 국가: korea, japan, usa, taiwan';
COMMENT ON COLUMN featured_creator_applications.total_participations IS '총 참여 횟수';
COMMENT ON COLUMN featured_creator_applications.personalized_participations IS '기획형 캠페인 참여 횟수';
COMMENT ON COLUMN featured_creator_applications.oliveyoung_participations IS '올영 캠페인 참여 횟수';
COMMENT ON COLUMN featured_creator_applications.fourweek_participations IS '4주 챌린지 참여 횟수';
COMMENT ON COLUMN featured_creator_applications.completion_rate IS '캠페인 완료율 (%)';
