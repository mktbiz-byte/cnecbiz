import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Loader2, CheckCircle, XCircle, Eye, Clock } from 'lucide-react'

export default function CampaignApprovals() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState([])
  const [filter, setFilter] = useState('pending_approval') // pending_approval, all

  useEffect(() => {
    loadCampaigns()
  }, [filter])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('campaigns')
        .select(`
          *,
          campaign_guides (*)
        `)
        .order('created_at', { ascending: false })

      if (filter === 'pending_approval') {
        query = query.eq('status', 'pending_approval')
      }

      const { data, error } = await query

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
      alert('캠페인 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: '임시저장', color: 'bg-gray-100 text-gray-700' },
      pending_approval: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
      active: { label: '승인완료', color: 'bg-green-100 text-green-700' },
      rejected: { label: '거부됨', color: 'bg-red-100 text-red-700' }
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getRegionFlag = (region) => {
    const flags = {
      japan: '🇯🇵',
      jp: '🇯🇵',
      us: '🇺🇸',
      usa: '🇺🇸',
      korea: '🇰🇷',
      taiwan: '🇹🇼'
    }
    return flags[region] || '🌍'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">캠페인 승인 관리</h1>
          <p className="text-gray-600">제출된 캠페인을 검토하고 승인/거부할 수 있습니다.</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setFilter('pending_approval')}
            variant={filter === 'pending_approval' ? 'default' : 'outline'}
          >
            <Clock className="w-4 h-4 mr-2" />
            승인 대기 중
          </Button>
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
          >
            전체 캠페인
          </Button>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">
              {filter === 'pending_approval' 
                ? '승인 대기 중인 캠페인이 없습니다.' 
                : '캠페인이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{campaign.title}</h3>
                      {getStatusBadge(campaign.status)}
                      <span className="text-2xl">{getRegionFlag(campaign.region)}</span>
                    </div>
                    <p className="text-gray-600 mb-2">{campaign.brand}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{campaign.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">보상 금액:</span>
                    <span className="ml-2 font-medium">
                      {campaign.region === 'japan' ? '¥' : campaign.region === 'us' ? '$' : '₩'}
                      {campaign.reward_amount?.toLocaleString() || '미정'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">최대 참가자:</span>
                    <span className="ml-2 font-medium">{campaign.max_participants || '미정'}명</span>
                  </div>
                  <div>
                    <span className="text-gray-500">모집 마감:</span>
                    <span className="ml-2 font-medium">
                      {campaign.application_deadline 
                        ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR')
                        : '미정'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">생성일:</span>
                    <span className="ml-2 font-medium">
                      {new Date(campaign.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {/* Guide Status */}
                {campaign.campaign_guides && campaign.campaign_guides.length > 0 ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">가이드 작성 완료</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">가이드 미작성</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/review`)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    상세 보기
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

