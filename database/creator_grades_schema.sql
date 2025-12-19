-- Creator Grades System Schema
-- 크넥 크리에이터 등급 시스템 데이터베이스 스키마
-- v1.0 | 2024.12

-- =====================================================
-- 1. creator_grades 테이블
-- 크리에이터 등급 및 점수 정보
-- =====================================================
CREATE TABLE IF NOT EXISTS creator_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES featured_creators(id) ON DELETE CASCADE,

  -- 등급 정보
  grade_level INTEGER NOT NULL DEFAULT 1 CHECK (grade_level BETWEEN 1 AND 5),
  -- 1=FRESH, 2=GLOW, 3=BLOOM, 4=ICONIC, 5=MUSE
  grade_name VARCHAR(20) NOT NULL DEFAULT 'FRESH' CHECK (grade_name IN ('FRESH', 'GLOW', 'BLOOM', 'ICONIC', 'MUSE')),

  -- 종합 점수 (0-100)
  total_score DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- 세부 점수
  brand_trust_score DECIMAL(5,2) DEFAULT 0,        -- 브랜드 신뢰 점수 (0-40)
  content_quality_score DECIMAL(5,2) DEFAULT 0,    -- 콘텐츠 퀄리티 점수 (0-25)
  professionalism_score DECIMAL(5,2) DEFAULT 0,    -- 프로페셔널리즘 점수 (0-20)
  growth_score DECIMAL(5,2) DEFAULT 0,             -- 영향력 성장률 점수 (0-10)
  contribution_score DECIMAL(5,2) DEFAULT 0,       -- 크넥 기여도 점수 (0-5)

  -- 캠페인 통계
  completed_campaigns INTEGER DEFAULT 0,           -- 완료한 캠페인 수
  recollaboration_rate DECIMAL(5,2) DEFAULT 0,     -- 재협업률 (%)

  -- 타임스탬프
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  grade_changed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(creator_id)
);

-- =====================================================
-- 2. creator_badges 테이블
-- 크리에이터 획득 뱃지
-- =====================================================
CREATE TABLE IF NOT EXISTS creator_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES featured_creators(id) ON DELETE CASCADE,

  -- 뱃지 정보
  badge_type VARCHAR(50) NOT NULL,
  -- 뱃지 타입: color_expert, skincare_guru, nail_artist, hair_stylist,
  -- reel_master, review_expert, brand_favorite, fast_responder,
  -- perfect_delivery, trending_creator

  badge_name VARCHAR(100) NOT NULL,    -- 표시 이름 (예: Color Expert)
  badge_emoji VARCHAR(10),              -- 이모지 아이콘
  is_featured BOOLEAN DEFAULT FALSE,   -- 대표 뱃지 여부 (최대 3개)

  -- 획득 조건 메타데이터
  condition_met JSONB,                 -- 획득 시점의 조건 데이터

  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(creator_id, badge_type)
);

