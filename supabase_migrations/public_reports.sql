-- 공개 보고서 테이블
-- 관공서 등 외부에서 접근 가능한 보고서 생성 및 관리

CREATE TABLE IF NOT EXISTS public_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_detail_id UUID REFERENCES receivable_details(id) ON DELETE CASCADE,
  
  -- 보고서 정보
  report_code TEXT UNIQUE NOT NULL, -- 공개 URL용 코드 (예: RPT-2025-001)
  title TEXT NOT NULL,
  description TEXT,
  
  -- 회사 정보 (공개용)
  company_name TEXT,
  campaign_name TEXT,
  campaign_period TEXT, -- 캠페인 기간 (예: 2025-01-01 ~ 2025-01-31)
  
  -- 통계 정보 (금액 제외)
  total_videos INTEGER DEFAULT 0, -- 총 영상 수
  total_views BIGINT DEFAULT 0, -- 총 조회수
  total_likes BIGINT DEFAULT 0, -- 총 좋아요
  total_comments BIGINT DEFAULT 0, -- 총 댓글
  
  -- 공개 설정
  is_public BOOLEAN DEFAULT false, -- 공개 여부
  password TEXT, -- 비밀번호 (선택)
  expires_at TIMESTAMPTZ, -- 만료일 (선택)
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  view_count INTEGER DEFAULT 0 -- 보고서 조회수
);

-- 공개 보고서 영상 정보 테이블
CREATE TABLE IF NOT EXISTS public_report_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_report_id UUID REFERENCES public_reports(id) ON DELETE CASCADE,
  
  -- 영상 정보
  video_url TEXT NOT NULL,
  video_title TEXT,
  thumbnail_url TEXT,
  
  -- 통계 정보
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  
  -- 반응도 (engagement rate)
  engagement_rate DECIMAL(5,2), -- 예: 5.25%
  
  -- 업로드 정보
  upload_date DATE,
  platform TEXT, -- 플랫폼 (YouTube, Instagram, TikTok 등)
  
  -- 추가 정보
  description TEXT,
  tags TEXT[], -- 태그 배열
  
  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 정렬 순서
  display_order INTEGER DEFAULT 0
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_public_reports_code ON public_reports(report_code);
CREATE INDEX IF NOT EXISTS idx_public_reports_public ON public_reports(is_public);
CREATE INDEX IF NOT EXISTS idx_public_reports_expires ON public_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_report_videos_report ON public_report_videos(public_report_id);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_public_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_public_reports_updated_at
  BEFORE UPDATE ON public_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_public_reports_updated_at();

CREATE TRIGGER trigger_update_public_report_videos_updated_at
  BEFORE UPDATE ON public_report_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_public_reports_updated_at();

-- RLS (Row Level Security) 설정
ALTER TABLE public_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_report_videos ENABLE ROW LEVEL SECURITY;

-- 공개 보고서는 누구나 조회 가능 (is_public = true)
CREATE POLICY "Anyone can view public reports"
  ON public_reports FOR SELECT
  USING (is_public = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Anyone can view public report videos"
  ON public_report_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public_reports 
      WHERE public_reports.id = public_report_videos.public_report_id 
      AND public_reports.is_public = true 
      AND (public_reports.expires_at IS NULL OR public_reports.expires_at > NOW())
    )
  );

-- 관리자는 모든 작업 가능
CREATE POLICY "Admin users can manage public reports"
  ON public_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin users can manage public report videos"
  ON public_report_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- 보고서 조회수 증가 함수
CREATE OR REPLACE FUNCTION increment_report_view_count(report_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public_reports 
  SET view_count = view_count + 1 
  WHERE id = report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 코멘트 추가
COMMENT ON TABLE public_reports IS '공개 보고서 - 관공서 등 외부 공유용';
COMMENT ON TABLE public_report_videos IS '공개 보고서 영상 정보';
COMMENT ON COLUMN public_reports.report_code IS '공개 URL용 고유 코드';
COMMENT ON COLUMN public_reports.is_public IS '공개 여부 (true: 누구나 접근 가능)';
COMMENT ON COLUMN public_reports.password IS '비밀번호 보호 (선택)';
COMMENT ON COLUMN public_reports.expires_at IS '보고서 만료일 (선택)';
COMMENT ON COLUMN public_report_videos.engagement_rate IS '반응도 (좋아요+댓글+공유)/조회수 × 100';
