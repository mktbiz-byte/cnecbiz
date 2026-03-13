/**
 * 패키지 신청 제출 (공개 API)
 * 기업 신청폼 제출 처리 + 관리자 알림
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
    const { package_setting_id, company_name, contact_name, email, phone, brand_name, product_url, note } = JSON.parse(event.body)

    // 필수값 검증
    if (!company_name || !contact_name || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '회사명, 담당자명, 이메일은 필수입니다.' })
      }
    }

    if (!package_setting_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '패키지 설정 ID가 필요합니다.' })
      }
    }

    // 패키지 설정 조회 + 슬롯 체크
    const { data: settings, error: settingsError } = await supabase
      .from('package_settings')
      .select('*')
      .eq('id', package_setting_id)
      .single()

    if (settingsError || !settings) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '패키지를 찾을 수 없습니다.' })
      }
    }

    if ((settings.current_companies || 0) >= settings.max_companies) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '이번 달 패키지 신청이 마감되었습니다.' })
      }
    }

    // 신청 INSERT
    const { data: application, error: insertError } = await supabase
      .from('package_applications')
      .insert({
        package_setting_id,
        month: settings.month,
        company_name,
        contact_name,
        email,
        phone: phone || null,
        brand_name: brand_name || null,
        product_url: product_url || null,
        note: note || null,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 관리자 네이버웍스 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          isAdminNotification: true,
          message: `📦 [특가 패키지 신규 신청]\n\n기업명: ${company_name}\n담당자: ${contact_name}\n이메일: ${email}\n연락처: ${phone || '-'}\n브랜드: ${brand_name || '-'}\n\n관리자 페이지에서 확인해주세요.\nhttps://cnecbiz.com/admin/package`
        })
      })
    } catch (e) { console.error('Naver Works notification failed:', e.message) }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: application })
    }
  } catch (error) {
    console.error('[submit-package-application] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'submit-package-application',
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
