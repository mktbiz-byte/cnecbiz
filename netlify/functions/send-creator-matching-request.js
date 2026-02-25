const { createClient } = require('@supabase/supabase-js')

/**
 * 크리에이터 매칭 상담 신청 Netlify Function
 * 기업이 원하는 스타일의 크리에이터 매칭을 관리자에게 요청
 * 네이버 웍스로 상담 신청서를 전송
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const {
      campaignId,
      campaignTitle,
      companyEmail,
      companyName,
      desiredSnsUrl,
      desiredVideoStyleUrl,
      requestMessage
    } = JSON.parse(event.body)

    // 필수 값 검증
    if (!campaignId || !requestMessage) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인 ID와 요청사항은 필수입니다.' })
      }
    }

    if (!desiredSnsUrl && !desiredVideoStyleUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '원하는 SNS 주소 또는 영상 스타일 링크를 입력해주세요.' })
      }
    }

    // 1. DB에 상담 신청 저장
    const { data: request, error: insertError } = await supabaseBiz
      .from('creator_matching_requests')
      .insert({
        campaign_id: campaignId,
        company_email: companyEmail,
        company_name: companyName,
        desired_sns_url: desiredSnsUrl,
        desired_video_style_url: desiredVideoStyleUrl,
        request_message: requestMessage,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Matching Request] DB insert error:', insertError)
      throw new Error('상담 신청 저장에 실패했습니다.')
    }

    // 2. 네이버 웍스로 상담 신청서 전송 (send-naver-works-message 함수 사용)
    let naverWorksSent = false

    try {
      const koreanDate = new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const message = [
        `=============================`,
        `[크리에이터 매칭 상담 신청]`,
        `=============================`,
        ``,
        `기업명: ${companyName || '미입력'}`,
        `이메일: ${companyEmail || '미입력'}`,
        `캠페인: ${campaignTitle || campaignId}`,
        ``,
        `--- 원하는 스타일 ---`,
        `SNS 주소: ${desiredSnsUrl || '미입력'}`,
        `영상 스타일 링크: ${desiredVideoStyleUrl || '미입력'}`,
        ``,
        `--- 요청사항 ---`,
        requestMessage,
        ``,
        `신청일시: ${koreanDate}`,
        `=============================`
      ].join('\n')

      const baseUrl = process.env.URL || 'https://cnecbiz.com'
      const response = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          message,
          channelId: 'b9387420-7c8d-e703-0f96-dbfc72565bb5'
        })
      })

      if (response.ok) {
        naverWorksSent = true

        // DB에 전송 상태 업데이트
        await supabaseBiz
          .from('creator_matching_requests')
          .update({
            naver_works_sent: true,
            naver_works_sent_at: new Date().toISOString()
          })
          .eq('id', request.id)

        console.log('[Matching Request] Naver Works message sent successfully')
      } else {
        console.error('[Matching Request] Naver Works send failed:', response.status)
      }
    } catch (nwError) {
      console.error('[Matching Request] Naver Works send error:', nwError)
      // 네이버 웍스 전송 실패해도 신청 자체는 성공으로 처리
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        requestId: request.id,
        naverWorksSent,
        message: naverWorksSent
          ? '상담 신청이 완료되었습니다. 담당자가 확인 후 연락드리겠습니다.'
          : '상담 신청이 저장되었습니다. 담당자가 확인 후 연락드리겠습니다.'
      })
    }

  } catch (error) {
    console.error('[Matching Request] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
