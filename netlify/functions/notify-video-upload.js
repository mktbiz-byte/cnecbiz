const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const https = require('https')

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

// Korea DB (캠페인 조회 fallback용)
const supabaseKorea = (process.env.VITE_SUPABASE_KOREA_URL)
  ? createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null

// 리전별 클라이언트 (save-video-upload.js와 동일 패턴: 환경변수 없으면 Korea fallback)
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

// ===== 네이버웍스 직접 전송 (서버-서버 fetch 대신 직접 API 호출) =====
const NAVER_WORKS_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDJjOEJZfc9xbDh
MpcJ6WPATGZDNPwKpRDIe4vJvEhkQeZC0UA8M0VmpBtM0nyuRtW6sRy0+Qk5Y3Cr
veKKt2ZRAqV43wdYJpwxptx5GhWGX0FwAeDrItsEVrbAXnBjGEMtWzMks1cA0nxQ
M7wc39d4IznKOJ0HqlkisPdRZnT0I3reaj7MW5B6GM3mscUC6pBLmPHClXdcWhft
HirX8U0Y+l7EHtK8w92jFaR7SMy62LKYjC8Pyo6tnI4Wp4Q3OxCZ9WuGEhIP45EC
wrgP8APCf4VoR1048gLmITUpF/Bm0t/idvl7Ebam4KJJm6E2w4+dEQvLx883lXq1
L0gYXVYDAgMBAAECggEABQAjzTHkcnnnK48vxCUwPmMm3mAAKNtzkSXPkA/F1Ab2
iY3bhCLZg/RqYPuP8Fr9joY6ahsLqYrYDsrFRh/KwBPKuzb9XaiHk4vKSI7nHdBb
NUY2qF7TBEaKfjdZnnvJnuR2XmC8td6DCxJdhnHfTLHDC0tgSgJl98BgQnrCSBRV
84vJqCr7Ouf56Oio1Fo8E7krYmqjsB3BaoKamuGUaAcAwUSEOpGSIsfP2aYOOZmk
aNgWo8Lr19VIr4iWccqjA/CJ83/fk84bE4Bae1lKzjQY4WFKmGSdeOn/3cVr76fY
Gt7qIBgWhe8DnKE6q3umNpAI5gC8j6mPhEbxmMUFsQKBgQDOkoC728Ay1PWoqP64
ldniGatvTvHDTVgU/kRipEXO8xzCGj+C21cKoniF1a0bI4fWTSUTtASURZKvuXAQ
Ij55GueWO5WjHAwskOacTYjUNpa8GlDDcBpSy/mYfNIh+IJE7bTO/rKX+wyJCAKp
klz7FkS4dykWwAww3KHDGkNblQKBgQD5xsH2Ma/tkHrekV5i3A0mLBBJheYgkwgR
YDSbkcp2pw+OIuby0bZlXiRrkDYBoCdLXyl4lmkmXwtcgOmuRpFnixb7YsJ7mTR1
gqNunttaczTRQkkanxZe77qKIYV1dtnumjn6x5hU0+Q6sJ5uPbLUahrQ9ocD+eD0
icJwkf/FNwKBgDHuRYGi900SHqL63j79saGuNLr96QAdFNpWL29sZ5dDOkNMludp
Xxup89ndsS7rIq1RDlI55BV2z6L7/rNXo6QgNbQhiOTZJbQr/iHvt9AbtcmXzse+
tA4pUZZjLWOarto8XsTd2YtU2k3RCtu0Dhd+5XN1EhB2sTuqSMtg8MEVAoGBAJ8Y
itNWMskPDjRWQ9iUcYuu5XDvaPW2sZzfuqKc6mlJYA8ZDCH+kj9fB7O716qRaHYJ
11CH/dIDGCmDs1Tefh+F6M2WymoP2+o9m/wKE445c5sWrZnXW1h9OkRhtbBsU8Q3
WFb0a4MctHLtrPxrME08iHgxjy5pK3CXjtJFLLVhAoGAXjlxrXUIHcbaeFJ78J/G
rv6RBqA2rzQOE0aaf/UcNnIAqJ4TUmgBfZ4TpXNkNHJ7YanXYdcKKVd2jGhoiZdH
h6Nfro2bqUE96CvNn+L5pTCHXUFZML8W02ZpgRLaRvXrt2HeHy3QUCqkHqxpm2rs
skmeYX6UpJwnuTP2xN5NDDI=
-----END PRIVATE KEY-----`

const NAVER_WORKS_SERVICE_ACCOUNT = '7c15c.serviceaccount@howlab.co.kr'

function generateNaverWorksJWT(clientId) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: clientId, sub: NAVER_WORKS_SERVICE_ACCOUNT, iat: now, exp: now + 3600, scope: 'bot' }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), NAVER_WORKS_PRIVATE_KEY)
  return `${signatureInput}.${signature.toString('base64url')}`
}

function getNaverWorksAccessToken(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const jwt = generateNaverWorksJWT(clientId)
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt, client_id: clientId, client_secret: clientSecret, scope: 'bot'
    }).toString()
    const options = {
      hostname: 'auth.worksmobile.com', path: '/oauth2/v2.0/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(postData) }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data).access_token) } catch (e) { reject(new Error(`Token parse error: ${data}`)) }
        } else { reject(new Error(`Token failed: ${res.statusCode} ${data}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('Token request timeout (15s)')) })
    req.write(postData)
    req.end()
  })
}

