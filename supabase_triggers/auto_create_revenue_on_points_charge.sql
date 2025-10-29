-- 포인트 충전 승인 시 자동으로 financial_records에 매출 기록 생성

-- 1. Trigger 함수 생성
CREATE OR REPLACE FUNCTION auto_create_revenue_on_points_charge()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 'approved'로 변경되고, 이전 상태가 'approved'가 아닐 때만 실행
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- financial_records에 매출 기록 삽입
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
      COALESCE(NEW.approved_at::date, CURRENT_DATE),  -- 승인일 또는 오늘 날짜
      'revenue',                                       -- 매출
      NEW.amount,                                      -- 충전 금액
      CONCAT('포인트 충전 - ', NEW.company_name),      -- 설명
      'points_charge',                                 -- 카테고리
      CASE 
        WHEN NEW.payment_method = 'bank_transfer' THEN true  -- 계좌이체는 미수금
        ELSE false                                            -- 카드결제는 즉시 입금
      END,
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger 생성 (이미 존재하면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trigger_auto_create_revenue_on_points_charge ON points_charge_requests;

CREATE TRIGGER trigger_auto_create_revenue_on_points_charge
  AFTER UPDATE ON points_charge_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_revenue_on_points_charge();

-- 3. 테스트용 주석
-- UPDATE points_charge_requests SET status = 'approved', approved_at = NOW() WHERE id = 'test-id';

