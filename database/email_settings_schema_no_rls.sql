-- Email Settings Table (Without RLS for USA)
-- Gmail SMTP 설정을 저장하는 테이블

CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_email TEXT NOT NULL,
  gmail_app_password TEXT NOT NULL,
  sender_name TEXT DEFAULT 'CNEC BIZ',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at();

-- 코멘트 추가
COMMENT ON TABLE email_settings IS 'Gmail SMTP 설정 저장';
COMMENT ON COLUMN email_settings.gmail_email IS 'Gmail 이메일 주소';
COMMENT ON COLUMN email_settings.gmail_app_password IS 'Gmail 앱 비밀번호 (16자리)';
COMMENT ON COLUMN email_settings.sender_name IS '발신자 이름';

