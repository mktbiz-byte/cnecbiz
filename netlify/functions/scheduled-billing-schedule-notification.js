/**
 * 매일 오전 10시(한국시간) 실행 - 빌링 스케줄 접근 알림
 * D-DAY 및 D-1 pending 스케줄 조회 → 이메일(mkt@cnecbiz.com) + 네이버웍스 알림
 *
 * Cron: 0 1 * * * (UTC 01:00 = KST 10:00)
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
const https = require('https')
const crypto = require('crypto')

// 네이버웍스 Private Key
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

// 네이버웍스 JWT 생성
function generateNaverWorksJWT(clientId, serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600, scope: 'bot' }
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${base64Header}.${base64Payload}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), NAVER_WORKS_PRIVATE_KEY)
  return `${signatureInput}.${signature.toString('base64url')}`
}

// 네이버웍스 Access Token 발급
async function getNaverWorksAccessToken(clientId, clientSecret, serviceAccount) {
  return new Promise((resolve, reject) => {
    const jwt = generateNaverWorksJWT(clientId, serviceAccount)
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt, client_id: clientId, client_secret: clientSecret, scope: 'bot'
    }).toString()

    const req = https.request({
      hostname: 'auth.worksmobile.com', path: '/oauth2/v2.0/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data).access_token)
        else reject(new Error(`Token failed: ${res.statusCode} ${data}`))
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

// 네이버웍스 메시지 전송
async function sendNaverWorksMessage(accessToken, botId, channelId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ content: { type: 'text', text: message } })
    const req = https.request({
      hostname: 'www.worksapis.com', path: `/v1.0/bots/${botId}/channels/${channelId}/messages`, method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) resolve({ success: true })
        else reject(new Error(`Message failed: ${res.statusCode} ${data}`))
      })
    })
    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

const SCHEDULE_TYPE_LABELS = {
  tax_invoice: '세금계산서 발행',
  payment_due: '입금 예정일',
  reminder: '알림/메모'
}

const MAIN_CHANNEL_ID = '75c24874-e370-afd5-9da3-72918ba15a3c'

function buildEmailHtml(dDaySchedules, dMinus1Schedules, today) {
  const buildRows = (schedules) => schedules.map(s => {
    const typeLabel = SCHEDULE_TYPE_LABELS[s.schedule_type] || ''
    const timeStr = s.scheduled_time ? ` ${s.scheduled_time}` : ''
    return `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 13px;">${typeLabel}</td>
        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 13px; font-weight: bold;">${s.title}</td>
        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 13px;">${s.company_name || '-'}</td>
        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 13px; color: #6C5CE7; font-weight: bold;">${s.amount ? Number(s.amount).toLocaleString() + '원' : '-'}</td>
        <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 13px;">${s.scheduled_date}${timeStr}</td>
      </tr>`
  }).join('')

  const tableHeader = `
    <tr style="background: #f8f9fa;">
      <th style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 12px; text-align: left;">유형</th>
      <th style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 12px; text-align: left;">제목</th>
      <th style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 12px; text-align: left;">기업</th>
      <th style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 12px; text-align: left;">금액</th>
      <th style="padding: 8px 12px; border: 1px solid #dee2e6; font-size: 12px; text-align: left;">예정일</th>
    </tr>`

  let html = `
    <div style="font-family: Pretendard, -apple-system, sans-serif; max-width: 700px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #6C5CE7; margin-bottom: 8px;">📅 스케줄 알림</h2>
      <p style="color: #666; font-size: 14px; margin-bottom: 24px;">${today} 기준</p>`

  if (dDaySchedules.length > 0) {
    html += `
      <h3 style="color: #E17055; margin-bottom: 8px;">🔴 D-DAY (${dDaySchedules.length}건)</h3>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
        ${tableHeader}${buildRows(dDaySchedules)}
      </table>`
  }

  if (dMinus1Schedules.length > 0) {
    html += `
      <h3 style="color: #F59E0B; margin-bottom: 8px;">🟡 D-1 (${dMinus1Schedules.length}건)</h3>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 24px;">
        ${tableHeader}${buildRows(dMinus1Schedules)}
      </table>`
  }

  html += `
      <p style="color: #999; font-size: 12px; margin-top: 16px;">CNEC 스케줄 관리 시스템에서 자동 발송되었습니다.</p>
    </div>`

  return html
}

function buildNaverWorksMessage(dDaySchedules, dMinus1Schedules, today) {
  let msg = `📅 오늘의 빌링 스케줄 알림 (${today})\n`

  if (dDaySchedules.length > 0) {
    msg += `\n🔴 D-DAY - ${dDaySchedules.length}건\n`
    dDaySchedules.forEach(s => {
      const typeLabel = SCHEDULE_TYPE_LABELS[s.schedule_type] || ''
      const timeStr = s.scheduled_time ? ` (${s.scheduled_time})` : ''
      const amountStr = s.amount ? ` - ${Number(s.amount).toLocaleString()}원` : ''
      msg += `  • [${typeLabel}] ${s.title}${amountStr}${timeStr}\n`
      if (s.company_name && s.company_name !== '미지정') msg += `    ${s.company_name}\n`
    })
  }

  if (dMinus1Schedules.length > 0) {
    msg += `\n🟡 D-1 - ${dMinus1Schedules.length}건\n`
    dMinus1Schedules.forEach(s => {
      const typeLabel = SCHEDULE_TYPE_LABELS[s.schedule_type] || ''
      const timeStr = s.scheduled_time ? ` (${s.scheduled_time})` : ''
      const amountStr = s.amount ? ` - ${Number(s.amount).toLocaleString()}원` : ''
      msg += `  • [${typeLabel}] ${s.title}${amountStr}${timeStr}\n`
      if (s.company_name && s.company_name !== '미지정') msg += `    ${s.company_name}\n`
    })
  }

  return msg
}

const { checkDuplicate, skipResponse } = require('./lib/scheduler-dedup')

exports.handler = async (event, context) => {
  console.log('=== 빌링 스케줄 접근 알림 시작 ===')
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))

  const { isDuplicate, reason } = await checkDuplicate('scheduled-billing-schedule-notification', event)
  if (isDuplicate) return skipResponse(reason)

  try {
    // 오늘/내일 날짜 (한국시간 기준)
    const now = new Date()
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const today = koreaTime.toISOString().split('T')[0]
    const tomorrow = new Date(koreaTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    console.log('오늘:', today, '내일:', tomorrowStr)

    // BIZ DB에서 스케줄 조회
    const supabaseBiz = createClient(
      process.env.VITE_SUPABASE_BIZ_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: schedules, error } = await supabaseBiz
      .from('billing_schedules')
      .select('*')
      .in('scheduled_date', [today, tomorrowStr])
      .eq('status', 'pending')
      .order('scheduled_date')
      .order('scheduled_time', { nullsFirst: false })

    if (error) throw error

    if (!schedules || schedules.length === 0) {
      console.log('알림 대상 스케줄 없음')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No schedules to notify' })
      }
    }

    // D-DAY / D-1 분류
    const dDaySchedules = schedules.filter(s => s.scheduled_date === today)
    const dMinus1Schedules = schedules.filter(s => s.scheduled_date === tomorrowStr)

    console.log(`D-DAY: ${dDaySchedules.length}건, D-1: ${dMinus1Schedules.length}건`)

    // 1. 이메일 발송 → mkt@cnecbiz.com
    try {
      const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

      if (gmailAppPassword) {
        const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '')
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: gmailEmail, pass: cleanPassword }
        })

        const emailHtml = buildEmailHtml(dDaySchedules, dMinus1Schedules, today)

        await transporter.sendMail({
          from: `"CNEC 스케줄" <${gmailEmail}>`,
          to: 'mkt@cnecbiz.com',
          subject: `[스케줄 알림] D-DAY ${dDaySchedules.length}건 / D-1 ${dMinus1Schedules.length}건 (${today})`,
          html: emailHtml
        })
        console.log('이메일 발송 완료: mkt@cnecbiz.com')

        // 로그 기록
        try {
          await supabaseBiz.from('notification_send_logs').insert({
            channel: 'email', status: 'success',
            function_name: 'scheduled-billing-schedule-notification',
            recipient: 'mkt@cnecbiz.com',
            message_preview: `D-DAY ${dDaySchedules.length}건 / D-1 ${dMinus1Schedules.length}건`
          })
        } catch (e) { /* skip */ }
      } else {
        console.log('GMAIL_APP_PASSWORD 미설정 - 이메일 발송 생략')
      }
    } catch (emailErr) {
      console.error('이메일 발송 실패:', emailErr.message)
    }

    // 2. 네이버웍스 메시지 발송
    try {
      const clientId = process.env.NAVER_WORKS_CLIENT_ID
      const clientSecret = process.env.NAVER_WORKS_CLIENT_SECRET
      const botId = process.env.NAVER_WORKS_BOT_ID
      const serviceAccount = '7c15c.serviceaccount@howlab.co.kr'

      if (clientId && clientSecret && botId) {
        const naverWorksMsg = buildNaverWorksMessage(dDaySchedules, dMinus1Schedules, today)
        const accessToken = await getNaverWorksAccessToken(clientId, clientSecret, serviceAccount)
        await sendNaverWorksMessage(accessToken, botId, MAIN_CHANNEL_ID, naverWorksMsg)
        console.log('네이버웍스 메시지 발송 완료')

        // 로그 기록
        try {
          await supabaseBiz.from('notification_send_logs').insert({
            channel: 'naver_works', status: 'success',
            function_name: 'scheduled-billing-schedule-notification',
            recipient: MAIN_CHANNEL_ID,
            message_preview: `D-DAY ${dDaySchedules.length}건 / D-1 ${dMinus1Schedules.length}건`
          })
        } catch (e) { /* skip */ }
      } else {
        console.log('네이버웍스 설정 미완료 - 메시지 발송 생략')
      }
    } catch (nwErr) {
      console.error('네이버웍스 메시지 발송 실패:', nwErr.message)
    }

    // 3. auto_notified 업데이트
    const ids = schedules.map(s => s.id)
    await supabaseBiz.from('billing_schedules').update({
      auto_notified: true,
      auto_notified_at: new Date().toISOString()
    }).in('id', ids)

    console.log('=== 빌링 스케줄 접근 알림 완료 ===')

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        dDay: dDaySchedules.length,
        dMinus1: dMinus1Schedules.length
      })
    }

  } catch (error) {
    console.error('[scheduled-billing-schedule-notification] Error:', error)

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'scheduled-billing-schedule-notification',
          errorMessage: error.message,
          context: {}
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
