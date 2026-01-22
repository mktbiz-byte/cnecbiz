const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 토큰 갱신 (REST API 직접 호출)
async function refreshAccessToken(accountId, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
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
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId)

    return data.access_token
  } catch (error) {
    console.error('[upload-to-youtube] Token refresh failed:', error)
    throw new Error('YouTube 토큰 갱신 실패. 재인증이 필요합니다.')
  }
}

// 영상 다운로드 (Supabase Storage URL에서)
async function downloadVideo(videoUrl) {
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(`영상 다운로드 실패: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
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
      uploadId,        // sns_uploads.id (이미 생성된 레코드)
      videoUrl,        // 직접 업로드할 경우
      title,
      description,
      tags,
      privacyStatus = 'public',
      categoryId = '22', // People & Blogs
      accountId
    } = JSON.parse(event.body)

    // 업로드 레코드 조회 또는 계정 정보 직접 조회
    let account, uploadRecord, finalTitle, finalDescription, finalTags

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

      // 템플릿 변수 치환
      const variables = {
        creator_name: upload.creator_name,
        campaign_name: upload.campaign_name,
        product_name: upload.campaign_name // 일단 캠페인명으로 대체
      }

      finalTitle = upload.title || replaceTemplateVariables(upload.sns_upload_templates?.title_template, variables)
      finalDescription = upload.description || replaceTemplateVariables(upload.sns_upload_templates?.description_template, variables)
      finalTags = upload.hashtags || upload.sns_upload_templates?.hashtags || []

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
        .eq('platform', 'youtube')
        .eq('is_active', true)
        .single()

      if (accError || !acc) {
        throw new Error('YouTube 계정을 찾을 수 없습니다.')
      }

      account = acc
      finalTitle = title
      finalDescription = description
      finalTags = tags || []
    }

    // 토큰 확인 및 갱신
    let accessToken = account.access_token
    const tokenExpiry = new Date(account.token_expires_at)

    if (tokenExpiry < new Date()) {
      console.log('[upload-to-youtube] Token expired, refreshing...')
      accessToken = await refreshAccessToken(account.id, account.refresh_token)
    }

    // 영상 다운로드
    const videoBuffer = await downloadVideo(uploadRecord?.video_url || videoUrl)

    // YouTube Resumable Upload API 사용
    console.log('[upload-to-youtube] Starting upload...')

    const metadata = {
      snippet: {
        title: finalTitle?.substring(0, 100) || 'CNEC 크리에이터 영상',
        description: finalDescription || '',
        tags: finalTags,
        categoryId: uploadRecord?.sns_upload_templates?.youtube_settings?.category_id || categoryId
      },
      status: {
        privacyStatus: uploadRecord?.sns_upload_templates?.youtube_settings?.privacy_status || privacyStatus,
        selfDeclaredMadeForKids: false
      }
    }

    // Step 1: Resumable upload 세션 시작
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'video/*',
          'X-Upload-Content-Length': videoBuffer.length.toString()
        },
        body: JSON.stringify(metadata)
      }
    )

    if (!initResponse.ok) {
      const errorData = await initResponse.json()
      throw new Error(`YouTube 업로드 초기화 실패: ${errorData.error?.message || initResponse.status}`)
    }

    const uploadUrl = initResponse.headers.get('location')
    if (!uploadUrl) {
      throw new Error('YouTube 업로드 URL을 받지 못했습니다.')
    }

    console.log('[upload-to-youtube] Upload session created, uploading video...')

    // Step 2: 영상 업로드
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'video/*',
        'Content-Length': videoBuffer.length.toString()
      },
      body: videoBuffer
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error(`YouTube 영상 업로드 실패: ${errorData.error?.message || uploadResponse.status}`)
    }

    const uploadResult = await uploadResponse.json()
    const videoId = uploadResult.id
    const videoUrlResult = `https://www.youtube.com/watch?v=${videoId}`

    console.log('[upload-to-youtube] Upload successful:', videoId)

    // 결과 저장
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({
          status: 'completed',
          platform_video_id: videoId,
          platform_video_url: videoUrlResult,
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
          videoUrl: videoUrlResult,
          platform: 'youtube'
        }
      })
    }
  } catch (error) {
    console.error('[upload-to-youtube] Error:', error)

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
