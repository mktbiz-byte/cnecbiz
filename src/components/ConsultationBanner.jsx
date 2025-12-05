import { useState, useEffect } from 'react'
import { X, MessageCircle, Mail, Phone } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export default function ConsultationBanner() {
  const location = useLocation()
  const isMainPage = location.pathname === '/'
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    
    // 필수 입력 검증
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

      // 네이버 웍스 메시지 전송
      const naverWorksResponse = await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAdminNotification: true,
          message: `🔔 새로운 상담 신청이 접수되었습니다!\n\n` +
                   `👤 상호명: ${formData.name}\n` +
                   `📞 연락처: ${formData.phone}\n` +
                   `📧 메일주소: ${formData.email}\n` +
                   `🏪 브랜드명: ${formData.brandName || '미입력'}\n` +
                   `📋 신청 서비스: ${servicesList}\n\n` +
                   `📌 상담 신청서를 확인해주세요.`
        })
      })

      // 이메일 전송
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
            <p style="margin-top: 20px; color: #6c757d; font-size: 14px;">
              이 메일은 CNEC 상담 신청 시스템에서 자동으로 발송되었습니다.
            </p>
          `
        })
      })

      if (naverWorksResponse.ok || emailResponse.ok) {
        // Google Tag Manager - 상담 신청 완료 이벤트
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

        // Meta Pixel - CompleteRegistration 이벤트 (상담 신청 완료)
        if (window.fbq) {
          window.fbq('track', 'CompleteRegistration')
        }

        alert('상담 신청이 완료되었습니다!\n빠른 시일 내에 연락드리겠습니다. 😊')
        setIsModalOpen(false)
        setFormData({
          name: '',
          birthYear: '',
          birthMonth: '',
          birthDay: '',
          email: '',
          channelUrl: '',
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

  return (
    <>
      {/* 오른쪽 하단 따라다니는 배너 - 모바일에서는 메인 페이지에서만 표시 */}
      <div className={`fixed bottom-8 right-8 z-50 ${
        isMainPage ? '' : 'hidden md:block'
      }`}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 group"
        >
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 animate-pulse" />
            <Mail className="w-4 h-4" />
            <span className="text-xl">💬</span>
          </div>
          <span className="font-semibold text-sm">상담 신청하기</span>
        </button>
      </div>

      {/* 상담 신청서 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">💬 상담 신청하기</h2>
                <p className="text-purple-100 text-sm">정보를 입력해주시면 빠르게 연락드리겠습니다</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 폼 내용 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 상호명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  상호명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="회사명 또는 이름을 입력하세요"
                />
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="010-1234-5678"
                />
              </div>

              {/* 메일주소 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  메일주소 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="example@company.com"
                />
              </div>

              {/* 브랜드명 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  브랜드명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="브랜드명을 입력하세요"
                />
              </div>

              {/* 신청 서비스 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  신청 서비스 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    '기획 숏츠 (릴스/틱톡/쇼츠) +추천 크리에이터',
                    '4주 챌린지 (리뷰 후기 4회 업로드)',
                    '[올영세일] 패키지',
                    '수출바우처 (미국/일본)',
                  ].map((service) => (
                    <label key={service} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service)}
                        onChange={() => handleServiceChange(service)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-700">{service}</span>
                    </label>
                  ))}
                  
                  {/* 기타 옵션 */}
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.services.includes('기타')}
                      onChange={() => handleServiceChange('기타')}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-gray-700">기타:</span>
                      {formData.services.includes('기타') && (
                        <input
                          type="text"
                          name="otherService"
                          value={formData.otherService}
                          onChange={handleInputChange}
                          placeholder="직접 입력"
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* 버튼 그룹 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '전송 중...' : '📝 상담 신청'}
                </button>
                <a
                  href="https://pf.kakao.com/_xgNdxlG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-yellow-400 text-gray-900 py-4 rounded-lg font-semibold hover:bg-yellow-500 hover:shadow-lg hover:scale-[1.02] transition-all text-center"
                >
                  💬 카카오톡 채널 추가
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
