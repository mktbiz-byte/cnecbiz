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

/**
 * 회사명 정규화 함수
 * (주), 주식회사 등의 표기 차이를 통일하고 공백/특수문자 제거
 */
function normalizeCompanyName(name) {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // 1. (주) → 주식회사 변환
  normalized = normalized.replace(/\((주)\)/g, '주식회사');
  
  // 2. 주식회사를 앞으로 이동 ("주식회사 ABC" → "ABC 주식회사")
  normalized = normalized.replace(/^(주식회사)\s*(.+)$/, '$2 주식회사');
  
  // 3. 공백 제거
  normalized = normalized.replace(/\s+/g, '');
  
  // 4. 특수문자 제거 (한글, 영문, 숫자만 남김)
  normalized = normalized.replace(/[^\uac00-\ud7a3a-zA-Z0-9]/g, '');
  
  // 5. 소문자로 변환 (영문)
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * 회사명 유사도 체크
 * 정규화된 회사명을 비교하여 유사도 반환 (0~1)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  // Levenshtein Distance 기반 유사도
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 편집 거리 계산
  const editDistance = levenshteinDistance(longer, shorter);
  
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein Distance 계산
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

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
    const { businessNumber, ceoName, companyName } = JSON.parse(event.body);

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

    if (!companyName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '회사명을 입력해주세요.' 
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
          error: '입력하신 대표자명이 사업자등록증과 일치하지 않습니다.',
        }),
      };
    }

    // 4. 회사명 유사도 체크
    const inputCompanyName = normalizeCompanyName(companyName);
    const registeredCompanyName = normalizeCompanyName(bizInfo.corpName || '');

    console.log('회사명 비교:', { 
      input: companyName, 
      inputNormalized: inputCompanyName,
      registered: bizInfo.corpName,
      registeredNormalized: registeredCompanyName 
    });

    const similarity = calculateSimilarity(inputCompanyName, registeredCompanyName);
    console.log('회사명 유사도:', similarity);

    // 유사도 80% 이상이면 통과
    if (similarity < 0.8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `입력하신 회사명이 사업자등록증과 일치하지 않습니다. (등록된 회사명: ${bizInfo.corpName})`,
        }),
      };
    }

    // 5. 휴폐업 상태 확인 (corpCode 사용)
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

    // 6. 검증 성공
    console.log('사업자 정보 검증 성공');

    // 7. 검증 로그 저장 (선택사항)
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

    // 8. 성공 응답 (기업 정보는 보안상 최소한만 반환)
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
