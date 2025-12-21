import { useState, useEffect, useMemo } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'
import {
  MessageCircle, CheckCircle, Clock, Mail, Phone, Building, Calendar,
  FileText, Search, Plus, Send, Paperclip, ChevronRight, User,
  DollarSign, FileCheck, AlertCircle, MoreHorizontal, X, Edit2, Trash2,
  LayoutList, LayoutGrid, Filter, Flame, AlertTriangle, TrendingUp,
  GripVertical, ChevronDown, Eye, Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AdminNavigation from './AdminNavigation'

// 상태 정의
const STATUSES = {
  new_lead: { label: '신규 리드', color: 'bg-slate-100 text-slate-700', dotColor: 'bg-slate-400' },
  contacted: { label: '컨택/미팅', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-400' },
  negotiating: { label: '제안/협상', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
  contracted: { label: '계약 성사', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
  completed: { label: '상담 완료', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' },
  lost: { label: '진행 중지', color: 'bg-gray-100 text-gray-500', dotColor: 'bg-gray-400' }
}

// 칸반 컬럼 순서
const KANBAN_COLUMNS = ['new_lead', 'contacted', 'negotiating', 'contracted']

export default function ConsultationManagement() {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [smartFilter, setSmartFilter] = useState('all') // 'all', 'urgent', 'hot', 'my'
  const [sortBy, setSortBy] = useState('latest') // 'latest', 'probability', 'revenue'
  const [showAddModal, setShowAddModal] = useState(false)

  // 상담 기록 입력
  const [newRecord, setNewRecord] = useState('')
  const [recordType, setRecordType] = useState('phone')

  // 상담 기록 수정
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [editingRecordContent, setEditingRecordContent] = useState('')
  const [editingRecordType, setEditingRecordType] = useState('')

  // 계약 정보
  const [contractStatus, setContractStatus] = useState('new_lead')
  const [expectedRevenue, setExpectedRevenue] = useState('')
  const [contractProbability, setContractProbability] = useState(10)
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')

  // 메모/비고
  const [memo, setMemo] = useState('')
  const [editingMemo, setEditingMemo] = useState(false)

  // 담당자
  const [assignee, setAssignee] = useState('')

  useEffect(() => {
    fetchConsultations()
  }, [])

  const fetchConsultations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('consultation_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // localStorage에서 추가 데이터 병합
      const enrichedData = (data || []).map(c => {
        const localData = getLocalData(c.id)
        return { ...c, ...localData }
      })

      setConsultations(enrichedData)

      if (enrichedData.length > 0 && !selectedConsultation) {
        selectConsultation(enrichedData[0])
      }
    } catch (error) {
      console.error('상담 신청 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLocalData = (id) => {
    try {
      const records = localStorage.getItem(`consultation_records_${id}`)
      const status = localStorage.getItem(`contract_status_${id}`) || 'new_lead'
      const revenue = localStorage.getItem(`expected_revenue_${id}`) || ''
      const probability = localStorage.getItem(`contract_probability_${id}`) || '10'
      const action = localStorage.getItem(`next_action_${id}`) || ''
      const actionDate = localStorage.getItem(`next_action_date_${id}`) || ''
      const assign = localStorage.getItem(`assignee_${id}`) || ''
      const localMemo = localStorage.getItem(`memo_${id}`) || ''

      return {
        records: records ? JSON.parse(records) : [],
        contract_status: status,
        expected_revenue: revenue,
        contract_probability: parseInt(probability),
        next_action: action,
        next_action_date: actionDate,
        assignee: assign,
        local_memo: localMemo
      }
    } catch {
      return {
        records: [],
        contract_status: 'new_lead',
        expected_revenue: '',
        contract_probability: 10,
        next_action: '',
        next_action_date: '',
        assignee: '',
        local_memo: ''
      }
    }
  }

  const saveLocalData = (id, key, value) => {
    try {
      localStorage.setItem(`${key}_${id}`, typeof value === 'object' ? JSON.stringify(value) : value)
    } catch (e) {
      console.error('localStorage 저장 오류:', e)
    }
  }

  const selectConsultation = (consultation) => {
    const localData = getLocalData(consultation.id)
    setSelectedConsultation({ ...consultation, ...localData })
    setContractStatus(localData.contract_status)
    setExpectedRevenue(localData.expected_revenue)
    setContractProbability(localData.contract_probability)
    setNextAction(localData.next_action)
    setNextActionDate(localData.next_action_date)
    setAssignee(localData.assignee)
    setMemo(consultation.memo || localData.local_memo || '')
    setNewRecord('')
  }

  // 마지막 연락일 계산
  const getDaysSinceLastContact = (consultation) => {
    const records = consultation.records || []
    if (records.length === 0) {
      const created = new Date(consultation.created_at)
      return Math.floor((new Date() - created) / (1000 * 60 * 60 * 24))
    }
    const lastRecord = records[records.length - 1]
    const lastDate = new Date(lastRecord.created_at)
    return Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24))
  }

  // 필터링된 상담 목록
  const filteredConsultations = useMemo(() => {
    let filtered = consultations.filter(c =>
      (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assignee || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    // 스마트 필터 적용
    switch (smartFilter) {
      case 'urgent':
        filtered = filtered.filter(c => getDaysSinceLastContact(c) >= 7)
        break
      case 'hot':
        filtered = filtered.filter(c => (c.contract_probability || 10) >= 80)
        break
      case 'my':
        filtered = filtered.filter(c => c.assignee === '나')
        break
    }

    // 정렬
    switch (sortBy) {
      case 'probability':
        filtered.sort((a, b) => (b.contract_probability || 0) - (a.contract_probability || 0))
        break
      case 'revenue':
        filtered.sort((a, b) => parseInt(b.expected_revenue || 0) - parseInt(a.expected_revenue || 0))
        break
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return filtered
  }, [consultations, searchTerm, smartFilter, sortBy])

  // 칸반 뷰용 데이터
  const kanbanData = useMemo(() => {
    const columns = {}
    KANBAN_COLUMNS.forEach(status => {
      columns[status] = filteredConsultations.filter(c => c.contract_status === status)
    })
    return columns
  }, [filteredConsultations])

  // 통계 계산
  const stats = useMemo(() => {
    const total = consultations.length
    const thisMonthRevenue = consultations
      .filter(c => c.contract_status === 'contracted')
      .reduce((sum, c) => sum + parseInt(c.expected_revenue || 0), 0)
    const urgentCount = consultations.filter(c => getDaysSinceLastContact(c) >= 7).length
    return { total, thisMonthRevenue, urgentCount }
  }, [consultations])

  const handleSaveRecord = async () => {
    if (!newRecord.trim() || !selectedConsultation) return

    try {
      const existingRecords = selectedConsultation.records || []
      const newRecordObj = {
        id: Date.now(),
        type: recordType,
        content: newRecord,
        author: '관리자',
        created_at: new Date().toISOString()
      }

      const updatedRecords = [...existingRecords, newRecordObj]
      saveLocalData(selectedConsultation.id, 'consultation_records', updatedRecords)

      const updated = { ...selectedConsultation, records: updatedRecords }
      setSelectedConsultation(updated)
      setNewRecord('')

      setConsultations(prev => prev.map(c =>
        c.id === selectedConsultation.id ? updated : c
      ))
    } catch (error) {
      console.error('상담 기록 저장 오류:', error)
      alert('저장에 실패했습니다.')
    }
  }

  const handleStartEditRecord = (record) => {
    setEditingRecordId(record.id)
    setEditingRecordContent(record.content)
    setEditingRecordType(record.type)
  }

  const handleCancelEditRecord = () => {
    setEditingRecordId(null)
    setEditingRecordContent('')
    setEditingRecordType('')
  }

  const handleSaveEditRecord = () => {
    if (!editingRecordContent.trim() || !selectedConsultation || !editingRecordId) return

    try {
      const updatedRecords = (selectedConsultation.records || []).map(record =>
        record.id === editingRecordId
          ? { ...record, content: editingRecordContent, type: editingRecordType, updated_at: new Date().toISOString() }
          : record
      )

      saveLocalData(selectedConsultation.id, 'consultation_records', updatedRecords)

      const updated = { ...selectedConsultation, records: updatedRecords }
      setSelectedConsultation(updated)

      setConsultations(prev => prev.map(c =>
        c.id === selectedConsultation.id ? updated : c
      ))

      handleCancelEditRecord()
    } catch (error) {
      console.error('상담 기록 수정 오류:', error)
    }
  }

  const handleDeleteRecord = (recordId) => {
    if (!selectedConsultation) return
    if (!confirm('이 상담 기록을 삭제하시겠습니까?')) return

    try {
      const updatedRecords = (selectedConsultation.records || []).filter(r => r.id !== recordId)
      saveLocalData(selectedConsultation.id, 'consultation_records', updatedRecords)

      const updated = { ...selectedConsultation, records: updatedRecords }
      setSelectedConsultation(updated)

      setConsultations(prev => prev.map(c =>
        c.id === selectedConsultation.id ? updated : c
      ))
    } catch (error) {
      console.error('상담 기록 삭제 오류:', error)
    }
  }

  const handleSaveContract = () => {
    if (!selectedConsultation) return

    try {
      saveLocalData(selectedConsultation.id, 'contract_status', contractStatus)
      saveLocalData(selectedConsultation.id, 'expected_revenue', expectedRevenue)
      saveLocalData(selectedConsultation.id, 'contract_probability', contractProbability.toString())
      saveLocalData(selectedConsultation.id, 'next_action', nextAction)
      saveLocalData(selectedConsultation.id, 'next_action_date', nextActionDate)
      saveLocalData(selectedConsultation.id, 'assignee', assignee)

      const updated = {
        ...selectedConsultation,
        contract_status: contractStatus,
        expected_revenue: expectedRevenue,
        contract_probability: contractProbability,
        next_action: nextAction,
        next_action_date: nextActionDate,
        assignee
      }
      setSelectedConsultation(updated)

      setConsultations(prev => prev.map(c =>
        c.id === selectedConsultation.id ? updated : c
      ))

      alert('저장되었습니다.')
    } catch (error) {
      console.error('계약 정보 저장 오류:', error)
    }
  }

  const handleSaveMemo = async () => {
    if (!selectedConsultation) return

    try {
      // DB에 저장 시도
      const { error } = await supabaseBiz
        .from('consultation_requests')
        .update({ memo, updated_at: new Date().toISOString() })
        .eq('id', selectedConsultation.id)

      if (error) {
        // DB 저장 실패시 localStorage에 저장
        saveLocalData(selectedConsultation.id, 'memo', memo)
      }

      setEditingMemo(false)
      setSelectedConsultation({ ...selectedConsultation, memo })
      setConsultations(prev => prev.map(c =>
        c.id === selectedConsultation.id ? { ...c, memo } : c
      ))
    } catch (error) {
      console.error('메모 저장 오류:', error)
      saveLocalData(selectedConsultation.id, 'memo', memo)
      setEditingMemo(false)
    }
  }

  const handleStatusChange = (consultationId, newStatus) => {
    saveLocalData(consultationId, 'contract_status', newStatus)

    const updated = consultations.map(c =>
      c.id === consultationId ? { ...c, contract_status: newStatus } : c
    )
    setConsultations(updated)

    if (selectedConsultation?.id === consultationId) {
      setSelectedConsultation({ ...selectedConsultation, contract_status: newStatus })
      setContractStatus(newStatus)
    }
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
      case 'email': return '이메일'
      case 'meeting': return '미팅'
      default: return '메모'
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return '₩' + parseInt(value).toLocaleString()
  }

  const getLastContactText = (consultation) => {
    const days = getDaysSinceLastContact(consultation)
    if (days === 0) return '오늘'
    if (days === 1) return '어제'
    return `${days}일 전`
  }

  // 리스트 아이템 렌더링
  const renderListItem = (consultation, isCompact = false) => {
    const status = STATUSES[consultation.contract_status] || STATUSES.new_lead
    const daysSinceContact = getDaysSinceLastContact(consultation)
    const isUrgent = daysSinceContact >= 7

    if (isCompact) {
      // 칸반 뷰용 컴팩트 카드
      return (
        <div
          key={consultation.id}
          onClick={() => selectConsultation(consultation)}
          className={`p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-all ${
            selectedConsultation?.id === consultation.id ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm truncate flex-1">
              {consultation.company_name}
            </h4>
            {isUrgent && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-500 mb-2">{consultation.contact_name}</p>

          {/* 계약 확률 바 */}
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">계약 확률</span>
              <span className={`font-medium ${consultation.contract_probability >= 80 ? 'text-green-600' : 'text-gray-600'}`}>
                {consultation.contract_probability || 10}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  consultation.contract_probability >= 80 ? 'bg-green-500' :
                  consultation.contract_probability >= 50 ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                style={{ width: `${consultation.contract_probability || 10}%` }}
              />
            </div>
          </div>

          {/* 예상 매출 */}
          {consultation.expected_revenue && (
            <div className="text-sm font-semibold text-gray-900 mb-2">
              {formatCurrency(consultation.expected_revenue)}
            </div>
          )}

          {/* Next Action */}
          {consultation.next_action && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2">
              <Target className="w-3 h-3" />
              <span className="truncate">{consultation.next_action}</span>
              {consultation.next_action_date && (
                <span className="text-blue-400">({consultation.next_action_date})</span>
              )}
            </div>
          )}

          {/* 마지막 연락 */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getLastContactText(consultation)}
            </span>
            {consultation.assignee && (
              <span className="text-gray-500">{consultation.assignee}</span>
            )}
          </div>
        </div>
      )
    }

    // 리스트 뷰용 전체 행
    return (
      <tr
        key={consultation.id}
        onClick={() => selectConsultation(consultation)}
        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
          selectedConsultation?.id === consultation.id ? 'bg-blue-50' : ''
        }`}
      >
        {/* 긴급 표시 */}
        <td className="px-4 py-4 w-8">
          {isUrgent && <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />}
        </td>

        {/* 기업 정보 */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {(consultation.company_name || '?').charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{consultation.company_name}</div>
              <div className="text-sm text-gray-500">{consultation.contact_name}</div>
            </div>
          </div>
        </td>

        {/* 상태 */}
        <td className="px-4 py-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </td>

        {/* 계약 확률 */}
        <td className="px-4 py-4 w-32">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  consultation.contract_probability >= 80 ? 'bg-green-500' :
                  consultation.contract_probability >= 50 ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                style={{ width: `${consultation.contract_probability || 10}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600 w-10 text-right">
              {consultation.contract_probability || 10}%
            </span>
          </div>
        </td>

        {/* 예상 매출 */}
        <td className="px-4 py-4">
          <span className="font-semibold text-gray-900">
            {formatCurrency(consultation.expected_revenue)}
          </span>
        </td>

        {/* NEXT ACTION */}
        <td className="px-4 py-4">
          {consultation.next_action ? (
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">{consultation.next_action}</span>
              {consultation.next_action_date && (
                <span className="text-xs text-gray-400">({consultation.next_action_date})</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </td>

        {/* 마지막 연락 */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {getLastContactText(consultation)}
          </div>
        </td>

        {/* 비고 (메모) */}
        <td className="px-4 py-4 max-w-[200px]">
          {(consultation.memo || consultation.local_memo) ? (
            <p className="text-sm text-gray-600 truncate" title={consultation.memo || consultation.local_memo}>
              {consultation.memo || consultation.local_memo}
            </p>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </td>

        {/* 더보기 */}
        <td className="px-4 py-4">
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        {/* 헤더 */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">상담 파이프라인</h1>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="text-gray-500">
                    이번달 계약 예상: <span className="font-bold text-blue-600">{(stats.thisMonthRevenue / 100000000).toFixed(1)}억</span>
                  </span>
                  <span className="text-gray-500">
                    관리 필요: <span className="font-bold text-red-500">{stats.urgentCount}건</span>
                  </span>
                </div>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                신규 상담 등록
              </Button>
            </div>

            {/* 필터 & 뷰 전환 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 스마트 필터 버튼들 */}
                <button
                  onClick={() => setSmartFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    smartFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  전체 보기
                </button>
                <button
                  onClick={() => setSmartFilter('urgent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    smartFilter === 'urgent' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  관리 시급 (80%↑)
                </button>
                <button
                  onClick={() => setSmartFilter('hot')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    smartFilter === 'hot' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  계약 유력 (80%↑)
                </button>
                <button
                  onClick={() => setSmartFilter('my')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    smartFilter === 'my' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  내 담당
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* 검색 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="기업, 담당자 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg text-sm w-56 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 뷰 모드 전환 */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                    title="리스트 뷰"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                    title="칸반 뷰"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="p-6">
          {viewMode === 'list' ? (
            /* 리스트 뷰 */
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">급</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">기업 정보</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">계약 확률</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">예상 매출</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NEXT ACTION</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">마지막 연락</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">비고</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">로딩 중...</td>
                    </tr>
                  ) : filteredConsultations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">상담 내역이 없습니다</td>
                    </tr>
                  ) : (
                    filteredConsultations.map(c => renderListItem(c, false))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* 칸반 뷰 */
            <div className="flex gap-4 overflow-x-auto pb-4">
              {KANBAN_COLUMNS.map(statusKey => {
                const status = STATUSES[statusKey]
                const items = kanbanData[statusKey] || []
                const totalRevenue = items.reduce((sum, c) => sum + parseInt(c.expected_revenue || 0), 0)

                return (
                  <div key={statusKey} className="flex-shrink-0 w-80">
                    {/* 컬럼 헤더 */}
                    <div className="bg-white rounded-t-xl border-t border-x px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                          <span className="font-semibold text-gray-900">{status.label}</span>
                          <span className="text-sm text-gray-400">{items.length}</span>
                        </div>
                        {totalRevenue > 0 && (
                          <span className="text-sm font-medium text-gray-500">
                            {formatCurrency(totalRevenue)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 카드 목록 */}
                    <div className="bg-gray-100 rounded-b-xl border-b border-x p-2 space-y-2 min-h-[500px]">
                      {items.map(c => renderListItem(c, true))}
                      {items.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          항목 없음
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 상세 패널 (슬라이드 오버) */}
        {selectedConsultation && (
          <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l z-50 flex flex-col">
            {/* 헤더 */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {(selectedConsultation.company_name || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedConsultation.company_name}</h2>
                    <p className="text-sm text-gray-500">{selectedConsultation.contact_name} 담당자</p>
                  </div>
                </div>
                <button onClick={() => setSelectedConsultation(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 연락처 */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {selectedConsultation.phone}
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {selectedConsultation.email}
                </span>
              </div>
            </div>

            {/* 콘텐츠 - 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 계약 정보 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">계약 정보</h3>

                {/* 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
                  <select
                    value={contractStatus}
                    onChange={(e) => setContractStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUSES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                {/* 계약 확률 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계약 확률: <span className="text-blue-600 font-bold">{contractProbability}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={contractProbability}
                    onChange={(e) => setContractProbability(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* 예상 매출 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">예상 매출액</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₩</span>
                    <input
                      type="text"
                      value={expectedRevenue ? parseInt(expectedRevenue).toLocaleString() : ''}
                      onChange={(e) => setExpectedRevenue(e.target.value.replace(/,/g, ''))}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 담당자 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당자</label>
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="담당자 이름"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Next Action */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" />
                  NEXT ACTION
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="다음에 할 일을 입력하세요 (예: 계약서 초안 발송)"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <input
                    type="text"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    placeholder="예정일 (예: 오늘, 내일, 12.25)"
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* 비고 (메모) */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    비고 (Memo)
                  </h3>
                  {!editingMemo && (
                    <button onClick={() => setEditingMemo(true)} className="text-sm text-amber-600 hover:text-amber-700">
                      수정
                    </button>
                  )}
                </div>
                {editingMemo ? (
                  <div className="space-y-2">
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={3}
                      placeholder="중요한 메모..."
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveMemo} className="bg-amber-600 hover:bg-amber-700">저장</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingMemo(false); setMemo(selectedConsultation.memo || '') }}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 whitespace-pre-wrap">
                    {memo || <span className="text-amber-400 italic">메모 없음</span>}
                  </p>
                )}
              </div>

              {/* 저장 버튼 */}
              <Button onClick={handleSaveContract} className="w-full">
                변경사항 저장
              </Button>

              {/* 상담 기록 입력 */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">상담 기록 추가</h3>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={recordType}
                      onChange={(e) => setRecordType(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="phone">전화</option>
                      <option value="email">이메일</option>
                      <option value="meeting">미팅</option>
                      <option value="note">메모</option>
                    </select>
                    <input
                      type="text"
                      value={newRecord}
                      onChange={(e) => setNewRecord(e.target.value)}
                      placeholder="상담 내용..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveRecord()}
                    />
                    <Button onClick={handleSaveRecord} disabled={!newRecord.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 상담 히스토리 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">상담 히스토리</h3>
                <div className="space-y-3">
                  {(selectedConsultation.records || []).length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      아직 상담 기록이 없습니다
                    </div>
                  ) : (
                    [...(selectedConsultation.records || [])].reverse().map((record) => (
                      <div key={record.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border flex-shrink-0">
                          {getRecordIcon(record.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingRecordId === record.id ? (
                            <div className="space-y-2">
                              <select
                                value={editingRecordType}
                                onChange={(e) => setEditingRecordType(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option value="phone">전화</option>
                                <option value="email">이메일</option>
                                <option value="meeting">미팅</option>
                                <option value="note">메모</option>
                              </select>
                              <textarea
                                value={editingRecordContent}
                                onChange={(e) => setEditingRecordContent(e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm resize-none"
                                rows={2}
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={handleSaveEditRecord}>저장</Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEditRecord}>취소</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">{getRecordTypeLabel(record.type)}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(record.created_at).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{record.content}</p>
                            </>
                          )}
                        </div>
                        {editingRecordId !== record.id && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => handleStartEditRecord(record)} className="p-1 text-gray-400 hover:text-blue-600">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteRecord(record.id)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
