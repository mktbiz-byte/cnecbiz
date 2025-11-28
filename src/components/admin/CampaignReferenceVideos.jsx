import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Video, Plus, Trash2, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react'
import { supabaseBiz as supabase } from '../../lib/supabaseClients'

export default function CampaignReferenceVideos() {
  const [videos, setVideos] = useState([])
  const [selectedCampaignType, setSelectedCampaignType] = useState('regular')
  const [newVideo, setNewVideo] = useState({
    url: '',
    title: '',
    description: ''
  })

  useEffect(() => {
    fetchVideos()
  }, [selectedCampaignType])

  const fetchVideos = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('campaign_reference_videos')
        .select('*')
        .eq('campaign_type', selectedCampaignType)
        .order('display_order', { ascending: true })

      if (!error && data) {
        setVideos(data)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const extractYouTubeId = (url) => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const handleAddVideo = async () => {
    if (!newVideo.url || !newVideo.title) {
      alert('YouTube URL과 제목을 입력해주세요')
      return
    }

    const videoId = extractYouTubeId(newVideo.url)
    if (!videoId) {
      alert('올바른 YouTube URL을 입력해주세요')
      return
    }

    try {
      const maxOrder = videos.length > 0 
        ? Math.max(...videos.map(v => v.display_order || 0))
        : 0

      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      
      const { error } = await supabase
        .from('campaign_reference_videos')
        .insert({
          campaign_type: selectedCampaignType,
          url: embedUrl,
          youtube_url: newVideo.url,
          title: newVideo.title,
          description: newVideo.description || null,
          display_order: maxOrder + 1,
          is_active: true
        })

      if (error) throw error

      alert('영상이 추가되었습니다')
      setNewVideo({ url: '', title: '', description: '' })
      fetchVideos()
    } catch (error) {
      console.error('Error adding video:', error)
      alert('영상 추가 중 오류가 발생했습니다')
    }
  }

  const handleDeleteVideo = async (id) => {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('campaign_reference_videos')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('영상이 삭제되었습니다')
      fetchVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('영상 삭제 중 오류가 발생했습니다')
    }
  }

  const handleMoveVideo = async (id, direction) => {
    const currentIndex = videos.findIndex(v => v.id === id)
    if (currentIndex === -1) return

    let newIndex
    switch (direction) {
      case 'top':
        newIndex = 0
        break
      case 'up':
        newIndex = Math.max(0, currentIndex - 1)
        break
      case 'down':
        newIndex = Math.min(videos.length - 1, currentIndex + 1)
        break
      case 'bottom':
        newIndex = videos.length - 1
        break
      default:
        return
    }

    if (newIndex === currentIndex) return

    try {
      const reorderedVideos = [...videos]
      const [movedVideo] = reorderedVideos.splice(currentIndex, 1)
      reorderedVideos.splice(newIndex, 0, movedVideo)

      const updates = reorderedVideos.map((video, index) => ({
        id: video.id,
        display_order: index + 1
      }))

      for (const update of updates) {
        await supabase
          .from('campaign_reference_videos')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }

      fetchVideos()
    } catch (error) {
      console.error('Error reordering videos:', error)
      alert('순서 변경 중 오류가 발생했습니다')
    }
  }

  const campaignTypes = [
    { value: 'regular', label: '기획형 캠페인' },
    { value: 'oliveyoung', label: '올영세일 캠페인' },
    { value: '4week', label: '4주 챌린지' }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            캠페인 레퍼런스 영상 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            각 캠페인 소개 페이지에 표시될 레퍼런스 영상을 관리합니다. 
            YouTube 영상 URL을 입력하면 숏폼 형태로 표시됩니다.
          </p>

          {/* 캠페인 타입 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">캠페인 타입 선택</label>
            <div className="flex gap-2">
              {campaignTypes.map(type => (
                <Button
                  key={type.value}
                  variant={selectedCampaignType === type.value ? 'default' : 'outline'}
                  onClick={() => setSelectedCampaignType(type.value)}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 새 영상 추가 폼 */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              새 영상 추가
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">YouTube URL *</label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/shorts/... 또는 https://www.youtube.com/watch?v=..."
                value={newVideo.url}
                onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">일반 영상 또는 Shorts URL을 입력하면 자동으로 embed 형태로 변환됩니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">제목 *</label>
              <Input
                type="text"
                placeholder="영상 제목"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">설명</label>
              <Textarea
                placeholder="영상 설명 (선택사항)"
                value={newVideo.description}
                onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleAddVideo} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              영상 추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 등록된 영상 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 영상 ({videos.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">등록된 영상이 없습니다.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video, index) => (
                <div key={video.id} className="border rounded-lg p-4 space-y-3 relative">
                  {/* 순서 배지 */}
                  <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                    {index + 1}
                  </div>
                  
                  {/* 순서 변경 버튼 */}
                  <div className="absolute top-2 right-2 flex gap-1 z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveVideo(video.id, 'top')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      title="맨 위로"
                    >
                      <ChevronsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveVideo(video.id, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveVideo(video.id, 'down')}
                      disabled={index === videos.length - 1}
                      className="h-8 w-8 p-0"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMoveVideo(video.id, 'bottom')}
                      disabled={index === videos.length - 1}
                      className="h-8 w-8 p-0"
                      title="맨 아래로"
                    >
                      <ChevronsDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 영상 미리보기 (9:16 비율) */}
                  <div className="aspect-[9/16] bg-gray-100 rounded overflow-hidden mt-8">
                    <iframe
                      src={video.url}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  
                  <div>
                    <h3 className="font-bold">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2 break-all">{video.url}</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteVideo(video.id)}
                    className="w-full text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
