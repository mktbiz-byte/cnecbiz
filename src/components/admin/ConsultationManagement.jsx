import { useState, useEffect } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'
import {
  MessageCircle, CheckCircle, Clock, Mail, Phone, Building, Calendar,
  FileText, Search, Plus, Send, Paperclip, ChevronRight, User,
  DollarSign, FileCheck, AlertCircle, MoreHorizontal, X, Edit2, Trash2,
  Upload, Loader2, Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AdminNavigation from './AdminNavigation'

export default function ConsultationManagement() {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState(null)

  // 상담 기록 입력
  const [newRecord, setNewRecord] = useState('')
  const [recordType, setRecordType] = useState('phone') // phone, email, meeting, note

  // 상담 기록 수정
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [editingRecordContent, setEditingRecordContent] = useState('')
  const [editingRecordType, setEditingRecordType] = useState('')

  // 계약 정보
  const [contractStatus, setContractStatus] = useState('pending')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [contractSent, setContractSent] = useState(false)

  // 다음 연락 예정일
  const [nextContactDate, setNextContactDate] = useState('')

  // 메모
  const [memo, setMemo] = useState('')
  const [editingMemo, setEditingMemo] = useState(false)

  // 마이그레이션
  const [migrating, setMigrating] = useState(false)
  const [hasLocalData, setHasLocalData] = useState(false)

  useEffect(() => {
    fetchConsultations()
    checkLocalData()
  }, [filter])

  // localStorage에 데이터가 있는지 확인
  const checkLocalData = () => {
    try {
      const keys = Object.keys(localStorage)
      const hasData = keys.some(key =>
        key.startsWith('consultation_records_') ||
        key.startsWith('contract_status_') ||
        key.startsWith('expected_revenue_') ||
        key.startsWith('contract_sent_') ||
        key.startsWith('next_contact_date_')
      )
      setHasLocalData(hasData)
    } catch {
      setHasLocalData(false)
    }
  }

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

      // 첫 번째 상담 자동 선택
      if (data && data.length > 0 && !selectedConsultation) {
        selectConsultation(data[0])
      }
    } catch (error) {
      console.error('상담 신청 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectConsultation = async (consultation) => {
    // 서버에서 상담 기록 로드
    const { data: records, error } = await supabaseBiz
      .from('consultation_records')
      .select('*')
      .eq('consultation_id', consultation.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('상담 기록 조회 오류:', error)
    }

    setSelectedConsultation({
      ...consultation,
      records: records || []
    })

    // DB에서 계약 정보 로드
    setContractStatus(consultation.contract_status || 'pending')
    setExpectedRevenue(consultation.expected_revenue?.toString() || '')
    setContractSent(consultation.contract_sent || false)
    setNextContactDate(consultation.next_contact_date || '')
    setMemo(consultation.memo || '')
    setNewRecord('')
  }

  const handleSaveRecord = async () => {
    if (!newRecord.trim() || !selectedConsultation) return

    try {
      // 서버에 저장
      const { data: newRecordData, error } = await supabaseBiz
        .from('consultation_records')
        .insert({
          consultation_id: selectedConsultation.id,
          type: recordType,
          content: newRecord,
          author: '관리자'
        })
        .select()
        .single()

      if (error) throw error

      // 상태 업데이트
      const updatedRecords = [...(selectedConsultation.records || []), newRecordData]
      setSelectedConsultation({
        ...selectedConsultation,
        records: updatedRecords
      })

      // 네이버웍스 알림 전송
      try {
        const recordTypeLabels = {
          phone: '📞 전화 상담',
          email: '📧 이메일',
          meeting: '🤝 미팅',
          note: '📝 메모'
        }
        const typeLabel = recordTypeLabels[recordType] || recordType

        const message = `📋 상담 기록 추가\n\n` +
          `🏢 기업: ${selectedConsultation.company_name || '미입력'}\n` +
          `👤 담당자: ${selectedConsultation.name || '미입력'}\n` +
          `📱 연락처: ${selectedConsultation.phone || '미입력'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${typeLabel}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${newRecord}\n\n` +
          `⏰ ${new Date().toLocaleString('ko-KR')}`

        const response = await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            isAdminNotification: true,
            channelId: 'b9387420-7c8d-e703-0f96-dbfc72565bb5'  // 상담 히스토리 전용 채널
          })
        })

        const result = await response.json()
        if (!response.ok || !result.success) {
          console.error('네이버웍스 알림 응답 오류:', result)
        } else {
          console.log('네이버웍스 알림 전송 성공')
        }
      } catch (notifyError) {
        console.error('네이버웍스 알림 실패:', notifyError)
        // 알림 실패해도 저장은 성공했으므로 에러 표시 안함
      }

      setNewRecord('')
    } catch (error) {
      console.error('상담 기록 저장 오류:', error)
      alert('저장에 실패했습니다: ' + error.message)
    }
  }

  // 상담 기록 수정 시작
  const handleStartEditRecord = (record) => {
    setEditingRecordId(record.id)
    setEditingRecordContent(record.content)
    setEditingRecordType(record.type)
  }

  // 상담 기록 수정 취소
  const handleCancelEditRecord = () => {
    setEditingRecordId(null)
    setEditingRecordContent('')
    setEditingRecordType('')
  }

  // 상담 기록 수정 저장
  const handleSaveEditRecord = async () => {
    if (!editingRecordContent.trim() || !selectedConsultation || !editingRecordId) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_records')
        .update({
          content: editingRecordContent,
          type: editingRecordType,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRecordId)

      if (error) throw error

      // 상태 업데이트
      const updatedRecords = (selectedConsultation.records || []).map(record =>
        record.id === editingRecordId
          ? {
              ...record,
              content: editingRecordContent,
              type: editingRecordType,
              updated_at: new Date().toISOString()
            }
          : record
      )

      setSelectedConsultation({
        ...selectedConsultation,
        records: updatedRecords
      })

      handleCancelEditRecord()
    } catch (error) {
      console.error('상담 기록 수정 오류:', error)
      alert('수정에 실패했습니다: ' + error.message)
    }
  }

  // 상담 기록 삭제
  const handleDeleteRecord = async (recordId) => {
    if (!selectedConsultation) return
    if (!confirm('이 상담 기록을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      // 상태 업데이트
      const updatedRecords = (selectedConsultation.records || []).filter(record => record.id !== recordId)

      setSelectedConsultation({
        ...selectedConsultation,
        records: updatedRecords
      })
    } catch (error) {
      console.error('상담 기록 삭제 오류:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    }
  }

  const handleSaveContract = async () => {
    if (!selectedConsultation) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({
          contract_status: contractStatus,
          expected_revenue: expectedRevenue ? parseInt(expectedRevenue) : null,
          contract_sent: contractSent,
          next_contact_date: nextContactDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConsultation.id)

      if (error) throw error

      alert('계약 정보가 저장되었습니다.')
      fetchConsultations()
    } catch (error) {
      console.error('계약 정보 저장 오류:', error)
      alert('계약 정보 저장에 실패했습니다: ' + error.message)
    }
  }

  const handleSaveMemo = async () => {
    if (!selectedConsultation) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({
          memo: memo,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConsultation.id)

      if (error) throw error

      setEditingMemo(false)
      fetchConsultations()
    } catch (error) {
      console.error('메모 저장 오류:', error)
    }
  }

  // localStorage 데이터를 서버로 마이그레이션
  const handleMigrateLocalData = async () => {
    if (!confirm('localStorage에 저장된 상담 데이터를 서버로 이전합니다. 계속하시겠습니까?')) return

    setMigrating(true)
    let migratedRecords = 0
    let migratedContracts = 0
    let errors = []

    try {
      // 모든 상담에 대해 localStorage 데이터 확인
      for (const consultation of consultations) {
        // 1. 상담 기록 마이그레이션
        try {
          const storedRecords = localStorage.getItem(`consultation_records_${consultation.id}`)
          if (storedRecords) {
            const records = JSON.parse(storedRecords)
            if (records.length > 0) {
              // 서버에 저장
              for (const record of records) {
                const { error } = await supabaseBiz
                  .from('consultation_records')
                  .insert({
                    consultation_id: consultation.id,
                    type: record.type || 'note',
                    content: record.content,
                    author: record.author || '관리자',
                    created_at: record.created_at || new Date().toISOString(),
                    updated_at: record.updated_at || null
                  })

                if (!error) {
                  migratedRecords++
                }
              }
              // 성공 시 localStorage에서 삭제
              localStorage.removeItem(`consultation_records_${consultation.id}`)
            }
          }
        } catch (e) {
          errors.push(`상담 기록 (${consultation.company_name}): ${e.message}`)
        }

        // 2. 계약 정보 마이그레이션
        try {
          const contractStatus = localStorage.getItem(`contract_status_${consultation.id}`)
          const expectedRevenue = localStorage.getItem(`expected_revenue_${consultation.id}`)
          const contractSent = localStorage.getItem(`contract_sent_${consultation.id}`)
          const nextContactDate = localStorage.getItem(`next_contact_date_${consultation.id}`)

          if (contractStatus || expectedRevenue || contractSent || nextContactDate) {
            const { error } = await supabaseBiz
              .from('consultation_requests')
              .update({
                contract_status: contractStatus || consultation.contract_status || 'pending',
                expected_revenue: expectedRevenue ? parseInt(expectedRevenue) : consultation.expected_revenue,
                contract_sent: contractSent === 'true',
                next_contact_date: nextContactDate || consultation.next_contact_date
              })
              .eq('id', consultation.id)

            if (!error) {
              migratedContracts++
              // 성공 시 localStorage에서 삭제
              localStorage.removeItem(`contract_status_${consultation.id}`)
              localStorage.removeItem(`expected_revenue_${consultation.id}`)
              localStorage.removeItem(`contract_sent_${consultation.id}`)
              localStorage.removeItem(`next_contact_date_${consultation.id}`)
            }
          }
        } catch (e) {
          errors.push(`계약 정보 (${consultation.company_name}): ${e.message}`)
        }
      }

      let message = `마이그레이션 완료!\n- 상담 기록: ${migratedRecords}건\n- 계약 정보: ${migratedContracts}건`
      if (errors.length > 0) {
        message += `\n\n오류 발생:\n${errors.join('\n')}`
      }

      alert(message)
      checkLocalData()
      fetchConsultations()
    } catch (error) {
      console.error('마이그레이션 오류:', error)
      alert('마이그레이션 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedConsultation) return

    try {
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', selectedConsultation.id)

      if (error) throw error

      setSelectedConsultation({ ...selectedConsultation, status: newStatus })
      fetchConsultations()
    } catch (error) {
      console.error('상태 변경 오류:', error)
    }
  }

  const getContractStatusFromConsultation = (consultation) => {
    return consultation?.contract_status || 'pending'
  }

  const getExpectedRevenueFromConsultation = (consultation) => {
    return consultation?.expected_revenue?.toString() || ''
  }

  const getNextContactDateFromConsultation = (consultation) => {
    return consultation?.next_contact_date || ''
  }

  const formatNextContactDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `${Math.abs(diffDays)}일 지남`
    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '내일'
    return `${diffDays}일 후`
  }

  const getStageProgress = (consultation) => {
    const status = getContractStatusFromConsultation(consultation)
    const stageMap = {
      'pending': 0,
      'contacted': 1,
      'negotiating': 2,
      'contracted': 3
    }
    return stageMap[status] || 0
  }

  const getRecordIcon = (type) => {
    switch (type) {
      case 'phone': return <Phone className="w-4 h-4 text-blue-500" />
      case 'email': return <Mail className="w-4 h-4 text-green-500" />
      case 'meeting': return <User className="w-4 h-4 text-purple-500" />
      default: return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getRecordTypeLabel = (type) => {
    switch (type) {
      case 'phone': return '전화 상담'
      case 'email': return '이메일 발송'
      case 'meeting': return '미팅'
      default: return '메모'
    }
  }

  const filteredConsultations = consultations.filter(c =>
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (consultation) => {
    const status = getContractStatusFromConsultation(consultation)
    switch (status) {
      case 'contracted':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">계약 완료</span>
      case 'negotiating':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">협상 중</span>
      case 'contacted':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">컨택 완료</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">신규 배정</span>
    }
  }

  const getLastContact = (consultation) => {
    // consultation에 records가 없으면 DB에서 따로 조회해야 하지만,
    // 리스트에서는 간단히 표시만 하고 실제 데이터는 선택 시 로드
    return '상담 선택 시 확인'
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-100 lg:ml-64">
        <div className="flex h-screen">
          {/* 왼쪽 패널 - 상담 리스트 */}
          <div className="w-96 bg-white border-r flex flex-col">
            {/* 헤더 */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900">상담 관리 CRM</h1>
                <div className="flex gap-2">
                  {hasLocalData && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMigrateLocalData}
                      disabled={migrating}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      {migrating ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-1" />
                      )}
                      데이터 이전
                    </Button>
                  )}
                  <Button size="sm" className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-1" />
                    상담 추가
                  </Button>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-3">
                진행 중 상담 <span className="font-bold text-blue-600">{consultations.filter(c => c.status === 'pending').length}건</span>
              </div>

              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="기업명, 담당자 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 상담 리스트 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">로딩 중...</div>
              ) : filteredConsultations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">상담 내역이 없습니다</div>
              ) : (
                filteredConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    onClick={() => selectConsultation(consultation)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedConsultation?.id === consultation.id
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{consultation.company_name}</h3>
                        <p className="text-sm text-gray-500">{consultation.contact_name} 담당자</p>
                      </div>
                      {getStatusBadge(consultation)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getLastContact(consultation)}
                      </span>
                      {consultation.next_contact_date && (
                        <span className={`font-medium flex items-center gap-1 ${
                          formatNextContactDate(consultation.next_contact_date).includes('지남')
                            ? 'text-red-500'
                            : formatNextContactDate(consultation.next_contact_date) === '오늘'
                              ? 'text-orange-500'
                              : 'text-blue-500'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          다음 연락: {formatNextContactDate(consultation.next_contact_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 오른쪽 패널 - 상담 상세 */}
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
            {selectedConsultation ? (
              <>
                {/* 상단 헤더 */}
                <div className="bg-white border-b p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                        {(selectedConsultation.company_name || '?').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">{selectedConsultation.company_name}</h2>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {selectedConsultation.contact_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {selectedConsultation.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {selectedConsultation.email}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleUpdateStatus('pending')}>
                        계약 실패 처리
                      </Button>
                      <Button
                        className="bg-blue-600"
                        onClick={() => handleUpdateStatus('completed')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        계약 성사 확정
                      </Button>
                    </div>
                  </div>

                  {/* 진행 단계 */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      {['신규 접수', '컨택/미팅', '제안/협상', '계약 완료'].map((stage, index) => (
                        <div
                          key={stage}
                          className={`text-xs font-medium ${
                            index <= getStageProgress(selectedConsultation)
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {stage}
                        </div>
                      ))}
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${((getStageProgress(selectedConsultation) + 1) / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* 왼쪽 2칸 - 상담 기록 */}
                    <div className="col-span-2 space-y-6">
                      {/* 상담 기록 입력 */}
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex gap-4 mb-4">
                          <button className="px-3 py-1.5 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                            상담 기록
                          </button>
                          <button className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
                            특이사항 (비고)
                          </button>
                        </div>

                        <div className="space-y-4">
                          <textarea
                            value={newRecord}
                            onChange={(e) => setNewRecord(e.target.value)}
                            placeholder="상담 내용을 입력하거나 특이사항을 기록하세요..."
                            rows={3}
                            className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                <Paperclip className="w-5 h-5" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                                <Calendar className="w-5 h-5" />
                              </button>
                              <select
                                value={recordType}
                                onChange={(e) => setRecordType(e.target.value)}
                                className="text-sm border rounded-lg px-3 py-1.5"
                              >
                                <option value="phone">전화 상담</option>
                                <option value="email">이메일 발송</option>
                                <option value="meeting">미팅</option>
                                <option value="note">메모</option>
                              </select>
                            </div>
                            <Button onClick={handleSaveRecord} disabled={!newRecord.trim()}>
                              저장하기
                              <Send className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 상담 히스토리 */}
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">상담 히스토리</h3>
                        <div className="space-y-4">
                          {(selectedConsultation.records || []).length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                              <p>아직 상담 기록이 없습니다</p>
                            </div>
                          ) : (
                            [...(selectedConsultation.records || [])].reverse().map((record) => (
                              <div key={record.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                                  {getRecordIcon(record.type)}
                                </div>
                                <div className="flex-1">
                                  {editingRecordId === record.id ? (
                                    /* 수정 모드 */
                                    <div className="space-y-3">
                                      <select
                                        value={editingRecordType}
                                        onChange={(e) => setEditingRecordType(e.target.value)}
                                        className="px-3 py-1.5 border rounded-lg text-sm"
                                      >
                                        <option value="phone">전화 상담</option>
                                        <option value="email">이메일</option>
                                        <option value="meeting">미팅</option>
                                        <option value="note">메모</option>
                                      </select>
                                      <textarea
                                        value={editingRecordContent}
                                        onChange={(e) => setEditingRecordContent(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg resize-none text-sm"
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={handleSaveEditRecord}
                                          className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                          저장
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEditRecord}
                                        >
                                          취소
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* 보기 모드 */
                                    <>
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900">{getRecordTypeLabel(record.type)}</span>
                                          <span className="text-xs text-gray-500">by {record.author}</span>
                                          <span className="text-xs text-gray-400">
                                            {new Date(record.created_at).toLocaleString('ko-KR')}
                                          </span>
                                          {record.updated_at && record.updated_at !== record.created_at && (
                                            <span className="text-xs text-blue-500">(수정됨)</span>
                                          )}
                                        </div>
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleStartEditRecord(record)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="수정"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRecord(record.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            title="삭제"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-gray-700">{record.content}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          )}

                          {/* 상담 리드 생성 */}
                          <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                            <Plus className="w-4 h-4" />
                            <span>상담 리드 생성됨 - {new Date(selectedConsultation.created_at).toLocaleString('ko-KR')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽 1칸 - 계약 정보 & 메모 */}
                    <div className="space-y-6">
                      {/* 계약 정보 */}
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">계약 정보</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">계약 여부</label>
                            <select
                              value={contractStatus}
                              onChange={(e) => setContractStatus(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">계약 대기 (Pending)</option>
                              <option value="contacted">컨택 완료</option>
                              <option value="negotiating">협상 중</option>
                              <option value="contracted">계약 완료</option>
                              <option value="lost">계약 실패</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">예상 매출액</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                              <input
                                type="text"
                                value={expectedRevenue ? Number(expectedRevenue).toLocaleString() : ''}
                                onChange={(e) => setExpectedRevenue(e.target.value.replace(/,/g, ''))}
                                placeholder="0"
                                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              다음 연락 예정일
                              {nextContactDate && (
                                <span className={`ml-2 text-xs font-normal ${
                                  formatNextContactDate(nextContactDate).includes('지남')
                                    ? 'text-red-500'
                                    : formatNextContactDate(nextContactDate) === '오늘'
                                      ? 'text-orange-500'
                                      : 'text-blue-500'
                                }`}>
                                  ({formatNextContactDate(nextContactDate)})
                                </span>
                              )}
                            </label>
                            <input
                              type="date"
                              value={nextContactDate}
                              onChange={(e) => setNextContactDate(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={contractSent}
                              onChange={(e) => setContractSent(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">전자계약서 발송 완료</span>
                          </label>

                          <Button onClick={handleSaveContract} className="w-full">
                            계약 정보 저장
                          </Button>
                        </div>
                      </div>

                      {/* 중요 비고 (메모) */}
                      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-sm p-6 border border-red-100">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-red-700 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            중요 비고 (Memo)
                          </h3>
                          {!editingMemo && (
                            <button
                              onClick={() => setEditingMemo(true)}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              수정하기
                            </button>
                          )}
                        </div>

                        {editingMemo ? (
                          <div className="space-y-3">
                            <textarea
                              value={memo}
                              onChange={(e) => setMemo(e.target.value)}
                              rows={4}
                              placeholder="중요한 메모를 입력하세요..."
                              className="w-full px-3 py-2 border border-red-200 rounded-lg resize-none focus:ring-2 focus:ring-red-500"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleSaveMemo}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMemo(false)
                                  setMemo(selectedConsultation.memo || '')
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-red-800 whitespace-pre-wrap">
                            {memo || (
                              <span className="text-red-400 italic">메모가 없습니다. 클릭하여 추가하세요.</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 기본 정보 */}
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">기본 정보</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">회사명</span>
                            <span className="font-medium">{selectedConsultation.company_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">담당자</span>
                            <span className="font-medium">{selectedConsultation.contact_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">연락처</span>
                            <span className="font-medium">{selectedConsultation.phone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">이메일</span>
                            <span className="font-medium text-blue-600">{selectedConsultation.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">상담 신청일</span>
                            <span className="font-medium">
                              {new Date(selectedConsultation.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>상담을 선택해주세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
