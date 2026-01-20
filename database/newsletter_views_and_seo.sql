-- 뉴스레터 조회수 추적 및 SEO 분석 기능을 위한 데이터베이스 스키마 업데이트
-- 실행 대상: supabaseBiz

-- 1. newsletters 테이블에 순유입 조회수 컬럼 추가
ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS unique_view_count integer DEFAULT 0;

COMMENT ON COLUMN newsletters.unique_view_count IS '순유입 조회수 (고유 방문자 수)';

-- 2. newsletters 테이블에 SEO 관련 컬럼 추가
ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS seo_score integer;

ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS seo_analysis jsonb;

ALTER TABLE newsletters
ADD COLUMN IF NOT EXISTS seo_analyzed_at timestamp with time zone;

COMMENT ON COLUMN newsletters.seo_score IS 'SEO 점수 (0-100)';
COMMENT ON COLUMN newsletters.seo_analysis IS 'AI SEO 분석 결과 (JSON)';
COMMENT ON COLUMN newsletters.seo_analyzed_at IS 'SEO 분석 수행 시간';

-- 3. newsletter_views 테이블 생성 (조회 기록 추적)
CREATE TABLE IF NOT EXISTS newsletter_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    newsletter_id uuid NOT NULL REFERENCES newsletters(id) ON DELETE CASCADE,
    visitor_id text NOT NULL,
    ip_address text,
    user_agent text,
    is_unique boolean DEFAULT true,
    viewed_at timestamp with time zone DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_newsletter_views_newsletter_id
ON newsletter_views(newsletter_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_views_visitor_id
ON newsletter_views(visitor_id);

CREATE INDEX IF NOT EXISTS idx_newsletter_views_viewed_at
ON newsletter_views(viewed_at);

-- 복합 인덱스 (중복 체크용)
CREATE INDEX IF NOT EXISTS idx_newsletter_views_newsletter_visitor
ON newsletter_views(newsletter_id, visitor_id, viewed_at);

COMMENT ON TABLE newsletter_views IS '뉴스레터 조회 기록 추적 테이블';
COMMENT ON COLUMN newsletter_views.newsletter_id IS '뉴스레터 ID';
COMMENT ON COLUMN newsletter_views.visitor_id IS '방문자 고유 ID (브라우저 + IP 기반)';
COMMENT ON COLUMN newsletter_views.ip_address IS '방문자 IP 주소';
COMMENT ON COLUMN newsletter_views.user_agent IS '브라우저 User Agent';
COMMENT ON COLUMN newsletter_views.is_unique IS '순유입 여부 (24시간 내 첫 방문)';
COMMENT ON COLUMN newsletter_views.viewed_at IS '조회 시간';

-- RLS (Row Level Security) 정책 설정
ALTER TABLE newsletter_views ENABLE ROW LEVEL SECURITY;

-- 서비스 역할은 모든 작업 허용
CREATE POLICY "Service role can manage newsletter_views" ON newsletter_views
    FOR ALL
    USING (auth.role() = 'service_role');

-- 익명 사용자는 INSERT만 허용 (조회 기록 추가)
CREATE POLICY "Anyone can insert newsletter_views" ON newsletter_views
    FOR INSERT
    WITH CHECK (true);

-- 4. 기존 view_count를 unique_view_count로 복사 (초기 데이터 설정)
UPDATE newsletters
SET unique_view_count = view_count
WHERE unique_view_count IS NULL OR unique_view_count = 0;
