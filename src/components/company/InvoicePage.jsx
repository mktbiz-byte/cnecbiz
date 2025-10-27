import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, Download, CheckCircle, Copy } from 'lucide-react'

const InvoicePage = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [campaign, setCampaign] = useState(null)
  const [paymentAccount, setPaymentAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      // 캠페인 정보 로드
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 입금 계좌 정보 로드 (한국 지역)
      const { data: accountData, error: accountError } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('region', 'korea')
        .single()

      if (accountError && accountError.code !== 'PGRST116') {
        console.error('계좌 정보 로드 실패:', accountError)
      } else if (accountData) {
        setPaymentAccount(accountData)
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err)
      setError('정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAccount = () => {
    if (paymentAccount) {
      navigator.clipboard.writeText(paymentAccount.account_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConfirmPayment = async () => {
    setConfirming(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          payment_status: 'confirmed',
          payment_confirmed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setSuccess('입금 확인이 완료되었습니다! 관리자 승인 후 캠페인이 시작됩니다.')
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 2000)
    } catch (err) {
      console.error('입금 확인 실패:', err)
      setError('입금 확인 처리에 실패했습니다: ' + err.message)
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    )
  }

  if (error && !campaign) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-red-600">{error}</div>
      </div>
    )
  }

  const packagePrices = {
    '올영 20만원': 200000,
    '프리미엄 30만원': 300000,
    '4주챌린지 60만원': 600000
  }

  const packagePrice = packagePrices[campaign.package_type] || 0
  const totalCost = packagePrice * campaign.recruitment_count
  const isPaymentConfirmed = campaign.payment_status === 'confirmed'

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/company/campaigns/${id}/order-confirmation`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        주문서로 돌아가기
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">견적서 및 입금 안내</CardTitle>
            {isPaymentConfirmed ? (
              <Badge variant="success" className="text-sm bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                입금 확인 완료
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-sm">입금 대기</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            캠페인 견적서를 확인하고 입금을 진행해주세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 견적서 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">견적 내역</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">항목</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">단가</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">수량</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{campaign.package_type}</div>
                      <div className="text-gray-600 text-xs mt-1">{campaign.title}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {packagePrice.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {campaign.recruitment_count}명
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {totalCost.toLocaleString()}원
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-blue-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-4 text-right font-semibold">
                      총 결제 금액
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-2xl font-bold text-blue-600">
                        {totalCost.toLocaleString()}원
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 입금 계좌 정보 */}
          {paymentAccount ? (
            <div>
              <h3 className="font-semibold text-lg mb-4">입금 계좌 정보</h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">은행명</p>
                    <p className="text-xl font-semibold">{paymentAccount.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">계좌번호</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-blue-600 tracking-wider">
                        {paymentAccount.account_number}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyAccount}
                        className="ml-2"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-1" />
                            복사
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">예금주</p>
                    <p className="text-lg font-medium">{paymentAccount.account_holder}</p>
                  </div>
                  <div className="pt-3 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">입금 금액</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {totalCost.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                입금 계좌 정보가 등록되지 않았습니다. 관리자에게 문의해주세요.
              </p>
            </div>
          )}

          {/* 입금 안내 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-3">입금 안내사항</h4>
            <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
              <li>위 계좌로 총 결제 금액을 입금해주세요</li>
              <li>입금자명은 회사명 또는 담당자명으로 해주세요</li>
              <li>입금 완료 후 아래 "입금 완료 확인" 버튼을 클릭해주세요</li>
              <li>입금 확인 후 관리자 승인이 진행됩니다</li>
              <li>승인 완료 시 캠페인이 정식으로 시작됩니다</li>
            </ul>
          </div>

          {/* 캠페인 정보 요약 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">캠페인 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">캠페인명</span>
                <span className="font-medium">{campaign.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">브랜드</span>
                <span>{campaign.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">제품명</span>
                <span>{campaign.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">모집 인원</span>
                <span>{campaign.recruitment_count}명</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              견적서 출력
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={confirming || isPaymentConfirmed}
              className="flex-1"
            >
              {confirming ? (
                '처리 중...'
              ) : isPaymentConfirmed ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  입금 확인 완료
                </>
              ) : (
                '입금 완료 확인'
              )}
            </Button>
          </div>

          {isPaymentConfirmed && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
              <p className="text-sm text-green-700">
                입금이 확인되었습니다. 관리자 승인 후 캠페인이 시작됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvoicePage

