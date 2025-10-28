import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, CheckCircle, Clock, AlertCircle, X
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function TaxFeedbackManagement() {
  const navigate = useNavigate()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    checkAuth()
    fetchFeedbacks()
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

    const { data: adminData } = await supabaseBiz
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchFeedbacks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('tax_office_feedback')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeedbacks(data || [])
    } catch (error) {
      console.error('피드백 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = (feedback) => {
    setSelectedFeedback(feedback)
    setShowResolveModal(true)
  }

  const handleConfirmResolve = async () => {
    if (!selectedFeedback) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const { error } = await supabaseBiz
        .from('tax_office_feedback')
        .update({
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_note: resolutionNote
        })
        .eq('id', selectedFeedback.id)

      if (error) throw error

      alert('피드백이 해결 처리되었습니다.')
      setShowResolveModal(false)
      setSelectedFeedback(null)
      setResolutionNote('')
      fetchFeedbacks()
    } catch (error) {
      console.error('해결 처리 오류:', error)
      alert('해결 처리 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: '대기중' },
      resolved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: '해결됨' }
    }

    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getTypeBadge = (type) => {
    const badges = {
      question: { color: 'bg-blue-100 text-blue-700', label: '문의사항' },
      error: { color: 'bg-red-100 text-red-700', label: '오류 신고' },
      request: { color: 'bg-purple-100 text-purple-700', label: '수정 요청' },
      other: { color: 'bg-gray-100 text-gray-700', label: '기타' }
    }

    const badge = badges[type] || badges.other

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">세무서 피드백 관리</h1>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">대기중</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {feedbacks.filter(f => f.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">해결됨</p>
                    <p className="text-2xl font-bold text-green-600">
                      {feedbacks.filter(f => f.status === 'resolved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 피드백 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>피드백 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">로딩 중...</div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  피드백이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(feedback.status)}
                            {getTypeBadge(feedback.feedback_type)}
                          </div>
                          <p className="text-sm text-gray-600">
                            배치 ID: {feedback.withdrawal_batch_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            접수일: {new Date(feedback.created_at).toLocaleString('ko-KR')}
                          </p>
                          {feedback.tax_office_contact && (
                            <p className="text-sm text-gray-600">
                              연락처: {feedback.tax_office_contact}
                            </p>
                          )}
                        </div>

                        {feedback.status === 'pending' && (
                          <Button
                            onClick={() => handleResolve(feedback)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            해결 처리
                          </Button>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border">
                        <p className="text-sm font-medium text-gray-700 mb-2">피드백 내용:</p>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {feedback.message}
                        </p>
                      </div>

                      {feedback.status === 'resolved' && feedback.resolution_note && (
                        <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-700 mb-2">
                            해결 내용:
                          </p>
                          <p className="text-sm text-green-900 whitespace-pre-wrap">
                            {feedback.resolution_note}
                          </p>
                          <p className="text-xs text-green-600 mt-2">
                            해결일: {new Date(feedback.resolved_at).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 해결 처리 모달 */}
      {showResolveModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">피드백 해결 처리</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">피드백 내용:</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {selectedFeedback.message}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                해결 내용 (선택사항)
              </label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="어떻게 해결했는지 간단히 기록해주세요"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmResolve}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                해결 완료
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResolveModal(false)
                  setSelectedFeedback(null)
                  setResolutionNote('')
                }}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

