const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
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

    // Update is_approved field
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ is_approved: approve })
      .eq('id', companyId)
      .select()

    if (error) {
      console.error('Error updating approval:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      }
    }

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
