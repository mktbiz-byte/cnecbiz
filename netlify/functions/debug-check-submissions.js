const { createClient } = require('@supabase/supabase-js')

const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  try {
    const campaignId = '9cfda048-3e4f-40ab-9f7f-833a7874bb9e'

    // 1. 캠페인 정보
    const { data: campaign } = await supabaseKorea
      .from('campaigns')
      .select('id, title, campaign_type')
      .eq('id', campaignId)
      .single()

    // 2. applications 조회
    const { data: applications } = await supabaseKorea
      .from('applications')
      .select('id, user_id, status, applicant_name, creator_name')
      .eq('campaign_id', campaignId)
      .in('status', ['filming', 'selected', 'guide_approved', 'approved', 'virtual_selected'])

    // 3. video_submissions 조회 - 모든 필드
    const { data: submissions, error } = await supabaseKorea
      .from('video_submissions')
      .select('*')
      .eq('campaign_id', campaignId)

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    // 4. user_profiles로 이름 매핑
    const userIds = [...new Set([
      ...(applications || []).map(a => a.user_id),
      ...(submissions || []).map(s => s.user_id)
    ])].filter(Boolean)

    const { data: profiles } = await supabaseKorea
      .from('user_profiles')
      .select('id, name, channel_name')
      .in('id', userIds)

    const profileMap = {}
    ;(profiles || []).forEach(p => { profileMap[p.id] = p })

    // 5. 결과 정리
    const result = {
      campaign: campaign,
      applicationsCount: (applications || []).length,
      applications: (applications || []).map(a => ({
        user_id: a.user_id,
        name: profileMap[a.user_id]?.channel_name || profileMap[a.user_id]?.name || a.applicant_name || a.creator_name,
        status: a.status
      })),
      submissionsCount: (submissions || []).length,
      submissions: (submissions || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        user_name: profileMap[s.user_id]?.channel_name || profileMap[s.user_id]?.name,
        status: s.status,
        // 주차/스텝 관련 모든 필드
        week: s.week,
        week_number: s.week_number,
        video_number: s.video_number,
        step: s.step,
        // 타입 확인
        week_type: typeof s.week,
        week_number_type: typeof s.week_number,
        video_number_type: typeof s.video_number,
        created_at: s.created_at
      })),
      // 첫 번째 submission의 모든 키
      allKeys: submissions && submissions[0] ? Object.keys(submissions[0]) : []
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result, null, 2)
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    }
  }
}
