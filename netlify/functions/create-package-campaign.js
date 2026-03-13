/**
 * 패키지 캠페인 - 승인 처리 (관리자 전용)
 *
 * 캠페인 자동 생성 X → 기업이 직접 /company/campaigns/create/korea 에서 생성
 * 이 함수는 승인 상태 변경 + 이메일/네이버웍스 알림만 처리
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) }
  }

  try {
    const { application_id, admin_note } = JSON.parse(event.body)

    if (!application_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '신청 ID가 필요합니다.' })
      }
    }

    // 신청 조회 (BIZ DB)
    const { data: application, error: appError } = await supabaseBiz
      .from('package_applications')
      .select('*')
      .eq('id', application_id)
      .single()

    if (appError || !application) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '신청을 찾을 수 없습니다.' })
      }
    }

    // 신청 업데이트 - 승인 처리
    const campaignCreateUrl = 'https://cnecbiz.com/company/campaigns/create/korea'

    const { error: updateError } = await supabaseBiz
      .from('package_applications')
      .update({
        status: 'approved',
        campaign_url: campaignCreateUrl,
        admin_note: admin_note || application.admin_note,
      })
      .eq('id', application_id)

    if (updateError) throw updateError

    // current_companies 증가 (BIZ DB)
    if (application.package_setting_id) {
      const { data: settings } = await supabaseBiz
        .from('package_settings')
        .select('id, current_companies')
        .eq('id', application.package_setting_id)
        .single()

      if (settings) {
        await supabaseBiz
          .from('package_settings')
          .update({ current_companies: (settings.current_companies || 0) + 1 })
          .eq('id', settings.id)
      }
    }

    // 관리자 네이버웍스 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          isAdminNotification: true,
          message: `✅ [패키지 신청 승인]\n\n기업: ${application.company_name}\n브랜드: ${application.brand_name || '-'}\n담당자: ${application.contact_name}\n이메일: ${application.email}`
        })
      })
    } catch (e) { console.error('Naver Works notification failed:', e.message) }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { campaign_url: campaignCreateUrl }
      })
    }
  } catch (error) {
    console.error('[create-package-campaign] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'create-package-campaign',
          errorMessage: error.message,
          context: { application_id: JSON.parse(event.body)?.application_id }
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
