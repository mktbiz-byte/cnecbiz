/**
 * 유튜버 섭외 이메일 발송
 *
 * 기능:
 * 1. 미국/일본 유튜버 섭외 이메일 발송
 * 2. 다국어 템플릿 지원 (영어/일본어)
 * 3. 발송 이력 저장
 * 4. CAN-SPAM, 특정전자우편법 준수 (opt-out 포함)
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 섭외 이메일 템플릿 (영어 - 미국)
const TEMPLATE_EN = {
  subject: 'Partnership Opportunity with CNEC - Creator Collaboration',
  body: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Hello ${data.channel_name}!</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>We've been following your amazing content on YouTube and we're impressed by your creativity and engagement with your audience.</p>

    <p>We are <strong>CNEC</strong>, a creator marketing platform connecting talented YouTubers with exciting brand collaboration opportunities.</p>

    <h2 style="color: #667eea; font-size: 18px;">Why Partner With Us?</h2>
    <ul style="padding-left: 20px;">
      <li>Access to premium brand campaigns</li>
      <li>Competitive compensation packages</li>
      <li>Flexible collaboration terms</li>
      <li>Dedicated support team</li>
      <li>Work with global brands</li>
    </ul>

    <h2 style="color: #667eea; font-size: 18px;">What We're Looking For</h2>
    <p>Creators who are passionate about creating authentic content and connecting with their audience.</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin-bottom: 15px;">Interested in learning more?</p>
      <a href="${data.signup_url || 'https://cnecbiz.com/creator/signup'}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Join CNEC Today</a>
    </div>

    <p>If you have any questions, feel free to reply to this email. We'd love to hear from you!</p>

    <p>Best regards,<br>
    <strong>CNEC Creator Team</strong></p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>CNEC Inc. | Seoul, South Korea</p>
    <p>
      <a href="${data.unsubscribe_url || '#'}" style="color: #888;">Unsubscribe</a> |
      <a href="https://cnecbiz.com/privacy" style="color: #888;">Privacy Policy</a>
    </p>
    <p style="margin-top: 10px;">This email was sent because we believe you might be interested in creator partnership opportunities. If you prefer not to receive future emails, please click the unsubscribe link above.</p>
  </div>
</body>
</html>
`
}

// 섭외 이메일 템플릿 (일본어)
const TEMPLATE_JP = {
  subject: 'CNEC クリエイターパートナーシップのご案内',
  body: (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.channel_name} 様</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>いつもYouTubeでの素晴らしいコンテンツを拝見しております。</p>

    <p>私たちは<strong>CNEC</strong>と申します。クリエイターとブランドをつなぐマーケティングプラットフォームを運営しております。</p>

    <h2 style="color: #667eea; font-size: 18px;">CNECパートナーシップのメリット</h2>
    <ul style="padding-left: 20px;">
      <li>プレミアムブランドキャンペーンへのアクセス</li>
      <li>競争力のある報酬体系</li>
      <li>柔軟なコラボレーション条件</li>
      <li>専任サポートチーム</li>
      <li>グローバルブランドとの協業機会</li>
    </ul>

    <h2 style="color: #667eea; font-size: 18px;">こんなクリエイターを探しています</h2>
    <p>視聴者との繋がりを大切にし、オーセンティックなコンテンツ制作に情熱を持つクリエイターの方々。</p>

    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin-bottom: 15px;">詳細についてはこちら</p>
      <a href="${data.signup_url || 'https://cnecbiz.com/creator/signup'}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">CNECに参加する</a>
    </div>

    <p>ご質問がございましたら、お気軽にこのメールにご返信ください。</p>

    <p>よろしくお願いいたします。<br>
    <strong>CNEC クリエイターチーム</strong></p>
  </div>

  <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
    <p>CNEC Inc. | Seoul, South Korea</p>
    <p>
      <a href="${data.unsubscribe_url || '#'}" style="color: #888;">配信停止</a> |
      <a href="https://cnecbiz.com/privacy" style="color: #888;">プライバシーポリシー</a>
    </p>
    <p style="margin-top: 10px;">このメールは、クリエイターパートナーシップにご興味をお持ちいただけると考え、お送りしております。今後のメール配信を希望されない場合は、上記の配信停止リンクをクリックしてください。</p>
  </div>
</body>
</html>
`
}

// 템플릿 선택
function getTemplate(language) {
  switch (language) {
    case 'ja':
    case 'jp':
      return TEMPLATE_JP
    case 'en':
    case 'us':
    default:
      return TEMPLATE_EN
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 인증 확인
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // 관리자 권한 확인
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, name')
      .eq('email', user.email)
      .single()

    if (!adminUser) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const body = JSON.parse(event.body)
    const { action } = body

    switch (action) {
      case 'send_single': {
        // 단일 이메일 발송
        const { prospect_id, language = 'en', custom_subject, custom_body } = body

        if (!prospect_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'prospect_id is required' })
          }
        }

        // 프로스펙트 정보 조회
        const { data: prospect, error: prospectError } = await supabase
          .from('youtube_prospects')
          .select('*')
          .eq('id', prospect_id)
          .single()

        if (prospectError || !prospect) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Prospect not found' })
          }
        }

        if (!prospect.extracted_email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No email address available for this prospect' })
          }
        }

        // 이메일 설정
        const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
        const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC'

        if (!gmailAppPassword) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Email configuration not complete' })
          }
        }

        // 템플릿 선택
        const template = getTemplate(language)
        const emailSubject = custom_subject || template.subject
        const emailBody = custom_body || template.body({
          channel_name: prospect.channel_name,
          signup_url: `https://cnecbiz.com/creator/signup?ref=${prospect.channel_id}`,
          unsubscribe_url: `https://cnecbiz.com/unsubscribe?id=${prospect.id}`
        })

        // 이메일 발송
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailEmail,
            pass: gmailAppPassword.trim().replace(/\s/g, '')
          }
        })

        const mailOptions = {
          from: `"${senderName}" <${gmailEmail}>`,
          to: prospect.extracted_email,
          subject: emailSubject,
          html: emailBody,
          headers: {
            'List-Unsubscribe': `<https://cnecbiz.com/unsubscribe?id=${prospect.id}>`
          }
        }

        const info = await transporter.sendMail(mailOptions)

        // 발송 이력 저장
        await supabase
          .from('youtube_prospect_emails')
          .insert([{
            prospect_id: prospect.id,
            subject: emailSubject,
            body: emailBody,
            template_name: custom_body ? 'custom' : (language === 'jp' ? 'jp_outreach' : 'en_outreach'),
            language,
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_by: adminUser.id
          }])

        // 프로스펙트 상태 업데이트
        await supabase
          .from('youtube_prospects')
          .update({
            outreach_status: 'contacted',
            last_contacted_at: new Date().toISOString(),
            contact_count: (prospect.contact_count || 0) + 1
          })
          .eq('id', prospect.id)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            messageId: info.messageId,
            to: prospect.extracted_email
          })
        }
      }

      case 'send_bulk': {
        // 대량 이메일 발송
        const { prospect_ids, language = 'en', delay_ms = 2000 } = body

        if (!prospect_ids || !prospect_ids.length) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'prospect_ids array is required' })
          }
        }

        // 최대 50개로 제한
        const limitedIds = prospect_ids.slice(0, 50)

        // 프로스펙트 목록 조회
        const { data: prospects, error: prospectError } = await supabase
          .from('youtube_prospects')
          .select('*')
          .in('id', limitedIds)
          .not('extracted_email', 'is', null)

        if (prospectError) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: prospectError.message })
          }
        }

        const results = {
          sent: 0,
          failed: 0,
          skipped: 0,
          errors: []
        }

        // 이메일 설정
        const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD
        const senderName = process.env.GMAIL_SENDER_NAME || 'CNEC'

        if (!gmailAppPassword) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Email configuration not complete' })
          }
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailEmail,
            pass: gmailAppPassword.trim().replace(/\s/g, '')
          }
        })

        const template = getTemplate(language)

        for (const prospect of prospects) {
          try {
            // 이미 연락한 경우 스킵
            if (prospect.outreach_status !== 'new') {
              results.skipped++
              continue
            }

            const emailBody = template.body({
              channel_name: prospect.channel_name,
              signup_url: `https://cnecbiz.com/creator/signup?ref=${prospect.channel_id}`,
              unsubscribe_url: `https://cnecbiz.com/unsubscribe?id=${prospect.id}`
            })

            await transporter.sendMail({
              from: `"${senderName}" <${gmailEmail}>`,
              to: prospect.extracted_email,
              subject: template.subject,
              html: emailBody,
              headers: {
                'List-Unsubscribe': `<https://cnecbiz.com/unsubscribe?id=${prospect.id}>`
              }
            })

            // 발송 이력 저장
            await supabase
              .from('youtube_prospect_emails')
              .insert([{
                prospect_id: prospect.id,
                subject: template.subject,
                body: emailBody,
                template_name: language === 'jp' ? 'jp_outreach' : 'en_outreach',
                language,
                status: 'sent',
                sent_at: new Date().toISOString(),
                sent_by: adminUser.id
              }])

            // 프로스펙트 상태 업데이트
            await supabase
              .from('youtube_prospects')
              .update({
                outreach_status: 'contacted',
                last_contacted_at: new Date().toISOString(),
                contact_count: (prospect.contact_count || 0) + 1
              })
              .eq('id', prospect.id)

            results.sent++

            // 딜레이 (스팸 방지)
            await new Promise(resolve => setTimeout(resolve, delay_ms))

          } catch (error) {
            results.failed++
            results.errors.push({
              prospect_id: prospect.id,
              email: prospect.extracted_email,
              error: error.message
            })
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            results
          })
        }
      }

      case 'get_templates': {
        // 사용 가능한 템플릿 목록
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            templates: [
              {
                id: 'en_outreach',
                name: 'English Outreach',
                language: 'en',
                subject: TEMPLATE_EN.subject,
                preview: 'Partnership invitation for US creators...'
              },
              {
                id: 'jp_outreach',
                name: 'Japanese Outreach (日本語)',
                language: 'jp',
                subject: TEMPLATE_JP.subject,
                preview: 'クリエイターパートナーシップのご案内...'
              }
            ]
          })
        }
      }

      case 'preview': {
        // 템플릿 미리보기
        const { language = 'en', channel_name = 'Creator Name' } = body

        const template = getTemplate(language)
        const previewHtml = template.body({
          channel_name,
          signup_url: 'https://cnecbiz.com/creator/signup',
          unsubscribe_url: '#'
        })

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            subject: template.subject,
            html: previewHtml
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
