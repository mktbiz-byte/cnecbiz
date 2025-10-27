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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { accountNumber, startDate, endDate } = JSON.parse(event.body);

    const linkID = process.env.POPBILL_LINK_ID;
    const secretKey = process.env.POPBILL_SECRET_KEY;
    const testMode = process.env.POPBILL_TEST_MODE === 'true';

    if (!linkID || !secretKey) {
      throw new Error('팝빌 API 키가 설정되지 않았습니다');
    }

    const baseURL = 'https://popbill.linkhub.co.kr';
    const authHeaders = generateToken(linkID, secretKey);

    // 팝빌 계좌조회 API 호출
    const response = await axios.post(
      `${baseURL}/BankAccount/Search`,
      {
        CorpNum: '5758102253', // CNEC 사업자번호
        BankCode: '', // 은행코드 (빈값이면 모든 은행)
        AccountNumber: accountNumber,
        SDate: startDate, // YYYYMMDD
        EDate: endDate,   // YYYYMMDD
        Order: 'D' // D: 내림차순, A: 오름차순
      },
      { headers: authHeaders }
    );

    // 입금 내역 필터링 (입금만)
    const deposits = response.data.list?.filter(item => 
      item.TradeType === '입금' || item.TradeType === '1'
    ) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        deposits: deposits.map(d => ({
          tradeDate: d.TradeDate,
          tradeTime: d.TradeTime,
          amount: d.Amount,
          balance: d.Balance,
          depositor: d.Briefs, // 입금자명
          memo: d.Remark
        }))
      })
    };

  } catch (error) {
    console.error('팝빌 계좌조회 오류:', error.response?.data || error.message);
    
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

