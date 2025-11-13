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
      
      const prompt = `당신은 YouTube 채널 성과 분석 전문 컨설턴트입니다. 아래 실제 데이터를 기반으로 **즉시 실행 가능한 구체적인 인사이트**를 제공해주세요.

**크리에이터 정보:**
- 이름: ${creator.creator_name}
- 플랫폼: ${creator.platform}
- URL: ${creator.platform_url}
${creator.description ? `- 설명: ${creator.description}` : ''}
${statsInfo}
${videosInfo}

**분석 요구사항:**
각 항목은 **실제 데이터 기반**으로 작성하고, 일반론이 아닌 **이 채널만의 구체적인 인사이트**를 제공하세요.

1. **핵심 문제점 및 즉시 개선 사항** (3-4문장)
   - 조회수/참여율 데이터에서 발견된 구체적 문제
   - 숫자로 표현 가능한 개선 목표 제시
   - 예: "최근 10개 영상 중 5개가 평균 조회수의 50% 미만. 썸네일 A/B 테스트로 클릭률 20% 개선 목표"

2. **업로드 패턴 및 최적화 제안** (3-4문장)
   - 실제 업로드 날짜 기반 주기 계산
   - 조회수가 높은 영상의 업로드 요일/시간대 패턴
   - 구체적인 업로드 스케줄 제안

3. **인기 영상 성공 요인 분석** (3-4문장)
   - 상위 조회수 영상의 구체적인 공통점 (제목 패턴, 주제, 길이 등)
   - 숫자 기반 비교 (예: "상위 3개 영상 평균 조회수 50만 vs 하위 평균 5만")
   - 재현 가능한 성공 공식 제시

4. **3개월 실행 계획** (우선순위별 3-5개 액션)
   - 1순위: [구체적 액션] - 예상 효과: [%]
   - 2순위: [구체적 액션] - 예상 효과: [%]
   - 각 액션은 측정 가능한 KPI 포함

5. **채널 성장 잠재력 평가** (3-4문장)
   - 현재 성과 vs 동일 카테고리 벤치마크 비교
   - 3개월/6개월 성장 목표 (구독자, 조회수)
   - 핵심 강점 1개, 핵심 약점 1개

JSON 형식으로 응답:
{
  "weaknesses": "구체적 수치 포함",
  "upload_frequency": "실제 날짜 기반 분석",
  "popular_videos": "상위 영상 데이터 비교",
  "improvement_plan": "우선순위별 액션 리스트",
  "overall_evaluation": "숫자 기반 평가"
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

  // 총 조회수 계산
  const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0)

  // 업로드 주기 계산 (일 단위)
  const uploadFrequency = videos.length > 1
    ? (() => {
        const dates = videos.map(v => new Date(v.publishedAt)).sort((a, b) => b - a)
        const daysDiff = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24)
        return Math.round(daysDiff / (videos.length - 1))
      })()
    : 0

  // 참여율 계산
  const engagementRate = avgViews > 0 ? ((avgLikes + avgComments) / avgViews * 100).toFixed(2) : 0

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

        {/* 상세 통계 대시보드 */}
        {videos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">통계 대시보드</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-blue-700">최근 영상 수</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-900">{videos.length}개</p>
                  <p className="text-xs text-blue-600 mt-1">분석 기준</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-purple-700">총 조회수</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-900">{totalViews.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">최근 영상 합계</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-green-700">업로드 주기</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-900">{uploadFrequency}일</p>
                  <p className="text-xs text-green-600 mt-1">평균 간격</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-orange-700">참여율</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-900">{engagementRate}%</p>
                  <p className="text-xs text-orange-600 mt-1">좋아요+댓글/조회</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="mb-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-600" />
                AI 성과 분석
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-red-700 flex items-center">
                    🚨 핵심 문제점 및 즉시 개선 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.weaknesses}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-blue-700 flex items-center">
                    📅 업로드 패턴 및 최적화 제안
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.upload_frequency}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-green-700 flex items-center">
                    🏆 인기 영상 성공 요인 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.popular_videos}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-purple-700 flex items-center">
                    🎯 3개월 실행 계획
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.improvement_plan}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-yellow-700 flex items-center">
                    📊 채널 성장 잠재력 평가
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.overall_evaluation}</p>
                </CardContent>
              </Card>
            </div>

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
