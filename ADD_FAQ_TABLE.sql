-- =====================================================
-- Add FAQ Table for Admin Management
-- =====================================================

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- 'general', 'voucher', 'service', 'payment', 'technical'
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for faqs table
-- Everyone can view active FAQs
CREATE POLICY "Anyone can view active FAQs"
  ON faqs FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can view all FAQs"
  ON faqs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can insert FAQs"
  ON faqs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update FAQs"
  ON faqs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

CREATE POLICY "Admins can delete FAQs"
  ON faqs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND is_active = true
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs(is_active);

-- Insert default FAQs
INSERT INTO faqs (question, answer, category, display_order, is_active) VALUES
(
  '수출바우처란 무엇인가요?',
  '중소벤처기업부에서 지원하는 수출 지원 사업으로, 해외 마케팅 비용의 최대 80%를 지원받을 수 있습니다. CNEC BIZ는 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다.',
  'voucher',
  1,
  true
),
(
  '어떤 국가를 지원하나요?',
  '현재 일본, 미국, 대만 시장을 중점적으로 지원하고 있습니다. 각 국가별로 현지 언어와 문화에 맞는 크리에이터 네트워크를 보유하고 있습니다.',
  'service',
  2,
  true
),
(
  '캠페인 제작 기간은 얼마나 걸리나요?',
  '평균 14일 이내에 완성됩니다. 크리에이터 매칭 3일, 콘텐츠 제작 7일, 검수 및 수정 2일, 업로드 2일 정도 소요됩니다.',
  'service',
  3,
  true
),
(
  '최소 비용은 얼마인가요?',
  '베이직 패키지는 200만원부터 시작하며, 수출바우처 활용 시 실제 부담금은 40만원부터 가능합니다. 패키지별 상세 견적은 상담을 통해 안내해 드립니다.',
  'payment',
  4,
  true
),
(
  '영상 수정이 가능한가요?',
  '네, 패키지별로 1~3회의 수정 기회가 제공됩니다. 전문 컨설턴트가 브랜드의 요구사항을 정확히 전달하여 만족도 높은 결과물을 보장합니다.',
  'service',
  5,
  true
)
ON CONFLICT DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faqs_updated_at ON faqs;
CREATE TRIGGER faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_faqs_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FAQ table created successfully!';
  RAISE NOTICE '📋 5 default FAQs inserted';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Indexes created';
END $$;

