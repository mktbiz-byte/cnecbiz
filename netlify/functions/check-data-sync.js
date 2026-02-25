const { createClient } = require('@supabase/supabase-js')

// 리전별 Supabase 클라이언트 (lazy init)
const clients = {}
function getClient(region) {
  if (clients[region]) return clients[region]
  const configs = {
    korea: { url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY },
    japan: { url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY },
    us: { url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY },
    biz: { url: process.env.VITE_SUPABASE_BIZ_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  }
  const cfg = configs[region]
  if (!cfg?.url || !cfg?.key) return null
  clients[region] = createClient(cfg.url, cfg.key)
  return clients[region]
}

// 안전한 쿼리 실행
async function safeQuery(client, table, select, filters, limit) {
  try {
    let q = client.from(table).select(select)
    if (filters) {
      for (const [col, val] of Object.entries(filters)) {
        q = q.eq(col, val)
      }
    }
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) return { data: null, error: error.message }
    return { data: data || [] }
  } catch (e) {
    return { data: null, error: e.message }
  }
}

// 테이블 레코드 수 안전 조회
async function safeCount(client, table) {
  try {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true })
    if (error) return { count: 0, error: error.message }
    return { count: count || 0 }
  } catch (e) {
    return { count: 0, error: e.message }
  }
}

// ID 집합 조회 (최대 3000건)
async function fetchIds(client, table, column = 'id', limit = 3000) {
  try {
    const { data, error } = await client.from(table).select(column).limit(limit)
    if (error) return new Set()
    return new Set((data || []).map(r => r[column]).filter(Boolean))
  } catch {
    return new Set()
  }
}

