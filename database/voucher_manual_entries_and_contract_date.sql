-- 수출바우처 수동 입력 테이블 생성
CREATE TABLE IF NOT EXISTS voucher_manual_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contract_date date NOT NULL,
  contract_amount numeric NOT NULL DEFAULT 0,
  entry_type text DEFAULT 'voucher',  -- 'voucher' (수출바우처) or 'point' (포인트 지급)
  description text,
  created_at timestamptz DEFAULT now()
);

-- RLS 비활성화 (관리자 전용 테이블)
ALTER TABLE voucher_manual_entries ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 CRUD 허용 (관리자 페이지에서만 사용)
CREATE POLICY "Allow all for voucher_manual_entries" ON voucher_manual_entries
  FOR ALL USING (true) WITH CHECK (true);

-- entry_type 컬럼 추가 (이미 존재하는 경우 대비)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voucher_manual_entries' AND column_name = 'entry_type'
  ) THEN
    ALTER TABLE voucher_manual_entries ADD COLUMN entry_type text DEFAULT 'voucher';
  END IF;
END $$;

-- companies 테이블에 voucher_contract_date 컬럼 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'voucher_contract_date'
  ) THEN
    ALTER TABLE companies ADD COLUMN voucher_contract_date date;
  END IF;
END $$;
