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
 * 세금계산서 수동 발행 API
 * POST /issue-tax-invoice-manual
 *
 * Body:
 * {
 *   "invoiceData": {
 *     "companyName": "회사명",
 *     "businessNumber": "사업자번호",
 *     "ceoName": "대표자명",
 *     "address": "주소",
 *     "businessType": "업태",
 *     "businessCategory": "업종",
 *     "email": "이메일",
 *     "phone": "연락처",
 *     "contactName": "담당자명"
 *   },
 *   "amount": 110000,          // 총액 (VAT 포함)
 *   "itemName": "품목명",       // 선택
 *   "memo": "메모",            // 선택
 *   "writeDate": "2025-01-23"  // 작성일자 (선택, 기본: 오늘)
 * }
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('📊 ========== 세금계산서 수동 발행 시작 ==========');
  console.log('⏰ [INFO] 실행 시각:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 1. 요청 데이터 파싱
    const { invoiceData, amount, itemName, memo, writeDate } = JSON.parse(event.body || '{}');

    // 필수 필드 검증
    if (!invoiceData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '세금계산서 발행 정보가 필요합니다.'
        })
      };
    }

    if (!invoiceData.companyName || !invoiceData.businessNumber || !invoiceData.ceoName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '회사명, 사업자번호, 대표자명은 필수입니다.'
        })
      };
    }

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: '금액을 입력해주세요.'
        })
      };
    }

    console.log('🔍 [STEP 1] 입력 데이터 확인...');
    console.log('   - 회사명:', invoiceData.companyName);
    console.log('   - 사업자번호:', invoiceData.businessNumber);
    console.log('   - 금액:', amount.toLocaleString(), '원');

    // 2. 금액 계산: 총액에서 공급가액과 세액 분리 (VAT 포함 금액 기준)
    const totalAmount = parseInt(amount);
    const supplyCostTotal = Math.round(totalAmount / 1.1);  // 공급가액
    const taxTotal = totalAmount - supplyCostTotal;  // 세액

    // 작성일자: 입력값 또는 현재 날짜
    const today = new Date();
    const invoiceWriteDate = writeDate || today.toISOString().split('T')[0];  // YYYY-MM-DD

    console.log('✅ [STEP 1] 입력 데이터 확인 완료');
    console.log('   - 공급가액:', supplyCostTotal.toLocaleString(), '원');
    console.log('   - 세액:', taxTotal.toLocaleString(), '원');
    console.log('   - 작성일자:', invoiceWriteDate);

    // 3. 팝빌 세금계산서 객체 생성
    // 팝빌에서 공급자 사업자 정보 조회
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

    console.log('🔍 [STEP 3] 팝빌 세금계산서 객체 생성...');

    // MgtKey(문서번호) 생성: 날짜 + 랜덤 문자열 (최대 24자, 중복 불가)
    const generateMgtKey = () => {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '') // HHMMSS
      const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4자리 랜덤
      return `M${dateStr}${timeStr}${random}` // 총 19자 (M=Manual 구분용)
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
      writeDate: invoiceWriteDate.replace(/-/g, ''), // YYYYMMDD
      chargeDirection: '정과금',
      issueType: '정발행',
      purposeType: '영수',
      taxType: '과세',

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
      invoiceeCorpNum: invoiceData.businessNumber.replace(/-/g, ''),
      invoiceeType: '사업자',
      invoiceeCorpName: invoiceData.companyName,
      invoiceeCEOName: invoiceData.ceoName,
      invoiceeAddr: invoiceData.address || '',
      invoiceeBizClass: invoiceData.businessType || '',
      invoiceeBizType: invoiceData.businessCategory || '',
      invoiceeContactName1: invoiceData.contactName || invoiceData.ceoName || '',
      invoiceeEmail1: invoiceData.email || '',
      invoiceeTEL1: invoiceData.phone || '',

      // 금액 정보
      supplyCostTotal: supplyCostTotal.toString(),
      taxTotal: taxTotal.toString(),
      totalAmount: totalAmount.toString(),

      // 품목 정보
      detailList: [
        {
          serialNum: 1,
          purchaseDT: invoiceWriteDate.replace(/-/g, ''),
          itemName: itemName || '포인트 충전',
          spec: '',
          qty: '1',
          unitCost: supplyCostTotal.toString(),
          supplyCost: supplyCostTotal.toString(),
          tax: taxTotal.toString(),
          remark: ''
        }
      ],

      // 비고
      remark1: memo || 'CNEC 포인트 충전',
      remark2: '',
      remark3: ''
    };

    console.log('✅ [STEP 2] 팝빌 세금계산서 객체 생성 완료');

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
        '수동 세금계산서 발행',  // 메모
        false,  // 지연발행 가능여부
        null,   // 거래명세서 문서번호
        '세금계산서가 발행되었습니다',  // 이메일 제목
        'cnecbiz',   // UserID - 하우파파 회원 ID
        (result) => {
          console.log('✅ [STEP 3] 팝빌 API 호출 성공!');
          console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
          console.log('   - 응답코드:', result.code);
          console.log('   - 응답메시지:', result.message);
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

    // 5. 발행 기록 저장 (manual_tax_invoices 테이블에 저장)
    console.log('🔍 [STEP 4] 발행 기록 저장...');

    const { error: insertError } = await supabaseAdmin
      .from('manual_tax_invoices')
      .insert({
        mgt_key: mgtKey,
        company_name: invoiceData.companyName,
        business_number: invoiceData.businessNumber,
        ceo_name: invoiceData.ceoName,
        address: invoiceData.address || null,
        business_type: invoiceData.businessType || null,
        business_category: invoiceData.businessCategory || null,
        email: invoiceData.email || null,
        phone: invoiceData.phone || null,
        contact_name: invoiceData.contactName || null,
        supply_cost: supplyCostTotal,
        tax: taxTotal,
        total_amount: totalAmount,
        item_name: itemName || '포인트 충전',
        memo: memo || null,
        write_date: invoiceWriteDate,
        nts_confirm_num: result.ntsConfirmNum,
        issued_at: new Date().toISOString(),
        status: 'issued'
      });

    if (insertError) {
      console.error('⚠️ [STEP 4] 발행 기록 저장 실패 (세금계산서 발행은 완료됨):', insertError);
    } else {
      console.log('✅ [STEP 4] 발행 기록 저장 완료');
    }

    console.log('\n✅ [COMPLETE] 세금계산서 수동 발행 완료!');
    console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
    console.log('   - 발행 시각:', new Date().toLocaleString('ko-KR'));
    console.log('📊 ========== 세금계산서 수동 발행 종료 ==========\n\n');

    // 6. 이메일 알림 발송
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

        const emailSubject = `[세금계산서 수동발행] ${invoiceData.companyName} - ${totalAmount.toLocaleString()}원`;
        const emailHtml = `
          <h2>세금계산서가 수동 발행되었습니다</h2>
          <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <tr><td><strong>공급받는자</strong></td><td>${invoiceData.companyName}</td></tr>
            <tr><td><strong>사업자번호</strong></td><td>${invoiceData.businessNumber}</td></tr>
            <tr><td><strong>대표자명</strong></td><td>${invoiceData.ceoName}</td></tr>
            <tr><td><strong>공급가액</strong></td><td>${supplyCostTotal.toLocaleString()}원</td></tr>
            <tr><td><strong>세액</strong></td><td>${taxTotal.toLocaleString()}원</td></tr>
            <tr><td><strong>합계</strong></td><td>${totalAmount.toLocaleString()}원</td></tr>
            <tr><td><strong>품목</strong></td><td>${itemName || '포인트 충전'}</td></tr>
            <tr><td><strong>국세청 승인번호</strong></td><td>${result.ntsConfirmNum || '-'}</td></tr>
            <tr><td><strong>발행일시</strong></td><td>${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
          </table>
          <p>팝빌에서 상세 내역을 확인할 수 있습니다.</p>
        `;

        // 수신자 목록: mkt@howlab.co.kr + 기업 이메일(있는 경우)
        const recipients = ['mkt@howlab.co.kr'];
        if (invoiceData.email) {
          recipients.push(invoiceData.email);
        }

        await transporter.sendMail({
          from: `"CNECBIZ 세금계산서" <${gmailEmail}>`,
          to: recipients.join(', '),
          subject: emailSubject,
          html: emailHtml
        });

        console.log('✅ [STEP 5] 이메일 알림 발송 완료 -', recipients.join(', '));
      } else {
        console.log('⚠️ [STEP 5] GMAIL_APP_PASSWORD 미설정 - 이메일 발송 생략');
      }
    } catch (emailError) {
      console.error('❌ [STEP 5] 이메일 발송 실패:', emailError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '세금계산서 수동 발행 완료',
        ntsConfirmNum: result.ntsConfirmNum,
        mgtKey: mgtKey,
        issuedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('\n❌ ========== 오류 발생 ==========');
    console.error('❌ [ERROR] Name:', error.name);
    console.error('❌ [ERROR] Message:', error.message);
    console.error('❌ [ERROR] Code:', error.code);
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
