const { createClient } = require('@supabase/supabase-js')

/**
 * 구글 시트 → 스티비 주소록 자동 싱크
 *
 * 구글 시트에서 크리에이터 이메일을 읽어 스티비 주소록에 자동 추가합니다.
 * 주소록에 추가되면 스티비의 자동 이메일(트리거: 구독자 추가)이 발송됩니다.
 *
 * 스케줄:
 *   - 한국/일본: 매일 오후 5시 KST (UTC 08:00) → scheduled-stibee-sync
 *   - 미국: 매일 오전 10시 EST (UTC 15:00) → scheduled-stibee-sync-us
 *
 * site_settings 테이블의 'google_sheets_creator_import' 키에 설정 저장:
 * {
 *   korea:  { url, nameColumn, emailColumn, sheetTab, stibeeListId, autoSync },
 *   japan:  { url, nameColumn, emailColumn, sheetTab, stibeeListId, autoSync },
 *   japan2: { url, nameColumn, emailColumn, sheetTab, stibeeListId, autoSync },
 *   us:     { url, nameColumn, emailColumn, sheetTab, stibeeListId, autoSync }
 * }
 *
 * targetRegions 환경변수 또는 body.targetRegions로 실행할 리전 필터링 가능
 * 기본값: ['korea', 'japan', 'japan2'] (한국/일본 스케줄)
 */

const STIBEE_API_URL = 'https://api.stibee.com/v1'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getStibeeApiKey(supabase) {
  let apiKey = process.env.STIBEE_API_KEY
  if (apiKey) return apiKey

  const { data } = await supabase
    .from('api_keys')
    .select('api_key')
    .eq('service_name', 'stibee')
    .eq('is_active', true)
    .maybeSingle()

  return data?.api_key
}

// Google Sheets CSV export로 데이터 가져오기
async function fetchSheetData(sheetUrl, nameColumn, emailColumn, sheetTab) {
  const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) throw new Error('Invalid Google Sheets URL')

  const spreadsheetId = idMatch[1]
  let gid = '0'
  const gidMatch = sheetUrl.match(/gid=(\d+)/)
  if (gidMatch) gid = gidMatch[1]
  if (sheetTab && /^\d+$/.test(sheetTab)) gid = sheetTab

  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  const response = await fetch(csvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocs)' }
  })

  if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`)

  const csvText = await response.text()
  const rows = parseCSV(csvText)
  if (rows.length <= 1) return []

  const nameIdx = columnLetterToIndex(nameColumn)
  const emailIdx = columnLetterToIndex(emailColumn)

  const results = []
  const seen = new Set() // 시트 내 중복 제거
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[nameIdx]?.trim()
    const email = row[emailIdx]?.trim()?.toLowerCase()
    if (email && isValidEmail(email) && !seen.has(email)) {
      seen.add(email)
      results.push({ name: name || '', email })
    }
  }
  return results
}

// 이메일 유효성 검사 (Unicode 특수문자 필터링)
function isValidEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false
  // Unicode 수학 기호/특수 스타일 문자 필터 (Stibee failWrongEmail 방지)
  if (/[^\x20-\x7E\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u3000-\u9FFF\uAC00-\uD7AF]/.test(email)) return false
  return true
}

function parseCSV(text) {
  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    if (inQuotes) {
      if (char === '"' && nextChar === '"') { currentField += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { currentField += char }
    } else {
      if (char === '"') { inQuotes = true }
      else if (char === ',') { currentRow.push(currentField); currentField = '' }
      else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField); rows.push(currentRow); currentRow = []; currentField = ''
        if (char === '\r') i++
      } else if (char !== '\r') { currentField += char }
    }
  }
  if (currentField || currentRow.length > 0) { currentRow.push(currentField); rows.push(currentRow) }
  return rows
}

function columnLetterToIndex(letter) {
  let result = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64)
  }
  return result - 1
}

// 스티비 주소록에 구독자 일괄 추가 (100명씩, 그룹 지정 가능)
async function addToStibeeList(apiKey, listId, subscribers, groupIds) {
  const BATCH_SIZE = 100
  const results = { success: 0, update: 0, fail: 0 }

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)

    const requestBody = {
      eventOccuredBy: 'MANUAL',
      confirmEmailYN: 'N',
      subscribers: batch.map(s => ({
        email: s.email,
        name: s.name || ''
      }))
    }
    // 그룹 ID가 있으면 추가 (문자열 배열이어야 함!)
    if (groupIds && groupIds.length > 0) {
      requestBody.groupIds = groupIds
    }

    const response = await fetch(`${STIBEE_API_URL}/lists/${listId}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      console.error(`[stibee-sync] Batch add failed: ${response.status}`)
      results.fail += batch.length
      continue
    }

    const data = await response.json()
    const value = data.Value || data.value || {}
    results.success += (value.success || []).length
    results.update += (value.update || []).length
    // 실제 Stibee API 필드명 사용
    const failCount = (value.failDuplicatedEmail || []).length +
      (value.failWrongEmail || []).length +
      (value.failValidation || []).length +
      (value.failNoEmail || []).length +
      (value.failExistEmail || []).length +
      (value.failUnknown || []).length
    results.fail += failCount

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  return results
}

