const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트는 핸들러 내부에서 생성 (환경변수 확인 후)
const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

exports.handler = async (event) => {
  // CORS 헤더
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
    const supabaseBiz = getSupabase()
    if (!supabaseBiz) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Supabase 연결 실패' })
      }
    }

    // 요청 바디 파싱
    let requestBody = {}
    try {
      requestBody = JSON.parse(event.body || '{}')
    } catch (e) {
      requestBody = {}
    }

    const { action, listId, listName } = requestBody

    // 1. 환경변수에서 먼저 확인
    let STIBEE_API_KEY = process.env.STIBEE_API_KEY

    // 2. 환경변수에 없으면 DB에서 가져오기
    if (!STIBEE_API_KEY) {
      const { data: apiKeyData } = await supabaseBiz
        .from('api_keys')
        .select('api_key')
        .eq('service_name', 'stibee')
        .eq('is_active', true)
        .maybeSingle()

      STIBEE_API_KEY = apiKeyData?.api_key
    }

    if (!STIBEE_API_KEY) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'STIBEE_API_KEY가 설정되지 않았습니다. 관리자 페이지 → 뉴스레터 쇼케이스에서 API 키를 등록해주세요.'
        })
      }
    }

    // 1단계: 주소록(List) 목록 가져오기
    const listsResponse = await fetch('https://api.stibee.com/v1/lists', {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!listsResponse.ok) {
      const errorText = await listsResponse.text()
      console.error('Stibee Lists API error:', listsResponse.status, errorText)
      return {
        statusCode: listsResponse.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: `스티비 주소록 API 오류: ${listsResponse.status} - ${errorText}`
        })
      }
    }

    const listsData = await listsResponse.json()
    console.log('Stibee Lists response:', JSON.stringify(listsData).slice(0, 500))

    const allLists = listsData.Value || listsData.value || []

    if (!Array.isArray(allLists) || allLists.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '스티비 주소록이 없습니다.',
          fetched: 0,
          saved: 0,
          emails: [],
          lists: []
        })
      }
    }

    // action이 'lists'이면 주소록 목록만 반환
    if (action === 'lists') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          lists: allLists.map(l => ({
            id: l.id || l.listId,
            name: l.name || l.title || '이름 없음'
          }))
        })
      }
    }

    // 특정 주소록만 필터링 (listId 또는 listName으로)
    let targetLists = allLists
    if (listId) {
      targetLists = allLists.filter(l => (l.id || l.listId)?.toString() === listId.toString())
    } else if (listName) {
      targetLists = allLists.filter(l => (l.name || l.title || '').includes(listName))
    }

    if (targetLists.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: `주소록을 찾을 수 없습니다. (검색: ${listId || listName})`,
          lists: allLists.map(l => ({
            id: l.id || l.listId,
            name: l.name || l.title || '이름 없음'
          }))
        })
      }
    }

    // 2단계: 선택된 주소록에서 발송 완료된 이메일 가져오기 (페이지네이션 적용)
    let allEmails = []
    const LIMIT = 100

    for (const list of targetLists) {
      const currentListId = list.id || list.listId
      if (!currentListId) continue

      let offset = 0
      let hasMore = true

      // 페이지네이션으로 모든 이메일 가져오기
      while (hasMore) {
        try {
          const emailsResponse = await fetch(`https://api.stibee.com/v1/lists/${currentListId}/emails?status=COMPLETE&offset=${offset}&limit=${LIMIT}`, {
            method: 'GET',
            headers: {
              'AccessToken': STIBEE_API_KEY,
              'Content-Type': 'application/json'
            }
          })

          if (emailsResponse.ok) {
            const emailsData = await emailsResponse.json()
            console.log(`List ${currentListId} emails (offset ${offset}):`, JSON.stringify(emailsData).slice(0, 300))

            const emails = emailsData.Value || emailsData.value || []
            if (Array.isArray(emails) && emails.length > 0) {
              allEmails = allEmails.concat(emails)
              offset += LIMIT

              // 가져온 개수가 LIMIT보다 작으면 더 이상 없음
              if (emails.length < LIMIT) {
                hasMore = false
              }
            } else {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        } catch (err) {
          console.error(`Error fetching emails for list ${currentListId} at offset ${offset}:`, err)
          hasMore = false
        }
      }
    }

    const emails = allEmails

    if (!Array.isArray(emails)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '이메일 목록이 비어있습니다.',
          fetched: 0,
          saved: 0,
          emails: []
        })
      }
    }

    // 가져온 이메일을 newsletters 테이블에 저장
    let savedCount = 0
    const savedEmails = []

    for (const email of emails) {
      // 스티비 이메일 ID로 기존 데이터 확인
      const stibeeId = email.id?.toString() || email.emailId?.toString()

      if (!stibeeId) continue

      // 이미 저장된 뉴스레터인지 확인
      const { data: existing } = await supabaseBiz
        .from('newsletters')
        .select('id')
        .eq('stibee_id', stibeeId)
        .maybeSingle()

      if (existing) {
        // 이미 존재하면 업데이트
        const { error: updateError } = await supabaseBiz
          .from('newsletters')
          .update({
            title: email.subject || email.title || '제목 없음',
            description: email.previewText || email.description || null,
            stibee_url: email.shareUrl || email.webUrl || `https://stibee.com/api/v1.0/emails/share/${stibeeId}`,
            published_at: email.sendAt || email.sentAt || email.createdAt || null,
            thumbnail_url: email.thumbnailUrl || email.thumbnail || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!updateError) {
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'updated' })
        }
      } else {
        // 새로 삽입
        const { error: insertError } = await supabaseBiz
          .from('newsletters')
          .insert({
            stibee_id: stibeeId,
            title: email.subject || email.title || '제목 없음',
            description: email.previewText || email.description || null,
            stibee_url: email.shareUrl || email.webUrl || `https://stibee.com/api/v1.0/emails/share/${stibeeId}`,
            published_at: email.sendAt || email.sentAt || email.createdAt || null,
            thumbnail_url: email.thumbnailUrl || email.thumbnail || null,
            category: 'other',
            is_active: false, // 기본값은 비활성화
            is_featured: false
          })

        if (!insertError) {
          savedCount++
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'created' })
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `스티비에서 ${emails.length}개 이메일을 가져와서 ${savedCount}개 새로 저장했습니다.`,
        fetched: emails.length,
        saved: savedCount,
        emails: savedEmails
      })
    }

  } catch (error) {
    console.error('Error fetching Stibee newsletters:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
