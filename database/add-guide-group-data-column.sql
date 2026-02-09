-- 캠페인 그룹별 가이드 데이터 저장을 위한 컬럼 추가
-- campaigns 테이블에 guide_group_data jsonb 컬럼 추가
-- 구조: { "그룹명": { "step1": "...", "step2": "...", "step3": "..." }, ... }

-- BIZ DB에서 실행
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_group_data jsonb DEFAULT '{}';
