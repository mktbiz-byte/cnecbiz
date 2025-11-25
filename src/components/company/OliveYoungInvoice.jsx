import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2, Sparkles, Edit, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)
  const [activeTab, setActiveTab] = useState('product_intro')
  const [editingSection, setEditingSection] = useState(null)
  const [editValue, setEditValue] = useState('')

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

      // AI 가이드가 이미 생성되어 있으면 표시
      if (data.ai_generated_guide) {
        setAiGuide(data.ai_generated_guide)
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

      const response = await fetch('/.netlify/functions/generate-oliveyoung-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: id,
          productName: campaign.product_name,
          productDescription: campaign.product_description,
          productFeatures: campaign.product_features,
          productKeyPoints: campaign.product_key_points,
          video1Guide: campaign.oliveyoung_video1_guide,
          video1Dialogue: campaign.oliveyoung_video1_required_dialogue,
          video1Scenes: campaign.oliveyoung_video1_required_scenes,
          video1Reference: campaign.oliveyoung_video1_reference_url,
          video2Guide: campaign.oliveyoung_video2_guide,
          video2Dialogue: campaign.oliveyoung_video2_required_dialogue,
          video2Scenes: campaign.oliveyoung_video2_required_scenes,
          video2Reference: campaign.oliveyoung_video2_reference_url,
          storyGuide: campaign.oliveyoung_story_guide,
          storyContent: campaign.oliveyoung_story_required_content,
          storyReference: campaign.oliveyoung_story_reference_url
        })
      })

      if (!response.ok) throw new Error('가이드 생성 실패')

      const result = await response.json()
      setAiGuide(result.guide)

      // DB에 저장
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: result.guide })
        .eq('id', id)

      if (error) throw error

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

  const handleSubmit = async () => {
    if (!aiGuide) {
      alert('AI 가이드를 먼저 생성해주세요.')
      return
    }

    if (!confirm('캠페인을 최종 제출하시겠습니까? 제출 후에는 수정이 불가능합니다.')) {
      return
    }

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('campaigns')
        .update({
          status: 'recruiting',
          submitted_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert('캠페인이 성공적으로 제출되었습니다!')
      navigate(`/company/campaigns/${id}?region=korea`)
    } catch (error) {
      console.error('제출 실패:', error)
      alert('캠페인 제출에 실패했습니다: ' + error.message)
    } finally {
      setSubmitting(false)
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
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

        {/* AI 생성 가이드 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-2xl font-bold">✨ AI 생성 가이드</h2>
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
                  onClick={() => setActiveTab('video1')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'video1' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🎬 1차 영상
                </button>
                <button
                  onClick={() => setActiveTab('video2')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'video2' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  🎬 2차 영상
                </button>
                <button
                  onClick={() => setActiveTab('story')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'story' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  📱 스토리 URL
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

              {/* 1차 영상 가이드 */}
              {activeTab === 'video1' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">1차 영상 가이드</CardTitle>
                    {editingSection !== 'video1_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('video1_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'video1_guide' ? (
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
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.video1_guide}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 2차 영상 가이드 */}
              {activeTab === 'video2' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">2차 영상 가이드</CardTitle>
                    {editingSection !== 'video2_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('video2_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'video2_guide' ? (
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
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.video2_guide}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 스토리 URL 가이드 */}
              {activeTab === 'story' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">스토리 URL 가이드</CardTitle>
                    {editingSection !== 'story_guide' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit('story_guide')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {editingSection === 'story_guide' ? (
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
                      <p className="whitespace-pre-wrap text-gray-800">{aiGuide.story_guide}</p>
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

        {/* 제출 버튼 */}
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="flex-1"
          >
            가이드 수정
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !aiGuide}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                결제하기
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
