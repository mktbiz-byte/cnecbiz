import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, Lock, CheckCircle, AlertCircle, Send,
  Download, Calendar, Building2
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { decryptResidentNumber } from '../../lib/encryptionHelper'

export default function TaxOfficePage() {
  const { batchId } = useParams()
  const [searchParams] = useSearchParams()
  const urlPassword = searchParams.get('password')

  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    feedback_type: 'question',
    message: '',
    tax_office_contact: ''
  })

  useEffect(() => {
    if (urlPassword) {
      setPassword(urlPassword)
      handleAuthenticate(urlPassword)
    }
  }, [urlPassword])

  const handleAuthenticate = async (pwd = password) => {
    if (!pwd || pwd.length < 6) {
      alert('비밀번호를 입력해주세요.')
      return
    }

    // 비밀번호 확인 (실제로는 서버에서 검증해야 함)
    // 여기서는 간단히 URL 파라미터와 비교
    if (pwd === urlPassword) {
      setAuthenticated(true)
      fetchWithdrawals()
    } else {
      alert('비밀번호가 올바르지 않습니다.')
    }
  }

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      // 승인된 한국 출금 신청 조회
      const { data, error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select(`
          *,
          featured_creators!creator_id (
            channel_name,
            email
          )
        `)
        .eq('status', 'approved')
        .eq('region', 'korea')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      // 주민번호 복호화
      const decryptedData = await Promise.all(
        data.map(async (w) => {
          try {
            const decrypted = await decryptResidentNumber(w.resident_registration_number)
            return { ...w, resident_registration_number_decrypted: decrypted }
          } catch (error) {
            console.error('복호화 오류:', error)
            return { ...w, resident_registration_number_decrypted: '복호화 실패' }
          }
        })
      )

      setWithdrawals(decryptedData)
    } catch (error) {
      console.error('출금 신청 조회 오류:', error)
      alert('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.message) {
      alert('피드백 내용을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('tax_office_feedback')
        .insert([{
          withdrawal_batch_id: batchId,
          feedback_type: feedbackForm.feedback_type,
          message: feedbackForm.message,
          tax_office_contact: feedbackForm.tax_office_contact
        }])

      if (error) throw error

      alert('피드백이 전송되었습니다. 담당자가 확인 후 연락드리겠습니다.')
      setShowFeedbackForm(false)
      setFeedbackForm({
        feedback_type: 'question',
        message: '',
        tax_office_contact: ''
      })
    } catch (error) {
      console.error('피드백 전송 오류:', error)
      alert('피드백 전송 중 오류가 발생했습니다.')
    }
  }

  const handleExportToExcel = () => {
    if (withdrawals.length === 0) {
      alert('출금 신청 데이터가 없습니다.')
      return
    }

    const headers = [
      '신청일',
      '크리에이터명',
      '주민등록번호',
      '은행명',
      '계좌번호',
      '예금주',
      '신청포인트',
      '세금(3.3%)',
      '지급액(원)',
      '우선순위'
    ]

    const rows = withdrawals.map(w => [
      new Date(w.created_at).toLocaleDateString('ko-KR'),
      w.featured_creators?.channel_name || '',
      w.resident_registration_number_decrypted || '',
      w.bank_name,
      w.account_number,
      w.account_holder,
      w.requested_points,
      Math.floor(w.tax_amount || 0),
      Math.floor(w.final_amount || 0),
      w.priority || 0
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `세무자료_${batchId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-2xl">세무서 전용 페이지</CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              크리에이터 출금 세무 자료 열람을 위한 인증이 필요합니다.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  접근 비밀번호
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="담당자로부터 받은 비밀번호"
                  onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
                />
              </div>

              <Button
                onClick={() => handleAuthenticate()}
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                인증하기
              </Button>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-700 text-sm">
                  이 페이지는 세무 신고 목적으로만 사용됩니다.
                  <br />
                  문의사항이 있으시면 피드백 기능을 이용해주세요.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold">크리에이터 출금 세무 자료</h1>
            </div>
            <p className="text-gray-600">
              배치 ID: {batchId}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleExportToExcel}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
            <Button
              onClick={() => setShowFeedbackForm(true)}
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              피드백 보내기
            </Button>
          </div>
        </div>

        {/* 요약 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 출금 건수</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {withdrawals.length}건
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 지급액</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₩{withdrawals.reduce((sum, w) => sum + (w.final_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 세금</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₩{withdrawals.reduce((sum, w) => sum + (w.tax_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-orange-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 출금 신청 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>출금 신청 상세 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                출금 신청 데이터가 없습니다.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">신청일</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">크리에이터명</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">주민등록번호</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">은행</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">계좌번호</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">예금주</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">신청포인트</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">세금(3.3%)</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">지급액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {withdrawals.map((withdrawal, index) => (
                      <tr key={withdrawal.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {new Date(withdrawal.created_at).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {withdrawal.featured_creators?.channel_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {withdrawal.resident_registration_number_decrypted}
                        </td>
                        <td className="px-4 py-3">{withdrawal.bank_name}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {withdrawal.account_number}
                        </td>
                        <td className="px-4 py-3">{withdrawal.account_holder}</td>
                        <td className="px-4 py-3 text-right">
                          {withdrawal.requested_points.toLocaleString()}P
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          ₩{Math.floor(withdrawal.tax_amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">
                          ₩{Math.floor(withdrawal.final_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 피드백 폼 모달 */}
        {showFeedbackForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">세무서 피드백</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    피드백 유형
                  </label>
                  <select
                    value={feedbackForm.feedback_type}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="question">문의사항</option>
                    <option value="error">오류 신고</option>
                    <option value="request">수정 요청</option>
                    <option value="other">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    피드백 내용 *
                  </label>
                  <Textarea
                    value={feedbackForm.message}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                    placeholder="문의사항이나 수정이 필요한 내용을 입력해주세요"
                    rows={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    연락처 (선택)
                  </label>
                  <Input
                    value={feedbackForm.tax_office_contact}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, tax_office_contact: e.target.value })}
                    placeholder="이메일 또는 전화번호"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitFeedback}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    전송
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackForm(false)}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

