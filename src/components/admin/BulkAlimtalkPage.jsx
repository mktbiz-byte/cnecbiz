import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Users, Send, FileSpreadsheet, Loader2, CheckCircle, XCircle, Trash2, AlertTriangle, Phone } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import * as XLSX from 'xlsx'

// 전화번호 정규화
function normalizePhone(phone) {
  if (!phone) return null
  const cleaned = String(phone).replace(/[^0-9]/g, '')
  if (cleaned.length < 10 || cleaned.length > 11) return null
  return cleaned
}

// 전화번호 표시용 포맷
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

  // 수신자 데이터
  const [excelRecipients, setExcelRecipients] = useState([]) // 엑셀 업로드
  const [bizRecipients, setBizRecipients] = useState([]) // BIZ DB 크리에이터
  const [mergedRecipients, setMergedRecipients] = useState([]) // 중복 제거된 최종

  // 상태
  const [loadingBiz, setLoadingBiz] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  // BIZ DB에서 크리에이터 불러오기 (Korea DB user_profiles)
  const loadBizCreators = async () => {
    setLoadingBiz(true)
    try {
      // featured_creators에서 한국 크리에이터 조회
      const { data: featured, error } = await supabaseBiz
        .from('featured_creators')
        .select('id, name, phone, email, region')

      if (error) throw error

      const creators = (featured || [])
        .filter(c => c.phone && normalizePhone(c.phone))
        .map(c => ({
          phone: normalizePhone(c.phone),
          name: c.name || '',
          source: 'BIZ DB'
        }))

      setBizRecipients(creators)
    } catch (error) {
      console.error('BIZ DB 로드 실패:', error)
      alert('크리에이터 데이터 로드 실패: ' + error.message)
    } finally {
      setLoadingBiz(false)
    }
  }

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const recipients = []
        for (const row of jsonData) {
          // 전화번호 컬럼 찾기 (여러 이름 시도)
          const phoneRaw = row['전화번호'] || row['핸드폰'] || row['phone'] || row['Phone'] || row['연락처'] || row['휴대폰'] || ''
          const nameRaw = row['이름'] || row['name'] || row['Name'] || row['크리에이터명'] || ''

          const phone = normalizePhone(phoneRaw)
          if (!phone) continue

          recipients.push({
            phone,
            name: String(nameRaw).trim(),
            source: '엑셀'
          })
        }

        setExcelRecipients(recipients)
        alert(`엑셀에서 ${recipients.length}명의 유효한 수신자를 불러왔습니다.`)
      } catch (err) {
        console.error('엑셀 파싱 실패:', err)
        alert('엑셀 파일 파싱 실패: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // 중복 제거 및 병합
  useEffect(() => {
    const phoneMap = new Map()

    // 엑셀 데이터 우선 (이름이 더 정확할 수 있음)
    for (const r of excelRecipients) {
      if (!phoneMap.has(r.phone)) {
        phoneMap.set(r.phone, { ...r })
      }
    }

    // BIZ DB 데이터 추가 (중복은 스킵)
    for (const r of bizRecipients) {
      if (!phoneMap.has(r.phone)) {
        phoneMap.set(r.phone, { ...r })
      } else {
        // 이름이 없으면 보강
        const existing = phoneMap.get(r.phone)
        if (!existing.name && r.name) {
          existing.name = r.name
          existing.source = existing.source + ' + BIZ DB'
        }
      }
    }

    setMergedRecipients(Array.from(phoneMap.values()))
  }, [excelRecipients, bizRecipients])

  // 미리보기 메시지 생성
  const getPreviewMessage = () => {
    let msg = selectedTemplate.content
    msg = msg.replace(/#{크리에이터명}/g, '홍길동')
    for (const [key, value] of Object.entries(variableValues)) {
      msg = msg.replace(new RegExp(`#{${key}}`, 'g'), value || `#{${key}}`)
    }
    return msg
  }

  // 발송
  const handleSend = async () => {
    if (mergedRecipients.length === 0) {
      alert('수신자가 없습니다.')
      return
    }

    // 변수 채워졌는지 확인
    for (const v of selectedTemplate.variables) {
      if (!variableValues[v]) {
        alert(`'${v}' 변수를 입력해주세요.`)
        return
      }
    }

    if (!confirm(`총 ${mergedRecipients.length}명에게 알림톡을 발송하시겠습니까?\n\n템플릿: ${selectedTemplate.name}\n${selectedTemplate.variables.map(v => `${v}: ${variableValues[v]}`).join('\n')}`)) return

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
        alert(`발송 완료! 성공: ${result.totalSuccess}건, 실패: ${result.totalFail}건`)
      } else {
        alert('발송 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch (error) {
      alert('발송 중 오류: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const excelCount = excelRecipients.length
  const bizCount = bizRecipients.length
  const duplicateCount = excelCount + bizCount - mergedRecipients.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">단체 알림톡 발송</h1>
        <p className="text-sm text-gray-500 mt-1">엑셀 업로드 + BIZ DB 크리에이터를 합쳐서 중복 제거 후 팝빌 알림톡을 일괄 발송합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 수신자 관리 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 통계 카드 */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <FileSpreadsheet className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <div className="text-xl font-bold">{excelCount}</div>
                <p className="text-xs text-gray-500">엑셀 업로드</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <div className="text-xl font-bold">{bizCount}</div>
                <p className="text-xs text-gray-500">BIZ DB</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <XCircle className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <div className="text-xl font-bold">{duplicateCount}</div>
                <p className="text-xs text-gray-500">중복 제거</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6 text-center">
                <Send className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold text-green-700">{mergedRecipients.length}</div>
                <p className="text-xs text-gray-500">최종 발송 대상</p>
              </CardContent>
            </Card>
          </div>

          {/* 데이터 소스 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수신자 데이터 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 엑셀 업로드 */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">엑셀 파일 업로드 (.xlsx, .xls)</label>
                  <p className="text-xs text-gray-400 mb-2">컬럼명: 전화번호(또는 핸드폰/phone/연락처), 이름(또는 name/크리에이터명)</p>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="cursor-pointer"
                  />
                </div>
                {excelCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setExcelRecipients([])}>
                    <Trash2 className="w-4 h-4 mr-1" /> 엑셀 초기화
                  </Button>
                )}
              </div>

              {/* BIZ DB 불러오기 */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">BIZ DB 크리에이터</label>
                  <p className="text-xs text-gray-400">featured_creators 테이블에서 전화번호가 있는 크리에이터를 불러옵니다.</p>
                </div>
                <Button onClick={loadBizCreators} disabled={loadingBiz} variant="outline">
                  {loadingBiz ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                  {bizCount > 0 ? `${bizCount}명 로드됨` : 'DB에서 불러오기'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 수신자 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">발송 대상 목록 ({mergedRecipients.length}명)</CardTitle>
                {mergedRecipients.length > 0 && (
                  <span className="text-xs text-gray-500">
                    중복 {duplicateCount}건 자동 제거됨
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {mergedRecipients.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>엑셀을 업로드하거나 BIZ DB에서 불러와주세요.</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b">
                        <th className="text-left p-2 w-12">#</th>
                        <th className="text-left p-2">이름</th>
                        <th className="text-left p-2">전화번호</th>
                        <th className="text-left p-2">출처</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedRecipients.slice(0, 200).map((r, idx) => (
                        <tr key={r.phone} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-gray-400">{idx + 1}</td>
                          <td className="p-2 font-medium">{r.name || '-'}</td>
                          <td className="p-2 text-gray-600">{formatPhone(r.phone)}</td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.source === '엑셀' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {r.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mergedRecipients.length > 200 && (
                    <p className="text-center text-xs text-gray-400 py-2">외 {mergedRecipients.length - 200}명 더...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 우측: 템플릿 설정 + 미리보기 */}
        <div className="space-y-6">
          {/* 템플릿 선택 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">알림톡 템플릿</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">템플릿</label>
                <select
                  className="w-full p-2.5 border rounded-lg text-sm"
                  value={selectedTemplate.code}
                  onChange={(e) => {
                    const tmpl = TEMPLATE_OPTIONS.find(t => t.code === e.target.value)
                    if (tmpl) setSelectedTemplate(tmpl)
                  }}
                >
                  {TEMPLATE_OPTIONS.map(t => (
                    <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">플러스친구: {selectedTemplate.plusFriend}</p>
              </div>

              {/* 변수 입력 */}
              {selectedTemplate.variables.map(v => (
                <div key={v}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">#{'{' + v + '}'}</label>
                  <Input
                    type="text"
                    placeholder={`${v} 입력...`}
                    value={variableValues[v] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 미리보기 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">미리보기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {getPreviewMessage()}
              </div>
              {selectedTemplate.buttons && (
                <div className="mt-3 space-y-2">
                  {selectedTemplate.buttons.map((btn, idx) => (
                    <div key={idx} className="border rounded-lg p-2 text-center text-sm font-medium text-blue-600 bg-blue-50">
                      {btn.n}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 발송 버튼 */}
          <Button
            onClick={handleSend}
            disabled={sending || mergedRecipients.length === 0}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-6 text-lg"
          >
            {sending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 발송 중...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> {mergedRecipients.length}명에게 알림톡 발송</>
            )}
          </Button>

          {/* 발송 결과 */}
          {sendResult && (
            <Card className={sendResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  {sendResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-bold">{sendResult.message}</span>
                </div>
                {sendResult.totalSuccess > 0 && (
                  <p className="text-sm text-green-700">성공: {sendResult.totalSuccess}건</p>
                )}
                {sendResult.totalFail > 0 && (
                  <p className="text-sm text-red-700">실패: {sendResult.totalFail}건</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 주의사항 */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="text-orange-800">
                <p className="font-medium mb-1">주의사항</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>팝빌 알림톡은 1건당 약 8원 과금됩니다.</li>
                  <li>1회 최대 1,000건씩 배치 발송됩니다.</li>
                  <li>수신 거부 번호에는 발송되지 않습니다.</li>
                  <li>발송 후 취소가 불가능합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
