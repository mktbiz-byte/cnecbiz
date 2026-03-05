/**
 * 크리에이터 영상 재제출 알림 발송
 * 기업에게 알림톡 + 이메일 발송
 * 멀티-리전 지원 (Korea, Japan, US)
 */

const { createClient } = require('@supabase/supabase-js')
const { sendNotification } = require('./send-notification-helper')

// 리전별 Supabase 클라이언트 생성 헬퍼
function getRegionalClient(region) {
  let url, key
  switch (region) {
    case 'japan':
      url = process.env.VITE_SUPABASE_JAPAN_URL
      key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
      url = process.env.VITE_SUPABASE_US_URL
      key = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    case 'korea':
    default:
      url = process.env.VITE_SUPABASE_KOREA_URL
      key = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      break
  }
  if (!url || !key) return null
  return createClient(url, key)
}

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
    const { submissionId, region: bodyRegion } = JSON.parse(event.body)

    if (!submissionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'submissionId is required' })
      }
    }

    // 리전 판별: body > query parameter > 기본값 korea
    const queryParams = event.queryStringParameters || {}
    const region = bodyRegion || queryParams.region || 'korea'

    console.log(`[INFO] Sending resubmit notification for submission: ${submissionId} (region: ${region})`)

    // 리전별 Supabase 클라이언트 생성
    const supabaseAdmin = getRegionalClient(region)
    if (!supabaseAdmin) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `${region} Supabase 환경변수가 설정되지 않았습니다.` })
      }
    }

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
            company_biz_id,
            company_email,
            company_phone
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
    const companyBizId = submission.applications?.campaigns?.company_biz_id
    const companyEmailFromCampaign = submission.applications?.campaigns?.company_email
    const companyPhoneFromCampaign = submission.applications?.campaigns?.company_phone

    console.log('[INFO] Campaign company info:', { companyId, companyBizId, companyEmailFromCampaign })

    // 2. 기업 담당자 정보 조회 (리전 DB 우선 → BIZ DB 폴백)
    // ★ 캠페인 이관 후에도 올바른 기업에게 알림이 가도록 리전 DB 우선 조회
    let companyPhone = null
    let companyEmail = null
    let companyContactName = companyNameFromCampaign
    let companyName = companyNameFromCampaign

    const selectFields = 'company_name, notification_phone, notification_email, notification_contact_person, phone, email, contact_phone, contact_email, contact_person'

    const applyCompanyResult = (comp, source) => {
      if (!comp) return false
      const phone = comp.notification_phone || comp.phone || comp.contact_phone
      const email = comp.notification_email || comp.email || comp.contact_email
      if (phone || email) {
        if (phone && !companyPhone) companyPhone = phone
        if (email && !companyEmail) companyEmail = email
        companyName = comp.company_name || companyName
        companyContactName = comp.notification_contact_person || comp.contact_person || comp.company_name || companyContactName
        console.log(`[INFO] Company found via ${source}:`, { phone, email, name: comp.company_name })
        return !!phone
      }
      return false
    }

    // ★ 1순위: company_biz_id로 BIZ DB 조회 (백필된 정확한 매칭 — AdminCampaignDetail.jsx와 동일)
    if (!companyPhone && companyBizId && supabaseBiz) {
      const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', companyBizId).maybeSingle()
      applyCompanyResult(data, 'biz_id_via_company_biz_id')
    }

    // 2순위: BIZ DB에서 company_email로 조회
    if (!companyPhone && companyEmailFromCampaign && supabaseBiz) {
      const { data } = await supabaseBiz.from('companies').select(selectFields).eq('email', companyEmailFromCampaign).maybeSingle()
      applyCompanyResult(data, 'biz_email')
    }

    // 3순위: BIZ DB에서 company_id (user_id)로 조회
    if (!companyPhone && companyId && supabaseBiz) {
      const { data } = await supabaseBiz.from('companies').select(selectFields).eq('user_id', companyId).maybeSingle()
      applyCompanyResult(data, 'biz_user_id')
    }

    // 4순위: BIZ DB에서 company_id (id)로 조회 (legacy)
    if (!companyPhone && companyId && supabaseBiz) {
      const { data } = await supabaseBiz.from('companies').select(selectFields).eq('id', companyId).maybeSingle()
      applyCompanyResult(data, 'biz_id')
    }

    // 5순위: 리전 DB에서 company_email로 조회 (fallback)
    if (!companyPhone && companyEmailFromCampaign) {
      const { data } = await supabaseAdmin.from('companies').select(selectFields).eq('email', companyEmailFromCampaign).maybeSingle()
      applyCompanyResult(data, 'regional_email')
    }

    // 6순위: 리전 DB에서 company_id (user_id)로 조회 (fallback)
    if (!companyPhone && companyId) {
      const { data } = await supabaseAdmin.from('companies').select(selectFields).eq('user_id', companyId).maybeSingle()
      applyCompanyResult(data, 'regional_user_id')
    }

    // ★ campaign.company_phone 직접 사용하지 않음 — 관리자 번호 발송 방지
    // (캠페인 생성 시 관리자 번호가 company_phone에 저장되는 경우가 있음)
    if (!companyPhone && companyPhoneFromCampaign) {
      console.warn('[INFO] company_biz_id/email/id 매칭 실패. campaign.company_phone 직접 사용 스킵 (관리자 번호 방지):', companyPhoneFromCampaign)
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
            <a href="https://cnecbiz.com/video-review/${submissionId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">영상 검토하기</a>
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

    // 4. 네이버 웍스 알림 발송
    const siteLabel = { 'korea': 'cnec.co.kr', 'japan': 'cnec.jp', 'us': 'cnec.us' }[region] || region
    try {
      await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `📹 영상 재제출 알림 (${siteLabel})\n\n캠페인: ${campaignTitle}\n크리에이터: ${creatorName}\n리전: ${region.toUpperCase()}\n제출 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
        })
      })
      console.log('[SUCCESS] 네이버 웍스 알림 발송 완료')
    } catch (worksError) {
      console.error('[ERROR] 네이버 웍스 알림 발송 실패:', worksError)
    }

    // 5. DB 상태 업데이트
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
        message: `수정 완료 알림이 전송되었습니다. (${region})`
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
