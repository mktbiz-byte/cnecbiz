import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Edit, Trash2, Loader2, Calendar, Save, Copy, ImageIcon, X
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

const DUMMY_MARKER = 'dummy@cnecbiz.com'

const REGION_OPTIONS = [
  { value: 'korea', label: '🇰🇷 한국' },
  { value: 'japan', label: '🇯🇵 일본' },
  { value: 'us', label: '🇺🇸 미국' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'draft', label: '임시저장' },
  { value: 'pending', label: '승인대기' }
]

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: '인스타그램' },
  { value: 'youtube', label: '유튜브' },
  { value: 'tiktok', label: '틱톡' }
]

const DEFAULT_FORM = {
  title: '',
  brand: '',
  product_name: '',
  campaign_type: 'regular',
  region: 'korea',
  status: 'active',
  target_platforms: ['instagram'],
  total_slots: 10,
  remaining_slots: 10,
  reward_points: 50000,
  application_deadline: '',
  recruitment_deadline: '',
  video_deadline: '',
  image_url: '',
  company_name: '더미 기업',
}

export default function DummyCampaignManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })

  // 인라인 날짜 수정용
  const [editingDate, setEditingDate] = useState(null) // { id, field }
  const [editingDateValue, setEditingDateValue] = useState('')

  useEffect(() => {
    checkAuth()
    fetchDummyCampaigns()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) navigate('/admin/login')
  }

  const fetchDummyCampaigns = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('campaigns')
        .select('*')
        .eq('company_email', DUMMY_MARKER)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (err) {
      console.error('더미 캠페인 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingId(null)
    const today = new Date()
    const twoWeeksLater = new Date(today)
    twoWeeksLater.setDate(today.getDate() + 14)
    const threeWeeksLater = new Date(today)
    threeWeeksLater.setDate(today.getDate() + 21)
    const fourWeeksLater = new Date(today)
    fourWeeksLater.setDate(today.getDate() + 28)

    setForm({
      ...DEFAULT_FORM,
      application_deadline: twoWeeksLater.toISOString().split('T')[0],
      recruitment_deadline: threeWeeksLater.toISOString().split('T')[0],
      video_deadline: fourWeeksLater.toISOString().split('T')[0],
    })
    setShowModal(true)
  }

  const openEditModal = (campaign) => {
    setEditingId(campaign.id)
    setForm({
      title: campaign.title || campaign.campaign_name || '',
      brand: campaign.brand || '',
      product_name: campaign.product_name || '',
      campaign_type: campaign.campaign_type || 'regular',
      region: campaign.region || 'korea',
      status: campaign.status || 'active',
      target_platforms: campaign.target_platforms || ['instagram'],
      total_slots: campaign.total_slots || 10,
      remaining_slots: campaign.remaining_slots || 10,
      reward_points: campaign.reward_points || 0,
      application_deadline: campaign.application_deadline?.split('T')[0] || '',
      recruitment_deadline: campaign.recruitment_deadline?.split('T')[0] || '',
      video_deadline: campaign.video_deadline?.split('T')[0] || '',
      image_url: campaign.image_url || '',
      company_name: campaign.company_name || '더미 기업',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('캠페인 제목을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const campaignData = {
        title: form.title,
        campaign_name: form.title,
        brand: form.brand,
        product_name: form.product_name,
        campaign_type: form.campaign_type,
        region: form.region,
        status: form.status,
        target_platforms: form.target_platforms,
        total_slots: parseInt(form.total_slots) || 10,
        remaining_slots: parseInt(form.remaining_slots) || 10,
        reward_points: parseInt(form.reward_points) || 0,
        application_deadline: form.application_deadline || null,
        recruitment_deadline: form.recruitment_deadline || null,
        video_deadline: form.video_deadline || null,
        image_url: form.image_url || null,
        company_email: DUMMY_MARKER,
        company_name: form.company_name || '더미 기업',
      }

      if (editingId) {
        const { error } = await supabaseBiz
          .from('campaigns')
          .update(campaignData)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabaseBiz
          .from('campaigns')
          .insert([campaignData])
        if (error) throw error
      }

      setShowModal(false)
      fetchDummyCampaigns()
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 더미 캠페인을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabaseBiz
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('company_email', DUMMY_MARKER)
      if (error) throw error
      fetchDummyCampaigns()
    } catch (err) {
      alert('삭제 실패: ' + err.message)
    }
  }

  const handleDuplicate = async (campaign) => {
    const today = new Date()
    const twoWeeksLater = new Date(today)
    twoWeeksLater.setDate(today.getDate() + 14)

    try {
      const { error } = await supabaseBiz
        .from('campaigns')
        .insert([{
          title: campaign.title + ' (복사)',
          campaign_name: (campaign.campaign_name || campaign.title) + ' (복사)',
          brand: campaign.brand,
          product_name: campaign.product_name,
          campaign_type: campaign.campaign_type,
          region: campaign.region,
          status: 'active',
          target_platforms: campaign.target_platforms,
          total_slots: campaign.total_slots,
          remaining_slots: campaign.remaining_slots || campaign.total_slots,
          reward_points: campaign.reward_points,
          application_deadline: twoWeeksLater.toISOString().split('T')[0],
          recruitment_deadline: campaign.recruitment_deadline,
          video_deadline: campaign.video_deadline,
          image_url: campaign.image_url,
          company_email: DUMMY_MARKER,
          company_name: campaign.company_name || '더미 기업',
        }])
      if (error) throw error
      fetchDummyCampaigns()
    } catch (err) {
      alert('복사 실패: ' + err.message)
    }
  }

  // 인라인 날짜 수정
  const handleInlineDateSave = async (campaignId, field) => {
    try {
      const { error } = await supabaseBiz
        .from('campaigns')
        .update({ [field]: editingDateValue || null })
        .eq('id', campaignId)
      if (error) throw error
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId ? { ...c, [field]: editingDateValue || null } : c
      ))
      setEditingDate(null)
    } catch (err) {
      alert('날짜 수정 실패: ' + err.message)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const DateCell = ({ campaign, field, label }) => {
    const isEditing = editingDate?.id === campaign.id && editingDate?.field === field
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={editingDateValue}
            onChange={e => setEditingDateValue(e.target.value)}
            className="text-xs border rounded px-1 py-0.5 w-[130px]"
            autoFocus
          />
          <button onClick={() => handleInlineDateSave(campaign.id, field)} className="text-green-600 hover:text-green-700">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditingDate(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
    return (
      <button
        onClick={() => {
          setEditingDate({ id: campaign.id, field })
          setEditingDateValue(campaign[field]?.split('T')[0] || '')
        }}
        className="text-xs text-gray-600 hover:text-violet-600 hover:bg-violet-50 px-1 py-0.5 rounded transition-colors cursor-pointer"
        title={`${label} 수정`}
      >
        {formatDate(campaign[field])}
      </button>
    )
  }

  const statusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-gray-100 text-gray-600'
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      case 'pending': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const regionFlag = (region) => {
    return { korea: '🇰🇷', japan: '🇯🇵', us: '🇺🇸' }[region] || '🌐'
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white lg:ml-64">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">캠페인 관리</h1>
            <p className="text-gray-500">전체 캠페인을 관리하고 모니터링합니다.</p>
          </div>

          {/* 서브 탭 */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => navigate('/admin/campaigns')}
            >
              📋 전체 캠페인
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => navigate('/admin/campaigns/deadlines')}
            >
              ⏰ 마감일 관리
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => navigate('/admin/campaigns/unpaid')}
            >
              💰 포인트 미지급
            </Button>
            <Button
              variant="default"
              size="sm"
              className="whitespace-nowrap"
            >
              🧪 더미 캠페인
            </Button>
          </div>

          {/* 더미 캠페인 관리 영역 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg">더미 캠페인 관리</CardTitle>
                <p className="text-sm text-gray-500 mt-1">테스트/디스플레이용 더미 캠페인을 생성하고 관리합니다. 날짜를 클릭하면 바로 수정할 수 있습니다.</p>
              </div>
              <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4 mr-2" />
                더미 캠페인 생성
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  불러오는 중...
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>등록된 더미 캠페인이 없습니다.</p>
                  <Button variant="outline" className="mt-4" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 더미 캠페인 만들기
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">캠페인</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">리전</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">모집마감</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">선정마감</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">영상마감</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">포인트</th>
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">슬롯</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {campaigns.map(campaign => (
                        <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {campaign.image_url ? (
                                  <img src={campaign.image_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate max-w-[220px]">
                                  {campaign.title || campaign.campaign_name || '제목 없음'}
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[220px]">
                                  {campaign.brand || campaign.product_name || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm">{regionFlag(campaign.region)}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(campaign.status)}`}>
                              {STATUS_OPTIONS.find(s => s.value === campaign.status)?.label || campaign.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <DateCell campaign={campaign} field="application_deadline" label="모집마감" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <DateCell campaign={campaign} field="recruitment_deadline" label="선정마감" />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <DateCell campaign={campaign} field="video_deadline" label="영상마감" />
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-medium text-violet-600">
                            {(campaign.reward_points || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-gray-600">
                            {campaign.remaining_slots || 0}/{campaign.total_slots || 0}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(campaign)}
                                className="p-1.5 rounded-md hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                                title="수정"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(campaign)}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                title="복사"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 생성/수정 모달 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '더미 캠페인 수정' : '더미 캠페인 생성'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 제목 *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 바이크롬 유산균 릴스 캠페인" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">브랜드</label>
                <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="브랜드명" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="제품명" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">리전</label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기업명</label>
              <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="더미 기업" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        target_platforms: f.target_platforms.includes(p.value)
                          ? f.target_platforms.filter(v => v !== p.value)
                          : [...f.target_platforms, p.value]
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.target_platforms.includes(p.value)
                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">모집마감</label>
                <Input type="date" value={form.application_deadline} onChange={e => setForm(f => ({ ...f, application_deadline: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">선정마감</label>
                <Input type="date" value={form.recruitment_deadline} onChange={e => setForm(f => ({ ...f, recruitment_deadline: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">영상마감</label>
                <Input type="date" value={form.video_deadline} onChange={e => setForm(f => ({ ...f, video_deadline: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">포인트</label>
                <Input type="number" value={form.reward_points} onChange={e => setForm(f => ({ ...f, reward_points: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">총 슬롯</label>
                <Input type="number" value={form.total_slots} onChange={e => setForm(f => ({ ...f, total_slots: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">남은 슬롯</label>
                <Input type="number" value={form.remaining_slots} onChange={e => setForm(f => ({ ...f, remaining_slots: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이미지 URL</label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {editingId ? '수정' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
