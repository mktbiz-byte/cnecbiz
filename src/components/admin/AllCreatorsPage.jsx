import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Search, Globe, Star, MessageSquare, Download,
  Instagram, Youtube, Video, Phone, Mail, Send, CheckSquare,
  X, ExternalLink, User, MapPin, CreditCard, Calendar
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

// 숫자 포맷
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`
  return num.toLocaleString()
}

export default function AllCreatorsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [selectedCreators, setSelectedCreators] = useState([])
  const [reviewData, setReviewData] = useState({ rating: 0, review: '' })
  const [messageData, setMessageData] = useState({ type: 'email', subject: '', content: '' })
  const [sendingMessage, setSendingMessage] = useState(false)

  const [creators, setCreators] = useState({
    korea: [],
    japan: [],
    us: [],
    taiwan: []
  })

  const [stats, setStats] = useState({
    korea: 0,
    japan: 0,
    us: 0,
    taiwan: 0,
    total: 0
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchAllCreators()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/login')
    }
  }

  const fetchAllCreators = async () => {
    setLoading(true)
    try {
      let koreaData = []
      let japanData = []
      let usData = []
      let taiwanData = []

      // 한국 크리에이터
      if (supabaseKorea) {
        try {
          const { data, error } = await supabaseKorea
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })
          if (!error) koreaData = data || []
        } catch (e) {
          console.warn('한국 DB 연결 오류:', e.message)
        }
      }

      // 일본 크리에이터
      if (supabaseJapan) {
        try {
          const { data, error } = await supabaseJapan
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })
          if (!error) japanData = data || []
        } catch (e) {
          console.warn('일본 DB 연결 오류:', e.message)
        }
      }

      // 미국 크리에이터
      if (supabaseUS) {
        try {
          const { data, error } = await supabaseUS
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false })
          if (!error) usData = data || []
        } catch (e) {
          console.warn('미국 DB 연결 오류:', e.message)
        }
      }

      // 대만 크리에이터
      if (supabaseBiz) {
        try {
          const { data, error } = await supabaseBiz
            .from('user_profiles')
            .select('*')
            .eq('region', 'taiwan')
            .order('created_at', { ascending: false })
          if (!error) taiwanData = data || []
        } catch (e) {
          console.warn('대만 DB 연결 오류:', e.message)
        }
      }

      setCreators({ korea: koreaData, japan: japanData, us: usData, taiwan: taiwanData })
      setStats({
        korea: koreaData.length,
        japan: japanData.length,
        us: usData.length,
        taiwan: taiwanData.length,
        total: koreaData.length + japanData.length + usData.length + taiwanData.length
      })
    } catch (error) {
      console.error('크리에이터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-800' },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-800' }
    }
    const { label, color } = statusMap[status] || statusMap.pending
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>
  }

  const getAllCreators = () => {
    return [
      ...creators.korea.map(c => ({ ...c, region: '한국', dbRegion: 'korea' })),
      ...creators.japan.map(c => ({ ...c, region: '일본', dbRegion: 'japan' })),
      ...creators.us.map(c => ({ ...c, region: '미국', dbRegion: 'us' })),
      ...creators.taiwan.map(c => ({ ...c, region: '대만', dbRegion: 'taiwan' }))
    ]
  }

  const filterCreators = (creatorList) => {
    if (!searchTerm) return creatorList
    const term = searchTerm.toLowerCase()
    return creatorList.filter(creator =>
      creator.name?.toLowerCase().includes(term) ||
      creator.email?.toLowerCase().includes(term) ||
      creator.channel_name?.toLowerCase().includes(term) ||
      creator.phone?.includes(term)
    )
  }

  // 선택된 크리에이터 토글
  const toggleSelectCreator = (creator) => {
    setSelectedCreators(prev => {
      const exists = prev.find(c => c.id === creator.id && c.dbRegion === creator.dbRegion)
      if (exists) {
        return prev.filter(c => !(c.id === creator.id && c.dbRegion === creator.dbRegion))
      }
      return [...prev, creator]
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = (creatorList) => {
    const allSelected = creatorList.every(c =>
      selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
    )
    if (allSelected) {
      setSelectedCreators(prev =>
        prev.filter(sc => !creatorList.find(c => c.id === sc.id && c.dbRegion === sc.dbRegion))
      )
    } else {
      const newSelections = creatorList.filter(c =>
        !selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
      )
      setSelectedCreators(prev => [...prev, ...newSelections])
    }
  }

  // 프로필 모달 열기
  const openProfileModal = (creator) => {
    setSelectedCreator(creator)
    setShowProfileModal(true)
  }

  // 메시지 발송 모달 열기
  const openMessageModal = () => {
    if (selectedCreators.length === 0) {
      alert('메시지를 보낼 크리에이터를 선택해주세요.')
      return
    }
    setMessageData({ type: 'email', subject: '', content: '' })
    setShowMessageModal(true)
  }

  // 메시지 발송
  const handleSendMessage = async () => {
    if (!messageData.content) {
      alert('메시지 내용을 입력해주세요.')
      return
    }

    setSendingMessage(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const creator of selectedCreators) {
        try {
          if (messageData.type === 'email' && creator.email) {
            await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: creator.email,
                subject: messageData.subject || '[CNEC] 안내 메시지',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0;">CNEC</h1>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                      <p style="color: #4b5563; line-height: 1.8; white-space: pre-wrap;">${messageData.content}</p>
                    </div>
                  </div>
                `
              })
            })
            successCount++
          } else if (messageData.type === 'kakao' && creator.phone) {
            const phoneNumber = creator.phone.replace(/-/g, '')
            await fetch('/.netlify/functions/send-kakao-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiverNum: phoneNumber,
                receiverName: creator.name || '크리에이터',
                templateCode: '025100001022', // 일반 알림 템플릿
                variables: {
                  '이름': creator.name || '크리에이터',
                  '내용': messageData.content.substring(0, 200)
                }
              })
            })
            successCount++
          }
        } catch (err) {
          console.error(`발송 실패 (${creator.email || creator.phone}):`, err)
          failCount++
        }
      }

      alert(`발송 완료!\n성공: ${successCount}건\n실패: ${failCount}건`)
      setShowMessageModal(false)
      setSelectedCreators([])
    } catch (error) {
      console.error('메시지 발송 오류:', error)
      alert('메시지 발송 중 오류가 발생했습니다.')
    } finally {
      setSendingMessage(false)
    }
  }

  const openReviewModal = (creator, region) => {
    setSelectedCreator({ ...creator, dbRegion: region })
    setReviewData({ rating: creator.rating || 0, review: creator.company_review || '' })
    setShowReviewModal(true)
  }

  const handleSaveReview = async () => {
    if (!selectedCreator) return

    setSaving(true)
    try {
      let supabaseClient
      if (selectedCreator.dbRegion === 'korea') supabaseClient = supabaseKorea
      else if (selectedCreator.dbRegion === 'japan') supabaseClient = supabaseJapan
      else if (selectedCreator.dbRegion === 'us') supabaseClient = supabaseUS
      else supabaseClient = supabaseBiz

      const { error } = await supabaseClient
        .from('user_profiles')
        .update({
          rating: reviewData.rating,
          company_review: reviewData.review,
          review_updated_at: new Date().toISOString()
        })
        .eq('id', selectedCreator.id)

      if (error) throw error

      alert('별점 및 후기가 저장되었습니다.')
      setShowReviewModal(false)
      await fetchAllCreators()
    } catch (error) {
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const exportToExcel = (data, filename, regionName) => {
    const excelData = data.map(creator => ({
      '이름': creator.name || '-',
      '이메일': creator.email || '-',
      '전화번호': creator.phone || '-',
      '인스타그램 URL': creator.instagram_url || '-',
      '인스타그램 팔로워': creator.instagram_followers || 0,
      '유튜브 URL': creator.youtube_url || '-',
      '유튜브 구독자': creator.youtube_subscribers || 0,
      '틱톡 URL': creator.tiktok_url || '-',
      '틱톡 팔로워': creator.tiktok_followers || 0,
      '지역': creator.region || regionName,
      '가입일': creator.created_at ? new Date(creator.created_at).toLocaleDateString() : '-'
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, regionName)
    XLSX.writeFile(workbook, filename)
  }

  const handleExportByRegion = (region) => {
    const regionConfig = {
      korea: { data: creators.korea, name: '한국' },
      japan: { data: creators.japan, name: '일본' },
      us: { data: creators.us, name: '미국' },
      taiwan: { data: creators.taiwan, name: '대만' }
    }
    const config = regionConfig[region]
    if (!config || config.data.length === 0) {
      alert(`${config?.name || region} 크리에이터 데이터가 없습니다.`)
      return
    }
    exportToExcel(config.data, `크리에이터_${config.name}_${new Date().toISOString().split('T')[0]}.xlsx`, config.name)
  }

  // SNS 아이콘 컴포넌트
  const SNSIcons = ({ creator }) => (
    <div className="flex items-center gap-2">
      {/* Instagram */}
      {creator.instagram_url && (
        <a
          href={creator.instagram_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs hover:opacity-90"
          onClick={(e) => e.stopPropagation()}
        >
          <Instagram className="w-3 h-3" />
          <span>{formatNumber(creator.instagram_followers)}</span>
        </a>
      )}
      {/* YouTube */}
      {creator.youtube_url && (
        <a
          href={creator.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:opacity-90"
          onClick={(e) => e.stopPropagation()}
        >
          <Youtube className="w-3 h-3" />
          <span>{formatNumber(creator.youtube_subscribers)}</span>
        </a>
      )}
      {/* TikTok */}
      {creator.tiktok_url && (
        <a
          href={creator.tiktok_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded-lg text-xs hover:opacity-90"
          onClick={(e) => e.stopPropagation()}
        >
          <Video className="w-3 h-3" />
          <span>{formatNumber(creator.tiktok_followers)}</span>
        </a>
      )}
      {!creator.instagram_url && !creator.youtube_url && !creator.tiktok_url && (
        <span className="text-gray-400 text-xs">미등록</span>
      )}
    </div>
  )

  const CreatorTable = ({ creatorList, region }) => {
    const filtered = filterCreators(creatorList)
    const allSelected = filtered.length > 0 && filtered.every(c =>
      selectedCreators.find(sc => sc.id === c.id && sc.dbRegion === c.dbRegion)
    )

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(filtered)}
                  className="w-4 h-4 rounded border-gray-300"
                />
              </th>
              <th className="text-left p-3 font-medium text-gray-600">이름</th>
              <th className="text-left p-3 font-medium text-gray-600">이메일</th>
              <th className="text-left p-3 font-medium text-gray-600">휴대폰</th>
              <th className="text-left p-3 font-medium text-gray-600">SNS</th>
              <th className="text-left p-3 font-medium text-gray-600">상태</th>
              {region === 'all' && <th className="text-left p-3 font-medium text-gray-600">지역</th>}
              <th className="text-left p-3 font-medium text-gray-600">가입일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((creator, index) => {
              const isSelected = selectedCreators.find(sc => sc.id === creator.id && sc.dbRegion === creator.dbRegion)
              return (
                <tr
                  key={`${creator.id}-${index}`}
                  className={`border-b hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-indigo-50' : ''}`}
                  onClick={() => openProfileModal(creator)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => toggleSelectCreator(creator)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-indigo-600 hover:underline font-medium">
                      {creator.name || '-'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{creator.email || '-'}</td>
                  <td className="p-3">
                    {creator.phone ? (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3" />
                        {creator.phone}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <SNSIcons creator={creator} />
                  </td>
                  <td className="p-3">{getStatusBadge(creator.approval_status)}</td>
                  {region === 'all' && (
                    <td className="p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {creator.region}
                      </span>
                    </td>
                  )}
                  <td className="p-3 text-gray-500 text-sm">
                    {creator.created_at ? new Date(creator.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '크리에이터가 없습니다.'}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-600">크리에이터 정보를 불러오는 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">전체 크리에이터 현황</h1>
            <p className="text-gray-500 mt-1">국가별 크리에이터 가입 현황</p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">전체</p>
                    <p className="text-3xl font-bold">{stats.total}명</p>
                  </div>
                  <Globe className="w-10 h-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            {[
              { key: 'korea', flag: '🇰🇷', name: '한국', color: 'from-green-500 to-green-600' },
              { key: 'japan', flag: '🇯🇵', name: '일본', color: 'from-red-500 to-red-600' },
              { key: 'us', flag: '🇺🇸', name: '미국', color: 'from-purple-500 to-purple-600' },
              { key: 'taiwan', flag: '🇹🇼', name: '대만', color: 'from-orange-500 to-orange-600' }
            ].map(({ key, flag, name, color }) => (
              <Card key={key} className={`bg-gradient-to-br ${color} text-white`}>
                <CardContent className="pt-6">
                  <p className="text-white/80 text-sm">{flag} {name}</p>
                  <p className="text-3xl font-bold">{stats[key]}명</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 검색 & 액션 바 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                  <Search className="w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="이름, 이메일, 전화번호로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-2">
                  {selectedCreators.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 bg-indigo-100 px-3 py-1 rounded-full">
                        {selectedCreators.length}명 선택됨
                      </span>
                      <Button
                        onClick={openMessageModal}
                        className="bg-indigo-500 hover:bg-indigo-600"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        메시지 발송
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCreators([])}
                      >
                        선택 해제
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 탭 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all">전체 ({stats.total})</TabsTrigger>
              <TabsTrigger value="korea">한국 ({stats.korea})</TabsTrigger>
              <TabsTrigger value="japan">일본 ({stats.japan})</TabsTrigger>
              <TabsTrigger value="us">미국 ({stats.us})</TabsTrigger>
              <TabsTrigger value="taiwan">대만 ({stats.taiwan})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>전체 크리에이터 ({stats.total}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreatorTable creatorList={getAllCreators()} region="all" />
                </CardContent>
              </Card>
            </TabsContent>

            {['korea', 'japan', 'us', 'taiwan'].map(region => (
              <TabsContent key={region} value={region}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        {region === 'korea' && '한국'}{region === 'japan' && '일본'}{region === 'us' && '미국'}{region === 'taiwan' && '대만'} 크리에이터 ({stats[region]}명)
                      </CardTitle>
                      <Button onClick={() => handleExportByRegion(region)} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        엑셀 다운로드
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CreatorTable
                      creatorList={creators[region].map(c => ({ ...c, region: region === 'korea' ? '한국' : region === 'japan' ? '일본' : region === 'us' ? '미국' : '대만', dbRegion: region }))}
                      region={region}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* 프로필 모달 */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              크리에이터 프로필
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center overflow-hidden">
                  {selectedCreator.profile_image ? (
                    <img src={selectedCreator.profile_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedCreator.name || '이름 없음'}</h3>
                  <p className="text-gray-500">{selectedCreator.email}</p>
                  {selectedCreator.phone && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-4 h-4" /> {selectedCreator.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* SNS 정보 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> SNS 정보
                </h4>
                <div className="space-y-3">
                  {selectedCreator.instagram_url && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <Instagram className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">Instagram</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.instagram_followers)} 팔로워</span>
                        <a href={selectedCreator.instagram_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedCreator.youtube_url && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                          <Youtube className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">YouTube</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.youtube_subscribers)} 구독자</span>
                        <a href={selectedCreator.youtube_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedCreator.tiktok_url && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-600">TikTok</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatNumber(selectedCreator.tiktok_followers)} 팔로워</span>
                        <a href={selectedCreator.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {!selectedCreator.instagram_url && !selectedCreator.youtube_url && !selectedCreator.tiktok_url && (
                    <p className="text-gray-400 text-center py-4">등록된 SNS 정보가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* 추가 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 지역
                  </h4>
                  <p className="text-gray-600">{selectedCreator.region || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 가입일
                  </h4>
                  <p className="text-gray-600">
                    {selectedCreator.created_at ? new Date(selectedCreator.created_at).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
              </div>

              {/* 은행 정보 */}
              {(selectedCreator.bank_name || selectedCreator.bank_account_number) && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 정산 계좌
                  </h4>
                  <p className="text-gray-600">
                    {selectedCreator.bank_name} {selectedCreator.bank_account_number} ({selectedCreator.bank_account_holder})
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileModal(false)}>
              닫기
            </Button>
            <Button onClick={() => {
              setShowProfileModal(false)
              openReviewModal(selectedCreator, selectedCreator?.dbRegion)
            }}>
              <Star className="w-4 h-4 mr-2" />
              평가하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 메시지 발송 모달 */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-500" />
              메시지 발송 ({selectedCreators.length}명)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">발송 방식</label>
              <div className="flex gap-2">
                <Button
                  variant={messageData.type === 'email' ? 'default' : 'outline'}
                  onClick={() => setMessageData({ ...messageData, type: 'email' })}
                  className={messageData.type === 'email' ? 'bg-indigo-500' : ''}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  이메일
                </Button>
                <Button
                  variant={messageData.type === 'kakao' ? 'default' : 'outline'}
                  onClick={() => setMessageData({ ...messageData, type: 'kakao' })}
                  className={messageData.type === 'kakao' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  카카오 알림톡
                </Button>
              </div>
            </div>

            {messageData.type === 'email' && (
              <div>
                <label className="block text-sm font-medium mb-2">제목</label>
                <Input
                  value={messageData.subject}
                  onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                  placeholder="이메일 제목"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">내용</label>
              <Textarea
                value={messageData.content}
                onChange={(e) => setMessageData({ ...messageData, content: e.target.value })}
                placeholder="메시지 내용을 입력하세요..."
                className="min-h-[150px]"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                <strong>수신자:</strong> {selectedCreators.map(c => c.name || c.email).join(', ')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)} disabled={sendingMessage}>
              취소
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage} className="bg-indigo-500 hover:bg-indigo-600">
              {sendingMessage ? '발송 중...' : '발송하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 후기 작성 모달 */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              크리에이터 평가 및 후기
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">이름:</span> {selectedCreator.name || '-'}</div>
                  <div><span className="font-semibold">이메일:</span> {selectedCreator.email || '-'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">별점</label>
                <select
                  value={reviewData.rating}
                  onChange={(e) => setReviewData({ ...reviewData, rating: parseFloat(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="0">0.0 - 평가 안 함</option>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(v => (
                    <option key={v} value={v}>{v.toFixed(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">후기 (내부용)</label>
                <Textarea
                  value={reviewData.review}
                  onChange={(e) => setReviewData({ ...reviewData, review: e.target.value })}
                  placeholder="크리에이터와의 협업 경험을 작성해주세요..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSaveReview} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600">
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
