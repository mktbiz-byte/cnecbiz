import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Plus, Edit, Trash2, Star, DollarSign, Users } from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function FeaturedCreatorsSimple() {
  const navigate = useNavigate()
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [userProfiles, setUserProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    age: '',
    profile_photo_url: '',
    instagram_url: '',
    instagram_followers: 0,
    youtube_url: '',
    youtube_subscribers: 0,
    tiktok_url: '',
    tiktok_followers: 0,
    bio: '',
    specialties: '',
    base_price: '',
    upgrade_price: '',
    rating: 0,
    total_campaigns: 0,
    avg_views: '',
    engagement_rate: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Featured Creators 조회
      const { data: featured, error: featuredError } = await supabaseKorea
        .from('featured_creators')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })

      if (featuredError) throw featuredError
      setFeaturedCreators(featured || [])

      // User Profiles 조회 (Featured에 없는 크리에이터)
      const { data: profiles, error: profilesError } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError
      setUserProfiles(profiles || [])
    } catch (error) {
      console.error('데이터 조회 오류:', error)
      alert('데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUserSelect = (e) => {
    const userId = e.target.value
    const user = userProfiles.find(u => u.id === userId)
    
    if (user) {
      setFormData({
        user_id: user.id,
        name: user.name || '',
        age: user.age || '',
        profile_photo_url: user.profile_photo_url || user.profile_image_url || '',
        instagram_url: user.instagram_url || '',
        instagram_followers: user.instagram_followers || 0,
        youtube_url: user.youtube_url || '',
        youtube_subscribers: user.youtube_subscribers || 0,
        tiktok_url: user.tiktok_url || '',
        tiktok_followers: user.tiktok_followers || 0,
        bio: user.bio || '',
        specialties: '',
        base_price: '',
        upgrade_price: '',
        rating: user.rating || 0,
        total_campaigns: 0,
        avg_views: '',
        engagement_rate: ''
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.base_price) {
      alert('이름과 기본 금액은 필수 입력 항목입니다.')
      return
    }

    try {
      const specialtiesArray = formData.specialties
        ? formData.specialties.split(',').map(s => s.trim())
        : []

      const dataToSave = {
        user_id: formData.user_id || null,
        name: formData.name,
        age: parseInt(formData.age) || null,
        profile_photo_url: formData.profile_photo_url || null,
        instagram_url: formData.instagram_url || null,
        instagram_followers: parseInt(formData.instagram_followers) || 0,
        youtube_url: formData.youtube_url || null,
        youtube_subscribers: parseInt(formData.youtube_subscribers) || 0,
        tiktok_url: formData.tiktok_url || null,
        tiktok_followers: parseInt(formData.tiktok_followers) || 0,
        bio: formData.bio || null,
        specialties: specialtiesArray,
        base_price: parseInt(formData.base_price.replace(/,/g, '')) || 0,
        upgrade_price: parseInt(formData.upgrade_price.replace(/,/g, '')) || 0,
        rating: parseFloat(formData.rating) || 0,
        total_campaigns: parseInt(formData.total_campaigns) || 0,
        avg_views: parseInt(formData.avg_views.replace(/,/g, '')) || 0,
        engagement_rate: parseFloat(formData.engagement_rate) || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      if (editingId) {
        // 수정
        const { error } = await supabaseKorea
          .from('featured_creators')
          .update(dataToSave)
          .eq('id', editingId)

        if (error) throw error
        alert('수정되었습니다.')
      } else {
        // 추가
        const { error } = await supabaseKorea
          .from('featured_creators')
          .insert([dataToSave])

        if (error) throw error
        alert('추가되었습니다.')
      }

      // 폼 초기화 및 목록 새로고침
      setShowForm(false)
      setEditingId(null)
      setFormData({
        user_id: '',
        name: '',
        age: '',
        profile_photo_url: '',
        instagram_url: '',
        instagram_followers: 0,
        youtube_url: '',
        youtube_subscribers: 0,
        tiktok_url: '',
        tiktok_followers: 0,
        bio: '',
        specialties: '',
        base_price: '',
        upgrade_price: '',
        rating: 0,
        total_campaigns: 0,
        avg_views: '',
        engagement_rate: ''
      })
      await fetchData()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (creator) => {
    setEditingId(creator.id)
    setFormData({
      user_id: creator.user_id || '',
      name: creator.name || '',
      age: creator.age || '',
      profile_photo_url: creator.profile_photo_url || '',
      instagram_url: creator.instagram_url || '',
      instagram_followers: creator.instagram_followers || 0,
      youtube_url: creator.youtube_url || '',
      youtube_subscribers: creator.youtube_subscribers || 0,
      tiktok_url: creator.tiktok_url || '',
      tiktok_followers: creator.tiktok_followers || 0,
      bio: creator.bio || '',
      specialties: (creator.specialties || []).join(', '),
      base_price: creator.base_price?.toLocaleString() || '',
      upgrade_price: creator.upgrade_price?.toLocaleString() || '',
      rating: creator.rating || 0,
      total_campaigns: creator.total_campaigns || 0,
      avg_views: creator.avg_views?.toLocaleString() || '',
      engagement_rate: creator.engagement_rate || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea
        .from('featured_creators')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      alert('삭제되었습니다.')
      await fetchData()
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  Featured Creators 관리
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  추천 크리에이터 등록 및 금액 설정
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  대시보드
                </Button>
                {!showForm && (
                  <Button onClick={() => {
                    setShowForm(true)
                    setEditingId(null)
                    setFormData({
                      user_id: '',
                      name: '',
                      age: '',
                      profile_photo_url: '',
                      instagram_url: '',
                      instagram_followers: 0,
                      youtube_url: '',
                      youtube_subscribers: 0,
                      tiktok_url: '',
                      tiktok_followers: 0,
                      bio: '',
                      specialties: '',
                      base_price: '',
                      upgrade_price: '',
                      rating: 0,
                      total_campaigns: 0,
                      avg_views: '',
                      engagement_rate: ''
                    })
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    크리에이터 추가
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">총 Featured Creators</p>
                    <p className="text-2xl font-bold">{featuredCreators.length}명</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 별점</p>
                    <p className="text-2xl font-bold">
                      {featuredCreators.length > 0
                        ? (featuredCreators.reduce((sum, c) => sum + (c.rating || 0), 0) / featuredCreators.length).toFixed(1)
                        : '0.0'}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 기본 금액</p>
                    <p className="text-2xl font-bold">
                      {featuredCreators.length > 0
                        ? `₩${Math.round(featuredCreators.reduce((sum, c) => sum + (c.base_price || 0), 0) / featuredCreators.length).toLocaleString()}`
                        : '₩0'}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 폼 */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId ? '크리에이터 수정' : '크리에이터 추가'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* User Profile 선택 */}
                  {!editingId && (
                    <div>
                      <Label>User Profile에서 선택 (선택사항)</Label>
                      <select
                        onChange={handleUserSelect}
                        className="w-full border rounded-md px-3 py-2"
                      >
                        <option value="">직접 입력</option>
                        {userProfiles.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>이름 *</Label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label>나이</Label>
                      <Input
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>프로필 사진 URL</Label>
                    <Input
                      name="profile_photo_url"
                      value={formData.profile_photo_url}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Instagram URL</Label>
                      <Input
                        name="instagram_url"
                        value={formData.instagram_url}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label>Instagram 팔로워</Label>
                      <Input
                        name="instagram_followers"
                        type="number"
                        value={formData.instagram_followers}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>YouTube URL</Label>
                      <Input
                        name="youtube_url"
                        value={formData.youtube_url}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label>YouTube 구독자</Label>
                      <Input
                        name="youtube_subscribers"
                        type="number"
                        value={formData.youtube_subscribers}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>소개</Label>
                    <Textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>전문 분야 (쉼표로 구분)</Label>
                    <Input
                      name="specialties"
                      value={formData.specialties}
                      onChange={handleInputChange}
                      placeholder="뷰티, 패션, 푸드"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg">
                    <div>
                      <Label className="text-lg font-semibold">기본 금액 (₩) *</Label>
                      <Input
                        name="base_price"
                        value={formData.base_price}
                        onChange={handleInputChange}
                        placeholder="500,000"
                        required
                        className="text-lg"
                      />
                    </div>
                    <div>
                      <Label className="text-lg font-semibold">상향 금액 (₩)</Label>
                      <Input
                        name="upgrade_price"
                        value={formData.upgrade_price}
                        onChange={handleInputChange}
                        placeholder="200,000"
                        className="text-lg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingId ? '수정' : '추가'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        setEditingId(null)
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Creators 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">이름</th>
                      <th className="text-left p-3">채널</th>
                      <th className="text-left p-3">팔로워</th>
                      <th className="text-left p-3">기본 금액</th>
                      <th className="text-left p-3">상향 금액</th>
                      <th className="text-left p-3">별점</th>
                      <th className="text-left p-3">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featuredCreators.map(creator => (
                      <tr key={creator.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {creator.profile_photo_url && (
                              <img
                                src={creator.profile_photo_url}
                                alt={creator.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{creator.name}</div>
                              {creator.age && (
                                <div className="text-sm text-gray-500">{creator.age}세</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm space-y-1">
                            {creator.instagram_url && (
                              <div>Instagram: {creator.instagram_followers?.toLocaleString()}명</div>
                            )}
                            {creator.youtube_url && (
                              <div>YouTube: {creator.youtube_subscribers?.toLocaleString()}명</div>
                            )}
                            {creator.tiktok_url && (
                              <div>TikTok: {creator.tiktok_followers?.toLocaleString()}명</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {Math.max(
                            creator.instagram_followers || 0,
                            creator.youtube_subscribers || 0,
                            creator.tiktok_followers || 0
                          ).toLocaleString()}명
                        </td>
                        <td className="p-3 font-semibold text-green-600">
                          ₩{creator.base_price?.toLocaleString() || '0'}
                        </td>
                        <td className="p-3 font-semibold text-blue-600">
                          {creator.upgrade_price ? `₩${creator.upgrade_price.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {creator.rating?.toFixed(1) || '0.0'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(creator)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(creator.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                {featuredCreators.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    등록된 Featured Creator가 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </>
  )
}
