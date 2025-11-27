import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)

  const [depositorName, setDepositorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [company, setCompany] = useState(null)
  
  // 세금계산서 정보
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    loadCampaignData()
  }, [id])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // 회사 정보 로드
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (companyData) {
          setCompany(companyData)
          setDepositorName(companyData.company_name || '')
          // 프로필 정보로 세금계산서 필드 자동 채우기
          setCompanyName(companyData.company_name || '')
          setBusinessNumber(companyData.business_registration_number || '')
          setRepresentativeName(companyData.ceo_name || '')
          setContact(companyData.phone || '')
          setEmail(companyData.tax_invoice_email || companyData.email || '')
          setBusinessType(companyData.business_type || '')
          setBusinessCategory(companyData.business_category || '')
          setCompanyAddress(companyData.company_address || '')
        }
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }



  const handlePaymentRequest = async () => {
    if (!depositorName.trim()) {
      alert('입금자명을 입력해주세요.')
      return
    }

    if (!confirm(`입금 요청을 진행하시겠습니까?\n\n입금자명: ${depositorName}\n금액: ${calculateTotalCost().toLocaleString()}원`)) {
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const totalCost = calculateTotalCost()

      // 결제 요청 생성 (related_campaign_id를 통해 입금 확인 시 자동 승인)
      const { error: chargeError } = await supabase
        .from('points_charge_requests')
        .insert({
          company_id: user.id,
          amount: totalCost,
          payment_method: 'bank_transfer',
          status: 'pending',
          depositor_name: depositorName,
          related_campaign_id: id, // 입금 확인 시 이 캠페인을 자동 승인 요청
          bank_transfer_info: {
            campaign_id: id,
            campaign_title: campaign.title,
            campaign_type: 'oliveyoung'
          }
        })

      if (chargeError) throw chargeError

      // 1. 카카오톡 알림톡 발송
      if (company?.notification_phone || company?.phone) {
        try {
          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.notification_phone || company.phone,
              receiverName: company.company_name || '회사',
              templateCode: '025100000918',
              variables: {
                '회사명': company.company_name || '회사',
                '캠페인명': campaign.title || '캠페인',
                '금액': totalCost.toLocaleString()
              }
            })
          })
          console.log('[SUCCESS] Kakao notification sent')
        } catch (kakaoError) {
          console.error('[ERROR] Failed to send Kakao notification:', kakaoError)
        }
      }

      // 2. 이메일 발송
      if (company?.notification_email || company?.email) {
        try {
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.notification_email || company.email,
              subject: '[CNEC] 캠페인 신청 완료',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #333;">[CNEC] 캠페인 신청 완료</h2>
                  <p><strong>${company.company_name || '회사'}</strong>님, 캠페인 신청이 접수되었습니다.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaign.title || '캠페인'}</p>
                    <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">${totalCost.toLocaleString()}원</span></p>
                  </div>
                  
                  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
                    <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
                    <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
                  </div>
                  
                  <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
                  <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                  </p>
                </div>
              `
            })
          })
          console.log('[SUCCESS] Email sent')
        } catch (emailError) {
          console.error('[ERROR] Failed to send email:', emailError)
        }
      }

      // 3. 네이버 웍스 알림 발송
      try {
        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `💰 **새로운 입금 요청**\n\n` +
                     `🏬 **회사:** ${company?.company_name || '미상'}\n` +
                     `📝 **캠페인:** ${campaign.title}\n` +
                     `🎯 **타입:** 올리브영\n` +
                     `👥 **크리에이터 수:** ${campaign.influencer_count || 0}명\n` +
                     `💰 **금액:** ${totalCost.toLocaleString()}원\n` +
                     `👤 **입금자명:** ${depositorName}\n\n` +
                     `➡️ 입금 확인: https://cnectotal.netlify.app/admin/deposits`,
            isAdminNotification: true
          })
        })
      } catch (notifError) {
        console.error('알림 발송 실패:', notifError)
      }

      alert('입금 요청이 제출되었습니다!\n\n입금 확인 후 캠페인이 자동으로 승인 요청됩니다.')
      navigate('/company/campaigns')
    } catch (err) {
      console.error('입금 요청 실패:', err)
      alert('입금 요청에 실패했습니다: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotalCost = () => {
    const packagePrice = campaign?.package_price || 200000
    const influencerCount = campaign?.total_slots || 0
    const subtotal = packagePrice * influencerCount
    const vat = Math.floor(subtotal * 0.1)
    return subtotal + vat
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          가이드 수정으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
          <p className="text-gray-600">캠페인 가이드</p>
        </div>

        {/* 제품 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>제품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">브랜드</p>
                  <p className="font-medium">{campaign.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">제품명</p>
                  <p className="font-medium">{campaign.product_name || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">제품 특징</p>
                <p className="font-medium">{campaign.product_features || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">핵심 소구 포인트</p>
                <p className="font-medium">{campaign.product_key_points || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* 결제 정보 */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">💰 결제 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">패키지 단가</span>
                  <span className="font-semibold">{(campaign.package_price || 0).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">크리에이터 수</span>
                  <span className="font-semibold">{campaign.total_slots || 0}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">소계</span>
                  <span className="font-semibold">{((campaign.package_price || 0) * (campaign.total_slots || 0)).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">부가세 (10%)</span>
                  <span className="font-semibold">{Math.floor((campaign.package_price || 0) * (campaign.total_slots || 0) * 0.1).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                  <span className="font-bold text-lg">총 결제 금액</span>
                  <span className="font-bold text-lg text-blue-600">{calculateTotalCost().toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm">입금 계좌 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">은행</span>
                  <span className="font-semibold">IBK기업은행</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">계좌번호</span>
                  <span className="font-semibold">047-122753-04-011</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예금주</span>
                  <span className="font-semibold">주식회사 하우파파</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                입금자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="입금하실 이름을 입력해주세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">
                ⚠️ 입금자명은 입금 확인에 사용되므로 정확히 입력해주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 세금계산서 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>세금계산서 정보 (선택사항)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsTaxInvoice}
                  onChange={(e) => setNeedsTaxInvoice(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">세금계산서 발행 필요</span>
              </label>
              <p className="text-sm text-gray-600 mt-2">세금계산서 발행을 원하시는 경우 체크하고 아래 정보를 입력해주세요.</p>
            </div>

            {needsTaxInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="(주)에이블씨앤씨"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자등록번호
                    </label>
                    <input
                      type="text"
                      value={businessNumber}
                      onChange={(e) => setBusinessNumber(e.target.value)}
                      placeholder="123-45-67890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대표자명
                    </label>
                    <input
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    세금계산서 받으실 메일 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업태
                    </label>
                    <input
                      type="text"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      placeholder="예: 제조업, 도소매업, 서비스업"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종목
                    </label>
                    <input
                      type="text"
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      placeholder="예: 광고대행, 컴퓨터판매, 건설업"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="서울시 강남구..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모 (선택사항)
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="추가 요청사항이 있으시면 입력해주세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="flex-1"
          >
            가이드 수정
          </Button>
          <Button
            onClick={handlePaymentRequest}
            disabled={submitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                입금 요청 하기
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
