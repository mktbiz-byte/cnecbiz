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

// 영상 업로드 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
async function sendVideoUploadNotifications({ client, campaignId, userId, region, version, isResubmission, videoFileCount }) {
  const baseUrl = process.env.URL || 'https://cnecbiz.com'
  const regionLabel = { korea: 'cnec.co.kr', japan: 'cnec.jp', us: 'cnec.us' }[region || 'korea'] || region
  let campaignTitle = '캠페인'
  let companyName = '기업'
  let companyPhone = null
  let companyEmail = null
  let creatorName = '크리에이터'

  // 1. 캠페인 정보 조회 (리전 DB → BIZ DB fallback)
  let campaignData = null
  const { data: regCampaign } = await client
    .from('campaigns')
    .select('title, brand, brand_name, company_id, company_email')
    .eq('id', campaignId)
    .maybeSingle()

  if (regCampaign) {
    campaignData = regCampaign
  } else {
    const { data: bizCampaign } = await supabaseBiz
      .from('campaigns')
      .select('title, brand, brand_name, company_id, company_email')
      .eq('id', campaignId)
      .maybeSingle()
    if (bizCampaign) campaignData = bizCampaign
  }

  if (campaignData) {
    campaignTitle = campaignData.title || campaignData.brand || '캠페인'
    companyName = campaignData.brand || campaignData.brand_name || '기업'

    // 기업 정보 조회 (전화번호, 이름, 이메일)
    if (campaignData.company_email) {
      companyEmail = campaignData.company_email
      const { data: company } = await supabaseBiz
        .from('companies')
        .select('company_name, phone')
        .eq('email', campaignData.company_email)
        .maybeSingle()
      if (company) {
        if (company.company_name) companyName = company.company_name
        if (company.phone) companyPhone = company.phone
      }
    }
    if ((!companyPhone || companyName === '기업') && campaignData.company_id) {
      const { data: companyById } = await supabaseBiz
        .from('companies')
        .select('company_name, phone, email')
        .eq('user_id', campaignData.company_id)
        .maybeSingle()
      if (companyById) {
        if (companyById.company_name && companyName === '기업') companyName = companyById.company_name
        if (companyById.phone && !companyPhone) companyPhone = companyById.phone
        if (companyById.email && !companyEmail) companyEmail = companyById.email
      }
    }
  }

  // 2. 크리에이터 이름 조회
  if (userId) {
    const { data: appData } = await client
      .from('applications')
      .select('creator_name, applicant_name')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .maybeSingle()
    if (appData) {
      creatorName = appData.creator_name || appData.applicant_name || '크리에이터'
    }
    if (creatorName === '크리에이터') {
      const { data: profile } = await client
        .from('user_profiles')
        .select('name, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (profile) creatorName = profile.name || profile.full_name || '크리에이터'
    }
    if (creatorName === '크리에이터') {
      const { data: bizApp } = await supabaseBiz
        .from('applications')
        .select('creator_name, applicant_name')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .maybeSingle()
      if (bizApp) creatorName = bizApp.creator_name || bizApp.applicant_name || '크리에이터'
    }
    if (creatorName === '크리에이터') {
      const { data: bizProfile } = await supabaseBiz
        .from('user_profiles')
        .select('name, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (bizProfile) creatorName = bizProfile.name || bizProfile.full_name || '크리에이터'
    }
  }

  const koreanDate = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  console.log('[알림] 발송 준비:', { campaignTitle, companyName, companyPhone: !!companyPhone, companyEmail: !!companyEmail, creatorName, region, version, isResubmission })

  const results = { naverWorks: null, kakao: null, email: null }

  // 3. 네이버 웍스 알림
  try {
    const actionLabel = isResubmission ? '영상 재제출' : '영상 제출'
    let naverWorksMessage = `📹 ${actionLabel} 알림 (${regionLabel})\n\n캠페인: ${campaignTitle}\n기업: ${companyName}\n크리에이터: ${creatorName}\n버전: V${version || 1}\n리전: ${(region || 'korea').toUpperCase()}\n제출 시간: ${koreanDate}`
    if (videoFileCount) naverWorksMessage += `\n파일 수: ${videoFileCount}개`
    if (isResubmission) naverWorksMessage += '\n\n※ 수정 후 재업로드'

    const worksResponse = await fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isAdminNotification: true,
        channelId: process.env.NAVER_WORKS_VIDEO_ROOM_ID || process.env.NAVER_WORKS_CHANNEL_ID,
        message: naverWorksMessage
      })
    })
    results.naverWorks = await worksResponse.json()
    console.log('[알림] 네이버 웍스:', results.naverWorks.success ? '성공' : JSON.stringify(results.naverWorks))
  } catch (e) {
    console.error('[알림] 네이버 웍스 실패:', e.message)
  }

  // 4. 카카오 알림톡 (기업 전화번호가 있는 경우)
  if (companyPhone) {
    try {
      const kakaoResponse = await fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverNum: companyPhone,
          receiverName: companyName,
          templateCode: '025100001008',
          variables: {
            '회사명': companyName,
            '캠페인명': campaignTitle,
            '크리에이터명': creatorName
          }
        })
      })
      results.kakao = await kakaoResponse.json()
      console.log('[알림] 카카오 알림톡:', results.kakao.success ? '성공' : JSON.stringify(results.kakao))
    } catch (e) {
      console.error('[알림] 카카오 알림톡 실패:', e.message)
    }
  } else {
    console.log('[알림] 카카오 알림톡 스킵 - 기업 전화번호 없음')
  }

  // 5. 이메일 (기업 이메일이 있는 경우)
  if (companyEmail) {
    try {
      const actionLabel = isResubmission ? '재제출' : '제출'
      const emailHtml = `
        <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6C5CE7, #a29bfe); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📹 영상 ${actionLabel} 알림</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
            <p style="color: #4a5568; font-size: 16px; margin-bottom: 20px;">
              ${companyName}님, 캠페인의 크리에이터가 ${isResubmission ? '수정된 ' : ''}영상을 ${actionLabel}했습니다.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568; width: 120px;">캠페인</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${campaignTitle}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">크리에이터</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${creatorName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">버전</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">V${version || 1}</td>
              </tr>
              <tr>
                <td style="padding: 12px; background: #f7fafc; font-weight: bold; color: #4a5568;">제출 시간</td>
                <td style="padding: 12px; color: #2d3748;">${koreanDate}</td>
              </tr>
            </table>
            <p style="color: #718096; font-size: 14px;">관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.</p>
            <a href="https://cnecbiz.com/company/campaigns" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">캠페인 관리 페이지로 이동</a>
          </div>
          <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 20px;">CNEC (크넥) | 문의: 1833-6025</p>
        </div>`

      const emailResponse = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: companyEmail,
          subject: `[CNEC] ${campaignTitle} - 크리에이터 영상 ${actionLabel} 알림`,
          html: emailHtml
        })
      })
      results.email = await emailResponse.json()
      console.log('[알림] 이메일:', results.email.success ? '성공' : JSON.stringify(results.email))
    } catch (e) {
      console.error('[알림] 이메일 실패:', e.message)
    }
  } else {
    console.log('[알림] 이메일 스킵 - 기업 이메일 없음')
  }

  return results
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

      // 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if (videoStatus === 'uploaded' || !videoStatus) {
        try {
          const { data: participant } = await client
            .from('campaign_participants')
            .select('campaign_id, user_id')
            .eq('id', participantId)
            .single()

          if (participant) {
            const latestFile = videoFiles[videoFiles.length - 1]
            const version = latestFile?.version || videoFiles.length
            await sendVideoUploadNotifications({
              client,
              campaignId: participant.campaign_id,
              userId: participant.user_id,
              region: region || 'korea',
              version,
              isResubmission: false,
              videoFileCount: videoFiles.length
            })
          }
        } catch (notifyError) {
          console.error('[save-video-upload] update_participant 알림 발송 실패:', notifyError.message)
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

      // video_file_url이 포함된 업데이트면 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if (updateData.video_file_url) {
        try {
          await sendVideoUploadNotifications({
            client,
            campaignId,
            userId,
            region: region || 'korea',
            version: 1,
            isResubmission: false
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
          try {
            await sendVideoUploadNotifications({
              client,
              campaignId: submissionData.campaign_id,
              userId: submissionData.user_id,
              region: region || 'korea',
              version: submissionData.version || 1,
              isResubmission: false
            })
          } catch (notifyError) {
            console.error('[save-video-upload] insert_video_submission 알림 발송 실패:', notifyError.message)
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

      // video_file_url이 업데이트된 경우 (재업로드) 알림 발송 (네이버 웍스 + 카카오 알림톡 + 이메일)
      if (updateData.video_file_url && data?.[0]) {
        try {
          const record = data[0]
          await sendVideoUploadNotifications({
            client,
            campaignId: record.campaign_id,
            userId: record.user_id,
            region: region || 'korea',
            version: record.version || 1,
            isResubmission: true
          })
        } catch (notifyErr) {
          console.error('[save-video-upload] update_video_submission 알림 발송 실패:', notifyErr.message)
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
