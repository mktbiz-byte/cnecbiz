/**
 * 최소한의 테스트 함수
 */

exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, test: 'minimal', timestamp: new Date().toISOString() })
  };
};
