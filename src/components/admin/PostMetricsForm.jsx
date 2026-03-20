import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, BarChart3 } from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'

export default function PostMetricsForm({ campaignId, campaignType }) {
  const [submissions, setSubmissions] = useState([])
  const [creatorNames, setCreatorNames] = useState({})
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  const isTextType = ['threads_post', 'x_post'].includes(campaignType)
  const isStoryType = campaignType === 'story_short'

  const fetchData = async () => {
    try {
      let subs = []
      const subType = isTextType ? 'text' : isStoryType ? 'story' : 'video'

      if (isTextType) {
        const { data } = await supabaseBiz
          .from('text_submissions')
          .select('id, creator_id, platform, status')
          .eq('campaign_id', campaignId)
          .eq('status', 'approved')
        subs = (data || []).map(s => ({ ...s, submission_type: 'text' }))
      } else if (isStoryType) {
        const { data } = await supabaseBiz
          .from('story_submissions')
          .select('id, creator_id, status')
          .eq('campaign_id', campaignId)
          .eq('status', 'approved')
        subs = (data || []).map(s => ({ ...s, submission_type: 'story' }))
      }

      setSubmissions(subs)

      // 크리에이터 이름 조회
      const creatorIds = [...new Set(subs.map(s => s.creator_id).filter(Boolean))]
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

      // 기존 성과 조회
      const subIds = subs.map(s => s.id)
      if (subIds.length > 0) {
        const idField = isTextType ? 'text_submission_id' : 'story_submission_id'
        const { data: existingMetrics } = await supabaseBiz
          .from('campaign_post_metrics')
          .select('*')
          .in(idField, subIds)
        if (existingMetrics) {
          const metricsMap = {}
          existingMetrics.forEach(m => {
            const key = m.text_submission_id || m.story_submission_id
            metricsMap[key] = m
          })
          setMetrics(metricsMap)
        }
      }
    } catch (err) {
      console.error('Failed to fetch metrics data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [campaignId, campaignType])

  const updateMetric = (submissionId, field, value) => {
    setMetrics(prev => ({
      ...prev,
      [submissionId]: {
        ...(prev[submissionId] || {}),
        [field]: value
      }
    }))
  }

  const saveMetric = async (sub) => {
    setSaving(sub.id)
    try {
      const existing = metrics[sub.id] || {}
      const body = {
        ...(existing.id ? { id: existing.id } : {}),
        submission_type: sub.submission_type,
        ...(isTextType ? { text_submission_id: sub.id } : {}),
        ...(isStoryType ? { story_submission_id: sub.id } : {}),
        views: parseInt(existing.views) || 0,
        likes: parseInt(existing.likes) || 0,
        replies: parseInt(existing.replies) || 0,
        reposts: parseInt(existing.reposts) || 0,
        quotes: parseInt(existing.quotes) || 0,
        impressions: parseInt(existing.impressions) || 0,
        bookmarks: parseInt(existing.bookmarks) || 0,
        reach: parseInt(existing.reach) || 0,
        tap_forward_rate: parseFloat(existing.tap_forward_rate) || 0,
        exit_rate: parseFloat(existing.exit_rate) || 0,
        reply_count: parseInt(existing.reply_count) || 0,
        sticker_taps: parseInt(existing.sticker_taps) || 0,
        link_clicks: parseInt(existing.link_clicks) || 0,
        cnec_shop_visits: parseInt(existing.cnec_shop_visits) || 0,
        shop_revenue: parseFloat(existing.shop_revenue) || 0
      }

      const response = await fetch('/.netlify/functions/save-post-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      // 저장된 데이터로 업데이트 (id 포함)
      setMetrics(prev => ({ ...prev, [sub.id]: result.data }))
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" />성과 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-4">승인된 제출물이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" />성과 입력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {submissions.map((sub) => {
          const m = metrics[sub.id] || {}
          return (
            <div key={sub.id} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{creatorNames[sub.creator_id] || sub.creator_id?.slice(0, 8)}</span>
                {sub.platform && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{sub.platform === 'threads' ? 'Threads' : 'X'}</span>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500">좋아요</label>
                  <Input type="number" value={m.likes || ''} onChange={e => updateMetric(sub.id, 'likes', e.target.value)} className="h-8 text-sm" />
                </div>

                {isTextType && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">리포스트</label>
                      <Input type="number" value={m.reposts || ''} onChange={e => updateMetric(sub.id, 'reposts', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">인용</label>
                      <Input type="number" value={m.quotes || ''} onChange={e => updateMetric(sub.id, 'quotes', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">댓글</label>
                      <Input type="number" value={m.replies || ''} onChange={e => updateMetric(sub.id, 'replies', e.target.value)} className="h-8 text-sm" />
                    </div>
                    {campaignType === 'x_post' && (
                      <>
                        <div>
                          <label className="text-xs text-gray-500">임프레션</label>
                          <Input type="number" value={m.impressions || ''} onChange={e => updateMetric(sub.id, 'impressions', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">북마크</label>
                          <Input type="number" value={m.bookmarks || ''} onChange={e => updateMetric(sub.id, 'bookmarks', e.target.value)} className="h-8 text-sm" />
                        </div>
                      </>
                    )}
                  </>
                )}

                {isStoryType && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500">도달(Reach)</label>
                      <Input type="number" value={m.reach || ''} onChange={e => updateMetric(sub.id, 'reach', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">탭포워드율(%)</label>
                      <Input type="number" step="0.01" value={m.tap_forward_rate || ''} onChange={e => updateMetric(sub.id, 'tap_forward_rate', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">이탈률(%)</label>
                      <Input type="number" step="0.01" value={m.exit_rate || ''} onChange={e => updateMetric(sub.id, 'exit_rate', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">답장(DM)</label>
                      <Input type="number" value={m.reply_count || ''} onChange={e => updateMetric(sub.id, 'reply_count', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">스티커 참여</label>
                      <Input type="number" value={m.sticker_taps || ''} onChange={e => updateMetric(sub.id, 'sticker_taps', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </>
                )}

                {/* 공통 전환 지표 */}
                <div>
                  <label className="text-xs text-gray-500">링크 클릭</label>
                  <Input type="number" value={m.link_clicks || ''} onChange={e => updateMetric(sub.id, 'link_clicks', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">크넥샵 방문</label>
                  <Input type="number" value={m.cnec_shop_visits || ''} onChange={e => updateMetric(sub.id, 'cnec_shop_visits', e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">매출(원)</label>
                  <Input type="number" value={m.shop_revenue || ''} onChange={e => updateMetric(sub.id, 'shop_revenue', e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveMetric(sub)} disabled={saving === sub.id}>
                  {saving === sub.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  저장
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