function sendNaverWorksMsg(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content: { type: 'text', text: message } })
    const options = {
      hostname: 'www.worksapis.com', path: `/v1.0/bots/${botId}/channels/${channelId}/messages`, method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) { resolve({ success: true }) }
        else { reject(new Error(`Send failed: ${res.statusCode} ${data}`)) }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('Message send timeout (15s)')) })
    req.write(postData)
    req.end()
  })
}

async function sendNaverWorksMessageDirect(channelId, message) {
  const clientId = process.env.NAVER_WORKS_CLIENT_ID
  const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET
  const botId = process.env.NAVER_WORKS_BOT_ID
  if (!clientId || !clientSecret || !botId) {
    console.error('[notify-video-upload] 네이버웍스 환경변수 누락')
    return { success: false, error: '네이버웍스 환경변수 누락' }
  }
  try {
    const accessToken = await getNaverWorksAccessToken(clientId, clientSecret)
    return await sendNaverWorksMsg(accessToken, botId, channelId, message)
  } catch (err) {
    console.error('[notify-video-upload] 네이버웍스 직접 전송 실패:', err.message)
    return { success: false, error: err.message }
  }
}

// 중복 알림 방지: 2분 이내 동일 캠페인에 대해 notify-video-upload가 이미 발송했는지 확인
async function isDuplicateNotification(campaignId) {
  try {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data } = await supabaseBiz
      .from('notification_send_logs')
      .select('id')
      .eq('function_name', 'notify-video-upload')
      .eq('status', 'success')
      .gte('created_at', twoMinAgo)
      .like('message_preview', `%${campaignId}%`)
      .limit(1)
    return data && data.length > 0
  } catch (e) {
    console.log('[dedup] notification_send_logs 조회 실패 (알림 계속 발송):', e.message)
    return false
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
      companyBizId: hintCompanyBizId,
      companyId: hintCompanyId,
      companyEmail: hintCompanyEmail,
      isResubmission,
      videoFileCount,
      campaignType: hintCampaignType,
      videoNumber: hintVideoNumber,
      weekNumber: hintWeekNumber,
      isCleanVideo: hintIsCleanVideo
    } = JSON.parse(event.body || '{}')

    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaignId is required' })
      }
    }

    // 중복 알림 방지: 5분 이내 동일 캠페인에 대해 이미 알림이 발송되었으면 스킵
    const isDup = await isDuplicateNotification(campaignId)
    if (isDup) {
      console.log('[notify-video-upload] 중복 알림 감지 — 스킵:', { campaignId })
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, results: {}, skipped: true, reason: 'duplicate_within_5min' })
      }
    }

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    // hint 데이터가 모두 없으면 알림 발송 스킵 (잘못된 호출 방지)
    if (!hintCampaignTitle && !hintCompanyName && !hintCreatorName) {
      console.warn('[notify-video-upload] 모든 hint 데이터 없음 — 잘못된 호출로 판단하여 스킵:', { campaignId })
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, skipped: true, reason: 'no_hint_data' })
      }
    }

    let campaignTitle = hintCampaignTitle || '(캠페인명 없음)'
    let companyName = hintCompanyName || '(기업명 없음)'
    let creatorName = hintCreatorName || '(크리에이터명 없음)'
    let companyPhone = null
    let companyEmail = null

    console.log('[notify-video-upload] 시작:', { campaignId, region, creatorName, campaignTitle })

    // ===== 1. 캠페인 정보 조회 (리전 DB + Korea DB + BIZ DB) =====
    const regionClient = getRegionClient(region || 'korea')
    const clientsToSearch = [regionClient, supabaseKorea, supabaseBiz].filter(c => c)
    // 중복 제거
    const uniqueClients = [...new Set(clientsToSearch)]

    let campaignData = null
    for (const c of uniqueClients) {
      try {
        const { data, error } = await c
          .from('campaigns')
          .select('id, title, brand, brand_name, company_name, company_id, company_biz_id, company_email, company_phone, target_country, campaign_type')
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
    // hint 파라미터 우선 사용 (프론트에서 전달, notify-sns-upload-complete와 동일 패턴)
    const companyBizId = hintCompanyBizId || campaignData?.company_biz_id
    const companyId = hintCompanyId || campaignData?.company_id
    const companyEmailFromCampaign = hintCompanyEmail || campaignData?.company_email

    {
      const selectFields = 'company_name, notification_phone, phone, notification_email, email'
      let comp = null

      // 1순위: company_biz_id → companies.id
      if (companyBizId) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('id', companyBizId).maybeSingle()
          if (data) { comp = data; console.log('[notify-video-upload] company_biz_id 매칭:', data.company_name) }
        } catch (e) { console.log('[notify-video-upload] company_biz_id 조회 실패:', e.message) }
      }

      // 2순위: company_email → companies.email
      if (!comp && companyEmailFromCampaign) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('email', companyEmailFromCampaign).maybeSingle()
          if (data) { comp = data; console.log('[notify-video-upload] company_email 매칭:', data.company_name) }
        } catch (e) { console.log('[notify-video-upload] company_email 조회 실패:', e.message) }
      }

      // 3순위: company_id → companies.id
      if (!comp && companyId) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('id', companyId).maybeSingle()
          if (data) comp = data
        } catch (e) { /* ignore */ }
      }

      // 4순위: company_id → companies.user_id
      if (!comp && companyId) {
        try {
          const { data } = await supabaseBiz.from('companies')
            .select(selectFields).eq('user_id', companyId).maybeSingle()
          if (data) comp = data
        } catch (e) { /* ignore */ }
      }

      if (comp) {
        companyPhone = comp.notification_phone || comp.phone
        companyEmail = comp.notification_email || comp.email
        if (comp.company_name) companyName = comp.company_name
        console.log('[notify-video-upload] 기업 정보:', { companyName, phone: !!companyPhone, email: !!companyEmail })
      } else {
        // ★ company_biz_id/company_email/company_id 모두 매칭 실패 시
        // campaign.company_phone 직접 사용하지 않음 — 관리자 번호 발송 방지
        const fallbackEmail = campaignData?.company_email
        console.warn('[notify-video-upload] BIZ DB 기업 매칭 실패. 카카오 발송 스킵:', {
          company_biz_id: campaignData?.company_biz_id,
          company_id: campaignData?.company_id,
          company_email: campaignData?.company_email,
          company_phone: campaignData?.company_phone
        })
        companyPhone = null
        if (!companyEmail && fallbackEmail) companyEmail = fallbackEmail
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

    // 캠페인 타입 라벨
    const campaignType = hintCampaignType || campaignData?.campaign_type || 'planned'
    const campaignTypeMap = {
      planned: '기획형', regular: '기획형',
      olive_young: '올리브영', oliveyoung: '올리브영', oliveyoung_sale: '올리브영',
      '4week_challenge': '4주챌린지', '4week': '4주챌린지',
      megawari: '메가와리', 'mega-warri': '메가와리',
      story_short: '스토리 숏폼',
      threads_post: '스레드 포스트',
      x_post: 'X 포스트'
    }
    const campaignTypeLabel = campaignTypeMap[campaignType] || campaignType
    const videoNumber = hintVideoNumber || null
    const weekNumber = hintWeekNumber || null
    const isCleanVideo = hintIsCleanVideo || false

    // 상세 정보 조합
    let detailParts = [campaignTypeLabel]
    if (campaignType === '4week_challenge' || campaignType === '4week') {
      const wk = weekNumber || videoNumber || null
      if (wk) detailParts.push(`${wk}주차`)
    } else if (campaignType === 'megawari' || campaignType === 'mega-warri') {
      if (videoNumber) detailParts.push(`영상${videoNumber}`)
    } else if (campaignType === 'olive_young' || campaignType === 'oliveyoung' || campaignType === 'oliveyoung_sale') {
      if (videoNumber) detailParts.push(`Step${videoNumber}`)
    }
    if (isCleanVideo) detailParts.push('클린본')
    const detailLabel = detailParts.join(' / ')

    const actionLabel = isResubmission ? '📹 영상 재제출' : '📹 영상 제출'
    const results = { naverWorks: false, kakao: false, email: false }

    // --- 네이버 웍스 (직접 API 호출 — fetch 호출 제거하여 타임아웃 방지) ---
    const naverWorksPromise = (async () => {
      try {
        let message = `${actionLabel} 알림 (${siteLabel})\n\n`
        message += `📋 캠페인: ${campaignTitle}\n`
        message += `🏢 기업: ${companyName}\n`
        message += `👤 크리에이터: ${creatorName}\n`
        message += `🎬 유형: ${detailLabel}\n`
        message += `📌 버전: V${version || 1}\n`
        message += `🌍 국가: ${countryLabel}\n`
        message += `⏰ 제출 시간: ${koreanDate}`
        if (videoFileCount) message += `\n📎 파일 수: ${videoFileCount}개`
        if (isResubmission) message += '\n\n※ 수정 후 재업로드'

        const r = await sendNaverWorksMessageDirect('75c24874-e370-afd5-9da3-72918ba15a3c', message)
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

    // 성공 로그 기록 (중복 알림 방지용 dedup key)
    if (results.naverWorks || results.kakao || results.email) {
      try {
        await supabaseBiz.from('notification_send_logs').insert({
          channel: 'naver_works',
          status: 'success',
          function_name: 'notify-video-upload',
          recipient: companyPhone || companyEmail,
          message_preview: `campaign:${campaignId}|creator:${creatorName}|region:${region}`
        })
      } catch (e) { /* skip */ }
    }

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
