import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ArrowRight, Sparkles, FileText, Users, Video, Calendar, Target, Gift, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function OliveYoungCampaignIntro() {
  const navigate = useNavigate()
  const [referenceVideos, setReferenceVideos] = useState([])

  useEffect(() => {
    fetchReferenceVideos()
  }, [])

  const fetchReferenceVideos = async () => {
    try {
      const { data, error} = await supabase
        .from('campaign_reference_videos')
        .select('*')
        .eq('campaign_type', 'oliveyoung')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (error) throw error
      setReferenceVideos(data || [])
    } catch (error) {
      console.error('Error fetching reference videos:', error)
    }
  }

  const getVideoId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🌸 올영세일 캠페인 가이드
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            올리브영 세일 시즌<br />
            특화 마케팅 패키지
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            3단계 콘텐츠 전략으로 세일 기간 매출을 극대화하는 전문 캠페인
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/create/korea')}
            size="lg"
            className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 정보 */}
        <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-pink-400 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  스탠다드 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩300,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 3단계 콘텐츠 (릴스 2 + 스토리 1)</p>
                  <p className="text-gray-700">• 크리에이터 SNS 업로드</p>
                  <p className="text-gray-700">• 통합 가이드 제공</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-400 hover:border-pink-500 transition-all shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  프리미엄 패키지 ⭐
                </div>
                <div className="text-4xl font-bold mb-2">₩400,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 3단계 콘텐츠 (릴스 2 + 스토리 1)</p>
                  <p className="text-gray-700">• 크리에이터 SNS 업로드</p>
                  <p className="text-gray-700">• 통합 가이드 제공</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 이 캠페인을 선택해야 하는 이유 */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              <Sparkles className="inline w-8 h-8 text-pink-600 mr-2" />
              왜 올영세일 캠페인을 선택해야 할까요?
            </h2>
            <p className="text-gray-600">올리브영 세일 시즌에 최적화된 3단계 콘텐츠 전략으로 매출을 극대화합니다</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-pink-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Zap className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">3단계 콘텐츠 전략</h3>
                    <p className="text-gray-600">
                      세일 전 티징(릴스 1) → 세일 중 본격 홍보(릴스 2) → 세일 마감 리마인드(스토리 1)로 
                      구매 전환을 극대화하는 체계적인 콘텐츠 구성입니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Gift className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">세일 시즌 특화</h3>
                    <p className="text-gray-600">
                      올리브영 세일 기간에 맞춰 기획된 전문 캠페인으로, 
                      세일 혜택과 제품 장점을 효과적으로 전달하여 구매를 유도합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-cyan-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">통합 가이드 제공</h3>
                    <p className="text-gray-600">
                      3단계 콘텐츠를 하나의 통합 가이드로 제공하여, 
                      크리에이터가 일관된 메시지로 연속된 콘텐츠를 제작할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">높은 구매 전환율</h3>
                    <p className="text-gray-600">
                      세일 기간 동안 여러 번 노출되는 콘텐츠로 브랜드 인지도를 높이고, 
                      실제 구매로 이어지는 높은 전환율을 달성합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 캠페인 생성 방법 */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              <FileText className="inline w-8 h-8 text-pink-600 mr-2" />
              캠페인 생성 방법
            </h2>
            <p className="text-gray-600">간단한 5단계로 캠페인을 시작하세요</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: '1', title: '캠페인 타입 선택', desc: '올영세일 캠페인 선택' },
              { step: '2', title: '등급 및 인원 선택', desc: '스탠다드/프리미엄' },
              { step: '3', title: '기본 정보 입력', desc: '캠페인명, 세일 기간' },
              { step: '4', title: '통합 가이드 업로드', desc: '3단계 콘텐츠 가이드' },
              { step: '5', title: '캠페인 생성', desc: '크리에이터 모집 시작' }
            ].map((item, idx) => (
              <Card key={idx} className="border-2 border-pink-100 hover:border-pink-400 transition-all">
                <CardContent className="p-4 text-center">
                  <div className="bg-pink-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-bold mb-2 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 프로세스 */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              <Calendar className="inline w-8 h-8 text-pink-600 mr-2" />
              캠페인 진행 프로세스
            </h2>
            <p className="text-gray-600">3단계 콘텐츠로 세일 기간 매출을 극대화합니다</p>
          </div>
          <div className="space-y-4">
            {[
              { 
                title: '1단계: 세일 전 티징 (릴스 1)', 
                desc: '세일 시작 전 제품을 미리 소개하고 기대감을 조성합니다. "곧 올영세일이니 꼭 사야 할 제품"으로 관심을 유도합니다.',
                icon: Zap,
                color: 'pink'
              },
              { 
                title: '2단계: 세일 중 본격 홍보 (릴스 2)', 
                desc: '세일이 시작되면 할인 혜택과 함께 제품의 장점을 상세하게 소개합니다. 구매 링크와 함께 즉시 구매를 유도합니다.',
                icon: Gift,
                color: 'purple'
              },
              { 
                title: '3단계: 세일 마감 리마인드 (스토리 1)', 
                desc: '세일 종료 임박 시점에 스토리로 마지막 구매 기회를 알립니다. "마지막 기회" 메시지로 긴급성을 강조합니다.',
                icon: Target,
                color: 'cyan'
              },
              { 
                title: '성과 분석 및 리포트', 
                desc: '3단계 콘텐츠의 조회수, 좋아요, 댓글, 구매 전환율을 종합 분석하여 리포트를 제공합니다.',
                icon: FileText,
                color: 'green'
              }
            ].map((item, idx) => (
              <Card key={idx} className={`border-2 border-${item.color}-100`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`bg-${item.color}-100 p-3 rounded-lg flex-shrink-0`}>
                      <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`bg-${item.color}-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm`}>
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-lg">{item.title}</h3>
                      </div>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 레퍼런스 영상 */}
        {referenceVideos.length > 0 && (
          <div className="mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4">
                <Video className="inline w-8 h-8 text-pink-600 mr-2" />
                레퍼런스 영상 확인
              </h2>
              <p className="text-gray-600">실제 올영세일 캠페인으로 제작된 영상을 확인해보세요</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {referenceVideos.map((video) => {
                const videoId = getVideoId(video.video_url)
                return (
                  <Card key={video.id} className="border-2 border-gray-200 hover:border-pink-400 transition-all overflow-hidden">
                    <CardContent className="p-0">
                      {videoId ? (
                        <div className="relative pb-[177.78%]">
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="aspect-[9/16] bg-gray-200 flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold mb-1">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-gray-600">{video.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 올영세일 캠페인을 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            3단계 콘텐츠 전략으로 세일 기간 매출을 극대화하세요
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/create/korea')}
            size="lg"
            className="bg-white text-pink-600 hover:bg-gray-100 px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
