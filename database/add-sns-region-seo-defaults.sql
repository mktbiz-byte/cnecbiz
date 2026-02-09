-- 리전별 SEO 기본설정 테이블
-- BIZ DB에서 실행

CREATE TABLE IF NOT EXISTS sns_region_seo_defaults (
  region text PRIMARY KEY, -- 'kr', 'jp', 'us'
  title_template text DEFAULT '',
  description_template text DEFAULT '',
  hashtags text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- 기본 리전 row 삽입
INSERT INTO sns_region_seo_defaults (region) VALUES ('kr'), ('jp'), ('us')
ON CONFLICT (region) DO NOTHING;
