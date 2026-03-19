const { createClient } = require('@supabase/supabase-js')

// Korea Supabase 서비스 롤 클라이언트 (RLS 우회)
const koreaUrl = process.env.VITE_SUPABASE_KOREA_URL
const koreaServiceKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY

// BIZ Supabase (인증 확인용)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL
const bizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseKorea = koreaUrl && koreaServiceKey ? createClient(koreaUrl, koreaServiceKey) : null
const supabaseBiz = bizUrl && bizServiceKey ? createClient(bizUrl, bizServiceKey) : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
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
    if (!supabaseKorea) {
      console.error('Korea Supabase 환경변수 누락: VITE_SUPABASE_KOREA_URL 또는 SUPABASE_KOREA_SERVICE_ROLE_KEY')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'Korea Supabase 설정이 필요합니다.' })
      }
    }

    if (!supabaseBiz) {
      console.error('BIZ Supabase 환경변수 누락')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'BIZ Supabase 설정이 필요합니다.' })
      }
    }

    // 인증 확인
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: '인증이 필요합니다' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseBiz.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: '유효하지 않은 인증입니다' })
      }
    }

    const body = JSON.parse(event.body)
    const { action, campaign_id, application_id, data } = body

    console.log('[Korea API] Request:', { action, campaign_id, application_id, userEmail: user.email })

    // 캠페인 조회 (Korea DB)
    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .select('id, company_id, title')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다' })
      }
    }

    // 관리자 체크
    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    const isAdmin = !!adminData

    // 소유권 확인 (관리자이거나 company_id가 일치)
    if (!isAdmin && campaign.company_id !== user.id) {
      // company_id가 companies.user_id일 수 있으므로 추가 확인
      const { data: companyRecord } = await supabaseBiz
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', campaign.company_id)
        .maybeSingle()

      if (!companyRecord) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ success: false, error: '이 캠페인에 대한 권한이 없습니다' })
        }
      }
    }

    let result

    switch (action) {
      case 'get_campaign':
        result = await supabaseKorea
          .from('campaigns')
          .select('*')
          .eq('id', campaign_id)
          .single()
        break

      case 'get_applications':
        result = await supabaseKorea
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('created_at', { ascending: false })
          .limit(1000)
        break

      case 'get_participants':
        result = await supabaseKorea
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .in('status', ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed', 'sns_uploaded', 'force_cancelled'])
          .order('created_at', { ascending: false })
        break

      case 'get_video_submissions':
        result = await supabaseKorea
          .from('video_submissions')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('created_at', { ascending: false })
        break

      case 'get_user_profiles':
        result = await supabaseKorea
          .from('user_profiles')
          .select('*')
        break

      case 'virtual_select':
        const virtualSelectData = { virtual_selected: data.virtual_selected }
        if (data.main_channel) {
          virtualSelectData.main_channel = data.main_channel
        }
        result = await supabaseKorea
          .from('applications')
          .update(virtualSelectData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_channel':
        result = await supabaseKorea
          .from('applications')
          .update({ main_channel: data.main_channel })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'confirm_selection':
        result = await supabaseKorea
          .from('applications')
          .update({
            status: 'selected',
            virtual_selected: false
          })
          .in('id', data.application_ids)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'cancel_selection':
        result = await supabaseKorea
          .from('applications')
          .update({
            status: 'pending',
            virtual_selected: false
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_status':
        result = await supabaseKorea
          .from('applications')
          .update({ status: data.status })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_shipping':
        result = await supabaseKorea
          .from('applications')
          .update({
            tracking_number: data.tracking_number,
            shipping_company: data.shipping_company
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_guide':
        result = await supabaseKorea
          .from('applications')
          .update({
            personalized_guide: data.guide,
            status: data.status || 'filming',
            additional_message: data.message || null
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_views':
        result = await supabaseKorea
          .from('applications')
          .update({
            views: data.views,
            last_view_check: new Date().toISOString(),
            view_history: data.view_history
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_application':
        const { updated_at, ...safeData } = data
        result = await supabaseKorea
          .from('applications')
          .update(safeData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `알 수 없는 action: ${action}` })
        }
    }

    if (result.error) {
      console.error('[Korea API] Database error:', result.error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: result.error.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result.data
      })
    }

  } catch (error) {
    console.error('[Korea API] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'korea-campaign-operations',
          errorMessage: error.message,
          context: { action: JSON.parse(event.body)?.action }
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
