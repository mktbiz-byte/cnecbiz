-- =====================================================
-- US DB - Applications Status Check Constraint Fix
-- Run this in cnecus Supabase SQL Editor
--
-- 문제: applications 테이블의 status 체크 제약조건에
-- 'selected' 등의 상태값이 포함되어 있지 않아 확정 시 에러 발생
-- 에러 메시지: "new row for relation 'applications' violates check constraint 'applications_status_check'"
-- =====================================================

-- 1. 기존 체크 제약조건 삭제
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- 2. 새로운 체크 제약조건 추가 (모든 상태값 포함)
-- 상태값 설명:
--   pending: 지원 대기 중
--   selected: 최종 선정됨
--   approved: 승인됨
--   virtual_selected: 가상 선정 (확정 전)
--   filming: 촬영 진행 중
--   video_submitted: 영상 제출 완료
--   revision_requested: 수정 요청됨
--   completed: 캠페인 완료
--   guide_confirmation: 가이드 확인 중
--   rejected: 거절됨
--   accepted: 수락됨 (레거시)
--   declined: 거절됨 (레거시)
ALTER TABLE applications
ADD CONSTRAINT applications_status_check
CHECK (status IN (
  'pending',
  'selected',
  'approved',
  'virtual_selected',
  'filming',
  'video_submitted',
  'revision_requested',
  'completed',
  'guide_confirmation',
  'rejected',
  'accepted',
  'declined'
));

-- 3. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ US DB Applications Status Check Constraint Fixed!';
  RAISE NOTICE '📊 Now allows: pending, selected, approved, virtual_selected, filming, video_submitted, revision_requested, completed, guide_confirmation, rejected, accepted, declined';
END $$;
