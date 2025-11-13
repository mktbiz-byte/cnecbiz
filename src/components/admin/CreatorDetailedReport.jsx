import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Calendar, 
  Video, Eye, ThumbsUp, MessageCircle, Download, Send, Sparkles,
  BarChart3, Clock, Target, Award, FileText
} from 'lucide-react'

export default function CreatorDetailedReport({ 
  creatorData, 
  stats, 
  videos = [],
  onGenerateReport 
}) {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customNotes, setCustomNotes] = useState({
    weaknesses: '',
    uploadSchedule: '',
    improvements: ''
  })

  // 업로드 주기 분석
  const analyzeUploadFrequency = () => {
    if (!videos || videos.length < 2) return null

    const dates = videos.map(v => new Date(v.publishedAt)).sort((a, b) => b - a)
    const intervals = []
    
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = Math.abs(dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24)
      intervals.push(diff)
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    const minInterval = Math.min(...intervals)
    const maxInterval = Math.max(...intervals)

    let frequency = '불규칙'
    let recommendation = ''

    if (avgInterval <= 3) {
      frequency = '매우 높음 (평균 3일 이내)'
      recommendation = '현재 업로드 주기를 유지하세요. 일관성이 뛰어납니다.'
    } else if (avgInterval <= 7) {
      frequency = '높음 (주 1-2회)'
      recommendation = '좋은 업로드 주기입니다. 가능하다면 주 2회로 늘려보세요.'
    } else if (avgInterval <= 14) {
      frequency = '보통 (2주에 1회)'
      recommendation = '업로드 빈도를 주 1회로 늘리면 구독자 참여도가 향상될 수 있습니다.'
    } else {
      frequency = '낮음 (월 1-2회)'
      recommendation = '업로드 빈도를 높이는 것을 권장합니다. 최소 주 1회를 목표로 하세요.'
    }

    return {
      avgInterval: avgInterval.toFixed(1),
      minInterval: minInterval.toFixed(1),
      maxInterval: maxInterval.toFixed(1),
      frequency,
      recommendation,
      consistency: maxInterval / minInterval < 3 ? '일관적' : '불규칙'
    }
  }

  // 인기 영상 분석
  const analyzeTopVideos = () => {
    if (!videos || videos.length === 0) return null

    const sortedByViews = [...videos].sort((a, b) => b.viewCount - a.viewCount)
    const top3 = sortedByViews.slice(0, 3)
    const avgViews = videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length

    const topVideosAnalysis = top3.map((video, index) => {
      const engagementRate = ((video.likeCount + video.commentCount) / video.viewCount * 100).toFixed(2)
      const viewsVsAvg = ((video.viewCount / avgViews - 1) * 100).toFixed(1)

      return {
        rank: index + 1,
        title: video.title,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        engagementRate,
        viewsVsAvg,
        publishedAt: video.publishedAt,
        successFactors: generateSuccessFactors(video, avgViews)
      }
    })

    return {
      topVideos: topVideosAnalysis,
      avgViews: Math.round(avgViews),
      totalVideos: videos.length
    }
  }

  // 성공 요인 분석
  const generateSuccessFactors = (video, avgViews) => {
    const factors = []
    
    if (video.viewCount > avgViews * 2) {
      factors.push('평균 대비 2배 이상의 조회수')
    }
    
    const engagementRate = (video.likeCount + video.commentCount) / video.viewCount
    if (engagementRate > 0.05) {
      factors.push('높은 참여율 (5% 이상)')
    }
    
    const titleLength = video.title.length
    if (titleLength >= 30 && titleLength <= 60) {
      factors.push('최적의 제목 길이')
    }
    
    if (video.likeCount / video.viewCount > 0.03) {
      factors.push('높은 좋아요 비율')
    }

    return factors.length > 0 ? factors : ['일반적인 성과']
  }

  // 부족한 점 분석
  const analyzeWeaknesses = () => {
    if (!videos || videos.length === 0 || !stats) return []

    const weaknesses = []
    const avgViews = videos.reduce((sum, v) => sum + v.viewCount, 0) / videos.length
    const avgEngagement = videos.reduce((sum, v) => sum + (v.likeCount + v.commentCount), 0) / videos.length

    // 조회수 분석
    const lowViewVideos = videos.filter(v => v.viewCount < avgViews * 0.5).length
    if (lowViewVideos > videos.length * 0.3) {
      weaknesses.push({
        category: '조회수',
        issue: `전체 영상의 ${Math.round(lowViewVideos / videos.length * 100)}%가 평균 조회수의 50% 미만`,
        severity: 'high',
        suggestion: '썸네일과 제목을 개선하고, 트렌드에 맞는 콘텐츠를 제작하세요.'
      })
    }

    // 참여율 분석
    const avgEngagementRate = (avgEngagement / avgViews) * 100
    if (avgEngagementRate < 3) {
      weaknesses.push({
        category: '참여율',
        issue: `평균 참여율이 ${avgEngagementRate.toFixed(2)}%로 낮음`,
        severity: 'medium',
        suggestion: '시청자와의 소통을 늘리고, 댓글을 유도하는 질문을 영상에 포함하세요.'
      })
    }

    // 업로드 주기
    const uploadAnalysis = analyzeUploadFrequency()
    if (uploadAnalysis && uploadAnalysis.consistency === '불규칙') {
      weaknesses.push({
        category: '업로드 주기',
        issue: '업로드 간격이 불규칙함',
        severity: 'medium',
        suggestion: '일정한 업로드 스케줄을 설정하여 구독자의 기대감을 형성하세요.'
      })
    }

    // 성장률 분석
    if (stats && stats.subscriberCount && stats.videoCount) {
      const videosPerSubscriber = stats.videoCount / stats.subscriberCount
      if (videosPerSubscriber > 0.01) {
        weaknesses.push({
          category: '구독자 성장',
          issue: '영상 수 대비 구독자 수가 적음',
          severity: 'low',
          suggestion: '구독을 유도하는 CTA를 영상 시작과 끝에 추가하세요.'
        })
      }
    }

    return weaknesses
  }

  // 보완할 점 생성
  const generateImprovements = () => {
    const improvements = []
    const uploadAnalysis = analyzeUploadFrequency()
    const topVideosAnalysis = analyzeTopVideos()

    // 업로드 주기 개선
    if (uploadAnalysis) {
      improvements.push({
        title: '업로드 주기 최적화',
        priority: 'high',
        description: uploadAnalysis.recommendation,
        actionItems: [
          '매주 같은 요일, 같은 시간에 업로드',
          '최소 2주 치 콘텐츠를 미리 준비',
          '업로드 스케줄을 커뮤니티 탭에 공지'
        ]
      })
    }

    // 콘텐츠 품질 개선
    if (topVideosAnalysis) {
      improvements.push({
        title: '인기 콘텐츠 패턴 활용',
        priority: 'high',
        description: '조회수가 높은 영상의 성공 요인을 분석하여 향후 콘텐츠에 적용',
        actionItems: [
          '인기 영상의 주제와 형식을 반복',
          '효과적인 썸네일 스타일 유지',
          '시청자 반응이 좋은 편집 기법 활용'
        ]
      })
    }

    // 참여도 향상
    improvements.push({
      title: '시청자 참여도 향상',
      priority: 'medium',
      description: '댓글과 좋아요를 유도하여 알고리즘 노출 증대',
      actionItems: [
        '영상 내에서 질문을 던지고 댓글로 답변 유도',
        '커뮤니티 탭 활용하여 시청자와 소통',
        '인기 댓글에 하트와 답글 달기'
      ]
    })

    // SEO 최적화
    improvements.push({
      title: 'SEO 및 검색 최적화',
      priority: 'medium',
      description: '제목, 설명, 태그를 최적화하여 검색 노출 증대',
      actionItems: [
        '키워드 리서치를 통한 제목 최적화',
        '상세한 영상 설명 작성 (최소 200자)',
        '관련성 높은 태그 10개 이상 추가'
      ]
    })

    return improvements
  }

  // AI 보고서 생성
  const generateAIReport = async () => {
    if (!creatorData || !videos.length) {
      alert('보고서를 생성하기 위한 데이터가 부족합니다.')
      return
    }

    setLoading(true)
    try {
      const uploadAnalysis = analyzeUploadFrequency()
      const topVideosAnalysis = analyzeTopVideos()
      const weaknesses = analyzeWeaknesses()
      const improvements = generateImprovements()

      setReportData({
        uploadAnalysis,
        topVideosAnalysis,
        weaknesses,
        improvements,
        generatedAt: new Date().toISOString()
      })

      if (onGenerateReport) {
        onGenerateReport({
          uploadAnalysis,
          topVideosAnalysis,
          weaknesses,
          improvements
        })
      }
    } catch (error) {
      console.error('보고서 생성 실패:', error)
      alert('보고서 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // PDF 다운로드
  const downloadPDF = () => {
    alert('PDF 다운로드 기능은 준비 중입니다.')
  }

  // 크리에이터에게 전송
  const sendToCreator = () => {
    alert('크리에이터 전송 기능은 준비 중입니다.')
  }

  useEffect(() => {
    if (videos && videos.length > 0) {
      generateAIReport()
    }
  }, [videos])

  if (!reportData && !loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">상세 보고서를 생성하려면 버튼을 클릭하세요</p>
          <Button onClick={generateAIReport} className="bg-gradient-to-r from-purple-600 to-blue-600">
            <Sparkles className="w-4 h-4 mr-2" />
            보고서 생성
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">상세 보고서를 생성하는 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 보고서 헤더 */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">📊 상세 성과 보고서</h2>
              <p className="text-purple-100">
                생성일: {new Date(reportData.generatedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadPDF} variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF 다운로드
              </Button>
              <Button onClick={sendToCreator} variant="secondary" size="sm">
                <Send className="w-4 h-4 mr-2" />
                크리에이터 전송
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. 부족한 점 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="w-5 h-5 mr-2" />
            1. 부족한 점 및 개선 필요 영역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.weaknesses.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">현재 특별히 부족한 점이 발견되지 않았습니다!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportData.weaknesses.map((weakness, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    weakness.severity === 'high' ? 'border-red-500 bg-red-50' :
                    weakness.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{weakness.category}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      weakness.severity === 'high' ? 'bg-red-200 text-red-800' :
                      weakness.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {weakness.severity === 'high' ? '높음' : weakness.severity === 'medium' ? '중간' : '낮음'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{weakness.issue}</p>
                  <div className="bg-white p-3 rounded mt-2">
                    <p className="text-sm text-gray-600">
                      <strong>💡 개선 방안:</strong> {weakness.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              추가 메모 (관리자용)
            </label>
            <Textarea
              value={customNotes.weaknesses}
              onChange={(e) => setCustomNotes({...customNotes, weaknesses: e.target.value})}
              placeholder="부족한 점에 대한 추가 의견을 작성하세요..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. 업로드 주기 분석 */}
      {reportData.uploadAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600">
              <Calendar className="w-5 h-5 mr-2" />
              2. 업로드 주기 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">평균 업로드 간격</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.uploadAnalysis.avgInterval}일
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">최단 간격</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportData.uploadAnalysis.minInterval}일
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">최장 간격</p>
                <p className="text-2xl font-bold text-orange-600">
                  {reportData.uploadAnalysis.maxInterval}일
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">업로드 빈도</h4>
                <span className="text-sm px-3 py-1 bg-white rounded-full">
                  {reportData.uploadAnalysis.frequency}
                </span>
              </div>
              <p className="text-gray-700 mb-3">
                일관성: <strong>{reportData.uploadAnalysis.consistency}</strong>
              </p>
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">
                  <strong>📅 권장 사항:</strong> {reportData.uploadAnalysis.recommendation}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업로드 스케줄 설정 (관리자용)
              </label>
              <Textarea
                value={customNotes.uploadSchedule}
                onChange={(e) => setCustomNotes({...customNotes, uploadSchedule: e.target.value})}
                placeholder="권장 업로드 스케줄을 작성하세요... (예: 매주 화요일, 금요일 오후 6시)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. 인기 영상 분석 */}
      {reportData.topVideosAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <Award className="w-5 h-5 mr-2" />
              3. 조회수 상위 영상 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                평균 조회수: <strong>{reportData.topVideosAnalysis.avgViews.toLocaleString()}</strong>회
                (총 {reportData.topVideosAnalysis.totalVideos}개 영상 기준)
              </p>
            </div>

            <div className="space-y-4">
              {reportData.topVideosAnalysis.topVideos.map((video) => (
                <div key={video.rank} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-purple-600">#{video.rank}</span>
                        <h4 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h4>
                      </div>
                      <p className="text-xs text-gray-500">
                        게시일: {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <Eye className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                      <p className="text-xs text-gray-600">조회수</p>
                      <p className="font-bold text-blue-600">{video.viewCount.toLocaleString()}</p>
                      <p className="text-xs text-green-600">+{video.viewsVsAvg}%</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <ThumbsUp className="w-4 h-4 mx-auto mb-1 text-red-600" />
                      <p className="text-xs text-gray-600">좋아요</p>
                      <p className="font-bold text-red-600">{video.likeCount.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <MessageCircle className="w-4 h-4 mx-auto mb-1 text-green-600" />
                      <p className="text-xs text-gray-600">댓글</p>
                      <p className="font-bold text-green-600">{video.commentCount.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded">
                    <p className="text-sm font-semibold text-purple-900 mb-2">
                      🎯 성공 요인:
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {video.successFactors.map((factor, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-purple-600 mr-2">•</span>
                          {factor}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-purple-600 mt-2">
                      참여율: {video.engagementRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. 보완할 점 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-purple-600">
            <Target className="w-5 h-5 mr-2" />
            4. 보완할 점 및 실행 계획
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.improvements.map((improvement, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 text-lg">{improvement.title}</h4>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    improvement.priority === 'high' ? 'bg-red-100 text-red-700' :
                    improvement.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {improvement.priority === 'high' ? '높은 우선순위' : 
                     improvement.priority === 'medium' ? '중간 우선순위' : '낮은 우선순위'}
                  </span>
                </div>
                
                <p className="text-gray-700 mb-3">{improvement.description}</p>
                
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm font-semibold text-gray-900 mb-2">✅ 실행 항목:</p>
                  <ul className="space-y-2">
                    {improvement.actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              추가 개선 사항 (관리자용)
            </label>
            <Textarea
              value={customNotes.improvements}
              onChange={(e) => setCustomNotes({...customNotes, improvements: e.target.value})}
              placeholder="추가로 보완이 필요한 사항을 작성하세요..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 종합 평가 */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-purple-900">
            <BarChart3 className="w-5 h-5 mr-2" />
            종합 평가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">💪 강점</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {reportData.weaknesses.length < 2 && (
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    전반적으로 양호한 채널 운영
                  </li>
                )}
                {reportData.topVideosAnalysis && (
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    인기 콘텐츠 제작 능력 보유
                  </li>
                )}
                {reportData.uploadAnalysis && reportData.uploadAnalysis.consistency === '일관적' && (
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    일관된 업로드 스케줄 유지
                  </li>
                )}
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 개선 목표</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {reportData.improvements.slice(0, 3).map((imp, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-purple-600 mr-2">→</span>
                    {imp.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
