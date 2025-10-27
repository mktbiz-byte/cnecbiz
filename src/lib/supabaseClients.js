import { createClient } from '@supabase/supabase-js'

// Multi-region Supabase clients configuration
// Each region has its own Supabase project

// Korea Supabase Client
const supabaseKoreaUrl = import.meta.env.VITE_SUPABASE_KOREA_URL || ''
const supabaseKoreaKey = import.meta.env.VITE_SUPABASE_KOREA_ANON_KEY || ''

export const supabaseKorea = (supabaseKoreaUrl && supabaseKoreaKey && supabaseKoreaUrl.startsWith('http'))
  ? createClient(supabaseKoreaUrl, supabaseKoreaKey, {
      auth: {
        storageKey: 'cnec-korea-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

// Japan Supabase Client
const supabaseJapanUrl = import.meta.env.VITE_SUPABASE_JAPAN_URL || ''
const supabaseJapanKey = import.meta.env.VITE_SUPABASE_JAPAN_ANON_KEY || ''

export const supabaseJapan = (supabaseJapanUrl && supabaseJapanKey && supabaseJapanUrl.startsWith('http'))
  ? createClient(supabaseJapanUrl, supabaseJapanKey, {
      auth: {
        storageKey: 'cnec-japan-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

// US Supabase Client
const supabaseUSUrl = import.meta.env.VITE_SUPABASE_US_URL || ''
const supabaseUSKey = import.meta.env.VITE_SUPABASE_US_ANON_KEY || ''

export const supabaseUS = (supabaseUSUrl && supabaseUSKey && supabaseUSUrl.startsWith('http'))
  ? createClient(supabaseUSUrl, supabaseUSKey, {
      auth: {
        storageKey: 'cnec-us-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

// Taiwan Supabase Client
const supabaseTaiwanUrl = import.meta.env.VITE_SUPABASE_TAIWAN_URL || ''
const supabaseTaiwanKey = import.meta.env.VITE_SUPABASE_TAIWAN_ANON_KEY || ''

export const supabaseTaiwan = (supabaseTaiwanUrl && supabaseTaiwanKey && supabaseTaiwanUrl.startsWith('http'))
  ? createClient(supabaseTaiwanUrl, supabaseTaiwanKey, {
      auth: {
        storageKey: 'cnec-taiwan-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

// Central BIZ Supabase Client (for managing companies, quotations, contracts)
const supabaseBizUrl = import.meta.env.VITE_SUPABASE_BIZ_URL || ''
const supabaseBizKey = import.meta.env.VITE_SUPABASE_BIZ_ANON_KEY || ''

export const supabaseBiz = (supabaseBizUrl && supabaseBizKey && supabaseBizUrl.startsWith('http'))
  ? createClient(supabaseBizUrl, supabaseBizKey, {
      auth: {
        flowType: 'pkce',  // iOS Safari 호환성 개선
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'cnectotal-auth',  // 고유 키로 충돌 방지
        debug: false
      },
      global: {
        headers: {
          'X-Client-Info': 'cnectotal-web'
        }
      }
    })
  : null

// Helper function to get the appropriate client based on region
export const getSupabaseClient = (region) => {
  switch (region) {
    case 'korea':
    case 'kr':
      return supabaseKorea  // Korea uses supabaseKorea
    case 'japan':
    case 'jp':
      return supabaseJapan
    case 'us':
    case 'usa':
      return supabaseUS
    case 'taiwan':
    case 'tw':
      return supabaseTaiwan
    case 'biz':
    default:
      return supabaseBiz
  }
}

// Helper function to create campaign across multiple regions
export const createCampaignInRegions = async (campaignData, selectedRegions) => {
  const results = []
  
  for (const region of selectedRegions) {
    const client = getSupabaseClient(region)
    if (!client) {
      results.push({
        region,
        success: false,
        error: 'Supabase client not configured for this region'
      })
      continue
    }

    try {
      const { data, error } = await client
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (error) throw error

      results.push({
        region,
        success: true,
        data
      })
    } catch (error) {
      results.push({
        region,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

// Helper function to get campaigns from all regions
export const getCampaignsFromAllRegions = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const allCampaigns = []

  console.log('[getCampaignsFromAllRegions] Starting to fetch campaigns from all regions...')

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) {
      console.warn(`[getCampaignsFromAllRegions] No client for region: ${region}`)
      continue
    }

    try {
      console.log(`[getCampaignsFromAllRegions] Fetching from ${region}...`)
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`[getCampaignsFromAllRegions] Error from ${region}:`, error)
      } else if (data) {
        console.log(`[getCampaignsFromAllRegions] Fetched ${data.length} campaigns from ${region}`)
        allCampaigns.push(
          ...data.map(campaign => ({
            ...campaign,
            region
          }))
        )
      }
    } catch (error) {
      console.error(`[getCampaignsFromAllRegions] Exception from ${region}:`, error)
    }
  }

  console.log(`[getCampaignsFromAllRegions] Total campaigns: ${allCampaigns.length}`)
  return allCampaigns
}

// Helper function to get campaign statistics from all regions
export const getCampaignStatsFromAllRegions = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const stats = {
    total: 0,
    byRegion: {},
    byStatus: {
      active: 0,
      completed: 0,
      pending: 0
    }
  }

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) continue

    try {
      const { data, error } = await client
        .from('campaigns')
        .select('status')

      if (!error && data) {
        stats.byRegion[region] = data.length
        stats.total += data.length

        data.forEach(campaign => {
          const status = campaign.status || 'pending'
          stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
        })
      }
    } catch (error) {
      console.error(`Error fetching stats from ${region}:`, error)
    }
  }

  return stats
}

