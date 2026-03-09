import { useState, useEffect } from 'react'
import { X, MessageCircle, Sparkles, ArrowRight, CheckCircle2, Phone, Mail, Building2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabaseBiz } from '../lib/supabaseClients'

export default function ConsultationBanner() {
  const location = useLocation()
  const isMainPage = location.pathname === '/'
  const isAdminPage = location.pathname.startsWith('/admin')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseBiz.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()

    // 로그인 상태 변경 감지
    const { data: { subscription } } = supabaseBiz.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Listen for custom event from other components
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true)
    window.addEventListener('openConsultationModal', handleOpenModal)
    return () => window.removeEventListener('openConsultationModal', handleOpenModal)
  }, [])

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    brandName: '',
    services: [],
    otherService: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleServiceChange = (service) => {
    setFormData(prev => {
      const services = prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
      return { ...prev, services }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.phone) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }

    if (formData.services.length === 0) {
      alert('신청 서비스를 최소 1개 이상 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const servicesList = formData.services.map(s => {
        if (s === '기타' && formData.otherService) {
          return `기타: ${formData.otherService}`
        }
        return s
      }).join(', ')

      const { error: dbError } = await supabaseBiz
        .from('consultation_requests')
        .insert({
          company_name: formData.name,
          contact_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: `브랜드명: ${formData.brandName || '미입력'}\n신청 서비스: ${servicesList}`,
          status: 'pending'
        })

      if (dbError) {
        console.error('Supabase 저장 오류:', dbError)
      }

      const naverWorksResponse = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          channelId: 'b9387420-7c8d-e703-0f96-dbfc72565bb5',
          message: `🔔 새로운 상담 신청이 접수되었습니다!\n\n` +
                   `👤 상호명: ${formData.name}\n` +
                   `📞 연락처: ${formData.phone}\n` +
                   `📧 메일주소: ${formData.email}\n` +
                   `🏪 브랜드명: ${formData.brandName || '미입력'}\n` +
                   `📋 신청 서비스: ${servicesList}\n\n` +
                   `📌 상담 신청서를 확인해주세요.`
        })
      })

      const emailResponse = await fetch('/api/send-consultation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'MKT@HOWLAB.CO.KR',
          subject: `[CNEC] 새로운 상담 신청 - ${formData.name}`,
          html: `
            <h2>🔔 새로운 상담 신청이 접수되었습니다</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">상호명</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">연락처</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${formData.phone}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">메일주소</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${formData.email}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">브랜드명</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${formData.brandName || '미입력'}</td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 12px; border: 1px solid #dee2e6; font-weight: bold;">신청 서비스</td>
                <td style="padding: 12px; border: 1px solid #dee2e6;">${servicesList}</td>
              </tr>
            </table>
          `
        })
      })

      if (naverWorksResponse.ok || emailResponse.ok) {
        if (window.dataLayer) {
          window.dataLayer.push({
            'event': 'consultation_complete',
            'consultation_name': formData.name,
            'consultation_email': formData.email,
            'consultation_phone': formData.phone,
            'consultation_brand': formData.brandName,
            'consultation_services': servicesList
          })
        }

        if (window.fbq) {
          window.fbq('track', 'CompleteRegistration')
        }

        alert('상담 신청이 완료되었습니다!\n빠른 시일 내에 연락드리겠습니다.')
        setIsModalOpen(false)
        setFormData({
          name: '',
          phone: '',
          email: '',
          brandName: '',
          services: [],
          otherService: ''
        })
      } else {
        throw new Error('전송 실패')
      }
    } catch (error) {
      console.error('상담 신청 오류:', error)
      alert('상담 신청 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const services = [
    { id: 'shorts', label: '기획 숏츠 (릴스/틱톡/쇼츠)', desc: '추천 크리에이터 매칭' },
    { id: '4week', label: '4주 챌린지', desc: '리뷰 후기 4회 업로드' },
    { id: 'oliveyoung', label: '올영세일 패키지', desc: '세일 기간 집중 마케팅' },
    { id: 'voucher', label: '수출바우처', desc: '미국/일본 시장 진출' },
  ]

  return (
    <>
      {/* 플로팅 상담 버튼 - 우측 하단 (하단 바 위로 위치) - 관리자 페이지에서는 숨김 */}
      <div className={`fixed bottom-20 right-4 sm:right-6 lg:bottom-20 z-50 ${
        isAdminPage ? 'hidden' : isMainPage ? '' : 'hidden md:block'
      }`}>
        {isLoggedIn ? (
          // 로그인 상태: 카카오톡 채널 링크로 이동
          <a
            href="https://pf.kakao.com/_xgNdxlG"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative block"
          >
            {/* 글로우 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />

            {/* 메인 버튼 */}
            <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full px-6 py-3.5 flex items-center gap-3 shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 hover:scale-105">
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {/* 펄스 애니메이션 */}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">진행중인 캠페인 문의</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </div>
          </a>
        ) : (
          // 비로그인 상태: 상담 신청 모달 열기
          <button
            onClick={() => setIsModalOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative block"
          >
            {/* 글로우 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity" />

            {/* 메인 버튼 */}
            <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full px-6 py-3.5 flex items-center gap-3 shadow-2xl hover:shadow-violet-500/25 transition-all duration-300 hover:scale-105">
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {/* 펄스 애니메이션 */}
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">상담 신청하기</p>
              </div>
              <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </div>
          </button>
        )}
      </div>

      {/* 상담 신청 모달 - 프리미엄 디자인 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* 헤더 - 그라데이션 */}
            <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 text-white p-5 sm:p-8">
              {/* 배경 패턴 */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-32 h-32 border border-white/30 rounded-full" />
                <div className="absolute bottom-4 left-4 w-24 h-24 border border-white/20 rounded-full" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">무료 상담</span>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-2xl font-bold mb-2">맞춤 캠페인 상담받기</h2>
                <p className="text-violet-200 text-sm">정보를 입력하시면 1시간 내 연락드립니다</p>
              </div>
            </div>

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* 상호명 & 브랜드명 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 text-violet-500" />
                    상호명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                    placeholder="회사명"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    브랜드명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                    placeholder="브랜드명"
                  />
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4 text-violet-500" />
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                  placeholder="010-0000-0000"
                />
              </div>

              {/* 이메일 */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 text-violet-500" />
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                  placeholder="email@company.com"
                />
              </div>

              {/* 서비스 선택 */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  관심 서비스 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`relative flex flex-col p-3 rounded-xl cursor-pointer transition-all ${
                        formData.services.includes(service.label)
                          ? 'bg-violet-50 border-2 border-violet-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.label)}
                        onChange={() => handleServiceChange(service.label)}
                        className="sr-only"
                      />
                      {formData.services.includes(service.label) && (
                        <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-violet-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900">{service.label}</span>
                      <span className="text-xs text-gray-500 mt-0.5">{service.desc}</span>
                    </label>
                  ))}
                </div>

                {/* 기타 옵션 */}
                <label
                  className={`mt-2 flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    formData.services.includes('기타')
                      ? 'bg-violet-50 border-2 border-violet-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.services.includes('기타')}
                    onChange={() => handleServiceChange('기타')}
                    className="sr-only"
                  />
                  {formData.services.includes('기타') && (
                    <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-gray-900">기타</span>
                  {formData.services.includes('기타') && (
                    <input
                      type="text"
                      name="otherService"
                      value={formData.otherService}
                      onChange={handleInputChange}
                      placeholder="직접 입력"
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  )}
                </label>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '전송 중...' : '무료 상담 신청하기'}
                </button>
                <a
                  href="https://pf.kakao.com/_xgNdxlG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 bg-[#FEE500] text-gray-900 py-4 rounded-xl font-bold text-sm hover:bg-[#FDD835] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.86 5.25 4.64 6.7-.2.73-.73 2.64-.84 3.06-.13.52.19.51.4.37.17-.11 2.67-1.81 3.75-2.54.68.1 1.38.15 2.05.15 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8z"/>
                  </svg>
                  카톡 상담
                </a>
              </div>

              {/* 안내 문구 */}
              <p className="text-center text-xs text-gray-400 pt-2">
                입력하신 정보는 상담 목적으로만 사용됩니다
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
