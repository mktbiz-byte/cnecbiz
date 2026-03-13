/**
 * 패키지 데이터 조회 (공개 API, 랜딩용)
 * 활성 패키지 설정 + 노출 크리에이터 반환
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    // 활성 패키지 설정 조회
    const { data: settings, error: settingsError } = await supabase
      .from('package_settings')
      .select('*')
      .eq('is_active', true)
      .order('month', { ascending: false })
      .limit(1)
      .single()

    if (settingsError || !settings) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: { settings: null, creators: [], remaining_slots: 0 } })
      }
    }

    // 랜딩 노출 크리에이터 조회 (프라이버시 보호: creator_name, youtube_channel_url 제외)
    const { data: creators, error: creatorsError } = await supabase
      .from('package_creators')
      .select('id, display_name, category, avg_views, avg_views_number, content_style, highlight, sample_video_url_1, sample_video_url_2, sample_video_url_3, subscriber_count, display_order')
      .eq('package_setting_id', settings.id)
      .eq('is_visible_on_landing', true)
      .eq('is_available', true)
      .order('display_order', { ascending: true })

    if (creatorsError) throw creatorsError

    const actual_remaining = Math.max(0, settings.max_companies - (settings.current_companies || 0))
    const remaining_slots = settings.display_remaining_slots != null ? settings.display_remaining_slots : actual_remaining
    const display_max = settings.display_max_slots != null ? settings.display_max_slots : settings.max_companies

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { settings: { ...settings, _display_max: display_max }, creators: creators || [], remaining_slots }
      })
    }
  } catch (error) {
    console.error('[get-package-data] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-package-data',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
