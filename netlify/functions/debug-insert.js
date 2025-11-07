/**
 * Supabase 삽입 디버그 함수
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('🔍 Supabase 삽입 디버그 시작');

  try {
    // 테스트 데이터 (실제 팝빌 API 응답 형식)
    const testData = {
      tid: 'TEST_' + Date.now(),
      trade_date: '20250107',
      trade_time: '153000',
      trade_type: 'I',
      trade_balance: 330000,
      briefs: '테스트입금자',
      charge_request_id: null,
      is_matched: false
    };

    console.log('📝 삽입할 데이터:', JSON.stringify(testData, null, 2));

    // Supabase에 삽입 시도
    const { data, error } = await supabaseAdmin
      .from('bank_transactions')
      .insert(testData)
      .select();

    if (error) {
      console.error('❌ 삽입 오류:', JSON.stringify(error, null, 2));
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: error,
          testData: testData
        }, null, 2)
      };
    }

    console.log('✅ 삽입 성공:', JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '삽입 성공',
        data: data,
        testData: testData
      }, null, 2)
    };
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};
