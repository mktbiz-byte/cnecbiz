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

    // 1. Korea DB의 applications에서 status='completed'인 것 조회
    // 포인트는 별도 테이블이 아니라 applications 기반으로 계산됨
    const { data: completedApps, error: appError } = await supabaseKorea
      .from('applications')
      .select('id, user_id, campaign_id, updated_at, created_at')
      .eq('status', 'completed')

    if (appError) {
      console.log('applications 조회 실패:', appError.message)
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: appError.message })
      }
    }

    const pointData = (completedApps || []).map(app => ({
      user_id: app.user_id,
      campaign_id: app.campaign_id,
      created_at: app.updated_at || app.created_at,
      application_id: app.id
    })).filter(p => p.user_id && p.campaign_id)

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

    // 2. 각 application에 대해 video_submissions 업데이트 및 applications에 final_confirmed_at 설정
    let debugSubmissions = []

    for (const point of pointData) {
      if (!point.user_id || !point.campaign_id) continue

      // Korea DB의 video_submissions 조회
      const { data: submissions, error: subError } = await supabaseKorea
        .from('video_submissions')
        .select('id, final_confirmed_at, status, user_id, campaign_id')
        .eq('user_id', point.user_id)
        .eq('campaign_id', point.campaign_id)

      debugSubmissions.push({
        user_id: point.user_id,
        campaign_id: point.campaign_id,
        submissions_found: submissions?.length || 0,
        error: subError?.message,
        submissions: submissions?.map(s => ({ id: s.id, status: s.status, final_confirmed_at: s.final_confirmed_at }))
      })

      if (subError) {
        console.log(`video_submissions 조회 실패:`, subError.message)
        continue
      }

      // video_submissions가 있으면 final_confirmed_at 업데이트
      for (const sub of (submissions || [])) {
        if (!sub.final_confirmed_at) {
          const { error: updateError } = await supabaseKorea
            .from('video_submissions')
            .update({
              status: 'completed',
              final_confirmed_at: point.created_at
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

      // Korea DB의 applications에도 final_confirmed_at 설정
      const { error: appUpdateError } = await supabaseKorea
        .from('applications')
        .update({ final_confirmed_at: point.created_at })
        .eq('id', point.application_id)
        .is('final_confirmed_at', null)

      if (!appUpdateError) {
        results.applicationsUpdated++
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
        results,
        debugSubmissions: debugSubmissions.slice(0, 5) // 처음 5개만
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
