const { createClient } = require('@supabase/supabase-js')

// Japan Supabase 서비스 롤 클라이언트 (RLS 우회)
const japanUrl = process.env.VITE_SUPABASE_JAPAN_URL
const japanServiceKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY

// BIZ Supabase (인증 확인용)
const bizUrl = process.env.VITE_SUPABASE_BIZ_URL
const bizServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseJapan = japanUrl && japanServiceKey ? createClient(japanUrl, japanServiceKey) : null
const supabaseBiz = bizUrl && bizServiceKey ? createClient(bizUrl, bizServiceKey) : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
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
    if (!supabaseJapan) {
      console.error('Japan Supabase 환경변수 누락: VITE_SUPABASE_JAPAN_URL 또는 SUPABASE_JAPAN_SERVICE_ROLE_KEY')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'Japan Supabase 설정이 필요합니다. 관리자에게 문의하세요.' })
      }
    }

    if (!supabaseBiz) {
      console.error('BIZ Supabase 환경변수 누락')
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ success: false, error: 'BIZ Supabase 설정이 필요합니다.' })
      }
    }

    // 인증 확인
    const authHeader = event.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: '인증이 필요합니다' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseBiz.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: '유효하지 않은 인증입니다' })
      }
    }

    const body = JSON.parse(event.body)
    const { action, campaign_id, application_id, data } = body

    console.log('[Japan API] Request:', { action, campaign_id, application_id, userEmail: user.email })

    // 캠페인 조회 (Japan DB)
    const { data: campaign, error: campaignError } = await supabaseJapan
      .from('campaigns')
      .select('id, company_id, company_email, title')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: `캠페인을 찾을 수 없습니다: ${campaignError?.message || 'not found'}` })
      }
    }

    // 관리자 체크
    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    const isAdmin = !!adminData

    // 소유권 확인 (관리자이거나 company_email 또는 company_id가 일치)
    if (!isAdmin && campaign.company_id !== user.id && campaign.company_email !== user.email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ success: false, error: '이 캠페인에 대한 권한이 없습니다' })
      }
    }

    let result

    switch (action) {
      case 'get_applications':
        result = await supabaseJapan
          .from('applications')
          .select('*')
          .eq('campaign_id', campaign_id)
          .order('created_at', { ascending: false })
          .limit(1000)
        break

      case 'virtual_select':
        const virtualSelectData = { virtual_selected: data.virtual_selected }
        if (data.main_channel) {
          virtualSelectData.main_channel = data.main_channel
        }
        result = await supabaseJapan
          .from('applications')
          .update(virtualSelectData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_channel':
        result = await supabaseJapan
          .from('applications')
          .update({ main_channel: data.main_channel })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'confirm_selection':
        result = await supabaseJapan
          .from('applications')
          .update({
            status: 'selected',
            virtual_selected: false
          })
          .in('id', data.application_ids)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'cancel_selection':
        result = await supabaseJapan
          .from('applications')
          .update({
            status: 'pending',
            virtual_selected: false
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_status':
        result = await supabaseJapan
          .from('applications')
          .update({ status: data.status })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_shipping':
        result = await supabaseJapan
          .from('applications')
          .update({
            tracking_number: data.tracking_number,
            shipping_company: data.shipping_company
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_guide':
        result = await supabaseJapan
          .from('applications')
          .update({
            personalized_guide: data.guide,
            status: data.status || 'filming',
            additional_message: data.message || null
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_views':
        result = await supabaseJapan
          .from('applications')
          .update({
            views: data.views,
            last_view_check: new Date().toISOString(),
            view_history: data.view_history
          })
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      case 'update_application':
        const { updated_at, ...safeData } = data
        result = await supabaseJapan
          .from('applications')
          .update(safeData)
          .eq('id', application_id)
          .eq('campaign_id', campaign_id)
          .select()
        break

      // 캠페인 정보 업데이트 (마감일, 상세 정보 등)
      case 'update_campaign': {
        // Japan DB campaigns 테이블에 존재하는 필드만 허용
        const ALLOWED_CAMPAIGN_FIELDS = [
          // 기본 정보
          'title', 'brand', 'description', 'requirements', 'category',
          'max_participants', 'total_slots', 'remaining_slots', 'status',
          'target_platforms', 'company_id', 'company_email', 'reward_points',
          // 일정
          'application_deadline', 'start_date', 'end_date', 'deadline',
          'content_submission_deadline', 'sns_upload_deadline',
          'video_deadline', 'sns_deadline',
          // 4주 챌린지 마감일
          'week1_deadline', 'week2_deadline', 'week3_deadline', 'week4_deadline',
          'week1_sns_deadline', 'week2_sns_deadline', 'week3_sns_deadline', 'week4_sns_deadline',
          // 올리브영 마감일
          'step1_deadline', 'step2_deadline',
          'step1_sns_deadline', 'step2_sns_deadline',
          // 질문 필드
          'question1', 'question1_type', 'question1_options',
          'question2', 'question2_type', 'question2_options',
          'question3', 'question3_type', 'question3_options',
          'question4', 'question4_type', 'question4_options',
          // 참가 조건
          'age_requirement', 'skin_type_requirement', 'offline_visit_requirement',
          // 가이드 내용
          'brand_name', 'product_name', 'product_features', 'product_description', 'product_link', 'product_key_points',
          'required_dialogues', 'required_scenes', 'required_hashtags',
          'video_duration', 'video_tempo', 'video_tone',
          'additional_details', 'additional_shooting_requests',
          'creator_guide',
          // 촬영 장면
          'shooting_scenes_ba_photo', 'shooting_scenes_no_makeup', 'shooting_scenes_closeup',
          'shooting_scenes_product_closeup', 'shooting_scenes_product_texture',
          'shooting_scenes_outdoor', 'shooting_scenes_couple', 'shooting_scenes_child',
          'shooting_scenes_troubled_skin', 'shooting_scenes_wrinkles',
          // 일본어 필드
          'brand_name_ja', 'product_name_ja', 'product_description_ja', 'product_features_ja',
          'required_dialogues_ja', 'required_scenes_ja', 'required_hashtags_ja',
          'video_duration_ja', 'video_tempo_ja', 'video_tone_ja',
          'additional_details_ja', 'additional_shooting_requests_ja', 'shooting_scenes_ja',
          // 메타 광고
          'meta_ad_code_requested',
          // updated_at은 Japan DB에서 지원
          'updated_at',
        ]

        // 허용된 필드만 필터링
        const filteredData = {}
        for (const key of Object.keys(data)) {
          if (ALLOWED_CAMPAIGN_FIELDS.includes(key) && data[key] !== undefined) {
            filteredData[key] = data[key]
          }
        }

        console.log('[Japan API] update_campaign filtered fields:', Object.keys(filteredData), 'removed:', Object.keys(data).filter(k => !ALLOWED_CAMPAIGN_FIELDS.includes(k)))

        if (Object.keys(filteredData).length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: '수정할 유효한 필드가 없습니다.' })
          }
        }

        result = await supabaseJapan
          .from('campaigns')
          .update(filteredData)
          .eq('id', campaign_id)
          .select()
        break
      }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `알 수 없는 action: ${action}` })
        }
    }

    if (result.error) {
      console.error('[Japan API] Database error:', result.error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: result.error.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result.data
      })
    }

  } catch (error) {
    console.error('[Japan API] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'japan-campaign-operations',
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
