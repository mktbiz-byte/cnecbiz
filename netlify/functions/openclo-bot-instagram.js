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

    // 봇 설정 조회
    const { data: config } = await supabase
      .from('oc_bot_config')
      .select('*')
      .eq('region', region)
      .eq('platform', 'instagram')
      .eq('is_active', true)
      .single()

    if (!config) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Instagram bot disabled for ' + region }) }
    }

    const hashtags = config.hashtags || []
    if (hashtags.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No hashtags configured' }) }
    }

    let totalNew = 0
    let totalVisited = 0
    let totalDuplicates = 0
    let errors = 0

    // 랜덤 해시태그 선택 (최대 2개)
    const selectedTags = shuffleArray(hashtags).slice(0, 2)

    for (const tag of selectedTags) {
      try {
        const cleanTag = tag.replace('#', '')

        // RapidAPI Instagram Hashtag Search
        const searchRes = await fetch(
          `https://instagram-scraper-api2.p.rapidapi.com/v1/hashtag?hashtag=${encodeURIComponent(cleanTag)}`,
          {
            headers: {
              'x-rapidapi-key': rapidApiKey,
              'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
            }
          }
        )

        const searchData = await searchRes.json()
        const posts = searchData.data?.items || searchData.items || []

        // 유니크 유저네임 추출
        const usernames = [...new Set(posts.map(p => p.user?.username).filter(Boolean))].slice(0, 10)

        for (const username of usernames) {
          totalVisited++

          try {
            // 프로필 상세 조회
            const profileRes = await fetch(
              `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`,
              {
                headers: {
                  'x-rapidapi-key': rapidApiKey,
                  'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
                }
              }
            )

            const profileData = await profileRes.json()
            const user = profileData.data || profileData

            if (!user) continue

            const followers = user.follower_count || 0
            if (followers < config.min_followers || followers > config.max_followers) continue

            const bio = user.biography || ''
            const email = user.public_email || extractEmail(bio)

            // 중복 체크
            const { data: existing } = await supabase
              .from('oc_creators')
              .select('id')
              .eq('platform', 'instagram')
              .eq('username', username)
              .eq('region', region)
              .maybeSingle()

            if (existing) {
              totalDuplicates++
              continue
            }

            const recentMedia = user.edge_owner_to_timeline_media || {}
            const edges = recentMedia.edges || []
            const avgLikes = edges.length > 0
              ? Math.round(edges.reduce((sum, e) => sum + (e.node?.edge_liked_by?.count || 0), 0) / edges.length)
              : 0
            const avgComments = edges.length > 0
              ? Math.round(edges.reduce((sum, e) => sum + (e.node?.edge_media_to_comment?.count || 0), 0) / edges.length)
              : 0

            const { error: insertError } = await supabase
              .from('oc_creators')
              .insert({
                region,
                platform: 'instagram',
                platform_url: `https://instagram.com/${username}`,
                username,
                full_name: user.full_name || '',
                followers,
                following: user.following_count || 0,
                bio,
                post_count: user.media_count || 0,
                avg_likes: avgLikes,
                avg_comments: avgComments,
                email,
                discovered_by: 'bot'
              })

            if (insertError) {
              if (insertError.code === '23505') totalDuplicates++
              else { errors++; console.error('[openclo-bot-instagram] Insert error:', insertError) }
            } else {
              totalNew++
            }
          } catch (profileErr) {
            errors++
            console.error(`[openclo-bot-instagram] Profile ${username} error:`, profileErr.message)
          }

          await sleep(randomDelay(1500, 3000))
        }
      } catch (tagErr) {
        errors++
        console.error(`[openclo-bot-instagram] Hashtag "${tag}" error:`, tagErr.message)
      }
    }

    const duration = Date.now() - startTime

    await supabase.from('oc_bot_activity_logs').insert({
      region, platform: 'instagram', action: 'search', success: errors === 0,
      error_message: errors > 0 ? `${errors} errors` : null,
      duration_ms: duration,
      metadata: { tags: selectedTags, new: totalNew, visited: totalVisited, duplicates: totalDuplicates }
    })

    await updateDailyKPI(region, { profiles_visited: totalVisited, new_creators: totalNew, duplicates_skipped: totalDuplicates, errors_count: errors })

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, region, visited: totalVisited, new: totalNew, duplicates: totalDuplicates, errors, duration_ms: duration })
    }
  } catch (error) {
    console.error('[openclo-bot-instagram] Error:', error)
    await supabase.from('oc_bot_activity_logs').insert({
      region, platform: 'instagram', action: 'error', success: false,
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
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a
}

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
