-- =====================================================
-- Page Contents Table for No-Code CMS
-- =====================================================

-- 1. Create page_contents table
CREATE TABLE IF NOT EXISTS page_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  page_name VARCHAR(255), -- 페이지 이름 (예: 'landing', 'about', 'footer')
  section_name VARCHAR(255), -- 섹션 이름 (예: 'hero', 'features', 'pricing')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_page_contents_key ON page_contents(content_key);
CREATE INDEX IF NOT EXISTS idx_page_contents_page ON page_contents(page_name);

-- 3. Enable RLS
ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies
DROP POLICY IF EXISTS "Anyone can view contents" ON page_contents;
DROP POLICY IF EXISTS "Admins can manage contents" ON page_contents;

-- 5. Create RLS policies

-- 누구나 콘텐츠 조회 가능
CREATE POLICY "Anyone can view contents"
ON page_contents
FOR SELECT
USING (true);

-- 관리자만 수정 가능
CREATE POLICY "Admins can manage contents"
ON page_contents
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    SELECT email FROM admins WHERE is_active = true
  )
);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_page_contents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_page_contents_updated_at ON page_contents;

CREATE TRIGGER update_page_contents_updated_at
BEFORE UPDATE ON page_contents
FOR EACH ROW
EXECUTE FUNCTION update_page_contents_updated_at();

-- 7. Insert default contents (optional)
INSERT INTO page_contents (content_key, content, page_name, section_name)
VALUES 
  ('landing_hero_title', '지금 바로 시작하세요', 'landing', 'hero'),
  ('landing_hero_subtitle', '14일 만에 완성되는 글로벌 마케팅, CNEC BIZ와 함께라면 가능합니다', 'landing', 'hero'),
  ('footer_company_name', 'CNEC Total (크넥토탈)', 'footer', 'company_info'),
  ('footer_ceo_name', '[대표자명]', 'footer', 'company_info'),
  ('footer_business_number', '[사업자등록번호]', 'footer', 'company_info'),
  ('footer_mail_order_number', '[통신판매업번호]', 'footer', 'company_info'),
  ('footer_address', '[사업장 주소]', 'footer', 'company_info'),
  ('footer_phone', '[전화번호]', 'footer', 'company_info'),
  ('footer_email', 'contact@cnectotal.com', 'footer', 'company_info')
ON CONFLICT (content_key) DO NOTHING;

-- 8. Grant permissions
GRANT SELECT ON page_contents TO anon, authenticated;
GRANT ALL ON page_contents TO authenticated;

COMMENT ON TABLE page_contents IS '노코드 CMS - 웹페이지 콘텐츠 관리';

