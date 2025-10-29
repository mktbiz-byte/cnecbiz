-- 크리에이터 출금 승인 시 자동으로 financial_records에 비용 기록 생성

-- 1. Trigger 함수 생성
CREATE OR REPLACE FUNCTION auto_create_expense_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 'approved'로 변경되고, 이전 상태가 'approved'가 아닐 때만 실행
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- financial_records에 비용 기록 삽입
    INSERT INTO financial_records (
      record_date,
      type,
      amount,
      description,
      category,
      is_receivable,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(NEW.processed_at::date, CURRENT_DATE),  -- 처리일 또는 오늘 날짜
      'creator_cost',                                   -- 크리에이터 비용
      NEW.requested_amount,                             -- 출금 요청 금액
      CONCAT('크리에이터 출금 - ', NEW.creator_name),  -- 설명
      'creator_payment',                                -- 카테고리
      false,                                            -- 미수금 아님
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger 생성 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_auto_create_expense_on_withdrawal ON creator_withdrawal_requests;

CREATE TRIGGER trigger_auto_create_expense_on_withdrawal
  AFTER UPDATE ON creator_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_expense_on_withdrawal();

-- 3. 테스트용 주석
-- UPDATE creator_withdrawal_requests SET status = 'approved', processed_at = NOW() WHERE id = 'test-id';

