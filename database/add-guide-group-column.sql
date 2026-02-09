-- 캠페인 크리에이터 그룹 관리를 위한 컬럼 추가
-- applications 테이블에 guide_group 컬럼 추가 (그룹명 저장)

-- ⚠️ BIZ DB + Korea DB 모두 실행 필요
-- (Korea region 캠페인은 supabaseKorea를 사용하므로 Korea DB에도 반드시 적용)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guide_group text;
CREATE INDEX IF NOT EXISTS idx_applications_guide_group ON applications(guide_group);
