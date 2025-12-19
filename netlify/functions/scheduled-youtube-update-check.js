/**
 * YouTube 크리에이터 업데이트 체크 스케줄러
 * 7일 이상 업데이트되지 않은 채널을 확인하고 관리자에게 이메일 알림 발송
 *
 * Netlify Scheduled Function으로 매일 실행
 */

const { createClient } = require('@supabase/supabase-js')
const nodemailer = require('nodemailer')
const axios = require('axios')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 관리자 이메일 (환경변수로 설정 가능)
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'mkt_biz@cnec.co.kr'
const GMAIL_EMAIL = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr'
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

// YouTube API로 채널의 최신 영상 날짜 확인
async function getLastVideoDate(channelId, apiKey) {
  try {
    // 채널의 업로드 플레이리스트 ID 가져오기
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'contentDetails',
        id: channelId,
        key: apiKey
      }
    })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return null
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads

    // 최신 영상 1개만 가져오기
    const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 1,
        key: apiKey
      }
    })

    if (playlistResponse.data.items && playlistResponse.data.items.length > 0) {
      return new Date(playlistResponse.data.items[0].snippet.publishedAt)
    }

    return null
  } catch (error) {
    console.error(`YouTube API 오류 (채널 ${channelId}):`, error.message)
    return null
  }
}

// 이메일 발송
async function sendAlertEmail(overdueCreators) {
  if (!GMAIL_APP_PASSWORD) {
    console.error('GMAIL_APP_PASSWORD 환경변수가 설정되지 않았습니다.')
    return false
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_EMAIL,
      pass: GMAIL_APP_PASSWORD.trim().replace(/\s/g, '')
    }
  })

  const creatorList = overdueCreators.map(c => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${c.creator_name}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${c.platform}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${c.daysSinceUpdate}일 전
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${c.lastVideoDate ? new Date(c.lastVideoDate).toLocaleDateString('ko-KR') : '확인 불가'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <a href="${c.platform_url}" style="color: #2563eb;">채널 방문</a>
      </td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
        .alert-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .btn { display: inline-block; background: #2563eb; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ YouTube 업데이트 알림</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">7일 이상 영상 업로드가 없는 크리에이터</p>
        </div>
        <div class="content">
          <div class="alert-box">
            <strong>알림:</strong> ${overdueCreators.length}명의 크리에이터가 7일 이상 새 영상을 업로드하지 않았습니다.
          </div>

          <table>
            <thead>
              <tr>
                <th>크리에이터</th>
                <th>플랫폼</th>
                <th>마지막 업데이트</th>
                <th>최근 영상</th>
                <th>링크</th>
              </tr>
            </thead>
            <tbody>
              ${creatorList}
            </tbody>
          </table>

          <p style="color: #6b7280; font-size: 14px;">
            지원 프로그램 크리에이터의 콘텐츠 활동을 확인하고 필요시 연락해주세요.
          </p>

          <a href="https://cnectotal.netlify.app/admin/creator-management" class="btn">
            크리에이터 관리 페이지 →
          </a>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            이 알림은 CNECBIZ 크리에이터 관리 시스템에서 자동 발송되었습니다.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const mailOptions = {
    from: `"CNECBIZ 알림" <${GMAIL_EMAIL}>`,
    to: ADMIN_EMAIL,
    subject: `[CNECBIZ] ⚠️ ${overdueCreators.length}명의 크리에이터 업데이트 필요`,
    html: html
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('알림 이메일 발송 완료:', info.messageId)
    return true
  } catch (error) {
    console.error('이메일 발송 오류:', error)
    return false
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  console.log('[YouTube Update Check] 시작:', new Date().toISOString())

  try {
    // 1. 모든 YouTube 크리에이터 조회
    const { data: creators, error } = await supabase
      .from('affiliated_creators')
      .select('*')
      .eq('platform', 'youtube')
      .eq('is_active', true)

    if (error) {
      throw error
    }

    if (!creators || creators.length === 0) {
      console.log('[YouTube Update Check] 등록된 YouTube 크리에이터가 없습니다.')
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: '등록된 크리에이터 없음', checked: 0 })
      }
    }

    console.log(`[YouTube Update Check] ${creators.length}명의 크리에이터 확인 중...`)

    const now = new Date()
    const overdueCreators = []

    // 2. 각 크리에이터의 최신 영상 날짜 확인
    for (const creator of creators) {
      let lastVideoDate = null
      let daysSinceUpdate = 999

      // API 키가 있는 경우 YouTube API로 확인
      if (creator.youtube_api_key && creator.platform_id) {
        lastVideoDate = await getLastVideoDate(creator.platform_id, creator.youtube_api_key)

        if (lastVideoDate) {
          daysSinceUpdate = Math.floor((now - lastVideoDate) / (1000 * 60 * 60 * 24))
        }
      } else if (creator.updated_at) {
        // API 키가 없는 경우 마지막 업데이트 날짜로 확인
        daysSinceUpdate = Math.floor((now - new Date(creator.updated_at)) / (1000 * 60 * 60 * 24))
      }

      // 7일 이상 업데이트 없음
      if (daysSinceUpdate >= 7) {
        overdueCreators.push({
          ...creator,
          daysSinceUpdate,
          lastVideoDate
        })

        // DB에 알림 로그 기록
        await supabase
          .from('creator_update_alerts')
          .upsert({
            creator_id: creator.id,
            days_since_update: daysSinceUpdate,
            last_video_date: lastVideoDate,
            alerted_at: now.toISOString()
          }, {
            onConflict: 'creator_id'
          })
      }
    }

    console.log(`[YouTube Update Check] ${overdueCreators.length}명이 7일 이상 미업데이트`)

    // 3. 미업데이트 크리에이터가 있으면 이메일 발송
    let emailSent = false
    if (overdueCreators.length > 0) {
      emailSent = await sendAlertEmail(overdueCreators)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        checked: creators.length,
        overdue: overdueCreators.length,
        emailSent,
        overdueCreators: overdueCreators.map(c => ({
          name: c.creator_name,
          daysSinceUpdate: c.daysSinceUpdate
        }))
      })
    }

  } catch (error) {
    console.error('[YouTube Update Check] 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}

// Netlify Scheduled Function 설정
// netlify.toml에 추가:
// [functions."scheduled-youtube-update-check"]
// schedule = "0 9 * * *"  # 매일 오전 9시 실행
