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
    console.log('VITE_SUPABASE_BIZ_URL:', process.env.VITE_SUPABASE_BIZ_URL ? 'SET' : 'NOT SET')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET')

    // Try RPC first
    console.log('Trying RPC approve_company...')
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('approve_company', {
      company_uuid: companyId,
      approved: approve
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError.message, rpcError.code, rpcError.details)

      // Try direct update
      console.log('RPC failed, trying direct update...')
      const { data: directData, error: directError } = await supabaseAdmin
        .from('companies')
        .update({ is_approved: approve })
        .eq('id', companyId)
        .select()

      if (directError) {
        console.error('Direct update error:', directError.message, directError.code, directError.details)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: `RPC 실패: ${rpcError.message} | 직접 업데이트 실패: ${directError.message}`,
            rpcError: rpcError,
            directError: directError
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

    console.log('RPC successful:', rpcData)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: approve ? '계정이 승인되었습니다.' : '계정 승인이 거부되었습니다.',
        data: rpcData
      })
    }
  } catch (error) {
    console.error('Catch Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    }
  }
}
