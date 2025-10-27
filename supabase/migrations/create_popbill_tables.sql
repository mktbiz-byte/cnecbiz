-- 팝빌 관련 테이블 생성
-- BIZ Supabase에서 실행

-- 1. 계좌 정보 테이블
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_code VARCHAR(4) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 카카오톡 템플릿 테이블
CREATE TABLE IF NOT EXISTS kakao_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_code VARCHAR(50) NOT NULL UNIQUE,
  template_name VARCHAR(100) NOT NULL,
  template_content TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- deposit_notice, charge_complete, etc.
  status VARCHAR(20) DEFAULT 'draft', -- draft, pending, approved, rejected
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 세금 문서 발행 내역 테이블
CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  charge_request_id UUID REFERENCES points_charge_requests(id) ON DELETE SET NULL,
  document_type VARCHAR(20) NOT NULL, -- taxinvoice, cashbill, statement
  document_key VARCHAR(100) NOT NULL, -- 팝빌 문서 키
  nts_confirm_num VARCHAR(50), -- 국세청 승인번호
  amount INTEGER NOT NULL,
  supply_cost INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'issued', -- issued, cancelled
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  popbill_response JSONB, -- 팝빌 응답 전체 저장
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 메시지 발송 내역 테이블
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL, -- kakao, sms, lms, mms
  template_code VARCHAR(50),
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(100),
  message_content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  popbill_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_kakao_templates_status ON kakao_templates(status);
CREATE INDEX IF NOT EXISTS idx_kakao_templates_code ON kakao_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_tax_documents_company ON tax_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_charge ON tax_documents(charge_request_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_type ON tax_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_message_logs_company ON message_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_status ON message_logs(status);

-- RLS 정책 (슈퍼 관리자만 접근 가능)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kakao_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- 슈퍼 관리자 정책 (모든 작업 허용)
CREATE POLICY "Super admin full access on bank_accounts" ON bank_accounts
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access on kakao_templates" ON kakao_templates
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access on tax_documents" ON tax_documents
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access on message_logs" ON message_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

-- 회사는 자신의 세금 문서 및 메시지 로그만 조회 가능
CREATE POLICY "Companies can view their own tax documents" ON tax_documents
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can view their own message logs" ON message_logs
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kakao_templates_updated_at
  BEFORE UPDATE ON kakao_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_documents_updated_at
  BEFORE UPDATE ON tax_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

