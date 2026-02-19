import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, ChevronRight, ChevronDown, Rocket,
  Image, Package, Calendar, MessageSquare,
  CreditCard, FileText, CheckCircle2, ArrowRight,
  Lightbulb, AlertCircle, MousePointerClick
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CompanyNavigation from './CompanyNavigation'

const steps = [
  {
    id: 'campaign-type',
    number: '01',
    title: '캠페인 타입 선택',
    icon: Rocket,
    color: 'from-indigo-500 to-indigo-600',
    description: '목적에 맞는 캠페인 유형을 선택하세요.',
    content: [
      {
        subtitle: '기획형 캠페인',
        price: '₩200,000~',
        details: [
          '전문 숏폼 기획 제작',
          'AI 크리에이터 매칭',
          'SNS 업로드 URL 1건',
          '2차 활용권 + 파트너 코드 제공',
        ],
      },
      {
        subtitle: '올영세일 패키지',
        price: '₩400,000~',
        details: [
          '3단계 콘텐츠 (리뷰 → 프로모 → 당일)',
          '구매 전환 특화 기획',
          'SNS 업로드 URL 3건',
          '원본 영상 파일 + 2차 활용권',
        ],
      },
      {
        subtitle: '4주 챌린지',
        price: '₩600,000~',
        details: [
          '주 1회 × 4주 연속 콘텐츠',
          'Before & After 변화 기록',
          'SNS 업로드 URL 4건',
          '2차 활용권 + 파트너 코드 제공',
        ],
      },
    ],
    tip: '기획형은 단발성 홍보에, 올영세일은 올리브영 입점 제품에, 4주 챌린지는 장기 브랜딩에 적합합니다.',
  },
  {
    id: 'campaign-options',
    number: '02',
    title: '캠페인 옵션 설정',
    icon: MousePointerClick,
    color: 'from-violet-500 to-violet-600',
    description: '패키지 등급과 모집 인원을 설정합니다.',
    content: [
      {
        subtitle: '패키지 등급 (기획형)',
        details: [
          '금 패키지: 프리미엄 크리에이터 매칭',
          '은 패키지: 스탠다드 크리에이터 매칭',
          '동 패키지: 베이직 크리에이터 매칭',
        ],
      },
      {
        subtitle: '모집 인원 설정',
        details: [
          '슬라이더로 1~50명 범위에서 선택',
          '인원에 따라 예상 견적이 자동 계산됩니다',
          'AI가 예상 지원율을 분석해줍니다',
        ],
      },
      {
        subtitle: '인센티브 보너스 (4주 챌린지/올영세일)',
        details: [
          '₩0 / ₩100,000 / ₩200,000 / ₩300,000 중 선택',
          '높은 인센티브 = 더 많은 크리에이터 지원',
        ],
      },
    ],
    tip: '모집 인원이 많을수록 단가가 낮아지는 구조입니다. 예상 견적 패널을 실시간으로 확인하세요.',
  },
  {
    id: 'brand-info',
    number: '03',
    title: '브랜드 정보 입력',
    icon: FileText,
    color: 'from-blue-500 to-blue-600',
    description: '브랜드와 캠페인의 기본 정보를 입력합니다.',
    content: [
      {
        subtitle: '필수 입력 항목',
        details: [
          '브랜드명: 노출될 브랜드 이름',
          '모집 채널 선택: Instagram / YouTube / TikTok (복수 선택 가능)',
        ],
      },
      {
        subtitle: '선택 입력 항목',
        details: [
          '참여 조건: 크리에이터에게 안내할 특별 조건',
          '이전 캠페인 불러오기 버튼으로 기존 정보 재사용 가능',
        ],
      },
    ],
    tip: '이전에 진행한 캠페인이 있다면 "이전 캠페인 불러오기"를 활용하면 빠르게 입력할 수 있습니다.',
  },
  {
    id: 'schedule',
    number: '04',
    title: '스케줄 설정',
    icon: Calendar,
    color: 'from-emerald-500 to-emerald-600',
    description: '캠페인 일정을 설정합니다. 핵심 날짜만 입력하면 나머지는 자동 계산됩니다.',
    content: [
      {
        subtitle: '기획형 스케줄',
        details: [
          '① 모집 마감일 설정',
          '② 제품 발송일: 마감일 +2일 자동 계산',
          '③ 촬영 마감일: 발송일 +10일 자동 계산',
          '④ SNS 업로드일: 촬영 마감 +2일 자동 계산',
        ],
      },
      {
        subtitle: '올영세일 스케줄',
        details: [
          '3단계 콘텐츠별 마감일 자동 설정',
          'Step 1: 발송일 +7일 / Step 2: +5일 / Step 3: +3일',
          '각 단계별 SNS 업로드일 자동 계산',
        ],
      },
      {
        subtitle: '4주 챌린지 스케줄',
        details: [
          '주차별(1~4주) 마감일이 +7일 간격으로 자동 설정',
          '각 주차별 SNS 업로드일 +2일 자동 계산',
        ],
      },
    ],
    tip: '자동 계산된 날짜는 언제든 수동으로 수정할 수 있습니다. 충분한 촬영 기간을 확보하세요.',
  },
  {
    id: 'thumbnail',
    number: '05',
    title: '캠페인 썸네일 등록',
    icon: Image,
    color: 'from-pink-500 to-pink-600',
    description: '캠페인 목록에 표시될 대표 이미지를 업로드합니다.',
    content: [
      {
        subtitle: '업로드 방법',
        details: [
          '이미지 파일을 드래그 앤 드롭하거나 클릭하여 업로드',
          '권장 크기: 1200 x 628px (16:9 비율)',
          '지원 형식: JPG, PNG, WebP',
        ],
      },
    ],
    tip: '제품이 잘 보이는 밝고 깔끔한 이미지가 크리에이터 지원율을 높입니다.',
  },
  {
    id: 'product-info',
    number: '06',
    title: '상품 정보 입력',
    icon: Package,
    color: 'from-orange-500 to-orange-600',
    description: '크리에이터에게 제공할 상품 정보를 입력합니다.',
    content: [
      {
        subtitle: '입력 항목',
        details: [
          '상품 URL: 입력 시 AI가 자동으로 정보를 추출합니다',
          '상품명',
          '상품 가격',
          '상품 상세 이미지 업로드 (선택)',
        ],
      },
      {
        subtitle: 'URL 자동 추출 기능',
        details: [
          '상품 URL을 입력하면 AI가 상품명, 가격, 썸네일, 설명을 자동으로 가져옵니다',
          '자사몰 등 일부 사이트에서 지원됩니다',
        ],
      },
    ],
    tip: '상품 URL을 입력하면 자동으로 정보가 채워집니다. 올바르게 추출되었는지 꼭 확인해주세요.',
  },
  {
    id: 'questions',
    number: '07',
    title: '지원자 질문 설정 (선택)',
    icon: MessageSquare,
    color: 'from-teal-500 to-teal-600',
    description: '크리에이터 지원 시 답변을 받고 싶은 질문을 추가합니다.',
    content: [
      {
        subtitle: '질문 설정',
        details: [
          '최대 4개까지 질문 추가 가능',
          '크리에이터 선별에 활용되는 맞춤 질문',
          '예: "해당 제품 사용 경험이 있나요?", "타겟 연령대는?"',
        ],
      },
    ],
    tip: '질문은 선택사항이지만, 적절한 질문은 더 적합한 크리에이터를 찾는 데 도움이 됩니다.',
  },
  {
    id: 'submit',
    number: '08',
    title: '견적 확인 및 제출',
    icon: CreditCard,
    color: 'from-amber-500 to-amber-600',
    description: '우측 견적 패널에서 최종 금액을 확인하고 캠페인을 제출합니다.',
    content: [
      {
        subtitle: '견적 구성',
        details: [
          '단가 × 모집 인원 = 소계',
          '소계 + 부가세(10%) = 최종 금액',
          'AI 예상 지원율 표시',
        ],
      },
      {
        subtitle: '제출 후 흐름',
        details: [
          '① 캠페인이 "임시저장(draft)" 상태로 저장',
          '② 가이드 에디터 페이지로 자동 이동',
          '③ 크리에이터용 촬영 가이드를 작성',
          '④ 관리자가 캠페인을 검토 후 승인',
          '⑤ 승인되면 크리에이터 모집이 시작됩니다',
        ],
      },
    ],
    tip: '제출 전 모든 정보가 정확한지 한번 더 확인하세요. 제출 후에도 가이드 수정이 가능합니다.',
  },
]

