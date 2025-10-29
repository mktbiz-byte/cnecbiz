/**
 * 우리 채널 관리 API
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
        .from('our_channels')
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

    // POST: 새 채널 추가
    if (method === 'POST') {
      const {
        channel_name,
        channel_url,
        channel_id,
        youtube_api_key,
        thumbnail_url,
        description,
        notes
      } = body

      if (!channel_name || !channel_url || !channel_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'channel_name, channel_url, and channel_id are required' })
        }
      }

      // 최대 10개 제한 확인
      const { count } = await supabase
        .from('our_channels')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.id)
        .eq('is_active', true)

      if (count >= 10) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Maximum 10 channels allowed' })
        }
      }

      const { data, error } = await supabase
        .from('our_channels')
        .insert([{
          company_id: user.id,
          channel_name,
          channel_url,
          channel_id,
          youtube_api_key,
          thumbnail_url,
          description,
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

    // PUT: 채널 정보 수정
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
        .from('our_channels')
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

    // DELETE: 채널 삭제
    if (method === 'DELETE') {
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'id parameter is required' })
        }
      }

      const { error } = await supabase
        .from('our_channels')
        .delete()
        .eq('id', id)
        .eq('company_id', user.id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Channel deleted successfully' })
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

