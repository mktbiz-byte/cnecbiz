const { createClient } = require('@supabase/supabase-js')

// BIZ 데이터베이스 사용
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { companyId, approve } = JSON.parse(event.body)

    if (!companyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'companyId is required' })
      }
    }

    console.log('Approving company:', companyId, 'approve:', approve)

    // Use RPC to bypass schema cache issue
    const { data, error } = await supabaseAdmin.rpc('approve_company', {
      company_uuid: companyId,
      approved: approve
    })

    if (error) {
      console.error('RPC Error:', JSON.stringify(error))

      // Fallback: try direct update
      const { data: directData, error: directError } = await supabaseAdmin
        .from('companies')
        .update({ is_approved: approve })
        .eq('id', companyId)
        .select()

      if (directError) {
        console.error('Direct update error:', JSON.stringify(directError))
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'approve_company 함수가 없습니다. Supabase SQL Editor에서 함수를 생성해주세요.',
            originalError: error.message
          })
        }
      }

      console.log('Direct update successful:', directData)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: approve ? '계정이 승인되었습니다.' : '계정 승인이 거부되었습니다.',
          data: directData
        })
      }
    }

    console.log('RPC successful')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: approve ? '계정이 승인되었습니다.' : '계정 승인이 거부되었습니다.',
        data
      })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
