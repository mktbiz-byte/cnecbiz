const { GoogleGenerativeAI } = require('@google/generative-ai')

// Netlify Functions config
exports.config = {
  maxDuration: 30
}

exports.handler = async (event) => {
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
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { text, targetLanguage, sourceLanguage = '한국어' } = JSON.parse(event.body || '{}')

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'text is required' })
      }
    }

    if (!targetLanguage) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'targetLanguage is required' })
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY not configured' })
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })

    const prompt = `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}.
Keep the translation natural and accurate. Preserve any formatting, line breaks, and special characters.
Do not add any explanation or notes - only provide the translated text.

Text to translate:
${text}`

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    })

    const translatedText = result.response.text().trim()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        translatedText,
        sourceLanguage,
        targetLanguage
      })
    }

  } catch (error) {
    console.error('[translate-text] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '번역 실패'
      })
    }
  }
}
