import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText, Plus, Trash2, Download, Mail, Loader2, ArrowLeft,
  Search, Building2, Send, Check
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

const OUR_COMPANY = {
  businessNumber: '575-81-02253',
  companyName: '하우파파 주식회사',
  ceoName: '박현웅',
  address: '서울 중구 퇴계로36길 2 동국대학교 충무로 영상센터 1009호'
}

const BANK_ACCOUNT = 'IBK기업은행 047-122753-04-011 (주식회사 하우파파)'

const CAMPAIGN_TYPES = [
  { value: '', label: '-- 선택 --' },
  { value: '기획 캠페인 (한국)', label: '기획 캠페인 (한국)' },
  { value: '기획 캠페인 (일본)', label: '기획 캠페인 (일본)' },
  { value: '기획 캠페인 (미국)', label: '기획 캠페인 (미국)' },
  { value: '올리브영 캠페인', label: '올리브영 캠페인' },
  { value: '4주 챌린지 캠페인', label: '4주 챌린지 캠페인' },
  { value: '메가와리 캠페인', label: '메가와리 캠페인' },
  { value: '숏폼 캠페인', label: '숏폼 캠페인' },
  { value: '롱폼 캠페인', label: '롱폼 캠페인' },
  { value: '인스타그램 캠페인', label: '인스타그램 캠페인' },
  { value: '틱톡 캠페인', label: '틱톡 캠페인' },
  { value: '크리에이터 매칭', label: '크리에이터 매칭' },
  { value: '컨설팅', label: '컨설팅' },
  { value: '기타', label: '기타 (직접 입력)' }
]

const emptyItem = () => ({ name: '', nameCustom: '', qty: '', price: '' })

