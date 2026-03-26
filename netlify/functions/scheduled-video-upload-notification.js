/**
 * 영상 업로드 알림 스케줄러
 * 2분마다 실행: notification_send_logs에서 queued 상태의 영상 업로드 알림을 가져와 발송
 *
 * 흐름:
 * 1. 크리에이터가 co.kr에서 영상 업로드 → save-video-upload가 DB 저장 + 큐 등록
 * 2. 이 스케줄러가 큐를 감지 → 네이버웍스 + 카카오 + 이메일 발송
 *
 * netlify.toml:
 * [functions."scheduled-video-upload-notification"]
 * schedule = "every 2 minutes"
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNaverWorksMessage } = require('./lib/naver-works')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = process.env.VITE_SUPABASE_KOREA_URL
  ? createClient(process.env.VITE_SUPABASE_KOREA_URL, process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
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

// 캠페인 + 기업 정보 조회
async function getCampaignAndCompanyInfo(campaignId, region) {
  let campaignData = null

  // 리전 DB → Korea → BIZ 순서로 조회
  const clients = [getRegionClient(region), supabaseKorea, supabaseBiz].filter(c => c)
  const uniqueClients = [...new Set(clients)]

  for (const c of uniqueClients) {
    try {
      const { data } = await c
        .from('campaigns')
        .select('id, title, brand, brand_name, company_name, company_biz_id, company_id, company_email, company_phone, target_country, campaign_type')
        .eq('id', campaignId)
        .maybeSingle()
      if (data) { campaignData = data; break }
    } catch (e) { /* continue */ }
  }

  if (!campaignData) return { campaignData: null, companyData: null }

  // 기업 정보 조회 (BIZ DB)
  const selectFields = 'company_name, notification_phone, phone, notification_email, email'
  let companyData = null

  // 1순위: company_biz_id
  if (campaignData.company_biz_id) {
    const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', campaignData.company_biz_id).maybeSingle()
    if (data) companyData = data
  }
  // 2순위: company_email
  if (!companyData && campaignData.company_email) {
    const { data } = await supabaseBiz.from('companies').select(selectFields).eq('email', campaignData.company_email).maybeSingle()
    if (data) companyData = data
  }
  // 3순위: company_id → companies.id
  if (!companyData && campaignData.company_id) {
    const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', campaignData.company_id).maybeSingle()
    if (data) companyData = data
  }
  // 4순위: company_id → companies.user_id
  if (!companyData && campaignData.company_id) {
    const { data } = await supabaseBiz.from('companies').select(selectFields).eq('user_id', campaignData.company_id).maybeSingle()
    if (data) companyData = data
  }

  return { campaignData, companyData }
}

