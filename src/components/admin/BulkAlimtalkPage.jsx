import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Users, Send, FileSpreadsheet, Loader2, CheckCircle, XCircle, Trash2, AlertTriangle, Phone, Megaphone, Eye, Download } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import * as XLSX from 'xlsx'

function normalizePhone(phone) {
  if (!phone) return null
  const cleaned = String(phone).replace(/[^0-9]/g, '')
  if (cleaned.length < 10 || cleaned.length > 11) return null
  return cleaned
}

function formatPhone(phone) {
  if (!phone) return ''
  if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
  return phone
}

const TEMPLATE_OPTIONS = [
  {
    code: '026030000945',
    name: '신규 캠페인 알림 설정',
    plusFriend: '@크넥_크리에이터',
    content: '안녕하세요, #{크리에이터명}님.\n\n신규 캠페인 알림 수신 동의에 따라 새롭게 등록된 캠페인을 안내드립니다.\n\n■ 신규 캠페인\n#{캠페인명}\n\n지금 바로 확인하고 원하시는 캠페인에 신청해보세요.\n\n*본 메시지는 크넥 플랫폼 내 캠페인 알림 수신에 동의하신 크리에이터에게 발송됩니다.',
    variables: ['캠페인명'],
    buttons: [
      { n: '크넥 바로가기', t: 'WL', u1: 'https://cnec.co.kr/', u2: 'https://cnec.co.kr/' }
    ]
  }
]

