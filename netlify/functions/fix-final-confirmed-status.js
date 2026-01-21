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
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
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

    // 1. 포인트 지급 내역 조회 (campaign_complete 타입)
    let pointData = []

    const { data: pointHistory, error: pointError } = await supabaseBiz
      .from('point_history')
      .select('user_id, campaign_id, created_at')
      .eq('type', 'campaign_complete')

    if (pointError || !pointHistory || pointHistory.length === 0) {
      console.log('point_history 조회 실패 또는 비어있음, point_transactions 시도')
      // point_transactions 테이블 시도
      const { data: pointTx, error: txError } = await supabaseBiz
        .from('point_transactions')
        .select('user_id, related_campaign_id, created_at')
        .eq('type', 'earn')
        .ilike('description', '%캠페인 완료%')

      if (txError) {
        console.log('point_transactions 조회도 실패:', txError.message)
      } else {
        // point_transactions 데이터를 point_history 형태로 변환
        pointData = (pointTx || []).map(tx => ({
          user_id: tx.user_id,
          campaign_id: tx.related_campaign_id,
          created_at: tx.created_at
        }))
      }
    } else {
      pointData = pointHistory
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
