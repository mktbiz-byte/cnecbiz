import { Users, Truck, Video, MessageSquare, Upload, Check } from 'lucide-react'

const STEPS = [
  { id: 1, label: '크리에이터 선정', icon: Users, countKey: 'selected' },
  { id: 2, label: '제품 발송', icon: Truck, countKey: 'shipped' },
  { id: 3, label: '촬영', icon: Video, countKey: 'videoSubmitted' },
  { id: 4, label: '수정/승인', icon: MessageSquare, countKey: 'approved' },
  { id: 5, label: '동시 업로드', icon: Upload, countKey: 'uploaded' },
]

export default function PackageProgressTracker({ currentStep = 1, stepCounts = {} }) {
  const total = stepCounts.total || 20

  return (
    <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          const count = stepCounts[step.countKey] || 0
          const Icon = step.icon

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-[#C084FC] text-white'
                      : isActive
                        ? 'bg-[#C084FC]/20 border-2 border-[#C084FC] text-[#C084FC]'
                        : 'bg-white/5 border border-white/10 text-[#636E72]'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>

                {/* Label */}
                <span className={`text-xs mt-2 text-center ${
                  isActive ? 'text-[#C084FC] font-semibold' : isCompleted ? 'text-[#A0A0B0]' : 'text-[#636E72]'
                }`}>
                  {step.label}
                </span>

                {/* Count */}
                <span className={`text-xs mt-0.5 ${
                  isActive ? 'text-[#C084FC]' : 'text-[#636E72]'
                }`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {count}/{total}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className={`h-[2px] flex-1 mx-2 mt-[-24px] ${
                  currentStep > step.id ? 'bg-[#C084FC]' : 'bg-white/10'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
