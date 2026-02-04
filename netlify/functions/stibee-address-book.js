/**
 * 스티비(Stibee) 주소록 관리
 * - 주소록 목록 조회
 * - 주소록에 구독자 추가
 * - 주소록 구독자 수 조회
 * - 주소록 구독자 대상 템플릿 메일 발송
 *
 * Stibee API v1: https://api.stibee.com/v1
 */

const { createClient } = require('@supabase/supabase-js')

const STIBEE_API_URL = 'https://api.stibee.com/v1'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function getApiKey() {
  // 1. 환경변수에서 먼저 확인
  let apiKey = process.env.STIBEE_API_KEY
  if (apiKey) return apiKey

  // 2. 환경변수에 없으면 DB에서 가져오기 (api_keys 테이블)
  const supabase = getSupabase()
  if (supabase) {
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service_name', 'stibee')
      .eq('is_active', true)
      .maybeSingle()

    apiKey = apiKeyData?.api_key
  }

  return apiKey
}

function stibeeHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'AccessToken': apiKey
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const apiKey = await getApiKey()
    if (!apiKey) {
      throw new Error('STIBEE_API_KEY가 설정되지 않았습니다. 관리자 페이지 → 뉴스레터 쇼케이스에서 API 키를 등록해주세요.')
    }

    const { action, listId, subscribers, templateId } = JSON.parse(event.body)

    // 1. 주소록 목록 조회
    if (action === 'lists') {
      let allLists = []
      const LIMIT = 100
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await fetch(`${STIBEE_API_URL}/lists?offset=${offset}&limit=${LIMIT}`, {
          method: 'GET',
          headers: stibeeHeaders(apiKey)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`주소록 조회 실패: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const lists = data.Value || data.value || []

        if (Array.isArray(lists) && lists.length > 0) {
          allLists = allLists.concat(lists)
          offset += LIMIT
          if (lists.length < LIMIT) hasMore = false
        } else {
          hasMore = false
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          lists: allLists.map(l => ({
            id: l.id || l.listId,
            name: l.name || l.title || '이름 없음',
            subscriberCount: l.subscriberCount || l.subscriber_count || 0
          }))
        })
      }
    }

    // 2. 주소록에 구독자 추가
    if (action === 'add_subscribers') {
      if (!listId) throw new Error('주소록 ID가 필요합니다.')
      if (!subscribers || subscribers.length === 0) throw new Error('추가할 구독자가 없습니다.')

      console.log(`[stibee-address-book] Adding ${subscribers.length} subscribers to list ${listId}`)

      // 스티비는 한 번에 최대 100명 추가 가능
      const BATCH_SIZE = 100
      const results = { success: 0, update: 0, failDuplicate: 0, failUnknown: 0, errors: [] }

      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE)

        const response = await fetch(`${STIBEE_API_URL}/lists/${listId}/subscribers`, {
          method: 'POST',
          headers: stibeeHeaders(apiKey),
          body: JSON.stringify({
            eventOccuredBy: 'MANUAL',
            confirmEmailYN: 'N',
            subscribers: batch.map(s => ({
              email: s.email,
              name: s.name || ''
            }))
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, errorText)
          results.errors.push(`Batch ${i / BATCH_SIZE + 1}: ${errorText}`)
          continue
        }

        const data = await response.json()
        const value = data.Value || data.value || {}

        results.success += (value.success || []).length
        results.update += (value.update || []).length
        results.failDuplicate += (value.failDuplicate || []).length
        results.failUnknown += (value.failUnknown || []).length

        // Rate limiting
        if (i + BATCH_SIZE < subscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      console.log(`[stibee-address-book] Results:`, results)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          results,
          message: `신규 ${results.success}명, 업데이트 ${results.update}명, 중복 ${results.failDuplicate}명`
        })
      }
    }

    // 3. 주소록 구독자 조회
    if (action === 'get_subscribers') {
      if (!listId) throw new Error('주소록 ID가 필요합니다.')

      let allSubscribers = []
      const LIMIT = 100
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `${STIBEE_API_URL}/lists/${listId}/subscribers?offset=${offset}&limit=${LIMIT}`,
          { method: 'GET', headers: stibeeHeaders(apiKey) }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`구독자 조회 실패: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const subs = data.Value || data.value || []

        if (Array.isArray(subs) && subs.length > 0) {
          allSubscribers = allSubscribers.concat(subs)
          offset += LIMIT
          if (subs.length < LIMIT) hasMore = false
        } else {
          hasMore = false
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          subscribers: allSubscribers.map(s => ({
            email: s.email,
            name: s.name || ''
          })),
          total: allSubscribers.length
        })
      }
    }

    // 4. 주소록 구독자 대상 템플릿 메일 발송
    if (action === 'send_to_list') {
      if (!listId) throw new Error('주소록 ID가 필요합니다.')
      if (!templateId) throw new Error('템플릿 ID가 필요합니다.')

      console.log(`[stibee-address-book] Sending template ${templateId} to list ${listId}`)

      // 먼저 주소록의 구독자 목록 가져오기
      let allSubscribers = []
      const LIMIT = 100
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await fetch(
          `${STIBEE_API_URL}/lists/${listId}/subscribers?offset=${offset}&limit=${LIMIT}`,
          { method: 'GET', headers: stibeeHeaders(apiKey) }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`구독자 조회 실패: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const subs = data.Value || data.value || []

        if (Array.isArray(subs) && subs.length > 0) {
          allSubscribers = allSubscribers.concat(subs)
          offset += LIMIT
          if (subs.length < LIMIT) hasMore = false
        } else {
          hasMore = false
        }
      }

      if (allSubscribers.length === 0) {
        throw new Error('주소록에 구독자가 없습니다.')
      }

      console.log(`[stibee-address-book] Found ${allSubscribers.length} subscribers, sending emails...`)

      // 각 구독자에게 트랜잭셔널 이메일 발송
      const sendResults = { sent: 0, failed: 0, errors: [] }

      for (const subscriber of allSubscribers) {
        try {
          const response = await fetch(`${STIBEE_API_URL}/emails/send`, {
            method: 'POST',
            headers: stibeeHeaders(apiKey),
            body: JSON.stringify({
              email: subscriber.email,
              name: subscriber.name || '',
              templateId: parseInt(templateId),
              variables: {
                name: subscriber.name || '크리에이터',
                email: subscriber.email
              }
            })
          })

          const result = await response.json()

          if (response.ok && result.Ok) {
            sendResults.sent++
          } else {
            sendResults.failed++
            sendResults.errors.push({
              email: subscriber.email,
              error: result.Error || result.message || 'Unknown error'
            })
          }
        } catch (err) {
          sendResults.failed++
          sendResults.errors.push({
            email: subscriber.email,
            error: err.message
          })
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[stibee-address-book] Send results: ${sendResults.sent} sent, ${sendResults.failed} failed`)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          results: sendResults,
          message: `${sendResults.sent}명 발송 완료, ${sendResults.failed}명 실패`
        })
      }
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (error) {
    console.error('[stibee-address-book] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
