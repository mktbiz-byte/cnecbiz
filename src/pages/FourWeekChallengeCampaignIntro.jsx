import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Check, ArrowRight, Calendar, Users, Video, Trophy } from 'lucide-react'

export default function FourWeekChallengeCampaignIntro() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            🏆 4주 챌린지
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            4주간의 여정으로<br />
            확실한 변화를 보여주세요
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            주차별 통합 가이드로 4주간 지속적인 콘텐츠 제작 및 제품 효과 검증
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
          >
            지금 시작하기
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        {/* 가격 카드 */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-8 mb-16 text-center">
          <div className="inline-block bg-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            고정 금액
          </div>
          <div className="text-5xl font-bold mb-2">₩600,000</div>
          <p className="text-purple-100 mb-6">VAT 별도 (고정)</p>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Video className="w-5 h-5" />
                <span className="font-semibold">4개 URL 제출</span>
              </div>
              <p className="text-sm text-purple-100">Week 1, 2, 3, 4 각각</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">4주 통합 가이드</span>
              </div>
              <p className="text-sm text-purple-100">주차별 미션 + 영상 4개 제출</p>
            </div>
          </div>
        </div>

        {/* 4주 프로세스 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">4주 챌린지 프로세스</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-2 border-purple-200">
              <CardContent className="p-6">
                <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-3">Week 1</h3>
                <p className="text-sm text-gray-600 mb-3">
                  첫 사용 후기 및 제품 소개
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>제품 언박싱</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>첫 사용 장면</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>사용 전 상태</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardContent className="p-6">
                <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-3">Week 2</h3>
                <p className="text-sm text-gray-600 mb-3">
                  1주차 사용 후 변화 체크
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>피부/상태 체크</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>사용 루틴 공유</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>초기 변화 언급</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardContent className="p-6">
                <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-3">Week 3</h3>
                <p className="text-sm text-gray-600 mb-3">
                  중간 점검 및 루틴 공유
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>중간 점검</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>일상 루틴 공유</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>지속 사용 의지</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardContent className="p-6">
                <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  4
                </div>
                <h3 className="text-lg font-semibold mb-3">Week 4</h3>
                <p className="text-sm text-gray-600 mb-3">
                  최종 비포/애프터 공개
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>4주 완주 인증</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>비포/애프터 비교</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-purple-600" />
                    <span>최종 후기</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 특징 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">왜 4주 챌린지인가?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Trophy className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">검증된 효과</h3>
                    <p className="text-gray-600">
                      4주간의 지속적인 사용으로 제품 효과를 명확하게 보여줄 수 있습니다.
                      비포/애프터 비교로 신뢰도를 높입니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">지속적 노출</h3>
                    <p className="text-gray-600">
                      4주간 매주 1회씩 총 4개의 콘텐츠로 지속적인 브랜드 노출을 확보합니다.
                      팔로워들의 관심을 유지할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">주차별 통합 가이드</h3>
                    <p className="text-gray-600">
                      각 주차별로 미션, 필수 대사, 필수 장면을 통합 가이드로 제공하여
                      일관성 있는 콘텐츠 제작이 가능합니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">스토리텔링</h3>
                    <p className="text-gray-600">
                      4주간의 여정을 스토리로 풀어내어 시청자들의 공감과
                      몰입도를 높일 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 적합한 제품 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">4주 챌린지에 적합한 제품</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">💆‍♀️</div>
                <h3 className="text-lg font-semibold mb-2">스킨케어</h3>
                <p className="text-sm text-gray-600">
                  수분크림, 세럼, 마스크팩 등<br />
                  피부 변화를 확인할 수 있는 제품
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">💪</div>
                <h3 className="text-lg font-semibold mb-2">건강기능식품</h3>
                <p className="text-sm text-gray-600">
                  다이어트, 영양제, 프로틴 등<br />
                  체형/건강 변화를 보여줄 수 있는 제품
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">💇‍♀️</div>
                <h3 className="text-lg font-semibold mb-2">헤어케어</h3>
                <p className="text-sm text-gray-600">
                  샴푸, 트리트먼트, 헤어토닉 등<br />
                  모발 상태 개선을 확인할 수 있는 제품
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 스케줄 예시 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">캠페인 스케줄 예시</h2>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    Week 1
                  </div>
                  <div>
                    <p className="font-semibold">첫 사용 후기</p>
                    <p className="text-sm text-gray-600">제품 언박싱 및 첫 사용 장면</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    Week 2
                  </div>
                  <div>
                    <p className="font-semibold">1주차 변화 체크</p>
                    <p className="text-sm text-gray-600">사용 후 초기 변화 확인</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    Week 3
                  </div>
                  <div>
                    <p className="font-semibold">중간 점검</p>
                    <p className="text-sm text-gray-600">일상 루틴 공유 및 지속 사용</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold min-w-[120px] text-center">
                    Week 4
                  </div>
                  <div>
                    <p className="font-semibold">최종 비포/애프터</p>
                    <p className="text-sm text-gray-600">4주 완주 인증 및 최종 후기</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            4주 챌린지로 제품 효과를 증명하세요
          </h2>
          <p className="text-xl mb-8 text-purple-100">
            지속적인 콘텐츠 제작과 명확한 변화 증명으로 신뢰도를 높이는 4주 챌린지
          </p>
          <Button 
            onClick={() => navigate('/company/campaigns/new')}
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
