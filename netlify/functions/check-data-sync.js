const { createClient } = require('@supabase/supabase-js')

// 4개 리전 Supabase 클라이언트 생성
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

// 비교 대상 테이블 — selectFields를 최소한으로 제한
const SYNC_TABLES = {
  campaigns: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['title', 'status', 'campaign_type', 'target_country', 'company_id', 'company_email'],
    label: '캠페인'
  },
  applications: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['status', 'campaign_id', 'user_id', 'creator_name', 'applicant_email'],
    label: '신청'
  },
  video_submissions: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['status', 'campaign_id', 'user_id', 'video_number', 'version'],
    label: '영상 제출'
  },
  companies: {
    regions: ['korea', 'biz'],
    idField: 'id',
    keyFields: ['company_name', 'email', 'phone'],
    label: '기업'
  },
  contracts: {
    regions: ['biz'],
    idField: 'id',
    keyFields: ['status', 'company_id', 'campaign_id'],
    label: '계약서'
  },
  payments: {
    regions: ['biz'],
    idField: 'id',
    keyFields: ['status', 'amount', 'company_id', 'campaign_id'],
    label: '결제'
  }
}

// 안전한 테이블 조회 — 필요한 컬럼만 select
async function safeSelect(client, table, fields, limit) {
  try {
    // id + keyFields만 조회
    const selectStr = fields.join(', ')
    const { data, error } = await client.from(table).select(selectStr).limit(limit)
    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01' || error.message?.includes('column')) {
        // 컬럼이 없으면 id만 조회
        const { data: d2, error: e2 } = await client.from(table).select('id').limit(limit)
        if (e2) return { data: null, exists: false, error: e2.message }
        return { data: d2 || [], exists: true, partial: true }
      }
      return { data: null, exists: true, error: error.message }
    }
    return { data: data || [], exists: true }
  } catch (e) {
    return { data: null, exists: false, error: e.message }
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { tables, compareMode } = body

    const targetTables = tables?.length > 0 ? tables : Object.keys(SYNC_TABLES)
    const mode = compareMode || 'key_fields'
    const LIMIT = 2000 // 테이블당 최대 조회 수

    // 사용 가능한 리전 확인
    const availableRegions = {}
    for (const r of ['korea', 'japan', 'us', 'biz']) {
      const c = getClient(r)
      availableRegions[r] = !!c
    }
    console.log('[check-data-sync] Available regions:', availableRegions)

    const results = {}
    const summary = { total_records: 0, synced: 0, mismatches: 0, missing: 0 }

    // 테이블 순차 처리 (메모리 절약)
    for (const tableName of targetTables) {
      const tableConfig = SYNC_TABLES[tableName]
      if (!tableConfig) continue

      const startTime = Date.now()
      console.log(`[check-data-sync] Checking: ${tableName}`)

      // 조회할 필드 목록
      const selectFields = ['id', ...tableConfig.keyFields]

      // 모든 리전에서 데이터 병렬 조회
      const regionData = {}
      const regionMeta = {}

      const queryResults = await Promise.allSettled(
        tableConfig.regions.map(async (region) => {
          const client = getClient(region)
          if (!client) {
            return { region, data: null, exists: false, error: 'No client (env var missing)' }
          }
          const result = await safeSelect(client, tableName, selectFields, LIMIT)
          return { region, ...result }
        })
      )

      for (const qr of queryResults) {
        const { region, data, exists, error, partial } = qr.status === 'fulfilled' ? qr.value : { region: 'unknown', data: null, exists: false, error: qr.reason?.message }
        regionMeta[region] = { exists, count: data?.length || 0, error: error || null, partial: partial || false }

        // ID로 인덱싱
        const indexed = {}
        if (data) {
          for (const record of data) {
            if (record.id) indexed[record.id] = record
          }
        }
        regionData[region] = indexed
      }

      // 실제로 데이터가 있는 리전만 비교 대상
      const activeRegions = tableConfig.regions.filter(r => regionMeta[r]?.exists && regionMeta[r]?.count > 0)

      // 2개 미만이면 비교 불가
      if (activeRegions.length < 2) {
        results[tableName] = {
          label: tableConfig.label,
          regions: tableConfig.regions,
          regionMeta,
          totalIds: Object.keys(regionData[activeRegions[0]] || {}).length,
          issues: [],
          issueCount: 0,
          elapsed: Date.now() - startTime
        }
        continue
      }

      // 모든 활성 리전에서 고유 ID 수집
      const allIds = new Set()
      for (const region of activeRegions) {
        for (const id of Object.keys(regionData[region])) {
          allIds.add(id)
        }
      }

      // ID별 비교 — 오류만 수집 (최대 500건)
      const issues = []
      const MAX_ISSUES = 500

      for (const id of allIds) {
        if (issues.length >= MAX_ISSUES) break
        summary.total_records++

        // 존재 여부 체크
        const presentIn = []
        const missingIn = []
        for (const region of activeRegions) {
          if (regionData[region][id]) presentIn.push(region)
          else missingIn.push(region)
        }

        // 누락 체크
        if (missingIn.length > 0 && presentIn.length > 0) {
          summary.missing++
          const firstRecord = regionData[presentIn[0]][id]
          issues.push({
            id,
            status: 'missing',
            regions: Object.fromEntries(activeRegions.map(r => [r, !!regionData[r][id]])),
            summary: `${missingIn.join(',')}에 없음`,
            title: firstRecord?.title || firstRecord?.creator_name || firstRecord?.company_name || '',
            fieldDiffs: []
          })
          continue
        }

        // 필드 비교 (mode가 existence가 아닌 경우)
        if (mode !== 'existence' && presentIn.length >= 2) {
          const base = regionData[presentIn[0]][id]
          const fieldDiffs = []

          for (let i = 1; i < presentIn.length; i++) {
            const other = regionData[presentIn[i]][id]
            const compareFields = mode === 'all_fields' ? [...new Set([...Object.keys(base), ...Object.keys(other)])] : tableConfig.keyFields

            for (const field of compareFields) {
              if (field === 'id' || field === 'created_at' || field === 'updated_at') continue
              const valA = base[field]
              const valB = other[field]
              const strA = typeof valA === 'object' ? JSON.stringify(valA) : String(valA ?? '')
              const strB = typeof valB === 'object' ? JSON.stringify(valB) : String(valB ?? '')
              if (strA !== strB) {
                fieldDiffs.push({
                  field,
                  [presentIn[0]]: strA.length > 80 ? strA.slice(0, 80) + '…' : strA,
                  [presentIn[i]]: strB.length > 80 ? strB.slice(0, 80) + '…' : strB
                })
              }
            }
          }

          if (fieldDiffs.length > 0) {
            summary.mismatches++
            issues.push({
              id,
              status: 'mismatch',
              regions: Object.fromEntries(activeRegions.map(r => [r, true])),
              summary: `${fieldDiffs.length}개 필드 불일치`,
              title: base?.title || base?.creator_name || base?.company_name || '',
              fieldDiffs: fieldDiffs.slice(0, 20) // 필드 차이 최대 20개
            })
          } else {
            summary.synced++
          }
        } else {
          summary.synced++
        }
      }

      results[tableName] = {
        label: tableConfig.label,
        regions: tableConfig.regions,
        regionMeta,
        totalIds: allIds.size,
        issues,
        issueCount: issues.length,
        elapsed: Date.now() - startTime
      }

      console.log(`[check-data-sync] ${tableName}: ${allIds.size} records, ${issues.length} issues (${Date.now() - startTime}ms)`)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        availableRegions,
        summary,
        results,
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
        body: JSON.stringify({
          functionName: 'check-data-sync',
          errorMessage: error.message,
          context: { stack: error.stack?.slice(0, 500) }
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
