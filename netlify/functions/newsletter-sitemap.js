const { createClient } = require('@supabase/supabase-js')

const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_BIZ_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, max-age=3600' // 1시간 캐시
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Database connection failed'
      }
    }

    // 활성화된 뉴스레터 조회
    const { data: newsletters, error } = await supabase
      .from('newsletters')
      .select('id, title, published_at, updated_at')
      .eq('is_active', true)
      .order('published_at', { ascending: false })

    if (error) throw error

    const baseUrl = 'https://cnecbiz.com'

    // XML Sitemap 생성
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <!-- Newsletter Index -->
  <url>
    <loc>${baseUrl}/newsletters</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`

    // 각 뉴스레터 페이지 추가
    for (const newsletter of newsletters || []) {
      const lastmod = newsletter.updated_at || newsletter.published_at || new Date().toISOString()
      sitemap += `
  <url>
    <loc>${baseUrl}/newsletter/${newsletter.id}</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    }

    sitemap += '\n</urlset>'

    return {
      statusCode: 200,
      headers,
      body: sitemap
    }
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Error generating sitemap'
    }
  }
}
