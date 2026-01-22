/**
 * SNS OAuth 콜백 핸들러
 * YouTube, Instagram, TikTok OAuth 인증 완료 후 토큰 저장
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// YouTube OAuth 토큰 교환
async function handleYouTubeCallback(code, redirectUri) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(`YouTube token error: ${tokenData.error_description || tokenData.error}`)
  }

  // 채널 정보 가져오기
  const channelResponse = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }
  )
  const channelData = await channelResponse.json()

  const channel = channelData.items?.[0]
  const channelId = channel?.id
  const channelName = channel?.snippet?.title

  return {
    platform: 'youtube',
    account_name: channelName || 'YouTube 채널',
    account_id: channelId,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    extra_data: { channel_id: channelId }
  }
}

// Instagram (Facebook) OAuth 토큰 교환
async function handleInstagramCallback(code, redirectUri) {
  // Step 1: 단기 토큰 교환
  const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      code,
      redirect_uri: redirectUri
    })
  })

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(`Facebook token error: ${tokenData.error.message}`)
  }

  // Step 2: 장기 토큰으로 교환
  const longTokenResponse = await fetch(
    `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
  )
  const longTokenData = await longTokenResponse.json()

  const accessToken = longTokenData.access_token || tokenData.access_token
  const expiresIn = longTokenData.expires_in || 5184000 // 기본 60일

  // Step 3: Facebook 페이지 목록 가져오기
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
  )
  const pagesData = await pagesResponse.json()

  // 첫 번째 페이지 사용 (또는 사용자가 선택하도록 수정 가능)
  const page = pagesData.data?.[0]
  if (!page) {
    throw new Error('연결된 Facebook 페이지가 없습니다.')
  }

  // Step 4: Instagram 비즈니스 계정 ID 가져오기
  const igAccountResponse = await fetch(
    `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
  )
  const igAccountData = await igAccountResponse.json()

  const instagramAccountId = igAccountData.instagram_business_account?.id
  if (!instagramAccountId) {
    throw new Error('Instagram 비즈니스 계정이 연결되지 않았습니다.')
  }

  // Instagram 계정 정보 가져오기
  const igInfoResponse = await fetch(
    `https://graph.facebook.com/v18.0/${instagramAccountId}?fields=username,name&access_token=${page.access_token}`
  )
  const igInfo = await igInfoResponse.json()

  return {
    platform: 'instagram',
    account_name: igInfo.name || igInfo.username || 'Instagram 계정',
    account_id: igInfo.username,
    access_token: page.access_token, // 페이지 토큰 사용
    refresh_token: null, // Facebook 장기 토큰은 refresh 불필요
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    extra_data: {
      instagram_business_account_id: instagramAccountId,
      facebook_page_id: page.id,
      facebook_page_name: page.name
    }
  }
}

// TikTok OAuth 토큰 교환
async function handleTikTokCallback(code, redirectUri) {
  const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  const tokenData = await tokenResponse.json()

  if (tokenData.error) {
    throw new Error(`TikTok token error: ${tokenData.error_description || tokenData.error}`)
  }

  // 사용자 정보 가져오기
  const userResponse = await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    }
  )
  const userData = await userResponse.json()

  const user = userData.data?.user

  return {
    platform: 'tiktok',
    account_name: user?.display_name || 'TikTok 계정',
    account_id: user?.open_id,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    extra_data: {
      open_id: user?.open_id,
      union_id: user?.union_id
    }
  }
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
    const { platform, code, redirectUri } = JSON.parse(event.body)

    if (!platform || !code) {
      throw new Error('platform과 code가 필요합니다.')
    }

    console.log(`[sns-oauth-callback] Processing ${platform} callback...`)

    let accountData

    switch (platform) {
      case 'youtube':
        accountData = await handleYouTubeCallback(code, redirectUri)
        break
      case 'instagram':
        accountData = await handleInstagramCallback(code, redirectUri)
        break
      case 'tiktok':
        accountData = await handleTikTokCallback(code, redirectUri)
        break
      default:
        throw new Error(`지원하지 않는 플랫폼: ${platform}`)
    }

    // 기존 계정 확인 (같은 플랫폼)
    const { data: existingAccounts } = await supabaseBiz
      .from('sns_upload_accounts')
      .select('id')
      .eq('platform', platform)
      .eq('is_active', true)

    // 기존 계정 비활성화
    if (existingAccounts?.length > 0) {
      await supabaseBiz
        .from('sns_upload_accounts')
        .update({ is_active: false })
        .eq('platform', platform)
    }

    // 새 계정 저장
    const { data: newAccount, error: insertError } = await supabaseBiz
      .from('sns_upload_accounts')
      .insert({
        ...accountData,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    console.log(`[sns-oauth-callback] ${platform} account saved:`, newAccount.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: newAccount.id,
          platform: newAccount.platform,
          account_name: newAccount.account_name,
          account_id: newAccount.account_id
        }
      })
    }
  } catch (error) {
    console.error('[sns-oauth-callback] Error:', error)

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
