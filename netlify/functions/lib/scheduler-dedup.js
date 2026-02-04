/**
 * 스케줄러 중복 실행 방지 헬퍼
 * - 인메모리 락 (동일 컨테이너 재실행 방지)
 * - DB 기반 락 (다른 컨테이너 중복 실행 방지, 테이블 자동 생성)
 */
const { createClient } = require('@supabase/supabase-js')

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000 // 5분
const _executionTimes = {} // 함수별 인메모리 락

function getSupabaseBiz() {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * 중복 실행 체크
 * @param {string} functionName - 함수 이름 (고유 키)
 * @param {object} event - Netlify event 객체
 * @returns {{ isDuplicate: boolean, reason?: string }}
 */
async function checkDuplicate(functionName, event) {
  // 수동 실행이면 중복 체크 안 함
  const queryParams = event?.queryStringParameters || {}
  const isManualTest = queryParams.manual === 'true' || queryParams.test === 'true'
  if (isManualTest) {
    return { isDuplicate: false }
  }

  // 1. 인메모리 락
  const now = Date.now()
  if (_executionTimes[functionName] && (now - _executionTimes[functionName]) < DUPLICATE_WINDOW_MS) {
    const secAgo = Math.round((now - _executionTimes[functionName]) / 1000)
    console.log(`[${functionName}] 인메모리 중복 감지: ${secAgo}초 전 실행됨. 스킵.`)
    return { isDuplicate: true, reason: `In-memory duplicate (${secAgo}s ago)` }
  }
  _executionTimes[functionName] = now

  // 2. DB 기반 락
  const supabase = getSupabaseBiz()
  if (!supabase) {
    console.log(`[${functionName}] Supabase BIZ 미설정, DB 중복 체크 건너뜀`)
    return { isDuplicate: false }
  }

  try {
    // 테이블 존재 확인 및 조회
    const { data: lastExec, error } = await supabase
      .from('scheduler_executions')
      .select('executed_at')
      .eq('function_name', functionName)
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      // 테이블이 없는 경우 - RPC로 생성 시도
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log(`[${functionName}] scheduler_executions 테이블 없음, 생성 시도...`)
        try {
          await supabase.rpc('exec_sql', {
            sql: `CREATE TABLE IF NOT EXISTS scheduler_executions (
              function_name text PRIMARY KEY,
              executed_at timestamptz NOT NULL DEFAULT now()
            )`
          })
          console.log(`[${functionName}] 테이블 생성 완료`)
        } catch (createErr) {
          console.log(`[${functionName}] 테이블 생성 실패 (수동으로 생성 필요):`, createErr.message)
          console.log(`[${functionName}] SQL: CREATE TABLE scheduler_executions (function_name text PRIMARY KEY, executed_at timestamptz NOT NULL DEFAULT now())`)
        }
      } else {
        console.log(`[${functionName}] DB 조회 오류:`, error.message)
      }
      // DB 오류 시 인메모리 락만으로 진행
      return { isDuplicate: false }
    }

    if (lastExec) {
      const timeDiff = now - new Date(lastExec.executed_at).getTime()
      if (timeDiff < DUPLICATE_WINDOW_MS) {
        const secAgo = Math.round(timeDiff / 1000)
        console.log(`[${functionName}] DB 중복 감지: ${secAgo}초 전 실행됨. 스킵.`)
        return { isDuplicate: true, reason: `DB duplicate (${secAgo}s ago)` }
      }
    }

    // 현재 실행 기록
    await supabase
      .from('scheduler_executions')
      .upsert(
        { function_name: functionName, executed_at: new Date().toISOString() },
        { onConflict: 'function_name' }
      )

  } catch (e) {
    console.log(`[${functionName}] DB 중복 체크 오류, 계속 진행:`, e.message)
  }

  return { isDuplicate: false }
}

/**
 * 중복이면 바로 리턴할 response 생성
 */
function skipResponse(reason) {
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, skipped: true, reason })
  }
}

module.exports = { checkDuplicate, skipResponse }
