-- 가계정/찐계정 관리를 위한 계정 상태 필드 추가
-- 한국, 일본, 미국 DB 모두에서 실행해야 함

-- 1. user_profiles 테이블에 계정 상태 관련 필드 추가
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT NULL
  CHECK (account_status IN ('verified', 'warning_1', 'warning_2', 'warning_3'));

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS account_status_note TEXT DEFAULT NULL;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS account_status_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 2. 인덱스 추가 (필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status
ON user_profiles(account_status);

-- 3. 코멘트 추가 (문서화)
COMMENT ON COLUMN user_profiles.account_status IS '계정 상태: verified(찐계정), warning_1(주의), warning_2(경고), warning_3(위험)';
COMMENT ON COLUMN user_profiles.account_status_note IS '계정 상태 설정 이유/메모';
COMMENT ON COLUMN user_profiles.account_status_updated_at IS '계정 상태 최종 업데이트 시간';

-- ============================================
-- 계정 상태 정의:
-- ============================================
-- verified (찐계정): 검증된 진짜 계정
-- warning_1 (주의 - Level 1):
--   - 팔로워 대비 좋아요 비율 1% 미만
--   - 최근 30일 내 팔로워 20% 이상 급증
--   - 댓글이 대부분 이모지만 있음
--   - 게시물 당 참여율 0.5% 미만
-- warning_2 (경고 - Level 2):
--   - 팔로워 대비 좋아요 비율 0.5% 미만
--   - 팔로워 중 비활성 계정 30% 이상
--   - 동일한 댓글이 반복됨
--   - 팔로워 급증 후 급감 이력
-- warning_3 (위험 - Level 3):
--   - 팔로워 구매 서비스 사용 확인
--   - 팔로워 대비 좋아요 비율 0.1% 미만
--   - 봇 팔로워 50% 이상 추정
--   - 조회수 조작 확인
-- ============================================