export default function BulkAlimtalkPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATE_OPTIONS[0])
  const [variableValues, setVariableValues] = useState({})
  const [excelRecipients, setExcelRecipients] = useState([])
  const [bizRecipients, setBizRecipients] = useState([])
  const [mergedRecipients, setMergedRecipients] = useState([])
  const [loadingBiz, setLoadingBiz] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadBizCreators = async () => {
    setLoadingBiz(true)
    try {
      const { data: featured, error } = await supabaseBiz
        .from('featured_creators')
        .select('id, name, phone, email, region')
      if (error) throw error
      const creators = (featured || [])
        .filter(c => c.phone && normalizePhone(c.phone))
        .map(c => ({ phone: normalizePhone(c.phone), name: c.name || '', source: 'BIZ DB' }))
      setBizRecipients(creators)
    } catch (error) {
      alert('크리에이터 데이터 로드 실패: ' + error.message)
    } finally {
      setLoadingBiz(false)
    }
  }

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const recipients = []
        for (const row of jsonData) {
          const phoneRaw = row['전화번호'] || row['핸드폰'] || row['phone'] || row['Phone'] || row['연락처'] || row['휴대폰'] || ''
          const nameRaw = row['이름'] || row['name'] || row['Name'] || row['크리에이터명'] || ''
          const phone = normalizePhone(phoneRaw)
          if (!phone) continue
          recipients.push({ phone, name: String(nameRaw).trim(), source: '엑셀' })
        }
        setExcelRecipients(recipients)
        alert(`엑셀에서 ${recipients.length}명의 수신자를 불러왔습니다.`)
      } catch (err) {
        alert('엑셀 파일 파싱 실패: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  useEffect(() => {
    const phoneMap = new Map()
    for (const r of excelRecipients) {
      if (!phoneMap.has(r.phone)) phoneMap.set(r.phone, { ...r })
    }
    for (const r of bizRecipients) {
      if (!phoneMap.has(r.phone)) {
        phoneMap.set(r.phone, { ...r })
      } else {
        const existing = phoneMap.get(r.phone)
        if (!existing.name && r.name) {
          existing.name = r.name
          existing.source = existing.source + ' + BIZ'
        }
      }
    }
    setMergedRecipients(Array.from(phoneMap.values()))
  }, [excelRecipients, bizRecipients])

  const getPreviewMessage = () => {
    let msg = selectedTemplate.content
    msg = msg.replace(/#{크리에이터명}/g, '홍길동')
    for (const [key, value] of Object.entries(variableValues)) {
      msg = msg.replace(new RegExp(`#{${key}}`, 'g'), value || `#{${key}}`)
    }
    return msg
  }

  const handleSend = async () => {
    if (mergedRecipients.length === 0) return alert('수신자가 없습니다.')
    for (const v of selectedTemplate.variables) {
      if (!variableValues[v]) return alert(`'${v}' 변수를 입력해주세요.`)
    }
    if (!confirm(`총 ${mergedRecipients.length}명에게 알림톡을 발송하시겠습니까?`)) return
    setSending(true)
    setSendResult(null)
    try {
      const response = await fetch('/.netlify/functions/send-bulk-alimtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode: selectedTemplate.code,
          templateContent: selectedTemplate.content,
          variables: variableValues,
          recipients: mergedRecipients.map(r => ({ phone: r.phone, name: r.name })),
          buttons: selectedTemplate.buttons || null
        })
      })
      const result = await response.json()
      setSendResult(result)
      if (result.success) {
        alert(`발송 완료! 성공 ${result.totalSuccess}건, 실패 ${result.totalFail}건`)
      } else {
        alert('발송 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch (error) {
      alert('발송 중 오류: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['이름', '전화번호'],
      ['홍길동', '01012345678'],
      ['김크넥', '010-9876-5432']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '수신자')
    XLSX.writeFile(wb, '알림톡_수신자_샘플.xlsx')
  }

  const excelCount = excelRecipients.length
  const bizCount = bizRecipients.length
  const duplicateCount = excelCount + bizCount - mergedRecipients.length

  const filteredRecipients = mergedRecipients.filter(r => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return r.name?.toLowerCase().includes(s) || r.phone?.includes(s)
  })

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">단체 알림톡 발송</h1>
        <p className="text-sm text-[#636E72] mt-1">엑셀 업로드 + BIZ DB 크리에이터 데이터를 합쳐서 중복 제거 후 팝빌 알림톡을 일괄 발송합니다.</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A2E]">{excelCount}</div>
              <p className="text-xs text-[#636E72]">엑셀 업로드</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A2E]">{bizCount}</div>
              <p className="text-xs text-[#636E72]">BIZ DB</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(253,203,110,0.1)] flex items-center justify-center">
              <XCircle className="w-5 h-5 text-[#FDCB6E]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A2E]">{duplicateCount}</div>
              <p className="text-xs text-[#636E72]">중복 제거</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#6C5CE7]/20 bg-[#F0EDFF]/30">
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C5CE7] flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#6C5CE7]">{mergedRecipients.length}</div>
              <p className="text-xs text-[#636E72]">최종 발송 대상</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#6C5CE7]" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1A1A2E]">~{Math.ceil(mergedRecipients.length * 8).toLocaleString()}</div>
              <p className="text-xs text-[#636E72]">예상 비용 (원)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 좌측: 수신자 관리 (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* 데이터 소스 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1A1A2E]">수신자 데이터 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 엑셀 업로드 */}
              <div className="border border-dashed border-[#DFE6E9] rounded-2xl p-5 hover:border-[#6C5CE7]/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#1A1A2E] mb-1">엑셀 파일 업로드</p>
                    <p className="text-xs text-[#B2BEC3] mb-3">컬럼: 이름, 전화번호 (또는 핸드폰/phone/연락처)</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelUpload}
                        className="cursor-pointer text-sm flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={handleDownloadSample} className="text-[#6C5CE7] text-xs flex-shrink-0">
                        <Download className="w-3.5 h-3.5 mr-1" /> 샘플
                      </Button>
                    </div>
                  </div>
                  {excelCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setExcelRecipients([])} className="text-[#FF6B6B] flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* BIZ DB */}
              <div className="border border-[#DFE6E9] rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EDFF] flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[#1A1A2E]">BIZ DB 크리에이터</p>
                    <p className="text-xs text-[#B2BEC3]">featured_creators에서 전화번호 보유 크리에이터</p>
                  </div>
                  <Button onClick={loadBizCreators} disabled={loadingBiz} variant="outline" size="sm" className="rounded-xl">
                    {loadingBiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4 mr-1.5" />}
                    {bizCount > 0 ? `${bizCount}명 로드됨` : '불러오기'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 수신자 목록 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#1A1A2E]">
                  발송 대상 ({mergedRecipients.length}명)
                  {duplicateCount > 0 && <span className="text-xs font-normal text-[#FDCB6E] ml-2">중복 {duplicateCount}건 제거됨</span>}
                </CardTitle>
                <div className="relative w-56">
                  <Input
                    type="text"
                    placeholder="이름, 전화번호 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm h-8 rounded-lg"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {mergedRecipients.length === 0 ? (
                <div className="text-center py-12 text-[#B2BEC3]">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">엑셀을 업로드하거나 BIZ DB에서 불러와주세요.</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-[#DFE6E9]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#F8F9FA] z-10">
                      <tr>
                        <th className="text-left p-2.5 text-[#636E72] font-medium w-12">#</th>
                        <th className="text-left p-2.5 text-[#636E72] font-medium">이름</th>
                        <th className="text-left p-2.5 text-[#636E72] font-medium">전화번호</th>
                        <th className="text-left p-2.5 text-[#636E72] font-medium">출처</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipients.slice(0, 200).map((r, idx) => (
                        <tr key={r.phone} className="border-t border-[#DFE6E9] hover:bg-[#F8F9FA]">
                          <td className="p-2.5 text-[#B2BEC3]">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-[#1A1A2E]">{r.name || '-'}</td>
                          <td className="p-2.5 text-[#636E72] font-mono text-xs">{formatPhone(r.phone)}</td>
                          <td className="p-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-md ${
                              r.source === '엑셀' ? 'bg-[rgba(116,185,255,0.1)] text-[#74B9FF]'
                              : r.source?.includes('+') ? 'bg-[rgba(253,203,110,0.1)] text-[#FDCB6E]'
                              : 'bg-[#F0EDFF] text-[#6C5CE7]'
                            }`}>
                              {r.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRecipients.length > 200 && (
                    <p className="text-center text-xs text-[#B2BEC3] py-2 bg-[#F8F9FA]">외 {filteredRecipients.length - 200}명...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 우측: 템플릿 + 미리보기 (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 템플릿 설정 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1A1A2E]">알림톡 템플릿</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#636E72] mb-1.5">템플릿 선택</label>
                <select
                  className="w-full p-2.5 border border-[#DFE6E9] rounded-xl text-sm bg-white focus:outline-none focus:border-[#6C5CE7]"
                  value={selectedTemplate.code}
                  onChange={(e) => {
                    const tmpl = TEMPLATE_OPTIONS.find(t => t.code === e.target.value)
                    if (tmpl) setSelectedTemplate(tmpl)
                  }}
                >
                  {TEMPLATE_OPTIONS.map(t => (
                    <option key={t.code} value={t.code}>{t.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#F0EDFF] text-[#6C5CE7]">{selectedTemplate.plusFriend}</span>
                  <span className="text-xs text-[#B2BEC3]">{selectedTemplate.code}</span>
                </div>
              </div>

              {selectedTemplate.variables.map(v => (
                <div key={v}>
                  <label className="block text-xs font-medium text-[#636E72] mb-1.5">
                    <span className="text-[#6C5CE7] font-mono">{'#{'}{v}{'}'}</span>
                  </label>
                  <Input
                    type="text"
                    placeholder={`${v} 입력...`}
                    value={variableValues[v] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 미리보기 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#1A1A2E]">미리보기</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="text-[#6C5CE7]">
                  <Eye className="w-4 h-4 mr-1" /> {showPreview ? '접기' : '펼치기'}
                </Button>
              </div>
            </CardHeader>
            {(showPreview || true) && (
              <CardContent>
                {/* 카카오톡 스타일 미리보기 */}
                <div className="bg-[#B2C7D9] rounded-2xl p-4 max-w-xs mx-auto">
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    {/* 헤더 */}
                    <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F0EDFF] flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-[#6C5CE7]" />
                      </div>
                      <span className="text-xs font-bold text-[#1A1A2E]">크넥 크리에이터</span>
                    </div>
                    {/* 알림톡 라벨 */}
                    <div className="px-4">
                      <div className="bg-[#FEF3C7] rounded-md px-2 py-1 inline-block">
                        <span className="text-xs font-bold text-[#92400E]">알림톡 도착</span>
                      </div>
                    </div>
                    {/* 본문 */}
                    <div className="px-4 py-3 text-xs text-[#1A1A2E] whitespace-pre-wrap leading-relaxed">
                      {getPreviewMessage()}
                    </div>
                    {/* 버튼 */}
                    {selectedTemplate.buttons?.map((btn, idx) => (
                      <div key={idx} className="border-t border-[#DFE6E9] px-4 py-2.5 text-center">
                        <span className="text-xs font-medium text-[#6C5CE7]">{btn.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 발송 버튼 */}
          <Button
            onClick={handleSend}
            disabled={sending || mergedRecipients.length === 0}
            className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white font-bold py-5 text-base rounded-2xl shadow-lg shadow-[#6C5CE7]/20"
          >
            {sending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 발송 중...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> {mergedRecipients.length}명에게 알림톡 발송</>
            )}
          </Button>

          {/* 발송 결과 */}
          {sendResult && (
            <Card className={sendResult.success ? 'border-[#00B894]/30 bg-[rgba(0,184,148,0.05)]' : 'border-[#FF6B6B]/30 bg-[rgba(255,107,107,0.05)]'}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {sendResult.success
                    ? <CheckCircle className="w-5 h-5 text-[#00B894]" />
                    : <AlertTriangle className="w-5 h-5 text-[#FF6B6B]" />
                  }
                  <span className="font-bold text-sm text-[#1A1A2E]">{sendResult.message}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  {sendResult.totalSuccess > 0 && <span className="text-[#00B894]">성공 {sendResult.totalSuccess}건</span>}
                  {sendResult.totalFail > 0 && <span className="text-[#FF6B6B]">실패 {sendResult.totalFail}건</span>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 주의사항 */}
          <div className="bg-[rgba(253,203,110,0.1)] border border-[#FDCB6E]/30 rounded-2xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-[#FDCB6E] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-[#1A1A2E] mb-1.5">주의사항</p>
                <ul className="text-xs text-[#636E72] space-y-1 list-disc list-inside">
                  <li>팝빌 알림톡은 1건당 약 8원 과금</li>
                  <li>1회 최대 1,000건씩 배치 발송</li>
                  <li>수신 거부 번호에는 발송되지 않음</li>
                  <li>발송 후 취소 불가</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
