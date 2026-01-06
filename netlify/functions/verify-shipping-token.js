const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

// 토큰 검증 함수
const verifyShippingToken = (applicationId, token) => {
  const secret = process.env.SHIPPING_TOKEN_SECRET || 'cnec-shipping-secret-2024'
  const expectedToken = crypto.createHmac('sha256', secret).update(applicationId).digest('hex').substring(0, 32)
  return token === expectedToken
}

// US Supabase
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
 * 배송정보 입력 토큰 검증 및 데이터 조회/저장
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
      throw new Error('Supabase configuration missing')
    }

    const { action, application_id, token, shipping_data } = JSON.parse(event.body)

    // 토큰 검증
    if (!application_id || !token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Missing application_id or token' })
      }
    }

    if (!verifyShippingToken(application_id, token)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid or expired link. Please request a new shipping info email.' })
      }
    }

    // action에 따른 처리
    if (action === 'verify') {
      // 토큰 검증 + application 데이터 조회
      const { data: appData, error: appError } = await supabaseUS
        .from('applications')
        .select('*')
        .eq('id', application_id)
        .single()

      if (appError || !appData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Application not found' })
        }
      }

      // 캠페인 정보 조회
      const { data: campaignData } = await supabaseUS
        .from('campaigns')
        .select('title, brand, product_name')
        .eq('id', appData.campaign_id)
        .single()

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          application: appData,
          campaign: campaignData
        })
      }

    } else if (action === 'submit') {
      // 배송정보 저장
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

      // applications 테이블 업데이트
      const { error: updateError } = await supabaseUS
        .from('applications')
        .update({
          phone_number,
          postal_code: postal_code || null,
          address,
          detail_address: detail_address || null
        })
        .eq('id', application_id)

      if (updateError) {
        throw updateError
      }

      // user_profiles도 업데이트 (application의 user_id 조회 필요)
      const { data: appData } = await supabaseUS
        .from('applications')
        .select('user_id')
        .eq('id', application_id)
        .single()

      if (appData?.user_id) {
        await supabaseUS
          .from('user_profiles')
          .update({
            phone_number,
            phone: phone_number,
            postal_code: postal_code || null,
            shipping_address: address,
            address,
            detail_address: detail_address || null
          })
          .eq('user_id', appData.user_id)
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Shipping info saved successfully' })
      }

    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid action' })
      }
    }

  } catch (error) {
    console.error('[ERROR] Verify shipping token:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
