/**
 * 소속 크리에이터 관리 API
 * CRUD 작업: 생성, 조회, 수정, 삭제
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization header required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const method = event.httpMethod
    const body = event.body ? JSON.parse(event.body) : {}
    const { id } = event.queryStringParameters || {}

    // GET: 목록 조회
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('affiliated_creators')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      }
    }

    // POST: 새 크리에이터 추가
    if (method === 'POST') {
      const {
        creator_name,
        channel_url,
        channel_id,
        youtube_api_key,
        use_api,
        thumbnail_url,
        platform,
        notes
      } = body

      if (!creator_name || !channel_url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'creator_name and channel_url are required' })
        }
      }

      const { data, error } = await supabase
        .from('affiliated_creators')
        .insert([{
          company_id: user.id,
          creator_name,
          channel_url,
          channel_id,
          youtube_api_key,
          use_api: use_api || false,
          thumbnail_url,
          platform: platform || 'youtube',
          notes
        }])
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, data })
      }
    }

    // PUT: 크리에이터 정보 수정
    if (method === 'PUT') {
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'id parameter is required' })
        }
      }

      const updateData = {
        ...body,
        updated_at: new Date().toISOString()
      }
      delete updateData.id
      delete updateData.company_id
      delete updateData.created_at

      const { data, error } = await supabase
        .from('affiliated_creators')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', user.id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, data })
      }
    }

    // DELETE: 크리에이터 삭제
    if (method === 'DELETE') {
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'id parameter is required' })
        }
      }

      const { error } = await supabase
        .from('affiliated_creators')
        .delete()
        .eq('id', id)
        .eq('company_id', user.id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Creator deleted successfully' })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

