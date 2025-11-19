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
  TrendingUp, Users, Award, DollarSign, Sparkles, CheckCircle2
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'

export default function FeaturedCreatorManagementPageNew() {
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'youtube',
    channel_name: '',
    channel_url: '',
    regions: [],
    supported_campaigns: [], // 지원 가능한 캠페인 유형
    basic_price: '',
    standard_price: '',
    premium_price: '',
    monthly_price: ''
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
  const [activeTab, setActiveTab] = useState('featured')
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

  // Registered creator selection
  const [showCreatorSelectModal, setShowCreatorSelectModal] = useState(false)
  const [selectedRegionForSearch, setSelectedRegionForSearch] = useState('korea')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [registeredCreators, setRegisteredCreators] = useState([])
  const [loadingCreators, setLoadingCreators] = useState(false)

  useEffect(() => {
    loadFeaturedCreators()
    loadCnecPlusCreators()
  }, [])

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
            .select('id, channel_name, platform, profile_image, capi_score, capi_grade, regions')
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
    setFormData(prev => ({ ...prev, platform: value }))
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

    if (!formData.basic_price || !formData.standard_price || !formData.premium_price || !formData.monthly_price) {
      alert('모든 패키지 가격을 입력해주세요.')
      return
    }

    try {
      const contentScore = capiResult.total_content_score || 0
      const activityScore = 30 // Mock activity score (should be calculated from stats)
      const totalScore = contentScore + activityScore
      const grade = calculateCapiGrade(totalScore)

      const newCreator = {
        platform: formData.platform,
        channel_name: formData.channel_name,
        channel_url: formData.channel_url,
        profile_image: capiResult.profile_image || '', // Get from CAPI analysis
        followers: capiResult.followers || 0,
        avg_views: capiResult.avg_views || 0,
        avg_likes: capiResult.avg_likes || 0,
        avg_comments: capiResult.avg_comments || 0,
        category: capiResult.category || '',
        target_audience: capiResult.target_audience || '',
        content_style: capiResult.content_style || '',
        regions: formData.regions,
        supported_campaigns: formData.supported_campaigns,
        basic_price: parseInt(formData.basic_price.replace(/,/g, '')),
        standard_price: parseInt(formData.standard_price.replace(/,/g, '')),
        premium_price: parseInt(formData.premium_price.replace(/,/g, '')),
        monthly_price: parseInt(formData.monthly_price.replace(/,/g, '')),
        capi_score: totalScore,
        capi_grade: grade,
        capi_content_score: contentScore,
        capi_activity_score: activityScore,
        capi_analysis: capiResult,
        capi_generated_at: new Date().toISOString(),
        featured_type: 'capi',
        is_active: true
      }

      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .insert([newCreator])
        .select()

      if (error) throw error

      alert('크리에이터가 저장되었습니다!')
      await loadFeaturedCreators()
      setShowForm(false)
      setFormData({
        platform: 'youtube',
        channel_name: '',
        channel_url: '',
        regions: [],
        supported_campaigns: [],
        basic_price: '',
        standard_price: '',
        premium_price: '',
        monthly_price: ''
      })
      setCapiResult(null)
    } catch (err) {
      console.error('Error saving creator:', err)
      alert('저장 중 오류가 발생했습니다.')
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
        platform: cnecPlusFormData.platform,
        channel_name: cnecPlusFormData.creator_name,
        channel_url: cnecPlusFormData.channel_url,
        profile_image: cnecPlusFormData.profile_image,
        regions: [cnecPlusFormData.creator_region],
        supported_campaigns: [], // CNEC Plus는 모든 캠페인 지원
        featured_type: 'cnec_plus',
        is_active: true,
        followers: 0,
        avg_views: 0,
        avg_likes: 0,
        avg_comments: 0
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
                        placeholder="https://youtube.com/@channel"
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
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <div className="flex justify-between text-sm">
                            <span>콘텐츠 제작 역량</span>
                            <span className="font-bold">{capiResult.total_content_score}/70점</span>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span>계정 활성도</span>
                            <span className="font-bold">30/30점</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">💪 강점</h4>
                        {capiResult.strengths?.slice(0, 3).map((strength, i) => (
                          <div key={i} className="bg-green-50 border border-green-200 rounded p-3 mb-2">
                            <div className="font-medium text-sm">{strength.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{strength.description}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">🎯 개선 포인트</h4>
                        {capiResult.weaknesses?.slice(0, 2).map((weakness, i) => (
                          <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                            <div className="font-medium text-sm">{weakness.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{weakness.current}</div>
                          </div>
                        ))}
                      </div>

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
                <TabsTrigger value="featured">
                  <Star className="w-4 h-4 mr-2" />
                  추천 크리에이터
                </TabsTrigger>
                <TabsTrigger value="cnecplus">
                  <Sparkles className="w-4 h-4 mr-2" />
                  CNEC Plus
                </TabsTrigger>
              </TabsList>

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
                            <div className="text-sm text-gray-500">
                              기본: {creator.basic_price?.toLocaleString()}원 • 
                              스탠다드: {creator.standard_price?.toLocaleString()}원 • 
                              프리미엄: {creator.premium_price?.toLocaleString()}원
                            </div>
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
                                <h3 className="text-lg font-bold">{item.featured_creators?.channel_name}</h3>
                                {item.featured_creators?.capi_grade && (
                                  <Badge className={getGradeColor(item.featured_creators.capi_grade)}>
                                    {item.featured_creators.capi_grade}급 {item.featured_creators.capi_score}점
                                  </Badge>
                                )}
                                <Badge variant="outline">{item.featured_creators?.platform}</Badge>
                              </div>
                              <div className="flex gap-2 mb-3">
                                {item.featured_creators?.regions?.map(region => (
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
    </>
  )
}
