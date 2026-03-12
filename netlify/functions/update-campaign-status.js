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
      supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
    case 'jp':
      supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
      // 다양한 환경변수 이름 지원
      supabaseKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
    case 'usa':
      supabaseUrl = process.env.VITE_SUPABASE_US_URL
      // 다양한 환경변수 이름 지원
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

    // completed로 변경 시 biz DB에도 동기화 + 네이버 웍스 알림
    if (newStatus === 'completed' && region !== 'biz') {
      try {
        const bizClient = getSupabaseClient('biz')
        if (bizClient) {
          await bizClient
            .from('campaigns')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', campaignId)
          console.log('[update-campaign-status] biz DB sync completed')
        }
      } catch (bizSyncError) {
        console.warn('[update-campaign-status] biz DB sync failed:', bizSyncError.message)
      }

      // 네이버 웍스 알림 (완료)
      try {
        const regionClient = getSupabaseClient(region)
        let campaignTitle = '캠페인'
        if (regionClient) {
          const { data: cData } = await regionClient
            .from('campaigns')
            .select('title, campaign_name')
            .eq('id', campaignId)
            .single()
          if (cData) campaignTitle = cData.title || cData.campaign_name || '캠페인'
        }
        const regionFlag = { korea: '🇰🇷', japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼', kr: '🇰🇷' }[region] || ''
        const regionLabel = { korea: '한국', japan: '일본', us: '미국', taiwan: '대만', kr: '한국' }[region] || region || '한국'
        const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

        await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message: `${regionFlag} ✅ 캠페인 수동 완료\n\n• 캠페인: ${campaignTitle}\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
          })
        })
        console.log('[update-campaign-status] 완료 네이버 웍스 알림 발송 완료')
      } catch (worksError) {
        console.error('[update-campaign-status] 완료 네이버 웍스 알림 오류:', worksError)
      }
    }

    // completed로 변경 시 biz 리전이면 직접 네이버 웍스 알림
    if (newStatus === 'completed' && region === 'biz') {
      try {
        const bizClient = getSupabaseClient('biz')
        let campaignTitle = '캠페인'
        if (bizClient) {
          const { data: cData } = await bizClient
            .from('campaigns')
            .select('title, campaign_name')
            .eq('id', campaignId)
            .single()
          if (cData) campaignTitle = cData.title || cData.campaign_name || '캠페인'
        }
        const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

        await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
            message: `✅ 캠페인 수동 완료\n\n• 캠페인: ${campaignTitle}\n• 리전: biz\n• 시간: ${koreanTime}`
          })
        })
        console.log('[update-campaign-status] biz 완료 네이버 웍스 알림 발송 완료')
      } catch (worksError) {
        console.error('[update-campaign-status] biz 완료 네이버 웍스 알림 오류:', worksError)
      }
    }

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
            company_biz_id: campaign.company_biz_id,
            company_id: campaign.company_id,
            company_email: campaign.company_email
          })

          // ===== 회사 조회 (BIZ DB 우선 — companies 테이블은 BIZ DB에 존재) =====
          // save-video-upload.js, notify-creator-application.js와 동일한 우선순위
          const bizClient = getSupabaseClient('biz') || supabaseClient

          // 1순위: company_biz_id → companies.id (백필된 정확한 매칭 — 가장 신뢰)
          if (campaign.company_biz_id) {
            const { data: companyData } = await bizClient
              .from('companies')
              .select('*')
              .eq('id', campaign.company_biz_id)
              .maybeSingle()
            if (companyData) {
              company = companyData
              console.log('[update-campaign-status] Found by company_biz_id in biz DB')
            }
          }

          // 2순위: company_email → companies.email
          if (!company && campaign.company_email) {
            const { data: companyData } = await bizClient
              .from('companies')
              .select('*')
              .eq('email', campaign.company_email)
              .maybeSingle()
            if (companyData) {
              company = companyData
              console.log('[update-campaign-status] Found by company_email in biz DB')
            }
          }

          // 3순위: company_id → companies.id (직접 매칭 우선)
          if (!company && campaign.company_id) {
            const { data: companyData } = await bizClient
              .from('companies')
              .select('*')
              .eq('id', campaign.company_id)
              .maybeSingle()
            if (companyData) {
              company = companyData
              console.log('[update-campaign-status] Found by company_id→id in biz DB')
            }
          }

          // 4순위: company_id → companies.user_id (auth user ID 매칭)
          if (!company && campaign.company_id) {
            const { data: companyData } = await bizClient
              .from('companies')
              .select('*')
              .eq('user_id', campaign.company_id)
              .maybeSingle()
            if (companyData) {
              company = companyData
              console.log('[update-campaign-status] Found by company_id→user_id in biz DB')
            }
          }

          // 5순위: 리전 DB에서도 fallback 조회 (BIZ DB에서 못 찾은 경우)
          if (!company && region !== 'biz') {
            if (campaign.company_email) {
              const { data: companyData } = await supabaseClient
                .from('companies')
                .select('*')
                .eq('email', campaign.company_email)
                .maybeSingle()
              if (companyData) {
                company = companyData
                console.log('[update-campaign-status] Found by email in regional DB')
              }
            }
            if (!company && campaign.company_id) {
              const { data: companyData } = await supabaseClient
                .from('companies')
                .select('*')
                .eq('id', campaign.company_id)
                .maybeSingle()
              if (companyData) {
                company = companyData
                console.log('[update-campaign-status] Found by id in regional DB')
              }
            }
            if (!company && campaign.company_id) {
              const { data: companyData } = await supabaseClient
                .from('companies')
                .select('*')
                .eq('user_id', campaign.company_id)
                .maybeSingle()
              if (companyData) {
                company = companyData
                console.log('[update-campaign-status] Found by user_id in regional DB')
              }
            }
          }

          const companyNotifyPhone = company ? (company.notification_phone || company.phone) : null
          console.log('[update-campaign-status] Company found:', company ? { name: company.company_name, phone: companyNotifyPhone } : null)

          if (company && companyNotifyPhone) {
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
                receiverNum: companyNotifyPhone,
                receiverName: company.notification_contact_person || company.company_name,
                templateCode,
                variables
              })
            })
            const kakaoResult = await kakaoResponse.json()
            console.log('[update-campaign-status] Kakao notification result:', kakaoResult)
          } else {
            console.log('[update-campaign-status] No company phone found')
          }

          // 기업 이메일 발송
          const companyNotifyEmail = company ? (company.notification_email || company.email) : null
          if (companyNotifyEmail) {
            try {
              const { generateEmailHtml } = require('./send-notification-helper')
              const emailTemplate = generateEmailHtml('025100001005', variables)
              const emailResponse = await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: companyNotifyEmail,
                  subject: emailTemplate.subject,
                  html: emailTemplate.html
                })
              })
              const emailResult = await emailResponse.json()
              console.log('[update-campaign-status] Company email result:', emailResult)
            } catch (emailError) {
              console.error('[update-campaign-status] Company email failed:', emailError.message)
            }
          }

          // 네이버 웍스 알림 (active 변경 시)
          try {
            const companyDisplayName = company?.company_name || '기업'
            const campaignTitle = campaign.title || campaign.campaign_name || '캠페인'
            const regionFlag = { korea: '🇰🇷', japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼', biz: '🇰🇷', kr: '🇰🇷' }[region] || ''
            const regionLabel = { korea: '한국', japan: '일본', us: '미국', taiwan: '대만', biz: '한국', kr: '한국' }[region] || region || '한국'
            const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

            await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                isAdminNotification: true,
                channelId: '75c24874-e370-afd5-9da3-72918ba15a3c',
                message: `${regionFlag} ✅ 캠페인 활성화 (입금확인 후 자동승인)\n\n• 기업: ${companyDisplayName}\n• 캠페인: ${campaignTitle}\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
              })
            })
            console.log('[update-campaign-status] 네이버 웍스 알림 발송 완료')
          } catch (worksError) {
            console.error('[update-campaign-status] 네이버 웍스 알림 오류:', worksError)
          }
        }
      } catch (notifError) {
        console.error('[update-campaign-status] Notification error:', notifError)
      }
    }

    // 캠페인 상태 변경 알림 (수정요청/업데이트 방) - paused, rejected, cancelled 등
    if (['paused', 'rejected', 'cancelled', 'pending', 'draft'].includes(newStatus)) {
      try {
        const regionClient = getSupabaseClient(region)
        let campaignTitle = '캠페인'
        if (regionClient) {
          const { data: cData } = await regionClient
            .from('campaigns')
            .select('title, campaign_name')
            .eq('id', campaignId)
            .single()
          if (cData) campaignTitle = cData.title || cData.campaign_name || '캠페인'
        }
        const regionFlag = { korea: '🇰🇷', japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼', kr: '🇰🇷', biz: '🇰🇷' }[region] || ''
        const regionLabel = { korea: '한국', japan: '일본', us: '미국', taiwan: '대만', kr: '한국', biz: '한국' }[region] || region || '한국'
        const statusLabel = { paused: '일시정지', rejected: '반려', cancelled: '취소', pending: '대기', draft: '초안' }[newStatus] || newStatus
        const koreanTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

        await fetch(`${process.env.URL || 'https://cnecbiz.com'}/.netlify/functions/send-naver-works-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            channelId: '54220a7e-0b14-1138-54ec-a55f62dc8b75',
            message: `${regionFlag} ⚠️ 캠페인 상태 변경\n\n• 캠페인: ${campaignTitle}\n• 변경 상태: ${statusLabel}\n• 리전: ${regionLabel}\n• 시간: ${koreanTime}`
          })
        })
        console.log('[update-campaign-status] 상태 변경 네이버 웍스 알림 발송 완료 (업데이트 방)')
      } catch (worksError) {
        console.error('[update-campaign-status] 상태 변경 네이버 웍스 알림 오류:', worksError)
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

    // 에러 알림 발송
    try {
      const { campaignId, status, region } = JSON.parse(event.body || '{}')
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-campaign-status (캠페인 상태 변경)',
          errorMessage: error.message,
          context: { 캠페인ID: campaignId, 상태: status, 리전: region }
        })
      })
    } catch (e) { console.error('[update-campaign-status] Error alert failed:', e.message) }

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
