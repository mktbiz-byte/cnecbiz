import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  BookOpen, Users, TrendingUp, FileText, Video, 
  Globe, BarChart, DollarSign, CheckCircle, ArrowRight,
  Sparkles, Target, Zap, Shield
} from 'lucide-react'

export default function Guidebook() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', title: '개요', icon: BookOpen },
    { id: 'features', title: '주요 기능', icon: Sparkles },
    { id: 'workflow', title: '업무 프로세스', icon: Target },
    { id: 'creator', title: '크리에이터 관리', icon: Users },
    { id: 'campaign', title: '캠페인 운영', icon: TrendingUp },
    { id: 'revenue', title: '매출 관리', icon: DollarSign },
    { id: 'contract', title: '전자계약서', icon: FileText },
    { id: 'tips', title: '활용 팁', icon: Zap }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  CNEC BIZ 가이드북
                </h1>
                <p className="text-sm text-gray-600">글로벌 인플루언서 마케팅 통합 관리 플랫폼</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => navigate('/login')}>
                로그인
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => navigate('/signup')}
              >
                무료로 시작하기
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 mr-2" />
            K-뷰티를 세계로, 14일 만에 완성하는 숏폼
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            인플루언서 마케팅,<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              이제는 체계적으로
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.<br />
            검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => navigate('/signup')}
            >
              지금 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => setActiveSection('features')}
            >
              기능 둘러보기
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">1,200+</div>
              <div className="text-gray-600">완료된 캠페인</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-gray-600">파트너 크리에이터</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">3개국</div>
              <div className="text-gray-600">진출 국가</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">50만+</div>
              <div className="text-gray-600">평균 조회수</div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 px-4 bg-gray-50 border-y sticky top-[73px] z-40">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{section.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Overview */}
          {activeSection === 'overview' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">CNEC BIZ란?</h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  CNEC BIZ는 K-뷰티 브랜드의 글로벌 진출을 위한 인플루언서 마케팅 통합 관리 플랫폼입니다. 
                  일본, 미국, 대만 등 주요 시장의 검증된 크리에이터와 연결하여, 
                  14일 만에 완성도 높은 숏폼 콘텐츠를 제작하고 배포합니다.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">검증된 크리에이터</h4>
                    <p className="text-gray-600">
                      엄격한 심사를 통과한 500+ 크리에이터 네트워크
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <Zap className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">빠른 제작</h4>
                    <p className="text-gray-600">
                      14일 만에 완성하는 전문 숏폼 콘텐츠
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <BarChart className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">데이터 기반 분석</h4>
                    <p className="text-gray-600">
                      실시간 성과 추적 및 ROI 분석
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Features */}
          {activeSection === 'features' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">주요 기능</h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  CNEC BIZ는 인플루언서 마케팅의 모든 과정을 하나의 플랫폼에서 관리할 수 있습니다.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-2 border-blue-100 hover:border-blue-300 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">크리에이터 관리</h4>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>추천 크리에이터 매칭 시스템</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>소속/전체 크리에이터 통합 관리</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>출금 요청 및 정산 자동화</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">캠페인 운영</h4>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>캠페인 생성 및 진행 상태 관리</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>크리에이터 매칭 및 계약</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>콘텐츠 제작 일정 관리</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-100 hover:border-green-300 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">매출 관리</h4>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>실시간 매출 현황 대시보드</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>비용 구성 및 순이익 분석</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>미수금 관리 및 포인트 충전</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-100 hover:border-orange-300 transition-all">
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">전자계약서</h4>
                        <ul className="space-y-2 text-gray-600">
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>기업용/크리에이터용 계약서 템플릿</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>전자 서명 및 도장 등록</span>
                          </li>
                          <li className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            <span>계약 상태 추적 및 관리</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Workflow */}
          {activeSection === 'workflow' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">업무 프로세스</h3>
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  CNEC BIZ를 통한 인플루언서 마케팅 캠페인 진행 과정을 소개합니다.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: '캠페인 기획',
                    description: '목표 시장, 예산, 일정을 설정하고 캠페인을 생성합니다.',
                    color: 'blue'
                  },
                  {
                    step: 2,
                    title: '크리에이터 매칭',
                    description: 'AI 추천 시스템을 통해 최적의 크리에이터를 찾고 제안합니다.',
                    color: 'purple'
                  },
                  {
                    step: 3,
                    title: '계약 체결',
                    description: '전자계약서를 발송하고 서명을 받아 계약을 완료합니다.',
                    color: 'green'
                  },
                  {
                    step: 4,
                    title: '콘텐츠 제작',
                    description: '크리에이터가 14일 이내에 숏폼 콘텐츠를 제작합니다.',
                    color: 'orange'
                  },
                  {
                    step: 5,
                    title: '검수 및 배포',
                    description: '제작된 콘텐츠를 검수하고 각 플랫폼에 배포합니다.',
                    color: 'red'
                  },
                  {
                    step: 6,
                    title: '성과 분석',
                    description: '조회수, 참여율 등 성과 지표를 실시간으로 추적합니다.',
                    color: 'indigo'
                  }
                ].map((item) => (
                  <Card key={item.step} className="border-l-4" style={{ borderLeftColor: `var(--${item.color}-500)` }}>
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 bg-${item.color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-xl font-bold text-${item.color}-600`}>{item.step}</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h4>
                          <p className="text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h3 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h3>
            <p className="text-xl mb-8 opacity-90">
              14일 만에 완성하는 글로벌 인플루언서 마케팅
            </p>
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => navigate('/signup')}
            >
              무료로 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">CNEC BIZ</h3>
            <p className="text-gray-400">글로벌 인플루언서 마케팅 통합 관리 플랫폼</p>
          </div>
          <div className="text-gray-500 text-sm">
            © 2025 CNEC. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

