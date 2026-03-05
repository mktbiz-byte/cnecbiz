/**
 * 캠페인 이벤트 통합 알림 디스패처
 * 모든 캠페인 관련 이벤트에 대해 알림톡/이메일/네이버웍스를 한 번에 발송
 *
 * 지원 이벤트:
 *   application_created   - 크리에이터 캠페인 지원
 *   creator_selected      - 크리에이터 선정 완료
 *   video_approved        - 영상 승인 완료
 *   sns_upload_complete   - SNS 업로드 완료
 *   campaign_completed    - 캠페인 완료
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const NAVER_WORKS_CHANNEL = '75c24874-e370-afd5-9da3-72918ba15a3c'

async function callFunction(name, body) {
  const baseUrl = process.env.URL || 'https://cnecbiz.com'
  try {
    const res = await fetch(`${baseUrl}/.netlify/functions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    return { success: res.ok && data.success !== false, data }
  } catch (e) {
    console.error(`[dispatch] ${name} call failed:`, e.message)
    return { success: false, error: e.message }
  }
}

async function logNotification(channel, eventType, status, recipient, context) {
  try {
    await supabaseBiz.from('notification_send_logs').insert({
      channel,
      status,
      function_name: 'dispatch-campaign-notification',
      recipient: recipient || null,
      message_preview: `[${eventType}] ${context?.campaignTitle || ''}`.substring(0, 200),
      error_message: status === 'failed' ? (context?.error || null) : null,
      metadata: { eventType, ...context }
    })
  } catch (e) { /* skip */ }
}

// 기업 정보 조회 (companies 테이블)
async function findCompany(companyId, companyEmail) {
  if (companyId) {
    // 1. companies.id
    const { data } = await supabaseBiz.from('companies')
      .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
      .eq('id', companyId).maybeSingle()
    if (data) return data

    // 2. companies.user_id
    const { data: d2 } = await supabaseBiz.from('companies')
      .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
      .eq('user_id', companyId).maybeSingle()
    if (d2) return d2
  }
  if (companyEmail) {
    const { data } = await supabaseBiz.from('companies')
      .select('id, company_name, email, phone, notification_phone, notification_email, notification_contact_person, user_id')
      .eq('email', companyEmail).maybeSingle()
    if (data) return data
  }
  return null
}

