const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 매시간 가입 여부 재확인
exports.handler = async (event) => {
  console.log('[scheduled-openclo-registration-check] Starting...')

  try {
    // 미가입 + 이메일 있는 크리에이터 조회
    const { data: creators } = await supabase
      .from('oc_creators')
      .select('id, email, region')
      .eq('is_registered', false)
      .not('email', 'is', null)
      .neq('contact_status', 'no_response')

    if (!creators || creators.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: true, checked: 0, converted: 0 }) }
    }

    let converted = 0

    for (const creator of creators) {
      // auth.users에서 확인
      const { data: users } = await supabase.auth.admin.listUsers()
      const authUser = users?.users?.find(u => u.email === creator.email)

      // companies 테이블에서도 확인
      const { data: company } = await supabase
        .from('companies')
        .select('user_id')
        .eq('email', creator.email)
        .maybeSingle()

      const userId = authUser?.id || company?.user_id

      if (userId) {
        await supabase.from('oc_creators').update({
          is_registered: true,
          registered_user_id: userId,
          contact_status: 'registered'
        }).eq('id', creator.id)

        await supabase.from('oc_contact_logs').insert({
          creator_id: creator.id,
          type: 'system',
          direction: 'inbound',
          result: 'registered',
          content: '가입 확인 (매시간 체크)'
        })

        // KPI 업데이트
        const today = new Date().toISOString().split('T')[0]
        const { data: kpi } = await supabase.from('oc_daily_kpi')
          .select('*').eq('date', today).eq('region', creator.region).maybeSingle()

        if (kpi) {
          await supabase.from('oc_daily_kpi').update({
            new_registrations: (kpi.new_registrations || 0) + 1
          }).eq('id', kpi.id)
        } else {
          await supabase.from('oc_daily_kpi').insert({
            date: today, region: creator.region, new_registrations: 1
          })
        }

        converted++
      }
    }

    console.log(`[scheduled-openclo-registration-check] Checked: ${creators.length}, Converted: ${converted}`)

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, checked: creators.length, converted })
    }
  } catch (error) {
    console.error('[scheduled-openclo-registration-check] Error:', error)
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

module.exports.config = { schedule: '0 * * * *' }
