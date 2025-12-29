import { createClient } from '@supabase/supabase-js'

// Multi-region Supabase clients configuration
// Each region has its own Supabase project
// Using singleton pattern to prevent multiple instances

// Singleton instances
let _supabaseKorea = null
let _supabaseJapan = null
let _supabaseUS = null
let _supabaseTaiwan = null
let _supabaseBiz = null

// Korea Supabase Client
const getSupabaseKorea = () => {
  if (_supabaseKorea) return _supabaseKorea
  
  const url = import.meta.env.VITE_SUPABASE_KOREA_URL
  const key = import.meta.env.VITE_SUPABASE_KOREA_ANON_KEY
  
  if (url && key && url.startsWith('http')) {
    _supabaseKorea = createClient(url, key, {
      auth: {
        storageKey: 'cnec-korea-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  }
  
  return _supabaseKorea
}

// Japan Supabase Client
const getSupabaseJapan = () => {
  if (_supabaseJapan) return _supabaseJapan
  
  const url = import.meta.env.VITE_SUPABASE_JAPAN_URL || ''
  const key = import.meta.env.VITE_SUPABASE_JAPAN_ANON_KEY || ''
  
  if (url && key && url.startsWith('http')) {
    _supabaseJapan = createClient(url, key, {
      auth: {
        storageKey: 'cnec-japan-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  }
  
  return _supabaseJapan
}

// US Supabase Client
const getSupabaseUS = () => {
  if (_supabaseUS) return _supabaseUS
  
  const url = import.meta.env.VITE_SUPABASE_US_URL || ''
  const key = import.meta.env.VITE_SUPABASE_US_ANON_KEY || ''
  
  if (url && key && url.startsWith('http')) {
    _supabaseUS = createClient(url, key, {
      auth: {
        storageKey: 'cnec-us-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  }
  
  return _supabaseUS
}

// Taiwan Supabase Client
const getSupabaseTaiwan = () => {
  if (_supabaseTaiwan) return _supabaseTaiwan
  
  const url = import.meta.env.VITE_SUPABASE_TAIWAN_URL || ''
  const key = import.meta.env.VITE_SUPABASE_TAIWAN_ANON_KEY || ''
  
  if (url && key && url.startsWith('http')) {
    _supabaseTaiwan = createClient(url, key, {
      auth: {
        storageKey: 'cnec-taiwan-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    })
  }
  
  return _supabaseTaiwan
}

// Central BIZ Supabase Client
const getSupabaseBiz = () => {
  if (_supabaseBiz) return _supabaseBiz
  
  // BIZ project (cnectotal) for centralized financial and payment data
  const url = import.meta.env.VITE_SUPABASE_BIZ_URL
  const key = import.meta.env.VITE_SUPABASE_BIZ_ANON_KEY
  
  if (url && key && url.startsWith('http')) {
    _supabaseBiz = createClient(url, key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'cnec-biz-auth',
        debug: false
      },
      global: {
        headers: {
          'X-Client-Info': 'cnectotal-web'
        }
      }
    })
  }
  
  return _supabaseBiz
}

// Export singleton instances
export const supabaseKorea = getSupabaseKorea()
export const supabaseJapan = getSupabaseJapan()
export const supabaseUS = getSupabaseUS()
export const supabaseTaiwan = getSupabaseTaiwan()
export const supabaseBiz = getSupabaseBiz()

// Helper function to get the appropriate client based on region
export const getSupabaseClient = (region) => {
  switch (region) {
    case 'korea':
    case 'kr':
      return supabaseKorea
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
  const regions = ['biz', 'korea', 'japan', 'us', 'taiwan']

  // 모든 지역에서 병렬로 데이터 가져오기
  const fetchPromises = regions.map(async (region) => {
    const client = getSupabaseClient(region)
    if (!client) return []

    try {
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error || !data) return []

      // 지역별 스키마 차이를 통일된 형식으로 매핑
      const currencySymbol = {
        'korea': '₩',
        'japan': '¥',
        'us': '$',
        'taiwan': 'NT$',
        'biz': '₩'
      }[region] || '₩'

      return data.map(campaign => ({
        ...campaign,
        region,
        currency: currencySymbol,
        campaign_name: campaign.title || campaign.product_name || campaign.campaign_name || '제목 없음',
        description: campaign.description || '설명 없음',
        budget: campaign.estimated_cost ||
               (campaign.reward_amount && campaign.max_participants
                 ? campaign.reward_amount * campaign.max_participants
                 : campaign.budget || 0),
        creator_count: campaign.total_slots || campaign.max_participants || campaign.creator_count || 0,
        application_deadline: campaign.application_deadline || campaign.recruitment_deadline,
        approval_status: campaign.approval_status || campaign.status
      }))
    } catch (error) {
      console.error(`Error fetching from ${region}:`, error)
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  return results.flat()
}

// Helper function to get campaign statistics from all regions
export const getCampaignStatsFromAllRegions = async () => {
  const regions = ['biz', 'korea', 'japan', 'us', 'taiwan']
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


// Helper function to get application statistics for campaigns
export const getApplicationStatsForCampaigns = async (campaignIds, region) => {
  const client = getSupabaseClient(region)
  if (!client) return {}

  try {
    const { data, error } = await client
      .from('applications')
      .select('campaign_id, status')
      .in('campaign_id', campaignIds)

    if (error) {
      console.error(`Error fetching application stats from ${region}:`, error)
      return {}
    }

    // 캠페인별로 지원자 통계 집계
    const stats = {}
    data.forEach(app => {
      if (!stats[app.campaign_id]) {
        stats[app.campaign_id] = {
          total: 0,        // 총 지원자
          selected: 0,     // 선정 완료
          completed: 0     // 작업 완료
        }
      }
      
      stats[app.campaign_id].total++
      
      // 선정 완료: 'selected', 'virtual_selected', 'approved' (일본/미국 사이트에서 사용)
      if (app.status === 'selected' || app.status === 'virtual_selected' || app.status === 'approved') {
        stats[app.campaign_id].selected++
      } else if (app.status === 'completed') {
        stats[app.campaign_id].completed++
      }
    })

    return stats
  } catch (error) {
    console.error(`Exception fetching application stats from ${region}:`, error)
    return {}
  }
}

// Helper function to get application stats using Netlify function (bypasses RLS)
export const getApplicationStatsViaAPI = async (campaignsByRegion) => {
  try {
    const response = await fetch('/.netlify/functions/get-application-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignsByRegion })
    })

    const result = await response.json()

    if (result.success && result.stats) {
      return result.stats
    } else {
      console.error('Failed to load application stats via API:', result.error)
      return {}
    }
  } catch (error) {
    console.error('Error fetching application stats via API:', error)
    return {}
  }
}

// Helper function to get campaigns with application statistics (병렬 최적화 버전)
export const getCampaignsWithStats = async () => {
  const campaigns = await getCampaignsFromAllRegions()

  // 지역별로 캠페인 그룹화 (캠페인 ID만 추출)
  const campaignsByRegion = {}
  campaigns.forEach(campaign => {
    if (!campaignsByRegion[campaign.region]) {
      campaignsByRegion[campaign.region] = []
    }
    campaignsByRegion[campaign.region].push(campaign.id)
  })

  // Netlify 함수를 통해 서비스 롤 키로 애플리케이션 통계 조회 (RLS 우회)
  let stats = await getApplicationStatsViaAPI(campaignsByRegion)

  // API 실패 또는 결과가 비어있으면 직접 DB 조회로 fallback
  if (!stats || Object.keys(stats).length === 0) {
    console.log('[getCampaignsWithStats] API failed, falling back to direct DB query')
    stats = await getApplicationStatsDirectFromAllDBs(campaigns.map(c => c.id))
  }

  // 통계 결과를 캠페인에 매핑
  campaigns.forEach(campaign => {
    campaign.application_stats = stats[campaign.id] || {
      total: 0,
      selected: 0,
      completed: 0
    }
  })

  return campaigns
}

// 모든 DB에서 직접 applications 조회 (API fallback용)
const getApplicationStatsDirectFromAllDBs = async (allCampaignIds) => {
  const regions = ['korea', 'japan', 'us', 'biz']
  const selectedStatuses = ['selected', 'virtual_selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'completed']

  const statsPromises = regions.map(async (region) => {
    const client = getSupabaseClient(region)
    if (!client) return []

    try {
      const { data, error } = await client
        .from('applications')
        .select('campaign_id, status')
        .in('campaign_id', allCampaignIds)

      if (error) {
        console.log(`[Fallback] ${region} query error:`, error.message)
        return []
      }
      console.log(`[Fallback] ${region}: ${data?.length || 0} applications`)
      return data || []
    } catch (err) {
      console.log(`[Fallback] ${region} exception:`, err.message)
      return []
    }
  })

  const results = await Promise.all(statsPromises)
  const allApplications = results.flat()

  // 통계 집계
  const stats = {}
  allApplications.forEach(app => {
    if (!stats[app.campaign_id]) {
      stats[app.campaign_id] = { total: 0, selected: 0, completed: 0 }
    }
    stats[app.campaign_id].total++
    if (selectedStatuses.includes(app.status)) stats[app.campaign_id].selected++
    if (app.status === 'completed') stats[app.campaign_id].completed++
  })

  console.log('[Fallback] Total stats:', Object.keys(stats).length, 'campaigns with applications')
  return stats
}

// 빠른 로딩용 - 통계 없이 캠페인만 가져오기
export const getCampaignsFast = async () => {
  const campaigns = await getCampaignsFromAllRegions()
  campaigns.forEach(campaign => {
    campaign.application_stats = { total: 0, selected: 0, completed: 0 }
  })
  return campaigns
}
