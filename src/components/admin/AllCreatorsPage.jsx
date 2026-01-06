import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, Search, Globe, Star, MessageSquare, Download,
  Instagram, Youtube, Video, Phone, Mail, Send, CheckSquare,
  X, ExternalLink, User, MapPin, CreditCard, Calendar, ChevronLeft, ChevronRight,
  Briefcase, Award, FileCheck, Key, RefreshCw, Eye, EyeOff, Check, Copy, Loader2,
  Crown, Sparkles, TrendingUp, Coins, Gift
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import { database } from '../../lib/supabaseKorea'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

// 등급 정의
const GRADE_LEVELS = {
  1: { name: 'FRESH', label: '새싹', color: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-600', lightBg: 'bg-emerald-50', borderClass: 'border-emerald-200' },
  2: { name: 'GLOW', label: '빛나기 시작', color: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-600', lightBg: 'bg-blue-50', borderClass: 'border-blue-200' },
  3: { name: 'BLOOM', label: '피어나는 중', color: '#8B5CF6', bgClass: 'bg-violet-500', textClass: 'text-violet-600', lightBg: 'bg-violet-50', borderClass: 'border-violet-200' },
  4: { name: 'ICONIC', label: '아이코닉', color: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-pink-600', lightBg: 'bg-pink-50', borderClass: 'border-pink-200' },
  5: { name: 'MUSE', label: '뮤즈', color: '#F59E0B', bgClass: 'bg-amber-500', textClass: 'text-amber-600', lightBg: 'bg-amber-50', borderClass: 'border-amber-200' }
}

// 페이지당 아이템 수
const ITEMS_PER_PAGE = 50

// 전체 컬럼 선택 (안정성 우선)
const SELECT_COLUMNS = '*'

// 숫자 포맷
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`
  return num.toLocaleString()
}

// SNS URL 정규화 함수 - @id 또는 id만 있으면 전체 URL로 변환
const normalizeInstagramUrl = (url) => {
  if (!url) return null
  const urlStr = String(url).trim()
  if (!urlStr) return null

  // 이미 전체 URL인 경우
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr
  }
  // @ 제거하고 핸들만 추출
  const handle = urlStr.replace(/^@/, '').trim()
  if (!handle) return null
  return `https://www.instagram.com/${handle}`
}

const normalizeYoutubeUrl = (url) => {
  if (!url) return null
  const urlStr = String(url).trim()
  if (!urlStr) return null

  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr
  }
  const handle = urlStr.replace(/^@/, '').trim()
  if (!handle) return null
  // @로 시작하는 핸들이면 채널 핸들로
  if (urlStr.startsWith('@')) {
    return `https://www.youtube.com/@${handle}`
  }
  // 그 외에는 채널 핸들로 처리 (@ 추가)
  return `https://www.youtube.com/@${handle}`
}

const normalizeTiktokUrl = (url) => {
  if (!url) return null
  const urlStr = String(url).trim()
  if (!urlStr) return null

  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr
  }
  const handle = urlStr.replace(/^@/, '').trim()
  if (!handle) return null
  return `https://www.tiktok.com/@${handle}`
}

// 크리에이터 데이터 필드 정규화 함수 - 각 지역 DB의 다른 필드명을 통일
const normalizeCreatorData = (creator, region) => {
  return {
    ...creator,
    // SNS URL 필드 정규화 (다양한 필드명 지원)
    instagram_url: creator.instagram_url || creator.instagram || creator.instagram_handle || creator.instagram_id || null,
    youtube_url: creator.youtube_url || creator.youtube || creator.youtube_handle || creator.youtube_channel || creator.youtube_id || null,
    tiktok_url: creator.tiktok_url || creator.tiktok || creator.tiktok_handle || creator.tiktok_id || null,
    // 전화번호 필드 정규화
    phone: creator.phone || creator.phone_number || creator.mobile || creator.contact || null,
    // 팔로워 수 필드 정규화
    instagram_followers: creator.instagram_followers || creator.insta_followers || 0,
    youtube_subscribers: creator.youtube_subscribers || creator.youtube_subs || creator.subscribers || 0,
    tiktok_followers: creator.tiktok_followers || 0,
    // 이름 필드 정규화
    name: creator.name || creator.creator_name || creator.channel_name || creator.full_name || null,
    // 프로필 이미지 필드 정규화
    profile_image: creator.profile_image || creator.profile_image_url || creator.avatar || creator.avatar_url || creator.photo || null,
  }
}