function StepCard({ step, isOpen, onToggle }) {
  const Icon = step.icon

  return (
    <Card className={`overflow-hidden transition-all duration-300 border ${isOpen ? 'border-indigo-200 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className={`flex items-center gap-4 p-5 ${isOpen ? 'bg-gradient-to-r from-indigo-50 to-white' : 'bg-white hover:bg-gray-50'} transition-colors`}>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-500">STEP {step.number}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 mt-0.5">{step.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{step.description}</p>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </button>

      {isOpen && (
        <CardContent className="px-5 pb-5 pt-0 bg-white">
          <div className="space-y-5 mt-4">
            {step.content.map((section, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">{section.subtitle}</h4>
                  {section.price && (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {section.price}
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {section.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {step.tip && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{step.tip}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function CampaignCreationGuide() {
  const navigate = useNavigate()
  const [openSteps, setOpenSteps] = useState(['campaign-type'])

  const toggleStep = (id) => {
    setOpenSteps(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const expandAll = () => {
    setOpenSteps(steps.map(s => s.id))
  }

  const collapseAll = () => {
    setOpenSteps([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />

      {/* Main Content */}
      <div className="lg:ml-64 pt-14 lg:pt-0 pb-24 lg:pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <button onClick={() => navigate('/company/dashboard')} className="hover:text-indigo-600 transition-colors">
                대시보드
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">캠페인 생성 가이드</span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  캠페인 생성 가이드
                </h1>
                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  캠페인을 처음 만드시나요? 아래 단계별 안내를 따라 쉽게 생성할 수 있습니다.
                </p>
              </div>
              <div className="hidden sm:block">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Start CTA */}
          <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">바로 캠페인을 생성하시겠어요?</p>
                    <p className="text-sm text-gray-500">가이드를 읽지 않아도 바로 시작할 수 있습니다.</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/company/campaigns/new')}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-md whitespace-nowrap"
                >
                  캠페인 만들기
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notice */}
          <div className="flex items-start gap-2.5 p-4 mb-6 bg-blue-50 rounded-xl border border-blue-100">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <span className="font-medium">세금계산서 정보 안내: </span>
              캠페인 생성 전 <button onClick={() => navigate('/company/profile-edit')} className="underline font-medium hover:text-blue-900">프로필 설정</button>에서
              대표자명, 업태, 종목, 사업장 주소 등 세금계산서 발행에 필요한 정보를 미리 입력해두면
              결제 단계에서 편리합니다.
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          <div className="flex items-center justify-end gap-2 mb-4">
            <button
              onClick={expandAll}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1"
            >
              모두 펼치기
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1"
            >
              모두 접기
            </button>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                isOpen={openSteps.includes(step.id)}
                onToggle={() => toggleStep(step.id)}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate('/company/campaigns/new')}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg px-8 py-6 text-base"
            >
              <Rocket className="w-5 h-5 mr-2" />
              지금 캠페인 만들러 가기
            </Button>
            <p className="text-sm text-gray-400 mt-3">
              궁금한 점이 있으면 <a href="https://pf.kakao.com/_xgNdxlG" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">카카오톡으로 문의</a>해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
