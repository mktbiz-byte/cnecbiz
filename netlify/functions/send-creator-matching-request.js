const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const crypto = require('crypto')

/**
 * 크리에이터 매칭 상담 신청 Netlify Function
 * 기업이 원하는 스타일의 크리에이터 매칭을 관리자에게 요청
 * 네이버 웍스로 상담 신청서를 전송
 */

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Private Key (send-naver-works-message.js와 동일)
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

function generateJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope: 'bot' }

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), PRIVATE_KEY)

  return `${signatureInput}.${signature.toString('base64url')}`
}

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

    const options = {
      hostname: 'auth.worksmobile.com',
      path: '/oauth2/v2.0/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
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

async function sendMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content: { type: 'text', text: message } })
    const options = {
      hostname: 'www.worksapis.com',
      path: `/v1.0/bots/${botId}/channels/${channelId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve({ success: true })
        } else {
          reject(new Error(`Message failed: ${res.statusCode} ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
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

    // 2. 네이버 웍스로 상담 신청서 전송
    const clientId = process.env.NAVER_WORKS_CLIENT_ID
    const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET
    const botId = process.env.NAVER_WORKS_BOT_ID
    const channelId = process.env.NAVER_WORKS_CONSULTATION_CHANNEL_ID || process.env.NAVER_WORKS_CHANNEL_ID
    const serviceAccount = '7c15c.serviceaccount@howlab.co.kr'

    let naverWorksSent = false

    if (clientId && clientSecret && botId && channelId) {
      try {
        const accessToken = await getAccessToken(clientId, clientSecret, serviceAccount)

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

        await sendMessage(accessToken, botId, channelId, message)
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
      } catch (nwError) {
        console.error('[Matching Request] Naver Works send error:', nwError)
        // 네이버 웍스 전송 실패해도 신청 자체는 성공으로 처리
      }
    } else {
      console.warn('[Matching Request] Naver Works credentials not configured')
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
