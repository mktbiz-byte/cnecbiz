import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, TrendingUp, Users, Video, Eye, ThumbsUp, MessageCircle, Sparkles, Save, Send } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function CreatorReport() {
  const { creatorId } = useParams()
  const navigate = useNavigate()
  const [creator, setCreator] = useState(null)
  const [stats, setStats] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState({
    weaknesses: '',
    upload_frequency: '',
    popular_videos: '',
    improvement_plan: '',
    overall_evaluation: ''
  })
  const [managerComment, setManagerComment] = useState('')
  const [savedReports, setSavedReports] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCreatorData()
    loadSavedReports()
  }, [creatorId])

  const loadCreatorData = async () => {
    try {
      setLoading(true)

      // 크리에이터 정보 로드
      const { data: creatorData, error: creatorError } = await supabaseBiz
        .from('affiliated_creators')
        .select('*')
        .eq('id', creatorId)
        .maybeSingle()

      if (creatorError) throw creatorError
      if (!creatorData) throw new Error('크리에이터를 찾을 수 없습니다.')

      setCreator(creatorData)

      // YouTube 데이터가 있으면 통계 가져오기
      if (creatorData.platform === 'youtube' && creatorData.platform_id) {
        await fetchYouTubeStats(creatorData)
      }

    } catch (err) {
      console.error('데이터 로드 실패:', err)
      alert('크리에이터 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadSavedReports = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('creator_reports')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedReports(data || [])
    } catch (err) {
      console.error('보고서 로드 실패:', err)
    }
  }

  const fetchYouTubeStats = async (creatorData) => {
    try {
      // YouTube API 키가 필요합니다
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
      if (!apiKey) {
        console.warn('YouTube API 키가 설정되지 않았습니다.')
        return
      }
      
      // 채널 통계
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${creatorData.platform_id}&key=${apiKey}`
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
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${creatorData.platform_id}&order=date&type=video&maxResults=10&key=${apiKey}`
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

  const generateAIAnalysis = async () => {
    if (!creator) return

    setLoadingAI(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        alert('Gemini API 키가 설정되지 않았습니다.')
        return
      }

      const statsInfo = stats ? `
**채널 통계:**
- 구독자: ${stats.subscriberCount.toLocaleString()}명
- 총 영상: ${stats.videoCount}개
- 총 조회수: ${stats.viewCount.toLocaleString()}회
` : ''

      const videosInfo = videos.length > 0 ? `
**최근 영상 (최대 10개):**
${videos.map((v, i) => `${i + 1}. ${v.title}
   - 조회수: ${v.viewCount.toLocaleString()}
   - 좋아요: ${v.likeCount.toLocaleString()}
   - 댓글: ${v.commentCount.toLocaleString()}
   - 게시일: ${new Date(v.publishedAt).toLocaleDateString()}`).join('\n\n')}
` : ''
      
      const prompt = `당신은 크리에이터 성과 분석 전문가입니다. 다음 크리에이터 데이터를 분석하고 상세한 보고서를 작성해주세요.

**크리에이터 정보:**
- 이름: ${creator.creator_name}
- 플랫폼: ${creator.platform}
- URL: ${creator.platform_url}
${creator.description ? `- 설명: ${creator.description}` : ''}
${statsInfo}
${videosInfo}

다음 5가지 항목에 대해 **구체적이고 상세하게** 분석해주세요. 각 항목은 최소 3-5문장 이상으로 작성하고, 구체적인 수치와 예시를 포함해주세요:

1. **약점 및 개선 필요 사항**: 현재 채널의 구체적인 문제점과 개선이 필요한 부분을 상세히 분석
2. **업로드 빈도 분석**: 영상 업로드 주기, 일관성, 최적 업로드 시간대 등을 구체적으로 분석
3. **인기 영상 분석**: 조회수가 높은 영상들의 공통점, 주제, 스타일 등을 상세히 분석
4. **개선 계획**: 단기/중기/장기 개선 방안을 구체적인 실행 계획과 함께 제시
5. **종합 평가**: 채널의 현재 상태, 성장 가능성, 강점과 약점을 종합적으로 평가

JSON 형식으로 응답해주세요:
{
  "weaknesses": "약점 및 개선 필요 사항 (상세하게 3-5문장)",
  "upload_frequency": "업로드 빈도 분석 (상세하게 3-5문장)",
  "popular_videos": "인기 영상 분석 (상세하게 3-5문장)",
  "improvement_plan": "개선 계획 (상세하게 3-5문장)",
  "overall_evaluation": "종합 평가 (상세하게 3-5문장)"
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
              maxOutputTokens: 4096
            }
          })
        }
      )

      const result = await response.json()
      const text = result.candidates[0].content.parts[0].text
      
      // JSON 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0])
        setAiAnalysis(analysisData)
      }

    } catch (err) {
      console.error('AI 분석 생성 실패:', err)
      alert('AI 분석에 실패했습니다.')
    } finally {
      setLoadingAI(false)
    }
  }

  const handleSaveReport = async (isPublished = false) => {
    if (!creator) return

    // 분석 내용이 비어있는지 확인
    const hasAnalysis = Object.values(aiAnalysis).some(value => value && value.trim() !== '')
    if (!hasAnalysis) {
      alert('먼저 AI 분석을 생성해주세요.')
      return
    }

    setSaving(true)
    try {
      const reportData = {
        creator_id: creatorId,
        creator_name: creator.creator_name,
        platform: creator.platform,
        analysis_weaknesses: aiAnalysis.weaknesses,
        analysis_upload_frequency: aiAnalysis.upload_frequency,
        analysis_popular_videos: aiAnalysis.popular_videos,
        analysis_improvement_plan: aiAnalysis.improvement_plan,
        analysis_overall_evaluation: aiAnalysis.overall_evaluation,
        manager_comment: managerComment,
        is_published: isPublished,
        stats_snapshot: stats ? JSON.stringify(stats) : null
      }

      const { error } = await supabaseBiz
        .from('creator_reports')
        .insert([reportData])

      if (error) throw error

      alert(isPublished ? '보고서가 발행되었습니다!' : '보고서가 저장되었습니다!')
      loadSavedReports()

    } catch (err) {
      console.error('보고서 저장 실패:', err)
      alert('보고서 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">크리에이터 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">크리에이터를 찾을 수 없습니다.</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
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
            onClick={() => navigate('/admin/creators')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            크리에이터 목록으로
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{creator.creator_name}</h1>
              <p className="text-gray-600 mt-1">{creator.platform_url}</p>
            </div>
            <Button 
              onClick={generateAIAnalysis}
              disabled={loadingAI}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loadingAI ? 'AI 분석 중...' : 'AI 분석 생성'}
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

        {/* AI 분석 결과 */}
        {Object.values(aiAnalysis).some(value => value && value.trim() !== '') && (
          <div className="mb-6 space-y-6">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-900">
                  <Sparkles className="w-5 h-5 mr-2" />
                  AI 성과 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. 약점 및 개선 필요 사항</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiAnalysis.weaknesses}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. 업로드 빈도 분석</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiAnalysis.upload_frequency}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. 인기 영상 분석</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiAnalysis.popular_videos}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. 개선 계획</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiAnalysis.improvement_plan}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">5. 종합 평가</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiAnalysis.overall_evaluation}</p>
                </div>
              </CardContent>
            </Card>

            {/* 담당자 코멘트 */}
            <Card>
              <CardHeader>
                <CardTitle>담당자 코멘트</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="담당자 의견을 입력하세요..."
                  rows={4}
                  className="mb-4"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveReport(false)}
                    disabled={saving}
                    variant="outline"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    임시 저장
                  </Button>
                  <Button
                    onClick={() => handleSaveReport(true)}
                    disabled={saving}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    발행
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 저장된 보고서 목록 */}
        {savedReports.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>저장된 보고서 ({savedReports.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div key={report.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {report.is_published ? '발행됨' : '임시저장'}
                      </span>
                    </div>
                    {report.manager_comment && (
                      <p className="text-sm text-gray-600 line-clamp-2">{report.manager_comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
