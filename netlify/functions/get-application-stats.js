// 캠페인 지원자 통계 조회 - 서비스 롤 키 사용 (RLS 우회)
const { createClient } = require('@supabase/supabase-js')

// 지역별 Supabase 클라이언트 생성 (서비스 롤 키 사용)
const getSupabaseClient = (region) => {
  let url, key

  switch (region) {
    case 'korea':
    case 'kr':
      url = process.env.VITE_SUPABASE_KOREA_URL
      key = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY
      break
    case 'japan':
    case 'jp':
      url = process.env.VITE_SUPABASE_JAPAN_URL
      key = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY
      break
    case 'us':
    case 'usa':
      url = process.env.VITE_SUPABASE_US_URL
      key = process.env.SUPABASE_US_SERVICE_ROLE_KEY
      break
    case 'taiwan':
    case 'tw':
      url = process.env.VITE_SUPABASE_TAIWAN_URL
      key = process.env.SUPABASE_TAIWAN_SERVICE_ROLE_KEY
      break
    case 'biz':
    default:
      url = process.env.VITE_SUPABASE_BIZ_URL
      key = process.env.SUPABASE_SERVICE_ROLE_KEY
      break
  }

  if (!url || !key) {
    console.error(`Missing Supabase credentials for region: ${region}`)
    return null
  }

  return createClient(url, key)
}

