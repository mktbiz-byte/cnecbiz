/**
 * 간단한 일일 보고서 (테스트용)
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getYesterdayRange() {
  const now = new Date();
  const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  const yesterday = new Date(koreaTime);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);
  
  return {
    start: yesterday.toISOString(),
    end: yesterdayEnd.toISOString(),
    dateStr: yesterday.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

exports.handler = async (event, context) => {
  try {
    console.log('📊 간단한 일일 보고서 시작');
    
    const { start, end, dateStr } = getYesterdayRange();
    console.log(`집계 기간: ${dateStr}`);
    
    // 신규 회원 조회
    const { data: newCompanies, error } = await supabaseAdmin
      .from('companies')
      .select('region')
      .gte('created_at', start)
      .lte('created_at', end);
    
    if (error) throw error;
    
    const newTotal = newCompanies?.length || 0;
    const newKorea = newCompanies?.filter(c => c.region === 'korea').length || 0;
    const newJapan = newCompanies?.filter(c => c.region === 'japan').length || 0;
    const newUS = newCompanies?.filter(c => c.region === 'us').length || 0;
    
    console.log(`✅ 신규 회원: 전체 ${newTotal}명 (한국 ${newKorea}, 일본 ${newJapan}, 미국 ${newUS})`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: dateStr,
        newCompanies: {
          total: newTotal,
          korea: newKorea,
          japan: newJapan,
          us: newUS
        }
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
