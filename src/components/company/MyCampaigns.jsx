import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  TrendingUp,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  Search,
  FolderOpen,
  Filter,
  ChevronRight,
  X,
  Image as ImageIcon,
  Calendar,
  Megaphone,
  CreditCard
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import RegionSelectModal from './RegionSelectModal'
import CompanyNavigation from './CompanyNavigation'

// Skeleton component for loading state
const CampaignSkeleton = () => (
  <div className="border border-gray-100 rounded-xl lg:rounded-2xl p-3 lg:p-5 bg-white animate-pulse">
    <div className="flex gap-3 lg:gap-4">
      <div className="w-20 h-20 md:w-32 md:h-32 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-2">
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
        <div className="flex gap-3">
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
)

export default function MyCampaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [participants, setParticipants] = useState({})
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegionModal, setShowRegionModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCampaignType, setSelectedCampaignType] = useState('all')  // 캠페인 타입 필터
  const [searchQuery, setSearchQuery] = useState('')
  const [statsFilter, setStatsFilter] = useState(null)

  useEffect(() => {
    checkAuth()
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

    // Fetch company info and campaigns in parallel for speed
    fetchCompanyAndCampaigns(user)
  }

  const fetchCompanyAndCampaigns = async (user) => {
    setLoading(true)

    try {
      // Parallel fetch: company info from both DBs (with null check)
      const koreaClient = supabaseKorea || supabaseBiz
      const [koreaCompanyResult, bizCompanyResult] = await Promise.allSettled([
        koreaClient.from('companies').select('*').eq('user_id', user.id).maybeSingle(),
        supabaseBiz.from('companies').select('*').eq('user_id', user.id).maybeSingle()
      ])

      const companyData = koreaCompanyResult.status === 'fulfilled' && koreaCompanyResult.value?.data
        ? koreaCompanyResult.value.data
        : bizCompanyResult.status === 'fulfilled' ? bizCompanyResult.value?.data : null

      if (companyData) {
        // 차단된 기업 체크
        if (companyData.is_blocked) {
          alert('차단된 계정입니다. 서비스를 이용할 수 없습니다.\n문의: cnec@cnecbiz.com')
          navigate('/login')
          return
        }
        setCompany(companyData)
      }

      // Fetch campaigns from all regions in parallel
      await fetchCampaignsParallel(user.email, companyData?.id, user.id)
    } catch (error) {
      console.error('Error in fetchCompanyAndCampaigns:', error)
      setLoading(false)
    }
  }

  const fetchCampaignsParallel = async (userEmail, companyId, userId) => {
    try {
      const koreaClient = supabaseKorea || supabaseBiz
      const supabaseJapan = getSupabaseClient('japan')
      const supabaseUS = getSupabaseClient('us')

      // Fetch all regions in parallel - by email, company_id, AND user_id for proper transfer support
      const [koreaByEmail, koreaByCompanyId, koreaByUserId, japanByEmail, japanByCompanyId, japanByUserId, usResult] = await Promise.allSettled([
        koreaClient.from('campaigns').select('*').eq('company_email', userEmail).order('created_at', { ascending: false }),
        companyId ? koreaClient.from('campaigns').select('*').eq('company_id', companyId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        userId ? koreaClient.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabaseJapan ? supabaseJapan.from('campaigns').select('*').eq('company_email', userEmail).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        companyId && supabaseJapan ? supabaseJapan.from('campaigns').select('*').eq('company_id', companyId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        userId && supabaseJapan ? supabaseJapan.from('campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        userId && supabaseUS ? supabaseUS.from('campaigns').select('*').eq('company_id', userId).order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
      ])

      // Merge Korea campaigns (by email, company_id, AND user_id - deduplicate)
      const koreaByEmailData = (koreaByEmail.status === 'fulfilled' && koreaByEmail.value?.data || [])
      const koreaByCompanyIdData = (koreaByCompanyId.status === 'fulfilled' && koreaByCompanyId.value?.data || [])
      const koreaByUserIdData = (koreaByUserId.status === 'fulfilled' && koreaByUserId.value?.data || [])
      const koreaIds = new Set()
      const koreaCampaigns = []
      ;[...koreaByEmailData, ...koreaByCompanyIdData, ...koreaByUserIdData].forEach(c => {
        if (!koreaIds.has(c.id)) {
          koreaIds.add(c.id)
          koreaCampaigns.push({ ...c, region: 'korea' })
        }
      })

      // Merge Japan campaigns (by email, company_id, AND user_id - deduplicate)
      const japanByEmailData = (japanByEmail.status === 'fulfilled' && japanByEmail.value?.data || [])
      const japanByCompanyIdData = (japanByCompanyId.status === 'fulfilled' && japanByCompanyId.value?.data || [])
      const japanByUserIdData = (japanByUserId.status === 'fulfilled' && japanByUserId.value?.data || [])
      const japanIds = new Set()
      const japanCampaigns = []
      ;[...japanByEmailData, ...japanByCompanyIdData, ...japanByUserIdData].forEach(c => {
        if (!japanIds.has(c.id)) {
          japanIds.add(c.id)
          japanCampaigns.push({ ...c, region: 'japan' })
        }
      })

      const usCampaigns = (usResult.status === 'fulfilled' && usResult.value?.data || []).map(c => ({ ...c, region: 'us' }))

      const allCampaigns = [...koreaCampaigns, ...japanCampaigns, ...usCampaigns]

      // Sort: cancelled at bottom, then by created_at desc
      const sortedCampaigns = allCampaigns.sort((a, b) => {
        if (a.is_cancelled && !b.is_cancelled) return 1
        if (!a.is_cancelled && b.is_cancelled) return -1
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setCampaigns(sortedCampaigns)
      setLoading(false)

      // Fetch participants in parallel (background, don't block UI)
      fetchParticipantsParallel(allCampaigns)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setLoading(false)
    }
  }

  const fetchParticipantsParallel = async (campaignsList) => {
    if (campaignsList.length === 0) return

    // Group campaigns by region
    const campaignsByRegion = {
      korea: campaignsList.filter(c => c.region === 'korea').map(c => c.id),
      japan: campaignsList.filter(c => c.region === 'japan').map(c => c.id),
      us: campaignsList.filter(c => c.region === 'us').map(c => c.id),
      biz: campaignsList.filter(c => c.region === 'biz').map(c => c.id)
    }

    // 빈 지역 제거
    Object.keys(campaignsByRegion).forEach(region => {
      if (campaignsByRegion[region].length === 0) {
        delete campaignsByRegion[region]
      }
    })

    console.log('[DEBUG] Fetching participants for campaigns:', {
      totalCampaigns: campaignsList.length,
      campaignsByRegion,
      campaignIds: campaignsList.map(c => ({ id: c.id, region: c.region, title: c.title?.slice(0, 20) }))
    })

    try {
      // Netlify 함수를 통해 서비스 롤 키로 애플리케이션 통계 조회 (RLS 우회)
      const response = await fetch('/.netlify/functions/get-application-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignsByRegion })
      })

      console.log('[DEBUG] API Response status:', response.status)
      const result = await response.json()
      console.log('[DEBUG] API Response:', result)

      if (result.success && result.stats) {
        setParticipants(result.stats)
        console.log('[DEBUG] Application stats loaded:', Object.keys(result.stats).length, 'campaigns with stats')
      } else {
        console.error('[DEBUG] API failed, trying direct DB query. Error:', result.error)
        // Fallback: 직접 DB 쿼리
        await fetchParticipantsDirect(campaignsList)
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching application stats:', error)
      // Fallback: 직접 DB 쿼리
      await fetchParticipantsDirect(campaignsList)
    }
  }

  // Fallback: 직접 DB에서 applications 조회
  const fetchParticipantsDirect = async (campaignsList) => {
    console.log('[DEBUG] Attempting direct DB query fallback')
    const koreaClient = supabaseKorea || supabaseBiz
    const supabaseJapan = getSupabaseClient('japan')
    const supabaseUS = getSupabaseClient('us')

    const allCampaignIds = campaignsList.map(c => c.id)

    // 모든 DB에서 병렬로 applications 조회
    const queries = []

    if (koreaClient) {
      queries.push(
        koreaClient
          .from('applications')
          .select('campaign_id, status')
          .in('campaign_id', allCampaignIds)
          .then(({ data, error }) => {
            console.log('[DEBUG] Korea direct query:', { count: data?.length, error: error?.message })
            return data || []
          })
          .catch(err => {
            console.error('[DEBUG] Korea query error:', err)
            return []
          })
      )
    }

    if (supabaseJapan) {
      queries.push(
        supabaseJapan
          .from('applications')
          .select('campaign_id, status')
          .in('campaign_id', allCampaignIds)
          .then(({ data, error }) => {
            console.log('[DEBUG] Japan direct query:', { count: data?.length, error: error?.message })
            return data || []
          })
          .catch(err => {
            console.error('[DEBUG] Japan query error:', err)
            return []
          })
      )
    }

    if (supabaseUS) {
      queries.push(
        supabaseUS
          .from('applications')
          .select('campaign_id, status')
          .in('campaign_id', allCampaignIds)
          .then(({ data, error }) => {
            console.log('[DEBUG] US direct query:', { count: data?.length, error: error?.message })
            return data || []
          })
          .catch(err => {
            console.error('[DEBUG] US query error:', err)
            return []
          })
      )
    }

    const results = await Promise.all(queries)
    const allApplications = results.flat()

    console.log('[DEBUG] Direct query total applications:', allApplications.length)

    // 통계 집계
    const selectedStatuses = ['selected', 'virtual_selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'completed']
    const stats = {}

    allApplications.forEach(app => {
      if (!stats[app.campaign_id]) {
        stats[app.campaign_id] = { total: 0, selected: 0, completed: 0 }
      }
      stats[app.campaign_id].total++
      if (selectedStatuses.includes(app.status)) stats[app.campaign_id].selected++
      if (app.status === 'completed') stats[app.campaign_id].completed++
    })

    console.log('[DEBUG] Direct query stats:', stats)
    setParticipants(stats)
  }

  const handleDepositConfirmationRequest = async (campaign) => {
    if (!confirm('입금 확인 요청을 보내시겠습니까?')) return

    try {
      const regionText = { korea: '한국', japan: '일본', usa: '미국', us: '미국' }[campaign.region] || '한국'
      const campaignTypeText = { planned: '기획형', regular: '기획형', oliveyoung: '올리브영', '4week_challenge': '4주 챌린지', '4week': '4주 챌린지' }[campaign.campaign_type] || '기획형'

      const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type, campaign.region) + (campaign.bonus_amount || 0)
      const totalSlots = campaign.max_participants || campaign.total_slots || 0
      const total = (campaign.package_type && totalSlots) ? Math.round(packagePrice * totalSlots * 1.1) : (campaign.estimated_cost ? Math.round(campaign.estimated_cost) : 0)

      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data: companyData } = await supabaseBiz.from('companies').select('company_name').eq('user_id', user.id).single()
      const companyName = companyData?.company_name || '회사명 없음'

      const message = `[새로운 입금 확인 요청]\n\n• 지역: ${regionText}\n• 캠페인 타입: ${campaignTypeText}\n• 회사명: ${companyName}\n• 캠페인명: ${campaign.title}\n• 금액: ${total.toLocaleString()}원\n• 결제 방법: 계좌입금\n\n입금 확인 페이지: https://cnecbiz.com/admin/payment-requests`

      await fetch('/.netlify/functions/send-naver-works-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isAdminNotification: true, channelId: '75c24874-e370-afd5-9da3-72918ba15a3c' })
      }).catch(console.error)

      alert('입금 확인 요청이 전송되었습니다!')
    } catch (error) {
      console.error('Error requesting deposit confirmation:', error)
      alert('오류가 발생했습니다: ' + error.message)
    }
  }

  const getPackagePrice = (packageType, campaignType, region) => {
    // 일본 캠페인 가격 (캠페인 타입 + 크리에이터 등급 addon)
    if (region === 'japan') {
      const japanCampaignTypePrices = { regular: 200000, megawari: 400000, '4week_challenge': 600000 }
      const japanPackageAddon = { basic: 0, junior: 100000, intermediate: 200000, senior: 300000, premium: 400000 }
      const basePrice = japanCampaignTypePrices[campaignType] || 200000
      const addon = japanPackageAddon[packageType?.toLowerCase()] || 0
      return basePrice + addon
    }

    // 미국 캠페인 가격 (캠페인 타입 + 크리에이터 등급 addon)
    if (region === 'us' || region === 'usa') {
      const usCampaignTypePrices = { regular: 300000, '4week_challenge': 600000 }
      const usPackageAddon = { junior: 0, intermediate: 100000, senior: 200000, premium: 300000 }
      const basePrice = usCampaignTypePrices[campaignType] || 300000
      const addon = usPackageAddon[packageType?.toLowerCase()] || 0
      return basePrice + addon
    }

    const prices = {
      oliveyoung: { standard: 400000, premium: 500000, professional: 600000 },
      fourWeek: { standard: 600000, premium: 700000, professional: 800000, enterprise: 1000000 },
      general: { junior: 200000, intermediate: 300000, senior: 400000, basic: 200000, standard: 300000, premium: 400000, professional: 600000, enterprise: 1000000 },
      legacy: { oliveyoung: 200000, '올영 20만원': 200000, '프리미엄 30만원': 300000, '4week_challenge': 600000, '4주챌린지 60만원': 600000 }
    }
    const key = packageType?.toLowerCase()
    return prices.legacy[key] ||
           (campaignType === 'oliveyoung' && prices.oliveyoung[key]) ||
           (campaignType === '4week_challenge' && prices.fourWeek[key]) ||
           prices.general[key] || 200000
  }

  const getCampaignTypeInfo = useCallback((campaignType) => {
    const types = {
      // 한국 캠페인 타입
      '4week_challenge': { label: '4주 챌린지', labelJa: '4週チャレンジ', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400', icon: '🗓️' },
      '4week': { label: '4주 챌린지', labelJa: '4週チャレンジ', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400', icon: '🗓️' },
      oliveyoung: { label: '올영세일', labelJa: 'オリーブヤング', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400', icon: '🛍️' },
      oliveyoung_sale: { label: '올영세일', labelJa: 'オリーブヤング', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400', icon: '🛍️' },
      planned: { label: '기획형', labelJa: '企画型', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400', icon: '📹' },
      regular: { label: '기획형', labelJa: '企画型', color: 'bg-indigo-100 text-indigo-700', dotColor: 'bg-indigo-400', icon: '📹' },
      // 일본 캠페인 타입
      megawari: { label: '메가와리', labelJa: 'メガ割', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400', icon: '🎯' }
    }
    return types[campaignType] || { label: '기획형', labelJa: '企画型', color: 'bg-gray-100 text-gray-700', dotColor: 'bg-gray-400', icon: '📹' }
  }, [])

  const getDaysRemaining = useCallback((deadline) => {
    if (!deadline) return null
    const diffDays = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24))
    return diffDays
  }, [])

  const getProgressStatusInfo = useCallback((status, isCancelled) => {
    if (isCancelled) return { label: '취소됨', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' }
    const statuses = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
      pending_payment: { label: '입금 대기', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-400' },
      pending_approval: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      pending: { label: '승인대기', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-400' },
      recruiting: { label: '크리에이터 모집중', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-400' },
      guide_confirmation: { label: '가이드 확인중', color: 'bg-purple-100 text-purple-700', dotColor: 'bg-purple-400' },
      filming: { label: '콘텐츠 제작중', color: 'bg-yellow-100 text-yellow-700', dotColor: 'bg-yellow-400' },
      editing: { label: '수정중', color: 'bg-pink-100 text-pink-700', dotColor: 'bg-pink-400' },
      approved: { label: '진행중', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-400' },
      completed: { label: '캠페인 완료', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' }
    }
    return statuses[status] || statuses.draft
  }, [])

  const getRegionInfo = useCallback((region) => {
    const regions = {
      korea: { label: '한국', flag: '🇰🇷', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      japan: { label: '일본', flag: '🇯🇵', color: 'bg-red-50 text-red-700 border-red-200' },
      us: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      usa: { label: '미국', flag: '🇺🇸', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      taiwan: { label: '대만', flag: '🇹🇼', color: 'bg-green-50 text-green-700 border-green-200' }
    }
    return regions[region] || regions.korea
  }, [])

  // Memoized filters
  const regionFilters = useMemo(() => [
    { value: 'all', label: '전체' },
    { value: 'korea', label: '🇰🇷 한국' },
    { value: 'us', label: '🇺🇸 미국' },
    { value: 'japan', label: '🇯🇵 일본' }
  ], [])

  const statusFilters = useMemo(() => [
    { value: 'all', label: '전체' },
    { value: 'draft', label: '작성중' },
    { value: 'pending_payment', label: '입금확인중' },
    { value: 'pending', label: '승인요청중' },
    { value: 'recruiting', label: '모집중' },
    { value: 'in_progress', label: '진행중' },
    { value: 'completed', label: '완료' }
  ], [])

  // 캠페인 타입 필터
  const campaignTypeFilters = useMemo(() => [
    { value: 'all', label: '전체 타입', icon: '📋' },
    { value: 'regular', label: '기획형', labelJa: '企画型', icon: '📹' },
    { value: 'megawari', label: '메가와리', labelJa: 'メガ割', icon: '🎯' },
    { value: '4week_challenge', label: '4주 챌린지', labelJa: '4週チャレンジ', icon: '🗓️' },
    { value: 'oliveyoung', label: '올영세일', labelJa: 'オリーブヤング', icon: '🛍️' }
  ], [])

  // Memoized filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      if (searchQuery && !campaign.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (selectedRegion !== 'all' && campaign.region !== selectedRegion) return false

      // 캠페인 타입 필터링
      if (selectedCampaignType !== 'all') {
        const campaignType = campaign.campaign_type || 'regular'
        // regular와 planned는 같은 타입으로 취급
        if (selectedCampaignType === 'regular') {
          if (campaignType !== 'regular' && campaignType !== 'planned') return false
        } else if (selectedCampaignType === '4week_challenge') {
          if (campaignType !== '4week_challenge' && campaignType !== '4week') return false
        } else if (selectedCampaignType === 'oliveyoung') {
          if (campaignType !== 'oliveyoung' && campaignType !== 'oliveyoung_sale') return false
        } else {
          if (campaignType !== selectedCampaignType) return false
        }
      }

      if (statsFilter && statsFilter !== 'all') {
        if (statsFilter === 'pending') return ['draft', 'pending', 'pending_payment'].includes(campaign.approval_status)
        if (statsFilter === 'active') return campaign.approval_status === 'approved' && campaign.status !== 'completed'
        if (statsFilter === 'completed') return campaign.status === 'completed'
      }

      if (selectedStatus !== 'all' && !statsFilter) {
        switch (selectedStatus) {
          case 'draft': return campaign.status === 'draft' || campaign.approval_status === 'draft'
          case 'pending_payment': return campaign.approval_status === 'pending_payment'
          case 'pending': return ['pending', 'pending_approval'].includes(campaign.approval_status)
          case 'recruiting': return campaign.approval_status === 'approved' && campaign.status !== 'completed'
          case 'in_progress': return campaign.status === 'in_progress' || campaign.progress_status === 'filming'
          case 'completed': return campaign.status === 'completed'
          default: return true
        }
      }
      return true
    })
  }, [campaigns, searchQuery, selectedRegion, statsFilter, selectedStatus, selectedCampaignType])

  // Memoized stats
  const stats = useMemo(() => {
    const active = campaigns.filter(c => !c.is_cancelled)
    return {
      total: active.length,
      pending: active.filter(c => ['draft', 'pending', 'pending_payment'].includes(c.approval_status)).length,
      active: active.filter(c => c.approval_status === 'approved' && c.status !== 'completed').length,
      completed: active.filter(c => c.status === 'completed').length
    }
  }, [campaigns])

  // Get campaign thumbnail
  const getThumbnail = (campaign) => {
    return campaign.main_image || campaign.thumbnail || campaign.thumbnail_url || campaign.image_url || campaign.product_image || campaign.images?.[0] || null
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 lg:ml-64 pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="p-3 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 lg:gap-4 mb-5 lg:mb-8">
            <div>
              <h1 className="text-lg lg:text-2xl xl:text-3xl font-bold text-gray-900 flex items-center gap-2 lg:gap-3">
                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Megaphone className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                </div>
                내 캠페인
              </h1>
              <p className="text-gray-500 mt-1 lg:mt-2 text-sm lg:text-base">인플루언서 마케팅 캠페인을 한눈에 관리하세요</p>
            </div>
            <Button onClick={() => setShowRegionModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 h-9 lg:h-11 px-4 lg:px-5 text-sm lg:text-base">
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-1.5 lg:mr-2" />
              새 캠페인 등록
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 mb-5 lg:mb-8">
            {[
              { key: 'all', label: '전체 캠페인', value: stats.total, icon: FolderOpen, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
              { key: 'pending', label: '승인 대기', value: stats.pending, icon: Clock, color: 'amber', gradient: 'from-amber-500 to-orange-500' },
              { key: 'active', label: '진행중', value: stats.active, icon: Users, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
              { key: 'completed', label: '완료', value: stats.completed, icon: CheckCircle, color: 'violet', gradient: 'from-violet-500 to-purple-600' }
            ].map(({ key, label, value, icon: Icon, color, gradient }) => (
              <button
                key={key}
                onClick={() => setStatsFilter(statsFilter === key ? null : key)}
                className={`relative overflow-hidden bg-white rounded-xl lg:rounded-2xl p-3 lg:p-5 border transition-all duration-300 text-left group ${
                  statsFilter === key
                    ? `ring-2 ring-${color}-400 ring-offset-2 border-${color}-200 shadow-lg`
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center justify-between mb-2 lg:mb-3">
                  <span className="text-xs lg:text-sm font-medium text-gray-500">{label}</span>
                  <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</div>
                {statsFilter === key && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
                )}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm p-3 lg:p-5 mb-4 lg:mb-6">
            <div className="relative mb-3 lg:mb-5">
              <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="캠페인명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 lg:pl-12 h-10 lg:h-12 rounded-lg lg:rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-sm lg:text-base"
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 lg:gap-4">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1.5 lg:mb-2 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> 국가
                </p>
                <div className="flex overflow-x-auto gap-1.5 lg:gap-2 pb-1 -mx-1 px-1 scrollbar-hide lg:flex-wrap lg:overflow-x-visible lg:pb-0 lg:mx-0 lg:px-0">
                  {regionFilters.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedRegion(filter.value)}
                      className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        selectedRegion === filter.value
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1.5 lg:mb-2">상태</p>
                <div className="flex overflow-x-auto gap-1.5 lg:gap-2 pb-1 -mx-1 px-1 scrollbar-hide lg:flex-wrap lg:overflow-x-visible lg:pb-0 lg:mx-0 lg:px-0">
                  {statusFilters.map(filter => (
                    <button
                      key={filter.value}
                      onClick={() => setSelectedStatus(filter.value)}
                      className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                        selectedStatus === filter.value
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 캠페인 타입 필터 */}
            <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100">
              <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1.5 lg:mb-2 flex items-center gap-2">
                <Megaphone className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> 캠페인 타입
              </p>
              <div className="flex overflow-x-auto gap-1.5 lg:gap-2 pb-1 -mx-1 px-1 scrollbar-hide lg:flex-wrap lg:overflow-x-visible lg:pb-0 lg:mx-0 lg:px-0">
                {campaignTypeFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedCampaignType(filter.value)}
                    className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap flex-shrink-0 ${
                      selectedCampaignType === filter.value
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 lg:px-5 py-3 lg:py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <FolderOpen className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
                <h2 className="font-semibold text-gray-900 text-sm lg:text-base">캠페인 목록</h2>
                <span className="px-2 lg:px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs lg:text-sm font-medium">
                  {filteredCampaigns.length}개
                </span>
                {statsFilter && (
                  <button
                    onClick={() => setStatsFilter(null)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-200 transition-colors"
                  >
                    {statsFilter === 'all' && '전체'}{statsFilter === 'pending' && '승인 대기'}{statsFilter === 'active' && '진행중'}{statsFilter === 'completed' && '완료'}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 lg:p-4">
              {loading ? (
                <div className="space-y-3 lg:space-y-4">
                  {[1, 2, 3].map(i => <CampaignSkeleton key={i} />)}
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12 lg:py-20">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 lg:mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl lg:rounded-2xl flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 lg:w-10 lg:h-10 text-indigo-400" />
                  </div>
                  <p className="text-base lg:text-xl font-semibold text-gray-700 mb-2">
                    {campaigns.length === 0 ? '아직 등록된 캠페인이 없습니다' : '검색 결과가 없습니다'}
                  </p>
                  <p className="text-sm lg:text-base text-gray-500 mb-6 lg:mb-8">
                    {campaigns.length === 0 ? '첫 번째 인플루언서 마케팅 캠페인을 시작해보세요' : '다른 검색어나 필터를 시도해보세요'}
                  </p>
                  {campaigns.length === 0 && (
                    <Button onClick={() => setShowRegionModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 h-11 px-6">
                      <Plus className="w-5 h-5 mr-2" />
                      첫 캠페인 등록하기
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {filteredCampaigns.map((campaign) => {
                    // 패키지 가격 기반으로 계산 (estimated_cost보다 우선)
                    const packagePrice = getPackagePrice(campaign.package_type, campaign.campaign_type, campaign.region) + (campaign.bonus_amount || 0)
                    const totalCost = (campaign.package_type && campaign.total_slots) ? Math.round(packagePrice * campaign.total_slots * 1.1) : (campaign.estimated_cost ? Math.round(campaign.estimated_cost) : 0)
                    const participantInfo = participants[campaign.id] || { total: 0, selected: 0, guideConfirmed: 0 }
                    const recruitmentDays = getDaysRemaining(campaign.recruitment_deadline)
                    const typeInfo = getCampaignTypeInfo(campaign.campaign_type)
                    const statusInfo = getProgressStatusInfo(
                      campaign.status === 'active' && campaign.payment_status === 'confirmed' ? 'recruiting' : (campaign.progress_status || campaign.approval_status),
                      campaign.is_cancelled
                    )
                    const regionInfo = getRegionInfo(campaign.region)
                    const thumbnail = getThumbnail(campaign)

                    return (
                      <div
                        key={campaign.id}
                        className="group border border-gray-100 rounded-xl lg:rounded-2xl p-3 lg:p-5 hover:border-indigo-200 hover:shadow-xl cursor-pointer transition-all duration-300 bg-white hover:bg-gradient-to-r hover:from-white hover:to-indigo-50/30 overflow-hidden"
                        onClick={() => navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)}
                      >
                        <div className="flex gap-3 lg:gap-5">
                          {/* Thumbnail */}
                          <div className="w-20 h-20 md:w-32 md:h-32 flex-shrink-0 rounded-lg lg:rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={campaign.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex flex-col items-center justify-center ${thumbnail ? 'hidden' : ''}`}>
                              <ImageIcon className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400 mb-1" />
                              <span className="text-[10px] lg:text-xs text-gray-400">이미지 없음</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                              <span className={`inline-flex items-center gap-0.5 lg:gap-1 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-semibold border ${regionInfo.color}`}>
                                {regionInfo.flag} {regionInfo.label}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 lg:gap-1.5 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-semibold ${typeInfo.color}`}>
                                <span>{typeInfo.icon}</span>
                                {typeInfo.label}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 lg:gap-1.5 px-1.5 lg:px-2.5 py-0.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-semibold ${statusInfo.color}`}>
                                <span className={`w-1 h-1 lg:w-1.5 lg:h-1.5 rounded-full ${statusInfo.dotColor} animate-pulse`} />
                                {statusInfo.label}
                              </span>
                            </div>

                            {/* Title & Info */}
                            <h3 className="font-bold text-gray-900 text-sm lg:text-xl mb-0.5 lg:mb-1 truncate group-hover:text-indigo-600 transition-colors">
                              {campaign.title}
                            </h3>
                            <p className="text-xs lg:text-sm text-gray-500 mb-2 lg:mb-3 truncate">
                              {campaign.brand && <span className="font-medium">{campaign.brand}</span>}
                              {campaign.brand && campaign.product_name && ' • '}
                              {campaign.product_name}
                            </p>

                            {/* Stats Row */}
                            <div className="hidden lg:flex flex-wrap items-center gap-2 md:gap-3">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-sm">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-600">모집</span>
                                <span className="font-bold text-blue-600">{campaign.total_slots || 0}명</span>
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/company/campaigns/${campaign.id}?tab=applicants${campaign.region ? `&region=${campaign.region}` : ''}`)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm transition-colors cursor-pointer"
                                title="지원자 현황 보기"
                              >
                                <UserCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-gray-600">지원</span>
                                <span className="font-bold text-emerald-600">{participantInfo.total}명</span>
                              </button>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg text-sm">
                                <CheckCircle className="w-4 h-4 text-violet-500" />
                                <span className="text-gray-600">확정</span>
                                <span className="font-bold text-violet-600">{participantInfo.selected}명</span>
                              </span>
                              {recruitmentDays !== null && recruitmentDays >= 0 && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                                  recruitmentDays <= 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <Calendar className={`w-4 h-4 ${recruitmentDays <= 3 ? 'text-red-500' : 'text-gray-500'}`} />
                                  D-{recruitmentDays}
                                </span>
                              )}
                            </div>
                            {/* Mobile Stats Row */}
                            <div className="flex lg:hidden items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md text-[11px]">
                                <Users className="w-3 h-3 text-blue-500" />
                                <span className="font-bold text-blue-600">{campaign.total_slots || 0}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-md text-[11px]">
                                <UserCheck className="w-3 h-3 text-emerald-500" />
                                <span className="font-bold text-emerald-600">{participantInfo.total}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 rounded-md text-[11px]">
                                <CheckCircle className="w-3 h-3 text-violet-500" />
                                <span className="font-bold text-violet-600">{participantInfo.selected}</span>
                              </span>
                              {recruitmentDays !== null && recruitmentDays >= 0 && (
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${
                                  recruitmentDays <= 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  D-{recruitmentDays}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Action */}
                          <div className="hidden md:flex flex-col items-end justify-between flex-shrink-0">
                            <div className="text-right">
                              <div className="text-xs text-gray-400 mb-1">예상 비용</div>
                              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {totalCost.toLocaleString()}원
                              </div>
                              <div className="text-xs text-gray-400 mt-1">{campaign.package_type || '패키지 미선택'}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 gap-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/company/campaigns/${campaign.id}${campaign.region ? `?region=${campaign.region}` : ''}`)
                              }}
                            >
                              상세보기
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Mobile Price */}
                        <div className="md:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-[10px] lg:text-xs text-gray-400">예상 비용</span>
                            <div className="text-base font-bold text-indigo-600">{totalCost.toLocaleString()}원</div>
                          </div>
                          <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 h-8 text-xs px-3">
                            상세보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>
                        </div>

                        {/* Deposit Alert */}
                        {campaign.payment_status === 'pending' && !campaign.is_cancelled && (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 mt-3 lg:mt-4 overflow-hidden">
                            <p className="text-xs lg:text-sm text-amber-700 flex items-center gap-1.5 lg:gap-2 min-w-0">
                              <AlertCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
                              <span className="truncate">입금 확인이 완료되지 않았습니다</span>
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDepositConfirmationRequest(campaign)
                              }}
                            >
                              입금 확인 요청
                            </Button>
                          </div>
                        )}

                        {/* 카드 결제 버튼: draft 또는 pending_payment 상태에서 표시 */}
                        {(campaign.approval_status === 'draft' || campaign.approval_status === 'pending_payment') && !campaign.is_cancelled && (
                          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 mt-3 lg:mt-4 overflow-hidden">
                            <p className="text-xs lg:text-sm text-indigo-700 flex items-center gap-1.5 lg:gap-2 min-w-0">
                              <CreditCard className="w-3.5 h-3.5 lg:w-4 lg:h-4 flex-shrink-0" />
                              <span className="truncate">카드 결제로 빠르게 진행하세요</span>
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-indigo-400 text-indigo-700 hover:bg-indigo-100 text-xs flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/company/campaigns/payment?id=${campaign.id}&region=${campaign.region || 'korea'}`)
                              }}
                            >
                              카드 결제하기
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {showRegionModal && <RegionSelectModal onClose={() => setShowRegionModal(false)} />}
        </div>
      </div>
    </>
  )
}
