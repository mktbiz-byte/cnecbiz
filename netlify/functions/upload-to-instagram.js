const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Instagram Graph API를 통한 릴스 업로드
// 참고: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

// 토큰 갱신 (Facebook 장기 토큰)
async function refreshAccessToken(accountId, accessToken) {
  try {
    // Facebook 장기 토큰 갱신
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${accessToken}`
    )
    const data = await response.json()

    if (data.error) {
      throw new Error(data.error.message)
    }

    // DB에 새 토큰 저장
    const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000)
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
    console.error('[upload-to-instagram] Token refresh failed:', error)
    throw new Error('Instagram 토큰 갱신 실패. 재인증이 필요합니다.')
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

// 컨테이너 생성 상태 확인 (폴링)
async function waitForContainerReady(containerId, accessToken, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
    )
    const data = await response.json()

    console.log(`[upload-to-instagram] Container status (${i + 1}/${maxAttempts}):`, data.status_code)

    if (data.status_code === 'FINISHED') {
      return true
    } else if (data.status_code === 'ERROR') {
      throw new Error(`컨테이너 생성 실패: ${data.status || 'Unknown error'}`)
    }

    // 10초 대기
    await new Promise(resolve => setTimeout(resolve, 10000))
  }

  throw new Error('컨테이너 생성 시간 초과')
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
      videoUrl,        // 직접 업로드할 경우 (공개 URL 필요)
      caption,
      accountId
    } = JSON.parse(event.body)

    let account, uploadRecord, finalCaption, igAccountId

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
      igAccountId = account.extra_data?.instagram_business_account_id

      // 템플릿 변수 치환
      const variables = {
        creator_name: upload.creator_name,
        campaign_name: upload.campaign_name,
        product_name: upload.campaign_name
      }

      // Instagram은 제목 없이 캡션만 사용
      const descTemplate = upload.description ||
        replaceTemplateVariables(upload.sns_upload_templates?.description_template, variables)
      const hashtags = (upload.hashtags || upload.sns_upload_templates?.hashtags || [])
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ')

      finalCaption = `${descTemplate}\n\n${hashtags}`

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
        .eq('platform', 'instagram')
        .eq('is_active', true)
        .single()

      if (accError || !acc) {
        throw new Error('Instagram 계정을 찾을 수 없습니다.')
      }

      account = acc
      igAccountId = acc.extra_data?.instagram_business_account_id
      finalCaption = caption
    }

    if (!igAccountId) {
      throw new Error('Instagram 비즈니스 계정 ID가 설정되지 않았습니다.')
    }

    // 토큰 확인 및 갱신
    let accessToken = account.access_token
    const tokenExpiry = new Date(account.token_expires_at)

    if (tokenExpiry < new Date(Date.now() + 86400000)) { // 1일 전에 갱신
      console.log('[upload-to-instagram] Token expiring soon, refreshing...')
      accessToken = await refreshAccessToken(account.id, accessToken)
    }

    const finalVideoUrl = uploadRecord?.video_url || videoUrl

    // 영상 URL이 공개적으로 접근 가능해야 함
    if (!finalVideoUrl.startsWith('http')) {
      throw new Error('영상 URL은 공개적으로 접근 가능해야 합니다.')
    }

    console.log('[upload-to-instagram] Creating media container...')

    // Step 1: 미디어 컨테이너 생성 (릴스)
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: finalVideoUrl,
          caption: finalCaption?.substring(0, 2200) || '', // Instagram 캡션 제한
          share_to_feed: true,
          access_token: accessToken
        })
      }
    )

    const containerData = await containerResponse.json()

    if (containerData.error) {
      throw new Error(`컨테이너 생성 실패: ${containerData.error.message}`)
    }

    const containerId = containerData.id
    console.log('[upload-to-instagram] Container created:', containerId)

    // 상태 업데이트: processing
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({ status: 'processing' })
        .eq('id', uploadId)
    }

    // Step 2: 컨테이너 준비 대기
    await waitForContainerReady(containerId, accessToken)

    console.log('[upload-to-instagram] Container ready, publishing...')

    // Step 3: 미디어 게시
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken
        })
      }
    )

    const publishData = await publishResponse.json()

    if (publishData.error) {
      throw new Error(`게시 실패: ${publishData.error.message}`)
    }

    const mediaId = publishData.id

    // 게시물 permalink 가져오기
    const permalinkResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}?fields=permalink&access_token=${accessToken}`
    )
    const permalinkData = await permalinkResponse.json()
    const postUrl = permalinkData.permalink || `https://www.instagram.com/p/${mediaId}`

    console.log('[upload-to-instagram] Published successfully:', mediaId)

    // 결과 저장
    if (uploadId) {
      await supabaseBiz
        .from('sns_uploads')
        .update({
          status: 'completed',
          platform_video_id: mediaId,
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
          mediaId,
          postUrl,
          platform: 'instagram'
        }
      })
    }
  } catch (error) {
    console.error('[upload-to-instagram] Error:', error)

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
