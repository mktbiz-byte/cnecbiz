import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Sparkles, Loader2, Instagram, Youtube, Video, 
  CheckCircle, ArrowRight, User, Mail, Phone
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function CreatorProfileApplication() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    creator_name: '',
    email: '',
    phone: '',
    instagram_url: '',
    youtube_url: '',
    tiktok_url: '',
    other_sns_url: '',
    self_introduction: '', // 크리에이터가 직접 작성하는 간단한 소개
    
    // AI가 자동 생성
    ai_generated_bio: '',
    ai_generated_strengths: [],
    ai_generated_categories: [],
    ai_generated_target_audience: '',
    ai_generated_content_style: '',
    total_followers: 0,
    avg_engagement_rate: 0,
    avg_views: 0
  })

  const handleGenerateProfile = async () => {
    if (!formData.instagram_url && !formData.youtube_url && !formData.tiktok_url) {
      alert('최소 하나의 SNS URL을 입력해주세요')
      return
    }

    setIsGenerating(true)
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다')

      const snsUrls = [
        formData.instagram_url && `Instagram: ${formData.instagram_url}`,
        formData.youtube_url && `YouTube: ${formData.youtube_url}`,
        formData.tiktok_url && `TikTok: ${formData.tiktok_url}`,
        formData.other_sns_url && `기타: ${formData.other_sns_url}`
      ].filter(Boolean).join('\n')

      const prompt = `당신은 크리에이터 프로필 분석 전문가입니다. 다음 정보를 바탕으로 기업이 보기에 매력적인 크리에이터 프로필을 생성해주세요.

크리에이터 이름: ${formData.creator_name}
크리에이터 자기소개: ${formData.self_introduction || '없음'}

SNS 계정:
${snsUrls}

다음 형식의 JSON으로 응답해주세요:
{
  "bio": "기업 담당자가 보기에 매력적인 크리에이터 소개 (2-3문장, 전문적이고 신뢰감 있게)",
  "strengths": ["구체적인 강점1", "구체적인 강점2", "구체적인 강점3", "구체적인 강점4", "구체적인 강점5"],
  "categories": ["주요 카테고리1", "주요 카테고리2", "주요 카테고리3"],
  "target_audience": "주요 타겟 오디언스 (연령대, 성별, 관심사 포함)",
  "content_style": "콘텐츠 스타일 특징 (톤앤매너, 편집 스타일 등)",
  "estimated_followers": 예상 총 팔로워 수 (숫자),
  "estimated_engagement": 예상 평균 참여율 (소수점, 예: 3.5),
  "estimated_views": 예상 평균 조회수 (숫자)
}

참고:
- 강점은 광고주 입장에서 가치있는 내용으로 (예: "높은 구매 전환율", "충성도 높은 팔로워")
- 카테고리는 beauty, fashion, food, lifestyle, tech, travel, fitness, gaming, education, entertainment 중 선택
- 통계는 현실적인 범위로 추정`

      // 프로필 분석: 단순 분석 → gemini-2.0-flash-lite (4K RPM, 무제한 RPD)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              temperature: 0.7, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json"
            }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const resultText = data.candidates[0]?.content?.parts[0]?.text
      
      if (!resultText) throw new Error('AI 응답이 비어있습니다')
      
      const aiProfile = JSON.parse(resultText)

      setFormData(prev => ({
        ...prev,
        ai_generated_bio: aiProfile.bio,
        ai_generated_strengths: aiProfile.strengths,
        ai_generated_categories: aiProfile.categories,
        ai_generated_target_audience: aiProfile.target_audience,
        ai_generated_content_style: aiProfile.content_style,
        total_followers: aiProfile.estimated_followers || 0,
        avg_engagement_rate: aiProfile.estimated_engagement || 0,
        avg_views: aiProfile.estimated_views || 0
      }))

      setStep(3)
    } catch (error) {
      console.error('AI generation error:', error)
      alert('프로필 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()

      const applicationData = {
        user_id: user?.id,
        creator_name: formData.creator_name,
        email: formData.email,
        phone: formData.phone,
        instagram_url: formData.instagram_url,
        youtube_url: formData.youtube_url,
        tiktok_url: formData.tiktok_url,
        other_sns_url: formData.other_sns_url,
        
        ai_generated_bio: formData.ai_generated_bio,
        ai_generated_strengths: formData.ai_generated_strengths,
        ai_generated_categories: formData.ai_generated_categories,
        ai_generated_target_audience: formData.ai_generated_target_audience,
        ai_generated_content_style: formData.ai_generated_content_style,
        
        final_bio: formData.self_introduction || formData.ai_generated_bio,
        final_strengths: formData.ai_generated_strengths,
        final_categories: formData.ai_generated_categories,
        final_target_audience: formData.ai_generated_target_audience,
        final_content_style: formData.ai_generated_content_style,
        
        total_followers: formData.total_followers,
        avg_engagement_rate: formData.avg_engagement_rate,
        avg_views: formData.avg_views,
        
        status: 'pending'
      }

      const { error } = await supabaseBiz
        .from('featured_creator_applications')
        .insert(applicationData)

      if (error) throw error

      setStep(4)
    } catch (error) {
      console.error('Submit error:', error)
      alert('신청 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-purple-100">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardTitle className="text-3xl flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            추천 크리에이터 신청
          </CardTitle>
          <p className="text-purple-100 mt-2">
            간단한 정보만 입력하시면 AI가 자동으로 프로필을 생성해드립니다
          </p>
        </CardHeader>

        <CardContent className="p-8">
          {/* Step 1: 기본 정보 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
                  STEP 1 / 3
                </div>
                <h2 className="text-2xl font-bold mb-2">기본 정보를 입력해주세요</h2>
                <p className="text-gray-600">빠른 신청을 위해 필수 정보만 받습니다</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    활동명 *
                  </label>
                  <Input
                    value={formData.creator_name}
                    onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                    placeholder="크리에이터 활동명"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    이메일 *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-600" />
                    연락처 *
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="010-0000-0000"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    간단한 자기소개 (선택)
                  </label>
                  <textarea
                    value={formData.self_introduction}
                    onChange={(e) => setFormData({ ...formData, self_introduction: e.target.value })}
                    placeholder="기업에게 하고 싶은 말이 있다면 간단히 작성해주세요 (선택사항)"
                    className="w-full px-4 py-3 border-2 rounded-lg min-h-24 text-lg"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  if (!formData.creator_name || !formData.email || !formData.phone) {
                    alert('필수 정보를 모두 입력해주세요')
                    return
                  }
                  setStep(2)
                }}
                className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                다음 단계
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: SNS 정보 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
                  STEP 2 / 3
                </div>
                <h2 className="text-2xl font-bold mb-2">SNS 계정을 입력해주세요</h2>
                <p className="text-gray-600">AI가 자동으로 채널을 분석하여 프로필을 생성합니다</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" />
                    Instagram URL
                  </label>
                  <Input
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/username"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    YouTube URL
                  </label>
                  <Input
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/@username"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    TikTok URL
                  </label>
                  <Input
                    value={formData.tiktok_url}
                    onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                    placeholder="https://tiktok.com/@username"
                    className="border-2 h-12 text-lg"
                  />
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  💡 <strong>팁:</strong> 최소 하나의 SNS URL을 정확하게 입력해주세요. 
                  AI가 채널을 분석하여 팔로워, 참여율, 콘텐츠 스타일 등을 자동으로 파악합니다.
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 text-lg"
                >
                  이전
                </Button>
                <Button
                  onClick={handleGenerateProfile}
                  disabled={isGenerating}
                  className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      AI 프로필 생성
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: 프로필 확인 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold mb-4">
                  STEP 3 / 3
                </div>
                <h2 className="text-2xl font-bold mb-2">AI가 생성한 프로필을 확인하세요</h2>
                <p className="text-gray-600">이 정보가 기업에게 전달됩니다</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI 생성 프로필
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-1">크리에이터 소개</div>
                      <p className="text-gray-800">{formData.ai_generated_bio}</p>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">주요 강점</div>
                      <div className="flex flex-wrap gap-2">
                        {formData.ai_generated_strengths.map((strength, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            ✓ {strength}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold text-gray-700 mb-2">콘텐츠 카테고리</div>
                      <div className="flex flex-wrap gap-2">
                        {formData.ai_generated_categories.map((cat, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            #{cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {formData.total_followers.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">총 팔로워</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600">
                          {formData.avg_engagement_rate}%
                        </div>
                        <div className="text-xs text-gray-600">평균 참여율</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {formData.avg_views.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">평균 조회수</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  ⚠️ <strong>안내:</strong> 프로필 제출 후에는 관리자 승인이 필요합니다. 
                  승인되면 기업의 캠페인에 자동으로 추천될 수 있습니다.
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 h-14 text-lg"
                >
                  이전
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-14 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      프로필 제출하기
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: 완료 */}
          {step === 4 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              
              <h2 className="text-3xl font-bold mb-4">신청이 완료되었습니다! 🎉</h2>
              
              <p className="text-gray-600 mb-8 text-lg">
                관리자 검토 후 승인되면 이메일로 안내드리겠습니다.<br />
                승인되면 기업의 캠페인에 자동으로 추천됩니다.
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="font-bold mb-2">다음 단계</h3>
                <ul className="text-left space-y-2 text-sm text-gray-700">
                  <li>✓ 관리자가 프로필을 검토합니다 (1-2일 소요)</li>
                  <li>✓ 승인되면 추천 크리에이터 풀에 등록됩니다</li>
                  <li>✓ AI가 적합한 캠페인에 자동으로 추천합니다</li>
                  <li>✓ 기업이 선택하면 협업 제안을 받게 됩니다</li>
                </ul>
              </div>

              <Button
                onClick={() => navigate('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-12 px-8"
              >
                메인으로 돌아가기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

