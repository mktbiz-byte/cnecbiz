import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Coins, Search, Download, ArrowUpCircle, ArrowDownCircle,
  RefreshCw, Calendar, User, Briefcase, X, Eye
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import * as XLSX from 'xlsx'

export default function CreatorPointHistory() {
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
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

  useEffect(() => {
    checkAuth()
    fetchTransactions()
  }, [])

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

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      let allTransactions = []

      // Korea DB에서 point_transactions 조회
      if (supabaseKorea) {
        const { data: koreaData, error: koreaError } = await supabaseKorea
          .from('point_transactions')
          .select('*')
          .in('transaction_type', ['admin_add', 'admin_deduct', 'campaign_reward', 'bonus', 'refund'])
          .order('created_at', { ascending: false })
          .limit(500)

        if (!koreaError && koreaData) {
          console.log('Korea DB point_transactions:', koreaData.length, '건')

          // 전체 user_profiles 조회
          const { data: allProfiles } = await supabaseKorea
            .from('user_profiles')
            .select('id, user_id, name, email, channel_name, phone')
            .limit(2000)

          // 프로필 맵 생성 (id와 user_id 모두 키로 사용)
          const profileMap = {}
          if (allProfiles) {
            allProfiles.forEach(p => {
              if (p.id) profileMap[p.id] = p
              if (p.user_id) profileMap[p.user_id] = p
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

            // description에서 크리에이터명 추출 시도
            let creatorName = profile?.channel_name || profile?.name
            if (!creatorName && t.description) {
              // [크리에이터: XXX] 패턴
              const nameMatch = t.description.match(/크리에이터[:\s]*([^\],]+)/i)
              if (nameMatch) {
                creatorName = nameMatch[1].trim()
              }
            }

            return {
              ...t,
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
      }

      // BIZ DB에서 creator_points 조회
      try {
        const { data: bizData, error: bizError } = await supabaseBiz
          .from('creator_points')
          .select('*, featured_creators(channel_name, name, email)')
          .order('created_at', { ascending: false })
          .limit(500)

        if (!bizError && bizData) {
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
        console.error('BIZ DB 조회 오류:', bizError)
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
        if (t.transaction_type === 'campaign_reward' || t.transaction_type === 'bonus') {
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
          t.transaction_type === 'bonus' ||
          t.related_campaign_id
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

  const filteredTransactions = getFilteredTransactions()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />

      <div className="lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">크리에이터 포인트 지급 내역</h1>
                <p className="text-gray-600">크리에이터에게 지급된 포인트 전체 내역을 확인합니다</p>
              </div>

              <div className="flex gap-2">
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
            </div>
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
        </div>
      </div>

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
