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
  Search, Filter, ChevronUp, ChevronDown, DollarSign
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function WithdrawalManagement() {
  const navigate = useNavigate()
  const [withdrawals, setWithdrawals] = useState([])
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    completed: 0,
    totalAmount: 0
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
    filterWithdrawals()
  }, [withdrawals, searchTerm, selectedStatus, selectedRegion, selectedMonth])

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
      .eq('user_id', user.id)
      .single()

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

      // 통계 계산
      const pending = data.filter(w => w.status === 'pending').length
      const approved = data.filter(w => w.status === 'approved').length
      const completed = data.filter(w => w.status === 'completed').length
      const totalAmount = data
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + (w.final_amount || 0), 0)

      setStats({ pending, approved, completed, totalAmount })
    } catch (error) {
      console.error('출금 신청 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterWithdrawals = () => {
    let filtered = withdrawals

    // 상태 필터
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(w => w.status === selectedStatus)
    }

    // 지역 필터
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(w => w.region === selectedRegion)
    }

    // 월별 필터
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(w => {
        const month = new Date(w.created_at).toISOString().slice(0, 7)
        return month === selectedMonth
      })
    }

    // 검색
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

    setFilteredWithdrawals(filtered)
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
        alert('거절되었습니다.')
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
      processing: { color: 'bg-purple-100 text-purple-700', label: '처리중' },
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

  const getRegionBadge = (region) => {
    const badges = {
      korea: { color: 'bg-blue-100 text-blue-700', label: '🇰🇷 한국' },
      japan: { color: 'bg-red-100 text-red-700', label: '🇯🇵 일본' },
      us: { color: 'bg-purple-100 text-purple-700', label: '🇺🇸 미국' }
    }

    const badge = badges[region] || badges.korea

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  // 월별 목록 생성 (최근 12개월)
  const getMonthOptions = () => {
    const months = []
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      months.push(date.toISOString().slice(0, 7))
    }
    return months
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-8">
            <Wallet className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">크리에이터 출금 관리</h1>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">대기중</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">승인됨</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">완료</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-300" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">총 지급액</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ₩{stats.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-300" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 필터 */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="크리에이터 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">전체 상태</option>
                  <option value="pending">대기중</option>
                  <option value="approved">승인됨</option>
                  <option value="processing">처리중</option>
                  <option value="completed">완료</option>
                  <option value="rejected">거절</option>
                </select>

                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">전체 지역</option>
                  <option value="korea">한국</option>
                  <option value="japan">일본</option>
                  <option value="us">미국</option>
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="all">전체 기간</option>
                  {getMonthOptions().map(month => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 출금 신청 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>출금 신청 목록 ({filteredWithdrawals.length}건)</CardTitle>
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
                      className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            {withdrawal.featured_creators?.channel_name || 'Unknown'}
                          </h3>
                          {getStatusBadge(withdrawal.status)}
                          {getRegionBadge(withdrawal.region)}
                          {withdrawal.priority > 0 && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              우선순위: {withdrawal.priority}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                          <p className="text-sm text-blue-600 mt-2">
                            메모: {withdrawal.admin_notes}
                          </p>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 처리 모달 */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">
              {actionType === 'approve' ? '출금 승인' : '출금 거절'}
            </h2>

            {actionType === 'approve' ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    우선순위 (높을수록 먼저 처리)
                  </label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    placeholder="0"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    관리자 메모
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="내부 메모 (선택사항)"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  거절 사유 *
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="크리에이터에게 표시될 거절 사유를 입력하세요"
                  rows={4}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSubmitAction}
                className="flex-1"
              >
                {actionType === 'approve' ? '승인' : '거절'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedWithdrawal(null)
                }}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

