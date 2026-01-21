/**
 * 일일 현황 리포트 - 최소 버전 테스트
 */

exports.handler = async (event) => {
  console.log('[일일리포트] 핸들러 시작');

  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: '테스트 성공', time: new Date().toISOString() })
    };
  } catch (error) {
    console.error('[일일리포트] 오류:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

exports.config = { schedule: '0 1 * * *' };
