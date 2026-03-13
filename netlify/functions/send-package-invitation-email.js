/**
 * 패키지 초대장 이메일 발송
 * 승인된 기업에게 회원가입 + 캠페인 개설 안내 이메일 전송
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) }
  }

  try {
    const { application_id } = JSON.parse(event.body)

    if (!application_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'application_id가 필요합니다.' })
      }
    }

    // 신청 정보 조회
    const { data: app, error: appError } = await supabase
      .from('package_applications')
      .select('*, package_settings(*)')
      .eq('id', application_id)
      .single()

    if (appError || !app) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '신청 정보를 찾을 수 없습니다.' })
      }
    }

    const settings = app.package_settings
    const signupUrl = 'https://cnecbiz.com/signup'
    const campaignCreateUrl = 'https://cnecbiz.com/company/campaigns'
    const totalCreators = settings?.total_creators || 10
    const perCreatorPrice = settings?.per_creator_price || 300000
    const discountRate = settings?.discount_rate || 0
    const totalPrice = perCreatorPrice * totalCreators
    const discountedPrice = totalPrice * (1 - discountRate / 100)

    // 이메일 HTML 생성
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Apple SD Gothic Neo','Pretendard',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6C5CE7,#4834d4);border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px 0;font-weight:700;">크넥 VIP 패키지 초대장</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">CNEC Creator Marketing Platform</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;">

      <p style="font-size:16px;color:#1a1a2e;margin:0 0 24px 0;">
        <strong>${app.contact_name}</strong>님, 안녕하세요.<br>
        크넥(CNEC) ${settings?.month || ''} VIP 패키지 신청이 <strong style="color:#6C5CE7;">승인</strong>되었습니다.
      </p>

      <!-- Package Info -->
      <div style="background:#f8f7ff;border:1px solid #e8e5ff;border-radius:12px;padding:20px;margin:0 0 24px 0;">
        <h3 style="font-size:14px;color:#6C5CE7;margin:0 0 12px 0;">📦 패키지 정보</h3>
        <table style="width:100%;font-size:14px;color:#333;">
          <tr><td style="padding:4px 0;color:#636E72;">기업명</td><td style="padding:4px 0;font-weight:600;">${app.company_name}</td></tr>
          ${app.brand_name ? `<tr><td style="padding:4px 0;color:#636E72;">브랜드</td><td style="padding:4px 0;">${app.brand_name}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#636E72;">크리에이터</td><td style="padding:4px 0;">${totalCreators}명</td></tr>
          <tr><td style="padding:4px 0;color:#636E72;">패키지 금액</td><td style="padding:4px 0;font-weight:600;">${discountedPrice.toLocaleString()}원 <span style="color:#636E72;font-weight:400;font-size:12px;">(VAT 별도)</span></td></tr>
        </table>
      </div>

      <!-- Steps -->
      <h3 style="font-size:15px;color:#1a1a2e;margin:0 0 16px 0;">진행 절차 안내</h3>

      <div style="margin:0 0 12px 0;padding:16px;background:#f9fafb;border-radius:10px;border-left:4px solid #6C5CE7;">
        <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Step 1.</strong> 아래 버튼을 클릭하여 <strong>크넥 회원가입</strong>을 완료해주세요.</p>
      </div>
      <div style="margin:0 0 12px 0;padding:16px;background:#f9fafb;border-radius:10px;border-left:4px solid #6C5CE7;">
        <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Step 2.</strong> 로그인 후 <strong>캠페인 개설</strong>을 진행해주세요.</p>
      </div>
      <div style="margin:0 0 24px 0;padding:16px;background:#f9fafb;border-radius:10px;border-left:4px solid #6C5CE7;">
        <p style="margin:0;font-size:14px;color:#1a1a2e;"><strong>Step 3.</strong> 전담 매니저가 크리에이터 매칭을 시작합니다.</p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${signupUrl}" style="display:inline-block;background:#6C5CE7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;margin:0 0 12px 0;">
          회원가입 하기
        </a>
        <br><br>
        <a href="${campaignCreateUrl}" style="display:inline-block;background:#ffffff;color:#6C5CE7;text-decoration:none;padding:12px 28px;border-radius:12px;font-size:14px;font-weight:600;border:2px solid #6C5CE7;">
          캠페인 개설 페이지로 이동
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

      <p style="font-size:13px;color:#636E72;margin:0;">
        문의사항은 언제든지 연락주세요.<br>
        이메일: mkt_biz@cnec.co.kr | 전화: 1833-6025
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;font-size:12px;color:#999;">
      <p style="margin:0;">주식회사 하우파파 (HOWPAPA Inc.) | 크넥 (CNEC)</p>
      <p style="margin:4px 0 0 0;">https://cnecbiz.com</p>
    </div>
  </div>
</body>
</html>`

    // 이메일 발송
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
    const senderName = process.env.GMAIL_SENDER_NAME || 'CNECBIZ'

    if (!gmailAppPassword) {
      throw new Error('GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.')
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: gmailAppPassword.trim()
      }
    })

    await transporter.sendMail({
      from: `"${senderName}" <${gmailEmail}>`,
      to: app.email,
      subject: `[크넥] ${app.company_name}님, VIP 패키지가 승인되었습니다 — 캠페인을 개설해주세요`,
      html
    })

    // 발송 로그 저장
    try {
      await supabase.from('notification_send_logs').insert({
        channel: 'email',
        status: 'success',
        function_name: 'send-package-invitation-email',
        recipient: app.email,
        message_preview: `패키지 초대장 - ${app.company_name}`,
        metadata: { application_id, company_name: app.company_name }
      })
    } catch (logErr) { console.error('로그 저장 실패:', logErr.message) }

    // 신청서에 초대장 발송 기록
    await supabase
      .from('package_applications')
      .update({ invitation_sent_at: new Date().toISOString() })
      .eq('id', application_id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    }
  } catch (error) {
    console.error('[send-package-invitation-email] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'send-package-invitation-email',
          errorMessage: error.message
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
