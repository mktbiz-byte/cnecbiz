import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileSignature, Send, Eye, Download, Clock, 
  CheckCircle, XCircle, Plus, Search, Filter
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import { CompanyContractTemplate } from '../../templates/CompanyContractTemplate'
import { CreatorConsentTemplate } from '../../templates/CreatorConsentTemplate'

export default function AdminContractManagement() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewModal, setPreviewModal] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)

  // 새 계약서 발송 폼
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [contractType, setContractType] = useState('company') // company or creator
  const [newContract, setNewContract] = useState({
    recipientEmail: '',
    recipientName: '',
    companyName: '',
    title: '',
    data: {}
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [activeTab])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/admin/login')
        return
      }

      // 관리자 권한 확인
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      if (!adminData) {
        alert('관리자 권한이 없습니다.')
        navigate('/')
      }
    } catch (error) {
      console.error('인증 확인 오류:', error)
      navigate('/admin/login')
    }
  }

  const fetchContracts = async () => {
    try {
      setLoading(true)
      let query = supabaseBiz
        .from('contracts')
        .select(`
          *,
          campaigns(title),
          companies(company_name)
        `)
        .order('created_at', { ascending: false })

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab)
      }

      const { data, error } = await query

      if (error) throw error
      setContracts(data || [])
    } catch (error) {
      console.error('계약서 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        text: '대기', 
        color: 'bg-gray-100 text-gray-800',
        icon: Clock
      },
      sent: { 
        text: '발송됨', 
        color: 'bg-blue-100 text-blue-800',
        icon: Send
      },
      signed: { 
        text: '서명완료', 
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      },
      expired: { 
        text: '만료', 
        color: 'bg-red-100 text-red-800',
        icon: XCircle
      }
    }
    return badges[status] || badges.pending
  }

  const handlePreview = (contract) => {
    setSelectedContract(contract)
    
    // 계약서 타입에 따라 템플릿 생성
    let html = ''
    if (contract.contract_type === 'company') {
      html = CompanyContractTemplate(contract.contract_data || {})
    } else {
      html = CreatorConsentTemplate(contract.contract_data || {})
    }
    
    setPreviewContent(html)
    setPreviewModal(true)
  }

  const handleSendContract = async (contractId) => {
    if (!confirm('계약서를 발송하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('contracts')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', contractId)

      if (error) throw error

      alert('계약서가 발송되었습니다.')
      fetchContracts()
    } catch (error) {
      console.error('계약서 발송 오류:', error)
      alert('계약서 발송에 실패했습니다.')
    }
  }

  const handleCreateContract = async () => {
    if (!newContract.recipientEmail || !newContract.recipientName) {
      alert('수신자 정보를 입력해주세요.')
      return
    }

    if (contractType === 'company' && !newContract.companyName) {
      alert('회사명을 입력해주세요.')
      return
    }

    try {
      const contractData = {
        ...newContract.data,
        recipientName: newContract.recipientName,
        recipientEmail: newContract.recipientEmail,
        companyName: newContract.companyName || 'CNEC',
        date: new Date().toLocaleDateString('ko-KR')
      }

      const { error } = await supabaseBiz
        .from('contracts')
        .insert([{
          contract_type: contractType,
          recipient_email: newContract.recipientEmail,
          recipient_name: newContract.recipientName,
          title: newContract.title || (contractType === 'company' ? '크리에이터 섭외 계약서' : '콘텐츠 2차 활용 동의서'),
          contract_data: contractData,
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일 후
        }])

      if (error) throw error

      alert('계약서가 생성되었습니다.')
      setShowCreateForm(false)
      setNewContract({
        recipientEmail: '',
        recipientName: '',
        companyName: '',
        title: '',
        data: {}
      })
      fetchContracts()
    } catch (error) {
      console.error('계약서 생성 오류:', error)
      alert('계약서 생성에 실패했습니다.')
    }
  }

  const filteredContracts = contracts.filter(contract =>
    contract.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.companies?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <AdminNavigation />
      <div className="p-6 space-y-6 lg:ml-64 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">계약서 관리</h1>
            <p className="text-gray-600 mt-1">기업 및 크리에이터 계약서를 관리하세요</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            새 계약서 생성
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 계약서</p>
                  <p className="text-2xl font-bold mt-2">{contracts.length}</p>
                </div>
                <FileSignature className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">발송됨</p>
                  <p className="text-2xl font-bold mt-2 text-blue-600">
                    {contracts.filter(c => c.status === 'sent').length}
                  </p>
                </div>
                <Send className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">서명완료</p>
                  <p className="text-2xl font-bold mt-2 text-green-600">
                    {contracts.filter(c => c.status === 'signed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">대기중</p>
                  <p className="text-2xl font-bold mt-2 text-gray-600">
                    {contracts.filter(c => c.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 검색 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="수신자명, 이메일, 회사명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchContracts}>
                새로고침
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="pending">대기</TabsTrigger>
            <TabsTrigger value="sent">발송됨</TabsTrigger>
            <TabsTrigger value="signed">서명완료</TabsTrigger>
            <TabsTrigger value="expired">만료</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardContent className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">로딩 중...</p>
                  </div>
                ) : filteredContracts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    계약서가 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">수신자</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">작업</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredContracts.map((contract) => {
                          const badge = getStatusBadge(contract.status)
                          const Icon = badge.icon
                          return (
                            <tr key={contract.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  contract.contract_type === 'company' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {contract.contract_type === 'company' ? '기업용' : '크리에이터용'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="font-medium">{contract.recipient_name}</div>
                                <div className="text-gray-500 text-xs">{contract.recipient_email}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">{contract.title}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${badge.color}`}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {badge.text}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(contract.created_at).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreview(contract)}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    미리보기
                                  </Button>
                                  {contract.status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSendContract(contract.id)}
                                      className="text-blue-600 hover:bg-blue-50"
                                    >
                                      <Send className="w-4 h-4 mr-1" />
                                      발송
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 새 계약서 생성 모달 */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
              <CardHeader>
                <CardTitle>새 계약서 생성</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">계약서 유형</label>
                  <select
                    className="w-full p-3 border rounded-lg"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                  >
                    <option value="company">기업용 - 크리에이터 섭외 계약서</option>
                    <option value="creator">크리에이터용 - 콘텐츠 2차 활용 동의서</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">수신자 이름 *</label>
                  <Input
                    type="text"
                    value={newContract.recipientName}
                    onChange={(e) => setNewContract({ ...newContract, recipientName: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">수신자 이메일 *</label>
                  <Input
                    type="email"
                    value={newContract.recipientEmail}
                    onChange={(e) => setNewContract({ ...newContract, recipientEmail: e.target.value })}
                    placeholder="example@email.com"
                  />
                </div>

                {contractType === 'company' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">회사명 *</label>
                      <Input
                        type="text"
                        value={newContract.companyName}
                        onChange={(e) => setNewContract({ ...newContract, companyName: e.target.value })}
                        placeholder="(주)회사명"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">캠페인명</label>
                      <Input
                        type="text"
                        value={newContract.data?.campaignName || ''}
                        onChange={(e) => setNewContract({ 
                          ...newContract, 
                          data: { ...newContract.data, campaignName: e.target.value } 
                        })}
                        placeholder="캠페인 이름"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">계약서 제목</label>
                  <Input
                    type="text"
                    value={newContract.title}
                    onChange={(e) => setNewContract({ ...newContract, title: e.target.value })}
                    placeholder="자동 생성됩니다"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleCreateContract}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    생성
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewContract({
                        recipientEmail: '',
                        recipientName: '',
                        companyName: '',
                        title: '',
                        data: {}
                      })
                    }}
                    className="flex-1"
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 미리보기 모달 */}
        {previewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>계약서 미리보기</CardTitle>
                  <Button variant="outline" onClick={() => setPreviewModal(false)}>
                    닫기
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div 
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

