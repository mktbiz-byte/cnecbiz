-- 캠페인 비공개 여부 컬럼 추가 (Korea DB campaigns 테이블)
-- 패키지 캠페인은 is_private = true로 설정되어 cnec.co.kr에서 비노출

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 패키지 설정 테이블에 노출 슬롯 오버라이드 컬럼 추가 (BIZ DB package_settings 테이블)
-- ALTER TABLE package_settings ADD COLUMN IF NOT EXISTS display_remaining_slots INTEGER;
-- ALTER TABLE package_settings ADD COLUMN IF NOT EXISTS display_max_slots INTEGER;

-- 패키지 신청 테이블에 초대장 발송일시 + 취소일시 컬럼 추가 (BIZ DB package_applications 테이블)
-- ALTER TABLE package_applications ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
-- ALTER TABLE package_applications ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
