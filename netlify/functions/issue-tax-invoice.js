const popbill = require('popbill');
const { createClient } = require('@supabase/supabase-js');

// ========== 팝빌 전역 설정 (카카오톡 API와 동일한 방식) ==========
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('📛 [POPBILL ERROR] [' + Error.code + '] ' + Error.message);
  }
});

console.log('✅ [INIT] Popbill config initialized');

// 팝빌 세금계산서 서비스 객체 생성
const taxinvoiceService = popbill.TaxinvoiceService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

console.log('✅ [INIT] Taxinvoice service initialized');
console.log('🔧 [CONFIG] POPBILL_CORP_NUM:', POPBILL_CORP_NUM);
console.log('🔧 [CONFIG] POPBILL_TEST_MODE:', process.env.POPBILL_TEST_MODE);

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ [INIT] Supabase client initialized');

/**
 * 세금계산서 발행 API
 * POST /issue-tax-invoice
 * 
 * Body:
 * {
 *   "taxInvoiceRequestId": "uuid",  // tax_invoice_requests 테이블 ID
 *   "forceIssue": false              // 지연발행 여부 (선택)
 * }
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('📊 ========== 세금계산서 발행 시작 ==========');
  console.log('⏰ [INFO] 실행 시각:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 1. 요청 데이터 파싱
    const { taxInvoiceRequestId, forceIssue = false } = JSON.parse(event.body || '{}');

    if (!taxInvoiceRequestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '세금계산서 신청 ID가 필요합니다.'
        })
      };
    }

    console.log('🔍 [STEP 1] 세금계산서 신청 정보 조회...');
    console.log('   - 신청 ID:', taxInvoiceRequestId);

    // 2. 세금계산서 신청 정보 조회
    const { data: request, error: requestError } = await supabaseAdmin
      .from('tax_invoice_requests')
      .select(`
        *,
        companies (
          business_number,
          company_name,
          ceo_name,
          address,
          business_type,
          business_category,
          contact_person,
          email,
          phone
        )
      `)
      .eq('id', taxInvoiceRequestId)
      .single();

    if (requestError || !request) {
      console.error('❌ [STEP 1] 세금계산서 신청 정보 조회 실패:', requestError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '세금계산서 신청 정보를 찾을 수 없습니다.'
        })
      };
    }

    console.log('✅ [STEP 1] 세금계산서 신청 정보 조회 완료');
    console.log('   - 회사명:', request.companies.company_name);
    console.log('   - 금액:', request.supply_cost_total.toLocaleString(), '원');

    // 3. 팝빌 세금계산서 객체 생성
    console.log('🔍 [STEP 2] 팝빌 세금계산서 객체 생성...');

    const taxinvoice = {
      // 기본 정보
      writeDate: request.write_date.replace(/-/g, ''), // YYYYMMDD
      chargeDirection: request.charge_direction || '정과금',
      issueType: request.issue_type || '정발행',
      purposeType: request.purpose_type || '영수',
      taxType: request.tax_type || '과세',

      // 공급자 정보 (하우파파)
      invoicerCorpNum: POPBILL_CORP_NUM,
      invoicerCorpName: '주식회사 하우파파',
      invoicerCEOName: '박현홍',
      invoicerAddr: '서울시 강남구',
      invoicerBizClass: '서비스업',
      invoicerBizType: '소프트웨어',
      invoicerContactName: '관리자',
      invoicerEmail: 'mkt_biz@cnec.co.kr',
      invoicerTEL: '1833-6025',

      // 공급받는자 정보
      invoiceeCorpNum: request.companies.business_number.replace(/-/g, ''),
      invoiceeType: '사업자',
      invoiceeCorpName: request.companies.company_name,
      invoiceeCEOName: request.companies.ceo_name,
      invoiceeAddr: request.companies.address || '',
      invoiceeBizClass: request.companies.business_type || '',
      invoiceeBizType: request.companies.business_category || '',
      invoiceeContactName1: request.companies.contact_person || '',
      invoiceeEmail1: request.companies.email || '',
      invoiceeTEL1: request.companies.phone || '',

      // 금액 정보
      supplyCostTotal: request.supply_cost_total.toString(),
      taxTotal: request.tax_total.toString(),
      totalAmount: request.total_amount.toString(),

      // 품목 정보
      detailList: [
        {
          serialNum: 1,
          purchaseDT: request.write_date.replace(/-/g, ''),
          itemName: request.item_name || '포인트 충전',
          spec: '',
          qty: '1',
          unitCost: request.supply_cost_total.toString(),
          supplyCost: request.supply_cost_total.toString(),
          tax: request.tax_total.toString(),
          remark: ''
        }
      ],

      // 비고
      remark1: request.remark1 || 'CNEC 포인트 충전',
      remark2: request.remark2 || '',
      remark3: request.remark3 || ''
    };

    console.log('✅ [STEP 2] 팝빌 세금계산서 객체 생성 완료');

    // 4. 팝빌 API 호출 - 즉시 발행 (RegistIssue)
    console.log('🔍 [STEP 3] 팝빌 API 호출 - 즉시 발행...');
    console.log('   - 공급받는자:', taxinvoice.invoiceeCorpName);
    console.log('   - 공급가액:', taxinvoice.supplyCostTotal.toLocaleString(), '원');
    console.log('   - 세액:', taxinvoice.taxTotal.toLocaleString(), '원');
    console.log('   - 합계:', taxinvoice.totalAmount.toLocaleString(), '원');

    const result = await new Promise((resolve, reject) => {
      taxinvoiceService.registIssue(
        POPBILL_CORP_NUM,
        taxinvoice,
        false,  // 거래명세서 동시작성 여부
        '포인트 충전 세금계산서 발행',  // 메모
        forceIssue,  // 지연발행 가능여부
        null,   // 거래명세서 문서번호
        '세금계산서가 발행되었습니다',  // 이메일 제목
        null,   // UserID
        (result) => {
          console.log('✅ [STEP 3] 팝빌 API 호출 성공!');
          console.log('   - 국세청 승인번호:', result.ntsconfirmNum);
          resolve(result);
        },
        (error) => {
          console.error('❌ [STEP 3] 팝빌 API 호출 실패:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          reject(error);
        }
      );
    });

    // 5. Supabase 업데이트
    console.log('🔍 [STEP 4] Supabase 업데이트...');

    const { error: updateError } = await supabaseAdmin
      .from('tax_invoice_requests')
      .update({
        status: 'issued',
        issued_at: new Date().toISOString(),
        nts_confirm_num: result.ntsconfirmNum,
        popbill_result: result
      })
      .eq('id', taxInvoiceRequestId);

    if (updateError) {
      console.error('❌ [STEP 4] Supabase 업데이트 실패:', updateError);
      // 팝빌 발행은 성공했으므로 에러를 반환하지 않음
    } else {
      console.log('✅ [STEP 4] Supabase 업데이트 완료');
    }

    // 6. 입금 확인 여부에 따라 미수금 처리
    if (!request.is_deposit_confirmed) {
      console.log('🔍 [STEP 5] 선발행 - 미수금 기록...');

      const { error: receivableError } = await supabaseAdmin
        .from('receivables')
        .insert({
          company_id: request.company_id,
          type: 'tax_invoice',
          amount: request.total_amount,
          description: `세금계산서 선발행 - ${request.companies.company_name}`,
          tax_invoice_request_id: taxInvoiceRequestId,
          status: 'pending',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후
        });

      if (receivableError) {
        console.error('❌ [STEP 5] 미수금 기록 실패:', receivableError);
      } else {
        console.log('✅ [STEP 5] 미수금 기록 완료');
      }
    } else {
      console.log('ℹ️ [STEP 5] 입금 확인됨 - 미수금 기록 생략');
    }

    console.log('\n✅ [COMPLETE] 세금계산서 발행 완료!');
    console.log('   - 국세청 승인번호:', result.ntsconfirmNum);
    console.log('   - 발행 시각:', new Date().toLocaleString('ko-KR'));
    console.log('📊 ========== 세금계산서 발행 종료 ==========\n\n');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '세금계산서 발행 완료',
        ntsconfirmNum: result.ntsconfirmNum,
        issuedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('\n❌ ========== 오류 발생 ==========');
    console.error('❌ [ERROR] Name:', error.name);
    console.error('❌ [ERROR] Message:', error.message);
    console.error('❌ [ERROR] Code:', error.code);
    console.error('❌ [ERROR] Stack:', error.stack);
    console.error('❌ ====================================\n\n');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
        name: error.name
      })
    };
  }
};
