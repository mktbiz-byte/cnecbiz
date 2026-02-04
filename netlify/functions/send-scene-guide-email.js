/**
 * 씬 가이드 이메일 전송 Function
 * Korea/Japan/US 캠페인용 씬 가이드를 크리에이터에게 이메일로 전송
 * 모바일 최적화 버전 - 3개 리전 지원
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')

// Korean to English/Japanese scene type translations
const SCENE_TYPE_TRANSLATIONS = {
  // Korean -> English
  en: {
    '훅': 'Hook',
    '인트로': 'Intro',
    '본문': 'Main',
    '마무리': 'Outro',
    '엔딩': 'Ending',
    '제품 소개': 'Product Intro',
    '제품소개': 'Product Intro',
    '리뷰': 'Review',
    '후기': 'Review',
    'CTA': 'CTA',
    '콜투액션': 'Call to Action',
    '전환': 'Transition',
    '오프닝': 'Opening',
    '클로징': 'Closing',
    '효과': 'Effects',
    '언박싱': 'Unboxing',
    '사용법': 'How to Use',
    '비교': 'Comparison',
    '결과': 'Result',
    '추천': 'Recommendation'
  },
  // Korean -> Japanese
  ja: {
    '훅': 'フック',
    '인트로': 'イントロ',
    '본문': 'メイン',
    '마무리': 'まとめ',
    '엔딩': 'エンディング',
    '제품 소개': '商品紹介',
    '제품소개': '商品紹介',
    '리뷰': 'レビュー',
    '후기': 'レビュー',
    'CTA': 'CTA',
    '콜투액션': 'コールトゥアクション',
    '전환': '転換',
    '오프닝': 'オープニング',
    '클로징': 'クロージング',
    '효과': 'エフェクト',
    '언박싱': '開封',
    '사용법': '使い方',
    '비교': '比較',
    '결과': '結果',
    '추천': 'おすすめ'
  }
}

// Translate scene type based on region
function translateSceneType(sceneType, region) {
  if (!sceneType) return ''

  // Korea: 원본 한국어 그대로 사용
  if (region === 'korea') return sceneType

  const lang = region === 'japan' ? 'ja' : 'en'
  const translations = SCENE_TYPE_TRANSLATIONS[lang]

  // Return translated value if exists, otherwise return original (might already be in target language)
  return translations[sceneType] || sceneType
}

// 리전별 텍스트 헬퍼
function getLocaleText(region, ko, ja, en) {
  if (region === 'korea') return ko
  if (region === 'japan') return ja
  return en
}

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

    // Supabase client setup (리전별)
    let supabaseUrl, supabaseKey
    if (region === 'korea') {
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
    } else if (region === 'japan') {
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      supabaseKey = process.env.VITE_SUPABASE_JAPAN_SERVICE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY
    } else {
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      supabaseKey = process.env.VITE_SUPABASE_US_SERVICE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Email transporter setup
    const gmailUser = process.env.GMAIL_EMAIL || process.env.GMAIL_USER || 'mkt_biz@cnec.co.kr'
    const gmailPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailPassword) {
      console.error('[send-scene-guide-email] GMAIL_APP_PASSWORD not set')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gmail configuration missing' })
      }
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword.trim().replace(/\s/g, '')
      }
    })

    // Generate mobile-optimized email HTML (Korea/Japan/US 3개 리전 지원)
    const generateEmailHtml = (creatorName) => {
      const t = (ko, ja, en) => getLocaleText(region, ko, ja, en)

      const sceneCards = guide_content.scenes.map(scene => `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 16px;">
              <!-- Scene Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="40" valign="top">
                    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8B5CF6, #6366F1); border-radius: 50%; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 14px;">
                      ${scene.order}
                    </div>
                  </td>
                  <td valign="middle" style="padding-left: 8px;">
                    <span style="font-weight: bold; font-size: 15px; color: #1F2937;">${t('씬', 'Scene', 'Scene')} ${scene.order}</span>
                    ${scene.scene_type ? `<br><span style="background: #E0E7FF; color: #4338CA; padding: 2px 8px; border-radius: 4px; font-size: 11px; display: inline-block; margin-top: 4px;">${translateSceneType(scene.scene_type, region)}</span>` : ''}
                  </td>
                </tr>
              </table>
              ${scene.scene_description ? `
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">📹 ${t('촬영 씬', '撮影シーン', 'Scene Description')}</div>
                  <div style="background: #F9FAFB; padding: 10px; border-radius: 8px; font-size: 13px; line-height: 1.5; color: #374151;">${scene.scene_description}</div>
                </div>
              ` : ''}
              ${scene.dialogue ? `
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">💬 ${t('대사', 'セリフ', 'Dialogue')}</div>
                  <div style="background: #EEF2FF; padding: 10px; border-radius: 8px; font-size: 13px; line-height: 1.5; border-left: 3px solid #6366F1; color: #3730A3;">
                    "${scene.dialogue}"
                  </div>
                </div>
              ` : ''}
              ${scene.shooting_tip ? `
                <div>
                  <div style="font-size: 11px; color: #6B7280; margin-bottom: 4px;">💡 ${t('촬영 팁', '撮影ヒント', 'Shooting Tip')}</div>
                  <div style="background: #FEF3C7; padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.4; color: #92400E;">${scene.shooting_tip}</div>
                </div>
              ` : ''}
            </td>
          </tr>
        </table>
      `).join('')

      const requiredDialoguesHtml = guide_content.required_dialogues?.filter(d => d?.trim()).length > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 16px;">
              <div style="font-weight: bold; font-size: 14px; color: #1F2937; margin-bottom: 10px;">🎯 ${t('필수 대사', '必須セリフ', 'Required Dialogues')}</div>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.6;">
                ${guide_content.required_dialogues.filter(d => d?.trim()).map(d => `<li style="margin-bottom: 6px;">${d}</li>`).join('')}
              </ul>
            </td>
          </tr>
        </table>
      ` : ''

      const requiredScenesHtml = guide_content.required_scenes?.filter(s => s?.trim()).length > 0 ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 16px;">
              <div style="font-weight: bold; font-size: 14px; color: #1F2937; margin-bottom: 10px;">📸 ${t('필수 촬영 씬', '必須撮影シーン', 'Required Scenes')}</div>
              <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.6;">
                ${guide_content.required_scenes.filter(s => s?.trim()).map(s => `<li style="margin-bottom: 6px;">${s}</li>`).join('')}
              </ul>
            </td>
          </tr>
        </table>
      ` : ''

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${guide_content.campaign_title} - Creator Guide</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .mso-padding { padding: 20px !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 480px) {
      .mobile-padding { padding: 12px !important; }
      .mobile-text { font-size: 14px !important; }
      .mobile-title { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Wrapper Table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 16px;">
        <!-- Content Container -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%); padding: 24px 20px; border-radius: 16px 16px 0 0; text-align: center;">
              <div class="mobile-title" style="color: white; margin: 0; font-size: 24px; font-weight: bold; line-height: 1.2;">${t('촬영 가이드', 'Creator Guide', 'Creator Guide')}</div>
              <div style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 14px; line-height: 1.4;">
                ${guide_content.campaign_title}
              </div>
              ${guide_content.brand_name ? `<div style="color: rgba(255,255,255,0.7); margin-top: 4px; font-size: 12px;">by ${guide_content.brand_name}</div>` : ''}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="background: #F9FAFB; padding: 20px; border-radius: 0 0 16px 16px;">
              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 16px;">
                    <div class="mobile-text" style="font-size: 14px; color: #1F2937; line-height: 1.6;">
                      ${t(
                        `${creatorName}님, 안녕하세요!<br><br>"${guide_content.campaign_title}" 캠페인에 참여해 주셔서 감사합니다.<br>아래 촬영 가이드를 확인해 주세요.`,
                        `${creatorName}様、こんにちは！<br><br>このたびは「${guide_content.campaign_title}」キャンペーンにご参加いただき、誠にありがとうございます。<br>以下の撮影ガイドをご確認ください。`,
                        `Hi ${creatorName}!<br><br>Thank you for participating in the "${guide_content.campaign_title}" campaign.<br>Please review the shooting guide below.`
                      )}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Disclaimer Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 12px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 14px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" valign="top">
                          <div style="width: 22px; height: 22px; background: #F59E0B; border-radius: 50%; text-align: center; line-height: 22px; color: white; font-weight: bold; font-size: 12px;">!</div>
                        </td>
                        <td valign="top" style="padding-left: 8px;">
                          <div style="font-weight: 600; color: #92400E; font-size: 13px; margin-bottom: 4px;">
                            ${t('안내사항', '注意事項', 'Notice')}
                          </div>
                          <div style="color: #B45309; font-size: 12px; line-height: 1.5;">
                            ${t(
                              '이 가이드는 100% 동일하게 촬영하는 것이 아니라, 크리에이터님의 스타일에 맞게 변경하여 촬영하실 수 있습니다.',
                              'このガイドは100%同一に撮影するものではなく、クリエイターのスタイルに合わせて変更して撮影することができます。',
                              'This guide does not need to be followed exactly. Feel free to adapt the content to match your personal style.'
                            )}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Style Info -->
              ${(guide_content.dialogue_style || guide_content.tempo || guide_content.mood) ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 16px;">
                    <div style="font-weight: bold; font-size: 14px; color: #1F2937; margin-bottom: 12px;">🎬 ${t('영상 스타일', '動画スタイル', 'Video Style')}</div>
                    <div>
                      ${guide_content.dialogue_style ? `
                        <span style="display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 5px 10px; border-radius: 16px; font-size: 12px; margin: 0 4px 6px 0;">
                          ${t('스타일', 'スタイル', 'Style')}: ${guide_content.dialogue_style}
                        </span>
                      ` : ''}
                      ${guide_content.tempo ? `
                        <span style="display: inline-block; background: #D1FAE5; color: #065F46; padding: 5px 10px; border-radius: 16px; font-size: 12px; margin: 0 4px 6px 0;">
                          ${t('템포', 'テンポ', 'Tempo')}: ${guide_content.tempo}
                        </span>
                      ` : ''}
                      ${guide_content.mood ? `
                        <span style="display: inline-block; background: #FEE2E2; color: #991B1B; padding: 5px 10px; border-radius: 16px; font-size: 12px; margin: 0 4px 6px 0;">
                          ${t('분위기', '雰囲気', 'Mood')}: ${guide_content.mood}
                        </span>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Required Elements -->
              ${requiredDialoguesHtml}
              ${requiredScenesHtml}

              ${guide_content.scenes.length > 0 ? `
              <!-- Scenes Title -->
              <div style="font-size: 16px; font-weight: bold; color: #1F2937; margin-bottom: 12px;">
                📋 ${t('촬영 씬 구성', '撮影シーン一覧', 'Scene Breakdown')} (${guide_content.scenes.length} ${t('씬', 'シーン', 'Scenes')})
              </div>

              <!-- Scene Cards -->
              ${sceneCards}
              ` : ''}

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: white; border-radius: 12px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <div style="color: #6B7280; font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
                      ${t(
                        '문의사항이 있으시면 언제든지 연락 주세요.',
                        'ご不明な点がございましたら、お気軽にお問い合わせください。',
                        'If you have any questions, please feel free to contact us.'
                      )}
                    </div>
                    <div style="color: #9CA3AF; font-size: 11px;">
                      © ${new Date().getFullYear()} CNEC BIZ
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
        const emailHtml = generateEmailHtml(creator.name || getLocaleText(region, '크리에이터', 'Creator', 'Creator'))
        const subject = getLocaleText(
          region,
          `[크넥] 촬영 가이드 - ${guide_content.campaign_title}`,
          `【撮影ガイド】${guide_content.campaign_title}`,
          `[Creator Guide] ${guide_content.campaign_title}`
        )

        await transporter.sendMail({
          from: `"CNEC BIZ" <${gmailUser}>`,
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
