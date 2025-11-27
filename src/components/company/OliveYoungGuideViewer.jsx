import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { ArrowLeft, Calendar, ExternalLink, CreditCard } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungGuideViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">캠페인을 찾을 수 없습니다.</div>
        </div>
      </>
    )
  }

  const hasInstagram = campaign.category && campaign.category.includes('instagram')

  return (
    <>
      <CompanyNavigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            가이드 편집으로 돌아가기
          </Button>
          <h1 className="text-3xl font-bold mb-2">
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
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📦 제품 정보</h2>
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
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🎬 콘텐츠 타입</h2>
          <div className="flex items-center gap-3">
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
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📅 캠페인 진행 단계</h2>
          
          {/* STEP 1 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
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
            </div>
            <p className="text-gray-700 text-sm pl-3">
              {campaign.oliveyoung_step1_guide_ai || campaign.oliveyoung_step1_guide || '제품 리뷰 영상을 제작해주세요.'}
            </p>
          </div>

          {/* STEP 2 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
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
            </div>
            <p className="text-gray-700 text-sm pl-3">
              {campaign.oliveyoung_step2_guide_ai || campaign.oliveyoung_step2_guide || '세일 홍보 영상을 제작해주세요.'}
            </p>
          </div>

          {/* STEP 3 */}
          {hasInstagram && campaign.oliveyoung_step3_guide && (
            <div>
              <div className="flex items-center gap-3 mb-2">
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
              </div>
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
            </div>
          )}
        </div>

        {/* 주의사항 */}
        {campaign.cautions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-3 text-amber-900">⚠️ 주의사항</h2>
            <p className="whitespace-pre-wrap text-amber-800 text-sm">
              {campaign.cautions}
            </p>
          </div>
        )}

        {/* 결제 버튼 */}
        <div className="flex justify-end gap-3">
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
