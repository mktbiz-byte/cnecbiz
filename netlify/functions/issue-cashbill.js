/**
 * Netlify Function: 현금영수증 발행
 * 
 * POST /.netlify/functions/issue-cashbill
 */

const popbill = require('popbill');

// 팝빌 서비스 초기화
const cashbillService = new popbill.CashbillService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

// 테스트 모드 설정
cashbillService.setIsTest(process.env.VITE_POPBILL_TEST_MODE === 'true');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { corpNum, cashbillData } = JSON.parse(event.body);

    if (!corpNum || !cashbillData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // 현금영수증 즉시 발행
    const result = await new Promise((resolve, reject) => {
      cashbillService.registIssue(
        corpNum,
        cashbillData,
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
    console.error('현금영수증 발행 실패:', error);
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

