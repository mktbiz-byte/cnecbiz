const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 뉴스레터 조회수 추적 함수
 * - 중복 조회수 (view_count): 모든 조회 수
 * - 순유입 (unique_view_count): 고유 방문자만 카운트 (visitorId 기반)
 */
exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const { newsletterId, visitorId } = JSON.parse(event.body || '{}')

    if (!newsletterId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'newsletterId is required' })
      }
    }

    // visitorId가 없으면 IP 기반으로 생성
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     event.headers['client-ip'] ||
                     'unknown'

    const userAgent = event.headers['user-agent'] || ''
    const finalVisitorId = visitorId || `${clientIp}_${hashString(userAgent)}`

    // 1. 먼저 newsletter_views 테이블 존재 확인 및 생성
    await ensureViewsTableExists()

    // 2. 중복 체크를 위해 최근 24시간 내 같은 방문자가 조회했는지 확인
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: existingView, error: checkError } = await supabase
      .from('newsletter_views')
      .select('id')
      .eq('newsletter_id', newsletterId)
      .eq('visitor_id', finalVisitorId)
      .gte('viewed_at', twentyFourHoursAgo)
      .maybeSingle()

    const isUniqueView = !existingView

    // 3. newsletter_views에 조회 기록 추가
    const { error: insertError } = await supabase
      .from('newsletter_views')
      .insert({
        newsletter_id: newsletterId,
        visitor_id: finalVisitorId,
        ip_address: clientIp,
        user_agent: userAgent.substring(0, 500),
        is_unique: isUniqueView
      })

    if (insertError && !insertError.message?.includes('does not exist')) {
      console.error('[track-newsletter-view] Insert error:', insertError)
    }

    // 4. newsletters 테이블의 조회수 업데이트
    // 먼저 현재 값을 가져옴
    const { data: newsletter, error: fetchError } = await supabase
      .from('newsletters')
      .select('view_count, unique_view_count')
      .eq('id', newsletterId)
      .single()

    if (fetchError) {
      console.error('[track-newsletter-view] Fetch newsletter error:', fetchError)
    } else {
      const updateData = {
        view_count: (newsletter.view_count || 0) + 1
      }

      // 순유입이면 unique_view_count도 증가
      if (isUniqueView) {
        updateData.unique_view_count = (newsletter.unique_view_count || 0) + 1
      }

      const { error: updateError } = await supabase
        .from('newsletters')
        .update(updateData)
        .eq('id', newsletterId)

      if (updateError) {
        console.error('[track-newsletter-view] Update error:', updateError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        isUniqueView,
        visitorId: finalVisitorId
      })
    }
  } catch (error) {
    console.error('[track-newsletter-view] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}

/**
 * newsletter_views 테이블이 없으면 생성
 */
async function ensureViewsTableExists() {
  // 테이블 존재 확인
  const { error: checkError } = await supabase
    .from('newsletter_views')
    .select('id')
    .limit(1)

  // 테이블이 없으면 생성은 수동으로 해야함 (여기서는 에러 로깅만)
  if (checkError && checkError.message?.includes('does not exist')) {
    console.log('[track-newsletter-view] newsletter_views table does not exist. Please create it manually.')
  }
}

/**
 * 간단한 문자열 해싱 함수
 */
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
