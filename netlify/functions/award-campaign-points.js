const { createClient } = require('@supabase/supabase-js')

// 리전별 Supabase 클라이언트 (service role key - RLS 우회)
const getRegionClient = (region) => {
  switch (region) {
    case 'japan':
    case 'jp':
      return createClient(
        process.env.VITE_SUPABASE_JAPAN_URL,
        process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    case 'us':
    case 'usa':
      return createClient(
        process.env.VITE_SUPABASE_US_URL,
        process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      )
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

    // 1. user_profiles에서 현재 포인트 조회 (user_id 우선 → id fallback)
    let profile = null
    let profileMatchField = 'id'

    // user_id 우선 시도 (Supabase Auth UUID가 더 일반적)
    const { data: profileByUserId } = await supabase
      .from('user_profiles')
      .select('id, points, user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileByUserId) {
      profile = profileByUserId
      profileMatchField = 'user_id'
    } else {
      // fallback: id로 시도
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
    const baseTxData = {
      user_id: profileMatchField === 'user_id' ? userId : (profile.user_id || userId),
      amount: pointAmount,
      transaction_type: 'campaign_payment',
      description: `캠페인 완료: ${campaignTitle || ''}`,
      related_campaign_id: campaignId,
      created_at: new Date().toISOString()
    }

    // 리전별 컬럼 추가
    const txData = { ...baseTxData }
    if (region === 'japan' || region === 'jp') {
      txData.region = 'jp'
    } else if (region === 'us' || region === 'usa') {
      txData.platform_region = 'us'
      txData.country_code = 'US'
    } else {
      txData.platform_region = 'kr'
      txData.country_code = 'KR'
    }

    let txError = null
    const { error: firstTxError } = await supabase
      .from('point_transactions')
      .insert(txData)

    if (firstTxError) {
      console.warn(`[award-campaign-points] point_transactions insert 실패 (리전 컬럼 포함), 기본 데이터로 재시도:`, firstTxError.message)
      // 리전 컬럼 없이 재시도
      const { error: retryError } = await supabase
        .from('point_transactions')
        .insert(baseTxData)
      if (retryError) {
        console.error(`[award-campaign-points] point_transactions 재시도도 실패:`, retryError)
        txError = retryError
      } else {
        console.log(`[award-campaign-points] Transaction recorded (without region columns) for userId=${userId}, campaign=${campaignId}`)
      }
    } else {
      console.log(`[award-campaign-points] Transaction recorded for userId=${userId}, campaign=${campaignId}`)
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
