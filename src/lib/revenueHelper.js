import { getSupabaseClient } from './supabaseClients'

/**
 * 모든 지역의 매출 데이터를 가져옵니다
 */
export const getRevenueFromAllRegions = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const allRevenue = {
    total: 0,
    byRegion: {},
    campaigns: []
  }

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) continue

    try {
      // 완료된 캠페인의 총 비용 계산
      const { data, error } = await client
        .from('campaigns')
        .select('id, title, estimated_cost, payment_status, created_at, company_email')
        .eq('payment_status', 'confirmed')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const regionRevenue = data.reduce((sum, campaign) => sum + (campaign.estimated_cost || 0), 0)
        allRevenue.byRegion[region] = {
          revenue: regionRevenue,
          count: data.length,
          campaigns: data
        }
        allRevenue.total += regionRevenue
        
        // 모든 캠페인 추가 (지역 정보 포함)
        allRevenue.campaigns.push(
          ...data.map(campaign => ({
            ...campaign,
            region
          }))
        )
      }
    } catch (error) {
      console.error(`Error fetching revenue from ${region}:`, error)
    }
  }

  return allRevenue
}

/**
 * 특정 지역의 매출 데이터를 가져옵니다
 */
export const getRevenueByRegion = async (region) => {
  const client = getSupabaseClient(region)
  if (!client) return { revenue: 0, count: 0, campaigns: [] }

  try {
    const { data, error } = await client
      .from('campaigns')
      .select('id, title, estimated_cost, payment_status, created_at, company_email')
      .eq('payment_status', 'confirmed')
      .order('created_at', { ascending: false })

    if (error) throw error

    const revenue = data.reduce((sum, campaign) => sum + (campaign.estimated_cost || 0), 0)
    
    return {
      revenue,
      count: data.length,
      campaigns: data
    }
  } catch (error) {
    console.error(`Error fetching revenue from ${region}:`, error)
    return { revenue: 0, count: 0, campaigns: [] }
  }
}

/**
 * 월별 매출 통계를 가져옵니다
 */
export const getMonthlyRevenueStats = async () => {
  const regions = ['korea', 'japan', 'us', 'taiwan']
  const monthlyStats = {}

  for (const region of regions) {
    const client = getSupabaseClient(region)
    if (!client) continue

    try {
      const { data, error } = await client
        .from('campaigns')
        .select('estimated_cost, payment_confirmed_at')
        .eq('payment_status', 'confirmed')
        .not('payment_confirmed_at', 'is', null)

      if (!error && data) {
        data.forEach(campaign => {
          const date = new Date(campaign.payment_confirmed_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = {
              total: 0,
              byRegion: {}
            }
          }
          
          if (!monthlyStats[monthKey].byRegion[region]) {
            monthlyStats[monthKey].byRegion[region] = 0
          }
          
          monthlyStats[monthKey].total += campaign.estimated_cost || 0
          monthlyStats[monthKey].byRegion[region] += campaign.estimated_cost || 0
        })
      }
    } catch (error) {
      console.error(`Error fetching monthly stats from ${region}:`, error)
    }
  }

  return monthlyStats
}

/**
 * 포인트 충전 내역을 가져옵니다 (CNEC Korea 프로젝트)
 */
export const getPointCharges = async () => {
  const client = getSupabaseClient('korea')
  if (!client) return []

  try {
    const { data, error } = await client
      .from('point_charges')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching point charges:', error)
    return []
  }
}

/**
 * 미수금 내역을 가져옵니다 (CNEC Korea 프로젝트)
 */
export const getAccountsReceivable = async () => {
  const client = getSupabaseClient('korea')
  if (!client) return []

  try {
    const { data, error } = await client
      .from('accounts_receivable')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching accounts receivable:', error)
    return []
  }
}

