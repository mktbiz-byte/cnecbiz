-- 캠페인 크리에이터 그룹 관리를 위한 컬럼 추가
-- applications 테이블에 guide_group 컬럼 추가 (그룹명 저장)

-- BIZ DB에서 실행
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_group text;
CREATE INDEX IF NOT EXISTS idx_applications_guide_group ON applications(guide_group);
