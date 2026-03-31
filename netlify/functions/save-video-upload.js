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

// 영상 업로드 알림 큐 등록 (scheduled-video-upload-notification이 2분마다 자동 처리)
async function sendVideoUploadNotifications({ campaignId, userId, region, version, isResubmission, videoFileCount, creatorEmail: paramCreatorEmail, participantCreatorName, hintCampaignTitle, hintCompanyName, hintCreatorName }) {
  try {
    await supabaseBiz.from('notification_send_logs').insert({
      channel: 'video_upload_queue',
      status: 'queued',
      function_name: 'save-video-upload',
      message_preview: `campaign:${campaignId}|creator:${hintCreatorName || participantCreatorName || ''}|region:${region || 'korea'}`,
      metadata: {
        campaignId,
        userId,
        region: region || 'korea',
        version: version || 1,
        isResubmission: isResubmission || false,
        videoFileCount: videoFileCount || null,
        campaignTitle: hintCampaignTitle || null,
        companyName: hintCompanyName || null,
        creatorName: hintCreatorName || participantCreatorName || null,
        creatorEmail: paramCreatorEmail || null
      }
    })
    console.log('[save-video-upload] 알림 큐 등록:', { campaignId, region, creator: hintCreatorName || participantCreatorName })
    return { queued: true }
  } catch (e) {
    console.error('[save-video-upload] 알림 큐 등록 실패:', e.message)
    return { queued: false, error: e.message }
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
    const { action, region, participantId, videoFiles, videoStatus, fileName, fileBase64, fileMimeType, skipNotification, campaignId: directCampaignId, userId: directUserId, creatorEmail: directCreatorEmail, campaignTitle: hintCampaignTitle, companyName: hintCompanyName, creatorName: hintCreatorName } = body

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

      // 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if ((videoStatus === 'uploaded' || !videoStatus) && !skipNotification) {
        try {
          console.log('[save-video-upload] update_participant 알림 시작:', { participantId, videoStatus, region, directCampaignId: !!directCampaignId })

          const latestFile = videoFiles[videoFiles.length - 1]
          const version = latestFile?.version || videoFiles.length

          // ★ 프론트엔드에서 campaignId를 직접 전달받으면 비싼 multi-region participant 조회 생략
          if (directCampaignId) {
            console.log('[save-video-upload] directCampaignId 사용 — participant 조회 생략:', { directCampaignId, directUserId })
            await sendVideoUploadNotifications({
              campaignId: directCampaignId,
              userId: directUserId || participantId,
              region: region || 'korea',
              version,
              isResubmission: false,
              videoFileCount: videoFiles.length,
              creatorEmail: directCreatorEmail,
              participantCreatorName: hintCreatorName,
              hintCampaignTitle: hintCampaignTitle,
              hintCompanyName: hintCompanyName,
              hintCreatorName: hintCreatorName
            })
          } else {
            // Fallback: campaignId가 없으면 기존 방식으로 participant 조회
            let participant = null
            const participantClients = [client]
            if (client !== supabaseBiz) participantClients.push(supabaseBiz)
            if (client !== supabaseKorea) participantClients.push(supabaseKorea)
            const jpClient = getRegionClient('japan')
            const usClient = getRegionClient('us')
            if (jpClient && jpClient !== client && jpClient !== supabaseKorea) participantClients.push(jpClient)
            if (usClient && usClient !== client && usClient !== supabaseKorea) participantClients.push(usClient)

            const participantResults = await Promise.all(
              participantClients.map(async (pClient) => {
                try {
                  const { data: p1 } = await pClient
                    .from('campaign_participants')
                    .select('*')
                    .eq('id', participantId)
                    .maybeSingle()
                  if (p1) return p1

                  const { data: p2 } = await pClient
                    .from('campaign_participants')
                    .select('*')
                    .eq('user_id', participantId)
                    .limit(1)
                    .maybeSingle()
                  return p2 || null
                } catch (e) {
                  console.log('[save-video-upload] participant lookup error:', e.message)
                  return null
                }
              })
            )
            participant = participantResults.find(p => p !== null) || null

            if (participant) {
              console.log('[save-video-upload] participant 데이터:', {
                campaign_id: participant.campaign_id,
                user_id: participant.user_id,
                creator_name: participant.creator_name
              })
              await sendVideoUploadNotifications({
                client,
                campaignId: participant.campaign_id,
                userId: participant.user_id,
                region: region || 'korea',
                version,
                isResubmission: false,
                videoFileCount: videoFiles.length,
                creatorEmail: participant.creator_email,
                participantCreatorName: participant.creator_name,
                hintCampaignTitle: hintCampaignTitle,
                hintCompanyName: hintCompanyName,
                hintCreatorName: hintCreatorName
              })
            } else {
              console.error('[save-video-upload] participant가 null - 알림 발송 불가:', { participantId })
              try {
                const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
                await fetch(`${alertBaseUrl}/.netlify/functions/send-naver-works-message`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    isAdminNotification: true,
                    channelId: '54220a7e-0b14-1138-54ec-a55f62dc8b75',
                    message: `⚠️ [save-video-upload] 영상 알림 실패\n\nparticipantId: ${participantId}\nregion: ${region}\n원인: participant 조회 실패\n검색한 DB: ${participantClients.length}개\n\n${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                  })
                })
              } catch (alertErr) {
                console.error('[save-video-upload] 에러 알림 발송도 실패:', alertErr.message)
              }
            }
          }
        } catch (notifyError) {
          console.error('[save-video-upload] update_participant 알림 발송 실패:', notifyError.message, notifyError.stack)
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

    // 5. applications 업데이트 (RLS 우회) - 멀티 리전 fallback 지원
    if (action === 'update_application') {
      const { campaignId, userId, applicationId, updateData } = body
      if ((!campaignId || !userId) && !applicationId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '필수 파라미터 누락 (campaignId+userId 또는 applicationId 필요)' })
        }
      }
      if (!updateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'updateData 필수' })
        }
      }

      // 지정된 리전 DB에서 applications 업데이트 시도하는 헬퍼
      const tryUpdateApplication = async (dbClient) => {
        let updated = false
        let lastError = null

        // 1차: campaignId + userId로 시도
        if (campaignId && userId) {
          const { data: appData, error } = await dbClient
            .from('applications')
            .update(updateData)
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .select('id')

          if (!error && appData && appData.length > 0) return { updated: true }
          if (error) lastError = error
        }

        // 2차: applicationId로 폴백
        if (!updated && applicationId) {
          const { data: appData2, error: error2 } = await dbClient
            .from('applications')
            .update(updateData)
            .eq('id', applicationId)
            .select('id')

          if (!error2 && appData2 && appData2.length > 0) return { updated: true }
          if (error2) lastError = error2
        }

        return { updated: false, error: lastError }
      }

      // 지정된 리전 DB에서 먼저 시도
      let result = await tryUpdateApplication(client)

      // 지정된 DB에서 실패 시 다른 DB들도 순회하여 시도
      if (!result.updated) {
        console.warn(`[save-video-upload] Application update matched 0 rows in ${region || 'korea'}, trying other DBs`)
        const fallbackClients = [
          { name: 'biz', client: supabaseBiz },
          { name: 'korea', client: supabaseKorea },
          { name: 'japan', client: getRegionClient('japan') },
          { name: 'us', client: getRegionClient('us') }
        ].filter(c => c.client && c.client !== client)

        for (const fb of fallbackClients) {
          try {
            const fbResult = await tryUpdateApplication(fb.client)
            if (fbResult.updated) {
              console.log(`[save-video-upload] Application updated successfully in ${fb.name} DB`)
              result = fbResult
              break
            }
          } catch (fbErr) {
            console.log(`[save-video-upload] ${fb.name} application fallback error:`, fbErr.message)
          }
        }
      }

      if (!result.updated && result.error) {
        console.error('[save-video-upload] Application update failed in all DBs:', result.error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `applications 업데이트 실패: ${result.error.message}` })
        }
      }

      if (!result.updated) {
        console.warn('[save-video-upload] Application update matched 0 rows in all DBs')
      }

      // video_file_url이 포함된 업데이트면 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if (updateData.video_file_url && !skipNotification) {
        try {
          await sendVideoUploadNotifications({
            campaignId,
            userId,
            region: region || 'korea',
            version: 1,
            isResubmission: false,
            hintCampaignTitle,
            hintCompanyName,
            hintCreatorName
          })
        } catch (notifyErr) {
          console.error('[save-video-upload] update_application 알림 발송 실패:', notifyErr.message)
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

          // 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
          if (!skipNotification) {
            try {
              await sendVideoUploadNotifications({
                client,
                campaignId: submissionData.campaign_id,
                userId: submissionData.user_id,
                region: region || 'korea',
                version: submissionData.version || 1,
                isResubmission: false,
                hintCampaignTitle,
                hintCompanyName,
                hintCreatorName
              })
            } catch (notifyError) {
              console.error('[save-video-upload] insert_video_submission 알림 발송 실패:', notifyError.message)
            }
          } else {
            console.log('[save-video-upload] insert_video_submission 알림 스킵 (skipNotification=true)')
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
    // 멀티 리전 fallback: 지정된 리전에서 0건 매칭 시 다른 DB도 시도
    if (action === 'update_video_submission') {
      const { submissionId, updateData, sourceRegion } = body
      if (!submissionId || !updateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'submissionId, updateData 필수' })
        }
      }

      // sourceRegion이 있으면 해당 DB 우선, 없으면 region 사용
      const primaryClient = sourceRegion ? getRegionClient(sourceRegion) : client
      const { data, error } = await primaryClient
        .from('video_submissions')
        .update(updateData)
        .eq('id', submissionId)
        .select()

      if (error) {
        console.error('[save-video-upload] video_submissions update failed:', error)
      }

      // 지정된 DB에서 0건 매칭 시 다른 DB들도 순회하여 시도
      let updatedRecord = data?.[0] || null
      if (!updatedRecord && !error) {
        console.warn(`[save-video-upload] video_submissions update matched 0 rows in ${sourceRegion || region || 'korea'}, trying other DBs`)
        const fallbackClients = [
          { name: 'biz', client: supabaseBiz },
          { name: 'korea', client: supabaseKorea },
          { name: 'japan', client: getRegionClient('japan') },
          { name: 'us', client: getRegionClient('us') }
        ].filter(c => c.client && c.client !== primaryClient)

        for (const fb of fallbackClients) {
          try {
            const { data: fbData, error: fbError } = await fb.client
              .from('video_submissions')
              .update(updateData)
              .eq('id', submissionId)
              .select()
            if (!fbError && fbData && fbData.length > 0) {
              updatedRecord = fbData[0]
              console.log(`[save-video-upload] video_submissions updated successfully in ${fb.name} DB`)
              break
            }
          } catch (fbErr) {
            console.log(`[save-video-upload] ${fb.name} fallback update error:`, fbErr.message)
          }
        }
      }

      if (!updatedRecord && error) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `video_submissions UPDATE 실패: ${error.message}` })
        }
      }

      console.log(`[save-video-upload] Updated video_submission ${submissionId}`, updatedRecord ? 'success' : 'no matching record found')

      // video_file_url이 업데이트된 경우 (재업로드) 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if (updateData.video_file_url && updatedRecord) {
        try {
          await sendVideoUploadNotifications({
            campaignId: updatedRecord.campaign_id,
            userId: updatedRecord.user_id,
            region: region || 'korea',
            version: updatedRecord.version || 1,
            isResubmission: true,
            hintCampaignTitle,
            hintCompanyName,
            hintCreatorName
          })
        } catch (notifyErr) {
          console.error('[save-video-upload] update_video_submission 알림 발송 실패:', notifyErr.message)
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: updatedRecord })
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

      // applications에서 clean_video_url 병합 (video_submissions에 이미 있는 유저의 클린본)
      try {
        const cleanVideoMergeResults = await Promise.all(
          clients.map(async ({ name, client: c }) => {
            try {
              const { data: apps } = await c
                .from('applications')
                .select('user_id, clean_video_file_url, clean_video_url')
                .eq('campaign_id', campaignId)
              return (apps || []).filter(a => a.user_id && (a.clean_video_file_url || a.clean_video_url))
            } catch (err) { return [] }
          })
        )

        const cleanVideoMap = new Map()
        cleanVideoMergeResults.flat().forEach(a => {
          if (!cleanVideoMap.has(a.user_id)) {
            cleanVideoMap.set(a.user_id, a.clean_video_file_url || a.clean_video_url)
          }
        })

        let cleanMergedCount = 0
        all.forEach(r => {
          if (!r.clean_video_url && cleanVideoMap.has(r.user_id)) {
            r.clean_video_url = cleanVideoMap.get(r.user_id)
            cleanMergedCount++
          }
        })
        if (cleanMergedCount > 0) {
          console.log(`[save-video-upload] Merged ${cleanMergedCount} clean_video_url(s) from applications`)
        }
      } catch (cleanErr) {
        console.log('[save-video-upload] clean_video_url merge error:', cleanErr.message)
      }

      // sns_uploads 테이블에서 platform_video_url 병합 (SNS 자동 업로드된 URL)
      try {
        const { data: snsUploads } = await supabaseBiz
          .from('sns_uploads')
          .select('source_id, source_type, platform_video_url')
          .eq('campaign_id', campaignId)
          .eq('status', 'completed')
          .not('platform_video_url', 'is', null)

        if (snsUploads && snsUploads.length > 0) {
          const snsUrlMap = new Map()
          snsUploads.forEach(u => {
            if (!snsUrlMap.has(u.source_id)) {
              snsUrlMap.set(u.source_id, u.platform_video_url)
            }
          })

          let mergedCount = 0
          all.forEach(r => {
            if (!r.sns_upload_url) {
              // video_submission ID 매칭
              if (snsUrlMap.has(r.id)) {
                r.sns_upload_url = snsUrlMap.get(r.id)
                mergedCount++
              }
              // application_id 매칭 (applications fallback 레코드)
              else if (r.application_id && snsUrlMap.has(r.application_id)) {
                r.sns_upload_url = snsUrlMap.get(r.application_id)
                mergedCount++
              }
            }
          })
          if (mergedCount > 0) {
            console.log(`[save-video-upload] Merged ${mergedCount} sns_upload_url(s) from sns_uploads table`)
          }
        }
      } catch (snsErr) {
        console.log('[save-video-upload] sns_uploads merge error:', snsErr.message)
      }

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

    // 에러 알림 발송
    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'save-video-upload',
          errorMessage: error.message,
          context: { action: JSON.parse(event.body || '{}').action || '알 수 없음' }
        })
      })
    } catch (e) { console.error('[save-video-upload] Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
