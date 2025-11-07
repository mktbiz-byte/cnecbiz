/**
 * 세금계산서 신청 내역 조회 API
 * 관리자 전용 - Service Role Key 사용
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화 (Service Role Key)
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

exports.handler = async (event, context) => {
  console.log('📋 세금계산서 신청 내역 조회 시작...');

  try {
    // CORS 헤더
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // 쿼리 파라미터에서 필터 가져오기
    const params = event.queryStringParameters || {};
    const filter = params.filter || 'all'; // all, pending, issued, prepaid

    console.log(`📊 필터: ${filter}`);

    // Supabase에서 세금계산서 신청 내역 조회
    let query = supabaseAdmin
      .from('tax_invoice_requests')
      .select(`
        *,
        companies (
          company_name,
          email
        ),
        charge_requests:points_charge_requests (
          depositor_name,
          amount,
          status
        )
      `)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    } else if (filter === 'issued') {
      query = query.eq('status', 'issued');
    } else if (filter === 'prepaid') {
      query = query.eq('is_prepaid', true);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('❌ 조회 실패:', error);
      throw error;
    }

    console.log(`✅ ${requests.length}건의 세금계산서 신청 내역 조회 완료`);

    // 통계 계산
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      issued: requests.filter(r => r.status === 'issued').length,
      prepaid: requests.filter(r => r.is_prepaid).length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        requests,
        stats
      })
    };
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || error.toString()
      })
    };
  }
};
