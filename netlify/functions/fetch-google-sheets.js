const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Sheets public URL에서 데이터 가져오기
const fetchSheetData = async (sheetUrl, nameColumn, emailColumn, sheetTab) => {
  try {
    // Google Sheets URL에서 spreadsheet ID와 gid 추출
    // Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={GID}
    const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!idMatch) {
      throw new Error('Invalid Google Sheets URL')
    }
    const spreadsheetId = idMatch[1]

    // URL에서 gid 추출 시도
    let gid = '0' // 기본값: 첫 번째 시트
    const gidMatch = sheetUrl.match(/gid=(\d+)/)
    if (gidMatch) {
      gid = gidMatch[1]
    }

    // sheetTab 파라미터가 있으면 해당 값 사용 (시트 번호 또는 gid)
    if (sheetTab) {
      // 숫자면 gid로 사용, 아니면 시트 이름으로 간주
      if (/^\d+$/.test(sheetTab)) {
        gid = sheetTab
      }
    }

    // 공개 시트의 경우 CSV export URL 사용 (gid 포함)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

    console.log(`Fetching sheet: ${csvUrl}`)

    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocs)'
      }
    })

    // 401/403 에러 처리
    if (response.status === 401 || response.status === 403) {
      throw new Error('시트 접근 권한이 없습니다. Google Sheets 공유 설정에서 "링크가 있는 모든 사용자 - 뷰어"로 설정해주세요.')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()

    // CSV 파싱
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return { success: true, data: [], message: 'No data found in sheet' }
    }

    // 컬럼 인덱스 계산 (A=0, B=1, C=2, ...)
    const nameColIndex = columnLetterToIndex(nameColumn)
    const emailColIndex = columnLetterToIndex(emailColumn)

    // 헤더 제외하고 데이터 추출
    const creators = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const name = row[nameColIndex]?.trim()
      const email = row[emailColIndex]?.trim()

      // 이메일 유효성 검사
      if (email && isValidEmail(email)) {
        creators.push({
          name: name || 'Unknown',
          email: email.toLowerCase(),
          row_number: i + 1
        })
      }
    }

    return { success: true, data: creators }

  } catch (error) {
    console.error('Error fetching sheet:', error)
    return { success: false, error: error.message }
  }
}

// CSV 파싱 (쉼표, 따옴표 처리)
const parseCSV = (text) => {
  const rows = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField)
        currentField = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        if (char === '\r') i++ // Skip \n
      } else if (char !== '\r') {
        currentField += char
      }
    }
  }

  // Last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}

// 컬럼 문자를 인덱스로 변환 (A=0, B=1, ..., Z=25, AA=26, ...)
const columnLetterToIndex = (letter) => {
  let result = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64)
  }
  return result - 1
}

