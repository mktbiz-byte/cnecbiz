import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Users, Video, Eye, ThumbsUp, MessageCircle, Sparkles } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function OurChannelReport() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const [channel, setChannel] = useState(null)
  const [stats, setStats] = useState(null)
  const [videos, setVideos] = useState([])
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)

  useEffect(() => {
    loadChannelData()
  }, [channelId])

  const loadChannelData = async () => {
    try {
      setLoading(true)

      // 채널 정보 로드
      const { data: channelData, error: channelError } = await supabaseBiz
        .from('our_channels')
        .select('*')
        .eq('id', channelId)
        .maybeSingle()

      if (channelError) throw channelError
      if (!channelData) throw new Error('채널을 찾을 수 없습니다.')

      setChannel(channelData)

      // YouTube API로 채널 통계 가져오기
      await fetchYouTubeStats(channelData)

    } catch (err) {
      console.error('데이터 로드 실패:', err)
      alert('채널 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchYouTubeStats = async (channelData) => {
    try {
      // YouTube Data API v3 사용
      const apiKey = channelData.youtube_api_key
      
      // 채널 통계
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelData.channel_id}&key=${apiKey}`
      )
      const channelResult = await channelResponse.json()
      
      if (channelResult.items && channelResult.items.length > 0) {
        const channelStats = channelResult.items[0].statistics
        const channelSnippet = channelResult.items[0].snippet
        
        setStats({
          subscriberCount: parseInt(channelStats.subscriberCount || 0),
          videoCount: parseInt(channelStats.videoCount || 0),
          viewCount: parseInt(channelStats.viewCount || 0),
          thumbnail: channelSnippet.thumbnails?.default?.url
        })
      }

      // 최근 업로드 영상 (최대 10개)
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelData.channel_id}&order=date&type=video&maxResults=10&key=${apiKey}`
      )
      const videosResult = await videosResponse.json()
      
      if (videosResult.items) {
        const videoIds = videosResult.items.map(item => item.id.videoId).join(',')
        
        // 영상 통계 가져오기
        const videoStatsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
        )
        const videoStatsResult = await videoStatsResponse.json()
        
        if (videoStatsResult.items) {
          const videosWithStats = videoStatsResult.items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.default?.url,
            viewCount: parseInt(item.statistics.viewCount || 0),
            likeCount: parseInt(item.statistics.likeCount || 0),
            commentCount: parseInt(item.statistics.commentCount || 0)
          }))
          
          setVideos(videosWithStats)
        }
      }

    } catch (err) {
      console.error('YouTube API 오류:', err)
    }
  }

  const generateAIInsights = async () => {
    if (!channel || !stats || !videos.length) return

    setLoadingInsights(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      const prompt = `당신은 YouTube 채널 분석 전문가입니다. 다음 채널 데이터를 분석하고 인사이트를 제공해주세요.

**채널 정보:**
- 채널명: ${channel.channel_name}
- 구독자: ${stats.subscriberCount.toLocaleString()}명
- 총 영상: ${stats.videoCount}개
- 총 조회수: ${stats.viewCount.toLocaleString()}회

**최근 영상 (최대 10개):**
${videos.map((v, i) => `${i + 1}. ${v.title}
   - 조회수: ${v.viewCount.toLocaleString()}
   - 좋아요: ${v.likeCount.toLocaleString()}
   - 댓글: ${v.commentCount.toLocaleString()}
   - 게시일: ${new Date(v.publishedAt).toLocaleDateString()}`).join('\n\n')}

다음 JSON 형식으로 응답해주세요:
{
  "overall_score": 채널 전체 점수 (0-100),
  "performance_summary": "채널 성과 요약 (2-3문장)",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "weaknesses": ["개선점 1", "개선점 2"],
  "recommendations": [
    {
      "title": "추천사항 제목",
      "description": "상세 설명",
      "priority": "high/medium/low"
    }
  ],
  "trending_topics": ["인기 주제 1", "인기 주제 2"],
  "engagement_analysis": "참여율 분석 (2-3문장)",
  "growth_prediction": "성장 전망 (2-3문장)"
}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        }
      )

      const result = await response.json()
      const text = result.candidates[0].content.parts[0].text
      
      // JSON 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const insightsData = JSON.parse(jsonMatch[0])
        setInsights(insightsData)
      }

    } catch (err) {
      console.error('AI 인사이트 생성 실패:', err)
      alert('AI 분석에 실패했습니다.')
    } finally {
      setLoadingInsights(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">채널 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">채널을 찾을 수 없습니다.</p>
              <Button onClick={() => navigate('/admin/our-channels')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const avgViews = videos.length > 0 
    ? Math.round(videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length)
    : 0

  const avgLikes = videos.length > 0
    ? Math.round(videos.reduce((sum, v) => sum + v.likeCount, 0) / videos.length)
    : 0

  const avgComments = videos.length > 0
    ? Math.round(videos.reduce((sum, v) => sum + v.commentCount, 0) / videos.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/our-channels')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            채널 목록으로
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{channel.channel_name}</h1>
              <p className="text-gray-600 mt-1">{channel.channel_url}</p>
            </div>
            <Button 
              onClick={generateAIInsights}
              disabled={loadingInsights || !videos.length}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loadingInsights ? 'AI 분석 중...' : 'AI 인사이트 생성'}
            </Button>
          </div>
        </div>

        {/* 채널 통계 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  구독자
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.subscriberCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  총 영상
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.videoCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  총 조회수
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.viewCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 평균 통계 */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">평균 조회수</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {avgViews.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">최근 {videos.length}개 영상 기준</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">평균 좋아요</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {avgLikes.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  참여율: {stats && avgViews > 0 ? ((avgLikes / avgViews) * 100).toFixed(2) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">평균 댓글</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {avgComments.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  댓글율: {stats && avgViews > 0 ? ((avgComments / avgViews) * 100).toFixed(2) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI 인사이트 */}
        {insights && (
          <div className="mb-6 space-y-6">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-900">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI 분석 인사이트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">채널 종합 점수</h3>
                    <span className="text-3xl font-bold text-purple-600">{insights.overall_score}/100</span>
                  </div>
                  <p className="text-gray-700">{insights.performance_summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-green-700 mb-2">✅ 강점</h3>
                    <ul className="space-y-1">
                      {insights.strengths.map((strength, i) => (
                        <li key={i} className="text-sm text-gray-700">• {strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-orange-700 mb-2">⚠️ 개선점</h3>
                    <ul className="space-y-1">
                      {insights.weaknesses.map((weakness, i) => (
                        <li key={i} className="text-sm text-gray-700">• {weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">💡 추천사항</h3>
                  <div className="space-y-3">
                    {insights.recommendations.map((rec, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg ${
                          rec.priority === 'high' ? 'bg-red-50 border border-red-200' :
                          rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-gray-900">{rec.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {rec.priority === 'high' ? '높음' : rec.priority === 'medium' ? '중간' : '낮음'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">🔥 인기 주제</h3>
                    <div className="flex flex-wrap gap-2">
                      {insights.trending_topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">📊 참여율 분석</h3>
                    <p className="text-sm text-gray-700">{insights.engagement_analysis}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">📈 성장 전망</h3>
                  <p className="text-sm text-gray-700">{insights.growth_prediction}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 최근 영상 목록 */}
        {videos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>최근 업로드 영상 ({videos.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-32 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 line-clamp-2">{video.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {video.viewCount.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {video.likeCount.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          {video.commentCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

