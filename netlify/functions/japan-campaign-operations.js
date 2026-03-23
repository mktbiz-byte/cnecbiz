const { createClient } = require('@supabase/supabase-js')

// Japan Supabase 서비스 롤 클라이언트 (RLS 우회)
const japanUrl = process.env.VITE_SUPABASE_JAPAN_URL
const japanServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY

// BIZ Supabase (인증 확인용)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL
const bizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseJapan = japanUrl && japanServiceKey ? createClient(japanUrl, japanServiceKey) : null
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
    if (!supabaseJapan) {
      console.error('Japan Supabase 환경변수 누락: VITE_SUPABASE_JAPAN_URL 또는 SUPABASE_JAPAN_SERVICE_ROLE_KEY')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'Japan Supabase 설정이 필요합니다. 관리자에게 문의하세요.' })
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

    console.log('[Japan API] Request:', { action, campaign_id, application_id, userEmail: user.email })

    // 캠페인 조회 (Japan DB)
    const { data: campaign, error: campaignError } = await supabaseJapan
      .from('campaigns')
      .select('id, company_id, company_email, title')
      .eq('id', campaign_id)
      .single()

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

    // 소유권 확인 (관리자이거나 company_email 또는 company_id가 일치)
    if (!isAdmin && campaign.company_id !== user.id && campaign.company_email !== user.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: '이 캠페인에 대한 권한이 없습니다' })
      }
    }

    let result

    switch (action) {
      case 'get_applications':
        result = await supabaseJapan
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('created_at', { ascending: false })
          .limit(1000)
        break

      // 참가자 조회 (선정된 크리에이터만)
      case 'get_participants':
        result = await supabaseJapan
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .in('status', ['selected', 'approved', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'completed', 'sns_uploaded', 'force_cancelled'])
          .order('created_at', { ascending: false })
        break

      case 'virtual_select':
        const virtualSelectData = { virtual_selected: data.virtual_selected }
        if (data.main_channel) {
          virtualSelectData.main_channel = data.main_channel
        }
        result = await supabaseJapan
          .from('applications')
          .update(virtualSelectData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_channel':
        result = await supabaseJapan
          .from('applications')
          .update({ main_channel: data.main_channel })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'confirm_selection':
        result = await supabaseJapan
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
        result = await supabaseJapan
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
        result = await supabaseJapan
          .from('applications')
          .update({ status: data.status })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_shipping':
        result = await supabaseJapan
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
        result = await supabaseJapan
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
        result = await supabaseJapan
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
        result = await supabaseJapan
          .from('applications')
          .update(safeData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 캠페인 정보 업데이트 (마감일, 상세 정보 등)
      case 'update_campaign': {
        // 확실히 제외할 필드 (시스템 필드)
        const EXCLUDED_FIELDS = ['created_at', 'id']

        let updateData = {}
        for (const key of Object.keys(data)) {
          if (!EXCLUDED_FIELDS.includes(key) && data[key] !== undefined) {
            updateData[key] = data[key]
          }
        }

        if (Object.keys(updateData).length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '수정할 유효한 필드가 없습니다.' })
          }
        }

        // 존재하지 않는 컬럼 에러 시 해당 컬럼 제거 후 재시도 (최대 5회)
        let retries = 0
        while (retries < 5) {
          result = await supabaseJapan
            .from('campaigns')
            .update(updateData)
            .eq('id', campaign_id)
            .select()

          if (result.error && result.error.message && result.error.message.includes('column')) {
            const match = result.error.message.match(/the '(\w+)' column/)
            if (match) {
              const badCol = match[1]
              console.log(`[Japan API] Removing missing column '${badCol}' and retrying`)
              delete updateData[badCol]
              retries++
              if (Object.keys(updateData).length === 0) {
                return {
                  statusCode: 400,
                  headers,
                  body: JSON.stringify({ success: false, error: '수정할 유효한 필드가 없습니다.' })
                }
              }
              continue
            }
          }
          break
        }

        console.log('[Japan API] update_campaign final fields:', Object.keys(updateData))
        break
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `알 수 없는 action: ${action}` })
        }
    }

    if (result.error) {
      console.error('[Japan API] Database error:', result.error)
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
    console.error('[Japan API] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'japan-campaign-operations',
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
