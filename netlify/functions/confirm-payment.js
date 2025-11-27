/**
 * 수동 입금 확인 처리 API (관리자 전용)
 * 포인트 충전 신청을 승인하고 포인트 지급
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화 (Service Role Key 사용)
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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
    const {
      chargeRequestId,
      adminUserId,
      depositDate,
      depositAmount,
      depositorName,
      memo
    } = JSON.parse(event.body)

    // 입력 검증
    if (!chargeRequestId || !adminUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        })
      }
    }

    // 관리자 권한 확인 (이메일 기반)
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(adminUserId)

    if (adminError || !adminUser) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사용자 정보를 찾을 수 없습니다.'
        })
      }
    }

    // @cnec.co.kr 도메인 또는 특정 관리자 이메일 확인
    const isAdmin = adminUser.user.email?.endsWith('@cnec.co.kr') || 
                    adminUser.user.email === 'admin@test.com' ||
                    adminUser.user.user_metadata?.role === 'admin'

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '관리자 권한이 필요합니다.'
        })
      }
    }

    // 충전 신청 조회
    const { data: chargeRequest, error: requestError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('id', chargeRequestId)
      .single()

    if (requestError || !chargeRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청을 찾을 수 없습니다.'
        })
      }
    }

    // 이미 처리된 신청인지 확인
    if (chargeRequest.status === 'completed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리된 신청입니다.'
        })
      }
    }

    // 충전 신청 상태 업데이트
    const updateData = {
      status: 'completed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: adminUserId
    }

    // 입금자명 업데이트 (테이블에 있는 컴럼)
    if (depositorName) updateData.depositor_name = depositorName
    // 메모는 credit_notes 컴럼 사용
    if (memo) updateData.credit_notes = memo

    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update(updateData)
      .eq('id', chargeRequestId)

    if (updateError) {
      console.error('충전 신청 업데이트 오류:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 신청 업데이트 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    // 캐페인 정보 조회 (충전 신청에 연결된 캐페인)
    let campaign = null
    let campaignRegion = 'biz'
    
    if (chargeRequest.bank_transfer_info?.campaign_id) {
      const campaignId = chargeRequest.bank_transfer_info.campaign_id
      
      // 한국 캐페인 먼저 확인
      const { data: koreanCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      
      if (koreanCampaign) {
        campaign = koreanCampaign
        campaignRegion = koreanCampaign.region || 'korea'
      } else {
        // 일본 캐페인 확인
        const supabaseJapan = createClient(
          process.env.VITE_SUPABASE_JAPAN_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        const { data: japanCampaign } = await supabaseJapan
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single()
        
        if (japanCampaign) {
          campaign = japanCampaign
          campaignRegion = 'japan'
        }
      }
    }

    // 캐페인 상태를 '승인요청중'으로 변경
    if (campaign) {
      const campaignSupabase = campaignRegion === 'japan' 
        ? createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
        : supabaseAdmin

      const { error: campaignUpdateError } = await campaignSupabase
        .from('campaigns')
        .update({
          status: 'pending',
          payment_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)

      if (campaignUpdateError) {
        console.error('캐페인 상태 업데이트 오류:', campaignUpdateError)
      }
    }

    // 회사 정보 조회
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('company_name, email, phone, contact_person')
      .eq('user_id', chargeRequest.company_id)
      .single()

    // 네이버 웍스 알림 발송 (캐페인 승인 요청)
    if (campaign) {
      const regionMap = {
        'korea': '한국',
        'japan': '일본',
        'us': '미국',
        'taiwan': '대만'
      }
      const regionText = regionMap[campaignRegion] || '한국'

      const campaignTypeMap = {
        'planned': '기획형',
        'regular': '기획형',
        'oliveyoung': '올리브영',
        '4week_challenge': '4주 챌린지',
        '4week': '4주 챌린지'
      }
      const campaignTypeText = campaignTypeMap[campaign.campaign_type] || '기획형'

      const message = `💵 입금 확인 완료 + 캐페인 승인 요청 (${regionText})

` +
        `• 회사명: ${company?.company_name || '회사명 없음'}
` +
        `• 캐페인명: ${campaign.title}
` +
        `• 캐페인 타입: ${campaignTypeText}
` +
        `• 입금 금액: ${parseInt(depositAmount || chargeRequest.amount).toLocaleString()}원
` +
        `• 입금자명: ${depositorName}
` +
        `• 입금일: ${depositDate}

` +
        `⚠️ 캐페인이 승인 대기 상태로 변경되었습니다. 빠른 승인을 부탁드립니다.

` +
        `승인 페이지: https://cnectotal.netlify.app/admin/approvals`

      try {
        const naverWorksUrl = 'https://www.worksapis.com/v1.0/bots/7348965/channels/281474978639476/messages'
        const naverWorksToken = process.env.NAVER_WORKS_BOT_TOKEN

        await fetch(naverWorksUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${naverWorksToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: {
              type: 'text',
              text: message
            }
          })
        })
      } catch (notifError) {
        console.error('네이버 웍스 알림 전송 실패:', notifError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: campaign 
          ? '입금 확인 및 캐페인 승인 요청이 완료되었습니다.'
          : '입금 확인이 완료되었습니다.',
        data: {
          chargeRequestId,
          companyName: company?.company_name,
          campaignId: campaign?.id,
          campaignTitle: campaign?.title
        }
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

