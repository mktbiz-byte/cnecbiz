-- ============================================================
-- OpenClo (오픈클로) 테이블 생성 SQL
-- cnecbiz BIZ Supabase 프로젝트용
-- 리전: korea / japan / us 지원
-- ============================================================

-- 1. oc_creators (크리에이터 정보)
CREATE TABLE IF NOT EXISTS oc_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'korea' CHECK (region IN ('korea', 'japan', 'us')),
  platform text NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  platform_url text NOT NULL,
  username text NOT NULL,
  full_name text,
  followers integer DEFAULT 0,
  following integer DEFAULT 0,
  bio text,
  post_count integer DEFAULT 0,
  avg_likes integer DEFAULT 0,
  avg_comments integer DEFAULT 0,
  email text,
  category text[] DEFAULT '{}',
  suspicion_score integer DEFAULT 50,
  ai_summary text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'review', 'rejected')),
  is_registered boolean DEFAULT false,
  registered_user_id uuid,
  contact_status text DEFAULT 'none' CHECK (contact_status IN ('none', 'email_1', 'email_2', 'email_3', 'replied', 'registered', 'collab', 'no_response')),
  email_1_sent_at timestamptz,
  email_2_sent_at timestamptz,
  email_3_sent_at timestamptz,
  stibee_synced boolean DEFAULT false,
  discovered_by text DEFAULT 'bot' CHECK (discovered_by IN ('bot', 'manual')),
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(platform, username, region)
);

-- 2. oc_ai_analysis_logs (AI 분석 기록)
CREATE TABLE IF NOT EXISTS oc_ai_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES oc_creators(id) ON DELETE CASCADE,
  score integer,
  breakdown jsonb,
  reasoning text,
  recommended_action text CHECK (recommended_action IN ('approve', 'review', 'reject')),
  model text DEFAULT 'gemini-2.0-flash',
  created_at timestamptz DEFAULT now()
);

-- 3. oc_contact_logs (컨택 이력)
CREATE TABLE IF NOT EXISTS oc_contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES oc_creators(id) ON DELETE CASCADE,
  type text CHECK (type IN ('email', 'dm', 'call', 'system')),
  direction text CHECK (direction IN ('outbound', 'inbound')),
  email_sequence integer,
  subject text,
  content text,
  result text CHECK (result IN ('sent', 'opened', 'replied', 'bounced', 'no_response', 'registered')),
  created_at timestamptz DEFAULT now()
);

-- 4. oc_bot_activity_logs (봇 활동 로그)
CREATE TABLE IF NOT EXISTS oc_bot_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text DEFAULT 'korea',
  platform text,
  action text CHECK (action IN ('search', 'visit', 'extract', 'analyze', 'error', 'email', 'registration_check')),
  target_url text,
  success boolean DEFAULT true,
  error_message text,
  duration_ms integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. oc_daily_kpi (일간 KPI)
CREATE TABLE IF NOT EXISTS oc_daily_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  region text NOT NULL DEFAULT 'korea' CHECK (region IN ('korea', 'japan', 'us')),
  profiles_visited integer DEFAULT 0,
  new_creators integer DEFAULT 0,
  duplicates_skipped integer DEFAULT 0,
  approved integer DEFAULT 0,
  review integer DEFAULT 0,
  rejected integer DEFAULT 0,
  emails_collected integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  replies_received integer DEFAULT 0,
  new_registrations integer DEFAULT 0,
  bot_uptime_pct decimal DEFAULT 0,
  captcha_count integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  platform_breakdown jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, region)
);

-- 6. oc_bot_config (봇 설정)
CREATE TABLE IF NOT EXISTS oc_bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'korea' CHECK (region IN ('korea', 'japan', 'us')),
  platform text NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok')),
  is_active boolean DEFAULT true,
  search_keywords text[] DEFAULT '{}',
  hashtags text[] DEFAULT '{}',
  min_followers integer DEFAULT 1000,
  max_followers integer DEFAULT 1000000,
  target_categories text[] DEFAULT '{}',
  speed_mode text DEFAULT 'normal' CHECK (speed_mode IN ('slow', 'normal', 'fast')),
  daily_limit integer DEFAULT 500,
  session_config jsonb,
  email_template_1 text,
  email_template_2 text,
  email_template_3 text,
  email_interval_days integer DEFAULT 3,
  naver_works_webhook_url text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid,
  UNIQUE(region, platform)
);