export default function QuoteManagement() {
  const navigate = useNavigate()
  const printRef = useRef(null)

  // 기업 검색
  const [companies, setCompanies] = useState([])
  const [companySearch, setCompanySearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)

  // 견적서 폼
  const [quoteDate, setQuoteDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
  })
  const [client, setClient] = useState({
    businessNumber: '',
    companyName: '',
    ceoName: '',
    address: ''
  })
  const [items, setItems] = useState([emptyItem()])

  // 이메일 발송
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // PDF
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // 기업 목록 로드
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabaseBiz
        .from('companies')
        .select('id, company_name, business_number, ceo_name, company_address, email, contact_email, notification_email')
        .order('company_name')
        .limit(500)
      if (data) setCompanies(data)
    }
    fetchCompanies()
  }, [])

  const filteredCompanies = companySearch.length > 0
    ? companies.filter(c =>
        (c.company_name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
        (c.business_number || '').includes(companySearch)
      )
    : companies

  const selectCompany = (company) => {
    setSelectedCompanyId(company.id)
    setClient({
      businessNumber: company.business_number || '',
      companyName: company.company_name || '',
      ceoName: company.ceo_name || '',
      address: company.company_address || ''
    })
    setEmailTo(company.notification_email || company.contact_email || company.email || '')
    setCompanySearch(company.company_name || '')
    setShowDropdown(false)
  }

  // 품목 관리
  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }
  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  // 계산
  const getItemName = (item) => item.name === '기타' ? item.nameCustom : item.name
  const getAmount = (item) => {
    const q = Number(item.qty) || 0
    const p = Number(item.price) || 0
    return q * p
  }
  const subtotal = items.reduce((sum, item) => sum + getAmount(item), 0)
  const tax = Math.floor(subtotal * 0.1)
  const total = subtotal + tax

  const fmt = (n) => n.toLocaleString('ko-KR')

  // oklch 색상 제거 (html2canvas 호환용)
  const stripOklch = (doc) => {
    const root = doc.documentElement
    const computedStyle = root.style
    // CSS 변수에서 oklch 제거 — 안전한 기본값으로 교체
    const sheets = doc.styleSheets
    try {
      for (const sheet of sheets) {
        try {
          const rules = sheet.cssRules
          for (let i = 0; i < rules.length; i++) {
            const rule = rules[i]
            if (rule.cssText && rule.cssText.includes('oklch')) {
              sheet.deleteRule(i)
              i--
            }
          }
        } catch (e) { /* cross-origin sheets */ }
      }
    } catch (e) { /* skip */ }
    // 루트에 안전한 색상 세팅
    root.style.setProperty('--background', '#ffffff')
    root.style.setProperty('--foreground', '#111827')
    root.style.setProperty('color', '#111827')
    root.style.setProperty('background-color', '#ffffff')
  }

  const captureQuote = async () => {
    const { default: html2canvas } = await import('html2canvas')
    const el = printRef.current
    if (!el) throw new Error('견적서 영역을 찾을 수 없습니다.')
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      onclone: (doc) => stripOklch(doc)
    })
  }

  // PDF 다운로드
  const handleDownloadPdf = async () => {
    setPdfGenerating(true)
    try {
      const { jsPDF } = await import('jspdf')
      const canvas = await captureQuote()
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`견적서_${client.companyName || '신규'}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('PDF 생성 실패:', error)
      alert('PDF 생성에 실패했습니다.')
    } finally {
      setPdfGenerating(false)
    }
  }

  // 이메일 발송
  const handleSendEmail = async () => {
    if (!emailTo) {
      alert('이메일 주소를 입력해주세요.')
      return
    }

    setEmailSending(true)
    setEmailSent(false)
    try {
      const canvas = await captureQuote()
      const imgBase64 = canvas.toDataURL('image/png').split(',')[1]

      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: `[CNEC] 견적서 - ${client.companyName || '귀사'}`,
          html: `
            <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">견적서를 보내드립니다.</h2>
              <p style="color: #666;">안녕하세요, ${client.companyName || '귀사'} 담당자님.</p>
              <p style="color: #666;">크넥(CNEC)에서 보내드리는 견적서입니다.</p>
              <p style="color: #666;">첨부된 견적서를 확인해주세요.</p>
              <br/>
              <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
                <tr style="background: #f8f9fa;">
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold;">견적 합계</td>
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6; font-weight: bold; color: #6C5CE7;">${fmt(total)}원 (VAT 포함)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6;">견적일자</td>
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6;">${quoteDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6;">입금 계좌</td>
                  <td style="padding: 8px 12px; border: 1px solid #dee2e6;">${BANK_ACCOUNT}</td>
                </tr>
              </table>
              <br/>
              <p style="color: #999; font-size: 12px;">문의: 1833-6025 | mkt_biz@cnec.co.kr</p>
              <p style="color: #999; font-size: 12px;">주식회사 하우파파 | ${OUR_COMPANY.address}</p>
            </div>
          `,
          attachments: [{
            filename: `견적서_${client.companyName || '신규'}_${new Date().toISOString().slice(0, 10)}.png`,
            content: imgBase64,
            contentType: 'image/png'
          }]
        })
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 3000)
    } catch (error) {
      console.error('이메일 발송 실패:', error)
      alert(`이메일 발송 실패: ${error.message}`)
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-[1200px] mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Pretendard, sans-serif' }}>견적서 관리</h1>
              <p className="text-sm text-gray-500">견적서를 작성하고 PDF 다운로드 또는 이메일로 발송하세요.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              disabled={pdfGenerating}
              className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl gap-2"
            >
              {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF 다운로드
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 왼쪽: 입력 폼 */}
          <div className="col-span-1 space-y-4">
            {/* 기업 검색 */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#6C5CE7]" />
                  기업 검색
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input
                    value={companySearch}
                    onChange={e => { setCompanySearch(e.target.value); setShowDropdown(true); setSelectedCompanyId(null) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="기업명 또는 사업자번호 검색..."
                    className="rounded-xl"
                  />
                  {showDropdown && filteredCompanies.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-[200px] overflow-y-auto">
                      {filteredCompanies.slice(0, 20).map(c => (
                        <button
                          key={c.id}
                          onClick={() => selectCompany(c)}
                          className="w-full text-left px-3 py-2 hover:bg-[#F0EDFF] text-sm transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium text-gray-900">{c.company_name}</span>
                          {c.business_number && <span className="text-xs text-gray-400">{c.business_number}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">기업을 선택하면 자동 입력됩니다. 신규는 아래에 직접 입력하세요.</p>
              </CardContent>
            </Card>

            {/* 거래처 정보 */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#6C5CE7]" />
                  거래처 정보 (공급받는자)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">등록번호</label>
                  <Input value={client.businessNumber} onChange={e => setClient(p => ({ ...p, businessNumber: e.target.value }))} placeholder="000-00-00000" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">회사명</label>
                  <Input value={client.companyName} onChange={e => setClient(p => ({ ...p, companyName: e.target.value }))} placeholder="회사명 입력" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">대표자</label>
                  <Input value={client.ceoName} onChange={e => setClient(p => ({ ...p, ceoName: e.target.value }))} placeholder="대표자명" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">소재지</label>
                  <Input value={client.address} onChange={e => setClient(p => ({ ...p, address: e.target.value }))} placeholder="주소" className="rounded-xl" />
                </div>
              </CardContent>
            </Card>

            {/* 견적일자 */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700">견적일자</CardTitle>
              </CardHeader>
              <CardContent>
                <Input value={quoteDate} onChange={e => setQuoteDate(e.target.value)} className="rounded-xl" />
              </CardContent>
            </Card>

            {/* 품목 */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-gray-700">품목</CardTitle>
                  <Button variant="ghost" size="sm" onClick={addItem} className="text-[#6C5CE7] hover:bg-[#F0EDFF] gap-1 text-xs">
                    <Plus className="w-3 h-3" /> 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">No.{String(idx + 1).padStart(2, '0')}</span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 mb-0.5 block">품명</label>
                      <select
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/20"
                      >
                        {CAMPAIGN_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {item.name === '기타' && (
                        <Input
                          value={item.nameCustom}
                          onChange={e => updateItem(idx, 'nameCustom', e.target.value)}
                          placeholder="직접 입력..."
                          className="mt-1 rounded-lg text-sm"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-400 mb-0.5 block">수량</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                          placeholder="0"
                          className="rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 mb-0.5 block">단가 (원)</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', e.target.value)}
                          placeholder="0"
                          className="rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold text-[#6C5CE7]" style={{ fontFamily: 'Outfit' }}>
                      금액: {fmt(getAmount(item))}원
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 이메일 발송 */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#6C5CE7]" />
                  이메일 발송
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="수신자 이메일 주소"
                  className="rounded-xl"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailTo}
                  className={`w-full rounded-xl gap-2 ${emailSent ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#6C5CE7] hover:bg-[#5A4BD1]'} text-white`}
                >
                  {emailSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 발송 중...</>
                  ) : emailSent ? (
                    <><Check className="w-4 h-4" /> 발송 완료!</>
                  ) : (
                    <><Send className="w-4 h-4" /> 견적서 이메일 발송</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 견적서 미리보기 */}
          <div className="col-span-2">
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-2 bg-gray-50">
                <CardTitle className="text-sm font-bold text-gray-500">견적서 미리보기</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={printRef}
                  style={{ fontFamily: 'Pretendard, "Noto Sans KR", sans-serif', minHeight: '900px', backgroundColor: '#ffffff', padding: '40px', color: '#111827' }}
                >
                  {/* 제목 */}
                  <h1 style={{ textAlign: 'center', fontSize: '1.875rem', fontWeight: 800, color: '#111827', marginBottom: '8px', letterSpacing: '0.1em' }}>견 적 서</h1>
                  <div style={{ fontSize: '13px', color: '#4B5563', marginBottom: '24px' }}>견적일자: {quoteDate}</div>

                  {/* 상단 정보 테이블 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px', fontSize: '13px' }}>
                    <tbody>
                      <tr>
                        {/* 거래처 (공급받는자) */}
                        <td style={{ verticalAlign: 'top', width: '50%', paddingRight: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9CA3AF' }}>
                            <tbody>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', width: '80px', textAlign: 'center' }}>등록번호</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{client.businessNumber || <span style={{ color: '#D1D5DB' }}>-</span>}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>회사명</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{client.companyName || <span style={{ color: '#D1D5DB' }}>-</span>}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>대표자</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{client.ceoName || <span style={{ color: '#D1D5DB' }}>-</span>}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>소재지</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', lineHeight: '1.4' }}>{client.address || <span style={{ color: '#D1D5DB' }}>-</span>}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                        {/* 공급자 (우리) */}
                        <td style={{ verticalAlign: 'top', width: '50%', paddingLeft: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9CA3AF' }}>
                            <tbody>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', width: '80px', textAlign: 'center' }}>등록번호</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{OUR_COMPANY.businessNumber}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>회사명</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{OUR_COMPANY.companyName}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>대표자</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{OUR_COMPANY.ceoName}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '8px 12px', textAlign: 'center' }}>소재지</td>
                                <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', lineHeight: '1.4' }}>{OUR_COMPANY.address}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 구분선 */}
                  <div style={{ borderTop: '2px solid #111827', marginBottom: '4px' }} />
                  <div style={{ borderTop: '1px solid #9CA3AF', marginBottom: '24px' }} />

                  {/* 품목 테이블 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9CA3AF', marginBottom: '24px', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F3F4F6' }}>
                        <th style={{ border: '1px solid #9CA3AF', padding: '8px 12px', width: '48px', textAlign: 'center', fontWeight: 'bold' }}>No</th>
                        <th style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'left', fontWeight: 'bold' }}>품명</th>
                        <th style={{ border: '1px solid #9CA3AF', padding: '8px 12px', width: '80px', textAlign: 'center', fontWeight: 'bold' }}>수량</th>
                        <th style={{ border: '1px solid #9CA3AF', padding: '8px 12px', width: '112px', textAlign: 'right', fontWeight: 'bold' }}>단가</th>
                        <th style={{ border: '1px solid #9CA3AF', padding: '8px 12px', width: '128px', textAlign: 'right', fontWeight: 'bold' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'center' }}>{String(idx + 1).padStart(2, '0')}</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>{getItemName(item) || ''}</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'center' }}>{item.qty || ''}</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif' }}>
                            {item.price ? fmt(Number(item.price)) : ''}
                          </td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif' }}>
                            {getAmount(item) > 0 ? fmt(getAmount(item)) : ''}
                          </td>
                        </tr>
                      ))}
                      {/* 빈 행 채우기 (최소 5행) */}
                      {items.length < 5 && Array.from({ length: 5 - items.length }).map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px', textAlign: 'center', color: '#D1D5DB' }}>{String(items.length + idx + 1).padStart(2, '0')}</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>&nbsp;</td>
                          <td style={{ border: '1px solid #9CA3AF', padding: '8px 12px' }}>&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 합계 테이블 */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #9CA3AF', marginBottom: '32px', fontSize: '13px' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '10px 16px', width: '96px', textAlign: 'center' }}>소계</td>
                        <td style={{ border: '1px solid #9CA3AF', padding: '10px 16px', textAlign: 'right', fontFamily: 'Outfit, sans-serif' }}>
                          {fmt(subtotal)}원
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#F3F4F6', fontWeight: 'bold', padding: '10px 16px', textAlign: 'center' }}>세액</td>
                        <td style={{ border: '1px solid #9CA3AF', padding: '10px 16px', textAlign: 'right', fontFamily: 'Outfit, sans-serif' }}>
                          {fmt(tax)}원
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        <td style={{ border: '1px solid #9CA3AF', backgroundColor: '#E5E7EB', fontWeight: 800, padding: '12px 16px', textAlign: 'center', fontSize: '16px' }}>합계</td>
                        <td style={{ border: '1px solid #9CA3AF', padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '18px', fontFamily: 'Outfit, sans-serif', color: '#6C5CE7' }}>
                          {fmt(total)}원
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 계좌번호 */}
                  <div style={{ fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold', color: '#111827' }}>계좌번호: </span>
                    <span style={{ color: '#374151' }}>{BANK_ACCOUNT}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
