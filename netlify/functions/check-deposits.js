/**
 * Netlify Function: 계좌 입금 확인
 * 
 * POST /.netlify/functions/check-deposits
 */

const popbill = require('popbill');

// 팝빌 서비스 초기화
const easybankService = new popbill.EasyFinBankService(
  process.env.VITE_POPBILL_LINK_ID,
  process.env.VITE_POPBILL_SECRET_KEY
);

// 테스트 모드 설정
easybankService.setIsTest(process.env.VITE_POPBILL_TEST_MODE === 'true');

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
    const { corpNum, bankCode, accountNumber, startDate, endDate } = JSON.parse(event.body);

    if (!corpNum || !bankCode || !accountNumber || !startDate || !endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // 계좌 거래내역 조회
    const result = await new Promise((resolve, reject) => {
      easybankService.search(
        corpNum,
        bankCode,
        accountNumber,
        startDate,
        endDate,
        ['입금'],  // 입금 내역만 조회
        '',       // 페이지 번호
        500,      // 페이지당 목록 개수
        'D',      // 정렬 순서 (D: 내림차순)
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
    console.error('계좌 조회 실패:', error);
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

