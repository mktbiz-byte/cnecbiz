-- Meta 광고 관리 관련 테이블
-- 실행 대상: supabaseBiz

-- 1. Meta 광고 계정 테이블
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id TEXT,              -- Meta Business Manager ID
  ad_account_id TEXT NOT NULL,   -- act_XXXXXXXXX
  ad_account_name TEXT,

  -- OAuth 토큰
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- 계정 정보
  currency TEXT DEFAULT 'KRW',
  timezone TEXT DEFAULT 'Asia/Seoul',
  account_status INTEGER,        -- 1=ACTIVE, 2=DISABLED, 3=UNSETTLED, etc.
  extra_data JSONB DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  connected_by UUID,             -- admin_users.id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meta 광고 캠페인 매핑 테이블
CREATE TABLE IF NOT EXISTS meta_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID REFERENCES meta_ad_accounts(id),

  -- Meta Ads 정보
  meta_campaign_id TEXT,         -- Meta 캠페인 ID
  meta_adset_id TEXT,            -- Meta 광고세트 ID
  meta_ad_id TEXT,               -- Meta 광고 ID
  meta_creative_id TEXT,         -- Meta 크리에이티브 ID
  meta_video_id TEXT,            -- Meta에 업로드된 비디오 ID

  -- CNEC 내부 매핑
  campaign_id UUID,              -- campaigns 테이블 참조
  campaign_name TEXT,
  creator_name TEXT,
  video_url TEXT,                -- 원본 영상 URL
  partnership_code TEXT,         -- 광고코드

  -- 광고 설정
  ad_name TEXT,
  objective TEXT DEFAULT 'OUTCOME_AWARENESS',
  status TEXT DEFAULT 'PAUSED',  -- ACTIVE, PAUSED, DELETED, ARCHIVED
  daily_budget BIGINT,           -- 일일 예산 (센트 단위)
  lifetime_budget BIGINT,        -- 총 예산
  target_country TEXT,           -- kr, jp, us

  -- UTM 파라미터
  utm_source TEXT DEFAULT 'meta',
  utm_medium TEXT DEFAULT 'paid',
  utm_campaign TEXT,
  utm_content TEXT,              -- partnership_code 연결

  -- 성과 데이터 (최근 동기화)
  last_synced_at TIMESTAMPTZ,
  performance JSONB DEFAULT '{}',
  -- { impressions, reach, clicks, spend, ctr, cpc, cpm, video_views, video_p25, video_p50, video_p75, video_p100, actions }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Meta 광고 성과 일별 테이블
CREATE TABLE IF NOT EXISTS meta_ad_performance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_ad_campaign_id UUID REFERENCES meta_ad_campaigns(id),
  ad_account_id UUID REFERENCES meta_ad_accounts(id),

  date DATE NOT NULL,

  -- 기본 지표
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0, -- 통화 단위

  -- 비율 지표
  ctr DECIMAL(8,4) DEFAULT 0,   -- Click-Through Rate
  cpc DECIMAL(10,2) DEFAULT 0,  -- Cost Per Click
  cpm DECIMAL(10,2) DEFAULT 0,  -- Cost Per Mille

  -- 영상 지표
  video_views BIGINT DEFAULT 0,
  video_p25 BIGINT DEFAULT 0,   -- 25% 시청
  video_p50 BIGINT DEFAULT 0,   -- 50% 시청
  video_p75 BIGINT DEFAULT 0,   -- 75% 시청
  video_p100 BIGINT DEFAULT 0,  -- 100% 시청

  -- 전환 지표
  actions JSONB DEFAULT '[]',    -- Meta actions array

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_meta_ad_accounts_active ON meta_ad_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaigns_account ON meta_ad_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaigns_status ON meta_ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_meta_ad_campaigns_partnership ON meta_ad_campaigns(partnership_code);
CREATE INDEX IF NOT EXISTS idx_meta_ad_performance_date ON meta_ad_performance_daily(meta_ad_campaign_id, date);

-- unique constraint: 같은 날짜의 같은 광고 캠페인 데이터 중복 방지
ALTER TABLE meta_ad_performance_daily
  ADD CONSTRAINT uq_meta_performance_campaign_date UNIQUE (meta_ad_campaign_id, date);
