import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Check, ArrowRight, Sparkles, FileText, Users, Video, Calendar, Target } from 'lucide-react'
import { supabaseBiz as supabase } from '@/lib/supabaseClients'

export default function RegularCampaignIntro() {
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
        .eq('campaign_type', 'regular')
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            📝 기획형 캠페인 가이드
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            전문 기획으로 완성하는<br />
            프리미엄 인플루언서 마케팅
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            대사부터 촬영 장면까지, 체계적인 가이드로 브랜드 메시지를 정확하게 전달합니다
          </p>
          <Button
            onClick={handleCreateCampaign}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 정보 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-green-400 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  초급 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩200,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 대사 + 촬영장면 개별 제공</p>
                  <p className="text-gray-700">• 크리에이터 SNS 업로드</p>
                  <p className="text-gray-700">• 1년간 초상권 사용</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-400 hover:border-blue-500 transition-all shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  스탠다드 패키지 ⭐
                </div>
                <div className="text-4xl font-bold mb-2">₩300,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 대사 + 촬영장면 개별 제공</p>
                  <p className="text-gray-700">• 크리에이터 SNS 업로드</p>
                  <p className="text-gray-700">• 1년간 초상권 사용</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-400 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  프리미엄 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩400,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-2 text-left text-sm">
                  <p className="text-gray-700">• 대사 + 촬영장면 개별 제공</p>
                  <p className="text-gray-700">• 크리에이터 SNS 업로드</p>
                  <p className="text-gray-700">• 1년간 초상권 사용</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 이 캠페인을 선택해야 하는 이유 */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4">
              <Sparkles className="inline w-8 h-8 text-blue-600 mr-2" />
              왜 기획형 캠페인을 선택해야 할까요?
            </h2>
            <p className="text-gray-600">전문 기획팀이 만든 완벽한 가이드로 브랜드 메시지를 정확하게 전달합니다</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">체계적인 콘텐츠 기획</h3>
                    <p className="text-gray-600">
                      전문 기획팀이 제품의 특징과 장점을 분석하여 대사와 촬영 장면을 상세하게 기획합니다. 
                      크리에이터는 가이드만 따라하면 됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">정확한 메시지 전달</h3>
                    <p className="text-gray-600">
                      브랜드가 전달하고자 하는 핵심 메시지가 정확하게 전달됩니다. 
                      크리에이터의 자유로운 해석으로 인한 메시지 왜곡을 방지합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">등급별 맞춤 가격</h3>
                    <p className="text-gray-600">
                      초급(20만원), 스탠다드(30만원), 프리미엄(40만원)으로 구분된 가격 체계로 
                      예산에 맞는 크리에이터를 선택할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-cyan-100 p-3 rounded-lg">
                    <Video className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">1년간 초상권 사용</h3>
                    <p className="text-gray-600">
                      크리에이터의 SNS 업로드는 물론, 제작된 영상을 1년간 광고 소재로 자유롭게 활용할 수 있습니다.
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
              <FileText className="inline w-8 h-8 text-blue-600 mr-2" />
              캠페인 생성 방법
            </h2>
            <p className="text-gray-600">간단한 5단계로 캠페인을 시작하세요</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: '1', title: '캠페인 타입 선택', desc: '기획형 캠페인 선택' },
              { step: '2', title: '등급 및 인원 선택', desc: '초급/스탠다드/프리미엄' },
              { step: '3', title: '기본 정보 입력', desc: '캠페인명, 기간, 예산' },
              { step: '4', title: '가이드 업로드', desc: '대사 및 촬영 장면 가이드' },
              { step: '5', title: '캠페인 생성', desc: '크리에이터 모집 시작' }
            ].map((item, idx) => (
              <Card key={idx} className="border-2 border-blue-100 hover:border-blue-400 transition-all">
                <CardContent className="p-4 text-center">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
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
              <Calendar className="inline w-8 h-8 text-blue-600 mr-2" />
              캠페인 진행 프로세스
            </h2>
            <p className="text-gray-600">체계적인 프로세스로 성공적인 캠페인을 보장합니다</p>
          </div>
          <div className="space-y-4">
            {[
              { 
                title: '캠페인 생성 및 크리에이터 모집', 
                desc: '캠페인을 생성하면 자동으로 크리에이터 모집이 시작됩니다. 등급별로 적합한 크리에이터들이 지원합니다.',
                icon: Users,
                color: 'blue'
              },
              { 
                title: '크리에이터 선정 및 가이드 전달', 
                desc: '지원한 크리에이터 중 브랜드에 적합한 크리에이터를 선정하고, 대사 및 촬영 장면 가이드를 전달합니다.',
                icon: FileText,
                color: 'green'
              },
              { 
                title: '콘텐츠 제작 및 검수', 
                desc: '크리에이터가 가이드에 따라 콘텐츠를 제작하고, 광고주가 검수합니다. 수정 요청이 가능합니다.',
                icon: Video,
                color: 'purple'
              },
              { 
                title: 'SNS 업로드 및 성과 분석', 
                desc: '검수 완료 후 크리에이터의 SNS에 업로드됩니다. 조회수, 좋아요, 댓글 등의 성과를 실시간으로 확인할 수 있습니다.',
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
              <h2 className="text-3xl font-bold mb-4">
                <Video className="inline w-8 h-8 text-blue-600 mr-2" />
                레퍼런스 영상 확인
              </h2>
              <p className="text-gray-600">실제 기획형 캠페인으로 제작된 영상을 확인해보세요</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {referenceVideos.map((video) => {
                const videoId = getVideoId(video.video_url)
                return (
                  <Card key={video.id} className="border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden">
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
        <div className="text-center bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 기획형 캠페인을 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            전문 기획으로 완성되는 프리미엄 인플루언서 마케팅
          </p>
          <Button
            onClick={handleCreateCampaign}
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg"
          >
            캠페인 생성하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
