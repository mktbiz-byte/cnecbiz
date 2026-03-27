const { createClient } = require('@supabase/supabase-js')

// 리전별 Supabase 클라이언트 (service role key - RLS 우회)
const getRegionClient = (region) => {
  switch (region) {
    case 'japan':
    case 'jp': {
      const url = process.env.VITE_SUPABASE_JAPAN_URL
      const key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      if (!url || !key) {
        console.error(`[award-campaign-points] Japan DB 환경변수 누락: URL=${!!url}, KEY=${!!key}`)
        throw new Error('Japan DB 환경변수 미설정 (VITE_SUPABASE_JAPAN_URL / SUPABASE_JAPAN_SERVICE_ROLE_KEY)')
      }
      return createClient(url, key)
    }
    case 'us':
    case 'usa': {
      const url = process.env.VITE_SUPABASE_US_URL
      const key = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      if (!url || !key) {
        console.error(`[award-campaign-points] US DB 환경변수 누락: URL=${!!url}, KEY=${!!key}`)
        throw new Error('US DB 환경변수 미설정 (VITE_SUPABASE_US_URL / SUPABASE_US_SERVICE_ROLE_KEY)')
      }
      return createClient(url, key)
    }
    case 'korea':
    case 'kr':
    default:
      return createClient(
        process.env.VITE_SUPABASE_KOREA_URL,
        process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      )
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const {
      region,
      userId,
      pointAmount,
      campaignId,
      campaignTitle,
      creatorName: passedCreatorName,
      applicationId
    } = JSON.parse(event.body)

    if (!userId || !pointAmount || !campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '필수 파라미터 누락: userId, pointAmount, campaignId' })
      }
    }

    const supabase = getRegionClient(region || 'korea')

    // 1. user_profiles에서 현재 포인트 조회
    // ⚠️ Korea DB user_profiles에는 user_id 컬럼이 없음 (id = auth user id)
    // Japan/US DB에는 user_id 컬럼이 있음
    let profile = null
    let profileMatchField = 'id'
    const isKorea = !region || region === 'korea' || region === 'kr'

    if (isKorea) {
      // Korea: id = auth user id (user_id 컬럼 없음)
      const { data: profileById } = await supabase
        .from('user_profiles')
        .select('id, points')
        .eq('id', userId)
        .maybeSingle()

      if (profileById) {
        profile = profileById
        profileMatchField = 'id'
      }
    } else {
      // Japan/US: user_id 컬럼 존재 → user_id 우선 시도, id fallback
      const { data: profileByUserId } = await supabase
        .from('user_profiles')
        .select('id, points, user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileByUserId) {
        profile = profileByUserId
        profileMatchField = 'user_id'
      } else {
        const { data: profileById } = await supabase
          .from('user_profiles')
          .select('id, points')
          .eq('id', userId)
          .maybeSingle()

        if (profileById) {
          profile = profileById
          profileMatchField = 'id'
        }
      }
    }

    if (!profile) {
      console.error(`[award-campaign-points] user_profiles not found for userId=${userId}, region=${region}`)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: `크리에이터 프로필을 찾을 수 없습니다 (userId: ${userId})` })
      }
    }

    // 2. 포인트 업데이트
    const currentPoints = profile.points || 0
    const newPoints = currentPoints + pointAmount

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ points: newPoints })
      .eq(profileMatchField, userId)

    if (updateError) {
      console.error(`[award-campaign-points] user_profiles update failed:`, updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: `포인트 업데이트 실패: ${updateError.message}` })
      }
    }

    console.log(`[award-campaign-points] Points updated: ${currentPoints} → ${newPoints} for userId=${userId}`)

    // 3. point_transactions에 이력 저장 (지역별 컬럼 구조 대응)
    // JP: user_id, amount, transaction_type, description, reference_id, reference_type, created_by, region
    // US: user_id, application_id, campaign_id, amount, transaction_type, description, status, platform_region, reference_id, reference_type
    // Korea: user_id, amount, transaction_type, description, related_campaign_id, platform_region, country_code
    const txUserId = profileMatchField === 'user_id' ? userId : (profile.user_id || userId)
    const isJapan = region === 'japan' || region === 'jp'
    const isUS = region === 'us' || region === 'usa'

    let txData = {}
    if (isJapan) {
      txData = {
        user_id: txUserId,
        amount: pointAmount,
        transaction_type: 'campaign_payment',
        description: `캠페인 완료: ${campaignTitle || ''}`,
        reference_id: applicationId || campaignId,
        reference_type: 'campaign',
        created_by: 'system',
        region: 'JP',
        created_at: new Date().toISOString()
      }
    } else if (isUS) {
      txData = {
        user_id: txUserId,
        application_id: applicationId || null,
        campaign_id: campaignId,
        amount: pointAmount,
        transaction_type: 'campaign_payment',
        description: `캠페인 완료: ${campaignTitle || ''}`,
        status: 'completed',
        platform_region: 'US',
        reference_id: applicationId || campaignId,
        reference_type: 'campaign',
        created_at: new Date().toISOString()
      }
    } else {
      txData = {
        user_id: txUserId,
        amount: pointAmount,
        transaction_type: 'campaign_payment',
        description: `캠페인 완료: ${campaignTitle || ''}`,
        related_campaign_id: campaignId,
        platform_region: 'kr',
        country_code: 'KR',
        created_at: new Date().toISOString()
      }
    }

    let txError = null
    const { error: firstTxError } = await supabase
      .from('point_transactions')
      .insert(txData)

    if (firstTxError) {
      console.error(`[award-campaign-points] point_transactions insert 실패:`, firstTxError.message)
      txError = firstTxError
    } else {
      console.log(`[award-campaign-points] Transaction recorded for userId=${userId}, campaign=${campaignId}, region=${region}`)
    }

    // 4. application 상태를 completed로 업데이트 (applicationId가 전달된 경우)
    if (applicationId) {
      const { error: appUpdateError } = await supabase
        .from('applications')
        .update({ status: 'completed' })
        .eq('id', applicationId)
      if (appUpdateError) {
        console.warn(`[award-campaign-points] application status 업데이트 실패 (id=${applicationId}):`, appUpdateError.message)
      } else {
        console.log(`[award-campaign-points] Application ${applicationId} status → completed`)
      }
    }

    // 네이버 웍스 알림 발송
    try {
      // 크리에이터 이름 조회
      let creatorName = passedCreatorName || ''

      // 1) 프론트에서 전달받은 이름이 없으면 user_profiles에서 조회
      if (!creatorName) {
        const { data: creatorProfile } = await supabase
          .from('user_profiles')
          .select('name, full_name, nickname, channel_name')
          .eq(profileMatchField, userId)
          .maybeSingle()
        if (creatorProfile) {
          creatorName = creatorProfile.nickname || creatorProfile.channel_name || creatorProfile.name || creatorProfile.full_name || ''
        }
      }

      // 2) 여전히 이름이 없으면 applications 테이블에서 조회
      if (!creatorName) {
        const { data: appData } = await supabase
          .from('applications')
          .select('creator_name, applicant_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (appData) {
          creatorName = appData.creator_name || appData.applicant_name || ''
        }
      }

      if (!creatorName) creatorName = '크리에이터'

      const regionLabel = { korea: '한국', kr: '한국', japan: '일본', jp: '일본', us: '미국', usa: '미국' }[region] || region || '한국'
      const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

      await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `💰 캠페인 포인트 지급 완료\n\n• 크리에이터: ${creatorName}\n• 캠페인: ${campaignTitle || ''}\n• 지급 금액: ${pointAmount.toLocaleString()}P\n• 잔액: ${newPoints.toLocaleString()}P\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
        })
      })
      console.log('[award-campaign-points] 네이버 웍스 알림 발송 완료')
    } catch (worksError) {
      console.error('[award-campaign-points] 네이버 웍스 알림 오류:', worksError)
    }

    // 5. 기업에게 최종확정 알림 발송 (카카오톡 + 이메일) — 모든 리전 공통
    try {
      const bizClient = createClient(
        process.env.VITE_SUPABASE_BIZ_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      // 캠페인에서 기업 정보 조회
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('title, campaign_name, company_biz_id, company_id, company_email')
        .eq('id', campaignId)
        .maybeSingle()

      if (campaign) {
        let company = null

        // company_biz_id → companies.id (BIZ DB)
        if (campaign.company_biz_id) {
          const { data: c } = await bizClient
            .from('companies')
            .select('company_name, notification_phone, phone, notification_email, email, notification_contact_person')
            .eq('id', campaign.company_biz_id)
            .maybeSingle()
          if (c) company = c
        }

        // company_email → companies.email (BIZ DB)
        if (!company && campaign.company_email) {
          const { data: c } = await bizClient
            .from('companies')
            .select('company_name, notification_phone, phone, notification_email, email, notification_contact_person')
            .eq('email', campaign.company_email)
            .maybeSingle()
          if (c) company = c
        }

        // company_id → companies.id or user_id (BIZ DB)
        if (!company && campaign.company_id) {
          const { data: c } = await bizClient
            .from('companies')
            .select('company_name, notification_phone, phone, notification_email, email, notification_contact_person')
            .eq('id', campaign.company_id)
            .maybeSingle()
          if (c) company = c

          if (!company) {
            const { data: c2 } = await bizClient
              .from('companies')
              .select('company_name, notification_phone, phone, notification_email, email, notification_contact_person')
              .eq('user_id', campaign.company_id)
              .maybeSingle()
            if (c2) company = c2
          }
        }

        if (company) {
          const companyPhone = company.notification_phone || company.phone
          const companyEmail = company.notification_email || company.email
          const campaignDisplayTitle = campaign.title || campaign.campaign_name || '캠페인'
          const creatorDisplayName = creatorName || '크리에이터'
          const baseUrl = process.env.URL || 'https://cnecbiz.com'

          // 카카오 알림톡 발송 (기업에게 최종확정 알림)
          if (companyPhone) {
            try {
              await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: companyPhone,
                  receiverName: company.notification_contact_person || company.company_name,
                  templateCode: '025100001009',
                  variables: {
                    '회사명': company.company_name || '고객사',
                    '캠페인명': campaignDisplayTitle,
                    '크리에이터명': creatorDisplayName
                  }
                })
              })
              console.log('[award-campaign-points] 기업 카카오 알림톡 발송 완료')
            } catch (kakaoErr) {
              console.error('[award-campaign-points] 기업 카카오 알림톡 실패:', kakaoErr.message)
            }
          }

          // 이메일 발송 (기업에게)
          if (companyEmail) {
            try {
              await fetch(`${baseUrl}/.netlify/functions/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: companyEmail,
                  subject: `[CNEC] 캠페인 최종 확정 완료 - ${campaignDisplayTitle}`,
                  html: `
                    <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #6C5CE7;">캠페인 크리에이터 최종 확정 완료</h2>
                      <p>${company.company_name || '고객사'}님, 캠페인의 크리에이터 최종 확정이 완료되었습니다.</p>
                      <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>캠페인:</strong> ${campaignDisplayTitle}</p>
                        <p><strong>크리에이터:</strong> ${creatorDisplayName}</p>
                      </div>
                      <p>
                        <a href="${baseUrl}/company/campaigns/${campaignId}"
                           style="background-color: #6C5CE7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                          캠페인 상세 보기
                        </a>
                      </p>
                    </div>
                  `
                })
              })
              console.log('[award-campaign-points] 기업 이메일 발송 완료')
            } catch (emailErr) {
              console.error('[award-campaign-points] 기업 이메일 실패:', emailErr.message)
            }
          }
        } else {
          console.log('[award-campaign-points] 기업 정보를 찾을 수 없어 기업 알림 스킵')
        }
      }
    } catch (companyNotifError) {
      console.error('[award-campaign-points] 기업 알림 발송 오류:', companyNotifError.message)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        previousPoints: currentPoints,
        newPoints: newPoints,
        pointAmount: pointAmount,
        transactionRecorded: !txError
      })
    }
  } catch (error) {
    console.error('[award-campaign-points] Error:', error)

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'award-campaign-points',
          errorMessage: error.message,
          context: { body: event.body?.substring(0, 500) }
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
