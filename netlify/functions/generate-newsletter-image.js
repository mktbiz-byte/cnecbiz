const { GoogleGenerativeAI } = require('@google/generative-ai')
const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

    const analysisPrompt = `다음 뉴스레터 콘텐츠를 분석하고, 이 내용과 어울리는 이미지를 생성하기 위한 영어 프롬프트를 작성해주세요.

콘텐츠:
${content ? content.substring(0, 2000) : '일반적인 비즈니스/마케팅 뉴스레터'}

${customPrompt ? `사용자 요청: ${customPrompt}` : ''}

요구사항:
- 프로페셔널하고 깔끔한 비즈니스 스타일
- 뉴스레터에 적합한 일러스트레이션 또는 사진 스타일
- 영어로 된 상세한 이미지 생성 프롬프트만 출력
- 50단어 이내
- 사람 얼굴이나 유명인은 포함하지 않기

프롬프트:`

    const analysisResult = await textModel.generateContent(analysisPrompt)
    const imagePrompt = analysisResult.response.text().trim()

    console.log('[generate-newsletter-image] Generated prompt:', imagePrompt)

    // 2단계: Imagen 3 REST API로 이미지 생성
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [
            { prompt: imagePrompt }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            safetyFilterLevel: 'block_few',
            personGeneration: 'dont_allow'
          }
        })
      }
    )

    if (!imagenResponse.ok) {
      const errorText = await imagenResponse.text()
      console.error('[generate-newsletter-image] Imagen API error:', errorText)
      throw new Error(`Imagen API 오류: ${imagenResponse.status}`)
    }

    const imagenResult = await imagenResponse.json()

    // 이미지 데이터 추출
    const imageData = imagenResult.predictions?.[0]?.bytesBase64Encoded

    if (!imageData) {
      console.error('[generate-newsletter-image] No image data:', JSON.stringify(imagenResult))
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

    // 3단계: Supabase Storage에 업로드
    const timestamp = Date.now()
    const fileName = `ai_generated_${newsletterId || 'new'}_${timestamp}.png`
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
        fileName
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
