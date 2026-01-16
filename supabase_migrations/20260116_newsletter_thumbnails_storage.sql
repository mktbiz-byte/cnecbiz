-- 뉴스레터 썸네일 이미지 저장을 위한 Supabase Storage 설정
-- 이 파일은 Supabase 대시보드에서 직접 실행하거나,
-- Storage 설정을 위한 참고 자료로 사용하세요.

-- =====================================================
-- Supabase Storage 설정 방법 (대시보드에서 진행)
-- =====================================================

-- 1. Supabase 대시보드 접속
--    https://app.supabase.com 에서 프로젝트 선택

-- 2. Storage 메뉴로 이동
--    좌측 사이드바에서 "Storage" 클릭

-- 3. 새 버킷 생성
--    - "New bucket" 버튼 클릭
--    - Name: newsletter-thumbnails
--    - Public bucket: ON (체크)
--    - File size limit: 5MB (5242880 bytes)
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--    - "Create bucket" 클릭

-- =====================================================
-- RLS (Row Level Security) 정책 설정
-- =====================================================

-- Storage > Policies 에서 newsletter-thumbnails 버킷에 대해 아래 정책 추가

-- 정책 1: 누구나 이미지 조회 가능 (Public Read)
-- Name: Public Access
-- Target roles: anon, authenticated
-- Actions: SELECT
-- Policy: true

-- 정책 2: 인증된 사용자만 업로드 가능
-- Name: Authenticated Upload
-- Target roles: authenticated
-- Actions: INSERT
-- Policy: true

-- 정책 3: 인증된 사용자만 삭제 가능
-- Name: Authenticated Delete
-- Target roles: authenticated
-- Actions: DELETE
-- Policy: true

-- =====================================================
-- SQL 버전 (Storage 스키마에 직접 실행)
-- =====================================================

-- 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'newsletter-thumbnails',
  'newsletter-thumbnails',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS 정책: 누구나 읽기 가능
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT USING (bucket_id = 'newsletter-thumbnails');

-- RLS 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'newsletter-thumbnails'
  AND auth.role() = 'authenticated'
);

-- RLS 정책: 인증된 사용자만 삭제 가능
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'newsletter-thumbnails'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- 확인 사항
-- =====================================================
-- 1. 버킷이 Public으로 설정되어 있는지 확인
-- 2. RLS 정책이 올바르게 적용되어 있는지 확인
-- 3. 업로드 테스트 후 공개 URL이 정상적으로 작동하는지 확인
