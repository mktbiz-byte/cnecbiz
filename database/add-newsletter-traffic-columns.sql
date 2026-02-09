-- 뉴스레터 유입경로 추적을 위한 컬럼 추가
-- newsletter_views 테이블에 referrer, UTM, traffic_source 컬럼 추가

-- 1. 유입경로 관련 컬럼 추가
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS referrer text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS traffic_source text;
ALTER TABLE newsletter_views ADD COLUMN IF NOT EXISTS page_url text;

-- 2. 인덱스 추가 (유입경로 분석 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_newsletter_views_traffic_source ON newsletter_views(traffic_source);
CREATE INDEX IF NOT EXISTS idx_newsletter_views_utm_source ON newsletter_views(utm_source);
CREATE INDEX IF NOT EXISTS idx_newsletter_views_utm_campaign ON newsletter_views(utm_campaign);

-- 3. sns_upload_accounts 테이블에 extra_data가 없으면 추가 (YouTube 멀티계정 region 저장용)
-- 이미 있을 수 있으므로 IF NOT EXISTS 사용
ALTER TABLE sns_upload_accounts ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}';
