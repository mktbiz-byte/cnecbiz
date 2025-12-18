import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  FileText,
  Send,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Truck,
  Sparkles,
  User,
  Loader2,
  ExternalLink,
  Edit3,
  RefreshCw
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

const STEPS = [
  { id: 'delivery', label: '배송정보', icon: Truck },
  { id: 'guide', label: '가이드 생성', icon: FileText },
  { id: 'confirm', label: '확인 및 전달', icon: Send }
]

const COURIER_OPTIONS = [
  { value: 'CJ대한통운', label: 'CJ대한통운' },
  { value: '우체국', label: '우체국' },
  { value: '한진택배', label: '한진택배' },
  { value: '로젠택배', label: '로젠택배' },
  { value: 'GS포스트박스', label: 'GS포스트박스' },
  { value: '롯데택배', label: '롯데택배' },
  { value: '경동택배', label: '경동택배' }
]

export default function PostSelectionSetupModal({
  isOpen,
  onClose,
  creator,
  campaign,
  onComplete,
  onGenerateGuide,
  supabase
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Form data
  const [deliveryData, setDeliveryData] = useState({
    shipping_company: '',
    tracking_number: ''
  })
  const [guideContent, setGuideContent] = useState('')
  const [editedGuideContent, setEditedGuideContent] = useState('')

  // Reset state when modal opens with new creator
  useEffect(() => {
    if (isOpen && creator) {
      setCurrentStep(0)
      setDeliveryData({
        shipping_company: creator.shipping_company || '',
        tracking_number: creator.tracking_number || ''
      })
      setGuideContent(creator.personalized_guide || '')
      setEditedGuideContent(creator.personalized_guide || '')
      setIsEditing(false)
    }
  }, [isOpen, creator?.id])

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

  const handleGenerateGuide = async () => {
    setIsGeneratingGuide(true)
    try {
      const result = await onGenerateGuide(creator)
      if (result) {
        setGuideContent(result)
        setEditedGuideContent(result)
      }
    } catch (error) {
      console.error('Guide generation error:', error)
      alert('가이드 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingGuide(false)
    }
  }

  const handleSaveDelivery = async () => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          shipping_company: deliveryData.shipping_company,
          tracking_number: deliveryData.tracking_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', creator.id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Delivery save error:', error)
      alert('배송 정보 저장 중 오류가 발생했습니다.')
      return false
    }
  }

  const handleSaveGuide = async () => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          personalized_guide: editedGuideContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', creator.id)

      if (error) throw error
      setGuideContent(editedGuideContent)
      setIsEditing(false)
      return true
    } catch (error) {
      console.error('Guide save error:', error)
      alert('가이드 저장 중 오류가 발생했습니다.')
      return false
    }
  }

  const handleComplete = async () => {
    setIsSending(true)
    try {
      // Save delivery info
      await handleSaveDelivery()

      // Save guide if edited
      if (editedGuideContent !== guideContent) {
        await handleSaveGuide()
      }

      // Call onComplete to send guide notification
      await onComplete({
        ...creator,
        shipping_company: deliveryData.shipping_company,
        tracking_number: deliveryData.tracking_number,
        personalized_guide: editedGuideContent || guideContent
      })

      onClose()
    } catch (error) {
      console.error('Complete error:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate delivery info
      if (!deliveryData.shipping_company || !deliveryData.tracking_number) {
        alert('택배사와 송장번호를 입력해주세요.')
        return
      }
      await handleSaveDelivery()
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Delivery
        return deliveryData.shipping_company && deliveryData.tracking_number
      case 1: // Guide
        return guideContent || editedGuideContent
      case 2: // Confirm
        return true
      default:
        return false
    }
  }

  if (!creator) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold">{creator.applicant_name || creator.creator_name}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-normal">
                {getPlatformIcon(creator.main_channel || creator.creator_platform)}
                <span>{creator.main_channel || creator.creator_platform}</span>
              </div>
            </div>
            <Badge className="ml-auto bg-green-100 text-green-700">선정 완료</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-4 bg-gray-50 rounded-xl my-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isComplete = index < currentStep

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : ''}
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isComplete ? 'bg-gray-200 text-gray-400' : ''}
                  `}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded ${index < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Delivery */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">배송 정보 입력</h3>
                <p className="text-sm text-gray-500 mt-1">크리에이터에게 제품을 발송해주세요</p>
              </div>

              <div className="space-y-4 bg-white p-6 rounded-xl border">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    택배사 선택
                  </label>
                  <select
                    value={deliveryData.shipping_company}
                    onChange={(e) => setDeliveryData({ ...deliveryData, shipping_company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">택배사를 선택하세요</option>
                    {COURIER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    송장번호
                  </label>
                  <input
                    type="text"
                    value={deliveryData.tracking_number}
                    onChange={(e) => setDeliveryData({ ...deliveryData, tracking_number: e.target.value })}
                    placeholder="송장번호를 입력하세요"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {deliveryData.shipping_company && deliveryData.tracking_number && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">배송 정보 입력 완료</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      {deliveryData.shipping_company} - {deliveryData.tracking_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Guide */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">맞춤 가이드 생성</h3>
                <p className="text-sm text-gray-500 mt-1">AI가 크리에이터 맞춤 가이드를 생성합니다</p>
              </div>

              {!guideContent && !editedGuideContent ? (
                <div className="text-center py-8">
                  <Button
                    onClick={handleGenerateGuide}
                    disabled={isGeneratingGuide}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-3 text-lg"
                  >
                    {isGeneratingGuide ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        AI 가이드 생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        AI 가이드 생성
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-purple-100 text-purple-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      가이드 생성 완료
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateGuide}
                        disabled={isGeneratingGuide}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${isGeneratingGuide ? 'animate-spin' : ''}`} />
                        재생성
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        {isEditing ? '미리보기' : '수정'}
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <textarea
                      value={editedGuideContent}
                      onChange={(e) => setEditedGuideContent(e.target.value)}
                      className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {editedGuideContent || guideContent}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">가이드 전달 확인</h3>
                <p className="text-sm text-gray-500 mt-1">입력한 정보를 확인하고 가이드를 전달하세요</p>
              </div>

              <div className="space-y-4">
                {/* Delivery Summary */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                    <Truck className="w-5 h-5" />
                    배송 정보
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">택배사:</span>
                      <span className="ml-2 font-medium">{deliveryData.shipping_company}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">송장번호:</span>
                      <span className="ml-2 font-medium">{deliveryData.tracking_number}</span>
                    </div>
                  </div>
                </div>

                {/* Guide Summary */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 text-purple-700 font-medium mb-3">
                    <FileText className="w-5 h-5" />
                    맞춤 가이드
                  </div>
                  <div className="bg-white rounded-lg p-3 max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">
                      {(editedGuideContent || guideContent)?.substring(0, 300)}...
                    </pre>
                  </div>
                </div>

                {/* Action Info */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    전달 시 실행되는 작업
                  </div>
                  <ul className="text-sm text-green-600 space-y-1 ml-7">
                    <li>• 크리에이터에게 카카오 알림톡 발송</li>
                    <li>• 크리에이터 마이페이지에 가이드 노출</li>
                    <li>• 진행 상태가 "촬영중"으로 변경</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex justify-between mt-6">
          <div>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              나중에
            </Button>
            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSending || !canProceed()}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    전달 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    가이드 전달
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
