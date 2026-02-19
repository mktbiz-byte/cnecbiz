// 비활성화됨 - 크롤링 시스템 삭제
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, message: 'Disabled' })
  }
}
