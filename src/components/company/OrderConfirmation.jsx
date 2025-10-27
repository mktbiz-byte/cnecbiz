import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, FileText } from 'lucide-react'

const OrderConfirmation = () => {
  const navigate = useNavigate()
  const { id } = useParams()

  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToInvoice = () => {
    navigate(`/company/campaigns/${id}/invoice`)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">로딩 중...</div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12 text-red-600">{error || '캠페인을 찾을 수 없습니다.'}</div>
      </div>
    )
  }

  const packagePrices = {
    '올영 20만원': 200000,
    '프리미엄 30만원': 300000,
    '4주챌린지 60만원': 600000
  }

  const packagePrice = packagePrices[campaign.package_type] || 0
  const totalCost = packagePrice * campaign.recruitment_count

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/company/campaigns/${id}/review`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        가이드 확인으로 돌아가기
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">주문서 확인</CardTitle>
            <Badge variant="secondary" className="text-sm">
              <FileText className="w-3 h-3 mr-1" />
              주문 확인
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            캠페인 주문 내역을 확인하고 견적서를 받으세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 캠페인 기본 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">캠페인 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">캠페인명</span>
                <span className="font-medium">{campaign.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">브랜드</span>
                <span>{campaign.brand}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">제품명</span>
                <span>{campaign.product_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">카테고리</span>
                <span>{campaign.category}</span>
              </div>
            </div>
          </div>

          {/* 제품 상세 정보 */}
          {campaign.product_description && (
            <div>
              <h3 className="font-semibold text-lg mb-4">제품 설명</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {campaign.product_description}
              </div>
            </div>
          )}

          {/* 제품 링크 */}
          {campaign.product_link && (
            <div>
              <h3 className="font-semibold text-lg mb-4">제품 링크</h3>
              <a
                href={campaign.product_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm break-all"
              >
                {campaign.product_link}
              </a>
            </div>
          )}

          {/* 제품 상세 이미지 */}
          {campaign.product_detail_file_url && (
            <div>
              <h3 className="font-semibold text-lg mb-4">제품 상세 이미지</h3>
              <img
                src={campaign.product_detail_file_url}
                alt="제품 상세"
                className="w-full rounded-lg border"
              />
            </div>
          )}

          {/* 패키지 및 비용 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">패키지 및 비용</h3>
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">선택 패키지</span>
                <span className="font-semibold text-blue-600">{campaign.package_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">패키지 단가</span>
                <span className="font-medium">{packagePrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">모집 인원</span>
                <span className="font-medium">{campaign.recruitment_count}명</span>
              </div>
              <div className="border-t border-blue-200 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">예상 총 비용</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {totalCost.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 모집 정보 */}
          <div>
            <h3 className="font-semibold text-lg mb-4">모집 정보</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">모집 인원</span>
                <span className="font-medium">{campaign.recruitment_count}명</span>
              </div>
              {campaign.recruitment_start_date && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">모집 시작일</span>
                  <span>{new Date(campaign.recruitment_start_date).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
              {campaign.recruitment_end_date && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">모집 종료일</span>
                  <span>{new Date(campaign.recruitment_end_date).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">주문 진행 안내</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>주문서를 확인하신 후 견적서 페이지로 이동합니다</li>
              <li>견적서에서 입금 계좌 정보를 확인하실 수 있습니다</li>
              <li>입금 완료 후 승인 요청을 진행해주세요</li>
              <li>관리자 승인 후 캠페인이 시작됩니다</li>
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => navigate(`/company/campaigns/${id}/review`)}
              variant="outline"
              className="flex-1"
            >
              가이드 다시 확인
            </Button>
            <Button
              onClick={handleProceedToInvoice}
              className="flex-1"
            >
              견적서 확인하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderConfirmation

