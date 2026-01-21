-- 뱅크다 입출금 내역 테이블 (하우랩 계좌)
-- Supabase cnectotal 프로젝트 SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS bankda_deposits (
  -- 뱅크다 필수 컬럼 (테이블 스키마에 맞춤)
  bkcode VARCHAR(50) PRIMARY KEY,           -- 거래 키값 (고유값)
  inoutdate DATE NOT NULL,                  -- 입출금 일자
  inouttime TIME,                           -- 입출금 시간
  inouttype VARCHAR(1) NOT NULL,            -- 입출금 구분 (1:입금, 2:출금)
  inoutamount BIGINT NOT NULL,              -- 입출금 금액
  balance BIGINT,                           -- 잔액
  briefs TEXT,                              -- 적요 (입금자명)
  memo TEXT,                                -- 메모
  regdate TIMESTAMP DEFAULT NOW(),          -- 등록일시

  -- 추가 관리 컬럼
  is_matched BOOLEAN DEFAULT false,         -- 매칭 여부
  matched_charge_id UUID,                   -- 매칭된 충전 요청 ID
  matched_at TIMESTAMPTZ,                   -- 매칭 시간
  matched_by VARCHAR(50),                   -- 매칭한 사람 (auto/admin)
  notes TEXT,                               -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_bankda_deposits_inoutdate ON bankda_deposits(inoutdate DESC);
CREATE INDEX IF NOT EXISTS idx_bankda_deposits_inouttype ON bankda_deposits(inouttype);
CREATE INDEX IF NOT EXISTS idx_bankda_deposits_is_matched ON bankda_deposits(is_matched);
CREATE INDEX IF NOT EXISTS idx_bankda_deposits_briefs ON bankda_deposits(briefs);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_bankda_deposits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bankda_deposits_updated_at ON bankda_deposits;
CREATE TRIGGER trigger_update_bankda_deposits_updated_at
  BEFORE UPDATE ON bankda_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_bankda_deposits_updated_at();

-- RLS 비활성화 (서비스 롤 키로만 접근)
ALTER TABLE bankda_deposits DISABLE ROW LEVEL SECURITY;

-- 코멘트
COMMENT ON TABLE bankda_deposits IS '뱅크다에서 전송받은 하우랩 계좌 입출금 내역';
COMMENT ON COLUMN bankda_deposits.bkcode IS '뱅크다 거래 고유 키값';
COMMENT ON COLUMN bankda_deposits.inouttype IS '1:입금, 2:출금';
COMMENT ON COLUMN bankda_deposits.briefs IS '적요 (입금자명)';
