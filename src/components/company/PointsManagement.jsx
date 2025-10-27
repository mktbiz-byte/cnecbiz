import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Coins, CreditCard, History, FileText, Download } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import TaxDocumentIssueModal from './TaxDocumentIssueModal'
// Netlify Functions를 통해 호출

export default function PointsManagement() {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [currentPoints, setCurrentPoints] = useState(0)
  const [chargeHistory, setChargeHistory] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [showTaxDocModal, setShowTaxDocModal] = useState(false)
  
  // 견적서 폼 데이터
  const [invoiceForm, setInvoiceForm] = useState({
    receipt_type: 'tax_invoice', // 'tax_invoice' or 'cashbill'
    company_name: '',
    business_number: '',
    representative: '',
    address: '',
    contact: '',
    email: '',
    business_type: '',
    business_category: '',
    memo: '',
    depositor_name: '', // 예금주명 (입금자명)
    // 현금영수증 전용 필드
    cashbill_identity_num: '', // 휴대폰번호 or 사업자번호
    cashbill_usage: '1' // 1: 소득공제용, 2: 지출증빙용
  })

  // 할인율 적용된 포인트 패키지
  const pointPackages = [
    { 
      points: 50000, 
      originalPrice: 50000, 
      discountRate: 0,
      finalPrice: 50000,
      description: '기본 패키지'
    },
    { 
      points: 100000, 
      originalPrice: 100000, 
      discountRate: 0,
      finalPrice: 100000,
      description: '스탠다드 패키지'
    },
    { 
      points: 300000, 
      originalPrice: 300000, 
      discountRate: 0,
      finalPrice: 300000,
      description: '프리미엄 패키지'
    },
    { 
      points: 500000, 
      originalPrice: 500000, 
      discountRate: 0,
      finalPrice: 500000,
      description: '비즈니스 패키지'
    },
    { 
      points: 1000000, 
      originalPrice: 1000000, 
      discountRate: 5,
      finalPrice: 950000,
      description: '엔터프라이즈 패키지',
      recommended: true
    },
    { 
      points: 2000000, 
      originalPrice: 2000000, 
      discountRate: 10,
      finalPrice: 1800000,
      description: '얼티밋 패키지 (최대 할인)',
      recommended: true
    }
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: companyData } = await supabaseBiz
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (companyData) {
      setCompany(companyData)
      setCurrentPoints(companyData.points_balance || 0)
      fetchChargeHistory(companyData.id)
      
      // 회사 정보로 폼 자동 채우기
      setInvoiceForm(prev => ({
        ...prev,
        company_name: companyData.company_name || '',
        business_number: companyData.business_number || '',
        representative: companyData.representative_name || '',
        address: companyData.address || '',
        contact: companyData.phone || '',
        email: companyData.email || ''
      }))
    }
  }

  const fetchChargeHistory = async (companyId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('points_charge_requests')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setChargeHistory(data)
      }
    } catch (error) {
      console.error('Error fetching charge history:', error)
    }
  }

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg)
    setShowInvoiceForm(true)
  }

  // 세금 문서 발행 처리
  const handleIssueTaxDocument = async ({ documentType, formData, chargeAmount }) => {
    try {
      const corpNum = company.business_number.replace(/-/g, '');
      
      // 공통 데이터
      const commonData = {
        invoicerCorpNum: corpNum,
        invoicerCorpName: company.company_name,
        invoicerCEOName: company.representative,
        invoicerAddr: company.address,
        invoicerBizType: company.business_type || '',
        invoicerBizClass: company.business_category || '',
        invoicerEmail: formData.email,
        invoicerTEL: formData.tel,
        invoicerHP: formData.hp,
        invoiceeCorpNum: corpNum, // 자가 발행
        invoiceeCorpName: company.company_name,
        invoiceeCEOName: company.representative,
        invoiceeAddr: company.address,
        invoiceeBizType: company.business_type || '',
        invoiceeBizClass: company.business_category || '',
        invoiceeEmail: formData.email,
        invoiceeTEL: formData.tel,
        invoiceeHP: formData.hp,
      };

      let result;
      
      if (documentType === 'taxinvoice') {
        // 세금계산서 발행
        const supplyCost = formData.taxType === '과세' ? Math.floor(chargeAmount / 1.1) : chargeAmount;
        const tax = formData.taxType === '과세' ? chargeAmount - supplyCost : 0;
        
        const taxinvoiceData = createTaxinvoiceData({
          ...commonData,
          purposeType: formData.purposeType,
          taxType: formData.taxType,
          supplyCostTotal: supplyCost,
          taxTotal: tax,
          totalAmount: chargeAmount,
          detailList: [{
            itemName: formData.itemName,
            supplyCost: supplyCost,
            tax: tax,
          }],
          remark1: formData.remark,
        });
        
        result = await issueTaxinvoice(corpNum, taxinvoiceData);
        
      } else if (documentType === 'cashbill') {
        // 현금영수증 발행
        const cashbillData = createCashbillData({
          franchiseCorpNum: corpNum,
          franchiseCorpName: company.company_name,
          franchiseCEOName: company.representative,
          franchiseAddr: company.address,
          franchiseTEL: formData.tel,
          mgtKey: `CB${Date.now()}`,
          tradeUsage: formData.tradeUsage,
          identityNum: formData.identityNum,
          supplyCost: chargeAmount,
          tax: 0,
          totalAmount: chargeAmount,
          customerName: company.representative,
          itemName: formData.itemName,
          email: formData.email,
          hp: formData.hp,
        });
        
        result = await issueCashbill(corpNum, cashbillData);
        
      } else if (documentType === 'statement') {
        // 전자명세서 발행
        const statementData = createStatementData({
          senderCorpNum: corpNum,
          senderCorpName: company.company_name,
          senderCEOName: company.representative,
          senderAddr: company.address,
          senderBizType: company.business_type || '',
          senderBizClass: company.business_category || '',
          senderEmail: formData.email,
          senderTEL: formData.tel,
          senderHP: formData.hp,
          receiverCorpNum: corpNum,
          receiverCorpName: company.company_name,
          receiverCEOName: company.representative,
          receiverAddr: company.address,
          receiverEmail: formData.email,
          receiverTEL: formData.tel,
          receiverHP: formData.hp,
          mgtKey: `ST${Date.now()}`,
          supplyCostTotal: chargeAmount,
          taxTotal: 0,
          totalAmount: chargeAmount,
          detailList: [{
            itemName: formData.itemName,
            supplyCost: chargeAmount,
            tax: 0,
          }],
          remark1: formData.remark,
        }, parseInt(formData.statementType));
        
        result = await issueStatement(corpNum, parseInt(formData.statementType), statementData);
      }
      
      alert('세금 문서가 발행되었습니다!');
      return result;
      
    } catch (error) {
      console.error('세금 문서 발행 실패:', error);
      throw error;
    }
  };

  const handleSubmitChargeRequest = async () => {
    if (!selectedPackage) {
      alert('패키지를 선택해주세요')
      return
    }

    // 필수 필드 검증
    if (invoiceForm.receipt_type === 'tax_invoice') {
      if (!invoiceForm.company_name || !invoiceForm.contact || !invoiceForm.email) {
        alert('필수 정보를 입력해주세요')
        return
      }
    } else if (invoiceForm.receipt_type === 'cashbill') {
      if (!invoiceForm.cashbill_identity_num || !invoiceForm.email) {
        alert('필수 정보를 입력해주세요')
        return
      }
    }

    setLoading(true)
    try {
      // 충전 요청 생성
      const { data: chargeData, error: chargeError } = await supabaseBiz
        .from('points_charge_requests')
        .insert({
          company_id: company.id,
          points: selectedPackage.points,
          amount: selectedPackage.finalPrice,
          original_amount: selectedPackage.originalPrice,
          discount_rate: selectedPackage.discountRate,
          status: 'pending',
          payment_method: 'bank_transfer',
          invoice_data: invoiceForm
        })
        .select()
        .single()

      if (chargeError) throw chargeError

      alert(`포인트 충전 신청이 완료되었습니다!\n\n신청 포인트: ${selectedPackage.points.toLocaleString()}P\n결제 금액: ${selectedPackage.finalPrice.toLocaleString()}원\n${selectedPackage.discountRate > 0 ? `할인율: ${selectedPackage.discountRate}%\n` : ''}무통장 입금 계좌 정보는 이메일로 발송됩니다.\n\n입금 확인 후 포인트가 지급됩니다.`)
      
      setShowInvoiceForm(false)
      setSelectedPackage(null)
      fetchChargeHistory(company.id)
    } catch (error) {
      console.error('Error submitting charge request:', error)
      alert('충전 신청 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700'
    }
    const labels = {
      pending: '입금 대기',
      approved: '입금 확인',
      rejected: '취소',
      completed: '완료'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Coins className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">포인트 관리 & 충전</h1>
        </div>

        {/* Current Balance */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">보유 포인트</div>
              <div className="text-5xl font-bold text-blue-600 mb-4">
                {currentPoints.toLocaleString()}P
              </div>
              <p className="text-sm text-gray-500">
                1P = 1원으로 캠페인 비용 결제에 사용됩니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Point Packages */}
        {!showInvoiceForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                포인트 충전
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pointPackages.map((pkg) => (
                  <div
                    key={pkg.points}
                    className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                      pkg.recommended
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    {pkg.recommended && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                        추천
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{pkg.description}</div>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {pkg.points.toLocaleString()}P
                      </div>
                      {pkg.discountRate > 0 && (
                        <div className="mb-2">
                          <div className="text-sm text-gray-400 line-through">
                            {pkg.originalPrice.toLocaleString()}원
                          </div>
                          <div className="text-xs text-red-600 font-bold">
                            {pkg.discountRate}% 할인
                          </div>
                        </div>
                      )}
                      <div className="text-2xl font-bold text-gray-900">
                        {pkg.finalPrice.toLocaleString()}원
                      </div>
                      {pkg.discountRate > 0 && (
                        <div className="text-xs text-green-600 font-medium mt-2">
                          {(pkg.originalPrice - pkg.finalPrice).toLocaleString()}원 절약!
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-bold text-blue-900 mb-2">💡 할인 혜택</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <strong>100만 포인트</strong>: 5% 할인 (950,000원)</li>
                  <li>• <strong>200만 포인트</strong>: 10% 할인 (1,800,000원) - 최대 할인율</li>
                  <li>• 결제는 신용카드로만 가능합니다</li>
                  <li>• 충전 후 관리자 승인이 필요합니다 (영업일 기준 1일 이내)</li>
                  <li>• 포인트는 환불이 불가능합니다</li>
                  <li>• 세금계산서 발급이 필요한 경우 고객센터로 문의해주세요</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Form */}
        {showInvoiceForm && selectedPackage && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                무통장 입금 신청서
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-bold text-blue-900 mb-2">선택한 패키지</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedPackage.points.toLocaleString()}P
                    </div>
                    <div className="text-xs text-gray-600">{selectedPackage.description}</div>
                  </div>
                  <div className="text-right">
                    {selectedPackage.discountRate > 0 && (
                      <div className="text-sm text-gray-400 line-through">
                        {selectedPackage.originalPrice.toLocaleString()}원
                      </div>
                    )}
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedPackage.finalPrice.toLocaleString()}원
                    </div>
                    {selectedPackage.discountRate > 0 && (
                      <div className="text-xs text-red-600 font-bold">
                        {selectedPackage.discountRate}% 할인 적용
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* 증빙 타입 선택 */}
                <div className="mb-6">
                  <Label className="text-base font-semibold mb-3 block">증빙 타입 선택 *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receipt_type"
                        value="tax_invoice"
                        checked={invoiceForm.receipt_type === 'tax_invoice'}
                        onChange={(e) => setInvoiceForm({...invoiceForm, receipt_type: e.target.value})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">세금계산서 (사업자용)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="receipt_type"
                        value="cashbill"
                        checked={invoiceForm.receipt_type === 'cashbill'}
                        onChange={(e) => setInvoiceForm({...invoiceForm, receipt_type: e.target.value})}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">현금영수증 (개인/사업자)</span>
                    </label>
                  </div>
                </div>

                {/* 세금계산서 폼 */}
                {invoiceForm.receipt_type === 'tax_invoice' && (
                  <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">회사명 *</Label>
                    <Input
                      id="company_name"
                      value={invoiceForm.company_name}
                      onChange={(e) => setInvoiceForm({...invoiceForm, company_name: e.target.value})}
                      placeholder="(주)에이블씨엔씨"
                    />
                  </div>
                  <div>
                    <Label htmlFor="business_number">사업자등록번호</Label>
                    <Input
                      id="business_number"
                      value={invoiceForm.business_number}
                      onChange={(e) => setInvoiceForm({...invoiceForm, business_number: e.target.value})}
                      placeholder="123-45-67890"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="representative">대표자명</Label>
                    <Input
                      id="representative"
                      value={invoiceForm.representative}
                      onChange={(e) => setInvoiceForm({...invoiceForm, representative: e.target.value})}
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">연락처 *</Label>
                    <Input
                      id="contact"
                      value={invoiceForm.contact}
                      onChange={(e) => setInvoiceForm({...invoiceForm, contact: e.target.value})}
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">세금계산서 받으실 메일 주소 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invoiceForm.email}
                    onChange={(e) => setInvoiceForm({...invoiceForm, email: e.target.value})}
                    placeholder="company@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="depositor_name">예금주명 (입금자명) *</Label>
                  <Input
                    id="depositor_name"
                    value={invoiceForm.depositor_name || invoiceForm.company_name}
                    onChange={(e) => setInvoiceForm({...invoiceForm, depositor_name: e.target.value})}
                    placeholder="회사명과 동일하게 입금해주세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">⚠️ 입금자명이 일치해야 자동 확인됩니다</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_type">업태</Label>
                    <Input
                      id="business_type"
                      value={invoiceForm.business_type}
                      onChange={(e) => setInvoiceForm({...invoiceForm, business_type: e.target.value})}
                      placeholder="예: 제조업, 도소매업, 서비스업"
                    />
                  </div>
                  <div>
                    <Label htmlFor="business_category">업종</Label>
                    <Input
                      id="business_category"
                      value={invoiceForm.business_category}
                      onChange={(e) => setInvoiceForm({...invoiceForm, business_category: e.target.value})}
                      placeholder="예: 광고대행, 컴퓨터판매, 컨설팅"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={invoiceForm.address}
                    onChange={(e) => setInvoiceForm({...invoiceForm, address: e.target.value})}
                    placeholder="서울시 강남구..."
                  />
                </div>



                <div>
                  <Label htmlFor="memo">메모 (선택사항)</Label>
                  <Textarea
                    id="memo"
                    value={invoiceForm.memo}
                    onChange={(e) => setInvoiceForm({...invoiceForm, memo: e.target.value})}
                    placeholder="추가 요청사항이 있으시면 입력해주세요"
                    rows={3}
                  />
                </div>
                  </>
                )}

                {/* 현금영수증 폼 */}
                {invoiceForm.receipt_type === 'cashbill' && (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">현금영수증은 휴대폰번호 또는 사업자번호로 발급됩니다.</p>
                    </div>

                    <div>
                      <Label htmlFor="cashbill_usage">사용용도 *</Label>
                      <select
                        id="cashbill_usage"
                        value={invoiceForm.cashbill_usage}
                        onChange={(e) => setInvoiceForm({...invoiceForm, cashbill_usage: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="1">소득공제용 (개인)</option>
                        <option value="2">지출증빙용 (사업자)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="cashbill_identity_num">
                        {invoiceForm.cashbill_usage === '1' ? '휴대폰번호' : '사업자번호'} *
                      </Label>
                      <Input
                        id="cashbill_identity_num"
                        value={invoiceForm.cashbill_identity_num}
                        onChange={(e) => setInvoiceForm({...invoiceForm, cashbill_identity_num: e.target.value})}
                        placeholder={invoiceForm.cashbill_usage === '1' ? '010-1234-5678' : '123-45-67890'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="cashbill_email">이메일 *</Label>
                      <Input
                        id="cashbill_email"
                        type="email"
                        value={invoiceForm.email}
                        onChange={(e) => setInvoiceForm({...invoiceForm, email: e.target.value})}
                        placeholder="cashbill@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="depositor_name_cb">예금주명 (입금자명) *</Label>
                      <Input
                        id="depositor_name_cb"
                        value={invoiceForm.depositor_name || invoiceForm.company_name}
                        onChange={(e) => setInvoiceForm({...invoiceForm, depositor_name: e.target.value})}
                        placeholder="입금하실 예금주명을 입력하세요"
                      />
                      <p className="text-xs text-gray-500 mt-1">⚠️ 입금자명이 일치해야 자동 확인됩니다</p>
                    </div>

                    <div>
                      <Label htmlFor="cashbill_name">성명 (선택사항)</Label>
                      <Input
                        id="cashbill_name"
                        value={invoiceForm.company_name}
                        onChange={(e) => setInvoiceForm({...invoiceForm, company_name: e.target.value})}
                        placeholder="홍길동"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cashbill_memo">메모 (선택사항)</Label>
                      <Textarea
                        id="cashbill_memo"
                        value={invoiceForm.memo}
                        onChange={(e) => setInvoiceForm({...invoiceForm, memo: e.target.value})}
                        placeholder="추가 요청사항이 있으시면 입력해주세요"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-bold text-yellow-900 mb-2">📌 입금 안내</div>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• 신청 후 입금 계좌 정보가 이메일로 발송됩니다</li>
                  <li>• 입금자명은 회사명과 동일하게 입금해주세요</li>
                  <li>• 입금 확인 후 영업일 기준 1일 이내 포인트가 지급됩니다</li>
                  <li>• {invoiceForm.receipt_type === 'tax_invoice' ? '세금계산서' : '현금영수증'}는 입금 확인 후 자동으로 발행됩니다</li>
                </ul>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvoiceForm(false)
                    setSelectedPackage(null)
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSubmitChargeRequest}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {loading ? '처리 중...' : '충전 신청하기'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charge History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              충전 내역
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chargeHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                충전 내역이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">날짜</th>
                      <th className="text-left p-4">포인트</th>
                      <th className="text-left p-4">금액</th>
                      <th className="text-left p-4">할인</th>
                      <th className="text-left p-4">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargeHistory.map((charge) => (
                      <tr key={charge.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-sm">
                          {new Date(charge.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-4 font-bold text-blue-600">
                          +{charge.points?.toLocaleString()}P
                        </td>
                        <td className="p-4 font-medium">
                          {charge.amount?.toLocaleString()}원
                        </td>
                        <td className="p-4">
                          {charge.discount_rate > 0 ? (
                            <span className="text-red-600 font-medium">
                              {charge.discount_rate}% 할인
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(charge.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 세금 문서 발행 모달 */}
      <TaxDocumentIssueModal
        isOpen={showTaxDocModal}
        onClose={() => setShowTaxDocModal(false)}
        onIssue={handleIssueTaxDocument}
        chargeAmount={selectedPackage?.finalPrice || 0}
        companyInfo={{
          email: invoiceForm.email,
          representative: invoiceForm.company_name,
          phone: invoiceForm.contact,
        }}
      />
    </div>
  )
}

