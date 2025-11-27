/**
 * 수동 입금 매칭 API
 * 관리자가 계좌 거래 내역과 충전 신청서를 수동으로 매칭
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 포인트 충전 처리
 */
async function processDeposit(request, transaction) {
  const { company_id, amount } = request

  // 1. 포인트 충전 (company_id는 auth.users.id이므로 user_id로 조회)
  const { data: currentPoints, error: pointsError } = await supabaseAdmin
    .from('companies')
    .select('points_balance')
    .eq('user_id', company_id)
    .single()

  if (pointsError) throw pointsError

  const newPoints = (currentPoints.points_balance || 0) + amount

  const { error: updateError } = await supabaseAdmin
    .from('companies')
    .update({ points_balance: newPoints })
    .eq('user_id', company_id)

  if (updateError) throw updateError

  // 2. 포인트 거래 내역 기록
  const { error: transactionError } = await supabaseAdmin
    .from('points_transactions')
    .insert({
      company_id,
      amount,
      type: 'charge',
      description: `계좌이체 입금 확인 (수동 매칭)`,
      balance_after: newPoints,
      charge_request_id: request.id
    })

  if (transactionError) throw transactionError

  // 3. 충전 요청 상태 업데이트
  const { error: statusError } = await supabaseAdmin
    .from('points_charge_requests')
    .update({
      status: 'completed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: 'admin_manual',
      deposit_date: transaction.tradeDate,
      actual_amount: parseInt(transaction.tradeBalance),
      memo: `수동 매칭 - 거래일시: ${transaction.tradeDate}`
    })
    .eq('id', request.id)

  if (statusError) throw statusError

  // 4. 매출 기록 추가 (financial_records)
  const { error: revenueError } = await supabaseAdmin
    .from('financial_records')
    .insert({
      record_date: transaction.tradeDate || new Date().toISOString().slice(0, 10),
      type: 'revenue',
      category: 'point_charge',
      amount: amount,
      description: `포인트 충전 - ${request.depositor_name || '미상'}`,
      is_receivable: false
    })

  if (revenueError) {
    console.error('⚠️ 매출 기록 실패:', revenueError)
    // 매출 기록 실패해도 포인트 충전은 완료되었으므로 에러 throw 안 함
  }

  // 5. related_campaign_id가 있으면 캠페인 승인 요청으로 변경
  let campaignInfo = null
  if (request.related_campaign_id) {
    console.log(`📢 캠페인 승인 요청: ${request.related_campaign_id}`)
    
    // 모든 DB에서 캠페인 찾기
    const supabaseKoreaUrl = process.env.VITE_SUPABASE_KOREA_URL
    const supabaseGlobalUrl = process.env.VITE_SUPABASE_GLOBAL_URL
    
    const supabaseKorea = createClient(supabaseKoreaUrl, supabaseServiceKey)
    const supabaseGlobal = createClient(supabaseGlobalUrl, supabaseServiceKey)
    
    // 1. Korea DB 확인 (올영, 기획형, 4주 챌린지)
    const { data: koreaData } = await supabaseKorea
      .from('campaigns')
      .select('*')
      .eq('id', request.related_campaign_id)
      .maybeSingle()
    
    if (koreaData) {
      const { error: updateError } = await supabaseKorea
        .from('campaigns')
        .update({ 
          status: 'pending_approval',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.related_campaign_id)
      
      if (!updateError) {
        console.log('✅ Korea DB 캠페인 승인 요청 완료')
        campaignInfo = { ...koreaData, region: 'korea' }
      }
    }
    
    // 2. Global DB 확인 (일본, 미국)
    if (!campaignInfo) {
      const { data: globalData } = await supabaseGlobal
        .from('campaigns')
        .select('*')
        .eq('id', request.related_campaign_id)
        .maybeSingle()
      
      if (globalData) {
        const { error: updateError } = await supabaseGlobal
          .from('campaigns')
          .update({ 
            status: 'pending_approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', request.related_campaign_id)
        
        if (!updateError) {
          console.log('✅ Global DB 캠페인 승인 요청 완료')
          campaignInfo = { ...globalData, region: globalData.region || 'global' }
        }
      }
    }
    
    // 3. Biz DB 확인 (기타)
    if (!campaignInfo) {
      const { data: bizData } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', request.related_campaign_id)
        .maybeSingle()
      
      if (bizData) {
        const { error: updateError } = await supabaseAdmin
          .from('campaigns')
          .update({ 
            status: 'pending_approval',
            updated_at: new Date().toISOString()
          })
          .eq('id', request.related_campaign_id)
        
        if (!updateError) {
          console.log('✅ Biz DB 캠페인 승인 요청 완료')
          campaignInfo = { ...bizData, region: 'biz' }
        }
      }
    }
    
    // 4. 네이버 웍스 알림 전송
    if (campaignInfo) {
      try {
        const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'
        const campaignTypeKo = {
          'oliveyoung': '올리브영',
          'planned': '기획형',
          '4week_challenge': '4주 챌린지',
          'standard': '기본형'
        }[campaignInfo.campaign_type] || campaignInfo.campaign_type
        
        const regionKo = {
          'korea': '한국',
          'japan': '일본',
          'usa': '미국',
          'global': '글로벌'
        }[campaignInfo.region] || campaignInfo.region
        
        await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🎉 **입금 확인 - 캠페인 승인 대기**\n\n` +
                     `🏢 **회사:** ${request.company_name || '미상'}\n` +
                     `📝 **캠페인:** ${campaignInfo.title}\n` +
                     `🌏 **지역:** ${regionKo}\n` +
                     `🎯 **타입:** ${campaignTypeKo}\n` +
                     `👥 **모집 인원:** ${campaignInfo.total_slots || 0}명\n` +
                     `💰 **입금액:** ${request.amount.toLocaleString()}원\n\n` +
                     `➡️ 승인 처리: https://cnectotal.netlify.app/admin/campaigns`,
            isAdminNotification: true
          })
        })
        console.log('✅ 네이버 웍스 알림 전송 완료')
      } catch (notifError) {
        console.error('⚠️ 네이버 웍스 알림 실패:', notifError)
      }
    }
  }

  return { success: true, newPoints }
}

