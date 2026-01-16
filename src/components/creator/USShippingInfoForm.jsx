import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { CheckCircle, Package, Phone, MapPin, Loader2 } from 'lucide-react'

/**
 * US 크리에이터 배송정보 입력 폼
 * - 확정된 크리에이터에게 이메일로 링크 발송
 * - 크리에이터가 연락처/주소 입력
 * - applications 테이블에 저장
 * - id=test 일 때 테스트 모드 (DB 저장 없이 테스트)
 */
const USShippingInfoForm = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const applicationId = searchParams.get('id')

  // 테스트 모드: id=test 일 때 활성화
  const isTestMode = applicationId === 'test'

  const supabase = getSupabaseClient('us')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [application, setApplication] = useState(null)
  const [campaign, setCampaign] = useState(null)

  const [formData, setFormData] = useState({
    phone_number: '',
    postal_code: '',
    address: '',
    detail_address: ''
  })

  useEffect(() => {
    if (isTestMode) {
      // 테스트 모드: 가상 데이터 설정
      setApplication({
        id: 'test-application-id',
        applicant_name: 'Test Creator',
        email: 'test@example.com',
        user_id: null
      })
      setCampaign({
        title: 'Test Campaign - Product Review',
        brand: 'Test Brand Inc.'
      })
      setLoading(false)
    } else if (applicationId) {
      loadApplicationData()
    } else {
      setError('Invalid link. Please contact support.')
      setLoading(false)
    }
  }, [applicationId, isTestMode])

  const loadApplicationData = async () => {
    try {
      // application 데이터 조회
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single()

      if (appError || !appData) {
        throw new Error('Application not found')
      }

      // 이미 배송정보가 입력된 경우
      if (appData.phone_number && appData.address) {
        setSubmitted(true)
        setFormData({
          phone_number: appData.phone_number || '',
          postal_code: appData.postal_code || '',
          address: appData.address || '',
          detail_address: appData.detail_address || ''
        })
      }

      setApplication(appData)

      // 캠페인 정보 조회
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('title, brand, product_name')
        .eq('id', appData.campaign_id)
        .single()

      if (campaignData) {
        setCampaign(campaignData)
      }

    } catch (err) {
      console.error('Error loading application:', err)
      setError('Failed to load application data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.phone_number || !formData.address) {
      setError('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // 테스트 모드: DB 저장 없이 성공 처리
      if (isTestMode) {
        console.log('[TEST MODE] Shipping info submitted:', formData)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 딜레이
        setSubmitted(true)
        return
      }

      // 서버 함수를 통해 저장 (service role key 사용으로 RLS 우회)
      const response = await fetch('/.netlify/functions/submit-us-shipping-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          token: token,
          shipping_data: {
            phone_number: formData.phone_number,
            postal_code: formData.postal_code,
            address: formData.address,
            detail_address: formData.detail_address
          }
        })
      })

      const result = await response.json()
      console.log('[SHIPPING] Submit result:', result)

      if (!result.success) {
        throw new Error(result.error || 'Failed to save')
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting shipping info:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-purple-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">!</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Shipping Info Saved!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you! Your shipping information has been saved successfully.
              The brand will ship your product soon.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{formData.phone_number}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <span>
                  {formData.postal_code && `${formData.postal_code}, `}
                  {formData.address}
                  {formData.detail_address && `, ${formData.detail_address}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <div>
                <CardTitle className="text-xl">Shipping Information</CardTitle>
                <p className="text-purple-100 text-sm mt-1">
                  Please enter your shipping details
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* 테스트 모드 배너 */}
            {isTestMode && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg p-3 mb-6 text-sm text-center">
                <strong>TEST MODE</strong> - 실제 DB에 저장되지 않습니다
              </div>
            )}

            {/* 캠페인 정보 */}
            {campaign && (
              <div className="bg-purple-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-600 font-medium mb-1">Campaign</p>
                <p className="font-bold text-gray-900">{campaign.title}</p>
                {campaign.brand && (
                  <p className="text-sm text-gray-600">by {campaign.brand}</p>
                )}
              </div>
            )}

            {/* 크리에이터 정보 */}
            {application && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Creator</p>
                <p className="font-semibold text-gray-900">{application.applicant_name}</p>
                <p className="text-sm text-gray-600">{application.email}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 연락처 */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-600" />
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1.5 h-12 text-lg"
                  required
                />
              </div>

              {/* 우편번호 */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  ZIP Code
                </Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="12345"
                  className="mt-1.5 h-12"
                />
              </div>

              {/* 주소 */}
              <div>
                <Label className="text-sm font-semibold">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street, City, State"
                  className="mt-1.5 h-12"
                  required
                />
              </div>

              {/* 상세주소 */}
              <div>
                <Label className="text-sm font-semibold">
                  Apartment, Suite, etc. (optional)
                </Label>
                <Input
                  value={formData.detail_address}
                  onChange={(e) => setFormData({ ...formData, detail_address: e.target.value })}
                  placeholder="Apt 4B"
                  className="mt-1.5 h-12"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submit Shipping Info
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your information will only be used for product shipping purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default USShippingInfoForm
