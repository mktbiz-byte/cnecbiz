/**
 * 크리에이터 강제 취소 (관리자 전용)
 * - 캠페인 참여 중인 크리에이터를 스케줄 미준수 등의 사유로 강제 취소
 * - applications 테이블의 status를 'force_cancelled'로 변경
 * - BIZ DB의 creator_force_cancel_logs에 이력 저장
 * - 네이버 웍스 알림 발송
 */

const { createClient } = require('@supabase/supabase-js')

function getSupabaseClient(region) {
  let supabaseUrl, supabaseKey

  switch (region) {
    case 'korea':
    case 'kr':
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
    case 'jp':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
    case 'usa':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      supabaseKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    case 'taiwan':
    case 'tw':
      supabaseUrl = process.env.VITE_SUPABASE_TAIWAN_URL
      supabaseKey = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY
      break
    default:
      supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
  }

  try {
    const {
      applicationId,
      campaignId,
      region = 'biz',
      reason,
      cancelledByEmail,
      // 로그용 추가 정보
      campaignTitle,
      creatorName,
      creatorEmail,
      companyName
    } = JSON.parse(event.body)

    console.log('[force-cancel-creator] Request:', { applicationId, campaignId, region, reason })

    if (!applicationId) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '신청 ID가 필요합니다.' }) }
    }
    if (!reason || reason.trim().length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '취소 사유를 입력해주세요.' }) }
    }

    // 리전 DB에서 application 조회 및 상태 변경
    const regionClient = getSupabaseClient(region)
    if (!regionClient) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: `${region} 리전 DB 설정이 없습니다.` }) }
    }

    // 현재 상태 조회
    const { data: application, error: fetchError } = await regionClient
      .from('applications')
      .select('id, status, user_id, campaign_id')
      .eq('id', applicationId)
      .single()

    if (fetchError || !application) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '해당 신청을 찾을 수 없습니다.' }) }
    }

    const previousStatus = application.status

    if (previousStatus === 'force_cancelled' || previousStatus === 'rejected') {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '이미 취소/거절된 신청입니다.' }) }
    }

    // applications 상태 변경
    const { error: updateError } = await regionClient
      .from('applications')
      .update({
        status: 'force_cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('[force-cancel-creator] Update error:', updateError)
      throw new Error('상태 변경 실패: ' + updateError.message)
    }

    console.log('[force-cancel-creator] Application status updated to force_cancelled')

    // BIZ DB에 취소 로그 저장
    const bizClient = getSupabaseClient('biz')
    if (bizClient) {
      try {
        const { error: logError } = await bizClient
          .from('creator_force_cancel_logs')
          .insert({
            application_id: applicationId,
            campaign_id: campaignId || application.campaign_id,
            campaign_title: campaignTitle || null,
            creator_name: creatorName || null,
            creator_email: creatorEmail || null,
            company_name: companyName || null,
            region,
            previous_status: previousStatus,
            cancelled_by_email: cancelledByEmail || null,
            reason: reason.trim()
          })
        if (logError) console.error('[force-cancel-creator] Log insert error:', logError.message)
        else console.log('[force-cancel-creator] Cancel log saved')
      } catch (logErr) {
        console.error('[force-cancel-creator] Log failed:', logErr.message)
      }
    }

    // 네이버 웍스 알림
    try {
      const regionLabel = { korea: '한국', japan: '일본', us: '미국', taiwan: '대만', biz: '한국', kr: '한국' }[region] || region
      const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

      await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
          message: `🚫 크리에이터 강제 취소\n\n• 캠페인: ${campaignTitle || '-'}\n• 크리에이터: ${creatorName || '-'}\n• 이전 상태: ${previousStatus}\n• 취소 사유: ${reason}\n• 처리자: ${cancelledByEmail || '-'}\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
        })
      })
      console.log('[force-cancel-creator] Naver Works notification sent')
    } catch (worksError) {
      console.error('[force-cancel-creator] Naver Works error:', worksError.message)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '크리에이터가 강제 취소되었습니다.',
        data: { applicationId, previousStatus, newStatus: 'force_cancelled' }
      })
    }

  } catch (error) {
    console.error('[force-cancel-creator] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'force-cancel-creator',
          errorMessage: error.message,
          context: JSON.parse(event.body || '{}')
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
