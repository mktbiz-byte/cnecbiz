import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Users, Search, Send, CheckCircle, Loader2, Star, Phone, Mail,
  Instagram, Youtube, Filter, UserCheck, MessageSquare, Award, ChevronLeft, ChevronRight
} from 'lucide-react'
import { supabaseBiz, supabaseKorea, supabaseJapan, supabaseUS } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

// 캠페인에 "진행"한 것으로 간주하는 신청 상태들
const PARTICIPATED_STATUSES = [
  'selected', 'guide_submitted', 'video_submitted', 'video_approved',
  'sns_uploaded', 'completed', 'paid'
]

// 페이지당 아이템 수
const ITEMS_PER_PAGE = 30

// 소속 제안 알림톡 템플릿 코드
const PROPOSAL_TEMPLATE_CODE = '026020001350'

export default function CreatorProposalManagement() {
  const navigate = useNavigate()

  // 데이터 상태
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('크리에이터 데이터를 불러오는 중...')

  // 지원혜택 설정
  const [supportBenefits, setSupportBenefits] = useState(
    localStorage.getItem('creatorProposal_supportBenefits') || ''
  )

  // 발송 상태
  const [sending, setSending] = useState({}) // { [creatorKey]: true }
  const [sentCreators, setSentCreators] = useState(new Set()) // 발송 완료된 크리에이터
  const [selectedCreators, setSelectedCreators] = useState(new Set()) // 선택된 크리에이터 (일괄 발송용)

  // 필터 및 검색
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, 2plus, not_sent

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)

  // 일괄 발송 모달
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)

  // 개별 발송 확인 모달
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTarget, setSendTarget] = useState(null)

  useEffect(() => {
    checkAuth()
    fetchCreatorsWithCampaigns()
  }, [])

  // 지원혜택 저장
  useEffect(() => {
    localStorage.setItem('creatorProposal_supportBenefits', supportBenefits)
  }, [supportBenefits])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
    }
  }

  // 리전별 DB에서 크리에이터 + 캠페인 참여 데이터 가져오기
  const fetchCreatorsWithCampaigns = async () => {
    try {
      setLoading(true)
      setLoadingMessage('리전별 데이터 조회 중...')

      const regionalClients = [
        { name: 'korea', client: supabaseKorea },
        { name: 'japan', client: supabaseJapan },
        { name: 'us', client: supabaseUS },
      ].filter(r => r.client)

      const allCreatorMap = {} // key: phone or user_id -> creator info with campaign count

      for (const region of regionalClients) {
        setLoadingMessage(`${region.name} 리전 데이터 조회 중...`)

        // 1. 해당 리전의 신청 데이터 가져오기 (진행 이력이 있는 것만)
        const { data: applications, error: appError } = await region.client
          .from('applications')
          .select('user_id, campaign_id, applicant_name, phone_number, status')
          .in('status', PARTICIPATED_STATUSES)

        if (appError) {
          console.error(`[${region.name}] applications 조회 오류:`, appError)
          continue
        }

        if (!applications || applications.length === 0) continue

        // 2. user_id별로 캠페인 수 집계
        const userCampaignMap = {}
        for (const app of applications) {
          const key = app.phone_number || app.user_id
          if (!key) continue

          if (!userCampaignMap[key]) {
            userCampaignMap[key] = {
              user_id: app.user_id,
              name: app.applicant_name,
              phone: app.phone_number,
              campaignIds: new Set(),
              region: region.name
            }
          }
          userCampaignMap[key].campaignIds.add(app.campaign_id)
        }

        // 3. user_profiles에서 프로필 정보 보강
        const userIds = [...new Set(applications.map(a => a.user_id).filter(Boolean))]
        let profileMap = {}

        if (userIds.length > 0) {
          // 50개씩 나눠서 조회
          for (let i = 0; i < userIds.length; i += 50) {
            const batch = userIds.slice(i, i + 50)
            const { data: profiles } = await region.client
              .from('user_profiles')
              .select('id, name, phone, email, profile_image, instagram_url, youtube_url, tiktok_url, instagram_followers, youtube_subscribers')
              .in('id', batch)

            if (profiles) {
              for (const p of profiles) {
                profileMap[p.id] = p
              }
            }
          }
        }

        // 4. 통합
        for (const [key, data] of Object.entries(userCampaignMap)) {
          const profile = profileMap[data.user_id] || {}
          const globalKey = data.phone || data.user_id

          if (allCreatorMap[globalKey]) {
            // 이미 다른 리전에서 등록된 크리에이터 -> 캠페인 수만 병합
            for (const cid of data.campaignIds) {
              allCreatorMap[globalKey].campaignIds.add(cid)
            }
          } else {
            allCreatorMap[globalKey] = {
              key: globalKey,
              user_id: data.user_id,
              name: profile.name || data.name || '이름 없음',
              phone: profile.phone || data.phone || '',
              email: profile.email || '',
              profile_image: profile.profile_image || '',
              instagram_url: profile.instagram_url || '',
              youtube_url: profile.youtube_url || '',
              tiktok_url: profile.tiktok_url || '',
              instagram_followers: profile.instagram_followers || 0,
              youtube_subscribers: profile.youtube_subscribers || 0,
              campaignIds: data.campaignIds,
              region: data.region
            }
          }
        }
      }

      // BIZ DB에서도 조회 (폴백)
      setLoadingMessage('BIZ DB 데이터 조회 중...')
      const { data: bizApps } = await supabaseBiz
        .from('applications')
        .select('user_id, campaign_id, applicant_name, phone_number, status')
        .in('status', PARTICIPATED_STATUSES)

      if (bizApps) {
        for (const app of bizApps) {
          const key = app.phone_number || app.user_id
          if (!key) continue

          if (allCreatorMap[key]) {
            allCreatorMap[key].campaignIds.add(app.campaign_id)
          } else {
            allCreatorMap[key] = {
              key,
              user_id: app.user_id,
              name: app.applicant_name || '이름 없음',
              phone: app.phone_number || '',
              email: '',
              profile_image: '',
              instagram_url: '',
              youtube_url: '',
              tiktok_url: '',
              instagram_followers: 0,
              youtube_subscribers: 0,
              campaignIds: new Set([app.campaign_id]),
              region: 'biz'
            }
          }
        }
      }

      // Set을 count로 변환하고 배열로 변환
      const creatorList = Object.values(allCreatorMap).map(c => ({
        ...c,
        campaignCount: c.campaignIds.size,
        campaignIds: undefined // Set은 직렬화 안 되므로 제거
      }))

      // 캠페인 수 내림차순 정렬
      creatorList.sort((a, b) => b.campaignCount - a.campaignCount)

      setCreators(creatorList)
    } catch (error) {
      console.error('크리에이터 데이터 로드 실패:', error)
      alert('데이터 로드 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 필터링된 크리에이터 목록
  const filteredCreators = useMemo(() => {
    let list = creators

    // 필터 적용
    if (filter === '2plus') {
      list = list.filter(c => c.campaignCount >= 2)
    } else if (filter === 'not_sent') {
      list = list.filter(c => !sentCreators.has(c.key))
    }

    // 검색 적용
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      list = list.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term)
      )
    }

    return list
  }, [creators, filter, searchTerm, sentCreators])

  // 페이지네이션
  const totalPages = Math.ceil(filteredCreators.length / ITEMS_PER_PAGE)
  const paginatedCreators = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCreators.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredCreators, currentPage])

  // 통계
  const stats = useMemo(() => ({
    total: creators.length,
    twoPlusCampaigns: creators.filter(c => c.campaignCount >= 2).length,
    sent: sentCreators.size,
    selected: selectedCreators.size
  }), [creators, sentCreators, selectedCreators])

  // 개별 알림톡 발송
  const sendProposal = async (creator) => {
    if (!supportBenefits.trim()) {
      alert('지원혜택을 먼저 입력해주세요.')
      return
    }

    if (!creator.phone) {
      alert('해당 크리에이터의 전화번호가 없습니다.')
      return
    }

    try {
      setSending(prev => ({ ...prev, [creator.key]: true }))

      const response = await fetch('/.netlify/functions/send-kakao-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverNum: creator.phone.replace(/-/g, ''),
          receiverName: creator.name,
          templateCode: PROPOSAL_TEMPLATE_CODE,
          variables: {
            '크리에이터명': creator.name,
            '지원혜택': supportBenefits.trim()
          }
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '발송 실패')
      }

      setSentCreators(prev => new Set([...prev, creator.key]))
      setShowSendModal(false)
      setSendTarget(null)
    } catch (error) {
      console.error('알림톡 발송 오류:', error)
      alert(`발송 실패: ${error.message}`)
    } finally {
      setSending(prev => ({ ...prev, [creator.key]: false }))
    }
  }

  // 일괄 발송
  const sendBulkProposals = async () => {
    if (!supportBenefits.trim()) {
      alert('지원혜택을 먼저 입력해주세요.')
      return
    }

    const targets = filteredCreators.filter(c =>
      selectedCreators.has(c.key) && c.phone && !sentCreators.has(c.key)
    )

    if (targets.length === 0) {
      alert('발송할 대상이 없습니다.')
      return
    }

    setBulkSending(true)
    setBulkResults(null)

    const results = { success: 0, fail: 0, errors: [] }

    for (const creator of targets) {
      try {
        const response = await fetch('/.netlify/functions/send-kakao-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverNum: creator.phone.replace(/-/g, ''),
            receiverName: creator.name,
            templateCode: PROPOSAL_TEMPLATE_CODE,
            variables: {
              '크리에이터명': creator.name,
              '지원혜택': supportBenefits.trim()
            }
          })
        })

        const result = await response.json()

        if (result.success) {
          results.success++
          setSentCreators(prev => new Set([...prev, creator.key]))
        } else {
          results.fail++
          results.errors.push(`${creator.name}: ${result.error}`)
        }
      } catch (error) {
        results.fail++
        results.errors.push(`${creator.name}: ${error.message}`)
      }

      // API 속도 제한 방지 (0.5초 간격)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setBulkResults(results)
    setBulkSending(false)
    setSelectedCreators(new Set())
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedCreators.size === filteredCreators.length) {
      setSelectedCreators(new Set())
    } else {
      setSelectedCreators(new Set(filteredCreators.map(c => c.key)))
    }
  }

  // 2회 이상 전체 선택
  const selectTwoPlusCreators = () => {
    const twoPlusKeys = filteredCreators
      .filter(c => c.campaignCount >= 2 && !sentCreators.has(c.key) && c.phone)
      .map(c => c.key)
    setSelectedCreators(new Set(twoPlusKeys))
  }

  // 개별 선택
  const toggleSelect = (key) => {
    setSelectedCreators(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // 개별 발송 확인 모달 열기
  const openSendModal = (creator) => {
    if (!supportBenefits.trim()) {
      alert('지원혜택을 먼저 입력해주세요.')
      return
    }
    setSendTarget(creator)
    setShowSendModal(true)
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7] mx-auto mb-4" />
            <p className="text-gray-600">{loadingMessage}</p>
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
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Pretendard', sans-serif" }}>
              소속 크리에이터 제안
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              캠페인 참여 이력이 있는 크리에이터에게 소속 제안 알림톡을 발송합니다.
            </p>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">전체 크리에이터</p>
                    <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {stats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">2회 이상 참여</p>
                    <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {stats.twoPlusCampaigns}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                    <Send className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">발송 완료</p>
                    <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {stats.sent}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-[#6C5CE7]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">선택됨</p>
                    <p className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {stats.selected}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 지원혜택 설정 */}
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-[#6C5CE7]" />
                지원혜택 설정
              </CardTitle>
              <p className="text-xs text-gray-500">
                아래 내용이 알림톡의 '지원혜택' 변수에 들어갑니다. 모든 발송에 동일하게 적용됩니다.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={supportBenefits}
                onChange={(e) => setSupportBenefits(e.target.value)}
                placeholder={`예시:\n- 전속 캠페인 우선 배정\n- 월 고정 수익 보장\n- 브랜드 콜라보 기회 제공\n- 전문 매니지먼트 지원`}
                className="min-h-[120px] text-sm"
              />
              {!supportBenefits.trim() && (
                <p className="text-xs text-red-500 mt-2">
                  * 지원혜택을 입력해야 알림톡을 발송할 수 있습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 필터 & 검색 & 액션 */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* 필터 탭 */}
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: '전체', count: creators.length },
                    { key: '2plus', label: '2회 이상', count: stats.twoPlusCampaigns },
                    { key: 'not_sent', label: '미발송', count: creators.length - sentCreators.size },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setFilter(tab.key); setCurrentPage(1) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === tab.key
                          ? 'bg-[#6C5CE7] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                {/* 검색 */}
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    placeholder="이름, 전화번호 검색..."
                    className="pl-9 text-sm"
                  />
                </div>

                {/* 일괄 액션 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectTwoPlusCreators}
                    className="text-xs"
                  >
                    <Award className="w-3.5 h-3.5 mr-1" />
                    2회+ 전체 선택
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="text-xs"
                  >
                    {selectedCreators.size === filteredCreators.length ? '전체 해제' : '전체 선택'}
                  </Button>
                  {selectedCreators.size > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setShowBulkModal(true)}
                      disabled={!supportBenefits.trim()}
                      className="text-xs bg-[#6C5CE7] hover:bg-[#5A4BD6] text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      선택 발송 ({selectedCreators.size}명)
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 크리에이터 목록 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-[40px_1fr_120px_100px_120px_100px] gap-2 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCreators.size === filteredCreators.length && filteredCreators.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </div>
                <div>크리에이터</div>
                <div className="text-center">캠페인 수</div>
                <div className="text-center">리전</div>
                <div className="text-center">채널</div>
                <div className="text-center">발송</div>
              </div>

              {/* 크리에이터 행 */}
              {paginatedCreators.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  {searchTerm ? '검색 결과가 없습니다.' : '크리에이터 데이터가 없습니다.'}
                </div>
              ) : (
                paginatedCreators.map((creator) => (
                  <div
                    key={creator.key}
                    className={`grid grid-cols-[40px_1fr_120px_100px_120px_100px] gap-2 px-4 py-3 border-b hover:bg-gray-50/50 transition-colors items-center ${
                      sentCreators.has(creator.key) ? 'bg-green-50/30' : ''
                    } ${creator.campaignCount >= 2 ? 'border-l-[3px] border-l-[#6C5CE7]' : ''}`}
                  >
                    {/* 체크박스 */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCreators.has(creator.key)}
                        onChange={() => toggleSelect(creator.key)}
                        className="rounded border-gray-300"
                      />
                    </div>

                    {/* 크리에이터 정보 */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {creator.profile_image ? (
                          <img
                            src={creator.profile_image}
                            alt={creator.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                            {creator.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-[#1A1A2E] truncate">
                            {creator.name}
                          </span>
                          {creator.campaignCount >= 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#F0EDFF] text-[#6C5CE7] text-[10px] font-semibold flex-shrink-0">
                              {creator.campaignCount}회
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          {creator.phone && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3" />
                              {creator.phone}
                            </span>
                          )}
                          {creator.email && (
                            <span className="flex items-center gap-0.5 truncate">
                              <Mail className="w-3 h-3" />
                              {creator.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 캠페인 수 */}
                    <div className="text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${
                        creator.campaignCount >= 2
                          ? 'bg-[#F0EDFF] text-[#6C5CE7]'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {creator.campaignCount}회 참여
                      </span>
                    </div>

                    {/* 리전 */}
                    <div className="text-center">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {creator.region === 'korea' ? 'KR' :
                         creator.region === 'japan' ? 'JP' :
                         creator.region === 'us' ? 'US' : 'BIZ'}
                      </span>
                    </div>

                    {/* 채널 */}
                    <div className="flex items-center justify-center gap-1.5">
                      {creator.instagram_url && (
                        <a href={creator.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-600">
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {creator.youtube_url && (
                        <a href={creator.youtube_url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600">
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                      {!creator.instagram_url && !creator.youtube_url && (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </div>

                    {/* 발송 버튼 */}
                    <div className="text-center">
                      {sentCreators.has(creator.key) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          발송완료
                        </span>
                      ) : !creator.phone ? (
                        <span className="text-xs text-gray-300">번호없음</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSendModal(creator)}
                          disabled={sending[creator.key] || !supportBenefits.trim()}
                          className="text-xs h-7 px-2 border-[#6C5CE7] text-[#6C5CE7] hover:bg-[#F0EDFF]"
                        >
                          {sending[creator.key] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3 mr-1" />
                              발송
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-gray-500">
                    총 {filteredCreators.length}명 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}~{Math.min(currentPage * ITEMS_PER_PAGE, filteredCreators.length)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-gray-600 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 개별 발송 확인 모달 */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">알림톡 발송 확인</DialogTitle>
          </DialogHeader>
          {sendTarget && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">수신자</span>
                  <span className="font-medium">{sendTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">전화번호</span>
                  <span className="font-medium">{sendTarget.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">캠페인 참여</span>
                  <span className="font-medium text-[#6C5CE7]">{sendTarget.campaignCount}회</span>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-yellow-800 mb-2">지원혜택 미리보기</p>
                <p className="text-yellow-700 whitespace-pre-wrap text-xs">{supportBenefits}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSendModal(false)}
              className="text-sm"
            >
              취소
            </Button>
            <Button
              onClick={() => sendProposal(sendTarget)}
              disabled={sending[sendTarget?.key]}
              className="bg-[#6C5CE7] hover:bg-[#5A4BD6] text-white text-sm"
            >
              {sending[sendTarget?.key] ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              발송하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 발송 모달 */}
      <Dialog open={showBulkModal} onOpenChange={(open) => { if (!bulkSending) setShowBulkModal(open) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">일괄 알림톡 발송</DialogTitle>
          </DialogHeader>

          {bulkResults ? (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-green-800">발송 완료</p>
                <p className="text-green-700 mt-1">
                  성공: {bulkResults.success}건 / 실패: {bulkResults.fail}건
                </p>
              </div>
              {bulkResults.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 text-xs">
                  <p className="font-medium text-red-800 mb-2">실패 목록</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {bulkResults.errors.map((err, i) => (
                      <p key={i} className="text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => { setShowBulkModal(false); setBulkResults(null) }} className="text-sm">
                  확인
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="text-gray-700">
                  선택된 <span className="font-bold text-[#6C5CE7]">{selectedCreators.size}명</span>의 크리에이터에게
                  소속 제안 알림톡을 발송합니다.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  * 전화번호가 없거나 이미 발송된 크리에이터는 자동 제외됩니다.
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-yellow-800 mb-2">지원혜택 미리보기</p>
                <p className="text-yellow-700 whitespace-pre-wrap text-xs">{supportBenefits}</p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkModal(false)}
                  disabled={bulkSending}
                  className="text-sm"
                >
                  취소
                </Button>
                <Button
                  onClick={sendBulkProposals}
                  disabled={bulkSending}
                  className="bg-[#6C5CE7] hover:bg-[#5A4BD6] text-white text-sm"
                >
                  {bulkSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      발송 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      일괄 발송
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
