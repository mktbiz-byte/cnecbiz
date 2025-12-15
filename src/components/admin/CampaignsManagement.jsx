import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TrendingUp, Search, Eye, CheckCircle, XCircle, Clock,
  DollarSign, Edit, Trash2, PlayCircle, Pause, CheckSquare,
  ChevronLeft, ChevronRight, Loader2, Users, Calendar, Target
} from 'lucide-react'
import { supabaseBiz, getCampaignsWithStats, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

const ITEMS_PER_PAGE = 20

// 크리에이터 포인트 계산 함수 (1인당)
const calculateCreatorPoints = (campaign) => {
  if (!campaign) return 0

  if (campaign.creator_points_override) {
    return campaign.creator_points_override
  }

  const campaignType = campaign.campaign_type
  const totalSlots = campaign.total_slots || 1

  if (campaignType === '4week_challenge') {
    const weeklyTotal = (campaign.week1_reward || 0) + (campaign.week2_reward || 0) +
                       (campaign.week3_reward || 0) + (campaign.week4_reward || 0)
    const totalReward = weeklyTotal > 0 ? weeklyTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.7) / totalSlots)
  }

  if (campaignType === 'planned') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                     (campaign.step3_reward || 0)
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.6) / totalSlots)
  }

  if (campaignType === 'oliveyoung') {
    const stepTotal = (campaign.step1_reward || 0) + (campaign.step2_reward || 0) +
                     (campaign.step3_reward || 0)
    const totalReward = stepTotal > 0 ? stepTotal : (campaign.reward_points || 0)
    return Math.round((totalReward * 0.7) / totalSlots)
  }

  return Math.round(((campaign.reward_points || 0) * 0.6) / totalSlots)
}

