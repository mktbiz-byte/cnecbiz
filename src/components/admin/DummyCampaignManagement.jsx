import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Edit, Trash2, Loader2, Calendar, Save, Copy, ImageIcon, X, Sparkles, Globe
} from 'lucide-react'
import { supabaseBiz, getSupabaseClient } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

const DUMMY_MARKER = 'dummy@cnecbiz.com'

const REGION_OPTIONS = [
  { value: 'korea', label: '🇰🇷 한국' },
  { value: 'japan', label: '🇯🇵 일본' },
  { value: 'us', label: '🇺🇸 미국' }
]

// BIZ DB CHECK constraint에 맞는 상태값만 사용
const STATUS_OPTIONS = [
  { value: 'active', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'draft', label: '임시저장' },
  { value: 'in_progress', label: '진행중(상세)' },
  { value: 'cancelled', label: '취소' }
]

const CAMPAIGN_TYPE_OPTIONS = [
  { value: 'regular', label: '기획형' },
  { value: 'oliveyoung', label: '올리브영' },
  { value: '4week_challenge', label: '4주 챌린지' }
]

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: '인스타그램' },
  { value: 'youtube', label: '유튜브' },
  { value: 'tiktok', label: '틱톡' }
]

const CATEGORY_OPTIONS = [
  { value: 'instagram', label: '릴스' },
  { value: 'youtube', label: '쇼츠' },
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
  category: ['instagram'],
  total_slots: 10,
  remaining_slots: 10,
  reward_points: 50000,
  application_deadline: '',
  recruitment_deadline: '',
  video_deadline: '',
  content_submission_deadline: '',
  sns_upload_deadline: '',
  image_url: '',
  company_name: '더미 기업',
  product_link: '',
  // 중요 필드들
  description: '',
  product_description: '',
  product_features: '',
  product_key_points: '',
  requirements: '',
  required_dialogues: [],
  required_hashtags: [],
  video_duration: '30-60초',
  video_tone: '',
  // 일본어/영어 번역
  description_ja: '',
  description_en: '',
}

