/**
 * 캠페인 최종 확정 관리 - 디버그용 API
 * 테이블 구조와 샘플 데이터 확인
 */

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { action, userId, campaignId } = JSON.parse(event.body || '{}')

    // Korea DB 연결
    const supabaseKorea = createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY
    )

    if (action === 'check_tables') {
      // 각 테이블의 컬럼 구조와 샘플 데이터 확인
      const results = {}

      // 1. video_submissions 샘플
      const { data: submissions, error: subErr } = await supabaseKorea
        .from('video_submissions')
        .select('*')
        .not('final_confirmed_at', 'is', null)
        .limit(3)

      results.video_submissions = {
        error: subErr?.message,
        count: submissions?.length || 0,
        sample: submissions?.[0] || null,
        columns: submissions?.[0] ? Object.keys(submissions[0]) : []
      }

      // 2. user_profiles 샘플
      const { data: profiles, error: profErr } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .limit(3)

      results.user_profiles = {
        error: profErr?.message,
        count: profiles?.length || 0,
        sample: profiles?.[0] || null,
        columns: profiles?.[0] ? Object.keys(profiles[0]) : []
      }

      // 3. applications 샘플
      const { data: apps, error: appErr } = await supabaseKorea
        .from('applications')
        .select('*')
        .limit(3)

      results.applications = {
        error: appErr?.message,
        count: apps?.length || 0,
        sample: apps?.[0] || null,
        columns: apps?.[0] ? Object.keys(apps[0]) : []
      }

      // 4. campaigns 샘플
      const { data: camps, error: campErr } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .limit(3)

      results.campaigns = {
        error: campErr?.message,
        count: camps?.length || 0,
        sample: camps?.[0] || null,
        columns: camps?.[0] ? Object.keys(camps[0]) : []
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, results })
      }
    }

    if (action === 'check_specific') {
      // 특정 user_id와 campaign_id로 데이터 조회
      const results = {}

      // video_submissions에서 조회
      const { data: sub } = await supabaseKorea
        .from('video_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .maybeSingle()

      results.video_submission = sub

      // user_profiles에서 user_id로 조회
      const { data: profile1 } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      results.profile_by_user_id = profile1

      // user_profiles에서 id로 조회
      const { data: profile2 } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      results.profile_by_id = profile2

      // applications에서 조회
      const { data: app } = await supabaseKorea
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .maybeSingle()

      results.application = app

      // campaigns에서 조회
      const { data: camp } = await supabaseKorea
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle()

      results.campaign = camp

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, results })
      }
    }

    if (action === 'check_all_submissions') {
      // final_confirmed_at이 있는 모든 submissions의 user_id 목록
      const { data: submissions } = await supabaseKorea
        .from('video_submissions')
        .select('id, user_id, campaign_id, final_confirmed_at')
        .not('final_confirmed_at', 'is', null)
        .limit(100)

      const userIds = [...new Set((submissions || []).map(s => s.user_id))]
      const campaignIds = [...new Set((submissions || []).map(s => s.campaign_id))]

      // user_profiles 전체 조회 (user_id 매칭)
      const { data: profiles1 } = await supabaseKorea
        .from('user_profiles')
        .select('id, user_id, name, channel_name, nickname, email')
        .in('user_id', userIds)

      // user_profiles 전체 조회 (id 매칭)
      const { data: profiles2 } = await supabaseKorea
        .from('user_profiles')
        .select('id, user_id, name, channel_name, nickname, email')
        .in('id', userIds)

      // applications 조회
      const { data: apps } = await supabaseKorea
        .from('applications')
        .select('id, user_id, campaign_id, name, channel_name, nickname, email')
        .in('user_id', userIds)

      // campaigns 조회
      const { data: camps } = await supabaseKorea
        .from('campaigns')
        .select('id, title, brand')
        .in('id', campaignIds)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          submissions_count: submissions?.length || 0,
          unique_user_ids: userIds.length,
          unique_campaign_ids: campaignIds.length,
          profiles_by_user_id: profiles1?.length || 0,
          profiles_by_id: profiles2?.length || 0,
          applications_count: apps?.length || 0,
          campaigns_count: camps?.length || 0,
          sample_user_ids: userIds.slice(0, 5),
          sample_campaign_ids: campaignIds.slice(0, 5),
          sample_profiles1: profiles1?.slice(0, 3),
          sample_profiles2: profiles2?.slice(0, 3),
          sample_apps: apps?.slice(0, 3),
          sample_campaigns: camps?.slice(0, 3)
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action. Use: check_tables, check_specific, check_all_submissions' })
    }

  } catch (error) {
    console.error('Debug error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