-- 7. oc_allowed_ips (IP 화이트리스트)
CREATE TABLE IF NOT EXISTS oc_allowed_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  label text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_oc_creators_status ON oc_creators(status);
CREATE INDEX IF NOT EXISTS idx_oc_creators_contact_status ON oc_creators(contact_status);
CREATE INDEX IF NOT EXISTS idx_oc_creators_is_registered ON oc_creators(is_registered);
CREATE INDEX IF NOT EXISTS idx_oc_creators_region ON oc_creators(region);
CREATE INDEX IF NOT EXISTS idx_oc_creators_platform ON oc_creators(platform);
CREATE INDEX IF NOT EXISTS idx_oc_daily_kpi_date ON oc_daily_kpi(date);
CREATE INDEX IF NOT EXISTS idx_oc_daily_kpi_region ON oc_daily_kpi(region);
CREATE INDEX IF NOT EXISTS idx_oc_bot_activity_logs_created_at ON oc_bot_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oc_bot_activity_logs_region ON oc_bot_activity_logs(region);
CREATE INDEX IF NOT EXISTS idx_oc_ai_analysis_logs_creator ON oc_ai_analysis_logs(creator_id);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_oc_creators_updated_at ON oc_creators;
CREATE TRIGGER update_oc_creators_updated_at
  BEFORE UPDATE ON oc_creators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oc_bot_config_updated_at ON oc_bot_config;
CREATE TRIGGER update_oc_bot_config_updated_at
  BEFORE UPDATE ON oc_bot_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- is_registered 자동 체크 함수 + 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION check_creator_registration()
RETURNS TRIGGER AS $$
DECLARE
  found_user_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    -- Supabase Auth users 테이블에서 이메일 확인
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;

    IF found_user_id IS NOT NULL THEN
      NEW.is_registered := true;
      NEW.registered_user_id := found_user_id;
      IF NEW.contact_status = 'none' THEN
        NEW.contact_status := 'registered';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_oc_creator_registration ON oc_creators;
CREATE TRIGGER check_oc_creator_registration
  BEFORE INSERT OR UPDATE OF email ON oc_creators
  FOR EACH ROW EXECUTE FUNCTION check_creator_registration();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE oc_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_ai_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_bot_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_daily_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE oc_allowed_ips ENABLE ROW LEVEL SECURITY;

-- service_role 전체 접근
CREATE POLICY "service_role_all_oc_creators" ON oc_creators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_ai_analysis_logs" ON oc_ai_analysis_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_contact_logs" ON oc_contact_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_bot_activity_logs" ON oc_bot_activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_daily_kpi" ON oc_daily_kpi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_bot_config" ON oc_bot_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_oc_allowed_ips" ON oc_allowed_ips FOR ALL USING (true) WITH CHECK (true);

