const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Sheets public URL에서 전체 데이터 가져오기 (모든 컬럼 포함)
const fetchFullSheetData = async (sheetUrl, sheetTab) => {
  try {
    const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (!idMatch) {
      throw new Error('Invalid Google Sheets URL')
    }
    const spreadsheetId = idMatch[1]

    let gid = '0'
    const gidMatch = sheetUrl.match(/gid=(\d+)/)
    if (gidMatch) {
      gid = gidMatch[1]
    }

    if (sheetTab && /^\d+$/.test(sheetTab)) {
      gid = sheetTab
    }

    const cacheBuster = Date.now()
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&_t=${cacheBuster}`

    console.log(`[daily-report-sheets] Fetching: ${csvUrl}`)

    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoogleDocs)'
      }
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error('시트 접근 권한이 없습니다. 공개 설정을 확인해주세요.')
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`)
    }

    const csvText = await response.text()
    const rows = parseCSV(csvText)

    return { success: true, data: rows }

  } catch (error) {
    console.error('[daily-report-sheets] Error fetching sheet:', error)
    return { success: false, error: error.message }
  }
}

// CSV 파싱
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
        i++
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
        if (char === '\r') i++
      } else if (char !== '\r') {
        currentField += char
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}

// 컬럼 문자를 인덱스로 변환
const columnLetterToIndex = (letter) => {
  if (!letter) return -1
  let result = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    result = result * 26 + (upper.charCodeAt(i) - 64)
  }
  return result - 1
}

// 날짜 파싱 (다양한 형식 지원)
const parseDate = (dateStr) => {
  if (!dateStr) return null

  // 공백 제거
  const cleaned = dateStr.trim()

  // YYYY-MM-DD, YYYY/MM/DD
  let match = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }

  // DD-M-YY 또는 D-M-YY 형식 (예: 26-1-26 = 2026년 1월 26일)
  match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/)
  if (match) {
    let year = parseInt(match[3])
    if (year < 100) year += 2000
    // DD-M-YY 형식으로 가정 (일-월-년)
    return new Date(year, parseInt(match[2]) - 1, parseInt(match[1]))
  }

  // MM/DD/YYYY, MM-DD-YYYY
  match = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]))
  }

  // DD.MM.YYYY (유럽 형식)
  match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
  }

  // 한국어 날짜 형식: 2024년 1월 15일 또는 24년 1월 15일
  match = cleaned.match(/(\d{2,4})년\s*(\d{1,2})월\s*(\d{1,2})일?/)
  if (match) {
    let year = parseInt(match[1])
    if (year < 100) year += 2000
    return new Date(year, parseInt(match[2]) - 1, parseInt(match[3]))
  }

  // 영어 날짜 형식: Jan 26 2026, January 26, 2026 등
  match = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/)
  if (match) {
    const months = {
      'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
      'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5, 'jul': 6, 'july': 6,
      'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'oct': 9, 'october': 9,
      'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    }
    const monthName = match[1].toLowerCase()
    if (months[monthName] !== undefined) {
      return new Date(parseInt(match[3]), months[monthName], parseInt(match[2]))
    }
  }

  // 시도: JavaScript Date 파싱
  const d = new Date(cleaned)
  if (!isNaN(d.getTime())) {
    return d
  }

  return null
}

