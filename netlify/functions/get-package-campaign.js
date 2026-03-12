/**
 * 패키지 캠페인 데이터 조회 (기업용)
 * 캠페인 정보 + 크리에이터 풀 + 선택된 크리에이터 상태 반환
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  try {
    const campaignId = event.queryStringParameters?.campaign_id

    if (!campaignId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaign_id가 필요합니다.' })
      }
    }

    // 신청 정보 조회 (캠페인 ID로)
    const { data: application, error: appError } = await supabase
      .from('package_applications')
      .select('*')
      .eq('campaign_id', campaignId)
      .single()

    if (appError || !application) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: '패키지 캠페인을 찾을 수 없습니다.' })
      }
    }

    // 패키지 설정 조회
    const { data: settings } = await supabase
      .from('package_settings')
      .select('*')
      .eq('id', application.package_setting_id)
      .single()

    // 크리에이터 풀 전체 조회 (기업에게는 이름 노출)
    const { data: creators } = await supabase
      .from('package_creators')
      .select('*')
      .eq('package_setting_id', application.package_setting_id)
      .eq('is_available', true)
      .order('display_order', { ascending: true })

    // 선택된 크리에이터 + 상태 조회
    const { data: campaignCreators } = await supabase
      .from('package_campaign_creators')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('selected_at', { ascending: true })

    // 현재 단계 계산
    const selectedCount = campaignCreators?.length || 0
    const totalRequired = settings?.total_creators || 20
    let currentStep = 1

    if (selectedCount > 0) {
      const statuses = campaignCreators.map(c => c.status)
      const shippedCount = statuses.filter(s => ['product_shipping', 'product_delivered', 'filming', 'video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(s)).length
      const videoCount = statuses.filter(s => ['video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(s)).length
      const approvedCount = statuses.filter(s => ['approved', 'uploaded'].includes(s)).length
      const uploadedCount = statuses.filter(s => s === 'uploaded').length

      if (uploadedCount > 0 && approvedCount === selectedCount) currentStep = 5
      else if (approvedCount > 0 || statuses.some(s => s === 'revision_requested')) currentStep = 4
      else if (videoCount > 0 || statuses.some(s => s === 'filming')) currentStep = 3
      else if (shippedCount > 0) currentStep = 2
      else currentStep = 1
    }

    // 단계별 카운트
    const stepCounts = {
      selected: selectedCount,
      shipped: campaignCreators?.filter(c => ['product_shipping', 'product_delivered', 'filming', 'video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(c.status)).length || 0,
      videoSubmitted: campaignCreators?.filter(c => ['video_submitted', 'revision_requested', 'approved', 'uploaded'].includes(c.status)).length || 0,
      approved: campaignCreators?.filter(c => ['approved', 'uploaded'].includes(c.status)).length || 0,
      uploaded: campaignCreators?.filter(c => c.status === 'uploaded').length || 0,
      total: totalRequired
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          application,
          settings,
          creators: creators || [],
          campaignCreators: campaignCreators || [],
          currentStep,
          stepCounts
        }
      })
    }
  } catch (error) {
    console.error('[get-package-campaign] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'get-package-campaign',
          errorMessage: error.message
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