-- authenticated 사용자 (관리자) 접근
CREATE POLICY "admin_read_oc_creators" ON oc_creators FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_oc_creators" ON oc_creators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_oc_ai_analysis_logs" ON oc_ai_analysis_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_read_oc_contact_logs" ON oc_contact_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_read_oc_bot_activity_logs" ON oc_bot_activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_read_oc_daily_kpi" ON oc_daily_kpi FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all_oc_bot_config" ON oc_bot_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_oc_allowed_ips" ON oc_allowed_ips FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 초기 데이터: oc_bot_config (리전 x 플랫폼 = 9행)
-- ============================================================
INSERT INTO oc_bot_config (region, platform, search_keywords, hashtags, target_categories, email_template_1, email_template_2, email_template_3)
VALUES
  ('korea', 'instagram', ARRAY['뷰티','패션','맛집','여행'], ARRAY['#인플루언서','#협찬','#리뷰'], ARRAY['beauty','fashion','food','travel'],
   '안녕하세요 {{creator_name}}님! 크넥(CNEC)입니다. {{platform}}에서 활동하시는 모습이 인상적이어서 연락드립니다. 크리에이터 마케팅 플랫폼 크넥에서 다양한 브랜드와 협업 기회를 제공하고 있습니다.',
   '{{creator_name}}님, 이전에 보내드린 메일 확인하셨나요? 크넥에서는 {{category}} 분야 크리에이터님과 함께할 브랜드가 대기하고 있습니다.',
   '{{creator_name}}님께 마지막으로 안내드립니다. 크넥 플랫폼에 가입하시면 즉시 캠페인 매칭이 시작됩니다.'),
  ('korea', 'youtube', ARRAY['브이로그','리뷰','먹방','뷰티'], ARRAY['#유튜버','#협찬','#광고'], ARRAY['beauty','vlog','food','tech'],
   '안녕하세요 {{creator_name}}님! 크넥(CNEC)입니다. YouTube 채널을 보고 연락드립니다.',
   '{{creator_name}}님, 크넥에서 YouTube 크리에이터 전용 캠페인이 진행 중입니다.',
   '{{creator_name}}님께 마지막 안내입니다. 크넥 가입 시 우선 매칭 혜택을 드립니다.'),
  ('korea', 'tiktok', ARRAY['틱톡','챌린지','쇼츠'], ARRAY['#틱톡커','#협찬'], ARRAY['entertainment','beauty','dance'],
   '안녕하세요 {{creator_name}}님! 크넥입니다. TikTok에서 활동하시는 모습이 인상적입니다.',
   '{{creator_name}}님, TikTok 크리에이터 전용 브랜드 협업 기회가 있습니다.',
   '{{creator_name}}님께 마지막 안내입니다.'),
  ('japan', 'instagram', ARRAY['美容','ファッション','グルメ','旅行'], ARRAY['#インフルエンサー','#PR','#レビュー'], ARRAY['beauty','fashion','food','travel'],
   'こんにちは{{creator_name}}さん！CNEC（クネック）と申します。{{platform}}でのご活動を拝見し、ご連絡いたしました。',
   '{{creator_name}}さん、前回のメールはご確認いただけましたでしょうか？',
   '{{creator_name}}さんへ最後のご案内です。'),
  ('japan', 'youtube', ARRAY['Vlog','レビュー','美容'], ARRAY['#ユーチューバー','#PR'], ARRAY['beauty','vlog','tech'],
   'こんにちは{{creator_name}}さん！CNECです。YouTubeチャンネルを拝見しました。',
   '{{creator_name}}さん、YouTubeクリエイター専用キャンペーンがございます。',
   '{{creator_name}}さんへ最後のご案内です。'),
  ('japan', 'tiktok', ARRAY['TikTok','チャレンジ'], ARRAY['#ティックトッカー','#PR'], ARRAY['entertainment','beauty'],
   'こんにちは{{creator_name}}さん！CNECです。TikTokでのご活動が印象的です。',
   '{{creator_name}}さん、TikTokクリエイター専用のブランドコラボ機会がございます。',
   '{{creator_name}}さんへ最後のご案内です。'),
  ('us', 'instagram', ARRAY['beauty','fashion','lifestyle','travel'], ARRAY['#influencer','#collab','#sponsored'], ARRAY['beauty','fashion','lifestyle','travel'],
   'Hi {{creator_name}}! This is CNEC, a creator marketing platform. We''ve been impressed by your {{platform}} content.',
   'Hi {{creator_name}}, just following up on our previous email. CNEC has brands looking for {{category}} creators.',
   'Hi {{creator_name}}, this is our final outreach. Join CNEC to start getting matched with brand campaigns immediately.'),
  ('us', 'youtube', ARRAY['vlog','review','beauty','tech'], ARRAY['#youtuber','#collab'], ARRAY['beauty','vlog','tech'],
   'Hi {{creator_name}}! We''re CNEC. Your YouTube channel caught our attention.',
   'Hi {{creator_name}}, CNEC has YouTube-specific campaigns waiting for creators like you.',
   'Hi {{creator_name}}, last chance to join CNEC and get priority brand matching.'),
  ('us', 'tiktok', ARRAY['tiktok','challenge','trending'], ARRAY['#tiktoker','#collab'], ARRAY['entertainment','beauty','lifestyle'],
   'Hi {{creator_name}}! CNEC here. Your TikTok content is impressive.',
   'Hi {{creator_name}}, we have TikTok-specific brand collaboration opportunities.',
   'Hi {{creator_name}}, this is our final outreach.')
ON CONFLICT (region, platform) DO NOTHING;
