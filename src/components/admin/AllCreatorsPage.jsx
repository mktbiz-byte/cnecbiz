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
  Users, Search, Globe, Star, MessageSquare, MessageCircle, Download,
  Instagram, Youtube, Video, Phone, Mail, Send, CheckSquare,
  X, ExternalLink, User, MapPin, CreditCard, Calendar, ChevronLeft, ChevronRight,
  Briefcase, Award, FileCheck, Key, RefreshCw, Eye, EyeOff, Check, Copy, Loader2,
  Crown, Sparkles, TrendingUp, Coins, Gift,
  AlertTriangle, AlertOctagon, XOctagon, CheckCircle, Shield, ShieldAlert, ShieldX, ShieldCheck
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import LineChatModal from './LineChatModal'
import * as XLSX from 'xlsx'

// 프로필 완성도 계산 - 스텝(섹션) 기반
// 크리에이터 프로필 폼은 스텝 단위로 채워지므로, 개별 필드가 아닌 섹션별로 판정
// DB 실데이터 기반: skin_shade(13%), personal_color(14%) 등은 제외
const PROFILE_SECTIONS = [
  {
    label: '기본 정보',
    weight: 20,
    check: (c) => !!(c.phone && c.name)
  },
  {
    label: '프로필 이미지',
    weight: 10,
    check: (c) => !!(c.profile_image || c.profile_image_url || c.avatar_url || c.profile_photo_url)
  },
  {
    label: '자기소개',
    weight: 10,
    check: (c) => !!(c.bio && c.bio.length > 0)
  },
  {
    label: 'SNS 계정',
    weight: 15,
    check: (c) => !!(c.instagram_url || c.youtube_url || c.tiktok_url || c.blog_url)
  },
  {
    label: '뷰티 프로필',
    weight: 15,
    // skin_type + (skin_concerns OR hair_type) → 스텝에서 함께 채움
    check: (c) => {
      const hasSkinType = !!(c.skin_type)
      const hasDetail = !!(c.hair_type) || hasJsonArray(c.skin_concerns) || hasJsonArray(c.hair_concerns)
      return hasSkinType && hasDetail
    }
  },
  {
    label: '콘텐츠 활동',
    weight: 15,
    // editing_level, shooting_level, content_formats, video_styles → 같은 스텝에서 함께 채움
    check: (c) => {
      const hasLevel = !!(c.editing_level || c.shooting_level)
      const hasFormat = hasJsonArray(c.content_formats) || hasJsonArray(c.video_styles)
      return hasLevel || hasFormat
    }
  },
  {
    label: '상세 프로필',
    weight: 15,
    // gender/age + 라이프스타일(nail/glasses/offline 등) → 같은 스텝
    check: (c) => {
      const hasBasic = !!(c.gender || c.age)
      const hasLifestyle = !!(c.nail_usage || c.glasses_usage || c.circle_lens_usage || c.offline_visit)
      return hasBasic && hasLifestyle
    }
  }
]

function hasJsonArray(val) {
  if (!val) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val === 'string') {
    try { const arr = JSON.parse(val); return Array.isArray(arr) && arr.length > 0 } catch { return val.length > 0 }
  }
  return false
}

function calcProfileCompleteness(creator) {
  if (!creator) return { percent: 0, filled: 0, total: PROFILE_SECTIONS.length, missing: [] }
  let totalWeight = 0
  let filledWeight = 0
  const missing = []
  let filled = 0

  for (const section of PROFILE_SECTIONS) {
    totalWeight += section.weight
    if (section.check(creator)) {
      filledWeight += section.weight
      filled++
    } else {
      missing.push(section.label)
    }
  }

  const percent = totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0
  return { percent, filled, total: PROFILE_SECTIONS.length, missing }
}

