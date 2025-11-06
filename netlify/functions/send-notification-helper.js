/**
 * 통합 알림 발송 헬퍼 Function
 * 카카오톡 알림톡 + 이메일을 한번에 발송
 */

const axios = require('axios')

/**
 * 알림 발송 (카카오톡 + 이메일)
 * @param {Object} params
 * @param {string} params.receiverNum - 수신자 전화번호
 * @param {string} params.receiverEmail - 수신자 이메일
 * @param {string} params.receiverName - 수신자 이름
 * @param {string} params.templateCode - 카카오톡 템플릿 코드
 * @param {Object} params.variables - 템플릿 변수
 * @param {string} params.emailSubject - 이메일 제목
 * @param {string} params.emailHtml - 이메일 HTML 내용
 */
async function sendNotification({
  receiverNum,
  receiverEmail,
  receiverName,
  templateCode,
  variables,
  emailSubject,
  emailHtml
}) {
  const results = {
    kakao: null,
    email: null
  }

  // 1. 카카오톡 알림톡 발송
  if (receiverNum && templateCode) {
    try {
      const kakaoResponse = await axios.post(
        `${process.env.URL}/.netlify/functions/send-kakao-notification`,
        {
          receiverNum,
          receiverName,
          templateCode,
          variables
        }
      )
      results.kakao = { success: true, data: kakaoResponse.data }
      console.log('✓ 카카오톡 알림톡 발송 성공')
    } catch (kakaoError) {
      console.error('✗ 카카오톡 알림톡 발송 실패:', kakaoError.message)
      results.kakao = { success: false, error: kakaoError.message }
    }
  }

  // 2. 이메일 발송
  if (receiverEmail && emailSubject && emailHtml) {
    try {
      const emailResponse = await axios.post(
        `${process.env.URL}/.netlify/functions/send-email`,
        {
          to: receiverEmail,
          subject: emailSubject,
          html: emailHtml
        }
      )
      results.email = { success: true, data: emailResponse.data }
      console.log('✓ 이메일 발송 성공')
    } catch (emailError) {
      console.error('✗ 이메일 발송 실패:', emailError.message)
      results.email = { success: false, error: emailError.message }
    }
  }

  return results
}

/**
 * 이메일 HTML 생성 헬퍼
 */
