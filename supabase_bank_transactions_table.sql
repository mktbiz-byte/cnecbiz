-- 계좌 거래 내역 테이블
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 팝빌 거래 정보
  tid VARCHAR(32) NOT NULL UNIQUE, -- 팝빌 거래 내역 아이디
  trade_date VARCHAR(8) NOT NULL, -- 거래일자 (YYYYMMDD)
  trade_time VARCHAR(6), -- 거래시간 (HHMMSS)
  trade_type VARCHAR(1), -- 거래구분 (I:입금, O:출금)
  trade_balance BIGINT NOT NULL, -- 거래금액
  after_balance BIGINT, -- 거래 후 잔액
  briefs TEXT, -- 적요 (입금자명 등)
  remark1 TEXT, -- 비고1
  remark2 TEXT, -- 비고2
  remark3 TEXT, -- 비고3
  
  -- 매칭 정보
  charge_request_id UUID REFERENCES points_charge_requests(id), -- 매칭된 충전 요청 ID
  is_matched BOOLEAN DEFAULT false, -- 매칭 여부
  matched_at TIMESTAMPTZ, -- 매칭 시간
  matched_by VARCHAR(50), -- 매칭한 사람 (auto/admin)
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bank_transactions_tid ON bank_transactions(tid);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_trade_date ON bank_transactions(trade_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_is_matched ON bank_transactions(is_matched);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_charge_request_id ON bank_transactions(charge_request_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_created_at ON bank_transactions(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bank_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transactions_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "관리자만 조회 가능" ON bank_transactions
  FOR SELECT
  USING (true); -- 서비스 롤 키로만 접근

CREATE POLICY "관리자만 수정 가능" ON bank_transactions
  FOR ALL
  USING (true); -- 서비스 롤 키로만 접근

COMMENT ON TABLE bank_transactions IS '팝빌에서 수집한 계좌 거래 내역';
COMMENT ON COLUMN bank_transactions.tid IS '팝빌 거래 내역 고유 ID';
COMMENT ON COLUMN bank_transactions.trade_date IS '거래일자 (YYYYMMDD)';
COMMENT ON COLUMN bank_transactions.trade_type IS 'I:입금, O:출금';
COMMENT ON COLUMN bank_transactions.briefs IS '적요 (입금자명 등)';
COMMENT ON COLUMN bank_transactions.is_matched IS '충전 요청과 매칭 여부';
COMMENT ON COLUMN bank_transactions.matched_by IS 'auto: 자동 매칭, admin: 수동 매칭';
