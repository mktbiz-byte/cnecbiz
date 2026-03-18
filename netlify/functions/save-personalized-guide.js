import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// Netlify Function to save personalized guide using service_role_key
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const {
      region,           // 'korea', 'japan', 'us'
      applicationId,    // application row ID
      guide             // personalized guide content
    } = JSON.parse(event.body)

    if (!region || !applicationId || !guide) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // Get the appropriate Supabase URL and service_role_key based on region
    // 환경변수 이름이 프로젝트마다 다를 수 있으므로 여러 이름으로 fallback
    let supabaseUrl, serviceRoleKey

    switch (region) {
      case 'korea':
        supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
        serviceRoleKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
          || process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
        break
      case 'japan':
        supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
        serviceRoleKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
          || process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
          || process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
        break
      case 'us':
        supabaseUrl = process.env.VITE_SUPABASE_US_URL
        serviceRoleKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
          || process.env.SUPABASE_US_SERVICE_ROLE_KEY
          || process.env.SUPABASE_US_SERVICE_ROLE_KEY
        break
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid region' })
        }
    }

    console.log('[save-personalized-guide] Config check:', {
      region,
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey,
      applicationId
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase credentials:', { region, supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey })
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Supabase configuration not found',
          details: `region=${region}, hasUrl=${!!supabaseUrl}, hasKey=${!!serviceRoleKey}`
        })
      }
    }

    // Create Supabase client with service_role_key (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Convert guide to region-appropriate format
    // Japan DB: JSONB column → save as object
    // Korea/US DB: TEXT column → save as string
    let guideToSave = guide

    // Parse to object first for normalization
    let guideObj = guide
    if (typeof guide === 'string') {
      try {
        guideObj = JSON.parse(guide)
        // Handle double-stringified
        if (typeof guideObj === 'string') {
          try { guideObj = JSON.parse(guideObj) } catch (_) {}
        }
      } catch (_) {
        guideObj = guide // keep as string if not valid JSON
      }
    }

    // Ensure both scenes and shooting_scenes keys exist
    if (typeof guideObj === 'object' && guideObj !== null) {
      if (guideObj.scenes && !guideObj.shooting_scenes) guideObj.shooting_scenes = guideObj.scenes
      if (guideObj.shooting_scenes && !guideObj.scenes) guideObj.scenes = guideObj.shooting_scenes
    }

    // Convert to region-appropriate format
    if (region === 'japan') {
      // JSONB column — save as object
      guideToSave = typeof guideObj === 'object' ? guideObj : guide
    } else {
      // TEXT column (korea, us) — save as string
      guideToSave = typeof guideObj === 'object' ? JSON.stringify(guideObj) : (typeof guide === 'string' ? guide : JSON.stringify(guide))
    }

    // Update the application with personalized guide
    const { data, error } = await supabase
      .from('applications')
      .update({ personalized_guide: guideToSave })
      .eq('id', applicationId)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to save guide',
          details: error.message,
          code: error.code,
          hint: error.hint
        })
      }
    }

    console.log('[save-personalized-guide] Update result:', { dataLength: data?.length, applicationId })

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      }
    }

    // campaign_participants 테이블에도 동기화 (크리에이터 마이페이지 표시용)
    // US DB에는 campaign_participants 테이블이 없으므로 US 제외
    const app = data[0]
    if (region !== 'us' && app.campaign_id && (app.user_id || app.email || app.applicant_email)) {
      try {
        // user_id로 먼저 시도
        if (app.user_id) {
          await supabase
            .from('campaign_participants')
            .update({ personalized_guide: guideToSave })
            .eq('campaign_id', app.campaign_id)
            .eq('user_id', app.user_id)
        }
        // email로도 시도 (user_id가 없거나 매칭 안 될 수 있음)
        const creatorEmail = app.email || app.applicant_email || app.creator_email
        if (creatorEmail) {
          await supabase
            .from('campaign_participants')
            .update({ personalized_guide: guideToSave })
            .eq('campaign_id', app.campaign_id)
            .eq('creator_email', creatorEmail)
        }
        console.log('[save-personalized-guide] campaign_participants 동기화 완료')
      } catch (syncError) {
        // campaign_participants 동기화 실패해도 본 작업은 성공으로 처리
        console.log('[save-personalized-guide] campaign_participants 동기화 실패 (무시):', syncError.message)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: app
      })
    }

  } catch (error) {
    console.error('Save guide error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to save personalized guide',
        message: error.message
      })
    }
  }
}