export default function AllCreatorsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [selectedCreators, setSelectedCreators] = useState([])
  const [reviewData, setReviewData] = useState({ rating: 0, review: '' })
  const [messageData, setMessageData] = useState({ type: 'email', subject: '', content: '' })
  const [sendingMessage, setSendingMessage] = useState(false)

  // 프로필 완료 요청 모달 상태
  const [showProfileRequestModal, setShowProfileRequestModal] = useState(false)
  const [sendingProfileRequest, setSendingProfileRequest] = useState(false)

  // 비밀번호 재설정 모달 상태
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [passwordResetCreator, setPasswordResetCreator] = useState(null)
  const [tempPassword, setTempPassword] = useState('')
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false)
  const [passwordEmailSent, setPasswordEmailSent] = useState(false)

  // 포인트 강제 지급 모달 상태
  const [showPointGrantModal, setShowPointGrantModal] = useState(false)
  const [pointGrantCreator, setPointGrantCreator] = useState(null)
  const [pointGrantAmount, setPointGrantAmount] = useState('')
  const [pointGrantReason, setPointGrantReason] = useState('')
  const [grantingPoints, setGrantingPoints] = useState(false)

  // 캠페인 이력 상태
  const [creatorCampaigns, setCreatorCampaigns] = useState({ inProgress: [], completed: [] })
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  const [creators, setCreators] = useState({
    korea: [],
    japan: [],
    us: [],
    taiwan: []
  })

  const [stats, setStats] = useState({
    korea: 0,
    japan: 0,
    us: 0,
    taiwan: 0,
    total: 0
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // 등급 관련 상태
  const [gradeFilter, setGradeFilter] = useState('all')
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(1)
  const [savingGrade, setSavingGrade] = useState(false)

  // 포인트 지급 상태
  const [showPointModal, setShowPointModal] = useState(false)
  const [pointAmount, setPointAmount] = useState('')
  const [pointReason, setPointReason] = useState('')
  const [savingPoints, setSavingPoints] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchAllCreators()
    fetchFeaturedCreators()
  }, [])

  // 탭이나 검색어, 등급필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm, gradeFilter])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/login')
    }
  }

  const fetchAllCreators = async () => {
    setLoading(true)
    try {
      // 병렬로 모든 지역 데이터 fetch (100배 속도 향상)
      const [koreaResult, japanResult, usResult, taiwanResult] = await Promise.allSettled([
        // 한국
        supabaseKorea?.from('user_profiles')
          .select(SELECT_COLUMNS)
          .order('created_at', { ascending: false }),
        // 일본
        supabaseJapan?.from('user_profiles')
          .select(SELECT_COLUMNS)
          .order('created_at', { ascending: false }),
        // 미국
        supabaseUS?.from('user_profiles')
          .select(SELECT_COLUMNS)
          .order('created_at', { ascending: false }),
        // 대만
        supabaseBiz?.from('user_profiles')
          .select(SELECT_COLUMNS)
          .eq('region', 'taiwan')
          .order('created_at', { ascending: false })
      ])

      // 각 지역 데이터 필드 정규화 적용 (다른 DB 스키마 대응)
      const koreaData = (koreaResult.status === 'fulfilled' && koreaResult.value?.data ? koreaResult.value.data : [])
        .map(c => normalizeCreatorData(c, 'korea'))
      let japanData = (japanResult.status === 'fulfilled' && japanResult.value?.data ? japanResult.value.data : [])
        .map(c => normalizeCreatorData(c, 'japan'))
      let usData = (usResult.status === 'fulfilled' && usResult.value?.data ? usResult.value.data : [])
        .map(c => normalizeCreatorData(c, 'us'))
      const taiwanData = (taiwanResult.status === 'fulfilled' && taiwanResult.value?.data ? taiwanResult.value.data : [])
        .map(c => normalizeCreatorData(c, 'taiwan'))

      // 미국/일본 크리에이터의 경우 applications 테이블에서 SNS 정보 보완
      try {
        const [japanAppsResult, usAppsResult] = await Promise.allSettled([
          supabaseJapan?.from('applications')
            .select('user_id, instagram_url, youtube_url, tiktok_url, phone, phone_number')
            .order('created_at', { ascending: false }),
          supabaseUS?.from('applications')
            .select('user_id, instagram_url, youtube_url, tiktok_url, phone_number')
            .order('created_at', { ascending: false })
        ])

        // 일본 크리에이터 SNS 정보 보완
        if (japanAppsResult.status === 'fulfilled' && japanAppsResult.value?.data) {
          const japanAppsMap = new Map()
          japanAppsResult.value.data.forEach(app => {
            if (app.user_id && !japanAppsMap.has(app.user_id)) {
              japanAppsMap.set(app.user_id, app)
            }
          })
          japanData = japanData.map(creator => {
            const appData = japanAppsMap.get(creator.user_id || creator.id)
            if (appData) {
              return {
                ...creator,
                instagram_url: creator.instagram_url || appData.instagram_url || null,
                youtube_url: creator.youtube_url || appData.youtube_url || null,
                tiktok_url: creator.tiktok_url || appData.tiktok_url || null,
                phone: creator.phone || appData.phone || appData.phone_number || null
              }
            }
            return creator
          })
        }

        // 미국 크리에이터 SNS 정보 보완
        if (usAppsResult.status === 'fulfilled' && usAppsResult.value?.data) {
          const usAppsMap = new Map()
          usAppsResult.value.data.forEach(app => {
            if (app.user_id && !usAppsMap.has(app.user_id)) {
              usAppsMap.set(app.user_id, app)
            }
          })
          usData = usData.map(creator => {
            const appData = usAppsMap.get(creator.user_id || creator.id)
            if (appData) {
              return {
                ...creator,
                instagram_url: creator.instagram_url || appData.instagram_url || null,
                youtube_url: creator.youtube_url || appData.youtube_url || null,
                tiktok_url: creator.tiktok_url || appData.tiktok_url || null,
                phone: creator.phone || appData.phone_number || null
              }
            }
            return creator
          })
        }
      } catch (appError) {
        console.error('applications 테이블 조회 오류:', appError)
      }

      setCreators({ korea: koreaData, japan: japanData, us: usData, taiwan: taiwanData })
      setStats({
        korea: koreaData.length,
        japan: japanData.length,
        us: usData.length,
        taiwan: taiwanData.length,
        total: koreaData.length + japanData.length + usData.length + taiwanData.length
      })
    } catch (error) {
      console.error('크리에이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 등급 크리에이터 데이터 로드 (brand site DB)
  const fetchFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('source_user_id, cnec_grade_level, cnec_grade_name, cnec_total_score, is_cnec_recommended')
        .eq('is_active', true)

      if (error) {
        console.error('featured_creators 조회 오류:', error)
        return
      }

      setFeaturedCreators(data || [])
    } catch (err) {
      console.error('등급 크리에이터 조회 오류:', err)
    }
  }

  // 크리에이터의 등급 정보 가져오기
  const getCreatorGrade = (creatorId) => {
    const featured = featuredCreators.find(fc => fc.source_user_id === creatorId)
    if (featured && featured.cnec_grade_level) {
      return {
        level: featured.cnec_grade_level,
        name: featured.cnec_grade_name || GRADE_LEVELS[featured.cnec_grade_level]?.name,
        score: featured.cnec_total_score || 0,
        isRecommended: featured.is_cnec_recommended
      }
    }
    return null
  }

  // 등급 등록/수정
  const handleSaveGrade = async () => {
    if (!selectedCreator) return

    setSavingGrade(true)
    try {
      const gradeInfo = GRADE_LEVELS[selectedGradeLevel]
      const existingFeatured = featuredCreators.find(fc => fc.source_user_id === selectedCreator.id)

      if (existingFeatured) {
        // 기존 등급 업데이트
        const { error } = await supabaseBiz
          .from('featured_creators')
          .update({
            cnec_grade_level: selectedGradeLevel,
            cnec_grade_name: gradeInfo.name,
            is_cnec_recommended: selectedGradeLevel >= 2
          })
          .eq('source_user_id', selectedCreator.id)

        if (error) throw error
      } else {
        // 새로 등록
        const regionMap = { korea: 'KR', japan: 'JP', us: 'US', taiwan: 'TW' }
        const { error } = await supabaseBiz
          .from('featured_creators')
          .insert({
            source_user_id: selectedCreator.id,
            source_country: regionMap[selectedCreator.dbRegion] || 'KR',
            name: selectedCreator.name || selectedCreator.channel_name || '',
            email: selectedCreator.email,
            phone: selectedCreator.phone,
            profile_image_url: selectedCreator.profile_image,
            instagram_handle: selectedCreator.instagram_url?.split('/').pop(),
            instagram_followers: selectedCreator.instagram_followers || 0,
            youtube_handle: selectedCreator.youtube_url?.split('/').pop(),
            youtube_subscribers: selectedCreator.youtube_subscribers || 0,
            tiktok_handle: selectedCreator.tiktok_url?.split('/').pop(),
            tiktok_followers: selectedCreator.tiktok_followers || 0,
            primary_country: regionMap[selectedCreator.dbRegion] || 'KR',
            active_regions: [selectedCreator.dbRegion],
            featured_type: 'manual',
            is_active: true,
            cnec_grade_level: selectedGradeLevel,
            cnec_grade_name: gradeInfo.name,
            cnec_total_score: 0,
            is_cnec_recommended: selectedGradeLevel >= 2
          })

        if (error) throw error
      }

      alert(`${selectedCreator.name || '크리에이터'}의 등급이 ${gradeInfo.name}(으)로 설정되었습니다.`)
      setShowGradeModal(false)
      await fetchFeaturedCreators()
    } catch (error) {
      console.error('등급 저장 오류:', error)
      alert('등급 저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingGrade(false)
    }
  }

  // 등급 삭제 (추천 크리에이터에서 제외)
  const handleRemoveGrade = async () => {
    if (!selectedCreator) return

    if (!confirm(`${selectedCreator.name || '크리에이터'}의 등급을 삭제하시겠습니까?`)) return

    setSavingGrade(true)
    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('source_user_id', selectedCreator.id)

      if (error) throw error

      alert('등급이 삭제되었습니다.')
      setShowGradeModal(false)
      await fetchFeaturedCreators()
    } catch (error) {
      console.error('등급 삭제 오류:', error)
      alert('등급 삭제에 실패했습니다: ' + error.message)
    } finally {
      setSavingGrade(false)
    }
  }

  // 포인트 지급 모달 열기
  const openPointModal = (creator) => {
    setPointAmount('')
    setPointReason('')
    setShowPointModal(true)
  }

  // 포인트 지급
  const handleGivePoints = async () => {
    if (!selectedCreator) return

    const amount = parseInt(pointAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('유효한 포인트 금액을 입력해주세요.')
      return
    }

    if (!pointReason.trim()) {
      alert('지급 사유를 입력해주세요.')
      return
    }

    setSavingPoints(true)
    try {
      // 해당 지역의 Supabase 클라이언트 선택
      let supabaseClient
      if (selectedCreator.dbRegion === 'korea') supabaseClient = supabaseKorea || supabaseBiz
      else if (selectedCreator.dbRegion === 'japan') supabaseClient = supabaseJapan || supabaseBiz
      else if (selectedCreator.dbRegion === 'us') supabaseClient = supabaseUS || supabaseBiz
      else supabaseClient = supabaseBiz

      // 현재 포인트 조회
      const currentPoints = selectedCreator.points || 0
      const newPoints = currentPoints + amount

      // 포인트 업데이트
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCreator.id)

      if (updateError) throw updateError

      // 포인트 이력 저장 시도 (테이블이 있는 경우)
      try {
        await supabaseClient
          .from('point_history')
          .insert({
            user_id: selectedCreator.id,
            amount: amount,
            type: 'admin_grant',
            reason: pointReason,
            balance_after: newPoints,
            created_at: new Date().toISOString()
          })
      } catch (historyError) {
        // 이력 테이블이 없어도 무시
        console.log('포인트 이력 저장 실패 (테이블 없음):', historyError)
      }

      alert(`${selectedCreator.name || '크리에이터'}님에게 ${amount.toLocaleString()} 포인트를 지급했습니다.\n현재 포인트: ${newPoints.toLocaleString()}`)
      setShowPointModal(false)
      setShowProfileModal(false)

      // 크리에이터 목록 새로고침
      await fetchAllCreators()
    } catch (error) {
      console.error('포인트 지급 오류:', error)
      alert('포인트 지급에 실패했습니다: ' + error.message)
    } finally {
      setSavingPoints(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-800' },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-800' }
    }
    const { label, color } = statusMap[status] || statusMap.pending
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  }

  const getAllCreators = () => {
    return [
      ...creators.korea.map(c => ({ ...c, region: '한국', dbRegion: 'korea' })),
      ...creators.japan.map(c => ({ ...c, region: '일본', dbRegion: 'japan' })),
      ...creators.us.map(c => ({ ...c, region: '미국', dbRegion: 'us' })),
      ...creators.taiwan.map(c => ({ ...c, region: '대만', dbRegion: 'taiwan' }))
    ]
  }

  const filterCreators = (creatorList) => {
    let filtered = creatorList

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(creator =>
        creator.name?.toLowerCase().includes(term) ||
        creator.email?.toLowerCase().includes(term) ||
        creator.channel_name?.toLowerCase().includes(term) ||
        creator.phone?.includes(term)
      )
    }

    // 등급 필터
    if (gradeFilter !== 'all') {
      if (gradeFilter === 'none') {
        // 등급 없음 (미등록)
        filtered = filtered.filter(creator => !getCreatorGrade(creator.id))
      } else {
        // 특정 등급
        const gradeLevel = parseInt(gradeFilter)
        filtered = filtered.filter(creator => {
          const grade = getCreatorGrade(creator.id)
          return grade && grade.level === gradeLevel
        })
      }
    }

    return filtered
  }

  // 선택된 크리에이터 토글
  const toggleSelectCreator = (creator) => {
    setSelectedCreators(prev => {
      const exists = prev.find(c => c.id === creator.id && c.dbRegion === creator.dbRegion)
      if (exists) {
        return prev.filter(c => !(c.id === creator.id && c.dbRegion === creator.dbRegion))
      }
      return [...prev, creator]
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = (creatorList) => {
    const allSelected = creatorList.every(c =>
      selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
    )
    if (allSelected) {
      setSelectedCreators(prev =>
        prev.filter(sc => !creatorList.find(c => c.id === sc.id && c.dbRegion === sc.dbRegion))
      )
    } else {
      const newSelections = creatorList.filter(c =>
        !selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
      )
      setSelectedCreators(prev => [...prev, ...newSelections])
    }
  }

  // 프로필 모달 열기
  const openProfileModal = async (creator) => {
    setSelectedCreator(creator)
    setShowProfileModal(true)
    setCreatorCampaigns({ inProgress: [], completed: [] })
    setLoadingCampaigns(true)

    try {
      // 지역에 따른 Supabase 클라이언트 선택
      const getSupabaseClient = (region) => {
        switch (region) {
          case 'korea': return supabaseKorea
          case 'japan': return supabaseJapan
          case 'us': return supabaseUS
          default: return supabaseKorea
        }
      }

      const supabase = getSupabaseClient(creator.dbRegion)

      // applications 테이블에서 크리에이터의 캠페인 이력 조회
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          campaign_id,
          campaigns (
            id,
            title,
            brand,
            status,
            created_at
          )
        `)
        .eq('user_id', creator.user_id || creator.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch campaign history:', error)
        setLoadingCampaigns(false)
        return
      }

      // 진행중/완료 분류
      const inProgressStatuses = ['selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'guide_confirmation', 'virtual_selected']
      const completedStatuses = ['completed']

      const inProgress = applications?.filter(app =>
        inProgressStatuses.includes(app.status) && app.campaigns
      ).map(app => ({
        ...app,
        campaign: app.campaigns
      })) || []

      const completed = applications?.filter(app =>
        completedStatuses.includes(app.status) && app.campaigns
      ).map(app => ({
        ...app,
        campaign: app.campaigns
      })) || []

      setCreatorCampaigns({ inProgress, completed })
    } catch (err) {
      console.error('Error fetching campaign history:', err)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // 메시지 발송 모달 열기
  const openMessageModal = () => {
    if (selectedCreators.length === 0) {
      alert('메시지를 보낼 크리에이터를 선택해주세요.')
      return
    }
    setMessageData({ type: 'email', subject: '', content: '' })
    setShowMessageModal(true)
  }

  // 메시지 발송
  const handleSendMessage = async () => {
    if (!messageData.content) {
      alert('메시지 내용을 입력해주세요.')
      return
    }

    setSendingMessage(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const creator of selectedCreators) {
        try {
          if (messageData.type === 'email' && creator.email) {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: creator.email,
                subject: messageData.subject || '[CNEC] 안내 메시지',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0;">CNEC</h1>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                      <p style="color: #4b5563; line-height: 1.8; white-space: pre-wrap;">${messageData.content}</p>
                    </div>
                  </div>
                `
              })
            })
            successCount++
          } else if (messageData.type === 'kakao' && creator.phone) {
            const phoneNumber = creator.phone.replace(/-/g, '')
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: phoneNumber,
                receiverName: creator.name || '크리에이터',
                templateCode: '025100001022', // 일반 알림 템플릿
                variables: {
                  '이름': creator.name || '크리에이터',
                  '내용': messageData.content.substring(0, 200)
                }
              })
            })
            successCount++
          }
        } catch (err) {
          console.error(`발송 실패 (${creator.email || creator.phone}):`, err)
          failCount++
        }
      }

      alert(`발송 완료!\n성공: ${successCount}건\n실패: ${failCount}건`)
      setShowMessageModal(false)
      setSelectedCreators([])
    } catch (error) {
      console.error('메시지 발송 오류:', error)
      alert('메시지 발송 중 오류가 발생했습니다.')
    } finally {
      setSendingMessage(false)
    }
  }

  // 프로필 완료 요청 모달 열기 (한국 크리에이터만)
  const openProfileRequestModal = () => {
    const koreanCreators = selectedCreators.filter(c => c.dbRegion === 'korea')
    if (koreanCreators.length === 0) {
      alert('한국 크리에이터를 선택해주세요. 프로필 완료 요청은 한국 크리에이터에게만 발송됩니다.')
      return
    }
    setShowProfileRequestModal(true)
  }

  // 프로필 완료 요청 발송 (알림톡 + 이메일 동시 발송)
  const handleSendProfileRequest = async () => {
    const koreanCreators = selectedCreators.filter(c => c.dbRegion === 'korea')
    if (koreanCreators.length === 0) {
      alert('한국 크리에이터가 없습니다.')
      return
    }

    setSendingProfileRequest(true)
    let kakaoSuccess = 0
    let emailSuccess = 0
    let kakaoFail = 0
    let emailFail = 0

    try {
      for (const creator of koreanCreators) {
        const creatorName = creator.name || '크리에이터'

        // 알림톡 발송
        if (creator.phone) {
          try {
            const phoneNumber = creator.phone.replace(/-/g, '')
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: phoneNumber,
                receiverName: creatorName,
                templateCode: '025120000931', // 프로필 안내장 템플릿
                variables: {
                  '회원명': creatorName
                }
              })
            })
            kakaoSuccess++
          } catch (err) {
            console.error(`알림톡 발송 실패 (${creator.phone}):`, err)
            kakaoFail++
          }
        } else {
          kakaoFail++
        }

        // 이메일 발송
        if (creator.email) {
          try {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: creator.email,
                subject: '[크넥] 프로필 설정을 완료해주세요!',
                html: `
                  <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">CNEC</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">프로필 설정 안내</p>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                      <p style="color: #4b5563; line-height: 1.8;">안녕하세요, ${creatorName}님!</p>
                      <p style="color: #4b5563; line-height: 1.8;">크넥에 가입해 주셔서 감사합니다.</p>
                      <p style="color: #4b5563; line-height: 1.8;">캠페인 참여를 위해 <strong>프로필 설정을 완료</strong>해주세요.</p>
                      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">프로필에서 다음 정보를 입력해주세요:</p>
                        <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                          <li>SNS 채널 정보 (인스타그램, 유튜브, 틱톡 등)</li>
                          <li>출금을 위한 계좌 정보</li>
                          <li>세금 신고를 위한 주민등록번호</li>
                        </ul>
                      </div>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://creator.cnec.co.kr/mypage" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold;">프로필 설정하러 가기</a>
                      </div>
                      <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">본 메일은 발신 전용입니다.</p>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 CNEC. All rights reserved.</p>
                    </div>
                  </div>
                `
              })
            })
            emailSuccess++
          } catch (err) {
            console.error(`이메일 발송 실패 (${creator.email}):`, err)
            emailFail++
          }
        } else {
          emailFail++
        }
      }

      alert(`프로필 완료 요청 발송 완료!\n\n알림톡: 성공 ${kakaoSuccess}건, 실패 ${kakaoFail}건\n이메일: 성공 ${emailSuccess}건, 실패 ${emailFail}건`)
      setShowProfileRequestModal(false)
      setSelectedCreators([])
    } catch (error) {
      console.error('프로필 완료 요청 발송 오류:', error)
      alert('프로필 완료 요청 발송 중 오류가 발생했습니다.')
    } finally {
      setSendingProfileRequest(false)
    }
  }

  const openReviewModal = (creator, region) => {
    setSelectedCreator({ ...creator, dbRegion: region })
    setReviewData({ rating: creator.rating || 0, review: creator.company_review || '' })
    setShowReviewModal(true)
  }

  // 비밀번호 재설정 모달 열기
  const openPasswordResetModal = (creator) => {
    setPasswordResetCreator(creator)
    setTempPassword('')
    setPasswordCopied(false)
    setPasswordEmailSent(false)
    setShowPasswordResetModal(true)
    setShowProfileModal(false)
  }

  // 임시 비밀번호 생성
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setTempPassword(password)
    setPasswordCopied(false)
    setPasswordEmailSent(false)
  }

  // 비밀번호 복사
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 비밀번호 재설정 및 이메일 발송
  const sendPasswordResetEmail = async () => {
    if (!passwordResetCreator || !tempPassword) {
      alert('임시 비밀번호를 먼저 생성해주세요')
      return
    }

    const creatorEmail = passwordResetCreator.email
    if (!creatorEmail) {
      alert('이메일 주소가 없습니다')
      return
    }

    setSendingPasswordEmail(true)

    try {
      // 1. 먼저 실제 비밀번호 변경 (Supabase Auth)
      const resetResponse = await fetch('/.netlify/functions/creator-admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: creatorEmail,
          newPassword: tempPassword,
          region: passwordResetCreator.dbRegion
        })
      })

      const resetResult = await resetResponse.json()

      if (!resetResult.success) {
        throw new Error(resetResult.error || '비밀번호 변경에 실패했습니다')
      }

      // 2. 비밀번호 변경 성공 후 이메일 발송
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: creatorEmail,
          subject: `[CNEC] ${passwordResetCreator.name || '크리에이터'}님의 임시 비밀번호 안내`,
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">CNEC</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">임시 비밀번호 안내</p>
              </div>
              <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="color: #4b5563; line-height: 1.8;">안녕하세요, ${passwordResetCreator.name || '크리에이터'}님!</p>
                <p style="color: #4b5563; line-height: 1.8;">관리자에 의해 비밀번호가 재설정되었습니다.</p>
                <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">임시 비밀번호</p>
                  <p style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace;">${tempPassword}</p>
                </div>
                <p style="color: #4b5563; line-height: 1.8;">로그인 후 반드시 비밀번호를 변경해주세요.</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">본 메일은 발신 전용입니다.</p>
              </div>
              <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 CNEC. All rights reserved.</p>
              </div>
            </div>
          `
        })
      })

      setPasswordEmailSent(true)
      alert(`비밀번호가 변경되었습니다.\n${creatorEmail}로 임시 비밀번호 안내 메일이 발송되었습니다.`)
    } catch (error) {
      console.error('비밀번호 재설정 실패:', error)
      alert('비밀번호 재설정에 실패했습니다: ' + error.message)
    } finally {
      setSendingPasswordEmail(false)
    }
  }

  // 포인트 강제 지급 모달 열기
  const openPointGrantModal = (creator) => {
    setPointGrantCreator(creator)
    setPointGrantAmount('')
    setPointGrantReason('')
    setShowPointGrantModal(true)
    setShowProfileModal(false)
  }

  // 포인트 강제 지급 처리 (마이너스 지급 가능) - 직접 DB 업데이트 방식
  const handleGrantPoints = async () => {
    if (!pointGrantCreator) return

    const amount = parseInt(pointGrantAmount)
    if (!amount || amount === 0) {
      alert('지급할 포인트를 입력해주세요. (마이너스 가능)')
      return
    }

    if (!pointGrantReason.trim()) {
      alert('지급 사유를 입력해주세요.')
      return
    }

    // 한국 크리에이터만 포인트 지급 가능
    if (pointGrantCreator.dbRegion !== 'korea') {
      alert('현재 한국 크리에이터만 포인트 지급이 가능합니다.')
      return
    }

    // 마이너스 지급 시 추가 확인
    if (amount < 0) {
      if (!confirm(`${Math.abs(amount).toLocaleString()}원을 차감하시겠습니까?`)) {
        return
      }
    }

    setGrantingPoints(true)
    try {
      // 직접 DB 업데이트 방식 (이전에 잘 작동하던 방식)
      const currentPoints = pointGrantCreator.points || 0
      const newPoints = currentPoints + amount

      // 포인트 업데이트
      const { error: updateError } = await supabaseKorea
        .from('user_profiles')
        .update({
          points: newPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', pointGrantCreator.id)

      if (updateError) throw updateError

      // 포인트 이력 저장 시도 (point_transactions 테이블)
      try {
        await supabaseKorea
          .from('point_transactions')
          .insert({
            user_id: pointGrantCreator.user_id || pointGrantCreator.id,
            amount: amount,
            transaction_type: amount > 0 ? 'admin_add' : 'admin_deduct',
            description: pointGrantReason,
            platform_region: 'kr',
            country_code: 'KR',
            created_at: new Date().toISOString()
          })
      } catch (historyError) {
        console.log('포인트 이력 저장 실패 (무시):', historyError)
      }

      const actionText = amount > 0 ? '지급' : '차감'
      alert(`${pointGrantCreator.name || '크리에이터'}님에게 ${Math.abs(amount).toLocaleString()}원이 ${actionText}되었습니다.\n현재 포인트: ${newPoints.toLocaleString()}`)
      setShowPointGrantModal(false)
      setShowProfileModal(false)
      setPointGrantCreator(null)
      setPointGrantAmount('')
      setPointGrantReason('')

      // 크리에이터 목록 새로고침
      await fetchAllCreators()
    } catch (error) {
      console.error('포인트 지급 오류:', error)
      alert('포인트 지급에 실패했습니다: ' + error.message)
    } finally {
      setGrantingPoints(false)
    }
  }

  const handleSaveReview = async () => {
    if (!selectedCreator) return

    setSaving(true)
    try {
      let supabaseClient
      if (selectedCreator.dbRegion === 'korea') supabaseClient = supabaseKorea || supabaseBiz
      else if (selectedCreator.dbRegion === 'japan') supabaseClient = supabaseJapan || supabaseBiz
      else if (selectedCreator.dbRegion === 'us') supabaseClient = supabaseUS || supabaseBiz
      else supabaseClient = supabaseBiz

      const { error } = await supabaseClient
        .from('user_profiles')
        .update({
          rating: reviewData.rating,
          company_review: reviewData.review,
          review_updated_at: new Date().toISOString()
        })
        .eq('id', selectedCreator.id)

      if (error) throw error

      alert('별점 및 후기가 저장되었습니다.')
      setShowReviewModal(false)
      await fetchAllCreators()
    } catch (error) {
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const exportToExcel = (data, filename, regionName) => {
    const excelData = data.map(creator => ({
      '이름': creator.name || '-',
      '이메일': creator.email || '-',
      '전화번호': creator.phone || '-',
      '인스타그램 URL': creator.instagram_url || '-',
      '인스타그램 팔로워': creator.instagram_followers || 0,
      '유튜브 URL': creator.youtube_url || '-',
      '유튜브 구독자': creator.youtube_subscribers || 0,
      '틱톡 URL': creator.tiktok_url || '-',
      '틱톡 팔로워': creator.tiktok_followers || 0,
      '지역': creator.region || regionName,
      '가입일': creator.created_at ? new Date(creator.created_at).toLocaleDateString() : '-'
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, regionName)
    XLSX.writeFile(workbook, filename)
  }

  const handleExportByRegion = (region) => {
    const regionConfig = {
      korea: { data: creators.korea, name: '한국' },
      japan: { data: creators.japan, name: '일본' },
      us: { data: creators.us, name: '미국' },
      taiwan: { data: creators.taiwan, name: '대만' }
    }
    const config = regionConfig[region]
    if (!config || config.data.length === 0) {
      alert(`${config?.name || region} 크리에이터 데이터가 없습니다.`)
      return
    }
    exportToExcel(config.data, `크리에이터_${config.name}_${new Date().toISOString().split('T')[0]}.xlsx`, config.name)
  }

  // SNS 아이콘 컴포넌트
  const SNSIcons = ({ creator }) => {
    const instagramUrl = normalizeInstagramUrl(creator.instagram_url)
    const youtubeUrl = normalizeYoutubeUrl(creator.youtube_url)
    const tiktokUrl = normalizeTiktokUrl(creator.tiktok_url)

    return (
      <div className="flex items-center gap-2">
        {/* Instagram */}
        {instagramUrl && (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            <Instagram className="w-3 h-3" />
            <span>{formatNumber(creator.instagram_followers)}</span>
          </a>
        )}
        {/* YouTube */}
        {youtubeUrl && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            <Youtube className="w-3 h-3" />
            <span>{formatNumber(creator.youtube_subscribers)}</span>
          </a>
        )}
        {/* TikTok */}
        {tiktokUrl && (
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-lg text-xs hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            <Video className="w-3 h-3" />
            <span>{formatNumber(creator.tiktok_followers)}</span>
          </a>
        )}
        {!instagramUrl && !youtubeUrl && !tiktokUrl && (
          <span className="text-gray-400 text-xs">미등록</span>
        )}
      </div>
    )
  }

  // 등급 뱃지 컴포넌트
  const GradeBadge = ({ creatorId, showLabel = false }) => {
    const grade = getCreatorGrade(creatorId)
    if (!grade) return null

    const gradeInfo = GRADE_LEVELS[grade.level]
    if (!gradeInfo) return null

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${gradeInfo.lightBg} ${gradeInfo.textClass} border ${gradeInfo.borderClass}`}>
        {grade.level === 5 && <Crown className="w-3 h-3" />}
        {grade.level === 4 && <Sparkles className="w-3 h-3" />}
        {gradeInfo.name}
        {showLabel && <span className="opacity-70">({gradeInfo.label})</span>}
      </span>
    )
  }

  const CreatorTable = ({ creatorList, region }) => {
    const filtered = filterCreators(creatorList)

    // 페이지네이션 계산
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
    const paginatedData = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE)

    const allSelected = paginatedData.length > 0 && paginatedData.every(c =>
      selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
    )

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-1.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(paginatedData)}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="text-left p-1.5 font-medium text-gray-600">이름</th>
              <th className="text-left p-1.5 font-medium text-gray-600">등급</th>
              <th className="text-left p-1.5 font-medium text-gray-600">이메일</th>
              <th className="text-left p-1.5 font-medium text-gray-600">휴대폰</th>
              <th className="text-left p-1.5 font-medium text-gray-600">SNS</th>
              <th className="text-left p-1.5 font-medium text-gray-600">상태</th>
              {region === 'all' && <th className="text-left p-1.5 font-medium text-gray-600">지역</th>}
              <th className="text-left p-1.5 font-medium text-gray-600">가입일</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((creator, index) => {
              const isSelected = selectedCreators.find(sc => sc.id === creator.id && sc.dbRegion === creator.dbRegion)
              return (
                <tr
                  key={`${creator.id}-${index}`}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
                  onClick={() => openProfileModal(creator)}
                >
                  <td className="p-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => toggleSelectCreator(creator)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="p-1.5">
                    <div className="flex items-center gap-2">
                      {/* 프로필 이미지 */}
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {creator.profile_image ? (
                          <img
                            src={creator.profile_image}
                            alt={creator.name || ''}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
                            }}
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <span className="text-indigo-600 hover:underline font-medium">
                        {creator.name || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="p-1.5">
                    <GradeBadge creatorId={creator.id} />
                  </td>
                  <td className="p-1.5 text-gray-600 truncate max-w-[180px]">{creator.email || '-'}</td>
                  <td className="p-1.5">
                    {creator.phone ? (
                      <span className="flex items-center gap-1 text-gray-600 text-xs">
                        <Phone className="w-3 h-3" />
                        {creator.phone}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-1.5" onClick={(e) => e.stopPropagation()}>
                    <SNSIcons creator={creator} />
                  </td>
                  <td className="p-1.5">{getStatusBadge(creator.approval_status)}</td>
                  {region === 'all' && (
                    <td className="p-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {creator.region}
                      </span>
                    </td>
                  )}
                  <td className="p-1.5 text-gray-500 text-xs">
                    {creator.created_at ? new Date(creator.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2 text-sm">
            <span className="text-gray-600">
              {filtered.length}명 중 {startIdx + 1}-{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)}명
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-gray-600">{currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '크리에이터가 없습니다.'}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-600">크리에이터 정보를 불러오는 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">전체 크리에이터 현황</h1>
            <p className="text-gray-500 mt-1">국가별 크리에이터 가입 현황</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">전체</p>
                    <p className="text-3xl font-bold">{stats.total}명</p>
                  </div>
                  <Globe className="w-10 h-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            {[
              { key: 'korea', flag: '🇰🇷', name: '한국', color: 'from-green-500 to-green-600' },
              { key: 'japan', flag: '🇯🇵', name: '일본', color: 'from-red-500 to-red-600' },
              { key: 'us', flag: '🇺🇸', name: '미국', color: 'from-purple-500 to-purple-600' },
              { key: 'taiwan', flag: '🇹🇼', name: '대만', color: 'from-orange-500 to-orange-600' }
            ].map(({ key, flag, name, color }) => (
              <Card key={key} className={`bg-gradient-to-br ${color} text-white`}>
                <CardContent className="pt-6">
                  <p className="text-white/80 text-sm">{flag} {name}</p>
                  <p className="text-3xl font-bold">{stats[key]}명</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 검색 & 액션 바 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                    <Search className="w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="이름, 이메일, 전화번호로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    {selectedCreators.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 bg-indigo-100 px-3 py-1 rounded-full">
                          {selectedCreators.length}명 선택됨
                        </span>
                        <Button
                          onClick={openMessageModal}
                          className="bg-indigo-500 hover:bg-indigo-600"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          메시지 발송
                        </Button>
                        <Button
                          onClick={openProfileRequestModal}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          <User className="w-4 h-4 mr-2" />
                          프로필 완료 요청
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedCreators([])}
                        >
                          선택 해제
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 등급 필터 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Crown className="w-4 h-4" /> 등급 필터:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setGradeFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        gradeFilter === 'all'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      전체
                    </button>
                    {Object.entries(GRADE_LEVELS).map(([level, info]) => (
                      <button
                        key={level}
                        onClick={() => setGradeFilter(level)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                          gradeFilter === level
                            ? `${info.bgClass} text-white`
                            : `${info.lightBg} ${info.textClass} hover:opacity-80`
                        }`}
                      >
                        {level === '5' && <Crown className="w-3 h-3" />}
                        {level === '4' && <Sparkles className="w-3 h-3" />}
                        {info.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setGradeFilter('none')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        gradeFilter === 'none'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      미등록
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all">전체 ({stats.total})</TabsTrigger>
              <TabsTrigger value="korea">한국 ({stats.korea})</TabsTrigger>
              <TabsTrigger value="japan">일본 ({stats.japan})</TabsTrigger>
              <TabsTrigger value="us">미국 ({stats.us})</TabsTrigger>
              <TabsTrigger value="taiwan">대만 ({stats.taiwan})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>전체 크리에이터 ({stats.total}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creatorList={getAllCreators()} region="all" />
                </CardContent>
              </Card>
            </TabsContent>

            {['korea', 'japan', 'us', 'taiwan'].map(region => (
              <TabsContent key={region} value={region}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {region === 'korea' && '한국'}{region === 'japan' && '일본'}{region === 'us' && '미국'}{region === 'taiwan' && '대만'} 크리에이터 ({stats[region]}명)
                      </CardTitle>
                      <Button onClick={() => handleExportByRegion(region)} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        엑셀 다운로드
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CreatorTable
                      creatorList={creators[region].map(c => ({ ...c, region: region === 'korea' ? '한국' : region === 'japan' ? '일본' : region === 'us' ? '미국' : '대만', dbRegion: region }))}
                      region={region}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* 프로필 모달 */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              크리에이터 프로필
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {selectedCreator.profile_image ? (
                    <img src={selectedCreator.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{selectedCreator.name || '이름 없음'}</h3>
                    <GradeBadge creatorId={selectedCreator.id} showLabel />
                  </div>
                  <p className="text-gray-500">{selectedCreator.email}</p>
                  {selectedCreator.phone && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-4 h-4" /> {selectedCreator.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* SNS 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> SNS 정보
                </h4>
                <div className="space-y-3">
                  {normalizeInstagramUrl(selectedCreator.instagram_url) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <Instagram className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">Instagram</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.instagram_followers)} 팔로워</span>
                        <a href={normalizeInstagramUrl(selectedCreator.instagram_url)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {normalizeYoutubeUrl(selectedCreator.youtube_url) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">YouTube</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.youtube_subscribers)} 구독자</span>
                        <a href={normalizeYoutubeUrl(selectedCreator.youtube_url)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {normalizeTiktokUrl(selectedCreator.tiktok_url) && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">TikTok</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.tiktok_followers)} 팔로워</span>
                        <a href={normalizeTiktokUrl(selectedCreator.tiktok_url)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {!normalizeInstagramUrl(selectedCreator.instagram_url) && !normalizeYoutubeUrl(selectedCreator.youtube_url) && !normalizeTiktokUrl(selectedCreator.tiktok_url) && (
                    <p className="text-gray-400 text-center py-4">등록된 SNS 정보가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 활동 통계 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{selectedCreator.completed_campaigns || 0}</p>
                  <p className="text-xs text-blue-600">총 진행횟수</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{formatNumber(selectedCreator.points || 0)}</p>
                  <p className="text-xs text-amber-600">총 포인트</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                      <FileCheck className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-emerald-700">
                    {selectedCreator.is_affiliated ? '계약중' : '미계약'}
                  </p>
                  <p className="text-xs text-emerald-600">소속 계약</p>
                </div>
              </div>

              {/* 추가 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 지역
                  </h4>
                  <p className="text-gray-600">{selectedCreator.region || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 가입일
                  </h4>
                  <p className="text-gray-600">
                    {selectedCreator.created_at ? new Date(selectedCreator.created_at).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
              </div>

              {/* 은행 정보 */}
              {(selectedCreator.bank_name || selectedCreator.bank_account_number) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 정산 계좌
                  </h4>
                  <p className="text-gray-600">
                    {selectedCreator.bank_name} {selectedCreator.bank_account_number} ({selectedCreator.bank_account_holder})
                  </p>
                </div>
              )}

              {/* 캠페인 이력 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> 캠페인 이력
                </h4>

                {loadingCampaigns ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500 text-sm">캠페인 이력 조회중...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 진행중인 캠페인 */}
                    <div>
                      <h5 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 진행중 ({creatorCampaigns.inProgress.length})
                      </h5>
                      {creatorCampaigns.inProgress.length > 0 ? (
                        <div className="space-y-2">
                          {creatorCampaigns.inProgress.map((app) => (
                            <div
                              key={app.id}
                              className="bg-white border border-blue-100 rounded-lg p-3 hover:border-blue-300 cursor-pointer transition-colors"
                              onClick={() => {
                                setShowProfileModal(false)
                                navigate(`/company/campaigns/${app.campaign_id}?region=${selectedCreator.dbRegion}`)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{app.campaign?.title || '캠페인명 없음'}</p>
                                  <p className="text-xs text-gray-500">{app.campaign?.brand || ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    {app.status === 'selected' && '선정됨'}
                                    {app.status === 'approved' && '승인됨'}
                                    {app.status === 'filming' && '촬영중'}
                                    {app.status === 'video_submitted' && '영상제출'}
                                    {app.status === 'revision_requested' && '수정요청'}
                                    {app.status === 'guide_confirmation' && '가이드확인'}
                                    {app.status === 'virtual_selected' && '가상선정'}
                                    {!['selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'guide_confirmation', 'virtual_selected'].includes(app.status) && app.status}
                                  </span>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">진행중인 캠페인이 없습니다.</p>
                      )}
                    </div>

                    {/* 완료된 캠페인 */}
                    <div>
                      <h5 className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3" /> 완료 ({creatorCampaigns.completed.length})
                      </h5>
                      {creatorCampaigns.completed.length > 0 ? (
                        <div className="space-y-2">
                          {creatorCampaigns.completed.slice(0, 5).map((app) => (
                            <div
                              key={app.id}
                              className="bg-white border border-emerald-100 rounded-lg p-3 hover:border-emerald-300 cursor-pointer transition-colors"
                              onClick={() => {
                                setShowProfileModal(false)
                                navigate(`/company/campaigns/${app.campaign_id}?region=${selectedCreator.dbRegion}`)
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{app.campaign?.title || '캠페인명 없음'}</p>
                                  <p className="text-xs text-gray-500">{app.campaign?.brand || ''}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">완료</span>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          ))}
                          {creatorCampaigns.completed.length > 5 && (
                            <p className="text-xs text-gray-400 text-center">외 {creatorCampaigns.completed.length - 5}건 더 있음</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">완료된 캠페인이 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>
              닫기
            </Button>
            <Button
              variant="outline"
              onClick={() => openPasswordResetModal(selectedCreator)}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <Key className="w-4 h-4 mr-2" />
              비밀번호 재설정
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const grade = getCreatorGrade(selectedCreator?.id)
                setSelectedGradeLevel(grade?.level || 1)
                setShowGradeModal(true)
              }}
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              <Crown className="w-4 h-4 mr-2" />
              등급 설정
            </Button>
            {selectedCreator?.dbRegion === 'korea' && (
              <Button
                variant="outline"
                onClick={() => openPointGrantModal(selectedCreator)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Coins className="w-4 h-4 mr-2" />
                포인트 지급
              </Button>
            )}
            <Button onClick={() => {
              setShowProfileModal(false)
              openReviewModal(selectedCreator, selectedCreator?.dbRegion)
            }}>
              <Star className="w-4 h-4 mr-2" />
              평가하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 메시지 발송 모달 */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-500" />
              메시지 발송 ({selectedCreators.length}명)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">발송 방식</label>
              <div className="flex gap-2">
                <Button
                  variant={messageData.type === 'email' ? 'default' : 'outline'}
                  onClick={() => setMessageData({ ...messageData, type: 'email' })}
                  className={messageData.type === 'email' ? 'bg-indigo-500' : ''}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  이메일
                </Button>
                <Button
                  variant={messageData.type === 'kakao' ? 'default' : 'outline'}
                  onClick={() => setMessageData({ ...messageData, type: 'kakao' })}
                  className={messageData.type === 'kakao' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  카카오 알림톡
                </Button>
              </div>
            </div>

            {messageData.type === 'email' && (
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <Input
                  value={messageData.subject}
                  onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                  placeholder="이메일 제목"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">내용</label>
              <Textarea
                value={messageData.content}
                onChange={(e) => setMessageData({ ...messageData, content: e.target.value })}
                placeholder="메시지 내용을 입력하세요..."
                className="min-h-[150px]"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <strong>수신자:</strong> {selectedCreators.map(c => c.name || c.email).join(', ')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)} disabled={sendingMessage}>
              취소
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage} className="bg-indigo-500 hover:bg-indigo-600">
              {sendingMessage ? '발송 중...' : '발송하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 프로필 완료 요청 모달 */}
      <Dialog open={showProfileRequestModal} onOpenChange={setShowProfileRequestModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              프로필 완료 요청 발송
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                선택한 <strong>한국 크리에이터</strong>에게 프로필 완료 요청을 발송합니다.
              </p>
              <p className="text-sm text-amber-700 mt-2">
                • <strong>알림톡</strong>과 <strong>이메일</strong>이 동시에 발송됩니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">발송 대상:</p>
              <div className="max-h-40 overflow-y-auto">
                {selectedCreators
                  .filter(c => c.dbRegion === 'korea')
                  .map((c, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex items-center gap-2 py-1">
                      <span className="font-medium">{c.name || '이름없음'}</span>
                      <span className="text-gray-400">|</span>
                      <span>{c.phone || '전화번호 없음'}</span>
                      <span className="text-gray-400">|</span>
                      <span>{c.email || '이메일 없음'}</span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                총 {selectedCreators.filter(c => c.dbRegion === 'korea').length}명에게 발송됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileRequestModal(false)} disabled={sendingProfileRequest}>
              취소
            </Button>
            <Button onClick={handleSendProfileRequest} disabled={sendingProfileRequest} className="bg-amber-500 hover:bg-amber-600">
              {sendingProfileRequest ? '발송 중...' : '발송하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 후기 작성 모달 */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              크리에이터 평가 및 후기
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">이름:</span> {selectedCreator.name || '-'}</div>
                  <div><span className="font-semibold">이메일:</span> {selectedCreator.email || '-'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">별점</label>
                <select
                  value={reviewData.rating}
                  onChange={(e) => setReviewData({ ...reviewData, rating: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="0">0.0 - 평가 안 함</option>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                    <option key={v} value={v}>{v.toFixed(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">후기 (내부용)</label>
                <Textarea
                  value={reviewData.review}
                  onChange={(e) => setReviewData({ ...reviewData, review: e.target.value })}
                  placeholder="크리에이터와의 협업 경험을 작성해주세요..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSaveReview} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 재설정 모달 */}
      {showPasswordResetModal && passwordResetCreator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">비밀번호 재설정</h2>
                    <p className="text-sm opacity-90">{passwordResetCreator.name || '크리에이터'}</p>
                  </div>
                </div>
                <button onClick={() => setShowPasswordResetModal(false)} className="text-white/80 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="p-6 space-y-5">
              {/* 발송 대상 이메일 */}
              <div className="space-y-2">
                <label className="text-sm text-gray-500">발송 대상 이메일</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{passwordResetCreator.email || '이메일 없음'}</span>
                </div>
              </div>

              {/* 지역 정보 */}
              <div className="space-y-2">
                <label className="text-sm text-gray-500">지역</label>
                <div className="px-4 py-3 bg-slate-50 rounded-xl border">
                  <span className="text-gray-900">
                    {passwordResetCreator.dbRegion === 'korea' ? '🇰🇷 한국' :
                     passwordResetCreator.dbRegion === 'japan' ? '🇯🇵 일본' :
                     passwordResetCreator.dbRegion === 'us' ? '🇺🇸 미국' :
                     passwordResetCreator.dbRegion === 'taiwan' ? '🇹🇼 대만' :
                     passwordResetCreator.region || passwordResetCreator.dbRegion}
                  </span>
                </div>
              </div>

              {/* 임시 비밀번호 */}
              <div className="space-y-2">
                <label className="text-sm text-gray-500">임시 비밀번호</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border font-mono text-lg">
                    {tempPassword || <span className="text-gray-400">생성 버튼을 클릭하세요</span>}
                    {tempPassword && (
                      <button
                        onClick={copyPassword}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                        title="복사"
                      >
                        {passwordCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={generateTempPassword}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    생성
                  </Button>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ 참고사항</strong><br />
                  • 임시 비밀번호 생성 후 이메일 발송 버튼을 클릭하세요<br />
                  • 발송 시 실제 비밀번호가 즉시 변경됩니다<br />
                  • 크리에이터에게 로그인 후 비밀번호 변경을 안내해주세요
                </p>
              </div>

              {/* 발송 성공 메시지 */}
              {passwordEmailSent && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">비밀번호 변경 완료!</div>
                    <div className="text-sm text-green-600">비밀번호가 변경되었고, 크리에이터에게 안내 메일이 발송되었습니다.</div>
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-slate-50 border-t flex gap-2">
              <Button
                onClick={sendPasswordResetEmail}
                disabled={!tempPassword || sendingPasswordEmail}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {sendingPasswordEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    이메일로 발송
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordResetModal(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 등급 설정 모달 */}
      <Dialog open={showGradeModal} onOpenChange={setShowGradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              크리에이터 등급 설정
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 크리에이터 정보 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden">
                  {selectedCreator.profile_image ? (
                    <img src={selectedCreator.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-purple-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCreator.name || '이름 없음'}</h3>
                  <p className="text-sm text-gray-500">{selectedCreator.email}</p>
                  {getCreatorGrade(selectedCreator.id) && (
                    <div className="mt-1">
                      <GradeBadge creatorId={selectedCreator.id} showLabel />
                    </div>
                  )}
                </div>
              </div>

              {/* 등급 선택 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">등급 선택</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(GRADE_LEVELS).map(([level, info]) => (
                    <button
                      key={level}
                      onClick={() => setSelectedGradeLevel(parseInt(level))}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        selectedGradeLevel === parseInt(level)
                          ? `${info.borderClass} ${info.lightBg}`
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full ${info.bgClass} flex items-center justify-center text-white`}>
                        {level === '5' ? <Crown className="w-5 h-5" /> :
                         level === '4' ? <Sparkles className="w-5 h-5" /> :
                         level === '3' ? <TrendingUp className="w-5 h-5" /> :
                         <span className="font-bold">{level}</span>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-bold ${info.textClass}`}>Lv.{level} {info.name}</p>
                        <p className="text-xs text-gray-500">{info.label}</p>
                      </div>
                      {selectedGradeLevel === parseInt(level) && (
                        <Check className={`w-5 h-5 ${info.textClass}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>💡 등급 안내</strong><br />
                  • 등급은 크리에이터 사이트에서 표시됩니다<br />
                  • GLOW(Lv.2) 이상은 추천 크리에이터로 표시됩니다
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {getCreatorGrade(selectedCreator?.id) && (
              <Button
                variant="outline"
                onClick={handleRemoveGrade}
                disabled={savingGrade}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                등급 삭제
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowGradeModal(false)} disabled={savingGrade}>
              취소
            </Button>
            <Button
              onClick={handleSaveGrade}
              disabled={savingGrade}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {savingGrade ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  저장
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 포인트 강제 지급 모달 */}
      <Dialog open={showPointGrantModal} onOpenChange={setShowPointGrantModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-500" />
              포인트 강제 지급
            </DialogTitle>
          </DialogHeader>

          {pointGrantCreator && (
            <div className="space-y-6">
              {/* 크리에이터 정보 */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden">
                  {pointGrantCreator.profile_image ? (
                    <img src={pointGrantCreator.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-green-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{pointGrantCreator.name || '이름 없음'}</h3>
                  <p className="text-sm text-gray-500">{pointGrantCreator.email}</p>
                  <p className="text-xs text-green-600 mt-1">🇰🇷 한국 크리에이터</p>
                </div>
              </div>

              {/* 지급 금액 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">포인트 금액 (원)</label>
                <Input
                  type="number"
                  value={pointGrantAmount}
                  onChange={(e) => setPointGrantAmount(e.target.value)}
                  placeholder="예: 10000 (마이너스: -10000)"
                  className="text-lg"
                />
                {pointGrantAmount && parseInt(pointGrantAmount) !== 0 && (
                  <p className={`text-sm ${parseInt(pointGrantAmount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(parseInt(pointGrantAmount)).toLocaleString()}원 {parseInt(pointGrantAmount) > 0 ? '지급' : '차감'} 예정
                  </p>
                )}
              </div>

              {/* 지급 사유 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">지급 사유</label>
                <Textarea
                  value={pointGrantReason}
                  onChange={(e) => setPointGrantReason(e.target.value)}
                  placeholder="예: 캠페인 보상 지급, 이벤트 당첨 등"
                  rows={3}
                />
              </div>

              {/* 안내 메시지 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ 주의사항</strong><br />
                  • 포인트는 즉시 크리에이터 계정에 반영됩니다<br />
                  • 마이너스(-) 입력 시 포인트가 차감됩니다<br />
                  • 지급/차감 내역은 포인트 내역에서 확인 가능합니다<br />
                  • 처리 후 취소가 어려우니 신중하게 입력해주세요
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPointGrantModal(false)} disabled={grantingPoints}>
              취소
            </Button>
            <Button
              onClick={handleGrantPoints}
              disabled={grantingPoints || !pointGrantAmount || !pointGrantReason}
              className={parseInt(pointGrantAmount) < 0 ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
            >
              {grantingPoints ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  {parseInt(pointGrantAmount) < 0 ? '포인트 차감' : '포인트 지급'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
