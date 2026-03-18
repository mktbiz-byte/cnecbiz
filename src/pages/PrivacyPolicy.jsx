import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <img src="/cnec-logo.svg" alt="CNEC" className="h-8" onError={(e) => { e.target.style.display = 'none' }} />
            <span className="text-2xl font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>CNEC</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
          <p className="text-sm text-gray-500">주식회사 하우파파 (HOWPAPA Inc.)</p>
        </div>

        {/* 본문 */}
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <p className="mb-4">
              HOWPAPA(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (개인정보의 처리 목적)</h2>
            <p className="mb-2">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적</li>
              <li><strong>재화 또는 서비스 제공:</strong> 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공, 맞춤 서비스 제공, 본인인증, 요금결제·정산</li>
              <li><strong>마케팅 및 광고에의 활용:</strong> 신규 서비스(제품) 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한 통계</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <p className="mb-2">
              ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <p className="mb-2">
              ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지. 다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지</li>
                  <li>플랫폼 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계 정산 시까지</li>
                </ul>
              </li>
              <li><strong>재화 또는 서비스 제공:</strong> 재화·서비스 공급완료 및 요금결제·정산 완료 시까지. 다만, 다음의 사유에 해당하는 경우에는 해당 기간 종료 시까지
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>「전자상거래 등에서의 소비자 보호에 관한 법률」에 따른 표시·광고, 계약내용 및 이행 등 거래에 관한 기록: 5년</li>
                  <li>「전자상거래 등에서의 소비자 보호에 관한 법률」에 따른 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  <li>「통신비밀보호법」에 따른 로그인 기록: 3개월</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (처리하는 개인정보의 항목)</h2>
            <p className="mb-2">
              회사는 다음의 개인정보 항목을 처리하고 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>필수항목:</strong> 이메일, 비밀번호, 이름, 전화번호, 생년월일, 성별</li>
              <li><strong>선택항목:</strong> 주소, 프로필 사진, SNS 계정 정보</li>
              <li><strong>크리에이터 추가 정보:</strong> 채널 URL, 구독자 수, 평균 조회수, 포트폴리오</li>
              <li><strong>광고주 추가 정보:</strong> 회사명, 사업자등록번호, 담당자 정보</li>
              <li><strong>자동 수집 정보:</strong> IP주소, 쿠키, MAC주소, 서비스 이용 기록, 방문 기록, 불량 이용 기록 등</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <p className="mb-2">
              ① 회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
            </p>
            <p className="mb-2">
              ② 회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
              <li><strong>제공받는 자:</strong> 캠페인 참여 광고주 및 크리에이터</li>
              <li><strong>제공 목적:</strong> 캠페인 진행 및 콘텐츠 제작</li>
              <li><strong>제공 항목:</strong> 이름, 연락처, 이메일, 채널 정보</li>
              <li><strong>보유 및 이용 기간:</strong> 캠페인 종료 후 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (개인정보처리의 위탁)</h2>
            <p className="mb-2">
              ① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>결제 처리:</strong> 토스페이먼츠, 나이스페이먼츠 등 PG사</li>
              <li><strong>이메일 발송:</strong> AWS SES, SendGrid 등</li>
              <li><strong>SMS 발송:</strong> 알리고, 카카오 알림톡</li>
              <li><strong>클라우드 서비스:</strong> AWS, Supabase</li>
            </ul>
            <p className="mt-2">
              ② 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (정보주체의 권리·의무 및 그 행사방법)</h2>
            <p className="mb-2">
              ① 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>개인정보 열람요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제요구</li>
              <li>처리정지 요구</li>
            </ul>
            <p className="mt-2">
              ② 제1항에 따른 권리 행사는 회사에 대해 「개인정보 보호법」 시행규칙 별지 제8호 서식에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (개인정보의 파기)</h2>
            <p className="mb-2">
              ① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>
            <p className="mb-2">
              ② 개인정보 파기의 절차 및 방법은 다음과 같습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>파기절차:</strong> 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
              <li><strong>파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (개인정보의 안전성 확보 조치)</h2>
            <p className="mb-2">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
              <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
              <li>물리적 조치: 전산실, 자료보관실 등의 접근통제</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (개인정보 보호책임자)</h2>
            <p className="mb-2">
              ① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="mb-1"><strong>▶ 개인정보 보호책임자</strong></p>
              <p>성명: 이지훈</p>
              <p>직책: 개인정보관리책임자</p>
              <p>연락처: 1833-6025</p>
              <p>이메일: howpapa@howpapa.co.kr</p>
            </div>
            <p className="mt-3">
              ② 정보주체께서는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 회사는 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (개인정보 열람청구)</h2>
            <p>
              정보주체는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mt-2">
              <p className="mb-1"><strong>▶ 개인정보 열람청구 접수·처리 부서</strong></p>
              <p>부서명: 고객지원팀</p>
              <p>연락처: 1833-6025</p>
              <p>이메일: howpapa@howpapa.co.kr</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제11조 (권익침해 구제방법)</h2>
            <p className="mb-2">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
              <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제12조 (개인정보 처리방침 변경)</h2>
            <p>
              ① 이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제13조 (Meta 광고 데이터 수집 및 활용)</h2>
            <p>
              회사는 서비스 제공을 위해 Meta(Facebook/Instagram) Marketing API를 통해 사용자가 동의한 광고 계정의 성과 데이터(노출수, 클릭수, CTR, CPC, ROAS 등)를 수집합니다. 수집된 데이터는 광고 효율 분석 대시보드 제공 목적으로만 사용되며, 제3자에게 판매되거나 공유되지 않습니다. 사용자는 언제든지 Meta 계정 연동을 해제하여 데이터 수집을 중단할 수 있습니다.
            </p>
          </section>

          {/* 시행일 + 홈 버튼 */}
          <div className="mt-10 pt-8 border-t border-gray-200 text-center space-y-6">
            <p className="text-sm text-gray-600">
              <strong>시행일:</strong> 본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#6C5CE7' }}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
