-- campaigns 테이블에 bonus_amount 컬럼 추가
-- 지원율 높이기 기능 (올리브영, 4주 챌린지, 메가와리 캠페인용)
-- 인당 추가 금액으로 사용됨
--
-- 이 SQL을 Korea와 Japan 리전 모두에 실행해야 함

-- campaigns 테이블에 컬럼 추가
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS bonus_amount INTEGER DEFAULT 0;

-- 컬럼 설명 추가
COMMENT ON COLUMN campaigns.bonus_amount IS '지원율 높이기 - 인당 추가 금액 (원/엔)';

-- 기존 캠페인의 estimated_cost 재계산이 필요할 수 있음
-- [Korea]
-- 올리브영: (400000 + bonus_amount) * total_slots * 1.1
-- 4주 챌린지: (600000 + bonus_amount) * total_slots * 1.1
--
-- [Japan]
-- 메가와리: (base_price + bonus_amount) * total_slots * 1.1
