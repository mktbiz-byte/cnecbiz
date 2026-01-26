-- =====================================================
-- video_submissions 테이블 status CHECK 제약조건 수정
-- =====================================================
-- 문제: video_submissions 테이블의 status 체크 제약조건에
-- 'completed' 등의 상태값이 포함되어 있지 않아 최종 확정 시 에러 발생
-- 에러 메시지: "new row for relation 'video_submissions' violates check constraint 'video_submissions_status_check'"
-- =====================================================

-- 1. 기존 체크 제약조건 삭제
ALTER TABLE video_submissions DROP CONSTRAINT IF EXISTS video_submissions_status_check;

-- 2. 새로운 체크 제약조건 추가 (모든 상태값 포함)
-- 상태값 설명:
--   pending: 대기 중
--   submitted: 제출됨
--   resubmitted: 재제출됨
--   approved: 승인됨 (검수 완료)
--   rejected: 반려됨
--   revision_requested: 수정 요청
--   completed: 최종 확정 완료 (포인트 지급됨)
--   uploaded: 업로드됨
ALTER TABLE video_submissions
ADD CONSTRAINT video_submissions_status_check
CHECK (status IN (
  'pending',
  'submitted',
  'resubmitted',
  'approved',
  'rejected',
  'revision_requested',
  'completed',
  'uploaded'
));

-- 3. 확인용 쿼리 (실행 후 제약조건 확인)
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'video_submissions'::regclass AND contype = 'c';
