const { createClient } = require('@supabase/supabase-js')

const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
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
    const { email, name } = JSON.parse(event.body || '{}')

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '이메일을 입력해주세요.' })
      }
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '올바른 이메일 형식이 아닙니다.' })
      }
    }

    const supabaseBiz = getSupabase()

    // API 키 가져오기
    let STIBEE_API_KEY = process.env.STIBEE_API_KEY
    if (!STIBEE_API_KEY && supabaseBiz) {
      const { data: apiKeyData } = await supabaseBiz
        .from('api_keys')
        .select('api_key')
        .eq('service_name', 'stibee')
        .eq('is_active', true)
        .maybeSingle()
      STIBEE_API_KEY = apiKeyData?.api_key
    }

    // 기본 리스트 ID 가져오기 (환경변수 또는 DB에서)
    let listId = process.env.STIBEE_DEFAULT_LIST_ID
    if (!listId && supabaseBiz) {
      const { data: settingData } = await supabaseBiz
        .from('site_settings')
        .select('value')
        .eq('key', 'stibee_default_list_id')
        .maybeSingle()
      listId = settingData?.value
    }

    if (!STIBEE_API_KEY) {
      // API 키가 없으면 DB에만 저장
      console.log('No Stibee API key, saving to DB only')
    }

    // Supabase에 구독자 저장 (백업용)
    if (supabaseBiz) {
      await supabaseBiz
        .from('newsletter_subscribers')
        .upsert({
          email: email.toLowerCase(),
          name: name || null,
          subscribed_at: new Date().toISOString(),
          source: 'website'
        }, { onConflict: 'email' })
    }

    // 스티비에 구독자 추가
    if (STIBEE_API_KEY && listId) {
      const stibeeResponse = await fetch(`https://api.stibee.com/v1/lists/${listId}/subscribers`, {
        method: 'POST',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventOccuredBy: 'SUBSCRIBER',
          confirmEmailYN: 'N',
          subscribers: [{
            email: email.toLowerCase(),
            name: name || ''
          }]
        })
      })

      if (!stibeeResponse.ok) {
        const errorText = await stibeeResponse.text()
        console.error('Stibee API error:', stibeeResponse.status, errorText)

        // 이미 구독 중인 경우도 성공으로 처리
        if (stibeeResponse.status === 409 || errorText.includes('already')) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: '이미 구독 중입니다.',
              alreadySubscribed: true
            })
          }
        }
      } else {
        const result = await stibeeResponse.json()
        console.log('Stibee subscribe result:', JSON.stringify(result))
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '구독이 완료되었습니다! 감사합니다.'
      })
    }

  } catch (error) {
    console.error('Subscribe error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '구독 처리 중 오류가 발생했습니다.'
      })
    }
  }
}
