/**
 * 패키지 캠페인 생성 (관리자 전용)
 * 신청 승인 후 Korea DB에 캠페인 생성 + BIZ DB 신청 상태 업데이트
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
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

    if (application.status === 'campaign_created') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '이미 캠페인이 생성된 신청입니다.' })
      }
    }

    // 패키지 설정 조회 (BIZ DB)
    const { data: settings } = await supabaseBiz
      .from('package_settings')
      .select('*')
      .eq('id', application.package_setting_id)
      .single()

    // 기업 매칭 (BIZ DB companies 테이블에서 이메일로 검색)
    let companyBizId = null
    let companyUserId = null
    const { data: company } = await supabaseBiz
      .from('companies')
      .select('id, user_id, phone')
      .eq('email', application.email)
      .limit(1)
      .single()

    if (company) {
      companyBizId = company.id
      companyUserId = company.user_id || null
    }

    // 캠페인 생성 (Korea DB campaigns 테이블 - 실제 캠페인이 저장되는 곳)
    const totalCreators = settings?.total_creators || 10
    const campaignTitle = `[패키지] ${application.brand_name || application.company_name} - ${application.month}`

    const campaignPayload = {
      title: campaignTitle,
      campaign_type: 'planned',
      status: 'active',
      region: 'korea',
      brand: application.company_name,
      product_name: application.brand_name || '',
      company_email: application.email,
      total_slots: totalCreators,
      remaining_slots: totalCreators,
    }
    if (companyUserId) campaignPayload.company_id = companyUserId
    if (companyBizId) campaignPayload.company_biz_id = companyBizId
    if (company?.phone) campaignPayload.company_phone = company.phone

    const { data: campaign, error: campaignError } = await supabaseKorea
      .from('campaigns')
      .insert(campaignPayload)
      .select()
      .single()

    if (campaignError) throw campaignError

    // 캠페인 URL 생성
    const campaignUrl = `https://cnecbiz.com/company/package/${campaign.id}`

    // BIZ DB 신청 업데이트
    const updatePayload = {
      status: 'campaign_created',
      campaign_id: campaign.id,
      campaign_url: campaignUrl,
      admin_note: admin_note || application.admin_note,
    }
    if (companyBizId) updatePayload.company_id = companyBizId

    const { error: updateError } = await supabaseBiz
      .from('package_applications')
      .update(updatePayload)
      .eq('id', application_id)

    if (updateError) throw updateError

    // current_companies 증가 (BIZ DB)
    if (settings) {
      await supabaseBiz
        .from('package_settings')
        .update({ current_companies: (settings.current_companies || 0) + 1 })
        .eq('id', settings.id)
    }

    // 기업에게 이메일 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: application.email,
          subject: `[크넥] 특가 패키지 캠페인이 생성되었습니다`,
          html: `
            <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6C5CE7;">특가 패키지 캠페인 안내</h2>
              <p>${application.contact_name}님, 안녕하세요.</p>
              <p>신청하신 특가 패키지 캠페인이 생성되었습니다.</p>
              <p>아래 링크에서 크리에이터를 선택하고 캠페인을 진행해주세요.</p>
              <a href="${campaignUrl}" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">캠페인 페이지 바로가기</a>
              <p style="color: #636E72; font-size: 14px;">본 링크는 비공개 링크이므로 외부에 공유하지 마세요.</p>
            </div>
          `
        })
      })
    } catch (e) { console.error('Email notification failed:', e.message) }

    // 관리자 네이버웍스 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          isAdminNotification: true,
          message: `✅ [패키지 캠페인 생성 완료]\n\n기업: ${application.company_name}\n브랜드: ${application.brand_name || '-'}\n캠페인 URL: ${campaignUrl}`
        })
      })
    } catch (e) { console.error('Naver Works notification failed:', e.message) }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: { campaign_id: campaign.id, campaign_url: campaignUrl }
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
