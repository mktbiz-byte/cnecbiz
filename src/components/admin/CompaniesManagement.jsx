import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, Search, Eye, Ban, CheckCircle, CreditCard, Plus, Minus, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function CompaniesManagement() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [pointsAction, setPointsAction] = useState('add') // 'add' or 'deduct'
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsReason, setPointsReason] = useState('')

  useEffect(() => {
    checkAuth()
    fetchCompanies()
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

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/admin/dashboard')
    }
  }

  const fetchCompanies = async () => {
    if (!supabaseBiz) return
    setLoading(true)

    try {
      const { data, error } = await supabaseBiz
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCompanies(data)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'

    try {
      const { error } = await supabaseBiz
        .from('companies')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      fetchCompanies()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('상태 변경 실패: ' + error.message)
    }
  }

  // 기업 계정 승인 (is_approved = true)
  const handleApproveCompany = async (company) => {
    if (company.is_approved === true) {
      alert('이미 승인된 기업입니다.')
      return
    }

    if (!confirm(`${company.company_name} 기업을 승인하시겠습니까?\n승인 후 캠페인 생성이 가능해집니다.`)) return

    try {
      const { error } = await supabaseBiz
        .from('companies')
        .update({ is_approved: true })
        .eq('id', company.id)

      if (error) throw error

      // 승인 알림 발송 (카카오톡 + 이메일)
      const approvalDate = new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })

      // 담당자 전화번호 (하이픈 제거)
      const phoneNumber = (company.contact_phone || company.manager_phone || company.phone || '').replace(/-/g, '')
      const contactEmail = company.contact_email || company.email

      // 카카오톡 알림톡 발송
      if (phoneNumber) {
        try {
          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: phoneNumber,
              receiverName: company.contact_name || company.company_name,
              templateCode: '025120000522',
              variables: {
                '회사명': company.company_name || '기업',
                '승인일시': approvalDate
              }
            })
          })
          console.log('✓ 기업 승인 알림톡 발송 완료')
        } catch (kakaoError) {
          console.error('알림톡 발송 실패:', kakaoError)
        }
      }

      // 이메일 발송
      if (contactEmail) {
        try {
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: contactEmail,
              subject: `[CNEC] ${company.company_name}님, 기업회원 가입이 승인되었습니다`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">CNEC BIZ</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">글로벌 인플루언서 마케팅 플랫폼</p>
                  </div>

                  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1f2937; margin-top: 0;">🎉 기업회원 가입 승인 완료</h2>

                    <p style="color: #4b5563; line-height: 1.6;">
                      안녕하세요, <strong>${company.company_name}</strong> 담당자님!<br><br>
                      CNEC 기업회원 가입이 승인되었습니다.
                    </p>

                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                      <h3 style="color: #1f2937; margin-top: 0; font-size: 16px;">📋 승인 정보</h3>
                      <ul style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px; list-style: none;">
                        <li><strong>회사명:</strong> ${company.company_name}</li>
                        <li><strong>승인일시:</strong> ${approvalDate}</li>
                      </ul>
                    </div>

                    <p style="color: #4b5563; line-height: 1.6;">
                      지금 바로 어드민에 로그인하여<br>
                      캠페인을 등록해보세요.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://cnecbiz.com/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">로그인 바로가기</a>
                    </div>

                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      ※ 본 메시지는 회원가입 신청에 따라 발송되었습니다.<br>
                      ※ 문의: cnec@cnecbiz.com
                    </p>
                  </div>

                  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>© 2025 CNEC BIZ. All rights reserved.</p>
                  </div>
                </div>
              `
            })
          })
          console.log('✓ 기업 승인 이메일 발송 완료')
        } catch (emailError) {
          console.error('이메일 발송 실패:', emailError)
        }
      }

      alert('기업 승인이 완료되었습니다!')
      fetchCompanies()
    } catch (error) {
      console.error('Error approving company:', error)
      alert('승인 실패: ' + error.message)
    }
  }

  const handleAdjustPoints = (company) => {
    setSelectedCompany(company)
    setShowPointsModal(true)
    setPointsAction('add')
    setPointsAmount('')
    setPointsReason('')
  }

  const handleSubmitPoints = async () => {
    if (!selectedCompany || !pointsAmount || !pointsReason) {
      alert('모든 필드를 입력해주세요')
      return
    }

    const amount = parseInt(pointsAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('유효한 포인트 금액을 입력해주세요')
      return
    }

    const currentPoints = selectedCompany.points_balance || 0
    const finalAmount = pointsAction === 'add' ? amount : -amount
    const newBalance = currentPoints + finalAmount

    if (newBalance < 0) {
      alert('포인트 잔액이 부족합니다')
      return
    }

    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      // 1. 포인트 잔액 업데이트
      const { error: updateError } = await supabaseBiz
        .from('companies')
        .update({ points_balance: newBalance })
        .eq('id', selectedCompany.id)

      if (updateError) throw updateError

      // 2. 포인트 거래 기록
      const { error: transactionError } = await supabaseBiz
        .from('points_transactions')
        .insert([{
          company_id: selectedCompany.id,
          amount: finalAmount,
          type: pointsAction === 'add' ? 'admin_grant' : 'admin_deduct',
          description: `[관리자 ${pointsAction === 'add' ? '추가' : '회수'}] ${pointsReason}`,
          admin_email: user?.email
        }])

      if (transactionError) throw transactionError

      alert(`포인트 ${pointsAction === 'add' ? '추가' : '회수'}가 완료되었습니다`)
      setShowPointsModal(false)
      fetchCompanies()
    } catch (error) {
      console.error('Error adjusting points:', error)
      alert('포인트 조정에 실패했습니다: ' + error.message)
    }
  }

  const filteredCompanies = companies.filter(company =>
    company.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.business_registration_number?.includes(searchTerm)
  )

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700'
    }
    const labels = {
      active: '활성',
      inactive: '비활성',
      suspended: '정지'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">기업 관리</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="기업명, 이메일, 사업자번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 기업</div>
              <div className="text-3xl font-bold">{companies.length}</div>
            </CardContent>
          </Card>
          <Card className={companies.filter(c => c.is_approved === false).length > 0 ? 'ring-2 ring-amber-400' : ''}>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                승인 대기
              </div>
              <div className="text-3xl font-bold text-amber-600">
                {companies.filter(c => c.is_approved === false).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">활성 기업</div>
              <div className="text-3xl font-bold text-green-600">
                {companies.filter(c => c.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">정지된 기업</div>
              <div className="text-3xl font-bold text-red-600">
                {companies.filter(c => c.status === 'suspended').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>기업 목록 ({filteredCompanies.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                {filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{company.company_name}</h3>
                        {getStatusBadge(company.status || 'active')}
                        {company.is_approved === false ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            승인대기
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            승인됨
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">이메일:</span> {company.email}
                        </div>
                        <div>
                          <span className="font-medium">담당자:</span> {company.contact_person || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">전화:</span> {company.phone || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">사업자번호:</span> {company.business_registration_number || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">가입일:</span>{' '}
                          {new Date(company.created_at).toLocaleDateString('ko-KR')}
                        </div>
                        <div>
                          <span className="font-medium">포인트 잔액:</span>{' '}
                          <span className="text-blue-600 font-bold">
                            {(company.points_balance || 0).toLocaleString()}P
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {company.is_approved === false && (
                        <Button
                          size="sm"
                          onClick={() => handleApproveCompany(company)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          계정 승인
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        상세보기
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdjustPoints(company)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        포인트 조정
                      </Button>
                      <Button
                        variant={company.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleToggleStatus(company.id, company.status || 'active')}
                      >
                        {company.status === 'active' ? (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            정지
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            활성화
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredCompanies.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다' : '등록된 기업이 없습니다'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Points Modal */}
      {showPointsModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold mb-4">포인트 조정</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">회사명</div>
              <div className="text-lg font-bold">{selectedCompany.company_name}</div>
              <div className="text-sm text-gray-600 mt-2">현재 포인트</div>
              <div className="text-2xl font-bold text-blue-600">
                {(selectedCompany.points_balance || 0).toLocaleString()}P
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">작업 종류</label>
                <div className="flex gap-2">
                  <Button
                    variant={pointsAction === 'add' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setPointsAction('add')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    포인트 추가
                  </Button>
                  <Button
                    variant={pointsAction === 'deduct' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setPointsAction('deduct')}
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    포인트 회수
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">포인트 금액</label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">사유</label>
                <Input
                  type="text"
                  placeholder="예: 테스트 포인트 회수"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSubmitPoints}>
                  {pointsAction === 'add' ? '추가' : '회수'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPointsModal(false)
                    setSelectedCompany(null)
                    setPointsAmount('')
                    setPointsReason('')
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