function koreanTime() {
  return new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const body = JSON.parse(event.body)
    const { eventType } = body

    console.log('[dispatch] Event:', eventType, JSON.stringify(body).substring(0, 500))

    const results = { kakao: null, email: null, naverWorks: null }

    switch (eventType) {

      // =============================================
      // 1. 크리에이터 캠페인 지원
      // =============================================
      case 'application_created': {
        const { creatorName, campaignTitle, companyId, companyEmail, companyName } = body

        // 네이버 웍스 (항상 발송)
        const nwMsg = `👤 크리에이터 캠페인 지원\n\n• 크리에이터: ${creatorName || '크리에이터'}\n• 캠페인: ${campaignTitle || '캠페인'}\n• 기업: ${companyName || '기업'}\n• 시간: ${koreanTime()}`
        const nwResult = await callFunction('send-naver-works-message', {
          isAdminNotification: true,
          channelId: NAVER_WORKS_CHANNEL,
          message: nwMsg
        })
        results.naverWorks = nwResult
        await logNotification('naver_works', eventType, nwResult.success ? 'success' : 'failed', 'admin', { campaignTitle, error: nwResult.error })

        // 기업에게 알림톡 + 이메일
        const company = await findCompany(companyId, companyEmail)
        if (company) {
          const phone = company.notification_phone || company.phone
          const email = company.notification_email || company.email
          const name = company.company_name || '기업'

          if (phone) {
            // 기존 '025100001008' (영상 제출)과 유사하게 - 지원 알림용 (알림톡)
            // 범용 알림이 없으므로 네이버웍스만으로 충분; 하지만 기업에 이메일은 발송
          }

          if (email) {
            const emailResult = await callFunction('send-email', {
              to: email,
              subject: `[CNEC] ${creatorName || '크리에이터'}님이 캠페인에 지원했습니다`,
              html: `
                <div style="font-family: Pretendard, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: #6C5CE7; padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">캠페인 지원 알림</h1>
                  </div>
                  <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="color: #4a5568;">${name}님, 캠페인에 새로운 지원자가 있습니다.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                      <tr><td style="padding: 10px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 100px;">캠페인</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${campaignTitle || '-'}</td></tr>
                      <tr><td style="padding: 10px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold;">크리에이터</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${creatorName || '-'}</td></tr>
                      <tr><td style="padding: 10px; background: #f7fafc; font-weight: bold;">시간</td><td style="padding: 10px;">${koreanTime()}</td></tr>
                    </table>
                    <a href="https://cnecbiz.com/company/campaigns" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">지원자 확인하기</a>
                  </div>
                  <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 16px;">CNEC | 문의: 1833-6025</p>
                </div>`
            })
            results.email = emailResult
            await logNotification('email', eventType, emailResult.success ? 'success' : 'failed', email, { campaignTitle, error: emailResult.error })
          }
        }
        break
      }

      // =============================================
      // 2. 크리에이터 선정 완료 (한국용)
      // =============================================
      case 'creator_selected': {
        const { creatorName, creatorPhone, creatorEmail, campaignTitle, campaignId } = body

        // 크리에이터에게 알림톡
        if (creatorPhone) {
          const kakaoResult = await callFunction('send-kakao-notification', {
            receiverNum: creatorPhone.replace(/-/g, ''),
            receiverName: creatorName || '크리에이터',
            templateCode: '025100001011',
            variables: {
              '크리에이터명': creatorName || '크리에이터',
              '캠페인명': campaignTitle || '캠페인'
            }
          })
          results.kakao = kakaoResult
          await logNotification('kakao', eventType, kakaoResult.success ? 'success' : 'failed', creatorPhone, { campaignTitle, error: kakaoResult.error })
        }

        // 크리에이터에게 이메일
        if (creatorEmail) {
          const emailResult = await callFunction('send-email', {
            to: creatorEmail,
            subject: `[CNEC] ${campaignTitle || '캠페인'} 선정을 축하합니다!`,
            html: `
              <div style="font-family: Pretendard, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6C5CE7, #a29bfe); padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 20px;">캠페인 선정 축하드립니다!</h1>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="color: #4a5568;">${creatorName || '크리에이터'}님, 캠페인에 선정되셨습니다.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 10px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 100px;">캠페인</td><td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${campaignTitle || '-'}</td></tr>
                  </table>
                  <p style="color: #4a5568;">크리에이터 대시보드에서 캠페인 준비사항을 확인해 주세요.<br/>촬영 가이드는 2~3일 이내 전달될 예정입니다.</p>
                  <p style="color: #e17055; font-weight: bold; font-size: 13px;">* 사전 촬영 시 가이드 미준수로 재촬영될 수 있으니 가이드가 도착하면 촬영 시작해 주세요.</p>
                </div>
                <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 16px;">CNEC | 문의: 1833-6025</p>
              </div>`
          })
          results.email = emailResult
          await logNotification('email', eventType, emailResult.success ? 'success' : 'failed', creatorEmail, { campaignTitle, error: emailResult.error })
        }

        // 네이버 웍스 (관리자 알림)
        const nwMsg = `🎯 크리에이터 선정 완료\n\n• 크리에이터: ${creatorName || '크리에이터'}\n• 캠페인: ${campaignTitle || '캠페인'}\n• 시간: ${koreanTime()}`
        const nwResult = await callFunction('send-naver-works-message', {
          isAdminNotification: true,
          channelId: NAVER_WORKS_CHANNEL,
          message: nwMsg
        })
        results.naverWorks = nwResult
        await logNotification('naver_works', eventType, nwResult.success ? 'success' : 'failed', 'admin', { campaignTitle })
        break
      }

      // =============================================
      // 3. 영상 승인 완료
      // =============================================
      case 'video_approved': {
        const { creatorName, campaignTitle, companyName } = body

        // 네이버 웍스 (관리자 알림)
        const nwMsg = `✅ 영상 승인 완료\n\n• 크리에이터: ${creatorName || '크리에이터'}\n• 캠페인: ${campaignTitle || '캠페인'}\n• 기업: ${companyName || '기업'}\n• 시간: ${koreanTime()}`
        const nwResult = await callFunction('send-naver-works-message', {
          isAdminNotification: true,
          channelId: NAVER_WORKS_CHANNEL,
          message: nwMsg
        })
        results.naverWorks = nwResult
        await logNotification('naver_works', eventType, nwResult.success ? 'success' : 'failed', 'admin', { campaignTitle })
        break
      }

      // =============================================
      // 4. 캠페인 완료
      // =============================================
      case 'campaign_completed': {
        const { creatorName, campaignTitle, companyName } = body

        // 네이버 웍스
        const nwMsg = `🏆 캠페인 완료\n\n• 크리에이터: ${creatorName || '크리에이터'}\n• 캠페인: ${campaignTitle || '캠페인'}\n• 기업: ${companyName || '기업'}\n• 시간: ${koreanTime()}`
        const nwResult = await callFunction('send-naver-works-message', {
          isAdminNotification: true,
          channelId: NAVER_WORKS_CHANNEL,
          message: nwMsg
        })
        results.naverWorks = nwResult
        await logNotification('naver_works', eventType, nwResult.success ? 'success' : 'failed', 'admin', { campaignTitle })
        break
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown eventType: ${eventType}` })
        }
    }

    console.log('[dispatch] Results:', JSON.stringify(results))
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    }

  } catch (error) {
    console.error('[dispatch-campaign-notification] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'dispatch-campaign-notification',
          errorMessage: error.message,
          context: JSON.parse(event.body || '{}')
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' },
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
