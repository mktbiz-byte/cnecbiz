import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Eye, Trash2, RefreshCw, FileText } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function AffiliatedCreators({ onUpdate }) {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formData, setFormData] = useState({
    creator_name: '',
    platform: 'youtube',
    platform_url: '',
    platform_id: '',
    description: '',
    notes: ''
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
    } catch (err) {
      console.error('크리에이터 로드 실패:', err)
    } finally {
      setLoading(false)
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
        description: '',
        notes: ''
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
    alert('통계 새로고침 기능은 준비 중입니다.')
  }

  const handleViewReport = (creatorId) => {
    navigate(`/admin/channel-report/${creatorId}`)
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
            <Button disabled={creators.length >= 50}>
              <Plus className="w-4 h-4 mr-2" />
              크리에이터 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 크리에이터 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddCreator} className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium mb-1">플랫폼 URL *</label>
                <Input
                  required
                  type="url"
                  value={formData.platform_url}
                  onChange={(e) => setFormData({ ...formData, platform_url: e.target.value })}
                  placeholder="https://www.youtube.com/@username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">플랫폼 ID</label>
                <Input
                  value={formData.platform_id}
                  onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                  placeholder="UC... (YouTube 채널 ID)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="크리에이터 설명"
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

      {creators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">등록된 크리에이터가 없습니다.</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              첫 크리에이터 추가하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <Card key={creator.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-600" />
                      {creator.creator_name}
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {creator.platform}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {creator.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {creator.description}
                  </p>
                )}
                
                <div className="space-y-2">
                  <Button
                    size="sm"
                    onClick={() => handleViewReport(creator.id)}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    보고서 보기
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(creator.platform_url, '_blank')}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      보기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefreshStats(creator)}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCreator(creator.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  등록일: {new Date(creator.created_at).toLocaleDateString()}
                </p>
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
