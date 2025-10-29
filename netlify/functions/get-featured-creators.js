const { createClient } = require('@supabase/supabase-js');

// cnectotal Supabase 클라이언트
const supabaseTotal = createClient(
  process.env.VITE_SUPABASE_TOTAL_URL,
  process.env.SUPABASE_TOTAL_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const { country, limit = 50 } = event.queryStringParameters || {};

    let query = supabaseTotal
      .from('featured_creators')
      .select('*')
      .order('overall_score', { ascending: false })
      .limit(limit);

    // 국가 필터
    if (country) {
      query = query.eq('primary_country', country);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: data || [],
        total: data?.length || 0
      })
    };

  } catch (error) {
    console.error('추천 크리에이터 조회 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

