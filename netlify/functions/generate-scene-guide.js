const { GoogleGenerativeAI } = require('@google/generative-ai')

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
    const { prompt, temperature = 0.7, maxOutputTokens = 8192 } = JSON.parse(event.body || '{}')

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'prompt is required' })
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' })
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens }
    })

    const responseText = result.response.text()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        text: responseText
      })
    }

  } catch (error) {
    console.error('[generate-scene-guide] Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'AI 생성 실패'
      })
    }
  }
}
