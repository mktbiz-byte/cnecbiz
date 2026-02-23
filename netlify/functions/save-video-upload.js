const { createClient } = require('@supabase/supabase-js')

// Service role key로 RLS 우회하여 영상 업로드 관련 DB 작업 처리
// 멀티 리전 지원: korea, japan, us, biz
const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

// BIZ DB (중앙 비즈니스 DB) - applications가 여기에 있을 수 있음
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 리전별 Supabase 클라이언트 (lazy init)
let _supabaseJapan = null
let _supabaseUS = null

function getRegionClient(region) {
  switch (region) {
    case 'biz':
      return supabaseBiz
    case 'japan':
      if (!_supabaseJapan && process.env.VITE_SUPABASE_JAPAN_URL && process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY) {
        _supabaseJapan = createClient(process.env.VITE_SUPABASE_JAPAN_URL, process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY)
      }
      return _supabaseJapan || supabaseKorea
    case 'us':
      if (!_supabaseUS && process.env.VITE_SUPABASE_US_URL && process.env.SUPABASE_US_SERVICE_ROLE_KEY) {
        _supabaseUS = createClient(process.env.VITE_SUPABASE_US_URL, process.env.SUPABASE_US_SERVICE_ROLE_KEY)
      }
      return _supabaseUS || supabaseKorea
    case 'korea':
    default:
      return supabaseKorea
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const body = JSON.parse(event.body)
    const { action, region, participantId, videoFiles, videoStatus, fileName, fileBase64, fileMimeType } = body

    // 리전에 맞는 클라이언트 선택 (기본: korea)
    const client = getRegionClient(region || 'korea')

    // 1. 서명된 업로드 URL 생성 (대용량 파일용)
    if (action === 'create_signed_url') {
      if (!fileName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '파일 경로가 누락되었습니다.' })
        }
      }

      const bucketName = region === 'us' ? 'videos' : 'campaign-videos'

      const { data, error } = await client.storage
        .from(bucketName)
        .createSignedUploadUrl(fileName)

      if (error) {
        console.error('[save-video-upload] Signed URL creation failed:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `서명 URL 생성 실패: ${error.message}` })
        }
      }

      const { data: { publicUrl } } = client.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          signedUrl: data.signedUrl,
          token: data.token,
          path: data.path,
          publicUrl
        })
      }
    }

    // 2. 스토리지 업로드 (소용량 파일 - base64)
    if (action === 'storage_upload') {
      if (!fileName || !fileBase64) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '파일 정보가 누락되었습니다.' })
        }
      }

      const buffer = Buffer.from(fileBase64, 'base64')
      const bucketName = region === 'us' ? 'videos' : 'campaign-videos'

      const { data, error } = await client.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: fileMimeType || 'video/mp4',
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('[save-video-upload] Storage upload failed:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `스토리지 업로드 실패: ${error.message}` })
        }
      }

      const { data: { publicUrl } } = client.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, publicUrl, path: data.path })
      }
    }

    // 3. campaign_participants DB 업데이트 (RLS 우회)
    if (action === 'update_participant') {
      if (!participantId || !videoFiles) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '필수 파라미터 누락: participantId, videoFiles' })
        }
      }

      const { error: updateError } = await client
        .from('campaign_participants')
        .update({
          video_files: videoFiles,
          video_status: videoStatus || 'uploaded'
        })
        .eq('id', participantId)

      if (updateError) {
        console.error('[save-video-upload] DB update failed:', updateError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `DB 업데이트 실패: ${updateError.message}` })
        }
      }

      console.log(`[save-video-upload] Updated campaign_participants ${participantId} with ${videoFiles.length} video files`)

      // 네이버 웍스 알림 발송 (영상 업로드 완료 시)
      if (videoStatus === 'uploaded' || !videoStatus) {
        try {
          // participant 정보에서 campaign_id, user_id 조회
          const { data: participant } = await client
            .from('campaign_participants')
            .select('campaign_id, user_id')
            .eq('id', participantId)
            .single()

          if (participant) {
            // 캠페인 정보 조회 (리전 DB → BIZ DB 순)
            let campaignTitle = '캠페인'
            let companyName = '기업'
            let campaignData = null

            const { data: regCampaign } = await client
              .from('campaigns')
              .select('title, brand, brand_name, company_id, company_email')
              .eq('id', participant.campaign_id)
              .maybeSingle()

            if (regCampaign) {
              campaignData = regCampaign
            } else {
              const { data: bizCampaign } = await supabaseBiz
                .from('campaigns')
                .select('title, brand, brand_name, company_id, company_email')
                .eq('id', participant.campaign_id)
                .maybeSingle()
              if (bizCampaign) campaignData = bizCampaign
            }

            if (campaignData) {
              campaignTitle = campaignData.title || campaignData.brand || '캠페인'

              // 기업명 조회
              if (campaignData.company_email) {
                const { data: company } = await supabaseBiz
                  .from('companies')
                  .select('company_name')
                  .eq('email', campaignData.company_email)
                  .maybeSingle()
                if (company?.company_name) companyName = company.company_name
              }
              if (companyName === '기업' && campaignData.company_id) {
                const { data: companyById } = await supabaseBiz
                  .from('companies')
                  .select('company_name')
                  .eq('user_id', campaignData.company_id)
                  .maybeSingle()
                if (companyById?.company_name) companyName = companyById.company_name
              }
              if (companyName === '기업') {
                companyName = campaignData.brand || campaignData.brand_name || '기업'
              }
            }

            // 크리에이터 이름 조회
            let creatorName = '크리에이터'
            if (participant.user_id) {
              // 1순위: user_profiles
              const { data: profile } = await client
                .from('user_profiles')
                .select('name, full_name')
                .eq('id', participant.user_id)
                .maybeSingle()
              if (profile?.name || profile?.full_name) {
                creatorName = profile.name || profile.full_name
              }

              // 2순위: applications
              if (creatorName === '크리에이터') {
                const { data: appData } = await client
                  .from('applications')
                  .select('creator_name, applicant_name')
                  .eq('campaign_id', participant.campaign_id)
                  .eq('user_id', participant.user_id)
                  .maybeSingle()
                if (appData) {
                  creatorName = appData.creator_name || appData.applicant_name || '크리에이터'
                }
              }

              // 3순위: BIZ DB
              if (creatorName === '크리에이터') {
                const { data: bizProfile } = await supabaseBiz
                  .from('user_profiles')
                  .select('name, full_name')
                  .eq('id', participant.user_id)
                  .maybeSingle()
                if (bizProfile) {
                  creatorName = bizProfile.full_name || bizProfile.name || '크리에이터'
                }
              }
            }

            // 최신 업로드 파일 정보
            const latestFile = videoFiles[videoFiles.length - 1]
            const version = latestFile?.version || videoFiles.length

            const koreanDate = new Date().toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

            const naverWorksMessage = `📹 영상 업로드 완료\n\n캠페인: ${campaignTitle}\n기업: ${companyName}\n크리에이터: ${creatorName}\n버전: V${version}\n파일 수: ${videoFiles.length}개\n\n${koreanDate}`

            const baseUrl = process.env.URL || 'https://cnecbiz.com'
            const worksResponse = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                isAdminNotification: true,
                channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || process.env.NAVER_WORKS_CHANNEL_ID,
                message: naverWorksMessage
              })
            })

            const worksResult = await worksResponse.json()
            console.log('[save-video-upload] 네이버 웍스 알림 결과:', worksResult.success ? '성공' : worksResult.error)
          }
        } catch (notifyError) {
          // 알림 실패해도 업로드 결과에는 영향 없음
          console.error('[save-video-upload] 네이버 웍스 알림 발송 실패:', notifyError.message)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    // 4. 기존 video_files 조회 (RLS 우회)
    if (action === 'get_video_files') {
      if (!participantId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'participantId 필수' })
        }
      }

      const { data, error } = await client
        .from('campaign_participants')
        .select('video_files')
        .eq('id', participantId)
        .single()

      if (error) {
        console.error('[save-video-upload] Get video_files failed:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `조회 실패: ${error.message}` })
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, videoFiles: data?.video_files || [] })
      }
    }

    // 5. applications 업데이트 (RLS 우회)
    if (action === 'update_application') {
      const { campaignId, userId, updateData } = body
      if (!campaignId || !userId || !updateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '필수 파라미터 누락' })
        }
      }

      const { error: appError } = await client
        .from('applications')
        .update(updateData)
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)

      if (appError) {
        console.error('[save-video-upload] Application update failed:', appError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `applications 업데이트 실패: ${appError.message}` })
        }
      }

      // video_file_url이 포함된 업데이트면 영상 업로드 알림 발송
      if (updateData.video_file_url) {
        try {
          let campaignTitle = '캠페인'
          let companyName = '기업'
          let creatorName = '크리에이터'
          const regionLabel = { korea: 'cnec.co.kr', japan: 'cnec.jp', us: 'cnec.us' }[region || 'korea'] || region

          // 캠페인 정보 조회
          let campaignInfo = null
          const { data: regCamp } = await client
            .from('campaigns')
            .select('title, brand, brand_name, company_id, company_email')
            .eq('id', campaignId)
            .maybeSingle()
          campaignInfo = regCamp

          if (!campaignInfo) {
            const { data: bizCamp } = await supabaseBiz
              .from('campaigns')
              .select('title, brand, brand_name, company_id, company_email')
              .eq('id', campaignId)
              .maybeSingle()
            campaignInfo = bizCamp
          }

          if (campaignInfo) {
            campaignTitle = campaignInfo.title || campaignInfo.brand || '캠페인'
            companyName = campaignInfo.brand || campaignInfo.brand_name || '기업'
            if (campaignInfo.company_email) {
              const { data: comp } = await supabaseBiz
                .from('companies')
                .select('company_name')
                .eq('email', campaignInfo.company_email)
                .maybeSingle()
              if (comp?.company_name) companyName = comp.company_name
            }
            if (companyName === '기업' && campaignInfo.company_id) {
              const { data: compById } = await supabaseBiz
                .from('companies')
                .select('company_name')
                .eq('user_id', campaignInfo.company_id)
                .maybeSingle()
              if (compById?.company_name) companyName = compById.company_name
            }
          }

          // 크리에이터 이름 조회
          const { data: appInfo } = await client
            .from('applications')
            .select('creator_name, applicant_name')
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .maybeSingle()
          if (appInfo) creatorName = appInfo.creator_name || appInfo.applicant_name || '크리에이터'

          const koreanDate = new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })

          const naverWorksMessage = `📹 영상 업로드 알림 (${regionLabel})\n\n캠페인: ${campaignTitle}\n기업: ${companyName}\n크리에이터: ${creatorName}\n리전: ${(region || 'korea').toUpperCase()}\n업로드 시간: ${koreanDate}`

          const baseUrl = process.env.URL || 'https://cnecbiz.com'
          const worksRes = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || process.env.NAVER_WORKS_CHANNEL_ID,
              message: naverWorksMessage
            })
          })
          const worksResult = await worksRes.json()
          console.log('[save-video-upload] update_application 네이버 웍스 알림:', worksResult.success ? '성공' : worksResult.error)
        } catch (notifyErr) {
          console.error('[save-video-upload] update_application 네이버 웍스 알림 실패:', notifyErr.message)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      }
    }

    // 6. video_submissions INSERT (RLS 우회) - 모든 리전 지원
    // 리전별 스키마 차이 자동 대응: 없는 컬럼은 자동 제거 후 재시도
    if (action === 'insert_video_submission') {
      const { submissionData } = body
      if (!submissionData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'submissionData 필수' })
        }
      }

      let dataToInsert = { ...submissionData }
      let lastError = null

      // 최대 5회 재시도 (없는 컬럼을 하나씩 제거하며 재시도)
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await client
          .from('video_submissions')
          .insert([dataToInsert])
          .select()

        if (!error) {
          console.log(`[save-video-upload] Inserted video_submission for user ${submissionData.user_id}, campaign ${submissionData.campaign_id}`)

          // 네이버 웍스 알림 발송
          try {
            let campaignTitle = '캠페인'
            let companyName = '기업'
            let creatorName = '크리에이터'
            const regionLabel = { korea: 'cnec.co.kr', japan: 'cnec.jp', us: 'cnec.us' }[region || 'korea'] || region

            // 캠페인 정보 조회
            const { data: campaignData } = await client
              .from('campaigns')
              .select('title, brand, brand_name, company_id, company_email')
              .eq('id', submissionData.campaign_id)
              .maybeSingle()

            if (campaignData) {
              campaignTitle = campaignData.title || campaignData.brand || '캠페인'
              companyName = campaignData.brand || campaignData.brand_name || '기업'

              // 기업명 조회
              if (campaignData.company_email) {
                const { data: company } = await supabaseBiz
                  .from('companies')
                  .select('company_name')
                  .eq('email', campaignData.company_email)
                  .maybeSingle()
                if (company?.company_name) companyName = company.company_name
              }
              if (companyName === '기업' && campaignData.company_id) {
                const { data: companyById } = await supabaseBiz
                  .from('companies')
                  .select('company_name')
                  .eq('user_id', campaignData.company_id)
                  .maybeSingle()
                if (companyById?.company_name) companyName = companyById.company_name
              }
            } else {
              // 리전 DB에서 못 찾으면 BIZ DB에서 조회
              const { data: bizCampaign } = await supabaseBiz
                .from('campaigns')
                .select('title, brand, brand_name, company_id, company_email')
                .eq('id', submissionData.campaign_id)
                .maybeSingle()
              if (bizCampaign) {
                campaignTitle = bizCampaign.title || bizCampaign.brand || '캠페인'
                companyName = bizCampaign.brand || bizCampaign.brand_name || '기업'
                if (bizCampaign.company_email) {
                  const { data: company } = await supabaseBiz
                    .from('companies')
                    .select('company_name')
                    .eq('email', bizCampaign.company_email)
                    .maybeSingle()
                  if (company?.company_name) companyName = company.company_name
                }
              }
            }

            // 크리에이터 이름 조회
            if (submissionData.user_id) {
              const { data: appData } = await client
                .from('applications')
                .select('creator_name, applicant_name')
                .eq('campaign_id', submissionData.campaign_id)
                .eq('user_id', submissionData.user_id)
                .maybeSingle()
              if (appData) {
                creatorName = appData.creator_name || appData.applicant_name || '크리에이터'
              }

              if (creatorName === '크리에이터') {
                const { data: profile } = await client
                  .from('user_profiles')
                  .select('name, full_name')
                  .eq('id', submissionData.user_id)
                  .maybeSingle()
                if (profile) creatorName = profile.name || profile.full_name || '크리에이터'
              }

              if (creatorName === '크리에이터') {
                const { data: bizApp } = await supabaseBiz
                  .from('applications')
                  .select('creator_name, applicant_name')
                  .eq('campaign_id', submissionData.campaign_id)
                  .eq('user_id', submissionData.user_id)
                  .maybeSingle()
                if (bizApp) creatorName = bizApp.creator_name || bizApp.applicant_name || '크리에이터'
              }
            }

            const koreanDate = new Date().toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })

            const naverWorksMessage = `📹 영상 제출 알림 (${regionLabel})\n\n캠페인: ${campaignTitle}\n기업: ${companyName}\n크리에이터: ${creatorName}\n버전: V${submissionData.version || 1}\n리전: ${(region || 'korea').toUpperCase()}\n제출 시간: ${koreanDate}`

            const baseUrl = process.env.URL || 'https://cnecbiz.com'
            const worksResponse = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                isAdminNotification: true,
                channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || process.env.NAVER_WORKS_CHANNEL_ID,
                message: naverWorksMessage
              })
            })
            const worksResult = await worksResponse.json()
            console.log('[save-video-upload] insert_video_submission 네이버 웍스 알림:', worksResult.success ? '성공' : worksResult.error)
          } catch (notifyError) {
            console.error('[save-video-upload] insert_video_submission 네이버 웍스 알림 실패:', notifyError.message)
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: data?.[0] || null })
          }
        }

        // "Could not find the 'xxx' column" 에러면 해당 컬럼 제거 후 재시도
        const colMatch = error.message.match(/Could not find the '(\w+)' column/)
        if (colMatch) {
          const badColumn = colMatch[1]
          console.log(`[save-video-upload] Stripping unknown column '${badColumn}' from insert data (attempt ${attempt + 1})`)
          delete dataToInsert[badColumn]
          lastError = error
          continue
        }

        // 다른 에러는 재시도하지 않음
        lastError = error
        break
      }

      console.error('[save-video-upload] video_submissions insert failed:', lastError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: `video_submissions INSERT 실패: ${lastError.message}` })
      }
    }

    // 7. video_submissions UPDATE (RLS 우회) - 검수 완료/상태 변경용
    if (action === 'update_video_submission') {
      const { submissionId, updateData } = body
      if (!submissionId || !updateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'submissionId, updateData 필수' })
        }
      }

      const { data, error } = await client
        .from('video_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select()

      if (error) {
        console.error('[save-video-upload] video_submissions update failed:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `video_submissions UPDATE 실패: ${error.message}` })
        }
      }

      console.log(`[save-video-upload] Updated video_submission ${submissionId}`)

      // video_file_url이 업데이트된 경우 (재업로드) 네이버 웍스 알림 발송
      if (updateData.video_file_url && data?.[0]) {
        try {
          const record = data[0]
          let campaignTitle = '캠페인'
          let companyName = '기업'
          let creatorName = '크리에이터'
          const regionLabel = { korea: 'cnec.co.kr', japan: 'cnec.jp', us: 'cnec.us' }[region || 'korea'] || region

          // 캠페인 정보 조회
          if (record.campaign_id) {
            const { data: camp } = await client
              .from('campaigns')
              .select('title, brand, brand_name, company_id, company_email')
              .eq('id', record.campaign_id)
              .maybeSingle()

            if (camp) {
              campaignTitle = camp.title || camp.brand || '캠페인'
              companyName = camp.brand || camp.brand_name || '기업'
              if (camp.company_email) {
                const { data: comp } = await supabaseBiz
                  .from('companies')
                  .select('company_name')
                  .eq('email', camp.company_email)
                  .maybeSingle()
                if (comp?.company_name) companyName = comp.company_name
              }
            } else {
              const { data: bizCamp } = await supabaseBiz
                .from('campaigns')
                .select('title, brand, brand_name, company_email')
                .eq('id', record.campaign_id)
                .maybeSingle()
              if (bizCamp) {
                campaignTitle = bizCamp.title || bizCamp.brand || '캠페인'
                if (bizCamp.company_email) {
                  const { data: comp } = await supabaseBiz
                    .from('companies')
                    .select('company_name')
                    .eq('email', bizCamp.company_email)
                    .maybeSingle()
                  if (comp?.company_name) companyName = comp.company_name
                }
              }
            }
          }

          // 크리에이터 이름 조회
          if (record.user_id && record.campaign_id) {
            const { data: appInfo } = await client
              .from('applications')
              .select('creator_name, applicant_name')
              .eq('campaign_id', record.campaign_id)
              .eq('user_id', record.user_id)
              .maybeSingle()
            if (appInfo) creatorName = appInfo.creator_name || appInfo.applicant_name || '크리에이터'
          }

          const koreanDate = new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })

          const naverWorksMessage = `📹 영상 재제출 알림 (${regionLabel})\n\n캠페인: ${campaignTitle}\n기업: ${companyName}\n크리에이터: ${creatorName}\n버전: V${record.version || 1}\n리전: ${(region || 'korea').toUpperCase()}\n제출 시간: ${koreanDate}\n\n※ 수정 후 재업로드`

          const baseUrl = process.env.URL || 'https://cnecbiz.com'
          await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAdminNotification: true,
              channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || process.env.NAVER_WORKS_CHANNEL_ID,
              message: naverWorksMessage
            })
          })
          console.log('[save-video-upload] update_video_submission 네이버 웍스 재제출 알림 발송 완료')
        } catch (notifyErr) {
          console.error('[save-video-upload] update_video_submission 네이버 웍스 알림 실패:', notifyErr.message)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: data?.[0] || null })
      }
    }

    // 8. video_submissions 조회 (RLS 우회) - 모든 리전 병렬 조회
    if (action === 'fetch_video_submissions') {
      const { campaignId } = body
      if (!campaignId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'campaignId 필수' })
        }
      }

      // 모든 리전에서 병렬 조회
      const clients = [
        { name: 'korea', client: supabaseKorea },
        { name: 'biz', client: supabaseBiz },
        { name: 'japan', client: getRegionClient('japan') },
        { name: 'us', client: getRegionClient('us') }
      ]

      const results = await Promise.all(
        clients.map(async ({ name, client: c }) => {
          try {
            const { data: d, error: e } = await c
              .from('video_submissions')
              .select('*')
              .eq('campaign_id', campaignId)
              .order('created_at', { ascending: false })
            if (e) {
              console.log(`[save-video-upload] ${name} video_submissions query error:`, e.message)
              return []
            }
            return (d || []).map(r => ({ ...r, _source_region: name }))
          } catch (err) {
            console.log(`[save-video-upload] ${name} video_submissions exception:`, err.message)
            return []
          }
        })
      )

      // ID 기준 중복 제거
      const seen = new Set()
      const all = []
      results.flat().forEach(r => {
        if (!seen.has(r.id)) {
          seen.add(r.id)
          all.push(r)
        }
      })

      // applications 테이블에서 video_file_url이 있는데 video_submissions에 없는 레코드 추가 (fallback)
      const existingUserIds = new Set(all.map(r => r.user_id))
      const appFallbackResults = await Promise.all(
        clients.map(async ({ name, client: c }) => {
          try {
            const { data: apps, error: appErr } = await c
              .from('applications')
              .select('id, campaign_id, user_id, video_file_url, video_file_name, video_file_size, video_uploaded_at, clean_video_file_url, clean_video_url, sns_upload_url, ad_code, partnership_code, final_confirmed_at, status')
              .eq('campaign_id', campaignId)
              .not('video_file_url', 'is', null)
            if (appErr || !apps) return []
            return apps
              .filter(a => a.user_id && !existingUserIds.has(a.user_id))
              .map(a => ({
                id: `app_${a.id}`,
                campaign_id: a.campaign_id,
                application_id: a.id,
                user_id: a.user_id,
                video_number: 1,
                version: 1,
                video_file_url: a.video_file_url,
                video_file_name: a.video_file_name,
                video_file_size: a.video_file_size,
                clean_video_url: a.clean_video_file_url || a.clean_video_url,
                sns_upload_url: a.sns_upload_url,
                ad_code: a.ad_code,
                partnership_code: a.partnership_code,
                status: a.final_confirmed_at ? 'confirmed' : 'submitted',
                final_confirmed_at: a.final_confirmed_at,
                submitted_at: a.video_uploaded_at || new Date().toISOString(),
                updated_at: a.video_uploaded_at || new Date().toISOString(),
                created_at: a.video_uploaded_at || new Date().toISOString(),
                _from_applications: true,
                _source_region: name
              }))
          } catch (err) {
            console.log(`[save-video-upload] ${name} applications fallback error:`, err.message)
            return []
          }
        })
      )

      // applications fallback 결과 중복 제거 후 추가
      const seenFallbackUsers = new Set()
      appFallbackResults.flat().forEach(r => {
        if (!existingUserIds.has(r.user_id) && !seenFallbackUsers.has(r.user_id)) {
          seenFallbackUsers.add(r.user_id)
          all.push(r)
        }
      })

      console.log(`[save-video-upload] fetch_video_submissions: ${all.length} total (incl. ${seenFallbackUsers.size} app fallbacks) for campaign ${campaignId}`)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: all })
      }
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '유효하지 않은 action' })
    }

  } catch (error) {
    console.error('[save-video-upload] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
