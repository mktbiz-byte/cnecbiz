/**
 * applications 테이블 스키마 확인 함수
 */

const { createClient } = require('@supabase/supabase-js');

const createSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_KOREA_URL;
  const supabaseKey = process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return createClient(supabaseUrl, supabaseKey);
  }
  return null;
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase 클라이언트 초기화 실패');
    }

    // applications 테이블에서 샘플 데이터 1개 조회
    const { data: sampleApp, error: appError } = await supabase
      .from('applications')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (appError) {
      console.error('Applications 조회 오류:', appError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: appError.message
        })
      };
    }

    // 컬럼 목록 추출
    const columns = sampleApp ? Object.keys(sampleApp) : [];

    // deadline 관련 컬럼 찾기
    const deadlineColumns = columns.filter(col =>
      col.toLowerCase().includes('deadline') ||
      col.toLowerCase().includes('submission') ||
      col.toLowerCase().includes('video')
    );

    // status 관련 컬럼 찾기
    const statusColumns = columns.filter(col =>
      col.toLowerCase().includes('status') ||
      col.toLowerCase().includes('confirmed') ||
      col.toLowerCase().includes('submitted')
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        allColumns: columns,
        deadlineColumns,
        statusColumns,
        sampleData: sampleApp
      }, null, 2)
    };

  } catch (error) {
    console.error('스키마 확인 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