// 이메일 유효성 검사
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// 기존 가입자/크리에이터 필터링
const filterExistingUsers = async (emails) => {
  try {
    // 여러 테이블에서 이메일 조회
    const emailLower = emails.map(e => e.toLowerCase())

    // 1. user_profiles 테이블
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('email')
      .in('email', emailLower)

    // 2. creators 테이블 (있다면)
    let existingCreators = []
    try {
      const { data } = await supabase
        .from('creators')
        .select('email')
        .in('email', emailLower)
      existingCreators = data || []
    } catch (e) {
      // creators 테이블이 없을 수 있음
    }

    // 3. applications 테이블
    const { data: applications } = await supabase
      .from('applications')
      .select('email')
      .in('email', emailLower)

    // 중복 이메일 Set 생성
    const existingEmails = new Set()

    if (userProfiles) {
      userProfiles.forEach(p => p.email && existingEmails.add(p.email.toLowerCase()))
    }
    if (existingCreators) {
      existingCreators.forEach(c => c.email && existingEmails.add(c.email.toLowerCase()))
    }
    if (applications) {
      applications.forEach(a => a.email && existingEmails.add(a.email.toLowerCase()))
    }

    return existingEmails

  } catch (error) {
    console.error('Error filtering existing users:', error)
    return new Set()
  }
}

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const body = JSON.parse(event.body)
    const { action, sheetUrl, nameColumn, emailColumn, country, filterExisting, sheetTab, settings } = body

    if (action === 'fetch') {
      // Google Sheets에서 데이터 가져오기
      const result = await fetchSheetData(sheetUrl, nameColumn, emailColumn, sheetTab)

      if (!result.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(result)
        }
      }

      let creators = result.data
      let existingCount = 0

      // 기존 가입자 필터링
      if (filterExisting && creators.length > 0) {
        const emails = creators.map(c => c.email)
        const existingEmails = await filterExistingUsers(emails)

        existingCount = creators.filter(c => existingEmails.has(c.email.toLowerCase())).length

        creators = creators.map(c => ({
          ...c,
          is_existing: existingEmails.has(c.email.toLowerCase())
        }))
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: creators,
          total: creators.length,
          existing_count: existingCount,
          new_count: creators.length - existingCount,
          country: country
        })
      }
    }

    if (action === 'save_settings') {
      // 시트 설정 저장 (site_settings 테이블 사용)
      if (!settings) {
        throw new Error('Settings not provided')
      }

      console.log('[fetch-google-sheets] Saving settings:', JSON.stringify(settings))

      // value 컬럼이 TEXT 타입이므로 JSON 문자열로 변환하여 저장
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'google_sheets_creator_import',
          value: JSON.stringify(settings),
          description: 'Google Sheets 크리에이터 가져오기 설정',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) {
        console.error('[fetch-google-sheets] Save error:', error)
        throw error
      }

      console.log('[fetch-google-sheets] Settings saved successfully')

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Settings saved' })
      }
    }

    if (action === 'sync_to_stibee') {
      // 구글 시트 → 스티비 주소록 자동 싱크
      console.log('[sync_to_stibee] Starting sync...')

      // 1. 설정 로드
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'google_sheets_creator_import')
        .maybeSingle()

      if (!settingsData || !settingsData.value) {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ success: false, error: '동기화 설정이 없습니다. 설정을 먼저 저장해주세요.' })
        }
      }

      const syncSettings = JSON.parse(settingsData.value)

      // 2. 스티비 API 키
      let stibeeApiKey = process.env.STIBEE_API_KEY
      if (!stibeeApiKey) {
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('api_key')
          .eq('service_name', 'stibee')
          .eq('is_active', true)
          .maybeSingle()
        stibeeApiKey = keyData?.api_key
      }
      if (!stibeeApiKey) {
        throw new Error('STIBEE_API_KEY가 설정되지 않았습니다.')
      }

      // 3. 리전 필터 (body.targetRegions로 필터 가능)
      const targetRegions = body.targetRegions || null

      // 4. 각 리전 동기화
      const results = []
      const regionKeys = Object.keys(syncSettings)

      for (let r = 0; r < regionKeys.length; r++) {
        const regionKey = regionKeys[r]
        const config = syncSettings[regionKey]

        // 필터 + 유효성 체크
        if (!config || !config.url || !config.stibeeListId) continue
        if (config.autoSync === false) continue
        if (targetRegions && !targetRegions.includes(regionKey)) continue

        console.log(`[sync_to_stibee] Syncing ${regionKey}...`)

        try {
          // 4a. 구글 시트 데이터 가져오기
          const sheetResult = await fetchSheetData(
            config.url,
            config.nameColumn || 'A',
            config.emailColumn || 'B',
            config.sheetTab || ''
          )
          if (!sheetResult.success || !sheetResult.data || sheetResult.data.length === 0) {
            results.push({ region: regionKey, status: 'skip', message: '시트 데이터 없음' })
            continue
          }

          // 4b. 이미 동기화된 이메일 체크
          const syncedKey = `stibee_synced_emails_${regionKey}`
          const { data: syncedData } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', syncedKey)
            .maybeSingle()

          let syncedEmails = new Set()
          if (syncedData && syncedData.value) {
            try { syncedEmails = new Set(JSON.parse(syncedData.value)) } catch (e) { /* ignore */ }
          }

          // 4c. 새 이메일 필터
          const newSubscribers = sheetResult.data.filter(s => !syncedEmails.has(s.email))
          console.log(`[sync_to_stibee] ${regionKey}: ${sheetResult.data.length} total, ${newSubscribers.length} new`)

          if (newSubscribers.length === 0) {
            results.push({ region: regionKey, status: 'skip', message: '변경없음', total: sheetResult.data.length })
            continue
          }

          // 4d. 스티비 주소록에 추가 (100명씩 배치)
          const BATCH_SIZE = 100
          const stibeeResults = { success: 0, update: 0, fail: 0 }
          const groupIds = config.stibeeGroupId ? [Number(config.stibeeGroupId)] : []

          for (let bi = 0; bi < newSubscribers.length; bi += BATCH_SIZE) {
            const batch = newSubscribers.slice(bi, bi + BATCH_SIZE)
            const reqBody = {
              eventOccurredBy: 'MANUAL',
              confirmEmailYN: 'N',
              subscribers: batch.map(s => ({ email: s.email, name: s.name || '' }))
            }
            if (groupIds.length > 0) reqBody.groupIds = groupIds

            const stibeeRes = await fetch(`https://api.stibee.com/v1/lists/${config.stibeeListId}/subscribers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'AccessToken': stibeeApiKey },
              body: JSON.stringify(reqBody)
            })

            if (stibeeRes.ok) {
              const stibeeData = await stibeeRes.json()
              const val = stibeeData.Value || stibeeData.value || {}
              stibeeResults.success += (val.success || []).length
              stibeeResults.update += (val.update || []).length
              stibeeResults.fail += (val.failDuplicate || []).length + (val.failUnknown || []).length
            } else {
              console.error(`[sync_to_stibee] Stibee API error: ${stibeeRes.status}`)
              stibeeResults.fail += batch.length
            }

            if (bi + BATCH_SIZE < newSubscribers.length) {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }

          // 4e. 동기화 이메일 목록 업데이트
          for (let ni = 0; ni < newSubscribers.length; ni++) {
            syncedEmails.add(newSubscribers[ni].email)
          }
          await supabase.from('site_settings').upsert({
            key: syncedKey,
            value: JSON.stringify([...syncedEmails]),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' })

          results.push({
            region: regionKey,
            status: 'success',
            total: sheetResult.data.length,
            newCount: newSubscribers.length,
            stibeeResults
          })
        } catch (regionErr) {
          console.error(`[sync_to_stibee] Error ${regionKey}:`, regionErr)
          results.push({ region: regionKey, status: 'error', error: regionErr.message })
        }
      }

      // 5. 결과 저장
      try {
        await supabase.from('site_settings').upsert({
          key: 'stibee_sync_last_result',
          value: JSON.stringify({ timestamp: new Date().toISOString(), results }),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      } catch (e) { /* ignore */ }

      console.log('[sync_to_stibee] Done:', JSON.stringify(results))
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, results })
      }
    }

    if (action === 'count_sheets') {
      // 각 리전별 구글 시트 인원수 카운트
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'google_sheets_creator_import')
        .maybeSingle()

      if (!settingsData || !settingsData.value) {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ success: true, counts: {} })
        }
      }

      const sheetConfigs = JSON.parse(settingsData.value)
      const counts = {}
      let totalAll = 0

      const regionKeys = Object.keys(sheetConfigs)
      for (let i = 0; i < regionKeys.length; i++) {
        const key = regionKeys[i]
        const config = sheetConfigs[key]
        if (!config || !config.url) {
          counts[key] = 0
          continue
        }
        try {
          const result = await fetchSheetData(
            config.url,
            config.nameColumn || 'A',
            config.emailColumn || 'B',
            config.sheetTab || ''
          )
          const count = result.success ? (result.data || []).length : 0
          counts[key] = count
          totalAll += count
        } catch (e) {
          console.error(`[count_sheets] Error counting ${key}:`, e)
          counts[key] = 0
        }
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, counts, total: totalAll })
      }
    }

    if (action === 'load_settings') {
      // 시트 설정 불러오기 (커스텀 키 지원)
      const settingsKey = body.settingsKey || 'google_sheets_creator_import'
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', settingsKey)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('[fetch-google-sheets] Load error:', error)
        throw error
      }

      // TEXT로 저장된 JSON을 파싱
      let parsedSettings = null
      if (data?.value) {
        try {
          parsedSettings = JSON.parse(data.value)
        } catch (e) {
          console.error('[fetch-google-sheets] JSON parse error:', e)
          // 파싱 실패 시 null 반환
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          settings: parsedSettings
        })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[fetch-google-sheets] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
