CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tid VARCHAR(32) NOT NULL UNIQUE,
  trade_date VARCHAR(8) NOT NULL,
  trade_time VARCHAR(6),
  trade_type VARCHAR(1),
  trade_balance BIGINT NOT NULL,
  after_balance BIGINT,
  briefs TEXT,
  remark1 TEXT,
  remark2 TEXT,
  remark3 TEXT,
  charge_request_id UUID REFERENCES points_charge_requests(id),
  is_matched BOOLEAN DEFAULT false,
  matched_at TIMESTAMPTZ,
  matched_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
