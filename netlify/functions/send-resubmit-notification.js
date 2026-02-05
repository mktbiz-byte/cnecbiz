/**
 * 크리에이터 영상 재제출 알림 발송
 * 기업에게 알림톡 + 이메일 발송
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification } = require('./send-notification-helper')

// Supabase 클라이언트 초기화
// Korea DB - 크리에이터/캠페인 데이터
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

// BIZ DB - 기업 데이터 (회사 정보는 여기에 있음)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL
const bizKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseBiz = bizUrl && bizKey ? createClient(bizUrl, bizKey) : null

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
    const { submissionId } = JSON.parse(event.body)

    if (!submissionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'submissionId is required' })
      }
    }

    console.log('[INFO] Sending resubmit notification for submission:', submissionId)

    // 1. submission 정보 조회 (company_email 포함)
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('video_submissions')
      .select(`
        *,
        applications (
          applicant_name,
          campaigns (
            id,
            title,
            company_name,
            company_id,
            company_email
          )
        )
      `)
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      console.error('[ERROR] Submission not found:', submissionError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Submission not found' })
      }
    }

    const campaignTitle = submission.applications?.campaigns?.title || '캠페인'
    const companyNameFromCampaign = submission.applications?.campaigns?.company_name || '기업'
    const creatorName = submission.applications?.applicant_name || '크리에이터'
    const companyId = submission.applications?.campaigns?.company_id
    const companyEmailFromCampaign = submission.applications?.campaigns?.company_email

    console.log('[INFO] Campaign company info:', { companyId, companyEmailFromCampaign })

    // 2. 기업 담당자 정보 조회
    // ★ 캠페인 이관 후에도 올바른 기업에게 알림이 가도록 company_email 우선 사용
    let companyPhone = null
    let companyEmail = null
    let companyContactName = companyNameFromCampaign
    let companyName = companyNameFromCampaign

    // 1순위: BIZ DB에서 company_email로 조회 (이관된 캠페인의 경우 이 값이 최신)
    if (companyEmailFromCampaign && supabaseBiz) {
      const { data: bizCompany, error: bizError } = await supabaseBiz
        .from('companies')
        .select('company_name, phone, email')
        .eq('email', companyEmailFromCampaign)
        .maybeSingle()

      console.log('[INFO] BIZ DB (email) lookup:', { bizCompany, error: bizError?.message })

      if (bizCompany) {
        companyPhone = bizCompany.phone
        companyEmail = bizCompany.email
        companyName = bizCompany.company_name || companyName
        companyContactName = bizCompany.company_name || companyContactName
      }
    }

    // 2순위: BIZ DB에서 company_id(user_id)로 조회
    if (!companyPhone && companyId && supabaseBiz) {
      const { data: bizCompanyById, error: bizError2 } = await supabaseBiz
        .from('companies')
        .select('company_name, phone, email')
        .eq('user_id', companyId)
        .maybeSingle()

      console.log('[INFO] BIZ DB (user_id) lookup:', { bizCompanyById, error: bizError2?.message })

      if (bizCompanyById) {
        companyPhone = bizCompanyById.phone
        companyEmail = bizCompanyById.email
        companyName = bizCompanyById.company_name || companyName
        companyContactName = bizCompanyById.company_name || companyContactName
      }
    }

    // 3순위: Korea DB companies 테이블에서 조회 (레거시)
    if (!companyPhone && companyEmailFromCampaign) {
      const { data: koreaCompany, error: koreaError } = await supabaseAdmin
        .from('companies')
        .select('company_name, contact_person, contact_phone, contact_email, phone, email')
        .eq('email', companyEmailFromCampaign)
        .maybeSingle()

      console.log('[INFO] Korea DB (email) lookup:', { koreaCompany, error: koreaError?.message })

      if (koreaCompany) {
        companyPhone = koreaCompany.contact_phone || koreaCompany.phone
        companyEmail = koreaCompany.contact_email || koreaCompany.email
        companyName = koreaCompany.company_name || companyName
        companyContactName = koreaCompany.contact_person || koreaCompany.company_name || companyContactName
      }
    }

    // 4순위: Korea DB에서 company_id로 조회 (기존 로직 유지)
    if (!companyPhone && companyId) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('company_name, contact_person, contact_phone, contact_email, phone, email')
        .eq('id', companyId)
        .maybeSingle()

      console.log('[INFO] Korea DB (id) lookup:', { company, error: companyError?.message })

      if (company) {
        companyPhone = company.contact_phone || company.phone
        companyEmail = company.contact_email || company.email
        companyName = company.company_name || companyName
        companyContactName = company.contact_person || company.company_name || companyContactName
      }
    }

    if (!companyPhone && !companyEmail) {
      console.error('[ERROR] Company contact info not found')
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Company contact info not found' })
      }
    }

    console.log('[INFO] Company contact:', { companyPhone, companyEmail })

    // 3. 알림톡 + 이메일 발송
    const templateCode = '025100001008' // 영상 제출 템플릿
    const variables = {
      '회사명': companyName,
      '캠페인명': campaignTitle,
      '크리에이터명': creatorName
    }

    console.log('[INFO] Notification params:', { companyPhone, companyEmail, templateCode, variables })

    // 이메일 HTML 생성
    const emailSubject = `[CNEC] ${campaignTitle} - 크리에이터가 수정된 영상을 제출했습니다`
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">CNEC</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">영상 재제출 알림</p>
        </div>
        
        <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin-top: 0;">🎬 ${companyName}님, 수정된 영상이 제출되었습니다</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            안녕하세요, ${companyName}님!<br><br>
            <strong>${campaignTitle}</strong> 캠페인의 크리에이터 <strong>${creatorName}</strong>님이 수정된 영상을 제출했습니다.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📋 제출 정보</h3>
            <ul style="color: #4b5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
              <li><strong>캠페인:</strong> ${campaignTitle}</li>
              <li><strong>크리에이터:</strong> ${creatorName}</li>
              <li><strong>제출일:</strong> ${new Date().toLocaleString('ko-KR')}</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            관리자 페이지에서 영상을 검토하시고, 추가 수정 사항이 있으면 피드백을 남겨주세요.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cnectotal.netlify.app/video-review/${submissionId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">영상 검토하기</a>
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

    // 알림 발송을 비동기로 처리 (타임아웃 방지)
    sendNotification({
      receiverNum: companyPhone,
      receiverEmail: companyEmail,
      receiverName: companyContactName,
      templateCode,
      variables,
      emailSubject,
      emailHtml
    }).then(result => {
      console.log('[SUCCESS] Notification sent:', result)
    }).catch(error => {
      console.error('[ERROR] Notification failed:', error)
    })

    // 4. DB 상태 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('video_submissions')
      .update({ 
        status: 'under_review',
        resubmit_notified_at: new Date().toISOString()
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
        message: '수정 완료 알림이 전송되었습니다.'
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
