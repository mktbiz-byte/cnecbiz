import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  X,
  Edit,
  Trash2,
  PlayCircle
} from 'lucide-react'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminCampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'
  
  const [campaign, setCampaign] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchCampaignDetail()
    fetchApplications()
  }, [id, region])

  const checkAuth = async () => {
    try {
      if (!supabaseBiz) return

      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      if (userError || !user) return

      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (adminError || !adminData) return

      setIsSuperAdmin(adminData.role === 'super_admin')
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }

  const fetchCampaignDetail = async () => {
    try {
      const client = getSupabaseClient(region)
      if (!client) {
        console.error('No Supabase client for region:', region)
        return
      }

      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      // 지역별 스키마 차이를 통일된 형식으로 매핑
      const normalizedCampaign = {
        ...data,
        region,
        // 제목 통일
        campaign_name: data.title || data.product_name || data.campaign_name || '제목 없음',
        // 예산 계산
        budget: data.estimated_cost || (data.reward_amount && data.max_participants 
          ? data.reward_amount * data.max_participants 
          : data.budget || 0),
        // 크리에이터 수
        creator_count: data.total_slots || data.max_participants || data.creator_count || 0,
        // 날짜 필드 통일
        application_deadline: data.application_deadline || data.recruitment_deadline,
        // 통화 단위
        currency: {
          'korea': '₩',
          'japan': '¥',
          'us': '$',
          'taiwan': 'NT$',
          'biz': '₩'
        }[region] || '₩'
      }
      
      setCampaign(normalizedCampaign)
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const client = getSupabaseClient(region)
      if (!client) return

      const { data, error } = await client
        .from('applications')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const handleStatusChange = async (newStatus) => {
    const statusLabels = {
      draft: '임시',
      active: '활성',
      paused: '중단',
      completed: '완료'
    }

    if (!confirm(`캠페인 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setCampaign({ ...campaign, status: newStatus })
      alert(`캠페인 상태가 "${statusLabels[newStatus]}"로 변경되었습니다!`)
      window.location.reload()
    } catch (error) {
      console.error('Error changing status:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    if (!confirm('⚠️ 최종 확인: 캠페인과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      navigate(`/admin/campaigns?region=${region}`)
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      approved: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      virtual_selected: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      selected: { label: '선정 완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-700', icon: XCircle },
      completed: { label: '완료', color: 'bg-blue-100 text-blue-700', icon: CheckCircle }
    }
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    )
  }

  const getRegionLabel = (region) => {
    const labels = {
      korea: '🇰🇷 한국',
      japan: '🇯🇵 일본',
      us: '🇺🇸 미국',
      taiwan: '🇹🇼 대만',
      biz: '🌐 Biz'
    }
    return labels[region] || region
  }

  // 상태별로 applications 분류
  const pendingApplications = applications.filter(app => app.status === 'pending')
  const selectedApplications = applications.filter(app => 
    ['approved', 'virtual_selected', 'selected'].includes(app.status)
  )
  const completedApplications = applications.filter(app => app.status === 'completed')
  const rejectedApplications = applications.filter(app => app.status === 'rejected')

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-800 mb-2">캠페인을 찾을 수 없습니다</p>
            <Button onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/campaigns')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
                <p className="text-gray-600 mt-1">{getRegionLabel(region)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate(`/admin/campaigns/${id}/edit?region=${region}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              {isSuperAdmin && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </div>

          {/* 상태 변경 버튼 (슈퍼 관리자만) */}
          {isSuperAdmin && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  {campaign.status === 'draft' && <Clock className="w-5 h-5" />}
                  {campaign.status === 'active' && <PlayCircle className="w-5 h-5" />}
                  {campaign.status === 'paused' && <XCircle className="w-5 h-5" />}
                  {campaign.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                  캠페인 상태 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm text-gray-600 mb-2">현재 상태</div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {campaign.status === 'draft' && <><Clock className="w-4 h-4" /> 임시</>}
                      {campaign.status === 'active' && <><PlayCircle className="w-4 h-4" /> 활성</>}
                      {campaign.status === 'paused' && <><XCircle className="w-4 h-4" /> 중단</>}
                      {campaign.status === 'completed' && <><CheckCircle className="w-4 h-4" /> 완료</>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleStatusChange('draft')}
                      disabled={campaign.status === 'draft'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      임시
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('active')}
                      disabled={campaign.status === 'active'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlayCircle className="w-4 h-4" />
                      활성
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('paused')}
                      disabled={campaign.status === 'paused'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <XCircle className="w-4 h-4" />
                      중단
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={campaign.status === 'completed'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      완료
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 캠페인 기본 정보 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>캠페인 정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">브랜드</div>
                  <div className="font-semibold text-lg">{campaign.brand || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">예산</div>
                  <div className="font-semibold text-lg text-blue-600">
                    {campaign.currency}{campaign.budget?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">모집 인원</div>
                  <div className="font-semibold text-lg">{campaign.creator_count}명</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">상태</div>
                  <div>{getStatusBadge(campaign.approval_status || campaign.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                <div>
                  <div className="text-sm text-gray-500 mb-1">모집 마감일</div>
                  <div className="font-medium">
                    {campaign.application_deadline 
                      ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">캠페인 시작일</div>
                  <div className="font-medium">
                    {campaign.start_date 
                      ? new Date(campaign.start_date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">캠페인 종료일</div>
                  <div className="font-medium">
                    {campaign.end_date 
                      ? new Date(campaign.end_date).toLocaleDateString('ko-KR', { 
                          year: 'numeric', month: 'numeric', day: 'numeric' 
                        }).replace(/\. /g, '. ')
                      : '-'
                    }
                  </div>
                </div>
              </div>

              {campaign.description && (
                <div className="mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-500 mb-2">캠페인 설명</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{campaign.description}</div>
                </div>
              )}

              {campaign.requirements && (
                <div className="mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-500 mb-2">요구사항</div>
                  <div className="text-gray-800 whitespace-pre-wrap">{campaign.requirements}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">총 지원자</div>
                    <div className="text-3xl font-bold">{applications.length}</div>
                  </div>
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">대기중</div>
                    <div className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</div>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">선정 완료</div>
                    <div className="text-3xl font-bold text-green-600">{selectedApplications.length}</div>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">완료</div>
                    <div className="text-3xl font-bold text-blue-600">{completedApplications.length}</div>
                  </div>
                  <CheckCircle className="w-10 h-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 크리에이터 목록 - 상태별 탭 */}
          <Card>
            <CardHeader>
              <CardTitle>크리에이터 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">전체 ({applications.length})</TabsTrigger>
                  <TabsTrigger value="pending">대기중 ({pendingApplications.length})</TabsTrigger>
                  <TabsTrigger value="selected">선정 완료 ({selectedApplications.length})</TabsTrigger>
                  <TabsTrigger value="completed">완료 ({completedApplications.length})</TabsTrigger>
                  <TabsTrigger value="rejected">거절됨 ({rejectedApplications.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <ApplicationList 
                    applications={applications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                  <ApplicationList 
                    applications={pendingApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="selected" className="mt-6">
                  <ApplicationList 
                    applications={selectedApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="completed" className="mt-6">
                  <ApplicationList 
                    applications={completedApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>

                <TabsContent value="rejected" className="mt-6">
                  <ApplicationList 
                    applications={rejectedApplications} 
                    getStatusBadge={getStatusBadge}
                    onViewDetails={setSelectedApplication}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 지원서 상세보기 모달 */}
      {selectedApplication && (
        <ApplicationDetailModal 
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          getStatusBadge={getStatusBadge}
        />
      )}
    </>
  )
}

// 크리에이터 목록 컴포넌트
function ApplicationList({ applications, getStatusBadge, onViewDetails }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>지원자가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <div key={app.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-semibold text-lg">
                  {app.applicant_name || app.creator_name || app.user_name || '크리에이터'}
                </h4>
                {getStatusBadge(app.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">전화번호:</span> {app.phone_number || app.phone || '-'}
                </div>
                <div>
                  <span className="font-medium">나이:</span> {app.age || '-'}
                </div>
                <div>
                  <span className="font-medium">지원일:</span>{' '}
                  {app.created_at 
                    ? new Date(app.created_at).toLocaleDateString('ko-KR')
                    : '-'
                  }
                </div>
                <div>
                  <span className="font-medium">인스타그램:</span>{' '}
                  {app.instagram_url ? (
                    <a 
                      href={app.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      링크
                    </a>
                  ) : '-'}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(app)}
              className="ml-4"
            >
              <Eye className="w-4 h-4 mr-2" />
              상세보기
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

// 지원서 상세보기 모달
function ApplicationDetailModal({ application, onClose, getStatusBadge }) {
  const searchParams = new URLSearchParams(window.location.search)
  const region = searchParams.get('region') || 'korea'
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fetchingStats, setFetchingStats] = useState(false)
  const [formData, setFormData] = useState({
    tracking_number: application.tracking_number || '',
    shipping_date: application.shipping_date ? new Date(application.shipping_date).toISOString().split('T')[0] : '',
    guide_url: application.guide_url || ''
  })

  const isSelected = ['approved', 'virtual_selected', 'selected'].includes(application.status)

  const handleSave = async () => {
    try {
      setSaving(true)
      const client = getSupabaseClient(region)
      
      const updateData = {
        tracking_number: formData.tracking_number || null,
        shipping_date: formData.shipping_date ? new Date(formData.shipping_date).toISOString() : null,
        guide_url: formData.guide_url || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await client
        .from('applications')
        .update(updateData)
        .eq('id', application.id)

      if (error) throw error

      alert('저장되었습니다')
      setEditing(false)
      window.location.reload() // 데이터 새로고침
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장 실패: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {application.applicant_name || application.creator_name || '크리에이터'}
            </h2>
            <div className="mt-2">{getStatusBadge(application.status)}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">이름:</span>
                <span className="ml-2 font-medium">
                  {application.applicant_name || application.creator_name || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">나이:</span>
                <span className="ml-2 font-medium">{application.age || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">전화번호:</span>
                <span className="ml-2 font-medium">{application.phone_number || application.phone || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">피부 타입:</span>
                <span className="ml-2 font-medium">{application.skin_type || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">주소:</span>
                <span className="ml-2 font-medium">
                  {application.postal_code && application.address 
                    ? `${application.postal_code} ${application.address}`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* SNS 정보 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">SNS 정보</h3>
            <div className="space-y-2 text-sm">
              {application.instagram_url && (
                <div>
                  <span className="text-gray-500">Instagram:</span>
                  <a 
                    href={application.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {application.instagram_url}
                  </a>
                </div>
              )}
              {application.youtube_url && (
                <div>
                  <span className="text-gray-500">YouTube:</span>
                  <a 
                    href={application.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {application.youtube_url}
                  </a>
                </div>
              )}
              {application.tiktok_url && (
                <div>
                  <span className="text-gray-500">TikTok:</span>
                  <a 
                    href={application.tiktok_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {application.tiktok_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 지원서 답변 */}
          <div>
            <h3 className="text-lg font-semibold mb-3">지원서 답변</h3>
            <div className="space-y-4">
              {application.answer_1 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 1</div>
                  <div className="text-gray-800">{application.answer_1}</div>
                </div>
              )}
              {application.answer_2 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 2</div>
                  <div className="text-gray-800">{application.answer_2}</div>
                </div>
              )}
              {application.answer_3 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 3</div>
                  <div className="text-gray-800">{application.answer_3}</div>
                </div>
              )}
              {application.answer_4 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">질문 4</div>
                  <div className="text-gray-800">{application.answer_4}</div>
                </div>
              )}
            </div>
          </div>

          {/* 추가 정보 */}
          {application.additional_info && (
            <div>
              <h3 className="text-lg font-semibold mb-3">추가 정보</h3>
              <div className="p-4 bg-gray-50 rounded-lg text-gray-800 whitespace-pre-wrap">
                {application.additional_info}
              </div>
            </div>
          )}

          {/* 오프라인 방문 */}
          {application.offline_visit_available !== null && (
            <div>
              <h3 className="text-lg font-semibold mb-3">오프라인 방문</h3>
              <div className="text-sm">
                <span className="text-gray-500">가능 여부:</span>
                <span className="ml-2 font-medium">
                  {application.offline_visit_available ? '가능' : '불가능'}
                </span>
                {application.offline_visit_notes && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg text-gray-800">
                    {application.offline_visit_notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 배송 및 가이드 정보 (선정 완료된 크리에이터만) */}
          {isSelected && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">배송 및 가이드 정보</h3>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    편집
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false)
                        setFormData({
                          tracking_number: application.tracking_number || '',
                          shipping_date: application.shipping_date ? new Date(application.shipping_date).toISOString().split('T')[0] : '',
                          guide_url: application.guide_url || ''
                        })
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    송장번호
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.tracking_number}
                      onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
                      placeholder="송장번호를 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.tracking_number || '-'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    발송일
                  </label>
                  {editing ? (
                    <input
                      type="date"
                      value={formData.shipping_date}
                      onChange={(e) => setFormData({...formData, shipping_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.shipping_date 
                        ? new Date(application.shipping_date).toLocaleDateString('ko-KR')
                        : '-'
                      }
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가이드 URL
                  </label>
                  {editing ? (
                    <input
                      type="url"
                      value={formData.guide_url}
                      onChange={(e) => setFormData({...formData, guide_url: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {application.guide_url ? (
                        <a
                          href={application.guide_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {application.guide_url}
                        </a>
                      ) : '-'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 업로드된 영상 */}
          {application.video_links && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">업로드된 영상</h3>
                {(typeof application.video_links === 'string' && (application.video_links.includes('youtube.com') || application.video_links.includes('youtu.be'))) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setFetchingStats(true)
                      try {
                        const response = await fetch('/.netlify/functions/fetch-youtube-stats', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            application_id: application.id,
                            region: region,
                            video_url: application.video_links
                          })
                        })
                        
                        const data = await response.json()
                        
                        if (response.ok) {
                          alert('통계가 업데이트되었습니다')
                          window.location.reload()
                        } else {
                          alert('오류: ' + (data.error || 'Unknown error'))
                        }
                      } catch (error) {
                        console.error('Error fetching stats:', error)
                        alert('통계 업데이트 실패: ' + error.message)
                      } finally {
                        setFetchingStats(false)
                      }
                    }}
                    disabled={fetchingStats}
                  >
                    {fetchingStats ? '업데이트 중...' : '통계 업데이트'}
                  </Button>
                ) : null}
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <a
                  href={application.video_links}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  {application.video_links}
                </a>
              </div>
              
              {/* YouTube 통계 */}
              {application.youtube_stats && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">조회수</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.viewCount?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">좋아요</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.likeCount?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-500 mb-1">댓글</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {application.youtube_stats.commentCount?.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              
              {application.stats_updated_at && (
                <div className="mt-2 text-xs text-gray-500">
                  마지막 업데이트: {new Date(application.stats_updated_at).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <Button onClick={onClose} className="w-full">
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
