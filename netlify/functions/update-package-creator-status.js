/**
 * 패키지 크리에이터 상태 업데이트
 * 크리에이터 선택, 발송, 영상제출, 수정요청, 승인, 업로드 등 상태 전환
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body)
    const { action, campaign_id } = body

    if (!action || !campaign_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'action과 campaign_id가 필요합니다.' })
      }
    }

    let result

    switch (action) {
      case 'select_creators': {
        // 기업이 크리에이터 선택 (bulk insert)
        const { package_creator_ids, application_id } = body
        if (!package_creator_ids || !Array.isArray(package_creator_ids) || package_creator_ids.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '크리에이터를 선택해주세요.' })
          }
        }

        const records = package_creator_ids.map(pcId => ({
          campaign_id,
          package_creator_id: pcId,
          application_id: application_id || null,
          status: 'selected',
          selected_at: new Date().toISOString()
        }))

        const { data, error } = await supabase
          .from('package_campaign_creators')
          .insert(records)
          .select()

        if (error) throw error
        result = data

        // 선정 알림 발송 (fire-and-forget)
        try {
          const baseUrl = process.env.URL || 'https://cnecbiz.com'

          // 캠페인 정보 조회 (리전 확인)
          const { data: campaignData } = await supabase
            .from('campaigns')
            .select('title, region, brand_name, company_name, reward_text, compensation, content_submission_deadline')
            .eq('id', campaign_id)
            .maybeSingle()

          const campaignRegion = campaignData?.region || 'korea'

          // 선정된 크리에이터 정보 조회
          const { data: creators } = await supabase
            .from('package_creators')
            .select('id, name, email, phone, line_user_id, user_id')
            .in('id', package_creator_ids)

          if (creators && creators.length > 0) {
            for (const creator of creators) {
              const pName = creator.name || '크리에이터'
              const pEmail = creator.email
              const pPhone = creator.phone

              if (campaignRegion === 'japan') {
                fetch(`${baseUrl}/.netlify/functions/send-japan-notification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'campaign_selected',
                    creatorId: creator.user_id,
                    lineUserId: creator.line_user_id,
                    creatorEmail: pEmail,
                    creatorPhone: pPhone,
                    data: {
                      creatorName: pName,
                      campaignName: campaignData?.title || '캠페인',
                      brandName: campaignData?.brand_name || campaignData?.company_name,
                      reward: campaignData?.reward_text || campaignData?.compensation || '협의',
                      deadline: campaignData?.content_submission_deadline || '추후 안내',
                      guideUrl: `https://cnec.jp/creator/campaigns/${campaign_id}`
                    }
                  })
                }).catch(e => console.error('[select_creators] JP notification error:', e.message))
              } else if (campaignRegion === 'us') {
                fetch(`${baseUrl}/.netlify/functions/send-us-notification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'campaign_selected',
                    creatorEmail: pEmail,
                    creatorPhone: pPhone,
                    data: {
                      creatorName: pName,
                      campaignName: campaignData?.title || 'Campaign',
                      brandName: campaignData?.brand_name || campaignData?.company_name,
                      reward: campaignData?.reward_text || campaignData?.compensation || 'TBA',
                      deadline: campaignData?.content_submission_deadline || 'TBA',
                      guideUrl: `https://cnec.us/creator/campaigns/${campaign_id}`
                    }
                  })
                }).catch(e => console.error('[select_creators] US notification error:', e.message))
              } else {
                fetch(`${baseUrl}/.netlify/functions/dispatch-campaign-notification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    eventType: 'creator_selected',
                    creatorName: pName,
                    creatorPhone: pPhone,
                    creatorEmail: pEmail,
                    campaignTitle: campaignData?.title || '캠페인',
                    campaignId: campaign_id
                  })
                }).catch(e => console.error('[select_creators] KR notification error:', e.message))
              }
            }
          }
        } catch (notifError) {
          console.error('[select_creators] Notification dispatch error:', notifError.message)
        }

        break
      }

      case 'ship_product': {
        // 제품 발송 (송장번호 입력)
        const { creator_campaign_id, tracking_number } = body
        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'product_shipping',
            tracking_number: tracking_number || null,
            product_shipped_at: new Date().toISOString()
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'submit_video': {
        // 영상 제출
        const { creator_campaign_id, video_url } = body
        if (!video_url) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '영상 URL이 필요합니다.' })
          }
        }

        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'video_submitted',
            video_url,
            video_submitted_at: new Date().toISOString()
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'request_revision': {
        // 수정 요청
        const { creator_campaign_id, request_message } = body
        if (!request_message) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '수정 요청 내용을 입력해주세요.' })
          }
        }

        // 기존 revision_requests 가져오기
        const { data: existing } = await supabase
          .from('package_campaign_creators')
          .select('revision_requests, revision_count')
          .eq('id', creator_campaign_id)
          .single()

        const currentRequests = existing?.revision_requests || []
        const newRequest = {
          request: request_message,
          requested_at: new Date().toISOString(),
          resolved_at: null
        }

        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'revision_requested',
            revision_requests: [...currentRequests, newRequest],
            revision_count: (existing?.revision_count || 0) + 1
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'approve_video': {
        // 영상 승인
        const { creator_campaign_id, final_video_url } = body
        const { data: current } = await supabase
          .from('package_campaign_creators')
          .select('video_url')
          .eq('id', creator_campaign_id)
          .single()

        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'approved',
            final_video_url: final_video_url || current?.video_url,
            approved_at: new Date().toISOString()
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'mark_uploaded': {
        // 업로드 완료
        const { creator_campaign_id, upload_url } = body
        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'uploaded',
            upload_url: upload_url || null,
            uploaded_at: new Date().toISOString()
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      case 'decline_creator': {
        // 크리에이터 거부
        const { creator_campaign_id, replaced_by_id } = body
        const { data, error } = await supabase
          .from('package_campaign_creators')
          .update({
            status: 'declined',
            creator_declined: true,
            replaced_by_id: replaced_by_id || null
          })
          .eq('id', creator_campaign_id)
          .select()
          .single()

        if (error) throw error
        result = data
        break
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `알 수 없는 action: ${action}` })
        }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    }
  } catch (error) {
    console.error('[update-package-creator-status] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'update-package-creator-status',
          errorMessage: error.message,
          context: { action: JSON.parse(event.body)?.action }
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
