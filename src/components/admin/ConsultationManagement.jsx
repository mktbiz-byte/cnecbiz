import { useState, useEffect } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { MessageCircle, CheckCircle, Clock, Mail, Phone, Building, Calendar, FileText } from 'lucide-react'
import AdminNavigation from './AdminNavigation'

export default function ConsultationManagement() {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, completed
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    fetchConsultations()
  }, [filter])

  const fetchConsultations = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('consultation_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setConsultations(data || [])
    } catch (error) {
      console.error('상담 신청 조회 오류:', error)
      alert('상담 신청 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (id) => {
    if (!confirm('상담을 완료 처리하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert('상담이 완료 처리되었습니다.')
      fetchConsultations()
      setSelectedConsultation(null)
    } catch (error) {
      console.error('상담 완료 처리 오류:', error)
      alert('상담 완료 처리에 실패했습니다.')
    }
  }

  const handleSaveNotes = async (id) => {
    try {
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({ admin_notes: adminNotes })
        .eq('id', id)

      if (error) throw error

      alert('메모가 저장되었습니다.')
      fetchConsultations()
      setSelectedConsultation(null)
    } catch (error) {
      console.error('메모 저장 오류:', error)
      alert('메모 저장에 실패했습니다.')
    }
  }

  const openDetailModal = (consultation) => {
    setSelectedConsultation(consultation)
    setAdminNotes(consultation.admin_notes || '')
  }

  return (
    <>
      <AdminNavigation />
      <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">상담 관리</h1>
        <p className="text-gray-600">고객 상담 신청을 관리하고 처리합니다</p>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체 ({consultations.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          대기중
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          완료
        </button>
      </div>

      {/* 상담 신청 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">상담 신청이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  회사명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  연락처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  신청일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultations.map((consultation) => (
                <tr key={consultation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {consultation.status === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        대기중
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        완료
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">
                        {consultation.company_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{consultation.contact_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-3 h-3 mr-1" />
                        {consultation.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-3 h-3 mr-1" />
                        {consultation.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(consultation.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openDetailModal(consultation)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      상세보기
                    </button>
                    {consultation.status === 'pending' && (
                      <button
                        onClick={() => handleComplete(consultation.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        완료
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세보기 모달 */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">상담 신청 상세</h2>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                  <div className="text-gray-900">{selectedConsultation.company_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
                  <div className="text-gray-900">{selectedConsultation.contact_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <div className="text-gray-900">{selectedConsultation.phone}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <div className="text-gray-900">{selectedConsultation.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">신청일</label>
                  <div className="text-gray-900">
                    {new Date(selectedConsultation.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <div>
                    {selectedConsultation.status === 'pending' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        대기중
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        완료
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 상담 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">상담 내용</label>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-gray-900">
                  {selectedConsultation.message || '내용 없음'}
                </div>
              </div>

              {/* 관리자 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  관리자 메모
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="상담 내용이나 처리 사항을 기록하세요..."
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveNotes(selectedConsultation.id)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  메모 저장
                </button>
                {selectedConsultation.status === 'pending' && (
                  <button
                    onClick={() => handleComplete(selectedConsultation.id)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    상담 완료
                  </button>
                )}
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
