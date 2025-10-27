/**
 * Netlify Function: 세금계산서 발행
 * 
 * POST /.netlify/functions/issue-taxinvoice
 */

const popbill = require('popbill');

// 팝빌 서비스 초기화
const taxinvoiceService = new popbill.TaxinvoiceService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

// 테스트 모드 설정
taxinvoiceService.setIsTest(process.env.VITE_POPBILL_TEST_MODE === 'true');

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { corpNum, taxinvoiceData } = JSON.parse(event.body);

    if (!corpNum || !taxinvoiceData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // 세금계산서 즉시 발행
    const result = await new Promise((resolve, reject) => {
      taxinvoiceService.registIssue(
        corpNum,
        taxinvoiceData,
        (response) => {
          if (response.code) {
            reject(new Error(response.message));
          } else {
            resolve(response);
          }
        }
      );
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };

  } catch (error) {
    console.error('세금계산서 발행 실패:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