function generateEmailHtml(templateCode, variables) {
  const templates = {
    // 기업용
    '025100000912': { // 회원가입
      subject: '[CNEC] 가입을 환영합니다',
      html: `
        <h2>가입을 환영합니다!</h2>
        <p>${variables['회원명']}님, CNEC BIZ에 가입해주셔서 감사합니다.</p>
        <p>앞으로도 많은 관심과 이용 부탁 드립니다.</p>
        <p>가입 후 기업 프로필을 설정해 주세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100000918': { // 캠페인 신청 및 입금 안내
      subject: '[CNEC] 포인트 충전 입금 안내',
      html: `
        <h2>포인트 충전 입금 안내</h2>
        <p>${variables['회사명']}님, ${variables['캠페인명']} 신청이 완료되었습니다.</p>
        <h3>입금 정보</h3>
        <ul>
          <li><strong>입금 계좌:</strong> 우리은행 1005-604-123456</li>
          <li><strong>예금주:</strong> (주)크넥코리아</li>
          <li><strong>입금 금액:</strong> ${variables['금액']}원</li>
        </ul>
        <p>입금 확인 후 캠페인이 승인됩니다.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100000943': { // 포인트 충전 완료
      subject: '[CNEC] 포인트 충전 완료',
      html: `
        <h2>포인트 충전 완료</h2>
        <p>${variables['회사명']}님, 포인트 충전이 완료되었습니다.</p>
        <ul>
          <li><strong>충전 포인트:</strong> ${variables['포인트']}P</li>
          ${variables['캠페인명'] ? `<li><strong>캠페인:</strong> ${variables['캠페인명']}</li>` : ''}
        </ul>
        <p>캠페인 진행에 사용하실 수 있습니다.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001005': { // 캠페인 승인 및 모집 시작
      subject: '[CNEC] 캠페인 승인 완료',
      html: `
        <h2>캠페인 승인 완료!</h2>
        <p>${variables['회사명']}님, ${variables['캠페인명']} 캠페인이 승인되었습니다!</p>
        <h3>캠페인 정보</h3>
        <ul>
          <li><strong>캠페인 기간:</strong> ${variables['시작일']} ~ ${variables['마감일']}</li>
          <li><strong>모집 인원:</strong> ${variables['모집인원']}명</li>
        </ul>
        <p>크리에이터 모집이 시작되었습니다. 대시보드에서 지원 현황을 확인하세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001006': { // 모집 마감 크리에이터 선정 요청
      subject: '[CNEC] 캠페인 모집 마감',
      html: `
        <h2>캠페인 모집 마감</h2>
        <p>${variables['회사명']}님, ${variables['캠페인명']} 캠페인 모집이 마감되었습니다.</p>
        <ul>
          <li><strong>총 지원자 수:</strong> ${variables['지원자수']}명</li>
        </ul>
        <p>대시보드에서 지원자를 확인하고 크리에이터를 선정해 주세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001010': { // 캠페인 검수 신청
      subject: '[CNEC] 캠페인 검수 신청 접수',
      html: `
        <h2>캠페인 검수 신청 접수</h2>
        <p>${variables['회사명']}님, ${variables['캠페인명']} 캠페인 검수 신청이 접수되었습니다.</p>
        <h3>캠페인 정보</h3>
        <ul>
          <li><strong>캠페인 기간:</strong> ${variables['시작일']} ~ ${variables['마감일']}</li>
          <li><strong>모집 인원:</strong> ${variables['모집인원']}명</li>
        </ul>
        <p>검수 완료 후 승인 여부를 알려드리겠습니다. (영업일 기준 1-2일 소요)</p>
        <p>문의: 1833-6025</p>
      `
    },
    
    // 크리에이터용
    '025100001022': { // 크리에이터 회원가입
      subject: '[CNEC] 크리에이터 가입을 환영합니다',
      html: `
        <h2>크리에이터 가입을 환영합니다!</h2>
        <p>${variables['이름']}님, CNEC 크리에이터로 가입해주셔서 감사합니다.</p>
        <p>앞으로도 많은 관심과 이용 부탁 드립니다.</p>
        <p>가입 후 크리에이터 프로필을 설정해 주세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001011': { // 캠페인 선정 완료
      subject: '[CNEC] 캠페인 선정 축하드립니다!',
      html: `
        <h2>캠페인 선정 축하드립니다!</h2>
        <p>${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인에 선정되셨습니다.</p>
        <p>대시보드에서 캠페인 상세 정보를 확인하고 준비를 시작해 주세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001018': { // 캠페인 완료 포인트 지급
      subject: '[CNEC] 캠페인 완료 및 포인트 지급',
      html: `
        <h2>캠페인 완료!</h2>
        <p>${variables['크리에이터명']}님, ${variables['캠페인명']} 캠페인이 완료되었습니다!</p>
        <ul>
          <li><strong>완료일:</strong> ${variables['완료일']}</li>
        </ul>
        <p>포인트가 지급되었습니다. 대시보드에서 확인하세요.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001019': { // 출금 접수 완료
      subject: '[CNEC] 출금 신청 접수',
      html: `
        <h2>출금 신청 접수</h2>
        <p>${variables['크리에이터명']}님, 출금 신청이 접수되었습니다.</p>
        <ul>
          <li><strong>출금 금액:</strong> ${variables['출금금액']}원</li>
          <li><strong>신청일:</strong> ${variables['신청일']}</li>
        </ul>
        <p>영업일 기준 3-5일 내 입금 예정입니다.</p>
        <p>문의: 1833-6025</p>
      `
    },
    '025100001020': { // 출금 완료
      subject: '[CNEC] 출금 완료',
      html: `
        <h2>출금 완료</h2>
        <p>${variables['크리에이터명']}님, 출금이 완료되었습니다.</p>
        <ul>
          <li><strong>입금일:</strong> ${variables['입금일']}</li>
        </ul>
        <p>계좌를 확인해 주세요. 감사합니다.</p>
        <p>문의: 1833-6025</p>
      `
    }
  }

  const template = templates[templateCode]
  if (!template) {
    return {
      subject: '[CNEC] 알림',
      html: '<p>알림이 도착했습니다.</p>'
    }
  }

  return template
}

module.exports = {
  sendNotification,
  generateEmailHtml
}
