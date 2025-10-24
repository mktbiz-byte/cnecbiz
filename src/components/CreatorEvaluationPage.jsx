import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { analyzeCreator, formatEvaluation } from '../lib/geminiService'
import { Loader2, TrendingUp, Users, Eye, Heart, MessageCircle, Award } from 'lucide-react'

export default function CreatorEvaluationPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    platform: 'youtube',
    channel_name: '',
    channel_url: '',
    followers: '',
    avg_views: '',
    avg_likes: '',
    avg_comments: '',
    category: '',
    target_audience: '',
    content_style: '',
    sample_videos: ''
  })

  // Mock campaign data - 실제로는 Supabase에서 가져와야 함
  const campaignData = {
    brand_name: '뷰티브랜드',
    product_name: '수분크림',
    brand_identity: '자연주의, 친환경, 20-30대 여성',
    target_customer: '20-30대 여성, 건성 피부'
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePlatformChange = (value) => {
    setFormData(prev => ({ ...prev, platform: value }))
  }

  const handleAnalyze = async () => {
    setError('')
    setLoading(true)

    try {
      // Validate form
      if (!formData.channel_name || !formData.followers || !formData.avg_views) {
        setError('필수 항목을 모두 입력해주세요.')
        setLoading(false)
        return
      }

      // Convert string numbers to integers
      const creatorData = {
        ...formData,
        followers: parseInt(formData.followers.replace(/,/g, '')),
        avg_views: parseInt(formData.avg_views.replace(/,/g, '')),
        avg_likes: parseInt(formData.avg_likes.replace(/,/g, '') || '0'),
        avg_comments: parseInt(formData.avg_comments.replace(/,/g, '') || '0'),
        sample_videos: formData.sample_videos.split('\n').filter(url => url.trim())
      }

      // Analyze creator with AI
      const result = await analyzeCreator(creatorData, campaignData)
      const formatted = formatEvaluation(result)
      
      setEvaluation(formatted)
    } catch (err) {
      console.error('Error analyzing creator:', err)
      setError('크리에이터 분석 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = () => {
    // 크리에이터 승인 후 가이드 생성 페이지로 이동
    navigate(`/campaigns/${campaignId}/guide`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">크리에이터 평가</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">크리에이터 정보 입력</CardTitle>
                <CardDescription>
                  크리에이터의 채널 정보를 입력하면 AI가 자동으로 분석합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Platform */}
                <div className="space-y-2">
                  <Label htmlFor="platform" className="text-base font-semibold">
                    플랫폼 *
                  </Label>
                  <Select value={formData.platform} onValueChange={handlePlatformChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="instagram">Instagram (준비중)</SelectItem>
                      <SelectItem value="tiktok">TikTok (준비중)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel Name */}
                <div className="space-y-2">
                  <Label htmlFor="channel_name" className="text-base font-semibold">
                    채널/계정명 *
                  </Label>
                  <Input
                    id="channel_name"
                    name="channel_name"
                    value={formData.channel_name}
                    onChange={handleInputChange}
                    placeholder="예: 뷰티유튜버김지수"
                  />
                </div>

                {/* Channel URL */}
                <div className="space-y-2">
                  <Label htmlFor="channel_url" className="text-base font-semibold">
                    채널 URL
                  </Label>
                  <Input
                    id="channel_url"
                    name="channel_url"
                    value={formData.channel_url}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/@channel"
                  />
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="followers" className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      구독자/팔로워 *
                    </Label>
                    <Input
                      id="followers"
                      name="followers"
                      value={formData.followers}
                      onChange={handleInputChange}
                      placeholder="50000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avg_views" className="text-base font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      평균 조회수 *
                    </Label>
                    <Input
                      id="avg_views"
                      name="avg_views"
                      value={formData.avg_views}
                      onChange={handleInputChange}
                      placeholder="10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avg_likes" className="text-base font-semibold flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      평균 좋아요
                    </Label>
                    <Input
                      id="avg_likes"
                      name="avg_likes"
                      value={formData.avg_likes}
                      onChange={handleInputChange}
                      placeholder="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avg_comments" className="text-base font-semibold flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      평균 댓글
                    </Label>
                    <Input
                      id="avg_comments"
                      name="avg_comments"
                      value={formData.avg_comments}
                      onChange={handleInputChange}
                      placeholder="50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-base font-semibold">
                    콘텐츠 카테고리
                  </Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="예: 뷰티, 패션, 라이프스타일"
                  />
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="target_audience" className="text-base font-semibold">
                    타겟 오디언스
                  </Label>
                  <Input
                    id="target_audience"
                    name="target_audience"
                    value={formData.target_audience}
                    onChange={handleInputChange}
                    placeholder="예: 20-30대 여성"
                  />
                </div>

                {/* Content Style */}
                <div className="space-y-2">
                  <Label htmlFor="content_style" className="text-base font-semibold">
                    콘텐츠 스타일
                  </Label>
                  <Input
                    id="content_style"
                    name="content_style"
                    value={formData.content_style}
                    onChange={handleInputChange}
                    placeholder="예: 자연스러운 일상 브이로그, 솔직한 리뷰"
                  />
                </div>

                {/* Sample Videos */}
                <div className="space-y-2">
                  <Label htmlFor="sample_videos" className="text-base font-semibold">
                    대표 영상 URL (한 줄에 하나씩)
                  </Label>
                  <Textarea
                    id="sample_videos"
                    name="sample_videos"
                    value={formData.sample_videos}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/watch?v=..."
                    rows={4}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleAnalyze} 
                  disabled={loading}
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-5 w-5" />
                      AI 분석 시작
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Evaluation Result */}
          <div>
            {evaluation ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">종합 평가</CardTitle>
                      <div className={`px-4 py-2 rounded-lg border-2 ${evaluation.badge.color} flex items-center gap-2`}>
                        <span className="text-2xl">{evaluation.badge.emoji}</span>
                        <span className="font-bold text-lg">{evaluation.badge.level}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Total Score */}
                    <div className="text-center py-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                      <div className="text-6xl font-bold text-blue-600 mb-2">
                        {evaluation.total_score}
                      </div>
                      <div className="text-lg text-gray-600">/ 100점</div>
                    </div>

                    {/* Description */}
                    <p className="text-base text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                      {evaluation.badge.description}
                    </p>

                    {/* Score Breakdown */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">세부 점수</h3>
                      {evaluation.score_breakdown.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-medium">{item.category}</span>
                            <span className="text-base font-bold text-blue-600">
                              {item.score} / {item.max}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      강점
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-3 text-base">
                          <span className="text-green-500 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Concerns */}
                {evaluation.concerns && evaluation.concerns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span className="text-2xl">⚠️</span>
                        주의사항
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {evaluation.concerns.map((concern, index) => (
                          <li key={index} className="flex items-start gap-3 text-base">
                            <span className="text-yellow-500 mt-1">•</span>
                            <span className="text-gray-700 leading-relaxed">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span className="text-2xl">💡</span>
                      추천 전략
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {evaluation.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-3 text-base">
                          <span className="text-blue-500 mt-1">•</span>
                          <span className="text-gray-700 leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-base text-gray-800 leading-relaxed">
                      <strong className="text-blue-700">AI 요약:</strong> {evaluation.summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    onClick={handleApprove}
                    className="flex-1 h-12 text-base"
                    size="lg"
                  >
                    <Award className="mr-2 h-5 w-5" />
                    승인 및 가이드 생성
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setEvaluation(null)}
                    className="h-12 text-base"
                  >
                    다시 분석
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-500">
                    크리에이터 정보를 입력하고<br />
                    AI 분석을 시작해주세요
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

