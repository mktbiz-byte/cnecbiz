import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { analyzeCreator, formatEvaluation } from '../../lib/geminiService'
import { 
  Star, Plus, Edit, Trash2, Eye, Loader2, 
  TrendingUp, Users, Award, DollarSign 
} from 'lucide-react'

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
  
  const [featuredCreators, setFeaturedCreators] = useState([
    // Mock data
    {
      id: 1,
      channel_name: '뷰티유튜버김지수',
      platform: 'youtube',
      followers: 150000,
      avg_views: 50000,
      category: '뷰티',
      regions: ['japan', 'korea'],
      evaluation_score: 95,
      basic_price: 500000,
      standard_price: 700000,
      premium_price: 1000000,
      monthly_price: 3000000,
      created_at: '2025-10-15'
    }
  ])

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
    setAnalyzing(true)

    try {
      const creatorData = {
        ...formData,
        followers: parseInt(formData.followers.replace(/,/g, '')),
        avg_views: parseInt(formData.avg_views.replace(/,/g, '')),
        avg_likes: parseInt(formData.avg_likes.replace(/,/g, '') || '0'),
        avg_comments: parseInt(formData.avg_comments.replace(/,/g, '') || '0'),
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
    } catch (err) {
      console.error('Error analyzing creator:', err)
      alert('크리에이터 분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = () => {
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

    const newCreator = {
      id: Date.now(),
      ...formData,
      followers: parseInt(formData.followers.replace(/,/g, '')),
      avg_views: parseInt(formData.avg_views.replace(/,/g, '')),
      basic_price: parseInt(formData.basic_price.replace(/,/g, '')),
      standard_price: parseInt(formData.standard_price.replace(/,/g, '')),
      premium_price: parseInt(formData.premium_price.replace(/,/g, '')),
      monthly_price: parseInt(formData.monthly_price.replace(/,/g, '')),
      regions: formData.regions,  // Include regions
      evaluation_score: evaluation.total_score,
      evaluation_data: evaluation,
      created_at: new Date().toISOString().split('T')[0]
    }

    setFeaturedCreators([...featuredCreators, newCreator])
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
      regions: [],  // Reset regions
      basic_price: '',
      standard_price: '',
      premium_price: '',
      monthly_price: ''
    })
    setEvaluation(null)
  }

  const handleDelete = (id) => {
    if (confirm('정말 이 크리에이터를 삭제하시겠습니까?')) {
      setFeaturedCreators(featuredCreators.filter(c => c.id !== id))
    }
  }

  const handleViewProfile = (creator) => {
    // Navigate to profile view page
    navigate(`/admin/featured-creators/${creator.id}/profile`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                  <CardTitle className="text-xl">크리에이터 정보</CardTitle>
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
                      placeholder="뷰티, 패션, 라이프스타일"
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
                    <Input
                      name="content_style"
                      value={formData.content_style}
                      onChange={handleInputChange}
                      placeholder="자연스러운 일상 브이로그"
                    />
                  </div>

                  {/* Sample Videos */}
                  <div className="space-y-2">
                    <Label>대표 영상 URL (한 줄에 하나씩)</Label>
                    <Textarea
                      name="sample_videos"
                      value={formData.sample_videos}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  {/* Regions */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">활동 지역 * (다중 선택 가능)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['japan', 'us', 'taiwan', 'korea'].map(region => (
                        <button
                          key={region}
                          type="button"
                          onClick={() => handleRegionToggle(region)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            formData.regions.includes(region)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getRegionFlag(region)}</span>
                            <span className="font-semibold">{getRegionName(region)}</span>
                            {formData.regions.includes(region) && (
                              <span className="ml-auto text-blue-500">✓</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      선택된 지역: {formData.regions.length > 0 
                        ? formData.regions.map(r => getRegionName(r)).join(', ')
                        : '없음'}
                    </p>
                  </div>

                  <Button 
                    onClick={handleAnalyze} 
                    disabled={analyzing}
                    className="w-full"
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
                </CardContent>
              </Card>

              {/* Pricing */}
              {evaluation && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      패키지별 가격 설정
                    </CardTitle>
                    <CardDescription>
                      이 크리에이터의 패키지별 가격을 설정하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>20만원 기본형 → 추천 크리에이터 가격</Label>
                      <Input
                        name="basic_price"
                        value={formData.basic_price}
                        onChange={handleInputChange}
                        placeholder="500000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>30만원 스탠다드 → 추천 크리에이터 가격</Label>
                      <Input
                        name="standard_price"
                        value={formData.standard_price}
                        onChange={handleInputChange}
                        placeholder="700000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>40만원 프리미엄 → 추천 크리에이터 가격</Label>
                      <Input
                        name="premium_price"
                        value={formData.premium_price}
                        onChange={handleInputChange}
                        placeholder="1000000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>60만원 4주 연속 → 추천 크리에이터 가격</Label>
                      <Input
                        name="monthly_price"
                        value={formData.monthly_price}
                        onChange={handleInputChange}
                        placeholder="3000000"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Evaluation Result */}
            <div>
              {evaluation ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">AI 평가 결과</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center py-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                        <div className="text-6xl font-bold text-yellow-600 mb-2">
                          {evaluation.total_score}
                        </div>
                        <div className="text-lg text-gray-600">/ 100점</div>
                        <div className={`mt-4 inline-block px-4 py-2 rounded-lg border-2 ${evaluation.badge.color}`}>
                          <span className="text-2xl mr-2">{evaluation.badge.emoji}</span>
                          <span className="font-bold">{evaluation.badge.level}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold">✅ 강점</h4>
                        <ul className="space-y-2">
                          {evaluation.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-gray-700">• {s}</li>
                          ))}
                        </ul>
                      </div>

                      {evaluation.concerns && evaluation.concerns.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-semibold">⚠️ 주의사항</h4>
                          <ul className="space-y-2">
                            {evaluation.concerns.map((c, i) => (
                              <li key={i} className="text-sm text-gray-700">• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button onClick={handleSave} className="flex-1">
                      <Award className="mr-2 h-4 w-4" />
                      추천 크리에이터 등록
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowForm(false)
                      setEvaluation(null)
                    }}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      크리에이터 정보를 입력하고<br />
                      AI 분석을 시작해주세요
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Creator List */
          <div className="space-y-6">
            {/* Region Filter */}
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

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleViewProfile(creator)}
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            프로필 보기
                          </Button>
                          <Button 
                            onClick={() => handleDelete(creator.id)}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
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
  )
}

