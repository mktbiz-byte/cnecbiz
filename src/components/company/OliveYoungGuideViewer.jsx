import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { ArrowLeft, CheckCircle, Calendar, ExternalLink } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungGuideViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('product')

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

  if (loading) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">로딩 중...</div>
        </div>
      </>
    )
  }

  if (!campaign) {
    return (
      <>
        <CompanyNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">캠페인을 찾을 수 없습니다.</div>
        </div>
      </>
    )
  }

  const hasInstagram = campaign.category && campaign.category.includes('instagram')

  const tabs = [
    { id: 'product', label: '제품 소개' },
    { id: 'video1', label: '첫번째 영상 가이드' },
    { id: 'video2', label: '두번째 영상 가이드' },
    { id: 'story', label: '스토리 필수 사항' },
    { id: 'tips', label: '촬영 팁' },
    { id: 'cautions', label: '주의사항' }
  ]

  return (
    <>
      <CompanyNavigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            🌸 올영세일 캠페인 가이드 미리보기
          </h1>
          <p className="text-gray-600">
            캠페인: <span className="font-semibold">{campaign.title}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            크리에이터가 실제로 보게 될 가이드입니다.
          </p>
        </div>

        {/* 안내 메시지 */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-pink-800">
            ✅ 가이드가 생성되었습니다! 내용을 확인하신 후 결제를 진행해주세요.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="flex overflow-x-auto border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {/* 제품 소개 */}
            {activeTab === 'product' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">📦 제품 정보</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">브랜드</p>
                    <p className="font-semibold">{campaign.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">제품명</p>
                    <p className="font-semibold">{campaign.product_name}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">제품 특징</p>
                    <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{campaign.product_features}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">핵심 소구 포인트</p>
                    <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">{campaign.product_key_points}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 첫번째 영상 가이드 (STEP 1) */}
            {activeTab === 'video1' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                      STEP 1
                    </span>
                    <h2 className="text-2xl font-semibold">상품 리뷰</h2>
                  </div>
                  {campaign.step1_deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      마감: {new Date(campaign.step1_deadline).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {campaign.oliveyoung_step1_guide_ai || campaign.oliveyoung_step1_guide}
                  </div>
                </div>
                {campaign.oliveyoung_step1_guide_file && (
                  <div className="mt-4">
                    <a
                      href={campaign.oliveyoung_step1_guide_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      첨부파일 보기
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 두번째 영상 가이드 (STEP 2) */}
            {activeTab === 'video2' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                      STEP 2
                    </span>
                    <h2 className="text-2xl font-semibold">세일 홍보</h2>
                  </div>
                  {campaign.step2_deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      마감: {new Date(campaign.step2_deadline).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {campaign.oliveyoung_step2_guide_ai || campaign.oliveyoung_step2_guide}
                  </div>
                </div>
                {campaign.oliveyoung_step2_guide_file && (
                  <div className="mt-4">
                    <a
                      href={campaign.oliveyoung_step2_guide_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      첨부파일 보기
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 스토리 필수 사항 (STEP 3) */}
            {activeTab === 'story' && (
              <div>
                {hasInstagram && campaign.oliveyoung_step3_guide ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold">
                          STEP 3
                        </span>
                        <h2 className="text-2xl font-semibold">세일 당일 스토리</h2>
                      </div>
                      {campaign.step3_deadline && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          마감: {new Date(campaign.step3_deadline).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        ℹ️ STEP 2 영상에 아래 URL을 추가하여 인스타그램 스토리에 업로드해주세요.
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">제품 구매 URL:</p>
                      <a
                        href={campaign.oliveyoung_step3_guide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {campaign.oliveyoung_step3_guide}
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>인스타그램 카테고리를 선택하지 않았거나 스토리 가이드가 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {/* 촬영 팁 */}
            {activeTab === 'tips' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">💡 촬영 팁</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="whitespace-pre-wrap">
                    {campaign.oliveyoung_shooting_tips || campaign.shooting_tips || '촬영 팁이 아직 작성되지 않았습니다.'}
                  </div>
                </div>
              </div>
            )}

            {/* 주의사항 */}
            {activeTab === 'cautions' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">⚠️ 주의사항</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="whitespace-pre-wrap">
                    {campaign.oliveyoung_cautions || campaign.cautions || '주의사항이 아직 작성되지 않았습니다.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
          >
            가이드 수정
          </Button>
          <Button
            onClick={() => navigate(`/company/campaigns/${id}/order-confirmation`)}
            size="lg"
            className="bg-pink-600 hover:bg-pink-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            결제하기
          </Button>
        </div>
      </div>
    </>
  )
}
