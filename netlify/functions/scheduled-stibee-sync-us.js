/**
 * 구글 시트 → 스티비 주소록 자동 싱크 (미국용)
 *
 * scheduled-stibee-sync.js와 동일한 로직이나 US 리전만 처리합니다.
 * 스케줄: 매일 오전 10시 EST (UTC 15:00)
 */

const { handler: mainHandler } = require('./scheduled-stibee-sync')

exports.handler = async (event) => {
  // US 리전만 처리하도록 body에 targetRegions 주입
  const modifiedEvent = {
    ...event,
    body: JSON.stringify({ targetRegions: ['us'] })
  }

  return mainHandler(modifiedEvent)
}
