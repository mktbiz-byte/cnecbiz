import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, Search, ArrowLeft, Eye, Ban, CheckCircle } from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CompaniesManagement() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

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
      .from('admins')
      .select('*')
      .eq('email', user.email)
      .eq('is_active', true)
      .single()

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-2">전체 기업</div>
              <div className="text-3xl font-bold">{companies.length}</div>
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
                        <div className="col-span-2">
                          <span className="font-medium">가입일:</span>{' '}
                          {new Date(company.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        상세보기
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
  )
}

