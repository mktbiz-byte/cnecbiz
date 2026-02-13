/**
 * Meta 광고 계정 연동
 * - OAuth access token으로 광고 계정 목록 조회
 * - 선택된 광고 계정 저장
 */
const { createClient } = require('@supabase/supabase-js')

const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// 장기 토큰 교환
async function exchangeLongLivedToken(shortToken) {
  const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortToken}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

// 광고 계정 목록 조회
async function fetchAdAccounts(accessToken) {
  const url = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,currency,timezone_name,account_status,business{id,name}&access_token=${accessToken}&limit=50`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.data || []
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  try {
    const { action, code, redirectUri, accessToken, selectedAccounts, adminUserId } = JSON.parse(event.body)

    // 1. OAuth 코드 → 액세스 토큰 교환
    if (action === 'exchange_token') {
      // 단기 토큰 교환
      const tokenRes = await fetch('https://graph.facebook.com/v21.0/oauth/access_token', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`
      const shortRes = await fetch(tokenUrl)
      const shortData = await shortRes.json()

      if (shortData.error) {
        throw new Error(shortData.error.message || 'Token exchange failed')
      }

      // 장기 토큰으로 교환
      const longData = await exchangeLongLivedToken(shortData.access_token)

      // 광고 계정 목록 조회
      const adAccounts = await fetchAdAccounts(longData.access_token)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: longData.access_token,
            expiresIn: longData.expires_in,
            adAccounts: adAccounts.map(acc => ({
              id: acc.id,
              accountId: acc.account_id,
              name: acc.name,
              currency: acc.currency,
              timezone: acc.timezone_name,
              status: acc.account_status,
              businessId: acc.business?.id,
              businessName: acc.business?.name
            }))
          }
        })
      }
    }

    // 2. 광고 계정 목록만 조회 (기존 토큰으로)
    if (action === 'fetch_accounts') {
      const adAccounts = await fetchAdAccounts(accessToken)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: adAccounts.map(acc => ({
            id: acc.id,
            accountId: acc.account_id,
            name: acc.name,
            currency: acc.currency,
            timezone: acc.timezone_name,
            status: acc.account_status,
            businessId: acc.business?.id,
            businessName: acc.business?.name
          }))
        })
      }
    }

    // 3. 선택된 광고 계정 저장
    if (action === 'save_accounts') {
      if (!selectedAccounts || selectedAccounts.length === 0) {
        throw new Error('저장할 광고 계정을 선택해주세요.')
      }

      const saved = []
      for (const acc of selectedAccounts) {
        // 이미 연동된 계정 비활성화
        await supabaseBiz
          .from('meta_ad_accounts')
          .update({ is_active: false })
          .eq('ad_account_id', acc.id)
          .eq('is_active', true)

        const { data, error } = await supabaseBiz
          .from('meta_ad_accounts')
          .insert({
            business_id: acc.businessId || null,
            ad_account_id: acc.id,
            ad_account_name: acc.name,
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(), // ~60일
            currency: acc.currency || 'KRW',
            timezone: acc.timezone || 'Asia/Seoul',
            account_status: acc.status,
            extra_data: { businessName: acc.businessName },
            is_active: true,
            connected_by: adminUserId || null
          })
          .select()
          .single()

        if (error) {
          console.error('[meta-ads-connect] Insert error:', error)
          throw error
        }
        saved.push(data)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data: saved })
      }
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (error) {
    console.error('[meta-ads-connect] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
