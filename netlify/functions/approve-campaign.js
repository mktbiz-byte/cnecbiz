/**
 * 캠페인 승인 API (관리자용)
 * 캠페인 상태를 'active'로 변경하고 기업에게 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

// Supabase 클라이언트 생성 함수
function getSupabaseClient(region) {
  let supabaseUrl, supabaseKey

  switch (region) {
    case 'korea':
    case 'kr':
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
    case 'jp':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
    case 'usa':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      supabaseKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    case 'taiwan':
    case 'tw':
      supabaseUrl = process.env.VITE_SUPABASE_TAIWAN_URL
      supabaseKey = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY
      break
    default:
      supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[approve-campaign] Missing credentials for region: ${region}`)
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Biz DB 클라이언트
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { campaignId, region = 'korea', adminNote } = JSON.parse(event.body)

    console.log('[approve-campaign] Request:', { campaignId, region })

    // 입력 검증
    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 ID가 필요합니다.'
        })
      }
    }

    // 지역별 Supabase 클라이언트 선택
    const supabaseRegion = getSupabaseClient(region)
    if (!supabaseRegion) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: `${region} 리전의 Supabase 설정이 없습니다. 환경변수를 확인해주세요.`
        })
      }
    }

    // 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseRegion
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[approve-campaign] Campaign not found:', campaignError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      }
    }

    console.log('[approve-campaign] Campaign found:', campaign.title)

    // 회사 정보 조회 (company_id 또는 company_email로)
    let company = null

    // 1. company_id로 지역 DB에서 조회
    if (campaign.company_id) {
      const { data: companyData } = await supabaseRegion
        .from('companies')
        .select('*')
        .eq('id', campaign.company_id)
        .maybeSingle()

      if (companyData) {
        company = companyData
        console.log('[approve-campaign] Company found by company_id in regional DB')
      }
    }

    // 2. company_id로 Biz DB에서 조회
    if (!company && campaign.company_id) {
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('id', campaign.company_id)
        .maybeSingle()

      if (companyData) {
        company = companyData
        console.log('[approve-campaign] Company found by company_id in Biz DB')
      }
    }

    // 3. company_email로 지역 DB에서 조회
    if (!company && campaign.company_email) {
      const { data: companyData } = await supabaseRegion
        .from('companies')
        .select('*')
        .eq('email', campaign.company_email)
        .maybeSingle()

      if (companyData) {
        company = companyData
        console.log('[approve-campaign] Company found by company_email in regional DB')
      }
    }

    // 4. company_email로 Biz DB에서 조회
    if (!company && campaign.company_email) {
      const { data: companyData } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('email', campaign.company_email)
        .maybeSingle()

      if (companyData) {
        company = companyData
        console.log('[approve-campaign] Company found by company_email in Biz DB')
      }
    }

    if (!company) {
      console.error('[approve-campaign] Company not found for campaign:', {
        company_id: campaign.company_id,
        company_email: campaign.company_email
      })
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '회사 정보를 찾을 수 없습니다.'
        })
      }
    }

    console.log('[approve-campaign] Company found:', company.company_name)

    // 캠페인 상태 업데이트
    const { error: updateError } = await supabaseRegion
      .from('campaigns')
      .update({
        status: 'active',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        admin_note: adminNote || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('[approve-campaign] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 승인 중 오류가 발생했습니다.'
        })
      }
    }

    console.log('[approve-campaign] Campaign approved successfully')

    // 알림 발송 (카카오톡 + 이메일) - Popbill 사용
    try {
      // 알림톡 템플릿 코드
      const templateCode = '025100001005' // [CNEC] 신청하신 캠페인 승인 완료

      // 날짜 포맷팅
      const formatDate = (dateString) => {
        if (!dateString) return '-'
        const date = new Date(dateString)
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
      }

      const variables = {
        '회사명': company.company_name || '고객사',
        '캠페인명': campaign.title || campaign.campaign_name || '캠페인',
        '시작일': formatDate(campaign.recruitment_start_date || campaign.start_date),
        '마감일': formatDate(campaign.recruitment_deadline || campaign.end_date),
        '모집인원': (campaign.total_slots || campaign.target_creators || 0).toString()
      }

      console.log('[approve-campaign] Sending notification with variables:', variables)

      // 이메일 HTML 생성
      const emailHtml = generateEmailHtml(templateCode, variables)

      // 알림 전송 (Popbill 카카오톡 + 이메일)
      if (company.phone || company.email) {
        await sendNotification({
          receiverNum: company.phone,
          receiverEmail: company.email,
          receiverName: company.company_name,
          templateCode,
          variables,
          emailSubject: emailHtml.subject,
          emailHtml: emailHtml.html
        })
        console.log('[approve-campaign] Notification sent successfully')
      } else {
        console.log('[approve-campaign] No phone or email found')
      }
    } catch (notifError) {
      console.error('[approve-campaign] Notification error:', notifError)
      // 알림 발송 실패해도 승인은 완료
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '캠페인이 승인되었습니다.'
      })
    }

  } catch (error) {
    console.error('[approve-campaign] Server error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      })
    }
  }
}
