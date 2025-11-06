/**
 * 캠페인 검수 신청 API
 * 캠페인 상태를 'pending_review'로 변경하고 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
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
    const { campaignId, companyId } = JSON.parse(event.body)

    // 입력 검증
    if (!campaignId || !companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*, companies(company_name, email, phone)')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single()

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인을 찾을 수 없습니다.'
        })
      }
    }

    // 캠페인 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'pending_review',
        submitted_for_review_at: new Date().toISOString()
      })
      .eq('id', campaignId)

    if (updateError) {
      console.error('캠페인 상태 업데이트 오류:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 검수 신청 중 오류가 발생했습니다.'
        })
      }
    }

    // 알림 발송 (카카오톡 + 이메일)
    try {
      const templateCode = '025100001010' // 캠페인 검수 신청
      const variables = {
        '회사명': campaign.companies.company_name,
        '캠페인명': campaign.title,
        '시작일': campaign.start_date,
        '마감일': campaign.end_date,
        '모집인원': campaign.target_creators
      }

      const emailTemplate = generateEmailHtml(templateCode, variables)

      await sendNotification({
        receiverNum: campaign.companies.phone,
        receiverEmail: campaign.companies.email,
        receiverName: campaign.companies.company_name,
        templateCode,
        variables,
        emailSubject: emailTemplate.subject,
        emailHtml: emailTemplate.html
      })

      console.log('알림 발송 완료')
    } catch (notifError) {
      console.error('알림 발송 오류:', notifError.message)
      // 알림 발송 실패해도 검수 신청은 완료
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '캠페인 검수 신청이 완료되었습니다.'
      })
    }

  } catch (error) {
    console.error('서버 오류:', error)
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
