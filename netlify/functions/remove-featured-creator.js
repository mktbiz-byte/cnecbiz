const { createClient } = require('@supabase/supabase-js');

// cnectotal Supabase 클라이언트
const supabaseTotal = createClient(
  process.env.VITE_SUPABASE_TOTAL_URL,
  process.env.SUPABASE_TOTAL_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '삭제할 크리에이터 ID가 필요합니다.'
        })
      };
    }

    const { error } = await supabaseTotal
      .from('featured_creators')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '추천 크리에이터가 삭제되었습니다.'
      })
    };

  } catch (error) {
    console.error('추천 크리에이터 삭제 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

