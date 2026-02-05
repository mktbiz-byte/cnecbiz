import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Coins, Search, Download, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Calendar, User, Briefcase, X, Eye, AlertTriangle,
  CheckCircle, XCircle, Play, Loader2, ExternalLink
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

export default function CreatorPointHistory() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('history')
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dateFilter, setDateFilter] = useState('month') // 기본값: 최근 1개월
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalDeducted: 0,
    campaignRewards: 0,
    adminAdd: 0
  })

  // 크리에이터 상세 모달
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [creatorTransactions, setCreatorTransactions] = useState([])
  const [showCreatorModal, setShowCreatorModal] = useState(false)

  // 미지급 건 체크 관련
  const [unpaidItems, setUnpaidItems] = useState([])
  const [unpaidSummary, setUnpaidSummary] = useState(null)
  const [loadingUnpaid, setLoadingUnpaid] = useState(false)
  const [selectedUnpaid, setSelectedUnpaid] = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [paying, setPaying] = useState(false)
  const [regionFilter, setRegionFilter] = useState('all') // all, korea, japan, us

  useEffect(() => {
    checkAuth()
    fetchTransactions()
  }, [dateFilter])

  useEffect(() => {
    calculateStats()
  }, [transactions])

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

  // 날짜 필터 시작일 계산
  const getDateFilterStart = () => {
    const now = new Date()
    if (dateFilter === 'today') {
      return new Date(now.setHours(0, 0, 0, 0)).toISOString()
    } else if (dateFilter === 'week') {
      return new Date(now.setDate(now.getDate() - 7)).toISOString()
    } else if (dateFilter === 'month') {
      return new Date(now.setMonth(now.getMonth() - 1)).toISOString()
    } else if (dateFilter === '3months') {
      return new Date(now.setMonth(now.getMonth() - 3)).toISOString()
    }
    return null // 'all'인 경우
  }

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      let allTransactions = []
      const dateStart = getDateFilterStart()

      // Korea DB에서 point_transactions 조회
      if (supabaseKorea) {
        // point_transactions 테이블의 실제 필드는 'type' (earn, withdraw, bonus, adjustment 등)
        let query = supabaseKorea
          .from('point_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500)

        if (dateStart) {
          query = query.gte('created_at', dateStart)
        }

        const { data: koreaData, error: koreaError } = await query

        if (!koreaError && koreaData) {
          console.log('Korea DB point_transactions:', koreaData.length, '건')

          // 전체 user_profiles 조회 (* 로 전체 컬럼 조회 - 다른 DB 스키마 대응)
          const { data: allProfiles } = await supabaseKorea
            .from('user_profiles')
            .select('*')
            .limit(2000)

          // 프로필 맵 생성 (id를 키로 사용 - Korea DB에는 user_id 컬럼 없음)
          const profileMap = {}
          if (allProfiles) {
            allProfiles.forEach(p => {
              const normalizedProfile = {
                id: p.id,
                name: p.name || p.creator_name || p.channel_name || p.full_name || null,
                channel_name: p.channel_name || p.name || p.creator_name || null,
                email: p.email || null,
                phone: p.phone || p.phone_number || null
              }
              if (p.id) profileMap[p.id] = normalizedProfile
            })
            console.log('프로필 맵 생성:', Object.keys(profileMap).length, '개 키')
          }

          // 샘플 user_id 출력
          const sampleUserIds = koreaData.slice(0, 3).map(t => t.user_id)
          console.log('샘플 point_transactions user_id:', sampleUserIds)

          // 캠페인 정보 조회
          const campaignIds = [...new Set(koreaData.map(t => t.related_campaign_id).filter(Boolean))]
          let campaignMap = {}

          if (campaignIds.length > 0) {
            const { data: campaignData } = await supabaseKorea
              .from('campaigns')
              .select('id, title')
              .in('id', campaignIds)

            if (campaignData) {
              campaignData.forEach(c => campaignMap[c.id] = c)
            }
          }

          const koreaTransactions = koreaData.map(t => {
            const profile = profileMap[t.user_id]
            const campaign = campaignMap[t.related_campaign_id]

            // description에서 크리에이터명 추출 시도 (실제 이름 우선)
            let creatorName = profile?.name || profile?.channel_name
            if (!creatorName && t.description) {
              // [크리에이터: XXX] 패턴
              const nameMatch = t.description.match(/크리에이터[:\s]*([^\],]+)/i)
              if (nameMatch) {
                creatorName = nameMatch[1].trim()
              }
            }

            // type 필드를 transaction_type으로 매핑 (캠페인 완료인 경우 description에서 판단)
            let transactionType = t.type || t.transaction_type || 'earn'
            if (t.description?.includes('캠페인 완료') || t.description?.includes('캠페인 보상')) {
              transactionType = 'campaign_reward'
            }

            return {
              ...t,
              transaction_type: transactionType,
              creator_name: creatorName || t.user_id?.substring(0, 8) + '...',
              creator_email: profile?.email || '',
              creator_phone: profile?.phone || '',
              campaign_title: campaign?.title || null,
              source_db: 'korea',
              profile: profile
            }
          })

          allTransactions = [...allTransactions, ...koreaTransactions]
        }

        // point_history 테이블은 Korea DB에 존재하지 않으므로 조회하지 않음
        // 포인트 지급 기록은 point_transactions 테이블에서 조회됨
      }

      // BIZ DB에서 creator_points 조회 (테이블이 없을 수 있음)
      try {
        let bizQuery = supabaseBiz
          .from('creator_points')
          .select('*, featured_creators(channel_name, name, email)')
          .order('created_at', { ascending: false })
          .limit(500)

        if (dateStart) {
          bizQuery = bizQuery.gte('created_at', dateStart)
        }

        const { data: bizData, error: bizError } = await bizQuery

        if (!bizError && bizData && bizData.length > 0) {
          const bizTransactions = bizData.map(t => ({
            id: t.id,
            user_id: t.creator_id,
            amount: t.amount,
            transaction_type: t.type || 'campaign_reward',
            description: t.description || t.reason,
            related_campaign_id: t.campaign_id,
            created_at: t.created_at,
            creator_name: t.featured_creators?.channel_name || t.featured_creators?.name || t.creator_id?.substring(0, 8) + '...',
            creator_email: t.featured_creators?.email || '',
            campaign_title: null,
            source_db: 'biz'
          }))

          allTransactions = [...allTransactions, ...bizTransactions]
        }
      } catch (bizError) {
        // BIZ DB에 creator_points 테이블이 없을 수 있음 - 무시
        console.log('BIZ DB creator_points 조회 스킵 (테이블 없을 수 있음)')
      }

      // 완료된 캠페인 신청에서 포인트 지급 내역 조회 (point_history에 저장되지 않은 경우 대비)
      if (supabaseKorea) {
        try {
          // 먼저 completed 상태의 applications 조회
          let appQuery = supabaseKorea
            .from('applications')
            .select('id, user_id, campaign_id, status, updated_at, created_at')
            .eq('status', 'completed')
            .order('updated_at', { ascending: false })
            .limit(500)

          if (dateStart) {
            appQuery = appQuery.gte('updated_at', dateStart)
          }

          const { data: completedApps, error: appError } = await appQuery

          if (appError) {
            console.log('applications 조회 에러:', appError.message)
          }

          if (!appError && completedApps && completedApps.length > 0) {
            console.log('완료된 캠페인 신청:', completedApps.length, '건')

            // 캠페인 정보 별도 조회 (조인 대신)
            const campaignIds = [...new Set(completedApps.map(a => a.campaign_id).filter(Boolean))]
            let campaignMap = {}
            if (campaignIds.length > 0) {
              const { data: campaigns } = await supabaseKorea
                .from('campaigns')
                .select('id, title, reward_points')
                .in('id', campaignIds)
              if (campaigns) {
                campaigns.forEach(c => { campaignMap[c.id] = c })
              }
            }

            // 이미 추가된 트랜잭션의 campaign_id + user_id 조합 체크 (중복 방지)
            const existingKeys = new Set(
              allTransactions
                .filter(t => t.related_campaign_id || t.campaign_id)
                .map(t => `${t.related_campaign_id || t.campaign_id}_${t.user_id}`)
            )

            // 프로필 정보 조회
            const userIds = [...new Set(completedApps.map(a => a.user_id).filter(Boolean))]
            let profileMap = {}
            if (userIds.length > 0) {
              const { data: profiles } = await supabaseKorea
                .from('user_profiles')
                .select('id, name, channel_name, email, phone')
                .in('id', userIds)
              if (profiles) {
                profiles.forEach(p => { profileMap[p.id] = p })
              }
            }

            const appTransactions = completedApps
              .filter(app => {
                // 중복 체크
                const key = `${app.campaign_id}_${app.user_id}`
                return !existingKeys.has(key)
              })
              .map(app => {
                const profile = profileMap[app.user_id]
                const campaign = campaignMap[app.campaign_id]
                const pointAmount = campaign?.reward_points || 0
                return {
                  id: `app_${app.id}`,
                  user_id: app.user_id,
                  amount: pointAmount,
                  transaction_type: 'campaign_reward',
                  description: `캠페인 완료: ${campaign?.title || ''}`,
                  related_campaign_id: app.campaign_id,
                  created_at: app.updated_at || app.created_at,
                  creator_name: profile?.name || profile?.channel_name || app.user_id?.substring(0, 8) + '...',
                  creator_email: profile?.email || '',
                  creator_phone: profile?.phone || '',
                  campaign_title: campaign?.title || null,
                  source_db: 'korea_applications'
                }
              })
              .filter(t => t.amount > 0) // 포인트가 있는 것만

            console.log('캠페인 완료 포인트 지급 (applications 기반):', appTransactions.length, '건')
            allTransactions = [...allTransactions, ...appTransactions]
          }
        } catch (appError) {
          console.log('완료된 캠페인 신청 조회 스킵:', appError.message)
        }
      }

      // 날짜순 정렬
      allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setTransactions(allTransactions)
    } catch (error) {
      console.error('포인트 내역 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    let totalPaid = 0
    let totalDeducted = 0
    let campaignRewards = 0
    let adminAdd = 0

    transactions.forEach(t => {
      const amount = Math.abs(t.amount || 0)
      if (t.amount > 0) {
        totalPaid += amount
        // 캠페인 보상: campaign_reward, campaign_complete, campaign_payment, bonus 타입이거나 description에 캠페인 관련 내용이 있는 경우
        if (t.transaction_type === 'campaign_reward' ||
            t.transaction_type === 'campaign_complete' ||
            t.transaction_type === 'campaign_payment' ||
            t.transaction_type === 'bonus' ||
            t.description?.includes('캠페인')) {
          campaignRewards += amount
        } else if (t.transaction_type === 'admin_add') {
          adminAdd += amount
        }
      } else {
        totalDeducted += amount
      }
    })

    setStats({ totalPaid, totalDeducted, campaignRewards, adminAdd })
  }

  const getFilteredTransactions = () => {
    let filtered = transactions

    if (filterType !== 'all') {
      if (filterType === 'add') {
        filtered = filtered.filter(t => t.amount > 0)
      } else if (filterType === 'deduct') {
        filtered = filtered.filter(t => t.amount < 0)
      } else if (filterType === 'campaign') {
        filtered = filtered.filter(t =>
          t.transaction_type === 'campaign_reward' ||
          t.transaction_type === 'campaign_complete' ||
          t.transaction_type === 'campaign_payment' ||
          t.transaction_type === 'bonus' ||
          t.related_campaign_id ||
          t.campaign_id ||
          t.description?.includes('캠페인')
        )
      }
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.creator_name?.toLowerCase().includes(search) ||
        t.creator_email?.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search) ||
        t.campaign_title?.toLowerCase().includes(search) ||
        t.user_id?.toLowerCase().includes(search)
      )
    }

    return filtered
  }

  const getTransactionTypeBadge = (type, amount) => {
    if (amount < 0) {
      return (
        <Badge className="bg-red-100 text-red-700">
          <ArrowDownCircle className="w-3 h-3 mr-1" />
          차감
        </Badge>
      )
    }

    const types = {
      'admin_add': { color: 'bg-blue-100 text-blue-700', label: '관리자 지급' },
      'campaign_reward': { color: 'bg-green-100 text-green-700', label: '캠페인 보상' },
      'campaign_complete': { color: 'bg-green-100 text-green-700', label: '캠페인 완료' },
      'campaign_payment': { color: 'bg-teal-100 text-teal-700', label: '캠페인 지급' },
      'earn': { color: 'bg-emerald-100 text-emerald-700', label: '포인트 적립' },
      'bonus': { color: 'bg-purple-100 text-purple-700', label: '보너스' },
      'refund': { color: 'bg-orange-100 text-orange-700', label: '환불' },
    }

    const badge = types[type] || { color: 'bg-gray-100 text-gray-700', label: type }

    return (
      <Badge className={badge.color}>
        <ArrowUpCircle className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    )
  }

  // 크리에이터 클릭 시 해당 크리에이터의 전체 내역 표시
  const handleCreatorClick = (transaction) => {
    const userId = transaction.user_id
    if (!userId) return

    // 같은 user_id를 가진 모든 트랜잭션 필터링
    const creatorTxs = transactions.filter(t => t.user_id === userId)

    // 총계 계산
    const totalReceived = creatorTxs.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const totalDeducted = creatorTxs.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

    setSelectedCreator({
      user_id: userId,
      name: transaction.creator_name,
      email: transaction.creator_email,
      phone: transaction.creator_phone,
      profile: transaction.profile,
      totalReceived,
      totalDeducted,
      balance: totalReceived - totalDeducted,
      transactionCount: creatorTxs.length
    })
    setCreatorTransactions(creatorTxs)
    setShowCreatorModal(true)
  }

  // 엑셀 다운로드
  const handleDownloadExcel = () => {
    const filtered = getFilteredTransactions()

    if (filtered.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }

    const excelData = filtered.map(t => ({
      '날짜': new Date(t.created_at).toLocaleDateString('ko-KR'),
      '시간': new Date(t.created_at).toLocaleTimeString('ko-KR'),
      '크리에이터': t.creator_name,
      '이메일': t.creator_email,
      'User ID': t.user_id,
      '유형': t.amount > 0 ? '지급' : '차감',
      '포인트': t.amount,
      '사유': t.description || '',
      '캠페인': t.campaign_title || '',
      'DB': t.source_db === 'korea' ? '한국' : 'BIZ'
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 36 },
      { wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 8 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, '포인트지급내역')

    const today = new Date()
    const fileName = `크리에이터_포인트지급내역_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`

    XLSX.writeFile(wb, fileName)
    alert(`${filtered.length}건의 데이터가 다운로드되었습니다.`)
  }

  // 미지급 건 조회
  const fetchUnpaidItems = async () => {
    setLoadingUnpaid(true)
    try {
      const response = await fetch('/.netlify/functions/check-unpaid-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_unpaid' })
      })

      const result = await response.json()
      if (result.success) {
        setUnpaidItems(result.unpaidItems || [])
        setUnpaidSummary(result.summary)
      } else {
        alert(`조회 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('미지급 건 조회 오류:', error)
      alert(`조회 오류: ${error.message}`)
    } finally {
      setLoadingUnpaid(false)
    }
  }

  // 수동 포인트 지급
  const handleManualPay = async () => {
    if (!selectedUnpaid) return

    const regionName = selectedUnpaid.region === 'korea' ? '한국' :
                       selectedUnpaid.region === 'japan' ? '일본' :
                       selectedUnpaid.region === 'us' ? '미국' : selectedUnpaid.regionName

    if (!confirm(`[${regionName}] ${selectedUnpaid.creator_name}님에게 ${selectedUnpaid.reward_points.toLocaleString()}P를 지급하시겠습니까?`)) {
      return
    }

    setPaying(true)
    try {
      const response = await fetch('/.netlify/functions/check-unpaid-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_pay',
          videoId: selectedUnpaid.id,
          userId: selectedUnpaid.user_id,
          campaignId: selectedUnpaid.campaign_id,
          amount: selectedUnpaid.reward_points,
          reason: `수동 지급 - ${selectedUnpaid.campaign_title}`,
          region: selectedUnpaid.region || 'korea' // 리전 정보 전달
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(result.message)
        setShowPayModal(false)
        setSelectedUnpaid(null)
        // 목록 새로고침
        fetchUnpaidItems()
      } else {
        alert(`지급 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('포인트 지급 오류:', error)
      alert(`지급 오류: ${error.message}`)
    } finally {
      setPaying(false)
    }
  }

  // 미지급 사유별 배지 색상
  const getReasonBadge = (reason) => {
    if (reason?.includes('멀티비디오')) {
      return <Badge className="bg-yellow-100 text-yellow-800">멀티비디오 미완성</Badge>
    }
    if (reason?.includes('보상 포인트')) {
      return <Badge className="bg-red-100 text-red-800">보상 미설정</Badge>
    }
    if (reason?.includes('프로필')) {
      return <Badge className="bg-orange-100 text-orange-800">프로필 없음</Badge>
    }
    if (reason?.includes('캠페인 정보')) {
      return <Badge className="bg-gray-100 text-gray-800">캠페인 없음</Badge>
    }
    return <Badge className="bg-purple-100 text-purple-800">확인 필요</Badge>
  }

  const filteredTransactions = getFilteredTransactions()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">크리에이터 포인트 관리</h1>
                <p className="text-gray-600">포인트 지급 내역 및 미지급 건을 확인합니다</p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                지급 내역
              </TabsTrigger>
              <TabsTrigger value="unpaid" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                미지급 체크
                {unpaidItems.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white">{unpaidItems.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 지급 내역 탭 */}
            <TabsContent value="history">
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={fetchTransactions}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadExcel}
                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">총 지급 포인트</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.totalPaid.toLocaleString()}P
                    </p>
                  </div>
                  <ArrowUpCircle className="w-10 h-10 text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">캠페인 보상</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.campaignRewards.toLocaleString()}P
                    </p>
                  </div>
                  <Briefcase className="w-10 h-10 text-blue-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">관리자 지급</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.adminAdd.toLocaleString()}P
                    </p>
                  </div>
                  <Coins className="w-10 h-10 text-purple-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">총 차감 포인트</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.totalDeducted.toLocaleString()}P
                    </p>
                  </div>
                  <ArrowDownCircle className="w-10 h-10 text-red-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 검색 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                {/* 날짜 필터 */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-500 mr-2">기간:</span>
                  <Button
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('today')}
                  >
                    오늘
                  </Button>
                  <Button
                    variant={dateFilter === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('week')}
                  >
                    1주일
                  </Button>
                  <Button
                    variant={dateFilter === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('month')}
                  >
                    1개월
                  </Button>
                  <Button
                    variant={dateFilter === '3months' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('3months')}
                  >
                    3개월
                  </Button>
                  <Button
                    variant={dateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter('all')}
                  >
                    전체
                  </Button>
                </div>

                {/* 검색 및 유형 필터 */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="크리에이터명, 이메일, 사유, 캠페인명, User ID로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('all')}
                    >
                      전체
                    </Button>
                    <Button
                      variant={filterType === 'add' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('add')}
                      className={filterType === 'add' ? '' : 'text-green-600 border-green-300'}
                    >
                      지급
                    </Button>
                    <Button
                      variant={filterType === 'deduct' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('deduct')}
                      className={filterType === 'deduct' ? '' : 'text-red-600 border-red-300'}
                    >
                      차감
                    </Button>
                    <Button
                      variant={filterType === 'campaign' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType('campaign')}
                      className={filterType === 'campaign' ? '' : 'text-blue-600 border-blue-300'}
                    >
                      캠페인
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 내역 목록 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                포인트 지급 내역 ({filteredTransactions.length}건)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">로딩 중...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  포인트 지급 내역이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 테이블 헤더 */}
                  <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                    <div className="col-span-2">날짜</div>
                    <div className="col-span-3">크리에이터 / User ID</div>
                    <div className="col-span-2">유형</div>
                    <div className="col-span-2 text-right">포인트</div>
                    <div className="col-span-2">사유</div>
                    <div className="col-span-1">상세</div>
                  </div>

                  {filteredTransactions.map((transaction) => (
                    <div
                      key={`${transaction.source_db}-${transaction.id}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      {/* 날짜 */}
                      <div className="col-span-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 hidden md:block" />
                        <div>
                          <div className="text-sm font-medium">
                            {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* 크리에이터 */}
                      <div className="col-span-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 hidden md:block" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {transaction.creator_name}
                          </div>
                          <div className="text-xs text-gray-400 font-mono truncate">
                            {transaction.user_id?.substring(0, 12)}...
                          </div>
                        </div>
                      </div>

                      {/* 유형 */}
                      <div className="col-span-2 flex items-center">
                        {getTransactionTypeBadge(transaction.transaction_type, transaction.amount)}
                      </div>

                      {/* 포인트 */}
                      <div className="col-span-2 flex items-center justify-end">
                        <span className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}P
                        </span>
                      </div>

                      {/* 사유 */}
                      <div className="col-span-2">
                        <div className="text-sm text-gray-700 line-clamp-2">
                          {transaction.description || '-'}
                        </div>
                      </div>

                      {/* 상세 버튼 */}
                      <div className="col-span-1 flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreatorClick(transaction)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>

            {/* 미지급 체크 탭 */}
            <TabsContent value="unpaid">
              <div className="space-y-6">
                {/* 헤더 및 새로고침 */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">미지급 건 체크</h2>
                    <p className="text-sm text-gray-500">승인 후 5일 이상 경과했지만 포인트가 지급되지 않은 건을 확인합니다</p>
                  </div>
                  <Button
                    onClick={fetchUnpaidItems}
                    disabled={loadingUnpaid}
                  >
                    {loadingUnpaid ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    미지급 건 조회
                  </Button>
                </div>

                {/* 요약 카드 */}
                {unpaidSummary && (
                  <div className="space-y-4">
                    {/* 리전별 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className={`cursor-pointer ${regionFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setRegionFilter('all')}>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-red-600">{unpaidSummary.total}</p>
                          <p className="text-xs text-gray-500">전체 미지급</p>
                        </CardContent>
                      </Card>
                      <Card className={`cursor-pointer ${regionFilter === 'korea' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setRegionFilter('korea')}>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg mb-1">🇰🇷</div>
                          <p className="text-2xl font-bold text-blue-600">{unpaidSummary.byRegion?.korea || 0}</p>
                          <p className="text-xs text-gray-500">한국</p>
                        </CardContent>
                      </Card>
                      <Card className={`cursor-pointer ${regionFilter === 'japan' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setRegionFilter('japan')}>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg mb-1">🇯🇵</div>
                          <p className="text-2xl font-bold text-red-500">{unpaidSummary.byRegion?.japan || 0}</p>
                          <p className="text-xs text-gray-500">일본</p>
                        </CardContent>
                      </Card>
                      <Card className={`cursor-pointer ${regionFilter === 'us' ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setRegionFilter('us')}>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg mb-1">🇺🇸</div>
                          <p className="text-2xl font-bold text-indigo-600">{unpaidSummary.byRegion?.us || 0}</p>
                          <p className="text-xs text-gray-500">미국</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 사유별 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-yellow-600">{unpaidSummary.multiVideoIncomplete}</p>
                          <p className="text-xs text-gray-500">멀티비디오 미완성</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-red-500">{unpaidSummary.noRewardPoints}</p>
                          <p className="text-xs text-gray-500">보상 미설정</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-orange-500">{unpaidSummary.noProfile}</p>
                          <p className="text-xs text-gray-500">프로필 없음</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-gray-500">{unpaidSummary.noCampaign}</p>
                          <p className="text-xs text-gray-500">캠페인 없음</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold text-purple-500">{unpaidSummary.unknown}</p>
                          <p className="text-xs text-gray-500">원인 불명</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* 미지급 목록 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      미지급 건 목록 ({unpaidItems.length}건)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingUnpaid ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">조회 중...</p>
                      </div>
                    ) : unpaidItems.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                        <p>미지급 건이 없거나 조회되지 않았습니다.</p>
                        <p className="text-sm mt-2">상단의 "미지급 건 조회" 버튼을 클릭해주세요.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 테이블 헤더 */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                          <div className="col-span-1">리전</div>
                          <div className="col-span-2">승인일</div>
                          <div className="col-span-2">크리에이터</div>
                          <div className="col-span-2">캠페인</div>
                          <div className="col-span-2">미지급 사유</div>
                          <div className="col-span-1 text-right">보상</div>
                          <div className="col-span-2 text-center">작업</div>
                        </div>

                        {unpaidItems
                          .filter(item => regionFilter === 'all' || item.region === regionFilter)
                          .map((item) => (
                          <div
                            key={`${item.type}-${item.id}-${item.region}`}
                            className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200"
                          >
                            {/* 리전 */}
                            <div className="col-span-1">
                              <Badge variant="outline" className={
                                item.region === 'korea' ? 'bg-blue-50 text-blue-700' :
                                item.region === 'japan' ? 'bg-red-50 text-red-700' :
                                item.region === 'us' ? 'bg-indigo-50 text-indigo-700' : ''
                              }>
                                {item.region === 'korea' ? '🇰🇷 한국' :
                                 item.region === 'japan' ? '🇯🇵 일본' :
                                 item.region === 'us' ? '🇺🇸 미국' : item.regionName || '-'}
                              </Badge>
                            </div>

                            {/* 승인일 */}
                            <div className="col-span-2">
                              <div className="text-sm font-medium">
                                {item.approved_at
                                  ? new Date(item.approved_at).toLocaleDateString('ko-KR')
                                  : item.completed_at
                                  ? new Date(item.completed_at).toLocaleDateString('ko-KR')
                                  : '-'
                                }
                              </div>
                              {item.days_since_approval > 0 && (
                                <div className="text-xs text-red-500">
                                  {item.days_since_approval}일 경과
                                </div>
                              )}
                            </div>

                            {/* 크리에이터 */}
                            <div className="col-span-2">
                              <div className="text-sm font-medium truncate">{item.creator_name}</div>
                              <div className="text-xs text-gray-400 truncate">{item.creator_email || '-'}</div>
                            </div>

                            {/* 캠페인 */}
                            <div className="col-span-2">
                              <div className="text-sm truncate">{item.campaign_title}</div>
                              {item.is_multi_video && (
                                <div className="text-xs text-blue-500">
                                  멀티비디오 ({item.completed_count}/{item.required_count}개)
                                </div>
                              )}
                              {item.video_url && (
                                <a
                                  href={item.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> 영상 보기
                                </a>
                              )}
                            </div>

                            {/* 미지급 사유 */}
                            <div className="col-span-2">
                              {getReasonBadge(item.reason)}
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{item.reason}</div>
                            </div>

                            {/* 보상 포인트 */}
                            <div className="col-span-1 text-right">
                              <span className="text-lg font-bold text-green-600">
                                {item.reward_points > 0 ? `${item.reward_points.toLocaleString()}P` : '-'}
                              </span>
                            </div>

                            {/* 작업 버튼 */}
                            <div className="col-span-2 flex items-center justify-center gap-2">
                              {item.reward_points > 0 && !item.reason?.includes('멀티비디오') && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUnpaid(item)
                                    setShowPayModal(true)
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  지급
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUnpaid(item)
                                  setShowPayModal(true)
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                상세
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 수동 지급 모달 */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-600" />
              미지급 건 상세
            </DialogTitle>
            <DialogDescription>
              미지급 사유를 확인하고 필요 시 수동으로 포인트를 지급합니다.
            </DialogDescription>
          </DialogHeader>

          {selectedUnpaid && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">리전:</span></div>
                  <div>
                    <Badge variant="outline" className={
                      selectedUnpaid.region === 'korea' ? 'bg-blue-50 text-blue-700' :
                      selectedUnpaid.region === 'japan' ? 'bg-red-50 text-red-700' :
                      selectedUnpaid.region === 'us' ? 'bg-indigo-50 text-indigo-700' : ''
                    }>
                      {selectedUnpaid.region === 'korea' ? '🇰🇷 한국' :
                       selectedUnpaid.region === 'japan' ? '🇯🇵 일본' :
                       selectedUnpaid.region === 'us' ? '🇺🇸 미국' : selectedUnpaid.regionName || '-'}
                    </Badge>
                  </div>

                  <div><span className="text-gray-500">크리에이터:</span></div>
                  <div className="font-medium">{selectedUnpaid.creator_name}</div>

                  <div><span className="text-gray-500">이메일:</span></div>
                  <div>{selectedUnpaid.creator_email || '-'}</div>

                  <div><span className="text-gray-500">캠페인:</span></div>
                  <div className="truncate">{selectedUnpaid.campaign_title}</div>

                  <div><span className="text-gray-500">승인일:</span></div>
                  <div>
                    {selectedUnpaid.approved_at
                      ? new Date(selectedUnpaid.approved_at).toLocaleDateString('ko-KR')
                      : '-'}
                    {selectedUnpaid.days_since_approval > 0 && (
                      <span className="text-red-500 ml-2">({selectedUnpaid.days_since_approval}일 경과)</span>
                    )}
                  </div>

                  <div><span className="text-gray-500">보상 포인트:</span></div>
                  <div className="font-bold text-green-600">
                    {selectedUnpaid.reward_points > 0
                      ? `${selectedUnpaid.reward_points.toLocaleString()}P`
                      : '미설정'}
                  </div>

                  <div><span className="text-gray-500">현재 잔액:</span></div>
                  <div>{(selectedUnpaid.current_points || 0).toLocaleString()}P</div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">미지급 사유</h4>
                <p className="text-sm text-yellow-700">{selectedUnpaid.reason}</p>
              </div>

              {selectedUnpaid.is_multi_video && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">멀티비디오 캠페인</h4>
                  <p className="text-sm text-blue-700">
                    필요 영상: {selectedUnpaid.required_count}개 / 완료: {selectedUnpaid.completed_count}개
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    모든 영상이 승인되면 자동으로 포인트가 지급됩니다.
                  </p>
                </div>
              )}

              {selectedUnpaid.video_url && (
                <a
                  href={selectedUnpaid.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4 inline mr-1" />
                  영상 확인하기
                </a>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>
              닫기
            </Button>
            {selectedUnpaid?.reward_points > 0 && (
              <Button
                onClick={handleManualPay}
                disabled={paying}
                className="bg-green-600 hover:bg-green-700"
              >
                {paying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {selectedUnpaid?.reward_points?.toLocaleString()}P 지급하기
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 크리에이터 상세 모달 */}
      <Dialog open={showCreatorModal} onOpenChange={setShowCreatorModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              크리에이터 포인트 상세
            </DialogTitle>
          </DialogHeader>

          {selectedCreator && (
            <div className="space-y-6">
              {/* 크리에이터 정보 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">크리에이터 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">이름:</span>
                    <span className="ml-2 font-medium">{selectedCreator.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">이메일:</span>
                    <span className="ml-2">{selectedCreator.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">연락처:</span>
                    <span className="ml-2">{selectedCreator.phone || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">User ID:</span>
                    <span className="ml-2 font-mono text-xs">{selectedCreator.user_id}</span>
                  </div>
                </div>
              </div>

              {/* 포인트 요약 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600 mb-1">총 받은 포인트</p>
                  <p className="text-xl font-bold text-green-700">
                    +{selectedCreator.totalReceived.toLocaleString()}P
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600 mb-1">총 차감 포인트</p>
                  <p className="text-xl font-bold text-red-700">
                    -{selectedCreator.totalDeducted.toLocaleString()}P
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-blue-600 mb-1">순 지급액</p>
                  <p className="text-xl font-bold text-blue-700">
                    {selectedCreator.balance.toLocaleString()}P
                  </p>
                </div>
              </div>

              {/* 거래 내역 */}
              <div>
                <h3 className="font-semibold mb-3">
                  포인트 내역 ({creatorTransactions.length}건)
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {creatorTransactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-gray-500">
                          {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        {getTransactionTypeBadge(tx.transaction_type, tx.amount)}
                        <div className="text-gray-700 truncate max-w-[200px]">
                          {tx.description || '-'}
                        </div>
                      </div>
                      <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}P
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
