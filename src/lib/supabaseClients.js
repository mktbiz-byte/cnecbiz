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
  
  const url = import.meta.env.VITE_SUPABASE_KOREA_URL || 'https://vluqhvuhykncicgvkosd.supabase.co'
  const key = import.meta.env.VITE_SUPABASE_KOREA_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsdXFodnVoeWtuY2ljZ3Zrb3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjg2MzAsImV4cCI6MjA3Njg0NDYzMH0.ikEqdx6Le54YJUP-NROKg6EmeHJ4TbKkQ76pw29OQG8'
  
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
  const url = import.meta.env.VITE_SUPABASE_BIZ_URL || 'https://hbymozdhjseqebpomjsp.supabase.co'
  const key = import.meta.env.VITE_SUPABASE_BIZ_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhieW1vemRoanNlcWVicG9tanNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjA5NTgsImV4cCI6MjA3NjYzNjk1OH0.T7Dn0oYWTqoJTDDgWLGMEJzwFpMXNXtGgvQVB6aWCkI'
  
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
      console.log(`[getCampaignsFromAllRegions] Client for ${region}:`, client ? 'exists' : 'null')
      
      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`[getCampaignsFromAllRegions] Error from ${region}:`, error)
        console.error(`[getCampaignsFromAllRegions] Error details:`, JSON.stringify(error))
      } else if (data) {
        console.log(`[getCampaignsFromAllRegions] Fetched ${data.length} campaigns from ${region}`)
        console.log(`[getCampaignsFromAllRegions] Sample campaign from ${region}:`, data[0] ? Object.keys(data[0]) : 'no data')
        
        // 지역별 스키마 차이를 통일된 형식으로 매핑
        const normalizedCampaigns = data.map(campaign => {
          // 지역별 통화 단위
          const currencySymbol = {
            'korea': '₩',
            'japan': '¥',
            'us': '$',
            'taiwan': 'NT$',
            'biz': '₩'
          }[region] || '₩'
          
          // 기본 필드 매핑
          const normalized = {
            ...campaign,
            region,
            currency: currencySymbol,
            // 제목 통일
            campaign_name: campaign.title || campaign.product_name || campaign.campaign_name || '제목 없음',
            // 설명 통일
            description: campaign.description || '설명 없음',
            // 예산 계산
            budget: campaign.estimated_cost || // 한국 (estimated_cost)
                   (campaign.reward_amount && campaign.max_participants 
                     ? campaign.reward_amount * campaign.max_participants  // 일본/미국/대만
                     : campaign.budget || 0),
            // 크리에이터 수 (모집 인원)
            creator_count: campaign.total_slots || campaign.max_participants || campaign.creator_count || 0,
            // 날짜 필드 통일
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            application_deadline: campaign.application_deadline || campaign.recruitment_deadline,
            // 상태 통일
            status: campaign.status,
            approval_status: campaign.approval_status || campaign.status
          }
          
          return normalized
        })
        
        allCampaigns.push(...normalizedCampaigns)
      } else {
        console.warn(`[getCampaignsFromAllRegions] No data and no error from ${region}`)
      }
    } catch (error) {
      console.error(`[getCampaignsFromAllRegions] Exception from ${region}:`, error)
      console.error(`[getCampaignsFromAllRegions] Exception details:`, error.message, error.stack)
    }
  }

  console.log(`[getCampaignsFromAllRegions] Total campaigns: ${allCampaigns.length}`)
  return allCampaigns
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

// Helper function to get campaigns with application statistics
export const getCampaignsWithStats = async () => {
  const campaigns = await getCampaignsFromAllRegions()
  
  // 지역별로 캠페인 그룹화
  const campaignsByRegion = {}
  campaigns.forEach(campaign => {
    if (!campaignsByRegion[campaign.region]) {
      campaignsByRegion[campaign.region] = []
    }
    campaignsByRegion[campaign.region].push(campaign)
  })

  // 각 지역별로 지원자 통계 조회
  for (const [region, regionCampaigns] of Object.entries(campaignsByRegion)) {
    const campaignIds = regionCampaigns.map(c => c.id)
    const stats = await getApplicationStatsForCampaigns(campaignIds, region)
    
    // 캠페인에 통계 추가
    regionCampaigns.forEach(campaign => {
      campaign.application_stats = stats[campaign.id] || {
        total: 0,
        selected: 0,
        completed: 0
      }
    })
  }

  return campaigns
}
