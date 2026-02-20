import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSignature, Send, Eye, Download, Clock,
  CheckCircle, XCircle, Plus, Search, RefreshCw, Trash2,
  Video, Loader2, Users
} from 'lucide-react'
import { supabaseBiz, getSupabaseClient, getCampaignsFromAllRegions } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import { CompanyContractTemplate } from '../../templates/CompanyContractTemplate'
import { CreatorConsentTemplate } from '../../templates/CreatorConsentTemplate'
import { VideoSecondaryUseConsentTemplate } from '../../templates/VideoSecondaryUseConsentTemplate'

export default function AdminContractManagement() {
  const navigate = useNavigate()

  // 최상위 탭
  const [mainTab, setMainTab] = useState('contracts')

  // === 기존 계약서 관리 상태 ===
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewModal, setPreviewModal] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [selectedContract, setSelectedContract] = useState(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [contractType, setContractType] = useState('campaign')
  const [sendImmediately, setSendImmediately] = useState(true)
  const [newContract, setNewContract] = useState({
    recipientEmail: '', recipientName: '', companyName: '', title: '', data: {}
  })

  const [showResendModal, setShowResendModal] = useState(false)
  const [resendContract, setResendContract] = useState(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  // === 영상 2차 활용 동의서 상태 ===
  const [consentCampaigns, setConsentCampaigns] = useState([])
  const [consentCampaignsLoading, setConsentCampaignsLoading] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [campaignCreators, setCampaignCreators] = useState([])
  const [creatorsLoading, setCreatorsLoading] = useState(false)
  const [selectedCreatorIds, setSelectedCreatorIds] = useState([])
  const [consentPreviewHtml, setConsentPreviewHtml] = useState('')
  const [showConsentPreview, setShowConsentPreview] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (mainTab === 'contracts') {
      fetchContracts()
    } else if (mainTab === 'video_consent') {
      fetchConsentCampaigns()
    }
  }, [mainTab, activeTab])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: adminData } = await supabaseBiz
        .from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!adminData) { alert('관리자 권한이 없습니다.'); navigate('/') }
    } catch (error) {
      console.error('인증 확인 오류:', error)
      navigate('/admin/login')
    }
  }

  // =============================================
  // 기존 계약서 관리 함수들
  // =============================================
  const fetchContracts = async () => {
    try {
      setLoading(true)
      let query = supabaseBiz.from('contracts').select('*').order('created_at', { ascending: false })
      if (activeTab !== 'all') query = query.eq('status', activeTab)
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
      pending: { text: '대기', color: 'bg-gray-100 text-gray-800', icon: Clock },
      sent: { text: '발송됨', color: 'bg-blue-100 text-blue-800', icon: Send },
      signed: { text: '서명완료', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      expired: { text: '만료', color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    return badges[status] || badges.pending
  }

  const handlePreview = (contract) => {
    setSelectedContract(contract)
    let html = ''
    const contractData = contract.content ? JSON.parse(contract.content) : {}
    if (contract.contract_type === 'campaign') {
      html = CompanyContractTemplate(contractData)
    } else {
      html = CreatorConsentTemplate(contractData)
    }
    setPreviewContent(html)
    setPreviewModal(true)
  }

  const handleDownloadPDF = (contract) => {
    try {
      const contractData = contract.content ? JSON.parse(contract.content) : {}
      let html = ''
      if (contract.contract_type === 'campaign') {
        html = CompanyContractTemplate(contractData)
      } else {
        html = CreatorConsentTemplate(contractData)
      }
      openPrintWindow(html)
    } catch (error) {
      console.error('PDF 다운로드 오류:', error)
      alert('PDF 다운로드에 실패했습니다.')
    }
  }

  const openPrintWindow = (html) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => { printWindow.print() }, 500)
    } else {
      alert('팝업이 차단되어 PDF 다운로드를 할 수 없습니다. 팝업을 허용해주세요.')
    }
  }

  const handleSendContract = async (contractId) => {
    if (!confirm('계약서를 발송하시겠습니까?')) return
    try {
      const contract = contracts.find(c => c.id === contractId)
      if (!contract) throw new Error('계약서를 찾을 수 없습니다.')
      if (!contract.recipient_email) throw new Error('수신자 이메일이 없습니다.')

      const signUrl = `${window.location.origin}/sign-contract/${contractId}`
      const expiresAt = contract.expires_at
        ? new Date(contract.expires_at).toLocaleDateString('ko-KR')
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')

      const templateKey = contract.contract_type === 'campaign' ? 'contract_sign_request' : 'portrait_rights_sign_request'
      const emailResponse = await fetch('/.netlify/functions/send-template-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey, to: contract.recipient_email,
          variables: { recipientName: contract.recipient_name || contract.recipient_email, companyName: '크넥', contractTitle: contract.title || '계약서', signUrl, expiresAt }
        })
      })
      const emailResult = await emailResponse.json()
      if (!emailResult.success) throw new Error(emailResult.error || '이메일 발송에 실패했습니다.')

      await supabaseBiz.from('contracts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', contractId)
      alert('계약서가 이메일로 발송되었습니다.')
      fetchContracts()
    } catch (error) {
      console.error('계약서 발송 오류:', error)
      alert(`계약서 발송에 실패했습니다: ${error.message}`)
    }
  }

  const handleCreateContract = async () => {
    if (!newContract.recipientEmail || !newContract.recipientName) { alert('수신자 정보를 입력해주세요.'); return }
    if (contractType === 'campaign' && !newContract.companyName) { alert('회사명을 입력해주세요.'); return }

    try {
      const contractData = {
        ...newContract.data, recipientName: newContract.recipientName,
        recipientEmail: newContract.recipientEmail, companyName: newContract.companyName || 'CNEC',
        creatorName: newContract.recipientName, date: new Date().toLocaleDateString('ko-KR')
      }
      const contractTitle = newContract.title || (contractType === 'campaign' ? '크리에이터 섭외 계약서' : '콘텐츠 2차 활용 동의서')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const { data: createdContract, error } = await supabaseBiz.from('contracts')
        .insert([{
          contract_type: contractType, recipient_email: newContract.recipientEmail,
          recipient_name: newContract.recipientName, title: contractTitle,
          content: JSON.stringify(contractData), status: sendImmediately ? 'sent' : 'pending',
          sent_at: sendImmediately ? new Date().toISOString() : null, expires_at: expiresAt.toISOString()
        }]).select().single()
      if (error) throw error

      if (sendImmediately && createdContract) {
        const signUrl = `${window.location.origin}/sign-contract/${createdContract.id}`
        const templateKey = contractType === 'campaign' ? 'contract_sign_request' : 'portrait_rights_sign_request'
        const emailResponse = await fetch('/.netlify/functions/send-template-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateKey, to: newContract.recipientEmail,
            variables: { recipientName: newContract.recipientName, companyName: newContract.companyName || '크넥', contractTitle, signUrl, expiresAt: expiresAt.toLocaleDateString('ko-KR') }
          })
        })
        const emailResult = await emailResponse.json()
        if (!emailResult.success) {
          await supabaseBiz.from('contracts').update({ status: 'pending', sent_at: null }).eq('id', createdContract.id)
          alert(`계약서는 생성되었으나 이메일 발송에 실패했습니다: ${emailResult.error}`)
        } else { alert('계약서가 생성되고 이메일로 발송되었습니다.') }
      } else { alert('계약서가 생성되었습니다.') }

      setShowCreateForm(false)
      setNewContract({ recipientEmail: '', recipientName: '', companyName: '', title: '', data: {} })
      fetchContracts()
    } catch (error) {
      console.error('계약서 생성 오류:', error)
      alert(`계약서 생성에 실패했습니다: ${error.message || JSON.stringify(error)}`)
    }
  }

  const openResendModal = (contract) => { setResendContract(contract); setResendEmail(contract.recipient_email || ''); setShowResendModal(true) }

  const handleResendContract = async () => {
    if (!resendContract || !resendEmail) { alert('이메일을 입력해주세요.'); return }
    setResending(true)
    try {
      if (resendEmail !== resendContract.recipient_email) {
        const { error: updateError } = await supabaseBiz.from('contracts').update({ recipient_email: resendEmail }).eq('id', resendContract.id)
        if (updateError) throw updateError
      }
      const signUrl = `${window.location.origin}/sign-contract/${resendContract.id}`
      const expiresAt = resendContract.expires_at ? new Date(resendContract.expires_at).toLocaleDateString('ko-KR') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')
      const templateKey = resendContract.contract_type === 'campaign' ? 'contract_sign_request' : 'portrait_rights_sign_request'
      const emailResponse = await fetch('/.netlify/functions/send-template-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateKey, to: resendEmail, variables: { recipientName: resendContract.recipient_name || resendEmail, companyName: '크넥', contractTitle: resendContract.title || '계약서', signUrl, expiresAt } })
      })
      const emailResult = await emailResponse.json()
      if (!emailResult.success) throw new Error(emailResult.error || '이메일 발송에 실패했습니다.')
      await supabaseBiz.from('contracts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', resendContract.id)
      alert('계약서가 재발송되었습니다.')
      setShowResendModal(false); setResendContract(null); setResendEmail(''); fetchContracts()
    } catch (error) {
      console.error('계약서 재발송 오류:', error)
      alert(`계약서 재발송에 실패했습니다: ${error.message}`)
    } finally { setResending(false) }
  }

  const handleDeleteContract = async (contractId) => {
    if (!confirm('정말 이 계약서를 삭제하시겠습니까?\n삭제된 계약서는 복구할 수 없습니다.')) return
    try {
      const { error } = await supabaseBiz.from('contracts').delete().eq('id', contractId)
      if (error) throw error
      alert('계약서가 삭제되었습니다.'); fetchContracts()
    } catch (error) {
      console.error('계약서 삭제 오류:', error)
      alert(`계약서 삭제에 실패했습니다: ${error.message}`)
    }
  }

  const filteredContracts = contracts.filter(contract =>
    contract.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.companies?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // =============================================
  // 영상 2차 활용 동의서 함수들
  // =============================================
  const fetchConsentCampaigns = async () => {
    setConsentCampaignsLoading(true)
    try {
      // 모든 리전(biz, korea, japan, us, taiwan)에서 캠페인 조회
      const allCampaigns = await getCampaignsFromAllRegions()
      // 최신순 정렬
      allCampaigns.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      setConsentCampaigns(allCampaigns)
    } catch (error) {
      console.error('캠페인 조회 오류:', error)
    } finally {
      setConsentCampaignsLoading(false)
    }
  }

  const handleCampaignSelect = async (value) => {
    setSelectedCampaignId(value)
    setSelectedCreatorIds([])
    setCampaignCreators([])

    if (!value) {
      setSelectedCampaign(null)
      return
    }

    // value 형식: "region::campaignId"
    const [regionKey, campaignId] = value.split('::')
    const campaign = consentCampaigns.find(c => c.id === campaignId && c.region === regionKey)
    setSelectedCampaign(campaign)

    if (!campaign) return

    // 해당 캠페인의 크리에이터(선정된 참여자) 조회
    setCreatorsLoading(true)
    try {
      const region = campaign.region || 'biz'
      const client = getSupabaseClient(region)
      if (!client) return

      const { data: apps } = await client
        .from('applications')
        .select('id, user_id, applicant_name, status, sns_upload_url, final_confirmed_at, updated_at')
        .eq('campaign_id', campaignId)
        .in('status', ['approved', 'selected', 'virtual_selected', 'filming', 'video_submitted', 'revision_requested', 'guide_confirmation', 'guide_approved', 'sns_uploaded', 'completed'])

      if (apps && apps.length > 0) {
        // user_profiles에서 이름/채널 정보 가져오기
        const userIds = [...new Set(apps.map(a => a.user_id).filter(Boolean))]
        let profiles = []

        // 리전 DB에서 프로필 조회
        const { data: regionProfiles } = await client
          .from('user_profiles')
          .select('id, name, full_name, nickname, instagram_url, youtube_url, tiktok_url')
          .in('id', userIds)
        if (regionProfiles) profiles = regionProfiles

        // 리전 DB에서 못 찾은 유저는 BIZ DB에서 조회
        const foundIds = new Set(profiles.map(p => p.id))
        const missingIds = userIds.filter(uid => !foundIds.has(uid))
        if (missingIds.length > 0 && region !== 'biz') {
          const { data: bizProfiles } = await supabaseBiz
            .from('user_profiles')
            .select('id, name, full_name, nickname, instagram_url, youtube_url, tiktok_url')
            .in('id', missingIds)
          if (bizProfiles) profiles = [...profiles, ...bizProfiles]
        }

        const enriched = apps.map(app => {
          const profile = profiles?.find(p => p.id === app.user_id)
          const channelName = profile?.instagram_url || profile?.youtube_url || profile?.tiktok_url || ''
          // 검수 완료일 = final_confirmed_at > updated_at
          const reviewCompletedDate = app.final_confirmed_at || app.updated_at || ''
          return {
            id: app.id,
            user_id: app.user_id,
            name: profile?.nickname || profile?.name || profile?.full_name || app.applicant_name || '크리에이터',
            channelName: channelName ? channelName.replace(/https?:\/\/(www\.)?/i, '').replace(/\/$/, '') : '',
            snsUploadUrl: app.sns_upload_url || '',
            reviewCompletedDate,
            status: app.status
          }
        })
        setCampaignCreators(enriched)
      }
    } catch (error) {
      console.error('크리에이터 조회 오류:', error)
    } finally {
      setCreatorsLoading(false)
    }
  }

  const toggleCreatorSelection = (creatorId) => {
    setSelectedCreatorIds(prev =>
      prev.includes(creatorId) ? prev.filter(id => id !== creatorId) : [...prev, creatorId]
    )
  }

  const selectAllCreators = () => {
    if (selectedCreatorIds.length === campaignCreators.length) {
      setSelectedCreatorIds([])
    } else {
      setSelectedCreatorIds(campaignCreators.map(c => c.id))
    }
  }

  const generateConsentAndDownload = (creator) => {
    if (!selectedCampaign) return

    // 동의일 = 영상 검수 완료일 (없으면 오늘)
    const consentDate = creator.reviewCompletedDate
      ? new Date(creator.reviewCompletedDate).toLocaleDateString('ko-KR')
      : new Date().toLocaleDateString('ko-KR')

    const html = VideoSecondaryUseConsentTemplate({
      creatorName: creator.name,
      channelName: creator.channelName,
      snsUploadUrl: creator.snsUploadUrl || '',
      campaignTitle: selectedCampaign.campaign_name || selectedCampaign.title || '',
      companyName: selectedCampaign.brand_name || selectedCampaign.brand || '',
      videoCompletionDate: selectedCampaign.end_date || new Date().toISOString().split('T')[0],
      consentDate
    })

    openPrintWindow(html)
  }

  const generateConsentPreview = (creator) => {
    if (!selectedCampaign) return

    // 동의일 = 영상 검수 완료일 (없으면 오늘)
    const consentDate = creator.reviewCompletedDate
      ? new Date(creator.reviewCompletedDate).toLocaleDateString('ko-KR')
      : new Date().toLocaleDateString('ko-KR')

    const html = VideoSecondaryUseConsentTemplate({
      creatorName: creator.name,
      channelName: creator.channelName,
      snsUploadUrl: creator.snsUploadUrl || '',
      campaignTitle: selectedCampaign.campaign_name || selectedCampaign.title || '',
      companyName: selectedCampaign.brand_name || selectedCampaign.brand || '',
      videoCompletionDate: selectedCampaign.end_date || new Date().toISOString().split('T')[0],
      consentDate
    })

    setConsentPreviewHtml(html)
    setShowConsentPreview(true)
  }

  const downloadSelectedConsents = () => {
    if (selectedCreatorIds.length === 0) { alert('크리에이터를 선택해주세요.'); return }

    const selectedCreators = campaignCreators.filter(c => selectedCreatorIds.includes(c.id))
    selectedCreators.forEach((creator, index) => {
      setTimeout(() => {
        generateConsentAndDownload(creator)
      }, index * 800) // 팝업 차단 방지를 위해 간격 두기
    })
  }

  // =============================================
  // 렌더링
  // =============================================
  return (
    <>
      <AdminNavigation />
      <div className="p-6 space-y-6 lg:ml-64 min-h-screen bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">계약서 / 동의서 관리</h1>
            <p className="text-gray-600 mt-1">기업 계약서 및 영상 2차 활용 동의서를 관리하세요</p>
          </div>
        </div>

        {/* 최상위 탭 */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              계약서 관리
            </TabsTrigger>
            <TabsTrigger value="video_consent" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              영상 2차 활용 동의서
            </TabsTrigger>
          </TabsList>

          {/* ==================== 계약서 관리 탭 ==================== */}
          <TabsContent value="contracts" className="mt-6 space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                새 계약서 생성
              </Button>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">전체</p><p className="text-2xl font-bold mt-2">{contracts.length}</p></div><FileSignature className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">발송됨</p><p className="text-2xl font-bold mt-2 text-blue-600">{contracts.filter(c => c.status === 'sent').length}</p></div><Send className="w-8 h-8 text-blue-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">서명완료</p><p className="text-2xl font-bold mt-2 text-green-600">{contracts.filter(c => c.status === 'signed').length}</p></div><CheckCircle className="w-8 h-8 text-green-600" /></div></CardContent></Card>
              <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600">대기중</p><p className="text-2xl font-bold mt-2 text-gray-600">{contracts.filter(c => c.status === 'pending').length}</p></div><Clock className="w-8 h-8 text-gray-600" /></div></CardContent></Card>
            </div>

            {/* 검색 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input type="text" placeholder="수신자명, 이메일, 회사명으로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                  <Button variant="outline" onClick={fetchContracts}>새로고침</Button>
                </div>
              </CardContent>
            </Card>

            {/* 계약서 목록 탭 */}
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
                      <div className="text-center py-12"><Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" /><p className="text-gray-600 mt-4">로딩 중...</p></div>
                    ) : filteredContracts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">계약서가 없습니다.</div>
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
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${contract.contract_type === 'campaign' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                      {contract.contract_type === 'campaign' ? '기업용' : '크리에이터용'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm"><div className="font-medium">{contract.recipient_name}</div><div className="text-gray-500 text-xs">{contract.recipient_email}</div></td>
                                  <td className="px-4 py-3 text-sm">{contract.title}</td>
                                  <td className="px-4 py-3 text-sm"><span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${badge.color}`}><Icon className="w-3 h-3 mr-1" />{badge.text}</span></td>
                                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(contract.created_at).toLocaleDateString('ko-KR')}</td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button variant="outline" size="sm" onClick={() => handlePreview(contract)}><Eye className="w-4 h-4 mr-1" />미리보기</Button>
                                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(contract)} className="text-purple-600 hover:bg-purple-50"><Download className="w-4 h-4 mr-1" />PDF</Button>
                                      {contract.status === 'pending' && (<Button variant="outline" size="sm" onClick={() => handleSendContract(contract.id)} className="text-blue-600 hover:bg-blue-50"><Send className="w-4 h-4 mr-1" />발송</Button>)}
                                      {(contract.status === 'sent' || contract.status === 'expired') && (<Button variant="outline" size="sm" onClick={() => openResendModal(contract)} className="text-orange-600 hover:bg-orange-50"><RefreshCw className="w-4 h-4 mr-1" />재발송</Button>)}
                                      {contract.status !== 'signed' && (<Button variant="outline" size="sm" onClick={() => handleDeleteContract(contract.id)} className="text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>)}
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
          </TabsContent>

          {/* ==================== 영상 2차 활용 동의서 탭 ==================== */}
          <TabsContent value="video_consent" className="mt-6 space-y-6">
            {/* Step 1: 캠페인 선택 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-purple-600" />
                  영상 2차 활용 동의서 생성
                </CardTitle>
                <p className="text-sm text-gray-600">캠페인과 크리에이터를 선택하면 동의서가 생성됩니다. PDF로 다운로드하세요.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">1. 캠페인 선택</label>
                  {consentCampaignsLoading ? (
                    <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> 캠페인 목록 로딩 중...</div>
                  ) : (
                    <select
                      className="w-full p-3 border rounded-lg text-sm"
                      value={selectedCampaignId}
                      onChange={(e) => handleCampaignSelect(e.target.value)}
                    >
                      <option value="">캠페인을 선택하세요...</option>
                      {consentCampaigns.map(c => (
                        <option key={`${c.region}-${c.id}`} value={`${c.region}::${c.id}`}>
                          [{c.region?.toUpperCase()}] {c.campaign_name || c.title} {c.brand_name || c.brand ? `(${c.brand_name || c.brand})` : ''} {c.status === 'completed' ? ' ✓완료' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Step 2: 크리에이터 선택 */}
                {selectedCampaignId && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-900">2. 크리에이터 선택</label>
                      {campaignCreators.length > 0 && (
                        <Button variant="outline" size="sm" onClick={selectAllCreators}>
                          {selectedCreatorIds.length === campaignCreators.length ? '전체 해제' : '전체 선택'}
                        </Button>
                      )}
                    </div>

                    {creatorsLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 py-4"><Loader2 className="w-4 h-4 animate-spin" /> 크리에이터 목록 로딩 중...</div>
                    ) : campaignCreators.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        선정된 크리에이터가 없습니다.
                      </div>
                    ) : (
                      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                        {campaignCreators.map(creator => {
                          const isSelected = selectedCreatorIds.includes(creator.id)
                          return (
                            <div
                              key={creator.id}
                              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                              onClick={() => toggleCreatorSelection(creator.id)}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                                />
                                <div>
                                  <div className="font-medium text-sm">{creator.name}</div>
                                  {creator.channelName && (
                                    <div className="text-xs text-gray-500">{creator.channelName}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  creator.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  creator.status === 'sns_uploaded' ? 'bg-purple-100 text-purple-700' :
                                  creator.status === 'video_submitted' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {creator.status === 'completed' ? '완료' :
                                   creator.status === 'sns_uploaded' ? 'SNS 업로드' :
                                   creator.status === 'video_submitted' ? '영상 제출' :
                                   creator.status === 'filming' ? '촬영중' :
                                   creator.status === 'approved' || creator.status === 'selected' ? '선정' :
                                   creator.status}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); generateConsentPreview(creator) }}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />미리보기
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); generateConsentAndDownload(creator) }}
                                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <Download className="w-3 h-3 mr-1" />PDF
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 선택된 크리에이터 일괄 다운로드 */}
                    {selectedCreatorIds.length > 0 && (
                      <div className="flex items-center justify-between mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800">
                          <strong>{selectedCreatorIds.length}명</strong> 선택됨
                        </p>
                        <Button
                          onClick={downloadSelectedConsents}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          선택한 {selectedCreatorIds.length}명 동의서 PDF 다운로드
                        </Button>
                      </div>
                    )}
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
              <CardHeader><CardTitle>새 계약서 생성</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">계약서 유형</label>
                  <select className="w-full p-3 border rounded-lg" value={contractType} onChange={(e) => setContractType(e.target.value)}>
                    <option value="campaign">기업용 - 크리에이터 섭외 계약서</option>
                    <option value="portrait_rights">크리에이터용 - 콘텐츠 2차 활용 동의서</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">수신자 이름 *</label>
                  <Input type="text" value={newContract.recipientName} onChange={(e) => setNewContract({ ...newContract, recipientName: e.target.value })} placeholder="홍길동" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">수신자 이메일 *</label>
                  <Input type="email" value={newContract.recipientEmail} onChange={(e) => setNewContract({ ...newContract, recipientEmail: e.target.value })} placeholder="example@email.com" />
                </div>
                {contractType === 'campaign' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">회사명 *</label>
                      <Input type="text" value={newContract.companyName} onChange={(e) => setNewContract({ ...newContract, companyName: e.target.value })} placeholder="(주)회사명" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">캠페인명</label>
                      <Input type="text" value={newContract.data?.campaignName || ''} onChange={(e) => setNewContract({ ...newContract, data: { ...newContract.data, campaignName: e.target.value } })} placeholder="캠페인 이름" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">계약서 제목</label>
                  <Input type="text" value={newContract.title} onChange={(e) => setNewContract({ ...newContract, title: e.target.value })} placeholder="자동 생성됩니다" />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="sendImmediately" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <label htmlFor="sendImmediately" className="text-sm text-gray-700">생성 시 바로 이메일로 발송</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleCreateContract} className="flex-1 bg-blue-600 hover:bg-blue-700">{sendImmediately ? '생성 및 발송' : '생성'}</Button>
                  <Button variant="outline" onClick={() => { setShowCreateForm(false); setNewContract({ recipientEmail: '', recipientName: '', companyName: '', title: '', data: {} }) }} className="flex-1">취소</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 계약서 미리보기 모달 */}
        {previewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>계약서 미리보기</CardTitle>
                  <Button variant="outline" onClick={() => setPreviewModal(false)}>닫기</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewContent }} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 동의서 미리보기 모달 */}
        {showConsentPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>영상 2차 활용 동의서 미리보기</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openPrintWindow(consentPreviewHtml)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />PDF 다운로드
                    </Button>
                    <Button variant="outline" onClick={() => setShowConsentPreview(false)}>닫기</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: consentPreviewHtml }} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 재발송 모달 */}
        {showResendModal && resendContract && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-white">
              <CardHeader><CardTitle>계약서 재발송</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">계약서: {resendContract.title}</p>
                  <p className="text-sm text-gray-600 mb-4">수신자: {resendContract.recipient_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">수신자 이메일 <span className="text-gray-500">(수정 가능)</span></label>
                  <Input type="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} placeholder="이메일 주소" />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleResendContract} disabled={resending || !resendEmail} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    {resending ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" />발송 중...</>) : (<><Send className="w-4 h-4 mr-2" />재발송</>)}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowResendModal(false); setResendContract(null); setResendEmail('') }} className="flex-1" disabled={resending}>취소</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
