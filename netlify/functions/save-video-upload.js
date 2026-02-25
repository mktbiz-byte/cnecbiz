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
// 성능 최적화: 모든 독립적 쿼리를 병렬로 실행
async function sendVideoUploadNotifications({ client, campaignId, userId, region, version, isResubmission, videoFileCount, creatorEmail: paramCreatorEmail, participantCreatorName }) {
  const startTime = Date.now()
  const baseUrl = process.env.URL || 'https://cnecbiz.com'
  let campaignTitle = '(캠페인명 없음)'
  let companyName = '(기업명 없음)'
  let companyPhone = null
  let companyEmail = null
  let creatorName = participantCreatorName || '(크리에이터명 없음)'
  let targetCountry = null

  console.log('[알림] 시작:', { campaignId, userId, region, creatorEmail: paramCreatorEmail })

  // ===== Phase 1: 캠페인 + 크리에이터 정보 병렬 조회 =====
  const campaignFields = 'title, brand, brand_name, company_name, company_id, company_email, target_country'
  const safeQuery = (promise) => promise.then(r => r.data).catch((e) => { console.log('[알림] safeQuery 에러:', e.message); return null })

  // 캠페인 조회 (리전 DB + Korea DB fallback)
  const campaignQueries = [
    safeQuery(client.from('campaigns').select(campaignFields).eq('id', campaignId).maybeSingle())
  ]
  // Korea DB fallback (리전이 korea가 아닌 경우)
  if (region !== 'korea' && client !== supabaseKorea) {
    campaignQueries.push(safeQuery(supabaseKorea.from('campaigns').select(campaignFields).eq('id', campaignId).maybeSingle()))
  }
  const campaignResults = await Promise.all(campaignQueries)
  const campaignData = campaignResults.find(r => r) || null
  console.log('[알림] 캠페인 조회:', { found: !!campaignData, sources: campaignResults.map((r, i) => !!r), elapsed: Date.now() - startTime + 'ms' })

  if (campaignData) {
    campaignTitle = campaignData.title || campaignData.brand || '(캠페인명 없음)'
    companyName = campaignData.company_name || campaignData.brand_name || campaignData.brand || '(기업명 없음)'
    targetCountry = campaignData.target_country
    if (campaignData.company_email) companyEmail = campaignData.company_email
  }

  // ===== Phase 2: 기업 정보 + 크리에이터 정보 병렬 조회 =====
  const companyPromise = (async () => {
    if (!campaignData) return
    // 리전 DB + BIZ DB 모두 조회하여 정확한 기업 찾기 (이관된 캠페인 지원)
    const promises = []

    // 1순위: 리전 DB에서 company_id (id)로 조회 (이관된 캠페인)
    if (campaignData.company_id) {
      promises.push(
        safeQuery(client.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('id', campaignData.company_id).maybeSingle())
          .then(d => d ? { ...d, _source: 'regional_id' } : null)
      )
    }
    // 2순위: 리전 DB에서 company_id (user_id)로 조회 (원래 캠페인)
    if (campaignData.company_id) {
      promises.push(
        safeQuery(client.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('user_id', campaignData.company_id).maybeSingle())
          .then(d => d ? { ...d, _source: 'regional_user_id' } : null)
      )
    }
    // 3순위: 리전 DB에서 company_email로 조회
    if (campaignData.company_email) {
      promises.push(
        safeQuery(client.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('email', campaignData.company_email).maybeSingle())
          .then(d => d ? { ...d, _source: 'regional_email' } : null)
      )
    }
    // 4순위: BIZ DB에서 company_id (id)로 조회
    if (campaignData.company_id) {
      promises.push(
        safeQuery(supabaseBiz.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('id', campaignData.company_id).maybeSingle())
          .then(d => d ? { ...d, _source: 'biz_id' } : null)
      )
    }
    // 5순위: BIZ DB에서 company_id (user_id)로 조회
    if (campaignData.company_id) {
      promises.push(
        safeQuery(supabaseBiz.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('user_id', campaignData.company_id).maybeSingle())
          .then(d => d ? { ...d, _source: 'biz_user_id' } : null)
      )
    }
    // 6순위: BIZ DB에서 company_email로 조회
    if (campaignData.company_email) {
      promises.push(
        safeQuery(supabaseBiz.from('companies').select('company_name, notification_phone, phone, notification_email, email').eq('email', campaignData.company_email).maybeSingle())
          .then(d => d ? { ...d, _source: 'biz_email' } : null)
      )
    }

    const results = await Promise.all(promises)
    // 우선순위대로 첫 번째 유효 결과 사용
    for (const comp of results) {
      if (comp) {
        const resolvedPhone = comp.notification_phone || comp.phone
        const resolvedEmail = comp.notification_email || comp.email
        if (comp.company_name && companyName.startsWith('(')) companyName = comp.company_name
        if (resolvedPhone && !companyPhone) companyPhone = resolvedPhone
        if (resolvedEmail && !companyEmail) companyEmail = resolvedEmail
        if (companyPhone) {
          console.log(`[알림] 기업 정보 (${comp._source}):`, { companyName: comp.company_name, phone: resolvedPhone })
          break
        }
      }
    }
  })()

  const creatorPromise = (async () => {
    // 이미 크리에이터 이름이 있으면 DB 조회 스킵
    if (!creatorName.startsWith('(')) return

    // 모든 DB에서 동시에 크리에이터 이름 조회
    const appPromises = []
    const allClients = [
      { name: 'region', c: client },
      { name: 'biz', c: supabaseBiz }
    ]
    // Korea DB fallback (리전이 korea가 아닌 경우)
    if (region !== 'korea' && client !== supabaseKorea) {
      allClients.push({ name: 'korea', c: supabaseKorea })
    }
    // US/Japan fallback 클라이언트 추가
    const usClient = getRegionClient('us')
    const jpClient = getRegionClient('japan')
    if (usClient && usClient !== client) allClients.push({ name: 'us', c: usClient })
    if (jpClient && jpClient !== client) allClients.push({ name: 'japan', c: jpClient })

    // userId가 있으면 applications에서 조회
    if (userId) {
      for (const { name, c } of allClients) {
        appPromises.push(
          safeQuery(c.from('applications').select('creator_name, applicant_name').eq('campaign_id', campaignId).eq('user_id', userId).maybeSingle())
            .then(d => d ? (d.creator_name || d.applicant_name || null) : null)
        )
      }
      // user_profiles에서도 동시에 조회
      appPromises.push(
        safeQuery(supabaseBiz.from('user_profiles').select('name, full_name').eq('id', userId).maybeSingle())
          .then(d => d ? (d.name || d.full_name || null) : null)
      )
    }

    // creatorEmail이 있으면 applications에서 이메일로도 조회 (Korean campaigns fallback)
    if (paramCreatorEmail) {
      for (const { name, c } of allClients) {
        appPromises.push(
          safeQuery(c.from('applications').select('creator_name, applicant_name').eq('campaign_id', campaignId).eq('applicant_email', paramCreatorEmail).maybeSingle())
            .then(d => d ? (d.creator_name || d.applicant_name || null) : null)
        )
      }
      // user_profiles에서 이메일로도 조회
      appPromises.push(
        safeQuery(client.from('user_profiles').select('name, full_name').eq('email', paramCreatorEmail).maybeSingle())
          .then(d => d ? (d.name || d.full_name || null) : null)
      )
    }

    const results = await Promise.all(appPromises)
    // 첫 번째 non-null 결과 사용
    for (const name of results) {
      if (name) {
        creatorName = name
        break
      }
    }
  })()

  await Promise.all([companyPromise, creatorPromise])
  console.log('[알림] 정보 조회 완료:', { campaignTitle, companyName, creatorName, companyPhone: !!companyPhone, companyEmail: !!companyEmail, elapsed: Date.now() - startTime + 'ms' })

  // 리전/국가 표시 결정
  const countryMap = { kr: '한국 🇰🇷', jp: '일본 🇯🇵', us: '미국 🇺🇸', tw: '대만 🇹🇼' }
  const regionToCountry = { korea: 'kr', japan: 'jp', us: 'us', biz: null }
  const countryCode = targetCountry || regionToCountry[region] || null
  const countryLabel = countryMap[countryCode] || (region ? region.toUpperCase() : '알 수 없음')
  const siteLabel = { kr: 'cnec.co.kr', jp: 'cnec.jp', us: 'cnec.us' }[countryCode] || 'cnecbiz.com'

  const koreanDate = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  // ===== Phase 3: 모든 알림 병렬 발송 =====
  const actionLabel = isResubmission ? '📹 영상 재제출' : '📹 영상 제출'
  const results = { naverWorks: null, kakao: null, email: null }
  const notificationPromises = []

  // 네이버 웍스 (영상 제출 알림 전용 채널)
  const VIDEO_ROOM_DEFAULT = '75c24874-e370-afd5-9da3-72918ba15a3c'
  const channelId = process.env.NAVER_WORKS_VIDEO_ROOM_ID || VIDEO_ROOM_DEFAULT
  if (!channelId) {
    console.error('[알림] 네이버 웍스 채널 ID 미설정')
  } else {
    let naverWorksMessage = `${actionLabel} 알림 (${siteLabel})\n\n`
    naverWorksMessage += `📋 캠페인: ${campaignTitle}\n`
    naverWorksMessage += `🏢 기업: ${companyName}\n`
    naverWorksMessage += `👤 크리에이터: ${creatorName}\n`
    naverWorksMessage += `📌 버전: V${version || 1}\n`
    naverWorksMessage += `🌍 국가: ${countryLabel}\n`
    naverWorksMessage += `⏰ 제출 시간: ${koreanDate}`
    if (videoFileCount) naverWorksMessage += `\n📎 파일 수: ${videoFileCount}개`
    if (isResubmission) naverWorksMessage += '\n\n※ 수정 후 재업로드'

    notificationPromises.push(
      fetch(`${baseUrl}/.netlify/functions/send-naver-works-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdminNotification: true, channelId, message: naverWorksMessage })
      }).then(r => r.json()).then(r => {
        results.naverWorks = r
        console.log('[알림] 네이버 웍스:', r.success ? '성공' : JSON.stringify(r), `(${Date.now() - startTime}ms)`)
      }).catch(e => console.error('[알림] 네이버 웍스 실패:', e.message))
    )
  }

  // 카카오 알림톡
  if (companyPhone) {
    notificationPromises.push(
      fetch(`${baseUrl}/.netlify/functions/send-kakao-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverNum: companyPhone,
          receiverName: companyName,
          templateCode: '025100001008',
          variables: { '회사명': companyName, '캠페인명': campaignTitle, '크리에이터명': creatorName }
        })
      }).then(r => r.json()).then(r => {
        results.kakao = r
        console.log('[알림] 카카오:', r.success ? '성공' : JSON.stringify(r), `(${Date.now() - startTime}ms)`)
      }).catch(e => console.error('[알림] 카카오 실패:', e.message))
    )
  }

  // 이메일
  if (companyEmail) {
    const emailActionLabel = isResubmission ? '재제출' : '제출'
    const emailHtml = `
      <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a29bfe); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📹 영상 ${emailActionLabel} 알림</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="color: #4a5568; font-size: 16px; margin-bottom: 20px;">
            ${companyName}님, 캠페인의 크리에이터가 ${isResubmission ? '수정된 ' : ''}영상을 ${emailActionLabel}했습니다.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568; width: 120px;">캠페인</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${campaignTitle}</td></tr>
            <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">크리에이터</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">${creatorName}</td></tr>
            <tr><td style="padding: 12px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568;">버전</td><td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #2d3748;">V${version || 1}</td></tr>
            <tr><td style="padding: 12px; background: #f7fafc; font-weight: bold; color: #4a5568;">제출 시간</td><td style="padding: 12px; color: #2d3748;">${koreanDate}</td></tr>
          </table>
          <p style="color: #718096; font-size: 14px;">관리자 페이지에서 영상을 검토하시고, 수정 사항이 있으면 피드백을 남겨주세요.</p>
          <a href="https://cnecbiz.com/company/campaigns" style="display: inline-block; background: #6C5CE7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">캠페인 관리 페이지로 이동</a>
        </div>
        <p style="text-align: center; color: #a0aec0; font-size: 12px; margin-top: 20px;">CNEC (크넥) | 문의: 1833-6025</p>
      </div>`

    notificationPromises.push(
      fetch(`${baseUrl}/.netlify/functions/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: companyEmail,
          subject: `[CNEC] ${campaignTitle} - 크리에이터 영상 ${emailActionLabel} 알림`,
          html: emailHtml
        })
      }).then(r => r.json()).then(r => {
        results.email = r
        console.log('[알림] 이메일:', r.success ? '성공' : JSON.stringify(r), `(${Date.now() - startTime}ms)`)
      }).catch(e => console.error('[알림] 이메일 실패:', e.message))
    )
  }

  // 모든 알림 병렬 발송
  await Promise.allSettled(notificationPromises)
  console.log('[알림] 전체 완료:', { naverWorks: !!results.naverWorks?.success, kakao: !!results.kakao?.success, email: !!results.email?.success, totalElapsed: Date.now() - startTime + 'ms' })

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
    const { action, region, participantId, videoFiles, videoStatus, fileName, fileBase64, fileMimeType, skipNotification } = body

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
          console.log('[save-video-upload] update_participant 알림 시작:', { participantId, videoStatus, region })

          // participant 조회: id 매칭 → user_id 매칭 fallback (admin 코드에서 user_id를 participantId로 전달하는 경우 대비)
          let participant = null
          // 1차: 기본 컬럼만 조회 (creator_email, creator_name은 테이블에 없을 수 있으므로 제외)
          const { data: p1, error: e1 } = await client
            .from('campaign_participants')
            .select('campaign_id, user_id')
            .eq('id', participantId)
            .maybeSingle()

          if (p1) {
            participant = p1
          } else {
            console.log('[save-video-upload] id로 participant 못 찾음, user_id로 재시도:', { participantId, error: e1?.message })
            // 2차: user_id로 fallback 조회
            const { data: p2, error: e2 } = await client
              .from('campaign_participants')
              .select('campaign_id, user_id')
              .eq('user_id', participantId)
              .limit(1)
              .maybeSingle()

            if (p2) {
              participant = p2
              console.log('[save-video-upload] user_id fallback으로 participant 찾음:', { campaign_id: p2.campaign_id, user_id: p2.user_id })
            } else {
              console.error('[save-video-upload] user_id로도 participant 못 찾음:', { participantId, error: e2?.message })
            }
          }

          if (participant) {
            console.log('[save-video-upload] participant 데이터:', {
              campaign_id: participant.campaign_id,
              user_id: participant.user_id
            })
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
          } else {
            console.error('[save-video-upload] participant가 null - 알림 발송 불가:', { participantId })
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
      if (updateData.video_file_url && !skipNotification) {
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
          if (!skipNotification) {
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
