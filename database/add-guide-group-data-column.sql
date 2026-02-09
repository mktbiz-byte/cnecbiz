-- 캠페인 그룹별 가이드 데이터 저장을 위한 컬럼 추가
-- campaigns 테이블에 guide_group_data jsonb 컬럼 추가
-- 구조: { "그룹명": { "step1": "...", "step2": "...", "step3": "..." }, ... }

-- ⚠️ BIZ DB + Korea DB 모두 실행 필요
-- (Korea region 캠페인은 supabaseKorea를 사용하므로 Korea DB에도 반드시 적용)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS guide_group_data jsonb DEFAULT '{}';