// 일일 데이터 분석
const analyzeDailyData = (rows, columnConfig) => {
  const {
    dateColumn = 'B',       // 날짜 컬럼 (기본: B)
    creatorColumn = 'D',    // 크리에이터 이름 컬럼 (기본: D - Account Name)
    dmColumn = 'I',         // DM 여부 컬럼 (기본: I - DM Sent)
    emailColumn = 'H',      // 이메일 컬럼 (기본: H - Email)
    statusColumn            // 상태 컬럼 (선택)
  } = columnConfig || {}

  const dateIdx = columnLetterToIndex(dateColumn)
  const creatorIdx = columnLetterToIndex(creatorColumn)
  const dmIdx = columnLetterToIndex(dmColumn)
  const emailIdx = columnLetterToIndex(emailColumn)
  const statusIdx = statusColumn ? columnLetterToIndex(statusColumn) : -1

  // 일별 데이터 집계
  const dailyStats = {}
  const monthlyStats = {}
  let totalCreators = 0
  let totalDM = 0
  let totalEmails = 0

  // 헤더 제외하고 데이터 분석 (첫 행이 헤더라고 가정)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    // 날짜 파싱
    const dateStr = dateIdx >= 0 ? row[dateIdx]?.trim() : null
    const date = parseDate(dateStr)

    if (!date) continue

    // 로컬 날짜로 dateKey 생성 (UTC 변환으로 인한 날짜 밀림 방지)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const monthKey = dateKey.substring(0, 7) // YYYY-MM

    // 크리에이터 데이터 존재 여부 (Account Name이 있으면 카운트)
    const creatorName = creatorIdx >= 0 ? row[creatorIdx]?.trim() : null
    const hasCreator = !!creatorName

    // DM 수량 (YES = 1, NO/빈값 = 0)
    let dmCount = 0
    if (dmIdx >= 0) {
      const rawDmValue = row[dmIdx]
      if (rawDmValue) {
        // 공백 제거 및 대문자 변환
        const dmValue = String(rawDmValue).trim().toUpperCase()
        // YES 변형들 체크 (YES, Y, O, TRUE, 1, DM, DM SENT 등)
        if (dmValue === 'YES' || dmValue === 'Y' || dmValue === 'O' ||
            dmValue === 'TRUE' || dmValue === '1' ||
            dmValue.includes('DM') || dmValue.includes('SENT')) {
          dmCount = 1
        } else if (dmValue !== 'NO' && dmValue !== 'N' && dmValue !== 'X' &&
                   dmValue !== '0' && dmValue !== 'FALSE' && dmValue !== '') {
          // 숫자인 경우
          const num = parseInt(dmValue)
          if (!isNaN(num) && num > 0) {
            dmCount = num
          }
        }
      }
    }

    // 이메일 수집 여부 (유효한 이메일 형식만 카운트)
    let emailCount = 0
    if (emailIdx >= 0) {
      const rawEmailValue = row[emailIdx]
      if (rawEmailValue) {
        const emailValue = String(rawEmailValue).trim().toLowerCase()
        // "dm", "n/a", "-", "x", "no" 등 비이메일 값 제외
        const excludeValues = ['dm', 'n/a', 'na', '-', 'x', 'no', 'none', '', 'null', 'undefined']
        if (!excludeValues.includes(emailValue)) {
          // 이메일 형식 체크 (@가 포함되고 기본적인 이메일 패턴)
          if (emailValue.includes('@') && emailValue.includes('.')) {
            emailCount = 1
          }
        }
      }
    }

    // 상태 (선택)
    const status = statusIdx >= 0 ? row[statusIdx]?.trim() : null

    // 일별 집계
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = {
        date: dateKey,
        creators: 0,
        dm: 0,
        emails: 0,
        rows: []
      }
    }

    if (hasCreator) {
      dailyStats[dateKey].creators++
      totalCreators++
    }
    dailyStats[dateKey].dm += dmCount
    dailyStats[dateKey].emails += emailCount
    totalDM += dmCount
    totalEmails += emailCount

    dailyStats[dateKey].rows.push({
      rowNumber: i + 1,
      date: dateStr,
      creator: creatorName,
      dm: dmCount,
      email: emailCount,
      status
    })

    // 월별 집계
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        month: monthKey,
        creators: 0,
        dm: 0,
        emails: 0,
        days: new Set()
      }
    }

    if (hasCreator) {
      monthlyStats[monthKey].creators++
    }
    monthlyStats[monthKey].dm += dmCount
    monthlyStats[monthKey].emails += emailCount
    monthlyStats[monthKey].days.add(dateKey)
  }

  // Set을 배열로 변환하고 일수 계산
  Object.keys(monthlyStats).forEach(key => {
    monthlyStats[key].workDays = monthlyStats[key].days.size
    delete monthlyStats[key].days
  })

  return {
    daily: Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date)),
    monthly: Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month)),
    totals: {
      creators: totalCreators,
      dm: totalDM,
      emails: totalEmails,
      totalRows: rows.length - 1 // 헤더 제외
    }
  }
}

