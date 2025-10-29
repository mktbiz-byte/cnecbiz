-- 누락된 테이블 생성 스크립트
-- Supabase 대시보드 SQL Editor에서 실행

-- 1. creator_profiles 테이블 (크리에이터 프로필)
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  channel_name TEXT,
  channel_url TEXT,
  followers BIGINT DEFAULT 0,
  region TEXT DEFAULT 'korea',
  approval_status TEXT DEFAULT 'pending',
  phone_number TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. creator_withdrawal_requests 테이블 (크리에이터 출금 신청)
CREATE TABLE IF NOT EXISTS creator_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creator_profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. revenue_records 테이블 (매출 기록)
CREATE TABLE IF NOT EXISTS revenue_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL,
  revenue BIGINT DEFAULT 0,
  expenses BIGINT DEFAULT 0,
  profit BIGINT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_email ON creator_profiles(email);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_region ON creator_profiles(region);
CREATE INDEX IF NOT EXISTS idx_creator_withdrawal_creator_id ON creator_withdrawal_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_withdrawal_status ON creator_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_revenue_records_month ON revenue_records(month);

-- 코멘트 추가
COMMENT ON TABLE creator_profiles IS '크리에이터 프로필 정보';
COMMENT ON TABLE creator_withdrawal_requests IS '크리에이터 출금 신청 내역';
COMMENT ON TABLE revenue_records IS '월별 매출 기록';