// 상태 뱃지 설정
const statusConfig = {
  draft: { label: '작성중', color: 'bg-gray-100 text-gray-600', icon: Clock },
  pending: { label: '대기중', color: 'bg-amber-50 text-amber-700', icon: Clock },
  pending_payment: { label: '입금확인중', color: 'bg-orange-50 text-orange-700', icon: DollarSign },
  approved: { label: '승인', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  active: { label: '진행중', color: 'bg-blue-50 text-blue-700', icon: TrendingUp },
  paused: { label: '중단', color: 'bg-yellow-50 text-yellow-700', icon: Pause },
  completed: { label: '완료', color: 'bg-slate-100 text-slate-600', icon: CheckCircle },
  rejected: { label: '거부', color: 'bg-red-50 text-red-600', icon: XCircle },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-500', icon: XCircle }
}

// 캠페인 타입 뱃지 설정
const campaignTypeConfig = {
  planned: { label: '기획형', color: 'bg-violet-100 text-violet-700' },
  oliveyoung: { label: '올영세일', color: 'bg-pink-100 text-pink-700' },
  '4week_challenge': { label: '4주 챌린지', color: 'bg-orange-100 text-orange-700' }
}

// 지역 뱃지 설정
const regionConfig = {
  korea: { label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700' },
  japan: { label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-600' },
  us: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700' },
  usa: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700' },
  taiwan: { label: '대만', flag: '🇹🇼', color: 'bg-green-50 text-green-700' },
  biz: { label: '비즈', flag: '💼', color: 'bg-gray-50 text-gray-600' }
}

export default function CampaignsManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [editingPoints, setEditingPoints] = useState(null)
  const [savingPoints, setSavingPoints] = useState(false)
  const [selectedCampaigns, setSelectedCampaigns] = useState(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    checkAuth()
    fetchCampaigns()
  }, [])

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRegion, selectedStatus])

  const checkAuth = async () => {
    try {
      if (!supabaseBiz) {
        navigate('/login')
        return
      }

      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      if (userError || !user) {
        navigate('/login')
        return
      }

      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('role')
        .eq('email', user.email)
        .maybeSingle()

      setIsSuperAdmin(adminData?.role === 'super_admin')
    } catch (error) {
      console.error('Auth error:', error)
      setIsSuperAdmin(false)
    }
  }

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const allCampaigns = await getCampaignsWithStats()
      setCampaigns(allCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 캠페인 (useMemo로 최적화)
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const matchesSearch = searchTerm === '' ||
        campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.campaign_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.product_name?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRegion = selectedRegion === 'all' || campaign.region === selectedRegion

      let matchesStatus = true
      if (selectedStatus !== 'all') {
        switch (selectedStatus) {
          case 'draft':
            matchesStatus = campaign.status === 'draft'
            break
          case 'pending_payment':
            matchesStatus = campaign.status === 'pending_payment'
            break
          case 'pending':
            matchesStatus = campaign.status === 'pending' || campaign.status === 'pending_approval'
            break
          case 'active':
            matchesStatus = campaign.status === 'active' || campaign.status === 'approved'
            break
          case 'completed':
            matchesStatus = campaign.status === 'completed'
            break
          case 'cancelled':
            matchesStatus = campaign.status === 'cancelled'
            break
          default:
            matchesStatus = campaign.status === selectedStatus
        }
      }

      return matchesSearch && matchesRegion && matchesStatus
    })
  }, [campaigns, searchTerm, selectedRegion, selectedStatus])

  // 페이지네이션 계산
  const paginatedCampaigns = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCampaigns.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredCampaigns, currentPage])

  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE)

  // 통계 계산
  const stats = useMemo(() => ({
    total: campaigns.length,
    pending: campaigns.filter(c => c.status === 'pending' || c.status === 'pending_payment').length,
    active: campaigns.filter(c => c.status === 'active' || c.status === 'approved').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  }), [campaigns])

  // 핸들러들
  const handleApproveCampaign = async (campaign) => {
    if (!confirm(`캠페인을 승인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}`)) return

    setConfirming(true)
    try {
      const response = await fetch('/.netlify/functions/approve-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, region: campaign.region || 'korea' })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      alert('캠페인이 승인되었습니다!')
      fetchCampaigns()
    } catch (error) {
      alert('승인 실패: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleConfirmPayment = async (campaign) => {
    if (!confirm(`입금을 확인하시겠습니까?\n\n캠페인: ${campaign.campaign_name || campaign.title}\n금액: ${(campaign.estimated_cost || 0).toLocaleString()}원`)) return

    setConfirming(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      const response = await fetch('/.netlify/functions/confirm-campaign-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, adminUserId: user.id, depositAmount: campaign.estimated_cost })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      alert('입금이 확인되었습니다.')
      fetchCampaigns()
    } catch (error) {
      alert(error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleStatusChange = async (campaign, newStatus) => {
    const statusLabels = { draft: '임시', active: '활성', paused: '중단', completed: '완료' }
    if (!confirm(`상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) return

    setConfirming(true)
    try {
      const supabaseClient = getSupabaseClient(campaign.region || 'biz')
      const updateData = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'active' && campaign.region === 'korea') {
        updateData.approved_at = new Date().toISOString()
      }

      const { error } = await supabaseClient.from('campaigns').update(updateData).eq('id', campaign.id)
      if (error) throw error

      alert(`상태가 변경되었습니다!`)
      fetchCampaigns()
    } catch (error) {
      alert('상태 변경 실패: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleDelete = async (campaign) => {
    if (!confirm(`⚠️ 캠페인을 삭제하시겠습니까?\n\n${campaign.campaign_name || campaign.title}`)) return
    if (!confirm('⚠️ 최종 확인: 되돌릴 수 없습니다.')) return

    setConfirming(true)
    try {
      const supabaseClient = getSupabaseClient(campaign.region || 'biz')
      const { error } = await supabaseClient.from('campaigns').delete().eq('id', campaign.id)
      if (error) throw error
      alert('삭제되었습니다.')
      fetchCampaigns()
    } catch (error) {
      alert('삭제 실패: ' + error.message)
    } finally {
      setConfirming(false)
    }
  }

  const handleSaveCreatorPoints = async (campaignId) => {
    if (!editingPoints || editingPoints.campaignId !== campaignId) return

    setSavingPoints(true)
    try {
      const campaign = campaigns.find(c => c.id === campaignId)
      const supabaseClient = getSupabaseClient(campaign?.region || 'biz')

      const { error } = await supabaseClient
        .from('campaigns')
        .update({ creator_points_override: parseInt(editingPoints.value) || null, updated_at: new Date().toISOString() })
        .eq('id', campaignId)

      if (error) throw error
      setEditingPoints(null)
      fetchCampaigns()
    } catch (error) {
      alert('저장 실패: ' + error.message)
    } finally {
      setSavingPoints(false)
    }
  }

  // 일괄 작업 핸들러
  const handleSelectCampaign = useCallback((campaignId, region) => {
    const key = `${region}-${campaignId}`
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev)
      newSet.has(key) ? newSet.delete(key) : newSet.add(key)
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedCampaigns.size === paginatedCampaigns.length) {
      setSelectedCampaigns(new Set())
    } else {
      setSelectedCampaigns(new Set(paginatedCampaigns.map(c => `${c.region}-${c.id}`)))
    }
  }, [paginatedCampaigns, selectedCampaigns.size])

  const handleBulkActivate = async () => {
    const selectedList = paginatedCampaigns.filter(c => selectedCampaigns.has(`${c.region}-${c.id}`))
    if (!selectedList.length) return alert('선택된 캠페인이 없습니다.')
    if (!confirm(`${selectedList.length}개를 일괄 활성화하시겠습니까?`)) return

    setBulkActionLoading(true)
    let success = 0, skip = 0, fail = 0

    for (const campaign of selectedList) {
      if (campaign.status === 'active') { skip++; continue }
      try {
        const client = getSupabaseClient(campaign.region || 'biz')
        const updateData = { status: 'active', updated_at: new Date().toISOString() }
        if (campaign.region === 'korea') updateData.approved_at = new Date().toISOString()
        const { error } = await client.from('campaigns').update(updateData).eq('id', campaign.id)
        if (error) throw error
        success++
      } catch { fail++ }
    }

    setBulkActionLoading(false)
    setSelectedCampaigns(new Set())
    alert(`완료!\n성공: ${success}개${skip ? `\n건너뜀: ${skip}개` : ''}${fail ? `\n실패: ${fail}개` : ''}`)
    fetchCampaigns()
  }

  const handleBulkDelete = async () => {
    const selectedList = paginatedCampaigns.filter(c => selectedCampaigns.has(`${c.region}-${c.id}`))
    if (!selectedList.length) return alert('선택된 캠페인이 없습니다.')
    if (!confirm(`⚠️ ${selectedList.length}개를 삭제하시겠습니까?`)) return
    if (!confirm('⚠️ 최종 확인: 영구 삭제됩니다.')) return

    setBulkActionLoading(true)
    let success = 0, fail = 0

    for (const campaign of selectedList) {
      try {
        const { error } = await getSupabaseClient(campaign.region || 'biz').from('campaigns').delete().eq('id', campaign.id)
        if (error) throw error
        success++
      } catch { fail++ }
    }

    setBulkActionLoading(false)
    setSelectedCampaigns(new Set())
    alert(`완료!\n성공: ${success}개${fail ? `\n실패: ${fail}개` : ''}`)
    fetchCampaigns()
  }

  // 뱃지 컴포넌트들
  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const CampaignTypeBadge = ({ type }) => {
    const config = campaignTypeConfig[type]
    if (!config) return null
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const RegionBadge = ({ region }) => {
    const config = regionConfig[region] || regionConfig.biz
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.flag} {config.label}
      </span>
    )
  }

  // 지역 탭
  const regionTabs = [
    { value: 'all', label: '전체' },
    { value: 'korea', label: '한국 🇰🇷' },
    { value: 'japan', label: '일본 🇯🇵' },
    { value: 'us', label: '미국 🇺🇸' },
    { value: 'taiwan', label: '대만 🇹🇼' }
  ]

  // 상태 탭
  const statusTabs = [
    { value: 'all', label: '전체' },
    { value: 'draft', label: '작성중' },
    { value: 'pending_payment', label: '입금확인' },
    { value: 'pending', label: '승인요청' },
    { value: 'active', label: '진행중' },
    { value: 'completed', label: '완료' },
    { value: 'cancelled', label: '취소' }
  ]

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">캠페인 관리</h1>
            <p className="text-gray-500">전체 캠페인을 관리하고 모니터링합니다.</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">전체</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">대기중</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">진행중</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">완료</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 필터 영역 */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 lg:p-6 shadow-sm mb-6">
            {/* 지역 탭 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {regionTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedRegion(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedRegion === tab.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 상태 탭 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedStatus(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedStatus === tab.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인 제목, 브랜드명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </div>

          {/* 일괄 액션 바 */}
          {isSuperAdmin && selectedCampaigns.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-blue-700">{selectedCampaigns.size}개 선택</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCampaigns(new Set())} className="text-blue-600">
                  선택 해제
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleBulkActivate} disabled={bulkActionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                  <PlayCircle className="w-4 h-4 mr-1.5" />
                  {bulkActionLoading ? '처리중...' : '일괄 활성화'}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkActionLoading}>
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {bulkActionLoading ? '처리중...' : '일괄 삭제'}
                </Button>
              </div>
            </div>
          )}

          {/* 캠페인 목록 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">캠페인 목록</h2>
                <span className="text-sm text-gray-500">({filteredCampaigns.length}개)</span>
              </div>
              {isSuperAdmin && paginatedCampaigns.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  {selectedCampaigns.size === paginatedCampaigns.length ? '전체 해제' : '전체 선택'}
                </Button>
              )}
            </div>

            {/* 로딩 */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-gray-500">캠페인을 불러오는 중...</p>
              </div>
            ) : paginatedCampaigns.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                {searchTerm || selectedRegion !== 'all' || selectedStatus !== 'all'
                  ? '검색 결과가 없습니다'
                  : '등록된 캠페인이 없습니다'}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {paginatedCampaigns.map((campaign) => {
                  const isSelected = selectedCampaigns.has(`${campaign.region}-${campaign.id}`)
                  return (
                    <div
                      key={`${campaign.region}-${campaign.id}`}
                      className={`p-5 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 체크박스 */}
                        {isSuperAdmin && (
                          <div className="pt-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectCampaign(campaign.id, campaign.region)}
                              className="h-5 w-5"
                            />
                          </div>
                        )}

                        {/* 컨텐츠 */}
                        <div className="flex-1 min-w-0">
                          {/* 제목 & 뱃지 */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900 truncate max-w-md">
                              {campaign.campaign_name || campaign.title || campaign.product_name || '제목 없음'}
                            </h3>
                            <CampaignTypeBadge type={campaign.campaign_type} />
                            <RegionBadge region={campaign.region} />
                            <StatusBadge status={campaign.status} />
                          </div>

                          {/* 정보 그리드 */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-500 mb-0.5">예산</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {campaign.currency || '₩'}{(campaign.budget || 0).toLocaleString()}
                              </p>
                            </div>
                            {campaign.region === 'korea' && (
                              <div className="bg-violet-50 rounded-lg px-3 py-2">
                                <p className="text-xs text-violet-600 mb-0.5">크리에이터 P</p>
                                {editingPoints?.campaignId === campaign.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editingPoints.value}
                                      onChange={(e) => setEditingPoints({ campaignId: campaign.id, value: e.target.value })}
                                      className="w-16 px-1.5 py-0.5 text-xs border rounded"
                                      disabled={savingPoints}
                                    />
                                    <button onClick={() => handleSaveCreatorPoints(campaign.id)} disabled={savingPoints} className="text-emerald-600">
                                      <CheckCircle size={14} />
                                    </button>
                                    <button onClick={() => setEditingPoints(null)} className="text-red-500">
                                      <XCircle size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-sm font-semibold text-violet-700 flex items-center gap-1">
                                    ₩{calculateCreatorPoints(campaign).toLocaleString()}
                                    {isSuperAdmin && (
                                      <button onClick={() => setEditingPoints({ campaignId: campaign.id, value: calculateCreatorPoints(campaign) })} className="text-violet-400 hover:text-violet-600">
                                        <Edit size={12} />
                                      </button>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-500 mb-0.5">모집 인원</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {campaign.max_participants || campaign.total_slots || 0}명
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-500 mb-0.5">지원자</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {campaign.application_stats?.total || 0}명
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-500 mb-0.5">선정</p>
                              <p className="text-sm font-semibold text-emerald-600">
                                {campaign.application_stats?.selected || 0}명
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-500 mb-0.5">마감일</p>
                              <p className="text-sm font-medium text-gray-700">
                                {campaign.application_deadline
                                  ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                                  : '-'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼 */}
                        <div className="flex flex-col sm:flex-row items-end gap-2 shrink-0">
                          {campaign.payment_status === 'pending' && (
                            <Button size="sm" onClick={() => handleConfirmPayment(campaign)} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-700">
                              <DollarSign className="w-4 h-4 mr-1" />
                              입금확인
                            </Button>
                          )}
                          {campaign.status === 'pending' && (
                            <Button size="sm" onClick={() => handleApproveCampaign(campaign)} disabled={confirming} className="bg-blue-600 hover:bg-blue-700">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              승인
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign, 'active')} disabled={confirming || campaign.status === 'active'} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <PlayCircle className="w-4 h-4 mr-1" />
                                활성화
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(campaign)} disabled={confirming} className="border-red-200 text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-1" />
                                삭제
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit?region=${campaign.region}`)}>
                            <Edit className="w-4 h-4 mr-1" />
                            수정
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/campaigns/${campaign.id}?region=${campaign.region}`)}>
                            <Eye className="w-4 h-4 mr-1" />
                            상세
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCampaigns.length)} / {filteredCampaigns.length}개
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page
                      if (totalPages <= 5) {
                        page = i + 1
                      } else if (currentPage <= 3) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                      } else {
                        page = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
