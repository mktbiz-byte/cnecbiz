-- featured_creator_applications 테이블 RLS 정책 수정
-- 관리자가 추천 크리에이터를 저장할 수 있도록 권한 부여

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Admin can insert featured creator applications" ON featured_creator_applications;
DROP POLICY IF EXISTS "Admin can update featured creator applications" ON featured_creator_applications;
DROP POLICY IF EXISTS "Admin can delete featured creator applications" ON featured_creator_applications;
DROP POLICY IF EXISTS "Admin can view featured creator applications" ON featured_creator_applications;

-- 관리자 INSERT 권한
CREATE POLICY "Admin can insert featured creator applications"
ON featured_creator_applications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  )
);

-- 관리자 UPDATE 권한
CREATE POLICY "Admin can update featured creator applications"
ON featured_creator_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  )
);

-- 관리자 DELETE 권한
CREATE POLICY "Admin can delete featured creator applications"
ON featured_creator_applications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  )
);

-- 관리자 SELECT 권한
CREATE POLICY "Admin can view featured creator applications"
ON featured_creator_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  )
);

-- 공개 SELECT 권한 (승인된 크리에이터만)
DROP POLICY IF EXISTS "Public can view approved featured creators" ON featured_creator_applications;

CREATE POLICY "Public can view approved featured creators"
ON featured_creator_applications
FOR SELECT
TO anon, authenticated
USING (status = 'approved');
