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
        color: 'bg-[rgba(253,203,110,0.15)] text-[#E17055]',
        icon: Clock
      },
      sent: {
        text: '발송됨',
        color: 'bg-[#F0EDFF] text-[#6C5CE7]',
        icon: Send
      },
      signed: {
        text: '서명완료',
        color: 'bg-[rgba(0,184,148,0.1)] text-[#00B894]',
        icon: CheckCircle
      },
      expired: {
        text: '만료',
        color: 'bg-[rgba(255,107,107,0.1)] text-[#FF6B6B]',
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
      <div className="min-h-screen bg-[#F8F9FA] lg:ml-64 pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl lg:text-4xl font-bold text-[#1A1A2E]">
              계약서 관리
            </h1>
            <p className="text-sm lg:text-base text-[#636E72] mt-1">크리에이터와의 계약서를 관리하세요</p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <Card className="bg-white border border-[#DFE6E9] rounded-2xl">
              <CardContent className="pt-4 lg:pt-6">
                <div className="text-center">
                  <p className="text-xs lg:text-sm text-[#636E72]">전체</p>
                  <p className="text-2xl lg:text-3xl font-bold text-[#6C5CE7] font-['Outfit'] mt-1 lg:mt-2">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#DFE6E9] rounded-2xl">
              <CardContent className="pt-4 lg:pt-6">
                <div className="text-center">
                  <p className="text-xs lg:text-sm text-[#636E72]">발송됨</p>
                  <p className="text-2xl lg:text-3xl font-bold text-[#6C5CE7] font-['Outfit'] mt-1 lg:mt-2">{stats.sent}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#DFE6E9] rounded-2xl">
              <CardContent className="pt-4 lg:pt-6">
                <div className="text-center">
                  <p className="text-xs lg:text-sm text-[#636E72]">서명완료</p>
                  <p className="text-2xl lg:text-3xl font-bold text-[#6C5CE7] font-['Outfit'] mt-1 lg:mt-2">{stats.signed}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border border-[#DFE6E9] rounded-2xl">
              <CardContent className="pt-4 lg:pt-6">
                <div className="text-center">
                  <p className="text-xs lg:text-sm text-[#636E72]">만료</p>
                  <p className="text-2xl lg:text-3xl font-bold text-[#6C5CE7] font-['Outfit'] mt-1 lg:mt-2">{stats.expired}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 테스트 계약서 발송 */}
          <Card className="mb-6 bg-white border border-[#DFE6E9] rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>테스트 계약서 발송</CardTitle>
                <Button onClick={() => setShowTestForm(!showTestForm)} className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white">
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
                <Button onClick={handleSendTestContract} disabled={sending} className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white">
                  {sending ? '발송 중...' : '테스트 계약서 발송'}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* 계약서 목록 */}
          <Card className="bg-white border border-[#DFE6E9] rounded-2xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-base lg:text-lg">계약서 목록</CardTitle>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#B2BEC3]" />
                  <Input
                    placeholder="계약서 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all" className="text-xs lg:text-sm">전체</TabsTrigger>
                  <TabsTrigger value="sent" className="text-xs lg:text-sm">발송됨</TabsTrigger>
                  <TabsTrigger value="signed" className="text-xs lg:text-sm">서명완료</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs lg:text-sm">만료</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs lg:text-sm">대기</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4 lg:mt-6">
                  {loading ? (
                    <div className="text-center py-12">
                      <p className="text-[#636E72]">로딩 중...</p>
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className="text-center py-12">
                      <FileSignature className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 text-[#B2BEC3]" />
                      <p className="text-[#636E72]">계약서가 없습니다.</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="block lg:hidden space-y-3">
                        {filteredContracts.map((contract) => {
                          const statusBadge = getStatusBadge(contract.status)
                          const StatusIcon = statusBadge.icon
                          return (
                            <div key={contract.id} className="border border-[#DFE6E9] rounded-2xl p-4 bg-white overflow-hidden">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{contract.title}</p>
                                  <p className="text-xs text-[#636E72] mt-1">{getContractTypeName(contract.contract_type)}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ml-2 flex-shrink-0 ${statusBadge.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {statusBadge.text}
                                </span>
                              </div>
                              {contract.campaigns?.title && (
                                <p className="text-xs text-[#636E72] mb-2 truncate">캠페인: {contract.campaigns.title}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-[#B2BEC3]">
                                <span>만료: {new Date(contract.expires_at).toLocaleDateString('ko-KR')}</span>
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
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-[#F8F9FA]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">유형</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">제목</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">캠페인</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">상태</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">발송일</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">서명일</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">만료일</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[#636E72] uppercase">작업</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-[#DFE6E9]">
                            {filteredContracts.map((contract) => {
                              const statusBadge = getStatusBadge(contract.status)
                              const StatusIcon = statusBadge.icon
                              return (
                                <tr key={contract.id} className="hover:bg-[#F8F9FA]">
                                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    {getContractTypeName(contract.contract_type)}
                                  </td>
                                  <td className="px-4 py-4 text-sm max-w-[200px]">
                                    <span className="block truncate">{contract.title}</span>
                                  </td>
                                  <td className="px-4 py-4 text-sm max-w-[200px]">
                                    <span className="block truncate">{contract.campaigns?.title || '-'}</span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusBadge.color}`}>
                                      <StatusIcon className="w-3 h-3" />
                                      {statusBadge.text}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-[#636E72]">
                                    {contract.sent_at ? new Date(contract.sent_at).toLocaleDateString('ko-KR') : '-'}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-[#636E72]">
                                    {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('ko-KR') : '-'}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-[#636E72]">
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
                    </>
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

