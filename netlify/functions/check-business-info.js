const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.VITE_SUPABASE_BIZ_URL,
  process.env.VITE_SUPABASE_BIZ_ANON_KEY
);

console.log('🔧 [INIT] POPBILL_LINK_ID:', process.env.POPBILL_LINK_ID);
console.log('🔧 [INIT] POPBILL_TEST_MODE:', process.env.POPBILL_TEST_MODE);
console.log('🔧 [INIT] POPBILL_CORP_NUM:', process.env.POPBILL_CORP_NUM);
console.log('🔧 [INIT] POPBILL_SECRET_KEY exists:', !!process.env.POPBILL_SECRET_KEY);

// 팝빌 전역 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID || 'HOWLAB',
  SecretKey: process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=',
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true,
  defaultErrorHandler: function (Error) {
    console.log('❌ [POPBILL] Error: [' + Error.code + '] ' + Error.message);
  }
});

// 팔빌 휴폐업 조회 서비스 객체 생성
const closedownService = popbill.ClosedownService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';

console.log('✅ [INIT] Popbill Closedown service initialized');
console.log('✅ [INIT] Supabase client initialized');

/**
 * 회사명 정규화 함수
 */
function normalizeCompanyName(name) {
  if (!name) return '';
  
  let normalized = name.trim();
  normalized = normalized.replace(/\((주)\)/g, '주식회사');
  normalized = normalized.replace(/^(주식회사)\s*(.+)$/, '$2 주식회사');
  normalized = normalized.replace(/\s+/g, '');
  normalized = normalized.replace(/[^\uac00-\ud7a3a-zA-Z0-9]/g, '');
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * 회사명 유사도 체크
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
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

// Force redeploy - Fixed maybeSingle issue - 2025-11-28
exports.handler = async (event, context) => {
  console.log('📊 ========== 기업정보 조회 시작 ==========');
  console.log('🔧 [DEBUG] HTTP Method:', event.httpMethod);
  console.log('🔧 [DEBUG] Request Body:', event.body);

  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ OPTIONS 요청 처리');
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const { businessNumber, ceoName, companyName } = JSON.parse(event.body);

    console.log('🔍 [STEP 1] 입력 데이터 검증');
    console.log('  - 사업자번호:', businessNumber);
    console.log('  - 대표자명:', ceoName);
    console.log('  - 회사명:', companyName);

    if (!businessNumber) {
      console.error('❌ 사업자번호 누락');
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
      console.error('❌ 대표자명 누락');
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
      console.error('❌ 회사명 누락');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '회사명을 입력해주세요.' 
        }),
      };
    }

    // 사업자등록번호 포맷팅
    const formattedBusinessNumber = businessNumber.replace(/-/g, '');
    console.log('✅ [STEP 1] 입력 데이터 검증 완료');
    console.log('  - 포맷된 사업자번호:', formattedBusinessNumber);

    // 1. Supabase에서 중복 체크 (중복 허용 - 같은 사업자번호로 여러 회사 가입 가능)
    console.log('🔍 [STEP 2] Supabase 중복 체크 시작...');
    const { data: existingCompanies, error: dbError } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('business_registration_number', formattedBusinessNumber);

    if (dbError) {
      console.error('❌ [STEP 2] Supabase 오류:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: '서버 오류가 발생했습니다.',
          details: dbError.message
        }),
      };
    }

    // 중복 허용: 같은 사업자번호로 여러 회사가 가입 가능
    if (existingCompanies && existingCompanies.length > 0) {
      console.log(`⚠️ [STEP 2] 기존 가입 회사 ${existingCompanies.length}개 발견 (중복 허용):`, existingCompanies.map(c => c.company_name));
    }

    console.log('✅ [STEP 2] 중복 체크 통과 (중복 허용)');

    // 2. 팔빌 휴폐업 조회 API 호출
    console.log('🔍 [STEP 3] 팔빌 휴폐업 조회 API 호출 시작...');
    console.log('  - MemberCorpNum:', POPBILL_CORP_NUM);
    console.log('  - CheckCorpNum:', formattedBusinessNumber);

    let closedownInfo;
    try {
      closedownInfo = await new Promise((resolve, reject) => {
        console.log('  - checkCorpNum 함수 호출 중...');
        
        closedownService.checkCorpNum(
          POPBILL_CORP_NUM,
          formattedBusinessNumber,
          (result) => {
            console.log('✅ [STEP 3] 팔빌 API 성공:', JSON.stringify(result, null, 2));
            resolve(result);
          },
          (error) => {
            console.error('❌ [STEP 3] 팔빌 API 오류:', error);
            console.error('  - Error code:', error.code);
            console.error('  - Error message:', error.message);
            console.error('  - Full error:', JSON.stringify(error, null, 2));
            reject(error);
          }
        );
      });
    } catch (popbillError) {
      console.error('❌ [STEP 3] 팔빌 API 호출 실패:', popbillError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '휴폐업 조회에 실패했습니다. 사업자등록번호를 확인해주세요.',
          details: popbillError.message || popbillError.toString(),
          errorCode: popbillError.code
        }),
      };
    }

    // 3. 휴폐업 상태 확인 (대표자명, 회사명 검증 제거)
    console.log('🔍 [STEP 4] 휴폐업 상태 확인...');
    console.log('  - state:', closedownInfo.state);
    console.log('  - state type:', typeof closedownInfo.state);
    console.log('  - stateDate:', closedownInfo.stateDate);
    console.log('  - type:', closedownInfo.type);
    console.log('  - corpNum:', closedownInfo.corpNum);
    console.log('  - corpName:', closedownInfo.corpName);

    // 휴폐업 조회 API state 필드:
    // 0 = 국세청 미등록 (존재하지 않는 사업자번호)
    // 1 = 사업중 (정상)
    // 2 = 휴업
    // 3 = 폐업
    
    // state가 정확히 1인 경우만 통과
    const stateValue = String(closedownInfo.state);
    
    if (stateValue === '0') {
      console.error('❌ [STEP 4] 국세청 미등록 사업자');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '국세청에 등록되지 않은 사업자등록번호입니다.',
        }),
      };
    }
    
    if (stateValue === '3') {
      console.error('❌ [STEP 4] 폐업 사업자');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '폐업한 사업자입니다.',
        }),
      };
    }

    if (stateValue === '2') {
      console.error('❌ [STEP 4] 휴업 사업자');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '휴업 중인 사업자입니다.',
        }),
      };
    }
    
    if (stateValue !== '1') {
      console.error('❌ [STEP 4] 알 수 없는 사업자 상태:', stateValue);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사업자 상태를 확인할 수 없습니다. 사업자등록번호를 다시 확인해주세요.',
        }),
      };
    }

    console.log('✅ [STEP 4] 휴폐업 상태 확인 통과 (사업중)');

    // 4. 검증 로그 저장
    console.log('🔍 [STEP 5] 검증 로그 저장...');
    try {
      await supabase.from('verification_logs').insert({
        business_number: formattedBusinessNumber,
        ceo_name: ceoName,
        verification_method: 'popbill_closedown',
        verification_result: 'success',
        verification_data: {
          corpNum: closedownInfo.corpNum,
          corpName: closedownInfo.corpName,
          state: closedownInfo.state,
          stateDate: closedownInfo.stateDate,
          type: closedownInfo.type,
        },
      });
      console.log('✅ [STEP 5] 로그 저장 완료');
    } catch (logError) {
      console.error('⚠️ [STEP 5] 로그 저장 실패 (무시):', logError);
    }

    // 5. 성공 응답
    console.log('📊 ========== 기업정보 조회 성공 ==========');
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
    console.error('❌ ========== 예상치 못한 오류 ==========');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Full error:', JSON.stringify(error, null, 2));
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '기업정보 조회 중 오류가 발생했습니다.',
        details: error.message,
        errorName: error.name,
        stack: error.stack
      }),
    };
  }
};
