/**
 * Supabase 연결 테스트
 */
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    console.log('✅ 환경 변수 확인');
    const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Supabase URL:', supabaseUrl ? '존재' : '없음');
    console.log('Service Key:', supabaseServiceKey ? '존재' : '없음');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('환경 변수가 설정되지 않았습니다');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('✅ Supabase 클라이언트 생성 성공');
    
    // 간단한 쿼리 테스트
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Supabase 쿼리 성공');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Supabase 연결 성공',
        hasData: data && data.length > 0
      })
    };
  } catch (error) {
    console.error('❌ 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
