import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Video, Plus, Trash2, Save, X, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react'
import { supabaseBiz as supabase } from '../../lib/supabaseClients'

export default function CampaignReferenceVideos() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [newVideo, setNewVideo] = useState({
    campaign_type: 'regular',
    title: '',
    description: '',
    video_url: '',
    display_order: 0,
    is_active: true
  })

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('campaign_reference_videos')
        .select('*')
        .order('campaign_type', { ascending: true })
        .order('display_order', { ascending: true })
      
      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error fetching videos:', error)
      alert('영상 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddVideo = async () => {
    if (!newVideo.title || !newVideo.video_url) {
      alert('제목과 영상 URL을 입력해주세요.')
      return
    }

    try {
      const { error } = await supabase
        .from('campaign_reference_videos')
        .insert([newVideo])
      
      if (error) throw error
      
      alert('영상이 추가되었습니다.')
      setNewVideo({
        campaign_type: 'regular',
        title: '',
        description: '',
        video_url: '',
        display_order: 0,
        is_active: true
      })
      fetchVideos()
    } catch (error) {
      console.error('Error adding video:', error)
      alert('영상 추가에 실패했습니다.')
    }
  }

  const handleUpdateVideo = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('campaign_reference_videos')
        .update(updates)
        .eq('id', id)
      
      if (error) throw error
      
      alert('영상이 수정되었습니다.')
      setEditingVideo(null)
      fetchVideos()
    } catch (error) {
      console.error('Error updating video:', error)
      alert('영상 수정에 실패했습니다.')
    }
  }

  const handleDeleteVideo = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('campaign_reference_videos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      alert('영상이 삭제되었습니다.')
      fetchVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('영상 삭제에 실패했습니다.')
    }
  }

  const handleToggleActive = async (id, currentStatus) => {
    await handleUpdateVideo(id, { is_active: !currentStatus })
  }

  const handleMoveOrder = async (id, currentOrder, direction) => {
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1
    await handleUpdateVideo(id, { display_order: newOrder })
  }

  const getVideoId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    return match ? match[1] : null
  }

  const getCampaignTypeName = (type) => {
    const names = {
      'regular': '기획형 캠페인',
      'oliveyoung': '올영세일 캠페인',
      '4week': '4주 챌린지'
    }
    return names[type] || type
  }

  const groupedVideos = videos.reduce((acc, video) => {
    if (!acc[video.campaign_type]) {
      acc[video.campaign_type] = []
    }
    acc[video.campaign_type].push(video)
    return acc
  }, {})

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

          {/* 새 영상 추가 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-3">새 영상 추가</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium">캠페인 타입</label>
                <select
                  value={newVideo.campaign_type}
                  onChange={(e) => setNewVideo({ ...newVideo, campaign_type: e.target.value })}
                  className="w-full border rounded p-2 mt-1"
                >
                  <option value="regular">기획형 캠페인</option>
                  <option value="oliveyoung">올영세일 캠페인</option>
                  <option value="4week">4주 챌린지</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">제목</label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  placeholder="영상 제목"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">설명 (선택)</label>
                <Textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  placeholder="영상 설명"
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">YouTube URL</label>
                <Input
                  value={newVideo.video_url}
                  onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">표시 순서</label>
                <Input
                  type="number"
                  value={newVideo.display_order}
                  onChange={(e) => setNewVideo({ ...newVideo, display_order: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAddVideo} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                영상 추가
              </Button>
            </div>
          </div>

          {/* 영상 목록 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : Object.keys(groupedVideos).length === 0 ? (
            <div className="text-center py-8 text-gray-500">등록된 영상이 없습니다.</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedVideos).map(([type, typeVideos]) => (
                <div key={type}>
                  <h3 className="font-semibold text-lg mb-3">{getCampaignTypeName(type)}</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {typeVideos.map((video) => {
                      const videoId = getVideoId(video.video_url)
                      const isEditing = editingVideo?.id === video.id

                      return (
                        <Card key={video.id} className={`${!video.is_active ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            {isEditing ? (
                              <div className="space-y-3">
                                <Input
                                  value={editingVideo.title}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                  placeholder="제목"
                                />
                                <Textarea
                                  value={editingVideo.description || ''}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                  placeholder="설명"
                                  rows={2}
                                />
                                <Input
                                  value={editingVideo.video_url}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                                  placeholder="YouTube URL"
                                />
                                <Input
                                  type="number"
                                  value={editingVideo.display_order}
                                  onChange={(e) => setEditingVideo({ ...editingVideo, display_order: parseInt(e.target.value) })}
                                  placeholder="순서"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleUpdateVideo(video.id, editingVideo)}
                                    size="sm"
                                    className="flex-1"
                                  >
                                    <Save className="w-4 h-4 mr-1" />
                                    저장
                                  </Button>
                                  <Button
                                    onClick={() => setEditingVideo(null)}
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {videoId ? (
                                  <div className="relative pb-[177.78%] mb-3">
                                    <iframe
                                      className="absolute top-0 left-0 w-full h-full rounded"
                                      src={`https://www.youtube.com/embed/${videoId}`}
                                      title={video.title}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-[9/16] bg-gray-200 flex items-center justify-center mb-3 rounded">
                                    <Video className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                                <h4 className="font-semibold text-sm mb-1">{video.title}</h4>
                                {video.description && (
                                  <p className="text-xs text-gray-600 mb-3">{video.description}</p>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                                  <span>순서: {video.display_order}</span>
                                  <span className="mx-1">•</span>
                                  <span>{video.is_active ? '활성' : '비활성'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    onClick={() => setEditingVideo(video)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    수정
                                  </Button>
                                  <Button
                                    onClick={() => handleToggleActive(video.id, video.is_active)}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {video.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </Button>
                                  <Button
                                    onClick={() => handleMoveOrder(video.id, video.display_order, 'up')}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteVideo(video.id)}
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
