const popbill = require('popbill');

// 팝빌 설정
popbill.config({
  LinkID: process.env.POPBILL_LINK_ID,
  SecretKey: process.env.POPBILL_SECRET_KEY,
  IsTest: process.env.POPBILL_TEST_MODE === 'true',
  IPRestrictOnOff: true,
  UseStaticIP: false,
  UseLocalTimeYN: true
});

const easyFinBankService = popbill.EasyFinBankService();

exports.handler = async (event, context) => {
  try {
    const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM;

    console.log('🔍 팝빌 계좌 목록 조회 시작...');
    console.log('사업자번호:', POPBILL_CORP_NUM);

    const accounts = await new Promise((resolve, reject) => {
      easyFinBankService.listBankAccount(
        POPBILL_CORP_NUM,
        null, // UserID
        (result) => {
          console.log('✅ 계좌 목록 조회 성공');
          resolve(result);
        },
        (error) => {
          console.error('❌ 계좌 목록 조회 실패:', error);
          reject(error);
        }
      );
    });

    console.log('📋 등록된 계좌 목록:');
    accounts.forEach((account, index) => {
      console.log(`\n계좌 ${index + 1}:`);
      console.log('  - 은행코드:', account.bankCode);
      console.log('  - 계좌번호:', account.accountNumber);
      console.log('  - 계좌별칭:', account.accountName);
      console.log('  - 계좌유형:', account.accountType);
      console.log('  - 상태:', account.state);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        accounts: accounts
      })
    };
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
