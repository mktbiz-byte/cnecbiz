import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp } from 'lucide-react'

export default function PostMetricsReadonly({ campaignId, campaignType }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const isTextType = ['threads_post', 'x_post'].includes(campaignType)
  const isStoryType = campaignType === 'story_short'

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-post-metrics?campaign_id=${campaignId}`)
        const result = await response.json()
        if (result.success) setData(result.data)
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [campaignId])

  if (loading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></CardContent></Card>
  }

  if (!data || data.metrics.length === 0) return null

  const { totals } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" />캠페인 성과</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">좋아요</p>
            <p className="text-xl font-bold text-gray-900">{(totals.likes || 0).toLocaleString()}</p>
          </div>
          {isTextType && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">리포스트</p>
                <p className="text-xl font-bold text-gray-900">{(totals.reposts || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">댓글</p>
                <p className="text-xl font-bold text-gray-900">{(totals.replies || 0).toLocaleString()}</p>
              </div>
            </>
          )}
          {isStoryType && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">도달</p>
                <p className="text-xl font-bold text-gray-900">{(totals.reach || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">스티커 참여</p>
                <p className="text-xl font-bold text-gray-900">{(totals.sticker_taps || 0).toLocaleString()}</p>
              </div>
            </>
          )}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">링크 클릭</p>
            <p className="text-xl font-bold text-gray-900">{(totals.link_clicks || 0).toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 mb-1">매출</p>
            <p className="text-xl font-bold text-blue-700">₩{(totals.shop_revenue || 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
