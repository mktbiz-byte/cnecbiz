import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, CheckCircle, XCircle, Clock, TrendingUp,
  Search, Filter, ChevronUp, ChevronDown, DollarSign, Download, FileText, AlertCircle
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { maskResidentNumber } from '../../lib/encryptionHelper'
import AdminNavigation from './AdminNavigation'

export default function WithdrawalManagement() {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('korea')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    korea: { pending: 0, approved: 0, completed: 0, rejected: 0 },
    japan: { pending: 0, approved: 0, completed: 0, rejected: 0 },
    us: { pending: 0, approved: 0, completed: 0, rejected: 0 }
  })

  // 선택된 출금 신청 (상세보기/처리)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [actionType, setActionType] = useState('') // 'approve', 'reject', 'complete'
  const [priority, setPriority] = useState(0)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    checkAuth()
    fetchWithdrawals()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [withdrawals])

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

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select(`
          *,
          featured_creators!creator_id (
            channel_name,
            email
          )
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      setWithdrawals(data || [])
    } catch (error) {
      console.error('출금 신청 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = () => {
    const newStats = {
      korea: { pending: 0, approved: 0, completed: 0, rejected: 0 },
      japan: { pending: 0, approved: 0, completed: 0, rejected: 0 },
      us: { pending: 0, approved: 0, completed: 0, rejected: 0 }
    }

    withdrawals.forEach(w => {
      if (newStats[w.region]) {
        if (w.status === 'pending') newStats[w.region].pending++
        else if (w.status === 'approved') newStats[w.region].approved++
        else if (w.status === 'completed') newStats[w.region].completed++
        else if (w.status === 'rejected') newStats[w.region].rejected++
      }
    })

    setStats(newStats)
  }

  const getFilteredWithdrawals = () => {
    let filtered = withdrawals.filter(w => w.region === selectedCountry && w.status === selectedStatus)

    if (searchTerm) {
      filtered = filtered.filter(w => {
        const creator = w.featured_creators
        return (
          creator?.channel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creator?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.account_holder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.paypal_email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    return filtered
  }

  const handleApprove = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setActionType('approve')
    setPriority(0)
    setAdminNotes('')
    setShowDetailModal(true)
  }

  const handleReject = async (withdrawal) => {
    setSelectedWithdrawal(withdrawal)
    setActionType('reject')
    setRejectionReason('')
    setShowDetailModal(true)
  }

  const handleComplete = async (withdrawal) => {
    if (!confirm('정말 지급 완료 처리하시겠습니까?')) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      
      const { error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed_by: user.id
        })
        .eq('id', withdrawal.id)

      if (error) throw error

      alert('지급 완료 처리되었습니다.')
      fetchWithdrawals()
    } catch (error) {
      console.error('완료 처리 오류:', error)
      alert('완료 처리 중 오류가 발생했습니다.')
    }
  }

  const handleSubmitAction = async () => {
    if (!selectedWithdrawal) return

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      if (actionType === 'approve') {
        const { error } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .update({
            status: 'approved',
            priority: priority,
            admin_notes: adminNotes,
            processed_by: user.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', selectedWithdrawal.id)

        if (error) throw error
        alert('승인되었습니다.')
      } else if (actionType === 'reject') {
        if (!rejectionReason) {
          alert('거절 사유를 입력해주세요.')
          return
        }

        const { error } = await supabaseBiz
          .from('creator_withdrawal_requests')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason,
            processed_by: user.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', selectedWithdrawal.id)

        if (error) throw error
        alert('거절되었습니다. 크리에이터는 거절 사유를 확인하고 재신청할 수 있습니다.')
      }

      setShowDetailModal(false)
      setSelectedWithdrawal(null)
      fetchWithdrawals()
    } catch (error) {
      console.error('처리 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: '대기중' },
      approved: { color: 'bg-blue-100 text-blue-700', label: '승인됨' },
      completed: { color: 'bg-green-100 text-green-700', label: '완료' },
      rejected: { color: 'bg-red-100 text-red-700', label: '거절' }
    }

    const badge = badges[status] || badges.pending

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getCountryLabel = (country) => {
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국'
    }
    return labels[country] || country
  }

  const filteredWithdrawals = getFilteredWithdrawals()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="lg:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">크리에이터 출금 관리</h1>
            <p className="text-gray-600">국가별, 상태별로 출금 신청을 관리합니다</p>
          </div>

          {/* 국가별 탭 */}
          <Tabs value={selectedCountry} onValueChange={setSelectedCountry} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="korea" className="text-lg">
                🇰🇷 한국
                <Badge className="ml-2 bg-yellow-500">{stats.korea.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="japan" className="text-lg">
                🇯🇵 일본
                <Badge className="ml-2 bg-yellow-500">{stats.japan.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="us" className="text-lg">
                🇺🇸 미국
                <Badge className="ml-2 bg-yellow-500">{stats.us.pending}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* 각 국가별 콘텐츠 */}
            {['korea', 'japan', 'us'].map(country => (
              <TabsContent key={country} value={country}>
                {/* 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('pending')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">대기중</p>
                          <p className="text-3xl font-bold text-yellow-600">{stats[country].pending}</p>
                        </div>
                        <Clock className="w-10 h-10 text-yellow-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('approved')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">승인됨</p>
                          <p className="text-3xl font-bold text-blue-600">{stats[country].approved}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-blue-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('completed')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">완료</p>
                          <p className="text-3xl font-bold text-green-600">{stats[country].completed}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-green-300" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('rejected')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">거절</p>
                          <p className="text-3xl font-bold text-red-600">{stats[country].rejected}</p>
                        </div>
                        <XCircle className="w-10 h-10 text-red-300" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 상태별 탭 */}
                <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="pending">
                      대기중 ({stats[country].pending})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      승인됨 ({stats[country].approved})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      완료 ({stats[country].completed})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                      거절 ({stats[country].rejected})
                    </TabsTrigger>
                  </TabsList>

                  {/* 검색 */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="크리에이터명, 이메일, 계좌정보로 검색..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* 출금 신청 목록 */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>
                          {getCountryLabel(country)} - {getStatusBadge(selectedStatus).props.children} ({filteredWithdrawals.length}건)
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="text-center py-12 text-gray-500">로딩 중...</div>
                      ) : filteredWithdrawals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          출금 신청이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {filteredWithdrawals.map((withdrawal) => (
                            <div
                              key={withdrawal.id}
                              className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-lg font-bold">
                                    {withdrawal.featured_creators?.channel_name || 'Unknown'}
                                  </h3>
                                  {getStatusBadge(withdrawal.status)}
                                  {withdrawal.priority > 0 && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                      우선순위: {withdrawal.priority}
                                    </Badge>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                  <div>
                                    <span className="font-medium">신청 포인트:</span> {withdrawal.requested_points.toLocaleString()}P
                                  </div>
                                  <div>
                                    <span className="font-medium">지급액:</span> {withdrawal.final_amount?.toLocaleString()} {withdrawal.currency}
                                  </div>
                                  <div>
                                    <span className="font-medium">신청일:</span> {new Date(withdrawal.created_at).toLocaleDateString('ko-KR')}
                                  </div>
                                  {withdrawal.region === 'korea' ? (
                                    <div>
                                      <span className="font-medium">계좌:</span> {withdrawal.bank_name} {withdrawal.account_number}
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-medium">PayPal:</span> {withdrawal.paypal_email}
                                    </div>
                                  )}
                                </div>

                                {withdrawal.admin_notes && (
                                  <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg mb-2">
                                    <span className="font-medium">관리자 메모:</span> {withdrawal.admin_notes}
                                  </div>
                                )}

                                {withdrawal.rejection_reason && (
                                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium">거절 사유:</span> {withdrawal.rejection_reason}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {withdrawal.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApprove(withdrawal)}
                                      className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      승인
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReject(withdrawal)}
                                      className="bg-red-50 text-red-600 hover:bg-red-100"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      거절
                                    </Button>
                                  </>
                                )}
                                {withdrawal.status === 'approved' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleComplete(withdrawal)}
                                    className="bg-green-50 text-green-600 hover:bg-green-100"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    지급완료
                                  </Button>
                                )}
                                {withdrawal.status === 'rejected' && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                    재신청 대기중
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* 승인/거절 모달 */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold">
                {actionType === 'approve' ? '출금 승인' : '출금 거절'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2">{selectedWithdrawal.featured_creators?.channel_name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>신청 포인트: {selectedWithdrawal.requested_points.toLocaleString()}P</div>
                  <div>지급액: {selectedWithdrawal.final_amount?.toLocaleString()} {selectedWithdrawal.currency}</div>
                </div>
              </div>

              {actionType === 'approve' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      우선순위 (0-10, 높을수록 우선)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      관리자 메모 (선택사항)
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="내부 메모를 입력하세요..."
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거절 사유 (필수) *
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="크리에이터에게 전달될 거절 사유를 입력하세요. 크리에이터는 이 사유를 확인하고 재신청할 수 있습니다."
                    rows={4}
                    className="border-red-200 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    * 거절된 신청은 크리에이터가 사유를 확인하고 수정하여 재신청할 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedWithdrawal(null)
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleSubmitAction}
                className={actionType === 'approve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {actionType === 'approve' ? '승인하기' : '거절하기'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

