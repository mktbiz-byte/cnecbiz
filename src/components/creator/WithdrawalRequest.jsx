import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign, CreditCard, AlertCircle, CheckCircle, 
  Clock, XCircle, Wallet 
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import { supabase as supabaseKorea } from '../../lib/supabaseKorea'
import { supabase as supabaseJapan } from '../../lib/supabaseJapan'
import { supabase as supabaseUS } from '../../lib/supabaseUS'
import { encryptResidentNumber, validateResidentNumber } from '../../lib/encryptionHelper'

export default function WithdrawalRequest() {
  const navigate = useNavigate()
  const [creator, setCreator] = useState(null)
  const [region, setRegion] = useState('korea')
  const [pointsBalance, setPointsBalance] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])
  const [loading, setLoading] = useState(false)

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
    setPointsBalance(creatorData.points_balance || 0)

    fetchWithdrawalHistory(creatorData.id)
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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.requested_points || formData.requested_points <= 0) {
      newErrors.requested_points = '출금할 포인트를 입력해주세요.'
    }

    if (formData.requested_points > pointsBalance) {
      newErrors.requested_points = '보유 포인트보다 많이 출금할 수 없습니다.'
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

    setLoading(true)
    setSuccessMessage('')

    try {
      // 환율 계산 (간단한 예시, 실제로는 API에서 가져와야 함)
      const exchangeRates = {
        korea: { rate: 1, currency: 'KRW' },
        japan: { rate: 9, currency: 'JPY' },
        us: { rate: 0.00075, currency: 'USD' }
      }

      const { rate, currency } = exchangeRates[region]
      const requestedAmount = formData.requested_points * rate

      // 한국의 경우 세금 계산 (3.3%)
      let taxAmount = 0
      let finalAmount = requestedAmount

      if (region === 'korea') {
        taxAmount = requestedAmount * 0.033
        finalAmount = requestedAmount - taxAmount
      }

      const withdrawalData = {
        creator_id: creator.id,
        region,
        requested_points: parseInt(formData.requested_points),
        requested_amount: requestedAmount,
        currency,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        status: 'pending'
      }

      // 지역별 필드 추가
      if (region === 'korea') {
        // 주민번호 유효성 검사
        if (!validateResidentNumber(formData.resident_registration_number)) {
          alert('유효하지 않은 주민등록번호입니다.')
          setLoading(false)
          return
        }

        // 주민번호 암호화
        const encryptedResidentNumber = await encryptResidentNumber(formData.resident_registration_number)

        withdrawalData.bank_name = formData.bank_name
        withdrawalData.account_number = formData.account_number
        withdrawalData.account_holder = formData.account_holder
        withdrawalData.resident_registration_number = encryptedResidentNumber
      } else {
        withdrawalData.paypal_email = formData.paypal_email
      }

      const { error } = await supabaseBiz
        .from('creator_withdrawal_requests')
        .insert([withdrawalData])

      if (error) throw error

      setSuccessMessage('출금 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.')
      setFormData({
        requested_points: '',
        bank_name: '',
        account_number: '',
        account_holder: '',
        resident_registration_number: '',
        paypal_email: ''
      })

      fetchWithdrawalHistory(creator.id)
    } catch (error) {
      console.error('출금 신청 오류:', error)
      alert('출금 신청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: '대기중' },
      approved: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: '승인됨' },
      processing: { color: 'bg-purple-100 text-purple-700', icon: CreditCard, label: '처리중' },
      completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: '완료' },
      rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: '거절' }
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

  if (!creator) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">포인트 출금</h1>
        </div>

        {/* 포인트 잔액 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">보유 포인트</p>
                <p className="text-3xl font-bold text-blue-600">
                  {pointsBalance.toLocaleString()}P
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-gray-300" />
            </div>
          </CardContent>
        </Card>

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
                  type="number"
                  value={formData.requested_points}
                  onChange={(e) => setFormData({ ...formData, requested_points: e.target.value })}
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '처리 중...' : '출금 신청'}
              </Button>
            </form>
          </CardContent>
        </Card>

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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-lg">
                          {withdrawal.requested_points.toLocaleString()}P
                        </p>
                        {getStatusBadge(withdrawal.status)}
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
                        <p className="text-sm text-red-600 mt-1">
                          거절 사유: {withdrawal.rejection_reason}
                        </p>
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
  )
}