// 이미 동기화된 이메일 목록 가져오기
async function getSyncedEmails(supabase, region) {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', `stibee_synced_emails_${region}`)
    .maybeSingle()

  if (data?.value) {
    try {
      return new Set(JSON.parse(data.value))
    } catch (e) { /* ignore */ }
  }
  return new Set()
}

// 동기화된 이메일 목록 저장
async function saveSyncedEmails(supabase, region, emailSet) {
  const emailArray = [...emailSet]
  await supabase
    .from('site_settings')
    .upsert({
      key: `stibee_synced_emails_${region}`,
      value: JSON.stringify(emailArray),
      description: `스티비 자동 싱크 - ${region} 동기화된 이메일 목록`,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })
}

// 메인 동기화 로직
async function syncRegion(supabase, apiKey, sheetConfig) {
  const { region, sheetUrl, nameColumn, emailColumn, sheetTab, stibeeListId, stibeeGroupId } = sheetConfig

  console.log(`[stibee-sync] === Syncing ${region} ===`)

  // 1. 구글 시트에서 데이터 가져오기
  const sheetData = await fetchSheetData(sheetUrl, nameColumn, emailColumn, sheetTab)
  console.log(`[stibee-sync] Sheet data: ${sheetData.length} rows`)

  if (sheetData.length === 0) {
    return { region, status: 'skip', message: 'No data in sheet' }
  }

  // 2. 이미 동기화된 이메일 확인
  const syncedEmails = await getSyncedEmails(supabase, region)
  console.log(`[stibee-sync] Already synced: ${syncedEmails.size} emails`)

  // 3. 새로운 이메일만 필터
  const newSubscribers = sheetData.filter(s => !syncedEmails.has(s.email))
  console.log(`[stibee-sync] New subscribers: ${newSubscribers.length}`)

  if (newSubscribers.length === 0) {
    return { region, status: 'skip', message: 'No new subscribers', total: sheetData.length }
  }

  // 4. 스티비 주소록에 추가 (그룹 지정 가능, 문자열 배열 필수)
  const groupIds = stibeeGroupId ? [String(stibeeGroupId)] : []
  const addResults = await addToStibeeList(apiKey, stibeeListId, newSubscribers, groupIds)
  console.log(`[stibee-sync] Stibee results:`, addResults)

  // 5. 동기화된 이메일 목록 업데이트
  for (const s of newSubscribers) {
    syncedEmails.add(s.email)
  }
  await saveSyncedEmails(supabase, region, syncedEmails)

  return {
    region,
    status: 'success',
    total: sheetData.length,
    newCount: newSubscribers.length,
    stibeeResults: addResults
  }
}

