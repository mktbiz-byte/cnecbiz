const axios = require('axios');
const crypto = require('crypto');

// 팝빌 API 인증 토큰 생성
function generateToken(linkID, secretKey) {
  const timestamp = new Date().getTime();
  const hmac = crypto.createHmac('sha256', secretKey);
  const message = linkID + timestamp;
  hmac.update(message);
  const signature = hmac.digest('base64');
  
  return {
    'Authorization': `Bearer ${signature}`,
    'x-pb-linkid': linkID,
    'x-pb-timestamp': timestamp.toString(),
    'Content-Type': 'application/json'
  };
}

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { cashbillData, amount } = JSON.parse(event.body);

    const linkID = process.env.POPBILL_LINK_ID;
    const secretKey = process.env.POPBILL_SECRET_KEY;
    const testMode = process.env.POPBILL_TEST_MODE === 'true';

    if (!linkID || !secretKey) {
      throw new Error('팝빌 API 키가 설정되지 않았습니다');
    }

    // 팝빌 API 엔드포인트
    const baseURL = 'https://popbill.linkhub.co.kr';

    // 현금영수증 데이터 구성
    const cashbillRequestData = {
      // 필수 정보
      franchiseCorpNum: '5758102253', // CNEC 사업자번호 (가맹점)
      franchiseCorpName: '(주)CNEC',
      franchiseCEOName: 'CNEC 대표',
      franchiseAddr: '서울시 강남구',
      franchiseTEL: '02-1234-5678',
      
      // 현금영수증 정보
      tradeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''), // YYYYMMDD
      tradeUsage: '1', // 1: 소득공제용, 2: 지출증빙용
      tradeType: '승인거래', // 승인거래, 취소거래
      
      // 고객 정보
      identityNum: cashbillData.identity_num, // 휴대폰번호 or 사업자번호 or 카드번호
      customerName: cashbillData.customer_name || '',
      itemName: '포인트 충전',
      
      // 금액 정보
      supplyCost: amount, // 공급가액
      tax: 0, // 세액 (현금영수증은 세액 없음)
      totalAmount: amount, // 총액
      
      // 이메일 발송
      email: cashbillData.email || '',
      
      // 기타
      remark: cashbillData.memo || ''
    };

    // 팝빌 API 호출
    const authHeaders = generateToken(linkID, secretKey);
    
    const response = await axios.post(
      `${baseURL}/Cashbill/Issue`,
      cashbillRequestData,
      { headers: authHeaders }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: response.data
      })
    };

  } catch (error) {
    console.error('팝빌 현금영수증 발행 오류:', error.response?.data || error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.response?.data?.message || error.message
      })
    };
  }
};

