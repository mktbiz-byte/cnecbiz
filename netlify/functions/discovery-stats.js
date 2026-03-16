const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { type, region } = event.queryStringParameters || {}

    if (type === 'servers') {
      // 3서버 heartbeat 상태
      const { data, error } = await supabase
        .from('oc_server_heartbeats')
        .select('*')
        .order('last_heartbeat_at', { ascending: false })

      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data }) }
    }

    if (type === 'kpi') {
      // 오늘/이번주/이번달 통계
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      const monthStart = new Date().toISOString().slice(0, 7) + '-01'

      let creatorsQuery = supabase.from('oc_creators').select('*', { count: 'exact', head: true })
      if (region) creatorsQuery = creatorsQuery.eq('region', region)

      const [
        { count: totalCreators },
        { count: todayCreators },
        { count: todayEmails },
        { count: monthEmails },
      ] = await Promise.all([
        creatorsQuery,
        supabase.from('oc_creators').select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00Z`)
          .modify(q => region ? q.eq('region', region) : q),
        supabase.from('oc_email_queue').select('*', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', `${today}T00:00:00Z`)
          .modify(q => region ? q.eq('server_region', region) : q),
        supabase.from('oc_email_queue').select('*', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', `${monthStart}T00:00:00Z`)
          .modify(q => region ? q.eq('server_region', region) : q),
      ])

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            totalCreators: totalCreators || 0,
            todayCreators: todayCreators || 0,
            todayEmails: todayEmails || 0,
            monthEmails: monthEmails || 0,
          }
        })
      }
    }

    if (type === 'hourly') {
      // 시간별 크리에이터 생성 수 (최근 24시간)
      const { data: runs, error } = await supabase
        .from('oc_discovery_runs')
        .select('started_at, new_count, api_source, server_region')
        .gte('started_at', new Date(Date.now() - 24 * 3600000).toISOString())
        .order('started_at', { ascending: true })
        .modify(q => region ? q.eq('server_region', region) : q)

      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: runs || [] }) }
    }

    if (type === 'recent') {
      // 최근 발굴 크리에이터 50건
      let query = supabase
        .from('oc_creators')
        .select('id, username, platform, followers, email, kbeauty_score, status, contact_status, region, created_at, is_special_target')
        .order('created_at', { ascending: false })
        .limit(50)

      if (region) query = query.eq('region', region)

      const { data, error } = await query
      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data || [] }) }
    }

    if (type === 'email_stats') {
      // 이메일 상태별 통계
      const statuses = ['queued', 'sent', 'failed', 'bounced']
      const results = {}

      for (const status of statuses) {
        let query = supabase.from('oc_email_queue').select('*', { count: 'exact', head: true }).eq('status', status)
        if (region) query = query.eq('server_region', region)
        const { count } = await query
        results[status] = count || 0
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: results }) }
    }

    if (type === 'blocklist') {
      // 블랙리스트 목록
      const { data, error } = await supabase
        .from('oc_global_blocklist')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data || [] }) }
    }

    // 기본: 전체 요약
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Use ?type=servers|kpi|hourly|recent|email_stats|blocklist' })
    }

  } catch (error) {
    console.error('[discovery-stats] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'discovery-stats',
          errorMessage: error.message,
          context: { query: event.queryStringParameters }
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