// 캠페인 ID를 모든 리전에서 수집
async function getAllCampaignIds() {
  const regions = ['korea', 'japan', 'us']
  const allIds = new Set()
  const regionMap = {} // campaignId -> region

  await Promise.all(regions.map(async (region) => {
    const client = getClient(region)
    if (!client) return
    const ids = await fetchIds(client, 'campaigns', 'id')
    for (const id of ids) {
      allIds.add(id)
      regionMap[id] = region
    }
  }))

  return { allIds, regionMap }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const body = JSON.parse(event.body || '{}')
    const { checks: requestedChecks } = body
    const startTime = Date.now()

    // 1. 리전 연결 확인
    const regionStatus = {}
    const REGIONS = ['korea', 'japan', 'us', 'biz']
    for (const r of REGIONS) {
      const t = Date.now()
      const c = getClient(r)
      regionStatus[r] = { available: !!c, latency: Date.now() - t }
    }

    // 2. DB 현황 (각 테이블별 레코드 수)
    const overviewTables = ['campaigns', 'applications', 'video_submissions', 'companies', 'contracts', 'payments']
    const overview = {}

    await Promise.all(overviewTables.map(async (table) => {
      const counts = {}
      await Promise.all(REGIONS.map(async (region) => {
        const client = getClient(region)
        if (!client) { counts[region] = { count: 0, error: 'not connected' }; return }
        counts[region] = await safeCount(client, table)
      }))
      overview[table] = counts
    }))

    // 3. 무결성 검사
    const checks = []
    const bizClient = getClient('biz')

    // 전체 캠페인 ID 맵 (리전 DB 기준)
    const { allIds: allCampaignIds, regionMap: campaignRegionMap } = await getAllCampaignIds()
    console.log(`[check-data-sync] 캠페인 총 ${allCampaignIds.size}개 (${Object.keys(campaignRegionMap).length} mapped)`)

    // ===== CHECK 1: 결제 → 캠페인 연결 =====
    if (!requestedChecks || requestedChecks.includes('orphaned_payments')) {
      const t = Date.now()
      const issues = []
      if (bizClient) {
        const { data: payments } = await safeQuery(bizClient, 'payments', 'id, campaign_id, status, amount, company_id, created_at', null, 2000)
        if (payments) {
          for (const p of payments) {
            if (p.campaign_id && !allCampaignIds.has(p.campaign_id)) {
              issues.push({
                id: p.id,
                refId: p.campaign_id,
                refType: 'campaign_id',
                detail: `결제 ${p.status || ''} / ${(p.amount || 0).toLocaleString()}원`,
                created: p.created_at
              })
            }
          }
        }
      }
      checks.push({
        id: 'orphaned_payments',
        label: '결제 → 캠페인 연결',
        description: 'BIZ 결제의 campaign_id가 리전 DB에 존재하는지',
        severity: 'high',
        totalChecked: overview.payments?.biz?.count || 0,
        issueCount: issues.length,
        issues: issues.slice(0, 100),
        elapsed: Date.now() - t
      })
    }

    // ===== CHECK 2: 계약 → 캠페인 연결 =====
    if (!requestedChecks || requestedChecks.includes('orphaned_contracts')) {
      const t = Date.now()
      const issues = []
      if (bizClient) {
        const { data: contracts } = await safeQuery(bizClient, 'contracts', 'id, campaign_id, status, company_id, created_at', null, 2000)
        if (contracts) {
          for (const c of contracts) {
            if (c.campaign_id && !allCampaignIds.has(c.campaign_id)) {
              issues.push({
                id: c.id,
                refId: c.campaign_id,
                refType: 'campaign_id',
                detail: `계약 ${c.status || ''}`,
                created: c.created_at
              })
            }
          }
        }
      }
      checks.push({
        id: 'orphaned_contracts',
        label: '계약 → 캠페인 연결',
        description: 'BIZ 계약의 campaign_id가 리전 DB에 존재하는지',
        severity: 'high',
        totalChecked: overview.contracts?.biz?.count || 0,
        issueCount: issues.length,
        issues: issues.slice(0, 100),
        elapsed: Date.now() - t
      })
    }

    // ===== CHECK 3: 캠페인 → 기업 연결 =====
    if (!requestedChecks || requestedChecks.includes('campaign_company_link')) {
      const t = Date.now()
      const issues = []
      if (bizClient) {
        // BIZ companies의 모든 ID 수집
        const companyIds = await fetchIds(bizClient, 'companies', 'id')
        const companyUserIds = await fetchIds(bizClient, 'companies', 'user_id')
        const allCompanyIds = new Set([...companyIds, ...companyUserIds])

        // 각 리전 DB의 캠페인에서 company_id 체크
        const regions = ['korea', 'japan', 'us']
        await Promise.all(regions.map(async (region) => {
          const client = getClient(region)
          if (!client) return
          const { data: campaigns } = await safeQuery(client, 'campaigns', 'id, title, company_id, company_email, status', null, 1000)
          if (campaigns) {
            for (const c of campaigns) {
              if (c.company_id && !allCompanyIds.has(c.company_id)) {
                issues.push({
                  id: c.id,
                  refId: c.company_id,
                  refType: 'company_id',
                  detail: `[${region.toUpperCase()}] ${c.title || ''} (${c.status || ''})`,
                  region,
                  created: null
                })
              }
            }
          }
        }))
      }
      checks.push({
        id: 'campaign_company_link',
        label: '캠페인 → 기업 연결',
        description: '리전 캠페인의 company_id가 BIZ companies에 존재하는지',
        severity: 'medium',
        totalChecked: (overview.campaigns?.korea?.count || 0) + (overview.campaigns?.japan?.count || 0) + (overview.campaigns?.us?.count || 0),
        issueCount: issues.length,
        issues: issues.slice(0, 100),
        elapsed: Date.now() - t
      })
    }

    // ===== CHECK 4: 신청 → 캠페인 연결 (같은 리전) =====
    if (!requestedChecks || requestedChecks.includes('orphaned_applications')) {
      const t = Date.now()
      const issues = []
      const regions = ['korea', 'japan', 'us']
      await Promise.all(regions.map(async (region) => {
        const client = getClient(region)
        if (!client) return
        // 해당 리전의 캠페인 ID
        const regionCampaignIds = await fetchIds(client, 'campaigns', 'id')
        // 해당 리전의 applications
        const { data: apps } = await safeQuery(client, 'applications', 'id, campaign_id, creator_name, applicant_name, status', null, 2000)
        if (apps) {
          for (const a of apps) {
            if (a.campaign_id && !regionCampaignIds.has(a.campaign_id)) {
              issues.push({
                id: a.id,
                refId: a.campaign_id,
                refType: 'campaign_id',
                detail: `[${region.toUpperCase()}] ${a.creator_name || a.applicant_name || ''} (${a.status || ''})`,
                region,
                created: null
              })
            }
          }
        }
      }))
      checks.push({
        id: 'orphaned_applications',
        label: '신청 → 캠페인 연결',
        description: '리전 신청의 campaign_id가 같은 리전 campaigns에 존재하는지',
        severity: 'medium',
        totalChecked: (overview.applications?.korea?.count || 0) + (overview.applications?.japan?.count || 0) + (overview.applications?.us?.count || 0),
        issueCount: issues.length,
        issues: issues.slice(0, 100),
        elapsed: Date.now() - t
      })
    }

    // ===== CHECK 5: 영상제출 → 캠페인 연결 (같은 리전) =====
    if (!requestedChecks || requestedChecks.includes('orphaned_videos')) {
      const t = Date.now()
      const issues = []
      const regions = ['korea', 'japan', 'us']
      await Promise.all(regions.map(async (region) => {
        const client = getClient(region)
        if (!client) return
        const regionCampaignIds = await fetchIds(client, 'campaigns', 'id')
        const { data: vids } = await safeQuery(client, 'video_submissions', 'id, campaign_id, user_id, status, video_number', null, 2000)
        if (vids) {
          for (const v of vids) {
            if (v.campaign_id && !regionCampaignIds.has(v.campaign_id)) {
              issues.push({
                id: v.id,
                refId: v.campaign_id,
                refType: 'campaign_id',
                detail: `[${region.toUpperCase()}] 영상${v.video_number || ''} (${v.status || ''})`,
                region,
                created: null
              })
            }
          }
        }
      }))
      checks.push({
        id: 'orphaned_videos',
        label: '영상제출 → 캠페인 연결',
        description: '리전 영상제출의 campaign_id가 같은 리전 campaigns에 존재하는지',
        severity: 'medium',
        totalChecked: (overview.video_submissions?.korea?.count || 0) + (overview.video_submissions?.japan?.count || 0) + (overview.video_submissions?.us?.count || 0),
        issueCount: issues.length,
        issues: issues.slice(0, 100),
        elapsed: Date.now() - t
      })
    }

    // 요약
    const summary = {
      totalChecks: checks.length,
      passed: checks.filter(c => c.issueCount === 0).length,
      failed: checks.filter(c => c.issueCount > 0).length,
      totalIssues: checks.reduce((sum, c) => sum + c.issueCount, 0),
      highSeverityIssues: checks.filter(c => c.severity === 'high' && c.issueCount > 0).length
    }

    console.log(`[check-data-sync] 완료: ${checks.length}개 검사, ${summary.totalIssues}개 이슈 (${Date.now() - startTime}ms)`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        regionStatus,
        overview,
        checks,
        summary,
        elapsed: Date.now() - startTime,
        checkedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[check-data-sync] Error:', error.message, error.stack)
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName: 'check-data-sync', errorMessage: error.message, context: { stack: error.stack?.slice(0, 500) } })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
}
