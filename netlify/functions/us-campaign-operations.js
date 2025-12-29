const { createClient } = require('@supabase/supabase-js')

// US Supabase 서비스 롤 클라이언트 (RLS 우회)
// 환경변수: VITE_SUPABASE_US_URL, SUPABASE_US_SERVICE_ROLE_KEY 필요
const usUrl = process.env.VITE_SUPABASE_US_URL
const usServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY

// BIZ Supabase (인증 확인용)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL
const bizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 클라이언트 생성 (환경변수 누락 시 null)
const supabaseUS = usUrl && usServiceKey ? createClient(usUrl, usServiceKey) : null
const supabaseBiz = bizUrl && bizServiceKey ? createClient(bizUrl, bizServiceKey) : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  // 디버깅: 환경변수 상태 로깅
  console.log('[US API] Environment check:', {
    hasUsUrl: !!process.env.VITE_SUPABASE_US_URL,
    hasUsKey: !!process.env.SUPABASE_US_SERVICE_ROLE_KEY,
    hasBizUrl: !!(process.env.VITE_SUPABASE_BIZ_URL || process.env.VITE_SUPABASE_URL),
    hasBizKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseUSReady: !!supabaseUS,
    supabaseBizReady: !!supabaseBiz
  })

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
    // 환경변수 체크
    if (!supabaseUS) {
      console.error('US Supabase 환경변수 누락: VITE_SUPABASE_US_URL 또는 SUPABASE_US_SERVICE_ROLE_KEY')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'US Supabase 설정이 필요합니다. 관리자에게 문의하세요.' })
      }
    }

    if (!supabaseBiz) {
      console.error('BIZ Supabase 환경변수 누락')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'BIZ Supabase 설정이 필요합니다. 관리자에게 문의하세요.' })
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

    console.log('[US API] Request:', { action, campaign_id, application_id, data, userEmail: user.email, userId: user.id })

    // 캠페인 소유권 확인 (company_id가 user.id와 일치하는지)
    const { data: campaign, error: campaignError } = await supabaseUS
      .from('campaigns')
      .select('id, company_id, title')
      .eq('id', campaign_id)
      .single()

    console.log('[US API] Campaign lookup:', { campaign, error: campaignError?.message })

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: `캠페인을 찾을 수 없습니다: ${campaignError?.message || 'not found'}` })
      }
    }

    // 관리자 체크
    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    const isAdmin = !!adminData
    console.log('[US API] Admin check:', { isAdmin, userEmail: user.email })

    // 소유권 확인 (관리자이거나 company_id가 일치)
    console.log('[US API] Permission check:', { campaignCompanyId: campaign.company_id, userId: user.id, isAdmin })
    if (!isAdmin && campaign.company_id !== user.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: `이 캠페인에 대한 권한이 없습니다 (company_id: ${campaign.company_id}, user: ${user.id})` })
      }
    }

    let result

    switch (action) {
      // 가상 선정 토글
      case 'virtual_select':
        // US DB는 main_channel, updated_at 컬럼이 없을 수 있음
        const virtualSelectData = { virtual_selected: data.virtual_selected }
        result = await supabaseUS
          .from('applications')
          .update(virtualSelectData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 크리에이터 확정 (status를 selected로)
      case 'confirm_selection':
        result = await supabaseUS
          .from('applications')
          .update({
            status: 'selected',
            virtual_selected: false
          })
          .in('id', data.application_ids)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 확정 취소
      case 'cancel_selection':
        result = await supabaseUS
          .from('applications')
          .update({
            status: 'pending',
            virtual_selected: false
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 상태 업데이트
      case 'update_status':
        result = await supabaseUS
          .from('applications')
          .update({
            status: data.status
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 배송 정보 업데이트
      case 'update_shipping':
        result = await supabaseUS
          .from('applications')
          .update({
            tracking_number: data.tracking_number,
            shipping_company: data.shipping_company
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 가이드 업데이트
      case 'update_guide':
        result = await supabaseUS
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

      // 조회수 업데이트
      case 'update_views':
        result = await supabaseUS
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

      // applications 조회
      case 'get_applications':
        result = await supabaseUS
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('created_at', { ascending: false })
        break

      // 일반 업데이트 (updated_at, main_channel 제외)
      case 'update_application':
        // US DB에 없는 컬럼 제외
        const { updated_at, main_channel, ...safeData } = data
        result = await supabaseUS
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
      console.error('Database error:', result.error)
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
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
