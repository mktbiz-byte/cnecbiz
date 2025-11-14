import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Check, ArrowRight, Calendar, Users, Video, DollarSign } from 'lucide-react'

export default function RegularCampaignIntro() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            📝 일반 캠페인
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            가장 기본적이고 효과적인<br />
            인플루언서 마케팅
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            크리에이터 등급별 맞춤 가격으로 시작하는 제품 리뷰 캠페인
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
          >
            지금 시작하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-blue-300 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  초급 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩200,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">구독자 1천~1만</p>
                      <p className="text-sm text-gray-600">유튜브 기준</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">팔로워 1천~1만</p>
                      <p className="text-sm text-gray-600">인스타/틱톡 기준</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-400 hover:border-blue-500 transition-all shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  중급 패키지 ⭐
                </div>
                <div className="text-4xl font-bold mb-2">₩300,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">구독자 1만~10만</p>
                      <p className="text-sm text-gray-600">유튜브 기준</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">팔로워 1만~10만</p>
                      <p className="text-sm text-gray-600">인스타/틱톡 기준</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-purple-300 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  상급 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩400,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">구독자 10만+</p>
                      <p className="text-sm text-gray-600">유튜브 기준</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">팔로워 10만+</p>
                      <p className="text-sm text-gray-600">인스타/틱톡 기준</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 할인 안내 */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-16">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-gray-900">대량 구매 할인</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-1">300만원 이상</p>
              <p className="text-green-600 font-bold text-lg">5% 할인</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-1">500만원 이상</p>
              <p className="text-green-600 font-bold text-lg">7% 할인</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-1">1000만원 이상</p>
              <p className="text-green-600 font-bold text-lg">10% 할인</p>
            </div>
          </div>
        </div>

        {/* 특징 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">일반 캠페인 특징</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Video className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">1개 URL 제출</h3>
                    <p className="text-gray-600">
                      크리에이터가 제작한 콘텐츠 1개의 SNS URL을 제출합니다.
                      유튜브, 인스타그램, 틱톡 중 선택 가능합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">간단한 스케줄</h3>
                    <p className="text-gray-600">
                      모집 마감일, 촬영 마감일, SNS 업로드일 3단계로 구성된
                      심플한 일정 관리입니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Check className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">대사 + 장면 개별 제공</h3>
                    <p className="text-gray-600">
                      필수 대사와 촬영 장면을 개별적으로 제공하여
                      크리에이터가 자유롭게 구성할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">등급별 선택 가능</h3>
                    <p className="text-gray-600">
                      초급/중급/상급 중 예산과 목표에 맞는 크리에이터 등급을
                      선택할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 진행 프로세스 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">캠페인 진행 프로세스</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">캠페인 생성</h3>
              <p className="text-sm text-gray-600">
                제품 정보와 패키지를 선택하여 캠페인을 생성합니다
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">가이드 작성</h3>
              <p className="text-sm text-gray-600">
                필수 대사와 촬영 장면을 작성하여 가이드를 완성합니다
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">크리에이터 모집</h3>
              <p className="text-sm text-gray-600">
                선택한 등급의 크리에이터들이 지원하고 선정됩니다
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold mb-2">콘텐츠 제작</h3>
              <p className="text-sm text-gray-600">
                크리에이터가 콘텐츠를 제작하고 SNS에 업로드합니다
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-blue-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 일반 캠페인을 시작하세요
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            가장 기본적이고 효과적인 인플루언서 마케팅으로 제품을 알려보세요
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
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
