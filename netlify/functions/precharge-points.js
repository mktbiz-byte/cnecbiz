const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ [INIT] Supabase client initialized');

/**
 * 포인트 선충전 API
 * POST /precharge-points
 * 
 * Body:
 * {
 *   "chargeRequestId": "uuid",  // points_charge_requests 테이블 ID
 *   "adminNote": "string"        // 관리자 메모 (선택)
 * }
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('📊 ========== 포인트 선충전 시작 ==========');
  console.log('⏰ [INFO] 실행 시각:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 1. 요청 데이터 파싱
    const { chargeRequestId, adminNote = '' } = JSON.parse(event.body || '{}');

    if (!chargeRequestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '충전 요청 ID가 필요합니다.'
        })
      };
    }

    console.log('🔍 [STEP 1] 충전 요청 정보 조회...');
    console.log('   - 요청 ID:', chargeRequestId);

    // 2. 충전 요청 정보 조회
    const { data: request, error: requestError } = await supabaseAdmin
      .from('points_charge_requests')
      .select(`
        *,
        companies (
          id,
          company_name,
          points
        )
      `)
      .eq('id', chargeRequestId)
      .single();

    if (requestError || !request) {
      console.error('❌ [STEP 1] 충전 요청 정보 조회 실패:', requestError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '충전 요청 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 이미 처리된 요청인지 확인
    if (request.status !== 'pending') {
      console.log('⚠️ [STEP 1] 이미 처리된 요청입니다:', request.status);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `이미 처리된 요청입니다 (상태: ${request.status})`
        })
      };
    }

    console.log('✅ [STEP 1] 충전 요청 정보 조회 완료');
    console.log('   - 회사명:', request.companies.company_name);
    console.log('   - 충전 금액:', request.amount.toLocaleString(), '원');
    console.log('   - 충전 포인트:', request.points.toLocaleString(), 'P');

    // 3. 포인트 충전
    console.log('🔍 [STEP 2] 포인트 충전 처리...');

    const currentPoints = request.companies.points || 0;
    const newPoints = currentPoints + request.points;

    console.log('   - 현재 포인트:', currentPoints.toLocaleString(), 'P');
    console.log('   - 충전 후 포인트:', newPoints.toLocaleString(), 'P');

    // 회사 포인트 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ points: newPoints })
      .eq('id', request.company_id);

    if (updateError) {
      console.error('❌ [STEP 2] 포인트 업데이트 실패:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: '포인트 업데이트 실패'
        })
      };
    }

    console.log('✅ [STEP 2] 포인트 충전 완료');

    // 4. 포인트 거래 내역 기록
    console.log('🔍 [STEP 3] 포인트 거래 내역 기록...');

    const { error: transactionError } = await supabaseAdmin
      .from('points_transactions')
      .insert({
        company_id: request.company_id,
        type: 'charge',
        amount: request.points,
        description: `포인트 선충전 (입금 전) - ${adminNote || '관리자 승인'}`,
        balance_after: newPoints,
        charge_request_id: chargeRequestId,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('❌ [STEP 3] 거래 내역 기록 실패:', transactionError);
      // 포인트는 이미 충전되었으므로 에러를 반환하지 않음
    } else {
      console.log('✅ [STEP 3] 포인트 거래 내역 기록 완료');
    }

    // 5. 충전 요청 상태 업데이트
    console.log('🔍 [STEP 4] 충전 요청 상태 업데이트...');

    const { error: statusError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({
        status: 'precharged',  // 선충전 상태
        confirmed_at: new Date().toISOString(),
        confirmed_by: 'admin_precharge',
        admin_note: adminNote
      })
      .eq('id', chargeRequestId);

    if (statusError) {
      console.error('❌ [STEP 4] 상태 업데이트 실패:', statusError);
    } else {
      console.log('✅ [STEP 4] 충전 요청 상태 업데이트 완료');
    }

    // 6. 미수금 기록
    console.log('🔍 [STEP 5] 미수금 기록...');

    const { error: receivableError } = await supabaseAdmin
      .from('receivables')
      .insert({
        company_id: request.company_id,
        type: 'precharge',
        amount: request.amount,
        description: `포인트 선충전 - ${request.companies.company_name}`,
        charge_request_id: chargeRequestId,
        status: 'pending',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
        created_at: new Date().toISOString()
      });

    if (receivableError) {
      console.error('❌ [STEP 5] 미수금 기록 실패:', receivableError);
    } else {
      console.log('✅ [STEP 5] 미수금 기록 완료');
    }

    console.log('\n✅ [COMPLETE] 포인트 선충전 완료!');
    console.log('   - 충전 포인트:', request.points.toLocaleString(), 'P');
    console.log('   - 새 잔액:', newPoints.toLocaleString(), 'P');
    console.log('   - 미수금:', request.amount.toLocaleString(), '원');
    console.log('📊 ========== 포인트 선충전 종료 ==========\n\n');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '포인트 선충전 완료',
        points: request.points,
        newBalance: newPoints,
        receivableAmount: request.amount
      })
    };

  } catch (error) {
    console.error('\n❌ ========== 오류 발생 ==========');
    console.error('❌ [ERROR] Name:', error.name);
    console.error('❌ [ERROR] Message:', error.message);
    console.error('❌ [ERROR] Stack:', error.stack);
    console.error('❌ ====================================\n\n');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
