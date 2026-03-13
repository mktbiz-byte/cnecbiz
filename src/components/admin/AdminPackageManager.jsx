import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package, Plus, Save, Trash2, Eye, EyeOff, Loader2,
  ChevronUp, ChevronDown, Copy, ExternalLink, Check, X,
  Users, Settings, FileText, GripVertical, Play, Search, Link, Mail, Send
} from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

const CATEGORY_OPTIONS = [
  '스킨케어', '메이크업', '헤어', '바디케어', '향수',
  '패션', '라이프스타일', '푸드', '테크', '기타'
]

const HIGHLIGHT_OPTIONS = [
  '조회수 TOP', '높은 전환율', '신규 인기', '꾸준한 성장', '높은 참여율'
]

const STATUS_LABELS = {
  pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인', color: 'bg-blue-100 text-blue-800' },
  campaign_created: { label: '캠페인 개설 완료', color: 'bg-green-100 text-green-800' },
  rejected: { label: '거절', color: 'bg-red-100 text-red-800' },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-600' },
}

export default function AdminPackageManager() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('settings')

  // Settings state
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    title: '크넥 10인 10색',
    subtitle: '',
    per_creator_price: 300000,
    total_creators: 20,
    discount_rate: 10,
    max_companies: 10,
    show_creator_count: 10,
    landing_description: '',
    deadline_date: '',
    is_active: false,
    display_remaining_slots: '',
    display_max_slots: '',
  })

  // Creators state
  const [creators, setCreators] = useState([])
  const [editingCreator, setEditingCreator] = useState(null)
  const [creatorForm, setCreatorForm] = useState({
    creator_name: '', display_name: '', category: '',
    avg_views: '', avg_views_number: 0, content_style: '',
    highlight: '', sample_video_url_1: '', sample_video_url_2: '',
    sample_video_url_3: '', youtube_channel_url: '', subscriber_count: '',
    is_visible_on_landing: false, is_available: true, display_order: 0,
    source_user_id: null, profile_image_url: '',
  })
  const [showCreatorForm, setShowCreatorForm] = useState(false)
  const [creatorSearch, setCreatorSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedSourceCreator, setSelectedSourceCreator] = useState(null)

  // Applications state
  const [applications, setApplications] = useState([])
  // creatingCampaign removed - companies create their own campaigns
  const [sendingInvitation, setSendingInvitation] = useState(null)

  // Auth check
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        navigate('/admin/login')
        return
      }
      await loadData()
    } catch (error) {
      console.error('Auth check error:', error)
      navigate('/admin/login')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load latest package setting
      const { data: settingsData } = await supabaseBiz
        .from('package_settings')
        .select('*')
        .order('month', { ascending: false })
        .limit(1)

      if (settingsData?.length > 0) {
        setSettings(settingsData[0])
        setSettingsForm({
          month: settingsData[0].month,
          title: settingsData[0].title || '크넥 10인 10색',
          subtitle: settingsData[0].subtitle || '',
          per_creator_price: settingsData[0].per_creator_price,
          total_creators: settingsData[0].total_creators,
          discount_rate: settingsData[0].discount_rate,
          max_companies: settingsData[0].max_companies,
          show_creator_count: settingsData[0].show_creator_count || 10,
          landing_description: settingsData[0].landing_description || '',
          deadline_date: settingsData[0].deadline_date ? settingsData[0].deadline_date.slice(0, 16) : '',
          is_active: settingsData[0].is_active,
          display_remaining_slots: settingsData[0].display_remaining_slots ?? '',
          display_max_slots: settingsData[0].display_max_slots ?? '',
        })

        // Load creators for this setting
        const { data: creatorsData } = await supabaseBiz
          .from('package_creators')
          .select('*')
          .eq('package_setting_id', settingsData[0].id)
          .order('display_order', { ascending: true })

        setCreators(creatorsData || [])

        // Load applications
        const { data: appsData } = await supabaseBiz
          .from('package_applications')
          .select('*')
          .eq('package_setting_id', settingsData[0].id)
          .order('created_at', { ascending: false })

        setApplications(appsData || [])
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      alert(`데이터 로드 실패: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ==================== Settings Tab ====================
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const payload = {
        ...settingsForm,
        deadline_date: settingsForm.deadline_date ? new Date(settingsForm.deadline_date).toISOString() : null,
        display_remaining_slots: settingsForm.display_remaining_slots !== '' ? parseInt(settingsForm.display_remaining_slots) : null,
        display_max_slots: settingsForm.display_max_slots !== '' ? parseInt(settingsForm.display_max_slots) : null,
      }

      if (settings) {
        // Update existing
        const { error } = await supabaseBiz
          .from('package_settings')
          .update(payload)
          .eq('id', settings.id)
        if (error) throw error
      } else {
        // Create new
        const { data, error } = await supabaseBiz
          .from('package_settings')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        setSettings(data)
      }
      alert('설정이 저장되었습니다.')
      await loadData()
    } catch (error) {
      console.error('설정 저장 실패:', error)
      alert(`저장 실패: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!settings) return
    try {
      const newActive = !settings.is_active
      const { error } = await supabaseBiz
        .from('package_settings')
        .update({ is_active: newActive })
        .eq('id', settings.id)
      if (error) throw error
      setSettings({ ...settings, is_active: newActive })
      setSettingsForm({ ...settingsForm, is_active: newActive })
      alert(newActive ? '패키지가 활성화되었습니다.' : '패키지가 비활성화되었습니다.')
    } catch (error) {
      alert(`토글 실패: ${error.message}`)
    }
  }

  const calculatePrice = () => {
    const total = settingsForm.per_creator_price * settingsForm.total_creators
    const discounted = total * (1 - settingsForm.discount_rate / 100)
    return { total, discounted }
  }

  // ==================== Creators Tab ====================

  // Korea DB 크리에이터 검색
  const handleCreatorSearch = async (term) => {
    setCreatorSearch(term)
    if (!term || term.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('user_profiles')
        .select('*')
        .or(`name.ilike.%${term}%,email.ilike.%${term}%,channel_name.ilike.%${term}%`)
        .limit(10)

      if (error) throw error
      // 정규화 (Korea DB 스키마 대응)
      const normalized = (data || []).map(c => ({
        ...c,
        name: c.name || c.creator_name || c.channel_name || c.full_name || null,
        youtube_url: c.youtube_url || c.youtube || c.youtube_handle || c.youtube_channel || c.youtube_id || null,
        youtube_subscribers: c.youtube_subscribers || c.youtube_subs || c.subscribers || 0,
        profile_image: c.profile_image || c.profile_image_url || c.avatar || c.avatar_url || c.photo || null,
      }))
      setSearchResults(normalized)
    } catch (error) {
      console.error('크리에이터 검색 실패:', error)
    } finally {
      setSearching(false)
    }
  }

  // 검색 결과에서 크리에이터 선택 → 폼 자동 채움
  const handleSelectSourceCreator = (creator) => {
    setSelectedSourceCreator(creator)
    setCreatorForm(prev => ({
      ...prev,
      creator_name: creator.name || '',
      youtube_channel_url: creator.youtube_url || '',
      subscriber_count: creator.youtube_subscribers ? String(creator.youtube_subscribers) : '',
      source_user_id: creator.id,
      profile_image_url: creator.profile_image || '',
    }))
    setSearchResults([])
    setCreatorSearch('')
  }

  const handleSaveCreator = async () => {
    if (!settings) {
      alert('먼저 패키지 설정을 저장해주세요.')
      return
    }
    if (!creatorForm.creator_name) {
      alert('크리에이터 이름은 필수입니다.')
      return
    }
    if (!editingCreator && creators.length >= 30) {
      alert('크리에이터는 최대 30명까지 등록 가능합니다.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...creatorForm,
        package_setting_id: settings.id,
        month: settings.month,
        display_order: editingCreator ? creatorForm.display_order : creators.length,
      }

      if (editingCreator) {
        const { error } = await supabaseBiz
          .from('package_creators')
          .update(payload)
          .eq('id', editingCreator.id)
        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('package_creators')
          .insert(payload)
        if (error) throw error
      }

      resetCreatorForm()
      await loadData()
    } catch (error) {
      alert(`크리에이터 저장 실패: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCreator = async (id) => {
    if (!confirm('이 크리에이터를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabaseBiz
        .from('package_creators')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      alert(`삭제 실패: ${error.message}`)
    }
  }

  const handleEditCreator = (creator) => {
    setEditingCreator(creator)
    if (creator.source_user_id) {
      setSelectedSourceCreator({ id: creator.source_user_id, name: creator.creator_name, profile_image: creator.profile_image_url })
    } else {
      setSelectedSourceCreator(null)
    }
    setCreatorForm({
      creator_name: creator.creator_name || '',
      display_name: creator.display_name || '',
      category: creator.category || '',
      avg_views: creator.avg_views || '',
      avg_views_number: creator.avg_views_number || 0,
      content_style: creator.content_style || '',
      highlight: creator.highlight || '',
      sample_video_url_1: creator.sample_video_url_1 || '',
      sample_video_url_2: creator.sample_video_url_2 || '',
      sample_video_url_3: creator.sample_video_url_3 || '',
      youtube_channel_url: creator.youtube_channel_url || '',
      subscriber_count: creator.subscriber_count || '',
      is_visible_on_landing: creator.is_visible_on_landing || false,
      is_available: creator.is_available !== false,
      display_order: creator.display_order || 0,
      source_user_id: creator.source_user_id || null,
      profile_image_url: creator.profile_image_url || '',
    })
    setShowCreatorForm(true)
  }

  const resetCreatorForm = () => {
    setEditingCreator(null)
    setSelectedSourceCreator(null)
    setCreatorSearch('')
    setSearchResults([])
    setCreatorForm({
      creator_name: '', display_name: '', category: '',
      avg_views: '', avg_views_number: 0, content_style: '',
      highlight: '', sample_video_url_1: '', sample_video_url_2: '',
      sample_video_url_3: '', youtube_channel_url: '', subscriber_count: '',
      is_visible_on_landing: false, is_available: true, display_order: 0,
      source_user_id: null, profile_image_url: '',
    })
    setShowCreatorForm(false)
  }

  const handleToggleLandingVisibility = async (creator) => {
    try {
      const { error } = await supabaseBiz
        .from('package_creators')
        .update({ is_visible_on_landing: !creator.is_visible_on_landing })
        .eq('id', creator.id)
      if (error) throw error
      await loadData()
    } catch (error) {
      alert(`변경 실패: ${error.message}`)
    }
  }

  const handleMoveCreator = async (index, direction) => {
    const newCreators = [...creators]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newCreators.length) return

    const tempOrder = newCreators[index].display_order
    newCreators[index].display_order = newCreators[swapIndex].display_order
    newCreators[swapIndex].display_order = tempOrder

    try {
      await Promise.all([
        supabaseBiz.from('package_creators').update({ display_order: newCreators[index].display_order }).eq('id', newCreators[index].id),
        supabaseBiz.from('package_creators').update({ display_order: newCreators[swapIndex].display_order }).eq('id', newCreators[swapIndex].id),
      ])
      await loadData()
    } catch (error) {
      alert(`순서 변경 실패: ${error.message}`)
    }
  }

  // ==================== Applications Tab ====================
  const handleUpdateApplicationStatus = async (appId, newStatus) => {
    try {
      const { error } = await supabaseBiz
        .from('package_applications')
        .update({ status: newStatus })
        .eq('id', appId)
      if (error) throw error

      if (newStatus === 'approved' && settings) {
        await supabaseBiz
          .from('package_settings')
          .update({ current_companies: (settings.current_companies || 0) + 1 })
          .eq('id', settings.id)
      }

      await loadData()
    } catch (error) {
      alert(`상태 변경 실패: ${error.message}`)
    }
  }

  const handleApprove = async (application) => {
    if (!confirm(`${application.company_name}의 패키지 신청을 승인하시겠습니까?`)) return
    try {
      const response = await fetch('/.netlify/functions/create-package-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: application.id })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      alert('승인되었습니다. 초대장을 발송해주세요.')
      await loadData()
    } catch (error) {
      alert(`승인 실패: ${error.message}`)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('복사되었습니다.')
  }

  const handleCancelApplication = async (app) => {
    if (!confirm(`${app.company_name}의 신청을 취소하시겠습니까?\n\n승인된 경우 잔여 슬롯이 복구됩니다.`)) return
    try {
      const wasApproved = app.status === 'approved' || app.status === 'campaign_created'

      const { error } = await supabaseBiz
        .from('package_applications')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', app.id)
      if (error) throw error

      // 승인 상태였으면 current_companies 감소
      if (wasApproved && settings && (settings.current_companies || 0) > 0) {
        await supabaseBiz
          .from('package_settings')
          .update({ current_companies: settings.current_companies - 1 })
          .eq('id', settings.id)
      }

      alert('신청이 취소되었습니다.')
      await loadData()
    } catch (error) {
      alert(`취소 실패: ${error.message}`)
    }
  }

  const handleSendInvitation = async (app) => {
    if (!confirm(`${app.company_name} (${app.email})에게 초대장 이메일을 발송하시겠습니까?`)) return
    setSendingInvitation(app.id)
    try {
      const response = await fetch('/.netlify/functions/send-package-invitation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: app.id })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      alert('초대장이 발송되었습니다.')
      await loadData()
    } catch (error) {
      alert(`초대장 발송 실패: ${error.message}`)
    } finally {
      setSendingInvitation(null)
    }
  }

  // ==================== Render ====================
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8F9FA]">
        <AdminNavigation />
        <main className="flex-1 ml-60 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#6C5CE7]" />
        </main>
      </div>
    )
  }

  const { total: totalPrice, discounted: discountedPrice } = calculatePrice()

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              특가 패키지 관리
            </h1>
            <p className="text-sm text-[#636E72] mt-1">
              월별 패키지 설정, 크리에이터 풀 관리, 기업 신청 관리
            </p>
          </div>
          {settings && (
            <div className="flex items-center gap-3">
              <Badge className={settings.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                {settings.is_active ? 'ON (공개중)' : 'OFF (비공개)'}
              </Badge>
              <Button
                onClick={handleToggleActive}
                variant={settings.is_active ? 'outline' : 'default'}
                className={!settings.is_active ? 'bg-[#6C5CE7] hover:bg-[#5A4BD1]' : ''}
              >
                {settings.is_active ? '비활성화' : '활성화'}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <Settings className="w-4 h-4" /> 설정
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> 크리에이터 ({creators.length}/30)
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> 신청 관리 ({applications.length})
            </TabsTrigger>
          </TabsList>

          {/* ===== Settings Tab ===== */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">기본 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">월 (YYYY-MM)</label>
                    <Input
                      type="month"
                      value={settingsForm.month}
                      onChange={(e) => setSettingsForm({ ...settingsForm, month: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">패키지 타이틀</label>
                    <Input
                      value={settingsForm.title}
                      onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                      placeholder="크넥 10인 10색"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">서브 타이틀</label>
                    <Input
                      value={settingsForm.subtitle}
                      onChange={(e) => setSettingsForm({ ...settingsForm, subtitle: e.target.value })}
                      placeholder="이번 달 특가 패키지를 만나보세요"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">랜딩 설명</label>
                    <textarea
                      className="w-full border rounded-lg p-2 text-sm min-h-[80px] resize-y"
                      value={settingsForm.landing_description}
                      onChange={(e) => setSettingsForm({ ...settingsForm, landing_description: e.target.value })}
                      placeholder="랜딩 페이지에 표시될 설명"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">마감일</label>
                    <Input
                      type="datetime-local"
                      value={settingsForm.deadline_date}
                      onChange={(e) => setSettingsForm({ ...settingsForm, deadline_date: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">가격/슬롯 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">1인 단가 (원)</label>
                      <Input
                        type="number"
                        value={settingsForm.per_creator_price}
                        onChange={(e) => setSettingsForm({ ...settingsForm, per_creator_price: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">선택 크리에이터 수</label>
                      <Input
                        type="number"
                        value={settingsForm.total_creators}
                        onChange={(e) => setSettingsForm({ ...settingsForm, total_creators: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">할인율 (%)</label>
                      <Input
                        type="number"
                        value={settingsForm.discount_rate}
                        onChange={(e) => setSettingsForm({ ...settingsForm, discount_rate: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">최대 기업 수</label>
                      <Input
                        type="number"
                        value={settingsForm.max_companies}
                        onChange={(e) => setSettingsForm({ ...settingsForm, max_companies: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {/* 랜딩 잔여 슬롯 오버라이드 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                    <p className="text-sm font-medium text-amber-800 mb-2">랜딩 페이지 잔여 슬롯 표시 (마케팅용)</p>
                    <p className="text-xs text-amber-600 mb-3">비워두면 실제 신청 수 기반으로 자동 계산됩니다.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">표시 잔여 슬롯</label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="자동"
                          value={settingsForm.display_remaining_slots}
                          onChange={(e) => setSettingsForm({ ...settingsForm, display_remaining_slots: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-amber-700 mb-1 block">표시 전체 슬롯</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="자동"
                          value={settingsForm.display_max_slots}
                          onChange={(e) => setSettingsForm({ ...settingsForm, display_max_slots: e.target.value })}
                        />
                      </div>
                    </div>
                    {settingsForm.display_remaining_slots !== '' && settingsForm.display_max_slots !== '' && (
                      <p className="text-xs text-amber-700 mt-2">
                        미리보기: 잔여 <span className="font-bold">{settingsForm.display_remaining_slots}</span> / {settingsForm.display_max_slots} 브랜드
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#1A1A2E] mb-1 block">랜딩 노출 크리에이터 수</label>
                    <Input
                      type="number"
                      value={settingsForm.show_creator_count}
                      onChange={(e) => setSettingsForm({ ...settingsForm, show_creator_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Price Preview */}
                  <div className="bg-[#F0EDFF] rounded-xl p-4 mt-4">
                    <p className="text-sm text-[#636E72] mb-1">가격 미리보기</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-[#636E72] line-through">
                        {totalPrice.toLocaleString()}원
                      </span>
                      <span className="text-2xl font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {discountedPrice.toLocaleString()}원
                      </span>
                      <Badge className="bg-red-50 text-red-600 text-xs">{settingsForm.discount_rate}% OFF</Badge>
                    </div>
                    <p className="text-xs text-[#636E72] mt-1">
                      {settingsForm.per_creator_price.toLocaleString()}원 × {settingsForm.total_creators}인
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="w-full bg-[#6C5CE7] hover:bg-[#5A4BD1] mt-4"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    설정 저장
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Creators Tab ===== */}
          <TabsContent value="creators">
            <div className="space-y-4">
              {/* Add Creator Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#F0EDFF] text-[#6C5CE7]">
                    랜딩 노출: {creators.filter(c => c.is_visible_on_landing).length}명
                  </Badge>
                  <Badge className="bg-green-50 text-green-700">
                    참여 가능: {creators.filter(c => c.is_available).length}명
                  </Badge>
                </div>
                <Button
                  onClick={() => { resetCreatorForm(); setShowCreatorForm(true) }}
                  disabled={creators.length >= 30}
                  className="bg-[#6C5CE7] hover:bg-[#5A4BD1]"
                >
                  <Plus className="w-4 h-4 mr-1" /> 크리에이터 추가
                </Button>
              </div>

              {/* Creator Form */}
              {showCreatorForm && (
                <Card className="rounded-2xl border-2 border-[#6C5CE7]/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {editingCreator ? '크리에이터 수정' : '새 크리에이터 추가'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Step 1: Creator Search (새 추가 시만 표시) */}
                    {!editingCreator && !selectedSourceCreator && (
                      <div className="relative">
                        <label className="text-xs font-medium mb-1 block">크리에이터 검색 (한국 DB)</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#636E72]" />
                          <Input
                            value={creatorSearch}
                            onChange={(e) => handleCreatorSearch(e.target.value)}
                            placeholder="이름 또는 이메일로 검색..."
                            className="pl-10"
                          />
                          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#6C5CE7]" />}
                        </div>
                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-[#DFE6E9] rounded-xl shadow-lg max-h-64 overflow-y-auto">
                            {searchResults.map((result) => (
                              <button
                                key={result.id}
                                onClick={() => handleSelectSourceCreator(result)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8F9FA] text-left border-b border-[#F0F0F0] last:border-0"
                              >
                                {result.profile_image ? (
                                  <img src={result.profile_image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#F0EDFF] flex items-center justify-center flex-shrink-0">
                                    <Users className="w-4 h-4 text-[#6C5CE7]" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1A1A2E] truncate">{result.name || '이름 없음'}</p>
                                  <p className="text-xs text-[#636E72] truncate">{result.email || ''}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {result.youtube_subscribers > 0 && (
                                    <p className="text-xs text-[#636E72]">구독 {result.youtube_subscribers.toLocaleString()}</p>
                                  )}
                                  {result.youtube_url && (
                                    <p className="text-xs text-[#6C5CE7]">YouTube</p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {creatorSearch.length >= 2 && searchResults.length === 0 && !searching && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-[#DFE6E9] rounded-xl shadow-lg p-4 text-center text-sm text-[#636E72]">
                            검색 결과가 없습니다
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Creator Preview */}
                    {selectedSourceCreator && (
                      <div className="flex items-center gap-3 bg-[#F0EDFF] rounded-xl p-3">
                        {selectedSourceCreator.profile_image ? (
                          <img src={selectedSourceCreator.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-[#6C5CE7]" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-[#1A1A2E] text-sm">{creatorForm.creator_name}</p>
                          <div className="flex items-center gap-3 text-xs text-[#636E72]">
                            {creatorForm.youtube_channel_url && <span>YouTube: {creatorForm.youtube_channel_url}</span>}
                            {creatorForm.subscriber_count && <span>구독 {creatorForm.subscriber_count}</span>}
                          </div>
                        </div>
                        <Badge className="bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs">
                          <Link className="w-3 h-3 mr-1" /> DB 연동
                        </Badge>
                        {!editingCreator && (
                          <button
                            onClick={() => { setSelectedSourceCreator(null); setCreatorForm(prev => ({ ...prev, creator_name: '', youtube_channel_url: '', subscriber_count: '', source_user_id: null, profile_image_url: '' })) }}
                            className="text-[#636E72] hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Manual fields (always visible once creator selected or editing) */}
                    {(selectedSourceCreator || editingCreator) && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium mb-1 block">랜딩 노출 이름</label>
                            <Input
                              value={creatorForm.display_name}
                              onChange={(e) => setCreatorForm({ ...creatorForm, display_name: e.target.value })}
                              placeholder="비공개 시 비워두세요"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">카테고리</label>
                            <select
                              className="w-full border rounded-lg p-2 text-sm"
                              value={creatorForm.category}
                              onChange={(e) => setCreatorForm({ ...creatorForm, category: e.target.value })}
                            >
                              <option value="">선택</option>
                              {CATEGORY_OPTIONS.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">하이라이트</label>
                            <select
                              className="w-full border rounded-lg p-2 text-sm"
                              value={creatorForm.highlight}
                              onChange={(e) => setCreatorForm({ ...creatorForm, highlight: e.target.value })}
                            >
                              <option value="">선택</option>
                              {HIGHLIGHT_OPTIONS.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium mb-1 block">평균 조회수 (텍스트)</label>
                            <Input
                              value={creatorForm.avg_views}
                              onChange={(e) => setCreatorForm({ ...creatorForm, avg_views: e.target.value })}
                              placeholder="12.5만"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">평균 조회수 (숫자)</label>
                            <Input
                              type="number"
                              value={creatorForm.avg_views_number}
                              onChange={(e) => setCreatorForm({ ...creatorForm, avg_views_number: parseInt(e.target.value) || 0 })}
                              placeholder="125000"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">콘텐츠 스타일</label>
                            <Input
                              value={creatorForm.content_style}
                              onChange={(e) => setCreatorForm({ ...creatorForm, content_style: e.target.value })}
                              placeholder="내돈내산 리뷰"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium mb-1 block">샘플 영상 URL 1</label>
                            <Input
                              value={creatorForm.sample_video_url_1}
                              onChange={(e) => setCreatorForm({ ...creatorForm, sample_video_url_1: e.target.value })}
                              placeholder="https://youtube.com/watch?v=..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">샘플 영상 URL 2</label>
                            <Input
                              value={creatorForm.sample_video_url_2}
                              onChange={(e) => setCreatorForm({ ...creatorForm, sample_video_url_2: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">샘플 영상 URL 3</label>
                            <Input
                              value={creatorForm.sample_video_url_3}
                              onChange={(e) => setCreatorForm({ ...creatorForm, sample_video_url_3: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={creatorForm.is_visible_on_landing}
                              onChange={(e) => setCreatorForm({ ...creatorForm, is_visible_on_landing: e.target.checked })}
                              className="rounded"
                            />
                            랜딩 페이지 노출
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={creatorForm.is_available}
                              onChange={(e) => setCreatorForm({ ...creatorForm, is_available: e.target.checked })}
                              className="rounded"
                            />
                            참여 가능
                          </label>
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={handleSaveCreator}
                        disabled={saving}
                        className="bg-[#6C5CE7] hover:bg-[#5A4BD1]"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                        {editingCreator ? '수정' : '추가'}
                      </Button>
                      <Button variant="outline" onClick={resetCreatorForm}>취소</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Creator List */}
              <div className="space-y-2">
                {creators.map((creator, index) => (
                  <Card key={creator.id} className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleMoveCreator(index, 'up')}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <GripVertical className="w-4 h-4 text-gray-300" />
                          <button
                            onClick={() => handleMoveCreator(index, 'down')}
                            disabled={index === creators.length - 1}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Profile Image */}
                        {creator.profile_image_url ? (
                          <img src={creator.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#F0EDFF] flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-[#6C5CE7]" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[#1A1A2E]">{creator.creator_name}</span>
                            {creator.display_name && (
                              <span className="text-xs text-[#636E72]">({creator.display_name})</span>
                            )}
                            {creator.source_user_id && (
                              <Badge className="bg-[#6C5CE7]/10 text-[#6C5CE7] text-xs">
                                <Link className="w-3 h-3 mr-0.5" /> DB 연동
                              </Badge>
                            )}
                            {creator.category && (
                              <Badge className="bg-[#F0EDFF] text-[#6C5CE7] text-xs">{creator.category}</Badge>
                            )}
                            {creator.highlight && (
                              <Badge className="bg-amber-50 text-amber-700 text-xs">{creator.highlight}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#636E72]">
                            {creator.avg_views && <span>평균 {creator.avg_views} 조회</span>}
                            {creator.subscriber_count && <span>구독자 {creator.subscriber_count}</span>}
                            {creator.content_style && <span>{creator.content_style}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleLandingVisibility(creator)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              creator.is_visible_on_landing
                                ? 'bg-green-50 text-green-600'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                            title={creator.is_visible_on_landing ? '랜딩 노출 중' : '랜딩 비노출'}
                          >
                            {creator.is_visible_on_landing ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <Button size="sm" variant="outline" onClick={() => handleEditCreator(creator)}>
                            수정
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteCreator(creator.id)}
                            className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {creators.length === 0 && (
                  <div className="text-center py-12 text-[#636E72]">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>등록된 크리에이터가 없습니다.</p>
                    <p className="text-sm mt-1">위 버튼을 눌러 크리에이터를 추가하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== Applications Tab ===== */}
          <TabsContent value="applications">
            <div className="space-y-4">
              {/* Stats */}
              {settings && (
                <div className="flex items-center gap-4 mb-4">
                  <Card className="rounded-xl px-4 py-3">
                    <div className="text-xs text-[#636E72]">신청 기업</div>
                    <div className="text-lg font-bold text-[#6C5CE7]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {settings.current_companies}/{settings.max_companies}
                    </div>
                  </Card>
                  <Card className="rounded-xl px-4 py-3">
                    <div className="text-xs text-[#636E72]">대기중</div>
                    <div className="text-lg font-bold text-yellow-600" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {applications.filter(a => a.status === 'pending').length}
                    </div>
                  </Card>
                  <Card className="rounded-xl px-4 py-3">
                    <div className="text-xs text-[#636E72]">승인됨</div>
                    <div className="text-lg font-bold text-green-600" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {applications.filter(a => a.status === 'approved' || a.status === 'campaign_created').length}
                    </div>
                  </Card>
                </div>
              )}

              {/* Application List */}
              {applications.map((app) => (
                <Card key={app.id} className="rounded-xl">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-[#1A1A2E]">{app.company_name}</span>
                          <Badge className={STATUS_LABELS[app.status]?.color || 'bg-gray-100'}>
                            {STATUS_LABELS[app.status]?.label || app.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[#636E72]">
                          <div>담당자: {app.contact_name}</div>
                          <div>이메일: {app.email}</div>
                          {app.phone && <div>연락처: {app.phone}</div>}
                          {app.brand_name && <div>브랜드: {app.brand_name}</div>}
                        </div>
                        {app.product_url && (
                          <div className="text-sm text-[#636E72] mt-1">
                            제품 URL: <a href={app.product_url} target="_blank" rel="noopener noreferrer" className="text-[#6C5CE7] hover:underline">{app.product_url}</a>
                          </div>
                        )}
                        {app.note && (
                          <div className="text-sm text-[#636E72] mt-1 bg-gray-50 rounded-lg p-2">
                            요청사항: {app.note}
                          </div>
                        )}
                        {/* 회원가입 / 캠페인 개설 URL */}
                        {(app.status === 'approved' || app.status === 'campaign_created') && (
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#636E72]">가입 URL:</span>
                              <code className="text-xs bg-purple-50 text-[#6C5CE7] px-2 py-0.5 rounded">https://cnecbiz.com/signup</code>
                              <button onClick={() => copyToClipboard('https://cnecbiz.com/signup')} className="text-[#6C5CE7]">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-[#636E72]">캠페인 개설:</span>
                              <code className="text-xs bg-purple-50 text-[#6C5CE7] px-2 py-0.5 rounded">https://cnecbiz.com/company/campaigns/create/korea?package=true</code>
                              <button onClick={() => copyToClipboard('https://cnecbiz.com/company/campaigns/create/korea?package=true')} className="text-[#6C5CE7]">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-[#B2BEC3]">
                            {new Date(app.created_at).toLocaleString('ko-KR')}
                          </span>
                          {app.invitation_sent_at && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> 초대장 발송 ({new Date(app.invitation_sent_at).toLocaleDateString('ko-KR')})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {app.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(app)}
                              className="bg-[#6C5CE7] hover:bg-[#5A4BD1]"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> 승인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}
                              className="text-red-500"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> 거절
                            </Button>
                          </>
                        )}
                        {(app.status === 'approved' || app.status === 'campaign_created') && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSendInvitation(app)}
                              disabled={sendingInvitation === app.id}
                              className="bg-[#6C5CE7] hover:bg-[#5A4BD1]"
                            >
                              {sendingInvitation === app.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : (
                                <Send className="w-3.5 h-3.5 mr-1" />
                              )}
                              {app.invitation_sent_at ? '초대장 재발송' : '초대장 발송'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelApplication(app)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> 취소
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {applications.length === 0 && (
                <div className="text-center py-12 text-[#636E72]">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>아직 신청이 없습니다.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
