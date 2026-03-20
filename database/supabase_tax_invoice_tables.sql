-- 세금계산서 신청 테이블
CREATE TABLE IF NOT EXISTS tax_invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_request_id UUID REFERENCES points_charge_requests(id),
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  -- 신청 정보
  amount INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, issued, cancelled
  
  -- 입금 정보
  is_deposit_confirmed BOOLEAN DEFAULT FALSE,
  deposit_confirmed_at TIMESTAMPTZ,
  
  -- 발행 정보
  is_prepaid BOOLEAN DEFAULT FALSE, -- 선발행 여부
  issued_at TIMESTAMPTZ,
  issued_by VARCHAR(255),
  
  -- 팝빌 정보
  popbill_nts_confirm_num VARCHAR(255), -- 국세청 승인번호
  popbill_mgt_key VARCHAR(255), -- 팝빌 관리번호
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 미수금 테이블
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  
  -- 미수금 정보
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- prepaid_tax_invoice, prepaid_points
  status VARCHAR(50) DEFAULT 'outstanding', -- outstanding, settled, cancelled
  
  -- 관련 정보
  tax_invoice_request_id UUID REFERENCES tax_invoice_requests(id),
  charge_request_id UUID REFERENCES points_charge_requests(id),
  
  -- 정산 정보
  settled_at TIMESTAMPTZ,
  settled_by VARCHAR(255),
  settlement_method VARCHAR(100), -- deposit, offset
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tax_invoice_requests_company ON tax_invoice_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoice_requests_status ON tax_invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_tax_invoice_requests_charge ON tax_invoice_requests(charge_request_id);

CREATE INDEX IF NOT EXISTS idx_receivables_company ON receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_type ON receivables(type);

-- RLS 정책
ALTER TABLE tax_invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- 관리자만 모든 접근 가능
CREATE POLICY "관리자는 모든 세금계산서 신청 접근 가능" ON tax_invoice_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "관리자는 모든 미수금 접근 가능" ON receivables
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 기업은 자신의 데이터만 조회 가능
CREATE POLICY "기업은 자신의 세금계산서 신청 조회 가능" ON tax_invoice_requests
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "기업은 자신의 미수금 조회 가능" ON receivables
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );
