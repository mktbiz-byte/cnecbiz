import { useState, useEffect } from 'react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function PaymentHistoryPage() {
  const [chargeRequests, setChargeRequests] = useState([])  // 포인트 결제 신청
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      // 포인트 결제 신청 내역 조회
      const { data: requests } = await supabaseBiz
        .from('points_charge_requests')
        .select('*')
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })
      
      console.log('[PaymentHistoryPage] Charge requests:', requests)
      
      if (requests && requests.length > 0) {
        // 취소된 캠페인 필터링
        const campaignIds = requests
          .map(r => r.bank_transfer_info?.campaign_id)
          .filter(Boolean)
        
        let cancelledCampaignIds = []
        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabaseBiz
            .from('campaigns')
            .select('id, is_cancelled')
            .in('id', campaignIds)
            .eq('is_cancelled', true)
          
          cancelledCampaignIds = campaigns?.map(c => c.id) || []
        }
        
        const filteredRequests = requests.filter(
          req => !cancelledCampaignIds.includes(req.bank_transfer_info?.campaign_id)
        )
        console.log('[PaymentHistoryPage] Filtered requests:', filteredRequests)
        console.log('[PaymentHistoryPage] Cancelled campaign IDs:', cancelledCampaignIds)
        setChargeRequests(filteredRequests)
        
        // Calculate total spent
        const chargeTotal = filteredRequests
          ?.filter(r => r.status === 'completed' || r.status === 'confirmed')
          .reduce((sum, r) => sum + r.amount, 0) || 0
        
        setTotalSpent(chargeTotal)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { text: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { text: '완료', color: 'bg-green-100 text-green-800' },
      'confirmed': { text: '확인됨', color: 'bg-blue-100 text-blue-800' },
      'failed': { text: '실패', color: 'bg-red-100 text-red-800' },
      'refunded': { text: '환불', color: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[status] || badges.pending
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">결제 내역</h1>
          <p className="mt-2 text-gray-600">모든 결제 내역을 확인하고 관리하세요</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Total Spent Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">총 결제 금액</p>
              <p className="text-4xl font-bold mt-2">
                {totalSpent.toLocaleString()}원
              </p>
              <p className="text-blue-100 text-sm mt-2">
                {chargeRequests.filter(r => r.status === 'completed' || r.status === 'confirmed').length}건의 결제 완료
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-lg">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 포인트 결제 내역 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">결제 내역 ({chargeRequests.length}건)</h2>
          </div>

          {chargeRequests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-500">결제 내역이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">캠페인</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">포인트</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {chargeRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.bank_transfer_info?.campaign_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {request.amount.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {request.points_awarded ? `${request.points_awarded.toLocaleString()}P` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
