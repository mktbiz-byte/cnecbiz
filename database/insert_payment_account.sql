-- payment_accounts 테이블에 실제 계좌 정보 입력
INSERT INTO payment_accounts (
  account_name,
  bank_name,
  account_number,
  account_holder,
  is_active
) VALUES (
  '기본 입금 계좌',
  'IBK기업은행',
  '047-122753-04-011',
  '주식회사 하우파파',
  true
)
ON CONFLICT (id) DO NOTHING;
