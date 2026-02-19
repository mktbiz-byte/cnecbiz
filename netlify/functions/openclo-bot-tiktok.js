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
    const rapidApiKey = process.env.RAPIDAPI_KEY
    if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not configured')

    const { data: config } = await supabase
      .from('oc_bot_config')
      .select('*')
      .eq('region', region)
      .eq('platform', 'tiktok')
      .eq('is_active', true)
      .single()

    if (!config) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'TikTok bot disabled for ' + region }) }
    }

    const keywords = config.search_keywords || []
    if (keywords.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No keywords configured' }) }
    }

    let totalNew = 0, totalVisited = 0, totalDuplicates = 0, errors = 0

    const selectedKeywords = shuffleArray(keywords).slice(0, 2)

    for (const keyword of selectedKeywords) {
      try {
        // RapidAPI TikTok user search
        const searchRes = await fetch(
          `https://tiktok-scraper7.p.rapidapi.com/user/search?keywords=${encodeURIComponent(keyword)}&count=10`,
          {
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
            }
          }
        )

        const searchData = await searchRes.json()
        const users = searchData.data?.user_list || []

        for (const item of users) {
          totalVisited++
          const user = item.user_info || item
          const stats = item.user_info || item

          const username = user.unique_id || user.uniqueId
          if (!username) continue

          const followers = stats.follower_count || stats.followerCount || 0
          if (followers < config.min_followers || followers > config.max_followers) continue

          // 중복 체크
          const { data: existing } = await supabase
            .from('oc_creators')
            .select('id')
            .eq('platform', 'tiktok')
            .eq('username', username)
            .eq('region', region)
            .maybeSingle()

          if (existing) { totalDuplicates++; continue }

          const bio = user.signature || ''
          const email = extractEmail(bio)

          const { error: insertError } = await supabase
            .from('oc_creators')
            .insert({
              region,
              platform: 'tiktok',
              platform_url: `https://tiktok.com/@${username}`,
              username,
              full_name: user.nickname || '',
              followers,
              following: stats.following_count || stats.followingCount || 0,
              bio,
              post_count: stats.aweme_count || stats.videoCount || 0,
              avg_likes: stats.total_favorited ? Math.round((stats.total_favorited || 0) / Math.max(stats.aweme_count || 1, 1)) : 0,
              avg_comments: 0,
              email,
              discovered_by: 'bot'
            })

          if (insertError) {
            if (insertError.code === '23505') totalDuplicates++
            else { errors++; console.error('[openclo-bot-tiktok] Insert error:', insertError) }
          } else {
            totalNew++
          }

          await sleep(randomDelay(1500, 3000))
        }
      } catch (err) {
        errors++
        console.error(`[openclo-bot-tiktok] Keyword "${keyword}" error:`, err.message)
      }
    }

    const duration = Date.now() - startTime

    await supabase.from('oc_bot_activity_logs').insert({
      region, platform: 'tiktok', action: 'search', success: errors === 0,
      error_message: errors > 0 ? `${errors} errors` : null,
      duration_ms: duration,
      metadata: { keywords: selectedKeywords, new: totalNew, visited: totalVisited, duplicates: totalDuplicates }
    })

    await updateDailyKPI(region, { profiles_visited: totalVisited, new_creators: totalNew, duplicates_skipped: totalDuplicates, errors_count: errors })

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, region, visited: totalVisited, new: totalNew, duplicates: totalDuplicates, errors, duration_ms: duration })
    }
  } catch (error) {
    console.error('[openclo-bot-tiktok] Error:', error)
    await supabase.from('oc_bot_activity_logs').insert({
      region, platform: 'tiktok', action: 'error', success: false,
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
function shuffleArray(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
function randomDelay(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function updateDailyKPI(region, updates) {
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase.from('oc_daily_kpi').select('*').eq('date', today).eq('region', region).maybeSingle()
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
