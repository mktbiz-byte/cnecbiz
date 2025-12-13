// URL 크롤링 API - 상품 URL에서 정보 추출
const cheerio = require('cheerio')

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight
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
    const { url } = JSON.parse(event.body)

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }

    console.log('[crawl-product-url] Fetching URL:', url)

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    let productInfo = {
      product_name: '',
      brand_name: '',
      product_price: '',
      thumbnail_url: '',
      product_description: '',
      keywords: []
    }

    // 올리브영 크롤링
    if (url.includes('oliveyoung.co.kr')) {
      productInfo = parseOliveYoung($, url)
    }
    // 쿠팡 크롤링
    else if (url.includes('coupang.com')) {
      productInfo = parseCoupang($, url)
    }
    // 네이버 스마트스토어
    else if (url.includes('smartstore.naver.com') || url.includes('brand.naver.com')) {
      productInfo = parseNaverStore($, url)
    }
    // 기타 일반 사이트
    else {
      productInfo = parseGeneric($, url)
    }

    console.log('[crawl-product-url] Parsed info:', productInfo)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: productInfo
      })
    }

  } catch (error) {
    console.error('[crawl-product-url] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}

// 올리브영 파싱
function parseOliveYoung($, url) {
  const productName = $('.prd_name').text().trim() ||
                      $('h2.prd_name').text().trim() ||
                      $('[class*="prd_name"]').first().text().trim()

  const brandName = $('.prd_brand a').text().trim() ||
                    $('[class*="brand"]').first().text().trim()

  const priceText = $('.price-2 strong').text().trim() ||
                    $('.price strong').text().trim() ||
                    $('[class*="price"] strong').first().text().trim()
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('.prd_img img').attr('src') ||
                    $('[class*="prd_img"] img').first().attr('src')

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''

  // 키워드 추출 (상품명에서)
  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: brandName,
    product_price: price,
    thumbnail_url: thumbnail,
    product_description: description,
    keywords
  }
}

// 쿠팡 파싱
function parseCoupang($, url) {
  const productName = $('h1.prod-buy-header__title').text().trim() ||
                      $('[class*="prod-buy-header__title"]').text().trim()

  const brandName = $('[class*="prod-brand-name"]').text().trim() ||
                    $('[class*="brand"]').first().text().trim()

  const priceText = $('.prod-sale-price .total-price strong').text().trim() ||
                    $('[class*="total-price"]').first().text().trim()
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('.prod-image__detail img').attr('src')

  const description = $('meta[property="og:description"]').attr('content') || ''

  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: brandName,
    product_price: price,
    thumbnail_url: thumbnail,
    product_description: description,
    keywords
  }
}

// 네이버 스마트스토어 파싱
function parseNaverStore($, url) {
  const productName = $('meta[property="og:title"]').attr('content') ||
                      $('[class*="product_title"]').text().trim()

  const brandName = $('[class*="brand"]').first().text().trim() ||
                    $('[class*="seller"]').first().text().trim()

  const priceText = $('meta[property="product:price:amount"]').attr('content') ||
                    $('[class*="price"]').first().text().trim()
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content')

  const description = $('meta[property="og:description"]').attr('content') || ''

  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: brandName,
    product_price: price,
    thumbnail_url: thumbnail,
    product_description: description,
    keywords
  }
}

// 일반 사이트 파싱
function parseGeneric($, url) {
  const productName = $('meta[property="og:title"]').attr('content') ||
                      $('title').text().trim() ||
                      $('h1').first().text().trim()

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('img').first().attr('src')

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''

  const priceText = $('[class*="price"]').first().text().trim() ||
                    $('[itemprop="price"]').attr('content') || ''
  const price = priceText.replace(/[^0-9]/g, '')

  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: '',
    product_price: price,
    thumbnail_url: thumbnail,
    product_description: description,
    keywords
  }
}

// 키워드 추출 함수
function extractKeywords(text) {
  if (!text) return []

  // 불용어 제거 및 키워드 추출
  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    '이', '가', '을', '를', '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '는', '은',
    '그', '저', '이런', '저런', '그런', '더', '덜', '매우', '아주', '정말', '진짜']

  // 단어 추출
  const words = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word)) // 숫자만 있는 것 제외

  // 빈도수 계산
  const frequency = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })

  // 상위 키워드 반환
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
