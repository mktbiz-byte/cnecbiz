import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Plus, Trash2, Save, Copy, ExternalLink } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatePublicReportModal({ 
  receivableDetailId, 
  receivableDetail,
  onClose, 
  onSuccess 
}) {
  const [saving, setSaving] = useState(false)
  const [reportCreated, setReportCreated] = useState(false)
  const [reportUrl, setReportUrl] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_name: receivableDetail?.company_name || '',
    campaign_name: receivableDetail?.campaign_name || '',
    campaign_period: '',
    is_public: true,
    password: '',
    expires_at: ''
  })

  const [videos, setVideos] = useState([])

  useEffect(() => {
    // receivable_details에서 영상 링크 가져오기
    if (receivableDetail) {
      const allVideos = []
      const priceTypes = ['200k', '300k', '400k', '600k', '700k']
      
      priceTypes.forEach(priceType => {
        const videoList = receivableDetail[`videos_${priceType}`] || []
        videoList.forEach(video => {
          if (video.url) {
            allVideos.push({
              video_url: video.url,
              video_title: video.title || '',
              upload_date: video.date || '',
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              engagement_rate: 0,
              platform: '',
              description: '',
              tags: [],
              display_order: allVideos.length
            })
          }
        })
      })
      
      setVideos(allVideos)
    }
  }, [receivableDetail])

  const generateReportCode = () => {
    const year = new Date().getFullYear()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `RPT-${year}-${random}`
  }

  const addVideo = () => {
    setVideos([...videos, {
      video_url: '',
      video_title: '',
      upload_date: new Date().toISOString().split('T')[0],
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement_rate: 0,
      platform: 'YouTube',
      description: '',
      tags: [],
      display_order: videos.length
    }])
  }

  const removeVideo = (index) => {
    setVideos(videos.filter((_, i) => i !== index))
  }

  const updateVideo = (index, field, value) => {
    setVideos(videos.map((video, i) => 
      i === index ? { ...video, [field]: value } : video
    ))
  }

  const updateVideoTags = (index, tagsString) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag)
    updateVideo(index, 'tags', tags)
  }

  const calculateEngagementRate = (video) => {
    if (video.views === 0) return 0
    const engagement = (parseInt(video.likes) + parseInt(video.comments) + parseInt(video.shares)) / parseInt(video.views) * 100
    return engagement.toFixed(2)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // 필수 필드 검증
      if (!formData.title) {
        alert('보고서 제목을 입력하세요.')
        return
      }
      
      if (videos.length === 0) {
        alert('최소 1개 이상의 영상을 추가하세요.')
        return
      }
      
      // 보고서 코드 생성
      const reportCode = generateReportCode()
      
      // 통계 계산
      const totalVideos = videos.length
      const totalViews = videos.reduce((sum, v) => sum + (parseInt(v.views) || 0), 0)
      const totalLikes = videos.reduce((sum, v) => sum + (parseInt(v.likes) || 0), 0)
      const totalComments = videos.reduce((sum, v) => sum + (parseInt(v.comments) || 0), 0)
      
      // 공개 보고서 생성
      const { data: reportData, error: reportError } = await supabaseBiz
        .from('public_reports')
        .insert([{
          receivable_detail_id: receivableDetailId,
          report_code: reportCode,
          title: formData.title,
          description: formData.description,
          company_name: formData.company_name,
          campaign_name: formData.campaign_name,
          campaign_period: formData.campaign_period,
          total_videos: totalVideos,
          total_views: totalViews,
          total_likes: totalLikes,
          total_comments: totalComments,
          is_public: formData.is_public,
          password: formData.password || null,
          expires_at: formData.expires_at || null
        }])
        .select()
        .single()
      
      if (reportError) throw reportError
      
      // 영상 정보 저장
      const videosToInsert = videos.map((video, index) => ({
        public_report_id: reportData.id,
        video_url: video.video_url,
        video_title: video.video_title,
        thumbnail_url: video.thumbnail_url || null,
        views: parseInt(video.views) || 0,
        likes: parseInt(video.likes) || 0,
        comments: parseInt(video.comments) || 0,
        shares: parseInt(video.shares) || 0,
        engagement_rate: parseFloat(calculateEngagementRate(video)) || 0,
        upload_date: video.upload_date || null,
        platform: video.platform || null,
        description: video.description || null,
        tags: video.tags || [],
        display_order: index
      }))
      
      const { error: videosError } = await supabaseBiz
        .from('public_report_videos')
        .insert(videosToInsert)
      
      if (videosError) throw videosError
      
      // 성공
      const url = `${window.location.origin}/report/${reportCode}`
      setReportUrl(url)
      setReportCreated(true)
      
      if (onSuccess) {
        onSuccess(reportData)
      }
      
    } catch (error) {
      console.error('보고서 생성 오류:', error)
      alert('보고서 생성에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportUrl)
    alert('URL이 클립보드에 복사되었습니다.')
  }

  if (reportCreated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>보고서 생성 완료</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold mb-2">✓ 공개 보고서가 생성되었습니다!</p>
                <p className="text-sm text-green-700">
                  아래 URL을 공유하여 누구나 보고서를 볼 수 있습니다.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공개 URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={reportUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-1" />
                    복사
                  </Button>
                  <Button onClick={() => window.open(reportUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    열기
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={onClose}>
                  닫기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>공개 보고서 만들기</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">기본 정보</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    보고서 제목 *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예: 2025년 1월 캠페인 성과 보고서"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    캠페인 기간
                  </label>
                  <Input
                    value={formData.campaign_period}
                    onChange={(e) => setFormData({ ...formData, campaign_period: e.target.value })}
                    placeholder="예: 2025-01-01 ~ 2025-01-31"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <Textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="보고서에 대한 간단한 설명을 입력하세요"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 (선택)
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="비밀번호를 설정하지 않으면 누구나 접근 가능"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    만료일 (선택)
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 영상 목록 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">영상 목록 ({videos.length}개)</h3>
                <Button onClick={addVideo} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  영상 추가
                </Button>
              </div>
              
              <div className="space-y-4">
                {videos.map((video, index) => (
                  <Card key={index} className="border-2">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">영상 {index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              영상 URL *
                            </label>
                            <Input
                              value={video.video_url}
                              onChange={(e) => updateVideo(index, 'video_url', e.target.value)}
                              placeholder="https://..."
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              영상 제목
                            </label>
                            <Input
                              value={video.video_title}
                              onChange={(e) => updateVideo(index, 'video_title', e.target.value)}
                              placeholder="영상 제목"
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              조회수
                            </label>
                            <Input
                              type="number"
                              value={video.views}
                              onChange={(e) => updateVideo(index, 'views', e.target.value)}
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              좋아요
                            </label>
                            <Input
                              type="number"
                              value={video.likes}
                              onChange={(e) => updateVideo(index, 'likes', e.target.value)}
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              댓글
                            </label>
                            <Input
                              type="number"
                              value={video.comments}
                              onChange={(e) => updateVideo(index, 'comments', e.target.value)}
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              공유
                            </label>
                            <Input
                              type="number"
                              value={video.shares}
                              onChange={(e) => updateVideo(index, 'shares', e.target.value)}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              플랫폼
                            </label>
                            <Input
                              value={video.platform}
                              onChange={(e) => updateVideo(index, 'platform', e.target.value)}
                              placeholder="YouTube, Instagram 등"
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              업로드 날짜
                            </label>
                            <Input
                              type="date"
                              value={video.upload_date}
                              onChange={(e) => updateVideo(index, 'upload_date', e.target.value)}
                              size="sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              반응도
                            </label>
                            <Input
                              value={calculateEngagementRate(video) + '%'}
                              disabled
                              className="bg-gray-50"
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            태그 (쉼표로 구분)
                          </label>
                          <Input
                            value={video.tags.join(', ')}
                            onChange={(e) => updateVideoTags(index, e.target.value)}
                            placeholder="예: 뷰티, 리뷰, 신제품"
                            size="sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {videos.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    "영상 추가" 버튼을 클릭하여 영상을 추가하세요.
                  </p>
                )}
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? '생성 중...' : '보고서 생성'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
