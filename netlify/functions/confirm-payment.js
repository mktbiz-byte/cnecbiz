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
    
    // related_campaign_id 먼저 확인, 없으면 bank_transfer_info.campaign_id 확인
    const campaignId = chargeRequest.related_campaign_id || chargeRequest.bank_transfer_info?.campaign_id
    
    if (campaignId) {
      console.log('[confirm-payment] Looking for campaign:', campaignId)
      
      // supabaseBiz는 campaigns 테이블이 없으므로 supabaseKorea에서 조회
      const supabaseKorea = createClient(
        process.env.VITE_SUPABASE_KOREA_URL,
        process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      )
      
      const { data: koreanCampaign, error: koreaError } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      
      if (koreaError) {
        console.error('[confirm-payment] Korea campaign lookup error:', koreaError)
      }
      
      if (koreanCampaign) {
        campaign = koreanCampaign
        campaignRegion = koreanCampaign.region || 'korea'
        console.log('[confirm-payment] Found Korean campaign:', campaign.title)
      } else {
        // 일본 캐페인 확인
        const supabaseJapan = createClient(
          process.env.VITE_SUPABASE_JAPAN_URL,
          process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
        )
        const { data: japanCampaign, error: japanError } = await supabaseJapan
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single()
        
        if (japanError) {
          console.error('[confirm-payment] Japan campaign lookup error:', japanError)
        }
        
        if (japanCampaign) {
          campaign = japanCampaign
          campaignRegion = 'japan'
          console.log('[confirm-payment] Found Japan campaign:', campaign.title)
        } else {
          console.error('[confirm-payment] Campaign not found in Korea or Japan:', campaignId)
        }
      }
    } else {
      console.log('[confirm-payment] No campaign ID found in charge request')
    }

    // 캐페인 상태를 '승인요청중'으로 변경
    if (campaign) {
      console.log('[confirm-payment] Updating campaign status to pending:', campaign.id)
      
      const campaignSupabase = campaignRegion === 'japan' 
        ? createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
        : createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY)

      const { data: updateResult, error: campaignUpdateError } = await campaignSupabase
        .from('campaigns')
        .update({
          status: 'active',  // 입금 확인 후 active 상태로 변경
          approval_status: 'pending_approval',  // 승인 대기 상태로 변경
          payment_status: 'confirmed',  // 입금 확인 상태로 변경
          progress_status: 'pending_approval',  // 진행 상태도 승인 대기로 변경
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id)
        .select()

      if (campaignUpdateError) {
        console.error('[confirm-payment] 캠페인 상태 업데이트 오류:', campaignUpdateError)
        console.error('[confirm-payment] Campaign ID:', campaign.id)
        console.error('[confirm-payment] Region:', campaignRegion)
      } else {
        console.log('[confirm-payment] Campaign status updated successfully')
        console.log('[confirm-payment] Update result:', updateResult)
      }
    } else {
      console.log('[confirm-payment] No campaign to update')
    }

    // 회사 정보 조회
    console.log('[confirm-payment] Looking up company info for user_id:', chargeRequest.company_id)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('company_name, email, phone, contact_person, notification_phone, notification_email')
      .eq('user_id', chargeRequest.company_id)
      .single()
    
    if (companyError) {
      console.error('[confirm-payment] Company lookup error:', companyError)
    } else {
      console.log('[confirm-payment] Company found:', company?.company_name)
    }

    // 고객에게 카카오 알림톡 및 이메일 발송
    if (campaign && company) {
      // 1. 카카오 알림톡 발송
      if (company.notification_phone || company.phone) {
        try {
          // 캠페인 기간 포맷팅 (날짜가 없으면 모집 마감일 기준으로 표시)
          const startDate = campaign.start_date
            ? new Date(campaign.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
            : (campaign.application_deadline
              ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) + ' (모집마감)'
              : '추후 안내')
          const endDate = campaign.end_date
            ? new Date(campaign.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
            : '추후 안내'
          
          const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'
          await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.notification_phone || company.phone,
              receiverName: company.company_name || '회사',
              templateCode: '025100001010',
              variables: {
                '회사명': company.company_name || '회사',
                '캠페인명': campaign.title || '캠페인',
                '시작일': startDate,
                '마감일': endDate,
                '모집인원': String(campaign.total_slots || 0)
              }
            })
          })
          console.log('[SUCCESS] Kakao alimtalk sent to customer')
        } catch (kakaoError) {
          console.error('[ERROR] Failed to send Kakao alimtalk:', kakaoError)
        }
      }

      // 2. 이메일 발송
      if (company.notification_email || company.email) {
        try {
          const emailStartDate = campaign.start_date
            ? new Date(campaign.start_date).toLocaleDateString('ko-KR')
            : (campaign.application_deadline
              ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR') + ' (모집마감)'
              : '추후 안내')
          const emailEndDate = campaign.end_date
            ? new Date(campaign.end_date).toLocaleDateString('ko-KR')
            : '추후 안내'

          const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'
          await fetch(`${baseUrl}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.notification_email || company.email,
              subject: '[CNEC] 캠페인 검수 신청',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #333;">[CNEC] 캠페인 검수 신청</h2>
                  <p><strong>${company.company_name || '회사'}</strong>님, 신청하신 캠페인이 관리자에게 검수 요청 되었습니다.</p>

                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaign.title || '캠페인'}</p>
                    <p style="margin: 10px 0;"><strong>모집 기간:</strong> ${emailStartDate} ~ ${emailEndDate}</p>
                    <p style="margin: 10px 0;"><strong>모집 인원:</strong> ${campaign.total_slots || 0}명</p>
                  </div>
                  
                  <p style="color: #666;">관리자 페이지에서 진행 상황을 확인하실 수 있습니다.</p>
                  <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                  </p>
                </div>
              `
            })
          })
          console.log('[SUCCESS] Email sent to customer')
        } catch (emailError) {
          console.error('[ERROR] Failed to send email:', emailError)
        }
      }
    }

    // 세금계산서 신청 레코드 생성 (needs_tax_invoice=true인 경우)
    if (chargeRequest.needs_tax_invoice && chargeRequest.tax_invoice_info) {
      try {
        const { error: taxInvoiceError } = await supabaseAdmin
          .from('tax_invoice_requests')
          .insert({
            company_id: chargeRequest.company_id,
            charge_request_id: chargeRequest.id,
            amount: chargeRequest.amount,
            tax_invoice_info: chargeRequest.tax_invoice_info,
            is_deposit_confirmed: true,
            status: 'pending'
          })
        
        if (taxInvoiceError) {
          console.error('[confirm-payment] 세금계산서 신청 레코드 생성 오류:', taxInvoiceError)
        } else {
          console.log('[confirm-payment] 세금계산서 신청 레코드 생성 성공')
        }
      } catch (taxError) {
        console.error('[confirm-payment] 세금계산서 신청 레코드 생성 예외:', taxError)
      }
    }

    // 네이버 웍스 알림 발송 (관리자용 - 캐페인 승인 요청)
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
        const baseUrl = process.env.URL || 'https://cnecbiz.com'
        const worksResponse = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message: message
          })
        })
        const worksResult = await worksResponse.json()
        console.log('[confirm-payment] Naver Works notification:', worksResult.success ? '성공' : JSON.stringify(worksResult))
      } catch (notifError) {
        console.error('[confirm-payment] Failed to send Naver Works notification:', notifError)
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