export default function DummyCampaignManagement() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // 인라인 날짜 수정용
  const [editingDate, setEditingDate] = useState(null)
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
      // 모든 리전 DB에서 더미 캠페인 조회
      const allCampaigns = []
      for (const region of ['korea', 'japan', 'us']) {
        const client = getSupabaseClient(region)
        const { data } = await client
          .from('campaigns')
          .select('*')
          .eq('company_email', DUMMY_MARKER)
          .order('created_at', { ascending: false })
        if (data?.length) allCampaigns.push(...data)
      }
      // created_at 내림차순 정렬
      allCampaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setCampaigns(allCampaigns)
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

    const fiveWeeksLater = new Date(today)
    fiveWeeksLater.setDate(today.getDate() + 35)

    setForm({
      ...DEFAULT_FORM,
      application_deadline: twoWeeksLater.toISOString().split('T')[0],
      recruitment_deadline: threeWeeksLater.toISOString().split('T')[0],
      video_deadline: fourWeeksLater.toISOString().split('T')[0],
      content_submission_deadline: fourWeeksLater.toISOString().split('T')[0],
      sns_upload_deadline: fiveWeeksLater.toISOString().split('T')[0],
    })
    setShowModal(true)
  }

  const openEditModal = (campaign) => {
    setEditingId(campaign.id)
    setForm({
      title: campaign.title || '',
      brand: campaign.brand || '',
      product_name: campaign.product_name || '',
      campaign_type: campaign.campaign_type || 'regular',
      region: campaign.region || 'korea',
      status: campaign.status || 'active',
      target_platforms: campaign.target_platforms || ['instagram'],
      category: campaign.category || ['instagram'],
      total_slots: campaign.total_slots || 10,
      remaining_slots: campaign.remaining_slots || 10,
      reward_points: campaign.reward_points || 0,
      application_deadline: campaign.application_deadline?.split('T')[0] || '',
      recruitment_deadline: campaign.recruitment_deadline?.split('T')[0] || '',
      video_deadline: campaign.video_deadline?.split('T')[0] || '',
      content_submission_deadline: campaign.content_submission_deadline?.split('T')[0] || '',
      sns_upload_deadline: campaign.sns_upload_deadline?.split('T')[0] || '',
      image_url: campaign.image_url || '',
      company_name: campaign.company_name || '더미 기업',
      product_link: campaign.product_link || '',
      description: campaign.description || '',
      product_description: campaign.product_description || '',
      product_features: campaign.product_features || '',
      product_key_points: campaign.product_key_points || '',
      requirements: campaign.requirements || '',
      required_dialogues: campaign.required_dialogues || [],
      required_hashtags: campaign.required_hashtags || [],
      video_duration: campaign.video_duration || '30-60초',
      video_tone: campaign.video_tone || '',
      description_ja: campaign.additional_details_ja || '',
      description_en: campaign.additional_details || '',
    })
    setShowModal(true)
  }

  // ===== AI 자동 기입 (Gemini) =====
  const handleAIGenerate = async () => {
    if (!form.brand && !form.product_name) {
      alert('브랜드명 또는 제품명을 입력해주세요.')
      return
    }

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!geminiApiKey) {
      alert('Gemini API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인해주세요.')
      return
    }

    setAiGenerating(true)
    try {
      const regionLabel = form.region === 'japan' ? '일본' : form.region === 'us' ? '미국' : '한국'
      const langNote = form.region === 'japan' ? '\n\n중요: 모든 텍스트를 자연스러운 일본어로 작성해주세요.' : form.region === 'us' ? '\n\n중요: 모든 텍스트를 자연스러운 영어로 작성해주세요.' : ''
      const prompt = `당신은 크리에이터 마케팅 캠페인 전문가입니다. 아래 정보를 바탕으로 실제 라이브 캠페인에 바로 사용할 수 있도록 상세하고 완성도 높은 캠페인 내용을 생성해주세요.

브랜드: ${form.brand || '(미입력)'}
제품명: ${form.product_name || '(미입력)'}
리전: ${regionLabel}
캠페인 타입: ${form.campaign_type === 'regular' ? '기획형' : form.campaign_type === 'oliveyoung' ? '올리브영' : '4주 챌린지'}${langNote}

아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "title": "캠페인 제목 (예: [브랜드명] OO 릴스 캠페인)",
  "description": "캠페인 설명 (3-4문장, 크리에이터에게 보여지는 매력적인 캠페인 소개. 어떤 제품인지, 왜 참여해야 하는지, 어떤 혜택이 있는지 포함)",
  "product_description": "제품 소개 (2-3문장, 제품의 핵심 가치와 특장점)",
  "product_features": "제품 특징/장점 (5-7개, 줄바꿈으로 구분. 각 항목은 구체적인 성분/기능/효과 포함)",
  "product_key_points": "핵심 소구 포인트 (크리에이터가 영상에서 반드시 강조해야 할 4-5개 포인트, 줄바꿈으로 구분)",
  "requirements": "참여 조건 및 유의사항 (5-6줄, 구체적인 촬영 가이드라인 포함. 예: 얼굴 노출 필수, 세로형 촬영, 제품 클로즈업 3초 이상 등)",
  "required_dialogues": ["필수 멘트1 (구체적 대사)", "필수 멘트2", "필수 멘트3", "필수 멘트4"],
  "required_hashtags": ["#브랜드해시태그", "#제품해시태그", "#광고", "#협찬"],
  "video_tone": "영상 분위기 (구체적으로, 예: 밝고 자연스러운 일상 브이로그 톤, 전문적인 리뷰 톤 등)",
  "video_duration": "권장 영상 길이 (예: 30-60초)",
  "company_name": "기업명 (브랜드 운영사 추정)",
  "product_link": "제품 공식 사이트 또는 구매 링크 URL (실제 URL을 찾을 수 없으면 빈 문자열)"
}`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(`Gemini API 호출 실패 (${response.status}): ${errText.substring(0, 200)}`)
      }
      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // JSON 추출
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.')

      const aiResult = JSON.parse(jsonMatch[0])

      setForm(prev => ({
        ...prev,
        title: aiResult.title || prev.title,
        description: aiResult.description || prev.description,
        product_description: aiResult.product_description || prev.product_description,
        product_features: aiResult.product_features || prev.product_features,
        product_key_points: aiResult.product_key_points || prev.product_key_points,
        requirements: aiResult.requirements || prev.requirements,
        required_dialogues: aiResult.required_dialogues || prev.required_dialogues,
        required_hashtags: aiResult.required_hashtags || prev.required_hashtags,
        video_tone: aiResult.video_tone || prev.video_tone,
        video_duration: aiResult.video_duration || prev.video_duration,
        company_name: aiResult.company_name || prev.company_name,
        product_link: aiResult.product_link || prev.product_link,
      }))

    } catch (err) {
      console.error('AI 생성 실패:', err)
      alert('AI 생성 실패: ' + err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  // ===== 일본어/영어 번역 (Gemini) =====
  const handleTranslate = async () => {
    if (!form.description && !form.product_features) {
      alert('먼저 캠페인 내용을 입력하거나 AI 생성을 해주세요.')
      return
    }

    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!geminiApiKey) {
      alert('Gemini API 키가 설정되지 않았습니다. 환경변수 VITE_GEMINI_API_KEY를 확인해주세요.')
      return
    }

    setTranslating(true)
    try {
      const targetLang = form.region === 'japan' ? '일본어 (자연스러운 일본어)' : '영어 (자연스러운 미국식 영어)'
      const textToTranslate = `캠페인 설명: ${form.description}\n\n제품 특징: ${form.product_features}\n\n핵심 포인트: ${form.product_key_points}\n\n참여 조건: ${form.requirements}\n\n필수 멘트: ${(form.required_dialogues || []).join(' / ')}`

      const prompt = `아래 한국어 텍스트를 ${targetLang}로 번역해주세요. 각 섹션을 구분해서 번역하세요.

${textToTranslate}

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "description": "번역된 캠페인 설명",
  "product_features": "번역된 제품 특징",
  "product_key_points": "번역된 핵심 포인트",
  "requirements": "번역된 참여 조건",
  "required_dialogues": ["번역된 멘트1", "번역된 멘트2", ...]
}`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
        })
      })

      if (!response.ok) throw new Error('번역 API 호출 실패')
      const data = await response.json()
      const text2 = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text2.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('번역 결과에서 JSON을 찾을 수 없습니다.')

      const translated = JSON.parse(jsonMatch[0])

      // 기존 필드를 번역 결과로 직접 덮어쓰기
      setForm(prev => ({
        ...prev,
        description: translated.description || prev.description,
        product_features: translated.product_features || prev.product_features,
        product_key_points: translated.product_key_points || prev.product_key_points,
        requirements: translated.requirements || prev.requirements,
        required_dialogues: translated.required_dialogues?.length > 0 ? translated.required_dialogues : prev.required_dialogues,
      }))

      alert('번역 완료! 각 필드가 번역된 내용으로 업데이트되었습니다.')
    } catch (err) {
      console.error('번역 실패:', err)
      alert('번역 실패: ' + err.message)
    } finally {
      setTranslating(false)
    }
  }

  // ===== 썸네일 이미지 업로드 =====
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploadingImage(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `thumbnail-${Math.random().toString(36).substring(2)}.${ext}`
      const filePath = `campaign-images/${fileName}`

      const client = getSupabaseClient(form.region)
      const { error: uploadError } = await client.storage
        .from('campaign-images')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = client.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      if (!publicUrl) throw new Error('Public URL을 가져올 수 없습니다.')
      setForm(prev => ({ ...prev, image_url: publicUrl }))
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
      alert('이미지 업로드 실패: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim() && !form.brand.trim()) {
      alert('캠페인 제목 또는 브랜드명을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      // 리전별 campaign_type 매핑 (Korea DB: 'regular'→'planned', Japan DB: 'oliveyoung'→'megawari')
      const resolvedCampaignType = form.campaign_type === 'regular' && form.region === 'korea'
        ? 'planned'
        : form.campaign_type === 'oliveyoung' && form.region === 'japan'
          ? 'megawari'
          : form.campaign_type

      const campaignData = {
        title: form.title || `[${form.brand}] ${form.product_name} 캠페인`,
        brand: form.brand,
        product_name: form.product_name,
        campaign_type: resolvedCampaignType,
        status: form.status,
        target_platforms: form.target_platforms,
        category: form.category?.length > 0 ? form.category : null,
        total_slots: parseInt(form.total_slots) || 10,
        remaining_slots: parseInt(form.remaining_slots) || 10,
        reward_points: parseInt(form.reward_points) || 0,
        application_deadline: form.application_deadline || null,
        recruitment_deadline: form.recruitment_deadline || null,
        video_deadline: form.video_deadline || null,
        content_submission_deadline: form.content_submission_deadline || form.video_deadline || null,
        sns_upload_deadline: form.sns_upload_deadline || null,
        image_url: form.image_url || null,
        product_link: form.product_link || null,
        company_email: DUMMY_MARKER,
        // 중요 필드들
        description: form.description || null,
        product_description: form.product_description || null,
        product_features: form.product_features || null,
        product_key_points: form.product_key_points || null,
        requirements: form.requirements || null,
        required_dialogues: form.required_dialogues?.length > 0 ? form.required_dialogues : null,
        required_hashtags: form.required_hashtags?.length > 0 ? form.required_hashtags : null,
        video_duration: form.video_duration || null,
        video_tone: form.video_tone || null,
        // 번역 필드
        additional_details_ja: form.description_ja || null,
        additional_details: form.description_en || null,
      }

      const client = getSupabaseClient(form.region)
      if (editingId) {
        const { error } = await client
          .from('campaigns')
          .update(campaignData)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await client
          .from('campaigns')
          .insert([campaignData])
        if (error) throw error
      }

      setShowModal(false)
      fetchDummyCampaigns()
    } catch (err) {
      console.error('저장 실패:', err)
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('이 더미 캠페인을 삭제하시겠습니까?')) return
    const campaign = campaigns.find(c => c.id === id)
    const client = getSupabaseClient(campaign?.region || 'korea')
    try {
      const { error } = await client
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

    const client = getSupabaseClient(campaign.region || 'korea')
    try {
      const { error } = await client
        .from('campaigns')
        .insert([{
          title: campaign.title + ' (복사)',
          brand: campaign.brand,
          product_name: campaign.product_name,
          campaign_type: campaign.campaign_type,
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
          description: campaign.description,
          product_description: campaign.product_description,
          product_features: campaign.product_features,
          product_key_points: campaign.product_key_points,
          requirements: campaign.requirements,
          required_dialogues: campaign.required_dialogues,
          required_hashtags: campaign.required_hashtags,
          video_duration: campaign.video_duration,
          video_tone: campaign.video_tone,
          additional_details_ja: campaign.additional_details_ja,
          additional_details: campaign.additional_details,
          category: campaign.category,
          product_link: campaign.product_link,
          content_submission_deadline: campaign.content_submission_deadline,
          sns_upload_deadline: campaign.sns_upload_deadline,
        }])
      if (error) throw error
      fetchDummyCampaigns()
    } catch (err) {
      alert('복사 실패: ' + err.message)
    }
  }

  // 인라인 날짜 수정
  const handleInlineDateSave = async (campaignId, field) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    const client = getSupabaseClient(campaign?.region || 'korea')
    try {
      const { error } = await client
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
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
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
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns')}>
              대시보드
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns')}>
              📋 전체 캠페인
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns/deadlines')}>
              ⏰ 마감일 관리
            </Button>
            <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => navigate('/admin/campaigns/unpaid')}>
              💰 포인트 미지급
            </Button>
            <Button variant="default" size="sm" className="whitespace-nowrap">
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
                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">내용</th>
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
                                  {campaign.title || '제목 없음'}
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
                          <td className="px-3 py-3 text-center">
                            {campaign.description ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">입력됨</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">미입력</span>
                            )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '더미 캠페인 수정' : '더미 캠페인 생성'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* AI 자동 기입 영역 */}
            <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-violet-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    AI 자동 기입
                  </h3>
                  <p className="text-xs text-violet-600">브랜드 + 제품명만 입력하면 나머지를 AI가 자동으로 채웁니다.</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAIGenerate}
                  disabled={aiGenerating}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {aiGenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {aiGenerating ? 'AI 생성 중...' : 'AI 자동 기입'}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-violet-700 mb-1">브랜드명 *</label>
                  <Input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="예: 바이크롬" className="bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-700 mb-1">제품명 / 상품 설명 *</label>
                  <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="예: 프로바이오틱스 유산균" className="bg-white" />
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 제목</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI가 자동 생성하거나 직접 입력" />
            </div>

            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 타입</label>
                <Select value={form.campaign_type} onValueChange={v => setForm(f => ({ ...f, campaign_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">기업명</label>
                <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="더미 기업" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼</label>
                <div className="flex gap-2 pt-1">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <div className="flex gap-2 pt-1">
                  {CATEGORY_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          category: (f.category || []).includes(c.value)
                            ? f.category.filter(v => v !== c.value)
                            : [...(f.category || []), c.value]
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        (form.category || []).includes(c.value)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 링크</label>
                <Input value={form.product_link} onChange={e => setForm(f => ({ ...f, product_link: e.target.value }))} placeholder="https://..." />
              </div>
            </div>

            {/* 날짜/슬롯/포인트 */}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">영상 제출 마감</label>
                <Input type="date" value={form.content_submission_deadline} onChange={e => setForm(f => ({ ...f, content_submission_deadline: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SNS 업로드 예정일</label>
                <Input type="date" value={form.sns_upload_deadline} onChange={e => setForm(f => ({ ...f, sns_upload_deadline: e.target.value }))} />
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

            {/* 캠페인 상세 내용 (AI 생성 가능) */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">캠페인 상세 내용</h3>
                {(form.region === 'japan' || form.region === 'us') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTranslate}
                    disabled={translating}
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {translating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Globe className="w-3.5 h-3.5 mr-1" />}
                    {translating ? '번역 중...' : `AI ${form.region === 'japan' ? '일본어' : '영어'} 번역`}
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 설명</label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="캠페인에 대한 설명" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품 소개</label>
                  <Textarea value={form.product_description} onChange={e => setForm(f => ({ ...f, product_description: e.target.value }))} placeholder="제품에 대한 소개" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제품 특징/장점</label>
                  <Textarea value={form.product_features} onChange={e => setForm(f => ({ ...f, product_features: e.target.value }))} placeholder="제품의 주요 특징 및 장점" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">핵심 소구 포인트</label>
                  <Textarea value={form.product_key_points} onChange={e => setForm(f => ({ ...f, product_key_points: e.target.value }))} placeholder="크리에이터가 영상에서 강조해야 할 포인트" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">참여 조건/유의사항</label>
                  <Textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="참여 시 지켜야 할 조건" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">필수 멘트 (줄바꿈으로 구분)</label>
                  <Textarea
                    value={(form.required_dialogues || []).join('\n')}
                    onChange={e => setForm(f => ({ ...f, required_dialogues: e.target.value.split('\n').filter(s => s.trim()) }))}
                    placeholder="영상에서 반드시 포함해야 할 대사/멘트&#10;줄바꿈으로 구분"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">필수 해시태그 (줄바꿈으로 구분)</label>
                  <Textarea
                    value={(form.required_hashtags || []).join('\n')}
                    onChange={e => setForm(f => ({ ...f, required_hashtags: e.target.value.split('\n').filter(s => s.trim()) }))}
                    placeholder="#해시태그1&#10;#해시태그2"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">영상 길이</label>
                    <Input value={form.video_duration} onChange={e => setForm(f => ({ ...f, video_duration: e.target.value }))} placeholder="30-60초" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">영상 분위기</label>
                    <Input value={form.video_tone} onChange={e => setForm(f => ({ ...f, video_tone: e.target.value }))} placeholder="밝고 자연스러운" />
                  </div>
                </div>
              </div>
            </div>

            {/* 썸네일 이미지 업로드 */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">썸네일 이미지</label>
              <div className="flex items-start gap-4">
                {/* 미리보기 */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                  {form.image_url ? (
                    <img src={form.image_url} alt="썸네일" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg text-sm font-medium hover:bg-violet-100 transition-colors">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      {uploadingImage ? '업로드 중...' : '이미지 선택'}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                    </label>
                    {form.image_url && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <Input
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="또는 URL 직접 입력"
                    className="text-xs"
                  />
                </div>
              </div>
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
