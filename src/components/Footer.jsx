import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* 메인 푸터 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 회사 정보 */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-lg font-bold mb-4">CNEC Total</h3>
            <p className="text-sm mb-2">
              <span className="font-semibold">상호:</span> CNEC Total (크넥토탈)
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">대표자:</span> [대표자명]
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">사업자등록번호:</span> [사업자등록번호]
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">통신판매업 신고번호:</span> [통신판매업번호]
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">주소:</span> [사업장 주소]
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">고객센터:</span> [전화번호]
            </p>
            <p className="text-sm mb-2">
              <span className="font-semibold">이메일:</span> contact@cnectotal.com
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
              <li>
                <Link to="/creator/apply" className="text-sm hover:text-white transition">
                  크리에이터 신청
                </Link>
              </li>
            </ul>
          </div>

          {/* 고객 지원 */}
          <div>
            <h4 className="text-white font-semibold mb-4">고객 지원</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="text-sm hover:text-white transition">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <a href="mailto:contact@cnectotal.com" className="text-sm hover:text-white transition">
                  문의하기
                </a>
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
              © {new Date().getFullYear()} CNEC Total. All Rights Reserved.
            </div>

            {/* 법적 링크 */}
            <div className="flex space-x-6">
              <Link 
                to="/terms" 
                className="text-sm text-gray-400 hover:text-white transition"
              >
                이용약관
              </Link>
              <Link 
                to="/privacy" 
                className="text-sm text-gray-400 hover:text-white transition font-semibold"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>

          {/* 추가 법적 고지 */}
          <div className="mt-4 text-xs text-gray-500">
            <p className="mb-2">
              CNEC Total은 통신판매중개자로서 통신판매의 당사자가 아니며, 
              판매자가 등록한 상품정보 및 거래에 대해 책임을 지지 않습니다.
            </p>
            <p>
              고객님의 안전거래를 위해 현금 등으로 결제 시 저희 쇼핑몰에서 가입한 
              구매안전서비스를 이용하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

