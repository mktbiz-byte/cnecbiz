import { createClient } from '@supabase/supabase-js'

// Multi-region Supabase clients configuration
// Each region has its own Supabase project

// Korea Supabase Client
const supabaseKoreaUrl = 'https://vluqhvuhykncicgvkosd.supabase.co'
const supabaseKoreaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8'

export const supabaseKorea = createClient(supabaseKoreaUrl, supabaseKoreaKey, {
  auth: {
    storageKey: 'cnec-korea-auth',
    persistSession: true,
    autoRefreshToken: true
  }
})

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

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) continue

    try {
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        allCampaigns.push(
          ...data.map(campaign => ({
            ...campaign,
            region
          }))
        )
      }
    } catch (error) {
      console.error(`Error fetching campaigns from ${region}:`, error)
    }
  }

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

