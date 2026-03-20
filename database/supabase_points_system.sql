-- =====================================================
-- CNEC BIZ - Points System
-- =====================================================

-- =====================================================
-- 1. Points Balance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS points_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  total_charged INTEGER DEFAULT 0, -- Total points ever charged
  total_spent INTEGER DEFAULT 0, -- Total points ever spent
  total_granted INTEGER DEFAULT 0, -- Total points granted by admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Points Transactions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction Info
  type TEXT CHECK (type IN ('charge', 'spend', 'grant', 'refund')) NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Description
  description TEXT,
  
  -- Related Records
  payment_id UUID REFERENCES payments(id), -- For charge transactions
  campaign_id UUID REFERENCES campaigns(id), -- For spend transactions
  granted_by UUID REFERENCES auth.users(id), -- For grant transactions
  grant_reason TEXT, -- Reason for admin grant
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Points Charge Requests Table (for bank transfer)
-- =====================================================
CREATE TABLE IF NOT EXISTS points_charge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Charge Info
  amount INTEGER NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'bank_transfer')),
  
  -- Stripe Info
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  
  -- Bank Transfer Info
  bank_transfer_info JSONB,
  
  -- Tax Invoice
  needs_tax_invoice BOOLEAN DEFAULT false,
  tax_invoice_id UUID REFERENCES tax_invoices(id),
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  
  -- Admin
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Function: Get Points Balance
-- =====================================================
CREATE OR REPLACE FUNCTION get_points_balance(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT balance INTO current_balance
  FROM points_balance
  WHERE company_id = user_id;
  
  RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Function: Add Points (Charge or Grant)
-- =====================================================
CREATE OR REPLACE FUNCTION add_points(
  user_id UUID,
  points INTEGER,
  transaction_type TEXT,
  transaction_description TEXT DEFAULT NULL,
  admin_id UUID DEFAULT NULL,
  admin_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Create balance record if not exists
  INSERT INTO points_balance (company_id, balance)
  VALUES (user_id, 0)
  ON CONFLICT (company_id) DO NOTHING;
  
  -- Update balance
  UPDATE points_balance
  SET 
    balance = balance + points,
    total_charged = CASE WHEN transaction_type = 'charge' THEN total_charged + points ELSE total_charged END,
    total_granted = CASE WHEN transaction_type = 'grant' THEN total_granted + points ELSE total_granted END,
    updated_at = NOW()
  WHERE company_id = user_id
  RETURNING balance INTO new_balance;
  
  -- Record transaction
  INSERT INTO points_transactions (
    company_id,
    type,
    amount,
    balance_after,
    description,
    granted_by,
    grant_reason
  ) VALUES (
    user_id,
    transaction_type,
    points,
    new_balance,
    transaction_description,
    admin_id,
    admin_reason
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Function: Spend Points
-- =====================================================
CREATE OR REPLACE FUNCTION spend_points(
  user_id UUID,
  points INTEGER,
  campaign_uuid UUID,
  transaction_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM points_balance
  WHERE company_id = user_id;
  
  -- Check if enough balance
  IF current_balance IS NULL OR current_balance < points THEN
    RETURN FALSE;
  END IF;
  
  -- Update balance
  UPDATE points_balance
  SET 
    balance = balance - points,
    total_spent = total_spent + points,
    updated_at = NOW()
  WHERE company_id = user_id
  RETURNING balance INTO new_balance;
  
  -- Record transaction
  INSERT INTO points_transactions (
    company_id,
    type,
    amount,
    balance_after,
    description,
    campaign_id
  ) VALUES (
    user_id,
    'spend',
    points,
    new_balance,
    transaction_description,
    campaign_uuid
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_points_balance_company_id ON points_balance(company_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_company_id ON points_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON points_transactions(type);
CREATE INDEX IF NOT EXISTS idx_points_charge_requests_company_id ON points_charge_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_points_charge_requests_status ON points_charge_requests(status);

-- =====================================================
-- 8. Triggers
-- =====================================================
CREATE TRIGGER update_points_balance_updated_at BEFORE UPDATE ON points_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_points_charge_requests_updated_at BEFORE UPDATE ON points_charge_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. RLS Policies
-- =====================================================

-- Points Balance
ALTER TABLE points_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points balance"
  ON points_balance FOR SELECT
  USING (auth.uid() = company_id);

-- Points Transactions
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points transactions"
  ON points_transactions FOR SELECT
  USING (auth.uid() = company_id);

-- Points Charge Requests
ALTER TABLE points_charge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own charge requests"
  ON points_charge_requests FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own charge requests"
  ON points_charge_requests FOR INSERT
  WITH CHECK (auth.uid() = company_id);

-- Admin Policies
CREATE POLICY "Admin can view all points balances"
  ON points_balance FOR SELECT
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can update points balances"
  ON points_balance FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can view all points transactions"
  ON points_transactions FOR SELECT
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can insert points transactions"
  ON points_transactions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can view all charge requests"
  ON points_charge_requests FOR SELECT
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can update charge requests"
  ON points_charge_requests FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Points System Setup Complete!';
  RAISE NOTICE '💰 Points balance table created';
  RAISE NOTICE '📊 Points transactions table created';
  RAISE NOTICE '💳 Points charge requests table created';
  RAISE NOTICE '🔧 Helper functions created';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '🎉 Ready to use!';
END $$;

