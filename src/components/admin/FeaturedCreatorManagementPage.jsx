import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { analyzeCreator, formatEvaluation } from '../../lib/geminiService'
import { scrapeYouTubeChannel } from '../../lib/youtubeScraperService'
import {
  Star, Plus, Edit, Trash2, Eye, Loader2,
  TrendingUp, Users, Award, DollarSign, Search, UserPlus,
  Video, X, GripVertical, Save
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS, supabaseTaiwan, getSupabaseClient } from '../../lib/supabaseClients'

export default function FeaturedCreatorManagementPage() {
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'youtube',
    channel_name: '',
    channel_url: '',
    profile_image: '',
    followers: '',
    avg_views: '',
    avg_likes: '',
    avg_comments: '',
    category: '',
    target_audience: '',
    content_style: '',
    sample_videos: '',
    // Regions
    regions: [],  // ['japan', 'us', 'taiwan', 'korea']
    // Pricing
    basic_price: '',
    standard_price: '',
    premium_price: '',
    monthly_price: ''
  })
  
  const [evaluation, setEvaluation] = useState(null)
  const [regionFilter, setRegionFilter] = useState('all')
  
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)

  // 가입 크리에이터 선택 모달
  const [showCreatorModal, setShowCreatorModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('korea')
  const [registeredCreators, setRegisteredCreators] = useState([])
  const [loadingCreators, setLoadingCreators] = useState(false)

  // AI 추천 확정 크리에이터 관리
  const [aiPickSlots, setAiPickSlots] = useState([null, null, null, null, null])
  const [savingAiPicks, setSavingAiPicks] = useState(false)

  // 크리에이터 편집 모달
  const [editCreator, setEditCreator] = useState(null)
  const [editFormData, setEditFormData] = useState({ admin_bio: '', representative_videos: [] })
  const [savingEdit, setSavingEdit] = useState(false)

  // Load featured creators from DB
  useEffect(() => {
    loadFeaturedCreators()
  }, [])

  const loadFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFeaturedCreators(data || [])
    } catch (err) {
      console.error('Error loading featured creators:', err)
    } finally {
      setLoading(false)
    }
  }

  // AI 추천 확정 크리에이터 로드
  useEffect(() => {
    if (featuredCreators.length > 0) {
      const picks = featuredCreators
        .filter(c => c.is_ai_pick)
        .sort((a, b) => (a.ai_pick_order || 99) - (b.ai_pick_order || 99))
      const slots = [null, null, null, null, null]
      picks.forEach((p, i) => { if (i < 5) slots[i] = p.id })
      setAiPickSlots(slots)
    }
  }, [featuredCreators])

  // YouTube URL에서 Video ID 추출
  const extractYouTubeVideoId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  // AI 추천 확정 저장
  const handleSaveAiPicks = async () => {
    setSavingAiPicks(true)
    try {
      // 기존 AI pick 리셋
      const { error: resetError } = await supabaseBiz
        .from('featured_creators')
        .update({ is_ai_pick: false, ai_pick_order: null })
        .eq('is_ai_pick', true)

      if (resetError) throw resetError

      // 새 AI pick 설정
      for (let i = 0; i < aiPickSlots.length; i++) {
        if (aiPickSlots[i]) {
          const { error } = await supabaseBiz
            .from('featured_creators')
            .update({ is_ai_pick: true, ai_pick_order: i + 1 })
            .eq('id', aiPickSlots[i])

          if (error) throw error
        }
      }

      alert('AI 추천 확정 크리에이터가 저장되었습니다.')
      await loadFeaturedCreators()
    } catch (err) {
      console.error('Error saving AI picks:', err)
      alert('저장 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSavingAiPicks(false)
    }
  }

  // 크리에이터 편집 (admin_bio, representative_videos)
  const handleOpenEdit = (creator) => {
    setEditCreator(creator)
    setEditFormData({
      admin_bio: creator.admin_bio || '',
      representative_videos: creator.representative_videos || []
    })
  }

  const handleSaveEdit = async () => {
    if (!editCreator) return
    setSavingEdit(true)
    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .update({
          admin_bio: editFormData.admin_bio || null,
          representative_videos: editFormData.representative_videos.filter(v => v.url)
        })
        .eq('id', editCreator.id)

      if (error) throw error

      alert('크리에이터 정보가 저장되었습니다.')
      setEditCreator(null)
      await loadFeaturedCreators()
    } catch (err) {
      console.error('Error saving edit:', err)
      alert('저장 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleAddVideo = () => {
    if (editFormData.representative_videos.length >= 3) return
    setEditFormData(prev => ({
      ...prev,
      representative_videos: [...prev.representative_videos, { url: '', thumbnail: '', title: '' }]
    }))
  }

  const handleVideoUrlChange = (index, url) => {
    const videos = [...editFormData.representative_videos]
    videos[index] = { ...videos[index], url }
    // YouTube URL에서 자동 썸네일 생성
    const videoId = extractYouTubeVideoId(url)
    if (videoId) {
      videos[index].thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    }
    setEditFormData(prev => ({ ...prev, representative_videos: videos }))
  }

  const handleVideoTitleChange = (index, title) => {
    const videos = [...editFormData.representative_videos]
    videos[index] = { ...videos[index], title }
    setEditFormData(prev => ({ ...prev, representative_videos: videos }))
  }

  const handleRemoveVideo = (index) => {
    setEditFormData(prev => ({
      ...prev,
      representative_videos: prev.representative_videos.filter((_, i) => i !== index)
    }))
  }

  // 가입 크리에이터 검색
  const searchRegisteredCreators = async () => {
    setLoadingCreators(true)
    try {
      const client = getSupabaseClient(selectedRegion)
      if (!client) {
        alert(`${selectedRegion} 데이터베이스에 연결할 수 없습니다.`)
        return
      }

      let query = client
        .from('user_profiles')
        .select('*')
        .eq('role', 'creator')

      // 검색어가 있으면 필터링
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,channel_name.ilike.%${searchQuery}%`)
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

  // 모달 열릴 때 자동 검색
  useEffect(() => {
    if (showCreatorModal) {
      searchRegisteredCreators()
    }
  }, [showCreatorModal, selectedRegion])

  // 가입 크리에이터 선택
  const handleSelectCreator = (creator) => {
    setFormData({
      ...formData,
      channel_name: creator.channel_name || creator.name || '',
      channel_url: creator.youtube_url || creator.instagram_url || creator.tiktok_url || '',
      profile_image: creator.profile_image || '',
      followers: creator.followers?.toString() || '',
      avg_views: creator.avg_views?.toString() || '',
      avg_likes: '',
      avg_comments: '',
      category: creator.category || '',
      target_audience: creator.target_audience || '',
      content_style: '',
      sample_videos: '',
      platform: creator.youtube_url ? 'youtube' : creator.instagram_url ? 'instagram' : 'tiktok',
      regions: [selectedRegion] // 선택한 지역 자동 추가
    })
    setShowCreatorModal(false)
    alert(`${creator.name || creator.channel_name} 크리에이터의 정보가 입력되었습니다.`)
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
    const names = {
      japan: '일본',
      us: '미국',
      taiwan: '대만',
      korea: '한국'
    }
    return names[code]
  }

  const getRegionFlag = (code) => {
    const flags = {
      japan: '🇯🇵',
      us: '🇺🇸',
      taiwan: '🇹🇼',
      korea: '🇰🇷'
    }
    return flags[code]
  }

  const handleAnalyze = async () => {
    if (!formData.channel_url) {
      alert('채널 URL을 먼저 입력해주세요.')
      return
    }

    setAnalyzing(true)

    try {
      // 1. 채널 URL에서 데이터 스크래핑
      let scrapedData = null
      if (formData.platform === 'youtube' && formData.channel_url.includes('youtube.com')) {
        scrapedData = await scrapeYouTubeChannel(formData.channel_url)
        
        // formData 업데이트
        setFormData(prev => ({
          ...prev,
          followers: scrapedData.subscribers.toLocaleString(),
          avg_views: scrapedData.avgViews.toLocaleString(),
          avg_likes: Math.round(scrapedData.avgViews * 0.03).toLocaleString(), // 예상 좋아요 (3%)
          avg_comments: Math.round(scrapedData.avgViews * 0.005).toLocaleString() // 예상 댓글 (0.5%)
        }))
      }

      // 2. AI 분석
      const creatorData = {
        ...formData,
        followers: scrapedData ? scrapedData.subscribers : parseInt((formData.followers || '0').replace(/,/g, '')),
        avg_views: scrapedData ? scrapedData.avgViews : parseInt((formData.avg_views || '0').replace(/,/g, '')),
        avg_likes: scrapedData ? Math.round(scrapedData.avgViews * 0.03) : parseInt((formData.avg_likes || '0').replace(/,/g, '')),
        avg_comments: scrapedData ? Math.round(scrapedData.avgViews * 0.005) : parseInt((formData.avg_comments || '0').replace(/,/g, '')),
        sample_videos: formData.sample_videos.split('\n').filter(url => url.trim())
      }

      // Mock campaign data for evaluation
      const campaignData = {
        brand_name: '일반 브랜드',
        product_name: '일반 제품',
        brand_identity: '다양한 브랜드 적합성',
        target_customer: '전 연령층'
      }

      const result = await analyzeCreator(creatorData, campaignData)
      const formatted = formatEvaluation(result)
      
      setEvaluation(formatted)
      
      if (scrapedData) {
        alert(`채널 정보를 가져왔습니다!\n구독자: ${scrapedData.subscribers.toLocaleString()}명\n평균 조회수: ${scrapedData.avgViews.toLocaleString()}회`)
      }
    } catch (err) {
      console.error('Error analyzing creator:', err)
      alert('크리에이터 분석 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!evaluation) {
      alert('먼저 AI 분석을 진행해주세요.')
      return
    }

    // Validate regions
    if (formData.regions.length === 0) {
      alert('최소 1개 이상의 활동 지역을 선택해주세요.')
      return
    }

    // Validate pricing
    if (!formData.basic_price || !formData.standard_price || !formData.premium_price || !formData.monthly_price) {
      alert('모든 패키지 가격을 입력해주세요.')
      return
    }

    try {
      const newCreator = {
        ...formData,
        followers: parseInt(formData.followers.replace(/,/g, '')),
        avg_views: parseInt(formData.avg_views.replace(/,/g, '')),
        avg_likes: parseInt(formData.avg_likes.replace(/,/g, '') || '0'),
        avg_comments: parseInt(formData.avg_comments.replace(/,/g, '') || '0'),
        basic_price: parseInt(formData.basic_price.replace(/,/g, '')),
        standard_price: parseInt(formData.standard_price.replace(/,/g, '')),
        premium_price: parseInt(formData.premium_price.replace(/,/g, '')),
        monthly_price: parseInt(formData.monthly_price.replace(/,/g, '')),
        regions: formData.regions,
        evaluation_score: evaluation.total_score,
        evaluation_data: evaluation,
        featured_type: 'ai_recommended',  // Default type
        is_active: true
      }

      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .insert([newCreator])
        .select()

      if (error) throw error

      alert('크리에이터가 저장되었습니다!')
      await loadFeaturedCreators()  // Reload data
      setShowForm(false)
      setFormData({
        platform: 'youtube',
        channel_name: '',
        channel_url: '',
        profile_image: '',
        followers: '',
        avg_views: '',
        avg_likes: '',
        avg_comments: '',
        category: '',
        target_audience: '',
        content_style: '',
        sample_videos: '',
        regions: [],
        basic_price: '',
        standard_price: '',
        premium_price: '',
        monthly_price: ''
      })
      setEvaluation(null)
    } catch (err) {
      console.error('Error saving creator:', err)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 이 크리에이터를 삭제하시겠습니까?\n\n⚠️ 삭제하면 복구할 수 없습니다.')) {
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

  const handleViewProfile = (creator) => {
    // Navigate to profile view page
    navigate(`/admin/featured-creators/${creator.id}/profile`)
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                추천 크리에이터 관리
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                우수 크리에이터를 등록하고 관리합니다
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/admin')}>
                관리자 대시보드
              </Button>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  크리에이터 등록
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {showForm ? (
          /* Registration Form */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Input Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between">
                    크리에이터 정보
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCreatorModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      가입 크리에이터에서 선택 ({registeredCreators.length}명)
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    크리에이터의 채널 정보를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform */}
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

                  {/* Channel Name */}
                  <div className="space-y-2">
                    <Label>채널/계정명 *</Label>
                    <Input
                      name="channel_name"
                      value={formData.channel_name}
                      onChange={handleInputChange}
                      placeholder="뷰티유튜버김지수"
                    />
                  </div>

                  {/* Channel URL */}
                  <div className="space-y-2">
                    <Label>채널 URL *</Label>
                    <Input
                      name="channel_url"
                      value={formData.channel_url}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/@channel"
                    />
                  </div>

                  {/* Profile Image */}
                  <div className="space-y-2">
                    <Label>프로필 이미지 URL</Label>
                    <Input
                      name="profile_image"
                      value={formData.profile_image}
                      onChange={handleInputChange}
                      placeholder="https://..."
                    />
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>구독자/팔로워 *</Label>
                      <Input
                        name="followers"
                        value={formData.followers}
                        onChange={handleInputChange}
                        placeholder="150000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>평균 조회수 *</Label>
                      <Input
                        name="avg_views"
                        value={formData.avg_views}
                        onChange={handleInputChange}
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>평균 좋아요</Label>
                      <Input
                        name="avg_likes"
                        value={formData.avg_likes}
                        onChange={handleInputChange}
                        placeholder="2000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>평균 댓글</Label>
                      <Input
                        name="avg_comments"
                        value={formData.avg_comments}
                        onChange={handleInputChange}
                        placeholder="150"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>카테고리 *</Label>
                    <Input
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="뷰티, 패션, 라이프스타일 등"
                    />
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-2">
                    <Label>타겟 오디언스</Label>
                    <Input
                      name="target_audience"
                      value={formData.target_audience}
                      onChange={handleInputChange}
                      placeholder="20-30대 여성"
                    />
                  </div>

                  {/* Content Style */}
                  <div className="space-y-2">
                    <Label>콘텐츠 스타일</Label>
                    <Textarea
                      name="content_style"
                      value={formData.content_style}
                      onChange={handleInputChange}
                      placeholder="밝고 경쾌한 톤, 제품 리뷰 중심..."
                      rows={3}
                    />
                  </div>

                  {/* Sample Videos */}
                  <div className="space-y-2">
                    <Label>샘플 영상 URL (한 줄에 하나씩)</Label>
                    <Textarea
                      name="sample_videos"
                      value={formData.sample_videos}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/watch?v=..."
                      rows={4}
                    />
                  </div>

                  {/* Regions */}
                  <div className="space-y-2">
                    <Label>활동 지역 * (복수 선택 가능)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['korea', 'japan', 'us', 'taiwan'].map(region => (
                        <Button
                          key={region}
                          type="button"
                          variant={formData.regions.includes(region) ? 'default' : 'outline'}
                          onClick={() => handleRegionToggle(region)}
                          className="w-full"
                        >
                          {getRegionFlag(region)} {getRegionName(region)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-lg font-semibold">패키지 가격 설정 *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>기본형 (숏폼 1개)</Label>
                        <Input
                          name="basic_price"
                          value={formData.basic_price}
                          onChange={handleInputChange}
                          placeholder="500000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>스탠다드 (숏폼 3개)</Label>
                        <Input
                          name="standard_price"
                          value={formData.standard_price}
                          onChange={handleInputChange}
                          placeholder="1200000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>프리미엄 (숏폼 5개)</Label>
                        <Input
                          name="premium_price"
                          value={formData.premium_price}
                          onChange={handleInputChange}
                          placeholder="1800000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>4주 연속 (주 1개)</Label>
                        <Input
                          name="monthly_price"
                          value={formData.monthly_price}
                          onChange={handleInputChange}
                          placeholder="2000000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing || !formData.channel_name || !formData.followers}
                      className="flex-1"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          AI 분석 중...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          AI 분석 시작
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setFormData({
                          platform: 'youtube',
                          channel_name: '',
                          channel_url: '',
                          profile_image: '',
                          followers: '',
                          avg_views: '',
                          avg_likes: '',
                          avg_comments: '',
                          category: '',
                          target_audience: '',
                          content_style: '',
                          sample_videos: '',
                          regions: [],
                          basic_price: '',
                          standard_price: '',
                          premium_price: '',
                          monthly_price: ''
                        })
                        setEvaluation(null)
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: AI Evaluation Result */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">AI 평가 결과</CardTitle>
                  <CardDescription>
                    {evaluation 
                      ? '분석이 완료되었습니다. 결과를 확인하고 저장하세요.'
                      : '좌측 폼을 작성하고 AI 분석을 시작하세요.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {evaluation ? (
                    <div className="space-y-6">
                      {/* Total Score */}
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg border-2 border-yellow-300">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">종합 점수</p>
                          <p className="text-5xl font-bold text-yellow-600">{evaluation.total_score}</p>
                          <p className="text-sm text-gray-600 mt-2">/ 100점</p>
                        </div>
                      </div>

                      {/* Detailed Scores */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-500" />
                          세부 평가
                        </h3>
                        {Object.entries(evaluation.scores || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{key}</span>
                            <span className="text-lg font-bold text-blue-600">{value}점</span>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      {evaluation.summary && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">종합 평가</h3>
                          <p className="text-sm text-gray-700 leading-relaxed">{evaluation.summary}</p>
                        </div>
                      )}

                      {/* Save Button */}
                      <Button 
                        onClick={handleSave}
                        className="w-full"
                        size="lg"
                      >
                        <Star className="mr-2 h-5 w-5" />
                        추천 크리에이터로 등록
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>AI 분석 결과가 여기에 표시됩니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Creator List */
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">지역 필터</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant={regionFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setRegionFilter('all')}
                    size="sm"
                  >
                    전체 ({featuredCreators.length})
                  </Button>
                  {['japan', 'us', 'taiwan', 'korea'].map(region => {
                    const count = featuredCreators.filter(c => c.regions.includes(region)).length
                    return (
                      <Button
                        key={region}
                        variant={regionFilter === region ? 'default' : 'outline'}
                        onClick={() => setRegionFilter(region)}
                        size="sm"
                      >
                        {getRegionFlag(region)} {getRegionName(region)} ({count})
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI 추천 확정 크리에이터 관리 */}
            <Card className="border-2 border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Star className="w-5 h-5 text-indigo-500 fill-current" />
                  AI 추천 확정 크리에이터 (5명)
                </CardTitle>
                <CardDescription>
                  캠페인 AI 추천에 항상 포함되는 크리에이터를 설정합니다 · BLOOM, GLOW 등급만 선택 가능
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiPickSlots.map((slotId, index) => {
                  const eligibleCreators = featuredCreators.filter(c =>
                    (c.cnec_grade_level === 2 || c.cnec_grade_level === 3) &&
                    c.is_active !== false &&
                    (!aiPickSlots.includes(c.id) || c.id === slotId)
                  )
                  const selectedCreator = slotId ? featuredCreators.find(c => c.id === slotId) : null

                  return (
                    <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                      <span className="text-sm font-bold text-indigo-600 w-8">#{index + 1}</span>
                      <Select
                        value={slotId || ''}
                        onValueChange={(value) => {
                          const newSlots = [...aiPickSlots]
                          newSlots[index] = value || null
                          setAiPickSlots(newSlots)
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="크리에이터 선택..." />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleCreators.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} ({c.cnec_grade_name || 'N/A'}) — {c.instagram_handle || c.youtube_handle || c.tiktok_handle || 'SNS 없음'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCreator && (
                        <span className="text-xs text-gray-500 hidden md:inline">
                          {selectedCreator.cnec_grade_name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newSlots = [...aiPickSlots]
                          newSlots[index] = null
                          setAiPickSlots(newSlots)
                        }}
                        disabled={!slotId}
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  )
                })}
                <Button
                  onClick={handleSaveAiPicks}
                  disabled={savingAiPicks}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {savingAiPicks ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />저장 중...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />AI 추천 확정 저장</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">등록된 추천 크리에이터</CardTitle>
                <CardDescription>
                  {regionFilter === 'all' 
                    ? `총 ${featuredCreators.length}명의 추천 크리에이터가 등록되어 있습니다`
                    : `${getRegionName(regionFilter)} 지역: ${featuredCreators.filter(c => c.regions.includes(regionFilter)).length}명`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredCreators
                    .filter(creator => regionFilter === 'all' || creator.regions.includes(regionFilter))
                    .map(creator => (
                    <Card key={creator.id} className="border-2 border-yellow-200 bg-yellow-50">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{creator.channel_name}</h3>
                              <p className="text-sm text-gray-600">{creator.platform}</p>
                            </div>
                          </div>
                          <div className="text-yellow-500">
                            <Star className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">구독자</p>
                            <p className="font-bold">{creator.followers.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">평균 조회수</p>
                            <p className="font-bold">{creator.avg_views.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">카테고리</p>
                            <p className="font-bold">{creator.category}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">AI 점수</p>
                            <p className="font-bold text-yellow-600">{creator.evaluation_score}점</p>
                          </div>
                        </div>

                        {/* Regions */}
                        <div className="pt-3 border-t">
                          <p className="text-sm font-semibold text-gray-700 mb-2">활동 지역</p>
                          <div className="flex gap-2 flex-wrap">
                            {creator.regions.map(region => (
                              <span key={region} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {getRegionFlag(region)} {getRegionName(region)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 border-t space-y-2">
                          <p className="text-sm font-semibold text-gray-700">패키지 가격</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2 rounded">
                              <p className="text-gray-600">기본형</p>
                              <p className="font-bold">{creator.basic_price.toLocaleString()}원</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-gray-600">스탠다드</p>
                              <p className="font-bold">{creator.standard_price.toLocaleString()}원</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-gray-600">프리미엄</p>
                              <p className="font-bold">{creator.premium_price.toLocaleString()}원</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-gray-600">4주 연속</p>
                              <p className="font-bold">{creator.monthly_price.toLocaleString()}원</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Pick 뱃지 */}
                        {creator.is_ai_pick && (
                          <div className="pt-3 border-t">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                              <Star className="w-3 h-3 fill-current" />
                              AI PICK #{creator.ai_pick_order}
                            </span>
                          </div>
                        )}

                        {/* admin_bio 표시 */}
                        {creator.admin_bio && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-1 font-semibold">관리자 소개글</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{creator.admin_bio}</p>
                          </div>
                        )}

                        {/* 대표영상 표시 */}
                        {creator.representative_videos?.length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-1 font-semibold">대표영상 ({creator.representative_videos.length})</p>
                            <div className="flex gap-1">
                              {creator.representative_videos.map((v, vi) => (
                                <a key={vi} href={v.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={v.thumbnail} alt={v.title || '영상'} className="w-16 h-10 rounded object-cover border" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOpenEdit(creator)}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            편집
                          </Button>
                          <Button
                            onClick={() => handleViewProfile(creator)}
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            프로필
                          </Button>
                          <Button
                            onClick={() => handleDelete(creator.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>

      {/* 크리에이터 편집 모달 (admin_bio, representative_videos) */}
      <Dialog open={!!editCreator} onOpenChange={(open) => { if (!open) setEditCreator(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              크리에이터 편집: {editCreator?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 관리자 소개글 */}
            <div className="space-y-2">
              <Label>관리자 소개글 (최대 500자)</Label>
              <Textarea
                value={editFormData.admin_bio}
                onChange={(e) => setEditFormData(prev => ({ ...prev, admin_bio: e.target.value.slice(0, 500) }))}
                placeholder="이 크리에이터의 강점이나 특징을 소개해주세요..."
                rows={4}
              />
              <p className="text-xs text-gray-400 text-right">{editFormData.admin_bio.length}/500</p>
            </div>

            {/* 대표영상 */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>대표영상 (최대 3개)</span>
                {editFormData.representative_videos.length < 3 && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAddVideo}>
                    <Plus className="w-3 h-3 mr-1" />
                    영상 추가
                  </Button>
                )}
              </Label>
              {editFormData.representative_videos.map((video, index) => (
                <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg border relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => handleRemoveVideo(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="space-y-1">
                    <Label className="text-xs">YouTube URL</Label>
                    <Input
                      value={video.url}
                      onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">영상 제목</Label>
                    <Input
                      value={video.title}
                      onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                      placeholder="영상 제목..."
                    />
                  </div>
                  {video.thumbnail && (
                    <div className="flex items-center gap-2">
                      <img src={video.thumbnail} alt="썸네일" className="w-24 h-16 rounded object-cover border" />
                      <span className="text-xs text-green-600">썸네일 자동 생성됨</span>
                    </div>
                  )}
                </div>
              ))}
              {editFormData.representative_videos.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  대표영상을 추가하면 캠페인 상세 페이지에서 표시됩니다
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditCreator(null)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />저장 중...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />저장</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 가입 크리에이터 선택 모달 */}
      <Dialog open={showCreatorModal} onOpenChange={setShowCreatorModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              가입 크리에이터에서 선택
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Region Selection */}
            <div className="flex gap-2">
              {['korea', 'japan', 'us', 'taiwan'].map(region => (
                <Button
                  key={region}
                  variant={selectedRegion === region ? 'default' : 'outline'}
                  onClick={() => setSelectedRegion(region)}
                  size="sm"
                >
                  {getRegionFlag(region)} {getRegionName(region)}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="이름, 이메일, 채널명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRegisteredCreators()}
              />
              <Button onClick={searchRegisteredCreators} disabled={loadingCreators}>
                {loadingCreators ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Creator List */}
            <div className="space-y-2">
              {loadingCreators ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">크리에이터 검색 중...</p>
                </div>
              ) : registeredCreators.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>검색 결과가 없습니다</p>
                </div>
              ) : (
                registeredCreators.map(creator => (
                  <Card key={creator.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectCreator(creator)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {creator.profile_image ? (
                          <img src={creator.profile_image} alt={creator.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{creator.name || creator.channel_name || '이름 없음'}</h4>
                          <p className="text-sm text-gray-600">{creator.email}</p>
                          {creator.channel_name && <p className="text-xs text-gray-500">채널: {creator.channel_name}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">구독자: {creator.followers?.toLocaleString() || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{creator.category || '카테고리 없음'}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatorModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
