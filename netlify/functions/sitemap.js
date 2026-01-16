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
    const baseUrl = 'https://cnecbiz.com'
    const today = new Date().toISOString().split('T')[0]

    // 정적 페이지 목록
    const staticPages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/newsletters', changefreq: 'daily', priority: '0.9' },
      { loc: '/guidebook', changefreq: 'monthly', priority: '0.7' },
    ]

    // XML Sitemap 시작
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`

    // 정적 페이지 추가
    for (const page of staticPages) {
      sitemap += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
    }

    // 뉴스레터 동적 페이지 추가
    if (supabase) {
      const { data: newsletters, error } = await supabase
        .from('newsletters')
        .select('id, title, thumbnail_url, published_at, updated_at')
        .eq('is_active', true)
        .order('published_at', { ascending: false })

      if (!error && newsletters) {
        for (const newsletter of newsletters) {
          const lastmod = (newsletter.updated_at || newsletter.published_at || today).split('T')[0]
          sitemap += `  <url>
    <loc>${baseUrl}/newsletter/${newsletter.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`

          // 썸네일 이미지가 있으면 이미지 sitemap 추가
          if (newsletter.thumbnail_url) {
            sitemap += `
    <image:image>
      <image:loc>${newsletter.thumbnail_url}</image:loc>
      <image:title>${escapeXml(newsletter.title || '')}</image:title>
    </image:image>`
          }

          sitemap += `
  </url>
`
        }
      }
    }

    sitemap += '</urlset>'

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

// XML 특수문자 이스케이프
function escapeXml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
