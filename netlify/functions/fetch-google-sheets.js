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
    const { action, sheetUrl, nameColumn, emailColumn, country, filterExisting, sheetTab } = JSON.parse(event.body)

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
      const { settings } = JSON.parse(event.body)

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'google_sheets_creator_import',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) {
        throw error
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Settings saved' })
      }
    }

    if (action === 'load_settings') {
      // 시트 설정 불러오기
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'google_sheets_creator_import')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          settings: data?.value || null
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
