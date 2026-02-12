const popbill = require('popbill');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

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
console.log('🔧 [CONFIG] POPBILL_LINK_ID:', process.env.POPBILL_LINK_ID);
console.log('🔧 [CONFIG] POPBILL_CORP_NUM:', POPBILL_CORP_NUM);
console.log('🔧 [CONFIG] POPBILL_TEST_MODE:', process.env.POPBILL_TEST_MODE);

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

console.log('✅ [INIT] Supabase client initialized');

/**
 * 세금계산서 발행 API
 * POST /issue-tax-invoice
 *
 * Body:
 * {
 *   "taxInvoiceRequestId": "uuid",  // points_charge_requests 테이블 ID
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

    console.log('🔍 [STEP 1] 충전 요청 정보 조회...');
    console.log('   - 충전 요청 ID:', taxInvoiceRequestId);

    // 2. points_charge_requests에서 충전 요청 정보 조회
    const { data: chargeRequest, error: chargeError } = await supabaseAdmin
      .from('points_charge_requests')
      .select(`
        id,
        company_id,
        amount,
        status,
        needs_tax_invoice,
        tax_invoice_info,
        tax_invoice_issued,
        is_credit,
        created_at,
        confirmed_at
      `)
      .eq('id', taxInvoiceRequestId)
      .single();

    if (chargeError || !chargeRequest) {
      console.error('❌ [STEP 1] 충전 요청 정보 조회 실패:', chargeError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '충전 요청 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 이미 발행된 경우 중복 발행 방지
    if (chargeRequest.tax_invoice_issued) {
      console.log('⚠️ [STEP 1] 이미 세금계산서가 발행된 건입니다.');
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '이미 세금계산서가 발행된 건입니다.'
        })
      };
    }

    // 3. 회사 정보 조회 (company_id는 실제로 user_id임)
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select(`
        id,
        user_id,
        company_name,
        ceo_name,
        business_registration_number,
        company_address,
        business_type,
        business_category,
        contact_person,
        email,
        phone
      `)
      .eq('user_id', chargeRequest.company_id)
      .single();

    if (companyError || !company) {
      console.error('❌ [STEP 1] 회사 정보 조회 실패:', companyError);
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: '회사 정보를 찾을 수 없습니다.'
        })
      };
    }

    // 세금계산서 정보 가져오기 (tax_invoice_info에서 또는 company 정보에서)
    const taxInfo = chargeRequest.tax_invoice_info || {};

    // 금액 계산: 총액에서 공급가액과 세액 분리 (VAT 포함 금액 기준)
    const totalAmount = chargeRequest.amount;
    const supplyCostTotal = Math.round(totalAmount / 1.1);  // 공급가액
    const taxTotal = totalAmount - supplyCostTotal;  // 세액

    // 작성일자: 현재 날짜
    const today = new Date();
    const writeDate = today.toISOString().split('T')[0];  // YYYY-MM-DD

    // request 객체 구성 (기존 로직과 호환)
    const request = {
      company_id: company.id,
      supply_cost_total: supplyCostTotal,
      tax_total: taxTotal,
      total_amount: totalAmount,
      write_date: writeDate,
      is_deposit_confirmed: chargeRequest.status === 'completed' || chargeRequest.status === 'confirmed',
      companies: {
        business_number: taxInfo.businessNumber || taxInfo.business_number || company.business_registration_number || '',
        company_name: taxInfo.companyName || taxInfo.company_name || company.company_name || '',
        ceo_name: taxInfo.ceoName || taxInfo.ceo_name || company.ceo_name || '',
        address: taxInfo.address || company.company_address || '',
        business_type: taxInfo.businessType || taxInfo.business_type || company.business_type || '',
        business_category: taxInfo.businessItem || taxInfo.business_item || taxInfo.businessCategory || company.business_category || '',
        contact_person: taxInfo.contactPerson || taxInfo.contact_person || company.contact_person || '',
        email: taxInfo.email || company.email || '',
        phone: taxInfo.phone || company.phone || ''
      }
    };

    console.log('✅ [STEP 1] 충전 요청 정보 조회 완료');
    console.log('   - 회사명:', request.companies.company_name);
    console.log('   - 금액:', request.supply_cost_total.toLocaleString(), '원');

    // 3. 팝빌에서 공급자 사업자 정보 조회
    console.log('🔍 [STEP 2] 팝빌 등록 사업자 정보 조회...');

    let corpInfo = null;
    try {
      corpInfo = await new Promise((resolve, reject) => {
        taxinvoiceService.getCorpInfo(POPBILL_CORP_NUM,
          (result) => {
            console.log('✅ 팝빌 사업자 정보 조회 성공:', JSON.stringify(result));
            resolve(result);
          },
          (error) => {
            console.warn('⚠️ 팝빌 사업자 정보 조회 실패:', error.message);
            reject(error);
          }
        );
      });
    } catch (e) {
      console.warn('⚠️ 팝빌 사업자 정보 조회 실패, 기본값 사용');
    }

    // 4. 팝빌 세금계산서 객체 생성
    console.log('🔍 [STEP 3] 팝빌 세금계산서 객체 생성...');

    // MgtKey(문서번호) 생성: 날짜 + 랜덤 문자열 (최대 24자, 중복 불가)
    const generateMgtKey = () => {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '') // HHMMSS
      const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4자리 랜덤
      return `${dateStr}${timeStr}${random}` // 총 18자
    }

    const mgtKey = generateMgtKey()
    console.log('   - 문서번호(MgtKey):', mgtKey)

    // 공급자 정보: 팝빌 등록 정보 > 기본값 순서로 적용
    const invoicerCorpName = corpInfo?.corpName || '주식회사 하우파파';
    const invoicerCEOName = corpInfo?.ceoname || '박현용';
    const invoicerAddr = corpInfo?.addr || '';
    const invoicerBizClass = corpInfo?.bizClass || '';
    const invoicerBizType = corpInfo?.bizType || '';

    console.log('   - 공급자 상호:', invoicerCorpName);
    console.log('   - 공급자 대표자:', invoicerCEOName);

    const taxinvoice = {
      // 문서번호 (필수) - 공급자 측 고유 문서번호
      invoicerMgtKey: mgtKey,

      // 기본 정보
      writeDate: request.write_date.replace(/-/g, ''), // YYYYMMDD
      chargeDirection: request.charge_direction || '정과금',
      issueType: request.issue_type || '정발행',
      purposeType: request.purpose_type || '영수',
      taxType: request.tax_type || '과세',

      // 공급자 정보 (팝빌 등록 정보 기반)
      invoicerCorpNum: POPBILL_CORP_NUM,
      invoicerCorpName: invoicerCorpName,
      invoicerCEOName: invoicerCEOName,
      invoicerAddr: invoicerAddr,
      invoicerBizClass: invoicerBizClass,
      invoicerBizType: invoicerBizType,
      invoicerContactName: '관리자',
      invoicerEmail: 'mkt@howlab.co.kr',
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
    console.log('   - 세금계산서 전체 객체:', JSON.stringify(taxinvoice, null, 2));

    // 4. 팝빌 API 호출 - 즉시 발행 (RegistIssue)
    console.log('🔍 [STEP 3] 팝빌 API 호출 - 즉시 발행...');
    console.log('   - 문서번호(MgtKey):', taxinvoice.invoicerMgtKey);
    console.log('   - 공급받는자:', taxinvoice.invoiceeCorpName);
    console.log('   - 공급받는자 사업자번호:', taxinvoice.invoiceeCorpNum);
    console.log('   - 공급가액:', taxinvoice.supplyCostTotal, '원');
    console.log('   - 세액:', taxinvoice.taxTotal, '원');
    console.log('   - 합계:', taxinvoice.totalAmount, '원');

    const result = await new Promise((resolve, reject) => {
      taxinvoiceService.registIssue(
        POPBILL_CORP_NUM,
        taxinvoice,
        false,  // 거래명세서 동시작성 여부
        '포인트 충전 세금계산서 발행',  // 메모
        forceIssue,  // 지연발행 가능여부
        null,   // 거래명세서 문서번호
        '세금계산서가 발행되었습니다',  // 이메일 제목
        'cnecbiz',   // UserID - 하우파파 회원 ID
        (result) => {
          console.log('✅ [STEP 3] 팝빌 API 호출 성공!');
          console.log('   - 전체 응답:', JSON.stringify(result, null, 2));
          console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
          console.log('   - 응답코드:', result.code);
          console.log('   - 응답메시지:', result.message);
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

    // 5. Supabase 업데이트 - points_charge_requests 테이블의 tax_invoice_issued 필드 업데이트
    console.log('🔍 [STEP 4] Supabase 업데이트...');

    // 기존 tax_invoice_info에 발행 정보 추가
    const updatedTaxInvoiceInfo = {
      ...taxInfo,
      issued: true,
      issued_at: new Date().toISOString(),
      nts_confirm_num: result.ntsConfirmNum,  // 대문자 C 수정
      mgt_key: mgtKey  // 문서번호 저장
    };

    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({

        // status는 DB constraint로 인해 변경하지 않음

        tax_invoice_issued: true,
        tax_invoice_info: updatedTaxInvoiceInfo
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
          company_id: company.id,  // companies 테이블의 실제 id 사용
          type: 'tax_invoice',
          amount: request.total_amount,
          charge_request_id: taxInvoiceRequestId,  // points_charge_requests ID 참조
          status: 'pending'
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
    console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
    console.log('   - 발행 시각:', new Date().toLocaleString('ko-KR'));
    console.log('📊 ========== 세금계산서 발행 종료 ==========\n\n');

    // 7. 이메일 알림 발송
    console.log('🔍 [STEP 6] 이메일 알림 발송...');
    try {
      const gmailEmail = process.env.GMAIL_EMAIL || 'mkt_biz@cnec.co.kr';
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

      if (gmailAppPassword) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailEmail,
            pass: gmailAppPassword.trim().replace(/\s/g, '')
          }
        });

        const emailSubject = `[세금계산서 발행] ${request.companies.company_name} - ${request.total_amount.toLocaleString()}원`;
        const emailHtml = `
          <h2>세금계산서가 발행되었습니다</h2>
          <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <tr><td><strong>공급받는자</strong></td><td>${request.companies.company_name}</td></tr>
            <tr><td><strong>사업자번호</strong></td><td>${request.companies.business_number}</td></tr>
            <tr><td><strong>공급가액</strong></td><td>${request.supply_cost_total.toLocaleString()}원</td></tr>
            <tr><td><strong>세액</strong></td><td>${request.tax_total.toLocaleString()}원</td></tr>
            <tr><td><strong>합계</strong></td><td>${request.total_amount.toLocaleString()}원</td></tr>
            <tr><td><strong>국세청 승인번호</strong></td><td>${result.ntsConfirmNum || '-'}</td></tr>
            <tr><td><strong>발행일시</strong></td><td>${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
          </table>
          <p>팝빌에서 상세 내역을 확인할 수 있습니다.</p>
        `;

        // 수신자 목록: mkt@howlab.co.kr + 기업 이메일(있는 경우)
        const recipients = ['mkt@howlab.co.kr'];
        if (request.companies.email) {
          recipients.push(request.companies.email);
        }

        await transporter.sendMail({
          from: `"CNECBIZ 세금계산서" <${gmailEmail}>`,
          to: recipients.join(', '),
          subject: emailSubject,
          html: emailHtml
        });

        console.log('✅ [STEP 6] 이메일 알림 발송 완료 -', recipients.join(', '));
      } else {
        console.log('⚠️ [STEP 6] GMAIL_APP_PASSWORD 미설정 - 이메일 발송 생략');
      }
    } catch (emailError) {
      console.error('❌ [STEP 6] 이메일 발송 실패:', emailError.message);
      // 이메일 실패해도 세금계산서 발행은 성공이므로 계속 진행
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '세금계산서 발행 완료',
        ntsConfirmNum: result.ntsConfirmNum,
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
