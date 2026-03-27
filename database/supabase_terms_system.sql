-- =====================================================
-- CNEC BIZ - Terms Agreement System
-- =====================================================

-- =====================================================
-- 1. Terms Table
-- =====================================================
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Term Info
  type TEXT CHECK (type IN ('service', 'privacy', 'marketing', 'third_party', 'payment')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Version
  version TEXT NOT NULL,
  is_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. User Term Agreements Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_term_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  
  -- Agreement Info
  agreed BOOLEAN DEFAULT true,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- IP and User Agent
  ip_address INET,
  user_agent TEXT,
  
  -- Unique constraint
  UNIQUE(user_id, term_id)
);

-- =====================================================
-- 3. Insert Default Terms
-- =====================================================

-- Service Terms
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('service', '서비스 이용약관', '
제1조 (목적)
이 약관은 CNEC BIZ(이하 "회사")가 제공하는 인플루언서 마케팅 플랫폼 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 인플루언서 마케팅 캠페인 관리 플랫폼을 의미합니다.
2. "이용자"란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 기업 회원을 말합니다.
3. "캠페인"이란 이용자가 인플루언서를 통해 진행하는 마케팅 활동을 의미합니다.

제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.

제4조 (서비스의 제공)
1. 회사는 다음과 같은 서비스를 제공합니다:
   - 인플루언서 매칭 및 캠페인 관리
   - 콘텐츠 가이드 생성 및 번역
   - 성과 분석 및 보고서
2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.

제5조 (이용자의 의무)
1. 이용자는 서비스 이용 시 다음 행위를 하여서는 안 됩니다:
   - 타인의 정보 도용
   - 허위 정보 제공
   - 저작권 등 타인의 권리 침해
   - 불법적이거나 부적절한 콘텐츠 요청

제6조 (결제 및 환불)
1. 서비스 이용료는 사전에 공지된 요금표에 따릅니다.
2. 환불은 회사의 환불 정책에 따라 처리됩니다.

제7조 (면책조항)
1. 회사는 천재지변, 전쟁, 기타 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

제8조 (분쟁 해결)
1. 이 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.
2. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.

부칙
이 약관은 2025년 1월 1일부터 시행합니다.
', '1.0', true, '2025-01-01');

-- Privacy Policy
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('privacy', '개인정보 처리방침', '
CNEC BIZ(이하 "회사")는 이용자의 개인정보를 중요시하며, 개인정보 보호법 등 관련 법령을 준수하고 있습니다.

제1조 (개인정보의 수집 항목 및 방법)
1. 수집 항목:
   - 필수: 회사명, 사업자등록번호, 담당자명, 이메일, 전화번호
   - 선택: 마케팅 수신 동의 여부
2. 수집 방법: 회원가입, 서비스 이용 과정에서 수집

제2조 (개인정보의 수집 및 이용 목적)
1. 회원 관리: 본인 확인, 서비스 제공
2. 서비스 제공: 캠페인 관리, 결제 처리
3. 마케팅 활용: 신규 서비스 안내 (동의 시)

제3조 (개인정보의 보유 및 이용 기간)
1. 회원 탈퇴 시까지 보유
2. 관련 법령에 따라 일정 기간 보관:
   - 계약 또는 청약철회 기록: 5년
   - 대금결제 및 재화 공급 기록: 5년
   - 소비자 불만 또는 분쟁처리 기록: 3년

제4조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:
1. 이용자가 사전에 동의한 경우
2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

제5조 (이용자의 권리)
1. 이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있습니다.
2. 이용자는 언제든지 회원 탈퇴를 통해 개인정보의 수집 및 이용 동의를 철회할 수 있습니다.

제6조 (개인정보 보호책임자)
회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
- 이메일: privacy@cnecbiz.com
- 전화: 02-1234-5678

부칙
이 방침은 2025년 1월 1일부터 시행합니다.
', '1.0', true, '2025-01-01');

-- Marketing Agreement
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('marketing', '마케팅 정보 수신 동의', '
CNEC BIZ는 다음과 같은 마케팅 정보를 제공합니다:

1. 제공 내용:
   - 신규 서비스 및 이벤트 안내
   - 프로모션 및 할인 정보
   - 서비스 개선 및 업데이트 소식

2. 제공 방법:
   - 이메일
   - SMS/MMS
   - 앱 푸시 알림

3. 철회 방법:
   - 마이페이지에서 언제든지 수신 거부 가능
   - 수신 거부 시에도 서비스 이용에는 영향이 없습니다

본 동의는 선택사항이며, 동의하지 않아도 서비스 이용이 가능합니다.
', '1.0', false, '2025-01-01');

-- Third Party Agreement
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('third_party', '제3자 정보 제공 동의', '
CNEC BIZ는 서비스 제공을 위해 다음과 같이 이용자의 개인정보를 제3자에게 제공합니다:

1. 제공받는 자: 제휴 인플루언서, 결제 대행사
2. 제공 목적: 캠페인 진행, 결제 처리
3. 제공 항목: 회사명, 담당자명, 이메일, 전화번호
4. 보유 및 이용 기간: 캠페인 종료 시까지

본 동의는 선택사항이나, 동의하지 않을 경우 일부 서비스 이용이 제한될 수 있습니다.
', '1.0', false, '2025-01-01');

-- Payment Terms
INSERT INTO terms (type, title, content, version, is_required, effective_date) VALUES
('payment', '결제 약관', '
제1조 (결제 수단)
1. 신용카드 (Stripe)
2. 계좌이체
3. 포인트

제2조 (결제 금액)
1. 모든 금액은 부가세 별도입니다.
2. 공급가액 + 부가세(10%) = 총 결제 금액

제3조 (환불 정책)
1. 캠페인 활성화 전: 전액 환불
2. 캠페인 활성화 후: 50% 환불 (실비 공제)
3. 콘텐츠 제출 후: 환불 불가

제4조 (세금계산서)
1. 계좌이체 결제 시 세금계산서 발행 가능
2. 발행 요청 후 영업일 기준 2-3일 내 이메일 발송

제5조 (포인트)
1. 1포인트 = 1원
2. 유효기간: 충전일로부터 5년
3. 환불 시 수수료 10% 차감

본 약관에 동의하시면 결제를 진행할 수 있습니다.
', '1.0', true, '2025-01-01');

-- =====================================================
-- 4. Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(type);
CREATE INDEX IF NOT EXISTS idx_terms_is_active ON terms(is_active);
CREATE INDEX IF NOT EXISTS idx_user_term_agreements_user_id ON user_term_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_term_agreements_term_id ON user_term_agreements(term_id);

-- =====================================================
-- 5. Triggers
-- =====================================================
CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Terms
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active terms"
  ON terms FOR SELECT
  USING (is_active = true);

-- User Term Agreements
ALTER TABLE user_term_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agreements"
  ON user_term_agreements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agreements"
  ON user_term_agreements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin Policies
CREATE POLICY "Admin can manage terms"
  ON terms FOR ALL
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

CREATE POLICY "Admin can view all agreements"
  ON user_term_agreements FOR SELECT
  USING (auth.jwt() ->> 'email' = 'admin@cnecbiz.com');

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Terms Agreement System Setup Complete!';
  RAISE NOTICE '📋 Terms table created with 5 default terms';
  RAISE NOTICE '✓ User agreements table created';
  RAISE NOTICE '🔒 RLS policies applied';
  RAISE NOTICE '🎉 Ready to use!';
END $$;

