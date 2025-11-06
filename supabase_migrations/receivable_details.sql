-- 미수금 상세 관리 테이블
-- 미수금 항목별로 진행 건수와 단가를 관리하여 남은 금액을 계산

CREATE TABLE IF NOT EXISTS receivable_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financial_record_id UUID REFERENCES financial_records(id) ON DELETE CASCADE,
  
  -- 기본 정보
  company_name TEXT,
  campaign_name TEXT,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- 단가 정보 (원)
  price_200k INTEGER DEFAULT 0,  -- 20만원 단가 건수
  price_300k INTEGER DEFAULT 0,  -- 30만원 단가 건수
  price_400k INTEGER DEFAULT 0,  -- 40만원 단가 건수
  price_600k INTEGER DEFAULT 0,  -- 60만원 단가 건수
  price_700k INTEGER DEFAULT 0,  -- 70만원 단가 건수
  
  -- 진행 건수
  completed_200k INTEGER DEFAULT 0,  -- 20만원 완료 건수
  completed_300k INTEGER DEFAULT 0,  -- 30만원 완료 건수
  completed_400k INTEGER DEFAULT 0,  -- 40만원 완료 건수
  completed_600k INTEGER DEFAULT 0,  -- 60만원 완료 건수
  completed_700k INTEGER DEFAULT 0,  -- 70만원 완료 건수
  
  -- 계산된 값 (자동 계산)
  total_planned_count INTEGER GENERATED ALWAYS AS (
    price_200k + price_300k + price_400k + price_600k + price_700k
  ) STORED,
  
  total_completed_count INTEGER GENERATED ALWAYS AS (
    completed_200k + completed_300k + completed_400k + completed_600k + completed_700k
  ) STORED,
  
  remaining_count INTEGER GENERATED ALWAYS AS (
    (price_200k - completed_200k) + 
    (price_300k - completed_300k) + 
    (price_400k - completed_400k) + 
    (price_600k - completed_600k) + 
    (price_700k - completed_700k)
  ) STORED,
  
  completed_amount DECIMAL(12,2) GENERATED ALWAYS AS (
    (completed_200k * 200000) + 
    (completed_300k * 300000) + 
    (completed_400k * 400000) + 
    (completed_600k * 600000) + 
    (completed_700k * 700000)
  ) STORED,
  
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (
    ((price_200k - completed_200k) * 200000) + 
    ((price_300k - completed_300k) * 300000) + 
    ((price_400k - completed_400k) * 400000) + 
    ((price_600k - completed_600k) * 600000) + 
    ((price_700k - completed_700k) * 700000)
  ) STORED,
  
  -- 메타 정보
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_receivable_details_financial_record 
  ON receivable_details(financial_record_id);

CREATE INDEX IF NOT EXISTS idx_receivable_details_company 
  ON receivable_details(company_name);

CREATE INDEX IF NOT EXISTS idx_receivable_details_created_at 
  ON receivable_details(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_receivable_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_receivable_details_updated_at
  BEFORE UPDATE ON receivable_details
  FOR EACH ROW
  EXECUTE FUNCTION update_receivable_details_updated_at();

-- RLS (Row Level Security) 활성화
ALTER TABLE receivable_details ENABLE ROW LEVEL SECURITY;

-- 관리자만 접근 가능하도록 정책 설정
CREATE POLICY "Admin users can view receivable details"
  ON receivable_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can insert receivable details"
  ON receivable_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can update receivable details"
  ON receivable_details FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can delete receivable details"
  ON receivable_details FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- 코멘트 추가
COMMENT ON TABLE receivable_details IS '미수금 상세 관리 - 단가별 진행 건수 및 남은 금액 계산';
COMMENT ON COLUMN receivable_details.financial_record_id IS 'financial_records 테이블 참조';
COMMENT ON COLUMN receivable_details.total_amount IS '총 미수금 금액';
COMMENT ON COLUMN receivable_details.price_200k IS '20만원 단가 예정 건수';
COMMENT ON COLUMN receivable_details.price_300k IS '30만원 단가 예정 건수';
COMMENT ON COLUMN receivable_details.price_400k IS '40만원 단가 예정 건수';
COMMENT ON COLUMN receivable_details.price_600k IS '60만원 단가 예정 건수';
COMMENT ON COLUMN receivable_details.price_700k IS '70만원 단가 예정 건수';
COMMENT ON COLUMN receivable_details.completed_200k IS '20만원 단가 완료 건수';
COMMENT ON COLUMN receivable_details.completed_300k IS '30만원 단가 완료 건수';
COMMENT ON COLUMN receivable_details.completed_400k IS '40만원 단가 완료 건수';
COMMENT ON COLUMN receivable_details.completed_600k IS '60만원 단가 완료 건수';
COMMENT ON COLUMN receivable_details.completed_700k IS '70만원 단가 완료 건수';
COMMENT ON COLUMN receivable_details.total_planned_count IS '총 예정 건수 (자동 계산)';
COMMENT ON COLUMN receivable_details.total_completed_count IS '총 완료 건수 (자동 계산)';
COMMENT ON COLUMN receivable_details.remaining_count IS '남은 건수 (자동 계산)';
COMMENT ON COLUMN receivable_details.completed_amount IS '완료된 금액 (자동 계산)';
COMMENT ON COLUMN receivable_details.remaining_amount IS '남은 금액 (자동 계산)';
