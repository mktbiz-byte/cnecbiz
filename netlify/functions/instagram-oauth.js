/**
 * Instagram OAuth 연동 함수 (테스트용)
 *
 * ──────────────────────────────────────────────────────────────
 * 필요한 Netlify 환경변수:
 *   FACEBOOK_APP_ID      기존 Meta Ads 앱과 동일하게 사용
 *   FACEBOOK_APP_SECRET  기존 Meta Ads 앱과 동일하게 사용
 *
 * Meta for Developers 추가 설정 (최초 1회):
 * 1. https://developers.facebook.com → 해당 앱 선택
 * 2. 제품 추가 → "Instagram 그래프 API" 추가
 * 3. 앱 설정 → 기본 설정 → 앱 도메인: cnecbiz.com 추가
 * 4. Facebook 로그인 → 설정 → 유효한 OAuth 리디렉션 URI:
 *    https://cnecbiz.com/admin/oauth-test 추가
 * 5. 테스터 계정 추가 (심사 없이 테스트용):
 *    앱 역할 → 역할 → 테스터 추가 → 테스트할 Facebook 계정 이메일 입력
 *    해당 계정: facebook.com/settings → 앱 및 웹사이트 → 테스터 초대 수락
 * ──────────────────────────────────────────────────────────────
 */
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const FB_API = 'https://graph.facebook.com/v21.0'
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  const appId = process.env.FACEBOOK_APP_ID || process.env.VITE_FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  try {
    const body = JSON.parse(event.body || '{}')
    const { action, code, redirectUri, accessToken } = body
    if (action === 'exchange_code') {
      if (!appId || !appSecret) {
        throw new Error('FACEBOOK_APP_ID 또는 FACEBOOK_APP_SECRET 환경변수가 누락되었습니다.')
      }
      if (!code) throw new Error('code가 필요합니다.')
      const redirect = redirectUri || 'https://cnecbiz.com/admin/oauth-test'
      // 단기 토큰
      const shortUrl = `${FB_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&client_secret=${appSecret}&code=${code}`
      const shortRes = await fetch(shortUrl)
      const shortData = await shortRes.json()
      if (shortData.error) throw new Error(`토큰 교환 실패: ${shortData.error.message}`)
      // 장기 토큰 (60일)
      const longUrl = `${FB_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`
      const longRes = await fetch(longUrl)
      const longData = await longRes.json()
      if (longData.error) throw new Error(`장기 토큰 교환 실패: ${longData.error.message}`)
      const token = longData.access_token
      // Facebook 유저 기본 정보
      const meRes = await fetch(`${FB_API}/me?fields=id,name&access_token=${token}`)
      const meData = await meRes.json()
      if (meData.error) throw new Error(`유저 정보 조회 실패: ${meData.error.message}`)
      // 연결된 Facebook 페이지 + Instagram 계정
      const pagesRes = await fetch(`${FB_API}/me/accounts?fields=id,name,instagram_business_account{id,username,followers_count,media_count,profile_picture_url}&access_token=${token}`)
      const pagesData = await pagesRes.json()
      const pages = pagesData.error ? [] : (pagesData.data || [])
      const igAccounts = pages
        .filter(p => p.instagram_business_account)
        .map(p => ({
          pageId: p.id,
          pageName: p.name,
          igId: p.instagram_business_account.id,
          username: p.instagram_business_account.username,
          followersCount: p.instagram_business_account.followers_count,
          mediaCount: p.instagram_business_account.media_count,
          profilePictureUrl: p.instagram_business_account.profile_picture_url
        }))
      // 최근 게시물 조회 (Instagram 연결된 경우)
      let recentMedia = []
      if (igAccounts.length > 0) {
        const igId = igAccounts[0].igId
        const mediaRes = await fetch(`${FB_API}/${igId}/media?fields=id,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count&limit=6&access_token=${token}`)
        const mediaData = await mediaRes.json()
        recentMedia = (mediaData.data || []).map(m => ({
          id: m.id,
          type: m.media_type,
          thumbnail: m.thumbnail_url || m.media_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
          likes: m.like_count || 0,
          comments: m.comments_count || 0
        }))
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            userId: meData.id,
            name: meData.name,
            tokenPreview: token.substring(0, 20) + '...',
            tokenExpiresIn: longData.expires_in,
            pagesCount: pages.length,
            igAccounts,
            recentMedia,
            igConnected: igAccounts.length > 0,
            igNotConnectedReason: igAccounts.length === 0
              ? 'Facebook 페이지에 Instagram 비즈니스/크리에이터 계정이 연결되어 있지 않습니다. Instagram 앱 → 설정 → 계정 유형 → 크리에이터 또는 비즈니스로 전환 후 Facebook 페이지에 연결해주세요.'
              : null
          }
        })
      }
    }
    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('[instagram-oauth] Error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
