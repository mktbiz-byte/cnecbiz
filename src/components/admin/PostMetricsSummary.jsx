import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp } from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'

export default function PostMetricsSummary({ campaignId, campaignType }) {
  const [data, setData] = useState(null)
  const [creatorNames, setCreatorNames] = useState({})
  const [loading, setLoading] = useState(true)

  const isTextType = ['threads_post', 'x_post'].includes(campaignType)
  const isStoryType = campaignType === 'story_short'

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/.netlify/functions/get-post-metrics?campaign_id=${campaignId}`)
        const result = await response.json()
        if (result.success) {
          setData(result.data)

          // 크리에이터 이름
          const creatorIds = [...new Set(Object.values(result.data.submissions || {}).map(s => s.creator_id).filter(Boolean))]
          if (creatorIds.length && supabaseKorea) {
            const { data: profiles } = await supabaseKorea
              .from('user_profiles')
              .select('id, nickname, instagram_id')
              .in('id', creatorIds)
            if (profiles) {
              const map = {}
              profiles.forEach(p => { map[p.id] = p.nickname || p.instagram_id || p.id?.slice(0, 8) })
              setCreatorNames(map)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [campaignId])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" />성과 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">아직 성과 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  const { metrics, submissions, totals } = data

  // 크리에이터별 그룹핑
  const byCreator = {}
  metrics.forEach(m => {
    const subId = m.text_submission_id || m.story_submission_id
    const sub = submissions[subId]
    if (!sub) return
    const creatorId = sub.creator_id
    if (!byCreator[creatorId]) byCreator[creatorId] = { ...m }
    else {
      Object.keys(totals).forEach(k => {
        byCreator[creatorId][k] = (Number(byCreator[creatorId][k]) || 0) + (Number(m[k]) || 0)
      })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" />성과 요약</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-medium text-gray-600">크리에이터</th>
                <th className="py-2 px-2 font-medium text-gray-600 text-right">좋아요</th>
                {isTextType && (
                  <>
                    <th className="py-2 px-2 font-medium text-gray-600 text-right">리포스트</th>
                    <th className="py-2 px-2 font-medium text-gray-600 text-right">댓글</th>
                  </>
                )}
                {isStoryType && (
                  <>
                    <th className="py-2 px-2 font-medium text-gray-600 text-right">도달</th>
                    <th className="py-2 px-2 font-medium text-gray-600 text-right">스티커</th>
                  </>
                )}
                <th className="py-2 px-2 font-medium text-gray-600 text-right">링크클릭</th>
                <th className="py-2 px-2 font-medium text-gray-600 text-right">매출</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byCreator).map(([creatorId, m]) => (
                <tr key={creatorId} className="border-b">
                  <td className="py-2 pr-4 font-medium">{creatorNames[creatorId] || creatorId?.slice(0, 8)}</td>
                  <td className="py-2 px-2 text-right">{(m.likes || 0).toLocaleString()}</td>
                  {isTextType && (
                    <>
                      <td className="py-2 px-2 text-right">{(m.reposts || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{(m.replies || 0).toLocaleString()}</td>
                    </>
                  )}
                  {isStoryType && (
                    <>
                      <td className="py-2 px-2 text-right">{(m.reach || 0).toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{(m.sticker_taps || 0).toLocaleString()}</td>
                    </>
                  )}
                  <td className="py-2 px-2 text-right">{(m.link_clicks || 0).toLocaleString()}</td>
                  <td className="py-2 px-2 text-right">₩{(m.shop_revenue || 0).toLocaleString()}</td>
                </tr>
              ))}
              {/* 합계 행 */}
              <tr className="border-t-2 font-bold">
                <td className="py-2 pr-4">합계</td>
                <td className="py-2 px-2 text-right">{(totals.likes || 0).toLocaleString()}</td>
                {isTextType && (
                  <>
                    <td className="py-2 px-2 text-right">{(totals.reposts || 0).toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{(totals.replies || 0).toLocaleString()}</td>
                  </>
                )}
                {isStoryType && (
                  <>
                    <td className="py-2 px-2 text-right">{(totals.reach || 0).toLocaleString()}</td>
                    <td className="py-2 px-2 text-right">{(totals.sticker_taps || 0).toLocaleString()}</td>
                  </>
                )}
                <td className="py-2 px-2 text-right">{(totals.link_clicks || 0).toLocaleString()}</td>
                <td className="py-2 px-2 text-right">₩{(totals.shop_revenue || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
