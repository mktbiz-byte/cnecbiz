import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Check, ArrowRight, Calendar, Users, Video, Sparkles } from 'lucide-react'

export default function OliveYoungCampaignIntro() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🌸 올영세일 캠페인
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            올리브영 세일 기간<br />
            최대 효과를 위한 3단계 마케팅
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            상품 리뷰 → 세일 홍보 → 당일 스토리로 이어지는 전략적 캠페인
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
            size="lg"
            className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-6 text-lg"
          >
            지금 시작하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-pink-300 transition-all">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  초급 패키지
                </div>
                <div className="text-4xl font-bold mb-2">₩600,000</div>
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
                  <div className="flex items-start gap-2">
                    <Video className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-pink-600">3개 URL 제출</p>
                      <p className="text-sm text-gray-600">STEP 1/2/3</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-400 hover:border-pink-500 transition-all shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold inline-block mb-4">
                  중급 패키지 ⭐
                </div>
                <div className="text-4xl font-bold mb-2">₩900,000</div>
                <p className="text-gray-600 text-sm mb-6">VAT 별도</p>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">구독자 1만~10만</p>
                      <p className="text-sm text-gray-600">유튜브 기준</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">팔로워 1만~10만</p>
                      <p className="text-sm text-gray-600">인스타/틱톡 기준</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Video className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-pink-600">3개 URL 제출</p>
                      <p className="text-sm text-gray-600">STEP 1/2/3</p>
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
                <div className="text-4xl font-bold mb-2">₩1,200,000</div>
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
                  <div className="flex items-start gap-2">
                    <Video className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-pink-600">3개 URL 제출</p>
                      <p className="text-sm text-gray-600">STEP 1/2/3</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3단계 프로세스 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">올영세일 3단계 전략</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 border-pink-200">
              <CardContent className="p-6">
                <div className="bg-pink-100 text-pink-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-3">STEP 1: 상품 리뷰</h3>
                <p className="text-gray-600 mb-4">
                  세일 전, 올리브영 매장 방문 후 제품을 구매하고 사용 후기를 공유합니다.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>매장 방문 장면</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>제품 언박싱</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>사용 후기</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-200">
              <CardContent className="p-6">
                <div className="bg-pink-100 text-pink-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-3">STEP 2: 세일 홍보</h3>
                <p className="text-gray-600 mb-4">
                  세일 시작 직전, 할인 정보와 함께 제품을 다시 한번 강력하게 추천합니다.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>세일 예고</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>할인 정보 강조</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>재사용 후기</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-200">
              <CardContent className="p-6">
                <div className="bg-pink-100 text-pink-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-3">STEP 3: 당일 스토리</h3>
                <p className="text-gray-600 mb-4">
                  세일 당일, 인스타그램 스토리로 STEP 2 영상을 공유하며 긴급 알림을 전달합니다.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>STEP 2 영상 링크</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>긴박감 조성</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-pink-600" />
                    <span>구매 유도</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 특징 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">왜 올영세일 캠페인인가?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Sparkles className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">3배 높은 노출</h3>
                    <p className="text-gray-600">
                      3개의 콘텐츠로 세일 전/중/후 지속적인 노출을 확보하여
                      일반 캠페인 대비 3배 높은 도달률을 달성합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">전략적 타이밍</h3>
                    <p className="text-gray-600">
                      올리브영 세일 기간에 맞춰 사전 인지도 확보 → 구매 유도 →
                      긴급 알림 순서로 최적화된 타이밍을 제공합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Video className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">통합 가이드</h3>
                    <p className="text-gray-600">
                      3단계 콘텐츠를 하나의 통합 가이드로 작성하여
                      일관성 있는 메시지 전달이 가능합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Check className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">검증된 효과</h3>
                    <p className="text-gray-600">
                      올리브영 세일 기간 특화 전략으로 실제 구매 전환율이
                      일반 캠페인 대비 2배 이상 높습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 스케줄 예시 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">캠페인 스케줄 예시</h2>
          <Card className="bg-gradient-to-r from-pink-50 to-purple-50">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    D-14
                  </div>
                  <div>
                    <p className="font-semibold">STEP 1 마감일</p>
                    <p className="text-sm text-gray-600">상품 리뷰 콘텐츠 업로드</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    D-3
                  </div>
                  <div>
                    <p className="font-semibold">STEP 2 마감일</p>
                    <p className="text-sm text-gray-600">세일 홍보 콘텐츠 업로드</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-pink-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    D-Day
                  </div>
                  <div>
                    <p className="font-semibold">STEP 3 마감일</p>
                    <p className="text-sm text-gray-600">세일 당일 스토리 업로드</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            올영세일 기간, 최대 효과를 경험하세요
          </h2>
          <p className="text-xl mb-8 text-pink-100">
            3단계 전략으로 세일 기간 매출을 극대화하는 올영세일 캠페인
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
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
