import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2, Sparkles, Edit, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function FourWeekChallengeInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)
  const [activeTab, setActiveTab] = useState('product_intro')
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [depositorName, setDepositorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [company, setCompany] = useState(null)
  
  // 세금계산서 정보
  const [needsTaxInvoice, setNeedsTaxInvoice] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    loadCampaignData()
  }, [id])

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)

      // 회사 정보 로드
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (companyData) {
          setCompany(companyData)
          setDepositorName(companyData.company_name || '')
          // 프로필 정보로 세금계산서 필드 자동 채우기
          setCompanyName(companyData.company_name || '')
          setBusinessNumber(companyData.business_registration_number || '')
          setRepresentativeName(companyData.ceo_name || '')
          setContact(companyData.phone || '')
          setEmail(companyData.tax_invoice_email || companyData.email || '')
          setBusinessType(companyData.business_type || '')
          setBusinessCategory(companyData.business_category || '')
          setCompanyAddress(companyData.company_address || '')
        }
      }

      // AI 가이드가 이미 생성되어 있으면 표시
      if (data.ai_generated_guide) {
        setAiGuide(data.ai_generated_guide)
      } else if (data.challenge_weekly_guides_ai) {
        // challenge_weekly_guides_ai를 ai_generated_guide 형식으로 변환
        const weeklyGuidesAI = data.challenge_weekly_guides_ai
        setAiGuide({
          product_intro: `${data.brand} ${data.product_name}\n\n${data.product_features}`,
          week1_guide: weeklyGuidesAI.week1 ? `미션: ${weeklyGuidesAI.week1.mission}\n\n필수 대사: ${weeklyGuidesAI.week1.required_dialogue}\n\n필수 촬영 장면: ${weeklyGuidesAI.week1.required_scenes}` : null,
          week2_guide: weeklyGuidesAI.week2 ? `미션: ${weeklyGuidesAI.week2.mission}\n\n필수 대사: ${weeklyGuidesAI.week2.required_dialogue}\n\n필수 촬영 장면: ${weeklyGuidesAI.week2.required_scenes}` : null,
          week3_guide: weeklyGuidesAI.week3 ? `미션: ${weeklyGuidesAI.week3.mission}\n\n필수 대사: ${weeklyGuidesAI.week3.required_dialogue}\n\n필수 촬영 장면: ${weeklyGuidesAI.week3.required_scenes}` : null,
          week4_guide: weeklyGuidesAI.week4 ? `미션: ${weeklyGuidesAI.week4.mission}\n\n필수 대사: ${weeklyGuidesAI.week4.required_dialogue}\n\n필수 촬영 장면: ${weeklyGuidesAI.week4.required_scenes}` : null,
          cautions: data.product_key_points
        })
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateAIGuide = async () => {
    try {
      setGenerating(true)

      // Gemini API를 사용한 AI 가이드 생성
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다.')
      }

      const weeklyGuides = campaign.challenge_weekly_guides || {}

      // 각 주차가 비어있는지 확인
      const isWeekEmpty = (week) => {
        if (!week) return true
        const mission = week.mission?.trim()
        const dialogue = week.required_dialogue?.trim()
        const scenes = week.required_scenes?.trim()
        return !mission && !dialogue && !scenes
      }

      const week1Empty = isWeekEmpty(weeklyGuides.week1)
      const week2Empty = isWeekEmpty(weeklyGuides.week2)
      const week3Empty = isWeekEmpty(weeklyGuides.week3)
      const week4Empty = isWeekEmpty(weeklyGuides.week4)

      // 모든 주차가 비어있으면 에러
      if (week1Empty && week2Empty && week3Empty && week4Empty) {
        throw new Error('가이드 내용이 비어있습니다. 먼저 가이드를 작성해주세요.')
      }

      const prompt = `당신은 4주 챌린지 캠페인 전문 기획자입니다. 다음 정보를 바탕으로 크리에이터가 실제로 사용할 수 있는 전문적이고 상세한 콘텐츠 제작 가이드를 생성해주세요.

**제품 정보**
- 브랜드: ${campaign.brand}
- 제품명: ${campaign.product_name}
- 제품 특징: ${campaign.product_features}
- 핵심 포인트: ${campaign.product_key_points}

${!week1Empty ? `**1주차 초안**
- 미션: ${weeklyGuides.week1.mission}
- 필수 대사: ${weeklyGuides.week1.required_dialogue}
- 필수 촬영 장면: ${weeklyGuides.week1.required_scenes}
` : ''}
${!week2Empty ? `**2주차 초안**
- 미션: ${weeklyGuides.week2.mission}
- 필수 대사: ${weeklyGuides.week2.required_dialogue}
- 필수 촬영 장면: ${weeklyGuides.week2.required_scenes}
` : ''}
${!week3Empty ? `**3주차 초안**
- 미션: ${weeklyGuides.week3.mission}
- 필수 대사: ${weeklyGuides.week3.required_dialogue}
- 필수 촬영 장면: ${weeklyGuides.week3.required_scenes}
` : ''}
${!week4Empty ? `**4주차 초안**
- 미션: ${weeklyGuides.week4.mission}
- 필수 대사: ${weeklyGuides.week4.required_dialogue}
- 필수 촬영 장면: ${weeklyGuides.week4.required_scenes}
` : ''}

위 초안을 바탕으로 각 주차별로 구체적이고 실행 가능한 가이드를 작성해주세요.
- 각 주차의 목표와 핵심 메시지를 명확히 전달
- 구체적인 촬영 방법, 필수 대사, 촬영 장면 예시 포함
- 크리에이터가 바로 실행할 수 있도록 단계별 액션 아이템 제시

**응답 형식 (JSON):**
{
  "week1": {
    "mission": "1주차 미션 (전문적으로 가공된 버전)",
    "required_dialogue": "1주차 필수 대사 (구체적이고 자연스러운 대사)",
    "required_scenes": "1주차 필수 촬영 장면 (세부 가이드 포함)"
  },
  "week2": {
    "mission": "2주차 미션 (전문적으로 가공된 버전)",
    "required_dialogue": "2주차 필수 대사 (구체적이고 자연스러운 대사)",
    "required_scenes": "2주차 필수 촬영 장면 (세부 가이드 포함)"
  },
  "week3": {
    "mission": "3주차 미션 (전문적으로 가공된 버전)",
    "required_dialogue": "3주차 필수 대사 (구체적이고 자연스러운 대사)",
    "required_scenes": "3주차 필수 촬영 장면 (세부 가이드 포함)"
  },
  "week4": {
    "mission": "4주차 미션 (전문적으로 가공된 버전)",
    "required_dialogue": "4주차 필수 대사 (구체적이고 자연스러운 대사)",
    "required_scenes": "4주차 필수 촬영 장면 (세부 가이드 포함)"
  }
}

명확하고 구체적이며 실행 가능한 가이드를 JSON 형식으로 작성해주세요.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      )

      if (!response.ok) {
        throw new Error('AI 가이드 생성에 실패했습니다.')
      }

      const result = await response.json()
      const generatedText = result.candidates[0].content.parts[0].text
      
      // JSON 파싱
      let weeklyGuidesAI = {
        week1: weeklyGuides.week1 || {},
        week2: weeklyGuides.week2 || {},
        week3: weeklyGuides.week3 || {},
        week4: weeklyGuides.week4 || {}
      }
      
      try {
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          weeklyGuidesAI = parsed
        }
      } catch (e) {
        console.error('JSON 파싱 실패:', e)
      }

      // AI 가공된 가이드 저장
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          challenge_weekly_guides_ai: weeklyGuidesAI,
          guide_generated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError

      // 화면에 표시할 가이드 설정 (빈 주차는 null로 설정)
      const formatWeekGuide = (week, isEmpty) => {
        if (isEmpty) return null
        if (!week || !week.mission) return null
        return `미션: ${week.mission}\n\n필수 대사: ${week.required_dialogue}\n\n필수 촬영 장면: ${week.required_scenes}`
      }

      setAiGuide({
        product_intro: `${campaign.brand} ${campaign.product_name}\n\n${campaign.product_features}`,
        week1_guide: formatWeekGuide(weeklyGuidesAI.week1, week1Empty),
        week2_guide: formatWeekGuide(weeklyGuidesAI.week2, week2Empty),
        week3_guide: formatWeekGuide(weeklyGuidesAI.week3, week3Empty),
        week4_guide: formatWeekGuide(weeklyGuidesAI.week4, week4Empty),
        cautions: campaign.product_key_points
      })

      alert('AI 가이드가 생성되었습니다!')
    } catch (error) {
      console.error('AI 가이드 생성 오류:', error)
      alert('AI 가이드 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleEdit = (section) => {
    setEditingSection(section)
    setEditValue(aiGuide[section] || '')
  }

  const handleSaveEdit = async () => {
    try {
      const updatedGuide = { ...aiGuide, [editingSection]: editValue }
      setAiGuide(updatedGuide)

      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: updatedGuide })
        .eq('id', id)

      if (error) throw error

      setEditingSection(null)
      alert('수정 사항이 저장되었습니다!')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다: ' + error.message)
    }
  }



  const handlePaymentRequest = async () => {
    if (!depositorName.trim()) {
      alert('입금자명을 입력해주세요.')
      return
    }

    if (!confirm(`입금 요청을 진행하시겠습니까?\n\n입금자명: ${depositorName}\n금액: ${calculateTotalCost().toLocaleString()}원`)) {
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const totalCost = calculateTotalCost()

      // 결제 요청 생성 (related_campaign_id를 통해 입금 확인 시 자동 승인)
      const { error: chargeError } = await supabase
        .from('points_charge_requests')
        .insert({
          company_id: user.id,
          amount: totalCost,
          payment_method: 'bank_transfer',
          status: 'pending',
          depositor_name: depositorName,
          related_campaign_id: id, // 입금 확인 시 이 캠페인을 자동 승인 요청
          bank_transfer_info: {
            campaign_id: id,
            campaign_title: campaign.title,
            campaign_type: '4week_challenge'
          }
        })

      if (chargeError) throw chargeError

      // 1. 카카오톡 알림톡 발송
      if (company?.notification_phone || company?.phone) {
        try {
          await fetch('/.netlify/functions/send-kakao-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              receiverNum: company.notification_phone || company.phone,
              receiverName: company.company_name || '회사',
              templateCode: '025100000918',
              variables: {
                '회사명': company.company_name || '회사',
                '캠페인명': campaign.title || '캠페인',
                '금액': totalCost.toLocaleString()
              }
            })
          })
          console.log('[SUCCESS] Kakao notification sent')
        } catch (kakaoError) {
          console.error('[ERROR] Failed to send Kakao notification:', kakaoError)
        }
      }

      // 2. 이메일 발송
      if (company?.notification_email || company?.email) {
        try {
          await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: company.notification_email || company.email,
              subject: '[CNEC] 캠페인 신청 완료',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #333;">[CNEC] 캠페인 신청 완료</h2>
                  <p><strong>${company.company_name || '회사'}</strong>님, 캠페인 신청이 접수되었습니다.</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>캠페인:</strong> ${campaign.title || '캠페인'}</p>
                    <p style="margin: 10px 0;"><strong>금액:</strong> <span style="font-size: 18px; color: #4CAF50;">${totalCost.toLocaleString()}원</span></p>
                  </div>
                  
                  <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1976d2;">입금 계좌</h3>
                    <p style="margin: 5px 0;">IBK기업은행 047-122753-04-011</p>
                    <p style="margin: 5px 0;">예금주: 주식회사 하우파파</p>
                  </div>
                  
                  <p style="color: #666;">입금 확인 후 캠페인이 시작됩니다.</p>
                  <p style="color: #666;">문의: <strong>1833-6025</strong></p>
                  
                  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                  <p style="font-size: 12px; color: #999; text-align: center;">
                    본 메일은 발신전용입니다. 문의사항은 1833-6025로 연락주세요.
                  </p>
                </div>
              `
            })
          })
          console.log('[SUCCESS] Email sent')
        } catch (emailError) {
          console.error('[ERROR] Failed to send email:', emailError)
        }
      }

      // 3. 네이버 웍스 알림 발송
      try {
        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `💰 **새로운 입금 요청**\n\n` +
                     `🏬 **회사:** ${company?.company_name || '미상'}\n` +
                     `📝 **캠페인:** ${campaign.title}\n` +
                     `🎯 **타입:** 4주 챌린지\n` +
                     `👥 **크리에이터 수:** ${campaign.influencer_count || 0}명\n` +
                     `💰 **금액:** ${totalCost.toLocaleString()}원\n` +
                     `👤 **입금자명:** ${depositorName}\n\n` +
                     `➡️ 입금 확인: https://cnectotal.netlify.app/admin/deposits`,
            isAdminNotification: true
          })
        })
      } catch (notifError) {
        console.error('알림 발송 실패:', notifError)
      }

      alert('입금 요청이 제출되었습니다!\n\n입금 확인 후 캠페인이 자동으로 승인 요청됩니다.')
      navigate('/company/campaigns')
    } catch (err) {
      console.error('입금 요청 실패:', err)
      alert('입금 요청에 실패했습니다: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotalCost = () => {
    const packagePrice = 600000 // 4주 챌린지 패키지 기본 가격
    const influencerCount = campaign.influencer_count || 0
    const subtotal = packagePrice * influencerCount
    const vat = Math.floor(subtotal * 0.1)
    return subtotal + vat
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">캠페인을 찾을 수 없습니다.</p>
      </div>
    )
  }

  const weeklyGuides = campaign.challenge_weekly_guides || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/company/campaigns/guide/4week?id=${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          가이드 수정으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
          <p className="text-gray-600">캠페인 가이드</p>
        </div>

        {/* 제품 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>제품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">브랜드</p>
                  <p className="font-medium">{campaign.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">제품명</p>
                  <p className="font-medium">{campaign.product_name || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">제품 특징</p>
                <p className="font-medium">{campaign.product_features || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">핵심 소구 포인트</p>
                <p className="font-medium">{campaign.product_key_points || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 캠페인 지원 가이드 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-2xl font-bold">✨ AI 캠페인 지원 가이드</h2>
            </div>
            <Button
              onClick={generateAIGuide}
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                '재생성'
              )}
            </Button>
          </div>

          {!aiGuide && !generating && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">AI 가이드를 생성하여 크리에이터가 이해하기 쉬운 가이드를 만드세요.</p>
                <Button onClick={generateAIGuide} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 가이드 생성
                </Button>
              </CardContent>
            </Card>
          )}

          {aiGuide && (
            <>
              {/* 탭 버튼 */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab('product_intro')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'product_intro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📦 제품 소개
                </button>
                <button
                  onClick={() => setActiveTab('week1')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'week1' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 1주차
                </button>
                <button
                  onClick={() => setActiveTab('week2')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'week2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 2주차
                </button>
                <button
                  onClick={() => setActiveTab('week3')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'week3' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 3주차
                </button>
                <button
                  onClick={() => setActiveTab('week4')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'week4' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📅 4주차
                </button>
                <button
                  onClick={() => setActiveTab('cautions')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'cautions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ⚠️ 주의사항
                </button>
              </div>

              {/* 제품 소개 */}
              {activeTab === 'product_intro' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">제품 소개</CardTitle>
                    {editingSection !== 'product_intro' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('product_intro')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'product_intro' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.product_intro}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 1주차 가이드 */}
              {activeTab === 'week1' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">1주차 가이드</CardTitle>
                    {editingSection !== 'week1_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('week1_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'week1_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.week1_guide || '미정'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 2주차 가이드 */}
              {activeTab === 'week2' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">2주차 가이드</CardTitle>
                    {editingSection !== 'week2_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('week2_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'week2_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.week2_guide || '미정'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 3주차 가이드 */}
              {activeTab === 'week3' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">3주차 가이드</CardTitle>
                    {editingSection !== 'week3_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('week3_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'week3_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.week3_guide || '미정'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 4주차 가이드 */}
              {activeTab === 'week4' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">4주차 가이드</CardTitle>
                    {editingSection !== 'week4_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('week4_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'week4_guide' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.week4_guide || '미정'}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 주의사항 */}
              {activeTab === 'cautions' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">주의사항</CardTitle>
                    {editingSection !== 'cautions' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('cautions')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'cautions' ? (
                      <div className="space-y-4">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSection(null)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.cautions}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* 결제 정보 */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">💰 결제 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">패키지 단가</span>
                  <span className="font-semibold">600,000원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">크리에이터 수</span>
                  <span className="font-semibold">{campaign.influencer_count || 0}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">소계</span>
                  <span className="font-semibold">{(600000 * (campaign.influencer_count || 0)).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">부가세 (10%)</span>
                  <span className="font-semibold">{Math.floor(600000 * (campaign.influencer_count || 0) * 0.1).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-gray-300">
                  <span className="font-bold text-lg">총 결제 금액</span>
                  <span className="font-bold text-lg text-blue-600">{calculateTotalCost().toLocaleString()}원</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm">입금 계좌 정보</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">은행</span>
                  <span className="font-semibold">IBK기업은행</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">계좌번호</span>
                  <span className="font-semibold">047-122753-04-011</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예금주</span>
                  <span className="font-semibold">주식회사 하우파파</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                입금자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="입금하실 이름을 입력해주세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">
                ⚠️ 입금자명은 입금 확인에 사용되므로 정확히 입력해주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 세금계산서 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>세금계산서 정보 (선택사항)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={needsTaxInvoice}
                  onChange={(e) => setNeedsTaxInvoice(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">세금계산서 발행 필요</span>
              </label>
              <p className="text-sm text-gray-600 mt-2">세금계산서 발행을 원하시는 경우 체크하고 아래 정보를 입력해주세요.</p>
            </div>

            {needsTaxInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      회사명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="(주)에이블씨앤씨"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자등록번호
                    </label>
                    <input
                      type="text"
                      value={businessNumber}
                      onChange={(e) => setBusinessNumber(e.target.value)}
                      placeholder="123-45-67890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대표자명
                    </label>
                    <input
                      type="text"
                      value={representativeName}
                      onChange={(e) => setRepresentativeName(e.target.value)}
                      placeholder="홍길동"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    세금계산서 받으실 메일 주소 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업태
                    </label>
                    <input
                      type="text"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      placeholder="예: 제조업, 도소매업, 서비스업"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종목
                    </label>
                    <input
                      type="text"
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      placeholder="예: 광고대행, 컴퓨터판매, 건설업"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="서울시 강남구..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모 (선택사항)
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="추가 요청사항이 있으시면 입력해주세요"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 제출 버튼 */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/4week?id=${id}`)}
            className="flex-1"
          >
            가이드 수정
          </Button>
          <Button
            onClick={handlePaymentRequest}
            disabled={!aiGuide || submitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                입금 요청 하기
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
