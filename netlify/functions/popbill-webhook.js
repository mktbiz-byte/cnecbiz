const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// 세금계산서 발행
async function issueTaxInvoice(invoiceData, amount) {
  const linkID = process.env.POPBILL_LINK_ID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  
  const taxInvoiceData = {
    writeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    chargeDirection: '정과금',
    purposeType: '영수',
    taxType: '과세',
    
    invoicerCorpNum: '5758102253',
    invoicerCorpName: '(주)CNEC',
    invoicerCEOName: 'CNEC 대표',
    invoicerAddr: '서울시 강남구',
    invoicerEmail: 'admin@cnec.co.kr',
    
    invoiceeCorpNum: invoiceData.business_number?.replace(/-/g, '') || '',
    invoiceeCorpName: invoiceData.company_name,
    invoiceeCEOName: invoiceData.representative,
    invoiceeAddr: invoiceData.address,
    invoiceeEmail: invoiceData.email,
    invoiceeContactName: invoiceData.representative,
    invoiceeTEL: invoiceData.contact,
    
    supplyCostTotal: Math.floor(amount / 1.1),
    taxTotal: amount - Math.floor(amount / 1.1),
    totalAmount: amount,
    
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
    
    remark1: invoiceData.memo || '',
    businessType: invoiceData.business_type || '',
    businessCategory: invoiceData.business_category || ''
  };

  const authHeaders = generateToken(linkID, secretKey);
  const response = await axios.post(
    'https://popbill.linkhub.co.kr/TaxInvoice/Issue',
    taxInvoiceData,
    { headers: authHeaders }
  );

  return response.data;
}

// 현금영수증 발행
async function issueCashbill(invoiceData, amount) {
  const linkID = process.env.POPBILL_LINK_ID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  
  const cashbillData = {
    franchiseCorpNum: '5758102253',
    franchiseCorpName: '(주)CNEC',
    franchiseCEOName: 'CNEC 대표',
    franchiseAddr: '서울시 강남구',
    franchiseTEL: '02-1234-5678',
    
    tradeDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    tradeUsage: invoiceData.cashbill_usage || '1',
    tradeType: '승인거래',
    
    identityNum: invoiceData.cashbill_identity_num,
    customerName: invoiceData.company_name || '',
    itemName: '포인트 충전',
    
    supplyCost: amount,
    tax: 0,
    totalAmount: amount,
    
    email: invoiceData.email || '',
    remark: invoiceData.memo || ''
  };

  const authHeaders = generateToken(linkID, secretKey);
  const response = await axios.post(
    'https://popbill.linkhub.co.kr/Cashbill/Issue',
    cashbillData,
    { headers: authHeaders }
  );

  return response.data;
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
    // 팝빌 Webhook 데이터 파싱
    const webhookData = JSON.parse(event.body);
    
    console.log('[Webhook] Received:', webhookData);

    // 입금 정보 추출
    const {
      Amount: depositAmount,      // 입금 금액
      Briefs: depositorName,       // 입금자명
      TradeDate: tradeDate,        // 거래일자
      TradeTime: tradeTime         // 거래시간
    } = webhookData;

    // 매칭되는 충전 요청 찾기
    const { data: chargeRequests, error: fetchError } = await supabase
      .from('points_charge_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('amount', depositAmount);

    if (fetchError) throw fetchError;

    if (!chargeRequests || chargeRequests.length === 0) {
      console.log('[Webhook] No matching charge request found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No matching request' })
      };
    }

    // 예금주명 매칭
    const matchedRequest = chargeRequests.find(req => {
      const expectedDepositor = req.invoice_data?.depositor_name || req.invoice_data?.company_name;
      return expectedDepositor && depositorName.includes(expectedDepositor);
    });

    if (!matchedRequest) {
      console.log('[Webhook] Depositor name not matched');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Depositor name not matched' })
      };
    }

    console.log('[Webhook] Matched request:', matchedRequest.id);

    // 세금계산서 또는 현금영수증 발행
    let receiptResult;
    const receiptType = matchedRequest.invoice_data?.receipt_type || 'tax_invoice';

    if (receiptType === 'tax_invoice') {
      console.log('[Webhook] Issuing tax invoice...');
      receiptResult = await issueTaxInvoice(matchedRequest.invoice_data, matchedRequest.amount);
    } else {
      console.log('[Webhook] Issuing cashbill...');
      receiptResult = await issueCashbill(matchedRequest.invoice_data, matchedRequest.amount);
    }

    console.log('[Webhook] Receipt issued:', receiptResult);

    // 충전 요청 상태 업데이트
    const { error: updateError } = await supabase
      .from('points_charge_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        payment_confirmed_at: new Date().toISOString(),
        receipt_issued: true,
        receipt_type: receiptType,
        receipt_data: receiptResult
      })
      .eq('id', matchedRequest.id);

    if (updateError) throw updateError;

    // 포인트 지급
    const { data: companyData } = await supabase
      .from('companies')
      .select('points')
      .eq('id', matchedRequest.company_id)
      .single();

    const newPoints = (companyData?.points || 0) + (matchedRequest.points || matchedRequest.amount);

    const { error: pointsError } = await supabase
      .from('companies')
      .update({ points: newPoints })
      .eq('id', matchedRequest.company_id);

    if (pointsError) throw pointsError;

    console.log('[Webhook] Points credited:', matchedRequest.points || matchedRequest.amount);

    // 이메일 알림 (선택사항)
    // TODO: 고객에게 입금 확인 및 증빙 발행 완료 이메일 발송

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment confirmed and receipt issued',
        chargeRequestId: matchedRequest.id,
        receiptType: receiptType
      })
    };

  } catch (error) {
    console.error('[Webhook] Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

