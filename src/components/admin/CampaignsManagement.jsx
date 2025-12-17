import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  TrendingUp, Search, Eye, CheckCircle, XCircle, Clock,
  DollarSign, Edit, Trash2, PlayCircle, Pause, CheckSquare,
  ChevronLeft, ChevronRight, Loader2, Users, Calendar, Target, ImageIcon,
  ArrowRightLeft, Hash
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// 플랫폼 아이콘 컴포넌트
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

// 플랫폼 정보 헬퍼 함수
const getPlatforms = (campaign) => {
  const platforms = []

  // target_platforms 체크 (배열 또는 객체)
  if (campaign.target_platforms) {
    if (Array.isArray(campaign.target_platforms)) {
      if (campaign.target_platforms.includes('instagram')) platforms.push('instagram')
      if (campaign.target_platforms.includes('youtube')) platforms.push('youtube')
      if (campaign.target_platforms.includes('tiktok')) platforms.push('tiktok')
    } else if (typeof campaign.target_platforms === 'object') {
      if (campaign.target_platforms.instagram) platforms.push('instagram')
      if (campaign.target_platforms.youtube) platforms.push('youtube')
      if (campaign.target_platforms.tiktok) platforms.push('tiktok')
    }
  }

  // category에서도 체크
  if (campaign.category) {
    const cats = Array.isArray(campaign.category) ? campaign.category : [campaign.category]
    cats.forEach(cat => {
      if (cat === 'instagram' && !platforms.includes('instagram')) platforms.push('instagram')
      if (cat === 'youtube' && !platforms.includes('youtube')) platforms.push('youtube')
      if (cat === 'tiktok' && !platforms.includes('tiktok')) platforms.push('tiktok')
    })
  }

  return platforms
}
import { supabaseBiz, getCampaignsFast, getCampaignsWithStats, getSupabaseClient } from '../../lib/supabaseClients'
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

// D-day 계산 헬퍼 함수
const getDaysUntilDeadline = (deadline) => {
  if (!deadline) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  const diffTime = deadlineDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// 캠페인 긴급도/주의 필요 상태 계산
const getCampaignAlerts = (campaign) => {
  const alerts = []
  const daysLeft = getDaysUntilDeadline(campaign.application_deadline)
  const applicants = campaign.application_stats?.total || 0
  const selected = campaign.application_stats?.selected || 0
  const targetSlots = campaign.max_participants || campaign.total_slots || 0

  // 활성 캠페인만 체크
  if (campaign.status === 'active' || campaign.status === 'approved') {
    // 마감 임박 (D-7 이내)
    if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 7) {
      alerts.push({
        type: 'deadline',
        level: daysLeft <= 1 ? 'critical' : daysLeft <= 3 ? 'warning' : 'info',
        daysLeft
      })
    }

    // 지원자 부족 (5명 이하)
    if (applicants <= 5 && daysLeft !== null && daysLeft >= 0) {
      alerts.push({
        type: 'low_applicants',
        level: applicants === 0 ? 'critical' : 'warning',
        count: applicants
      })
    }

    // 선정 미완료 (지원자는 있는데 선정 안함)
    if (applicants > 0 && selected === 0 && daysLeft !== null && daysLeft <= 3) {
      alerts.push({
        type: 'no_selection',
        level: 'warning'
      })
    }
  }

  return alerts
}

