const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 특정 기업의 포인트 데이터 리셋 API
 * POST /reset-company-points
 *
 * Body:
 * {
 *   "companyEmail": "ysy030602@howlab.co.kr",  // 기업 이메일
 *   "dryRun": true                              // true면 실제 삭제 안함 (미리보기)
 * }
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('🔄 ========== 기업 포인트 리셋 시작 ==========');

  try {
    const { companyEmail, dryRun = true } = JSON.parse(event.body || '{}');

    if (!companyEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'companyEmail is required' })
      };
    }

    // 1. 기업 정보 조회 (companies 테이블에서 email 또는 user_id로)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, user_id, company_name, email, points_balance')
      .eq('email', companyEmail)
      .single();

    if (companyError || !company) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: `기업을 찾을 수 없습니다: ${companyEmail}`,
          detail: companyError?.message
        })
      };
    }

    console.log(`📋 대상 기업: ${company.company_name} (${company.email})`);
    console.log(`   companies.id: ${company.id}`);
    console.log(`   user_id (auth): ${company.user_id}`);
    console.log(`   현재 points_balance: ${company.points_balance}`);

    const userId = company.user_id;
    const companyId = company.id;
    const report = {
      company: {
        name: company.company_name,
        email: company.email,
        companies_id: companyId,
        user_id: userId,
        current_points_balance: company.points_balance
      },
      affected: {}
    };

    // 2. points_transactions 조회
    const { data: transactions, error: txErr } = await supabaseAdmin
      .from('points_transactions')
      .select('id, type, amount, description, created_at')
      .eq('company_id', userId)
      .order('created_at', { ascending: false });

    report.affected.points_transactions = {
      count: transactions?.length || 0,
      records: (transactions || []).map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        created_at: t.created_at
      }))
    };
    console.log(`📊 points_transactions: ${transactions?.length || 0}건`);

    // 3. points_balance 조회
    const { data: balanceData, error: balErr } = await supabaseAdmin
      .from('points_balance')
      .select('*')
      .eq('company_id', userId);

    report.affected.points_balance = {
      count: balanceData?.length || 0,
      records: balanceData || []
    };
    console.log(`💰 points_balance: ${balanceData?.length || 0}건`);

    // 4. points_charge_requests 조회
    const { data: chargeRequests, error: crErr } = await supabaseAdmin
      .from('points_charge_requests')
      .select('id, amount, status, payment_method, created_at')
      .eq('company_id', userId);

    report.affected.points_charge_requests = {
      count: chargeRequests?.length || 0,
      records: chargeRequests || []
    };
    console.log(`📋 points_charge_requests: ${chargeRequests?.length || 0}건`);

    // 5. receivables 조회 (이건 companies.id 사용)
    const { data: receivables, error: recErr } = await supabaseAdmin
      .from('receivables')
      .select('id, amount, type, status, description, created_at')
      .eq('company_id', companyId);

    report.affected.receivables = {
      count: receivables?.length || 0,
      records: receivables || []
    };
    console.log(`📄 receivables: ${receivables?.length || 0}건`);

    // 6. payments 조회 (company_id = auth.users.id)
    const { data: payments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('id, amount, status, type, description, created_at')
      .eq('company_id', userId);

    report.affected.payments = {
      count: payments?.length || 0,
      records: payments || []
    };
    console.log(`💳 payments: ${payments?.length || 0}건`);

    // dryRun이면 여기서 리포트만 반환
    if (dryRun) {
      console.log('🔍 DRY RUN 모드 - 실제 삭제 안함');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          mode: 'dry_run',
          message: '아래 데이터가 삭제/리셋됩니다. dryRun: false로 실행하면 실제 삭제됩니다.',
          report
        })
      };
    }

    // ============ 실제 삭제 실행 ============
    console.log('⚠️ 실제 삭제 모드 실행!');
    const deleteResults = {};

    // 6-1. points_transactions 삭제
    const { error: delTx } = await supabaseAdmin
      .from('points_transactions')
      .delete()
      .eq('company_id', userId);
    deleteResults.points_transactions = delTx ? `ERROR: ${delTx.message}` : `${transactions?.length || 0}건 삭제`;

    // 6-2. points_balance 리셋 (0으로)
    if (balanceData && balanceData.length > 0) {
      const { error: resetBal } = await supabaseAdmin
        .from('points_balance')
        .update({
          balance: 0,
          total_charged: 0,
          total_spent: 0,
          total_granted: 0,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', userId);
      deleteResults.points_balance = resetBal ? `ERROR: ${resetBal.message}` : '잔액 0으로 리셋';
    } else {
      deleteResults.points_balance = '레코드 없음 (스킵)';
    }

    // 6-3. points_charge_requests 삭제
    const { error: delCr } = await supabaseAdmin
      .from('points_charge_requests')
      .delete()
      .eq('company_id', userId);
    deleteResults.points_charge_requests = delCr ? `ERROR: ${delCr.message}` : `${chargeRequests?.length || 0}건 삭제`;

    // 6-4. receivables 삭제 (companies.id 기준)
    const { error: delRec } = await supabaseAdmin
      .from('receivables')
      .delete()
      .eq('company_id', companyId);
    deleteResults.receivables = delRec ? `ERROR: ${delRec.message}` : `${receivables?.length || 0}건 삭제`;

    // 6-5. payments 삭제
    const { error: delPay } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('company_id', userId);
    deleteResults.payments = delPay ? `ERROR: ${delPay.message}` : `${payments?.length || 0}건 삭제`;

    // 6-6. companies 테이블의 points_balance 컬럼도 0으로
    const { error: resetCompanyBal } = await supabaseAdmin
      .from('companies')
      .update({ points_balance: 0 })
      .eq('id', companyId);
    deleteResults.companies_points_balance = resetCompanyBal ? `ERROR: ${resetCompanyBal.message}` : '0으로 리셋';

    console.log('✅ 삭제 완료:', deleteResults);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: 'execute',
        message: `${company.company_name}의 포인트 데이터가 리셋되었습니다.`,
        deleteResults,
        report
      })
    };
  } catch (error) {
    console.error('❌ [reset-company-points] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
