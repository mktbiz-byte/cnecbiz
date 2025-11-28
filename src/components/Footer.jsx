import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  return (
    <>
      <footer className="bg-gray-900 text-gray-300">
        {/* 메인 푸터 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 회사 정보 */}
            <div>
              <h3 className="text-white text-lg font-bold mb-4">CNEC (크넥)</h3>
              <p className="text-sm mb-2">
                <span className="font-semibold">상호:</span> HOWPAPA (하우파파)
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">대표자:</span> 박현용
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">사업자등록번호:</span> 575-81-02253
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">통신판매업 신고번호:</span> 2022-서울마포-3903호
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">주소:</span> 서울 마포구 백범로 31길 21 서울창업허브 별관 312호
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">고객센터:</span> 1833-6025
              </p>
              <p className="text-sm mb-2">
                <span className="font-semibold">이메일:</span> cnec@cnecbiz.com
              </p>
            </div>
            {/* 빠른 링크 */}
            <div>
              <h4 className="text-white font-semibold mb-4">서비스</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm hover:text-white transition">
                    홈
                  </Link>
                </li>
                <li>
                  <Link to="/company/dashboard" className="text-sm hover:text-white transition">
                    기업 대시보드
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* 하단 바 */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              {/* 저작권 */}
              <div className="text-sm text-gray-400">
                © {new Date().getFullYear()} CNEC Corporation. All Rights Reserved.
              </div>
              {/* 법적 링크 */}
              <div className="flex space-x-6">
                <button 
                  onClick={() => setShowTerms(true)}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  이용약관
                </button>
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="text-sm text-gray-400 hover:text-white transition font-semibold"
                >
                  개인정보처리방침
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 이용약관 모달 */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">이용약관</h2>
              <button 
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-lg font-bold mb-3">제1조 (목적)</h3>
                <p className="text-gray-700 leading-relaxed">
                  본 약관은 HOWPAPA(이하 "회사")가 운영하는 CNEC 플랫폼(이하 "플랫폼")에서 제공하는 인플루언서 마케팅 중개 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제2조 (정의)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  본 약관에서 사용하는 용어의 정의는 다음과 같습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>"플랫폼"이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
                  <li>"이용자"란 플랫폼에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
                  <li>"회원"이란 플랫폼에 개인정보를 제공하여 회원등록을 한 자로서, 플랫폼의 정보를 지속적으로 제공받으며, 플랫폼이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                  <li>"비회원"이란 회원에 가입하지 않고 플랫폼이 제공하는 서비스를 이용하는 자를 말합니다.</li>
                  <li>"크리에이터"란 플랫폼을 통해 광고주의 제품 또는 서비스를 홍보하는 콘텐츠를 제작하는 회원을 말합니다.</li>
                  <li>"광고주"란 플랫폼을 통해 크리에이터에게 제품 또는 서비스 홍보를 의뢰하는 회원을 말합니다.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제3조 (약관의 명시와 개정)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 플랫폼의 초기 화면에 게시합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ② 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「전자문서 및 전자거래기본법」, 「전자금융거래법」, 「전자서명법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「방문판매 등에 관한 법률」, 「소비자기본법」 등 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  ③ 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 플랫폼의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다. 다만, 이용자에게 불리하게 약관내용을 변경하는 경우에는 최소한 30일 이상의 사전 유예기간을 두고 공지합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제4조 (서비스의 제공 및 변경)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 다음과 같은 업무를 수행합니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>인플루언서 마케팅 캠페인 중개</li>
                  <li>크리에이터와 광고주 간의 매칭 서비스</li>
                  <li>콘텐츠 제작 및 업로드 관리</li>
                  <li>결제 및 정산 서비스</li>
                  <li>기타 회사가 정하는 업무</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-2">
                  ② 회사는 재화 또는 용역의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 또는 용역의 내용을 변경할 수 있습니다. 이 경우에는 변경된 재화 또는 용역의 내용 및 제공일자를 명시하여 현재의 재화 또는 용역의 내용을 게시한 곳에 즉시 공지합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제5조 (회원가입)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제6조 (회원 탈퇴 및 자격 상실)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ② 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>다른 사람의 플랫폼 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                  <li>플랫폼을 이용하여 법령 또는 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제7조 (개인정보보호)</h3>
                <p className="text-gray-700 leading-relaxed">
                  회사는 이용자의 개인정보 수집 시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다. 회사의 개인정보 처리에 관한 자세한 사항은 별도의 개인정보처리방침에 따릅니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제8조 (회사의 의무)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 본 약관이 정하는 바에 따라 지속적이고, 안정적으로 재화·용역을 제공하는데 최선을 다하여야 합니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  ② 회사는 이용자가 안전하게 인터넷 서비스를 이용할 수 있도록 이용자의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제9조 (이용자의 의무)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  이용자는 다음 행위를 하여서는 안 됩니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>신청 또는 변경 시 허위 내용의 등록</li>
                  <li>타인의 정보 도용</li>
                  <li>회사에 게시된 정보의 변경</li>
                  <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                  <li>회사 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 플랫폼에 공개 또는 게시하는 행위</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제10조 (손해배상)</h3>
                <p className="text-gray-700 leading-relaxed">
                  회사는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가 발생하더라도 동 손해가 회사의 고의 또는 중대한 과실로 인한 손해를 제외하고 이에 대하여 책임을 부담하지 아니합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제11조 (분쟁해결)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  ② 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제12조 (재판권 및 준거법)</h3>
                <p className="text-gray-700 leading-relaxed">
                  ① 회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 다만, 제소 당시 이용자의 주소 또는 거소가 분명하지 않거나 외국 거주자의 경우에는 민사소송법상의 관할법원에 제기합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mt-2">
                  ② 회사와 이용자 간에 제기된 전자상거래 소송에는 대한민국법을 적용합니다.
                </p>
              </section>

              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  <strong>시행일:</strong> 본 약관은 2024년 1월 1일부터 시행됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">개인정보처리방침</h2>
              <button 
                onClick={() => setShowPrivacy(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <section>
                <p className="text-gray-700 leading-relaxed mb-4">
                  HOWPAPA(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제1조 (개인정보의 처리 목적)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적</li>
                  <li><strong>재화 또는 서비스 제공:</strong> 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공, 맞춤 서비스 제공, 본인인증, 요금결제·정산</li>
                  <li><strong>마케팅 및 광고에의 활용:</strong> 신규 서비스(제품) 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한 통계</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제2조 (개인정보의 처리 및 보유 기간)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지. 다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지</li>
                      <li>플랫폼 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계 정산 시까지</li>
                    </ul>
                  </li>
                  <li><strong>재화 또는 서비스 제공:</strong> 재화·서비스 공급완료 및 요금결제·정산 완료 시까지. 다만, 다음의 사유에 해당하는 경우에는 해당 기간 종료 시까지
                    <ul className="list-circle list-inside ml-6 mt-1">
                      <li>「전자상거래 등에서의 소비자 보호에 관한 법률」에 따른 표시·광고, 계약내용 및 이행 등 거래에 관한 기록: 5년</li>
                      <li>「전자상거래 등에서의 소비자 보호에 관한 법률」에 따른 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                      <li>「통신비밀보호법」에 따른 로그인 기록: 3개월</li>
                    </ul>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제3조 (처리하는 개인정보의 항목)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  회사는 다음의 개인정보 항목을 처리하고 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>필수항목:</strong> 이메일, 비밀번호, 이름, 전화번호, 생년월일, 성별</li>
                  <li><strong>선택항목:</strong> 주소, 프로필 사진, SNS 계정 정보</li>
                  <li><strong>크리에이터 추가 정보:</strong> 채널 URL, 구독자 수, 평균 조회수, 포트폴리오</li>
                  <li><strong>광고주 추가 정보:</strong> 회사명, 사업자등록번호, 담당자 정보</li>
                  <li><strong>자동 수집 정보:</strong> IP주소, 쿠키, MAC주소, 서비스 이용 기록, 방문 기록, 불량 이용 기록 등</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제4조 (개인정보의 제3자 제공)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  ② 회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mt-2">
                  <li><strong>제공받는 자:</strong> 캠페인 참여 광고주 및 크리에이터</li>
                  <li><strong>제공 목적:</strong> 캠페인 진행 및 콘텐츠 제작</li>
                  <li><strong>제공 항목:</strong> 이름, 연락처, 이메일, 채널 정보</li>
                  <li><strong>보유 및 이용 기간:</strong> 캠페인 종료 후 3개월</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제5조 (개인정보처리의 위탁)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>결제 처리:</strong> 토스페이먼츠, 나이스페이먼츠 등 PG사</li>
                  <li><strong>이메일 발송:</strong> AWS SES, SendGrid 등</li>
                  <li><strong>SMS 발송:</strong> 알리고, 카카오 알림톡</li>
                  <li><strong>클라우드 서비스:</strong> AWS, Supabase</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-2">
                  ② 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제6조 (정보주체의 권리·의무 및 그 행사방법)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>개인정보 열람요구</li>
                  <li>오류 등이 있을 경우 정정 요구</li>
                  <li>삭제요구</li>
                  <li>처리정지 요구</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-2">
                  ② 제1항에 따른 권리 행사는 회사에 대해 「개인정보 보호법」 시행규칙 별지 제8호 서식에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제7조 (개인정보의 파기)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ② 개인정보 파기의 절차 및 방법은 다음과 같습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li><strong>파기절차:</strong> 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
                  <li><strong>파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제8조 (개인정보의 안전성 확보 조치)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                  <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                  <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제9조 (개인정보 보호책임자)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  ① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="text-gray-700 mb-1"><strong>▶ 개인정보 보호책임자</strong></p>
                  <p className="text-gray-700">성명: 박현용</p>
                  <p className="text-gray-700">직책: 대표이사</p>
                  <p className="text-gray-700">연락처: 1833-6025</p>
                  <p className="text-gray-700">이메일: cnec@cnecbiz.com</p>
                </div>
                <p className="text-gray-700 leading-relaxed mt-3">
                  ② 정보주체께서는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제10조 (개인정보 열람청구)</h3>
                <p className="text-gray-700 leading-relaxed">
                  정보주체는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mt-2">
                  <p className="text-gray-700 mb-1"><strong>▶ 개인정보 열람청구 접수·처리 부서</strong></p>
                  <p className="text-gray-700">부서명: 고객지원팀</p>
                  <p className="text-gray-700">연락처: 1833-6025</p>
                  <p className="text-gray-700">이메일: cnec@cnecbiz.com</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제11조 (권익침해 구제방법)</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
                  <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
                  <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
                  <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold mb-3">제12조 (개인정보 처리방침 변경)</h3>
                <p className="text-gray-700 leading-relaxed">
                  ① 이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </section>

              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  <strong>시행일:</strong> 본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
