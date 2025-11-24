/**
 * 영상 수정 요청 알림 발송
 * 크리에이터에게 알림톡 + 이메일 발송
 */

const { createClient } = require('@supabase/supabase-js')
const popbill = require('popbill')
const nodemailer = require('nodemailer')

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Popbill 설정
const LinkID = process.env.POPBILL_LINK_ID
const SecretKey = process.env.POPBILL_SECRET_KEY
const CorpNum = process.env.POPBILL_CORP_NUM
const UserID = process.env.POPBILL_USER_ID

// Popbill 서비스 초기화
const kakaoService = popbill.KakaoService(LinkID, SecretKey)

// Gmail 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cnecbiz@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD
  }
})

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
            title,
            companies (
              company_name
            )
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
    const companyName = submission.applications?.campaigns?.companies?.company_name || '기업'

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

    const results = {
      kakao: null,
      email: null
    }

    // 3. 카카오톡 알림톡 발송
    if (creatorPhone) {
      try {
        const templateCode = '025100001016' // 영상 수정 요청 템플릿
        
        // 요청일과 재제출기한 계산
        const now = new Date()
        const requestDate = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')
        
        // 재제출기한: 3일 후
        const resubmitDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        const resubmitDate = resubmitDeadline.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')
        
        const variables = {
          '크리에이터명': creatorName,
          '캠페인명': campaignTitle,
          '요청일': requestDate,
          '재제출기한': resubmitDate
        }

        console.log('[INFO] Sending Kakao notification:', { creatorPhone, templateCode, variables })

        await new Promise((resolve, reject) => {
          kakaoService.sendATS(
            CorpNum,
            templateCode,
            '1833-6025', // 발신번호
            creatorPhone, // 수신번호
            '', // 대체문자 내용 (빈 문자열)
            '', // 예약전송일시
            '', // 수신자명
            JSON.stringify(variables), // 템플릿 변수 (JSON 문자열)
            '', // 광고전송여부
            '', // 전송요청번호
            '', // 버튼URL
            UserID,
            (response) => {
              if (response.code === 1) {
                console.log('[SUCCESS] Kakao notification sent:', response)
                results.kakao = { success: true, data: response }
                resolve(response)
              } else {
                console.error('[ERROR] Kakao notification failed:', response)
                results.kakao = { success: false, error: response.message }
                reject(new Error(response.message))
              }
            }
          )
        })
      } catch (kakaoError) {
        console.error('[ERROR] Kakao notification error:', kakaoError)
        results.kakao = { success: false, error: kakaoError.message }
      }
    } else {
      console.log('[SKIP] No phone number for Kakao notification')
    }

    // 4. 이메일 발송
    if (creatorEmail) {
      try {
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
                <a href="https://cnec-kr.netlify.app/video-review/${submissionId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">수정 요청 확인하기</a>
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

        console.log('[INFO] Sending email to:', creatorEmail)

        const emailResult = await transporter.sendMail({
          from: '"CNEC" <cnecbiz@gmail.com>',
          to: creatorEmail,
          subject: emailSubject,
          html: emailHtml
        })

        console.log('[SUCCESS] Email sent:', emailResult)
        results.email = { success: true, messageId: emailResult.messageId }
      } catch (emailError) {
        console.error('[ERROR] Email error:', emailError)
        results.email = { success: false, error: emailError.message }
      }
    } else {
      console.log('[SKIP] No email address for email notification')
    }

    // 5. 알림 발송 기록 저장
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
        results
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
