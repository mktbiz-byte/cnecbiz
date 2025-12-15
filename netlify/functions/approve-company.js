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

    // Update is_approved field
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ is_approved: approve })
      .eq('id', companyId)
      .select()

    if (error) {
      console.error('Error updating approval:', JSON.stringify(error))

      // If column doesn't exist, return specific error
      if (error.message && error.message.includes('is_approved')) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'is_approved 컬럼이 없습니다. Supabase SQL Editor에서 다음 명령어를 실행해주세요: ALTER TABLE companies ADD COLUMN is_approved BOOLEAN DEFAULT NULL;',
            originalError: error.message
          })
        }
      }

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      }
    }

    console.log('Update successful:', data)

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
