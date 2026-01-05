const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// 토큰 검증 함수 (선택적)
const verifyShippingToken = (applicationId, token) => {
  if (!token) return true // 토큰 없으면 검증 건너뛰기 (기존 링크 호환)
  const secret = process.env.SHIPPING_TOKEN_SECRET || 'cnec-shipping-secret-2024'
  const expectedToken = crypto.createHmac('sha256', secret).update(applicationId).digest('hex').substring(0, 32)
  return token === expectedToken
}

// US Supabase (service role key로 RLS 우회)
const usUrl = process.env.VITE_SUPABASE_US_URL
const usServiceKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY
const supabaseUS = usUrl && usServiceKey ? createClient(usUrl, usServiceKey) : null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * US 크리에이터 배송정보 저장
 * - service role key 사용으로 RLS 우회
 * - applications 테이블 + user_profiles 테이블 업데이트
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    if (!supabaseUS) {
      console.error('[ERROR] Supabase US configuration missing')
      throw new Error('Database configuration error')
    }

    const { application_id, token, shipping_data } = JSON.parse(event.body)
    console.log('[INFO] Submit shipping info:', { application_id, hasToken: !!token })

    if (!application_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing application_id' })
      }
    }

    // 토큰 검증 (토큰이 있는 경우에만)
    if (token && !verifyShippingToken(application_id, token)) {
      console.warn('[WARN] Invalid token for application:', application_id)
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid token' })
      }
    }

    if (!shipping_data) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing shipping data' })
      }
    }

    const { phone_number, postal_code, address, detail_address } = shipping_data

    if (!phone_number || !address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Phone number and address are required' })
      }
    }

    // 1. Application 존재 확인
    const { data: appCheck, error: checkError } = await supabaseUS
      .from('applications')
      .select('id, user_id')
      .eq('id', application_id)
      .single()

    if (checkError || !appCheck) {
      console.error('[ERROR] Application not found:', application_id, checkError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Application not found' })
      }
    }

    console.log('[INFO] Found application:', appCheck)

    // 2. Applications 테이블 업데이트
    const { data: updateData, error: updateError } = await supabaseUS
      .from('applications')
      .update({
        phone_number,
        postal_code: postal_code || null,
        address,
        detail_address: detail_address || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', application_id)
      .select()

    if (updateError) {
      console.error('[ERROR] Failed to update application:', updateError)
      throw new Error(`Database update failed: ${updateError.message}`)
    }

    console.log('[SUCCESS] Application updated:', updateData)

    // 3. User profiles 업데이트 (user_id가 있는 경우)
    if (appCheck.user_id) {
      const { error: profileError } = await supabaseUS
        .from('user_profiles')
        .update({
          phone_number,
          phone: phone_number,
          postal_code: postal_code || null,
          shipping_address: address,
          address,
          detail_address: detail_address || null
        })
        .eq('user_id', appCheck.user_id)

      if (profileError) {
        console.warn('[WARN] Failed to update user_profiles:', profileError)
        // user_profiles 업데이트 실패는 무시 (applications이 중요)
      } else {
        console.log('[SUCCESS] User profile updated for user_id:', appCheck.user_id)
      }
    }

    // 4. 저장 확인을 위해 다시 조회
    const { data: verifyData, error: verifyError } = await supabaseUS
      .from('applications')
      .select('phone_number, postal_code, address, detail_address')
      .eq('id', application_id)
      .single()

    if (verifyError) {
      console.error('[ERROR] Failed to verify saved data:', verifyError)
    } else {
      console.log('[VERIFY] Saved data:', verifyData)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Shipping info saved successfully',
        saved_data: verifyData
      })
    }

  } catch (error) {
    console.error('[ERROR] Submit shipping info:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