// 등급 정의
const GRADE_LEVELS = {
  1: { name: 'FRESH', label: '크넥 인증', color: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-600', lightBg: 'bg-emerald-50', borderClass: 'border-emerald-200' },
  2: { name: 'GLOW', label: '크넥 추천', color: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-600', lightBg: 'bg-blue-50', borderClass: 'border-blue-200' },
  3: { name: 'BLOOM', label: '크넥 TOP', color: '#8B5CF6', bgClass: 'bg-violet-500', textClass: 'text-violet-600', lightBg: 'bg-violet-50', borderClass: 'border-violet-200' },
  4: { name: 'ICONIC', label: '브랜드 픽', color: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-pink-600', lightBg: 'bg-pink-50', borderClass: 'border-pink-200' },
  5: { name: 'MUSE', label: '브랜드 픽', color: '#F59E0B', bgClass: 'bg-amber-500', textClass: 'text-amber-600', lightBg: 'bg-amber-50', borderClass: 'border-amber-200' }
}

// 계정 상태 정의 (가계정/찐계정 관리)
const ACCOUNT_STATUS = {
  verified: {
    name: '인증됨',
    label: '찐계정',
    icon: 'CheckCircle',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    lightBg: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    description: '검증된 진짜 계정'
  },
  warning_1: {
    name: '주의',
    label: 'Level 1',
    icon: 'AlertTriangle',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-700',
    lightBg: 'bg-yellow-50',
    borderClass: 'border-yellow-300',
    description: '의심 신호 약간 - 팔로워 대비 참여율 낮음, 급격한 팔로워 증가'
  },
  warning_2: {
    name: '경고',
    label: 'Level 2',
    icon: 'AlertOctagon',
    bgClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    lightBg: 'bg-orange-50',
    borderClass: 'border-orange-300',
    description: '명확한 부정 신호 - 봇 팔로워 의심, 비정상적 활동 패턴'
  },
  warning_3: {
    name: '위험',
    label: 'Level 3',
    icon: 'XOctagon',
    bgClass: 'bg-red-500',
    textClass: 'text-red-700',
    lightBg: 'bg-red-50',
    borderClass: 'border-red-300',
    description: '확인된 가계정 - 팔로워 구매 확인, 다수 부정 지표'
  }
}

// 주의 단계 기준 (향후 자동 분류용)
const WARNING_CRITERIA = {
  level_1: [
    '팔로워 대비 좋아요 비율 1% 미만',
    '최근 30일 내 팔로워 20% 이상 급증',
    '댓글이 대부분 이모지만 있음',
    '게시물 당 참여율 0.5% 미만'
  ],
  level_2: [
    '팔로워 대비 좋아요 비율 0.5% 미만',
    '팔로워 중 비활성 계정 30% 이상',
    '동일한 댓글이 반복됨',
    '팔로워 급증 후 급감 이력'
  ],
  level_3: [
    '팔로워 구매 서비스 사용 확인',
    '팔로워 대비 좋아요 비율 0.1% 미만',
    '봇 팔로워 50% 이상 추정',
    '조회수 조작 확인'
  ]
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

const WA_TEMPLATES = [
  { name: 'creator_selected_v2', label: '크리에이터 선정', variables: ['이름', '대시보드링크'] },
  { name: 'selection_guide_delivery_v2', label: '선정 + 가이드 전달', variables: ['이름', '가이드링크'] },
  { name: 'verification_complete_v2', label: '검증 완료', variables: ['이름', '콘텐츠제목', '날짜', '링크'] },
  { name: 'modification_request_v2', label: '수정 요청', variables: ['이름', '콘텐츠제목', '수정내용', '마감일', '링크'] },
  { name: 'points_awarded_v2', label: '포인트 지급', variables: ['이름', '포인트', '이유', '날짜', '총포인트', '링크'] },
  { name: 'payment_received_v2', label: '결제 확인', variables: ['이름', '금액', '통화', '거래ID', '날짜', '영수증링크'] },
  { name: 'account_registration_v2', label: '계정 등록 완료', variables: ['이름', '이메일', '날짜', '링크'] },
  { name: 'account_deactivation_v2', label: '계정 비활성화', variables: ['이름', '날짜', '링크'] }
]

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
  const [creatorCampaigns, setCreatorCampaigns] = useState({ inProgress: [], completed: [], applied: [] })
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

  // 계정 상태 (가계정/찐계정) 관련 상태
  const [accountStatusFilter, setAccountStatusFilter] = useState('all')
  const [profileFilter, setProfileFilter] = useState('all') // 'all' | 'incomplete' (< 70%)
  const [showAccountStatusModal, setShowAccountStatusModal] = useState(false)
  const [selectedAccountStatus, setSelectedAccountStatus] = useState(null)
  const [accountStatusNote, setAccountStatusNote] = useState('')
  const [savingAccountStatus, setSavingAccountStatus] = useState(false)

  // 일괄 등급 변경 상태
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false)
  const [bulkGradeLevel, setBulkGradeLevel] = useState(1)
  const [savingBulkGrade, setSavingBulkGrade] = useState(false)
  const [bulkGradeProgress, setBulkGradeProgress] = useState({ current: 0, total: 0 })

  // 포인트 지급 상태
  const [showPointModal, setShowPointModal] = useState(false)
  const [pointAmount, setPointAmount] = useState('')
  const [pointReason, setPointReason] = useState('')
  const [savingPoints, setSavingPoints] = useState(false)

  // 프로필 등록 요청 상태
  const [showProfileRequestModal, setShowProfileRequestModal] = useState(false)
  const [profileRequestOptions, setProfileRequestOptions] = useState({ kakao: true, email: true })
  const [sendingProfileRequest, setSendingProfileRequest] = useState(false)

  // LINE 채팅 모달 상태
  const [showLineChatModal, setShowLineChatModal] = useState(false)
  // WhatsApp 개인 발송 모달 상태
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppTarget, setWhatsAppTarget] = useState(null)
  const [whatsAppTemplate, setWhatsAppTemplate] = useState('')
  const [whatsAppVars, setWhatsAppVars] = useState({})
  const [whatsAppSending, setWhatsAppSending] = useState(false)
  const [whatsAppResult, setWhatsAppResult] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchAllCreators()
    fetchFeaturedCreators()
  }, [])

  // 탭이나 검색어, 등급필터, 계정상태필터 변경 시 페이지 초기화
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchTerm, gradeFilter, accountStatusFilter, profileFilter])

  // 필터별 인원 수 계산
  const filterCounts = useMemo(() => {
    // 현재 탭에 해당하는 크리에이터 목록
    let baseCreators = []
    if (activeTab === 'all') {
      baseCreators = [
        ...creators.korea.map(c => ({ ...c, region: '한국', dbRegion: 'korea' })),
        ...creators.japan.map(c => ({ ...c, region: '일본', dbRegion: 'japan' })),
        ...creators.us.map(c => ({ ...c, region: '미국', dbRegion: 'us' })),
        ...creators.taiwan.map(c => ({ ...c, region: '대만', dbRegion: 'taiwan' }))
      ]
    } else {
      baseCreators = creators[activeTab]?.map(c => ({
        ...c,
        region: activeTab === 'korea' ? '한국' : activeTab === 'japan' ? '일본' : activeTab === 'us' ? '미국' : '대만',
        dbRegion: activeTab
      })) || []
    }

    // 검색어 필터 적용
    let searchFiltered = baseCreators
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      searchFiltered = baseCreators.filter(creator =>
        creator.name?.toLowerCase().includes(term) ||
        creator.email?.toLowerCase().includes(term) ||
        creator.channel_name?.toLowerCase().includes(term) ||
        creator.phone?.includes(term)
      )
    }

    // 등급 카운트 계산
    const gradeCounts = {
      all: searchFiltered.length,
      none: 0,
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }

    // 계정 상태 카운트 계산
    const accountCounts = {
      all: searchFiltered.length,
      verified: 0,
      warning_1: 0,
      warning_2: 0,
      warning_3: 0,
      unclassified: 0
    }

    searchFiltered.forEach(creator => {
      // 등급 카운트
      const grade = featuredCreators.find(fc => fc.user_id === creator.id)
      if (grade && grade.cnec_grade_level) {
        gradeCounts[grade.cnec_grade_level] = (gradeCounts[grade.cnec_grade_level] || 0) + 1
      } else {
        gradeCounts.none++
      }

      // 계정 상태 카운트
      if (creator.account_status) {
        accountCounts[creator.account_status] = (accountCounts[creator.account_status] || 0) + 1
      } else {
        accountCounts.unclassified++
      }
    })

    return { gradeCounts, accountCounts, total: searchFiltered.length }
  }, [activeTab, creators, searchTerm, featuredCreators])

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

  // 등급 크리에이터 데이터 로드 (Korea DB)
  const fetchFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('featured_creators')
        .select('user_id, cnec_grade_level, cnec_grade_name, cnec_total_score, is_cnec_recommended')
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
    const featured = featuredCreators.find(fc => fc.user_id === creatorId)
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
      const existingFeatured = featuredCreators.find(fc => fc.user_id === selectedCreator.id)

      if (existingFeatured) {
        // 기존 등급 업데이트
        const { error } = await supabaseKorea
          .from('featured_creators')
          .update({
            cnec_grade_level: selectedGradeLevel,
            cnec_grade_name: gradeInfo.name,
            is_cnec_recommended: selectedGradeLevel >= 2
          })
          .eq('user_id', selectedCreator.id)

        if (error) throw error
      } else {
        // 새로 등록 (featured_creators 테이블 구조에 맞게)
        const sourceCountry = selectedCreator.dbRegion === 'japan' ? 'JP'
          : selectedCreator.dbRegion === 'us' ? 'US'
          : 'KR'

        const { error } = await supabaseKorea
          .from('featured_creators')
          .insert({
            user_id: selectedCreator.id,
            name: selectedCreator.name || selectedCreator.channel_name || '',
            profile_photo_url: selectedCreator.profile_image,
            profile_image_url: selectedCreator.profile_image,
            instagram_url: selectedCreator.instagram_url,
            instagram_followers: selectedCreator.instagram_followers || 0,
            youtube_url: selectedCreator.youtube_url,
            youtube_subscribers: selectedCreator.youtube_subscribers || 0,
            tiktok_url: selectedCreator.tiktok_url,
            tiktok_followers: selectedCreator.tiktok_followers || 0,
            bio: selectedCreator.bio,
            source_country: sourceCountry,
            primary_country: sourceCountry,
            active_regions: [selectedCreator.dbRegion || 'korea'],
            is_active: true,
            cnec_grade_level: selectedGradeLevel,
            cnec_grade_name: gradeInfo.name,
            cnec_total_score: 0,
            is_cnec_recommended: selectedGradeLevel >= 2
          })

        if (error) throw error
      }

      // user_profiles 테이블에도 등급 동기화 (지역별 DB 사용)
      const profileClient = selectedCreator.dbRegion === 'japan' ? supabaseJapan
        : selectedCreator.dbRegion === 'us' ? supabaseUS
        : supabaseKorea

      if (profileClient) {
        const { error: profileError } = await profileClient
          .from('user_profiles')
          .update({
            cnec_grade_level: selectedGradeLevel
          })
          .eq('id', selectedCreator.id)

        if (profileError) {
          console.warn('user_profiles 등급 동기화 실패:', profileError)
        }
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
      const { error } = await supabaseKorea
        .from('featured_creators')
        .delete()
        .eq('user_id', selectedCreator.id)

      if (error) throw error

      // user_profiles 테이블에서도 등급 초기화 (지역별 DB 사용)
      const profileClient = selectedCreator.dbRegion === 'japan' ? supabaseJapan
        : selectedCreator.dbRegion === 'us' ? supabaseUS
        : supabaseKorea

      if (profileClient) {
        const { error: profileError } = await profileClient
          .from('user_profiles')
          .update({
            cnec_grade_level: null
          })
          .eq('id', selectedCreator.id)

        if (profileError) {
          console.warn('user_profiles 등급 초기화 실패:', profileError)
        }
      }

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

  // 일괄 등급 변경
  const handleBulkGradeChange = async () => {
    const targetCreators = selectedCreators.filter(c => ['korea', 'japan', 'us'].includes(c.dbRegion))
    if (targetCreators.length === 0) {
      alert('등급을 변경할 크리에이터를 선택해주세요.')
      return
    }

    setSavingBulkGrade(true)
    setBulkGradeProgress({ current: 0, total: targetCreators.length })

    const gradeInfo = GRADE_LEVELS[bulkGradeLevel]
    let successCount = 0
    let failCount = 0

    try {
      for (let i = 0; i < targetCreators.length; i++) {
        const creator = targetCreators[i]
        setBulkGradeProgress({ current: i + 1, total: targetCreators.length })

        try {
          const existingFeatured = featuredCreators.find(fc => fc.user_id === creator.id)

          if (existingFeatured) {
            // 기존 등급 업데이트 (Korea DB 중앙 관리)
            const { error } = await supabaseKorea
              .from('featured_creators')
              .update({
                cnec_grade_level: bulkGradeLevel,
                cnec_grade_name: gradeInfo.name,
                is_cnec_recommended: bulkGradeLevel >= 2
              })
              .eq('user_id', creator.id)

            if (error) throw error
          } else {
            // 새로 등록
            const sourceCountry = creator.dbRegion === 'japan' ? 'JP'
              : creator.dbRegion === 'us' ? 'US'
              : 'KR'

            const { error } = await supabaseKorea
              .from('featured_creators')
              .insert({
                user_id: creator.id,
                name: creator.name || creator.channel_name || '',
                profile_photo_url: creator.profile_image,
                profile_image_url: creator.profile_image,
                instagram_url: creator.instagram_url,
                instagram_followers: creator.instagram_followers || 0,
                youtube_url: creator.youtube_url,
                youtube_subscribers: creator.youtube_subscribers || 0,
                tiktok_url: creator.tiktok_url,
                tiktok_followers: creator.tiktok_followers || 0,
                bio: creator.bio,
                source_country: sourceCountry,
                primary_country: sourceCountry,
                active_regions: [creator.dbRegion || 'korea'],
                is_active: true,
                cnec_grade_level: bulkGradeLevel,
                cnec_grade_name: gradeInfo.name,
                cnec_total_score: 0,
                is_cnec_recommended: bulkGradeLevel >= 2
              })

            if (error) throw error
          }

          // user_profiles 테이블에도 등급 동기화 (지역별 DB)
          const profileClient = creator.dbRegion === 'japan' ? supabaseJapan
            : creator.dbRegion === 'us' ? supabaseUS
            : supabaseKorea

          if (profileClient) {
            await profileClient
              .from('user_profiles')
              .update({ cnec_grade_level: bulkGradeLevel })
              .eq('id', creator.id)
          }

          successCount++
        } catch (err) {
          console.error(`${creator.name || creator.email} 등급 변경 실패:`, err)
          failCount++
        }
      }

      alert(`일괄 등급 변경 완료!\n성공: ${successCount}명\n실패: ${failCount}명`)
      setShowBulkGradeModal(false)
      setSelectedCreators([])
      await fetchFeaturedCreators()
    } catch (error) {
      console.error('일괄 등급 변경 오류:', error)
      alert('일괄 등급 변경에 실패했습니다: ' + error.message)
    } finally {
      setSavingBulkGrade(false)
      setBulkGradeProgress({ current: 0, total: 0 })
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

    // 계정 상태 필터 (가계정/찐계정)
    if (accountStatusFilter !== 'all') {
      if (accountStatusFilter === 'unclassified') {
        filtered = filtered.filter(creator => !creator.account_status)
      } else {
        filtered = filtered.filter(creator => creator.account_status === accountStatusFilter)
      }
    }

    // 프로필 완성도 필터
    if (profileFilter === 'incomplete') {
      filtered = filtered.filter(creator => calcProfileCompleteness(creator).percent < 70)
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
    setCreatorCampaigns({ inProgress: [], completed: [], applied: [] })
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

      // 진행중/완료/지원 분류
      const inProgressStatuses = ['selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'guide_confirmation', 'virtual_selected', 'sns_uploaded', 'guide_approved']
      const completedStatuses = ['completed', 'paid']
      const appliedStatuses = ['pending', 'applied', 'rejected', 'cancelled', 'withdrawn', 'force_cancelled']

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

      const applied = applications?.filter(app =>
        appliedStatuses.includes(app.status) && app.campaigns
      ).map(app => ({
        ...app,
        campaign: app.campaigns
      })) || []

      setCreatorCampaigns({ inProgress, completed, applied })
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

  // 한국 크리에이터에게 프로필 등록 요청 발송
  const handleSendProfileRegistrationRequest = async () => {
    const koreanCreators = selectedCreators.filter(c => c.dbRegion === 'korea')
    if (koreanCreators.length === 0) {
      alert('선택된 한국 크리에이터가 없습니다.')
      return
    }

    if (!profileRequestOptions.kakao && !profileRequestOptions.email) {
      alert('발송 방식을 하나 이상 선택해주세요.')
      return
    }

    setSendingProfileRequest(true)
    let kakaoSuccessCount = 0
    let kakaoFailCount = 0
    let emailSuccessCount = 0
    let emailFailCount = 0

    try {
      for (const creator of koreanCreators) {
        const creatorName = creator.name || '크리에이터'

        // 카카오 알림톡 발송
        if (profileRequestOptions.kakao && creator.phone) {
          try {
            const phoneNumber = creator.phone.replace(/-/g, '')
            const response = await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: phoneNumber,
                receiverName: creatorName,
                templateCode: '025120000931',
                variables: {
                  '회원명': creatorName
                }
              })
            })
            const result = await response.json()
            if (result.success) {
              kakaoSuccessCount++
            } else {
              kakaoFailCount++
              console.error(`카카오 발송 실패 (${creatorName}):`, result.error)
            }
          } catch (err) {
            kakaoFailCount++
            console.error(`카카오 발송 오류 (${creatorName}):`, err)
          }
        }

        // 이메일 발송
        if (profileRequestOptions.email && creator.email) {
          try {
            const response = await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: creator.email,
                subject: '[크넥] 기업의 주목도를 3배 높이는 프로필 설정, 하셨나요?',
                html: `
                  <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">CNEC</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">프로필 등록 안내</p>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                      <p style="color: #4b5563; line-height: 1.8;">안녕하세요, <strong>${creatorName}</strong>님!</p>
                      <p style="color: #4b5563; line-height: 1.8;">회원 가입을 축하 드립니다.</p>
                      <p style="color: #4b5563; line-height: 1.8;">기업들이 <strong>${creatorName}</strong>님의 역량을 한눈에 파악하고 더 많은 기회를 제안할 수 있도록 프로필을 완성해주세요.</p>

                      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0;">💡 특히, 프로필 사진은 기업의 제안율을 높이는 가장 중요한 요소입니다.</p>
                        <p style="color: #92400e; margin: 0;">지금 바로 사진을 등록하고 기업의 러브콜을 받아보세요!</p>
                      </div>

                      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: #1f2937; font-weight: bold; margin: 0 0 10px 0;">📝 지금 해야 할 일:</p>
                        <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                          <li style="margin-bottom: 5px;">프로필 사진 등록 (필수!)</li>
                          <li>피부타입 및 SNS 정보 입력!</li>
                        </ul>
                      </div>

                      <p style="color: #4b5563; line-height: 1.8;">기업은 크리에이터의 프로필을 확인할 수 있습니다.</p>
                      <p style="color: #ef4444; line-height: 1.8;"><strong>프로필이 없을 경우 지원시 선정률이 낮을 수 있습니다.</strong></p>

                      <div style="text-align: center; margin-top: 30px;">
                        <a href="https://cnecbiz.com/creator/profile" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">프로필 등록하기</a>
                      </div>
                    </div>
                    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2025 CNEC. All rights reserved.</p>
                      <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">문의: 1833-6025</p>
                    </div>
                  </div>
                `
              })
            })
            const result = await response.json()
            if (result.success !== false) {
              emailSuccessCount++
            } else {
              emailFailCount++
              console.error(`이메일 발송 실패 (${creatorName}):`, result.error)
            }
          } catch (err) {
            emailFailCount++
            console.error(`이메일 발송 오류 (${creatorName}):`, err)
          }
        }
      }

      let resultMessage = '발송 완료!\n'
      if (profileRequestOptions.kakao) {
        resultMessage += `알림톡: 성공 ${kakaoSuccessCount}건, 실패 ${kakaoFailCount}건\n`
      }
      if (profileRequestOptions.email) {
        resultMessage += `이메일: 성공 ${emailSuccessCount}건, 실패 ${emailFailCount}건`
      }
      alert(resultMessage)
      setShowProfileRequestModal(false)
      setSelectedCreators([])
    } catch (error) {
      console.error('프로필 등록 요청 발송 오류:', error)
      alert('프로필 등록 요청 발송 중 오류가 발생했습니다.')
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

    // 마이너스 지급 시 추가 확인
    if (amount < 0) {
      if (!confirm(`${Math.abs(amount).toLocaleString()}포인트를 차감하시겠습니까?`)) {
        return
      }
    }

    // 지역별 Supabase 클라이언트 선택
    const getRegionClient = (region) => {
      switch (region) {
        case 'japan': return supabaseJapan
        case 'us': return supabaseUS
        default: return supabaseKorea
      }
    }
    const regionClient = getRegionClient(pointGrantCreator.dbRegion)
    const regionCode = pointGrantCreator.dbRegion === 'japan' ? 'jp' : pointGrantCreator.dbRegion === 'us' ? 'us' : 'kr'
    const countryCode = regionCode.toUpperCase()

    if (!regionClient) {
      alert('해당 지역의 데이터베이스 연결을 찾을 수 없습니다.')
      return
    }

    setGrantingPoints(true)
    try {
      // 직접 DB 업데이트 방식
      const currentPoints = pointGrantCreator.points || 0
      const newPoints = currentPoints + amount

      // 포인트 업데이트 (지역별 DB - updated_at 컬럼이 없는 리전 대응)
      let updateError = null
      const { error: fullUpdateError } = await regionClient
        .from('user_profiles')
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', pointGrantCreator.id)

      if (fullUpdateError) {
        // updated_at 컬럼이 없는 리전(일본/미국 등)에서는 points만 업데이트
        console.warn('user_profiles full update failed, retrying without updated_at:', fullUpdateError.message)
        const { error: pointsOnlyError } = await regionClient
          .from('user_profiles')
          .update({ points: newPoints })
          .eq('id', pointGrantCreator.id)
        updateError = pointsOnlyError
      }

      if (updateError) throw updateError

      // 포인트 이력 저장 시도 (point_transactions 테이블 - 지역별 컬럼 구조 대응)
      try {
        const txData = {
          user_id: pointGrantCreator.user_id || pointGrantCreator.id,
          amount: amount,
          transaction_type: amount > 0 ? 'admin_add' : 'admin_deduct',
          description: pointGrantReason,
          created_at: new Date().toISOString()
        }

        // 일본 DB: region 컬럼 사용 / 한국·미국 DB: platform_region + country_code 사용
        if (pointGrantCreator.dbRegion === 'japan') {
          txData.region = regionCode
        } else {
          txData.platform_region = regionCode
          txData.country_code = countryCode
        }

        await regionClient
          .from('point_transactions')
          .insert(txData)
      } catch (historyError) {
        console.log('포인트 이력 저장 실패 (무시):', historyError)
      }

      const actionText = amount > 0 ? '지급' : '차감'
      alert(`${pointGrantCreator.name || '크리에이터'}님에게 ${Math.abs(amount).toLocaleString()}포인트가 ${actionText}되었습니다.\n현재 포인트: ${newPoints.toLocaleString()}`)
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

  // 계정 상태 뱃지 컴포넌트 (가계정/찐계정 표시)
  const AccountStatusBadge = ({ status, showLabel = false, size = 'sm' }) => {
    if (!status) return null

    const statusInfo = ACCOUNT_STATUS[status]
    if (!statusInfo) return null

    const sizeClasses = size === 'lg'
      ? 'px-3 py-1.5 text-sm gap-2'
      : 'px-2 py-0.5 text-xs gap-1'

    const iconSize = size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

    return (
      <span className={`inline-flex items-center ${sizeClasses} rounded-full font-bold ${statusInfo.lightBg} ${statusInfo.textClass} border-2 ${statusInfo.borderClass}`}>
        {status === 'verified' && <ShieldCheck className={iconSize} />}
        {status === 'warning_1' && <AlertTriangle className={iconSize} />}
        {status === 'warning_2' && <ShieldAlert className={iconSize} />}
        {status === 'warning_3' && <ShieldX className={iconSize} />}
        {statusInfo.name}
        {showLabel && <span className="opacity-70">({statusInfo.label})</span>}
      </span>
    )
  }

  // 계정 상태 저장 함수
  const handleSaveAccountStatus = async () => {
    if (!selectedCreator) return

    setSavingAccountStatus(true)
    try {
      // 지역에 따라 적절한 Supabase 클라이언트 선택
      const dbRegion = selectedCreator.dbRegion || 'korea'
      let supabase
      switch (dbRegion) {
        case 'japan': supabase = supabaseJapan; break
        case 'us': supabase = supabaseUS; break
        default: supabase = supabaseKorea
      }

      const updateData = {
        account_status: selectedAccountStatus,
        account_status_note: accountStatusNote || null,
        account_status_updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', selectedCreator.id)

      if (error) throw error

      // 로컬 상태 업데이트
      setCreators(prev => {
        const updated = { ...prev }
        const regionKey = dbRegion
        updated[regionKey] = updated[regionKey].map(c =>
          c.id === selectedCreator.id
            ? { ...c, ...updateData }
            : c
        )
        return updated
      })

      // 선택된 크리에이터 정보도 업데이트
      setSelectedCreator(prev => ({ ...prev, ...updateData }))

      alert('계정 상태가 저장되었습니다.')
      setShowAccountStatusModal(false)
    } catch (error) {
      console.error('계정 상태 저장 오류:', error)
      alert('계정 상태 저장에 실패했습니다: ' + error.message)
    } finally {
      setSavingAccountStatus(false)
    }
  }

  // 계정 상태 모달 열기
  const openAccountStatusModal = (creator) => {
    setSelectedCreator(creator)
    setSelectedAccountStatus(creator.account_status || null)
    setAccountStatusNote(creator.account_status_note || '')
    setShowAccountStatusModal(true)
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
              <th className="text-left p-1.5 font-medium text-gray-600">계정</th>
              <th className="text-left p-1.5 font-medium text-gray-600">이메일</th>
              <th className="text-left p-1.5 font-medium text-gray-600">휴대폰</th>
              <th className="text-left p-1.5 font-medium text-gray-600">SNS</th>
              <th className="text-left p-1.5 font-medium text-gray-600">프로필</th>
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
                  <td className="p-1.5" onClick={(e) => e.stopPropagation()}>
                    {creator.account_status ? (
                      <AccountStatusBadge status={creator.account_status} />
                    ) : (
                      <button
                        onClick={() => openAccountStatusModal(creator)}
                        className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 py-0.5 rounded"
                      >
                        미분류
                      </button>
                    )}
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
                  <td className="p-1.5">
                    {(() => {
                      const { percent } = calcProfileCompleteness(creator)
                      return (
                        <div className="flex items-center gap-1.5" title={`프로필 완성도 ${percent}%`}>
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${percent}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${percent >= 70 ? 'text-emerald-600' : percent >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{percent}%</span>
                        </div>
                      )
                    })()}
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
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {/* 한국 크리에이터가 선택된 경우에만 프로필 등록 요청 버튼 표시 */}
                        {selectedCreators.some(c => c.dbRegion === 'korea') && (
                          <>
                            <Button
                              onClick={() => {
                                setProfileRequestOptions({ kakao: true, email: true })
                                setShowProfileRequestModal(true)
                              }}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                              <User className="w-4 h-4 mr-2" />
                              프로필 등록 요청
                            </Button>
                            <Button
                              onClick={() => {
                                setBulkGradeLevel(1)
                                setShowBulkGradeModal(true)
                              }}
                              className="bg-purple-500 hover:bg-purple-600 text-white"
                            >
                              <Crown className="w-4 h-4 mr-2" />
                              일괄 등급 변경
                            </Button>
                          </>
                        )}
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
                      전체 ({filterCounts.gradeCounts.all})
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
                        {info.name} ({filterCounts.gradeCounts[level] || 0})
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
                      미등록 ({filterCounts.gradeCounts.none})
                    </button>
                  </div>
                </div>

                {/* 계정 상태 필터 (가계정/찐계정) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Shield className="w-4 h-4" /> 계정 필터:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setAccountStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        accountStatusFilter === 'all'
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      전체 ({filterCounts.accountCounts.all})
                    </button>
                    <button
                      onClick={() => setAccountStatusFilter('verified')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        accountStatusFilter === 'verified'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" /> 찐계정 ({filterCounts.accountCounts.verified})
                    </button>
                    <button
                      onClick={() => setAccountStatusFilter('warning_1')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        accountStatusFilter === 'warning_1'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" /> 주의 ({filterCounts.accountCounts.warning_1})
                    </button>
                    <button
                      onClick={() => setAccountStatusFilter('warning_2')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        accountStatusFilter === 'warning_2'
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      <ShieldAlert className="w-3 h-3" /> 경고 ({filterCounts.accountCounts.warning_2})
                    </button>
                    <button
                      onClick={() => setAccountStatusFilter('warning_3')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                        accountStatusFilter === 'warning_3'
                          ? 'bg-red-500 text-white'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <ShieldX className="w-3 h-3" /> 위험 ({filterCounts.accountCounts.warning_3})
                    </button>
                    <button
                      onClick={() => setAccountStatusFilter('unclassified')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        accountStatusFilter === 'unclassified'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      미분류 ({filterCounts.accountCounts.unclassified})
                    </button>
                  </div>
                </div>

                {/* 프로필 완성도 필터 */}
                <div>
                  <span className="text-xs text-gray-500 mr-2">프로필:</span>
                  <div className="flex gap-1 inline-flex">
                    <button
                      onClick={() => setProfileFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        profileFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      전체
                    </button>
                    <button
                      onClick={() => setProfileFilter('incomplete')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        profileFilter === 'incomplete' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      미완성 (&lt;70%)
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              크리에이터 프로필
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="flex-1 overflow-y-auto space-y-6 py-2 -mx-6 px-6">
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
                    {selectedCreator.account_status && (
                      <AccountStatusBadge status={selectedCreator.account_status} showLabel />
                    )}
                  </div>
                  <p className="text-gray-500">{selectedCreator.email}</p>
                  {selectedCreator.phone && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-4 h-4" /> {selectedCreator.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* 계정 상태 설정 (가계정/찐계정) */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> 계정 상태
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAccountStatusModal(selectedCreator)}
                    className="text-xs"
                  >
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    상태 설정
                  </Button>
                </div>
                {selectedCreator.account_status ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AccountStatusBadge status={selectedCreator.account_status} size="lg" showLabel />
                    </div>
                    {selectedCreator.account_status_note && (
                      <p className="text-sm text-gray-600 bg-white rounded-lg p-2 border">
                        <span className="font-medium">메모:</span> {selectedCreator.account_status_note}
                      </p>
                    )}
                    {selectedCreator.account_status_updated_at && (
                      <p className="text-xs text-gray-400">
                        최종 업데이트: {new Date(selectedCreator.account_status_updated_at).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">계정 상태가 설정되지 않았습니다. (미분류)</p>
                )}
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

              {/* 프로필 완성도 */}
              {(() => {
                const comp = calcProfileCompleteness(selectedCreator)
                return (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> 프로필 완성도
                      </h4>
                      <span className={`text-lg font-bold ${comp.percent >= 70 ? 'text-emerald-600' : comp.percent >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {comp.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                      <div className={`h-2.5 rounded-full transition-all ${comp.percent >= 70 ? 'bg-emerald-500' : comp.percent >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${comp.percent}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{comp.filled}/{comp.total}개 항목 완료</p>
                    {comp.missing.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {comp.missing.map(m => (
                          <span key={m} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-500 rounded">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* 뷰티 프로필 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> 뷰티 프로필
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">피부타입</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.skin_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">피부톤</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.skin_shade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">퍼스널컬러</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.personal_color || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">모발타입</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.hair_type || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">피부고민</p>
                    <p className="text-sm font-medium text-gray-800">
                      {(() => {
                        const sc = selectedCreator.skin_concerns
                        if (!sc) return '-'
                        if (Array.isArray(sc)) return sc.join(', ') || '-'
                        if (typeof sc === 'string') return sc || '-'
                        return '-'
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">주요 관심사</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.primary_interest || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">성별 / 나이</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selectedCreator.gender || '-'} / {selectedCreator.age || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">편집 능력</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.editing_level || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">촬영 능력</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.shooting_level || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">팔로워 규모</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.follower_range || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">업로드 빈도</p>
                    <p className="text-sm font-medium text-gray-800">{selectedCreator.upload_frequency || '-'}</p>
                  </div>
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
                  <p className="text-2xl font-bold text-amber-700">{(selectedCreator.points || 0).toLocaleString()}P</p>
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
                                    {app.status === 'sns_uploaded' && 'SNS 업로드'}
                                    {app.status === 'guide_approved' && '가이드승인'}
                                    {!['selected', 'approved', 'filming', 'video_submitted', 'revision_requested', 'guide_confirmation', 'virtual_selected', 'sns_uploaded', 'guide_approved'].includes(app.status) && app.status}
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

                    {/* 지원한 캠페인 */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                        <Send className="w-3 h-3" /> 지원 이력 ({creatorCampaigns.applied.length})
                      </h5>
                      {creatorCampaigns.applied.length > 0 ? (
                        <div className="space-y-2">
                          {creatorCampaigns.applied.slice(0, 5).map((app) => (
                            <div
                              key={app.id}
                              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-400 cursor-pointer transition-colors"
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
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                    app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {app.status === 'pending' && '대기중'}
                                    {app.status === 'applied' && '지원함'}
                                    {app.status === 'rejected' && '미선정'}
                                    {app.status === 'cancelled' && '취소됨'}
                                    {app.status === 'withdrawn' && '지원취소'}
                                    {!['pending', 'applied', 'rejected', 'cancelled', 'withdrawn'].includes(app.status) && app.status}
                                  </span>
                                  <ExternalLink className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                지원일: {new Date(app.created_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          ))}
                          {creatorCampaigns.applied.length > 5 && (
                            <p className="text-xs text-gray-400 text-center">외 {creatorCampaigns.applied.length - 5}건 더 있음</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm">지원 이력이 없습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t pt-4 mt-4 flex flex-wrap gap-2 justify-end">
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
            <Button
              variant="outline"
              onClick={() => openPointGrantModal(selectedCreator)}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <Coins className="w-4 h-4 mr-2" />
              포인트 지급
            </Button>
            {selectedCreator?.dbRegion === 'japan' && (
              <Button
                variant="outline"
                onClick={() => setShowLineChatModal(true)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                LINE 채팅
              </Button>
            )}
            {selectedCreator?.dbRegion === 'us' && selectedCreator?.phone && (
              <Button
                variant="outline"
                onClick={() => {
                  setWhatsAppTarget(selectedCreator)
                  setShowWhatsAppModal(true)
                }}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
            <Button onClick={() => {
              setShowProfileModal(false)
              openReviewModal(selectedCreator, selectedCreator?.dbRegion)
            }}>
              <Star className="w-4 h-4 mr-2" />
              평가하기
            </Button>
          </div>
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
                  • 크넥 추천(Lv.2) 이상은 추천 크리에이터로 표시됩니다
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

      {/* 계정 상태 설정 모달 (가계정/찐계정) */}
      <Dialog open={showAccountStatusModal} onOpenChange={setShowAccountStatusModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              계정 상태 설정
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 크리에이터 정보 */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {selectedCreator.profile_image ? (
                    <img src={selectedCreator.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-indigo-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCreator.name || '이름 없음'}</h3>
                  <p className="text-sm text-gray-500">{selectedCreator.email}</p>
                </div>
              </div>

              {/* 상태 선택 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">계정 상태 선택</label>

                {/* 찐계정 (인증됨) */}
                <button
                  onClick={() => setSelectedAccountStatus('verified')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAccountStatus === 'verified'
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-emerald-700">찐계정 (인증됨)</p>
                    <p className="text-xs text-gray-500">검증된 진짜 계정 - 정상적인 활동 확인</p>
                  </div>
                  {selectedAccountStatus === 'verified' && (
                    <Check className="w-5 h-5 text-emerald-600" />
                  )}
                </button>

                {/* 주의 레벨 */}
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">⚠️ 주의 단계 (가계정 의심)</p>
                </div>

                {/* Level 1 - 주의 */}
                <button
                  onClick={() => setSelectedAccountStatus('warning_1')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAccountStatus === 'warning_1'
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-yellow-700">Level 1 - 주의</p>
                    <p className="text-xs text-gray-500">팔로워 대비 참여율 낮음, 급격한 팔로워 증가</p>
                  </div>
                  {selectedAccountStatus === 'warning_1' && (
                    <Check className="w-5 h-5 text-yellow-600" />
                  )}
                </button>

                {/* Level 2 - 경고 */}
                <button
                  onClick={() => setSelectedAccountStatus('warning_2')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAccountStatus === 'warning_2'
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-orange-700">Level 2 - 경고</p>
                    <p className="text-xs text-gray-500">명확한 부정 신호, 봇 팔로워 의심</p>
                  </div>
                  {selectedAccountStatus === 'warning_2' && (
                    <Check className="w-5 h-5 text-orange-600" />
                  )}
                </button>

                {/* Level 3 - 위험 */}
                <button
                  onClick={() => setSelectedAccountStatus('warning_3')}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedAccountStatus === 'warning_3'
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-100 hover:border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white">
                    <ShieldX className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-red-700">Level 3 - 위험</p>
                    <p className="text-xs text-gray-500">확인된 가계정, 팔로워 구매 확인</p>
                  </div>
                  {selectedAccountStatus === 'warning_3' && (
                    <Check className="w-5 h-5 text-red-600" />
                  )}
                </button>
              </div>

              {/* 메모 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">메모 (선택사항)</label>
                <Textarea
                  value={accountStatusNote}
                  onChange={(e) => setAccountStatusNote(e.target.value)}
                  placeholder="계정 상태 설정 이유나 특이사항을 기록하세요..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* 주의 단계 기준 안내 */}
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                <p className="font-semibold mb-2">📋 주의 단계 판단 기준</p>
                <ul className="space-y-1">
                  <li><span className="text-yellow-600 font-medium">Lv.1:</span> 팔로워 대비 좋아요 1% 미만, 30일 내 팔로워 20%↑</li>
                  <li><span className="text-orange-600 font-medium">Lv.2:</span> 좋아요 0.5% 미만, 비활성 팔로워 30%↑, 동일 댓글 반복</li>
                  <li><span className="text-red-600 font-medium">Lv.3:</span> 팔로워 구매 확인, 좋아요 0.1% 미만, 봇 50%↑</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {selectedCreator?.account_status && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAccountStatus(null)
                  setAccountStatusNote('')
                }}
                disabled={savingAccountStatus}
                className="text-gray-600"
              >
                상태 초기화
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAccountStatusModal(false)} disabled={savingAccountStatus}>
              취소
            </Button>
            <Button
              onClick={handleSaveAccountStatus}
              disabled={savingAccountStatus}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {savingAccountStatus ? (
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

      {/* 일괄 등급 변경 모달 */}
      <Dialog open={showBulkGradeModal} onOpenChange={setShowBulkGradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              일괄 등급 변경
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 선택된 크리에이터 정보 */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">선택된 크리에이터</span>
                <span className="text-lg font-bold text-purple-600">
                  {selectedCreators.filter(c => c.dbRegion === 'korea').length}명
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (한국 크리에이터만 등급 변경 가능)
              </p>
              {selectedCreators.filter(c => c.dbRegion !== 'korea').length > 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  ⚠️ 다른 지역 크리에이터 {selectedCreators.filter(c => c.dbRegion !== 'korea').length}명은 제외됩니다
                </p>
              )}
            </div>

            {/* 등급 선택 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">변경할 등급 선택</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(GRADE_LEVELS).map(([level, info]) => (
                  <button
                    key={level}
                    onClick={() => setBulkGradeLevel(parseInt(level))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      bulkGradeLevel === parseInt(level)
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
                    {bulkGradeLevel === parseInt(level) && (
                      <Check className={`w-5 h-5 ${info.textClass}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 진행 상황 */}
            {savingBulkGrade && bulkGradeProgress.total > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">진행 중...</span>
                  <span className="text-sm text-purple-600">
                    {bulkGradeProgress.current} / {bulkGradeProgress.total}
                  </span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${(bulkGradeProgress.current / bulkGradeProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 안내</strong><br />
                • 선택된 모든 한국 크리에이터의 등급이 변경됩니다<br />
                • 크넥 추천(Lv.2) 이상은 추천 크리에이터로 표시됩니다
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkGradeModal(false)}
              disabled={savingBulkGrade}
            >
              취소
            </Button>
            <Button
              onClick={handleBulkGradeChange}
              disabled={savingBulkGrade || selectedCreators.filter(c => c.dbRegion === 'korea').length === 0}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {savingBulkGrade ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  변경 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {selectedCreators.filter(c => c.dbRegion === 'korea').length}명 등급 변경
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
                  <p className="text-xs text-green-600 mt-1">
                    {pointGrantCreator.dbRegion === 'japan' ? '🇯🇵 일본' : pointGrantCreator.dbRegion === 'us' ? '🇺🇸 미국' : '🇰🇷 한국'} 크리에이터
                  </p>
                </div>
              </div>

              {/* 지급 금액 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">포인트 금액</label>
                <Input
                  type="number"
                  value={pointGrantAmount}
                  onChange={(e) => setPointGrantAmount(e.target.value)}
                  placeholder="예: 10000 (마이너스: -10000)"
                  className="text-lg"
                />
                {pointGrantAmount && parseInt(pointGrantAmount) !== 0 && (
                  <p className={`text-sm ${parseInt(pointGrantAmount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(parseInt(pointGrantAmount)).toLocaleString()}P {parseInt(pointGrantAmount) > 0 ? '지급' : '차감'} 예정
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

      {/* 프로필 등록 요청 모달 */}
      <Dialog open={showProfileRequestModal} onOpenChange={setShowProfileRequestModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-500" />
              프로필 등록 요청 발송
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 발송 대상 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>📢 발송 대상:</strong> 선택된 <strong>한국 크리에이터</strong>에게만 발송됩니다.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                선택됨: {selectedCreators.length}명 중 한국 크리에이터 {selectedCreators.filter(c => c.dbRegion === 'korea').length}명
              </p>
            </div>

            {/* 발송 방식 선택 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">발송 방식</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-yellow-300 ${profileRequestOptions.kakao ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}">
                  <input
                    type="checkbox"
                    checked={profileRequestOptions.kakao}
                    onChange={(e) => setProfileRequestOptions(prev => ({ ...prev, kakao: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">카카오 알림톡</p>
                      <p className="text-xs text-gray-500">전화번호가 있는 크리에이터에게 발송</p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-indigo-300 ${profileRequestOptions.email ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}">
                  <input
                    type="checkbox"
                    checked={profileRequestOptions.email}
                    onChange={(e) => setProfileRequestOptions(prev => ({ ...prev, email: e.target.checked }))}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">이메일</p>
                      <p className="text-xs text-gray-500">이메일이 있는 크리에이터에게 발송</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 발송 내용 미리보기 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">📋 발송 내용 미리보기</p>
              <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-lg border">
                <p><strong>[크넥] 기업의 주목도를 3배 높이는 프로필 설정, 하셨나요?</strong></p>
                <p>안녕하세요, [크리에이터명]님 회원 가입을 축하 드립니다.</p>
                <p>기업들이 역량을 한눈에 파악하고 더 많은 기회를 제안할 수 있도록 프로필을 완성해주세요.</p>
                <p className="text-amber-600">• 프로필 사진 등록 (필수!)</p>
                <p className="text-amber-600">• 피부타입 및 SNS 정보 입력!</p>
              </div>
            </div>

            {/* 주의사항 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ 주의사항</strong><br />
                • 한국 크리에이터에게만 발송됩니다<br />
                • 알림톡은 전화번호가 있는 크리에이터에게만 발송됩니다<br />
                • 이메일은 이메일 주소가 있는 크리에이터에게만 발송됩니다
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowProfileRequestModal(false)} disabled={sendingProfileRequest}>
              취소
            </Button>
            <Button
              onClick={handleSendProfileRegistrationRequest}
              disabled={sendingProfileRequest || (!profileRequestOptions.kakao && !profileRequestOptions.email)}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              {sendingProfileRequest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  발송하기 ({selectedCreators.filter(c => c.dbRegion === 'korea').length}명)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LINE 채팅 모달 */}
      <LineChatModal
        open={showLineChatModal}
        onOpenChange={setShowLineChatModal}
        creator={selectedCreator}
        region={selectedCreator?.dbRegion || 'japan'}
      />

      {/* WhatsApp 개인 발송 모달 */}
      <Dialog open={showWhatsAppModal} onOpenChange={(open) => { setShowWhatsAppModal(open); if (!open) { setWhatsAppResult(null); setWhatsAppTemplate(''); setWhatsAppVars({}) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              WhatsApp 발송 — {whatsAppTarget?.name || '크리에이터'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <p className="text-green-800">전화번호: {whatsAppTarget?.phone || '없음'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">템플릿 선택</label>
              <select
                value={whatsAppTemplate}
                onChange={(e) => {
                  const name = e.target.value
                  setWhatsAppTemplate(name)
                  setWhatsAppResult(null)
                  const tmpl = WA_TEMPLATES.find(t => t.name === name)
                  if (tmpl) {
                    const defaults = {}
                    tmpl.variables.forEach((v, i) => {
                      if (v === '이름') defaults[String(i + 1)] = whatsAppTarget?.name || 'Creator'
                      else if (v.includes('링크')) defaults[String(i + 1)] = 'https://cnec.us/creator/mypage'
                      else if (v === '날짜') defaults[String(i + 1)] = new Date().toLocaleDateString('en-US')
                      else defaults[String(i + 1)] = ''
                    })
                    setWhatsAppVars(defaults)
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">-- 템플릿 선택 --</option>
                {WA_TEMPLATES.map(t => (
                  <option key={t.name} value={t.name}>{t.label}</option>
                ))}
              </select>
            </div>

            {whatsAppTemplate && WA_TEMPLATES.find(t => t.name === whatsAppTemplate) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">변수</label>
                {WA_TEMPLATES.find(t => t.name === whatsAppTemplate).variables.map((varLabel, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 flex-shrink-0">{`{{${i + 1}}} ${varLabel}`}</span>
                    <input
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      value={whatsAppVars[String(i + 1)] || ''}
                      onChange={(e) => setWhatsAppVars(prev => ({ ...prev, [String(i + 1)]: e.target.value }))}
                      placeholder={varLabel}
                    />
                  </div>
                ))}
              </div>
            )}

            {whatsAppResult && (
              <div className={`p-3 rounded-lg text-sm ${whatsAppResult.success ? 'bg-blue-50 border border-blue-200 text-blue-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {whatsAppResult.success ? '발송 성공!' : `실패: ${whatsAppResult.error || '알 수 없는 오류'}`}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWhatsAppModal(false)}>닫기</Button>
              <Button
                disabled={whatsAppSending || !whatsAppTemplate || !whatsAppTarget?.phone}
                onClick={async () => {
                  setWhatsAppSending(true)
                  setWhatsAppResult(null)
                  try {
                    const res = await fetch('/.netlify/functions/send-whatsapp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        mode: 'single',
                        creatorId: whatsAppTarget?.id,
                        phoneNumber: whatsAppTarget?.phone,
                        creatorName: whatsAppTarget?.name,
                        templateName: whatsAppTemplate,
                        variables: whatsAppVars,
                        sentBy: 'admin'
                      })
                    })
                    const data = await res.json()
                    setWhatsAppResult(data)
                  } catch (err) {
                    setWhatsAppResult({ success: false, error: err.message })
                  } finally {
                    setWhatsAppSending(false)
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {whatsAppSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 발송 중...</> : <><Send className="w-4 h-4 mr-2" /> 발송</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
