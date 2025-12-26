const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 세금계산서 발행 상태 초기화 API
 * POST /reset-tax-invoice-status
 *
 * Body:
 * {
 *   "requestId": "uuid"  // points_charge_requests 테이블 ID
 * }
 */
exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  console.log('📊 ========== 세금계산서 발행 상태 초기화 ==========');
  console.log('⏰ [INFO] 실행 시각:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    const { requestId } = JSON.parse(event.body || '{}');

    if (!requestId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '요청 ID가 필요합니다.'
        })
      };
    }

    console.log('🔍 [STEP 1] 충전 요청 정보 조회...');
    console.log('   - 충전 요청 ID:', requestId);

    // 충전 요청 정보 조회
    const { data: chargeRequest, error: fetchError } = await supabaseAdmin
      .from('points_charge_requests')
      .select('id, tax_invoice_issued, tax_invoice_info')
      .eq('id', requestId)
      .single();

    if (fetchError || !chargeRequest) {
      console.error('❌ [STEP 1] 충전 요청 정보 조회 실패:', fetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '충전 요청 정보를 찾을 수 없습니다.'
        })
      };
    }

    console.log('✅ [STEP 1] 충전 요청 정보 조회 완료');
    console.log('   - 현재 발행 상태:', chargeRequest.tax_invoice_issued);

    // 발행 상태 초기화 (재발행을 위해)
    console.log('🔍 [STEP 2] 발행 상태 초기화...');

    // 기존 tax_invoice_info에 이전 발행 정보 보관
    const previousInfo = chargeRequest.tax_invoice_info || {};
    const updatedTaxInvoiceInfo = {
      ...previousInfo,
      // 이전 발행 기록 보관
      previous_issues: [
        ...(previousInfo.previous_issues || []),
        ...(previousInfo.issued ? [{
          issued_at: previousInfo.issued_at,
          nts_confirm_num: previousInfo.nts_confirm_num,
          mgt_key: previousInfo.mgt_key,
          reset_at: new Date().toISOString()
        }] : [])
      ],
      // 현재 발행 상태 초기화
      issued: false,
      issued_at: null,
      nts_confirm_num: null,
      mgt_key: null
    };

    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({
        status: 'pending',  // 재발행을 위해 상태도 pending으로 변경
        tax_invoice_issued: false,
        tax_invoice_info: updatedTaxInvoiceInfo
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ [STEP 2] 발행 상태 초기화 실패:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '발행 상태 초기화 중 오류가 발생했습니다.',
          details: updateError.message
        })
      };
    }

    console.log('✅ [STEP 2] 발행 상태 초기화 완료');
    console.log('📊 ========== 세금계산서 발행 상태 초기화 종료 ==========');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '세금계산서 발행 상태가 초기화되었습니다.'
      })
    };

  } catch (error) {
    console.error('❌ [ERROR] 서버 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류가 발생했습니다.',
        details: error.message
      })
    };
  }
};
