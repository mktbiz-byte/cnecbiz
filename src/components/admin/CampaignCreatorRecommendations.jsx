import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, Sparkles, TrendingUp, Users, Target, 
  Heart, Eye, Instagram, Youtube, Video, ExternalLink,
  RefreshCw, Loader2, ChevronDown, ChevronUp, Download, FileText, Printer
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { 
  generateCampaignRecommendations, 
  getCampaignRecommendations,
  getAllCampaignMatches 
} from '../../lib/creatorMatchingService'
import { 
  exportMatchingToCSV, 
  exportMatchingToJSON, 
  printMatchingReport 
} from '../../lib/matchingExportService'

export default function CampaignCreatorRecommendations() {
  const navigate = useNavigate()
  const { campaignId } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [allMatches, setAllMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [expandedCreator, setExpandedCreator] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchCampaign()
    fetchRecommendations()
  }, [campaignId])

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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error fetching campaign:', error)
      alert('캠페인 정보를 불러오는데 실패했습니다')
    }
  }

  const fetchRecommendations = async () => {
    setLoading(true)
    try {
      const topRecs = await getCampaignRecommendations(campaignId, 10)
      setRecommendations(topRecs)

      const allRecs = await getAllCampaignMatches(campaignId)
      setAllMatches(allRecs)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateRecommendations = async () => {
    if (!confirm('AI 매칭을 실행하시겠습니까? 기존 매칭 결과는 삭제됩니다.')) {
      return
    }

    setGenerating(true)
    try {
      const result = await generateCampaignRecommendations(campaignId)
      alert(`매칭 완료!\n총 ${result.total_creators}명 중 상위 10명을 추천합니다.`)
      await fetchRecommendations()
    } catch (error) {
      console.error('Error generating recommendations:', error)
      alert('매칭 생성 실패: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return '매우 적합'
    if (score >= 60) return '적합'
    if (score >= 40) return '보통'
    return '부적합'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      category_match: Target,
      audience_match: Users,
      engagement: Heart,
      followers: TrendingUp,
      content_style: Sparkles,
      brand_fit: Eye
    }
    return icons[category] || Target
  }

  const CreatorCard = ({ match, rank, isExpanded, onToggle }) => {
    const creator = match.creator
    const Icon = getCategoryIcon('category_match')

    return (
      <Card className={`${isExpanded ? 'ring-2 ring-blue-500' : ''} transition-all`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4 flex-1">
              {rank && (
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  rank <= 3 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                  rank <= 10 ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' :
                  'bg-gray-200 text-gray-700'
                }`}>
                  {rank}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{creator.creator_name}</h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(match.match_score)}`}>
                    {Math.round(match.match_score)}점 · {getScoreLabel(match.match_score)}
                  </div>
                </div>

                <p className="text-gray-600 mb-3 line-clamp-2">
                  {creator.final_bio || creator.ai_generated_bio}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {(creator.final_categories || creator.ai_generated_categories || []).map((cat, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                      {cat}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  {creator.instagram_url && (
                    <a
                      href={creator.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-pink-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                  {creator.youtube_url && (
                    <a
                      href={creator.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-red-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </a>
                  )}
                  {creator.tiktok_url && (
                    <a
                      href={creator.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-black"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Video className="w-4 h-4" />
                      TikTok
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">팔로워</div>
                    <div className="font-bold">{(creator.total_followers || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">참여율</div>
                    <div className="font-bold">{creator.avg_engagement_rate || 0}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">평균 조회수</div>
                    <div className="font-bold">{(creator.avg_views || 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="border-t pt-4 mt-4 space-y-4">
              {/* Summary */}
              {match.recommendation_summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI 추천 요약
                  </h4>
                  <p className="text-blue-800">{match.recommendation_summary}</p>
                </div>
              )}

              {/* Detailed Scores */}
              <div>
                <h4 className="font-bold mb-3">상세 매칭 점수</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '카테고리 일치도', score: match.category_match_score, icon: Target },
                    { label: '타겟 오디언스', score: match.audience_match_score, icon: Users },
                    { label: '참여율', score: match.engagement_score, icon: Heart },
                    { label: '팔로워 규모', score: match.follower_score, icon: TrendingUp },
                    { label: '콘텐츠 스타일', score: match.content_style_score, icon: Sparkles }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <item.icon className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600">{item.label}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold">{Math.round(item.score)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Match Reasons */}
              {match.match_reasons && match.match_reasons.length > 0 && (
                <div>
                  <h4 className="font-bold mb-3">추천 이유</h4>
                  <div className="space-y-2">
                    {match.match_reasons.map((reason, i) => {
                      const ReasonIcon = getCategoryIcon(reason.category)
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`p-2 rounded-lg ${getScoreColor(reason.score)}`}>
                            <ReasonIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium mb-1">{reason.title}</div>
                            <div className="text-sm text-gray-600">{reason.reason}</div>
                          </div>
                          <div className="text-sm font-bold text-gray-700">
                            {Math.round(reason.score)}점
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Creator Strengths */}
              {(creator.final_strengths || creator.ai_generated_strengths || []).length > 0 && (
                <div>
                  <h4 className="font-bold mb-3">크리에이터 강점</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(creator.final_strengths || creator.ai_generated_strengths || []).map((strength, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              캠페인 목록으로
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI 크리에이터 추천</h1>
              {campaign && (
                <p className="text-gray-600 mt-1">{campaign.title}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {recommendations.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => exportMatchingToCSV(campaign, allMatches)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV 다운로드
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printMatchingReport(campaign, recommendations)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  인쇄
                </Button>
              </>
            )}
            <Button
              onClick={handleGenerateRecommendations}
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 매칭 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  AI 매칭 재생성
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Campaign Info */}
        {campaign && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">카테고리</div>
                  <div className="font-bold">{campaign.product_category}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">예산</div>
                  <div className="font-bold">{campaign.budget?.toLocaleString()}원</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">크리에이터 수</div>
                  <div className="font-bold">{campaign.creator_count}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">매칭 상태</div>
                  <div className="font-bold">
                    {recommendations.length > 0 ? `${recommendations.length}명 추천됨` : '매칭 필요'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Recommendations */}
        {recommendations.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold mb-2">아직 매칭 결과가 없습니다</h3>
              <p className="text-gray-600 mb-6">
                AI 매칭을 실행하여 이 캠페인에 최적화된 크리에이터를 찾아보세요
              </p>
              <Button
                onClick={handleGenerateRecommendations}
                disabled={generating}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI 매칭 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI 매칭 시작하기
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Top 10 Recommendations */}
        {recommendations.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                🏆 Top 10 추천 크리에이터
              </h2>
              <p className="text-gray-600">
                AI가 분석한 {allMatches.length}명 중 가장 적합한 10명입니다
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {recommendations.map((match) => (
                <CreatorCard
                  key={match.id}
                  match={match}
                  rank={match.recommendation_rank}
                  isExpanded={expandedCreator === match.id}
                  onToggle={() => setExpandedCreator(expandedCreator === match.id ? null : match.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* All Matches (Expandable) */}
        {allMatches.length > 10 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>전체 매칭 결과 ({allMatches.length}명)</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllMatches(!showAllMatches)}
                >
                  {showAllMatches ? '접기' : '펼치기'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showAllMatches && (
              <CardContent>
                <div className="space-y-4">
                  {allMatches.slice(10).map((match) => (
                    <CreatorCard
                      key={match.id}
                      match={match}
                      rank={match.recommendation_rank}
                      isExpanded={expandedCreator === match.id}
                      onToggle={() => setExpandedCreator(expandedCreator === match.id ? null : match.id)}
                    />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