exports.handler = async (event) => {
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const { campaignsByRegion } = JSON.parse(event.body || '{}')

    // 환경 변수 확인 로그
    console.log('Environment check:', {
      hasKoreaUrl: !!process.env.VITE_SUPABASE_KOREA_URL,
      hasKoreaKey: !!process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY,
      hasUsUrl: !!process.env.VITE_SUPABASE_US_URL,
      hasUsKey: !!process.env.SUPABASE_US_SERVICE_ROLE_KEY,
      hasJapanUrl: !!process.env.VITE_SUPABASE_JAPAN_URL,
      hasJapanKey: !!process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY,
      hasBizUrl: !!process.env.VITE_SUPABASE_BIZ_URL,
      hasBizKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    if (!campaignsByRegion || typeof campaignsByRegion !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'campaignsByRegion is required' })
      }
    }

    console.log('Request campaignsByRegion:', JSON.stringify(campaignsByRegion))

    // 모든 캠페인 ID 수집
    const allCampaignIds = []
    Object.values(campaignsByRegion).forEach(ids => {
      allCampaignIds.push(...ids)
    })

    // 선정 완료 상태 목록
    const selectedStatuses = ['selected', 'virtual_selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'completed']

    // 모든 지역 DB에서 applications 조회 (캠페인이 어느 DB에 있든 applications는 다른 DB에 있을 수 있음)
    const allRegions = ['korea', 'japan', 'us', 'biz']
    // 두 개의 테이블에서 모두 조회 (applications + campaign_applications)
    const tablesToQuery = ['applications', 'campaign_applications']

    const statsPromises = allRegions.flatMap((region) => {
      const client = getSupabaseClient(region)
      if (!client) {
        console.log(`No client for region: ${region}`)
        return [Promise.resolve({ region, table: 'applications', data: [] })]
      }

      return tablesToQuery.map(async (tableName) => {
        try {
          const { data, error } = await client
            .from(tableName)
            .select('campaign_id, status')
            .in('campaign_id', allCampaignIds)
            .limit(50000)  // Supabase 기본 1000행 제한 해제

          if (error) {
            // 테이블이 존재하지 않는 경우 무시
            if (error.code === '42P01') {
              console.log(`${region}/${tableName}: Table does not exist, skipping`)
              return { region, table: tableName, data: [] }
            }
            console.error(`Error fetching from ${region}/${tableName}:`, error.message)
            return { region, table: tableName, data: [] }
          }

          console.log(`${region}/${tableName}: ${data?.length || 0} applications found`)
          return { region, table: tableName, data: data || [] }
        } catch (err) {
          console.error(`Exception fetching from ${region}/${tableName}:`, err.message)
          return { region, table: tableName, data: [] }
        }
      })
    })

    const results = await Promise.all(statsPromises)

    // story_proposals (BIZ DB에만 존재) 조회 - story_short 캠페인 지원자 포함
    let storyProposalResults = []
    try {
      const bizClient = getSupabaseClient('biz')
      if (bizClient) {
        const { data: proposals, error: spError } = await bizClient
          .from('story_proposals')
          .select('campaign_id, status, creator_id')
          .in('campaign_id', allCampaignIds)
          .limit(50000)

        if (!spError && proposals && proposals.length > 0) {
          console.log(`biz/story_proposals: ${proposals.length} proposals found`)
          storyProposalResults = proposals
        } else if (spError) {
          console.log('story_proposals query error:', spError.message)
        }
      }
    } catch (e) {
      console.log('story_proposals exception:', e.message)
    }

    // 모든 지역의 결과를 합쳐서 캠페인별 통계 집계
    const allStats = {}
    // 중복 방지를 위한 처리된 application ID 추적
    const processedAppIds = new Set()

    results.forEach(({ region, table, data }) => {
      data.forEach(app => {
        // 중복 방지: 같은 campaign_id + user_id 조합이 여러 테이블에 있을 수 있음
        // campaign_id와 status만으로는 중복 체크가 어려우므로 일단 모두 카운트
        // (실제 운영에서는 한 테이블만 사용해야 함)
        if (!allStats[app.campaign_id]) {
          allStats[app.campaign_id] = {
            total: 0,
            selected: 0,
            video_submitted: 0,
            sns_uploaded: 0,
            completed: 0
          }
        }

        allStats[app.campaign_id].total++

        if (selectedStatuses.includes(app.status)) {
          allStats[app.campaign_id].selected++
        }

        // 영상 업로드 완료: video_submitted 이후 상태 모두 포함
        if (['video_submitted', 'revision_requested', 'sns_uploaded', 'completed'].includes(app.status)) {
          allStats[app.campaign_id].video_submitted++
        }

        // SNS 업로드 완료: sns_uploaded 이후 상태
        if (['sns_uploaded', 'completed'].includes(app.status)) {
          allStats[app.campaign_id].sns_uploaded++
        }

        if (app.status === 'completed') {
          allStats[app.campaign_id].completed++
        }
      })
    })

    // story_proposals 통계 병합 (applications와 중복되지 않는 것만 추가)
    if (storyProposalResults.length > 0) {
      // applications 테이블에 이미 있는 creator_id를 캠페인별로 추적
      const existingCreatorsByCampaign = {}
      results.forEach(({ data }) => {
        data.forEach(app => {
          if (app.user_id) {
            if (!existingCreatorsByCampaign[app.campaign_id]) {
              existingCreatorsByCampaign[app.campaign_id] = new Set()
            }
            existingCreatorsByCampaign[app.campaign_id].add(app.user_id)
          }
        })
      })

      storyProposalResults.forEach(proposal => {
        const campaignId = proposal.campaign_id
        const creatorId = proposal.creator_id

        // 이미 applications에 있는 크리에이터는 스킵
        if (existingCreatorsByCampaign[campaignId]?.has(creatorId)) return

        if (!allStats[campaignId]) {
          allStats[campaignId] = {
            total: 0,
            selected: 0,
            video_submitted: 0,
            sns_uploaded: 0,
            completed: 0
          }
        }

        allStats[campaignId].total++

        if (proposal.status === 'approved') {
          allStats[campaignId].selected++
        }
        if (proposal.status === 'completed') {
          allStats[campaignId].completed++
        }
      })
      console.log('story_proposals merged:', storyProposalResults.length, 'proposals')
    }

    console.log('Total campaigns with stats:', Object.keys(allStats).length)
    console.log('Stats by table:', results.map(r => `${r.region}/${r.table}: ${r.data?.length || 0}`).join(', '))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        stats: allStats,
        debug: results.map(r => ({ region: r.region, count: r.data?.length || 0 }))
      })
    }
  } catch (error) {
    console.error('Error in get-application-stats:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
