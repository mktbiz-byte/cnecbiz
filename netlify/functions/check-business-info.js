const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.VITE_SUPABASE_BIZ_ANON_KEY
);

console.log('POPBILL_LINK_ID:', process.env.POPBILL_LINK_ID);
console.log('POPBILL_TEST_MODE:', process.env.POPBILL_TEST_MODE);
console.log('POPBILL_CORP_NUM:', process.env.POPBILL_CORP_NUM);

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('Popbill Error: [' + Error.code + '] ' + Error.message);
  }
});

// UserID 기본값 설정
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || 'cnecbiz';

// 팝빌 사업자등록상태조회 서비스 객체 생성
const closedownService = popbill.ClosedownService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

console.log('Popbill service initialized successfully');

console.log('Supabase client initialized');

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  console.log('Function invoked: POST /.netlify/functions/check-business-info');

  try {
    const { businessNumber, ceoName } = JSON.parse(event.body);

    if (!businessNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '사업자등록번호를 입력해주세요.' }),
      };
    }

    // 사업자등록번호 포맷팅 (하이픈 제거)
    const formattedBusinessNumber = businessNumber.replace(/-/g, '');

    // 1. Supabase에서 중복 체크
    const { data: existingCompany, error: dbError } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('business_registration_number', formattedBusinessNumber)
      .maybeSingle();

    if (dbError) {
      console.error('서버 오류:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      };
    }

    if (existingCompany) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '이미 가입된 사업자등록번호입니다.',
          companyName: existingCompany.company_name,
        }),
      };
    }

    // 2. 팝빌 사업자등록상태조회 API 호출
    console.log('팝빌 API 호출 시작:', formattedBusinessNumber);

    const result = await new Promise((resolve, reject) => {
      closedownService.checkCorpNum(
        POPBILL_CORP_NUM,
        formattedBusinessNumber,
        POPBILL_USER_ID,
        (result) => {
          console.log('팝빌 API 성공:', result);
          resolve(result);
        },
        (error) => {
          console.error('팝빌 API 오류:', error);
          reject(error);
        }
      );
    });

    // 3. 사업자 상태 확인
    // state: "0" = 폐업, "1" = 계속사업자(정상), "2" = 휴업, "3" = 폐업예정
    if (result.state === '0' || result.state === '3') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '폐업 또는 폐업예정인 사업자입니다.',
        }),
      };
    }

    if (result.state === '2') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '휴업 중인 사업자입니다.',
        }),
      };
    }

    // 4. 검증 성공
    console.log('사업자 검증 성공');

    // 5. 검증 로그 저장 (선택사항)
    try {
      await supabase.from('verification_logs').insert({
        business_number: formattedBusinessNumber,
        ceo_name: ceoName || null,
        verification_method: 'popbill_closedown',
        verification_result: 'success',
        verification_data: result,
      });
    } catch (logError) {
      console.error('로그 저장 오류:', logError);
      // 로그 저장 실패는 무시
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '사업자 정보가 확인되었습니다.',
        data: {
          businessNumber: formattedBusinessNumber,
          state: result.state,
          stateText: result.state === '1' ? '정상' : '기타',
          type: result.type,
          taxType: result.taxType,
        },
      }),
    };
  } catch (error) {
    console.error('예상치 못한 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '기업정보 조회 중 오류가 발생했습니다.',
        details: error.message,
      }),
    };
  }
};

