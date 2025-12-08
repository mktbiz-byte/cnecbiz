/**
 * 일일 보고서 수동 테스트 함수
 */

const { handler: dailyReportHandler } = require('./scheduled-daily-report.js');

exports.handler = async (event, context) => {
  console.log('🧪 [TEST] 일일 보고서 수동 실행');
  
  try {
    const result = await dailyReportHandler(event, context);
    return result;
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
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
