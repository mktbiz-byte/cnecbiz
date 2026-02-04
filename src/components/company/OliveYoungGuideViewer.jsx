import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { ArrowLeft, Calendar, ExternalLink, CreditCard, Edit, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungGuideViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingStep, setEditingStep] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToPayment = () => {
    navigate(`/company/campaigns/${id}/invoice/oliveyoung`)
  }

  const handleEdit = (step) => {
    setEditingStep(step)
    const fieldName = `oliveyoung_step${step}_guide_ai`
    const value = campaign[fieldName] || campaign[`oliveyoung_step${step}_guide`] || ''
    // Remove "STEP X:" prefix if exists
    const cleanValue = value.replace(/^STEP\s*\d+\s*:\s*/i, '')
    setEditValue(cleanValue)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const fieldName = `oliveyoung_step${editingStep}_guide_ai`
      
      const { error } = await supabase
        .from('campaigns')
        .update({ [fieldName]: editValue })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setCampaign({ ...campaign, [fieldName]: editValue })
      setEditingStep(null)
      alert('수정이 저장되었습니다!')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장에 실패했습니다: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingStep(null)
    setEditValue('')
  }

  // Helper function to clean guide text
  const cleanGuideText = (text) => {
    if (!text) return ''
    // Remove "STEP X:" prefix
    return text.replace(/^STEP\s*\d+\s*:\s*/i, '').trim()
  }

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-8 lg:pb-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-8 lg:pb-8">
          <div className="text-center">캠페인을 찾을 수 없습니다.</div>
        </div>
      </>
    )
  }

  const hasInstagram = campaign.category && campaign.category.includes('instagram')

  return (
    <>
      <CompanyNavigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-8 lg:pb-8">
        {/* 헤더 */}
        <div className="mb-6 lg:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            가이드 편집으로 돌아가기
          </Button>
          <h1 className="text-xl lg:text-3xl font-bold mb-2">
            🌸 올영세일 캠페인 가이드
          </h1>
          <p className="text-gray-600">
            캠페인: <span className="font-semibold">{campaign.title}</span>
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-pink-800">
            ✅ 가이드가 생성되었습니다! 내용을 확인하신 후 결제를 진행해주세요.
          </p>
        </div>

        {/* 제품 정보 */}
        <div className="bg-white rounded-lg border p-4 lg:p-6 mb-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">📦 제품 정보</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">브랜드</p>
              <p className="font-semibold">{campaign.brand}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">제품명</p>
              <p className="font-semibold">{campaign.product_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">제품 특징</p>
              <p className="whitespace-pre-wrap text-gray-700">{campaign.product_features}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">핵심 소구 포인트</p>
              <p className="whitespace-pre-wrap text-gray-700">{campaign.product_key_points}</p>
            </div>
          </div>
        </div>

        {/* 콘텐츠 타입 */}
        <div className="bg-white rounded-lg border p-4 lg:p-6 mb-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">🎬 콘텐츠 타입</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {campaign.content_type === 'store_visit' ? (
              <>
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-semibold">
                  🏪 매장 방문형
                </div>
                <p className="text-sm text-gray-600">
                  올리브영 매장을 방문하여 진정성 있는 콘텐츠를 제작해주세요.
                </p>
              </>
            ) : (
              <>
                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold">
                  📦 제품 배송형
                </div>
                <p className="text-sm text-gray-600">
                  배송받은 제품으로 빠르게 콘텐츠를 제작해주세요.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 캠페인 진행 단계 */}
        <div className="bg-white rounded-lg border p-4 lg:p-6 mb-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">📅 캠페인 진행 단계</h2>
          
          {/* STEP 1 */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                STEP 1
              </span>
              <h3 className="font-semibold">상품 리뷰</h3>
              {campaign.step1_deadline && (
                <div className="flex items-center gap-1 text-sm text-gray-600 ml-auto">
                  <Calendar className="w-4 h-4" />
                  {new Date(campaign.step1_deadline).toLocaleDateString('ko-KR')}
                </div>
              )}
              {editingStep !== 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(1)}
                  className="ml-2"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
            {editingStep === 1 ? (
              <div className="pl-3 space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                  placeholder="STEP 1 가이드를 입력하세요"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm pl-3 whitespace-pre-wrap">
                {cleanGuideText(campaign.oliveyoung_step1_guide_ai || campaign.oliveyoung_step1_guide || '제품 리뷰 영상을 제작해주세요.')}
              </p>
            )}
          </div>

          {/* STEP 2 */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                STEP 2
              </span>
              <h3 className="font-semibold">세일 홍보</h3>
              {campaign.step2_deadline && (
                <div className="flex items-center gap-1 text-sm text-gray-600 ml-auto">
                  <Calendar className="w-4 h-4" />
                  {new Date(campaign.step2_deadline).toLocaleDateString('ko-KR')}
                </div>
              )}
              {editingStep !== 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(2)}
                  className="ml-2"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
            {editingStep === 2 ? (
              <div className="pl-3 space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                  placeholder="STEP 2 가이드를 입력하세요"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 text-sm pl-3 whitespace-pre-wrap">
                {cleanGuideText(campaign.oliveyoung_step2_guide_ai || campaign.oliveyoung_step2_guide || '세일 홍보 영상을 제작해주세요.')}
              </p>
            )}
          </div>

          {/* STEP 3 */}
          {hasInstagram && (
            <div>
              <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
                <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                  STEP 3
                </span>
                <h3 className="font-semibold">세일 당일 스토리</h3>
                {campaign.step3_deadline && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 ml-auto">
                    <Calendar className="w-4 h-4" />
                    {new Date(campaign.step3_deadline).toLocaleDateString('ko-KR')}
                  </div>
                )}
                {editingStep !== 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(3)}
                    className="ml-2"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {editingStep === 3 ? (
                <div className="pl-3 space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[100px]"
                    placeholder="STEP 3 가이드를 입력하세요"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {saving ? '저장 중...' : '저장'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {(campaign.oliveyoung_step3_guide_ai || campaign.oliveyoung_step3_guide_text) && (
                    <p className="text-gray-700 text-sm pl-3 mb-3 whitespace-pre-wrap">
                      {cleanGuideText(campaign.oliveyoung_step3_guide_ai || campaign.oliveyoung_step3_guide_text || '')}
                    </p>
                  )}
                  {campaign.oliveyoung_step3_guide && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 pl-3 ml-3">
                      <p className="text-sm text-yellow-800 mb-2">
                        ℹ️ STEP 2 영상에 아래 URL을 추가하여 인스타그램 스토리에 업로드해주세요.
                      </p>
                      <a
                        href={campaign.oliveyoung_step3_guide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {campaign.oliveyoung_step3_guide}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 주의사항 */}
        {campaign.cautions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 lg:p-6 mb-6">
            <h2 className="text-lg lg:text-xl font-bold mb-3 text-amber-900">⚠️ 주의사항</h2>
            <p className="whitespace-pre-wrap text-amber-800 text-sm">
              {campaign.cautions}
            </p>
          </div>
        )}

        {/* 결제 버튼 */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
          >
            가이드 수정
          </Button>
          <Button
            onClick={handleProceedToPayment}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            결제하기
          </Button>
        </div>
      </div>
    </>
  )
}
