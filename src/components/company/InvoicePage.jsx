import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
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

  const [campaign, setCampaign] = useState(null)
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
  const [uploadingTaxInvoice, setUploadingTaxInvoice] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // 캠페인 정보 로드
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 입금 계좌 정보 로드 (한국 지역)
      const { data: accountData, error: accountError } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('region', 'korea')
        .single()

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
      const { storage } = await import('../../lib/supabaseKorea')
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
      // 1. campaigns 테이블 업데이트
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({
          payment_status: 'pending',
          payment_requested_at: new Date().toISOString()
        })
        .eq('id', id)

      if (campaignError) throw campaignError

      // 2. payments 테이블에 견적서 정보 저장
      const invoiceData = {
        depositor_name: depositorName,
        tax_invoice_info: {
          business_registration_number: company.business_registration_number,
          company_name: company.company_name,
          ceo_name: company.ceo_name,
          business_type: company.business_type,
          business_category: company.business_category,
          company_address: company.company_address,
          email: company.email,
          phone: company.phone
        },
        tax_invoice_file_url: taxInvoiceFileUrl,
        payment_account: paymentAccount,
        invoice_date: new Date().toISOString(),
        subtotal: subtotal,
        discount_amount: discountAmount,
        total_amount: totalCost
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          campaign_id: id,
          company_id: campaign.company_id,
          amount: totalCost,
          currency: 'KRW',
          payment_method: 'bank_transfer',
          status: 'pending',
          region: 'korea',
          bank_transfer_info: invoiceData
        })

      if (paymentError) throw paymentError

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

  const packagePrices = {
    'junior': 200000,
    'intermediate': 300000,
    'senior': 400000,
    '4week_challenge': 600000,
    'oliveyoung': 200000,
    '올영 20만원': 200000,
    'premium': 300000,
    '프리미엄 30만원': 300000,
    '4주챌린지 60만원': 600000
  }

  const packagePrice = packagePrices[campaign.package_type] || 200000
  const recruitmentCount = campaign.recruitment_count || campaign.total_slots || 0
  
  // 할인 계산 (1천만원 이상만 5% 할인)
  const subtotal = packagePrice * recruitmentCount
  let discountRate = 0
  if (subtotal >= 10000000) {
    discountRate = 0.05 // 5% 할인
  }
  const discountAmount = Math.floor(subtotal * discountRate)
  const totalCost = subtotal - discountAmount
  
  const isPaymentConfirmed = campaign.payment_status === 'confirmed'

  return (
    <>
      <style>{printStyles}</style>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/company/campaigns/${id}/order-confirmation`)}
        className="mb-4 no-print"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        주문서로 돌아가기
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
                <tbody className="divide-y">
                  <tr>
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
                  {discountRate > 0 && (
                    <tr className="bg-green-50">
                      <td colSpan="3" className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                        할인 ({discountRate * 100}%)
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                        -{discountAmount.toLocaleString()}원
                      </td>
                    </tr>
                  )}
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

          {/* 세금계산서 정보 */}
          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">세금계산서 정보 (선택사항)</h3>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700">세금계산서 발행을 원하시는 경우 아래 정보를 입력해주세요.</p>
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

