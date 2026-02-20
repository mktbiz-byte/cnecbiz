const { createClient } = require('@supabase/supabase-js')

// Service role key로 RLS 우회하여 영상 업로드 관련 DB 작업 처리
const supabaseKorea = createClient(
  process.env.VITE_SUPABASE_KOREA_URL,
  process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { action, participantId, videoFiles, videoStatus, fileName, fileBase64, fileMimeType } = JSON.parse(event.body)

    // 1. 서명된 업로드 URL 생성 (대용량 파일용)
    if (action === 'create_signed_url') {
      if (!fileName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '파일 경로가 누락되었습니다.' })
        }
      }

      const { data, error } = await supabaseKorea.storage
        .from('campaign-videos')
        .createSignedUploadUrl(fileName)

      if (error) {
        console.error('[save-video-upload] Signed URL creation failed:', error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: `서명 URL 생성 실패: ${error.message}` })
        }
      }

      const { data: { publicUrl } } = supabaseKorea.storage
        .from('campaign-videos')
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

      const { data, error } = await supabaseKorea.storage
        .from('campaign-videos')
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

      const { data: { publicUrl } } = supabaseKorea.storage
        .from('campaign-videos')
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

      const { error: updateError } = await supabaseKorea
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

      const { data, error } = await supabaseKorea
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
      const { campaignId, userId, updateData } = JSON.parse(event.body)
      if (!campaignId || !userId || !updateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '필수 파라미터 누락' })
        }
      }

      const { error: appError } = await supabaseKorea
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
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
