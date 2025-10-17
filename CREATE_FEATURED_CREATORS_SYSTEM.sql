-- =====================================================
-- Featured Creators System with Approval Workflow
-- =====================================================

-- 1. Create featured_creator_applications table
CREATE TABLE IF NOT EXISTS featured_creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  creator_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Social Media URLs
  instagram_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  other_sns_url TEXT,
  
  -- AI Generated Profile (from Gemini API)
  ai_generated_bio TEXT,
  ai_generated_strengths TEXT[],
  ai_generated_categories TEXT[],
  ai_generated_target_audience TEXT,
  ai_generated_content_style TEXT,
  
  -- Creator Edited Profile
  final_bio TEXT,
  final_strengths TEXT[],
  final_categories TEXT[],
  final_target_audience TEXT,
  final_content_style TEXT,
  
  -- Statistics
  total_followers INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  avg_views INTEGER DEFAULT 0,
  
  -- Portfolio
  portfolio_images TEXT[], -- Array of image URLs
  sample_video_urls TEXT[], -- Array of video URLs
  
  -- Application Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  -- draft: 작성 중
  -- pending: 승인 대기
  -- approved: 승인됨 (추천 크리에이터 풀에 포함)
  -- rejected: 거절됨
  
  -- Admin Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ, -- When status changed to 'pending'
  approved_at TIMESTAMPTZ -- When status changed to 'approved'
);

-- 2. Create approved_featured_creators view (only approved creators)
CREATE OR REPLACE VIEW approved_featured_creators AS
SELECT 
  id,
  user_id,
  creator_name,
  email,
  phone,
  instagram_url,
  youtube_url,
  tiktok_url,
  other_sns_url,
  final_bio as bio,
  final_strengths as strengths,
  final_categories as categories,
  final_target_audience as target_audience,
  final_content_style as content_style,
  total_followers,
  avg_engagement_rate,
  avg_views,
  portfolio_images,
  sample_video_urls,
  approved_at,
  created_at
FROM featured_creator_applications
WHERE status = 'approved';

-- 3. Create campaign_creator_matches table (AI matching results)
CREATE TABLE IF NOT EXISTS campaign_creator_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  creator_application_id UUID REFERENCES featured_creator_applications(id) ON DELETE CASCADE,
  
  -- Matching Score (0-100)
  match_score DECIMAL(5,2) NOT NULL,
  
  -- Matching Reasons (AI generated)
  match_reasons JSONB, -- Array of reason objects: [{category: 'audience', reason: '...', weight: 0.3}]
  
  -- Detailed Matching Factors
  category_match_score DECIMAL(5,2), -- 카테고리 일치도
  audience_match_score DECIMAL(5,2), -- 타겟층 일치도
  engagement_score DECIMAL(5,2), -- 참여율 점수
  follower_score DECIMAL(5,2), -- 팔로워 수 점수
  content_style_score DECIMAL(5,2), -- 콘텐츠 스타일 일치도
  
  -- Recommendation Rank (1-10 for top recommendations)
  recommendation_rank INTEGER,
  
  -- Status
  is_recommended BOOLEAN DEFAULT false, -- Top 10에 포함되는지
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_featured_creator_applications_status ON featured_creator_applications(status);
CREATE INDEX idx_featured_creator_applications_user_id ON featured_creator_applications(user_id);
CREATE INDEX idx_campaign_creator_matches_campaign_id ON campaign_creator_matches(campaign_id);
CREATE INDEX idx_campaign_creator_matches_score ON campaign_creator_matches(match_score DESC);
CREATE INDEX idx_campaign_creator_matches_recommended ON campaign_creator_matches(campaign_id, is_recommended) WHERE is_recommended = true;

-- 5. Create RLS policies for featured_creator_applications

-- Enable RLS
ALTER TABLE featured_creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_creator_matches ENABLE ROW LEVEL SECURITY;

-- Creators can view and edit their own applications
CREATE POLICY "Creators can view own applications"
ON featured_creator_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Creators can create applications"
ON featured_creator_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update own draft/rejected applications"
ON featured_creator_applications
FOR UPDATE
USING (auth.uid() = user_id AND status IN ('draft', 'rejected'));

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON featured_creator_applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.role IN ('super_admin', 'admin')
  )
);

-- Admins can update applications (for approval/rejection)
CREATE POLICY "Admins can update applications"
ON featured_creator_applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.role IN ('super_admin', 'admin')
  )
);

-- Companies can view approved creators
CREATE POLICY "Companies can view approved creators"
ON featured_creator_applications
FOR SELECT
USING (status = 'approved');

-- RLS for campaign_creator_matches
CREATE POLICY "Admins can manage matches"
ON campaign_creator_matches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.user_id = auth.uid() 
    AND admins.role IN ('super_admin', 'admin')
  )
);

CREATE POLICY "Companies can view matches for their campaigns"
ON campaign_creator_matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = campaign_creator_matches.campaign_id
    AND comp.user_id = auth.uid()
  )
);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_featured_creator_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Set submitted_at when status changes to pending
  IF NEW.status = 'pending' AND OLD.status != 'pending' THEN
    NEW.submitted_at = NOW();
  END IF;
  
  -- Set approved_at when status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_featured_creator_applications_updated_at
BEFORE UPDATE ON featured_creator_applications
FOR EACH ROW
EXECUTE FUNCTION update_featured_creator_applications_updated_at();

