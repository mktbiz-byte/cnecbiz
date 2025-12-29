-- YouTube Prospects Table
-- 유튜버 검색 결과 및 섭외 관리 테이블
-- 미국/일본 유튜버를 검색하고 섭외하기 위한 테이블

CREATE TABLE IF NOT EXISTS youtube_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- YouTube 채널 정보
  channel_id VARCHAR(50) NOT NULL UNIQUE,
  channel_name VARCHAR(255) NOT NULL,
  channel_handle VARCHAR(100),
  channel_url TEXT,
  thumbnail_url TEXT,
  description TEXT,

  -- 채널 통계
  subscriber_count BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  view_count BIGINT DEFAULT 0,

  -- 추출된 이메일 (공개된 정보에서 추출)
  extracted_email VARCHAR(255),
  email_source VARCHAR(50) CHECK (email_source IN ('description', 'about', 'social_link', 'manual')),
  email_verified BOOLEAN DEFAULT false,

  -- 카테고리 및 국가
  country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('US', 'JP', 'KR', 'TW')),
  category VARCHAR(100),
  tags TEXT[],
  language VARCHAR(10),

  -- 섭외 상태
  outreach_status VARCHAR(30) DEFAULT 'new' CHECK (outreach_status IN (
    'new',           -- 새로 발견
    'contacted',     -- 연락함 (이메일 발송)
    'responded',     -- 응답 받음
    'interested',    -- 관심 있음
    'negotiating',   -- 협상 중
    'accepted',      -- 수락 (섭외 성공)
    'declined',      -- 거절
    'no_response',   -- 무응답
    'invalid_email', -- 이메일 무효
    'blacklisted'    -- 블랙리스트
  )),

  -- 섭외 이력
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  contact_count INTEGER DEFAULT 0,
  last_response_at TIMESTAMP WITH TIME ZONE,
  response_notes TEXT,

  -- 관리
  assigned_admin_id UUID,
  priority INTEGER DEFAULT 0, -- 높을수록 우선순위 높음
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,

  -- 검색 정보
  search_keyword VARCHAR(255),
  search_date DATE,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_country ON youtube_prospects(country_code);
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_status ON youtube_prospects(outreach_status);
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_email ON youtube_prospects(extracted_email) WHERE extracted_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_category ON youtube_prospects(category);
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_subscribers ON youtube_prospects(subscriber_count DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_priority ON youtube_prospects(priority DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_favorite ON youtube_prospects(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_search ON youtube_prospects(search_keyword, search_date);

-- Full-text search index for channel name and description
CREATE INDEX IF NOT EXISTS idx_youtube_prospects_fulltext ON youtube_prospects
  USING gin(to_tsvector('simple', coalesce(channel_name, '') || ' ' || coalesce(description, '')));

-- RLS 활성화
ALTER TABLE youtube_prospects ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능
CREATE POLICY "Admin can view youtube prospects"
  ON youtube_prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Admin can insert youtube prospects"
  ON youtube_prospects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Admin can update youtube prospects"
  ON youtube_prospects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

CREATE POLICY "Admin can delete youtube prospects"
  ON youtube_prospects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_youtube_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER youtube_prospects_updated_at
  BEFORE UPDATE ON youtube_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_youtube_prospects_updated_at();

-- 섭외 이메일 발송 이력 테이블
CREATE TABLE IF NOT EXISTS youtube_prospect_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES youtube_prospects(id) ON DELETE CASCADE,

  -- 이메일 내용
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  template_name VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',

  -- 발송 상태
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- 대기
    'sent',         -- 발송 완료
    'delivered',    -- 전달 확인
    'opened',       -- 열람
    'clicked',      -- 링크 클릭
    'replied',      -- 답장
    'bounced',      -- 반송
    'failed'        -- 실패
  )),

  -- 발송 정보
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID,
  error_message TEXT,

  -- 추적
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_emails_prospect ON youtube_prospect_emails(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_emails_status ON youtube_prospect_emails(status);

-- RLS for email history
ALTER TABLE youtube_prospect_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage prospect emails"
  ON youtube_prospect_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 코멘트 추가
COMMENT ON TABLE youtube_prospects IS '유튜버 검색 결과 및 섭외 관리';
COMMENT ON COLUMN youtube_prospects.channel_id IS 'YouTube 채널 ID (UCxxxx 형식)';
COMMENT ON COLUMN youtube_prospects.extracted_email IS '채널 설명란에서 추출한 이메일';
COMMENT ON COLUMN youtube_prospects.email_source IS '이메일 출처 (description, about, social_link, manual)';
COMMENT ON COLUMN youtube_prospects.outreach_status IS '섭외 진행 상태';
COMMENT ON COLUMN youtube_prospects.country_code IS '대상 국가 (US, JP 등)';

COMMENT ON TABLE youtube_prospect_emails IS '섭외 이메일 발송 이력';