exports.handler = async (event) => {
  // 스케줄 실행 여부 확인 (Netlify 스케줄 함수는 body가 비어있거나 없음)
  const isScheduledRun = !event.httpMethod || event.httpMethod === 'GET' ||
    (event.headers && event.headers['x-netlify-schedule'] === 'true')

  console.log('[stibee-sync] Triggered.', {
    httpMethod: event.httpMethod,
    hasBody: !!event.body,
    bodyLength: event.body?.length,
    isScheduledRun,
    timestamp: new Date().toISOString()
  })

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  let supabase = null

  // 실행 리전 결정 (락 키 구분용)
  var targetRegions = null
  if (event.body) {
    try {
      var parsedBodyEarly = JSON.parse(event.body)
      targetRegions = parsedBodyEarly.targetRegions || null
    } catch (e) { /* ignore */ }
  }
  var lockSuffix = targetRegions ? targetRegions.sort().join('_') : 'default'
  var LOCK_KEY = 'stibee_sync_lock_' + lockSuffix

  console.log('[stibee-sync] Lock key:', LOCK_KEY, 'targetRegions:', targetRegions)

  try {
    supabase = getSupabase()

    // 중복 실행 방지 (10분 타임아웃)
    try {
      const { data: lockData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', LOCK_KEY)
        .maybeSingle()

      if (lockData && lockData.value) {
        try {
          var lockInfo = JSON.parse(lockData.value)
          var lockTime = new Date(lockInfo.time)
          var now = new Date()
          if (now - lockTime < 10 * 60 * 1000) {
            console.log('[stibee-sync] Already running (lock: ' + LOCK_KEY + '), skipping. Lock set at:', lockInfo.time)
            return {
              statusCode: 200, headers,
              body: JSON.stringify({ success: true, message: 'Already running', lockKey: LOCK_KEY })
            }
          }
        } catch (parseErr) {
          // 이전 형식 호환 (단순 ISO string)
          var lockTime2 = new Date(lockData.value)
          var now2 = new Date()
          if (now2 - lockTime2 < 10 * 60 * 1000) {
            console.log('[stibee-sync] Already running (legacy lock), skipping')
            return {
              statusCode: 200, headers,
              body: JSON.stringify({ success: true, message: 'Already running' })
            }
          }
        }
      }
    } catch (lockErr) {
      console.error('[stibee-sync] Lock check error:', lockErr)
    }

    // 락 설정 (리전 정보 포함)
    await supabase.from('site_settings').upsert({
      key: LOCK_KEY,
      value: JSON.stringify({ time: new Date().toISOString(), regions: targetRegions || 'all' }),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).catch(function () {})

    // 설정 로드
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'google_sheets_creator_import')
      .maybeSingle()

    if (!settingsData || !settingsData.value) {
      console.log('[stibee-sync] No sync settings found')
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: false, error: '동기화 설정이 없습니다. 관리자 페이지에서 설정해주세요.' })
      }
    }

    var settings = JSON.parse(settingsData.value)

    // 오브젝트 형식 → 배열 변환
    var sheets = []
    var keys = Object.keys(settings)
    for (var k = 0; k < keys.length; k++) {
      var region = keys[k]
      var config = settings[region]
      if (config && typeof config === 'object' && config.url) {
        sheets.push({
          region: region,
          sheetUrl: config.url,
          nameColumn: config.nameColumn || 'A',
          emailColumn: config.emailColumn || 'B',
          sheetTab: config.sheetTab || '',
          stibeeListId: config.stibeeListId,
          stibeeGroupId: config.stibeeGroupId || '',
          enabled: config.autoSync !== false
        })
      }
    }

    if (sheets.length === 0) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: false, error: '동기화할 시트가 없습니다.' })
      }
    }

    // 리전 필터링 (이미 event.body에서 파싱한 targetRegions 재활용)
    var targetRegion = null
    var DEFAULT_REGIONS = ['korea', 'japan', 'japan2']

    if (event.body && !targetRegions) {
      try {
        var parsedBody = JSON.parse(event.body)
        targetRegion = parsedBody.region || null
        if (!targetRegions) targetRegions = parsedBody.targetRegions || null
      } catch (parseErr) { /* ignore */ }
    }

    // 스케줄 실행이거나 명시적인 리전 지정이 없으면 기본 리전 사용
    var allowedRegions = targetRegions || (targetRegion ? [targetRegion] : (isScheduledRun ? DEFAULT_REGIONS : null))

    var apiKey = await getStibeeApiKey(supabase)
    if (!apiKey) {
      throw new Error('STIBEE_API_KEY가 설정되지 않았습니다.')
    }

    // 활성화된 시트만 필터
    var activeSheets = sheets.filter(function (s) {
      return s.enabled !== false &&
        s.sheetUrl &&
        s.stibeeListId &&
        (!allowedRegions || allowedRegions.includes(s.region))
    })

    var results = []
    for (var i = 0; i < activeSheets.length; i++) {
      try {
        var result = await syncRegion(supabase, apiKey, activeSheets[i])
        results.push(result)
      } catch (syncErr) {
        console.error('[stibee-sync] Error syncing ' + activeSheets[i].region + ':', syncErr)
        results.push({ region: activeSheets[i].region, status: 'error', error: syncErr.message })
      }
    }

    console.log('[stibee-sync] All results:', JSON.stringify(results))

    // 동기화 로그 저장
    await supabase.from('site_settings').upsert({
      key: 'stibee_sync_last_result',
      value: JSON.stringify({ timestamp: new Date().toISOString(), results: results }),
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' }).catch(function () {})

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, results: results })
    }

  } catch (error) {
    console.error('[stibee-sync] Fatal error:', error)
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ success: false, error: error.message || String(error) })
    }
  } finally {
    // 락 해제
    try {
      if (supabase) {
        await supabase.from('site_settings').delete().eq('key', LOCK_KEY)
        // 이전 형식 락도 정리
        await supabase.from('site_settings').delete().eq('key', 'stibee_sync_lock').catch(function () {})
      }
    } catch (finallyErr) {
      console.error('[stibee-sync] Lock release error:', finallyErr)
    }
  }
}
