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
    const { invoiceData, amount } = JSON.parse(event.body);

    const linkID = process.env.POPBILL_LINK_ID;
    const secretKey = process.env.POPBILL_SECRET_KEY;
    const testMode = process.env.POPBILL_TEST_MODE === 'true';

    if (!linkID || !secretKey) {
      throw new Error('팝빌 API 키가 설정되지 않았습니다');
    }

    // 팝빌 API 엔드포인트
    const baseURL = testMode 
      ? 'https://popbill.linkhub.co.kr'
      : 'https://popbill.linkhub.co.kr';

    // 세금계산서 데이터 구성
    const taxInvoiceData = {
      writeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
      chargeDirection: '정과금',
      purposeType: '영수',
      taxType: '과세',
      
      // 공급자 정보 (CNEC)
      invoicerCorpNum: '1234567890', // CNEC 사업자번호
      invoicerCorpName: '(주)CNEC',
      invoicerCEOName: 'CNEC 대표',
      invoicerAddr: '서울시 강남구',
      invoicerEmail: 'admin@cnec.co.kr',
      
      // 공급받는자 정보 (고객사)
      invoiceeCorpNum: invoiceData.business_number?.replace(/-/g, '') || '',
      invoiceeCorpName: invoiceData.company_name,
      invoiceeCEOName: invoiceData.representative,
      invoiceeAddr: invoiceData.address,
      invoiceeEmail: invoiceData.email,
      invoiceeContactName: invoiceData.representative,
      invoiceeTEL: invoiceData.contact,
      
      // 금액 정보
      supplyCostTotal: Math.floor(amount / 1.1), // 공급가액 (VAT 제외)
      taxTotal: amount - Math.floor(amount / 1.1), // 세액
      totalAmount: amount, // 총액
      
      // 상세 내역
      detailList: [{
        serialNum: 1,
        itemName: '포인트 충전',
        spec: '',
        qty: 1,
        unitCost: Math.floor(amount / 1.1),
        supplyCost: Math.floor(amount / 1.1),
        tax: amount - Math.floor(amount / 1.1),
        remark: invoiceData.memo || ''
      }],
      
      // 기타
      remark1: invoiceData.memo || '',
      businessType: invoiceData.business_type || '',
      businessCategory: invoiceData.business_category || ''
    };

    // 팝빌 API 호출
    const authHeaders = generateToken(linkID, secretKey);
    
    const response = await axios.post(
      `${baseURL}/TaxInvoice/Issue`,
      taxInvoiceData,
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
    console.error('팝빌 API 오류:', error.response?.data || error.message);
    
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

