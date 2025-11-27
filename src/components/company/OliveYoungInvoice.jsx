import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2, CreditCard, Wallet, Mail, FileText } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'
import { generateInvoicePDF, getPDFBase64 } from '../../utils/pdfGenerator'

export default function OliveYoungInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState(null) // 'card' or 'bank_transfer'
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // 패키지 가격 매핑
  const oliveyoungPackageOptions = {
    'standard': 400000,
    'premium': 500000,
    'professional': 600000
  }

  // 패키지 단가 계산
  const getPackagePrice = () => {
    if (!campaign) return 0
    return oliveyoungPackageOptions[campaign.package_type] || 0
  }

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
  const [sendingEmail, setSendingEmail] = useState(false)
  const [invoiceEmailSent, setInvoiceEmailSent] = useState(false)

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

      // 회사 정보 로드 (supabaseBiz 사용)
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (user) {
        const { data: companyData } = await supabaseBiz
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
          
          // 견적서 자동 발송
          if (!invoiceEmailSent && companyData.email) {
            sendInvoiceEmail(data, companyData)
          }
        }
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // HTML 견적서 생성 함수
  const generateInvoiceHTML = (campaign, company, pricing, campaignType, today) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Malgun Gothic', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 32px; margin: 0; color: #333; }
          .date { text-align: right; color: #666; margin-bottom: 20px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
          .info-row { display: flex; padding: 8px 0; }
          .info-label { width: 150px; color: #666; }
          .info-value { flex: 1; color: #333; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #ddd; }
          td { padding: 12px; border: 1px solid #ddd; }
          .text-right { text-align: right; }
          .total-row { background-color: #f9f9f9; font-weight: bold; font-size: 16px; }
          .total-amount { color: #0066cc; font-size: 20px; }
          .bank-info { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .bank-info h3 { margin-top: 0; color: #1976d2; }
          .notes { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>견 적 서</h1></div>
          <div class="date">발행일: ${today}</div>
          <div class="section">
            <div class="section-title">공급받는자 정보</div>
            <div class="info-row"><div class="info-label">회사명</div><div class="info-value">${company.company_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">대표자</div><div class="info-value">${company.ceo_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">사업자번호</div><div class="info-value">${company.business_registration_number || '-'}</div></div>
            <div class="info-row"><div class="info-label">주소</div><div class="info-value">${company.company_address || '-'}</div></div>
            <div class="info-row"><div class="info-label">연락처</div><div class="info-value">${company.phone || '-'}</div></div>
            <div class="info-row"><div class="info-label">이메일</div><div class="info-value">${company.email || '-'}</div></div>
          </div>
          <div class="section">
            <div class="section-title">캠페인 정보</div>
            <div class="info-row"><div class="info-label">캠페인명</div><div class="info-value">${campaign.title || '-'}</div></div>
            <div class="info-row"><div class="info-label">캠페인 타입</div><div class="info-value">${campaignType}</div></div>
            <div class="info-row"><div class="info-label">모집 인원</div><div class="info-value">${pricing.creatorCount}명</div></div>
          </div>
          <div class="section">
            <div class="section-title">견적 내역</div>
            <table>
              <thead><tr><th>항목</th><th class="text-right">단가</th><th class="text-right">금액</th></tr></thead>
              <tbody>
                <tr><td>${campaignType} 패키지 × ${pricing.creatorCount}명</td><td class="text-right">${pricing.packagePrice.toLocaleString()}원</td><td class="text-right">${pricing.subtotal.toLocaleString()}원</td></tr>
                <tr><td colspan="2">소계</td><td class="text-right">${pricing.subtotal.toLocaleString()}원</td></tr>
                <tr><td colspan="2">부가세 (10%)</td><td class="text-right">${pricing.vat.toLocaleString()}원</td></tr>
                <tr class="total-row"><td colspan="2">총 금액</td><td class="text-right total-amount">${pricing.total.toLocaleString()}원</td></tr>
              </tbody>
            </table>
          </div>
          <div class="bank-info">
            <h3>입금 계좌 정보</h3>
            <div class="info-row"><div class="info-label">은행</div><div class="info-value">IBK기업은행</div></div>
            <div class="info-row"><div class="info-label">계좌번호</div><div class="info-value">047-122753-04-011</div></div>
            <div class="info-row"><div class="info-label">예금주</div><div class="info-value">주식회사 하우파파</div></div>
          </div>
          <div class="notes">
            <p>* 입금 확인 후 캠페인이 시작됩니다.</p>
            <p>* 세금계산서가 필요하신 경우 별도로 요청해주세요.</p>
            <p>* 문의: 1833-6025</p>
          </div>
          <div class="footer">
            <p>주식회사 하우파파 | 사업자등록번호: 123-45-67890</p>
            <p>서울특별시 강남구 | Tel: 1833-6025 | Email: contact@cnec.com</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // 견적서 이메일 발송
  const sendInvoiceEmail = async (campaignData, companyData) => {
    try {
      // 올리브영 패키지 가격 매핑
      const oliveyoungPackageOptions = {
        'standard': 400000,
        'premium': 500000,
        'professional': 600000
      }
      
      const packagePrice = oliveyoungPackageOptions[campaignData.package_type] || 0
      const creatorCount = campaignData.total_slots || 0
      const subtotal = packagePrice * creatorCount
      const vat = Math.floor(subtotal * 0.1)
      const total = subtotal + vat

      const pricing = {
        packagePrice,
        creatorCount,
        subtotal,
        vat,
        total
      }

      // HTML 견적서 생성
      const today = new Date().toLocaleDateString('ko-KR')
      const invoiceHTML = generateInvoiceHTML(campaignData, companyData, pricing, '올리브영', today)
      
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: companyData.email,
          subject: `[CNEC] 올리브영 캠페인 견적서 - ${campaignData.title}`,
          html: invoiceHTML
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('[OliveYoungInvoice] 견적서 이메일 발송 성공:', result.messageId)
        setInvoiceEmailSent(true)
      } else {
        console.error('[OliveYoungInvoice] 견적서 이메일 발송 실패:', result.error)
      }
    } catch (error) {
      console.error('[OliveYoungInvoice] 견적서 이메일 발송 오류:', error)
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
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const totalCost = calculateTotalCost()

      // 결제 요청 생성 (related_campaign_id를 통해 입금 확인 시 자동 승인)
      const { error: chargeError } = await supabaseBiz
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
        const now = new Date()
        const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours() < 12 ? '오전' : '오후'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`
        
        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🔔 **새로운 입금 확인 요청 (한국)**\n\n` +
                     `**캠페인명:** ${campaign.title}\n` +
                     `**기업명:** ${company?.company_name || '미상'}\n` +
                     `**캠페인 타입:** 올리브영\n` +
                     `**크리에이터 수:** ${campaign.total_slots || 0}명\n` +
                     `**결제 금액:** ${totalCost.toLocaleString()}원 (계좌입금)\n` +
                     `**세금계산서:** ${needsTaxInvoice ? '신청' : '미신청'}\n` +
                     `**입금자명:** ${depositorName}\n` +
                     `**신청 시간:** ${formattedDate}\n\n` +
                     `⚠️ **입금 확인이 지연될 경우 빠른 확인을 부탁드립니다!**\n\n` +
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
    const packagePrice = getPackagePrice()
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
            {/* 금액 정보 */}
            <div className="bg-white p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">패키지 단가</span>
                  <span className="font-semibold">{getPackagePrice().toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">크리에이터 수</span>
                  <span className="font-semibold">{campaign.total_slots || 0}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">소계</span>
                  <span className="font-semibold">{(getPackagePrice() * (campaign.total_slots || 0)).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">부가세 (10%)</span>
                  <span className="font-semibold">{Math.floor(getPackagePrice() * (campaign.total_slots || 0) * 0.1).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                  <span className="font-bold text-lg">총 결제 금액</span>
                  <span className="font-bold text-lg text-blue-600">{calculateTotalCost().toLocaleString()}원</span>
                </div>
              </div>
            </div>

            {/* 결제 방법 선택 */}
            {!showPaymentForm && (
              <div>
                <h3 className="font-semibold text-lg mb-4">결제 방법 선택</h3>
                <div className="space-y-3">
                  {/* 계좌 입금 버튼 */}
                  <Button
                    onClick={() => {
                      setPaymentMethod('bank_transfer')
                      setShowPaymentForm(true)
                    }}
                    className="w-full h-auto py-4 flex items-center justify-between"
                    variant="default"
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">계좌 입금하기</div>
                        <div className="text-xs opacity-80">
                          {calculateTotalCost().toLocaleString()}원 입금
                        </div>
                      </div>
                    </div>
                    <span className="text-sm">→</span>
                  </Button>

                  {/* 카드 결제 버튼 (비활성화) */}
                  <Button
                    disabled={true}
                    className="w-full h-auto py-4 flex items-center justify-between opacity-50 cursor-not-allowed"
                    variant="outline"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-semibold">카드 결제</div>
                        <div className="text-xs opacity-80">
                          카드결제는 빠른 시일내에 진행 되도록 하겠습니다
                        </div>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* 안내 메시지 */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
                  <h4 className="font-semibold text-sm mb-2">결제 안내</h4>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>계좌 입금하기를 클릭하여 입금 신청서를 작성해주세요</li>
                    <li>입금 확인 후 자동으로 캠페인이 승인됩니다</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 입금 신청서 */}
            {showPaymentForm && paymentMethod === 'bank_transfer' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">입금 신청서</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPaymentForm(false)
                      setPaymentMethod(null)
                    }}
                  >
                    다른 방법 선택
                  </Button>
                </div>

                <div className="bg-white p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-sm">입금 계좌 정보</h4>
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* 세금계산서 정보 */}
        {showPaymentForm && paymentMethod === 'bank_transfer' && (
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
        )}

        {/* 제출 버튼 */}
        {showPaymentForm && paymentMethod === 'bank_transfer' && (
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
        )}
      </div>
    </div>
  )
}