-- =====================================================
-- 3. grade_history 테이블
-- 등급 변경 이력
-- =====================================================
CREATE TABLE IF NOT EXISTS grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES featured_creators(id) ON DELETE CASCADE,

  -- 등급 변경 정보
  previous_grade INTEGER,
  new_grade INTEGER NOT NULL,
  previous_grade_name VARCHAR(20),
  new_grade_name VARCHAR(20) NOT NULL,
  previous_score DECIMAL(5,2),
  new_score DECIMAL(5,2) NOT NULL,

  -- 변경 사유
  change_reason VARCHAR(100),  -- upgrade, downgrade, manual, initial
  change_note TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 인덱스 생성
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_creator_grades_creator_id ON creator_grades(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_grades_grade_level ON creator_grades(grade_level);
CREATE INDEX IF NOT EXISTS idx_creator_grades_total_score ON creator_grades(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_creator_badges_creator_id ON creator_badges(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_badges_badge_type ON creator_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_creator_badges_featured ON creator_badges(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_grade_history_creator_id ON grade_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_created_at ON grade_history(created_at DESC);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================
ALTER TABLE creator_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_history ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 조회 가능
CREATE POLICY "Anyone can view creator grades"
  ON creator_grades FOR SELECT USING (true);

CREATE POLICY "Anyone can view creator badges"
  ON creator_badges FOR SELECT USING (true);

-- 관리자만 수정 가능 (서비스 역할 사용)
CREATE POLICY "Service role can manage creator grades"
  ON creator_grades FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage creator badges"
  ON creator_badges FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage grade history"
  ON grade_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 트리거 함수: updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION update_creator_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER creator_grades_updated_at
  BEFORE UPDATE ON creator_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_grades_updated_at();

-- =====================================================
-- featured_creators 테이블에 등급 관련 컬럼 추가
-- =====================================================
ALTER TABLE featured_creators
  ADD COLUMN IF NOT EXISTS cnec_grade_level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cnec_grade_name VARCHAR(20) DEFAULT 'FRESH',
  ADD COLUMN IF NOT EXISTS cnec_total_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_cnec_recommended BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_featured_creators_grade ON featured_creators(cnec_grade_level);
CREATE INDEX IF NOT EXISTS idx_featured_creators_recommended ON featured_creators(is_cnec_recommended) WHERE is_cnec_recommended = true;

-- =====================================================
-- 뱃지 타입 참조 테이블 (선택적)
-- =====================================================
CREATE TABLE IF NOT EXISTS badge_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  description TEXT,
  category VARCHAR(50),  -- 카테고리: category_expert, performance, achievement
  condition_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 뱃지 타입 삽입
INSERT INTO badge_types (id, name, emoji, description, category, condition_description) VALUES
  ('color_expert', 'Color Expert', '💄', '색조 카테고리 전문가', 'category_expert', '색조 카테고리 캠페인 10건 이상 완료'),
  ('skincare_guru', 'Skincare Guru', '🧴', '스킨케어 카테고리 전문가', 'category_expert', '스킨케어 카테고리 캠페인 10건 이상 완료'),
  ('nail_artist', 'Nail Artist', '💅', '네일 카테고리 전문가', 'category_expert', '네일 카테고리 캠페인 10건 이상 완료'),
  ('hair_stylist', 'Hair Stylist', '💇', '헤어 카테고리 전문가', 'category_expert', '헤어 카테고리 캠페인 10건 이상 완료'),
  ('reel_master', 'Reel Master', '🎬', '릴스/숏폼 콘텐츠 마스터', 'performance', '릴스/숏폼 평균 조회수 상위 10%'),
  ('review_expert', 'Review Expert', '📝', '상세 리뷰 전문가', 'performance', '상세 리뷰 콘텐츠 20건 이상 (1000자↑)'),
  ('brand_favorite', 'Brand Favorite', '⭐', '브랜드가 선호하는 크리에이터', 'achievement', '재협업률 50% 이상 (최소 5개 브랜드)'),
  ('fast_responder', 'Fast Responder', '⚡', '빠른 응답자', 'achievement', '평균 응답시간 2시간 이내 (최소 20건)'),
  ('perfect_delivery', 'Perfect Delivery', '🎯', '완벽한 납품', 'achievement', '마감 준수율 100% (최소 10건)'),
  ('trending_creator', 'Trending Creator', '🔥', '급성장 크리에이터', 'performance', '최근 30일 팔로워 증가율 상위 5%')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 등급별 색상 참조
-- =====================================================
COMMENT ON TABLE creator_grades IS '
등급별 색상 코드:
FRESH (Lv.1): #10B981 (Emerald)
GLOW (Lv.2): #3B82F6 (Blue)
BLOOM (Lv.3): #8B5CF6 (Violet)
ICONIC (Lv.4): #EC4899 (Pink)
MUSE (Lv.5): #F59E0B (Amber/Gold)

승급 조건:
Lv.1 FRESH: 가입 시 자동 부여
Lv.2 GLOW: 40점 이상 + 캠페인 3건 이상 완료
Lv.3 BLOOM: 60점 이상 + 캠페인 10건 이상 완료
Lv.4 ICONIC: 80점 이상 + 캠페인 30건 이상 완료 + 재협업률 30%↑
Lv.5 MUSE: 운영팀 심사 후 초대 (상위 1%)
';
