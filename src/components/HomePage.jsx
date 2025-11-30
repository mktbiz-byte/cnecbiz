import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, TrendingUp, FileText, BarChart3, Check, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HomePage = () => {
  const navigate = useNavigate()

  const packages = [
    {
      price: '200,000원',
      name: '기본형',
      features: [
        '일반 퀄리티 지원자',
        '영상 수정 불가',
        '기본 보고서 제공'
      ]
    },
    {
      price: '300,000원',
      name: '스탠다드',
      features: [
        '향상된 퀄리티 지원자',
        '영상 수정 1회 가능',
        '상세 보고서 제공'
      ],
      popular: true
    },
    {
      price: '400,000원',
      name: '프리미엄',
      features: [
        '최고 퀄리티 지원자',
        '영상 수정 1회 가능',
        '우선 지원',
        '전담 매니저 상담'
      ]
    },
    {
      price: '600,000원',
      name: '4주 연속',
      features: [
        '매주 1건씩 총 4주간',
        '프리미엄 퀄리티 지원자',
        '영상 수정 1회 가능',
        '전담 매니저 배정',
        '주간 성과 리포트'
      ]
    }
  ]

  const activeRegions = [
    { code: 'jp', name: '일본', flag: '🇯🇵', status: 'active', site: 'cnec-jp.com' },
    { code: 'us', name: '미국', flag: '🇺🇸', status: 'active', site: 'cnec-us.com' },
    { code: 'tw', name: '대만', flag: '🇹🇼', status: 'active', site: 'cnec-tw.com' }
  ]

  const upcomingRegions = [
    { name: '한국', flag: '🇰🇷', status: 'contact', note: '별도 문의' },
    { name: '러시아', flag: '🇷🇺', status: 'coming' },
    { name: '중국', flag: '🇨🇳', status: 'coming' },
    { name: '중동', flag: '🇦🇪', status: 'coming' },
    { name: '동남아', flag: '🇸🇬', status: 'coming' },
    { name: '유럽', flag: '🇪🇺', status: 'coming' },
    { name: '남미', flag: '🇧🇷', status: 'coming' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Globe className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">CNEC BIZ</h1>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => navigate('/login')}>
              로그인
            </Button>
            <Button onClick={() => navigate('/signup')}>
              기업 회원가입
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          글로벌 인플루언서 마케팅
          <br />
          <span className="text-blue-600">한 곳에서 관리하세요</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          일본, 미국, 대만 등 전 세계 인플루언서 마케팅 캠페인을 CNEC BIZ 하나로 통합 관리할 수 있습니다.
          자동 견적서/계약서 생성부터 통합 보고서까지, 모든 것을 한눈에 확인하세요.
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/signup')}>
          지금 시작하기
        </Button>
      </section>

      {/* 캐페인 소개 배너 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl mb-16">
        <h3 className="text-3xl font-bold text-center mb-8">한국 캐페인 타입</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {/* 기획형 캐페인 */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.open('/campaigns/intro/regular', '_blank')}>
            <CardHeader>
              <div className="text-4xl mb-2">📝</div>
              <CardTitle>기획형 캐페인</CardTitle>
              <CardDescription>초급 20만원 / 스탠다드 30만원 / 프리미엄 40만원</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  대사 + 촬영장면 개별 제공
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  SNS URL 1개 제출
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  인스타그램 기준 1만~30만명
                </li>
              </ul>
              <Button className="w-full mt-4" variant="outline">자세히 보기</Button>
            </CardContent>
          </Card>

          {/* 올영세일 캐페인 */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-pink-200" onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}>
            <CardHeader>
              <div className="text-4xl mb-2">🌸</div>
              <CardTitle>올영세일 캐페인</CardTitle>
              <CardDescription>스탠다드 30만원 / 프리미엄 40만원 (2단계만)</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-600" />
                  3단계 콘텐츠 (릴스 2건 + 스토리 1건)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-600" />
                  URL 3개 + 영상 폴더 2개 제출
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-pink-600" />
                  통합 가이드 제공
                </li>
              </ul>
              <Button className="w-full mt-4" variant="outline">자세히 보기</Button>
            </CardContent>
          </Card>

          {/* 4주 챌린지 */}
          <Card className="hover:shadow-xl transition-shadow cursor-pointer border-purple-200" onClick={() => window.open('/campaigns/intro/4week', '_blank')}>
            <CardHeader>
              <div className="text-4xl mb-2">🏆</div>
              <CardTitle>4주 챌린지</CardTitle>
              <CardDescription>60만원</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-600" />
                  주차별 통합 가이드 4개
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-600" />
                  4주 연속 콘텐츠
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-600" />
                  URL 4개 + 영상 4개 제출
                </li>
              </ul>
              <Button className="w-full mt-4" variant="outline">자세히 보기</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">왜 CNEC BIZ인가요?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card>
            <CardHeader>
              <Globe className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>다중 지역 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                일본, 미국, 대만 등 여러 국가의 캠페인을 한 번에 생성하고 관리할 수 있습니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>자동 문서 생성</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                견적서와 계약서가 자동으로 생성되어 즉시 다운로드 가능합니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>통합 보고서</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                모든 지역의 캠페인 성과를 한눈에 확인할 수 있는 대시보드를 제공합니다.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>간편한 프로세스</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                복잡한 절차 없이 몇 번의 클릭만으로 글로벌 캠페인을 시작할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Active Regions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-lg my-8">
        <h3 className="text-3xl font-bold text-center mb-4">현재 운영 중인 지역</h3>
        <p className="text-center text-gray-600 mb-12">
          아래 지역에서 즉시 캠페인을 시작할 수 있습니다
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {activeRegions.map((region) => (
            <Card key={region.code} className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="text-6xl text-center mb-4">{region.flag}</div>
                <CardTitle className="text-center text-2xl">{region.name}</CardTitle>
                <CardDescription className="text-center">{region.site}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold">캠페인 생성 가능</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Upcoming Regions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center mb-4">확장 예정 지역</h3>
        <p className="text-center text-gray-600 mb-12">
          더 많은 지역으로 서비스를 확장할 예정입니다
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {upcomingRegions.map((region, index) => (
            <Card key={index} className="text-center">
              <CardHeader className="pb-2">
                <div className="text-4xl mb-2">{region.flag}</div>
                <CardTitle className="text-sm">{region.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {region.status === 'contact' ? (
                  <span className="text-xs text-blue-600 font-semibold">{region.note}</span>
                ) : (
                  <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">오픈 예정</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Packages Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50 rounded-lg my-8">
        <h3 className="text-3xl font-bold text-center mb-4">패키지 안내</h3>
        <p className="text-center text-gray-600 mb-12">
          귀사의 니즈에 맞는 최적의 패키지를 선택하세요
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, index) => (
            <Card 
              key={index} 
              className={`relative ${pkg.popular ? 'border-2 border-blue-500 shadow-lg' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    인기
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-center text-3xl font-bold text-blue-600">
                  {pkg.price}
                </CardTitle>
                <CardDescription className="text-center text-xl font-semibold">
                  {pkg.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-8">
          * 30만원 패키지부터 영상 수정 1회가 가능합니다
        </p>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h3 className="text-4xl font-bold mb-6">지금 바로 시작하세요</h3>
        <p className="text-xl text-gray-600 mb-8">
          기업 회원가입 후 즉시 글로벌 캠페인을 생성할 수 있습니다
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/signup')}>
          무료 회원가입
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-bold mb-4">CNEC BIZ</h4>
              <p className="text-gray-400">
                글로벌 인플루언서 마케팅 통합 관리 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">문의</h4>
              <p className="text-gray-400">이메일: contact@cnec.biz</p>
              <p className="text-gray-400">전화: 02-1234-5678</p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">운영 중인 사이트</h4>
              <ul className="text-gray-400 space-y-2">
                <li>🇯🇵 일본: cnec-jp.com</li>
                <li>🇺🇸 미국: cnec-us.com</li>
                <li>🇹🇼 대만: cnec-tw.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CNEC BIZ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage

