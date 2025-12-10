import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Video, Plus, Trash2, GripVertical, ArrowLeft, Languages, X } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function VideoManagement() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [newVideo, setNewVideo] = useState({ url: '' })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchVideos()
  }, [])

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

  const fetchVideos = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('reference_videos')
        .select('*')
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
    if (!newVideo.url) {
      alert('YouTube URL을 입력해주세요')
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

      // YouTube URL을 embed URL로 변환
      const embedUrl = `https://www.youtube.com/embed/${videoId}`
      
      const { error } = await supabaseBiz
        .from('reference_videos')
        .insert({
          url: embedUrl, // url 컴럼에 embed URL 저장
          youtube_url: newVideo.url, // 원본 URL 보관
          thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          display_order: maxOrder + 1,
          is_active: true
        })

      if (error) throw error

      alert('영상이 추가되었습니다')
      setNewVideo({ url: '' })
      setShowAddForm(false)
      fetchVideos()
    } catch (error) {
      console.error('Error adding video:', error)
      alert('추가 실패: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('reference_videos')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('영상이 삭제되었습니다')
      fetchVideos()
    } catch (error) {
      console.error('Error deleting video:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              대시보드로 돌아가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">영상 레퍼런스 관리</h1>
              <p className="text-gray-600 mt-1">랜딩 페이지에 표시될 포트폴리오 영상을 관리합니다</p>
            </div>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <><X className="w-5 h-5 mr-2" />취소</> : <><Plus className="w-5 h-5 mr-2" />영상 추가</>}
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 영상 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">YouTube URL</label>
                  <Input
                    placeholder="https://www.youtube.com/shorts/..."
                    value={newVideo.url}
                    onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    YouTube Shorts, 일반 영상 모두 지원
                  </p>
                </div>
                <Button onClick={handleAddVideo} className="w-full">
                  추가하기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-5 h-5 mr-2" />
              등록된 영상 ({videos.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>등록된 영상이 없습니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {videos.map((video) => {
                  const videoId = getYouTubeId(video.youtube_url)
                  return (
                    <div key={video.id} className="relative group">
                      <div className="aspect-[9/16] rounded-lg overflow-hidden shadow-lg">
                        {videoId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="Video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <img
                            src={video.thumbnail_url}
                            alt="Video"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(video.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        순서: {video.display_order}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

