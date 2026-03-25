-- bank_transactions 테이블에 세금계산서 추적 컬럼 추가
-- 실행 대상: BIZ DB (supabaseBiz)
-- 날짜: 2026-03-25

-- 세금계산서 발행 상태 (미매칭 입금용 - 매칭된 입금은 points_charge_requests.tax_invoice_issued 참조)
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS tax_invoice_status VARCHAR(20) DEFAULT 'none';

-- 국세청 승인번호 (직접 기록용)
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS tax_invoice_nts_confirm_num VARCHAR(50);

-- 코멘트 추가
COMMENT ON COLUMN bank_transactions.tax_invoice_status IS '세금계산서 상태: none(미발행), pending(발행대기), issued(발행완료), not_needed(불필요)';
COMMENT ON COLUMN bank_transactions.tax_invoice_nts_confirm_num IS '국세청 승인번호 (세금계산서 발행 시)';

-- 세금계산서 미발행 건 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_bank_transactions_tax_status
ON bank_transactions (tax_invoice_status)
WHERE tax_invoice_status = 'none' OR tax_invoice_status IS NULL;
