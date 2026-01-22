const { createClient } = require('@supabase/supabase-js');

// 각 국가별 Supabase 클라이언트 설정
const supabaseClients = {
  KR: createClient(
    process.env.VITE_SUPABASE_KOREA_URL,
    process.env.VITE_SUPABASE_KOREA_ANON_KEY
  ),
  US: createClient(
    process.env.VITE_SUPABASE_BIZ_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  ),
  JP: createClient(
    process.env.VITE_SUPABASE_JAPAN_URL,
    process.env.VITE_SUPABASE_JAPAN_ANON_KEY
  ),
  TW: createClient(
    process.env.VITE_SUPABASE_TAIWAN_URL,
    process.env.VITE_SUPABASE_TAIWAN_ANON_KEY
  )
};

exports.handler = async (event) => {
  try {
    const { searchTerm, country } = JSON.parse(event.body);

    if (!searchTerm) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '검색어를 입력해주세요.'
        })
      };
    }

    const results = [];

    // 특정 국가만 검색하거나 모든 국가 검색
    const countriesToSearch = country ? [country] : ['KR', 'US', 'JP', 'TW'];

    for (const countryCode of countriesToSearch) {
      const client = supabaseClients[countryCode];
      
      if (!client) continue;

      try {
        const { data, error } = await client
          .from('user_profiles')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10);

        if (error) {
          console.error(`${countryCode} 검색 오류:`, error);
          continue;
        }

        if (data && data.length > 0) {
          results.push(...data.map(creator => ({
            ...creator,
            source_country: countryCode
          })));
        }
      } catch (err) {
        console.error(`${countryCode} 검색 실패:`, err);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results: results,
        total: results.length
      })
    };

  } catch (error) {
    console.error('크리에이터 검색 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

