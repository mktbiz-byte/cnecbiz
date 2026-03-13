/**
 * 영상 수정 요청 알림 발송
 * send-kakao-notification을 HTTP로 호출 (popbill 직접 사용 안함)
 */

const axios = require('axios')
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
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

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { creatorName, creatorPhone, feedbackCount, campaignTitle, submissionId, companyName, companyId } = JSON.parse(event.body)

    // companyName이 없으면 서버사이드에서 조회
    let resolvedCompanyName = companyName
    if (!resolvedCompanyName && companyId) {
      try {
        // company_id(user_id)로 companies 테이블에서 조회
        const { data: company } = await supabaseBiz
          .from('companies')
          .select('company_name')
          .eq('user_id', companyId)
          .single()
        if (company?.company_name) {
          resolvedCompanyName = company.company_name
        }
      } catch (e) {
        console.error('[WARN] Company name lookup failed:', e.message)
      }
    }

    if (!creatorPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'creatorPhone is required' })
      }
    }

    console.log('[INFO] Video review notification request:', {
      creatorName,
      creatorPhone: creatorPhone.slice(0, 3) + '****' + creatorPhone.slice(-4),
      feedbackCount,
      campaignTitle
    })

    // 오늘 날짜 (한국시간)
    const today = new Date()
    const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`

    // 재제출 기한 (2일 후)
    const resubmitDeadline = new Date()
    resubmitDeadline.setDate(resubmitDeadline.getDate() + 2)
    const resubmitDateStr = `${resubmitDeadline.getMonth() + 1}월 ${resubmitDeadline.getDate()}일`

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    const results = { kakao: false, naverWorks: false }

    // ===== 카카오 알림톡 + 네이버웍스 병렬 발송 =====
    const notificationPromises = []

    // 1. 카카오 알림톡 (크리에이터에게)
    notificationPromises.push(
      axios.post(
        `${baseUrl}/.netlify/functions/send-kakao-notification`,
        {
          receiverNum: creatorPhone.replace(/-/g, ''),
          receiverName: creatorName || '크리에이터',
          templateCode: '025100001016',
          variables: {
            '크리에이터명': creatorName || '크리에이터',
            '캠페인명': campaignTitle || '캠페인',
            '요청일': todayStr,
            '재제출기한': resubmitDateStr
          }
        },
        { timeout: 15000 }
      ).then(r => {
        results.kakao = !!r.data?.success
        console.log('[INFO] Kakao:', r.data?.success ? '성공' : JSON.stringify(r.data))
      }).catch(e => {
        console.error('[ERROR] Kakao failed:', e.message)
      })
    )

    // 2. 네이버웍스 관리자 알림 (수정요청 발생 알림)
    const koreanDate = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    notificationPromises.push(
      axios.post(
        `${baseUrl}/.netlify/functions/send-naver-works-message`,
        {
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `📝 [영상 수정요청]\n\n📋 캠페인: ${campaignTitle || '캠페인'}\n🏢 기업: ${resolvedCompanyName || '미확인'}\n👤 크리에이터: ${creatorName || '크리에이터'}\n📝 피드백: ${feedbackCount || 0}건\n📅 재제출기한: ${resubmitDateStr}\n⏰ 시간: ${koreanDate}`
        },
        { timeout: 15000 }
      ).then(r => {
        results.naverWorks = !!r.data?.success
        console.log('[INFO] NaverWorks:', r.data?.success ? '성공' : JSON.stringify(r.data))
      }).catch(e => {
        console.error('[ERROR] NaverWorks failed:', e.message)
      })
    )

    await Promise.allSettled(notificationPromises)
    console.log('[INFO] 수정요청 알림 완료:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: results.kakao || results.naverWorks,
        message: '수정 요청 알림 발송 완료',
        results
      })
    }
  } catch (error) {
    console.error('[ERROR] Unexpected error:', error)

    // 에러 알림
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await axios.post(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        functionName: 'send-video-review-notification',
        errorMessage: error.message,
        context: { body: event.body?.substring(0, 500) }
      }, { timeout: 10000 })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}
