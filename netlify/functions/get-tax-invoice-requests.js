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

    // points_charge_requests에서 needs_tax_invoice=true인 건들을 직접 조회
    // 모든 세금계산서 신청 내역 조회 (포인트 충전 + 캠페인 결제 모두 포함)
    let query = supabaseAdmin
      .from('points_charge_requests')
      .select(`
        id,
        company_id,
        amount,
        status,
        needs_tax_invoice,
        tax_invoice_info,
        created_at,
        confirmed_at,
        is_credit,
        tax_invoice_issued,
        related_campaign_id
      `)
      .eq('needs_tax_invoice', true)
      .order('created_at', { ascending: false });

    // 필터 적용 (tax_invoice_issued 기반)
    if (filter === 'pending') {
      // 발행 대기: 세금계산서가 아직 발행되지 않은 건
      query = query.or('tax_invoice_issued.is.null,tax_invoice_issued.eq.false');
    } else if (filter === 'issued') {
      // 발행 완료: 세금계산서가 발행된 건
      query = query.eq('tax_invoice_issued', true);
    } else if (filter === 'prepaid') {
      // 선발행: 미수금으로 선발행된 건
      query = query.eq('is_credit', true).eq('tax_invoice_issued', true);
    }

    const { data: chargeRequests, error } = await query;

    if (error) {
      console.error('❌ 조회 실패:', error);
      throw error;
    }

    // company_id 목록 추출 (실제로는 user_id임)
    const userIds = [...new Set(chargeRequests.map(req => req.company_id))];
    
    // companies 테이블에서 회사 정보 조회 (user_id로 조회)
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, user_id, company_name, email, ceo_name, business_registration_number, phone, company_address, business_type, business_category')
      .in('user_id', userIds);
    
    if (companiesError) {
      console.error('❌ 회사 정보 조회 실패:', companiesError);
      throw companiesError;
    }
    
    // user_id로 매핑하기 위한 Map 생성 (company_id는 실제로 user_id임)
    const companyMap = new Map(companies.map(c => [c.user_id, c]));

    // 데이터 변환 (TaxInvoiceRequestsTab에서 기대하는 형식으로)
    const requests = chargeRequests.map(req => {
      // tax_invoice_info에서 발행일시 가져오기
      const taxInfo = req.tax_invoice_info || {};
      const issuedAt = taxInfo.issued_at || (req.tax_invoice_issued ? req.confirmed_at : null);

      return {
        id: req.id,  // points_charge_requests의 ID
        charge_request_id: req.id,  // 명시적으로 charge_request_id도 포함
        amount: req.amount,
        status: req.tax_invoice_issued ? 'issued' : 'pending',  // tax_invoice_issued 필드 사용
        is_deposit_confirmed: req.status === 'completed' || req.status === 'confirmed',
        is_prepaid: req.is_credit || false,
        created_at: req.created_at,
        issued_at: issuedAt,  // 발행된 경우에만 issued_at 표시
        nts_confirm_num: taxInfo.nts_confirm_num || null,  // 국세청 승인번호
        companies: companyMap.get(req.company_id) || { company_name: '알 수 없음', email: '' },
        tax_invoice_info: req.tax_invoice_info,
        related_campaign_id: req.related_campaign_id  // 캠페인 관련 정보도 포함
      };
    });

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
