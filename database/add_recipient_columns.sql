-- contracts 테이블에 recipient_email, recipient_name 컬럼 추가
-- 관리자 페이지에서 계약서 생성 시 사용

ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_contracts_recipient_email ON contracts(recipient_email);

