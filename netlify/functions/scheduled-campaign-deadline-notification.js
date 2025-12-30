/**
 * 매일 오전 10시(한국시간) 실행 - 캠페인 모집 마감 알림
 * Netlify Scheduled Function
 *
 * Cron: 0 1 * * * (UTC 1시 = 한국시간 10시)
 *
 * 기능:
 * - 오늘이 모집 마감일(application_deadline)인 캠페인 조회
 * - 해당 캠페인의 기업에게 카카오톡 알림 발송
 * - 템플릿: 025100001006 (모집 마감 크리에이터 선정 요청)
 */

const { createClient } = require('@supabase/supabase-js');
const popbill = require('popbill');

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

const kakaoService = popbill.KakaoService();
const POPBILL_CORP_NUM = process.env.POPBILL_CORP_NUM || '5758102253';
const POPBILL_SENDER_NUM = process.env.POPBILL_SENDER_NUM || '1833-6025';

// Supabase 클라이언트 초기화
const createSupabaseClient = () => {
  if (process.env.VITE_SUPABASE_KOREA_URL && process.env.VITE_SUPABASE_KOREA_ANON_KEY) {
    return createClient(
      process.env.VITE_SUPABASE_KOREA_URL,
      process.env.VITE_SUPABASE_KOREA_ANON_KEY
    );
  }
  return null;
};

// 카카오톡 알림 발송 함수
const sendKakaoNotification = (receiverNum, receiverName, templateCode, variables) => {
  return new Promise((resolve, reject) => {
    const templateContent = `[CNEC] 신청하신 캠페인 모집 마감
#{회사명}님, 신청하신 캠페인의 크리에이터 모집이 마감되었습니다.
캠페인: #{캠페인명}
지원 크리에이터: #{지원자수}명
관리자 페이지에서 지원한 크리에이터 리스트를 확인하시고, 최종 선정을 진행해 주세요.
문의: 1833-6025`;

    // 변수 치환
    let content = templateContent;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
    }

    kakaoService.sendATS(
      POPBILL_CORP_NUM,
      templateCode,
      POPBILL_SENDER_NUM,
      content,
      '',  // altContent
      '',  // altSendType
      receiverNum,
      receiverName,
      '',  // sndDT (즉시 발송)
      '',  // requestNum
      '',  // userID
      null,  // btns
      (result) => {
        console.log(`카카오 알림톡 발송 성공: ${receiverNum}`, result);
        resolve(result);
      },
      (error) => {
        console.error(`카카오 알림톡 발송 실패: ${receiverNum}`, error);
        reject(error);
      }
    );
  });
};

// 메인 핸들러
exports.handler = async (event, context) => {
  console.log('=== 캠페인 모집 마감 알림 스케줄러 시작 ===');
  console.log('실행 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase 클라이언트 초기화 실패');
    }

    // 오늘 날짜 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const today = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('오늘 날짜 (한국시간):', today);

    // 오늘이 모집 마감일인 캠페인 조회
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id,
        title,
        brand,
        product_name,
        company_id,
        company_email,
        application_deadline,
        status
      `)
      .eq('application_deadline', today)
      .in('status', ['active', 'recruiting', 'approved']);

    if (campaignError) {
      throw campaignError;
    }

    console.log(`오늘 마감되는 캠페인 수: ${campaigns?.length || 0}`);

    if (!campaigns || campaigns.length === 0) {
      console.log('오늘 마감되는 캠페인이 없습니다.');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: '오늘 마감되는 캠페인이 없습니다.' })
      };
    }

    const results = [];

    for (const campaign of campaigns) {
      try {
        console.log(`\n처리 중인 캠페인: ${campaign.title} (ID: ${campaign.id})`);

        // 해당 캠페인의 지원자 수 조회
        const { count: applicantCount, error: countError } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id);

        if (countError) {
          console.error(`지원자 수 조회 실패 (캠페인 ${campaign.id}):`, countError);
          continue;
        }

        console.log(`지원자 수: ${applicantCount || 0}명`);

        // 기업 정보 조회 (전화번호, 회사명)
        let companyPhone = null;
        let companyName = campaign.brand || '기업';

        if (campaign.company_id) {
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('company_name, phone, representative_phone')
            .eq('user_id', campaign.company_id)
            .single();

          if (!companyError && company) {
            companyPhone = company.phone || company.representative_phone;
            companyName = company.company_name || campaign.brand || '기업';
          }
        }

        // 회사 전화번호가 없으면 user_profiles에서 조회
        if (!companyPhone && campaign.company_id) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('id', campaign.company_id)
            .single();

          if (!profileError && profile) {
            companyPhone = profile.phone;
          }
        }

        if (!companyPhone) {
          console.log(`전화번호 없음 - 캠페인: ${campaign.title}, 회사: ${companyName}`);
          results.push({
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            status: 'skipped',
            reason: '전화번호 없음'
          });
          continue;
        }

        // 카카오톡 알림 발송
        const variables = {
          '회사명': companyName,
          '캠페인명': campaign.title,
          '지원자수': (applicantCount || 0).toString()
        };

        await sendKakaoNotification(
          companyPhone,
          companyName,
          '025100001006',
          variables
        );

        console.log(`알림 발송 완료: ${companyName} (${companyPhone})`);
        results.push({
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          companyName: companyName,
          applicantCount: applicantCount || 0,
          status: 'sent'
        });

      } catch (error) {
        console.error(`캠페인 처리 실패 (${campaign.id}):`, error);
        results.push({
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('\n=== 캠페인 모집 마감 알림 스케줄러 완료 ===');
    console.log('결과:', JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '캠페인 모집 마감 알림 발송 완료',
        processedCount: campaigns.length,
        results: results
      })
    };

  } catch (error) {
    console.error('스케줄러 오류:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '스케줄러 실행 실패',
        details: error.message
      })
    };
  }
};

// Netlify Scheduled Function 설정
exports.config = {
  schedule: '0 1 * * *'  // UTC 1시 = 한국시간 10시
};
