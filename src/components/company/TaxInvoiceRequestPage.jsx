import { useState } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { useNavigate, useParams } from 'react-router-dom'

export default function TaxInvoiceRequestPage() {
  const navigate = useNavigate()
  const { paymentId } = useParams()
  
  const [formData, setFormData] = useState({
    businessRegistrationNumber: '',
    companyName: '',
    ceoName: '',
    businessAddress: '',
    businessType: '',
    businessCategory: '',
    contactEmail: '',
    contactPhone: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      // Get payment info
      const { data: payment } = await supabaseBiz
        .from('payments')
        .select('*, campaigns(*)')
        .eq('id', paymentId)
        .single()

      if (!payment) throw new Error('결제 정보를 찾을 수 없습니다')

      // Create tax invoice request
      const { error } = await supabaseBiz
        .from('tax_invoices')
        .insert({
          payment_id: paymentId,
          company_id: user.id,
          campaign_id: payment.campaign_id,
          business_registration_number: formData.businessRegistrationNumber,
          company_name: formData.companyName,
          ceo_name: formData.ceoName,
          business_address: formData.businessAddress,
          business_type: formData.businessType,
          business_category: formData.businessCategory,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          invoice_amount: payment.amount,
          status: 'requested'
        })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        navigate('/company/payments')
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      alert('세금계산서 신청 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">신청 완료!</h2>
          <p className="text-gray-600">세금계산서 신청이 완료되었습니다.</p>
          <p className="text-gray-600 mt-2">담당자가 확인 후 발행해드립니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">세금계산서 신청</h1>
          <p className="mt-2 text-gray-600">계좌이체 결제 시 세금계산서를 신청하세요</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Registration Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사업자등록번호 *
              </label>
              <input
                type="text"
                name="businessRegistrationNumber"
                value={formData.businessRegistrationNumber}
                onChange={handleChange}
                required
                placeholder="123-45-67890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사명 *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder="(주)크넥비즈"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* CEO Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                대표자명 *
              </label>
              <input
                type="text"
                name="ceoName"
                value={formData.ceoName}
                onChange={handleChange}
                required
                placeholder="홍길동"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사업장 주소 *
              </label>
              <input
                type="text"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                required
                placeholder="서울특별시 강남구 테헤란로 123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Business Type & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업태 *
                </label>
                <input
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  required
                  placeholder="서비스업"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종목 *
                </label>
                <input
                  type="text"
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleChange}
                  required
                  placeholder="마케팅"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                세금계산서 발급받으실 메일 주소 *
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                placeholder="contact@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자 전화번호
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">안내사항</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>세금계산서는 신청 후 영업일 기준 2-3일 내 발행됩니다</li>
                    <li>발행된 세금계산서는 등록하신 이메일로 전송됩니다</li>
                    <li>입금 확인 후 세금계산서가 발행됩니다</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {loading ? '신청 중...' : '세금계산서 신청'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

