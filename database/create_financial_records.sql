-- Create financial_records table for CSV data
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('revenue', 'fixed_cost', 'variable_cost', 'creator_cost')),
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_receivable BOOLEAN DEFAULT false,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(record_date);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_company ON financial_records(company_id);

-- Enable RLS
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Allow all users to read financial_records" ON financial_records;
CREATE POLICY "Allow all users to read financial_records" ON financial_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert financial_records" ON financial_records;
CREATE POLICY "Allow authenticated users to insert financial_records" ON financial_records FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update financial_records" ON financial_records;
CREATE POLICY "Allow authenticated users to update financial_records" ON financial_records FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete financial_records" ON financial_records;
CREATE POLICY "Allow authenticated users to delete financial_records" ON financial_records FOR DELETE USING (true);

