const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

// 토큰 생성 함수 (application_id + secret 해시)
const generateShippingToken = (applicationId) => {
  const secret = process.env.SHIPPING_TOKEN_SECRET || 'cnec-shipping-secret-2024'
  return crypto.createHmac('sha256', secret).update(applicationId).digest('hex').substring(0, 32)
}

// US Supabase
const usUrl = process.env.VITE_SUPABASE_US_URL
const usServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
const supabaseUS = usUrl && usServiceKey ? createClient(usUrl, usServiceKey) : null

// BIZ Supabase (인증용)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL
const bizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseBiz = bizUrl && bizServiceKey ? createClient(bizUrl, bizServiceKey) : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * US 크리에이터에게 배송정보 입력 요청 이메일 발송
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
    if (!supabaseUS || !supabaseBiz) {
      throw new Error('Supabase configuration missing')
    }

    // 인증 확인
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Authentication required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseBiz.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid authentication' })
      }
    }

    const { application_ids, campaign_id } = JSON.parse(event.body)

    if (!application_ids || !application_ids.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'No applications selected' })
      }
    }

    // 캠페인 정보 조회
    const { data: campaign, error: campaignError } = await supabaseUS
      .from('campaigns')
      .select('title, brand, company_id')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    // applications 조회
    const { data: applications, error: appError } = await supabaseUS
      .from('applications')
      .select('id, applicant_name, email')
      .in('id', application_ids)

    if (appError || !applications?.length) {
      throw new Error('Applications not found')
    }

    // Gmail SMTP 설정 (send-email.js와 동일)
    const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
    const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC'

    if (!gmailAppPassword) {
      throw new Error('GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다')
    }

    const cleanPassword = gmailAppPassword.trim().replace(/\s/g, '')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailEmail,
        pass: cleanPassword
      }
    })

    const baseUrl = process.env.URL || 'https://cnecbiz.com'
    const results = []

    // 각 크리에이터에게 이메일 발송
    for (const app of applications) {
      if (!app.email) {
        results.push({ id: app.id, success: false, error: 'No email' })
        continue
      }

      const token = generateShippingToken(app.id)
      const shippingFormUrl = `${baseUrl}/us-shipping-info?id=${app.id}&token=${token}`

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:500px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#9333ea,#ec4899);padding:32px 24px;text-align:center;">
              <h1 style="color:#fff;font-size:24px;margin:0;">Congratulations! You're Selected!</h1>
              <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:12px 0 0;">Please submit your shipping information</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="font-size:16px;color:#1f2937;margin:0 0 20px;">
                Hi <strong>${app.applicant_name || 'Creator'}</strong>,
              </p>

              <p style="font-size:14px;color:#4b5563;margin:0 0 24px;line-height:1.6;">
                Great news! You have been selected for the campaign:<br>
                <strong style="color:#9333ea;">${campaign.title}</strong>
              </p>

              <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="font-size:14px;color:#4b5563;margin:0 0 16px;">
                  To receive your product, please submit your shipping information by clicking the button below:
                </p>

                <table width="100%">
                  <tr>
                    <td align="center">
                      <a href="${shippingFormUrl}"
                         style="display:inline-block;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;">
                        Submit Shipping Info
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="background:#fef3c7;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="font-size:13px;color:#92400e;margin:0;">
                  <strong>Important:</strong> Please submit your shipping information as soon as possible so we can send your product promptly.
                </p>
              </div>

              <p style="font-size:12px;color:#9ca3af;margin:0;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${shippingFormUrl}" style="color:#9333ea;word-break:break-all;">${shippingFormUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 24px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="font-size:12px;color:#6b7280;margin:0;">
                Questions? Contact us at support@cnec.io
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

      try {
        await transporter.sendMail({
          from: `"${senderName}" <${gmailEmail}>`,
          to: app.email,
          subject: `[CNEC] You're Selected! Please Submit Your Shipping Info - ${campaign.title}`,
          html: emailHtml
        })

        results.push({ id: app.id, success: true, email: app.email })
        console.log(`[SUCCESS] Email sent to ${app.email}`)
      } catch (emailError) {
        console.error(`[ERROR] Failed to send email to ${app.email}:`, emailError)
        results.push({ id: app.id, success: false, error: emailError.message })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Sent ${successCount} emails successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        results
      })
    }

  } catch (error) {
    console.error('[ERROR] Request shipping info:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
