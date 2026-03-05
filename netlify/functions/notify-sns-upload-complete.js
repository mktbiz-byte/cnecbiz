const { createClient } = require('@supabase/supabase-js')

/**
 * SNS 업로드 완료 알림 Function (기업 대상)
 *
 * 서버사이드에서 companies 테이블 조회 → 올바른 notification_phone/email 사용
 * (프론트엔드에서 anon key로 조회하면 RLS에 의해 다른 기업 데이터가 차단됨)
 *
 * POST /.netlify/functions/notify-sns-upload-complete
 * Body: {
 *   campaignId: "uuid",
 *   region: "korea" | "japan" | "us",
 *   creatorName: "크리에이터명",
 *   campaignTitle: "캠페인명",    // hint (DB 조회 실패 시 사용)
 *   companyBizId: "companies.id", // hint (프론트에서 전달)
 *   companyId: "auth user id",    // hint
 *   companyEmail: "email",        // hint
 * }
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = (process.env.VITE_SUPABASE_KOREA_URL)
  ? createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

function getRegionClient(region) {
  switch (region) {
    case 'japan':
      if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
        return createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
      }
      return supabaseKorea
    case 'us':
      if (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
        return createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY)
      }
      return supabaseKorea
    case 'korea':
      return supabaseKorea
    default:
      return supabaseBiz
  }
}

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
      companyEmail: hintCompanyEmail
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

    console.log('[notify-sns-upload-complete] 시작:', { campaignId, region, creatorName })

    // ===== 1. 캠페인 정보 조회 =====
    let campaignData = null
    const regionClient = getRegionClient(region || 'korea')
    const uniqueClients = [...new Set([regionClient, supabaseKorea, supabaseBiz].filter(c => c))]

    for (const c of uniqueClients) {
      try {
        const { data, error } = await c
          .from('campaigns')
          .select('id, title, brand, company_id, company_biz_id, company_email, company_phone')
          .eq('id', campaignId)
          .maybeSingle()
        if (data && !error) {
          campaignData = data
          break
        }
      } catch (e) {
        console.log('[notify-sns-upload-complete] 캠페인 조회 예외:', e.message)
      }
    }

    if (campaignData) {
      campaignTitle = campaignData.title || campaignTitle
    }

    // 프론트에서 전달받은 hint를 우선순위로 사용 (이관 등으로 campaignData가 오래됐을 수 있음)
    const companyBizId = hintCompanyBizId || campaignData?.company_biz_id
    const companyId = hintCompanyId || campaignData?.company_id
    const companyEmailFromCampaign = hintCompanyEmail || campaignData?.company_email

    // ===== 2. 기업 정보 조회 (BIZ DB - service role key) =====
    const selectFields = 'company_name, notification_phone, phone, notification_email, email'
    let comp = null

    // 1순위: company_biz_id → companies.id
    if (companyBizId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', companyBizId).maybeSingle()
        if (data) { comp = data; console.log('[notify-sns-upload-complete] company_biz_id 매칭:', data.company_name) }
      } catch (e) { console.log('[notify-sns-upload-complete] company_biz_id 조회 실패:', e.message) }
    }

    // 2순위: company_email → companies.email
    if (!comp && companyEmailFromCampaign) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('email', companyEmailFromCampaign).maybeSingle()
        if (data) { comp = data; console.log('[notify-sns-upload-complete] company_email 매칭:', data.company_name) }
      } catch (e) { /* skip */ }
    }

    // 3순위: company_id → companies.id
    if (!comp && companyId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', companyId).maybeSingle()
        if (data) { comp = data }
      } catch (e) { /* skip */ }
    }

    // 4순위: company_id → companies.user_id
    if (!comp && companyId) {
      try {
        const { data } = await supabaseBiz.from('companies').select(selectFields).eq('user_id', companyId).maybeSingle()
        if (data) { comp = data }
      } catch (e) { /* skip */ }
    }

    if (comp) {
      companyPhone = comp.notification_phone || comp.phone
      companyEmail = comp.notification_email || comp.email
      companyName = comp.company_name || companyName
    } else {
      // 최종 fallback: 캠페인에 직접 저장된 값을 사용하되,
      // 해당 전화번호로 companies 테이블에서 한번 더 검색하여 notification_phone이 있으면 우선 사용
      const fallbackPhone = campaignData?.company_phone
      const fallbackEmail = campaignData?.company_email
      if (fallbackPhone) {
        try {
          const { data: compByPhone } = await supabaseBiz.from('companies')
            .select(selectFields)
            .eq('phone', fallbackPhone.replace(/-/g, ''))
            .maybeSingle()
          if (compByPhone) {
            companyPhone = compByPhone.notification_phone || compByPhone.phone
            companyEmail = compByPhone.notification_email || compByPhone.email || fallbackEmail
            companyName = compByPhone.company_name || companyName
            console.log('[notify-sns-upload-complete] fallback phone → companies 매칭:', compByPhone.company_name)
          } else {
            // ★ campaign.company_phone을 직접 사용하지 않음 — 관리자 번호 발송 방지
            console.warn('[notify-sns-upload-complete] fallback phone으로 companies 매칭 실패. 카카오 발송 스킵:', fallbackPhone)
          }
        } catch (e) {
          console.warn('[notify-sns-upload-complete] fallback phone 조회 에러. 카카오 발송 스킵:', e.message)
        }
      }
      if (!companyEmail && fallbackEmail) companyEmail = fallbackEmail
    }

    console.log('[notify-sns-upload-complete] 기업 정보:', { companyName, phone: companyPhone, email: companyEmail })

    const results = { kakao: false, email: false, naverWorks: false }
    const koreanDate = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    // ===== 모든 알림 병렬 발송 (순차 실행 시 Netlify Function 타임아웃 방지) =====
    const notificationPromises = []

    // --- 카카오 알림톡 (025100001009: 캠페인 최종 완료) ---
    if (companyPhone) {
      notificationPromises.push(
        fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: companyPhone.replace(/-/g, ''),
            receiverName: companyName,
            templateCode: '025100001009',
            variables: {
              '회사명': companyName,
              '캠페인명': campaignTitle
            }
          })
        }).then(r => r.json()).then(r => {
          results.kakao = !!r.success
          console.log('[notify-sns-upload-complete] 카카오:', r.success ? '성공' : JSON.stringify(r))
        }).catch(e => {
          console.error('[notify-sns-upload-complete] 카카오 실패:', e.message)
        })
      )
    } else {
      console.warn('[notify-sns-upload-complete] 카카오 스킵: companyPhone 없음')
    }

    // --- 이메일 ---
    if (companyEmail) {
      notificationPromises.push(
        fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: companyEmail,
            subject: `[CNEC] ${campaignTitle} - SNS 업로드 완료`,
            html: `
              <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10B981;">SNS 업로드가 완료되었습니다!</h2>
                <p>안녕하세요, <strong>${companyName}</strong>님!</p>
                <p>신청하신 캠페인의 크리에이터가 최종 영상 수정을 완료하고 SNS에 업로드했습니다.</p>
                <div style="background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                  <p style="margin: 5px 0;"><strong>캠페인:</strong> ${campaignTitle}</p>
                  <p style="margin: 5px 0;"><strong>크리에이터:</strong> ${creatorName}</p>
                </div>
                <p>관리자 페이지에서 최종 보고서와 성과 지표를 확인해 주세요.</p>
                <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">감사합니다.<br/>CNEC 팀<br/>문의: 1833-6025</p>
              </div>
            `
          })
        }).then(r => r.json()).then(r => {
          results.email = !!r.success
          console.log('[notify-sns-upload-complete] 이메일:', r.success ? '성공' : JSON.stringify(r))
        }).catch(e => {
          console.error('[notify-sns-upload-complete] 이메일 실패:', e.message)
        })
      )
    }

    // --- 네이버 웍스 ---
    notificationPromises.push(
      fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `[SNS 업로드 완료]\n\n📋 캠페인: ${campaignTitle}\n🏢 기업: ${companyName}\n👤 크리에이터: ${creatorName}\n⏰ 시간: ${koreanDate}`
        })
      }).then(r => r.json()).then(r => {
        results.naverWorks = !!r.success
        console.log('[notify-sns-upload-complete] 네이버웍스:', r.success ? '성공' : JSON.stringify(r))
      }).catch(e => {
        console.error('[notify-sns-upload-complete] 네이버웍스 실패:', e.message)
      })
    )

    // 모든 알림 병렬 발송 완료 대기
    await Promise.allSettled(notificationPromises)
    console.log('[notify-sns-upload-complete] 전체 완료:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results, companyName, companyPhone: companyPhone ? '***' + companyPhone.slice(-4) : null })
    }

  } catch (error) {
    console.error('[notify-sns-upload-complete] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'notify-sns-upload-complete',
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
