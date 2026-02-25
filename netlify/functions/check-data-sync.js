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

// 비교 대상 테이블 정의
const SYNC_TABLES = {
  campaigns: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['title', 'status', 'campaign_type', 'target_country', 'company_id', 'company_email'],
    selectFields: '*',
    label: '캠페인'
  },
  applications: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['status', 'campaign_id', 'user_id', 'creator_name', 'applicant_email'],
    selectFields: '*',
    label: '신청'
  },
  video_submissions: {
    regions: ['korea', 'japan', 'us', 'biz'],
    idField: 'id',
    keyFields: ['status', 'campaign_id', 'user_id', 'video_number', 'version', 'video_file_url'],
    selectFields: '*',
    label: '영상 제출'
  },
  companies: {
    regions: ['korea', 'biz'],
    idField: 'id',
    keyFields: ['company_name', 'email', 'phone', 'status'],
    selectFields: '*',
    label: '기업'
  },
  contracts: {
    regions: ['biz'],
    idField: 'id',
    keyFields: ['status', 'company_id', 'campaign_id'],
    selectFields: '*',
    label: '계약서'
  },
  payments: {
    regions: ['biz'],
    idField: 'id',
    keyFields: ['status', 'amount', 'company_id', 'campaign_id'],
    selectFields: '*',
    label: '결제'
  }
}

// 안전한 테이블 조회 (테이블이 없을 수 있음)
async function safeSelect(client, table, selectFields, regionName) {
  try {
    let query = client.from(table).select(selectFields)
    const { data, error } = await query.limit(5000)
    if (error) {
      // 테이블이 없는 경우
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return { data: null, exists: false }
      }
      return { data: null, exists: true, error: error.message }
    }
    return { data: data || [], exists: true }
  } catch (e) {
    return { data: null, exists: false, error: e.message }
  }
}

// 두 객체의 필드 차이 비교
function compareFields(recordA, recordB, skipFields = ['created_at', 'updated_at']) {
  const diffs = []
  const allKeys = new Set([...Object.keys(recordA || {}), ...Object.keys(recordB || {})])

  for (const key of allKeys) {
    if (skipFields.includes(key)) continue
    const valA = recordA?.[key]
    const valB = recordB?.[key]

    // JSON 필드 비교
    const strA = typeof valA === 'object' ? JSON.stringify(valA) : String(valA ?? '')
    const strB = typeof valB === 'object' ? JSON.stringify(valB) : String(valB ?? '')

    if (strA !== strB) {
      diffs.push({ field: key, values: { a: valA, b: valB } })
    }
  }
  return diffs
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
    // tables: 조회할 테이블 목록 (기본: 전체)
    // compareMode: 'existence' | 'key_fields' | 'all_fields'

    const targetTables = tables?.length > 0 ? tables : Object.keys(SYNC_TABLES)
    const mode = compareMode || 'all_fields'

    const results = {}
    const summary = { total_records: 0, synced: 0, mismatches: 0, missing: 0, errors: [] }

    for (const tableName of targetTables) {
      const tableConfig = SYNC_TABLES[tableName]
      if (!tableConfig) continue

      console.log(`[check-data-sync] Checking table: ${tableName}`)

      // 모든 리전에서 데이터 조회
      const regionData = {}
      const regionMeta = {}

      await Promise.all(tableConfig.regions.map(async (region) => {
        const client = getClient(region)
        if (!client) {
          regionMeta[region] = { exists: false, count: 0, error: 'Client not available' }
          regionData[region] = {}
          return
        }

        const result = await safeSelect(client, tableName, tableConfig.selectFields, region)
        regionMeta[region] = {
          exists: result.exists,
          count: result.data?.length || 0,
          error: result.error || null
        }

        // ID로 인덱싱
        const indexed = {}
        if (result.data) {
          for (const record of result.data) {
            const id = record[tableConfig.idField]
            if (id) indexed[id] = record
          }
        }
        regionData[region] = indexed
      }))

      // 모든 리전에서 발견된 고유 ID 수집
      const allIds = new Set()
      for (const region of tableConfig.regions) {
        for (const id of Object.keys(regionData[region] || {})) {
          allIds.add(id)
        }
      }

      // ID별로 리전 간 비교
      const records = []
      for (const id of allIds) {
        summary.total_records++

        const record = {
          id,
          regions: {},
          status: 'synced', // synced | mismatch | missing
          issues: []
        }

        // 각 리전에 존재하는지 체크
        const presentRegions = []
        const missingRegions = []
        for (const region of tableConfig.regions) {
          if (!regionMeta[region]?.exists) continue
          if (regionData[region][id]) {
            presentRegions.push(region)
            record.regions[region] = true
          } else {
            missingRegions.push(region)
            record.regions[region] = false
          }
        }

        // 존재 여부 비교
        if (missingRegions.length > 0 && presentRegions.length > 0) {
          record.status = 'missing'
          record.issues.push({
            type: 'missing',
            message: `${missingRegions.join(', ')}에 없음`,
            present: presentRegions,
            missing: missingRegions
          })
          summary.missing++
        }

        // 필드 비교 (existence 모드가 아닌 경우)
        if (mode !== 'existence' && presentRegions.length >= 2) {
          const baseRegion = presentRegions[0]
          const baseRecord = regionData[baseRegion][id]

          for (let i = 1; i < presentRegions.length; i++) {
            const compareRegion = presentRegions[i]
            const compareRecord = regionData[compareRegion][id]

            let diffs
            if (mode === 'key_fields') {
              // 주요 필드만 비교
              const baseFiltered = {}
              const compareFiltered = {}
              for (const f of tableConfig.keyFields) {
                baseFiltered[f] = baseRecord[f]
                compareFiltered[f] = compareRecord[f]
              }
              diffs = compareFields(baseFiltered, compareFiltered, [])
            } else {
              // 전체 필드 비교
              diffs = compareFields(baseRecord, compareRecord)
            }

            if (diffs.length > 0) {
              record.status = 'mismatch'
              record.issues.push({
                type: 'field_mismatch',
                regions: [baseRegion, compareRegion],
                diffs: diffs.map(d => ({
                  field: d.field,
                  [baseRegion]: d.values.a,
                  [compareRegion]: d.values.b
                }))
              })
            }
          }

          if (record.status === 'mismatch') {
            summary.mismatches++
          } else if (record.status === 'synced') {
            summary.synced++
          }
        } else if (presentRegions.length === 1) {
          // 하나의 리전에만 존재 → synced (비교 불필요)
          summary.synced++
        }

        // 문제가 있는 레코드만 포함 (전체 포함 시 너무 많을 수 있음)
        if (record.status !== 'synced') {
          // 각 리전별 실제 데이터도 포함 (엑셀 출력용)
          record.data = {}
          for (const region of presentRegions) {
            record.data[region] = regionData[region][id]
          }
          records.push(record)
        }
      }

      results[tableName] = {
        label: tableConfig.label,
        regions: tableConfig.regions,
        regionMeta,
        totalIds: allIds.size,
        issues: records,
        issueCount: records.length
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        summary,
        results,
        checkedAt: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('[check-data-sync] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'check-data-sync',
          errorMessage: error.message,
          context: {}
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
