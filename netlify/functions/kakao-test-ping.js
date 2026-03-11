// 카카오 스킬 연결 테스트용 - DB/AI 호출 없이 즉시 응답
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      version: '2.0',
      template: {
        outputs: [{
          simpleText: {
            text: `연결 성공! 서버 시간: ${now}`
          }
        }]
      }
    })
  }
}
