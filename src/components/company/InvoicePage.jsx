import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, Download, CheckCircle, Copy } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const InvoicePage = () => {
  // 출력 전용 스타일
  const printStyles = `
    @media print {
      /* 네비게이션, 버튼 등 숨기기 */
      nav, button, .no-print {
        display: none !important;
      }
      
      /* 페이지 여백 설정 */
      @page {
        margin: 2cm;
      }
      
      /* 견적서만 출력 */
      body * {
        visibility: hidden;
      }
      
      .printable-area, .printable-area * {
        visibility: visible;
      }
      
      .printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      /* 배경색 출력 */
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'

  const [campaign, setCampaign] = useState(null)
  const [company, setCompany] = useState(null)
  const [paymentAccount, setPaymentAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [taxInvoiceNumber, setTaxInvoiceNumber] = useState('')
  const [taxInvoiceFileUrl, setTaxInvoiceFileUrl] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [depositorName, setDepositorName] = useState('')
  const [uploadingTaxInvoice, setUploadingTaxInvoice] = useState(false)
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(true) // 기본값을 true로 변경 (세금계산서 신청 페이지이므로)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // 현재 로그인한 사용자 정보 조회 (Biz DB)
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 캠페인 정보 로드 - region에 따라 올바른 DB 사용
      const regionClient = getSupabaseClient(region)
      let { data: campaignData, error: campaignError } = await regionClient
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      // region DB에 없으면 Biz DB 시도
      if (!campaignData && !campaignError) {
        const result = await supabaseBiz
          .from('campaigns')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        
        campaignData = result.data
        campaignError = result.error
      }

      if (campaignError) throw campaignError
      if (!campaignData) throw new Error('캠페인을 찾을 수 없습니다.')
      setCampaign(campaignData)

      // 회사 정보 로드 (Biz DB)
      const { data: companyData, error: companyError } = await supabaseBiz
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (companyError) {
        console.error('회사 정보 로드 실패:', companyError)
      } else {
        setCompany(companyData)
        // 프로필 정보로 세금계산서 필드 자동 채우기
        if (companyData) {
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

      // 입금 계좌 정보 로드 (Biz DB) - 항상 korea 계좌 사용
      const { data: accountData, error: accountError } = await supabaseBiz
        .from('payment_accounts')
        .select('*')
        .eq('region', 'korea')
        .maybeSingle()

      if (accountError && accountError.code !== 'PGRST116') {
        console.error('계좌 정보 로드 실패:', accountError)
      } else if (accountData) {
        setPaymentAccount(accountData)
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err)
      setError('정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTaxInvoiceFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingTaxInvoice(true)
    setError('')

    try {
      const storage = supabaseBiz.storage
      const fileExt = file.name.split('.').pop()
      const fileName = `tax-invoice-${id}-${Date.now()}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const { error: uploadError } = await storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setTaxInvoiceFileUrl(publicUrl)
      setSuccess('세금계산서 파일이 업로드되었습니다!')
    } catch (err) {
      console.error('파일 업로드 실패:', err)
      setError('파일 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingTaxInvoice(false)
    }
  }

  const handleCopyAccount = () => {
    if (paymentAccount) {
      navigator.clipboard.writeText(paymentAccount.account_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConfirmPayment = async () => {
    setConfirming(true)
    setError('')
    setSuccess('')

    try {
      // 입금자명 필수 체크
      if (!depositorName.trim()) {
        throw new Error('입금자명을 입력해주세요.')
      }

      // 1. 현재 로그인한 사용자 정보 조회
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 2. points_charge_requests 테이블에 충전 신청 저장
      const invoiceData = {
        depositor_name: depositorName,
        tax_invoice_info: {
          business_number: company.business_registration_number,
          company_name: company.company_name,
          representative: company.ceo_name,
          contact: company.phone,
          email: company.email,
          business_type: company.business_type,
          business_category: company.business_category,
          address: company.company_address
        },
        tax_invoice_file_url: taxInvoiceFileUrl,
        payment_account: paymentAccount,
        invoice_date: new Date().toISOString(),
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalCost
      }

      // 캠페인 결제 요청 생성 (related_campaign_id를 통해 입금 확인 시 자동 승인)
      const { error: chargeError } = await supabaseBiz
        .from('points_charge_requests')
        .insert({
          company_id: user.id,
          amount: totalCost,
          payment_method: 'bank_transfer',
          status: 'pending',
          depositor_name: depositorName,
          needs_tax_invoice: needsTaxInvoice,
          tax_invoice_info: needsTaxInvoice ? invoiceData.tax_invoice_info : null,
          related_campaign_id: id, // 입금 확인 시 이 캠페인을 자동 승인 요청
          bank_transfer_info: {
            campaign_id: id,
            ...invoiceData
          }
        })

      if (chargeError) throw chargeError

      // 캐페인 상태를 'pending_payment'로 변경
      const regionClient = getSupabaseClient(region)
      const { error: updateError } = await regionClient
        .from('campaigns')
        .update({ 
          status: 'pending_payment',
          approval_status: 'pending_payment'
        })
        .eq('id', id)

      if (updateError) {
        console.error('[ERROR] Failed to update campaign status:', updateError)
      }

      // 3. 알림 발송 (카카오톡, 이메일, 네이버 웍스)
      try {
        const companyName = company.company_name || ''
        const companyEmail = company.notification_email || company.email || ''
        const companyPhone = company.notification_phone || company.phone || ''

        if (companyName && (companyEmail || companyPhone)) {
          // 1. 카카오톡 알림톡 발송
          if (companyPhone) {
            try {
              await fetch('/.netlify/functions/send-kakao-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiverNum: companyPhone,
                  receiverName: companyName,
                  templateCode: '025100000918',
                  variables: {
                    '회사명': companyName,
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

          // 2. 네이버 웍스 메시지 발송 (관리자용)
          try {
            const koreanDate = new Date().toLocaleString('ko-KR', { 
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })

            const campaignTypeText = 
              campaign.campaign_type === 'oliveyoung' ? '올영세일' :
              campaign.campaign_type === '4week' ? '4주 챌린지' :
              '기획형'
            
            const regionText = region === 'japan' ? '일본' : 
                               region === 'us' ? '미국' : 
                               region === 'taiwan' ? '대만' : '한국'
            
            const naverMessage = `🔔 새로운 입금 확인 요청 (${regionText})\n\n` +
              `캠페인명: ${campaign.title}\n` +
              `기업명: ${companyName}\n` +
              `캠페인 타입: ${campaignTypeText}\n` +
              `결제 금액: ${totalCost.toLocaleString()}원 (계좌입금)\n` +
              `세금계산서: ${needsTaxInvoice ? '신청' : '미신청'}\n` +
              `입금자명: ${depositorName}\n` +
              `신청 시간: ${koreanDate}\n\n` +
              `⚠️ **입금 확인이 지연될 경우 빠른 확인을 부탁드립니다!**\n\n` +
              `➡️ 입금 확인: https://cnectotal.netlify.app/admin/deposits`

            await fetch('/.netlify/functions/send-naver-works-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: naverMessage,
                isAdminNotification: true
              })
            })
            console.log('[SUCCESS] Naver Works notification sent')
          } catch (naverError) {
            console.error('[ERROR] Failed to send Naver Works notification:', naverError)
          }

          // 3. 이메일 발송
          if (companyEmail) {
            try {
              await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: companyEmail,
                  subject: '[CNEC] 캠페인 신청 완료',
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333;">[CNEC] 캠페인 신청 완료</h2>
                      <p><strong>${companyName}</strong>님, 캠페인 신청이 접수되었습니다.</p>
                      
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
        }
      } catch (notificationError) {
        console.error('[ERROR] Notification error:', notificationError)
        // 알림 발송 실패해도 입금 요청은 성공으로 처리
      }

      setSuccess('입금 요청이 제출되었습니다! 입금 확인 후 캠페인이 시작됩니다.')
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 2000)
    } catch (err) {
      console.error('입금 확인 실패:', err)
      setError('입금 확인 처리에 실패했습니다: ' + err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    )
  }

  if (error && !campaign) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-red-600">{error}</div>
      </div>
    )
  }

  // estimated_cost는 VAT 포함 총액
  const totalCost = campaign.estimated_cost || 0
  const recruitmentCount = campaign.total_slots || 0
  // VAT 제외 금액 = 총액 / 1.1
  const subtotal = Math.round(totalCost / 1.1)
  const vat = totalCost - subtotal
  // 할인 금액 (현재는 0)
  const discountAmount = 0
  // 단가 = VAT 제외 금액 / 모집인원
  const packagePrice = recruitmentCount > 0 ? Math.round(subtotal / recruitmentCount) : 0
  
  const isPaymentConfirmed = campaign.payment_status === 'confirmed'

  return (
    <>
      <style>{printStyles}</style>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/company/campaigns/payment?id=${id}&region=${region}`)}
        className="mb-4 no-print"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        결제 방법 선택으로 돌아가기
      </Button>

      <Card className="printable-area">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">견적서 및 입금 안내</CardTitle>
            {isPaymentConfirmed ? (
              <Badge variant="success" className="text-sm bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                입금 확인 완료
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-sm">입금 대기</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            캠페인 견적서를 확인하고 입금을 진행해주세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 견적서 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">견적 내역</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">항목</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">단가</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">수량</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{campaign.package_type}</div>
                      <div className="text-gray-600 text-xs mt-1">{campaign.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {packagePrice.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {recruitmentCount}명
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {subtotal.toLocaleString()}원
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan="3" className="px-4 py-3 text-sm text-right text-gray-700 font-medium">
                      부가세 (10%)
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">
                      +{vat.toLocaleString()}원
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-blue-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-4 text-right font-semibold">
                      총 결제 금액
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold text-blue-600">
                        {totalCost.toLocaleString()}원
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 입금 계좌 정보 */}
          {paymentAccount ? (
            <div>
              <h3 className="font-semibold text-lg mb-4">입금 계좌 정보</h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">은행명</p>
                    <p className="text-xl font-semibold">{paymentAccount.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">계좌번호</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-blue-600 tracking-wider">
                        {paymentAccount.account_number}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyAccount}
                        className="ml-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            복사
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">예금주</p>
                    <p className="text-lg font-medium">{paymentAccount.account_holder}</p>
                  </div>
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">입금 금액</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {totalCost.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                입금 계좌 정보가 등록되지 않았습니다. 관리자에게 문의해주세요.
              </p>
            </div>
          )}

          {/* 입금자명 입력 */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">입금자명 *</h3>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700">입금하실 때 사용할 입금자명을 입력해주세요. (회사명 또는 담당자명)</p>
            </div>
            <Input
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="예: (주)에이블씨엔씨 또는 홍길동"
              className="max-w-md"
              required
            />
          </div>

          {/* 세금계산서 정보 */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">세금계산서 정보 (선택사항)</h3>
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">회사명 *</Label>
                  <Input
                    id="company_name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="(주)에이블씨엔씨"
                  />
                </div>
                <div>
                  <Label htmlFor="business_number">사업자등록번호</Label>
                  <Input
                    id="business_number"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="123-45-67890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="representative_name">대표자명</Label>
                  <Input
                    id="representative_name"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">연락처 *</Label>
                  <Input
                    id="contact"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">세금계산서 받으실 메일 주소 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="company@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_type">업태</Label>
                  <Input
                    id="business_type"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="예: 제조업, 도소매업, 서비스업"
                  />
                </div>
                <div>
                  <Label htmlFor="business_category">업종</Label>
                  <Input
                    id="business_category"
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    placeholder="예: 광고대행, 컴퓨터판매, 컨설팅"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company_address">주소</Label>
                <Input
                  id="company_address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="서울시 강남구..."
                />
              </div>

              <div>
                <Label htmlFor="memo">메모 (선택사항)</Label>
                <Textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="추가 요청사항이 있으시면 입력해주세요"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* 입금 안내 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-3">입금 안내사항</h4>
            <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
              <li>위 계좌로 총 결제 금액을 입금해주세요</li>
              <li>입금자명은 회사명 또는 담당자명으로 해주세요</li>
              <li>세금계산서가 필요한 경우 위 정보를 입력해주세요</li>
              <li>입금 완료 후 아래 "입금 완료 확인" 버튼을 클릭해주세요</li>
              <li>입금 확인 후 관리자 승인이 진행됩니다</li>
              <li>승인 완료 시 캠페인이 정식으로 시작됩니다</li>
            </ul>
          </div>

          {/* 캠페인 정보 요약 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">캠페인 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">캠페인명</span>
                <span className="font-medium">{campaign.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">브랜드</span>
                <span>{campaign.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">제품명</span>
                <span>{campaign.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">모집 인원</span>
                <span>{recruitmentCount}명</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              견적서 출력
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={confirming || isPaymentConfirmed}
              className="flex-1"
            >
              {confirming ? (
                '처리 중...'
              ) : isPaymentConfirmed ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  입금 확인 완료
                </>
              ) : (
                '다음단계'
              )}
            </Button>
          </div>

          {isPaymentConfirmed && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700">
                입금이 확인되었습니다. 관리자 승인 후 캠페인이 시작됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}

export default InvoicePage

