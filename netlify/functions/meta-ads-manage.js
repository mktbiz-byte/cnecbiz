/**
 * Meta 광고 생성/관리
 * - 영상을 Meta Ad Account에 업로드
 * - Campaign → AdSet → Ad 생성
 * - 광고 상태 변경 (활성/일시정지/삭제)
 * - 광고코드(partnership_code) UTM 자동 연결
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

// Meta API 호출 헬퍼
async function metaApi(path, accessToken, method = 'GET', body = null) {
  const url = `${META_API_BASE}${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (method === 'GET') {
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}access_token=${accessToken}`
    const res = await fetch(fullUrl, options)
    return res.json()
  } else {
    if (body) body.access_token = accessToken
    options.body = JSON.stringify(body || { access_token: accessToken })
    const res = await fetch(url, options)
    return res.json()
  }
}

// 영상을 Ad Account에 업로드 (URL 기반)
async function uploadVideoToAdAccount(adAccountId, videoUrl, title, accessToken) {
  const data = await metaApi(`/${adAccountId}/advideos`, accessToken, 'POST', {
    file_url: videoUrl,
    title: title || 'CNEC Creator Video'
  })
  if (data.error) throw new Error(`Video upload failed: ${data.error.message}`)
  return data.id // video_id
}

// 캠페인 생성
async function createCampaign(adAccountId, name, objective, accessToken, dailyBudget, status = 'PAUSED') {
  const data = await metaApi(`/${adAccountId}/campaigns`, accessToken, 'POST', {
    name,
    objective,
    status,
    special_ad_categories: [],
    ...(dailyBudget ? { daily_budget: dailyBudget } : {})
  })
  if (data.error) throw new Error(`Campaign creation failed: ${data.error.message}`)
  return data.id
}

// 광고세트 생성
async function createAdSet(adAccountId, campaignId, name, accessToken, opts = {}) {
  const body = {
    name,
    campaign_id: campaignId,
    billing_event: 'IMPRESSIONS',
    optimization_goal: opts.optimizationGoal || 'REACH',
    daily_budget: opts.dailyBudget || 10000, // 기본 1만원 (센트 단위)
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: opts.targeting || { geo_locations: { countries: ['KR'] } },
    status: opts.status || 'PAUSED'
  }
  const data = await metaApi(`/${adAccountId}/adsets`, accessToken, 'POST', body)
  if (data.error) throw new Error(`AdSet creation failed: ${data.error.message}`)
  return data.id
}

// 광고 크리에이티브 생성 (영상)
async function createAdCreative(adAccountId, videoId, name, pageId, accessToken, opts = {}) {
  const body = {
    name,
    object_story_spec: {
      page_id: pageId,
      video_data: {
        video_id: videoId,
        title: opts.title || name,
        message: opts.message || '',
        call_to_action: opts.callToAction || {
          type: 'LEARN_MORE',
          value: { link: opts.link || 'https://cnecbiz.com' }
        }
      }
    },
    ...(opts.urlTags ? { url_tags: opts.urlTags } : {})
  }
  const data = await metaApi(`/${adAccountId}/adcreatives`, accessToken, 'POST', body)
  if (data.error) throw new Error(`Creative creation failed: ${data.error.message}`)
  return data.id
}

// 광고 생성
async function createAd(adAccountId, adSetId, creativeId, name, accessToken, status = 'PAUSED') {
  const body = {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status
  }
  const data = await metaApi(`/${adAccountId}/ads`, accessToken, 'POST', body)
  if (data.error) throw new Error(`Ad creation failed: ${data.error.message}`)
  return data.id
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }

  try {
    const body = JSON.parse(event.body)
    const { action } = body

    // ============================================
    // 1. 광고 라이브 (영상 → 광고 생성 전체 플로우)
    // ============================================
    if (action === 'create_ad') {
      const {
        adAccountDbId, videoUrl, adName, campaignName, creatorName,
        partnershipCode, campaignId, targetCountry, dailyBudget,
        pageId, objective, message, link
      } = body

      // DB에서 광고 계정 정보 조회
      const { data: account, error: accErr } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('id', adAccountDbId)
        .eq('is_active', true)
        .single()

      if (accErr || !account) throw new Error('광고 계정을 찾을 수 없습니다.')
      const { access_token: accessToken, ad_account_id: adAccountId } = account

      // UTM 파라미터 생성
      const utmParams = [
        'utm_source=meta',
        'utm_medium=paid',
        `utm_campaign=${encodeURIComponent(campaignName || '')}`,
        `utm_content=${encodeURIComponent(partnershipCode || '')}`
      ].join('&')

      console.log(`[meta-ads-manage] Creating ad: ${adName}, account: ${adAccountId}`)

      // Step 1: 영상 업로드
      const metaVideoId = await uploadVideoToAdAccount(adAccountId, videoUrl, adName, accessToken)
      console.log(`[meta-ads-manage] Video uploaded: ${metaVideoId}`)

      // Step 2: 캠페인 생성
      const metaCampaignId = await createCampaign(
        adAccountId, `[CNEC] ${campaignName || adName}`,
        objective || 'OUTCOME_AWARENESS', accessToken, null, 'PAUSED'
      )

      // Step 3: 타겟 국가 설정
      const countryMap = { kr: ['KR'], jp: ['JP'], us: ['US'], all: ['KR', 'JP', 'US'] }
      const targeting = {
        geo_locations: { countries: countryMap[targetCountry] || ['KR'] }
      }

      // Step 4: 광고세트 생성
      const metaAdSetId = await createAdSet(adAccountId, metaCampaignId, `${adName} - AdSet`, accessToken, {
        dailyBudget: dailyBudget || 10000,
        targeting,
        optimizationGoal: objective === 'OUTCOME_TRAFFIC' ? 'LINK_CLICKS' : 'REACH'
      })

      // Step 5: 크리에이티브 생성
      const metaCreativeId = await createAdCreative(adAccountId, metaVideoId, adName, pageId, accessToken, {
        message: message || `${creatorName || 'CNEC Creator'} 영상`,
        link: link || 'https://cnecbiz.com',
        urlTags: utmParams,
        callToAction: { type: 'LEARN_MORE', value: { link: link || 'https://cnecbiz.com' } }
      })

      // Step 6: 광고 생성
      const metaAdId = await createAd(adAccountId, metaAdSetId, metaCreativeId, adName, accessToken, 'PAUSED')

      // Step 7: DB 저장
      const { data: adRecord, error: saveErr } = await supabaseBiz
        .from('meta_ad_campaigns')
        .insert({
          ad_account_id: adAccountDbId,
          meta_campaign_id: metaCampaignId,
          meta_adset_id: metaAdSetId,
          meta_ad_id: metaAdId,
          meta_creative_id: metaCreativeId,
          meta_video_id: metaVideoId,
          campaign_id: campaignId || null,
          campaign_name: campaignName,
          creator_name: creatorName,
          video_url: videoUrl,
          partnership_code: partnershipCode,
          ad_name: adName,
          objective: objective || 'OUTCOME_AWARENESS',
          status: 'PAUSED',
          daily_budget: dailyBudget || 10000,
          target_country: targetCountry || 'kr',
          utm_source: 'meta',
          utm_medium: 'paid',
          utm_campaign: campaignName,
          utm_content: partnershipCode
        })
        .select()
        .single()

      if (saveErr) console.error('[meta-ads-manage] DB save error:', saveErr)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            id: adRecord?.id,
            metaCampaignId,
            metaAdSetId,
            metaAdId,
            metaVideoId,
            status: 'PAUSED'
          }
        })
      }
    }

    // ============================================
    // 2. 광고 상태 변경 (ACTIVE / PAUSED / DELETED)
    // ============================================
    if (action === 'update_status') {
      const { adCampaignId, newStatus } = body

      const { data: adCampaign, error: fetchErr } = await supabaseBiz
        .from('meta_ad_campaigns')
        .select('*, meta_ad_accounts(*)')
        .eq('id', adCampaignId)
        .single()

      if (fetchErr || !adCampaign) throw new Error('광고를 찾을 수 없습니다.')

      const accessToken = adCampaign.meta_ad_accounts.access_token

      // Meta 캠페인 상태 변경
      if (adCampaign.meta_campaign_id) {
        await metaApi(`/${adCampaign.meta_campaign_id}`, accessToken, 'POST', { status: newStatus })
      }

      // DB 업데이트
      await supabaseBiz
        .from('meta_ad_campaigns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', adCampaignId)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: { status: newStatus } })
      }
    }

    // ============================================
    // 3. 대량 광고 생성 (여러 영상 일괄)
    // ============================================
    if (action === 'bulk_create') {
      const { adAccountDbId, videos, pageId, objective, dailyBudget } = body

      const { data: account, error: accErr } = await supabaseBiz
        .from('meta_ad_accounts')
        .select('*')
        .eq('id', adAccountDbId)
        .eq('is_active', true)
        .single()

      if (accErr || !account) throw new Error('광고 계정을 찾을 수 없습니다.')

      const results = []
      for (const video of videos) {
        try {
          // 개별 광고 생성 (재귀 호출 대신 직접 처리)
          const innerBody = {
            action: 'create_ad',
            adAccountDbId,
            videoUrl: video.videoUrl,
            adName: video.adName || `${video.creatorName} - ${video.campaignName}`,
            campaignName: video.campaignName,
            creatorName: video.creatorName,
            partnershipCode: video.partnershipCode,
            campaignId: video.campaignId,
            targetCountry: video.targetCountry || 'kr',
            dailyBudget: dailyBudget || 10000,
            pageId,
            objective: objective || 'OUTCOME_AWARENESS'
          }

          // 재사용: 위의 create_ad 로직을 직접 호출
          const accessToken = account.access_token
          const adAccountId = account.ad_account_id
          const adName = innerBody.adName
          const utmParams = `utm_source=meta&utm_medium=paid&utm_campaign=${encodeURIComponent(video.campaignName || '')}&utm_content=${encodeURIComponent(video.partnershipCode || '')}`

          const metaVideoId = await uploadVideoToAdAccount(adAccountId, video.videoUrl, adName, accessToken)
          const metaCampaignId = await createCampaign(adAccountId, `[CNEC] ${video.campaignName || adName}`, objective || 'OUTCOME_AWARENESS', accessToken, null, 'PAUSED')
          const countryMap = { kr: ['KR'], jp: ['JP'], us: ['US'], all: ['KR', 'JP', 'US'] }
          const targeting = { geo_locations: { countries: countryMap[video.targetCountry] || ['KR'] } }
          const metaAdSetId = await createAdSet(adAccountId, metaCampaignId, `${adName} - AdSet`, accessToken, { dailyBudget: dailyBudget || 10000, targeting })
          const metaCreativeId = await createAdCreative(adAccountId, metaVideoId, adName, pageId, accessToken, { message: `${video.creatorName || 'CNEC Creator'} 영상`, link: 'https://cnecbiz.com', urlTags: utmParams })
          const metaAdId = await createAd(adAccountId, metaAdSetId, metaCreativeId, adName, accessToken, 'PAUSED')

          await supabaseBiz.from('meta_ad_campaigns').insert({
            ad_account_id: adAccountDbId,
            meta_campaign_id: metaCampaignId,
            meta_adset_id: metaAdSetId,
            meta_ad_id: metaAdId,
            meta_creative_id: metaCreativeId,
            meta_video_id: metaVideoId,
            campaign_id: video.campaignId || null,
            campaign_name: video.campaignName,
            creator_name: video.creatorName,
            video_url: video.videoUrl,
            partnership_code: video.partnershipCode,
            ad_name: adName,
            objective: objective || 'OUTCOME_AWARENESS',
            status: 'PAUSED',
            daily_budget: dailyBudget || 10000,
            target_country: video.targetCountry || 'kr',
            utm_content: video.partnershipCode
          })

          results.push({ videoUrl: video.videoUrl, success: true, metaAdId })
        } catch (err) {
          console.error(`[meta-ads-manage] Bulk create error for ${video.videoUrl}:`, err.message)
          results.push({ videoUrl: video.videoUrl, success: false, error: err.message })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            total: videos.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
          }
        })
      }
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('[meta-ads-manage] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
