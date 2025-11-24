/**
 * 영상 수정 요청 알림 발송
 * 크리에이터에게 알림톡 + 이메일 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification, generateEmailHtml } = require('./send-notification-helper')

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { submissionId, feedbackCount } = JSON.parse(event.body)

    if (!submissionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'submissionId is required' })
      }
    }

    console.log('[INFO] Sending video review notification for submission:', submissionId)

    // 1. 영상 제출 정보 조회 (크리에이터 정보 포함)
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('video_submissions')
      .select(`
        *,
        applications (
          applicant_name,
          applicant_email,
          applicant_phone,
          campaigns (
            title
          )
        )
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error('[ERROR] Failed to fetch submission:', submissionError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Submission not found' })
      }
    }

    const creatorName = submission.applications?.applicant_name || '크리에이터'
    const creatorEmail = submission.applications?.applicant_email
    const creatorPhone = submission.applications?.applicant_phone
    const campaignTitle = submission.applications?.campaigns?.title || '캠페인'

    console.log('[INFO] Creator info:', { creatorName, creatorEmail, creatorPhone })

    // 2. 피드백 목록 조회
    const { data: feedbacks, error: feedbackError } = await supabaseAdmin
      .from('video_review_comments')
      .select('timestamp, comment')
      .eq('submission_id', submissionId)
      .order('timestamp', { ascending: true })

    if (feedbackError) {
      console.error('[ERROR] Failed to fetch feedbacks:', feedbackError)
    }

    const feedbackList = feedbacks || []
    const feedbackSummary = feedbackList
      .map((fb, idx) => {
        const mins = Math.floor(fb.timestamp / 60)
        const secs = Math.floor(fb.timestamp % 60)
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`
        return `${idx + 1}. [${timeStr}] ${fb.comment}`
      })
      .join('\n')

    // 3. 알림톡 + 이메일 발송
    const templateCode = '025100001016' // 영상 수정 요청 템플릿 (새로 등록 필요)
    const variables = {
      '크리에이터명': creatorName,
      '캠페인명': campaignTitle,
      '피드백개수': feedbackCount || feedbackList.length
    }

    // 이메일 HTML 생성
    const emailSubject = `[CNEC] ${campaignTitle} - 영상 수정 요청이 도착했습니다`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">CNEC</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">영상 수정 요청</p>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">📹 ${creatorName}님, 영상 수정 요청이 도착했습니다</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            안녕하세요, ${creatorName}님!<br><br>
            <strong>${campaignTitle}</strong> 캠페인 영상에 대한 수정 요청이 접수되었습니다.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📝 수정 요청 사항 (${feedbackList.length}개)</h3>
            <div style="color: #4b5563; line-height: 1.8; white-space: pre-wrap; font-family: monospace; font-size: 13px;">
${feedbackSummary || '수정 요청 사항을 확인해주세요.'}
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            크리에이터 대시보드에서 수정 사항을 확인하시고, 영상을 재업로드해 주세요.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cnectotal.netlify.app/video-review/${submissionId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">수정 요청 확인하기</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            문의사항이 있으시면 <a href="tel:1833-6025" style="color: #667eea; text-decoration: none;">1833-6025</a>로 연락주세요.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2025 CNEC. All rights reserved.</p>
        </div>
      </div>
    `

    const notificationResult = await sendNotification({
      receiverNum: creatorPhone,
      receiverEmail: creatorEmail,
      receiverName: creatorName,
      templateCode,
      variables,
      emailSubject,
      emailHtml
    })

    console.log('[SUCCESS] Notification sent:', notificationResult)

    // 4. 알림 발송 기록 저장 (선택사항)
    const { error: updateError } = await supabaseAdmin
      .from('video_submissions')
      .update({ 
        review_sent_at: new Date().toISOString(),
        status: 'revision_requested'
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('[ERROR] Failed to update submission status:', updateError)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '수정 요청이 전달되었습니다.',
        notification: notificationResult
      })
    }
  } catch (error) {
    console.error('[ERROR] Failed to send notification:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send notification',
        details: error.message 
      })
    }
  }
}
