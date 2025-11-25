import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function OliveYoungInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
      alert('캠페인 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!confirm('캠페인을 최종 제출하시겠습니까? 제출 후에는 수정이 불가능합니다.')) {
      return
    }

    try {
      setSubmitting(true)

      // 캠페인 상태 업데이트
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
          <h1 className="text-3xl font-bold mb-2">올리브영 캠페인 견적서</h1>
          <p className="text-gray-600">{campaign.title}</p>
        </div>

        {/* 캠페인 기본 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>캠페인 기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">브랜드</p>
                <p className="font-medium">{campaign.brand || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">제품명</p>
                <p className="font-medium">{campaign.product_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">모집 인원</p>
                <p className="font-medium">{campaign.total_slots || 0}명</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">패키지 금액</p>
                <p className="font-medium text-blue-600">
                  ₩{(campaign.package_price || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 제품 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📦 제품 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">제품 설명</p>
                <p className="text-gray-800 whitespace-pre-wrap">{campaign.product_description || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">제품 특징</p>
                <p className="text-gray-800 whitespace-pre-wrap">{campaign.product_features || '-'}</p>
              </div>
              {campaign.product_key_points && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">주의사항</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{campaign.product_key_points}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 1차 영상 가이드 */}
        {campaign.oliveyoung_video1_guide && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🎬 1차 영상 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">촬영 가이드</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video1_guide}</p>
                </div>
                {campaign.oliveyoung_video1_required_dialogue && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 대사</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video1_required_dialogue}</p>
                  </div>
                )}
                {campaign.oliveyoung_video1_required_scenes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 장면</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video1_required_scenes}</p>
                  </div>
                )}
                {campaign.oliveyoung_video1_reference_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">레퍼런스 영상</p>
                    <a 
                      href={campaign.oliveyoung_video1_reference_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {campaign.oliveyoung_video1_reference_url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2차 영상 가이드 */}
        {campaign.oliveyoung_video2_guide && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🎬 2차 영상 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">촬영 가이드</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video2_guide}</p>
                </div>
                {campaign.oliveyoung_video2_required_dialogue && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 대사</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video2_required_dialogue}</p>
                  </div>
                )}
                {campaign.oliveyoung_video2_required_scenes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 장면</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video2_required_scenes}</p>
                  </div>
                )}
                {campaign.oliveyoung_video2_reference_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">레퍼런스 영상</p>
                    <a 
                      href={campaign.oliveyoung_video2_reference_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {campaign.oliveyoung_video2_reference_url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3차 영상 가이드 */}
        {campaign.oliveyoung_video3_guide && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🎬 3차 영상 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">촬영 가이드</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video3_guide}</p>
                </div>
                {campaign.oliveyoung_video3_required_dialogue && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 대사</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video3_required_dialogue}</p>
                  </div>
                )}
                {campaign.oliveyoung_video3_required_scenes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 장면</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_video3_required_scenes}</p>
                  </div>
                )}
                {campaign.oliveyoung_video3_reference_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">레퍼런스 영상</p>
                    <a 
                      href={campaign.oliveyoung_video3_reference_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {campaign.oliveyoung_video3_reference_url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 스토리 URL 가이드 */}
        {campaign.oliveyoung_story_guide && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📱 스토리 URL 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">가이드</p>
                  <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_story_guide}</p>
                </div>
                {campaign.oliveyoung_story_required_content && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">필수 포함 내용</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{campaign.oliveyoung_story_required_content}</p>
                  </div>
                )}
                {campaign.oliveyoung_story_reference_url && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">레퍼런스</p>
                    <a 
                      href={campaign.oliveyoung_story_reference_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {campaign.oliveyoung_story_reference_url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/campaigns/guide/oliveyoung?id=${id}`)}
            className="flex-1"
          >
            가이드 수정
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
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
                캠페인 최종 제출
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
