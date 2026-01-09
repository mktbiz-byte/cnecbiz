import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, Plus, CheckCircle, XCircle, 
  Clock, AlertCircle, TrendingUp, CreditCard
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import AdminNavigation from './AdminNavigation'

export default function PaymentManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('receivables') // receivables, points, revenue
  const [receivables, setReceivables] = useState([])
  const [pointCharges, setPointCharges] = useState([])
  const [revenueRecords, setRevenueRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddPointModal, setShowAddPointModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [pointAmount, setPointAmount] = useState('')
  const [adminUser, setAdminUser] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (adminUser) {
      fetchData()
    }
  }, [activeTab, adminUser])

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
      return
    }

    setAdminUser(user)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'receivables') {
        await fetchReceivables()
      } else if (activeTab === 'points') {
        await fetchPointCharges()
      } else if (activeTab === 'revenue') {
        await fetchRevenue()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReceivables = async () => {
    const { data, error } = await supabaseKorea
      .from('accounts_receivable')
      .select('*, campaigns(title, company_email)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReceivables(data)
    }
  }

  const fetchPointCharges = async () => {
    const { data, error } = await supabaseKorea
      .from('points_charge_requests')
      .select('*, companies(company_name)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPointCharges(data)
    }
  }

  const fetchRevenue = async () => {
    const { data, error } = await supabaseKorea
      .from('revenue_records')
      .select('*, campaigns(title), accounts_receivable(amount)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRevenueRecords(data)
    }
  }

  const handleAddPoints = async () => {
    if (!selectedCompany || !pointAmount) {
      alert('회사와 포인트 금액을 입력해주세요')
      return
    }

    try {
      const { error } = await supabaseKorea
        .from('point_charges')
        .insert([{
          company_email: selectedCompany,
          amount: parseInt(pointAmount),
          charge_type: 'deferred',
          status: 'confirmed',
          confirmed_by: adminUser.email,
          confirmed_at: new Date().toISOString(),
          notes: '관리자가 직접 추가한 포인트'
        }])

      if (error) throw error

      alert('포인트가 추가되었습니다')
      setShowAddPointModal(false)
      setSelectedCompany(null)
      setPointAmount('')
      fetchPointCharges()
    } catch (error) {
      console.error('Error adding points:', error)
      alert('포인트 추가에 실패했습니다')
    }
  }

  // 포인트 충전 입금 확인 및 세금계산서/현금영수증 발행
  const handleConfirmChargePayment = async (chargeRequest) => {
    if (!confirm(`입금을 확인하고 ${chargeRequest.invoice_data?.receipt_type === 'tax_invoice' ? '세금계산서' : '현금영수증'}를 발행하시겠습니까?`)) {
      return
    }

    try {
      // 팝빌 API 호출 (Netlify Function)
      const receiptType = chargeRequest.invoice_data?.receipt_type || 'tax_invoice'
      const endpoint = receiptType === 'tax_invoice' 
        ? '/.netlify/functions/popbill-issue-taxinvoice'
        : '/.netlify/functions/popbill-issue-cashbill'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceData: chargeRequest.invoice_data,
          amount: chargeRequest.amount
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '증빙 발행 실패')
      }

      const receiptResult = await response.json()
      console.log('Receipt issued:', receiptResult)

      // 충전 요청 상태 업데이트
      const { error: updateError } = await supabaseKorea
        .from('points_charge_requests')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          payment_confirmed_at: new Date().toISOString(),
          receipt_issued: true,
          receipt_type: receiptType,
          receipt_data: receiptResult
        })
        .eq('id', chargeRequest.id)

      if (updateError) throw updateError

      // 포인트 지급
      const { data: companyData } = await supabaseKorea
        .from('companies')
        .select('points')
        .eq('id', chargeRequest.company_id)
        .single()

      const newPoints = (companyData?.points || 0) + (chargeRequest.points || chargeRequest.amount)

      const { error: pointsError } = await supabaseKorea
        .from('companies')
        .update({ points: newPoints })
        .eq('id', chargeRequest.company_id)

      if (pointsError) throw pointsError

      alert(`입금이 확인되었습니다!\n\n${receiptType === 'tax_invoice' ? '세금계산서' : '현금영수증'} 발행 완료\n포인트 ${(chargeRequest.points || chargeRequest.amount).toLocaleString()}P 지급 완료`)
      fetchPointCharges()
    } catch (error) {
      console.error('Error confirming charge payment:', error)
      alert('입금 확인 실패: ' + error.message)
    }
  }

  const handleConfirmPayment = async (receivableId, amount) => {
    if (!confirm('입금을 확인하시겠습니까? 미수금이 매출로 전환됩니다.')) {
      return
    }

    try {
      // 미수금 상태 업데이트
      const { data: receivable, error: updateError } = await supabaseKorea
        .from('accounts_receivable')
        .update({
          status: 'paid',
          paid_amount: amount,
          payment_confirmed_by: adminUser.email,
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', receivableId)
        .select('*, campaigns(company_email)')
        .single()

      if (updateError) throw updateError

      // 매출 기록 생성
      const { error: revenueError } = await supabaseKorea
        .from('revenue_records')
        .insert([{
          company_email: receivable.campaigns.company_email,
          campaign_id: receivable.campaign_id,
          receivable_id: receivableId,
          amount: amount,
          revenue_type: 'deferred',
          recorded_by: adminUser.email
        }])

      if (revenueError) throw revenueError

      alert('입금이 확인되었습니다. 매출로 기록되었습니다.')
      fetchReceivables()
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('입금 확인에 실패했습니다')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '미수금', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      paid: { label: '입금완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      overdue: { label: '연체', color: 'bg-red-100 text-red-700', icon: AlertCircle },
      cancelled: { label: '취소', color: 'bg-gray-100 text-gray-700', icon: XCircle },
      confirmed: { label: '확인완료', color: 'bg-green-100 text-green-700', icon: CheckCircle }
    }
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock }
    const Icon = badge.icon
    return (
      <Badge className={`${badge.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </Badge>
    )
  }

  const stats = {
    totalReceivables: receivables.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
    totalPaid: receivables.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.paid_amount, 0),
    totalRevenue: revenueRecords.reduce((sum, r) => sum + r.amount, 0),
    totalPoints: pointCharges.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0)
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">입금확인 및 세금계산서 발급</h1>
          </div>
          {activeTab === 'points' && (
            <Button onClick={() => setShowAddPointModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              포인트 추가
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">총 미수금</div>
              <div className="text-3xl font-bold text-yellow-600">
                ₩{stats.totalReceivables.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">입금 완료</div>
              <div className="text-3xl font-bold text-green-600">
                ₩{stats.totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">총 매출</div>
              <div className="text-3xl font-bold text-blue-600">
                ₩{stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">총 포인트</div>
              <div className="text-3xl font-bold text-purple-600">
                {stats.totalPoints.toLocaleString()}P
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'receivables' ? 'default' : 'outline'}
            onClick={() => setActiveTab('receivables')}
          >
            미수금 관리
          </Button>
          <Button
            variant={activeTab === 'points' ? 'default' : 'outline'}
            onClick={() => setActiveTab('points')}
          >
            포인트 관리
          </Button>
          <Button
            variant={activeTab === 'revenue' ? 'default' : 'outline'}
            onClick={() => setActiveTab('revenue')}
          >
            매출 기록
          </Button>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'receivables' && '미수금 목록'}
              {activeTab === 'points' && '포인트 충전 내역'}
              {activeTab === 'revenue' && '매출 기록'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {/* 미수금 목록 */}
                {activeTab === 'receivables' && receivables.map((item) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            {item.campaigns?.title || '캠페인 정보 없음'}
                          </h3>
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>회사: {item.company_email}</div>
                          <div>금액: ₩{item.amount.toLocaleString()}</div>
                          {item.due_date && (
                            <div>마감일: {new Date(item.due_date).toLocaleDateString('ko-KR')}</div>
                          )}
                          {item.payment_confirmed_at && (
                            <div>입금 확인: {new Date(item.payment_confirmed_at).toLocaleDateString('ko-KR')}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-600 mb-2">
                          ₩{item.amount.toLocaleString()}
                        </div>
                        {item.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmPayment(item.id, item.amount)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            입금 확인
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 포인트 충전 내역 */}
                {activeTab === 'points' && pointCharges.map((item) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            {item.companies?.company_name || item.company_email || '회사명 없음'}
                          </h3>
                          {getStatusBadge(item.status)}
                          {item.invoice_data?.receipt_type && (
                            <Badge variant="outline">
                              {item.invoice_data.receipt_type === 'tax_invoice' ? '세금계산서' : '현금영수증'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>신청일: {new Date(item.created_at).toLocaleDateString('ko-KR')}</div>
                          <div>금액: {item.amount?.toLocaleString() || 0}원</div>
                          <div>포인트: {(item.points || item.amount)?.toLocaleString() || 0}P</div>
                          {item.invoice_data?.depositor_name && (
                            <div>예금주명: {item.invoice_data.depositor_name}</div>
                          )}
                          {item.invoice_data?.email && (
                            <div>이메일: {item.invoice_data.email}</div>
                          )}
                          {item.confirmed_at && (
                            <div className="text-green-600">확인일: {new Date(item.confirmed_at).toLocaleDateString('ko-KR')}</div>
                          )}
                          {item.receipt_issued && (
                            <div className="text-blue-600">✅ 증빙 발행 완료</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col gap-2">
                        <div className="text-2xl font-bold text-purple-600">
                          {(item.points || item.amount)?.toLocaleString() || 0}P
                        </div>
                        {item.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmChargePayment(item)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            입금 확인
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 매출 기록 */}
                {activeTab === 'revenue' && revenueRecords.map((item) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">
                            {item.campaigns?.title || '캠페인 정보 없음'}
                          </h3>
                          <Badge variant="outline">
                            {item.revenue_type === 'prepaid' ? '선불' : '후불'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>회사: {item.company_email}</div>
                          <div>기록일: {new Date(item.recorded_at).toLocaleDateString('ko-KR')}</div>
                          {item.recorded_by && <div>기록자: {item.recorded_by}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{item.amount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {((activeTab === 'receivables' && receivables.length === 0) ||
                  (activeTab === 'points' && pointCharges.length === 0) ||
                  (activeTab === 'revenue' && revenueRecords.length === 0)) && (
                  <div className="text-center py-12 text-gray-500">
                    데이터가 없습니다
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 포인트 추가 모달 */}
      {showAddPointModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">포인트 추가</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">회사 이메일</label>
                <Input
                  type="email"
                  placeholder="company@example.com"
                  value={selectedCompany || ''}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">포인트 금액</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleAddPoints}>
                  추가
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAddPointModal(false)
                    setSelectedCompany(null)
                    setPointAmount('')
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

