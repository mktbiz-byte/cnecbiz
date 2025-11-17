import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowLeft, CheckCircle } from 'lucide-react'

const GuideReview = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const region = searchParams.get('region') || 'korea'
  const supabase = getSupabaseClient(region)

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

  const handleConfirm = () => {
    if (region === 'japan') {
      navigate(`/company/campaigns/${id}/order-confirmation?region=japan`)
    } else {
      navigate(`/company/campaigns/${id}/order-confirmation`)
    }
  }

  const handleEdit = () => {
    if (region === 'japan') {
      navigate(`/company/campaigns/guide/japan?id=${id}`)
    } else {
      navigate(`/company/campaigns/guide?id=${id}`)
    }
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

  const videoDurationLabels = {
    '15sec': '15초',
    '30sec': '30초',
    '45sec': '45초',
    '1min': '1분'
  }

  const videoTempoLabels = {
    'fast': '빠름 (역동적, 빠른 편집)',
    'normal': '보통 (자연스러운 속도)',
    'slow': '느림 (차분하고 여유로운)'
  }

  const videoToneLabels = {
    'bright': '밝고 경쾌한',
    'calm': '차분하고 진지한',
    'emotional': '감성적인',
    'humorous': '유머러스한'
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/company/campaigns')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        캠페인 목록으로
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">크리에이터 가이드 확인</CardTitle>
            <Badge variant="secondary" className="text-sm">1차 검토</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            작성하신 가이드를 확인하고 주문을 진행하세요
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 캠페인 기본 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">캠페인 기본 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="w-32 text-gray-600">캠페인명:</span>
                <span className="font-medium">{campaign.title}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">브랜드:</span>
                <span>{campaign.brand}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">제품명:</span>
                <span>{campaign.product_name}</span>
              </div>
              {campaign.product_link && (
                <div className="flex">
                  <span className="w-32 text-gray-600">제품 링크:</span>
                  <a href={campaign.product_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {campaign.product_link}
                  </a>
                </div>
              )}
              <div className="flex">
                <span className="w-32 text-gray-600">카테고리:</span>
                <span>{campaign.category}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">패키지:</span>
                <span className="font-semibold text-blue-600">{campaign.package_type}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-600">모집 인원:</span>
                <span>{campaign.total_slots}명</span>
              </div>
              {campaign.application_deadline && (
                <div className="flex">
                  <span className="w-32 text-gray-600">지원 마감일:</span>
                  <span className="font-medium text-blue-600">{new Date(campaign.application_deadline).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
              {campaign.start_date && (
                <div className="flex">
                  <span className="w-32 text-gray-600">촬영 마감일:</span>
                  <span className="font-medium text-green-600">{new Date(campaign.start_date).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
              {campaign.end_date && (
                <div className="flex">
                  <span className="w-32 text-gray-600">SNS 업로드일:</span>
                  <span className="font-medium text-purple-600">{new Date(campaign.end_date).toLocaleDateString('ko-KR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* 캠페인 썸네일 */}
          {campaign.image_url && (
            <div>
              <h3 className="font-semibold text-lg mb-3">캠페인 썸네일</h3>
              <img
                src={campaign.image_url}
                alt="캠페인 썸네일"
                className="w-full max-w-md rounded-lg border"
              />
            </div>
          )}

          {/* 브랜드 아이덴티티 */}
          {campaign.brand_identity && (
            <div>
              <h3 className="font-semibold text-lg mb-3">브랜드 아이덴티티</h3>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                {campaign.brand_identity}
              </div>
            </div>
          )}

          {/* 크리에이터 가이드 */}
          {campaign.creator_guide && (
            <div>
              <h3 className="font-semibold text-lg mb-3">크리에이터 가이드</h3>
              <div className="p-4 bg-blue-50 rounded-lg whitespace-pre-wrap text-sm">
                {campaign.creator_guide}
              </div>
            </div>
          )}

          {/* 필수 대사 */}
          {campaign.required_dialogues && campaign.required_dialogues.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">필수 대사</h3>
              <div className="space-y-2">
                {campaign.required_dialogues.map((dialogue, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{dialogue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 장면 */}
          {campaign.required_scenes && campaign.required_scenes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">필수 장면</h3>
              <div className="space-y-2">
                {campaign.required_scenes.map((scene, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{scene}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 해시태그 */}
          {campaign.required_hashtags && campaign.required_hashtags.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">필수 해시태그</h3>
              <div className="flex flex-wrap gap-2">
                {campaign.required_hashtags.map((hashtag, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 영상 스펙 */}
          <div>
            <h3 className="font-semibold text-lg mb-3">영상 스펙</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaign.video_duration && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">영상 시간</p>
                  <p className="font-medium">{videoDurationLabels[campaign.video_duration] || campaign.video_duration}</p>
                </div>
              )}
              {campaign.video_tempo && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">영상 템포</p>
                  <p className="font-medium">{videoTempoLabels[campaign.video_tempo] || campaign.video_tempo}</p>
                </div>
              )}
              {campaign.video_tone && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">톤앤매너</p>
                  <p className="font-medium">{videoToneLabels[campaign.video_tone] || campaign.video_tone}</p>
                </div>
              )}
            </div>
          </div>

          {/* 기타 요청사항 */}
          {campaign.additional_details && (
            <div>
              <h3 className="font-semibold text-lg mb-3">기타 디테일 요청사항</h3>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                {campaign.additional_details}
              </div>
            </div>
          )}

          {/* 제품 상세 정보 */}
          {campaign.product_description && (
            <div>
              <h3 className="font-semibold text-lg mb-3">제품 설명</h3>
              <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                {campaign.product_description}
              </div>
            </div>
          )}

          {/* 제품 상세 이미지 */}
          {campaign.product_detail_file_url && (
            <div>
              <h3 className="font-semibold text-lg mb-3">제품 상세 이미지</h3>
              <img
                src={campaign.product_detail_file_url}
                alt="제품 상세"
                className="w-full rounded-lg border"
              />
            </div>
          )}

          {/* 지원자 질문 */}
          {campaign.questions && campaign.questions.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">지원자 질문</h3>
              <div className="space-y-3">
                {campaign.questions.map((q, index) => (
                  <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">질문 {index + 1}</p>
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleEdit}
              variant="outline"
              className="flex-1"
            >
              가이드 수정
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
            >
              확인 완료 - 주문서 확인하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GuideReview

