/**
 * 일일 보고서 디버그 함수
 */

exports.handler = async (event, context) => {
  try {
    console.log('✅ 함수 시작');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '일일 보고서 디버그 테스트 성공',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};
