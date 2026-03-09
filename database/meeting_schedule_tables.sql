-- ============================================
-- 미팅 스케줄 시스템 테이블 생성
-- BIZ DB (hbymozdhjseqebpomjsp)
-- 2026-03-09
-- ============================================

-- 1. meeting_slots (관리자가 설정하는 미팅 가능 슬롯)
CREATE TABLE meeting_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  max_bookings INT DEFAULT 1,
  current_bookings INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_date, slot_time)
);

CREATE INDEX idx_meeting_slots_date ON meeting_slots(slot_date);
CREATE INDEX idx_meeting_slots_available ON meeting_slots(slot_date, is_blocked) WHERE is_blocked = FALSE;

-- 2. meeting_bookings (크리에이터 미팅 예약)
CREATE TABLE meeting_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES meeting_slots(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_phone TEXT NOT NULL,
  creator_email TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  preferred_slots JSONB NOT NULL,
  confirmed_slot_id UUID REFERENCES meeting_slots(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  admin_memo TEXT,
  source TEXT DEFAULT 'kakao_alimtalk',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meeting_bookings_status ON meeting_bookings(status);
CREATE INDEX idx_meeting_bookings_date ON meeting_bookings(created_at);
CREATE INDEX idx_meeting_bookings_phone ON meeting_bookings(creator_phone);

-- 3. meeting_settings (전역 설정)
CREATE TABLE meeting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS 활성화 + 정책 설정
-- ============================================

-- meeting_slots RLS
ALTER TABLE meeting_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_slots_select_all" ON meeting_slots
  FOR SELECT USING (true);
CREATE POLICY "meeting_slots_insert_service" ON meeting_slots
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "meeting_slots_update_service" ON meeting_slots
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "meeting_slots_delete_service" ON meeting_slots
  FOR DELETE USING (auth.role() = 'service_role');

-- meeting_bookings RLS
ALTER TABLE meeting_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_bookings_all_service" ON meeting_bookings
  FOR ALL USING (auth.role() = 'service_role');

-- meeting_settings RLS
ALTER TABLE meeting_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_settings_select_all" ON meeting_settings
  FOR SELECT USING (true);
CREATE POLICY "meeting_settings_insert_service" ON meeting_settings
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "meeting_settings_update_service" ON meeting_settings
  FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "meeting_settings_delete_service" ON meeting_settings
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================
-- 기본 설정 데이터
-- ============================================

INSERT INTO meeting_settings (setting_key, setting_value) VALUES
  ('available_times', '["10:00","11:00","14:00","15:00","16:00"]'::jsonb),
  ('slot_duration', '30'::jsonb),
  ('max_advance_days', '30'::jsonb),
  ('min_advance_hours', '24'::jsonb),
  ('auto_generate_slots', 'true'::jsonb),
  ('blocked_weekdays', '[0,6]'::jsonb),
  ('booking_limit_per_creator', '1'::jsonb);
