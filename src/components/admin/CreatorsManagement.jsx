import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Users, Plus, Trash2, Edit2, ArrowLeft, Save, X, Star } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatorsManagement() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newCreator, setNewCreator] = useState({
    name: '',
    region: 'japan',
    platform: 'youtube',
    followers: 0,
    engagement_rate: 0,
    specialty: '',
    profile_image_url: '',
    profile_url: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCreators()
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
      .from('admins')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCreators = async () => {
    if (!supabaseBiz) return

    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCreators(data)
      }
    } catch (error) {
      console.error('Error fetching creators:', error)
    }
  }

  const handleAdd = async () => {
    if (!newCreator.name) {
      alert('크리에이터 이름을 입력해주세요')
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .insert(newCreator)

      if (error) throw error

      alert('크리에이터가 추가되었습니다')
      setNewCreator({
        name: '',
        region: 'japan',
        platform: 'youtube',
        followers: 0,
        engagement_rate: 0,
        specialty: '',
        profile_image_url: '',
        profile_url: ''
      })
      setShowAddForm(false)
      fetchCreators()
    } catch (error) {
      console.error('Error adding creator:', error)
      alert('추가 실패: ' + error.message)
    }
  }

  const handleEdit = (creator) => {
    setEditingId(creator.id)
    setEditForm({ ...creator })
  }

  const handleSave = async (id) => {
    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .update(editForm)
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      fetchCreators()
    } catch (error) {
      console.error('Error updating creator:', error)
      alert('수정 실패: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchCreators()
    } catch (error) {
      console.error('Error deleting creator:', error)
      alert('삭제 실패: ' + error.message)
    }
  }

  const getRegionLabel = (region) => {
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      taiwan: '🇹🇼 대만'
    }
    return labels[region] || region
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">추천 크리에이터 관리</h1>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? '취소' : '새 크리에이터 추가'}
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>새 크리에이터 추가</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">이름 *</label>
                  <Input
                    value={newCreator.name}
                    onChange={(e) => setNewCreator({ ...newCreator, name: e.target.value })}
                    placeholder="크리에이터 이름"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">지역</label>
                  <select
                    value={newCreator.region}
                    onChange={(e) => setNewCreator({ ...newCreator, region: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="korea">한국</option>
                    <option value="japan">일본</option>
                    <option value="us">미국</option>
                    <option value="taiwan">대만</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">플랫폼</label>
                  <select
                    value={newCreator.platform}
                    onChange={(e) => setNewCreator({ ...newCreator, platform: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">팔로워 수</label>
                  <Input
                    type="number"
                    value={newCreator.followers}
                    onChange={(e) => setNewCreator({ ...newCreator, followers: parseInt(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">참여율 (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newCreator.engagement_rate}
                    onChange={(e) => setNewCreator({ ...newCreator, engagement_rate: parseFloat(e.target.value) })}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">전문 분야</label>
                  <Input
                    value={newCreator.specialty}
                    onChange={(e) => setNewCreator({ ...newCreator, specialty: e.target.value })}
                    placeholder="예: 뷰티, 패션, 라이프스타일"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">프로필 이미지 URL</label>
                  <Input
                    value={newCreator.profile_image_url}
                    onChange={(e) => setNewCreator({ ...newCreator, profile_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">프로필 URL</label>
                  <Input
                    value={newCreator.profile_url}
                    onChange={(e) => setNewCreator({ ...newCreator, profile_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <Button onClick={handleAdd}>추가</Button>
            </CardContent>
          </Card>
        )}

        {/* Creators List */}
        <Card>
          <CardHeader>
            <CardTitle>크리에이터 목록 ({creators.length}명)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-600 hover:shadow-lg transition-all"
                >
                  {editingId === creator.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="이름"
                      />
                      <Input
                        type="number"
                        value={editForm.followers}
                        onChange={(e) => setEditForm({ ...editForm, followers: parseInt(e.target.value) })}
                        placeholder="팔로워"
                      />
                      <Input
                        value={editForm.specialty}
                        onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                        placeholder="전문 분야"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(creator.id)}>
                          <Save className="w-4 h-4 mr-2" />
                          저장
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-2" />
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {creator.profile_image_url && (
                        <img
                          src={creator.profile_image_url}
                          alt={creator.name}
                          className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                        />
                      )}
                      <h3 className="text-lg font-bold text-center mb-2">{creator.name}</h3>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {getRegionLabel(creator.region)}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {creator.platform}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center justify-between">
                          <span>팔로워:</span>
                          <span className="font-bold">{creator.followers?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>참여율:</span>
                          <span className="font-bold">{creator.engagement_rate}%</span>
                        </div>
                        {creator.specialty && (
                          <div className="flex items-center gap-1 justify-center mt-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs">{creator.specialty}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEdit(creator)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDelete(creator.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {creators.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  등록된 크리에이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

