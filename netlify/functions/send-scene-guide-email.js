/**
 * 씬 가이드 이메일 전송 Function
 * US/Japan 캠페인용 10씬 가이드를 크리에이터에게 이메일로 전송
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const { campaign_id, region, guide_content, creators } = JSON.parse(event.body)

    if (!campaign_id || !guide_content || !creators || creators.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: campaign_id, guide_content, creators' })
      }
    }

    // Supabase client setup
    const supabaseUrl = region === 'japan'
      ? process.env.VITE_SUPABASE_JAPAN_URL
      : process.env.VITE_SUPABASE_US_URL

    const supabaseKey = region === 'japan'
      ? process.env.VITE_SUPABASE_JAPAN_SERVICE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
      : process.env.VITE_SUPABASE_US_SERVICE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Email transporter setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    })

    // Generate email HTML
    const generateEmailHtml = (creatorName) => {
      const isJapanese = region === 'japan'
      const languageLabel = isJapanese ? '日本語' : 'English'

      const sceneCards = guide_content.scenes.map(scene => `
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #8B5CF6, #6366F1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
              ${scene.order}
            </div>
            <div>
              <span style="font-weight: bold; font-size: 16px;">Scene ${scene.order}</span>
              ${scene.scene_type ? `<span style="background: #E0E7FF; color: #4338CA; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${scene.scene_type}</span>` : ''}
            </div>
          </div>
          ${scene.scene_description ? `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">📹 ${isJapanese ? '撮影シーン' : 'Scene Description'}</div>
              <div style="background: #F9FAFB; padding: 12px; border-radius: 8px; font-size: 14px;">${scene.scene_description}</div>
            </div>
          ` : ''}
          ${scene.dialogue ? `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">💬 ${isJapanese ? 'セリフ' : 'Dialogue'}</div>
              <div style="background: #EEF2FF; padding: 12px; border-radius: 8px; font-size: 14px; border-left: 3px solid #6366F1;">
                "${scene.dialogue}"
              </div>
            </div>
          ` : ''}
          ${scene.shooting_tip ? `
            <div>
              <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">💡 ${isJapanese ? '撮影ヒント' : 'Shooting Tip'}</div>
              <div style="background: #FEF3C7; padding: 12px; border-radius: 8px; font-size: 13px; color: #92400E;">${scene.shooting_tip}</div>
            </div>
          ` : ''}
        </div>
      `).join('')

      const requiredDialoguesHtml = guide_content.required_dialogues?.length > 0 ? `
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px 0; color: #1F2937; font-size: 16px;">🎯 ${isJapanese ? '必須セリフ' : 'Required Dialogues'}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${guide_content.required_dialogues.map(d => `<li style="margin-bottom: 8px;">${d}</li>`).join('')}
          </ul>
        </div>
      ` : ''

      const requiredScenesHtml = guide_content.required_scenes?.length > 0 ? `
        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px 0; color: #1F2937; font-size: 16px;">📸 ${isJapanese ? '必須撮影シーン' : 'Required Scenes'}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${guide_content.required_scenes.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${guide_content.campaign_title} - Creator Guide</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Creator Guide</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
        ${guide_content.campaign_title}
      </p>
      ${guide_content.brand_name ? `<p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">by ${guide_content.brand_name}</p>` : ''}
    </div>

    <!-- Main Content -->
    <div style="background: #F9FAFB; padding: 24px; border-radius: 0 0 16px 16px;">
      <!-- Greeting -->
      <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="margin: 0; font-size: 16px; color: #1F2937;">
          ${isJapanese
            ? `${creatorName}様、こんにちは！<br><br>このたびは「${guide_content.campaign_title}」キャンペーンにご参加いただき、誠にありがとうございます。<br>以下の撮影ガイドをご確認ください。`
            : `Hi ${creatorName}!<br><br>Thank you for participating in the "${guide_content.campaign_title}" campaign.<br>Please review the shooting guide below.`
          }
        </p>
      </div>

      <!-- Style Info -->
      <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 16px 0; color: #1F2937; font-size: 16px;">🎬 ${isJapanese ? '動画スタイル' : 'Video Style'}</h3>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          ${guide_content.dialogue_style ? `
            <span style="background: #DBEAFE; color: #1E40AF; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
              ${isJapanese ? 'スタイル' : 'Style'}: ${guide_content.dialogue_style}
            </span>
          ` : ''}
          ${guide_content.tempo ? `
            <span style="background: #D1FAE5; color: #065F46; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
              ${isJapanese ? 'テンポ' : 'Tempo'}: ${guide_content.tempo}
            </span>
          ` : ''}
          ${guide_content.mood ? `
            <span style="background: #FEE2E2; color: #991B1B; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
              ${isJapanese ? '雰囲気' : 'Mood'}: ${guide_content.mood}
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Required Elements -->
      ${requiredDialoguesHtml}
      ${requiredScenesHtml}

      <!-- Scenes -->
      <h2 style="margin: 0 0 16px 0; color: #1F2937; font-size: 20px; font-weight: bold;">
        📋 ${isJapanese ? '撮影シーン一覧' : 'Scene Breakdown'} (${guide_content.scenes.length} ${isJapanese ? 'シーン' : 'Scenes'})
      </h2>
      ${sceneCards}

      <!-- Footer -->
      <div style="background: white; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="margin: 0 0 12px 0; color: #6B7280; font-size: 14px;">
          ${isJapanese
            ? 'ご不明な点がございましたら、お気軽にお問い合わせください。'
            : 'If you have any questions, please feel free to contact us.'
          }
        </p>
        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
          © ${new Date().getFullYear()} CNEC BIZ - Global Influencer Marketing Platform
        </p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    }

    // Send emails to each creator
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const creator of creators) {
      if (!creator.email) {
        errorCount++
        errors.push({ name: creator.name, error: 'No email address' })
        continue
      }

      try {
        const emailHtml = generateEmailHtml(creator.name || 'Creator')
        const subject = region === 'japan'
          ? `【撮影ガイド】${guide_content.campaign_title}`
          : `[Creator Guide] ${guide_content.campaign_title}`

        await transporter.sendMail({
          from: `"CNEC BIZ" <${process.env.GMAIL_USER}>`,
          to: creator.email,
          subject,
          html: emailHtml
        })

        // Update application with guide_sent status
        await supabase
          .from('applications')
          .update({
            guide_sent_at: new Date().toISOString(),
            guide_sent: true
          })
          .eq('id', creator.id)

        successCount++
        console.log(`✓ Guide sent to ${creator.name} (${creator.email})`)
      } catch (emailError) {
        errorCount++
        errors.push({ name: creator.name, error: emailError.message })
        console.error(`✗ Failed to send to ${creator.name}:`, emailError.message)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Guide sent to ${successCount} creator(s)`,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      })
    }

  } catch (error) {
    console.error('Send guide email error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
