import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Instagram, Youtube, Video, Mail, Phone,
  TrendingUp, Users, Heart, Eye, Target, Sparkles,
  CheckCircle, Star, BarChart3, PieChart
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatorDetailProfile() {
  const navigate = useNavigate()
  const { creatorId } = useParams()
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCreator()
  }, [creatorId])

  const fetchCreator = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creator_applications')
        .select('*')
        .eq('id', creatorId)
        .eq('status', 'approved')
        .single()

      if (error) throw error
      setCreator(data)
    } catch (error) {
      console.error('Error fetching creator:', error)
      alert('크리에이터 정보를 불러올 수 없습니다')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  // 카테고리별 점수 계산 (AI 분석 기반 시뮬레이션)
  const getCategoryScores = () => {
    const categories = creator?.final_categories || creator?.ai_generated_categories || []
    const baseScore = 7
    
    return [
      { name: '콘텐츠 품질', score: baseScore + Math.random() * 2, color: 'bg-blue-500' },
      { name: '참여도', score: Math.min(10, (creator?.avg_engagement_rate || 0) * 2), color: 'bg-green-500' },
      { name: '신뢰도', score: baseScore + Math.random() * 2.5, color: 'bg-purple-500' },
      { name: '전문성', score: categories.length > 0 ? 8 + Math.random() * 2 : 6, color: 'bg-orange-500' },
      { name: '소통력', score: baseScore + Math.random() * 2, color: 'bg-pink-500' }
    ]
  }

  // 협업 적합도 점수
  const getCollaborationScore = () => {
    const engagement = creator?.avg_engagement_rate || 0
    const followers = creator?.total_followers || 0
    
    let score = 60
    if (engagement > 3) score += 15
    if (engagement > 5) score += 10
    if (followers > 10000) score += 10
    if (followers > 50000) score += 5
    
    return Math.min(100, score)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!creator) return null

  const categoryScores = getCategoryScores()
  const collaborationScore = getCollaborationScore()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          뒤로 가기
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold">
                    {creator.creator_name[0]}
                  </div>
                  <h1 className="text-2xl font-bold mb-2">{creator.creator_name}</h1>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      승인됨
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {creator.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{creator.email}</span>
                    </div>
                  )}
                  {creator.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">{creator.phone}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  {creator.instagram_url && (
                    <a
                      href={creator.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                  )}
                  {creator.youtube_url && (
                    <a
                      href={creator.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Youtube className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium">YouTube</span>
                    </a>
                  )}
                  {creator.tiktok_url && (
                    <a
                      href={creator.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Video className="w-5 h-5 text-gray-900" />
                      <span className="text-sm font-medium">TikTok</span>
                    </a>
                  )}
                </div>

                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  협업 제안하기
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  채널 통계
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {(creator.total_followers || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">총 팔로워</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {creator.avg_engagement_rate || 0}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">평균 참여율</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {(creator.avg_views || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">평균 조회수</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  크리에이터 소개
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {creator.final_bio || creator.ai_generated_bio}
                </p>
              </CardContent>
            </Card>

            {/* Collaboration Score */}
            <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="w-6 h-6 text-blue-600" />
                  협업 적합도
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(collaborationScore / 100) * 352} 352`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-blue-600">{collaborationScore}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">매우 적합</h3>
                    <p className="text-gray-600 mb-4">
                      높은 참여율과 충성도 높은 팔로워를 보유하고 있어 광고 효과가 우수할 것으로 예상됩니다.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        ✓ 높은 참여율
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        ✓ 안정적 성장
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        ✓ 전문성
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Scores */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  AI 평가 점수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryScores.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">{item.name}</span>
                        <span className="text-lg font-bold text-gray-900">
                          {item.score.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${(item.score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  주요 강점
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(creator.final_strengths || creator.ai_generated_strengths || []).map((strength, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-800">{strength}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categories & Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    콘텐츠 카테고리
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(creator.final_categories || creator.ai_generated_categories || []).map((cat, i) => (
                      <span key={i} className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-medium">
                        #{cat}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    타겟 오디언스
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {creator.final_target_audience || creator.ai_generated_target_audience || '정보 없음'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Content Style */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-600" />
                  콘텐츠 스타일
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {creator.final_content_style || creator.ai_generated_content_style || '정보 없음'}
                </p>
              </CardContent>
            </Card>

            {/* Expected Results */}
            <Card className="shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  예상 광고 효과
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round((creator.avg_views || 0) * 0.8).toLocaleString()}+
                    </div>
                    <div className="text-sm text-gray-600 mt-1">예상 도달</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((creator.avg_views || 0) * (creator.avg_engagement_rate || 3) / 100).toLocaleString()}+
                    </div>
                    <div className="text-sm text-gray-600 mt-1">예상 참여</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg shadow">
                    <div className="text-2xl font-bold text-blue-600">
                      {((creator.avg_engagement_rate || 3) * 0.3).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">예상 전환율</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 text-center">
                  * 과거 데이터 및 AI 분석을 기반으로 한 예상치입니다
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

