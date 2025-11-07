import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
    const supabaseKey = process.env.VITE_SUPABASE_BIZ_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Supabase 환경 변수가 설정되지 않았습니다.'
        })
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 테스트 데이터
    const testData = {
      tid: 'TEST_' + Date.now(),
      trade_date: '20251107',
      trade_time: '153000',
      trade_type: 'I',
      trade_balance: 100000,
      after_balance: 1000000,
      briefs: '테스트 입금',
      remark1: '테스트 비고1',
      remark2: '테스트 비고2',
      remark3: '',
      charge_request_id: null,
      is_matched: false,
      matched_at: null,
      matched_by: null
    };

    console.log('🔍 테스트 데이터:', JSON.stringify(testData, null, 2));

    const { data, error } = await supabaseAdmin
      .from('bank_transactions')
      .insert(testData)
      .select();

    if (error) {
      console.error('❌ 저장 오류:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
      };
    }

    console.log('✅ 저장 성공:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Supabase 저장 테스트 성공',
        data: data
      })
    };

  } catch (error) {
    console.error('❌ 예외 발생:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString(),
        stack: error.stack
      })
    };
  }
};
