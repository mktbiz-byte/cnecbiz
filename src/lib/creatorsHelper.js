import { getSupabaseClient } from './supabaseClients'

/**
 * 모든 지역의 크리에이터 정보를 가져옵니다
 */
export const getCreatorsFromAllRegions = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const allCreators = []

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) continue

    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        allCreators.push(
          ...data.map(creator => ({
            ...creator,
            region
          }))
        )
      }
    } catch (error) {
      console.error(`Error fetching creators from ${region}:`, error)
    }
  }

  return allCreators
}

/**
 * 특정 지역의 크리에이터 정보를 가져옵니다
 */
export const getCreatorsByRegion = async (region) => {
  const client = getSupabaseClient(region)
  if (!client) return []

  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Error fetching creators from ${region}:`, error)
    return []
  }
}

/**
 * 크리에이터 통계 정보를 가져옵니다
 */
export const getCreatorStats = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const stats = {
    total: 0,
    byRegion: {},
    byPlatform: {
      instagram: 0,
      youtube: 0,
      tiktok: 0
    }
  }

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) {
      console.warn(`[getCreatorStats] No client for ${region}`)
      stats.byRegion[region] = 0
      continue
    }

    try {
      const { data, error } = await client
        .from('user_profiles')
        .select('instagram_url, youtube_url, tiktok_url')

      if (error) {
        console.error(`[getCreatorStats] Error from ${region}:`, error)
        stats.byRegion[region] = 0
      } else if (data) {
        console.log(`[getCreatorStats] ${region}: ${data.length} creators`)
        stats.byRegion[region] = data.length
        stats.total += data.length

        data.forEach(creator => {
          if (creator.instagram_url) stats.byPlatform.instagram++
          if (creator.youtube_url) stats.byPlatform.youtube++
          if (creator.tiktok_url) stats.byPlatform.tiktok++
        })
      } else {
        stats.byRegion[region] = 0
      }
    } catch (error) {
      console.error(`[getCreatorStats] Exception from ${region}:`, error)
      stats.byRegion[region] = 0
    }
  }

  console.log('[getCreatorStats] Final stats:', stats)
  return stats
}

