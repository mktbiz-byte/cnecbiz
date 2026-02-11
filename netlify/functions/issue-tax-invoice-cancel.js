const popbill = require('popbill');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// ========== 팝빌 전역 설정 ==========
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

// 팝빌 세금계산서 서비스 객체 생성
const taxinvoiceService = popbill.TaxinvoiceService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 수정세금계산서(마이너스) 발행 API
 * POST /issue-tax-invoice-cancel
 *
 * Body:
 * {
 *   "taxInvoiceRequestId": "uuid",     // points_charge_requests 테이블 ID
 *   "modifyCode": "04",                 // 수정사유코드 (01~06)
 *   "cancelReason": "계약 해지"         // 취소 사유 (선택)
 * }
 *
 * 수정사유코드:
 * 01: 기재사항 착오정정
 * 02: 공급가액 변동
 * 03: 환입 (반품)
 * 04: 계약의 해지
 * 05: 내국신용장 사후개설
 * 06: 착오에 의한 이중발행
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('📊 ========== 수정세금계산서(마이너스) 발행 시작 ==========');
  console.log('⏰ [INFO] 실행 시각:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 1. 요청 데이터 파싱
    const { taxInvoiceRequestId, modifyCode = '04', cancelReason = '계약의 해지' } = JSON.parse(event.body || '{}');

    if (!taxInvoiceRequestId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '세금계산서 신청 ID가 필요합니다.'
        })
      };
    }

    console.log('🔍 [STEP 1] 원본 세금계산서 정보 조회...');
    console.log('   - 충전 요청 ID:', taxInvoiceRequestId);
    console.log('   - 수정사유코드:', modifyCode);

    // 2. points_charge_requests에서 원본 세금계산서 정보 조회
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
        created_at
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

    // 세금계산서가 발행되지 않은 경우
    if (!chargeRequest.tax_invoice_issued) {
      console.log('⚠️ [STEP 1] 발행된 세금계산서가 없습니다.');
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '발행된 세금계산서가 없습니다. 먼저 세금계산서를 발행해주세요.'
        })
      };
    }

    // 원본 국세청 승인번호 확인
    const orgNTSConfirmNum = chargeRequest.tax_invoice_info?.nts_confirm_num;
    if (!orgNTSConfirmNum) {
      console.error('❌ [STEP 1] 원본 국세청 승인번호가 없습니다.');
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '원본 국세청 승인번호가 없습니다. 팝빌에서 직접 확인해주세요.'
        })
      };
    }

    // 이미 취소된 경우
    if (chargeRequest.tax_invoice_info?.cancelled) {
      console.log('⚠️ [STEP 1] 이미 취소된 세금계산서입니다.');
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '이미 취소된 세금계산서입니다.'
        })
      };
    }

    console.log('   - 원본 국세청 승인번호:', orgNTSConfirmNum);

    // 3. 회사 정보 조회
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

    // 세금계산서 정보 가져오기
    const taxInfo = chargeRequest.tax_invoice_info || {};

    // 금액 계산: 마이너스 금액으로 설정
    const totalAmount = chargeRequest.amount;
    const supplyCostTotal = Math.round(totalAmount / 1.1);
    const taxTotal = totalAmount - supplyCostTotal;

    // 작성일자: 현재 날짜
    const today = new Date();
    const writeDate = today.toISOString().split('T')[0].replace(/-/g, '');

    console.log('✅ [STEP 1] 정보 조회 완료');
    console.log('   - 회사명:', company.company_name);
    console.log('   - 취소 금액:', totalAmount.toLocaleString(), '원');

    // 4. 팝빌 수정세금계산서 객체 생성
    console.log('🔍 [STEP 2] 팝빌 수정세금계산서 객체 생성...');

    // MgtKey(문서번호) 생성
    const generateMgtKey = () => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `C${dateStr}${timeStr}${random}`; // C = Cancel 접두사
    };

    const mgtKey = generateMgtKey();
    console.log('   - 문서번호(MgtKey):', mgtKey);

    // 수정사유 한글명
    const modifyCodeNames = {
      '01': '기재사항 착오정정',
      '02': '공급가액 변동',
      '03': '환입',
      '04': '계약의 해지',
      '05': '내국신용장 사후개설',
      '06': '착오에 의한 이중발행'
    };

    const taxinvoice = {
      // 문서번호 (필수)
      invoicerMgtKey: mgtKey,

      // ★★★ 수정세금계산서 필수 필드 ★★★
      modifyCode: modifyCode,                    // 수정사유코드
      orgNTSConfirmNum: orgNTSConfirmNum,        // 원본 국세청 승인번호

      // 기본 정보
      writeDate: writeDate,
      chargeDirection: '정과금',
      issueType: '정발행',
      purposeType: '영수',
      taxType: '과세',

      // 공급자 정보 (하우파파)
      invoicerCorpNum: POPBILL_CORP_NUM,
      invoicerCorpName: '주식회사 하우파파',
      invoicerCEOName: '박현용',
      invoicerAddr: '서울특별시 중구 퇴계로36길 2, 1009호(필동2가, 동국대학교 충무로 영상센터)',
      invoicerBizClass: '정보통신업',
      invoicerBizType: '전자상거래 소매 중개업',
      invoicerContactName: '관리자',
      invoicerEmail: 'mkt@howlab.co.kr',
      invoicerTEL: '1833-6025',

      // 공급받는자 정보
      invoiceeCorpNum: (taxInfo.businessNumber || taxInfo.business_number || company.business_registration_number || '').replace(/-/g, ''),
      invoiceeType: '사업자',
      invoiceeCorpName: taxInfo.companyName || taxInfo.company_name || company.company_name || '',
      invoiceeCEOName: taxInfo.ceoName || taxInfo.ceo_name || company.ceo_name || '',
      invoiceeAddr: taxInfo.address || company.company_address || '',
      invoiceeBizClass: taxInfo.businessType || taxInfo.business_type || company.business_type || '',
      invoiceeBizType: taxInfo.businessCategory || company.business_category || '',
      invoiceeContactName1: taxInfo.contactPerson || company.contact_person || '',
      invoiceeEmail1: taxInfo.email || company.email || '',
      invoiceeTEL1: taxInfo.phone || company.phone || '',

      // ★★★ 금액 정보 - 마이너스로 설정 ★★★
      supplyCostTotal: (-supplyCostTotal).toString(),
      taxTotal: (-taxTotal).toString(),
      totalAmount: (-totalAmount).toString(),

      // 품목 정보 - 마이너스 금액
      detailList: [
        {
          serialNum: 1,
          purchaseDT: writeDate,
          itemName: '포인트 충전 취소',
          spec: '',
          qty: '1',
          unitCost: (-supplyCostTotal).toString(),
          supplyCost: (-supplyCostTotal).toString(),
          tax: (-taxTotal).toString(),
          remark: cancelReason
        }
      ],

      // 비고
      remark1: `수정세금계산서 - ${modifyCodeNames[modifyCode] || '계약의 해지'}`,
      remark2: `원본 승인번호: ${orgNTSConfirmNum}`,
      remark3: cancelReason || ''
    };

    console.log('✅ [STEP 2] 수정세금계산서 객체 생성 완료');
    console.log('   - 수정사유:', modifyCodeNames[modifyCode]);
    console.log('   - 마이너스 금액:', (-totalAmount).toLocaleString(), '원');

    // 5. 팝빌 API 호출 - 즉시 발행 (RegistIssue)
    console.log('🔍 [STEP 3] 팝빌 API 호출 - 수정세금계산서 발행...');

    const result = await new Promise((resolve, reject) => {
      taxinvoiceService.registIssue(
        POPBILL_CORP_NUM,
        taxinvoice,
        false,  // 거래명세서 동시작성 여부
        `수정세금계산서 발행 (${modifyCodeNames[modifyCode]})`,  // 메모
        false,  // 지연발행 가능여부
        null,   // 거래명세서 문서번호
        '수정세금계산서가 발행되었습니다',  // 이메일 제목
        'cnecbiz',   // UserID - 하우파파 회원 ID
        (result) => {
          console.log('✅ [STEP 3] 팝빌 API 호출 성공!');
          console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
          resolve(result);
        },
        (error) => {
          console.error('❌ [STEP 3] 팝빌 API 호출 실패:', {
            code: error.code,
            message: error.message
          });
          reject(error);
        }
      );
    });

    // 6. Supabase 업데이트 - 취소 정보 기록
    console.log('🔍 [STEP 4] Supabase 업데이트...');

    const updatedTaxInvoiceInfo = {
      ...taxInfo,
      cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancel_nts_confirm_num: result.ntsConfirmNum,
      cancel_mgt_key: mgtKey,
      cancel_reason: cancelReason,
      modify_code: modifyCode
    };

    const { error: updateError } = await supabaseAdmin
      .from('points_charge_requests')
      .update({
        tax_invoice_info: updatedTaxInvoiceInfo
      })
      .eq('id', taxInvoiceRequestId);

    if (updateError) {
      console.error('❌ [STEP 4] Supabase 업데이트 실패:', updateError);
    } else {
      console.log('✅ [STEP 4] Supabase 업데이트 완료');
    }

    // 7. 이메일 알림 발송
    console.log('🔍 [STEP 5] 이메일 알림 발송...');
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

        const companyName = taxInfo.companyName || company.company_name;
        const emailSubject = `[수정세금계산서 발행] ${companyName} - ${(-totalAmount).toLocaleString()}원`;
        const emailHtml = `
          <h2>수정세금계산서(마이너스)가 발행되었습니다</h2>
          <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <tr><td><strong>수정사유</strong></td><td>${modifyCodeNames[modifyCode]}</td></tr>
            <tr><td><strong>공급받는자</strong></td><td>${companyName}</td></tr>
            <tr><td><strong>취소 금액</strong></td><td style="color: red;">${(-totalAmount).toLocaleString()}원</td></tr>
            <tr><td><strong>원본 승인번호</strong></td><td>${orgNTSConfirmNum}</td></tr>
            <tr><td><strong>수정 승인번호</strong></td><td>${result.ntsConfirmNum || '-'}</td></tr>
            <tr><td><strong>발행일시</strong></td><td>${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
            <tr><td><strong>취소 사유</strong></td><td>${cancelReason}</td></tr>
          </table>
          <p>팝빌에서 상세 내역을 확인할 수 있습니다.</p>
        `;

        const recipients = ['mkt@howlab.co.kr'];
        if (taxInfo.email || company.email) {
          recipients.push(taxInfo.email || company.email);
        }

        await transporter.sendMail({
          from: `"CNECBIZ 세금계산서" <${gmailEmail}>`,
          to: recipients.join(', '),
          subject: emailSubject,
          html: emailHtml
        });

        console.log('✅ [STEP 5] 이메일 알림 발송 완료');
      }
    } catch (emailError) {
      console.error('❌ [STEP 5] 이메일 발송 실패:', emailError.message);
    }

    console.log('\n✅ [COMPLETE] 수정세금계산서 발행 완료!');
    console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
    console.log('📊 ========== 수정세금계산서 발행 종료 ==========\n\n');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '수정세금계산서(마이너스) 발행 완료',
        ntsConfirmNum: result.ntsConfirmNum,
        cancelledAt: new Date().toISOString(),
        modifyCode: modifyCode,
        modifyCodeName: modifyCodeNames[modifyCode]
      })
    };

  } catch (error) {
    console.error('\n❌ ========== 오류 발생 ==========');
    console.error('❌ [ERROR] Message:', error.message);
    console.error('❌ [ERROR] Code:', error.code);
    console.error('❌ ====================================\n\n');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code
      })
    };
  }
};
