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

// 하우랩 사업자번호
const HAULAB_CORP_NUM = process.env.POPBILL_HAULAB_CORP_NUM || '3768100944';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.VITE_SUPABASE_BIZ_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 하우랩 세금계산서 발행 API
 * POST /issue-tax-invoice-haulab
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
 *   "writeDate": "2026-01-23"  // 작성일자 (선택, 기본: 오늘)
 * }
 */
exports.handler = async (event) => {
  console.log('\n\n');
  console.log('📊 ========== [하우랩] 세금계산서 발행 시작 ==========');
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
    console.log('   - 공급자: 하우랩주식회사 (' + HAULAB_CORP_NUM + ')');
    console.log('   - 공급받는자:', invoiceData.companyName);
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

    // 3. 팝빌에서 공급자(하우랩) 사업자 정보 조회
    console.log('🔍 [STEP 2] 팝빌 등록 사업자 정보 조회...');

    let corpInfo = null;
    try {
      corpInfo = await new Promise((resolve, reject) => {
        taxinvoiceService.getCorpInfo(HAULAB_CORP_NUM,
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
      console.warn('⚠️ 팝빌 사업자 정보 조회 실패, 환경변수/기본값 사용');
    }

    // 4. 팝빌 세금계산서 객체 생성
    console.log('🔍 [STEP 3] 팝빌 세금계산서 객체 생성...');

    // MgtKey(문서번호) 생성: L=하우랩 구분용
    const generateMgtKey = () => {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '') // HHMMSS
      const random = Math.random().toString(36).substring(2, 6).toUpperCase() // 4자리 랜덤
      return `L${dateStr}${timeStr}${random}` // 총 19자 (L=Lab/하우랩 구분용)
    }

    const mgtKey = generateMgtKey()
    console.log('   - 문서번호(MgtKey):', mgtKey)

    // 공급자 정보: 팝빌 등록 정보 > 환경변수 > 기본값 순서로 적용
    const invoicerCorpName = corpInfo?.corpName || process.env.POPBILL_HAULAB_CORP_NAME || '하우랩주식회사';
    const invoicerCEOName = corpInfo?.ceoname || process.env.POPBILL_HAULAB_CEO_NAME || '박현용';
    const invoicerAddr = corpInfo?.addr || process.env.POPBILL_HAULAB_ADDR || '';
    const invoicerBizClass = corpInfo?.bizClass || process.env.POPBILL_HAULAB_BIZ_CLASS || '';
    const invoicerBizType = corpInfo?.bizType || process.env.POPBILL_HAULAB_BIZ_TYPE || '';
    const invoicerEmail = process.env.POPBILL_HAULAB_EMAIL || 'mkt@howlab.co.kr';
    const invoicerTEL = process.env.POPBILL_HAULAB_TEL || '1833-6025';

    console.log('   - 공급자 상호:', invoicerCorpName);
    console.log('   - 공급자 대표자:', invoicerCEOName);
    console.log('   - 공급자 주소:', invoicerAddr);

    const taxinvoice = {
      // 문서번호 (필수)
      invoicerMgtKey: mgtKey,

      // 기본 정보
      writeDate: invoiceWriteDate.replace(/-/g, ''), // YYYYMMDD
      chargeDirection: '정과금',
      issueType: '정발행',
      purposeType: '영수',
      taxType: '과세',

      // 공급자 정보 (팝빌 등록 정보 기반)
      invoicerCorpNum: HAULAB_CORP_NUM,
      invoicerCorpName: invoicerCorpName,
      invoicerCEOName: invoicerCEOName,
      invoicerAddr: invoicerAddr,
      invoicerBizClass: invoicerBizClass,
      invoicerBizType: invoicerBizType,
      invoicerContactName: '관리자',
      invoicerEmail: invoicerEmail,
      invoicerTEL: invoicerTEL,

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
          itemName: itemName || '크리에이터 마케팅 서비스',
          spec: '',
          qty: '1',
          unitCost: supplyCostTotal.toString(),
          supplyCost: supplyCostTotal.toString(),
          tax: taxTotal.toString(),
          remark: ''
        }
      ],

      // 비고
      remark1: memo || '하우랩 세금계산서',
      remark2: '',
      remark3: ''
    };

    console.log('✅ [STEP 3] 팝빌 세금계산서 객체 생성 완료');

    // 5. 팝빌 API 호출 - 즉시 발행 (RegistIssue)
    console.log('🔍 [STEP 4] 팝빌 API 호출 - 즉시 발행...');
    console.log('   - 공급자 사업자번호:', HAULAB_CORP_NUM);
    console.log('   - 공급받는자:', taxinvoice.invoiceeCorpName);
    console.log('   - 합계:', taxinvoice.totalAmount, '원');

    const result = await new Promise((resolve, reject) => {
      taxinvoiceService.registIssue(
        HAULAB_CORP_NUM,    // 하우랩 사업자번호로 발행
        taxinvoice,
        false,  // 거래명세서 동시작성 여부
        '하우랩 세금계산서 발행',  // 메모
        false,  // 지연발행 가능여부
        null,   // 거래명세서 문서번호
        '세금계산서가 발행되었습니다',  // 이메일 제목
        'howlab_biz',   // UserID - 하우랩 회원 ID
        (result) => {
          console.log('✅ [STEP 4] 팝빌 API 호출 성공!');
          console.log('   - 국세청 승인번호:', result.ntsConfirmNum);
          resolve(result);
        },
        (error) => {
          console.error('❌ [STEP 4] 팝빌 API 호출 실패:', {
            code: error.code,
            message: error.message
          });
          reject(error);
        }
      );
    });

    // 5. 발행 기록 저장
    console.log('🔍 [STEP 4] 발행 기록 저장...');

    const insertData = {
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
      item_name: itemName || '크리에이터 마케팅 서비스',
      memo: memo || null,
      write_date: invoiceWriteDate,
      nts_confirm_num: result.ntsConfirmNum,
      issued_at: new Date().toISOString(),
      status: 'issued',
      issuer: 'haulab'
    };

    // issuer 컬럼이 있으면 포함, 없으면 제외하고 저장
    let { error: insertError } = await supabaseAdmin
      .from('manual_tax_invoices')
      .insert(insertData);

    if (insertError && insertError.message && insertError.message.includes('issuer')) {
      console.warn('⚠️ [STEP 4] issuer 컬럼 없음, issuer 제외하고 재시도...');
      const { issuer, ...dataWithoutIssuer } = insertData;
      const { error: retryError } = await supabaseAdmin
        .from('manual_tax_invoices')
        .insert(dataWithoutIssuer);

      if (retryError) {
        console.error('⚠️ [STEP 4] 발행 기록 저장 실패:', retryError);
      } else {
        console.log('✅ [STEP 4] 발행 기록 저장 완료 (issuer 없이)');
      }
    } else if (insertError) {
      console.error('⚠️ [STEP 4] 발행 기록 저장 실패:', insertError);
    } else {
      console.log('✅ [STEP 4] 발행 기록 저장 완료');
    }

    console.log('\n✅ [COMPLETE] 하우랩 세금계산서 발행 완료!');
    console.log('   - 국세청 승인번호:', result.ntsConfirmNum);

    // 6. 이메일 알림 발송
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

        const emailSubject = `[하우랩 세금계산서] ${invoiceData.companyName} - ${totalAmount.toLocaleString()}원`;
        const emailHtml = `
          <h2>하우랩 세금계산서가 발행되었습니다</h2>
          <table border="1" cellpadding="10" style="border-collapse: collapse;">
            <tr><td><strong>공급자</strong></td><td>하우랩주식회사 (${HAULAB_CORP_NUM})</td></tr>
            <tr><td><strong>공급받는자</strong></td><td>${invoiceData.companyName}</td></tr>
            <tr><td><strong>사업자번호</strong></td><td>${invoiceData.businessNumber}</td></tr>
            <tr><td><strong>공급가액</strong></td><td>${supplyCostTotal.toLocaleString()}원</td></tr>
            <tr><td><strong>세액</strong></td><td>${taxTotal.toLocaleString()}원</td></tr>
            <tr><td><strong>합계</strong></td><td>${totalAmount.toLocaleString()}원</td></tr>
            <tr><td><strong>품목</strong></td><td>${itemName || '크리에이터 마케팅 서비스'}</td></tr>
            <tr><td><strong>국세청 승인번호</strong></td><td>${result.ntsConfirmNum || '-'}</td></tr>
            <tr><td><strong>발행일시</strong></td><td>${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
          </table>
        `;

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

        console.log('✅ 이메일 발송 완료 -', recipients.join(', '));
      }
    } catch (emailError) {
      console.error('❌ 이메일 발송 실패:', emailError.message);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '하우랩 세금계산서 발행 완료',
        ntsConfirmNum: result.ntsConfirmNum,
        mgtKey: mgtKey,
        issuedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('\n❌ [하우랩 세금계산서] 오류:', error.message, error.code);

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
