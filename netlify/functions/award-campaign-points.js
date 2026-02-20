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
      campaignTitle
    } = JSON.parse(event.body)

    if (!userId || !pointAmount || !campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '필수 파라미터 누락: userId, pointAmount, campaignId' })
      }
    }

    const supabase = getRegionClient(region || 'korea')

    // 1. user_profiles에서 현재 포인트 조회 (id 또는 user_id로 시도)
    let profile = null
    let profileMatchField = 'id'

    const { data: profileById } = await supabase
      .from('user_profiles')
      .select('id, points')
      .eq('id', userId)
      .maybeSingle()

    if (profileById) {
      profile = profileById
      profileMatchField = 'id'
    } else {
      const { data: profileByUserId } = await supabase
        .from('user_profiles')
        .select('id, points, user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileByUserId) {
        profile = profileByUserId
        profileMatchField = 'user_id'
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
    const txData = {
      user_id: userId,
      amount: pointAmount,
      transaction_type: 'campaign_payment',
      description: `캠페인 완료: ${campaignTitle || ''}`,
      related_campaign_id: campaignId,
      created_at: new Date().toISOString()
    }

    // 일본 DB: region 컬럼 / 한국·미국 DB: platform_region + country_code
    if (region === 'japan' || region === 'jp') {
      txData.region = 'jp'
    } else if (region === 'us' || region === 'usa') {
      txData.platform_region = 'us'
      txData.country_code = 'US'
    } else {
      txData.platform_region = 'kr'
      txData.country_code = 'KR'
    }

    const { error: txError } = await supabase
      .from('point_transactions')
      .insert(txData)

    if (txError) {
      console.error(`[award-campaign-points] point_transactions insert failed:`, txError)
      // 포인트는 이미 업데이트됨 - 이력 저장 실패는 경고만
    } else {
      console.log(`[award-campaign-points] Transaction recorded for userId=${userId}, campaign=${campaignId}`)
    }

    // 네이버 웍스 알림 발송
    try {
      // 크리에이터 이름 조회
      let creatorName = '크리에이터'
      const { data: creatorProfile } = await supabase
        .from('user_profiles')
        .select('name, full_name, nickname')
        .eq('id', userId)
        .maybeSingle()
      if (creatorProfile) {
        creatorName = creatorProfile.nickname || creatorProfile.name || creatorProfile.full_name || '크리에이터'
      }

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
