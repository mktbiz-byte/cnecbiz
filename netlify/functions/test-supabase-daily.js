/**
 * Supabase 클라이언트 테스트 함수
 */
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성 (주간리포트와 동일)
const supabaseBiz = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    // 간단한 쿼리 테스트
    const { data, error } = await supabaseBiz
      .from('campaigns')
      .select('id')
      .limit(1);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        test: 'supabase',
        campaignFound: data?.length > 0,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message, stack: error.stack })
    };
  }
};
