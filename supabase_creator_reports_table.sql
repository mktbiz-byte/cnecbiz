-- ============================================
-- 크리에이터 보고서 테이블 생성
-- Supabase Biz (cnectotal) 프로젝트용
-- ============================================

-- 1. creator_reports 테이블 생성
CREATE TABLE IF NOT EXISTS creator_reports (
  -- 기본 식별자
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID,
  channel_id UUID,
  creator_name TEXT NOT NULL,
  channel_name TEXT,
  
  -- 보고서 타입 및 상태
  report_type TEXT NOT NULL CHECK (report_type IN ('affiliated_creator', 'our_channel')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  
  -- AI 분석 결과 (Gemini)
  ai_analysis JSONB,
  
  -- 5가지 핵심 항목
  weaknesses JSONB,           -- 부족한 점
  upload_schedule JSONB,      -- 업로드 주기 분석
  top_videos_analysis JSONB,  -- 인기 영상 분석
  improvements JSONB,         -- 보완할 점
  overall_evaluation JSONB,   -- 종합 평가
  
  -- 매니저 코멘트
  manager_comment TEXT,
  
  -- 원본 통계 데이터
  stats JSONB,                -- 채널 통계
  videos JSONB,               -- 영상 목록
  
  -- 메타 정보
  created_by TEXT,            -- 생성자 이메일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  sent_to_creator_at TIMESTAMP WITH TIME ZONE
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_creator_reports_creator_id ON creator_reports(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_reports_channel_id ON creator_reports(channel_id);
CREATE INDEX IF NOT EXISTS idx_creator_reports_status ON creator_reports(status);
CREATE INDEX IF NOT EXISTS idx_creator_reports_created_at ON creator_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_reports_report_type ON creator_reports(report_type);

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_creator_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_reports_updated_at
  BEFORE UPDATE ON creator_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_reports_updated_at();

-- 4. RLS (Row Level Security) 설정
ALTER TABLE creator_reports ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 읽기 가능
CREATE POLICY "Anyone can view creator_reports"
  ON creator_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- 인증된 사용자가 생성 가능
CREATE POLICY "Authenticated users can create creator_reports"
  ON creator_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 생성자만 수정 가능
CREATE POLICY "Users can update their own creator_reports"
  ON creator_reports
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.email())
  WITH CHECK (created_by = auth.email());

-- 생성자만 삭제 가능
CREATE POLICY "Users can delete their own creator_reports"
  ON creator_reports
  FOR DELETE
  TO authenticated
  USING (created_by = auth.email());

-- 5. 코멘트 추가
COMMENT ON TABLE creator_reports IS '크리에이터 및 채널 성과 보고서';
COMMENT ON COLUMN creator_reports.report_type IS 'affiliated_creator: 소속 크리에이터, our_channel: 우리 채널';
COMMENT ON COLUMN creator_reports.status IS 'draft: 임시저장, published: 게시됨';
COMMENT ON COLUMN creator_reports.ai_analysis IS 'Gemini AI 전체 분석 결과 (JSON)';
COMMENT ON COLUMN creator_reports.weaknesses IS '부족한 점 분석 결과';
COMMENT ON COLUMN creator_reports.upload_schedule IS '업로드 주기 분석 및 권장사항';
COMMENT ON COLUMN creator_reports.top_videos_analysis IS '조회수 상위 영상 분석';
COMMENT ON COLUMN creator_reports.improvements IS '보완할 점 및 실행 계획';
COMMENT ON COLUMN creator_reports.overall_evaluation IS '종합 평가 및 점수';
COMMENT ON COLUMN creator_reports.manager_comment IS '매니저 코멘트 (크리에이터 전달용)';

-- 완료!
SELECT 'creator_reports 테이블이 성공적으로 생성되었습니다!' AS message;
