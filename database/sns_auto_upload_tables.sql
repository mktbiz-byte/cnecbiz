-- SNS 자동 업로드 관련 테이블
-- 실행 대상: supabaseBiz

-- 1. SNS 계정 설정 테이블
CREATE TABLE IF NOT EXISTS sns_upload_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  account_name TEXT NOT NULL, -- 계정 표시명 (예: CNEC 공식)
  account_id TEXT, -- 플랫폼별 계정 ID

  -- OAuth 토큰 (암호화 저장 권장)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- 플랫폼별 추가 정보
  extra_data JSONB DEFAULT '{}',
  -- YouTube: { channel_id }
  -- Instagram: { instagram_business_account_id, facebook_page_id }
  -- TikTok: { open_id }

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 업로드 템플릿 테이블
CREATE TABLE IF NOT EXISTS sns_upload_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 템플릿 이름
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'all')),

  -- 콘텐츠 설정
  title_template TEXT, -- 예: "{creator_name}님의 {campaign_name} 리뷰"
  description_template TEXT,
  hashtags TEXT[], -- 기본 해시태그

  -- 플랫폼별 설정
  youtube_settings JSONB DEFAULT '{}',
  -- { privacy_status: 'public'|'unlisted'|'private', category_id, tags, playlist_id }

  instagram_settings JSONB DEFAULT '{}',
  -- { share_to_feed: true, caption_location }

  tiktok_settings JSONB DEFAULT '{}',
  -- { privacy_level: 'PUBLIC'|'FRIENDS'|'SELF', allow_comment, allow_duet, allow_stitch }

  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 업로드 기록 테이블
CREATE TABLE IF NOT EXISTS sns_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 원본 영상 참조
  source_type TEXT NOT NULL CHECK (source_type IN ('campaign_participant', 'video_submission')),
  source_id UUID NOT NULL, -- campaign_participants.id 또는 video_submissions.id
  video_url TEXT NOT NULL, -- 원본 영상 URL (Supabase Storage)

  -- 업로드 대상
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  account_id UUID REFERENCES sns_upload_accounts(id),
  template_id UUID REFERENCES sns_upload_templates(id),

  -- 업로드 내용
  title TEXT,
  description TEXT,
  hashtags TEXT[],

  -- 업로드 결과
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  platform_video_id TEXT, -- 플랫폼에서 반환한 영상 ID
  platform_video_url TEXT, -- 업로드된 영상의 URL
  error_message TEXT,

  -- 메타데이터
  upload_started_at TIMESTAMPTZ,
  upload_completed_at TIMESTAMPTZ,
  uploaded_by UUID, -- admin_users.id
  scheduled_at TIMESTAMPTZ, -- 예약 업로드 시간 (NULL이면 즉시 업로드)

  -- 캠페인/크리에이터 정보 (비정규화)
  campaign_id UUID,
  campaign_name TEXT,
  creator_name TEXT,

  -- 성과 데이터
  performance_data JSONB DEFAULT '{}',
  -- { views, likes, comments, shares, collected_at }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- status에 'scheduled' 추가
ALTER TABLE sns_uploads DROP CONSTRAINT IF EXISTS sns_uploads_status_check;
ALTER TABLE sns_uploads ADD CONSTRAINT sns_uploads_status_check
  CHECK (status IN ('pending', 'scheduled', 'uploading', 'processing', 'completed', 'failed'));

-- 4. 업로드 큐 테이블 (대량 업로드용)
CREATE TABLE IF NOT EXISTS sns_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES sns_uploads(id),
  priority INTEGER DEFAULT 0, -- 높을수록 먼저 처리
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sns_uploads_status ON sns_uploads(status);
CREATE INDEX IF NOT EXISTS idx_sns_uploads_platform ON sns_uploads(platform);
CREATE INDEX IF NOT EXISTS idx_sns_uploads_source ON sns_uploads(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_sns_upload_queue_next_attempt ON sns_upload_queue(next_attempt_at) WHERE attempts < max_attempts;

-- 기본 템플릿 삽입
INSERT INTO sns_upload_templates (name, platform, title_template, description_template, hashtags, youtube_settings, instagram_settings, tiktok_settings, is_default)
VALUES (
  '기본 템플릿',
  'all',
  '{creator_name}님의 {product_name} 리뷰',
  '{creator_name}님이 {product_name}을(를) 직접 사용해보고 만든 솔직한 리뷰입니다.

✨ 캠페인: {campaign_name}
👤 크리에이터: {creator_name}

#크넥 #CNEC #크리에이터마케팅 #인플루언서',
  ARRAY['크넥', 'CNEC', '크리에이터마케팅', '인플루언서', '리뷰'],
  '{"privacy_status": "public", "category_id": "22"}',
  '{"share_to_feed": true}',
  '{"privacy_level": "PUBLIC", "allow_comment": true, "allow_duet": false, "allow_stitch": false}',
  true
) ON CONFLICT DO NOTHING;
