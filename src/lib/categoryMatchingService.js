import { supabaseBiz } from './supabaseClients'

/**
 * Category-based creator matching service
 * Calculates match scores between campaign product categories and creator category grades
 */

// Category grade → numeric score
const CATEGORY_GRADE_SCORES = {
  'Bronze': 20,
  'Silver': 40,
  'Gold': 60,
  'Platinum': 80,
  'Diamond': 100
}

// CNEC grade level → bonus points
const CNEC_GRADE_BONUS = {
  1: 0,   // FRESH
  2: 5,   // GLOW
  3: 10,  // BLOOM
  4: 15,  // ICONIC
  5: 20   // MUSE
}

/**
 * Calculate category match score between a campaign and creator
 * @param {Object} campaign - Campaign with product_categories JSONB
 * @param {Object} creator - Creator with categories array and category_grades
 * @returns {{ score: number, matchedCategories: string[], isPrimaryMatch: boolean }}
 */
export function calculateCategoryMatchScore(campaign, creator) {
  const productCats = campaign.product_categories
  if (!productCats || !productCats.primary) {
    return { score: 0, matchedCategories: [], isPrimaryMatch: false }
  }

  const allCampaignCats = [productCats.primary, ...(productCats.secondary || [])].filter(Boolean)
  const creatorCats = creator.categories || []
  const categoryGrades = creator.category_grades || []

  // Find overlapping categories
  const overlap = allCampaignCats.filter(c => creatorCats.includes(c))
  if (overlap.length === 0) {
    return { score: 0, matchedCategories: [], isPrimaryMatch: false }
  }

  // Get best grade score from matched categories
  const bestGradeScore = Math.max(...overlap.map(catId => {
    const grade = categoryGrades.find(g => g.category_id === catId)
    return grade ? (CATEGORY_GRADE_SCORES[grade.grade_level] || 20) : 20
  }))

  // CNEC grade bonus
  const cnecBonus = CNEC_GRADE_BONUS[creator.cnec_grade_level || 1] || 0

  // Primary category match bonus
  const isPrimaryMatch = overlap.includes(productCats.primary)
  const primaryBonus = isPrimaryMatch ? 10 : 0

  return {
    score: Math.min(bestGradeScore + cnecBonus + primaryBonus, 100),
    matchedCategories: overlap,
    isPrimaryMatch
  }
}

/**
 * Fetch category grades for a list of creator IDs from BIZ DB
 * @param {string[]} creatorIds - Array of creator IDs
 * @param {string[]} categoryIds - Optional filter by category IDs
 * @returns {Object} Map of creatorId -> array of { category_id, grade_level, score }
 */
export async function fetchCategoryGrades(creatorIds, categoryIds = null) {
  if (!creatorIds || creatorIds.length === 0) return {}

  let query = supabaseBiz
    .from('creator_category_grades')
    .select('creator_id, category_id, grade_level, score')
    .in('creator_id', creatorIds)

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching category grades:', error)
    return {}
  }

  // Group by creator_id
  const gradeMap = {}
  ;(data || []).forEach(row => {
    if (!gradeMap[row.creator_id]) gradeMap[row.creator_id] = []
    gradeMap[row.creator_id].push(row)
  })

  return gradeMap
}

/**
 * Enrich creators array with their category grades
 * @param {Object[]} creators - Array of creator objects (must have .id)
 * @param {string[]} campaignCategories - Product categories to filter by
 * @returns {Object[]} Enriched creators with .category_grades
 */
export async function enrichCreatorsWithCategoryGrades(creators, campaignCategories = null) {
  if (!creators || creators.length === 0) return creators

  const creatorIds = creators.map(c => c.id).filter(Boolean)
  const gradeMap = await fetchCategoryGrades(creatorIds, campaignCategories)

  return creators.map(creator => ({
    ...creator,
    category_grades: gradeMap[creator.id] || []
  }))
}

/**
 * Get category label (Korean) for a category ID
 */
export const CATEGORY_LABELS = {
  skincare: '스킨케어',
  makeup: '색조',
  diet: '다이어트',
  haircare: '헤어케어',
  fashion: '패션',
  lifestyle: '라이프스타일',
  food: '먹방/요리',
  family: '가족출연',
  pet: '반려동물',
  travel: '여행',
  tech: '테크/IT',
  game: '게임'
}

/**
 * Get category emoji for a category ID
 */
export const CATEGORY_EMOJIS = {
  skincare: '🧴',
  makeup: '💄',
  diet: '🏃',
  haircare: '💇',
  fashion: '👗',
  lifestyle: '🏠',
  food: '🍳',
  family: '👨‍👩‍👧',
  pet: '🐶',
  travel: '✈️',
  tech: '📱',
  game: '🎮'
}
