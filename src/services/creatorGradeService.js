/**
 * 크넥 크리에이터 등급 시스템 서비스
 * 등급 계산, 뱃지 관리, 등급 업데이트 기능 제공
 */

import { supabaseKorea, getSupabaseClient } from '../lib/supabaseClients'

// 등급 정의
export const GRADE_LEVELS = {
  1: { name: 'FRESH', label: '새싹', color: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500', lightBg: 'bg-emerald-50' },
  2: { name: 'GLOW', label: '빛나기 시작', color: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-500', lightBg: 'bg-blue-50' },
  3: { name: 'BLOOM', label: '피어나는 중', color: '#8B5CF6', bgClass: 'bg-violet-500', textClass: 'text-violet-500', lightBg: 'bg-violet-50' },
  4: { name: 'ICONIC', label: '아이코닉', color: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-pink-500', lightBg: 'bg-pink-50' },
  5: { name: 'MUSE', label: '뮤즈', color: '#F59E0B', bgClass: 'bg-amber-500', textClass: 'text-amber-500', lightBg: 'bg-amber-50' }
}

// 뱃지 정의
export const BADGE_TYPES = {
  color_expert: { name: 'Color Expert', emoji: '💄', category: '색조', condition: '색조 캠페인 10건 이상' },
  skincare_guru: { name: 'Skincare Guru', emoji: '🧴', category: '스킨케어', condition: '스킨케어 캠페인 10건 이상' },
  nail_artist: { name: 'Nail Artist', emoji: '💅', category: '네일', condition: '네일 캠페인 10건 이상' },
  hair_stylist: { name: 'Hair Stylist', emoji: '💇', category: '헤어', condition: '헤어 캠페인 10건 이상' },
  reel_master: { name: 'Reel Master', emoji: '🎬', category: '숏폼', condition: '숏폼 조회수 상위 10%' },
  review_expert: { name: 'Review Expert', emoji: '📝', category: '리뷰', condition: '상세 리뷰 20건 이상' },
  brand_favorite: { name: 'Brand Favorite', emoji: '⭐', category: '브랜드', condition: '재협업률 50% 이상' },
  fast_responder: { name: 'Fast Responder', emoji: '⚡', category: '응답', condition: '평균 응답 2시간 이내' },
  perfect_delivery: { name: 'Perfect Delivery', emoji: '🎯', category: '납품', condition: '마감 준수율 100%' },
  trending_creator: { name: 'Trending Creator', emoji: '🔥', category: '성장', condition: '팔로워 증가율 상위 5%' }
}

/**
 * 등급 레벨 결정 함수
 * @param {number} totalScore - 종합 점수 (0-100)
 * @param {number} completedCampaigns - 완료한 캠페인 수
 * @param {number} recollaborationRate - 재협업률 (%)
 * @param {boolean} isManualMuse - 운영팀 뮤즈 지정 여부
 * @returns {number} 등급 레벨 (1-5)
 */
export function calculateGradeLevel(totalScore, completedCampaigns = 0, recollaborationRate = 0, isManualMuse = false) {
  // MUSE (Lv.5): 운영팀 심사 후 초대
  if (isManualMuse) {
    return 5
  }

  // ICONIC (Lv.4): 80점 이상 + 캠페인 30건 이상 + 재협업률 30%↑
  if (totalScore >= 80 && completedCampaigns >= 30 && recollaborationRate >= 30) {
    return 4
  }

  // BLOOM (Lv.3): 60점 이상 + 캠페인 10건 이상
  if (totalScore >= 60 && completedCampaigns >= 10) {
    return 3
  }

  // GLOW (Lv.2): 40점 이상 + 캠페인 3건 이상
  if (totalScore >= 40 && completedCampaigns >= 3) {
    return 2
  }

  // FRESH (Lv.1): 기본
  return 1
}

/**
 * 브랜드 신뢰 점수 계산 (40점 만점)
 * @param {Object} data - 크리에이터 데이터
 * @returns {number} 브랜드 신뢰 점수
 */
export function calculateBrandTrustScore(data) {
  const {
    avgBrandRating = 0,          // 평균 브랜드 평점 (1-5)
    recollaborationRate = 0,     // 재협업률 (%)
    guidelineComplianceRate = 0  // 가이드라인 준수율 (%)
  } = data

  // 광고주 평점 (15점)
  const ratingScore = (avgBrandRating / 5) * 15

  // 재협업률 (15점) - 50% 이상이면 만점
  const recollabScore = Math.min((recollaborationRate / 50) * 15, 15)

  // 가이드라인 준수율 (10점)
  const complianceScore = (guidelineComplianceRate / 100) * 10

  return Math.round((ratingScore + recollabScore + complianceScore) * 100) / 100
}

/**
 * 콘텐츠 퀄리티 점수 계산 (25점 만점)
 * @param {Object} data - 크리에이터 데이터
 * @returns {number} 콘텐츠 퀄리티 점수
 */
export function calculateContentQualityScore(data) {
  const {
    avgQualityScore = 0,      // 평균 콘텐츠 품질 점수 (1-5)
    avgEngagementRate = 0,    // 평균 인게이지먼트율 (%)
    avgBrandFeedback = 0      // 평균 브랜드 피드백 점수 (1-5)
  } = data

  // 업로드 품질 (10점) - quality_score * 2
  const qualityScore = avgQualityScore * 2

  // 평균 인게이지먼트 (10점) - 10% 이상이면 만점
  const engagementScore = Math.min((avgEngagementRate / 10) * 10, 10)

  // 브랜드 피드백 (5점)
  const feedbackScore = (avgBrandFeedback / 5) * 5

  return Math.round((qualityScore + engagementScore + feedbackScore) * 100) / 100
}

/**
 * 프로페셔널리즘 점수 계산 (20점 만점)
 * @param {Object} data - 크리에이터 데이터
 * @returns {number} 프로페셔널리즘 점수
 */
export function calculateProfessionalismScore(data) {
  const {
    onTimeRate = 0,           // 마감 준수율 (%)
    avgResponseTime = 24,     // 평균 응답 시간 (시간)
    avgRevisions = 0          // 평균 수정 요청 횟수
  } = data

  // 마감 준수율 (10점)
  const onTimeScore = (onTimeRate / 100) * 10

  // 평균 응답 속도 (5점)
  let responseScore
  if (avgResponseTime <= 2) responseScore = 5
  else if (avgResponseTime <= 6) responseScore = 4
  else if (avgResponseTime <= 12) responseScore = 3
  else if (avgResponseTime <= 24) responseScore = 2
  else responseScore = 1

  // 수정 요청 횟수 (5점) - 수정 1회당 1점 감점
  const revisionScore = Math.max(5 - avgRevisions, 0)

  return Math.round((onTimeScore + responseScore + revisionScore) * 100) / 100
}

/**
 * 영향력 성장률 점수 계산 (10점 만점)
 * @param {Object} data - 크리에이터 데이터
 * @returns {number} 영향력 성장률 점수
 */
export function calculateGrowthScore(data) {
  const {
    followerGrowthRate = 0,     // 팔로워 증가율 (%, 최근 3개월)
    engagementChange = 0        // 참여율 변화 (%, 현재 - 이전)
  } = data

  // 팔로워 증가율 (5점) - 20% 이상 성장 시 만점
  const followerScore = Math.min((followerGrowthRate / 20) * 5, 5)

  // 참여율 변화 (5점) - 기본 2.5점, ±2.5점 변동
  const engagementScore = 2.5 + Math.min(Math.max(engagementChange * 5, -2.5), 2.5)

  return Math.round((followerScore + engagementScore) * 100) / 100
}

/**
 * 크넥 기여도 점수 계산 (5점 만점)
 * @param {Object} data - 크리에이터 데이터
 * @returns {number} 크넥 기여도 점수
 */
export function calculateContributionScore(data) {
  const {
    monthsActive = 0,           // 활동 기간 (개월)
    communityActivityCount = 0  // 커뮤니티 참여 횟수
  } = data

  // 활동 기간 (3점) - 1년 이상 활동 시 만점
  const activityScore = Math.min((monthsActive / 12) * 3, 3)

  // 커뮤니티 참여 (2점)
  const communityScore = Math.min((communityActivityCount / 10) * 2, 2)

  return Math.round((activityScore + communityScore) * 100) / 100
}

/**
 * 종합 점수 계산
 * @param {Object} creatorData - 크리에이터 데이터
 * @returns {Object} 점수 결과
 */
export function calculateTotalScore(creatorData) {
  const brandTrustScore = calculateBrandTrustScore(creatorData)
  const contentQualityScore = calculateContentQualityScore(creatorData)
  const professionalismScore = calculateProfessionalismScore(creatorData)
  const growthScore = calculateGrowthScore(creatorData)
  const contributionScore = calculateContributionScore(creatorData)

  const totalScore = brandTrustScore + contentQualityScore + professionalismScore + growthScore + contributionScore

  const gradeLevel = calculateGradeLevel(
    totalScore,
    creatorData.completedCampaigns || 0,
    creatorData.recollaborationRate || 0,
    creatorData.isManualMuse || false
  )

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    brandTrustScore,
    contentQualityScore,
    professionalismScore,
    growthScore,
    contributionScore,
    gradeLevel,
    gradeName: GRADE_LEVELS[gradeLevel].name,
    gradeInfo: GRADE_LEVELS[gradeLevel]
  }
}

/**
 * 초기 등급 산정 (신규 크리에이터용)
 * CAPI 점수와 기본 정보로 초기 등급 계산
 * @param {Object} creator - 크리에이터 정보
 * @returns {Object} 초기 등급 정보
 */
export function calculateInitialGrade(creator) {
  // CAPI 점수가 있는 경우 CAPI 기반으로 초기 점수 산정
  if (creator.capi_score) {
    const capiScore = creator.capi_score || 0
    const contentScore = creator.capi_content_score || 0
    const activityScore = creator.capi_activity_score || 0

    // CAPI 점수를 100점 만점으로 변환 (현재 최대 100점)
    const normalizedScore = capiScore

    // 초기에는 부족한 데이터 항목은 중간값(50%) 적용
    const initialData = {
      avgBrandRating: 3,          // 중간값
      recollaborationRate: 0,     // 없음
      guidelineComplianceRate: 50, // 중간값
      avgQualityScore: (contentScore / 70) * 5, // CAPI 콘텐츠 점수 기반
      avgEngagementRate: 5,       // 중간값
      avgBrandFeedback: 3,        // 중간값
      onTimeRate: 50,             // 중간값
      avgResponseTime: 12,        // 중간값
      avgRevisions: 2,            // 중간값
      followerGrowthRate: 0,      // 알 수 없음
      engagementChange: 0,        // 알 수 없음
      monthsActive: 0,            // 신규
      communityActivityCount: 0,  // 없음
      completedCampaigns: 0,
      isManualMuse: false
    }

    return calculateTotalScore(initialData)
  }

  // CAPI 점수가 없는 경우 기본값
  return {
    totalScore: 0,
    brandTrustScore: 0,
    contentQualityScore: 0,
    professionalismScore: 0,
    growthScore: 0,
    contributionScore: 0,
    gradeLevel: 1,
    gradeName: 'FRESH',
    gradeInfo: GRADE_LEVELS[1]
  }
}

/**
 * 크리에이터 등급 저장/업데이트
 * @param {string} creatorId - 크리에이터 ID
 * @param {Object} gradeData - 등급 데이터
 */
export async function saveCreatorGrade(creatorId, gradeData) {
  try {
    // featured_creators 테이블 업데이트
    const { error: updateError } = await supabaseKorea
      .from('featured_creators')
      .update({
        cnec_grade_level: gradeData.gradeLevel,
        cnec_grade_name: gradeData.gradeName,
        cnec_total_score: gradeData.totalScore,
        is_cnec_recommended: gradeData.gradeLevel >= 2 // GLOW 이상이면 추천
      })
      .eq('id', creatorId)

    if (updateError) throw updateError

    // creator_grades 테이블 upsert
    const { error: gradeError } = await supabaseKorea
      .from('creator_grades')
      .upsert({
        creator_id: creatorId,
        grade_level: gradeData.gradeLevel,
        grade_name: gradeData.gradeName,
        total_score: gradeData.totalScore,
        brand_trust_score: gradeData.brandTrustScore,
        content_quality_score: gradeData.contentQualityScore,
        professionalism_score: gradeData.professionalismScore,
        growth_score: gradeData.growthScore,
        contribution_score: gradeData.contributionScore,
        last_calculated_at: new Date().toISOString()
      }, {
        onConflict: 'creator_id'
      })

    if (gradeError) {
      console.warn('creator_grades 테이블 업데이트 실패 (테이블이 없을 수 있음):', gradeError)
    }

    return { success: true }
  } catch (error) {
    console.error('등급 저장 오류:', error)
    return { success: false, error }
  }
}

/**
 * 크리에이터가 추천 크리에이터인지 확인
 * @param {string} creatorUserId - 크리에이터 user_id
 * @param {string} region - 지역
 * @returns {Promise<Object|null>} 추천 크리에이터 정보 또는 null
 */
export async function checkIfFeaturedCreator(creatorUserId, region = 'korea') {
  try {
    // featured_creators 테이블에서 확인
    const { data, error } = await supabaseKorea
      .from('featured_creators')
      .select('id, cnec_grade_level, cnec_grade_name, cnec_total_score, is_cnec_recommended, is_active')
      .eq('user_id', creatorUserId)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    return {
      isFeatured: true,
      isRecommended: data.is_cnec_recommended,
      gradeLevel: data.cnec_grade_level || 1,
      gradeName: data.cnec_grade_name || 'FRESH',
      totalScore: data.cnec_total_score || 0,
      gradeInfo: GRADE_LEVELS[data.cnec_grade_level || 1]
    }
  } catch (error) {
    console.error('추천 크리에이터 확인 오류:', error)
    return null
  }
}

/**
 * 여러 지역에서 크리에이터 검색
 * @param {string} query - 검색어
 * @param {string[]} regions - 검색할 지역 목록
 * @returns {Promise<Object[]>} 크리에이터 목록
 */
export async function searchCreatorsFromRegions(query = '', regions = ['korea', 'japan', 'us']) {
  const results = []

  // 지역별 컬럼 구성 (Korea DB에는 user_id 컬럼이 없음 - id가 auth user id)
  const regionColumns = {
    korea: 'id, name, email, phone, channel_name, profile_image, profile_image_url, avatar_url, instagram_url, instagram_followers, youtube_url, youtube_subscribers, tiktok_url, tiktok_followers, bio, created_at',
    japan: 'id, user_id, name, email, phone, profile_image, profile_image_url, avatar_url, instagram_url, instagram_followers, youtube_url, youtube_subscribers, tiktok_url, tiktok_followers, bio, created_at',
    us: 'id, user_id, name, email, phone, profile_image, profile_image_url, avatar_url, instagram_url, instagram_followers, youtube_url, youtube_subscribers, tiktok_url, tiktok_followers, bio, created_at'
  }

  const fallbackColumns = 'id, name, email, phone, profile_image, bio'

  for (const region of regions) {
    try {
      const client = getSupabaseClient(region)
      if (!client) continue

      const columns = regionColumns[region] || fallbackColumns
      let searchQuery = client
        .from('user_profiles')
        .select(columns)

      if (query.trim()) {
        // name, email, channel_name 모두 검색
        if (region === 'korea') {
          searchQuery = searchQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,channel_name.ilike.%${query}%`)
        } else {
          searchQuery = searchQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        }
      }

      const { data, error } = await searchQuery.limit(30)

      if (error) {
        console.error(`${region} 검색 오류:`, error)
        // 컬럼 오류인 경우 기본 컬럼만으로 재시도
        try {
          const { data: retryData } = await client
            .from('user_profiles')
            .select(fallbackColumns)
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(30)
          if (retryData) {
            const creatorsWithRegion = retryData.map(creator => ({
              ...creator,
              user_id: creator.user_id || creator.id,
              source_region: region
            }))
            results.push(...creatorsWithRegion)
          }
        } catch (retryErr) {
          console.error(`${region} 재시도 실패:`, retryErr)
        }
        continue
      }

      // 각 크리에이터에 지역 정보 추가 + user_id 정규화
      const creatorsWithRegion = (data || []).map(creator => ({
        ...creator,
        user_id: creator.user_id || creator.id, // Korea DB: id = auth user id
        source_region: region
      }))

      results.push(...creatorsWithRegion)
    } catch (error) {
      console.error(`${region} 검색 중 예외:`, error)
    }
  }

  return results
}

/**
 * 크리에이터를 추천 크리에이터로 등록
 * @param {Object} creator - 크리에이터 정보
 * @param {string} region - 원본 지역
 * @returns {Promise<Object>} 결과
 */
export async function registerFeaturedCreator(creator, region) {
  try {
    // 초기 등급 계산
    const initialGrade = calculateInitialGrade(creator)

    // featured_creators 테이블에 실제 존재하는 컬럼만 사용
    const featuredCreator = {
      user_id: creator.user_id || creator.id,
      source_country: region.toUpperCase().substring(0, 2),
      name: creator.name || creator.channel_name,
      profile_image_url: creator.profile_image || creator.profile_image_url || creator.avatar_url,
      bio: creator.bio,
      instagram_url: creator.instagram_url || null,
      instagram_followers: creator.instagram_followers || 0,
      youtube_url: creator.youtube_url || null,
      youtube_subscribers: creator.youtube_subscribers || 0,
      tiktok_url: creator.tiktok_url || null,
      tiktok_followers: creator.tiktok_followers || 0,
      primary_country: region.toUpperCase().substring(0, 2),
      active_regions: [region],
      is_active: true,
      cnec_grade_level: initialGrade.gradeLevel,
      cnec_grade_name: initialGrade.gradeName,
      cnec_total_score: initialGrade.totalScore,
      is_cnec_recommended: initialGrade.gradeLevel >= 2
    }

    const { data, error } = await supabaseKorea
      .from('featured_creators')
      .insert([featuredCreator])
      .select()
      .single()

    if (error) throw error

    return { success: true, data, gradeInfo: initialGrade }
  } catch (error) {
    console.error('추천 크리에이터 등록 오류:', error)
    return { success: false, error }
  }
}

export default {
  GRADE_LEVELS,
  BADGE_TYPES,
  calculateGradeLevel,
  calculateTotalScore,
  calculateInitialGrade,
  saveCreatorGrade,
  checkIfFeaturedCreator,
  searchCreatorsFromRegions,
  registerFeaturedCreator
}
