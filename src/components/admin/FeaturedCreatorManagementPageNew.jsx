import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Star, Plus, Edit, Trash2, Loader2, Mail, Send,
  TrendingUp, Users, Award, DollarSign, Sparkles, CheckCircle2, Search, Crown
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseBiz, supabaseKorea, getSupabaseClient } from '../../lib/supabaseClients'
import {
  GRADE_LEVELS,
  BADGE_TYPES,
  calculateInitialGrade,
  saveCreatorGrade,
  searchCreatorsFromRegions,
  registerFeaturedCreator
} from '../../services/creatorGradeService'

export default function FeaturedCreatorManagementPageNew() {
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'youtube',
    channel_name: '',
    channel_url: '',
    regions: [],
    supported_campaigns: [] // 지원 가능한 캠페인 유형
  })
  
  const [capiResult, setCapiResult] = useState(null)
  const [regionFilter, setRegionFilter] = useState('all')
  
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)

  // 리포트 발송 모달
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [reportEmail, setReportEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sendingReport, setSendingReport] = useState(false)

  // CNEC Plus state
  const [activeTab, setActiveTab] = useState('graded')  // 기본 탭을 등급제로 변경
  const [cnecPlusCreators, setCnecPlusCreators] = useState([])
  const [showCnecPlusForm, setShowCnecPlusForm] = useState(false)
  const [showCnecPlusCreatorModal, setShowCnecPlusCreatorModal] = useState(false)
  const [selectedCnecPlusRegion, setSelectedCnecPlusRegion] = useState('korea')
  const [cnecPlusSearchQuery, setCnecPlusSearchQuery] = useState('')
  const [cnecPlusRegisteredCreators, setCnecPlusRegisteredCreators] = useState([])
  const [loadingCnecPlusCreators, setLoadingCnecPlusCreators] = useState(false)
  const [cnecPlusFormData, setCnecPlusFormData] = useState({
    creator_name: '',
    creator_region: '',
    channel_url: '',
    profile_image: '',
    platform: '',
    price_per_video: '',
    display_order: 0
  })

  // 등급제 크리에이터 state
  const [gradedCreators, setGradedCreators] = useState([])
  const [loadingGraded, setLoadingGraded] = useState(false)
  const [showGradedCreatorModal, setShowGradedCreatorModal] = useState(false)
  const [gradedSearchQuery, setGradedSearchQuery] = useState('')
  const [gradedSearchRegions, setGradedSearchRegions] = useState(['korea', 'japan', 'us'])
  const [gradedSearchResults, setGradedSearchResults] = useState([])
  const [searchingGraded, setSearchingGraded] = useState(false)
  const [selectedGradedCreator, setSelectedGradedCreator] = useState(null)
  const [gradeFilter, setGradeFilter] = useState('all')

  // 프로필 편집 모달 state
  const [showProfileEditModal, setShowProfileEditModal] = useState(false)
  const [editingCreator, setEditingCreator] = useState(null)
  const [profileFormData, setProfileFormData] = useState({
    bio: '',
    categories: [],
    rating: 0
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // 크리에이터 카테고리 목록
  const CREATOR_CATEGORIES = [
    { id: 'skincare', name: '스킨케어', emoji: '🧴' },
    { id: 'makeup', name: '색조', emoji: '💄' },
    { id: 'diet', name: '다이어트', emoji: '🏃' },
    { id: 'haircare', name: '헤어케어', emoji: '💇' },
    { id: 'fashion', name: '패션', emoji: '👗' },
    { id: 'lifestyle', name: '라이프스타일', emoji: '🏠' },
    { id: 'food', name: '먹방/요리', emoji: '🍳' },
    { id: 'family', name: '가족출연', emoji: '👨‍👩‍👧' },
    { id: 'pet', name: '반려동물', emoji: '🐶' },
    { id: 'travel', name: '여행', emoji: '✈️' },
    { id: 'tech', name: '테크/IT', emoji: '📱' },
    { id: 'game', name: '게임', emoji: '🎮' }
  ]

  // Registered creator selection
  const [showCreatorSelectModal, setShowCreatorSelectModal] = useState(false)
  const [selectedRegionForSearch, setSelectedRegionForSearch] = useState('korea')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [registeredCreators, setRegisteredCreators] = useState([])
  const [loadingCreators, setLoadingCreators] = useState(false)

  useEffect(() => {
    loadFeaturedCreators()
    loadCnecPlusCreators()
    loadGradedCreators()
  }, [])

  // 등급제 크리에이터 목록 로드 (Korea Supabase)
  const loadGradedCreators = async () => {
    setLoadingGraded(true)
    try {
      const { data, error } = await supabaseKorea
        .from('featured_creators')
        .select('*')
        .eq('is_active', true)
        .not('cnec_grade_level', 'is', null)
        .order('cnec_grade_level', { ascending: false })
        .order('cnec_total_score', { ascending: false })

      if (error) throw error
      setGradedCreators(data || [])
    } catch (err) {
      console.error('등급제 크리에이터 로드 오류:', err)
      // 테이블에 컬럼이 없는 경우 전체 크리에이터 로드
      try {
        const { data } = await supabaseKorea
          .from('featured_creators')
          .select('*')
          .eq('is_active', true)
          .order('capi_score', { ascending: false, nullsLast: true })
        setGradedCreators(data || [])
      } catch (e) {
        console.error('Fallback 로드 오류:', e)
      }
    } finally {
      setLoadingGraded(false)
    }
  }

  // 3개 지역 DB에서 크리에이터 검색
  const handleSearchGradedCreators = async () => {
    setSearchingGraded(true)
    try {
      const results = await searchCreatorsFromRegions(gradedSearchQuery, gradedSearchRegions)
      setGradedSearchResults(results)
    } catch (err) {
      console.error('크리에이터 검색 오류:', err)
      alert('검색 중 오류가 발생했습니다.')
    } finally {
      setSearchingGraded(false)
    }
  }

  // 크리에이터를 추천 크리에이터로 등록
  const handleRegisterGradedCreator = async (creator) => {
    try {
      const result = await registerFeaturedCreator(creator, creator.source_region)
      if (result.success) {
        alert(`${creator.name || creator.channel_name}님이 추천 크리에이터로 등록되었습니다.\n등급: ${result.gradeInfo.gradeName}`)
        setShowGradedCreatorModal(false)
        setGradedSearchResults([])
        setGradedSearchQuery('')
        await loadGradedCreators()
        await loadFeaturedCreators()
      } else {
        throw result.error
      }
    } catch (err) {
      console.error('등록 오류:', err)
      alert('등록 중 오류가 발생했습니다: ' + err.message)
    }
  }

  // 등급 수동 업데이트 (Korea Supabase)
  const handleUpdateGrade = async (creatorId, newGradeLevel, isManualMuse = false) => {
    try {
      const gradeName = GRADE_LEVELS[newGradeLevel].name
      const { error } = await supabaseKorea
        .from('featured_creators')
        .update({
          cnec_grade_level: newGradeLevel,
          cnec_grade_name: gradeName,
          is_cnec_recommended: newGradeLevel >= 2
        })
        .eq('id', creatorId)

      if (error) throw error

      alert(`등급이 ${gradeName}(으)로 변경되었습니다.`)
      await loadGradedCreators()
    } catch (err) {
      console.error('등급 업데이트 오류:', err)
      alert('등급 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 프로필 편집 모달 열기
  const openProfileEditModal = (creator) => {
    setEditingCreator(creator)
    setProfileFormData({
      bio: creator.bio || '',
      categories: creator.categories || [],
      rating: creator.rating || 0
    })
    setShowProfileEditModal(true)
  }

  // 프로필 저장 (Korea Supabase)
  const handleSaveProfile = async () => {
    if (!editingCreator) return

    setSavingProfile(true)
    try {
      const { error } = await supabaseKorea
        .from('featured_creators')
        .update({
          bio: profileFormData.bio,
          categories: profileFormData.categories,
          rating: parseFloat(profileFormData.rating) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCreator.id)

      if (error) throw error

      alert('프로필이 저장되었습니다.')
      setShowProfileEditModal(false)
      await loadGradedCreators()
    } catch (err) {
      console.error('프로필 저장 오류:', err)
      alert('프로필 저장에 실패했습니다: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  // 카테고리 토글
  const toggleCategory = (categoryId) => {
    setProfileFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(c => c !== categoryId)
        : [...prev.categories, categoryId]
    }))
  }

  // 등급별 필터링된 크리에이터 목록
  const filteredGradedCreators = gradeFilter === 'all'
    ? gradedCreators
    : gradedCreators.filter(c => c.cnec_grade_level === parseInt(gradeFilter))

  const loadFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('capi_score', { ascending: false, nullsLast: true })

      if (error) throw error
      setFeaturedCreators(data || [])
    } catch (err) {
      console.error('Error loading featured creators:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCnecPlusCreators = async () => {
    try {
      const { data: pricingData, error: pricingError } = await supabaseBiz
        .from('cnec_plus_pricing')
        .select('*')
        .order('display_order', { ascending: true })

      if (pricingError) throw pricingError

      // Manually fetch creator data for each pricing entry
      const creatorsWithPricing = await Promise.all(
        (pricingData || []).map(async (pricing) => {
          const { data: creator, error: creatorError } = await supabaseBiz
            .from('featured_creators')
            .select('id, name, profile_image_url, capi_score, capi_grade, active_regions, primary_country')
            .eq('id', pricing.creator_id)
            .single()

          return {
            ...pricing,
            featured_creators: creator
          }
        })
      )

      setCnecPlusCreators(creatorsWithPricing)
    } catch (err) {
      console.error('Error loading CNEC Plus creators:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePlatformChange = (value) => {
    setFormData(prev => ({ 
      ...prev, 
      platform: value,
      channel_url: '' // Clear channel URL when platform changes
    }))
  }

  const handleRegionToggle = (region) => {
    setFormData(prev => {
      const regions = prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
      return { ...prev, regions }
    })
  }

  const getRegionName = (code) => {
    const names = { japan: '일본', us: '미국', taiwan: '대만', korea: '한국' }
    return names[code]
  }

  const getRegionFlag = (code) => {
    const flags = { japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼', korea: '🇰🇷' }
    return flags[code]
  }

  const handleCampaignToggle = (campaign) => {
    setFormData(prev => {
      const campaigns = prev.supported_campaigns.includes(campaign)
        ? prev.supported_campaigns.filter(c => c !== campaign)
        : [...prev.supported_campaigns, campaign]
      return { ...prev, supported_campaigns: campaigns }
    })
  }

  const getCampaignName = (code) => {
    const names = {
      'package': '패키지 기획형',
      'oliveyoung': '올리브영',
      '4week': '4주 챌린지'
    }
    return names[code]
  }

  const getGradeColor = (grade) => {
    const colors = {
      'S': 'bg-purple-100 text-purple-800 border-purple-300',
      'A': 'bg-blue-100 text-blue-800 border-blue-300',
      'B': 'bg-green-100 text-green-800 border-green-300',
      'C': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'D': 'bg-orange-100 text-orange-800 border-orange-300',
      'F': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[grade] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const handleGenerateCapiProfile = async () => {
    if (!formData.channel_url) {
      alert('채널 URL을 입력해주세요.')
      return
    }

    setAnalyzing(true)

    try {
      // Call CAPI generation API (video URLs will be auto-selected)
      const response = await fetch('/.netlify/functions/generate-capi-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl: formData.channel_url,
          platform: formData.platform
          // videoUrls will be auto-selected by the API
        })
      })

      if (!response.ok) {
        throw new Error('CAPI 분석 실패')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'CAPI 분석 실패')
      }

      setCapiResult(result.analysis)
      alert('CAPI 분석이 완료되었습니다!')

    } catch (err) {
      console.error('Error generating CAPI profile:', err)
      alert('CAPI 분석 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const calculateCapiGrade = (score) => {
    if (score >= 90) return 'S'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const handleSave = async () => {
    if (!capiResult) {
      alert('먼저 CAPI 분석을 진행해주세요.')
      return
    }

    if (formData.regions.length === 0) {
      alert('최소 1개 이상의 활동 지역을 선택해주세요.')
      return
    }



    try {
      const contentScore = capiResult.total_content_score || 0
      const activityScore = capiResult.activity_total_score || capiResult.activity_score || 0
      const totalScore = capiResult.total_score || (contentScore + activityScore)
      const grade = capiResult.grade || calculateCapiGrade(totalScore)
      const reliability = capiResult.reliability || 0

      // Get channel info from CAPI result
      const channelInfo = capiResult.channel_info || {}
      const channelName = channelInfo.channel_name || formData.channel_name || 'Unknown'
      
      const newCreator = {
        // Required fields
        user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID for CAPI-only creators
        source_country: formData.regions[0] || 'korea',
        name: channelName,
        primary_country: formData.regions[0] || 'korea',
        
        // Optional profile fields
        profile_image_url: channelInfo.profile_image_url || null,
        bio: channelInfo.bio || null,
        
        // Platform handles and followers
        instagram_handle: formData.platform === 'instagram' ? channelInfo.handle : null,
        instagram_followers: formData.platform === 'instagram' ? channelInfo.followers : null,
        youtube_handle: formData.platform === 'youtube' ? channelInfo.handle : null,
        youtube_subscribers: formData.platform === 'youtube' ? channelInfo.followers : null,
        tiktok_handle: formData.platform === 'tiktok' ? channelInfo.handle : null,
        tiktok_followers: formData.platform === 'tiktok' ? channelInfo.followers : null,
        
        // CAPI fields
        supported_campaigns: formData.supported_campaigns,
        capi_score: totalScore,
        capi_grade: grade,
        capi_content_score: contentScore,
        capi_activity_score: activityScore,
        capi_reliability: reliability,
        capi_analysis: capiResult,
        capi_generated_at: new Date().toISOString(),
        
        // Metadata
        featured_type: 'capi',
        is_active: true,
        active_regions: formData.regions
      }

      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .insert([newCreator])
        .select()

      if (error) {
        console.error('[CAPI SAVE ERROR] Supabase error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          full_error: JSON.stringify(error)
        })
        console.error('[CAPI SAVE ERROR] Attempted to save:', JSON.stringify(newCreator, null, 2))
        throw error
      }

      alert('크리에이터가 저장되었습니다!')
      await loadFeaturedCreators()
      setShowForm(false)
      setFormData({
        platform: 'youtube',
        channel_name: '',
        channel_url: '',
        regions: [],
        supported_campaigns: []
      })
      setCapiResult(null)
    } catch (err) {
      console.error('[CAPI SAVE ERROR] Exception:', err)
      console.error('[CAPI SAVE ERROR] Error code:', err.code)
      console.error('[CAPI SAVE ERROR] Error message:', err.message)
      console.error('[CAPI SAVE ERROR] Error details:', err.details)
      console.error('[CAPI SAVE ERROR] Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
      alert('저장 중 오류가 발생했습니다: ' + (err.message || JSON.stringify(err)))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 이 크리에이터를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('크리에이터가 삭제되었습니다.')
      setFeaturedCreators(featuredCreators.filter(c => c.id !== id))
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제 처리 중 오류가 발생했습니다.')
    }
  }

  const handleOpenReportModal = (creator) => {
    setSelectedCreator(creator)
    setReportEmail('') // Should load from user_profiles
    setCustomMessage('')
    setShowReportModal(true)
  }

  const handleSendReport = async () => {
    if (!reportEmail.trim()) {
      alert('이메일 주소를 입력해주세요.')
      return
    }

    setSendingReport(true)

    try {
      const response = await fetch('/.netlify/functions/send-growth-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator.id,
          creatorEmail: reportEmail,
          creatorName: selectedCreator.channel_name,
          channelName: selectedCreator.channel_name,
          platform: selectedCreator.platform,
          capiScore: selectedCreator.capi_score,
          capiGrade: selectedCreator.capi_grade,
          capiAnalysis: selectedCreator.capi_analysis,
          sentBy: null, // Should get from auth
          customMessage: customMessage
        })
      })

      if (!response.ok) {
        throw new Error('리포트 발송 실패')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '리포트 발송 실패')
      }

      alert('성장 가이드 리포트가 발송되었습니다!')
      setShowReportModal(false)

    } catch (err) {
      console.error('Error sending report:', err)
      alert('리포트 발송 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSendingReport(false)
    }
  }

  const filteredCreators = regionFilter === 'all' 
    ? featuredCreators 
    : featuredCreators.filter(c => c.regions?.includes(regionFilter))

  // Registered creator handlers
  const searchRegisteredCreators = async () => {
    setLoadingCreators(true)
    try {
      const client = getSupabaseClient(selectedRegionForSearch)
      if (!client) {
        alert(`${selectedRegionForSearch} 데이터베이스에 연결할 수 없습니다.`)
        return
      }

      let query = client
        .from('user_profiles')
        .select('*')

      if (creatorSearchQuery.trim()) {
        query = query.or(`name.ilike.%${creatorSearchQuery}%,email.ilike.%${creatorSearchQuery}%,channel_name.ilike.%${creatorSearchQuery}%`)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setRegisteredCreators(data || [])
    } catch (err) {
      console.error('Error searching creators:', err)
      alert('크리에이터 검색 중 오류가 발생했습니다.')
    } finally {
      setLoadingCreators(false)
    }
  }

  const handleSelectRegisteredCreator = (creator) => {
    setFormData(prev => ({
      ...prev,
      channel_name: creator.channel_name || creator.name,
      channel_url: creator.youtube_url || creator.instagram_url || creator.tiktok_url || '',
      platform: creator.youtube_url ? 'youtube' : creator.instagram_url ? 'instagram' : 'tiktok',
      regions: [selectedRegionForSearch] // 자동으로 선택한 지역 설정
    }))
    setShowCreatorSelectModal(false)
    alert(`${creator.name} 크리에이터가 선택되었습니다. CAPI 분석 버튼을 클릭하여 분석을 시작하세요.`)
  }

  useEffect(() => {
    if (showCreatorSelectModal) {
      searchRegisteredCreators()
    }
  }, [selectedRegionForSearch, showCreatorSelectModal])

  // CNEC Plus creator search
  const searchCnecPlusCreators = async () => {
    setLoadingCnecPlusCreators(true)
    try {
      const client = getSupabaseClient(selectedCnecPlusRegion)
      if (!client) {
        alert(`${selectedCnecPlusRegion} 데이터베이스에 연결할 수 없습니다.`)
        return
      }

      let query = client
        .from('user_profiles')
        .select('*')

      if (cnecPlusSearchQuery.trim()) {
        query = query.or(`name.ilike.%${cnecPlusSearchQuery}%,email.ilike.%${cnecPlusSearchQuery}%,channel_name.ilike.%${cnecPlusSearchQuery}%`)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setCnecPlusRegisteredCreators(data || [])
    } catch (err) {
      console.error('Error searching CNEC Plus creators:', err)
      alert('크리에이터 검색 중 오류가 발생했습니다.')
    } finally {
      setLoadingCnecPlusCreators(false)
    }
  }

  const handleSelectCnecPlusCreator = (creator) => {
    setCnecPlusFormData(prev => ({
      ...prev,
      creator_name: creator.channel_name || creator.name,
      creator_region: selectedCnecPlusRegion,
      channel_url: creator.youtube_url || creator.instagram_url || creator.tiktok_url || '',
      profile_image: creator.profile_image_url || '',
      platform: creator.youtube_url ? 'youtube' : creator.instagram_url ? 'instagram' : 'tiktok'
    }))
    setShowCnecPlusCreatorModal(false)
    alert(`${creator.name} 크리에이터가 선택되었습니다. 숯폼 1건당 가격을 입력하세요.`)
  }

  useEffect(() => {
    if (showCnecPlusCreatorModal) {
      searchCnecPlusCreators()
    }
  }, [selectedCnecPlusRegion, showCnecPlusCreatorModal])

  // CNEC Plus handlers
  const handleAddCnecPlus = async () => {
    if (!cnecPlusFormData.creator_name) {
      alert('크리에이터를 선택해주세요.')
      return
    }
    if (!cnecPlusFormData.price_per_video) {
      alert('숯폼 1건당 가격을 입력해주세요.')
      return
    }

    try {
      // 1. featured_creators에 먼저 저장
      const newCreator = {
        // Required fields for featured_creators table
        user_id: crypto.randomUUID(), // 고유 UUID 생성
        source_country: cnecPlusFormData.creator_region === 'korea' ? 'KR' :
                        cnecPlusFormData.creator_region === 'japan' ? 'JP' :
                        cnecPlusFormData.creator_region === 'us' ? 'US' : 'TW',
        name: cnecPlusFormData.creator_name,
        primary_country: cnecPlusFormData.creator_region === 'korea' ? 'KR' :
                        cnecPlusFormData.creator_region === 'japan' ? 'JP' :
                        cnecPlusFormData.creator_region === 'us' ? 'US' : 'TW',
        // Optional fields
        profile_image_url: cnecPlusFormData.profile_image,
        active_regions: [cnecPlusFormData.creator_region],
        featured_type: 'cnec_plus',
        is_active: true
      }

      const { data: creatorData, error: creatorError } = await supabaseBiz
        .from('featured_creators')
        .insert([newCreator])
        .select()
        .single()

      if (creatorError) throw creatorError

      // 2. cnec_plus_pricing에 가격 정보 저장
      const { data: pricingData, error: pricingError } = await supabaseBiz
        .from('cnec_plus_pricing')
        .insert([{
          creator_id: creatorData.id,
          price_per_video: parseInt(cnecPlusFormData.price_per_video.replace(/,/g, '')),
          display_order: cnecPlusFormData.display_order || cnecPlusCreators.length,
          is_active: true
        }])
        .select()

      if (pricingError) throw pricingError

      alert('CNEC Plus에 추가되었습니다!')
      await loadCnecPlusCreators()
      await loadFeaturedCreators()
      setShowCnecPlusForm(false)
      setCnecPlusFormData({
        creator_name: '',
        creator_region: '',
        channel_url: '',
        profile_image: '',
        platform: '',
        price_per_video: '',
        display_order: 0
      })
    } catch (err) {
      console.error('Error adding CNEC Plus:', err)
      alert('CNEC Plus 추가 중 오류가 발생했습니다: ' + err.message)
    }
  }

  const handleDeleteCnecPlus = async (id) => {
    if (!confirm('CNEC Plus에서 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('cnec_plus_pricing')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('삭제되었습니다.')
      await loadCnecPlusCreators()
    } catch (err) {
      console.error('Error deleting CNEC Plus:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  추천 크리에이터 관리 (CAPI)
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  AI 기반 CAPI 분석으로 크리에이터를 평가하고 관리합니다
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {showForm ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Input Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        CAPI 프로필 생성
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowCreatorSelectModal(true)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        가입 크리에이터에서 선택
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      가입한 크리에이터를 선택하거나 직접 입력하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>플랫폼 *</Label>
                      <Select value={formData.platform} onValueChange={handlePlatformChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>채널/계정명 *</Label>
                      <Input
                        name="channel_name"
                        value={formData.channel_name}
                        onChange={handleInputChange}
                        placeholder="뷰티유튜버김지수"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>채널 URL *</Label>
                      <Input
                        name="channel_url"
                        value={formData.channel_url}
                        onChange={handleInputChange}
                        placeholder={
                          formData.platform === 'youtube' ? 'https://youtube.com/@channel' :
                          formData.platform === 'instagram' ? 'https://instagram.com/username' :
                          formData.platform === 'tiktok' ? 'https://tiktok.com/@username' :
                          'https://...'
                        }
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">자동 분석 기능</p>
                          <p className="text-xs text-blue-700 mt-1">
                            채널 URL을 입력하면 최근 3개월 내 인기 영상 10개를 자동으로 선택하여 분석합니다.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>활동 지역</Label>
                      <div className="flex gap-2">
                        {formData.regions.map(region => (
                          <Badge key={region} variant="default">
                            {getRegionFlag(region)} {getRegionName(region)}
                          </Badge>
                        ))}
                        {formData.regions.length === 0 && (
                          <span className="text-sm text-gray-500">가입 크리에이터 선택 시 자동 설정됩니다</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>지원 가능한 캠페인 유형 (다중 선택) *</Label>
                      <div className="flex flex-wrap gap-2">
                        {['package', 'oliveyoung', '4week'].map(campaign => (
                          <Button
                            key={campaign}
                            type="button"
                            variant={formData.supported_campaigns.includes(campaign) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleCampaignToggle(campaign)}
                            className={formData.supported_campaigns.includes(campaign) ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                          >
                            {formData.supported_campaigns.includes(campaign) && '✓ '}
                            {getCampaignName(campaign)}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        선택한 캠페인 유형에서만 이 크리에이터가 표시됩니다
                      </p>
                    </div>



                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleGenerateCapiProfile}
                        disabled={analyzing}
                        className="flex-1"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            CAPI 분석 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            CAPI 분석 시작
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setCapiResult(null)
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: CAPI Result */}
              <div>
                {capiResult ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        CAPI 분석 결과
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-purple-600 mb-2">
                            {capiResult.total_content_score + 30}점
                          </div>
                          <div className="text-2xl font-bold text-gray-700">
                            {calculateCapiGrade(capiResult.total_content_score + 30)}급
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-200 space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="font-semibold">콘텐츠 제작 역량</span>
                              <span className="font-bold text-purple-600">{capiResult.total_content_score}/70점</span>
                            </div>
                            {capiResult.content_scores && (
                              <div className="space-y-1 pl-4 text-xs">
                                <div className="flex justify-between">
                                  <span>오프닝 후킹력</span>
                                  <span className="font-medium">{capiResult.content_scores.opening_hook?.score || 0}/14점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>신뢰도 구축</span>
                                  <span className="font-medium">{capiResult.content_scores.credibility?.score || 0}/13점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>제품 시연 효과성</span>
                                  <span className="font-medium">{capiResult.content_scores.product_demo?.score || 0}/11점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>오디오 품질</span>
                                  <span className="font-medium">{capiResult.content_scores.audio_quality?.score || 0}/8점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>편집 완성도</span>
                                  <span className="font-medium">{capiResult.content_scores.editing?.score || 0}/8점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>스토리텔링 구조</span>
                                  <span className="font-medium">{capiResult.content_scores.storytelling?.score || 0}/7점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>CTA 명확성</span>
                                  <span className="font-medium">{capiResult.content_scores.cta_clarity?.score || 0}/6점</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>비주얼 품질</span>
                                  <span className="font-medium">{capiResult.content_scores.visual_quality?.score || 0}/3점</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-purple-100">
                            <span className="font-semibold">계정 활성도</span>
                            <span className="font-bold text-purple-600">{capiResult.activity_total_score || 0}/30점</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">💪 강점</h4>
                        {capiResult.strengths?.slice(0, 3).map((strength, i) => (
                          <div key={i} className="bg-green-50 border border-green-200 rounded p-3 mb-2">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium text-sm">{strength.title}</div>
                              <div className="text-xs font-bold text-green-700">{strength.score}점</div>
                            </div>
                            <div className="text-xs text-gray-600">{strength.description}</div>
                            {capiResult.content_scores && capiResult.content_scores[Object.keys(capiResult.content_scores).find(key => 
                              capiResult.content_scores[key]?.score === strength.score
                            )]?.reason && (
                              <div className="text-xs text-gray-500 mt-1 italic">
                                • {capiResult.content_scores[Object.keys(capiResult.content_scores).find(key => 
                                  capiResult.content_scores[key]?.score === strength.score
                                )]?.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">🚀 성장 가능성</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-xs text-blue-800">
                          <div className="font-medium mb-1">✨ 가이드 최적화 팁</div>
                          <div>아래 개선 포인트를 캠페인 가이드에 반영하면 더 높은 점수를 받을 수 있습니다.</div>
                        </div>
                        {capiResult.weaknesses?.slice(0, 2).map((weakness, i) => (
                          <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium text-sm">{weakness.title}</div>
                              <div className="text-xs font-bold text-yellow-700">{weakness.score}점</div>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">현재: {weakness.current}</div>
                            {weakness.improvements && weakness.improvements.length > 0 && (
                              <div className="text-xs text-gray-700 mb-2">
                                <div className="font-medium text-green-700 mb-1">개선 방안:</div>
                                <ul className="list-disc list-inside space-y-0.5 pl-2">
                                  {weakness.improvements.map((imp, idx) => (
                                    <li key={idx}>{imp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {weakness.expected_impact && (
                              <div className="text-xs font-medium text-purple-700 bg-purple-50 rounded px-2 py-1">
                                🎯 {weakness.expected_impact}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 분석된 영상 목록 */}
                      {capiResult.analyzed_videos && capiResult.analyzed_videos.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">🎥 분석된 영상 ({capiResult.analyzed_videos.length}개)</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {capiResult.analyzed_videos.map((video, i) => (
                              <div key={i} className="bg-gray-50 border border-gray-200 rounded p-3">
                                <div className="flex justify-between items-start mb-1">
                                  <a 
                                    href={video.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:underline flex-1 mr-2"
                                  >
                                    {video.title}
                                  </a>
                                  <div className="text-xs font-bold text-purple-600">{video.content_score}점</div>
                                </div>
                                <div className="flex gap-3 text-xs text-gray-600">
                                  <span>👁 {video.views.toLocaleString()}</span>
                                  <span>👍 {video.likes.toLocaleString()}</span>
                                  <span>💬 {video.comments.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 계정 활성도 상세 */}
                      {capiResult.activity_scores && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">📊 계정 활성도 상세</h4>
                          <div className="space-y-2">
                            {Object.entries(capiResult.activity_scores).map(([key, data]) => (
                              <div key={key} className="bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium">
                                    {key === 'followers' ? '구독자 수' :
                                     key === 'avg_views' ? '평균 조회수' :
                                     key === 'engagement' ? '참여율' :
                                     '업로드 빈도'}
                                  </span>
                                  <span className="text-xs font-bold text-blue-700">{data.score}/{data.max}점</span>
                                </div>
                                <div className="text-xs text-gray-600">{data.reason}</div>
                                {data.value && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
                                    {data.rate && ` (${data.rate})`}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button onClick={handleSave} className="w-full" size="lg">
                        저장하기
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>CAPI 분석을 시작하면 결과가 여기에 표시됩니다</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="graded">
                  <Crown className="w-4 h-4 mr-2" />
                  등급제 크리에이터
                </TabsTrigger>
                <TabsTrigger value="featured">
                  <Star className="w-4 h-4 mr-2" />
                  CAPI 크리에이터
                </TabsTrigger>
                <TabsTrigger value="cnecplus">
                  <Sparkles className="w-4 h-4 mr-2" />
                  CNEC Plus
                </TabsTrigger>
              </TabsList>

              {/* 등급제 크리에이터 탭 */}
              <TabsContent value="graded">
                <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">크넥 등급제 크리에이터</h3>
                    <p className="text-sm text-gray-500">FRESH → GLOW → BLOOM → ICONIC → MUSE 등급으로 크리에이터를 관리합니다</p>
                  </div>
                  <Button onClick={() => setShowGradedCreatorModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    크리에이터 추가
                  </Button>
                </div>

                {/* 등급 필터 */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  <Button
                    variant={gradeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGradeFilter('all')}
                  >
                    전체 ({gradedCreators.length})
                  </Button>
                  {Object.entries(GRADE_LEVELS).map(([level, info]) => {
                    const count = gradedCreators.filter(c => c.cnec_grade_level === parseInt(level)).length
                    return (
                      <Button
                        key={level}
                        variant={gradeFilter === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGradeFilter(level)}
                        className="gap-1"
                        style={gradeFilter === level ? { backgroundColor: info.color } : {}}
                      >
                        <span style={{ color: gradeFilter !== level ? info.color : 'inherit' }}>
                          {info.name}
                        </span>
                        <span className="text-xs opacity-70">({count})</span>
                      </Button>
                    )
                  })}
                </div>

                {/* 등급제 크리에이터 목록 */}
                {loadingGraded ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : filteredGradedCreators.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Crown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>등록된 등급제 크리에이터가 없습니다</p>
                      <p className="text-sm mt-2">크리에이터를 추가하여 등급제를 시작하세요</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGradedCreators.map(creator => {
                      const gradeInfo = GRADE_LEVELS[creator.cnec_grade_level || 1]
                      return (
                        <Card key={creator.id} className="overflow-hidden">
                          <div
                            className="h-2"
                            style={{ backgroundColor: gradeInfo.color }}
                          />
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* 프로필 이미지 */}
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                {creator.profile_image_url || creator.profile_image ? (
                                  <img
                                    src={creator.profile_image_url || creator.profile_image}
                                    alt={creator.name || creator.channel_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Users className="w-8 h-8 text-gray-300" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">{creator.name || creator.channel_name}</h3>
                                  <Badge
                                    className="text-white text-xs"
                                    style={{ backgroundColor: gradeInfo.color }}
                                  >
                                    {gradeInfo.name}
                                  </Badge>
                                </div>

                                <div className="text-sm text-gray-500 mb-2">
                                  {creator.cnec_total_score?.toFixed(1) || 0}점
                                  {creator.primary_country && (
                                    <span className="ml-2">
                                      {getRegionFlag(creator.primary_country?.toLowerCase())}
                                    </span>
                                  )}
                                </div>

                                {/* 등급 변경 드롭다운 */}
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={String(creator.cnec_grade_level || 1)}
                                    onValueChange={(value) => handleUpdateGrade(creator.id, parseInt(value))}
                                  >
                                    <SelectTrigger className="h-8 text-xs w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(GRADE_LEVELS).map(([level, info]) => (
                                        <SelectItem key={level} value={level}>
                                          <span style={{ color: info.color }}>{info.name}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => openProfileEditModal(creator)}
                                    title="프로필 편집"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => handleDelete(creator.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* 카테고리 표시 */}
                            {creator.categories && creator.categories.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {creator.categories.map(catId => {
                                  const cat = CREATOR_CATEGORIES.find(c => c.id === catId)
                                  return cat ? (
                                    <span key={catId} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                      {cat.emoji} {cat.name}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}

                            {/* 소개글 미리보기 */}
                            {creator.bio && (
                              <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                                {creator.bio}
                              </div>
                            )}

                            {/* 평점 표시 */}
                            {creator.rating > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-xs">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">{creator.rating.toFixed(1)}</span>
                              </div>
                            )}

                            {/* 통계 */}
                            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-center">
                              <div>
                                <div className="font-semibold">{creator.instagram_followers?.toLocaleString() || '-'}</div>
                                <div className="text-gray-500">Instagram</div>
                              </div>
                              <div>
                                <div className="font-semibold">{creator.youtube_subscribers?.toLocaleString() || '-'}</div>
                                <div className="text-gray-500">YouTube</div>
                              </div>
                              <div>
                                <div className="font-semibold">{creator.tiktok_followers?.toLocaleString() || '-'}</div>
                                <div className="text-gray-500">TikTok</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="featured">
                {/* Action Button and Filter */}
                <div className="mb-6 flex justify-between items-center">
                  <div className="flex gap-2">
                  <Button
                    variant={regionFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegionFilter('all')}
                  >
                    전체
                  </Button>
                  {['korea', 'japan', 'us', 'taiwan'].map(region => (
                    <Button
                      key={region}
                      variant={regionFilter === region ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRegionFilter(region)}
                    >
                      {getRegionFlag(region)} {getRegionName(region)}
                    </Button>
                  ))}
                  </div>
                  {!showForm && (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      CAPI 프로필 생성
                    </Button>
                  )}
                </div>

              {/* Creators List */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
              ) : filteredCreators.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    등록된 크리에이터가 없습니다
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCreators.map(creator => (
                    <Card key={creator.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold">{creator.channel_name}</h3>
                              {creator.capi_grade && (
                                <Badge className={getGradeColor(creator.capi_grade)}>
                                  {creator.capi_grade}급 {creator.capi_score}점
                                </Badge>
                              )}
                              <Badge variant="outline">{creator.platform}</Badge>
                            </div>
                            <div className="flex gap-2 mb-3">
                              {creator.regions?.map(region => (
                                <span key={region} className="text-sm">
                                  {getRegionFlag(region)} {getRegionName(region)}
                                </span>
                              ))}
                            </div>
                            {creator.capi_analysis && (
                              <div className="text-sm text-gray-600 mb-3">
                                <div className="flex gap-4">
                                  <span>콘텐츠: {creator.capi_content_score}/70</span>
                                  <span>활성도: {creator.capi_activity_score}/30</span>
                                </div>
                              </div>
                            )}

                          </div>
                          <div className="flex gap-2">
                            {creator.capi_analysis && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReportModal(creator)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                리포트 발송
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(creator.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </TabsContent>

              <TabsContent value="cnecplus">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">CNEC Plus 크리에이터</h3>
                    <p className="text-sm text-gray-500">숯폼 1건당 가격으로 제공되는 크리에이터</p>
                  </div>
                  <Button onClick={() => setShowCnecPlusForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    CNEC Plus 추가
                  </Button>
                </div>

                {showCnecPlusForm && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>CNEC Plus 크리에이터 추가</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>가입 크리에이터에서 선택 *</Label>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => setShowCnecPlusCreatorModal(true)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          {cnecPlusFormData.creator_name || '가입 크리에이터에서 선택'}
                        </Button>
                        {cnecPlusFormData.creator_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Badge variant="outline">{cnecPlusFormData.platform}</Badge>
                            <span>{getRegionFlag(cnecPlusFormData.creator_region)} {getRegionName(cnecPlusFormData.creator_region)}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>숯폼 1건당 가격 *</Label>
                        <Input
                          value={cnecPlusFormData.price_per_video}
                          onChange={(e) => setCnecPlusFormData(prev => ({...prev, price_per_video: e.target.value}))}
                          placeholder="500,000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>노출 순서</Label>
                        <Input
                          type="number"
                          value={cnecPlusFormData.display_order}
                          onChange={(e) => setCnecPlusFormData(prev => ({...prev, display_order: parseInt(e.target.value)}))}
                          placeholder="0"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleAddCnecPlus}>
                          추가
                        </Button>
                        <Button variant="outline" onClick={() => setShowCnecPlusForm(false)}>
                          취소
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {cnecPlusCreators.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      CNEC Plus에 등록된 크리에이터가 없습니다
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {cnecPlusCreators.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold">{item.featured_creators?.name}</h3>
                                {item.featured_creators?.capi_grade && (
                                  <Badge className={getGradeColor(item.featured_creators.capi_grade)}>
                                    {item.featured_creators.capi_grade}급 {item.featured_creators.capi_score}점
                                  </Badge>
                                )}
                                {item.featured_creators?.primary_country && (
                                  <Badge variant="outline">
                                    {getRegionFlag(item.featured_creators.primary_country.toLowerCase())}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2 mb-3">
                                {item.featured_creators?.active_regions?.map(region => (
                                  <span key={region} className="text-sm">
                                    {getRegionFlag(region)} {getRegionName(region)}
                                  </span>
                                ))}
                              </div>
                              <div className="text-lg font-bold text-purple-600">
                                숯폼 1건당: {item.price_per_video?.toLocaleString()}원
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                노출 순서: {item.display_order}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteCnecPlus(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Report Sending Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>성장 가이드 리포트 발송</DialogTitle>
            <DialogDescription>
              크리에이터에게 CAPI 분석 결과와 성장 가이드를 이메일로 발송합니다
            </DialogDescription>
          </DialogHeader>
          
          {selectedCreator && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">{selectedCreator.channel_name}</div>
                <div className="flex items-center gap-2">
                  <Badge className={getGradeColor(selectedCreator.capi_grade)}>
                    {selectedCreator.capi_grade}급 {selectedCreator.capi_score}점
                  </Badge>
                  <Badge variant="outline">{selectedCreator.platform}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>수신 이메일 *</Label>
                <Input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="creator@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>담당자 메시지 (선택)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="안녕하세요! CNEC에서 채널 분석 결과를 보내드립니다..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              취소
            </Button>
            <Button onClick={handleSendReport} disabled={sendingReport}>
              {sendingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  리포트 발송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creator Selection Modal */}
      <Dialog open={showCreatorSelectModal} onOpenChange={setShowCreatorSelectModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가입 크리에이터 선택</DialogTitle>
            <DialogDescription>
              가입한 크리에이터를 선택하여 CAPI 프로필을 생성하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Select value={selectedRegionForSearch} onValueChange={setSelectedRegionForSearch}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="korea">한국</SelectItem>
                  <SelectItem value="japan">일본</SelectItem>
                  <SelectItem value="us">미국</SelectItem>
                  <SelectItem value="taiwan">대만</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="이름, 이메일, 채널명 검색..."
                  value={creatorSearchQuery}
                  onChange={(e) => setCreatorSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRegisteredCreators()}
                />
                <Button onClick={searchRegisteredCreators}>
                  검색
                </Button>
              </div>
            </div>

            {loadingCreators ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : registeredCreators.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {registeredCreators.map(creator => (
                  <Card key={creator.id} className="cursor-pointer hover:border-purple-500 transition-colors" onClick={() => handleSelectRegisteredCreator(creator)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {creator.profile_image_url && (
                          <img src={creator.profile_image_url} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold">{creator.name}</div>
                          <div className="text-sm text-gray-500">{creator.email}</div>
                          {creator.channel_name && (
                            <div className="text-sm text-gray-600 mt-1">채널: {creator.channel_name}</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {creator.youtube_url && <Badge variant="outline">YouTube</Badge>}
                          {creator.instagram_url && <Badge variant="outline">Instagram</Badge>}
                          {creator.tiktok_url && <Badge variant="outline">TikTok</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* CNEC Plus Creator Selection Modal */}
      <Dialog open={showCnecPlusCreatorModal} onOpenChange={setShowCnecPlusCreatorModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CNEC Plus 크리에이터 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedCnecPlusRegion} onValueChange={setSelectedCnecPlusRegion}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="korea">{getRegionFlag('korea')} 한국</SelectItem>
                  <SelectItem value="japan">{getRegionFlag('japan')} 일본</SelectItem>
                  <SelectItem value="us">{getRegionFlag('us')} 미국</SelectItem>
                  <SelectItem value="taiwan">{getRegionFlag('taiwan')} 대만</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="이름, 이메일, 채널명 검색"
                value={cnecPlusSearchQuery}
                onChange={(e) => setCnecPlusSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={searchCnecPlusCreators}>
                검색
              </Button>
            </div>

            {loadingCnecPlusCreators ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : cnecPlusRegisteredCreators.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {cnecPlusRegisteredCreators.map(creator => (
                  <Card key={creator.id} className="cursor-pointer hover:border-purple-500 transition-colors" onClick={() => handleSelectCnecPlusCreator(creator)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {creator.profile_image_url && (
                          <img src={creator.profile_image_url} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold">{creator.name}</div>
                          <div className="text-sm text-gray-500">{creator.email}</div>
                          {creator.channel_name && (
                            <div className="text-sm text-gray-600 mt-1">채널: {creator.channel_name}</div>
                          )}
                        </div>
                        {(creator.youtube_url || creator.instagram_url || creator.tiktok_url) && (
                          <Badge variant="outline">
                            {creator.youtube_url ? 'YouTube' : creator.instagram_url ? 'Instagram' : 'TikTok'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 등급제 크리에이터 추가 모달 */}
      <Dialog open={showGradedCreatorModal} onOpenChange={setShowGradedCreatorModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              등급제 크리에이터 추가
            </DialogTitle>
            <DialogDescription>
              한국, 일본, 미국 DB에서 크리에이터를 검색하여 추천 크리에이터로 등록합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 지역 선택 */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium py-2">검색 지역:</span>
              {[
                { id: 'korea', name: '한국', flag: '🇰🇷' },
                { id: 'japan', name: '일본', flag: '🇯🇵' },
                { id: 'us', name: '미국', flag: '🇺🇸' }
              ].map(region => (
                <Button
                  key={region.id}
                  variant={gradedSearchRegions.includes(region.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setGradedSearchRegions(prev =>
                      prev.includes(region.id)
                        ? prev.filter(r => r !== region.id)
                        : [...prev, region.id]
                    )
                  }}
                >
                  {region.flag} {region.name}
                </Button>
              ))}
            </div>

            {/* 검색 */}
            <div className="flex gap-2">
              <Input
                placeholder="이름, 이메일, 채널명으로 검색..."
                value={gradedSearchQuery}
                onChange={(e) => setGradedSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchGradedCreators()}
                className="flex-1"
              />
              <Button onClick={handleSearchGradedCreators} disabled={searchingGraded || gradedSearchRegions.length === 0}>
                {searchingGraded ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2">검색</span>
              </Button>
            </div>

            {/* 등급 안내 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">등급 시스템 안내</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(GRADE_LEVELS).map(([level, info]) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-sm">
                      Lv.{level} {info.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 검색 결과 */}
            {searchingGraded ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">크리에이터 검색 중...</p>
              </div>
            ) : gradedSearchResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>검색어를 입력하고 검색 버튼을 클릭하세요</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {gradedSearchResults.map(creator => (
                  <Card
                    key={`${creator.source_region}-${creator.id}`}
                    className="cursor-pointer hover:border-amber-500 hover:shadow-md transition-all"
                    onClick={() => handleRegisterGradedCreator(creator)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* 프로필 이미지 */}
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                          {creator.profile_image || creator.profile_image_url || creator.avatar_url ? (
                            <img
                              src={creator.profile_image || creator.profile_image_url || creator.avatar_url}
                              alt={creator.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{creator.name || creator.channel_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {getRegionFlag(creator.source_region)} {getRegionName(creator.source_region)}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 truncate">{creator.email}</div>
                          {creator.channel_name && creator.channel_name !== creator.name && (
                            <div className="text-sm text-gray-600 mt-1">채널: {creator.channel_name}</div>
                          )}
                        </div>

                        {/* SNS 정보 */}
                        <div className="flex flex-col gap-1 text-xs text-right">
                          {creator.instagram_followers > 0 && (
                            <span className="text-pink-600">IG: {creator.instagram_followers?.toLocaleString()}</span>
                          )}
                          {creator.youtube_subscribers > 0 && (
                            <span className="text-red-600">YT: {creator.youtube_subscribers?.toLocaleString()}</span>
                          )}
                          {creator.tiktok_followers > 0 && (
                            <span className="text-gray-800">TT: {creator.tiktok_followers?.toLocaleString()}</span>
                          )}
                        </div>

                        {/* 등록 버튼 */}
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                          <Plus className="w-4 h-4 mr-1" />
                          등록
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGradedCreatorModal(false)
              setGradedSearchResults([])
              setGradedSearchQuery('')
            }}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 프로필 편집 모달 */}
      <Dialog open={showProfileEditModal} onOpenChange={setShowProfileEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-500" />
              크리에이터 프로필 편집
            </DialogTitle>
            <DialogDescription>
              {editingCreator?.name || editingCreator?.channel_name}님의 프로필을 편집합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 소개글 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">소개글</Label>
              <Textarea
                value={profileFormData.bio}
                onChange={(e) => setProfileFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="크리에이터 소개글을 입력하세요..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">최대 500자까지 입력 가능합니다</p>
            </div>

            {/* 주력 카테고리 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">주력 카테고리 (다중 선택)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CREATOR_CATEGORIES.map(category => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={profileFormData.categories.includes(category.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCategory(category.id)}
                    className={`justify-start ${profileFormData.categories.includes(category.id) ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  >
                    <span className="mr-1">{category.emoji}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                선택된 카테고리: {profileFormData.categories.length}개
              </p>
            </div>

            {/* 평점 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">평점</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={profileFormData.rating}
                  onChange={(e) => setProfileFormData(prev => ({ ...prev, rating: e.target.value }))}
                  className="w-24"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-5 h-5 cursor-pointer ${
                        star <= Math.round(profileFormData.rating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                      onClick={() => setProfileFormData(prev => ({ ...prev, rating: star }))}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {profileFormData.rating > 0 ? `${parseFloat(profileFormData.rating).toFixed(1)} / 5.0` : '미평가'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileEditModal(false)} disabled={savingProfile}>
              취소
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
