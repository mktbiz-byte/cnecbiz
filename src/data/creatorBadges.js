/**
 * 크리에이터 뱃지 정의
 * 관리자가 크리에이터에게 부여할 수 있는 뱃지 목록
 */

export const CREATOR_BADGES = [
  // === 성과 & 성장 ===
  { id: 'rapid_growth', name: '폭발적 성장', icon: '🚀', category: '성과', color: '#E74C3C', bg: '#FDE8E8' },
  { id: 'top_satisfaction', name: '기업 만족 TOP', icon: '👑', category: '성과', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'campaign_top10', name: '캠페인 성과 TOP 10', icon: '🏆', category: '성과', color: '#D97706', bg: '#FEF3C7' },
  { id: 'high_engagement', name: '참여율 우수', icon: '📈', category: '성과', color: '#059669', bg: '#D1FAE5' },
  { id: 'viral_content', name: '바이럴 콘텐츠', icon: '🔥', category: '성과', color: '#DC2626', bg: '#FEE2E2' },
  { id: 'loyal_fanbase', name: '충성 팬층 보유', icon: '💜', category: '성과', color: '#7C3AED', bg: '#EDE9FE' },

  // === 전문 분야 ===
  { id: 'beauty_expert', name: '뷰티 전문가', icon: '💄', category: '전문', color: '#EC4899', bg: '#FCE7F3' },
  { id: 'skincare_guru', name: '스킨케어 전문', icon: '🧴', category: '전문', color: '#14B8A6', bg: '#CCFBF1' },
  { id: 'fashion_icon', name: '패션 인플루언서', icon: '👗', category: '전문', color: '#8B5CF6', bg: '#EDE9FE' },
  { id: 'food_creator', name: '푸드 크리에이터', icon: '🍳', category: '전문', color: '#EA580C', bg: '#FFF7ED' },
  { id: 'fitness_pro', name: '피트니스 전문', icon: '💪', category: '전문', color: '#0891B2', bg: '#CFFAFE' },
  { id: 'lifestyle_pro', name: '라이프스타일', icon: '🏡', category: '전문', color: '#65A30D', bg: '#ECFCCB' },
  { id: 'travel_creator', name: '여행 크리에이터', icon: '✈️', category: '전문', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'tech_reviewer', name: '테크 리뷰어', icon: '📱', category: '전문', color: '#475569', bg: '#F1F5F9' },
  { id: 'pet_specialist', name: '반려동물 전문', icon: '🐾', category: '전문', color: '#92400E', bg: '#FEF3C7' },
  { id: 'family_content', name: '가족 콘텐츠', icon: '👨‍👩‍👧', category: '전문', color: '#DB2777', bg: '#FCE7F3' },
  { id: 'haircare_expert', name: '헤어케어 전문', icon: '💇‍♀️', category: '전문', color: '#6D28D9', bg: '#EDE9FE' },
  { id: 'game_creator', name: '게임 크리에이터', icon: '🎮', category: '전문', color: '#4F46E5', bg: '#E0E7FF' },

  // === 작업 품질 ===
  { id: 'premium_quality', name: '프리미엄 퀄리티', icon: '💎', category: '품질', color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'shortform_master', name: '숏폼 마스터', icon: '🎬', category: '품질', color: '#6366F1', bg: '#E0E7FF' },
  { id: 'detail_reviewer', name: '상세 리뷰 전문', icon: '📝', category: '품질', color: '#0D9488', bg: '#CCFBF1' },
  { id: 'visual_top', name: '비주얼 최상급', icon: '📸', category: '품질', color: '#A855F7', bg: '#F3E8FF' },
  { id: 'creative_excellence', name: '크리에이티브 우수', icon: '🎨', category: '품질', color: '#E11D48', bg: '#FFE4E6' },
  { id: 'storyteller', name: '스토리텔링 강점', icon: '✨', category: '품질', color: '#7C3AED', bg: '#EDE9FE' },

  // === 신뢰 & 협업 ===
  { id: 'perfect_deadline', name: '마감 100% 준수', icon: '⏰', category: '신뢰', color: '#059669', bg: '#D1FAE5' },
  { id: 'fast_responder', name: '빠른 응답', icon: '⚡', category: '신뢰', color: '#CA8A04', bg: '#FEF9C3' },
  { id: 'high_recollab', name: '재협업률 높음', icon: '🤝', category: '신뢰', color: '#2563EB', bg: '#DBEAFE' },
  { id: 'great_communication', name: '소통 능력 우수', icon: '💬', category: '신뢰', color: '#0891B2', bg: '#CFFAFE' },
  { id: 'cnec_verified', name: '크넥 인증', icon: '✅', category: '신뢰', color: '#6C5CE7', bg: '#F0EDFF' },
  { id: 'brand_favorite', name: '브랜드 선호', icon: '⭐', category: '신뢰', color: '#D97706', bg: '#FEF3C7' },
  { id: 'global_active', name: '글로벌 활동', icon: '🌏', category: '신뢰', color: '#2563EB', bg: '#DBEAFE' },
]

// 뱃지 ID로 뱃지 찾기
export const getBadgeById = (id) => CREATOR_BADGES.find(b => b.id === id)

// 카테고리별 그룹핑
export const getBadgesByCategory = () => {
  const groups = {}
  CREATOR_BADGES.forEach(badge => {
    if (!groups[badge.category]) groups[badge.category] = []
    groups[badge.category].push(badge)
  })
  return groups
}

// 뱃지 ID 배열에서 뱃지 정보 배열 반환
export const getBadgesFromIds = (badgeIds = []) => {
  return badgeIds.map(id => getBadgeById(id)).filter(Boolean)
}

export default CREATOR_BADGES
