const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // GET: 목록 조회
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {}
      const activeOnly = params.active_only === 'true'

      let query = supabase
        .from('creator_program_reviews')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, reviews: data || [] })
      }
    }

    // POST: 추가
    if (event.httpMethod === 'POST') {
      const { display_name, review_text, is_active, display_order } = JSON.parse(event.body)

      if (!display_name || !review_text) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '표시이름과 후기 내용은 필수입니다' })
        }
      }

      const { data, error } = await supabase
        .from('creator_program_reviews')
        .insert({
          display_name,
          review_text,
          is_active: is_active !== undefined ? is_active : true,
          display_order: display_order || 0
        })
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, review: data })
      }
    }

    // PUT: 수정
    if (event.httpMethod === 'PUT') {
      const { id, display_name, review_text, is_active, display_order } = JSON.parse(event.body)

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'id는 필수입니다' })
        }
      }

      const updateData = { updated_at: new Date().toISOString() }
      if (display_name !== undefined) updateData.display_name = display_name
      if (review_text !== undefined) updateData.review_text = review_text
      if (is_active !== undefined) updateData.is_active = is_active
      if (display_order !== undefined) updateData.display_order = display_order

      const { data, error } = await supabase
        .from('creator_program_reviews')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, review: data })
      }
    }

    // DELETE: 삭제
    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {}
      const id = params.id

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'id는 필수입니다' })
        }
      }

      const { error } = await supabase
        .from('creator_program_reviews')
        .delete()
        .eq('id', id)

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: '삭제되었습니다' })
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('[manage-program-reviews] Error:', error)

    try {
      const alertBaseUrl = process.env.URL || 'https://cnecbiz.com'
      await fetch(`${alertBaseUrl}/.netlify/functions/send-error-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionName: 'manage-program-reviews',
          errorMessage: error.message
        })
      })
    } catch (e) { console.error('Error alert failed:', e.message) }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    }
  }
}