-- 7. Create function to calculate matching score
CREATE OR REPLACE FUNCTION calculate_creator_match_score(
  p_campaign_id UUID,
  p_creator_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_campaign RECORD;
  v_creator RECORD;
  v_match_score DECIMAL(5,2);
  v_category_score DECIMAL(5,2);
  v_audience_score DECIMAL(5,2);
  v_engagement_score DECIMAL(5,2);
  v_follower_score DECIMAL(5,2);
  v_content_score DECIMAL(5,2);
  v_reasons JSONB;
BEGIN
  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  -- Get creator details
  SELECT * INTO v_creator FROM featured_creator_applications WHERE id = p_creator_id;
  
  -- Calculate category match (0-100)
  -- Check if campaign category matches creator categories
  IF v_campaign.category = ANY(v_creator.final_categories) THEN
    v_category_score := 100;
  ELSE
    v_category_score := 50; -- Partial match
  END IF;
  
  -- Calculate engagement score (0-100)
  -- Higher engagement rate = higher score
  v_engagement_score := LEAST(v_creator.avg_engagement_rate * 10, 100);
  
  -- Calculate follower score (0-100)
  -- Normalize follower count (log scale)
  v_follower_score := LEAST(LOG(GREATEST(v_creator.total_followers, 1)) * 10, 100);
  
  -- Placeholder scores (can be enhanced with more logic)
  v_audience_score := 75;
  v_content_score := 75;
  
  -- Calculate weighted total score
  v_match_score := (
    v_category_score * 0.3 +
    v_audience_score * 0.2 +
    v_engagement_score * 0.25 +
    v_follower_score * 0.15 +
    v_content_score * 0.1
  );
  
  -- Generate reasons
  v_reasons := jsonb_build_array(
    jsonb_build_object(
      'category', 'category_match',
      'reason', CASE 
        WHEN v_category_score = 100 THEN '캠페인 카테고리와 정확히 일치합니다'
        ELSE '관련 카테고리 경험이 있습니다'
      END,
      'weight', 0.3,
      'score', v_category_score
    ),
    jsonb_build_object(
      'category', 'engagement',
      'reason', '평균 참여율 ' || v_creator.avg_engagement_rate || '%로 높은 참여도를 보입니다',
      'weight', 0.25,
      'score', v_engagement_score
    ),
    jsonb_build_object(
      'category', 'followers',
      'reason', '총 ' || v_creator.total_followers || '명의 팔로워를 보유하고 있습니다',
      'weight', 0.15,
      'score', v_follower_score
    )
  );
  
  RETURN jsonb_build_object(
    'match_score', v_match_score,
    'category_match_score', v_category_score,
    'audience_match_score', v_audience_score,
    'engagement_score', v_engagement_score,
    'follower_score', v_follower_score,
    'content_style_score', v_content_score,
    'match_reasons', v_reasons
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to generate top 10 recommendations for a campaign
CREATE OR REPLACE FUNCTION generate_campaign_recommendations(p_campaign_id UUID)
RETURNS TABLE(
  creator_id UUID,
  creator_name VARCHAR,
  match_score DECIMAL,
  match_reasons JSONB,
  rank INTEGER
) AS $$
BEGIN
  -- Delete existing matches for this campaign
  DELETE FROM campaign_creator_matches WHERE campaign_id = p_campaign_id;
  
  -- Calculate matches for all approved creators
  INSERT INTO campaign_creator_matches (
    campaign_id,
    creator_application_id,
    match_score,
    match_reasons,
    category_match_score,
    audience_match_score,
    engagement_score,
    follower_score,
    content_style_score,
    is_recommended,
    recommendation_rank
  )
  SELECT 
    p_campaign_id,
    fca.id,
    (match_data->>'match_score')::DECIMAL,
    match_data->'match_reasons',
    (match_data->>'category_match_score')::DECIMAL,
    (match_data->>'audience_match_score')::DECIMAL,
    (match_data->>'engagement_score')::DECIMAL,
    (match_data->>'follower_score')::DECIMAL,
    (match_data->>'content_style_score')::DECIMAL,
    ROW_NUMBER() OVER (ORDER BY (match_data->>'match_score')::DECIMAL DESC) <= 10,
    ROW_NUMBER() OVER (ORDER BY (match_data->>'match_score')::DECIMAL DESC)
  FROM featured_creator_applications fca
  CROSS JOIN LATERAL calculate_creator_match_score(p_campaign_id, fca.id) AS match_data
  WHERE fca.status = 'approved';
  
  -- Return top 10 recommendations
  RETURN QUERY
  SELECT 
    ccm.creator_application_id,
    fca.creator_name,
    ccm.match_score,
    ccm.match_reasons,
    ccm.recommendation_rank
  FROM campaign_creator_matches ccm
  JOIN featured_creator_applications fca ON ccm.creator_application_id = fca.id
  WHERE ccm.campaign_id = p_campaign_id
  AND ccm.is_recommended = true
  ORDER BY ccm.recommendation_rank;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE featured_creator_applications IS '크리에이터 프로필 등록 신청 및 승인 관리';
COMMENT ON TABLE campaign_creator_matches IS 'AI 기반 캠페인-크리에이터 매칭 결과';
COMMENT ON COLUMN featured_creator_applications.status IS 'draft: 작성중, pending: 승인대기, approved: 승인됨, rejected: 거절됨';
COMMENT ON FUNCTION calculate_creator_match_score IS '캠페인과 크리에이터 간 매칭 점수 계산';
COMMENT ON FUNCTION generate_campaign_recommendations IS '캠페인에 대한 상위 10명 크리에이터 추천 생성';

