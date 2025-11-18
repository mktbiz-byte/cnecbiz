import React, { useState, useEffect } from 'react'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Search, Link, AlertCircle, CheckCircle } from 'lucide-react'

export default function CreatorMappingManagement() {
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [mappingType, setMappingType] = useState(null) // 'ai' or 'featured'

  useEffect(() => {
    fetchAllCreators()
  }, [])

  const fetchAllCreators = async () => {
    setLoading(true)
    try {
      // AI 추천 크리에이터 가져오기
      const { data: aiData, error: aiError } = await supabaseKorea
        .from('campaign_recommendations')
        .select(`
          *,
          user_profiles (
            id,
            name,
            email,
            profile_photo_url
          )
        `)
        .order('created_at', { ascending: false })

      if (aiError) throw aiError

      // featured_creators 가져오기
      const { data: featuredData, error: featuredError } = await supabaseKorea
        .from('featured_creators')
        .select('*')
        .order('created_at', { ascending: false })

      if (featuredError) throw featuredError

      // 중복 제거 (같은 user_id를 가진 추천은 하나만)
      const uniqueAI = []
      const seenUserIds = new Set()
      
      aiData?.forEach(rec => {
        if (!seenUserIds.has(rec.user_id)) {
          seenUserIds.add(rec.user_id)
          uniqueAI.push(rec)
        }
      })

      setAiRecommendations(uniqueAI || [])
      setFeaturedCreators(featuredData || [])
    } catch (error) {
      console.error('크리에이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUserByEmail = async () => {
    if (!searchEmail.trim()) {
      alert('이메일을 입력해주세요.')
      return
    }

    try {
      const { data, error } = await supabaseKorea
        .from('user_profiles')
        .select('*')
        .ilike('email', `%${searchEmail.trim()}%`)

      if (error) throw error

      setSearchResults(data || [])
      
      if (!data || data.length === 0) {
        alert('해당 이메일로 가입한 크리에이터를 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('검색 오류:', error)
      alert('검색 중 오류가 발생했습니다.')
    }
  }

  const handleMapping = async (userProfile) => {
    if (!selectedCreator) return

    try {
      if (mappingType === 'ai') {
        // AI 추천 크리에이터 매핑
        const { error } = await supabaseKorea
          .from('campaign_recommendations')
          .update({ user_id: userProfile.id })
          .eq('id', selectedCreator.id)

        if (error) throw error
      } else if (mappingType === 'featured') {
        // 크넥 플러스 크리에이터 매핑
        const { error } = await supabaseKorea
          .from('featured_creators')
          .update({ user_id: userProfile.id })
          .eq('id', selectedCreator.id)

        if (error) throw error
      }

      alert('매핑이 완료되었습니다!')
      setShowSearchModal(false)
      setSearchEmail('')
      setSearchResults([])
      setSelectedCreator(null)
      fetchAllCreators()
    } catch (error) {
      console.error('매핑 오류:', error)
      alert('매핑 중 오류가 발생했습니다.')
    }
  }

  const openSearchModal = (creator, type) => {
    setSelectedCreator(creator)
    setMappingType(type)
    setShowSearchModal(true)
    setSearchEmail('')
    setSearchResults([])
  }

  const unmappedAI = aiRecommendations.filter(rec => !rec.user_profiles)
  const mappedAI = aiRecommendations.filter(rec => rec.user_profiles)
  const unmappedFeatured = featuredCreators.filter(fc => !fc.user_id)
  const mappedFeatured = featuredCreators.filter(fc => fc.user_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">크리에이터 매핑 관리</h1>
        <p className="text-gray-600">추천 크리에이터를 실제 가입한 계정과 연결합니다.</p>
      </div>

      {/* 알림 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className={unmappedAI.length > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {unmappedAI.length > 0 ? (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
                <div>
                  <p className="text-sm text-gray-600">AI 추천 미매핑</p>
                  <p className="text-2xl font-bold">{unmappedAI.length}명</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={unmappedFeatured.length > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {unmappedFeatured.length > 0 ? (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
                <div>
                  <p className="text-sm text-gray-600">크넥 플러스 미매핑</p>
                  <p className="text-2xl font-bold">{unmappedFeatured.length}명</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI 추천 크리에이터 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI 추천 크리에이터
            <Badge variant="outline">{aiRecommendations.length}명</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unmappedAI.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                미매핑 ({unmappedAI.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unmappedAI.map(rec => (
                  <Card key={rec.id} className="border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{rec.user_id || '이름 없음'}</p>
                          <p className="text-xs text-gray-500">점수: {rec.recommendation_score}</p>
                        </div>
                        <Badge className="bg-red-600">미매핑</Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openSearchModal(rec, 'ai')}
                      >
                        <Link className="w-4 h-4 mr-2" />
                        매핑하기
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {mappedAI.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                매핑 완료 ({mappedAI.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappedAI.map(rec => (
                  <Card key={rec.id} className="border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={rec.user_profiles?.profile_photo_url || '/default-avatar.png'}
                          alt={rec.user_profiles?.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{rec.user_profiles?.name}</p>
                          <p className="text-xs text-gray-500">{rec.user_profiles?.email}</p>
                          <Badge className="bg-green-600 mt-1">매핑됨</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 크넥 플러스 크리에이터 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            크넥 플러스 크리에이터
            <Badge variant="outline">{featuredCreators.length}명</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unmappedFeatured.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                미매핑 ({unmappedFeatured.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unmappedFeatured.map(fc => (
                  <Card key={fc.id} className="border-red-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{fc.name}</p>
                          <p className="text-xs text-gray-500">
                            📷 {fc.instagram_followers?.toLocaleString() || 0}
                          </p>
                        </div>
                        <Badge className="bg-red-600">미매핑</Badge>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => openSearchModal(fc, 'featured')}
                      >
                        <Link className="w-4 h-4 mr-2" />
                        매핑하기
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {mappedFeatured.length > 0 && (
            <div>
              <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                매핑 완료 ({mappedFeatured.length}명)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappedFeatured.map(fc => (
                  <Card key={fc.id} className="border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={fc.profile_photo_url || '/default-avatar.png'}
                          alt={fc.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{fc.name}</p>
                          <p className="text-xs text-gray-500">
                            📷 {fc.instagram_followers?.toLocaleString() || 0}
                          </p>
                          <Badge className="bg-green-600 mt-1">매핑됨</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 검색 모달 */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>크리에이터 계정 검색 및 매핑</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                매핑할 크리에이터: <span className="font-semibold">{selectedCreator?.name || selectedCreator?.user_id}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="이메일 주소 입력"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUserByEmail()}
              />
              <Button onClick={searchUserByEmail}>
                <Search className="w-4 h-4 mr-2" />
                검색
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <h4 className="font-semibold mb-3">검색 결과 ({searchResults.length}명)</h4>
                <div className="space-y-2">
                  {searchResults.map(user => (
                    <Card key={user.id} className="hover:border-blue-500 cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.profile_photo_url || '/default-avatar.png'}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div>
                              <p className="font-semibold">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-gray-400">
                                📷 {user.instagram_followers?.toLocaleString() || 0} | 
                                🎥 {user.youtube_subscribers?.toLocaleString() || 0}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleMapping(user)}
                          >
                            <Link className="w-4 h-4 mr-2" />
                            매핑
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSearchModal(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
