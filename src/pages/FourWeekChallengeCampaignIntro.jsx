import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { ArrowRight, Sparkles, FileText, Users, Video, Calendar, Target, TrendingUp, Award } from 'lucide-react'
import { supabaseBiz as supabase } from '@/lib/supabaseClients'

export default function FourWeekChallengeCampaignIntro() {
  const navigate = useNavigate()
  const [referenceVideos, setReferenceVideos] = useState([])
  const [user, setUser] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const handleCreateCampaign = () => {
    if (user) {
      navigate('/company/campaigns/create/korea')
    } else {
      navigate('/signup')
    }
  }

  useEffect(() => {
    fetchReferenceVideos()
  }, [])

  const fetchReferenceVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_reference_videos')
        .select('*')
        .eq('campaign_type', '4week')
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-16 lg:px-6">
        <div className="text-center mb-12">
          <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🏆 4주 챌린지 가이드
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-6 text-gray-900">
            4주간 지속되는<br />
            강력한 브랜드 각인 효과
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            4개의 미션 가이드로 4주간 연속 노출되는 프리미엄 장기 캠페인
          </p>
          <Button
            onClick={handleCreateCampaign}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 정보 */}
        <div className="max-w-md mx-auto mb-16">
          <Card className="border-2 border-purple-400 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  고정 가격 패키지
                </div>
                <div className="text-5xl font-bold mb-2">₩600,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도 / 4주 전체</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 4개의 미션 가이드 제공</p>
                  <p className="text-gray-700">• 4주 연속 SNS 리뷰</p>
                  <p className="text-gray-700">• 주차별 통합 가이드</p>
                  <p className="text-gray-700">• 장기 브랜드 각인 효과</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 이 캠페인을 선택해야 하는 이유 */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              <Sparkles className="inline w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mr-2" />
              왜 4주 챌린지를 선택해야 할까요?
            </h2>
            <p className="text-gray-600">4주간 지속적인 노출로 브랜드를 깊이 각인시키는 프리미엄 장기 캠페인입니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-purple-100">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">지속적인 브랜드 노출</h3>
                    <p className="text-gray-600">
                      4주 동안 매주 새로운 콘텐츠가 업로드되어 지속적으로 브랜드가 노출됩니다. 
                      단발성 캠페인과 달리 장기간 브랜드 인지도를 높일 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">미션 기반 콘텐츠</h3>
                    <p className="text-gray-600">
                      매주 다른 미션을 수행하며 제품의 다양한 측면을 소개합니다. 
                      "1주차: 언박싱", "2주차: 첫 사용", "3주차: 일상 활용", "4주차: 최종 리뷰" 등의 구성으로 스토리텔링이 가능합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">높은 신뢰도 구축</h3>
                    <p className="text-gray-600">
                      4주간의 장기 사용 후기로 제품에 대한 신뢰도가 높아집니다. 
                      단기 리뷰보다 진정성 있는 평가로 인식되어 구매 전환율이 높습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-cyan-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">통합 가이드 제공</h3>
                    <p className="text-gray-600">
                      4주차 미션을 하나의 통합 가이드로 제공하여, 
                      크리에이터가 일관된 스토리라인으로 연속된 콘텐츠를 제작할 수 있습니다.
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              <FileText className="inline w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mr-2" />
              캠페인 생성 방법
            </h2>
            <p className="text-gray-600">간단한 5단계로 캠페인을 시작하세요</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { step: '1', title: '캠페인 타입 선택', desc: '4주 챌린지 선택' },
              { step: '2', title: '참여 인원 선택', desc: '크리에이터 수 결정' },
              { step: '3', title: '기본 정보 입력', desc: '캠페인명, 4주 일정' },
              { step: '4', title: '미션 가이드 업로드', desc: '4주차 미션 가이드' },
              { step: '5', title: '캠페인 생성', desc: '크리에이터 모집 시작' }
            ].map((item, idx) => (
              <Card key={idx} className="border-2 border-purple-100 hover:border-purple-400 transition-all">
                <CardContent className="p-4 text-center">
                  <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
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
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              <Calendar className="inline w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mr-2" />
              캠페인 진행 프로세스
            </h2>
            <p className="text-gray-600">4주간 매주 새로운 미션으로 브랜드를 각인시킵니다</p>
          </div>
          <div className="space-y-4">
            {[
              { 
                title: '1주차: 제품 소개 및 첫 인상', 
                desc: '언박싱 또는 제품 첫 만남을 소개합니다. 제품의 외관, 패키징, 첫 느낌 등을 전달하며 기대감을 조성합니다.',
                icon: Award,
                color: 'purple'
              },
              { 
                title: '2주차: 첫 사용 경험', 
                desc: '제품을 처음 사용한 경험을 공유합니다. 사용 방법, 첫 느낌, 초기 효과 등을 상세하게 리뷰합니다.',
                icon: Video,
                color: 'blue'
              },
              { 
                title: '3주차: 일상 속 활용', 
                desc: '일상생활에서 제품을 어떻게 활용하는지 보여줍니다. 다양한 사용 시나리오와 실제 활용 팁을 공유합니다.',
                icon: Users,
                color: 'green'
              },
              { 
                title: '4주차: 최종 리뷰 및 추천', 
                desc: '4주간 사용한 최종 리뷰를 작성합니다. 장단점, 효과, 추천 대상 등을 종합적으로 평가하고 구매를 추천합니다.',
                icon: Target,
                color: 'cyan'
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
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                <Video className="inline w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mr-2" />
                레퍼런스 영상 확인
              </h2>
              <p className="text-gray-600">실제 4주 챌린지 캠페인으로 제작된 영상을 확인해보세요</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {referenceVideos.map((video) => {
                const videoId = getVideoId(video.video_url)
                return (
                  <Card key={video.id} className="border-2 border-gray-200 hover:border-purple-400 transition-all overflow-hidden">
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
        <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 sm:p-12 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            지금 바로 4주 챌린지를 시작하세요
          </h2>
          <p className="text-lg sm:text-xl mb-8 opacity-90">
            4주간 지속되는 강력한 브랜드 각인 효과를 경험하세요
          </p>
          <Button
            onClick={handleCreateCampaign}
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
