/**
 * YouTube Data API를 사용하여 크리에이터 검색 및 이메일 추출
 *
 * 기능:
 * 1. 키워드로 YouTube 채널 검색 (국가별 필터링)
 * 2. 채널 설명란에서 공개된 이메일 추출
 * 3. 검색 결과 DB 저장
 *
 * 합법적 방법:
 * - YouTube Data API v3 공식 사용
 * - 크리에이터가 공개한 정보만 수집
 */

const { createClient } = require('@supabase/supabase-js')
const axios = require('axios')

// Supabase 클라이언트
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 이메일 추출 정규식 (공개된 정보에서만)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// 비즈니스 이메일 필터 (스팸/예시 이메일 제외)
const EXCLUDED_EMAIL_PATTERNS = [
  /example\.com$/i,
  /test\.com$/i,
  /email\.com$/i,
  /your.*email/i,
  /noreply/i,
  /no-reply/i,
  /@youtube\.com$/i,
  /@google\.com$/i,
]

/**
 * 채널 설명에서 이메일 추출
 */
function extractEmailFromDescription(description) {
  if (!description) return null

  const matches = description.match(EMAIL_REGEX)
  if (!matches) return null

  // 유효한 비즈니스 이메일 필터링
  for (const email of matches) {
    const isExcluded = EXCLUDED_EMAIL_PATTERNS.some(pattern => pattern.test(email))
    if (!isExcluded) {
      return email.toLowerCase()
    }
  }

  return null
}

/**
 * 국가 코드를 YouTube API regionCode로 변환
 */
function getRegionCode(countryCode) {
  const mapping = {
    'US': 'US',
    'JP': 'JP',
    'KR': 'KR',
    'TW': 'TW'
  }
  return mapping[countryCode] || 'US'
}

/**
 * 국가 코드를 relevanceLanguage로 변환
 */
function getRelevanceLanguage(countryCode) {
  const mapping = {
    'US': 'en',
    'JP': 'ja',
    'KR': 'ko',
    'TW': 'zh-TW'
  }
  return mapping[countryCode] || 'en'
}

/**
 * YouTube Search API로 채널 검색
 */
async function searchChannels(keyword, apiKey, countryCode, maxResults = 25, pageToken = null) {
  const params = {
    part: 'snippet',
    q: keyword,
    type: 'channel',
    maxResults: Math.min(maxResults, 50),
    key: apiKey,
    regionCode: getRegionCode(countryCode),
    relevanceLanguage: getRelevanceLanguage(countryCode),
    order: 'relevance'
  }

  if (pageToken) {
    params.pageToken = pageToken
  }

  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', { params })

  return {
    items: response.data.items || [],
    nextPageToken: response.data.nextPageToken,
    totalResults: response.data.pageInfo?.totalResults || 0
  }
}

/**
 * 채널 상세 정보 조회 (구독자, 설명 등)
 */
async function getChannelDetails(channelIds, apiKey) {
  if (!channelIds.length) return []

  const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'snippet,statistics,brandingSettings',
      id: channelIds.join(','),
      key: apiKey
    }
  })

  return response.data.items || []
}

/**
 * 검색 결과를 DB에 저장 (중복 체크 후 upsert)
 */
