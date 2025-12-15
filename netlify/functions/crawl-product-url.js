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

    // 크롤링 실패 시
    if (!fetchSuccess || !html) {
      // 사이트별 안내 메시지
      let siteMessage = '해당 사이트에서 상품 정보를 자동으로 가져올 수 없습니다.'
      if (url.includes('oliveyoung.co.kr')) {
        siteMessage = '올리브영은 보안 정책으로 자동 수집이 제한됩니다.'
      } else if (url.includes('coupang.com')) {
        siteMessage = '쿠팡은 보안 정책으로 자동 수집이 제한됩니다.'
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          data: null,
          message: `${siteMessage} 상품 페이지에서 정보를 복사하여 직접 입력해주세요.`
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
    // 클럽클리오
    else if (url.includes('clubclio.co.kr')) {
      productInfo = parseClubClio($, url)
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

// URL에서 기본 정보 추출 - 차단된 경우 빈 데이터 반환 (잘못된 정보 표시 방지)
function extractInfoFromUrl(url) {
  // 차단된 경우 빈 데이터 반환 - 잘못된 정보를 보여주지 않음
  return {
    product_name: '',
    brand_name: '',
    product_price: '',
    thumbnail_url: '',
    product_description: '',
    keywords: []
  }
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

// 클럽클리오 파싱 (clubclio.co.kr)
function parseClubClio($, url) {
  // 상품명 - 다양한 셀렉터 시도
  const productName = $('meta[property="og:title"]').attr('content') ||
                      $('.goods_name').text().trim() ||
                      $('h2.tit').text().trim() ||
                      $('[class*="goods"] h2').text().trim() ||
                      $('title').text().split('|')[0].trim() || ''

  // 브랜드명
  const brandName = $('meta[property="product:brand"]').attr('content') ||
                    $('.brand_name').text().trim() ||
                    $('[class*="brand"]').first().text().trim() ||
                    'CLIO'

  // 가격 - 원화(KRW)로 추출
  // 메타 태그에서 먼저 시도
  let priceText = $('meta[property="product:price:amount"]').attr('content') || ''

  // 메타 태그에 없으면 HTML에서 추출
  if (!priceText) {
    // 판매가 셀렉터들
    priceText = $('.goods_price .sale_price').text().trim() ||
                $('.sale_price').first().text().trim() ||
                $('.price .sale').text().trim() ||
                $('[class*="price"] .num').text().trim() ||
                $('[class*="sale_price"]').first().text().trim() ||
                $('[class*="goods_price"]').text().trim() ||
                ''
  }

  // 숫자만 추출 (원화 가격)
  const price = priceText.replace(/[^0-9]/g, '')

  // 가격이 너무 크면 (예: 타임스탬프 등) 빈 값 처리
  const numericPrice = parseInt(price, 10)
  const validPrice = (numericPrice > 0 && numericPrice < 10000000) ? price : ''

  // 썸네일 이미지
  const thumbnail = $('meta[property="og:image"]').attr('content') ||
                    $('.goods_view_img img').attr('src') ||
                    $('[class*="goods"] img').first().attr('src') || ''

  // 상품 설명
  const description = $('meta[property="og:description"]').attr('content') ||
                      $('meta[name="description"]').attr('content') || ''

  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: brandName,
    product_price: validPrice,
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

  // 가격 추출 - 메타 태그 우선
  let priceText = $('meta[property="product:price:amount"]').attr('content') || ''

  if (!priceText) {
    priceText = $('[itemprop="price"]').attr('content') ||
                $('[class*="sale_price"]').first().text().trim() ||
                $('[class*="price"]').first().text().trim() || ''
  }

  const price = priceText.replace(/[^0-9]/g, '')

  // 가격 유효성 검사 (1000만원 이하만 유효)
  const numericPrice = parseInt(price, 10)
  const validPrice = (numericPrice > 0 && numericPrice < 10000000) ? price : ''

  const keywords = extractKeywords(productName + ' ' + description)

  return {
    product_name: productName,
    brand_name: '',
    product_price: validPrice,
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
