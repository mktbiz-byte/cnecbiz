import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Eye, ThumbsUp, MessageCircle, Share2, Download,
  Calendar, Play, TrendingUp, BarChart3, ExternalLink
} from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'

export default function PublicReport() {
  const { reportCode } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  
  const [report, setReport] = useState(null)
  const [videos, setVideos] = useState([])

  useEffect(() => {
    fetchReport()
  }, [reportCode])

  const fetchReport = async () => {
    try {
      setLoading(true)
      
      // 공개 보고서 조회
      const { data: reportData, error: reportError } = await supabaseBiz
        .from('public_reports')
        .select('*')
        .eq('report_code', reportCode)
        .eq('is_public', true)
        .single()
      
      if (reportError) throw reportError
      
      // 만료 확인
      if (reportData.expires_at && new Date(reportData.expires_at) < new Date()) {
        alert('이 보고서는 만료되었습니다.')
        return
      }
      
      // 비밀번호 확인
      if (reportData.password) {
        setPasswordRequired(true)
        if (!password) {
          setLoading(false)
          return
        }
        if (password !== reportData.password) {
          setPasswordError(true)
          setLoading(false)
          return
        }
      }
      
      setReport(reportData)
      
      // 영상 목록 조회
      const { data: videosData, error: videosError } = await supabaseBiz
        .from('public_report_videos')
        .select('*')
        .eq('public_report_id', reportData.id)
        .order('display_order', { ascending: true })
      
      if (videosError) throw videosError
      setVideos(videosData || [])
      
      // 조회수 증가
      await supabaseBiz.rpc('increment_report_view_count', { report_id: reportData.id })
      
    } catch (error) {
      console.error('보고서 로드 오류:', error)
      alert('보고서를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError(false)
    fetchReport()
  }

  const downloadVideo = async (videoUrl, videoTitle) => {
    try {
      // 영상 다운로드 (새 탭에서 열기)
      window.open(videoUrl, '_blank')
    } catch (error) {
      console.error('영상 다운로드 오류:', error)
      alert('영상을 다운로드할 수 없습니다.')
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num?.toLocaleString() || '0'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (passwordRequired && !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>비밀번호 입력</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이 보고서는 비밀번호로 보호되어 있습니다.
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-500 mt-1">비밀번호가 올바르지 않습니다.</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                확인
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-600">보고서를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{report.title}</h1>
              {report.description && (
                <p className="text-gray-600 mt-2">{report.description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">보고서 코드</div>
              <div className="text-lg font-mono font-semibold text-gray-900">{report.report_code}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 캠페인 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>캠페인 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">회사명</div>
                <div className="text-lg font-semibold text-gray-900">{report.company_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">캠페인명</div>
                <div className="text-lg font-semibold text-gray-900">{report.campaign_name || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">캠페인 기간</div>
                <div className="text-lg font-semibold text-gray-900">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {report.campaign_period || '-'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 영상 수</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {report.total_videos}개
                  </p>
                </div>
                <Play className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 조회수</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatNumber(report.total_views)}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 좋아요</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatNumber(report.total_likes)}
                  </p>
                </div>
                <ThumbsUp className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 댓글</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatNumber(report.total_comments)}
                  </p>
                </div>
                <MessageCircle className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 영상 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>영상 목록 ({videos.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videos.map((video, index) => (
                <Card key={video.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* 영상 정보 */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {video.video_title || `영상 ${index + 1}`}
                            </h3>
                            {video.description && (
                              <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {video.platform && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {video.platform}
                                </span>
                              )}
                              {video.upload_date && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {new Date(video.upload_date).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                              {video.tags && video.tags.length > 0 && (
                                video.tags.map((tag, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                                    #{tag}
                                  </span>
                                ))
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(video.video_url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                영상 보기
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadVideo(video.video_url, video.video_title)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                다운로드
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 통계 정보 */}
                      <div className="lg:col-span-1">
                        <div className="bg-gray-50 rounded-lg p-4 h-full">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1" />
                            영상 통계
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <Eye className="w-4 h-4 mr-1" />
                                조회수
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatNumber(video.views)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                좋아요
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatNumber(video.likes)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <MessageCircle className="w-4 h-4 mr-1" />
                                댓글
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatNumber(video.comments)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center">
                                <Share2 className="w-4 h-4 mr-1" />
                                공유
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {formatNumber(video.shares)}
                              </span>
                            </div>
                            {video.engagement_rate !== null && (
                              <div className="pt-2 mt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    반응도
                                  </span>
                                  <span className="text-sm font-bold text-blue-600">
                                    {video.engagement_rate}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {videos.length === 0 && (
                <p className="text-center text-gray-500 py-8">등록된 영상이 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 푸터 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>이 보고서는 {new Date(report.created_at).toLocaleDateString('ko-KR')}에 생성되었습니다.</p>
          <p className="mt-1">조회수: {report.view_count + 1}회</p>
        </div>
      </div>
    </div>
  )
}
