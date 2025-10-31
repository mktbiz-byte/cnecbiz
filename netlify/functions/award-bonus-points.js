const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { campaign_id, creator_id, base_amount } = JSON.parse(event.body)

    if (!campaign_id || !creator_id || !base_amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' })
      }
    }

    // 1. 크리에이터가 소속 크리에이터인지 확인
    const { data: creator, error: creatorError } = await supabaseBiz
      .from('creators')
      .select('is_affiliated, user_id, name')
      .eq('id', creator_id)
      .single()

    if (creatorError) throw creatorError

    if (!creator.is_affiliated) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: '소속 크리에이터가 아니므로 보너스 지급 대상이 아닙니다.',
          bonus_awarded: false
        })
      }
    }

    // 2. 보너스 비율 가져오기
    const { data: setting, error: settingError } = await supabaseBiz
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'affiliated_bonus_rate')
      .single()

    if (settingError) {
      console.error('보너스 비율 조회 오류:', settingError)
      // 기본값 10% 사용
    }

    const bonusRate = setting ? parseFloat(setting.setting_value) : 10
    const bonusAmount = Math.round(base_amount * (bonusRate / 100))

    // 3. 이미 보너스가 지급되었는지 확인
    const { data: existingBonus, error: checkError } = await supabaseBiz
      .from('creator_points')
      .select('id')
      .eq('creator_id', creator_id)
      .eq('campaign_id', campaign_id)
      .eq('type', 'bonus')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('기존 보너스 확인 오류:', checkError)
    }

    if (existingBonus) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: '이미 보너스가 지급되었습니다.',
          bonus_awarded: false
        })
      }
    }

    // 4. 보너스 포인트 지급
    const { data: bonusPoint, error: bonusError } = await supabaseBiz
      .from('creator_points')
      .insert({
        creator_id: creator_id,
        campaign_id: campaign_id,
        amount: bonusAmount,
        type: 'bonus',
        description: `소속 크리에이터 보너스 ${bonusRate}% 지급`,
        status: 'completed'
      })
      .select()
      .single()

    if (bonusError) throw bonusError

    // 5. 크리에이터 포인트 잔액 업데이트
    const { data: currentPoints, error: pointsError } = await supabaseBiz
      .from('creators')
      .select('points')
      .eq('id', creator_id)
      .single()

    if (pointsError) throw pointsError

    const newPoints = (currentPoints.points || 0) + bonusAmount

    const { error: updateError } = await supabaseBiz
      .from('creators')
      .update({ points: newPoints })
      .eq('id', creator_id)

    if (updateError) throw updateError

    // 6. 알림 발송 (선택)
    try {
      await supabaseBiz.from('notifications').insert({
        user_id: creator.user_id,
        title: '🎉 보너스 포인트 지급',
        message: `소속 크리에이터 보너스로 ${bonusAmount.toLocaleString()}P가 지급되었습니다! (${bonusRate}%)`,
        type: 'point',
        is_read: false
      })
    } catch (notifError) {
      console.error('알림 발송 오류:', notifError)
      // 알림 실패는 무시
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '보너스 포인트가 지급되었습니다.',
        bonus_awarded: true,
        bonus_amount: bonusAmount,
        bonus_rate: bonusRate,
        creator_name: creator.name,
        new_total_points: newPoints
      })
    }
  } catch (error) {
    console.error('보너스 지급 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '보너스 지급 중 오류가 발생했습니다.',
        details: error.message 
      })
    }
  }
}

