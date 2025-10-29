import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileSignature, Send, Eye, Download, Clock, 
  CheckCircle, XCircle, Plus, Search
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import CompanyNavigation from './CompanyNavigation'

export default function ContractManagement() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // 테스트 계약서 발송
  const [showTestForm, setShowTestForm] = useState(false)
  const [testContract, setTestContract] = useState({
    creatorEmail: '',
    creatorName: '',
    title: '크리에이터 콘텐츠 2차 활용 계약서'
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user) {
      fetchContracts()
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabaseBiz.auth.getUser()
      if (!authUser) {
        navigate('/login')
        return
      }
      setUser(authUser)
    } catch (error) {
      console.error('인증 확인 오류:', error)
      navigate('/login')
    }
  }

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseBiz
        .from('contracts')
        .select(`
          *,
          campaigns(title)
        `)
        .eq('company_id', user.id)
        .order('created_at', { ascending: false })

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

  const getContractTypeName = (type) => {
    return type === 'campaign' ? '캠페인 계약서' : '초상권 동의서'
  }

  const handleSendTestContract = async () => {
    if (!testContract.creatorEmail || !testContract.creatorName) {
      alert('크리에이터 이메일과 이름을 입력해주세요.')
      return
    }

    try {
      setSending(true)

      // 계약서 HTML 생성 (간단한 테스트용)
      const contractHTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.8; }
    h1 { text-align: center; font-size: 24px; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .parties { display: flex; justify-content: space-between; margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .party { flex: 1; }
    .party-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
    .section { margin: 30px 0; }
    .article { margin: 20px 0; }
    .article-title { font-weight: bold; margin-bottom: 10px; color: #2563eb; }
    .signature-area { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }
    .signature-box { flex: 1; text-align: center; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>크리에이터 콘텐츠 2차 활용 계약서 (테스트)</h1>
  
  <div class="parties">
    <div class="party">
      <div class="party-title">갑 (기업)</div>
      <div>상호: 테스트 기업</div>
      <div>대표자: 홍길동</div>
    </div>
    <div class="party">
      <div class="party-title">을 (크리에이터)</div>
      <div>성명: ${testContract.creatorName}</div>
      <div>이메일: ${testContract.creatorEmail}</div>
    </div>
  </div>

  <div class="section">
    <div class="article">
      <div class="article-title">제1조 (목적)</div>
      <p>본 계약은 을이 제작한 콘텐츠를 갑이 2차적으로 활용하는 것에 관한 권리와 의무를 정함을 목적으로 한다.</p>
    </div>

    <div class="article">
      <div class="article-title">제2조 (계약 기간)</div>
      <p>계약 기간: ${new Date().toLocaleDateString('ko-KR')} ~ ${new Date(Date.now() + 365*24*60*60*1000).toLocaleDateString('ko-KR')}</p>
    </div>

    <div class="article">
      <div class="article-title">제3조 (2차 활용 범위)</div>
      <p>갑은 원본 콘텐츠를 다음의 목적으로 2차 활용할 수 있다:</p>
      <ul>
        <li>자사 웹사이트 및 SNS 채널에 게시</li>
        <li>마케팅 및 홍보 자료로 활용</li>
        <li>광고 소재로 활용</li>
      </ul>
    </div>

    <div class="article">
      <div class="article-title">제4조 (대가)</div>
      <p>갑은 을에게 2차 활용에 대한 대가로 1,000,000원을 지급한다.</p>
    </div>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <div style="font-weight: bold; margin-bottom: 20px;">갑 (기업)</div>
      <div style="height: 80px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; color: #999;">
        회사 도장
      </div>
      <div style="margin-top: 10px;">테스트 기업</div>
    </div>
    <div class="signature-box">
      <div style="font-weight: bold; margin-bottom: 20px;">을 (크리에이터)</div>
      <div style="height: 80px; border: 2px dashed #ddd; display: flex; align-items: center; justify-content: center; color: #999;">
        서명란
      </div>
      <div style="margin-top: 10px;">${testContract.creatorName}</div>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; padding: 20px; background: #fef3c7; border-radius: 8px;">
    <p style="font-weight: bold; margin-bottom: 10px;">📌 테스트 계약서입니다</p>
    <p style="font-size: 14px;">실제 계약서가 아니므로 법적 효력이 없습니다.</p>
  </div>
</body>
</html>
      `

      // 계약서 생성 API 호출
      const response = await fetch('/.netlify/functions/create-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType: 'campaign',
          campaignId: null,
          creatorEmail: testContract.creatorEmail,
          creatorName: testContract.creatorName,
          companyId: user.id,
          title: testContract.title,
          content: contractHTML,
          companySignatureUrl: 'https://via.placeholder.com/150x150?text=Company+Seal'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      alert(`테스트 계약서가 ${testContract.creatorEmail}로 발송되었습니다!`)
      setShowTestForm(false)
      setTestContract({
        creatorEmail: '',
        creatorName: '',
        title: '크리에이터 콘텐츠 2차 활용 계약서'
      })
      fetchContracts()

    } catch (error) {
      console.error('계약서 발송 오류:', error)
      alert('계약서 발송에 실패했습니다: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const filteredContracts = contracts.filter(contract => {
    if (activeTab !== 'all' && contract.status !== activeTab) return false
    if (searchTerm && !contract.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const stats = {
    total: contracts.length,
    sent: contracts.filter(c => c.status === 'sent').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    expired: contracts.filter(c => c.status === 'expired').length
  }

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 lg:ml-64">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              계약서 관리
            </h1>
            <p className="text-gray-600 mt-1">크리에이터와의 계약서를 관리하세요</p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">전체</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">발송됨</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.sent}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">서명완료</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.signed}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">만료</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{stats.expired}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 테스트 계약서 발송 */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>테스트 계약서 발송</CardTitle>
                <Button onClick={() => setShowTestForm(!showTestForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  테스트 발송
                </Button>
              </div>
            </CardHeader>
            {showTestForm && (
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">크리에이터 이메일</label>
                  <Input
                    type="email"
                    placeholder="creator@example.com"
                    value={testContract.creatorEmail}
                    onChange={(e) => setTestContract({ ...testContract, creatorEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">크리에이터 이름</label>
                  <Input
                    placeholder="홍길동"
                    value={testContract.creatorName}
                    onChange={(e) => setTestContract({ ...testContract, creatorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">계약서 제목</label>
                  <Input
                    value={testContract.title}
                    onChange={(e) => setTestContract({ ...testContract, title: e.target.value })}
                  />
                </div>
                <Button onClick={handleSendTestContract} disabled={sending} className="w-full">
                  {sending ? '발송 중...' : '테스트 계약서 발송'}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* 계약서 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>계약서 목록</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="계약서 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="sent">발송됨</TabsTrigger>
                  <TabsTrigger value="signed">서명완료</TabsTrigger>
                  <TabsTrigger value="expired">만료</TabsTrigger>
                  <TabsTrigger value="pending">대기</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">로딩 중...</p>
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-12">
                      <FileSignature className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">계약서가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">캠페인</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">발송일</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">서명일</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">만료일</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredContracts.map((contract) => {
                            const statusBadge = getStatusBadge(contract.status)
                            const StatusIcon = statusBadge.icon
                            return (
                              <tr key={contract.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  {getContractTypeName(contract.contract_type)}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  {contract.title}
                                </td>
                                <td className="px-4 py-4 text-sm">
                                  {contract.campaigns?.title || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusBadge.color}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusBadge.text}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {contract.sent_at ? new Date(contract.sent_at).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(contract.expires_at).toLocaleDateString('ko-KR')}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(`/sign-contract/${contract.id}`, '_blank')}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {contract.signed_contract_url && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(contract.signed_contract_url, '_blank')}
                                      >
                                        <Download className="w-4 h-4" />
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

