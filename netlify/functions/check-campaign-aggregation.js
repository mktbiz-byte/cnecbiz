const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 다중 리전 설정
    const regions = [
      { name: 'korea', url: process.env.VITE_SUPABASE_KOREA_URL, key: process.env.SUPABASE_KOREA_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KOREA_ANON_KEY },
      { name: 'japan', url: process.env.VITE_SUPABASE_JAPAN_URL, key: process.env.SUPABASE_JAPAN_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_JAPAN_ANON_KEY },
      { name: 'us', url: process.env.VITE_SUPABASE_US_URL, key: process.env.SUPABASE_US_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_US_ANON_KEY }
    ];

    const aggregation = {
      검색일자: today,
      총_캠페인_수: 0,
      리전별_상세: {},
      전체_캠페인_목록: []
    };

    // 각 리전별로 조회
    for (const region of regions) {
      const supabase = createClient(region.url, region.key);

      // 프론트엔드 "진행중" 필터와 동일한 조건으로 조회
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, title, status, application_deadline, company_id')
        .eq('application_deadline', today)
        .in('status', ['active', 'approved']);

      const regionData = {
        리전: region.name,
        에러: error ? error.message : null,
        캠페인_수: campaigns ? campaigns.length : 0,
        캠페인_목록: campaigns || []
      };

      // 상태별 집계
      if (campaigns && campaigns.length > 0) {
        const statusCounts = {};
        campaigns.forEach(c => {
          statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });
        regionData.상태별_집계 = statusCounts;

        // 전체 목록에 리전 정보 추가
        campaigns.forEach(c => {
          aggregation.전체_캠페인_목록.push({
            리전: region.name,
            캠페인ID: c.id,
            제목: c.title,
            상태: c.status,
            마감일: c.application_deadline,
            기업ID: c.company_id
          });
        });
      }

      aggregation.리전별_상세[region.name] = regionData;
      aggregation.총_캠페인_수 += regionData.캠페인_수;
    }

    // 요약 정보
    aggregation.요약 = {
      한국: aggregation.리전별_상세.korea.캠페인_수,
      일본: aggregation.리전별_상세.japan.캠페인_수,
      미국: aggregation.리전별_상세.us.캠페인_수,
      합계: aggregation.총_캠페인_수
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(aggregation, null, 2)
    };

  } catch (error) {
    console.error('집계 확인 오류:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        오류: error.message,
        스택: error.stack
      }, null, 2)
    };
  }
};
