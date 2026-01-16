const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const https = require('https')

// 토큰 검증 함수 (선택적)
const verifyShippingToken = (applicationId, token) => {
  if (!token) return true // 토큰 없으면 검증 건너뛰기 (기존 링크 호환)
  const secret = process.env.SHIPPING_TOKEN_SECRET || 'cnec-shipping-secret-2024'
  const expectedToken = crypto.createHmac('sha256', secret).update(applicationId).digest('hex').substring(0, 32)
  return token === expectedToken
}

// US Supabase (service role key로 RLS 우회)
const usUrl = process.env.VITE_SUPABASE_US_URL
const usServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
const supabaseUS = usUrl && usServiceKey ? createClient(usUrl, usServiceKey) : null

// 네이버웍스 알림 채널 ID (US 배송정보 알림용)
const NAVER_WORKS_US_SHIPPING_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'

// Private Key (네이버웍스 인증용)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
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

// JWT 생성 함수
function generateJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600,
    scope: 'bot'
  }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY)
  return `${signatureInput}.${signature.toString('base64url')}`
}

// Access Token 발급
async function getAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT(clientId, serviceAccount)
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'bot'
    }).toString()

    const req = https.request({
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token)
        } else {
          reject(new Error(`Token failed: ${res.statusCode} ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// 네이버웍스 메시지 전송
async function sendNaverWorksMessage(message) {
  try {
    const clientId = process.env.NAVER_WORKS_CLIENT_ID
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET
    const botId = process.env.NAVER_WORKS_BOT_ID
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr'

    if (!clientId || !clientSecret || !botId) {
      console.warn('[WARN] NaverWorks config missing, skipping notification')
      return
    }

    const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount)
    const postData = JSON.stringify({ content: { type: 'text', text: message } })

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.worksapis.com',
        path: `/v1.0/bots/${botId}/channels/${NAVER_WORKS_US_SHIPPING_CHANNEL_ID}/messages`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('[SUCCESS] NaverWorks notification sent')
            resolve(true)
          } else {
            console.error('[ERROR] NaverWorks send failed:', res.statusCode, data)
            reject(new Error(`NaverWorks failed: ${res.statusCode}`))
          }
        })
      })
      req.on('error', reject)
      req.write(postData)
      req.end()
    })
  } catch (error) {
    console.error('[ERROR] NaverWorks notification error:', error.message)
  }
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * US 크리에이터 배송정보 저장
 * - service role key 사용으로 RLS 우회
 * - applications 테이블 + user_profiles 테이블 업데이트
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    if (!supabaseUS) {
      console.error('[ERROR] Supabase US configuration missing')
      throw new Error('Database configuration error')
    }

    const { application_id, token, shipping_data } = JSON.parse(event.body)
    console.log('[INFO] Submit shipping info:', { application_id, hasToken: !!token })

    if (!application_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing application_id' })
      }
    }

    // 토큰 검증 (토큰이 있는 경우에만)
    if (token && !verifyShippingToken(application_id, token)) {
      console.warn('[WARN] Invalid token for application:', application_id)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid token' })
      }
    }

    if (!shipping_data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing shipping data' })
      }
    }

    const { phone_number, postal_code, address, detail_address } = shipping_data

    if (!phone_number || !address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Phone number and address are required' })
      }
    }

    // 1. Application 존재 확인
    const { data: appCheck, error: checkError } = await supabaseUS
      .from('applications')
      .select('id, user_id')
      .eq('id', application_id)
      .single()

    if (checkError || !appCheck) {
      console.error('[ERROR] Application not found:', application_id, checkError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Application not found' })
      }
    }

    console.log('[INFO] Found application:', appCheck)

    // 2. Applications 테이블 업데이트
    const { data: updateData, error: updateError } = await supabaseUS
      .from('applications')
      .update({
        phone_number,
        postal_code: postal_code || null,
        address,
        detail_address: detail_address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', application_id)
      .select()

    if (updateError) {
      console.error('[ERROR] Failed to update application:', updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log('[SUCCESS] Application updated:', updateData)

    // 3. User profiles 업데이트 (user_id가 있는 경우)
    if (appCheck.user_id) {
      const { error: profileError } = await supabaseUS
        .from('user_profiles')
        .update({
          phone_number,
          phone: phone_number,
          postal_code: postal_code || null,
          shipping_address: address,
          address,
          detail_address: detail_address || null
        })
        .eq('user_id', appCheck.user_id)

      if (profileError) {
        console.warn('[WARN] Failed to update user_profiles:', profileError)
        // user_profiles 업데이트 실패는 무시 (applications이 중요)
      } else {
        console.log('[SUCCESS] User profile updated for user_id:', appCheck.user_id)
      }
    }

    // 4. 저장 확인을 위해 다시 조회 (크리에이터 이름, 캠페인 정보 포함)
    const { data: verifyData, error: verifyError } = await supabaseUS
      .from('applications')
      .select('applicant_name, email, phone_number, postal_code, address, detail_address, campaign_id')
      .eq('id', application_id)
      .single()

    if (verifyError) {
      console.error('[ERROR] Failed to verify saved data:', verifyError)
    } else {
      console.log('[VERIFY] Saved data:', verifyData)
    }

    // 5. 캠페인 정보 조회
    let campaignTitle = ''
    if (verifyData?.campaign_id) {
      const { data: campaignData } = await supabaseUS
        .from('campaigns')
        .select('title')
        .eq('id', verifyData.campaign_id)
        .single()
      campaignTitle = campaignData?.title || ''
    }

    // 6. 네이버웍스 알림 전송
    const koreanTime = new Date().toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const notificationMessage = `🇺🇸 US 크리에이터 배송정보 입력 완료

📦 캠페인: ${campaignTitle || '알 수 없음'}
👤 크리에이터: ${verifyData?.applicant_name || '알 수 없음'}
📧 이메일: ${verifyData?.email || ''}
📱 연락처: ${phone_number}
📍 주소: ${postal_code ? `${postal_code}, ` : ''}${address}${detail_address ? `, ${detail_address}` : ''}

⏰ ${koreanTime}`

    // 알림 전송 (실패해도 저장은 성공으로 처리)
    try {
      await sendNaverWorksMessage(notificationMessage)
    } catch (notifyError) {
      console.error('[WARN] Failed to send notification, but data saved:', notifyError.message)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Shipping info saved successfully',
        saved_data: verifyData
      })
    }

  } catch (error) {
    console.error('[ERROR] Submit shipping info:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
