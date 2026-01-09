/**
 * 캠페인 상태 변경 API (관리자용)
 * 캠페인 상태를 변경
 * 모든 리전(korea, japan, us, taiwan)을 지원
 * active로 변경 시 캠페인 승인 알림톡 발송
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 클라이언트 생성 함수
function getSupabaseClient(region) {
  let supabaseUrl, supabaseKey

  switch (region) {
    case 'korea':
    case 'kr':
      supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_KOREA_SERVICE_KEY
      break
    case 'japan':
    case 'jp':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      // 다양한 환경변수 이름 지원
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_JAPAN_SERVICE_KEY
      break
    case 'us':
    case 'usa':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      // 다양한 환경변수 이름 지원
      supabaseKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.SUPABASE_US_SERVICE_KEY
      break
    case 'taiwan':
    case 'tw':
      supabaseUrl = process.env.VITE_SUPABASE_TAIWAN_URL
      supabaseKey = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY || process.env.SUPABASE_TAIWAN_SERVICE_KEY
      break
    default:
      supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
      supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[update-campaign-status] Missing credentials for region: ${region}`, {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    })
    return null
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
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
    console.log('[update-campaign-status] Updating campaign:', campaignId, 'to status:', newStatus, 'region:', region)

    // 캠페인 상태 업데이트
    // 일본/미국은 updated_at 컬럼이 없을 수 있으므로 status만 업데이트
    let updateData = { status: newStatus }

    // 한국/biz는 updated_at 포함
    if (region === 'korea' || region === 'kr' || region === 'biz' || !region) {
      updateData.updated_at = new Date().toISOString()
    }

    const { error: updateError } = await supabaseClient
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)

    if (updateError) {
      console.error('[update-campaign-status] Update error:', JSON.stringify(updateError))
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

    console.log('[update-campaign-status] Campaign updated successfully:', campaignId)

    // active로 변경 시 캠페인 승인 알림톡 발송 (한국 캠페인만)
    const isKorea = ['korea', 'kr', 'KR', 'biz'].includes(region) || !region
    console.log('[update-campaign-status] isKorea:', isKorea, 'region:', region)
    if (newStatus === 'active' && isKorea) {
      try {
        // 알림톡 발송을 위해 send-kakao-notification 함수 직접 호출
        const { data: campaign } = await supabaseClient
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single()

        if (campaign) {
          let company = null

          console.log('[update-campaign-status] Campaign data:', {
            company_id: campaign.company_id,
            company_email: campaign.company_email,
            user_id: campaign.user_id
          })

          // 1. company_id로 찾기
          if (campaign.company_id) {
            const { data: companyData } = await supabaseClient
              .from('companies')
              .select('*')
              .eq('id', campaign.company_id)
              .maybeSingle()
            company = companyData
            console.log('[update-campaign-status] Found by company_id:', !!companyData)
          }

          // 2. company_email로 찾기
          if (!company && campaign.company_email) {
            const { data: companyData } = await supabaseClient
              .from('companies')
              .select('*')
              .eq('email', campaign.company_email)
              .maybeSingle()
            company = companyData
            console.log('[update-campaign-status] Found by company_email:', !!companyData)
          }

          // 3. user_id로 찾기 (기업 회원인 경우)
          if (!company && campaign.user_id) {
            const { data: companyData } = await supabaseClient
              .from('companies')
              .select('*')
              .eq('user_id', campaign.user_id)
              .maybeSingle()
            company = companyData
            console.log('[update-campaign-status] Found by user_id:', !!companyData)
          }

          console.log('[update-campaign-status] Company found:', company ? { name: company.company_name, phone: company.phone } : null)

          if (company && company.phone) {
            const templateCode = '025100001005'

            const formatDate = (dateString) => {
              if (!dateString) return '-'
              const date = new Date(dateString)
              return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '')
            }

            const variables = {
              '회사명': company.company_name || '고객사',
              '캠페인명': campaign.title || campaign.campaign_name || '캠페인',
              '시작일': formatDate(campaign.recruitment_start_date || campaign.start_date),
              '마감일': formatDate(campaign.recruitment_deadline || campaign.end_date),
              '모집인원': (campaign.total_slots || campaign.target_creators || 0).toString()
            }

            console.log('[update-campaign-status] Sending approval notification:', variables)

            // HTTP로 send-kakao-notification 호출 (내장 fetch 사용)
            const kakaoResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-kakao-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: company.phone,
                receiverName: company.company_name,
                templateCode,
                variables
              })
            })
            const kakaoResult = await kakaoResponse.json()
            console.log('[update-campaign-status] Kakao notification result:', kakaoResult)
          } else {
            console.log('[update-campaign-status] No company phone found')
          }
        }
      } catch (notifError) {
        console.error('[update-campaign-status] Notification error:', notifError)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '캠페인 상태가 변경되었습니다.'
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
