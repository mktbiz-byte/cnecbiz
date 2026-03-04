const { createClient } = require('@supabase/supabase-js')

/**
 * 영상 업로드 알림 전용 함수
 * 크리에이터가 영상 업로드 후 프론트엔드에서 호출
 * 네이버웍스 + 카카오 알림톡 + 이메일 3가지 알림 발송
 */

// Supabase 클라이언트 (BIZ DB - companies 조회용)
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 리전별 클라이언트
function getRegionClient(region) {
  switch (region) {
    case 'japan':
      if (process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
        return createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
      }
      return null
    case 'us':
      if (process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
        return createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY)
      }
      return null
    case 'korea':
      if (process.env.VITE_SUPABASE_KOREA_URL) {
        return createClient(
          process.env.VITE_SUPABASE_KOREA_URL,
          process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      }
      return null
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
      version,
      creatorName: hintCreatorName,
      campaignTitle: hintCampaignTitle,
      companyName: hintCompanyName,
      isResubmission,
      videoFileCount
    } = JSON.parse(event.body || '{}')

    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaignId is required' })
      }
    }

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    let campaignTitle = hintCampaignTitle || '(캠페인명 없음)'
    let companyName = hintCompanyName || '(기업명 없음)'
    let creatorName = hintCreatorName || '(크리에이터명 없음)'
    let companyPhone = null
    let companyEmail = null

    console.log('[notify-video-upload] 시작:', { campaignId, region, creatorName, campaignTitle })

    // ===== 1. 캠페인 정보 조회 (리전 DB + BIZ DB) =====
    const regionClient = getRegionClient(region || 'korea')
    const clientsToSearch = [regionClient, supabaseBiz].filter(c => c)
    // 중복 제거
    const uniqueClients = [...new Set(clientsToSearch)]

    let campaignData = null
    for (const c of uniqueClients) {
      try {
        const { data, error } = await c
          .from('campaigns')
          .select('id, title, brand, brand_name, company_name, company_id, company_biz_id, company_email, company_phone, target_country')
          .eq('id', campaignId)
          .maybeSingle()
        if (data && !error) {
          campaignData = data
          break
        }
        if (error) console.log('[notify-video-upload] 캠페인 조회 에러:', error.message)
      } catch (e) {
        console.log('[notify-video-upload] 캠페인 조회 예외:', e.message)
      }
    }

    if (campaignData) {
      campaignTitle = campaignData.title || campaignData.brand || campaignTitle
      companyName = campaignData.company_name || campaignData.brand_name || campaignData.brand || companyName
    }
    console.log('[notify-video-upload] 캠페인 조회 결과:', { found: !!campaignData, campaignTitle, companyName })

    // ===== 2. 기업 정보 조회 (BIZ DB) =====
    if (campaignData) {
      const selectFields = 'company_name, notification_phone, phone, notification_email, email'
      let comp = null

      // 1순위: company_biz_id → companies.id
      if (campaignData.company_biz_id) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('id', campaignData.company_biz_id).maybeSingle()
          if (data) comp = data
        } catch (e) { console.log('[notify-video-upload] company_biz_id 조회 실패:', e.message) }
      }

      // 2순위: company_email → companies.email
      if (!comp && campaignData.company_email) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('email', campaignData.company_email).maybeSingle()
          if (data) comp = data
        } catch (e) { console.log('[notify-video-upload] company_email 조회 실패:', e.message) }
      }

      // 3순위: company_id → companies.id
      if (!comp && campaignData.company_id) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('id', campaignData.company_id).maybeSingle()
          if (data) comp = data
        } catch (e) { /* ignore */ }
      }

      // 4순위: company_id → companies.user_id
      if (!comp && campaignData.company_id) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('user_id', campaignData.company_id).maybeSingle()
          if (data) comp = data
        } catch (e) { /* ignore */ }
      }

      if (comp) {
        companyPhone = comp.notification_phone || comp.phone
        companyEmail = comp.notification_email || comp.email
        if (comp.company_name) companyName = comp.company_name
        console.log('[notify-video-upload] 기업 정보:', { companyName, phone: !!companyPhone, email: !!companyEmail })
      } else {
        // fallback: 캠페인에 직접 저장된 company_phone
        if (campaignData.company_phone) companyPhone = campaignData.company_phone
        if (campaignData.company_email) companyEmail = campaignData.company_email
        console.log('[notify-video-upload] 기업 fallback:', { phone: !!companyPhone, email: !!companyEmail })
      }
    }

    // ===== 3. 알림 발송 =====
    const targetCountry = campaignData?.target_country
    const countryMap = { kr: '한국 🇰🇷', jp: '일본 🇯🇵', us: '미국 🇺🇸', tw: '대만 🇹🇼' }
    const regionToCountry = { korea: 'kr', japan: 'jp', us: 'us', biz: null }
    const countryCode = targetCountry || regionToCountry[region] || null
    const countryLabel = countryMap[countryCode] || (region ? region.toUpperCase() : '알 수 없음')
    const siteLabel = { kr: 'cnec.co.kr', jp: 'cnec.jp', us: 'cnec.us' }[countryCode] || 'cnecbiz.com'
    const koreanDate = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    const actionLabel = isResubmission ? '📹 영상 재제출' : '📹 영상 제출'
    const results = { naverWorks: false, kakao: false, email: false }

    // --- 네이버 웍스 ---
    const naverWorksPromise = (async () => {
      try {
        let message = `${actionLabel} 알림 (${siteLabel})\n\n`
        message += `📋 캠페인: ${campaignTitle}\n`
        message += `🏢 기업: ${companyName}\n`
        message += `👤 크리에이터: ${creatorName}\n`
        message += `📌 버전: V${version || 1}\n`
        message += `🌍 국가: ${countryLabel}\n`
        message += `⏰ 제출 시간: ${koreanDate}`
        if (videoFileCount) message += `\n📎 파일 수: ${videoFileCount}개`
        if (isResubmission) message += '\n\n※ 수정 후 재업로드'

        const res = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message
          })
        })
        const r = await res.json()
        results.naverWorks = !!r.success
        console.log('[notify-video-upload] 네이버웍스:', r.success ? '성공' : JSON.stringify(r))
      } catch (e) {
        console.error('[notify-video-upload] 네이버웍스 실패:', e.message)
      }
    })()

    // --- 카카오 알림톡 ---
    const kakaoPromise = (async () => {
      if (!companyPhone) {
        console.log('[notify-video-upload] 카카오 스킵: companyPhone 없음')
        return
      }
      try {
        const res = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
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
        })
        const r = await res.json()
        results.kakao = !!r.success
        console.log('[notify-video-upload] 카카오:', r.success ? '성공' : JSON.stringify(r))
      } catch (e) {
        console.error('[notify-video-upload] 카카오 실패:', e.message)
      }
    })()

    // --- 이메일 ---
    const emailPromise = (async () => {
      if (!companyEmail) {
        console.log('[notify-video-upload] 이메일 스킵: companyEmail 없음')
        return
      }
      try {
        const emailActionLabel = isResubmission ? '재제출' : '제출'
        const emailHtml = `
          <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6C5CE7, #a29bfe); padding: 30px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">📹 영상 ${emailActionLabel} 알림</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
              <p style="color: #4a5568; font-size: 16px; margin-bottom: 20px;">
                ${companyName}님, 캠페인의 크리에이터가 ${isResubmission ? '수정된 ' : ''}영상을 ${emailActionLabel}했습니다.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568; width: 120px;">캠페인</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${campaignTitle}</td></tr>
                <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">크리에이터</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${creatorName}</td></tr>
                <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">버전</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">V${version || 1}</td></tr>
                <tr><td style="padding: 12px; background: #f7fafc; font-weight: bold; color: #4a5568;">제출 시간</td><td style="padding: 12px; color: #2d3748;">${koreanDate}</td></tr>
              </table>
              <p style="color: #718096; font-size: 14px;">관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.</p>
              <a href="https://cnecbiz.com/company/campaigns" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">캠페인 관리 페이지로 이동</a>
            </div>
            <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 20px;">CNEC (크넥) | 문의: 1833-6025</p>
          </div>`

        const res = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: companyEmail,
            subject: `[CNEC] ${campaignTitle} - 크리에이터 영상 ${emailActionLabel} 알림`,
            html: emailHtml
          })
        })
        const r = await res.json()
        results.email = !!r.success
        console.log('[notify-video-upload] 이메일:', r.success ? '성공' : JSON.stringify(r))
      } catch (e) {
        console.error('[notify-video-upload] 이메일 실패:', e.message)
      }
    })()

    // 모든 알림 병렬 발송
    await Promise.allSettled([naverWorksPromise, kakaoPromise, emailPromise])

    console.log('[notify-video-upload] 완료:', results)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, results })
    }

  } catch (error) {
    console.error('[notify-video-upload] Error:', error)

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'notify-video-upload',
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
