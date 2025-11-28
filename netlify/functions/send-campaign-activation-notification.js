/**
 * 캠페인 활성화 알림 전송
 * 기업에게 캠페인이 활성화되었음을 알림톡 + 이메일로 전송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

// Supabase 클라이언트 생성
function getSupabaseClient(region) {
  let supabaseUrl, supabaseKey

  switch (region) {
    case 'korea':
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      supabaseKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    default:
      supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  return createClient(supabaseUrl, supabaseKey)
}

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { campaignId, region = 'korea' } = JSON.parse(event.body)

    console.log('[send-campaign-activation-notification] Request:', { campaignId, region })

    // 캠페인 정보 조회
    const supabaseRegion = getSupabaseClient(region)
    const { data: campaign, error: campaignError } = await supabaseRegion
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      console.error('[send-campaign-activation-notification] Campaign not found:', campaignError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인을 찾을 수 없습니다.' })
      }
    }

    console.log('[send-campaign-activation-notification] Campaign:', campaign.title)

    // 회사 정보 조회 (company_id 사용)
    const { data: company, error: companyError } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('id', campaign.company_id)
      .single()

    if (companyError || !company) {
      console.error('[send-campaign-activation-notification] Company not found:', companyError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '회사 정보를 찾을 수 없습니다.' })
      }
    }

    console.log('[send-campaign-activation-notification] Company:', company.company_name)

    // 날짜 포맷팅
    const formatDate = (dateString) => {
      if (!dateString) return '-'
      const date = new Date(dateString)
      return date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).replace(/\. /g, '.').replace(/\.$/, '')
    }

    // 알림톡 템플릿 변수
    const templateCode = '025100001005' // [CNEC] 신청하신 캠페인 승인 완료
    const variables = {
      '회사명': company.company_name || '고객사',
      '캠페인명': campaign.title || campaign.campaign_name || '캠페인',
      '시작일': formatDate(campaign.recruitment_start_date || campaign.start_date),
      '마감일': formatDate(campaign.recruitment_deadline || campaign.end_date),
      '모집인원': (campaign.total_slots || campaign.target_creators || 0).toString()
    }

    console.log('[send-campaign-activation-notification] Variables:', variables)

    // 이메일 HTML
    const emailHtml = generateEmailHtml(templateCode, variables)

    // 알림 전송
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
      console.log('[send-campaign-activation-notification] Notification sent successfully')
    } else {
      console.log('[send-campaign-activation-notification] No phone or email found')
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('[send-campaign-activation-notification] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    }
  }
}
