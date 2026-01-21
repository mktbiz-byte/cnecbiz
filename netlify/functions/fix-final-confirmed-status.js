// 일회성 수정 스크립트: 포인트가 지급된 video_submissions의 final_confirmed_at 설정
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  // GET 또는 POST 허용
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const results = {
      pointHistoryChecked: 0,
      submissionsUpdated: 0,
      applicationsUpdated: 0,
      details: []
    }

    // 1. 포인트 지급 내역 조회 - 여러 테이블/조건 시도
    let pointData = []
    let debugInfo = {}

    // 먼저 point_history 테이블 확인
    const { data: allHistory, error: histError } = await supabaseBiz
      .from('point_history')
      .select('*')
      .limit(5)
    debugInfo.point_history_sample = allHistory
    debugInfo.point_history_error = histError?.message

    // point_transactions 테이블 확인
    const { data: allTx, error: txErr } = await supabaseBiz
      .from('point_transactions')
      .select('*')
      .limit(5)
    debugInfo.point_transactions_sample = allTx
    debugInfo.point_transactions_error = txErr?.message

    // points 테이블 확인 (캠페인 완료 관련)
    const { data: pointsData, error: pointsErr } = await supabaseBiz
      .from('points')
      .select('*')
      .or('type.ilike.%완료%,reason.ilike.%완료%,description.ilike.%완료%')

    debugInfo.points_sample = pointsData?.slice(0, 5)
    debugInfo.points_error = pointsErr?.message

    if (pointsData && pointsData.length > 0) {
      pointData = pointsData.map(p => ({
        user_id: p.user_id,
        campaign_id: p.campaign_id || p.related_campaign_id,
        created_at: p.created_at
      })).filter(p => p.user_id && p.campaign_id)
    }

    // 데이터가 없으면 디버그 정보 반환
    if (pointData.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: '포인트 지급 내역을 찾을 수 없습니다. 디버그 정보를 확인하세요.',
          debugInfo
        })
      }
    }

    results.pointHistoryChecked = pointData.length
    console.log(`포인트 지급 내역: ${results.pointHistoryChecked}건`)

    if (pointData.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: '포인트 지급 내역이 없습니다.',
          results
        })
      }
    }

    // 2. 각 포인트 지급 내역에 대해 video_submissions 업데이트
    for (const point of pointData) {
      if (!point.user_id || !point.campaign_id) continue

      // Korea DB의 video_submissions 업데이트
      const { data: submissions, error: subError } = await supabaseKorea
        .from('video_submissions')
        .select('id, final_confirmed_at, status')
        .eq('user_id', point.user_id)
        .eq('campaign_id', point.campaign_id)

      if (subError) {
        console.log(`video_submissions 조회 실패 (user: ${point.user_id}):`, subError.message)
        continue
      }

      // final_confirmed_at이 없는 submission들 업데이트
      for (const sub of (submissions || [])) {
        if (!sub.final_confirmed_at) {
          const { error: updateError } = await supabaseKorea
            .from('video_submissions')
            .update({
              status: 'completed',
              final_confirmed_at: point.created_at // 포인트 지급 시간 사용
            })
            .eq('id', sub.id)

          if (!updateError) {
            results.submissionsUpdated++
            results.details.push({
              type: 'video_submission',
              id: sub.id,
              user_id: point.user_id,
              campaign_id: point.campaign_id
            })
          }
        }
      }

      // BIZ DB의 applications도 업데이트
      const { data: apps, error: appError } = await supabaseBiz
        .from('applications')
        .select('id, final_confirmed_at, status')
        .eq('user_id', point.user_id)
        .eq('campaign_id', point.campaign_id)

      if (!appError && apps) {
        for (const app of apps) {
          if (!app.final_confirmed_at) {
            const { error: updateAppError } = await supabaseBiz
              .from('applications')
              .update({
                status: 'completed',
                final_confirmed_at: point.created_at
              })
              .eq('id', app.id)

            if (!updateAppError) {
              results.applicationsUpdated++
              results.details.push({
                type: 'application',
                id: app.id,
                user_id: point.user_id,
                campaign_id: point.campaign_id
              })
            }
          }
        }
      }
    }

    console.log(`업데이트 완료: submissions=${results.submissionsUpdated}, applications=${results.applicationsUpdated}`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `final_confirmed_at 수정 완료`,
        results
      })
    }
  } catch (error) {
    console.error('[fix-final-confirmed-status] Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
