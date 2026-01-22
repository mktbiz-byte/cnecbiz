import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, TrendingUp, Users, Video, Eye, ThumbsUp, MessageCircle, Sparkles, Save, Send } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function OurChannelReport() {
  const { channelId } = useParams()
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
    overall_evaluation: '',
    recommended_shorts: ''
  })
  const [managerComment, setManagerComment] = useState('')
  const [savedReports, setSavedReports] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCreatorData()
    loadSavedReports()
  }, [channelId])

  const loadCreatorData = async () => {
    try {
      setLoading(true)

      // 채널 정보 로드
      const { data: creatorData, error: creatorError } = await supabaseBiz
        .from('our_channels')
        .select('*')
        .eq('id', channelId)
        .maybeSingle()

      if (creatorError) throw creatorError
      if (!creatorData) throw new Error('채널을 찾을 수 없습니다.')

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
        .eq('creator_id', channelId)
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
      
      const prompt = `당신은 한국 뷰티/라이프스타일 YouTube 채널 전문 컨설턴트입니다. 아래 실제 데이터를 기반으로 **구체적인 근거와 함께 실행 가능한 인사이트**를 제공해주세요.

**크리에이터 정보:**
- 이름: ${creator.creator_name}
- 플랫폼: ${creator.platform}
- URL: ${creator.platform_url}
${creator.description ? `- 설명: ${creator.description}` : ''}
${statsInfo}
${videosInfo}

**분석 요구사항:**

1. **핵심 문제점 및 즉시 개선 사항** (5-6문장)
   - 실제 데이터를 인용하며 구체적 문제점 지적
   - 예: "최근 10개 영상 중 5개가 평균 조회수 50,000회의 절반인 25,000회에 못 미칩니다. 특히 [영상 제목]은 15,000회로 가장 저조합니다."
   - 문제의 원인 분석 (썸네일, 제목, 초반 30초 등)
   - 구체적 개선 방법과 예상 효과 제시
   - 벤치마크 채널과 비교 (예: "동일 카테고리 상위 채널은 평균 조회수 100,000회")

2. **업로드 패턴 및 최적화 제안** (5-6문장)
   - 실제 업로드 날짜를 분석하여 현재 주기 계산 (예: "평균 3.5일 간격")
   - 조회수 상위 3개 영상의 업로드 요일/시간 패턴 분석
   - 최적 업로드 시간대 제안 (데이터 기반 근거 포함)
   - 일관성 있는 업로드 스케줄의 중요성 설명
   - 구체적 스케줄 제안 (예: "매주 수요일 오후 6시, 토요일 오전 11시")

3. **인기 영상 성공 요인 분석** (5-6문장)
   - 상위 3개 영상의 제목, 조회수, 좋아요 수 명시
   - 공통 패턴 분석 (제목 키워드, 썸네일 스타일, 영상 길이)
   - 하위 영상과의 구체적 비교 (숫자 포함)
   - 성공 요인의 재현 가능성 평가
   - 다음 영상에 적용할 구체적 전략

4. **3개월 실행 계획** (우선순위별 5개 액션, 각 2-3문장)
   각 액션마다:
   - 구체적 실행 방법
   - 예상 효과 (% 또는 숫자)
   - 측정 가능한 KPI
   - 실행 난이도 (상/중/하)
   
   예시:
   "1순위: 썸네일 A/B 테스트 - 현재 평균 CTR 3.5%를 5%로 향상. 매 영상마다 2가지 썸네일 버전 제작 후 커뮤니티 탭에서 사전 투표. 예상 효과: 조회수 15% 증가. KPI: CTR, 조회수. 난이도: 중"

5. **채널 성장 잠재력 평가** (5-6문장)
   - 현재 구독자 대비 조회수 비율 분석
   - 동일 카테고리 벤치마크 채널과 비교 (구체적 채널명 언급 가능)
   - 3개월 후 목표 (구독자 X명, 평균 조회수 Y회)
   - 6개월 후 목표
   - 핵심 강점 1개 (구체적 근거)
   - 핵심 약점 1개 (개선 방법 포함)

6. **참고할 만한 한국 뷰티 크리에이터 숏폼 영상** (3-5개)
   - 10만 조회수 이상의 성공 사례
   - 각 영상마다: 크리에이터명, 영상 주제, 성공 요인, 적용 가능한 인사이트
   - 예: "다또아 - '3분 메이크업' 시리즈 (평균 50만 조회) - 짧은 시간 내 완성형 콘텐츠, 자막 활용 우수"

JSON 형식으로 응답:
{
  "weaknesses": "실제 데이터 인용하며 5-6문장",
  "upload_frequency": "날짜 분석 포함 5-6문장",
  "popular_videos": "상위 영상 구체적 분석 5-6문장",
  "improvement_plan": "우선순위별 5개 액션, 각 2-3문장의 상세 설명",
  "overall_evaluation": "벤치마크 비교 포함 5-6문장",
  "recommended_shorts": "한국 뷰티 크리에이터 숏폼 3-5개 추천, 각 추천마다 크리에이터명/주제/성공요인/적용방법 포함"
}`

      // 채널 리포트: 복잡한 분석 → gemini-2.5-flash-lite (품질 중요)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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
        creator_id: channelId,
        creator_name: creator.creator_name,
        platform: creator.platform,
        analysis_weaknesses: aiAnalysis.weaknesses,
        analysis_upload_frequency: aiAnalysis.upload_frequency,
        analysis_popular_videos: aiAnalysis.popular_videos,
        analysis_improvement_plan: typeof aiAnalysis.improvement_plan === 'string' 
          ? aiAnalysis.improvement_plan 
          : JSON.stringify(aiAnalysis.improvement_plan),
        analysis_overall_evaluation: aiAnalysis.overall_evaluation,
        analysis_recommended_shorts: aiAnalysis.recommended_shorts || null,
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
                    [핵심] 문제점 및 즉시 개선 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.weaknesses}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-blue-700 flex items-center">
                    [업로드] 패턴 및 최적화 제안
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.upload_frequency}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-green-700 flex items-center">
                    [인기] 영상 성공 요인 분석
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.popular_videos}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-purple-700 flex items-center">
                    [계획] 3개월 실행 계획
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {typeof aiAnalysis.improvement_plan === 'string' 
                      ? aiAnalysis.improvement_plan 
                      : JSON.stringify(aiAnalysis.improvement_plan, null, 2)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-yellow-700 flex items-center">
                    [평가] 채널 성장 잠재력
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.overall_evaluation}</p>
                </CardContent>
              </Card>

              {aiAnalysis.recommended_shorts && (
                <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-pink-700 flex items-center">
                      [추천] 한국 뷰티 크리에이터 숏폼 영상
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.recommended_shorts}</p>
                  </CardContent>
                </Card>
              )}
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

