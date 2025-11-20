import { createClient } from '@supabase/supabase-js'

// Netlify Function to save personalized guide using service_role_key
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { 
      region,           // 'korea', 'japan', 'us'
      applicationId,    // application row ID
      guide             // personalized guide content
    } = JSON.parse(event.body)
    
    if (!region || !applicationId || !guide) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    // Get the appropriate Supabase URL and service_role_key based on region
    let supabaseUrl, serviceRoleKey
    
    switch (region) {
      case 'korea':
        supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL
        serviceRoleKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        break
      case 'japan':
        supabaseUrl = process.env.VITE_SUPABASE_JAPAN_URL
        serviceRoleKey = process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        break
      case 'us':
        supabaseUrl = process.env.VITE_SUPABASE_US_URL
        serviceRoleKey = process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        break
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid region' })
        }
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase credentials:', { region, supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey })
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Supabase configuration not found' })
      }
    }

    // Create Supabase client with service_role_key (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Update the application with personalized guide
    const { data, error } = await supabase
      .from('applications')
      .update({ personalized_guide: guide })
      .eq('id', applicationId)
      .select()

    if (error) {
      console.error('Supabase update error:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to save guide',
          details: error.message 
        })
      }
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Application not found' })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: data[0]
      })
    }

  } catch (error) {
    console.error('Save guide error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to save personalized guide',
        message: error.message 
      })
    }
  }
}
