-- 미수금 상세 관리 테이블 (영상 링크 포함)
DROP TABLE IF EXISTS receivable_details CASCADE;

CREATE TABLE receivable_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financial_record_id UUID,
  
  -- 기본 정보
  company_name TEXT,
  campaign_name TEXT,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- 단가 정보 (원) - 예정 건수
  price_200k INTEGER DEFAULT 0,
  price_300k INTEGER DEFAULT 0,
  price_400k INTEGER DEFAULT 0,
  price_600k INTEGER DEFAULT 0,
  price_700k INTEGER DEFAULT 0,
  
  -- 진행 완료 건수
  completed_200k INTEGER DEFAULT 0,
  completed_300k INTEGER DEFAULT 0,
  completed_400k INTEGER DEFAULT 0,
  completed_600k INTEGER DEFAULT 0,
  completed_700k INTEGER DEFAULT 0,
  
  -- 영상 링크 (JSONB 배열로 저장)
  -- 각 단가별로 영상 링크 배열 저장
  videos_200k JSONB DEFAULT '[]'::jsonb,  -- [{"url": "...", "title": "...", "date": "..."}]
  videos_300k JSONB DEFAULT '[]'::jsonb,
  videos_400k JSONB DEFAULT '[]'::jsonb,
  videos_600k JSONB DEFAULT '[]'::jsonb,
  videos_700k JSONB DEFAULT '[]'::jsonb,
  
  -- 메타 정보
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_receivable_details_financial_record ON receivable_details(financial_record_id);
CREATE INDEX idx_receivable_details_company ON receivable_details(company_name);
CREATE INDEX idx_receivable_details_created_at ON receivable_details(created_at DESC);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_receivable_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_receivable_details_updated_at ON receivable_details;
CREATE TRIGGER trigger_update_receivable_details_updated_at
  BEFORE UPDATE ON receivable_details
  FOR EACH ROW
  EXECUTE FUNCTION update_receivable_details_updated_at();

-- 코멘트 추가
COMMENT ON TABLE receivable_details IS '미수금 상세 관리 - 단가별 진행 건수, 남은 금액, 영상 링크 관리';
COMMENT ON COLUMN receivable_details.videos_200k IS '20만원 단가 영상 링크 배열 (JSONB)';
COMMENT ON COLUMN receivable_details.videos_300k IS '30만원 단가 영상 링크 배열 (JSONB)';
COMMENT ON COLUMN receivable_details.videos_400k IS '40만원 단가 영상 링크 배열 (JSONB)';
COMMENT ON COLUMN receivable_details.videos_600k IS '60만원 단가 영상 링크 배열 (JSONB)';
COMMENT ON COLUMN receivable_details.videos_700k IS '70만원 단가 영상 링크 배열 (JSONB)';
