import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Users, CheckCircle, XCircle, Clock, Eye, ArrowLeft,
  Instagram, Youtube, Video, ExternalLink, MessageSquare
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function FeaturedCreatorApprovals() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // all, pending, approved, rejected
  const [selectedApp, setSelectedApp] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    checkAuth()
    fetchApplications()
  }, [filter])

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
      .from('admins')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchApplications = async () => {
    setLoading(true)
    try {
      let query = supabaseBiz
        .from('featured_creator_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (application) => {
    if (!confirm(`${application.creator_name}님의 프로필을 승인하시겠습니까?`)) {
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const { error } = await supabaseBiz
        .from('featured_creator_applications')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', application.id)

      if (error) throw error

      alert('승인되었습니다!')
      setShowDetail(false)
      setSelectedApp(null)
      setAdminNotes('')
      
      // 승인된 항목을 목록에서 제거
      setApplications(prev => prev.filter(app => app.id !== application.id))
      
      // 통계 업데이트를 위해 전체 목록 재조회
      fetchApplications()
    } catch (error) {
      console.error('Error approving:', error)
      alert('승인 실패: ' + error.message)
    }
  }

  const handleReject = async (application) => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요')
      return
    }

    if (!confirm(`${application.creator_name}님의 프로필을 거절하시겠습니까?`)) {
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const { error } = await supabaseBiz
        .from('featured_creator_applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          admin_notes: adminNotes || null
        })
        .eq('id', application.id)

      if (error) throw error

      alert('거절되었습니다')
      setShowDetail(false)
      setSelectedApp(null)
      setRejectionReason('')
      setAdminNotes('')
      
      // 거절된 항목을 목록에서 제거
      setApplications(prev => prev.filter(app => app.id !== application.id))
      
      // 통계 업데이트를 위해 전체 목록 재조회
      fetchApplications()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('거절 실패: ' + error.message)
    }
  }

  const openDetail = (app) => {
    setSelectedApp(app)
    setRejectionReason(app.rejection_reason || '')
    setAdminNotes(app.admin_notes || '')
    setShowDetail(true)
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: '작성중', color: 'bg-gray-100 text-gray-700' },
      pending: { label: '승인대기', color: 'bg-yellow-100 text-yellow-700' },
      approved: { label: '승인됨', color: 'bg-green-100 text-green-700' },
      rejected: { label: '거절됨', color: 'bg-red-100 text-red-700' }
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              대시보드로 돌아가기
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">추천 크리에이터 승인 관리</h1>
              <p className="text-gray-600 mt-1">크리에이터 프로필 신청을 검토하고 승인합니다</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: '전체', icon: Users },
            { id: 'pending', label: '승인대기', icon: Clock },
            { id: 'approved', label: '승인됨', icon: CheckCircle },
            { id: 'rejected', label: '거절됨', icon: XCircle }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={filter === tab.id ? 'default' : 'outline'}
              onClick={() => setFilter(tab.id)}
              className="flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {applications.filter(a => tab.id === 'all' || a.status === tab.id).length}
              </span>
            </Button>
          ))}
        </div>

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>신청 목록 ({applications.length}개)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                로딩 중...
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>신청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{app.creator_name}</h3>
                          {getStatusBadge(app.status)}
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {app.final_bio || app.ai_generated_bio || '소개 없음'}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {(app.final_categories || app.ai_generated_categories || []).map((cat, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              {cat}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {app.instagram_url && (
                            <a
                              href={app.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-pink-600"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                          {app.youtube_url && (
                            <a
                              href={app.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-red-600"
                            >
                              <Youtube className="w-4 h-4" />
                              YouTube
                            </a>
                          )}
                          {app.tiktok_url && (
                            <a
                              href={app.tiktok_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-black"
                            >
                              <Video className="w-4 h-4" />
                              TikTok
                            </a>
                          )}
                        </div>

                        <div className="mt-3 text-sm text-gray-500">
                          <div className="flex gap-4">
                            <span>팔로워: {app.total_followers?.toLocaleString() || 0}</span>
                            <span>참여율: {app.avg_engagement_rate || 0}%</span>
                            <span>평균 조회수: {app.avg_views?.toLocaleString() || 0}</span>
                          </div>
                          <div className="mt-1">
                            신청일: {formatDate(app.submitted_at || app.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(app)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </Button>
                        
                        {app.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedApp(app)
                                handleApprove(app)
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDetail(app)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              거절
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {showDetail && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selectedApp.creator_name} 프로필 상세</h2>
                <Button variant="ghost" onClick={() => setShowDetail(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">상태</h3>
                  {getStatusBadge(selectedApp.status)}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-sm text-gray-600 mb-1">이메일</h3>
                    <p>{selectedApp.email}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-600 mb-1">연락처</h3>
                    <p>{selectedApp.phone || '-'}</p>
                  </div>
                </div>

                {/* SNS Links */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">SNS 계정</h3>
                  <div className="space-y-2">
                    {selectedApp.instagram_url && (
                      <a
                        href={selectedApp.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-pink-600 hover:underline"
                      >
                        <Instagram className="w-4 h-4" />
                        {selectedApp.instagram_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedApp.youtube_url && (
                      <a
                        href={selectedApp.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-red-600 hover:underline"
                      >
                        <Youtube className="w-4 h-4" />
                        {selectedApp.youtube_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedApp.tiktok_url && (
                      <a
                        href={selectedApp.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Video className="w-4 h-4" />
                        {selectedApp.tiktok_url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">크리에이터 소개</h3>
                  <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">
                    {selectedApp.final_bio || selectedApp.ai_generated_bio || '-'}
                  </p>
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">주요 강점</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.final_strengths || selectedApp.ai_generated_strengths || []).map((s, i) => (
                      <span key={i} className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">콘텐츠 카테고리</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedApp.final_categories || selectedApp.ai_generated_categories || []).map((c, i) => (
                      <span key={i} className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">타겟 오디언스</h3>
                  <p className="text-gray-800">
                    {selectedApp.final_target_audience || selectedApp.ai_generated_target_audience || '-'}
                  </p>
                </div>

                {/* Content Style */}
                <div>
                  <h3 className="font-medium text-sm text-gray-600 mb-2">콘텐츠 스타일</h3>
                  <p className="text-gray-800">
                    {selectedApp.final_content_style || selectedApp.ai_generated_content_style || '-'}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <h3 className="font-medium text-sm text-gray-600 mb-1">총 팔로워</h3>
                    <p className="text-2xl font-bold">{selectedApp.total_followers?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-600 mb-1">평균 참여율</h3>
                    <p className="text-2xl font-bold">{selectedApp.avg_engagement_rate || 0}%</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-600 mb-1">평균 조회수</h3>
                    <p className="text-2xl font-bold">{selectedApp.avg_views?.toLocaleString() || 0}</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">관리자 메모</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="내부용 메모 (크리에이터에게 보이지 않음)"
                    className="w-full px-4 py-3 border rounded-lg min-h-24"
                  />
                </div>

                {/* Rejection Reason (if rejecting) */}
                {selectedApp.status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-red-700">
                      거절 사유 (거절 시 필수)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="크리에이터에게 전달될 거절 사유를 입력하세요"
                      className="w-full px-4 py-3 border border-red-300 rounded-lg min-h-24"
                    />
                  </div>
                )}

                {/* Existing Rejection Reason */}
                {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                  <div>
                    <h3 className="font-medium text-sm text-red-600 mb-2">거절 사유</h3>
                    <p className="text-gray-800 bg-red-50 p-4 rounded-lg border border-red-200">
                      {selectedApp.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Review Info */}
                {selectedApp.reviewed_at && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    <p>검토 완료: {formatDate(selectedApp.reviewed_at)}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-4 pt-4 border-t">
                    <Button
                      onClick={() => handleApprove(selectedApp)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      승인하기
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedApp)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      거절하기
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

