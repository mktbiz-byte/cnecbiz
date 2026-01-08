-- LINE 연동을 위한 데이터베이스 스키마
-- 실행: Supabase SQL Editor에서 실행

-- 1. line_users 테이블 생성 (LINE 친구 추가한 사용자 관리)
CREATE TABLE IF NOT EXISTS line_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, unfollowed
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    unfollowed_at TIMESTAMPTZ,
    linked_at TIMESTAMPTZ, -- 크리에이터 계정과 연동된 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. creators 테이블에 line_user_id 컬럼 추가 (이미 있으면 스킵)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'creators' AND column_name = 'line_user_id'
    ) THEN
        ALTER TABLE creators ADD COLUMN line_user_id VARCHAR(255);
    END IF;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_line_users_line_user_id ON line_users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_users_creator_id ON line_users(creator_id);
CREATE INDEX IF NOT EXISTS idx_line_users_status ON line_users(status);
CREATE INDEX IF NOT EXISTS idx_creators_line_user_id ON creators(line_user_id);

-- 4. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_line_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_line_users_updated_at ON line_users;
CREATE TRIGGER trigger_line_users_updated_at
    BEFORE UPDATE ON line_users
    FOR EACH ROW
    EXECUTE FUNCTION update_line_users_updated_at();

-- 5. LINE 메시지 테이블 (수신 + 발신 모두 저장)
CREATE TABLE IF NOT EXISTS line_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    line_user_id VARCHAR(255) NOT NULL,
    creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
    direction VARCHAR(10) NOT NULL, -- 'incoming' (크리에이터→CNEC) or 'outgoing' (CNEC→크리에이터)
    message_type VARCHAR(50), -- text, image, sticker, etc.
    message_content TEXT,
    template_type VARCHAR(100), -- campaign_selected, signup_complete, etc. (outgoing만)
    status VARCHAR(50) DEFAULT 'delivered', -- delivered, read, failed
    reply_token VARCHAR(255), -- incoming 메시지의 reply token
    read_at TIMESTAMPTZ, -- 관리자가 읽은 시간
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_messages_line_user_id ON line_messages(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_creator_id ON line_messages(creator_id);
CREATE INDEX IF NOT EXISTS idx_line_messages_direction ON line_messages(direction);
CREATE INDEX IF NOT EXISTS idx_line_messages_created_at ON line_messages(created_at);

-- 읽지 않은 메시지 빠른 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_line_messages_unread ON line_messages(line_user_id, read_at)
WHERE direction = 'incoming' AND read_at IS NULL;

-- 6. RLS 정책 (필요시)
-- ALTER TABLE line_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE line_messages ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE line_users IS 'LINE 공식계정 친구 추가한 사용자 정보';
COMMENT ON TABLE line_messages IS 'LINE 메시지 (수신/발신 모두)';
COMMENT ON COLUMN creators.line_user_id IS 'LINE 연동 User ID';
