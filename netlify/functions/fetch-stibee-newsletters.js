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

    const { action, listId, listName, fetchContent } = requestBody

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

    // ===== v2 API로 이메일 목록 가져오기 =====
    // v2 API는 워크스페이스 전체 이메일을 가져옴

    // action이 'lists'이면 주소록 목록 반환 (v1 API 사용)
    if (action === 'lists') {
      let allLists = []
      const LIST_LIMIT = 100
      let listOffset = 0
      let hasMoreLists = true

      while (hasMoreLists) {
        const listsResponse = await fetch(`https://api.stibee.com/v1/lists?offset=${listOffset}&limit=${LIST_LIMIT}`, {
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
        console.log(`Stibee Lists response (offset ${listOffset}):`, JSON.stringify(listsData).slice(0, 500))

        const lists = listsData.Value || listsData.value || []

        if (Array.isArray(lists) && lists.length > 0) {
          allLists = allLists.concat(lists)
          listOffset += LIST_LIMIT
          if (lists.length < LIST_LIMIT) {
            hasMoreLists = false
          }
        } else {
          hasMoreLists = false
        }
      }

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

    // v2 API로 이메일 목록 가져오기 (페이지네이션)
    let allEmails = []
    const LIMIT = 100
    let offset = 0
    let hasMore = true
    let v2Failed = false

    console.log('=== Starting email fetch ===')
    console.log('listId:', listId)
    console.log('Fetching emails using v2 API...')

    while (hasMore) {
      // v2 API 사용
      const emailsUrl = `https://api.stibee.com/v2/emails?offset=${offset}&limit=${LIMIT}`
      console.log(`Fetching: ${emailsUrl}`)

      const emailsResponse = await fetch(emailsUrl, {
        method: 'GET',
        headers: {
          'AccessToken': STIBEE_API_KEY,
          'Content-Type': 'application/json'
        }
      })

      console.log('v2 API response status:', emailsResponse.status)

      if (!emailsResponse.ok) {
        const errorText = await emailsResponse.text()
        console.error('Stibee v2 Emails API error:', emailsResponse.status, errorText)

        // v2 API 실패 - 새 API 키 필요할 수 있음
        if (emailsResponse.status === 401 || emailsResponse.status === 403) {
          console.log('v2 API 인증 실패 - 2025년 1월 21일 이후 생성된 API 키가 필요합니다.')
        }

        // v2 API 실패 시 v1 API로 폴백
        console.log('v2 API failed, falling back to v1 API...')
        v2Failed = true
        break
      }

      const emailsData = await emailsResponse.json()
      console.log(`v2 Emails response (offset ${offset}):`, JSON.stringify(emailsData).slice(0, 1000))
      console.log(`v2 total: ${emailsData.total}, items count: ${emailsData.items?.length}`)

      // v2 API 응답 구조: { total, offset, limit, items: [...] }
      const emails = emailsData.items || emailsData.Value || emailsData.value || emailsData.data || []

      if (Array.isArray(emails) && emails.length > 0) {
        // listId 필터링 (v2는 전체 이메일을 가져오므로 필터링 필요)
        // status: 0=작성중, 3=발송완료
        let filteredEmails = emails

        if (listId) {
          // listId로 필터링 (해당 주소록으로 발송된 이메일만)
          filteredEmails = emails.filter(e => {
            const emailListId = e.listId || e.list_id
            return emailListId?.toString() === listId.toString()
          })
          console.log(`Filtered by listId ${listId}: ${filteredEmails.length} emails`)
        }

        // 발송 완료된 이메일만 (status === 3)
        filteredEmails = filteredEmails.filter(e => e.status === 3)
        console.log(`After status filter (sent only): ${filteredEmails.length} emails`)

        allEmails = allEmails.concat(filteredEmails)
        offset += LIMIT

        // 더 가져올 데이터가 있는지 확인
        if (emails.length < LIMIT || offset >= (emailsData.total || 0)) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }

    // v2 API로 이메일을 못 가져온 경우 v1 API로 폴백
    if ((allEmails.length === 0 || v2Failed) && listId) {
      console.log('=== Falling back to v1 API ===')
      console.log('listId:', listId)

      let v1Offset = 0
      let v1HasMore = true

      while (v1HasMore) {
        const v1Url = `https://api.stibee.com/v1/lists/${listId}/emails?offset=${v1Offset}&limit=${LIMIT}`
        console.log(`Fetching v1: ${v1Url}`)

        const v1Response = await fetch(v1Url, {
          method: 'GET',
          headers: {
            'AccessToken': STIBEE_API_KEY,
            'Content-Type': 'application/json'
          }
        })

        if (v1Response.ok) {
          const v1Data = await v1Response.json()
          console.log(`v1 Emails response (offset ${v1Offset}):`, JSON.stringify(v1Data).slice(0, 800))

          const emails = v1Data.Value || v1Data.value || []
          if (Array.isArray(emails) && emails.length > 0) {
            allEmails = allEmails.concat(emails)
            v1Offset += LIMIT
            if (emails.length < LIMIT) {
              v1HasMore = false
            }
          } else {
            v1HasMore = false
          }
        } else {
          const errorText = await v1Response.text()
          console.error('v1 API error:', v1Response.status, errorText)
          v1HasMore = false
        }
      }
    }

    console.log(`Total emails fetched: ${allEmails.length}`)
    console.log('v2Failed:', v2Failed)

    if (allEmails.length === 0) {
      // v2 API 실패 시 사용자에게 안내
      const errorMessage = v2Failed
        ? '이메일을 가져오지 못했습니다. 스티비 v2 API는 2025년 1월 21일 이후 생성된 API 키가 필요합니다. 스티비 > 워크스페이스 설정 > API 키에서 새 키를 발급받아주세요.'
        : '이메일 목록이 비어있습니다.'

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: !v2Failed,
          message: errorMessage,
          fetched: 0,
          saved: 0,
          emails: [],
          v2Failed: v2Failed
        })
      }
    }

    // 가져온 이메일을 newsletters 테이블에 저장
    let savedCount = 0
    const savedEmails = []

    for (const email of allEmails) {
      // 스티비 이메일 ID
      const stibeeId = email.id?.toString() || email.emailId?.toString()
      if (!stibeeId) continue

      // HTML 본문 가져오기 (v2 API)
      let htmlContent = null
      if (fetchContent !== false) {
        try {
          const contentUrl = `https://api.stibee.com/v2/emails/${stibeeId}/content`
          console.log(`Fetching content for email ${stibeeId}...`)

          const contentResponse = await fetch(contentUrl, {
            method: 'GET',
            headers: {
              'AccessToken': STIBEE_API_KEY,
              'Content-Type': 'application/json'
            }
          })

          if (contentResponse.ok) {
            const contentData = await contentResponse.json()
            // content 응답에서 HTML 추출
            htmlContent = contentData.Value?.html || contentData.value?.html ||
                          contentData.html || contentData.content || contentData.body || null
            console.log(`Got HTML content for ${stibeeId}: ${htmlContent ? htmlContent.length + ' chars' : 'null'}`)
          } else {
            console.log(`Failed to get content for ${stibeeId}: ${contentResponse.status}`)
          }
        } catch (contentErr) {
          console.error(`Error fetching content for ${stibeeId}:`, contentErr.message)
        }
      }

      // 이미 저장된 뉴스레터인지 확인
      const { data: existing } = await supabaseBiz
        .from('newsletters')
        .select('id')
        .eq('stibee_id', stibeeId)
        .maybeSingle()

      // v2 API 응답 필드: id, subject, permanentLink, sentTime, createdTime, status, listId
      const newsletterData = {
        title: email.subject || email.title || '제목 없음',
        description: email.previewText || email.description || null,
        stibee_url: email.permanentLink || email.shareUrl || email.webUrl || `https://stibee.com/api/v1.0/emails/share/${stibeeId}`,
        published_at: email.sentTime || email.sendAt || email.sentAt || email.createdAt || null,
        thumbnail_url: email.thumbnailUrl || email.thumbnail || null,
        html_content: htmlContent,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        // 업데이트
        const { error: updateError } = await supabaseBiz
          .from('newsletters')
          .update(newsletterData)
          .eq('id', existing.id)

        if (!updateError) {
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'updated', hasHtml: !!htmlContent })
        }
      } else {
        // 새로 삽입
        const { error: insertError } = await supabaseBiz
          .from('newsletters')
          .insert({
            stibee_id: stibeeId,
            ...newsletterData,
            category: 'other',
            is_active: false,
            is_featured: false
          })

        if (!insertError) {
          savedCount++
          savedEmails.push({ id: stibeeId, title: email.subject || email.title, action: 'created', hasHtml: !!htmlContent })
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `스티비에서 ${allEmails.length}개 이메일을 가져와서 ${savedCount}개 새로 저장했습니다.`,
        fetched: allEmails.length,
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
