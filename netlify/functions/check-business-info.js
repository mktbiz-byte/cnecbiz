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

// 팝빌 기업정보조회 서비스 객체 생성
const bizInfoCheckService = popbill.BizInfoCheckService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

console.log('Popbill BizInfoCheck service initialized successfully');
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
        body: JSON.stringify({ 
          success: false,
          error: '사업자등록번호를 입력해주세요.' 
        }),
      };
    }

    if (!ceoName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '대표자명을 입력해주세요.' 
        }),
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
        body: JSON.stringify({ 
          success: false,
          error: '서버 오류가 발생했습니다.' 
        }),
      };
    }

    if (existingCompany) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '이미 가입된 사업자등록번호입니다.',
        }),
      };
    }

    // 2. 팝빌 기업정보조회 API 호출
    console.log('팝빌 기업정보조회 API 호출 시작:', formattedBusinessNumber);
    console.log('POPBILL_CORP_NUM:', POPBILL_CORP_NUM);

    let bizInfo;
    try {
      bizInfo = await new Promise((resolve, reject) => {
        // checkBizInfo(MemberCorpNum, CheckCorpNum, successCallback, errorCallback)
        bizInfoCheckService.checkBizInfo(
          POPBILL_CORP_NUM,
          formattedBusinessNumber,
          (result) => {
            console.log('팝빌 기업정보조회 성공:', result);
            resolve(result);
          },
          (error) => {
            console.error('팝빌 기업정보조회 오류:', error);
            reject(error);
          }
        );
      });
    } catch (popbillError) {
      console.error('팝빌 API 호출 실패:', popbillError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '기업정보 조회에 실패했습니다. 사업자등록번호를 확인해주세요.',
          details: popbillError.message || popbillError.toString()
        }),
      };
    }

    // 3. 대표자명 일치 여부 확인
    const inputCeoName = ceoName.trim().replace(/\s+/g, ''); // 공백 제거
    const registeredCeoName = (bizInfo.CEOName || '').trim().replace(/\s+/g, ''); // 공백 제거

    console.log('대표자명 비교:', { input: inputCeoName, registered: registeredCeoName });

    if (inputCeoName !== registeredCeoName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '입력하신 정보가 사업자등록증과 일치하지 않습니다. 다시 확인해주세요.',
        }),
      };
    }

    // 4. 휴폐업 상태 확인 (corpCode 사용)
    // corpCode: 100=일반사업자, 101=신설회사, 102=외감, 110=거래소(상장), 111=거래소(관리), 등
    // 200=폐업, 300=휴업, 900=미정의, 999=기타
    if (bizInfo.corpCode === 200) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '폐업한 사업자입니다.',
        }),
      };
    }

    if (bizInfo.corpCode === 300) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '휴업 중인 사업자입니다.',
        }),
      };
    }

    // 5. 검증 성공
    console.log('사업자 정보 검증 성공');

    // 6. 검증 로그 저장 (선택사항)
    try {
      await supabase.from('verification_logs').insert({
        business_number: formattedBusinessNumber,
        ceo_name: ceoName,
        verification_method: 'popbill_bizinfocheck',
        verification_result: 'success',
        verification_data: {
          corpName: bizInfo.corpName,
          CEOName: bizInfo.CEOName,
          corpCode: bizInfo.corpCode,
        },
      });
    } catch (logError) {
      console.error('로그 저장 오류:', logError);
      // 로그 저장 실패는 무시
    }

    // 7. 성공 응답 (기업 정보는 보안상 최소한만 반환)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '사업자 정보가 확인되었습니다.',
        data: {
          businessNumber: formattedBusinessNumber,
          verified: true,
        },
      }),
    };
  } catch (error) {
    console.error('예상치 못한 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '기업정보 조회 중 오류가 발생했습니다.',
        details: error.message,
      }),
    };
  }
};
