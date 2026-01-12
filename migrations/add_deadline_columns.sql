-- 캠페인 마감일 컬럼 추가 (Korea DB campaigns 테이블)
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 4주 챌린지 영상 제출 마감일
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_deadline DATE;

-- 4주 챌린지 SNS 업로드 예정일
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week1_sns_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week2_sns_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week3_sns_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS week4_sns_deadline DATE;

-- 올리브영 영상 제출 마감일
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step3_deadline DATE;

-- 올리브영 SNS 업로드 예정일
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step1_sns_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS step2_sns_deadline DATE;

-- 기획형 마감일 (이미 있을 수 있음)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_submission_deadline DATE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sns_upload_deadline DATE;

-- 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'campaigns'
AND column_name LIKE '%deadline%'
ORDER BY column_name;
