import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, Search, CheckCircle, XCircle, Mail, FileText, RefreshCw } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function TestApprovalSubmit() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [formTestLoading, setFormTestLoading] = useState(false)
  const [emailTestLoading, setEmailTestLoading] = useState(false)

  const [dryRunResult, setDryRunResult] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [formTestResult, setFormTestResult] = useState(null)
  const [emailTestResult, setEmailTestResult] = useState(null)
  const [error, setError] = useState(null)

  // 관리자 인증 체크
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/admin/login')
        return
      }
      const { data: admin } = await supabaseBiz
        .from('admin_users')
        .select('id')
        .eq('email', user.email)
        .single()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  // 1. Dry-run: 결재 상신 대상 건 조회
  const handleDryRun = async () => {
    setDryRunLoading(true)
    setDryRunResult(null)
    setError(null)
    try {
      const response = await fetch('/.netlify/functions/scheduled-daily-withdrawal-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      })
      const data = await response.json()
      setDryRunResult(data)
    } catch (err) {
      setError(`Dry-run 실패: ${err.message}`)
    } finally {
      setDryRunLoading(false)
    }
  }

  // 2. 네이버웍스 서식 컴포넌트 테스트
  const handleFormTest = async () => {
    setFormTestLoading(true)
    setFormTestResult(null)
    setError(null)
    try {
      const response = await fetch('/.netlify/functions/scheduled-daily-withdrawal-approval?debug=form')
      const data = await response.json()
      setFormTestResult(data)
    } catch (err) {
      setError(`서식 테스트 실패: ${err.message}`)
    } finally {
      setFormTestLoading(false)
    }
  }

  // 3. 이메일 발송 테스트
  const handleEmailTest = async () => {
    setEmailTestLoading(true)
    setEmailTestResult(null)
    setError(null)
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'mkt@cnecbiz.com',
          subject: `[테스트] 결재 상신 이메일 알림 테스트 - ${new Date().toLocaleDateString('ko-KR')}`,
          html: `
            <div style="font-family:'Pretendard',sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#6C5CE7;">📋 결재 상신 이메일 알림 테스트</h2>
              <p>이 메일은 결재 상신 이메일 알림 기능 테스트입니다.</p>
              <div style="background:#f7fafc;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>테스트 시각:</strong> ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
                <p style="margin:4px 0;"><strong>발송 대상:</strong> mkt@cnecbiz.com</p>
              </div>
              <p style="color:#a0aec0;font-size:12px;">이 메일은 테스트 목적으로 발송되었습니다. - CNECBIZ</p>
            </div>`
        })
      })
      const data = await response.json()
      setEmailTestResult(data)
    } catch (err) {
      setError(`이메일 테스트 실패: ${err.message}`)
    } finally {
      setEmailTestLoading(false)
    }
  }

  // 4. 실제 결재 상신 실행
  const handleRealSubmit = async () => {
    if (!confirm('실제 결재 상신을 실행합니다. 네이버웍스 결재 문서가 생성되고, 알림이 발송됩니다. 계속하시겠습니까?')) return

    setLoading(true)
    setSubmitResult(null)
    setError(null)
    try {
      const response = await fetch('/.netlify/functions/scheduled-daily-withdrawal-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      setSubmitResult(data)
    } catch (err) {
      setError(`결재 상신 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">결재 상신 테스트</h1>
          <p className="text-gray-500 mt-1">결재 상신 기능을 단계별로 테스트합니다.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/withdrawals')}>
          출금 관리로 돌아가기
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: 개별 테스트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1. 연결 테스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 서식 테스트 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">네이버웍스 서식 조회</h3>
              <p className="text-sm text-gray-500 mb-3">토큰 발급 + 결재 서식 컴포넌트 자동 매칭 테스트</p>
              <Button onClick={handleFormTest} disabled={formTestLoading} variant="outline" className="w-full">
                {formTestLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                서식 테스트
              </Button>
              {formTestResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">토큰 발급 성공</span>
                  </div>
                  <div>
                    <span className="font-medium">매칭된 컴포넌트:</span>
                    <ul className="ml-4 mt-1">
                      {formTestResult.matchedComponents && Object.entries(formTestResult.matchedComponents).map(([key, val]) => (
                        <li key={key} className="text-xs text-gray-600">
                          {key}: <code className="bg-gray-200 px-1 rounded">{val.id}</code> ({val.type})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* 이메일 테스트 */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">이메일 발송 테스트</h3>
              <p className="text-sm text-gray-500 mb-3">mkt@cnecbiz.com으로 테스트 이메일 발송</p>
              <Button onClick={handleEmailTest} disabled={emailTestLoading} variant="outline" className="w-full">
                {emailTestLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                이메일 테스트
              </Button>
              {emailTestResult && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    {emailTestResult.success ? (
                      <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-700">발송 성공</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-700">발송 실패: {emailTestResult.error}</span></>
                    )}
                  </div>
                  {emailTestResult.messageId && (
                    <p className="text-xs text-gray-500 mt-1">Message ID: {emailTestResult.messageId}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Dry-run */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2. 결재 상신 대상 조회 (Dry-run)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">DB에서 결재 상신 대상 건을 조회합니다. 실제 결재 문서는 생성하지 않습니다.</p>
          <Button onClick={handleDryRun} disabled={dryRunLoading} variant="outline">
            {dryRunLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            대상 조회
          </Button>

          {dryRunResult && (
            <div className="space-y-4">
              {dryRunResult.count === 0 && !dryRunResult.groups ? (
                <Alert>
                  <AlertDescription>{dryRunResult.message || '상신할 건이 없습니다.'}</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-800">총 {dryRunResult.totalCount || 0}건 결재 상신 대상</p>
                  </div>

                  {dryRunResult.groups?.map((group, gi) => (
                    <div key={gi} className="border rounded-lg overflow-hidden">
                      <div className={`px-4 py-3 font-medium ${group.entityKey === 'howlab' ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'}`}>
                        {group.entity} - {group.count}건 / {group.totalAmount?.toLocaleString()}원
                        <span className="text-sm ml-2 opacity-70">
                          (세금: {group.totalTax?.toLocaleString()}원 / 실입금: {group.totalNet?.toLocaleString()}원)
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">이름</th>
                              <th className="px-3 py-2 text-right">금액</th>
                              <th className="px-3 py-2 text-left">은행</th>
                              <th className="px-3 py-2 text-left">계좌</th>
                              <th className="px-3 py-2 text-left">신청일</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items?.map((item, ii) => (
                              <tr key={ii} className="border-t">
                                <td className="px-3 py-2">{item.creator_name}</td>
                                <td className="px-3 py-2 text-right">{item.requested_amount?.toLocaleString()}원</td>
                                <td className="px-3 py-2">{item.bank_name}</td>
                                <td className="px-3 py-2 font-mono text-xs">{item.account_number}</td>
                                <td className="px-3 py-2 text-xs text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: 실제 실행 */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="text-lg text-amber-700">Step 3. 실제 결재 상신 실행</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            네이버웍스 결재 문서 생성 + 채널 알림 + mkt@cnecbiz.com 이메일 알림을 발송합니다.
          </p>
          <Button
            onClick={handleRealSubmit}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            실제 결재 상신 실행
          </Button>

          {submitResult && (
            <div className="space-y-3">
              {submitResult.success ? (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    결재 상신 성공! {submitResult.count}건 처리, {submitResult.documents}건 문서 생성
                    {submitResult.failed > 0 && <span className="text-red-600 ml-2">({submitResult.failed}건 실패)</span>}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertDescription>{submitResult.error || '상신 실패'}</AlertDescription>
                </Alert>
              )}

              {/* 디버그 정보 */}
              {submitResult.debug && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <h4 className="font-medium">디버그 정보</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(submitResult.debug.tokens || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1">
                        {val === 'OK' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                        <span>{key}: {val}</span>
                      </div>
                    ))}
                  </div>
                  {submitResult.debug.formMatch && (
                    <p>서식 매칭: {submitResult.debug.formMatch.join(', ')}</p>
                  )}
                  {submitResult.debug.formError && (
                    <p className="text-red-600">서식 에러: {submitResult.debug.formError}</p>
                  )}
                </div>
              )}

              {/* 입금처별 결과 */}
              {submitResult.results?.map((r, i) => (
                <div key={i} className={`border rounded-lg p-3 ${r.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.entity}</span>
                    <span className="text-sm">{r.count}건 / {r.totalAmount?.toLocaleString()}원</span>
                  </div>
                  {r.approvalDocId && <p className="text-xs text-gray-600 mt-1">문서ID: {r.approvalDocId}</p>}
                  {r.fileUploaded !== undefined && (
                    <p className="text-xs mt-1">
                      엑셀 첨부: {r.fileUploaded ? '✅' : '❌'}
                    </p>
                  )}
                  {r.error && <p className="text-xs text-red-600 mt-1">에러: {r.error}</p>}
                </div>
              ))}

              {/* 이메일 알림 결과 */}
              {submitResult.emailNotification && (
                <div className={`border rounded-lg p-3 ${submitResult.emailNotification.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">이메일 알림 (mkt@cnecbiz.com)</span>
                    {submitResult.emailNotification.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {submitResult.emailNotification.error && (
                    <p className="text-xs text-red-600 mt-1">{submitResult.emailNotification.error}</p>
                  )}
                </div>
              )}

              {/* Raw 응답 */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600">API 응답 원문 보기</summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(submitResult, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
