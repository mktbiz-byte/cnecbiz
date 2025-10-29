import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Youtube, TrendingUp, Eye, Trash2, BarChart } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function OurChannels({ onUpdate }) {
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formData, setFormData] = useState({
    channel_name: '',
    channel_url: '',
    channel_id: '',
    youtube_api_key: '',
    description: '',
    notes: ''
  })

  useEffect(() => {
    fetchChannels()
  }, [])

  const fetchChannels = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('our_channels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChannels(data || [])
    } catch (error) {
      console.error('채널 조회 오류:', error)
      alert('채널 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChannel = async (e) => {
    e.preventDefault()
    
    if (channels.length >= 10) {
      alert('최대 10개의 채널만 등록할 수 있습니다.')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('our_channels')
        .insert([formData])

      if (error) throw error

      alert('채널이 추가되었습니다.')
      setShowAddDialog(false)
      setFormData({
        channel_name: '',
        channel_url: '',
        channel_id: '',
        youtube_api_key: '',
        description: '',
        notes: ''
      })
      fetchChannels()
      onUpdate?.()
    } catch (error) {
      console.error('채널 추가 오류:', error)
      alert('채널 추가 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteChannel = async (id) => {
    if (!confirm('정말 이 채널을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('our_channels')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      alert('채널이 삭제되었습니다.')
      fetchChannels()
      onUpdate?.()
    } catch (error) {
      console.error('채널 삭제 오류:', error)
      alert('채널 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleViewReport = (channelId) => {
    navigate(`/admin/channel-report/${channelId}?type=our_channel`)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">채널 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">우리 채널</h2>
          <p className="text-gray-600 text-sm">자사 운영 YouTube 채널 (최대 10개)</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button disabled={channels.length >= 10}>
              <Plus className="w-4 h-4 mr-2" />
              채널 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 채널 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">채널명 *</label>
                <Input
                  required
                  value={formData.channel_name}
                  onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                  placeholder="예: CNEC Official"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">채널 URL *</label>
                <Input
                  required
                  type="url"
                  value={formData.channel_url}
                  onChange={(e) => setFormData({ ...formData, channel_url: e.target.value })}
                  placeholder="https://www.youtube.com/@channelname"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">채널 ID *</label>
                <Input
                  required
                  value={formData.channel_id}
                  onChange={(e) => setFormData({ ...formData, channel_id: e.target.value })}
                  placeholder="UC..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  YouTube 채널 ID (UC로 시작)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">YouTube API Key *</label>
                <Input
                  required
                  type="password"
                  value={formData.youtube_api_key}
                  onChange={(e) => setFormData({ ...formData, youtube_api_key: e.target.value })}
                  placeholder="AIza..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google Cloud Console에서 API 키 발급 →
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="채널 설명"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">메모</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="관리용 메모"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  취소
                </Button>
                <Button type="submit">
                  추가
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Youtube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">등록된 채널이 없습니다.</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              첫 채널 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <Youtube className="w-5 h-5 mr-2 text-red-600" />
                      {channel.channel_name}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {channel.channel_url}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {channel.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {channel.description}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewReport(channel.id)}
                  >
                    <BarChart className="w-4 h-4 mr-1" />
                    보고서
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteChannel(channel.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  등록일: {new Date(channel.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {channels.length > 0 && channels.length < 10 && (
        <div className="text-center text-sm text-gray-500">
          {10 - channels.length}개 더 추가할 수 있습니다.
        </div>
      )}
    </div>
  )
}