// AI 분석 (Gemini 사용)
const generateAIAnalysis = async (stats, staffName, sheetName) => {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    return { success: false, error: 'GEMINI_API_KEY not configured' }
  }

  try {
    // 최근 7일 데이터 추출
    const last7Days = stats.daily.slice(0, 7)
    const thisMonth = stats.monthly[0]
    const lastMonth = stats.monthly[1]

    const prompt = `당신은 크리에이터 마케팅 팀의 업무 분석 전문가입니다.
아래 데이터를 분석하고 담당자에게 피드백을 제공해주세요.

담당자: ${staffName}
시트명: ${sheetName}

## 최근 7일 업무 현황
${last7Days.map(d => `- ${d.date}: 크리에이터 ${d.creators}명, DM ${d.dm}건, 메일수집 ${d.emails}건`).join('\n')}

## 이번 달 현황 (${thisMonth?.month || 'N/A'})
- 총 크리에이터: ${thisMonth?.creators || 0}명
- 총 DM: ${thisMonth?.dm || 0}건
- 총 메일수집: ${thisMonth?.emails || 0}건
- 작업일수: ${thisMonth?.workDays || 0}일

## 지난 달 현황 (${lastMonth?.month || 'N/A'})
- 총 크리에이터: ${lastMonth?.creators || 0}명
- 총 DM: ${lastMonth?.dm || 0}건
- 총 메일수집: ${lastMonth?.emails || 0}건

## 분석 요청
1. 업무 성과 평가 (간략하게)
2. 개선이 필요한 부분
3. 잘하고 있는 부분
4. 내일의 목표 제안

한국어로 간결하게 답변해주세요. 200자 이내로 요약하고, 구체적인 숫자와 함께 피드백해주세요.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text

    return { success: true, analysis: analysisText }

  } catch (error) {
    console.error('[daily-report-sheets] AI analysis error:', error)
    return { success: false, error: error.message }
  }
}

exports.handler = async (event) => {
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
    const { action } = body

    // 담당자별 시트 설정 저장
    if (action === 'save_staff_sheets') {
      const { staffSheets } = body

      if (!staffSheets) {
        throw new Error('staffSheets is required')
      }

      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'daily_report_staff_sheets',
          value: JSON.stringify(staffSheets),
          description: '일일 보고서 담당자별 시트 설정',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Settings saved' })
      }
    }

    // 담당자별 시트 설정 로드
    if (action === 'load_staff_sheets') {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'daily_report_staff_sheets')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      let staffSheets = null
      if (data?.value) {
        try {
          staffSheets = JSON.parse(data.value)
        } catch (e) {
          console.error('[daily-report-sheets] JSON parse error:', e)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, staffSheets })
      }
    }

    // 캐시된 분석 결과 로드
    if (action === 'load_cached_reports') {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'daily_report_cached_results')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      let cachedReports = null
      if (data?.value) {
        try {
          cachedReports = JSON.parse(data.value)
        } catch (e) {
          console.error('[daily-report-sheets] Cached reports parse error:', e)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, cachedReports })
      }
    }

    // 시트 분석
    if (action === 'analyze_sheet') {
      const { sheetUrl, sheetTab, columnConfig, staffName, sheetName } = body

      if (!sheetUrl) {
        throw new Error('sheetUrl is required')
      }

      // 시트 데이터 가져오기
      const sheetResult = await fetchFullSheetData(sheetUrl, sheetTab)
      if (!sheetResult.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: sheetResult.error })
        }
      }

      // 기본 컬럼 설정
      const config = columnConfig || {
        dateColumn: 'A',
        creatorColumn: 'B',
        dmColumn: 'C',
        emailColumn: 'D',
        statusColumn: 'E'
      }

      // 데이터 분석
      const stats = analyzeDailyData(sheetResult.data, config)

      // AI 분석 (선택적)
      let aiAnalysis = null
      if (body.includeAI !== false) {
        const aiResult = await generateAIAnalysis(stats, staffName || '담당자', sheetName || '시트')
        if (aiResult.success) {
          aiAnalysis = aiResult.analysis
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          stats,
          aiAnalysis,
          headers: sheetResult.data[0] || [],
          rowCount: sheetResult.data.length
        })
      }
    }

    // 담당자별 통합 보고서 (여러 시트 합산)
    if (action === 'analyze_staff') {
      const { staffId } = body

      // 설정 로드
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'daily_report_staff_sheets')
        .maybeSingle()

      if (!settingsData?.value) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '담당자 설정이 없습니다.' })
        }
      }

      const staffSheets = JSON.parse(settingsData.value)
      const staffInfo = staffSheets.find(s => s.id === staffId)

      if (!staffInfo) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '담당자를 찾을 수 없습니다.' })
        }
      }

      // 담당자의 모든 시트 분석 및 합산
      const combinedStats = {
        daily: {},
        monthly: {},
        totals: { creators: 0, dm: 0, emails: 0, totalRows: 0 }
      }

      const sheetResults = []

      for (const sheet of staffInfo.sheets) {
        const sheetResult = await fetchFullSheetData(sheet.url, sheet.sheetTab)
        if (!sheetResult.success) {
          sheetResults.push({ sheetName: sheet.name, error: sheetResult.error })
          continue
        }

        const config = sheet.columnConfig || {
          dateColumn: 'A',
          creatorColumn: 'B',
          dmColumn: 'C',
          emailColumn: 'D',
          statusColumn: 'E'
        }

        const stats = analyzeDailyData(sheetResult.data, config)

        // 일별 데이터 합산
        for (const day of stats.daily) {
          if (!combinedStats.daily[day.date]) {
            combinedStats.daily[day.date] = { date: day.date, creators: 0, dm: 0, emails: 0 }
          }
          combinedStats.daily[day.date].creators += day.creators
          combinedStats.daily[day.date].dm += day.dm
          combinedStats.daily[day.date].emails += day.emails
        }

        // 월별 데이터 합산
        for (const month of stats.monthly) {
          if (!combinedStats.monthly[month.month]) {
            combinedStats.monthly[month.month] = { month: month.month, creators: 0, dm: 0, emails: 0, workDays: 0 }
          }
          combinedStats.monthly[month.month].creators += month.creators
          combinedStats.monthly[month.month].dm += month.dm
          combinedStats.monthly[month.month].emails += month.emails
          combinedStats.monthly[month.month].workDays = Math.max(
            combinedStats.monthly[month.month].workDays,
            month.workDays
          )
        }

        // 총합
        combinedStats.totals.creators += stats.totals.creators
        combinedStats.totals.dm += stats.totals.dm
        combinedStats.totals.emails += stats.totals.emails
        combinedStats.totals.totalRows += stats.totals.totalRows

        sheetResults.push({ sheetName: sheet.name, stats })
      }

      // 객체를 배열로 변환
      const finalStats = {
        daily: Object.values(combinedStats.daily).sort((a, b) => b.date.localeCompare(a.date)),
        monthly: Object.values(combinedStats.monthly).sort((a, b) => b.month.localeCompare(a.month)),
        totals: combinedStats.totals
      }

      // AI 분석
      let aiAnalysis = null
      if (body.includeAI !== false) {
        const aiResult = await generateAIAnalysis(finalStats, staffInfo.name, '통합')
        if (aiResult.success) {
          aiAnalysis = aiResult.analysis
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          staffInfo,
          stats: finalStats,
          sheetResults,
          aiAnalysis
        })
      }
    }

    // 전체 담당자 요약 보고서
    if (action === 'analyze_all') {
      const { saveResults } = body
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'daily_report_staff_sheets')
        .maybeSingle()

      if (!settingsData?.value) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, staffReports: [], countryStats: {} })
        }
      }

      const staffSheets = JSON.parse(settingsData.value)
      const staffReports = []

      // 국가별 통계
      const countryStats = {
        KR: { creators: 0, dm: 0, emails: 0 },
        JP: { creators: 0, dm: 0, emails: 0 },
        US: { creators: 0, dm: 0, emails: 0 },
        TW: { creators: 0, dm: 0, emails: 0 },
        OTHER: { creators: 0, dm: 0, emails: 0 }
      }

      for (const staff of staffSheets) {
        const combinedTotals = { creators: 0, dm: 0, emails: 0 }
        const recentDaily = {}

        for (const sheet of staff.sheets) {
          const sheetResult = await fetchFullSheetData(sheet.url, sheet.sheetTab)
          if (!sheetResult.success) continue

          const config = sheet.columnConfig || {
            dateColumn: 'A',
            creatorColumn: 'B',
            dmColumn: 'C',
            emailColumn: 'D'
          }

          const stats = analyzeDailyData(sheetResult.data, config)

          combinedTotals.creators += stats.totals.creators
          combinedTotals.dm += stats.totals.dm
          combinedTotals.emails += stats.totals.emails

          // 국가별 통계 업데이트
          const country = sheet.country || 'KR'
          if (countryStats[country]) {
            countryStats[country].creators += stats.totals.creators
            countryStats[country].dm += stats.totals.dm
            countryStats[country].emails += stats.totals.emails
          } else {
            countryStats.OTHER.creators += stats.totals.creators
            countryStats.OTHER.dm += stats.totals.dm
            countryStats.OTHER.emails += stats.totals.emails
          }

          // 최근 7일 합산
          for (const day of stats.daily.slice(0, 7)) {
            if (!recentDaily[day.date]) {
              recentDaily[day.date] = { date: day.date, creators: 0, dm: 0, emails: 0 }
            }
            recentDaily[day.date].creators += day.creators
            recentDaily[day.date].dm += day.dm
            recentDaily[day.date].emails += day.emails
          }
        }

        staffReports.push({
          staffId: staff.id,
          staffName: staff.name,
          sheetCount: staff.sheets.length,
          totals: combinedTotals,
          recentDaily: Object.values(recentDaily).sort((a, b) => b.date.localeCompare(a.date)),
          kpi: staff.kpi || { creators: 30, dm: 20, emails: 10 }
        })
      }

      // 결과 저장 (캐싱)
      if (saveResults) {
        const cachedData = {
          staffReports,
          countryStats,
          analyzedAt: new Date().toISOString()
        }

        await supabase
          .from('site_settings')
          .upsert({
            key: 'daily_report_cached_results',
            value: JSON.stringify(cachedData),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' })

        console.log('[daily-report-sheets] Analysis results cached')
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, staffReports, countryStats })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid action' })
    }

  } catch (error) {
    console.error('[daily-report-sheets] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
