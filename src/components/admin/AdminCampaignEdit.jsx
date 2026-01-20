import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Trash2, CheckCircle, XCircle, Clock, PlayCircle, AlertCircle, Languages, Loader2 } from 'lucide-react'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'

export default function AdminCampaignEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // 한국 캠페인은 CreateCampaignKorea로 리다이렉트
    if (region === 'korea') {
      navigate(`/company/campaigns/create/korea?edit=${id}&admin=true`)
      return
    }
    
    if (adminEmail) {
      fetchCampaign()
    }
  }, [id, region, adminEmail, navigate])

  const checkAuth = async () => {
    try {
      if (!supabaseBiz) {
        console.error('supabaseBiz not available')
        navigate('/login')
        return
      }

      const { data: { user }, error: userError } = await supabaseBiz.auth.getUser()
      
      if (userError || !user) {
        console.error('User not found:', userError)
        navigate('/login')
        return
      }

      setAdminEmail(user.email)

      const { data: adminData, error: adminError } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()

      if (adminError || !adminData) {
        console.error('Admin user not found:', adminError)
        alert('관리자 권한이 없습니다.')
        navigate('/admin/dashboard')
        return
      }

      const isSuperAdminUser = adminData.role === 'super_admin'
      setIsSuperAdmin(isSuperAdminUser)
      console.log('Admin check:', { email: user.email, role: adminData.role, isSuperAdmin: isSuperAdminUser })
    } catch (error) {
      console.error('Auth check error:', error)
      navigate('/login')
    }
  }

  const fetchCampaign = async () => {
    try {
      const client = getSupabaseClient(region)
      if (!client) {
        console.error('No Supabase client for region:', region)
        alert(`${region} 리전의 Supabase 클라이언트를 찾을 수 없습니다.`)
        return
      }

      const { data, error } = await client
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      
      console.log('Campaign data loaded:', data)
      setCampaign(data)
    } catch (error) {
      console.error('Error fetching campaign:', error)
      alert('캠페인 정보를 불러오는데 실패했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!confirm('캠페인 정보를 수정하시겠습니까?')) {
      return
    }

    setSaving(true)
    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const updateData = {
        title: campaign.title,
        brand: campaign.brand,
        description: campaign.description,
        requirements: campaign.requirements,
        category: campaign.category,
        max_participants: campaign.max_participants,
        total_slots: campaign.max_participants,
        remaining_slots: campaign.max_participants,
        application_deadline: campaign.application_deadline,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: campaign.status,
        target_platforms: campaign.target_platforms,
        // 캠페인 등록 기업 정보 유지 (수정 시 변경 방지)
        company_id: campaign.company_id,
        company_email: campaign.company_email,
        // 질문 필드
        question1: campaign.question1,
        question1_type: campaign.question1_type,
        question1_options: campaign.question1_options,
        question2: campaign.question2,
        question2_type: campaign.question2_type,
        question2_options: campaign.question2_options,
        question3: campaign.question3,
        question3_type: campaign.question3_type,
        question3_options: campaign.question3_options,
        question4: campaign.question4,
        question4_type: campaign.question4_type,
        question4_options: campaign.question4_options,
        // 참가 조건
        age_requirement: campaign.age_requirement,
        skin_type_requirement: campaign.skin_type_requirement,
        offline_visit_requirement: campaign.offline_visit_requirement,
        // 가이드 내용
        brand_name: campaign.brand_name,
        product_name: campaign.product_name,
        product_features: campaign.product_features,
        required_dialogues: campaign.required_dialogues,
        required_scenes: campaign.required_scenes,
        required_hashtags: campaign.required_hashtags,
        video_duration: campaign.video_duration,
        video_tempo: campaign.video_tempo,
        video_tone: campaign.video_tone,
        additional_shooting_requests: campaign.additional_shooting_requests,
        // 촬영 장면
        shooting_scenes_ba_photo: campaign.shooting_scenes_ba_photo,
        shooting_scenes_no_makeup: campaign.shooting_scenes_no_makeup,
        shooting_scenes_closeup: campaign.shooting_scenes_closeup,
        shooting_scenes_product_closeup: campaign.shooting_scenes_product_closeup,
        shooting_scenes_product_texture: campaign.shooting_scenes_product_texture,
        shooting_scenes_outdoor: campaign.shooting_scenes_outdoor,
        shooting_scenes_couple: campaign.shooting_scenes_couple,
        shooting_scenes_child: campaign.shooting_scenes_child,
        shooting_scenes_troubled_skin: campaign.shooting_scenes_troubled_skin,
        shooting_scenes_wrinkles: campaign.shooting_scenes_wrinkles,
        // 일본어 필드 (일본 리전인 경우)
        brand_name_ja: campaign.brand_name_ja,
        product_name_ja: campaign.product_name_ja,
        product_description_ja: campaign.product_description_ja,
        product_features_ja: campaign.product_features_ja,
        required_dialogues_ja: campaign.required_dialogues_ja,
        required_scenes_ja: campaign.required_scenes_ja,
        required_hashtags_ja: campaign.required_hashtags_ja,
        video_duration_ja: campaign.video_duration_ja,
        video_tempo_ja: campaign.video_tempo_ja,
        video_tone_ja: campaign.video_tone_ja,
        additional_details_ja: campaign.additional_details_ja,
        additional_shooting_requests_ja: campaign.additional_shooting_requests_ja,
        shooting_scenes_ja: campaign.shooting_scenes_ja,
        meta_ad_code_requested: campaign.meta_ad_code_requested,
        updated_at: new Date().toISOString()
      }

      // 슈퍼 관리자만 reward_points 수정 가능
      if (isSuperAdmin) {
        updateData.reward_points = campaign.reward_points
      }

      const { error } = await client
        .from('campaigns')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      alert('캠페인이 수정되었습니다!')
      navigate(`/admin/campaigns/${id}?region=${region}`)
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    const statusLabels = {
      draft: '임시',
      active: '활성',
      paused: '중단',
      completed: '완료'
    }

    if (!confirm(`캠페인 상태를 "${statusLabels[newStatus]}"로 변경하시겠습니까?`)) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setCampaign({ ...campaign, status: newStatus })
      alert(`캠페인 상태가 "${statusLabels[newStatus]}"로 변경되었습니다!`)
    } catch (error) {
      console.error('Error changing status:', error)
      alert('상태 변경에 실패했습니다: ' + error.message)
    }
  }

  const handleDelete = async () => {
    if (!confirm('⚠️ 정말로 이 캠페인을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    if (!confirm('⚠️ 최종 확인: 캠페인과 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    try {
      const client = getSupabaseClient(region)
      if (!client) throw new Error('Supabase client not found')

      const { error } = await client
        .from('campaigns')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('캠페인이 삭제되었습니다.')
      navigate(`/admin/campaigns?region=${region}`)
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('삭제에 실패했습니다: ' + error.message)
    }
  }

  // AI 일본어 번역 함수
  const handleTranslateToJapanese = async () => {
    if (!confirm('한국어 내용을 일본어로 번역하시겠습니까?\n\n기존 일본어 내용이 덮어씌워집니다.')) {
      return
    }

    setTranslating(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다')
      }

      // 번역할 필드들 수집
      const fieldsToTranslate = {
        brand_name: campaign.brand_name || '',
        product_name: campaign.product_name || '',
        product_features: Array.isArray(campaign.product_features) ? campaign.product_features.join('\n') : (campaign.product_features || ''),
        required_dialogues: Array.isArray(campaign.required_dialogues) ? campaign.required_dialogues.join('\n') : (campaign.required_dialogues || ''),
        required_scenes: Array.isArray(campaign.required_scenes) ? campaign.required_scenes.join('\n') : (campaign.required_scenes || ''),
        required_hashtags: Array.isArray(campaign.required_hashtags) ? campaign.required_hashtags.join('\n') : (campaign.required_hashtags || ''),
        video_duration: campaign.video_duration || '',
        video_tempo: campaign.video_tempo || '',
        video_tone: campaign.video_tone || '',
        additional_shooting_requests: campaign.additional_shooting_requests || ''
      }

      // 번역할 내용이 있는 필드만 필터링
      const nonEmptyFields = Object.entries(fieldsToTranslate).filter(([_, value]) => value.trim())

      if (nonEmptyFields.length === 0) {
        alert('번역할 한국어 내용이 없습니다.')
        setTranslating(false)
        return
      }

      // 프롬프트 생성
      const translationPrompt = `다음 한국어 캠페인 정보를 일본어로 자연스럽게 번역해주세요.
각 필드별로 번역 결과만 JSON 형식으로 출력하고 다른 설명은 하지 마세요.

입력:
${JSON.stringify(Object.fromEntries(nonEmptyFields), null, 2)}

출력 형식 (JSON):
{
  "brand_name": "번역된 브랜드명",
  "product_name": "번역된 제품명",
  ...
}`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: translationPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`)
      }

      const data = await response.json()
      let translatedText = data.candidates[0]?.content?.parts[0]?.text || ''

      // JSON 파싱 시도
      // ```json ... ``` 형식으로 올 수 있으므로 추출
      const jsonMatch = translatedText.match(/```json\s*([\s\S]*?)\s*```/) || translatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        translatedText = jsonMatch[1] || jsonMatch[0]
      }

      const translated = JSON.parse(translatedText)

      // 번역 결과 적용
      const updatedCampaign = { ...campaign }

      if (translated.brand_name) updatedCampaign.brand_name_ja = translated.brand_name
      if (translated.product_name) updatedCampaign.product_name_ja = translated.product_name
      if (translated.product_features) {
        updatedCampaign.product_features_ja = translated.product_features.split('\n').filter(item => item.trim())
      }
      if (translated.required_dialogues) {
        updatedCampaign.required_dialogues_ja = translated.required_dialogues.split('\n').filter(item => item.trim())
      }
      if (translated.required_scenes) {
        updatedCampaign.required_scenes_ja = translated.required_scenes.split('\n').filter(item => item.trim())
      }
      if (translated.required_hashtags) {
        updatedCampaign.required_hashtags_ja = translated.required_hashtags.split('\n').filter(item => item.trim())
      }
      if (translated.video_duration) updatedCampaign.video_duration_ja = translated.video_duration
      if (translated.video_tempo) updatedCampaign.video_tempo_ja = translated.video_tempo
      if (translated.video_tone) updatedCampaign.video_tone_ja = translated.video_tone
      if (translated.additional_shooting_requests) updatedCampaign.additional_shooting_requests_ja = translated.additional_shooting_requests

      setCampaign(updatedCampaign)
      alert('일본어 번역이 완료되었습니다! 내용을 확인 후 저장해주세요.')
    } catch (error) {
      console.error('Translation error:', error)
      alert('번역 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setTranslating(false)
    }
  }

  const updateArrayField = (field, value) => {
    const arr = value.split('\n').filter(item => item.trim())
    setCampaign({ ...campaign, [field]: arr })
  }

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64">
          <div className="max-w-6xl mx-auto p-6">
            <div className="text-center py-12">로딩 중...</div>
          </div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <AdminNavigation />
        <div className="min-h-screen bg-gray-50 lg:ml-64">
          <div className="max-w-6xl mx-auto p-6">
            <div className="text-center py-12 text-red-600">캠페인을 찾을 수 없습니다</div>
          </div>
        </div>
      </>
    )
  }

  const regionLabels = {
    korea: '🇰🇷 한국',
    japan: '🇯🇵 일본',
    us: '🇺🇸 미국',
    taiwan: '🇹🇼 대만'
  }

  const currencySymbols = {
    korea: '₩',
    japan: '¥',
    us: '$',
    taiwan: 'NT$'
  }

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/campaigns/${id}?region=${region}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로
              </Button>
              <div>
                <h1 className="text-3xl font-bold">캠페인 수정</h1>
                <p className="text-gray-600 mt-1">{regionLabels[region]}</p>
                {adminEmail && (
                  <p className="text-sm text-gray-500">관리자: {adminEmail} {isSuperAdmin && '(슈퍼 관리자)'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '저장 중...' : '저장'}
              </Button>
              {isSuperAdmin && (
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
              )}
            </div>
          </div>

          {/* 상태 변경 버튼 */}
          {isSuperAdmin && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  {campaign.status === 'draft' && <Clock className="w-5 h-5" />}
                  {campaign.status === 'active' && <PlayCircle className="w-5 h-5" />}
                  {campaign.status === 'paused' && <XCircle className="w-5 h-5" />}
                  {campaign.status === 'completed' && <CheckCircle className="w-5 h-5" />}
                  캠페인 상태 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-sm text-gray-600 mb-2">현재 상태</div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
                      campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {campaign.status === 'draft' && <><Clock className="w-4 h-4" /> 임시</>}
                      {campaign.status === 'active' && <><PlayCircle className="w-4 h-4" /> 활성</>}
                      {campaign.status === 'paused' && <><XCircle className="w-4 h-4" /> 중단</>}
                      {campaign.status === 'completed' && <><CheckCircle className="w-4 h-4" /> 완료</>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => handleStatusChange('draft')}
                      disabled={campaign.status === 'draft'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      임시
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('active')}
                      disabled={campaign.status === 'active'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <PlayCircle className="w-4 h-4" />
                      활성
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('paused')}
                      disabled={campaign.status === 'paused'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    >
                      <XCircle className="w-4 h-4" />
                      중단
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={campaign.status === 'completed'}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      완료
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">캠페인 제목 *</Label>
                  <Input
                    id="title"
                    value={campaign.title || ''}
                    onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
                    placeholder="캠페인 제목을 입력하세요"
                  />
                </div>

                <div>
                  <Label htmlFor="brand">브랜드명 *</Label>
                  <Input
                    id="brand"
                    value={campaign.brand || ''}
                    onChange={(e) => setCampaign({ ...campaign, brand: e.target.value })}
                    placeholder="브랜드명을 입력하세요"
                  />
                </div>

                <div>
                  <Label htmlFor="description">캠페인 설명</Label>
                  <Textarea
                    id="description"
                    value={campaign.description || ''}
                    onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                    placeholder="캠페인 설명을 입력하세요"
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">참가 조건</Label>
                  <Textarea
                    id="requirements"
                    value={campaign.requirements || ''}
                    onChange={(e) => setCampaign({ ...campaign, requirements: e.target.value })}
                    placeholder="참가 조건을 입력하세요"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">카테고리</Label>
                    <Select
                      value={campaign.category || 'beauty'}
                      onValueChange={(value) => setCampaign({ ...campaign, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beauty">뷰티</SelectItem>
                        <SelectItem value="fashion">패션</SelectItem>
                        <SelectItem value="food">식품</SelectItem>
                        <SelectItem value="lifestyle">라이프스타일</SelectItem>
                        <SelectItem value="tech">테크</SelectItem>
                        <SelectItem value="other">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="max_participants">모집 인원 *</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      value={campaign.max_participants || ''}
                      onChange={(e) => setCampaign({ ...campaign, max_participants: parseInt(e.target.value) || 0 })}
                      placeholder="모집 인원을 입력하세요"
                      min="1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 크리에이터 포인트 지급 비용 (슈퍼 관리자만 표시) */}
            {isSuperAdmin && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    💰 크리에이터 포인트 지급 비용 (슈퍼 관리자 전용)
                  </CardTitle>
                  <p className="text-sm text-purple-700">기업 페이지에는 표시되지 않습니다. 크리에이터에게 실제 지급되는 금액입니다.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="reward_points">캠페인 총 금액 ({currencySymbols[region]})</Label>
                    <Input
                      id="reward_points"
                      type="number"
                      value={campaign.reward_points || ''}
                      onChange={(e) => setCampaign({ ...campaign, reward_points: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      일본 캠페인의 경우 엔화(¥)로 지급됩니다.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-purple-200">
                    <div className="text-sm text-gray-600 mb-1">총 크리에이터 비용</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {currencySymbols[region]}{((campaign.reward_points * 0.6 || 0) * (campaign.max_participants || 0)).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(campaign.reward_points * 0.6)?.toLocaleString() || 0} × {campaign.max_participants || 0}명
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SNS 플랫폼 */}
            <Card>
              <CardHeader>
                <CardTitle>SNS 플랫폼</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.target_platforms?.instagram || false}
                      onCheckedChange={(checked) => 
                        setCampaign({ 
                          ...campaign, 
                          target_platforms: { ...campaign.target_platforms, instagram: checked }
                        })
                      }
                    />
                    <span>Instagram</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.target_platforms?.youtube || false}
                      onCheckedChange={(checked) => 
                        setCampaign({ 
                          ...campaign, 
                          target_platforms: { ...campaign.target_platforms, youtube: checked }
                        })
                      }
                    />
                    <span>YouTube</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.target_platforms?.tiktok || false}
                      onCheckedChange={(checked) => 
                        setCampaign({ 
                          ...campaign, 
                          target_platforms: { ...campaign.target_platforms, tiktok: checked }
                        })
                      }
                    />
                    <span>TikTok</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* 가이드 내용 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>가이드 내용</CardTitle>
                {region === 'japan' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTranslateToJapanese}
                    disabled={translating}
                    className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 hover:border-purple-400"
                  >
                    {translating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        번역 중...
                      </>
                    ) : (
                      <>
                        <Languages className="w-4 h-4 mr-2" />
                        🇯🇵 AI 일본어 번역
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand_name">브랜드명 (한국어)</Label>
                    <Input
                      id="brand_name"
                      value={campaign.brand_name || ''}
                      onChange={(e) => setCampaign({ ...campaign, brand_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand_name_ja">브랜드명 (일본어)</Label>
                    <Input
                      id="brand_name_ja"
                      value={campaign.brand_name_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, brand_name_ja: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_name">제품명 (한국어)</Label>
                    <Input
                      id="product_name"
                      value={campaign.product_name || ''}
                      onChange={(e) => setCampaign({ ...campaign, product_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="product_name_ja">제품명 (일본어)</Label>
                    <Input
                      id="product_name_ja"
                      value={campaign.product_name_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, product_name_ja: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="product_description_ja">제품 설명 (일본어)</Label>
                  <Textarea
                    id="product_description_ja"
                    value={campaign.product_description_ja || ''}
                    onChange={(e) => setCampaign({ ...campaign, product_description_ja: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product_features">제품 특징 (한국어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="product_features"
                      value={Array.isArray(campaign.product_features) ? campaign.product_features.join('\n') : (campaign.product_features || '')}
                      onChange={(e) => updateArrayField('product_features', e.target.value)}
                      rows={4}
                      placeholder="특징 1&#10;특징 2&#10;특징 3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="product_features_ja">제품 특징 (일본어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="product_features_ja"
                      value={Array.isArray(campaign.product_features_ja) ? campaign.product_features_ja.join('\n') : (campaign.product_features_ja || '')}
                      onChange={(e) => updateArrayField('product_features_ja', e.target.value)}
                      rows={4}
                      placeholder="特徴 1&#10;特徴 2&#10;特徴 3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 영상 요구사항 */}
            <Card>
              <CardHeader>
                <CardTitle>영상 요구사항</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="required_dialogues">필수 대사 (한국어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_dialogues"
                      value={Array.isArray(campaign.required_dialogues) ? campaign.required_dialogues.join('\n') : (campaign.required_dialogues || '')}
                      onChange={(e) => updateArrayField('required_dialogues', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="required_dialogues_ja">필수 대사 (일본어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_dialogues_ja"
                      value={Array.isArray(campaign.required_dialogues_ja) ? campaign.required_dialogues_ja.join('\n') : (campaign.required_dialogues_ja || '')}
                      onChange={(e) => updateArrayField('required_dialogues_ja', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="required_scenes">필수 장면 (한국어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_scenes"
                      value={Array.isArray(campaign.required_scenes) ? campaign.required_scenes.join('\n') : (campaign.required_scenes || '')}
                      onChange={(e) => updateArrayField('required_scenes', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="required_scenes_ja">필수 장면 (일본어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_scenes_ja"
                      value={Array.isArray(campaign.required_scenes_ja) ? campaign.required_scenes_ja.join('\n') : (campaign.required_scenes_ja || '')}
                      onChange={(e) => updateArrayField('required_scenes_ja', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="required_hashtags">필수 해시태그 (한국어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_hashtags"
                      value={Array.isArray(campaign.required_hashtags) ? campaign.required_hashtags.join('\n') : (campaign.required_hashtags || '')}
                      onChange={(e) => updateArrayField('required_hashtags', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="required_hashtags_ja">필수 해시태그 (일본어, 줄바꿈으로 구분)</Label>
                    <Textarea
                      id="required_hashtags_ja"
                      value={Array.isArray(campaign.required_hashtags_ja) ? campaign.required_hashtags_ja.join('\n') : (campaign.required_hashtags_ja || '')}
                      onChange={(e) => updateArrayField('required_hashtags_ja', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="video_duration">영상 길이</Label>
                    <Input
                      id="video_duration"
                      value={campaign.video_duration || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_duration: e.target.value })}
                      placeholder="예: 30초"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_tempo">영상 템포</Label>
                    <Input
                      id="video_tempo"
                      value={campaign.video_tempo || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_tempo: e.target.value })}
                      placeholder="예: 빠름"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_tone">영상 톤</Label>
                    <Input
                      id="video_tone"
                      value={campaign.video_tone || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_tone: e.target.value })}
                      placeholder="예: 밝고 경쾌함"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="video_duration_ja">영상 길이 (일본어)</Label>
                    <Input
                      id="video_duration_ja"
                      value={campaign.video_duration_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_duration_ja: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_tempo_ja">영상 템포 (일본어)</Label>
                    <Input
                      id="video_tempo_ja"
                      value={campaign.video_tempo_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_tempo_ja: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video_tone_ja">영상 톤 (일본어)</Label>
                    <Input
                      id="video_tone_ja"
                      value={campaign.video_tone_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, video_tone_ja: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 촬영 장면 */}
            <Card>
              <CardHeader>
                <CardTitle>촬영 장면</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_ba_photo || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_ba_photo: checked })}
                    />
                    <span>Before/After 사진</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_no_makeup || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_no_makeup: checked })}
                    />
                    <span>노메이크업</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_closeup || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_closeup: checked })}
                    />
                    <span>클로즈업</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_product_closeup || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_product_closeup: checked })}
                    />
                    <span>제품 클로즈업</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_product_texture || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_product_texture: checked })}
                    />
                    <span>제품 텍스처</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_outdoor || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_outdoor: checked })}
                    />
                    <span>야외 촬영</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_couple || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_couple: checked })}
                    />
                    <span>커플 촬영</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_child || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_child: checked })}
                    />
                    <span>아이 촬영</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_troubled_skin || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_troubled_skin: checked })}
                    />
                    <span>트러블 피부</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.shooting_scenes_wrinkles || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, shooting_scenes_wrinkles: checked })}
                    />
                    <span>주름</span>
                  </label>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="additional_shooting_requests">추가 촬영 요청사항 (한국어)</Label>
                    <Textarea
                      id="additional_shooting_requests"
                      value={campaign.additional_shooting_requests || ''}
                      onChange={(e) => setCampaign({ ...campaign, additional_shooting_requests: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="additional_shooting_requests_ja">추가 촬영 요청사항 (일본어)</Label>
                    <Textarea
                      id="additional_shooting_requests_ja"
                      value={campaign.additional_shooting_requests_ja || ''}
                      onChange={(e) => setCampaign({ ...campaign, additional_shooting_requests_ja: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={campaign.meta_ad_code_requested || false}
                      onCheckedChange={(checked) => setCampaign({ ...campaign, meta_ad_code_requested: checked })}
                    />
                    <span>Meta 광고 코드 요청</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* 질문 */}
            <Card>
              <CardHeader>
                <CardTitle>크리에이터 질문</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-3">질문 {num}</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`question${num}`}>질문 내용</Label>
                        <Input
                          id={`question${num}`}
                          value={campaign[`question${num}`] || ''}
                          onChange={(e) => setCampaign({ ...campaign, [`question${num}`]: e.target.value })}
                          placeholder={`질문 ${num}을 입력하세요`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`question${num}_type`}>답변 형식</Label>
                          <Select
                            value={campaign[`question${num}_type`] || 'short'}
                            onValueChange={(value) => setCampaign({ ...campaign, [`question${num}_type`]: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">단답형</SelectItem>
                              <SelectItem value="long">장문형</SelectItem>
                              <SelectItem value="checkbox">체크박스</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {campaign[`question${num}_type`] === 'checkbox' && (
                          <div>
                            <Label htmlFor={`question${num}_options`}>선택 옵션 (쉼표로 구분)</Label>
                            <Input
                              id={`question${num}_options`}
                              value={campaign[`question${num}_options`] || ''}
                              onChange={(e) => setCampaign({ ...campaign, [`question${num}_options`]: e.target.value })}
                              placeholder="옵션1, 옵션2, 옵션3"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 참가 조건 */}
            <Card>
              <CardHeader>
                <CardTitle>참가 조건</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="age_requirement">나이 조건</Label>
                  <Input
                    id="age_requirement"
                    value={campaign.age_requirement || ''}
                    onChange={(e) => setCampaign({ ...campaign, age_requirement: e.target.value })}
                    placeholder="예: 20-30세"
                  />
                </div>
                <div>
                  <Label htmlFor="skin_type_requirement">피부 타입 조건</Label>
                  <Input
                    id="skin_type_requirement"
                    value={campaign.skin_type_requirement || ''}
                    onChange={(e) => setCampaign({ ...campaign, skin_type_requirement: e.target.value })}
                    placeholder="예: 건성, 지성, 복합성"
                  />
                </div>
                <div>
                  <Label htmlFor="offline_visit_requirement">오프라인 방문 조건</Label>
                  <Textarea
                    id="offline_visit_requirement"
                    value={campaign.offline_visit_requirement || ''}
                    onChange={(e) => setCampaign({ ...campaign, offline_visit_requirement: e.target.value })}
                    placeholder="오프라인 방문이 필요한 경우 상세 내용을 입력하세요"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 일정 */}
            <Card>
              <CardHeader>
                <CardTitle>캠페인 일정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="application_deadline">모집 마감일</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={campaign.application_deadline ? new Date(campaign.application_deadline).toISOString().split('T')[0] : ''}
                    onChange={(e) => setCampaign({ ...campaign, application_deadline: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">캠페인 시작일</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setCampaign({ ...campaign, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">캠페인 종료일</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setCampaign({ ...campaign, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
