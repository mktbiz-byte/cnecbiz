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

    // 더 정교한 브라우저 헤더
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/'
    }

    let html = ''
    let fetchSuccess = false

    // 첫 번째 시도
    try {
      const response = await fetch(url, {
        headers: browserHeaders,
        redirect: 'follow'
      })

      if (response.ok) {
        html = await response.text()
        fetchSuccess = true
      } else {
        console.log('[crawl-product-url] First attempt failed:', response.status)
      }
    } catch (fetchError) {
      console.log('[crawl-product-url] First fetch error:', fetchError.message)
    }

    // 두 번째 시도 (다른 User-Agent)
    if (!fetchSuccess) {
      try {
        const response = await fetch(url, {
          headers: {
            ...browserHeaders,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
          },
          redirect: 'follow'
        })

        if (response.ok) {
          html = await response.text()
          fetchSuccess = true
        }
      } catch (fetchError) {
        console.log('[crawl-product-url] Second fetch error:', fetchError.message)
      }
    }

    // 크롤링 실패 시 URL에서 기본 정보 추출 시도
    if (!fetchSuccess || !html) {
      // URL에서 상품 번호나 이름 추출 시도
      const urlInfo = extractInfoFromUrl(url)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: urlInfo,
          message: '일부 사이트는 직접 접근이 제한됩니다. 상품 정보를 수동으로 입력해주세요.'
        })
      }
    }

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

    // 파싱 결과가 없으면 메타 태그에서 추출 시도
    if (!productInfo.product_name) {
      productInfo.product_name = $('meta[property="og:title"]').attr('content') ||
                                  $('title').text().trim() || ''
    }
    if (!productInfo.thumbnail_url) {
      productInfo.thumbnail_url = $('meta[property="og:image"]').attr('content') || ''
    }
    if (!productInfo.product_description) {
      productInfo.product_description = $('meta[property="og:description"]').attr('content') ||
                                         $('meta[name="description"]').attr('content') || ''
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

    // 에러 발생 시에도 사용자에게 도움이 되는 메시지 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: '상품 정보를 자동으로 가져올 수 없습니다. 수동으로 입력해주세요.',
        data: {
          product_name: '',
          brand_name: '',
          product_price: '',
          thumbnail_url: '',
          product_description: '',
          keywords: []
        }
      })
    }
  }
}

// URL에서 기본 정보 추출
function extractInfoFromUrl(url) {
  const result = {
    product_name: '',
    brand_name: '',
    product_price: '',
    thumbnail_url: '',
    product_description: '',
    keywords: []
  }

  try {
    const urlObj = new URL(url)

    // 올리브영 URL 패턴에서 상품번호 추출
    if (url.includes('oliveyoung.co.kr')) {
      result.brand_name = '올리브영'
      const goodsNoMatch = url.match(/goodsNo=([A-Z0-9]+)/)
      if (goodsNoMatch) {
        result.product_name = `올리브영 상품 (${goodsNoMatch[1]})`
      }
    }
    // 쿠팡 URL에서 정보 추출
    else if (url.includes('coupang.com')) {
      result.brand_name = '쿠팡'
      const productIdMatch = url.match(/products\/(\d+)/)
      if (productIdMatch) {
        result.product_name = `쿠팡 상품 (${productIdMatch[1]})`
      }
    }
    // 네이버 스마트스토어
    else if (url.includes('smartstore.naver.com')) {
      const storeMatch = url.match(/smartstore\.naver\.com\/([^\/]+)/)
      if (storeMatch) {
        result.brand_name = storeMatch[1]
      }
    }
  } catch (e) {
    console.log('[crawl-product-url] URL parsing error:', e)
  }

  return result
}

// 올리브영 파싱
function parseOliveYoung($, url) {
  // 다양한 셀렉터 시도
  const productName = $('.prd_name').text().trim() ||
                      $('h2.prd_name').text().trim() ||
                      $('[class*="prd_name"]').first().text().trim() ||
                      $('meta[property="og:title"]').attr('content') || ''

  const brandName = $('.prd_brand a').text().trim() ||
                    $('.prd_brand').text().trim() ||
                    $('[class*="brand"]').first().text().trim() || ''

  const priceText = $('.price-2 strong').text().trim() ||
                    $('.price strong').text().trim() ||
                    $('[class*="price"] strong').first().text().trim() ||
                    $('meta[property="product:price:amount"]').attr('content') || ''
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('.prd_img img').attr('src') ||
                    $('[class*="prd_img"] img').first().attr('src') || ''

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''

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
                      $('[class*="prod-buy-header__title"]').text().trim() ||
                      $('meta[property="og:title"]').attr('content') || ''

  const brandName = $('[class*="prod-brand-name"]').text().trim() ||
                    $('[class*="brand"]').first().text().trim() || ''

  const priceText = $('.prod-sale-price .total-price strong').text().trim() ||
                    $('[class*="total-price"]').first().text().trim() ||
                    $('meta[property="product:price:amount"]').attr('content') || ''
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('.prod-image__detail img').attr('src') || ''

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
                      $('[class*="product_title"]').text().trim() || ''

  const brandName = $('[class*="brand"]').first().text().trim() ||
                    $('[class*="seller"]').first().text().trim() || ''

  const priceText = $('meta[property="product:price:amount"]').attr('content') ||
                    $('[class*="price"]').first().text().trim() || ''
  const price = priceText.replace(/[^0-9]/g, '')

  const thumbnail = $('meta[property="og:image"]').attr('content') || ''

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
                      $('h1').first().text().trim() || ''

  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('img').first().attr('src') || ''

  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''

  const priceText = $('[class*="price"]').first().text().trim() ||
                    $('[itemprop="price"]').attr('content') ||
                    $('meta[property="product:price:amount"]').attr('content') || ''
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

  const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    '이', '가', '을', '를', '에', '에서', '로', '으로', '와', '과', '의', '도', '만', '는', '은',
    '그', '저', '이런', '저런', '그런', '더', '덜', '매우', '아주', '정말', '진짜']

  const words = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word))

  const frequency = {}
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
