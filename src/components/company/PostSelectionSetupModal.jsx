import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  FileText,
  CheckCircle2,
  Sparkles,
  User,
  Video,
  Clock,
  ArrowRight,
  Camera,
  ThumbsUp,
  PartyPopper,
  Truck,
  MessageSquare,
  Play
} from 'lucide-react'

// 플랫폼 아이콘
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

const PROCESS_STEPS = [
  {
    id: 1,
    title: '배송 정보 입력',
    description: '제품을 발송하고 택배사/송장번호를 입력하세요',
    duration: '1~2일 소요',
    icon: Truck,
    color: 'blue',
    bgGradient: 'from-blue-500 to-cyan-500',
    details: [
      '"선정 크리에이터" 탭에서 택배사 선택',
      '송장번호 입력 후 저장',
      '크리에이터가 제품 수령 대기'
    ]
  },
  {
    id: 2,
    title: 'AI 맞춤 가이드 생성 및 전달',
    description: 'AI가 크리에이터별 맞춤 가이드를 자동 생성합니다',
    duration: '3분 이내',
    icon: Sparkles,
    color: 'purple',
    bgGradient: 'from-purple-500 to-pink-500',
    details: [
      '"전체 AI 가이드 생성" 버튼 클릭',
      '생성된 가이드 확인/수정',
      '"가이드 전달" 클릭 → 알림톡 발송'
    ]
  },
  {
    id: 3,
    title: '크리에이터 촬영 및 업로드',
    description: '가이드 확인 후 콘텐츠 제작 및 업로드',
    duration: '마감일까지',
    icon: Camera,
    color: 'amber',
    bgGradient: 'from-amber-500 to-orange-500',
    details: [
      '크리에이터가 마이페이지에서 가이드 확인',
      '가이드에 맞춰 콘텐츠 촬영/편집',
      '마이페이지에서 영상 업로드'
    ]
  },
  {
    id: 4,
    title: '영상 확인 및 피드백',
    description: '제출된 영상 검토 후 승인 또는 수정 요청',
    duration: '검토 후',
    icon: Video,
    color: 'rose',
    bgGradient: 'from-rose-500 to-red-500',
    details: [
      '"영상 확인" 탭에서 제출 영상 확인',
      '문제 없으면 "승인" 클릭',
      '수정 필요시 피드백 작성 후 "수정 요청"'
    ]
  },
  {
    id: 5,
    title: '최종 승인 및 캠페인 완료',
    description: '영상 승인 완료 후 캠페인이 종료됩니다',
    duration: '완료!',
    icon: PartyPopper,
    color: 'emerald',
    bgGradient: 'from-emerald-500 to-green-500',
    details: [
      '최종 승인 처리',
      '크리에이터에게 완료 알림 발송',
      '정산 및 리워드 처리 진행'
    ]
  }
]

export default function PostSelectionSetupModal({
  isOpen,
  onClose,
  creator,
  campaign
}) {
  const [expandedStep, setExpandedStep] = useState(0)

  const getPlatformIcon = (platform) => {
    const p = (platform || '').toLowerCase()
    if (p.includes('instagram') || p.includes('인스타')) {
      return <InstagramIcon className="w-5 h-5 text-pink-500" />
    }
    if (p.includes('youtube') || p.includes('유튜브')) {
      return <YouTubeIcon className="w-5 h-5 text-red-500" />
    }
    if (p.includes('tiktok') || p.includes('틱톡')) {
      return <TikTokIcon className="w-5 h-5" />
    }
    return null
  }

  if (!creator) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* 헤더 - 크리에이터 정보 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

          <div className="relative p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{creator.applicant_name || creator.creator_name}</h2>
                  <Badge className="bg-white/25 text-white border-0 backdrop-blur-sm px-3 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    선정 완료
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-white/80">
                  {getPlatformIcon(creator.main_channel || creator.creator_platform)}
                  <span>{creator.main_channel || creator.creator_platform}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 축하 메시지 */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800">크리에이터 선정이 완료되었습니다! 🎉</p>
              <p className="text-sm text-green-600">아래 절차에 따라 캠페인을 진행해주세요</p>
            </div>
          </div>
        </div>

        {/* 프로세스 단계 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-500" />
            캠페인 진행 가이드
          </h3>

          <div className="space-y-3">
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon
              const isExpanded = expandedStep === index

              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                    isExpanded
                      ? 'border-gray-200 shadow-xl bg-white'
                      : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-md'
                  }`}
                  onClick={() => setExpandedStep(isExpanded ? -1 : index)}
                >
                  {/* 단계 헤더 */}
                  <div className="flex items-center gap-4 p-4">
                    {/* 숫자 + 아이콘 */}
                    <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${step.bgGradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-700">{step.id}</span>
                      </div>
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs py-0.5 px-2 bg-gray-50 border-gray-200">
                          <Clock className="w-3 h-3 mr-1" />
                          {step.duration}
                        </Badge>
                      </div>
                      <h4 className="font-bold text-gray-900 text-base">{step.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{step.description}</p>
                    </div>

                    {/* 화살표 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isExpanded ? 'bg-gray-100 rotate-90' : 'bg-gray-50'
                    }`}>
                      <ArrowRight className={`w-4 h-4 text-gray-400`} />
                    </div>
                  </div>

                  {/* 상세 내용 */}
                  <div className={`transition-all duration-300 overflow-hidden ${
                    isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="px-4 pb-4">
                      <div className={`bg-gradient-to-br from-${step.color}-50 to-${step.color}-100/50 rounded-xl p-4 ml-[72px] border border-${step.color}-100`}>
                        <ul className="space-y-2.5">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm">
                              <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${step.bgGradient} flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}>
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-gray-700">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 팁 */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800 flex items-start gap-3">
              <span className="text-xl flex-shrink-0">💡</span>
              <span>
                <strong className="text-blue-900">Tip:</strong> "선정 크리에이터" 탭에서 배송 정보 입력, AI 가이드 생성, 가이드 전달까지 모든 작업을 한 번에 관리할 수 있습니다.
              </span>
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <DialogFooter className="p-6 pt-4 border-t bg-gray-50">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            확인했습니다, 시작하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
