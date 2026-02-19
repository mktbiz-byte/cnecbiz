const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const startTime = Date.now()
  const { region = 'korea' } = JSON.parse(event.body || '{}')

  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured')

    // 봇 설정 조회
    const { data: config } = await supabase
      .from('oc_bot_config')
      .select('*')
      .eq('region', region)
      .eq('platform', 'youtube')
      .eq('is_active', true)
      .single()

    if (!config) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'YouTube bot disabled for ' + region }) }
    }

    const keywords = config.search_keywords || []
    if (keywords.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No keywords configured' }) }
    }

    let totalNew = 0
    let totalVisited = 0
    let totalDuplicates = 0
    let errors = 0

    // 랜덤 키워드 선택 (최대 3개)
    const selectedKeywords = shuffleArray(keywords).slice(0, 3)

    for (const keyword of selectedKeywords) {
      try {
        // YouTube Search API
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(keyword)}&maxResults=10&key=${apiKey}`
        const searchRes = await fetch(searchUrl)
        const searchData = await searchRes.json()

        if (!searchData.items) continue

        const channelIds = searchData.items.map(item => item.snippet.channelId).filter(Boolean)
        if (channelIds.length === 0) continue

        // 채널 상세 정보
        const detailUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelIds.join(',')}&key=${apiKey}`
        const detailRes = await fetch(detailUrl)
        const detailData = await detailRes.json()

        if (!detailData.items) continue

        for (const channel of detailData.items) {
          totalVisited++
          const stats = channel.statistics || {}
          const snippet = channel.snippet || {}
          const followers = parseInt(stats.subscriberCount) || 0

          // 팔로워 범위 필터
          if (followers < config.min_followers || followers > config.max_followers) continue

          const username = snippet.customUrl?.replace('@', '') || channel.id
          const bio = snippet.description || ''
          const email = extractEmail(bio)

          // UPSERT
          const { data: existing } = await supabase
            .from('oc_creators')
            .select('id')
            .eq('platform', 'youtube')
            .eq('username', username)
            .eq('region', region)
            .maybeSingle()

          if (existing) {
            totalDuplicates++
            continue
          }

          const { error: insertError } = await supabase
            .from('oc_creators')
            .insert({
              region,
              platform: 'youtube',
              platform_url: `https://youtube.com/${snippet.customUrl || 'channel/' + channel.id}`,
              username,
              full_name: snippet.title,
              followers,
              following: 0,
              bio,
              post_count: parseInt(stats.videoCount) || 0,
              avg_likes: 0,
              avg_comments: 0,
              email,
              discovered_by: 'bot'
            })

          if (insertError) {
            if (insertError.code === '23505') {
              totalDuplicates++
            } else {
              errors++
              console.error('[openclo-bot-youtube] Insert error:', insertError)
            }
          } else {
            totalNew++
          }

          await sleep(randomDelay(1000, 2000))
        }
      } catch (err) {
        errors++
        console.error(`[openclo-bot-youtube] Keyword "${keyword}" error:`, err.message)
      }
    }

    const duration = Date.now() - startTime

    // 활동 로그
    await supabase.from('oc_bot_activity_logs').insert({
      region,
      platform: 'youtube',
      action: 'search',
      success: errors === 0,
      error_message: errors > 0 ? `${errors} errors occurred` : null,
      duration_ms: duration,
      metadata: { keywords: selectedKeywords, new: totalNew, visited: totalVisited, duplicates: totalDuplicates }
    })

    // KPI 업데이트
    await updateDailyKPI(region, { profiles_visited: totalVisited, new_creators: totalNew, duplicates_skipped: totalDuplicates, errors_count: errors })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, region, visited: totalVisited, new: totalNew, duplicates: totalDuplicates, errors, duration_ms: duration })
    }
  } catch (error) {
    console.error('[openclo-bot-youtube] Error:', error)
    await supabase.from('oc_bot_activity_logs').insert({
      region, platform: 'youtube', action: 'error', success: false,
      error_message: error.message, duration_ms: Date.now() - startTime
    })
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}

function extractEmail(text) {
  if (!text) return null
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  return match ? match[0].toLowerCase() : null
}

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function updateDailyKPI(region, updates) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('oc_daily_kpi')
    .select('*')
    .eq('date', today)
    .eq('region', region)
    .maybeSingle()

  if (existing) {
    await supabase.from('oc_daily_kpi').update({
      profiles_visited: (existing.profiles_visited || 0) + (updates.profiles_visited || 0),
      new_creators: (existing.new_creators || 0) + (updates.new_creators || 0),
      duplicates_skipped: (existing.duplicates_skipped || 0) + (updates.duplicates_skipped || 0),
      errors_count: (existing.errors_count || 0) + (updates.errors_count || 0)
    }).eq('id', existing.id)
  } else {
    await supabase.from('oc_daily_kpi').insert({ date: today, region, ...updates })
  }
}
