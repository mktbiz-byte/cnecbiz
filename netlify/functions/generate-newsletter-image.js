const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
// Native fetch 사용 (Node.js 18+)

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Netlify Functions v2 config - 타임아웃 연장
exports.config = {
  maxDuration: 60 // 60초 (최대)
}

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const { content, customPrompt, newsletterId } = JSON.parse(event.body)

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
    if (!geminiApiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Gemini API 키가 설정되지 않았습니다.' })
      }
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // 1단계: 콘텐츠 분석하여 이미지 프롬프트 생성
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // SEO 최적화를 위해 파일명, 대체텍스트, 이미지 프롬프트를 한번에 생성
    const analysisPrompt = `다음 뉴스레터 콘텐츠를 분석하고, SEO 최적화된 이미지 정보를 JSON으로 출력해주세요.

콘텐츠:
${content ? content.substring(0, 2000) : '일반적인 비즈니스/마케팅 뉴스레터'}

${customPrompt ? `사용자 요청: ${customPrompt}` : ''}

아래 JSON 형식으로만 출력하세요:
{
  "imagePrompt": "영어로 된 이미지 생성 프롬프트 (50단어 이내, 프로페셔널한 비즈니스 스타일, 사람 얼굴 제외)",
  "seoFilename": "영어-소문자-하이픈-연결-파일명 (예: kbeauty-marketing-strategy-2025)",
  "altText": "한글 대체 텍스트 - 이미지 내용을 설명하는 문장 (예: 2025년 K뷰티 마케팅 전략과 글로벌 시장 동향)"
}

요구사항:
- seoFilename: 영어 소문자만, 띄어쓰기 대신 하이픈(-), 확장자 제외, 최대 50자
- altText: 한글로 이미지 내용 설명, 검색엔진 최적화를 위해 핵심 키워드 포함
- imagePrompt: 프로페셔널하고 깔끔한 비즈니스/마케팅 스타일

JSON만 출력:`

    const analysisResult = await textModel.generateContent(analysisPrompt)
    const analysisText = analysisResult.response.text().trim()

    // JSON 파싱
    let imagePrompt = 'professional business marketing newsletter illustration'
    let seoFilename = 'newsletter-image'
    let altText = '뉴스레터 이미지'

    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        imagePrompt = parsed.imagePrompt || imagePrompt
        seoFilename = parsed.seoFilename || seoFilename
        altText = parsed.altText || altText

        // 파일명 정규화: 영문 소문자, 하이픈만 허용
        seoFilename = seoFilename
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50)
      }
    } catch (parseError) {
      console.log('[generate-newsletter-image] JSON parse failed, using defaults:', parseError.message)
    }

    console.log('[generate-newsletter-image] Generated:', { imagePrompt, seoFilename, altText })

    // 2단계: Gemini 2.5 Flash Image 모델로 이미지 생성 (무료 티어 지원)
    const imageResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate an image: ${imagePrompt}. Professional business style, 16:9 aspect ratio, no human faces.` }]
          }],
          generationConfig: {
            responseModalities: ['image', 'text']
          }
        })
      }
    )

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error('[generate-newsletter-image] Image API error:', errorText)

      // 에러 상세 정보 파싱
      let errorDetail = `이미지 생성 API 오류: ${imageResponse.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorDetail = errorJson.error.message
        }
      } catch (e) {}

      throw new Error(errorDetail)
    }

    const imageResult = await imageResponse.json()

    // 이미지 데이터 추출 (generateContent 응답에서 inline_data 찾기)
    let imageData = null
    const candidates = imageResult.candidates || []
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || []
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageData = part.inlineData.data
          break
        }
      }
      if (imageData) break
    }

    if (!imageData) {
      console.error('[generate-newsletter-image] No image data:', JSON.stringify(imageResult))
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미지 생성에 실패했습니다. 다른 프롬프트를 시도해보세요.',
          generatedPrompt: imagePrompt
        })
      }
    }

    // 3단계: Supabase Storage에 업로드 (SEO 최적화 파일명 사용)
    const timestamp = Date.now()
    // SEO 파일명 + 타임스탬프로 고유성 보장 (예: kbeauty-marketing-strategy-1705123456.png)
    const fileName = `${seoFilename}-${timestamp}.png`
    const imageBuffer = Buffer.from(imageData, 'base64')

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('newsletter-thumbnails')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[generate-newsletter-image] Upload error:', uploadError)
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`)
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('newsletter-thumbnails')
      .getPublicUrl(fileName)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        generatedPrompt: imagePrompt,
        fileName,
        altText,           // SEO 대체 텍스트 (한글)
        seoFilename        // SEO 최적화 파일명 (확장자 제외)
      })
    }

  } catch (error) {
    console.error('[generate-newsletter-image] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '이미지 생성 중 오류가 발생했습니다.'
      })
    }
  }
}