// 스마트 정렬: 긴급도 우선
const getSmartSortScore = (campaign) => {
  const alerts = getCampaignAlerts(campaign)
  const daysLeft = getDaysUntilDeadline(campaign.application_deadline)
  let score = 0

  // 1. 활성/승인 상태 우선 (완료/취소는 뒤로)
  if (campaign.status === 'active' || campaign.status === 'approved') {
    score += 10000
  } else if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    score -= 5000
  }

  // 2. 긴급 알림 있으면 높은 점수
  alerts.forEach(alert => {
    if (alert.level === 'critical') score += 3000
    else if (alert.level === 'warning') score += 2000
    else score += 1000
  })

  // 3. 마감일 가까울수록 높은 점수 (D-7 이내)
  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 7) {
    score += (8 - daysLeft) * 100
  }

  // 4. 지원자 적을수록 높은 점수 (관심 필요)
  const applicants = campaign.application_stats?.total || 0
  if (applicants <= 5) {
    score += (6 - applicants) * 50
  }

  return score
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

  // 캠페인 이관 관련 상태
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferCampaign, setTransferCampaign] = useState(null)
  const [transferEmail, setTransferEmail] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [companies, setCompanies] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)

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

  const fetchCampaigns = async (withStats = false) => {
    setLoading(true)
    try {
      // 빠른 초기 로딩: 통계 없이 캠페인만 먼저 표시
      const allCampaigns = await getCampaignsFast()
      setCampaigns(allCampaigns)
      setLoading(false)

      // 백그라운드에서 통계 로드
      if (!withStats) {
        getCampaignsWithStats().then(campaignsWithStats => {
          setCampaigns(campaignsWithStats)
        }).catch(err => console.error('Stats loading error:', err))
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setLoading(false)
    }
  }

  // 필터링된 캠페인 (useMemo로 최적화 + 스마트 정렬)
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns.filter(campaign => {
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

    // 스마트 정렬: 긴급도 높은 순으로 정렬
    return filtered.sort((a, b) => getSmartSortScore(b) - getSmartSortScore(a))
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

      // 활성화 시 approval_status, progress_status도 함께 업데이트
      if (newStatus === 'active') {
        updateData.approval_status = 'approved'
        updateData.progress_status = 'recruiting'
        updateData.approved_at = new Date().toISOString()
      }

      const { error } = await supabaseClient.from('campaigns').update(updateData).eq('id', campaign.id)
      if (error) throw error

      // 활성화 시 기업에게 알림톡 전송
      if (newStatus === 'active') {
        try {
          await fetch('/.netlify/functions/send-campaign-activation-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: campaign.id,
              region: campaign.region || 'biz'
            })
          })
          console.log('캠페인 활성화 알림톡 전송 완료')
        } catch (notifyError) {
          console.error('알림톡 전송 실패:', notifyError)
          // 알림톡 실패해도 상태 변경은 성공으로 처리
        }
      }

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
    const activatedCampaigns = []

    for (const campaign of selectedList) {
      if (campaign.status === 'active') { skip++; continue }
      try {
        const client = getSupabaseClient(campaign.region || 'biz')
        const updateData = {
          status: 'active',
          approval_status: 'approved',
          progress_status: 'recruiting',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        const { error } = await client.from('campaigns').update(updateData).eq('id', campaign.id)
        if (error) throw error
        success++
        activatedCampaigns.push(campaign)
      } catch { fail++ }
    }

    // 활성화된 캠페인들에 대해 알림톡 전송
    for (const campaign of activatedCampaigns) {
      try {
        await fetch('/.netlify/functions/send-campaign-activation-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campaign.id,
            region: campaign.region || 'biz'
          })
        })
        console.log(`캠페인 활성화 알림톡 전송: ${campaign.id}`)
      } catch (notifyError) {
        console.error('알림톡 전송 실패:', notifyError)
      }
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

  // 캠페인 이관 모달 열기
  const openTransferModal = async (campaign) => {
    setTransferCampaign(campaign)
    setTransferEmail(campaign.company_email || '')
    setShowTransferModal(true)

    // 기업 목록 로드
    setCompaniesLoading(true)
    try {
      const supabaseClient = getSupabaseClient(campaign.region || 'korea')
      const { data, error } = await supabaseClient
        .from('companies')
        .select('id, company_name, user_id, email')
        .order('company_name', { ascending: true })

      if (!error && data) {
        setCompanies(data)
      }
    } catch (e) {
      console.error('기업 목록 로드 실패:', e)
    } finally {
      setCompaniesLoading(false)
    }
  }

  // 캠페인 이관 실행
  const handleTransferCampaign = async () => {
    if (!transferCampaign || !transferEmail) {
      alert('이관할 이메일을 입력해주세요.')
      return
    }

    if (!confirm(`캠페인을 "${transferEmail}"로 이관하시겠습니까?\n\n캠페인: ${transferCampaign.campaign_name || transferCampaign.title}`)) {
      return
    }

    setTransferring(true)
    try {
      const supabaseClient = getSupabaseClient(transferCampaign.region || 'korea')

      // 해당 이메일의 기업 정보 찾기
      const selectedCompany = companies.find(c => c.email === transferEmail)

      const updateData = {
        company_email: transferEmail,
        updated_at: new Date().toISOString()
      }

      // company_id도 함께 업데이트
      if (selectedCompany) {
        updateData.company_id = selectedCompany.id
      }

      const { error } = await supabaseClient
        .from('campaigns')
        .update(updateData)
        .eq('id', transferCampaign.id)

      if (error) throw error

      alert('캠페인이 성공적으로 이관되었습니다!')
      setShowTransferModal(false)
      setTransferCampaign(null)
      setTransferEmail('')
      fetchCampaigns()
    } catch (error) {
      alert('이관 실패: ' + error.message)
    } finally {
      setTransferring(false)
    }
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

  // D-day 뱃지 컴포넌트
  const DdayBadge = ({ daysLeft }) => {
    if (daysLeft === null || daysLeft < 0) return null

    let text, colorClass
    if (daysLeft === 0) {
      text = 'D-Day'
      colorClass = 'bg-red-500 text-white animate-pulse'
    } else if (daysLeft <= 1) {
      text = `D-${daysLeft}`
      colorClass = 'bg-red-500 text-white'
    } else if (daysLeft <= 3) {
      text = `D-${daysLeft}`
      colorClass = 'bg-orange-500 text-white'
    } else if (daysLeft <= 7) {
      text = `D-${daysLeft}`
      colorClass = 'bg-amber-500 text-white'
    } else {
      return null
    }

    return (
      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${colorClass}`}>
        {text}
      </span>
    )
  }

  // 경고 인디케이터 컴포넌트
  const AlertIndicators = ({ campaign }) => {
    const alerts = getCampaignAlerts(campaign)
    if (alerts.length === 0) return null

    return (
      <div className="flex items-center gap-1.5">
        {alerts.map((alert, idx) => {
          if (alert.type === 'low_applicants') {
            return (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  alert.level === 'critical'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}
                title={`지원자 ${alert.count}명으로 부족`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                지원부족
              </span>
            )
          }
          if (alert.type === 'no_selection') {
            return (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200"
                title="선정이 필요합니다"
              >
                <CheckSquare className="w-3 h-3 inline mr-1" />
                선정필요
              </span>
            )
          }
          return null
        })}
      </div>
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
              <div className="divide-y divide-gray-100">
                {paginatedCampaigns.map((campaign) => {
                  const isSelected = selectedCampaigns.has(`${campaign.region}-${campaign.id}`)
                  const platforms = getPlatforms(campaign)
                  const daysLeft = getDaysUntilDeadline(campaign.application_deadline)
                  const alerts = getCampaignAlerts(campaign)
                  const hasUrgentAlert = alerts.some(a => a.level === 'critical' || a.level === 'warning')
                  return (
                    <div
                      key={`${campaign.region}-${campaign.id}`}
                      className={`p-6 transition-all ${isSelected ? 'bg-blue-50/50' : hasUrgentAlert ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-gray-50/50'}`}
                    >
                      <div className="flex gap-5">
                        {/* 체크박스 */}
                        {isSuperAdmin && (
                          <div className="pt-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectCampaign(campaign.id, campaign.region)}
                              className="h-5 w-5 border-gray-300"
                            />
                          </div>
                        )}

                        {/* 썸네일 이미지 */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {campaign.image_url ? (
                            <img
                              src={campaign.image_url}
                              alt={campaign.campaign_name || campaign.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${campaign.image_url ? 'hidden' : 'flex'}`}>
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>

                        {/* 메인 컨텐츠 */}
                        <div className="flex-1 min-w-0">
                          {/* 제목 행 */}
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                {/* 캠페인 번호 */}
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-mono">
                                  <Hash className="w-3 h-3" />
                                  {campaign.campaign_number || campaign.id?.toString().slice(-6) || '-'}
                                </span>
                                <h3 className="text-[15px] font-semibold text-gray-900 truncate">
                                  {campaign.campaign_name || campaign.title || campaign.product_name || '제목 없음'}
                                </h3>
                                {/* 플랫폼 아이콘 */}
                                {platforms.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    {platforms.includes('instagram') && (
                                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center" title="릴스">
                                        <InstagramIcon className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    )}
                                    {platforms.includes('youtube') && (
                                      <div className="w-6 h-6 rounded-md bg-red-500 flex items-center justify-center" title="쇼츠">
                                        <YouTubeIcon className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    )}
                                    {platforms.includes('tiktok') && (
                                      <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center" title="틱톡">
                                        <TikTokIcon className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* 뱃지 */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <CampaignTypeBadge type={campaign.campaign_type} />
                                <RegionBadge region={campaign.region} />
                                <StatusBadge status={campaign.status} />
                                {/* D-day 표시 */}
                                <DdayBadge daysLeft={daysLeft} />
                                {/* 경고 인디케이터 */}
                                <AlertIndicators campaign={campaign} />
                              </div>
                            </div>
                            {/* 액션 버튼 */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {campaign.payment_status === 'pending' && (
                                <Button size="sm" onClick={() => handleConfirmPayment(campaign)} disabled={confirming} className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-xs font-medium">
                                  <DollarSign className="w-3.5 h-3.5 mr-1" />
                                  입금확인
                                </Button>
                              )}
                              {campaign.status === 'pending' && (
                                <Button size="sm" onClick={() => handleApproveCampaign(campaign)} disabled={confirming} className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-xs font-medium">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  승인
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign, 'active')} disabled={confirming || campaign.status === 'active'} className="h-8 px-3 text-xs font-medium border-gray-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200">
                                    <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                    활성화
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDelete(campaign)} disabled={confirming} className="h-8 px-3 text-xs font-medium border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200">
                                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                                    삭제
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit?region=${campaign.region}`)} className="h-8 px-3 text-xs font-medium border-gray-200">
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                수정
                              </Button>
                              {isSuperAdmin && (
                                <Button size="sm" variant="outline" onClick={() => openTransferModal(campaign)} className="h-8 px-3 text-xs font-medium border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200">
                                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                                  이관
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/campaigns/${campaign.id}?region=${campaign.region}`)} className="h-8 px-3 text-xs font-medium text-gray-500">
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                상세
                              </Button>
                            </div>
                          </div>

                          {/* 정보 그리드 - 개선된 디자인 */}
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">예산</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {campaign.currency || '₩'}{(campaign.budget || 0).toLocaleString()}
                              </span>
                            </div>
                            {campaign.region === 'korea' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-violet-500">크리에이터 P</span>
                                {editingPoints?.campaignId === campaign.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editingPoints.value}
                                      onChange={(e) => setEditingPoints({ campaignId: campaign.id, value: e.target.value })}
                                      className="w-20 px-2 py-0.5 text-sm border border-violet-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-400"
                                      disabled={savingPoints}
                                    />
                                    <button onClick={() => handleSaveCreatorPoints(campaign.id)} disabled={savingPoints} className="text-emerald-500 hover:text-emerald-600">
                                      <CheckCircle size={16} />
                                    </button>
                                    <button onClick={() => setEditingPoints(null)} className="text-gray-400 hover:text-gray-500">
                                      <XCircle size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-violet-600 flex items-center gap-1">
                                    ₩{calculateCreatorPoints(campaign).toLocaleString()}
                                    {isSuperAdmin && (
                                      <button onClick={() => setEditingPoints({ campaignId: campaign.id, value: calculateCreatorPoints(campaign) })} className="text-violet-300 hover:text-violet-500">
                                        <Edit size={12} />
                                      </button>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">모집 인원</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {campaign.max_participants || campaign.total_slots || 0}명
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">지원자</span>
                              <span className="text-sm font-semibold text-blue-600">
                                {campaign.application_stats?.total || 0}명
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">선정</span>
                              <span className="text-sm font-semibold text-emerald-600">
                                {campaign.application_stats?.selected || 0}명
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">마감일</span>
                              <span className="text-sm font-medium text-gray-700">
                                {campaign.application_deadline
                                  ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + '일'
                                  : '-'}
                              </span>
                            </div>
                          </div>
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

      {/* 캠페인 이관 모달 */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-500" />
              캠페인 계정 이관
            </DialogTitle>
          </DialogHeader>

          {transferCampaign && (
            <div className="space-y-4">
              {/* 캠페인 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">이관할 캠페인</p>
                <p className="font-semibold text-gray-900">
                  {transferCampaign.campaign_name || transferCampaign.title}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  현재 소유자: <span className="text-gray-700">{transferCampaign.company_email || '없음'}</span>
                </p>
              </div>

              {/* 이관 대상 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이관할 계정 이메일
                </label>
                <Input
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className="mb-2"
                />

                {/* 기업 목록에서 선택 */}
                {companiesLoading ? (
                  <div className="text-center py-4 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    기업 목록 로드 중...
                  </div>
                ) : companies.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">또는 기업 목록에서 선택:</p>
                    <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                      {companies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => setTransferEmail(company.email)}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                            transferEmail === company.email ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <p className="font-medium text-sm text-gray-900">{company.company_name}</p>
                          <p className="text-xs text-gray-500">{company.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ 이관 후 원래 계정에서는 해당 캠페인을 볼 수 없습니다.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferModal(false)
                setTransferCampaign(null)
                setTransferEmail('')
              }}
              disabled={transferring}
            >
              취소
            </Button>
            <Button
              onClick={handleTransferCampaign}
              disabled={transferring || !transferEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  이관 중...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  이관하기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