async function saveProspects(prospects) {
  const results = {
    inserted: 0,
    updated: 0,
    errors: []
  }

  for (const prospect of prospects) {
    try {
      const { data: existing } = await supabase
        .from('youtube_prospects')
        .select('id, outreach_status')
        .eq('channel_id', prospect.channel_id)
        .single()

      if (existing) {
        // 기존 레코드 업데이트 (섭외 상태는 유지)
        const { error } = await supabase
          .from('youtube_prospects')
          .update({
            channel_name: prospect.channel_name,
            channel_handle: prospect.channel_handle,
            thumbnail_url: prospect.thumbnail_url,
            description: prospect.description,
            subscriber_count: prospect.subscriber_count,
            video_count: prospect.video_count,
            view_count: prospect.view_count,
            extracted_email: prospect.extracted_email || existing.extracted_email,
            email_source: prospect.email_source,
            category: prospect.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
        results.updated++
      } else {
        // 새 레코드 삽입
        const { error } = await supabase
          .from('youtube_prospects')
          .insert([prospect])

        if (error) throw error
        results.inserted++
      }
    } catch (error) {
      results.errors.push({
        channel_id: prospect.channel_id,
        error: error.message
      })
    }
  }

  return results
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // 인증 확인
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // 관리자 권한 확인
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!adminUser) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      }
    }

    const body = JSON.parse(event.body)
    const { action } = body

    switch (action) {
      case 'search': {
        // 유튜버 검색
        const {
          keyword,
          country_code = 'US',
          max_results = 25,
          min_subscribers = 0,
          max_subscribers,
          page_token,
          save_results = true
        } = body

        if (!keyword) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'keyword is required' })
          }
        }

        const apiKey = process.env.YOUTUBE_API_KEY
        if (!apiKey) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'YouTube API key not configured' })
          }
        }

        // 1. 채널 검색
        const searchResult = await searchChannels(
          keyword,
          apiKey,
          country_code,
          max_results,
          page_token
        )

        if (!searchResult.items.length) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              data: {
                channels: [],
                nextPageToken: null,
                totalResults: 0,
                message: 'No channels found'
              }
            })
          }
        }

        // 2. 채널 상세 정보 조회
        const channelIds = searchResult.items.map(item => item.id.channelId)
        const channelDetails = await getChannelDetails(channelIds, apiKey)

        // 3. 결과 가공 및 이메일 추출
        const prospects = channelDetails
          .map(channel => {
            const subscriberCount = parseInt(channel.statistics?.subscriberCount) || 0

            // 구독자 필터링
            if (subscriberCount < min_subscribers) return null
            if (max_subscribers && subscriberCount > max_subscribers) return null

            const description = channel.snippet?.description || ''
            const extractedEmail = extractEmailFromDescription(description)

            return {
              channel_id: channel.id,
              channel_name: channel.snippet?.title,
              channel_handle: channel.snippet?.customUrl,
              channel_url: `https://www.youtube.com/channel/${channel.id}`,
              thumbnail_url: channel.snippet?.thumbnails?.high?.url ||
                             channel.snippet?.thumbnails?.default?.url,
              description: description.substring(0, 2000),
              subscriber_count: subscriberCount,
              video_count: parseInt(channel.statistics?.videoCount) || 0,
              view_count: parseInt(channel.statistics?.viewCount) || 0,
              extracted_email: extractedEmail,
              email_source: extractedEmail ? 'description' : null,
              country_code: country_code,
              category: channel.snippet?.localized?.title || null,
              language: getRelevanceLanguage(country_code),
              search_keyword: keyword,
              search_date: new Date().toISOString().split('T')[0],
              outreach_status: 'new'
            }
          })
          .filter(Boolean)

        // 4. DB 저장 (옵션)
        let saveResult = null
        if (save_results && prospects.length > 0) {
          saveResult = await saveProspects(prospects)
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              channels: prospects,
              nextPageToken: searchResult.nextPageToken,
              totalResults: searchResult.totalResults,
              emailFound: prospects.filter(p => p.extracted_email).length,
              saved: saveResult
            }
          })
        }
      }

      case 'get_channel_info': {
        // 단일 채널 정보 조회
        const { channel_id, channel_url } = body

        const apiKey = process.env.YOUTUBE_API_KEY
        if (!apiKey) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'YouTube API key not configured' })
          }
        }

        let targetChannelId = channel_id

        // URL에서 채널 ID 추출
        if (!targetChannelId && channel_url) {
          const patterns = [
            /youtube\.com\/channel\/([^\/\?]+)/,
            /youtube\.com\/@([^\/\?]+)/
          ]

          for (const pattern of patterns) {
            const match = channel_url.match(pattern)
            if (match) {
              targetChannelId = match[1]
              break
            }
          }
        }

        if (!targetChannelId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'channel_id or channel_url is required' })
          }
        }

        const channels = await getChannelDetails([targetChannelId], apiKey)

        if (!channels.length) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Channel not found' })
          }
        }

        const channel = channels[0]
        const description = channel.snippet?.description || ''
        const extractedEmail = extractEmailFromDescription(description)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              channel_id: channel.id,
              channel_name: channel.snippet?.title,
              channel_handle: channel.snippet?.customUrl,
              thumbnail_url: channel.snippet?.thumbnails?.high?.url,
              description: description,
              subscriber_count: parseInt(channel.statistics?.subscriberCount) || 0,
              video_count: parseInt(channel.statistics?.videoCount) || 0,
              view_count: parseInt(channel.statistics?.viewCount) || 0,
              extracted_email: extractedEmail,
              published_at: channel.snippet?.publishedAt
            }
          })
        }
      }

      case 'list': {
        // 저장된 prospects 목록 조회
        const {
          country_code,
          outreach_status,
          has_email,
          min_subscribers,
          max_subscribers,
          search_term,
          page = 1,
          limit = 50,
          sort_by = 'created_at',
          sort_order = 'desc'
        } = body

        let query = supabase
          .from('youtube_prospects')
          .select('*', { count: 'exact' })

        // 필터링
        if (country_code) {
          query = query.eq('country_code', country_code)
        }
        if (outreach_status) {
          query = query.eq('outreach_status', outreach_status)
        }
        if (has_email === true) {
          query = query.not('extracted_email', 'is', null)
        } else if (has_email === false) {
          query = query.is('extracted_email', null)
        }
        if (min_subscribers) {
          query = query.gte('subscriber_count', min_subscribers)
        }
        if (max_subscribers) {
          query = query.lte('subscriber_count', max_subscribers)
        }
        if (search_term) {
          query = query.or(`channel_name.ilike.%${search_term}%,description.ilike.%${search_term}%`)
        }

        // 정렬
        query = query.order(sort_by, { ascending: sort_order === 'asc' })

        // 페이지네이션
        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: {
              prospects: data,
              total: count,
              page,
              limit,
              totalPages: Math.ceil(count / limit)
            }
          })
        }
      }

      case 'update_status': {
        // 섭외 상태 업데이트
        const { prospect_id, status, notes } = body

        if (!prospect_id || !status) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'prospect_id and status are required' })
          }
        }

        const updateData = {
          outreach_status: status,
          updated_at: new Date().toISOString()
        }

        if (notes !== undefined) {
          updateData.response_notes = notes
        }

        if (status === 'contacted') {
          updateData.last_contacted_at = new Date().toISOString()
          updateData.contact_count = supabase.rpc('increment_contact_count', { row_id: prospect_id })
        }

        if (['responded', 'interested', 'accepted', 'declined'].includes(status)) {
          updateData.last_response_at = new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('youtube_prospects')
          .update(updateData)
          .eq('id', prospect_id)
          .select()
          .single()

        if (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data
          })
        }
      }

      case 'stats': {
        // 통계 조회
        const { country_code } = body

        let query = supabase
          .from('youtube_prospects')
          .select('outreach_status, country_code, extracted_email')

        if (country_code) {
          query = query.eq('country_code', country_code)
        }

        const { data, error } = await query

        if (error) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
          }
        }

        const stats = {
          total: data.length,
          with_email: data.filter(p => p.extracted_email).length,
          by_status: {},
          by_country: {}
        }

        data.forEach(p => {
          stats.by_status[p.outreach_status] = (stats.by_status[p.outreach_status] || 0) + 1
          stats.by_country[p.country_code] = (stats.by_country[p.country_code] || 0) + 1
        })

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            data: stats
          })
        }
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Unknown action: ${action}` })
        }
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