/**
 * 알림 발송
 */
async function sendNotification(request) {
  try {
    const baseUrl = process.env.URL || 'https://cnectotal.netlify.app'

    // 알림톡 발송
    if (request.company_phone) {
      await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: '025100000943',
          receiver: request.company_phone,
          variables: {
            회사명: request.company_name,
            금액: request.amount.toLocaleString()
          }
        })
      })
    }

    // 이메일 발송
    if (request.company_email) {
      await fetch(`${baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: request.company_email,
          subject: '[CNEC] 포인트 충전 완료',
          html: `
            <h2>포인트 충전이 완료되었습니다</h2>
            <p><strong>${request.company_name}</strong>님의 포인트 충전이 완료되었습니다.</p>
            <p><strong>충전 금액:</strong> ${request.amount.toLocaleString()}원</p>
            <p>충전된 포인트로 캠페인을 진행하실 수 있습니다.</p>
            <p>문의: 1833-6025</p>
          `
        })
      })
    }
  } catch (error) {
    console.error('⚠️ 알림 발송 실패:', error)
    // 알림 실패해도 충전은 완료되었으므로 에러 throw 안 함
  }
}

exports.handler = async (event, context) => {
  console.log('🔗 수동 입금 매칭 시작...')

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' }
    }

    const { requestId, transaction } = JSON.parse(event.body)

    if (!requestId || !transaction) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        })
      }
    }

    console.log(`📋 충전 요청 ID: ${requestId}`)
    console.log(`💰 거래 금액: ${transaction.tradeBalance}원`)

    // 1. 충전 요청 조회
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      throw new Error('충전 요청을 찾을 수 없습니다.')
    }

    // 2. 이미 처리된 요청인지 확인
    if (request.status === 'confirmed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 처리된 충전 요청입니다.'
        })
      }
    }

    // 3. 포인트 충전 처리
    const result = await processDeposit(request, transaction)

    // 4. 알림 발송
    await sendNotification(request)

    console.log(`✅ 수동 매칭 완료! 새 포인트: ${result.newPoints}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '입금이 확인되어 포인트가 충전되었습니다.',
        newPoints: result.newPoints
      })
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