// 알림 메시지 구성 + 발송
async function processNotification(record) {
  const meta = record.metadata || {}
  const { campaignId, region, version, isResubmission, videoFileCount } = meta
  let { campaignTitle, companyName, creatorName } = meta

  if (!campaignId) {
    console.log('[scheduled-notify] campaignId 없음, 스킵:', record.id)
    return { success: false, error: 'no campaignId' }
  }

  // 캠페인/기업 정보 보강
  const { campaignData, companyData } = await getCampaignAndCompanyInfo(campaignId, region)

  if (campaignData) {
    campaignTitle = campaignTitle || campaignData.title || campaignData.brand || '(캠페인명 없음)'
    companyName = companyName || campaignData.company_name || campaignData.brand_name || '(기업명 없음)'
  }
  campaignTitle = campaignTitle || '(캠페인명 없음)'
  companyName = companyName || '(기업명 없음)'
  creatorName = creatorName || '(크리에이터명 없음)'

  const companyPhone = companyData ? (companyData.notification_phone || companyData.phone) : null
  const companyEmail = companyData ? (companyData.notification_email || companyData.email) : (campaignData?.company_email || null)
  if (companyData?.company_name) companyName = companyData.company_name

  // 국가/리전 표시
  const targetCountry = campaignData?.target_country
  const regionToCountry = { korea: 'kr', japan: 'jp', us: 'us' }
  const countryCode = targetCountry || regionToCountry[region] || null
  const countryMap = { kr: '한국 🇰🇷', jp: '일본 🇯🇵', us: '미국 🇺🇸', tw: '대만 🇹🇼' }
  const countryLabel = countryMap[countryCode] || (region ? region.toUpperCase() : '알 수 없음')
  const siteLabel = { kr: 'cnec.co.kr', jp: 'cnec.jp', us: 'cnec.us' }[countryCode] || 'cnecbiz.com'

  const koreanDate = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  const actionLabel = isResubmission ? '📹 영상 재제출' : '📹 영상 제출'
  const countryFlag = { kr: '🇰🇷 ', jp: '🇯🇵 ', us: '🇺🇸 ' }[countryCode] || ''
  const results = { naverWorks: false, kakao: false, email: false }
  const baseUrl = process.env.URL || 'https://cnecbiz.com'

  // === 1. 네이버웍스 (직접 API 호출) ===
  const naverWorksPromise = (async () => {
    try {
      let msg = `${countryFlag}${actionLabel} 알림 (${siteLabel})\n\n`
      msg += `📋 캠페인: ${campaignTitle}\n`
      msg += `🏢 기업: ${companyName}\n`
      msg += `👤 크리에이터: ${creatorName}\n`
      msg += `📌 버전: V${version || 1}\n`
      msg += `🌍 국가: ${countryLabel}\n`
      msg += `⏰ 제출 시간: ${koreanDate}`
      if (videoFileCount) msg += `\n📎 파일 수: ${videoFileCount}개`
      if (isResubmission) msg += '\n\n※ 수정 후 재업로드'

      const r = await sendNaverWorksMessage('75c24874-e370-afd5-9da3-72918ba15a3c', msg)
      results.naverWorks = !!r.success
      console.log('[scheduled-notify] 네이버웍스:', r.success ? '성공' : r.error)
    } catch (e) {
      console.error('[scheduled-notify] 네이버웍스 실패:', e.message)
    }
  })()

  // === 2. 카카오 알림톡 ===
  const kakaoPromise = (async () => {
    if (!companyPhone) return
    try {
      const res = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverNum: companyPhone.replace(/-/g, ''),
          receiverName: companyName,
          templateCode: '025100001008',
          variables: { '회사명': companyName, '캠페인명': campaignTitle, '크리에이터명': creatorName }
        })
      })
      const r = await res.json()
      results.kakao = !!r.success
    } catch (e) {
      console.error('[scheduled-notify] 카카오 실패:', e.message)
    }
  })()

  // === 3. 이메일 ===
  const emailPromise = (async () => {
    if (!companyEmail) return
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
    } catch (e) {
      console.error('[scheduled-notify] 이메일 실패:', e.message)
    }
  })()

  await Promise.allSettled([naverWorksPromise, kakaoPromise, emailPromise])
  return results
}

exports.handler = async (event) => {
  console.log('[scheduled-video-upload-notification] 시작')

  try {
    // 10분 이내 queued 상태의 알림 큐 조회
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: queuedItems, error } = await supabaseBiz
      .from('notification_send_logs')
      .select('*')
      .eq('channel', 'video_upload_queue')
      .eq('status', 'queued')
      .gte('created_at', tenMinAgo)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      console.error('[scheduled-video-upload-notification] 큐 조회 실패:', error.message)
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    if (!queuedItems || queuedItems.length === 0) {
      console.log('[scheduled-video-upload-notification] 처리할 큐 없음')
      return { statusCode: 200, body: JSON.stringify({ processed: 0 }) }
    }

    console.log(`[scheduled-video-upload-notification] ${queuedItems.length}개 처리 시작`)

    let successCount = 0
    let failCount = 0

    for (const item of queuedItems) {
      try {
        // 상태를 processing으로 변경 (중복 처리 방지)
        await supabaseBiz.from('notification_send_logs')
          .update({ status: 'processing' })
          .eq('id', item.id)
          .eq('status', 'queued')

        const results = await processNotification(item)
        const anySuccess = results.naverWorks || results.kakao || results.email

        // 결과 업데이트
        await supabaseBiz.from('notification_send_logs')
          .update({
            status: anySuccess ? 'success' : 'failed',
            error_message: anySuccess ? null : 'All channels failed',
            metadata: { ...item.metadata, results }
          })
          .eq('id', item.id)

        if (anySuccess) successCount++
        else failCount++

        console.log(`[scheduled-video-upload-notification] ${item.id}: NW=${results.naverWorks} KK=${results.kakao} EM=${results.email}`)
      } catch (e) {
        failCount++
        console.error(`[scheduled-video-upload-notification] ${item.id} 처리 실패:`, e.message)
        await supabaseBiz.from('notification_send_logs')
          .update({ status: 'failed', error_message: e.message })
          .eq('id', item.id)
      }
    }

    console.log(`[scheduled-video-upload-notification] 완료: 성공=${successCount}, 실패=${failCount}`)

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: queuedItems.length, success: successCount, failed: failCount })
    }
  } catch (error) {
    console.error('[scheduled-video-upload-notification] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'scheduled-video-upload-notification',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}
