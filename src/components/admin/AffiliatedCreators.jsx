import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Plus, Users, Eye, Trash2, RefreshCw, FileText, Youtube, Instagram,
  Play, ThumbsUp, MessageCircle, Calendar, ExternalLink, AlertCircle,
  TrendingUp, Video, Clock
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AffiliatedCreators({ onUpdate }) {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [creatorVideos, setCreatorVideos] = useState({})
  const [loadingVideos, setLoadingVideos] = useState({})
  const [formData, setFormData] = useState({
    creator_name: '',
    platform: 'youtube',
    platform_url: '',
    platform_id: '',
    youtube_api_key: '',
    description: '',
    notes: '',
    profile_image: '',
    subscriber_count: 0,
    video_count: 0
  })

  useEffect(() => {
    loadCreators()
  }, [])

  const loadCreators = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseBiz
        .from('affiliated_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCreators(data || [])

      // 각 크리에이터의 최신 영상 로드
      if (data) {
        data.forEach(creator => {
          if (creator.platform === 'youtube' && creator.platform_id) {
            loadCreatorVideos(creator)
          }
        })
      }
    } catch (err) {
      console.error('크리에이터 로드 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCreatorVideos = async (creator) => {
    if (!creator.youtube_api_key || !creator.platform_id) return

    setLoadingVideos(prev => ({ ...prev, [creator.id]: true }))

    try {
      const { data: { session } } = await supabaseBiz.auth.getSession()
      if (!session) return

      // DB에서 저장된 영상 먼저 조회
      const { data: videos } = await supabaseBiz
        .from('channel_videos')
        .select('*')
        .eq('channel_id', creator.platform_id)
        .order('published_at', { ascending: false })
        .limit(5)

      if (videos && videos.length > 0) {
        setCreatorVideos(prev => ({ ...prev, [creator.id]: videos }))
      }
    } catch (err) {
      console.error('영상 로드 실패:', err)
    } finally {
      setLoadingVideos(prev => ({ ...prev, [creator.id]: false }))
    }
  }

  const handleAddCreator = async (e) => {
    e.preventDefault()

    try {
      const { error } = await supabaseBiz
        .from('affiliated_creators')
        .insert([formData])

      if (error) throw error

      alert('크리에이터가 추가되었습니다!')
      setShowAddDialog(false)
      setFormData({
        creator_name: '',
        platform: 'youtube',
        platform_url: '',
        platform_id: '',
        youtube_api_key: '',
        description: '',
        notes: '',
        profile_image: '',
        subscriber_count: 0,
        video_count: 0
      })
      loadCreators()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('추가 실패:', err)
      alert('크리에이터 추가에 실패했습니다.')
    }
  }

  const handleDeleteCreator = async (id) => {
    if (!confirm('정말 이 크리에이터를 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('affiliated_creators')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('크리에이터가 삭제되었습니다.')
      loadCreators()
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleRefreshStats = async (creator) => {
    if (!creator.youtube_api_key || !creator.platform_url) {
      alert('YouTube API 키와 채널 URL이 필요합니다.')
      return
    }

    setLoadingVideos(prev => ({ ...prev, [creator.id]: true }))

    try {
      const { data: { session } } = await supabaseBiz.auth.getSession()
      if (!session) {
        alert('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/.netlify/functions/fetch-youtube-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          channel_url: creator.platform_url,
          channel_type: 'affiliated_creator',
          record_id: creator.id,
          youtube_api_key: creator.youtube_api_key
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`통계가 업데이트되었습니다!\n구독자: ${result.data.channel.subscriber_count.toLocaleString()}명\n영상: ${result.data.videos}개 수집`)
        loadCreators()
      } else {
        throw new Error(result.error || '업데이트 실패')
      }
    } catch (err) {
      console.error('통계 업데이트 실패:', err)
      alert('통계 업데이트에 실패했습니다: ' + err.message)
    } finally {
      setLoadingVideos(prev => ({ ...prev, [creator.id]: false }))
    }
  }

  const handleViewReport = (creatorId) => {
    navigate(`/admin/channel-report/${creatorId}`)
  }

  const openCreatorDetail = (creator) => {
    setSelectedCreator(creator)
    setShowDetailDialog(true)
  }

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-600" />
      default: return <Users className="w-5 h-5 text-blue-600" />
    }
  }

  const formatNumber = (num) => {
    if (!num) return '0'
    if (num >= 10000) return (num / 10000).toFixed(1) + '만'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '오늘'
    if (diff === 1) return '어제'
    if (diff < 7) return `${diff}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const isUpdateOverdue = (creator) => {
    if (!creator.updated_at) return true
    const lastUpdate = new Date(creator.updated_at)
    const now = new Date()
    const daysDiff = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24))
    return daysDiff >= 7
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">크리에이터 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">소속 크리에이터</h2>
          <p className="text-gray-600 text-sm">자사 소속 크리에이터 관리 (최대 50명)</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={creators.length >= 50} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              크리에이터 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 크리에이터 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCreator} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">크리에이터명 *</label>
                  <Input
                    required
                    value={formData.creator_name}
                    onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                    placeholder="예: 하우뷰티"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">플랫폼 *</label>
                  <select
                    required
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">채널/프로필 URL *</label>
                <Input
                  required
                  type="url"
                  value={formData.platform_url}
                  onChange={(e) => setFormData({ ...formData, platform_url: e.target.value })}
                  placeholder="https://www.youtube.com/@username"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">채널 ID</label>
                  <Input
                    value={formData.platform_id}
                    onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                    placeholder="UC... (YouTube 채널 ID)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">프로필 이미지 URL</label>
                  <Input
                    value={formData.profile_image}
                    onChange={(e) => setFormData({ ...formData, profile_image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {formData.platform === 'youtube' && (
                <div>
                  <label className="block text-sm font-medium mb-1">YouTube API Key</label>
                  <Input
                    type="password"
                    value={formData.youtube_api_key}
                    onChange={(e) => setFormData({ ...formData, youtube_api_key: e.target.value })}
                    placeholder="AIza..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    최신 영상 연동 및 자동 업데이트 체크에 필요합니다
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="크리에이터 설명, 주요 콘텐츠 등"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">관리 메모</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="내부 관리용 메모"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  취소
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  추가
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 7일 업데이트 경고 배너 */}
      {creators.some(c => isUpdateOverdue(c)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-amber-800 font-medium">업데이트가 필요한 크리에이터가 있습니다</p>
            <p className="text-amber-600 text-sm">7일 이상 업데이트되지 않은 채널이 {creators.filter(c => isUpdateOverdue(c)).length}개 있습니다.</p>
          </div>
        </div>
      )}

      {creators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">등록된 크리에이터가 없습니다.</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              첫 크리에이터 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {creators.map((creator) => (
            <Card key={creator.id} className="hover:shadow-xl transition-all duration-300 overflow-hidden">
              {/* 상단 프로필 영역 */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                <div className="flex items-start gap-4">
                  {/* 프로필 이미지 */}
                  <div className="relative">
                    {creator.profile_image || creator.thumbnail_url ? (
                      <img
                        src={creator.profile_image || creator.thumbnail_url}
                        alt={creator.creator_name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        {creator.creator_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                      {getPlatformIcon(creator.platform)}
                    </div>
                  </div>

                  {/* 크리에이터 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white truncate">{creator.creator_name}</h3>
                      {isUpdateOverdue(creator) && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          업데이트 필요
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm truncate">{creator.platform_url}</p>

                    {/* 통계 */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-white/80">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">{formatNumber(creator.subscriber_count)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/80">
                        <Video className="w-4 h-4" />
                        <span className="text-sm">{formatNumber(creator.video_count)}개</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/60 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(creator.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 최신 영상 영역 */}
              <CardContent className="p-4">
                {creator.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{creator.description}</p>
                )}

                {/* 최신 영상 목록 */}
                {creator.platform === 'youtube' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        <Play className="w-4 h-4 text-red-600" />
                        최신 영상
                      </h4>
                      {loadingVideos[creator.id] && (
                        <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                      )}
                    </div>

                    {creatorVideos[creator.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {creatorVideos[creator.id].slice(0, 3).map((video) => (
                          <a
                            key={video.video_id}
                            href={`https://www.youtube.com/watch?v=${video.video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                          >
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              className="w-20 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-blue-600">
                                {video.title}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {formatNumber(video.view_count)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {formatNumber(video.like_count)}
                                </span>
                                <span>{formatDate(video.published_at)}</span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">
                        {creator.youtube_api_key ? '영상을 불러오려면 통계 새로고침을 해주세요' : 'API 키를 등록하면 최신 영상이 표시됩니다'}
                      </p>
                    )}
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleViewReport(creator.id)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    보고서
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(creator.platform_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRefreshStats(creator)}
                    disabled={loadingVideos[creator.id]}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingVideos[creator.id] ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteCreator(creator.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creators.length > 0 && creators.length < 50 && (
        <div className="text-center text-sm text-gray-500">
          {50 - creators.length}명 더 추가할 수 있습니다.
        </div>
      )}
    </div>
  )
}
