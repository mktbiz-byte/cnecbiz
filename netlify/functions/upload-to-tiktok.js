const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// TikTok Content Posting API
// 참고: https://developers.tiktok.com/doc/content-posting-api-get-started

// 토큰 갱신
async function refreshAccessToken(accountId, refreshToken) {
  try {
    const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error_description || data.error)
    }

    // DB에 새 토큰 저장
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)
    await supabaseBiz
      .from('sns_upload_accounts')
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)

    return data.access_token
  } catch (error) {
    console.error('[upload-to-tiktok] Token refresh failed:', error)
    throw new Error('TikTok 토큰 갱신 실패. 재인증이 필요합니다.')
  }
}

// 템플릿 변수 치환
function replaceTemplateVariables(template, variables) {
  if (!template) return ''
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '')
  }
  return result
}

// 영상 다운로드 (Supabase Storage URL에서)
async function downloadVideo(videoUrl) {
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`영상 다운로드 실패: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

// 업로드 상태 확인 (폴링)
async function waitForPublishComplete(publishId, accessToken, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://open.tiktokapis.com/v2/post/publish/status/fetch/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ publish_id: publishId })
      }
    )

    const data = await response.json()
    console.log(`[upload-to-tiktok] Publish status (${i + 1}/${maxAttempts}):`, data.data?.status)

    if (data.data?.status === 'PUBLISH_COMPLETE') {
      return data.data
    } else if (data.data?.status === 'FAILED') {
      throw new Error(`게시 실패: ${data.data.fail_reason || 'Unknown error'}`)
    }

    // 5초 대기
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  throw new Error('게시 시간 초과')
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const {
      uploadId,        // sns_uploads.id
      videoUrl,        // 직접 업로드할 경우
      title,
      privacyLevel = 'PUBLIC_TO_EVERYONE',
      accountId
    } = JSON.parse(event.body)

    let account, uploadRecord, finalTitle, openId

    if (uploadId) {
      // 기존 업로드 레코드에서 정보 가져오기
      const { data: upload, error: uploadError } = await supabaseBiz
        .from('sns_uploads')
        .select('*, sns_upload_accounts(*), sns_upload_templates(*)')
        .eq('id', uploadId)
        .single()

      if (uploadError || !upload) {
        throw new Error('업로드 레코드를 찾을 수 없습니다.')
      }

      uploadRecord = upload
      account = upload.sns_upload_accounts
      openId = account.extra_data?.open_id

      // 템플릿 변수 치환
      const variables = {
        creator_name: upload.creator_name,
        campaign_name: upload.campaign_name,
        product_name: upload.campaign_name
      }

      // TikTok은 제목(설명)과 해시태그
      const titleTemplate = upload.title ||
        replaceTemplateVariables(upload.sns_upload_templates?.title_template, variables)
      const hashtags = (upload.hashtags || upload.sns_upload_templates?.hashtags || [])
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ')

      finalTitle = `${titleTemplate} ${hashtags}`.substring(0, 2200)

      // 상태 업데이트: uploading
      await supabaseBiz
        .from('sns_uploads')
        .update({
          status: 'uploading',
          upload_started_at: new Date().toISOString()
        })
        .eq('id', uploadId)
    } else {
      // 직접 업로드 모드
      const { data: acc, error: accError } = await supabaseBiz
        .from('sns_upload_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'tiktok')
        .eq('is_active', true)
        .single()

      if (accError || !acc) {
        throw new Error('TikTok 계정을 찾을 수 없습니다.')
      }

      account = acc
      openId = acc.extra_data?.open_id
      finalTitle = title
    }

    if (!openId) {
      throw new Error('TikTok Open ID가 설정되지 않았습니다.')
    }

    // 토큰 확인 및 갱신
    let accessToken = account.access_token
    const tokenExpiry = new Date(account.token_expires_at)

    if (tokenExpiry < new Date()) {
      console.log('[upload-to-tiktok] Token expired, refreshing...')
      accessToken = await refreshAccessToken(account.id, account.refresh_token)
    }

    const finalVideoUrl = uploadRecord?.video_url || videoUrl

    // 영상 다운로드
    const videoBuffer = await downloadVideo(finalVideoUrl)
    const videoSize = videoBuffer.length

    console.log('[upload-to-tiktok] Video size:', videoSize, 'bytes')

    // TikTok 설정
    const tiktokSettings = uploadRecord?.sns_upload_templates?.tiktok_settings || {}

    // Step 1: 업로드 초기화
    console.log('[upload-to-tiktok] Initializing upload...')

    const initResponse = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_info: {
            title: finalTitle,
            privacy_level: tiktokSettings.privacy_level || privacyLevel,
            disable_duet: !tiktokSettings.allow_duet,
            disable_comment: !tiktokSettings.allow_comment,
            disable_stitch: !tiktokSettings.allow_stitch
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize, // 단일 청크
            total_chunk_count: 1
          }
        })
      }
    )

    const initData = await initResponse.json()

    if (initData.error?.code) {
      throw new Error(`업로드 초기화 실패: ${initData.error.message}`)
    }

    const publishId = initData.data.publish_id
    const uploadUrl = initData.data.upload_url

    console.log('[upload-to-tiktok] Upload initialized, publish_id:', publishId)

    // 상태 업데이트: processing
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({ status: 'processing' })
        .eq('id', uploadId)
    }

    // Step 2: 영상 업로드
    console.log('[upload-to-tiktok] Uploading video...')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoSize.toString(),
        'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`
      },
      body: videoBuffer
    })

    if (!uploadResponse.ok) {
      throw new Error(`영상 업로드 실패: ${uploadResponse.status}`)
    }

    console.log('[upload-to-tiktok] Video uploaded, waiting for publish...')

    // Step 3: 게시 완료 대기
    const publishResult = await waitForPublishComplete(publishId, accessToken)

    // TikTok 영상 URL (publish 완료 후 video_id로 구성)
    // 실제 URL은 사용자 프로필에서 확인 필요
    const videoId = publishResult.video_id || publishId
    const postUrl = `https://www.tiktok.com/@${account.account_id}/video/${videoId}`

    console.log('[upload-to-tiktok] Published successfully:', videoId)

    // 결과 저장
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({
          status: 'completed',
          platform_video_id: videoId,
          platform_video_url: postUrl,
          upload_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', uploadId)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          videoId,
          postUrl,
          platform: 'tiktok'
        }
      })
    }
  } catch (error) {
    console.error('[upload-to-tiktok] Error:', error)

    // 실패 상태 저장
    const { uploadId } = JSON.parse(event.body || '{}')
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', uploadId)
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
