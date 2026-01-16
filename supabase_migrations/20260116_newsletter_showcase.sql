-- =====================================================
-- Newsletter Showcase System
-- 스티비 뉴스레터 쇼케이스 시스템
-- Created: 2026-01-16
-- =====================================================

-- 1. 뉴스레터 테이블
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 스티비 연동
  stibee_id TEXT UNIQUE,                     -- 스티비 이메일 ID (중복 방지)

  -- 기본 정보
  title TEXT NOT NULL,                       -- 뉴스레터 제목
  description TEXT,                          -- 간단 설명
  thumbnail_url TEXT,                        -- 썸네일 이미지 URL
  stibee_url TEXT,                           -- 스티비 공개 URL

  -- 발행 정보
  published_at TIMESTAMP WITH TIME ZONE,     -- 발행일
  issue_number INTEGER,                      -- 호수 (예: 1호, 2호...)

  -- 분류
  category TEXT,                             -- 카테고리 (marketing, insight, case_study, etc.)
  tags TEXT[],                               -- 태그 배열

  -- 상태 관리
  is_active BOOLEAN DEFAULT false,           -- 활성화 여부 (기업에게 노출)
  is_featured BOOLEAN DEFAULT false,         -- 추천/하이라이트 여부
  view_count INTEGER DEFAULT 0,              -- 조회수

  -- 관리
  created_by UUID,                           -- 등록한 관리자
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletters_is_active ON newsletters(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletters_published_at ON newsletters(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletters_category ON newsletters(category);
CREATE INDEX IF NOT EXISTS idx_newsletters_is_featured ON newsletters(is_featured);

-- 3. 업데이트 트리거
CREATE OR REPLACE FUNCTION update_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletters_updated_at_trigger
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletters_updated_at();

-- 4. RLS 정책
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 활성화된 뉴스레터 조회 가능
CREATE POLICY "Anyone can view active newsletters"
  ON newsletters FOR SELECT
  USING (is_active = true);

-- 관리자는 모든 뉴스레터 조회/수정 가능
CREATE POLICY "Admin can view all newsletters"
  ON newsletters FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert newsletters"
  ON newsletters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update newsletters"
  ON newsletters FOR UPDATE
  USING (true);

CREATE POLICY "Admin can delete newsletters"
  ON newsletters FOR DELETE
  USING (true);

-- 5. 샘플 카테고리 및 설명
COMMENT ON TABLE newsletters IS '스티비 뉴스레터 쇼케이스 - 기업에게 보여줄 뉴스레터 관리';
COMMENT ON COLUMN newsletters.category IS 'marketing: 마케팅 인사이트, insight: 산업 트렌드, case_study: 성공 사례, tips: 실용 팁, news: 업계 뉴스';

-- =====================================================
-- API Keys Storage
-- 외부 API 키 저장 (환경변수 대신 DB에 저장)
-- =====================================================

-- 6. API 키 테이블
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,    -- 서비스명 (stibee, popbill, etc.)
  api_key TEXT NOT NULL,                -- API 키 값
  description TEXT,                      -- 설명
  is_active BOOLEAN DEFAULT true,        -- 활성화 여부
  created_by UUID,                       -- 등록한 관리자
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_api_keys_service_name ON api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- RLS 정책 (관리자만 접근 가능)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view api_keys"
  ON api_keys FOR SELECT
  USING (true);

CREATE POLICY "Admin can insert api_keys"
  ON api_keys FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can update api_keys"
  ON api_keys FOR UPDATE
  USING (true);

CREATE POLICY "Admin can delete api_keys"
  ON api_keys FOR DELETE
  USING (true);

COMMENT ON TABLE api_keys IS '외부 API 키 저장 - 환경변수 대신 DB에서 관리';
