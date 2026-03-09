const popbill = require('popbill');

const POPBILL_LINK_ID = process.env.POPBILL_LINK_ID || 'HOWLAB';
const POPBILL_SECRET_KEY = process.env.POPBILL_SECRET_KEY || '7UZg/CZJ4i7VDx49H27E+bczug5//kThjrjfEeu9JOk=';
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_USER_ID = process.env.POPBILL_USER_ID || '';

popbill.config({
  LinkID: POPBILL_LINK_ID,
  SecretKey: POPBILL_SECRET_KEY,
  IsTest: false,
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

const kakaoService = popbill.KakaoService();

exports.handler = async (event) => {
  try {
    const { templateCode } = JSON.parse(event.body || '{}');

    if (!templateCode) {
      // 템플릿 코드 없으면 전체 목록 조회
      const templates = await new Promise((resolve, reject) => {
        kakaoService.listATSTemplate(
          POPBILL_CORP_NUM,
          POPBILL_USER_ID,
          (result) => resolve(result),
          (error) => reject(error)
        );
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, templates }, null, 2)
      };
    }

    // 특정 템플릿 조회
    const template = await new Promise((resolve, reject) => {
      kakaoService.getATSTemplate(
        POPBILL_CORP_NUM,
        templateCode,
        POPBILL_USER_ID,
        (result) => resolve(result),
        (error) => reject(error)
      );
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, template }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message || error })
    };
  }
};
