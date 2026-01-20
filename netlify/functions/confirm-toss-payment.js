// 토스페이먼츠 결제 승인 Netlify Function
// Native fetch 사용 (Node.js 18+)

// 테스트 시크릿 키 (실제 운영 시 환경변수로 관리)
const SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { paymentKey, orderId, amount } = JSON.parse(event.body);

    // 필수 파라미터 검증
    if (!paymentKey || !orderId || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '필수 파라미터가 누락되었습니다.' })
      };
    }

    console.log('결제 승인 요청:', { paymentKey, orderId, amount });

    // 토스페이먼츠 API 호출
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('결제 승인 실패:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          message: result.message || '결제 승인에 실패했습니다.',
          code: result.code
        })
      };
    }

    console.log('결제 승인 성공:', result);

    // TODO: 결제 성공 후 처리
    // 1. Supabase에 결제 정보 저장
    // 2. 캠페인 상태 업데이트
    // 3. 이메일 알림 발송 등

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        payment: result
      })
    };

  } catch (error) {
    console.error('결제 승인 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '서버 오류가 발생했습니다.',
        error: error.message
      })
    };
  }
};
