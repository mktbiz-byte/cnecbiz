import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DollarSign, CreditCard, AlertCircle, CheckCircle,
  Clock, XCircle, Wallet, Sparkles, Loader2, Ban
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabaseKorea } from '../../lib/supabaseClients'
import { encryptResidentNumber, validateResidentNumber } from '../../lib/encryptionHelper'

export default function WithdrawalRequest() {
  const navigate = useNavigate()
  const [creator, setCreator] = useState(null)
  const [region, setRegion] = useState('korea')
  const [pointsBalance, setPointsBalance] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [bonusHistory, setBonusHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [submitThrottled, setSubmitThrottled] = useState(false)

  // 출금 신청 폼
  const [formData, setFormData] = useState({
    requested_points: '',
    // 한국
    bank_name: '',
    account_number: '',
    account_holder: '',
    resident_registration_number: '',
    // JP/US
    paypal_email: ''
  })

  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    checkAuth()
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

    // 크리에이터 정보 조회
    const { data: creatorData } = await supabaseBiz
      .from('featured_creators')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!creatorData) {
      alert('크리에이터 정보를 찾을 수 없습니다.')
      navigate('/')
      return
    }

    setCreator(creatorData)
    setRegion(creatorData.region || 'korea')

    // creator_points 테이블에서 실제 잔액 계산
    await fetchActualBalance(creatorData.id)

    fetchWithdrawalHistory(creatorData.id)
    fetchBonusHistory(creatorData.id)
  }

  const fetchActualBalance = async (creatorId) => {
    try {
      // 1. creator_points에서 모든 트랜잭션 합계 계산
      const { data: pointsData, error: pointsError } = await supabaseBiz
        .from('creator_points')
        .select('amount')
        .eq('creator_id', creatorId)

      if (pointsError) throw pointsError

      const totalBalance = (pointsData || []).reduce((sum, p) => sum + (p.amount || 0), 0)
      setPointsBalance(totalBalance)

      // 2. 처리 중인 출금 요청 합계 (pending, approved, processing)
      const { data: pendingData, error: pendingError } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('requested_points')
        .eq('creator_id', creatorId)
        .in('status', ['pending', 'approved', 'processing'])

      if (pendingError) throw pendingError

      const totalPending = (pendingData || []).reduce((sum, w) => sum + (w.requested_points || 0), 0)
      setPendingWithdrawals(totalPending)

      // 3. 실제 출금 가능 잔액 = 총 잔액 - 처리 중인 출금
      const available = totalBalance - totalPending
      setAvailableBalance(available)
    } catch (error) {
      console.error('잔액 계산 오류:', error)
      // fallback: featured_creators의 points_balance 사용
      setPointsBalance(0)
      setAvailableBalance(0)
    }
  }

  const fetchWithdrawalHistory = async (creatorId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWithdrawalHistory(data || [])
    } catch (error) {
      console.error('출금 내역 조회 오류:', error)
    }
  }

  const fetchBonusHistory = async (creatorId) => {
    try {
      const { data, error } = await supabaseBiz
        .from('creator_points')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('type', 'bonus')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBonusHistory(data || [])
    } catch (error) {
      console.error('보너스 내역 조회 오류:', error)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const requestedPoints = parseInt(formData.requested_points) || 0

    if (!requestedPoints || requestedPoints <= 0) {
      newErrors.requested_points = '출금할 포인트를 입력해주세요.'
    } else if (requestedPoints < 10000) {
      newErrors.requested_points = '최소 출금 금액은 10,000포인트입니다.'
    }

    if (requestedPoints > availableBalance) {
      newErrors.requested_points = `출금 가능 포인트(${availableBalance.toLocaleString()}P)보다 많이 출금할 수 없습니다.`
    }

    if (region === 'korea') {
      if (!formData.bank_name) newErrors.bank_name = '은행명을 입력해주세요.'
      if (!formData.account_number) newErrors.account_number = '계좌번호를 입력해주세요.'
      if (!formData.account_holder) newErrors.account_holder = '예금주를 입력해주세요.'
      if (!formData.resident_registration_number) {
        newErrors.resident_registration_number = '주민등록번호를 입력해주세요.'
      }
    } else {
      if (!formData.paypal_email) {
        newErrors.paypal_email = 'PayPal 이메일을 입력해주세요.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return
    if (submitThrottled) return

    setLoading(true)
    setSuccessMessage('')

    try {
      // 한국 크리에이터 주민번호 처리
      let encryptedResidentNumber = null
      if (region === 'korea') {
        if (!validateResidentNumber(formData.resident_registration_number)) {
          alert('유효하지 않은 주민등록번호입니다.')
          setLoading(false)
          return
        }
        encryptedResidentNumber = await encryptResidentNumber(formData.resident_registration_number)
      }

      // 서버사이드 API 호출 (5단계 안전장치 적용)
      const response = await fetch('/.netlify/functions/withdrawal-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          creator_id: creator.id,
          creator_name: creator.channel_name || creator.name || 'Unknown',
          requested_points: parseInt(formData.requested_points),
          region,
          bank_name: region === 'korea' ? formData.bank_name : null,
          account_number: region === 'korea' ? formData.account_number : null, // TEXT - 앞자리 0 보존
          account_holder: region === 'korea' ? formData.account_holder : null,
          resident_registration_number: region === 'korea' ? encryptedResidentNumber : null,
          paypal_email: region !== 'korea' ? formData.paypal_email : null
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '출금 신청에 실패했습니다.')
      }

      setSuccessMessage(result.message || '출금 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.')
      setFormData({
        requested_points: '',
        bank_name: '',
        account_number: '',
        account_holder: '',
        resident_registration_number: '',
        paypal_email: ''
      })

      // 5초 쓰로틀링
      setSubmitThrottled(true)
      setTimeout(() => setSubmitThrottled(false), 5000)

      // 잔액 및 내역 갱신
      await fetchActualBalance(creator.id)
      fetchWithdrawalHistory(creator.id)
    } catch (error) {
      console.error('출금 신청 오류:', error)
      alert(error.message || '출금 신청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelWithdrawal = async (withdrawalId) => {
    if (!confirm('출금 신청을 취소하시겠습니까?')) return

    try {
      const response = await fetch('/.netlify/functions/withdrawal-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: withdrawalId,
          actor: creator.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      alert('출금 신청이 취소되었습니다.')
      fetchWithdrawalHistory(creator.id)
      await fetchActualBalance(creator.id)
    } catch (error) {
      console.error('출금 취소 오류:', error)
      alert(error.message || '출금 취소 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: '대기중' },
      approved: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: '승인됨' },
      processing: { color: 'bg-purple-100 text-purple-700', icon: CreditCard, label: '처리중' },
      completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: '완료' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: '거절' },
      cancelled: { color: 'bg-gray-100 text-gray-600', icon: Ban, label: '취소됨' }
    }

    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getApprovalBadge = (approvalStatus) => {
    const badges = {
      NONE: { color: 'bg-gray-50 text-gray-500', label: '미상신' },
      PENDING: { color: 'bg-amber-50 text-amber-700', label: '결재대기' },
      APPROVED: { color: 'bg-green-50 text-green-700', label: '결재승인' },
      REJECTED: { color: 'bg-red-50 text-red-700', label: '결재반려' }
    }
    const badge = badges[approvalStatus]
    if (!badge) return null

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (!creator) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold">포인트 출금</h1>
        </div>

        {/* 포인트 잔액 */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">포인트 총 잔액</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                    {pointsBalance.toLocaleString()}P
                  </p>
                </div>
                <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
              </div>
              {pendingWithdrawals > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">처리 중인 출금 요청</p>
                    <p className="text-lg font-semibold text-orange-600">
                      -{pendingWithdrawals.toLocaleString()}P
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600 mb-1">출금 가능 포인트</p>
                  <p className={`text-2xl font-bold ${availableBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {availableBalance.toLocaleString()}P
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {availableBalance <= 0 && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              출금 가능한 포인트가 없습니다. 포인트 잔액이 0 이하이거나 처리 중인 출금 요청이 있습니다.
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* 출금 신청 폼 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>출금 신청</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="requested_points">출금 포인트 *</Label>
                <Input
                  id="requested_points"
                  type="text"
                  inputMode="numeric"
                  value={formData.requested_points ? Number(formData.requested_points).toLocaleString() : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    setFormData({ ...formData, requested_points: raw })
                  }}
                  placeholder="출금할 포인트를 입력하세요"
                />
                {errors.requested_points && (
                  <p className="text-sm text-red-600 mt-1">{errors.requested_points}</p>
                )}
              </div>

              {region === 'korea' ? (
                <>
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      한국 크리에이터는 계좌이체로 지급됩니다. 세금 3.3%가 공제됩니다.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="bank_name">은행명 *</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="예: 국민은행"
                    />
                    {errors.bank_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.bank_name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account_number">계좌번호 *</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="'-' 없이 입력"
                    />
                    {errors.account_number && (
                      <p className="text-sm text-red-600 mt-1">{errors.account_number}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="account_holder">예금주 *</Label>
                    <Input
                      id="account_holder"
                      value={formData.account_holder}
                      onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                      placeholder="예금주명"
                    />
                    {errors.account_holder && (
                      <p className="text-sm text-red-600 mt-1">{errors.account_holder}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="resident_registration_number">주민등록번호 *</Label>
                    <Input
                      id="resident_registration_number"
                      value={formData.resident_registration_number}
                      onChange={(e) => setFormData({ ...formData, resident_registration_number: e.target.value })}
                      placeholder="000000-0000000"
                      type="password"
                    />
                    {errors.resident_registration_number && (
                      <p className="text-sm text-red-600 mt-1">{errors.resident_registration_number}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">세금 신고를 위해 필요합니다.</p>
                  </div>
                </>
              ) : (
                <>
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      {region === 'japan' ? '일본' : '미국'} 크리에이터는 PayPal로 지급됩니다.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="paypal_email">PayPal 이메일 *</Label>
                    <Input
                      id="paypal_email"
                      type="email"
                      value={formData.paypal_email}
                      onChange={(e) => setFormData({ ...formData, paypal_email: e.target.value })}
                      placeholder="paypal@example.com"
                    />
                    {errors.paypal_email && (
                      <p className="text-sm text-red-600 mt-1">{errors.paypal_email}</p>
                    )}
                  </div>
                </>
              )}

              <Button type="submit" className="w-full h-12 text-base" disabled={loading || submitThrottled}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중...
                  </span>
                ) : submitThrottled ? '잠시 후 다시 시도해주세요...' : '출금 신청'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 보너스 포인트 내역 */}
        {bonusHistory.length > 0 && (
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                보너스 포인트 내역
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bonusHistory.map((bonus) => (
                  <div
                    key={bonus.id}
                    className="p-4 rounded-lg bg-white border-2 border-purple-200 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-bold text-lg text-purple-600">
                            +{bonus.amount.toLocaleString()}P
                          </p>
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 font-medium">
                            소속 크리에이터 보너스
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {bonus.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(bonus.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 출금 내역 */}
        <Card>
          <CardHeader>
            <CardTitle>출금 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                출금 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawalHistory.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className={`p-4 rounded-lg border-2 ${
                      withdrawal.status === 'rejected' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <p className="font-bold text-lg">
                            {withdrawal.requested_points.toLocaleString()}P
                          </p>
                          {getStatusBadge(withdrawal.status)}
                          {withdrawal.approval_status && withdrawal.approval_status !== 'NONE' && getApprovalBadge(withdrawal.approval_status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          신청일: {new Date(withdrawal.created_at).toLocaleDateString('ko-KR')}
                        </p>
                        {withdrawal.final_amount && (
                          <p className="text-sm text-gray-600">
                            지급액: {withdrawal.final_amount.toLocaleString()} {withdrawal.currency}
                            {withdrawal.tax_amount > 0 && ` (세금 ${withdrawal.tax_amount.toLocaleString()} 공제)`}
                          </p>
                        )}
                        {withdrawal.rejection_reason && (
                          <Alert className="mt-3 bg-red-100 border-red-300">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              <span className="font-medium">거절 사유:</span> {withdrawal.rejection_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                        {withdrawal.admin_notes && withdrawal.status !== 'rejected' && (
                          <p className="text-sm text-blue-600 mt-2">
                            관리자 메모: {withdrawal.admin_notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {withdrawal.status === 'pending' && withdrawal.approval_status !== 'PENDING' && (
                          <Button
                            onClick={() => handleCancelWithdrawal(withdrawal.id)}
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            size="sm"
                          >
                            취소
                          </Button>
                        )}
                        {withdrawal.status === 'rejected' && (
                          <Button
                            onClick={() => {
                              setFormData({
                                requested_points: String(withdrawal.requested_points),
                                bank_name: withdrawal.bank_name || '',
                                account_number: withdrawal.account_number || '',
                                account_holder: withdrawal.account_holder || '',
                                resident_registration_number: '',
                                paypal_email: withdrawal.paypal_email || ''
                              })
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                              setSuccessMessage('')
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            재신청하기
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

