/**
 * 캠페인 상태 변경 API (관리자용)
 * 캠페인 상태를 변경
 * 모든 리전(korea, japan, us, taiwan)을 지원
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 생성 함수
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

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[update-campaign-status] Missing credentials for region: ${region}`)
    return null
  }

  return createClient(supabaseUrl, supabaseKey)
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    }
  }

  try {
    const { campaignId, region = 'biz', newStatus } = JSON.parse(event.body)

    console.log('[update-campaign-status] Request:', { campaignId, region, newStatus })

    // 입력 검증
    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '캠페인 ID가 필요합니다.' })
      }
    }

    if (!newStatus) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '변경할 상태가 필요합니다.' })
      }
    }

    // 허용된 상태값 검증
    const allowedStatuses = ['draft', 'pending', 'pending_payment', 'approved', 'active', 'paused', 'completed', 'rejected', 'cancelled']
    if (!allowedStatuses.includes(newStatus)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '유효하지 않은 상태값입니다.' })
      }
    }

    // 지역별 Supabase 클라이언트 선택
    const supabaseClient = getSupabaseClient(region)
    if (!supabaseClient) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: `${region} 리전의 Supabase 설정이 없습니다. 환경변수를 확인해주세요.`
        })
      }
    }

    // 업데이트 데이터 준비
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // 활성화 시 추가 필드 설정
    if (newStatus === 'active') {
      updateData.approval_status = 'approved'
      updateData.progress_status = 'recruiting'
      updateData.approved_at = new Date().toISOString()
    }

    // 캠페인 상태 업데이트
    const { data: updatedCampaign, error: updateError } = await supabaseClient
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single()

    if (updateError) {
      console.error('[update-campaign-status] Update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '캠페인 상태 변경 중 오류가 발생했습니다.',
          details: updateError.message
        })
      }
    }

    console.log('[update-campaign-status] Campaign updated successfully:', updatedCampaign?.title || campaignId)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '캠페인 상태가 변경되었습니다.',
        campaign: updatedCampaign
      })
    }

  } catch (error) {
    console.error('[update-campaign-status] Server error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      })
    }
  }
}
