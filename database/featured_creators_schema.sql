-- Featured Creators Table
-- 국가별 추천 크리에이터를 저장하는 테이블

CREATE TABLE IF NOT EXISTS featured_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL CHECK (country_code IN ('KR', 'JP', 'US', 'TW')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  featured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, country_code)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_featured_creators_country ON featured_creators(country_code);
CREATE INDEX IF NOT EXISTS idx_featured_creators_active ON featured_creators(is_active);
CREATE INDEX IF NOT EXISTS idx_featured_creators_order ON featured_creators(display_order);

-- RLS (Row Level Security) 활성화
ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능 (공개 데이터)
CREATE POLICY "Anyone can view featured creators"
  ON featured_creators
  FOR SELECT
  USING (is_active = true);

-- 관리자만 삽입 가능
CREATE POLICY "Admin can insert featured creators"
  ON featured_creators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 관리자만 업데이트 가능
CREATE POLICY "Admin can update featured creators"
  ON featured_creators
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 관리자만 삭제 가능
CREATE POLICY "Admin can delete featured creators"
  ON featured_creators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.email = auth.email()
    )
  );

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_featured_creators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER featured_creators_updated_at
  BEFORE UPDATE ON featured_creators
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_creators_updated_at();

-- 코멘트 추가
COMMENT ON TABLE featured_creators IS '국가별 추천 크리에이터';
COMMENT ON COLUMN featured_creators.user_id IS '크리에이터 user_profiles ID';
COMMENT ON COLUMN featured_creators.country_code IS '국가 코드 (KR, JP, US, TW)';
COMMENT ON COLUMN featured_creators.display_order IS '표시 순서 (낮을수록 먼저 표시)';
COMMENT ON COLUMN featured_creators.is_active IS '활성화 여부';
COMMENT ON COLUMN featured_creators.featured_at IS '추천 등록 시각';

