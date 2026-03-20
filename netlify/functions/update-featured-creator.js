const { createClient } = require('@supabase/supabase-js')

// Korea DB - service role key로 RLS 우회
const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { action } = body

    switch (action) {
      case 'register':
        return await handleRegister(body, headers)
      case 'update_profile':
        return await handleUpdateProfile(body, headers)
      case 'update_grade':
        return await handleUpdateGrade(body, headers)
      case 'update_badges':
        return await handleUpdateBadges(body, headers)
      case 'update_ai_picks':
        return await handleUpdateAiPicks(body, headers)
      case 'reset_ai_picks':
        return await handleResetAiPicks(body, headers)
      case 'ensure_columns':
        return await handleEnsureColumns(headers)
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
        }
    }
  } catch (error) {
    console.error('[update-featured-creator] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-featured-creator',
          errorMessage: error.message,
          context: { action: JSON.parse(event.body || '{}').action }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

// 크리에이터 등록
async function handleRegister(body, headers) {
  const { creatorData } = body

  if (!creatorData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'creatorData is required' })
    }
  }

  // categories, badges 등 추가 필드 포함하여 insert
  const insertData = {
    user_id: creatorData.user_id,
    source_country: creatorData.source_country,
    name: creatorData.name,
    profile_image_url: creatorData.profile_image_url,
    bio: creatorData.bio,
    instagram_url: creatorData.instagram_url || null,
    instagram_followers: creatorData.instagram_followers || 0,
    youtube_url: creatorData.youtube_url || null,
    youtube_subscribers: creatorData.youtube_subscribers || 0,
    tiktok_url: creatorData.tiktok_url || null,
    tiktok_followers: creatorData.tiktok_followers || 0,
    primary_country: creatorData.primary_country,
    active_regions: creatorData.active_regions || [],
    is_active: true,
    cnec_grade_level: creatorData.cnec_grade_level || 1,
    cnec_grade_name: creatorData.cnec_grade_name || 'FRESH',
    cnec_total_score: creatorData.cnec_total_score || 0,
    is_cnec_recommended: creatorData.is_cnec_recommended || false,
    categories: creatorData.categories || [],
    badges: creatorData.badges || []
  }

  const { data, error } = await supabaseKorea
    .from('featured_creators')
    .insert([insertData])
    .select()
    .single()

  if (error) throw error

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data, creatorId: data.id })
  }
}

// 프로필 업데이트
async function handleUpdateProfile(body, headers) {
  const { creatorId, profileData } = body

  if (!creatorId || !profileData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'creatorId and profileData are required' })
    }
  }

  const updateData = {
    updated_at: new Date().toISOString()
  }

  // 허용된 필드만 업데이트
  const allowedFields = [
    'bio', 'categories', 'rating', 'representative_videos',
    'cnec_collab_videos', 'company_reviews', 'badges',
    'cnec_grade_level', 'cnec_grade_name', 'cnec_total_score',
    'is_cnec_recommended', 'is_ai_pick', 'ai_pick_order',
    'name', 'profile_image_url', 'instagram_url', 'youtube_url',
    'tiktok_url', 'instagram_followers', 'youtube_subscribers', 'tiktok_followers'
  ]

  allowedFields.forEach(field => {
    if (profileData[field] !== undefined) {
      updateData[field] = profileData[field]
    }
  })

  const { data, error } = await supabaseKorea
    .from('featured_creators')
    .update(updateData)
    .eq('id', creatorId)
    .select()
    .single()

  if (error) throw error

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data })
  }
}

// 등급 업데이트
async function handleUpdateGrade(body, headers) {
  const { creatorId, gradeLevel, gradeName, isRecommended } = body

  if (!creatorId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'creatorId is required' })
    }
  }

  const { data, error } = await supabaseKorea
    .from('featured_creators')
    .update({
      cnec_grade_level: gradeLevel,
      cnec_grade_name: gradeName,
      is_cnec_recommended: isRecommended !== undefined ? isRecommended : gradeLevel >= 2,
      updated_at: new Date().toISOString()
    })
    .eq('id', creatorId)
    .select()
    .single()

  if (error) throw error

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data })
  }
}

// 뱃지 업데이트
async function handleUpdateBadges(body, headers) {
  const { creatorId, badges } = body

  if (!creatorId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'creatorId is required' })
    }
  }

  const { data, error } = await supabaseKorea
    .from('featured_creators')
    .update({
      badges: badges || [],
      updated_at: new Date().toISOString()
    })
    .eq('id', creatorId)
    .select()
    .single()

  if (error) throw error

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data })
  }
}

// AI Pick 업데이트
async function handleUpdateAiPicks(body, headers) {
  const { slots } = body // [creatorId or null, ...]

  if (!slots || !Array.isArray(slots)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'slots array is required' })
    }
  }

  // 기존 AI pick 리셋
  await supabaseKorea
    .from('featured_creators')
    .update({ is_ai_pick: false, ai_pick_order: null })
    .eq('is_ai_pick', true)

  // 새 AI pick 설정
  for (let i = 0; i < slots.length; i++) {
    if (slots[i]) {
      await supabaseKorea
        .from('featured_creators')
        .update({ is_ai_pick: true, ai_pick_order: i + 1 })
        .eq('id', slots[i])
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  }
}

// AI Pick 리셋
async function handleResetAiPicks(body, headers) {
  const { error } = await supabaseKorea
    .from('featured_creators')
    .update({ is_ai_pick: false, ai_pick_order: null })
    .eq('is_ai_pick', true)

  if (error) throw error

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  }
}

// 컬럼 존재 확인 및 추가
async function handleEnsureColumns(headers) {
  // categories 컬럼 추가 (없으면)
  await supabaseKorea.rpc('exec_sql', {
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'featured_creators' AND column_name = 'categories') THEN
          ALTER TABLE featured_creators ADD COLUMN categories TEXT[] DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'featured_creators' AND column_name = 'badges') THEN
          ALTER TABLE featured_creators ADD COLUMN badges TEXT[] DEFAULT '{}';
        END IF;
      END $$;
    `
  }).catch(err => {
    console.warn('exec_sql not available, trying direct ALTER:', err.message)
  })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Column check completed' })
  }
}
