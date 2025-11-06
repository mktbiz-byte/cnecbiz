-- receivable_details 테이블에 영상 링크 컬럼 추가
-- 각 단가별로 영상 링크를 JSONB 배열로 저장

ALTER TABLE receivable_details 
ADD COLUMN IF NOT EXISTS videos_200k JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos_300k JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos_400k JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos_600k JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS videos_700k JSONB DEFAULT '[]'::jsonb;

-- 코멘트 추가
COMMENT ON COLUMN receivable_details.videos_200k IS '20만원 단가 영상 링크 배열 [{"url": "", "title": "", "date": ""}]';
COMMENT ON COLUMN receivable_details.videos_300k IS '30만원 단가 영상 링크 배열 [{"url": "", "title": "", "date": ""}]';
COMMENT ON COLUMN receivable_details.videos_400k IS '40만원 단가 영상 링크 배열 [{"url": "", "title": "", "date": ""}]';
COMMENT ON COLUMN receivable_details.videos_600k IS '60만원 단가 영상 링크 배열 [{"url": "", "title": "", "date": ""}]';
COMMENT ON COLUMN receivable_details.videos_700k IS '70만원 단가 영상 링크 배열 [{"url": "", "title": "", "date": ""}]';
