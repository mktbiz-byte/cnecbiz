const { createClient } = require('@supabase/supabase-js')

/**
 * 영상 검수 완료 알림 (기업 대상)
 *
 * 영상이 승인되면 기업에게 카카오 알림톡 + 이메일로 알림 발송
 * CampaignDetail.jsx의 handleVideoApproval에서 호출
 *
 * POST /.netlify/functions/notify-video-review-complete
 * Body: {
 *   campaignId, region, creatorName, campaignTitle,
 *   companyBizId, companyId, companyEmail, uploadDeadline
 * }
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

  try {
    const {
      campaignId,
      region,
      creatorName: hintCreatorName,
      campaignTitle: hintCampaignTitle,
      companyBizId: hintCompanyBizId,
      companyId: hintCompanyId,
      companyEmail: hintCompanyEmail,
      uploadDeadline
    } = JSON.parse(event.body || '{}')

    if (!campaignId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'campaignId is required' }) }
    }

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    let campaignTitle = hintCampaignTitle || '(캠페인명 없음)'
    let creatorName = hintCreatorName || '크리에이터'
    let companyPhone = null
    let companyEmail = null
    let companyName = '기업'

    console.log('[notify-video-review-complete] 시작:', { campaignId, region, creatorName })

    // 기업 정보 조회 (BIZ DB)
    const selectFields = 'company_name, notification_phone, phone, notification_email, email'
    let comp = null

    // 유효한 매칭 = company_name이 있고, notification_phone 또는 phone이 있는 레코드
    const isValidMatch = (data) => data && data.company_name && (data.notification_phone || data.phone)

    // 1순위: company_biz_id → companies.id
    if (hintCompanyBizId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', hintCompanyBizId).maybeSingle()
        if (isValidMatch(data)) {
          comp = data
          console.log('[notify-video-review-complete] company_biz_id 매칭:', data.company_name)
        } else if (data) {
          console.warn('[notify-video-review-complete] company_biz_id 매칭됐으나 유효하지 않음:', { name: data.company_name })
        }
      } catch (e) { /* skip */ }
    }

    // 2순위: company_id → companies.user_id
    if (!comp && hintCompanyId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('user_id', hintCompanyId).maybeSingle()
        if (isValidMatch(data)) {
          comp = data
          console.log('[notify-video-review-complete] company_id→user_id 매칭:', data.company_name)
        } else if (data) {
          console.warn('[notify-video-review-complete] company_id→user_id 매칭됐으나 유효하지 않음:', { name: data.company_name })
        }
      } catch (e) { /* skip */ }
    }

    // 3순위: company_email → companies.email
    if (!comp && hintCompanyEmail) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('email', hintCompanyEmail).maybeSingle()
        if (isValidMatch(data)) {
          comp = data
          console.log('[notify-video-review-complete] company_email 매칭:', data.company_name)
        } else if (data) {
          console.warn('[notify-video-review-complete] company_email 매칭됐으나 유효하지 않음:', { name: data.company_name })
        }
      } catch (e) { /* skip */ }
    }

    // 4순위: company_id → companies.id (legacy/이관 케이스)
    if (!comp && hintCompanyId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', hintCompanyId).maybeSingle()
        if (isValidMatch(data)) {
          comp = data
          console.log('[notify-video-review-complete] company_id→id 매칭:', data.company_name)
        }
      } catch (e) { /* skip */ }
    }

    if (comp) {
      companyPhone = comp.notification_phone || comp.phone
      companyEmail = comp.notification_email || comp.email
      companyName = comp.company_name || companyName
    } else {
      companyEmail = hintCompanyEmail
      console.warn('[notify-video-review-complete] 기업 매칭 실패:', { hintCompanyBizId, hintCompanyId, hintCompanyEmail })
    }

    const results = { kakao: false, email: false }
    const notificationPromises = []

    // 카카오 알림톡 (기업 대상 - 영상 검수 완료)
    if (companyPhone) {
      notificationPromises.push(
        fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: companyPhone.replace(/-/g, ''),
            receiverName: companyName,
            templateCode: '025100001008',
            variables: {
              '회사명': companyName,
              '캠페인명': campaignTitle,
              '크리에이터명': creatorName
            }
          })
        }).then(r => r.json()).then(r => {
          results.kakao = !!r.success
          console.log('[notify-video-review-complete] 카카오:', r.success ? '성공' : JSON.stringify(r))
        }).catch(e => console.error('[notify-video-review-complete] 카카오 실패:', e.message))
      )
    }

    // 이메일 (기업 대상)
    if (companyEmail) {
      const deadlineText = uploadDeadline ? `<p style="margin: 5px 0;"><strong>SNS 업로드 기한:</strong> ${uploadDeadline}</p>` : ''
      notificationPromises.push(
        fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: companyEmail,
            subject: `[CNEC] ${campaignTitle} - 영상 검수 완료`,
            html: `
              <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10B981, #34D399); padding: 30px; border-radius: 16px 16px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">✅ 영상 검수 완료</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                  <p style="color: #4a5568; font-size: 16px; margin-bottom: 20px;">
                    ${companyName}님, 크리에이터의 영상 검수가 완료되었습니다.
                  </p>
                  <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                    <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaignTitle}</p>
                    <p style="margin: 5px 0;"><strong>크리에이터:</strong> ${creatorName}</p>
                    ${deadlineText}
                  </div>
                  <p style="color: #718096; font-size: 14px;">크리에이터가 SNS에 영상을 업로드하면 알림을 보내드리겠습니다.</p>
                  <a href="https://cnecbiz.com/company/campaigns" style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">캠페인 관리 페이지로 이동</a>
                </div>
                <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 20px;">CNEC (크넥) | 문의: 1833-6025</p>
              </div>
            `
          })
        }).then(r => r.json()).then(r => {
          results.email = !!r.success
          console.log('[notify-video-review-complete] 이메일:', r.success ? '성공' : JSON.stringify(r))
        }).catch(e => console.error('[notify-video-review-complete] 이메일 실패:', e.message))
      )
    }

    await Promise.allSettled(notificationPromises)

    // notification_send_logs
    if (results.kakao || results.email) {
      try {
        await supabaseBiz.from('notification_send_logs').insert({
          channel: 'kakao',
          status: 'success',
          function_name: 'notify-video-review-complete',
          recipient: companyPhone || companyEmail,
          message_preview: `영상검수완료|campaign:${campaignId}|creator:${creatorName}`
        })
      } catch (e) { /* skip */ }
    }

    console.log('[notify-video-review-complete] 완료:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    }

  } catch (error) {
    console.error('[notify-video-review-complete] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'notify-video-review-complete',
          errorMessage: error.message,
          context: { body: event.body?.substring(0, 500) }
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
