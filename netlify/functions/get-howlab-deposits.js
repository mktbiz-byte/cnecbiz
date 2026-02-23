/**
 * 하우랩 입출금 내역 조회 API
 * Supabase tblbank 테이블에서 서비스 롤 키로 조회 (RLS 우회)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const startDate = params.startDate || '';
    const endDate = params.endDate || '';
    const filterType = params.filterType || 'input';

    console.log(`[get-howlab-deposits] 조회 기간: ${startDate} ~ ${endDate}, 유형: ${filterType}`);

    let query = supabase
      .from('tblbank')
      .select('*')
      .order('bkdate', { ascending: false })
      .order('bktime', { ascending: false });

    if (startDate) {
      query = query.gte('bkdate', startDate);
    }
    if (endDate) {
      query = query.lte('bkdate', endDate);
    }
    if (filterType === 'input') {
      query = query.gt('bkinput', 0);
    } else if (filterType === 'output') {
      query = query.gt('bkoutput', 0);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[get-howlab-deposits] 조회 오류:', error);
      throw error;
    }

    // 통계 계산
    const allData = data || [];
    const depositItems = allData.filter(d => d.bkinput > 0);
    const withdrawalItems = allData.filter(d => d.bkoutput > 0);
    const stats = {
      total: allData.length,
      deposits: depositItems.length,
      withdrawals: withdrawalItems.length,
      depositAmount: depositItems.reduce((sum, d) => sum + (d.bkinput || 0), 0),
      withdrawalAmount: withdrawalItems.reduce((sum, d) => sum + (d.bkoutput || 0), 0)
    };

    console.log(`[get-howlab-deposits] 조회 완료: ${allData.length}건`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: allData, stats })
    };
  } catch (error) {
    console.error('[get-howlab-deposits] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
