/**
 * 캠페인 가이드 템플릿 프로토타입 페이지
 * 국가별 뷰티 스타일 템플릿을 미리 테스트하는 페이지
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { Checkbox } from '../ui/checkbox'
import {
  ArrowLeft, Sparkles, Globe, Clock, Hash, Video, Camera,
  Plus, X, Check, Copy, Eye, Edit3, Store, MapPin, Loader2, Wand2, Download, Save, Search, Filter, LayoutGrid
} from 'lucide-react'
import {
  KOREA_TEMPLATES,
  US_TEMPLATES,
  JAPAN_TEMPLATES,
  PRODUCT_CATEGORIES,
  PLATFORMS,
  VIDEO_DURATIONS,
  STORE_VISIT_OPTIONS,
  US_STATE_CHARACTERISTICS,
  CATEGORY_SCENES_KR,
  CATEGORY_SCENES_US,
  CATEGORY_SCENES_JP,
  generateGuideFromTemplate,
} from '../../data/campaignGuideTemplates'

export default function CampaignGuideTemplatePrototype() {
  const navigate = useNavigate()

  // 상태
  const [selectedCountry, setSelectedCountry] = useState('kr')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [isCustomMode, setIsCustomMode] = useState(false)

  // 생성된 가이드 데이터
  const [generatedGuide, setGeneratedGuide] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // 추가 옵션
  const [storeVisit, setStoreVisit] = useState('none')
  const [customStore, setCustomStore] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok', 'instagram'])
  const [selectedDuration, setSelectedDuration] = useState('30s')
  const [additionalScenes, setAdditionalScenes] = useState([''])
  const [additionalDialogues, setAdditionalDialogues] = useState([''])

  // 미국 주소 기반 커스터마이징
  const [usState, setUsState] = useState('')
  const [stateRecommendations, setStateRecommendations] = useState(null)

  // 커스텀 스타일 모드
  const [customStyle, setCustomStyle] = useState({
    title: '',
    description: '',
    scenes: [''],
    dialogues: [''],
    hashtags: [''],
    toneGuide: '',
  })

  // 브랜드/제품 정보
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')

  // 템플릿 미리보기 상태
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // 템플릿 검색 및 필터
  const [searchQuery, setSearchQuery] = useState('')
  const [templateTypeFilter, setTemplateTypeFilter] = useState('all')

  // AI 가이드 생성 상태
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGeneratedGuide, setAiGeneratedGuide] = useState(null)
  const [showAIGuideModal, setShowAIGuideModal] = useState(false)
  const [aiGenerationError, setAiGenerationError] = useState(null)

  // YouTube Shorts 분석 상태
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [similarityPercent, setSimilarityPercent] = useState(80)
  const [ytRequiredDialogues, setYtRequiredDialogues] = useState(['', '', ''])
  const [ytAdditionalNotes, setYtAdditionalNotes] = useState('')
  const [ytManualTranscript, setYtManualTranscript] = useState('')
  const [isAnalyzingYT, setIsAnalyzingYT] = useState(false)
  const [ytResult, setYtResult] = useState(null)

  // YouTube Shorts 분석 실행
  const analyzeYouTubeShorts = async () => {
    if (!youtubeUrl.trim()) {
      alert('YouTube URL을 입력해주세요.')
      return
    }

    setIsAnalyzingYT(true)
    setYtResult(null)

    try {
      const response = await fetch('/.netlify/functions/analyze-youtube-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          similarityPercent,
          requiredDialogues: ytRequiredDialogues.filter(d => d.trim()),
          additionalNotes: ytAdditionalNotes.trim(),
          manualTranscript: ytManualTranscript.trim()
        })
      })

      // 응답이 JSON이 아닌 경우 (게이트웨이 타임아웃 등) 처리
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        if (response.status === 502 || response.status === 504 || text.includes('<HTML') || text.includes('<!DOCTYPE')) {
          throw new Error('AI 영상 분석에 시간이 오래 걸려 타임아웃이 발생했습니다.\n\n해결 방법: 위의 "자막 직접 입력" 영역에 YouTube 영상의 자막을 붙여넣으면 빠르게 분석됩니다.\n\n(YouTube 영상 → 더보기 ⋯ → 스크립트 표시 → 복사)')
        }
        throw new Error(`서버 응답 오류 (${response.status})`)
      }

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || '영상 분석에 실패했습니다.')
      }

      setYtResult(result)
    } catch (error) {
      console.error('YouTube 분석 오류:', error)
      alert(`분석 실패: ${error.message}`)
    } finally {
      setIsAnalyzingYT(false)
    }
  }

  // YouTube 분석 결과 복사
  const copyYtGuideToClipboard = async () => {
    if (!ytResult?.guideData?.guide) return
    const guide = ytResult.guideData.guide
    const text = `## ${guide.title}\n\n**컨셉:** ${guide.concept}\n\n### 촬영 장면\n${guide.scenes?.map((s, i) => `${i + 1}. [${s.duration}] ${s.name}\n   ${s.description}\n   카메라: ${s.camera}\n   대사: "${s.dialogue}"`).join('\n\n')}\n\n### 필수 대사\n${guide.required_dialogues?.map((d, i) => `${i + 1}. "${d}"`).join('\n')}\n\n### 해시태그\n${guide.hashtags?.map(h => `#${h}`).join(' ')}\n\n### 촬영 팁\n${guide.filming_tips?.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n### 주의사항\n${guide.cautions}`
    try {
      await navigator.clipboard.writeText(text)
      alert('가이드가 클립보드에 복사되었습니다!')
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // AI 가이드 생성 함수
  const generateAIGuide = async () => {
    if (!selectedTemplate || !productName) {
      alert('템플릿과 제품명을 먼저 선택/입력해주세요.')
      return
    }

    setIsGeneratingAI(true)
    setAiGenerationError(null)

    try {
      // 크리에이터 분석 데이터 (예시)
      const creatorAnalysis = {
        style: selectedTemplate.type,
        tone: selectedTemplate.toneGuide,
        culturalNotes: selectedTemplate.culturalNotes,
        country: selectedCountry,
        preferredPlatforms: selectedPlatforms,
      }

      // 제품 정보
      const productInfo = {
        product_name: productName,
        brand: brandName,
        description: productDescription,
        category: PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory,
      }

      // 템플릿 기반 가이드 요청
      const templateGuide = {
        templateType: selectedTemplate.type,
        templateTitle: selectedTemplate.title,
        defaultScenes: selectedTemplate.defaultScenes,
        defaultDialogues: selectedTemplate.defaultDialogues,
        hashtags: selectedTemplate.hashtags,
        duration: selectedDuration,
        platforms: selectedPlatforms,
        storeVisit: storeVisit !== 'none' ? (storeVisit === 'other' ? customStore : STORE_VISIT_OPTIONS.find(s => s.id === storeVisit)?.label) : null,
      }

      const response = await fetch('/.netlify/functions/generate-personalized-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAnalysis,
          productInfo,
          templateGuide,
          country: selectedCountry,
        }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'AI 가이드 생성 실패')
      }

      setAiGeneratedGuide(result.personalizedGuide)
      setShowAIGuideModal(true)
    } catch (error) {
      console.error('AI 가이드 생성 오류:', error)
      setAiGenerationError(error.message)
      alert(`AI 가이드 생성 실패: ${error.message}`)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // AI 가이드 JSON 다운로드
  const downloadAIGuide = () => {
    if (!aiGeneratedGuide) return

    const dataStr = JSON.stringify(aiGeneratedGuide, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = `ai-guide-${productName || 'template'}-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // AI 가이드 클립보드 복사
  const copyAIGuideToClipboard = async () => {
    if (!aiGeneratedGuide) return

    try {
      await navigator.clipboard.writeText(JSON.stringify(aiGeneratedGuide, null, 2))
      alert('AI 가이드가 클립보드에 복사되었습니다!')
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 국가별 템플릿 가져오기 (카테고리, 검색, 타입 필터링 포함)
  const getTemplates = () => {
    let templates
    switch (selectedCountry) {
      case 'kr': templates = [...KOREA_TEMPLATES]; break
      case 'us': templates = [...US_TEMPLATES]; break
      case 'jp': templates = [...JAPAN_TEMPLATES]; break
      default: templates = [...KOREA_TEMPLATES]
    }

    // 카테고리가 선택된 경우 해당 카테고리에 맞는 템플릿만 필터링
    if (selectedCategory) {
      templates = templates.filter(template =>
        template.applicableCategories?.includes(selectedCategory)
      )
    }

    // 타입 필터
    if (templateTypeFilter !== 'all') {
      templates = templates.filter(template =>
        template.type.toLowerCase() === templateTypeFilter.toLowerCase()
      )
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(template =>
        template.title.toLowerCase().includes(query) ||
        template.subtitle?.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.type.toLowerCase().includes(query) ||
        template.titleKr?.toLowerCase().includes(query)
      )
    }

    return templates
  }

  // 사용 가능한 템플릿 타입 목록 가져오기
  const getAvailableTypes = () => {
    let templates
    switch (selectedCountry) {
      case 'kr': templates = KOREA_TEMPLATES; break
      case 'us': templates = US_TEMPLATES; break
      case 'jp': templates = JAPAN_TEMPLATES; break
      default: templates = KOREA_TEMPLATES
    }
    const types = [...new Set(templates.map(t => t.type))]
    return types.sort()
  }

  // 전체 템플릿 수
  const getTotalTemplateCount = () => {
    return KOREA_TEMPLATES.length + US_TEMPLATES.length + JAPAN_TEMPLATES.length
  }

  // 미국 주 선택 시 추천 업데이트
  useEffect(() => {
    if (selectedCountry === 'us' && usState && usState !== 'none' && US_STATE_CHARACTERISTICS[usState]) {
      setStateRecommendations(US_STATE_CHARACTERISTICS[usState])
    } else {
      setStateRecommendations(null)
    }
  }, [selectedCountry, usState])

  // 템플릿 선택 시 가이드 생성
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    setSelectedPlatforms(template.platforms)
    setSelectedDuration(template.duration)

    const guide = generateGuideFromTemplate(template, selectedCategory, {
      storeVisit,
      customStore,
      platforms: template.platforms,
      duration: template.duration,
      country: selectedCountry,
      brandName,
      productName,
      productDescription,
    })
    setGeneratedGuide(guide)
  }

  // 가이드 재생성
  const regenerateGuide = () => {
    if (!selectedTemplate) return

    const guide = generateGuideFromTemplate(selectedTemplate, selectedCategory, {
      storeVisit,
      customStore,
      platforms: selectedPlatforms,
      duration: selectedDuration,
      additionalScenes: additionalScenes.filter(s => s.trim()),
      additionalDialogues: additionalDialogues.filter(d => d.trim()),
      country: selectedCountry,
      brandName,
      productName,
      productDescription,
    })
    setGeneratedGuide(guide)
  }

  // 배열 아이템 추가
  const addArrayItem = (setter, currentArray) => {
    setter([...currentArray, ''])
  }

  // 배열 아이템 제거
  const removeArrayItem = (setter, currentArray, index) => {
    setter(currentArray.filter((_, i) => i !== index))
  }

  // 배열 아이템 업데이트
  const updateArrayItem = (setter, currentArray, index, value) => {
    const newArray = [...currentArray]
    newArray[index] = value
    setter(newArray)
  }

  // 클립보드 복사
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('클립보드에 복사되었습니다!')
    } catch (err) {
      console.error('복사 실패:', err)
    }
  }

  // 국가 라벨
  const countryLabels = {
    kr: { flag: '🇰🇷', label: '한국', labelEn: 'KR' },
    us: { flag: '🇺🇸', label: '미국', labelEn: 'US' },
    jp: { flag: '🇯🇵', label: '일본', labelEn: 'JP' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  캠페인 가이드 템플릿
                  <Badge variant="secondary" className="ml-2">Beta</Badge>
                </h1>
                <p className="text-sm text-gray-500">국가별 스타일 템플릿으로 크리에이터 가이드를 쉽게 생성하세요</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPreview(true)}
                disabled={!generatedGuide}
                variant="outline"
              >
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </Button>
              <Button
                onClick={generateAIGuide}
                disabled={!selectedTemplate || !productName || isGeneratingAI}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 생성 중...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI 가이드 생성
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{KOREA_TEMPLATES.length}</p>
              <p className="text-sm text-red-500">한국 템플릿</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{US_TEMPLATES.length}</p>
              <p className="text-sm text-blue-500">미국 템플릿</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-pink-600">{JAPAN_TEMPLATES.length}</p>
              <p className="text-sm text-pink-500">일본 템플릿</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{getTotalTemplateCount()}</p>
              <p className="text-sm text-purple-500">총 템플릿</p>
            </CardContent>
          </Card>
        </div>

        {/* YouTube Shorts 영상 분석 → 가이드 생성 */}
        <Card className="mb-6 border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              YouTube Shorts 영상 분석 → 촬영 가이드 생성
            </CardTitle>
            <CardDescription>
              유튜브 쇼츠 링크를 넣으면 AI가 영상을 분석하여 유사한 형태의 촬영 가이드를 자동 생성합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* YouTube URL 입력 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">YouTube Shorts URL *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/shorts/... 또는 https://youtu.be/..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="flex-1"
                />
                {youtubeUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setYoutubeUrl('')}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 유사도 슬라이더 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                영상 유사도: <span className="text-red-600 font-bold text-base">{similarityPercent}%</span>
              </Label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={similarityPercent}
                onChange={(e) => setSimilarityPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10% 영감만</span>
                <span>50% 참고</span>
                <span>80% 유사</span>
                <span>100% 동일</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {similarityPercent >= 90 ? '원본과 거의 동일한 구조·스타일로 가이드를 생성합니다.'
                  : similarityPercent >= 70 ? '핵심 구조와 흐름을 유지하되 제품에 맞게 조정합니다.'
                  : similarityPercent >= 50 ? '컨셉과 톤만 참고하고 내용은 자유롭게 구성합니다.'
                  : '분위기만 참고하고 대부분 새롭게 기획합니다.'}
              </p>
            </div>

            {/* 필수 대사 3개 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">필수 포함 대사 (최대 3개)</Label>
              <div className="space-y-2">
                {ytRequiredDialogues.map((dialogue, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-500 w-5">{idx + 1}.</span>
                    <Input
                      placeholder={`필수 대사 ${idx + 1} (예: "이거 진짜 좋아요")`}
                      value={dialogue}
                      onChange={(e) => {
                        const newArr = [...ytRequiredDialogues]
                        newArr[idx] = e.target.value
                        setYtRequiredDialogues(newArr)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 추가 요청사항 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">추가 요청사항 (선택)</Label>
              <Textarea
                placeholder="예: 제품 클로즈업 장면을 꼭 넣어주세요, 밝은 톤으로 해주세요..."
                value={ytAdditionalNotes}
                onChange={(e) => setYtAdditionalNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* 자막 직접 입력 (자동 추출 실패 시 사용) */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <Label className="text-sm font-medium mb-2 block text-amber-800">
                자막 직접 입력 (자동 추출 실패 시 사용)
              </Label>
              <p className="text-xs text-amber-600 mb-2">
                자동 자막 추출이 실패할 경우 아래에 영상 자막을 직접 붙여넣으세요.
                YouTube 영상 → 더보기(⋯) → "스크립트 표시" → 텍스트 복사 후 붙여넣기
              </p>
              <Textarea
                placeholder={`[0:00] 안녕하세요 여러분\n[0:03] 오늘은 이 제품을 리뷰해볼게요\n[0:07] 먼저 패키지부터 볼까요?\n\n또는 타임스탬프 없이 대사만 입력해도 됩니다:\n안녕하세요 여러분\n오늘은 이 제품을 리뷰해볼게요\n먼저 패키지부터 볼까요?`}
                value={ytManualTranscript}
                onChange={(e) => setYtManualTranscript(e.target.value)}
                rows={5}
                className="bg-white"
              />
              {ytManualTranscript.trim() && (
                <p className="text-xs text-green-600 mt-1">
                  자막이 입력되었습니다 ({ytManualTranscript.trim().split('\n').filter(l => l.trim()).length}줄). 이 자막이 자동 추출보다 우선 사용됩니다.
                </p>
              )}
            </div>

            {/* 분석 버튼 */}
            <Button
              onClick={analyzeYouTubeShorts}
              disabled={!youtubeUrl.trim() || isAnalyzingYT}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 text-base"
            >
              {isAnalyzingYT ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI 영상 분석 중... (15~30초)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  영상 분석 & 가이드 생성
                </>
              )}
            </Button>

            {/* 분석 결과 */}
            {ytResult && ytResult.guideData && (
              <div className="mt-6 space-y-4">
                {/* 원본 데이터 확인 (자막 + 설명) */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    원본 데이터 확인 (YouTube에서 추출한 데이터)
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-blue-600 font-semibold">영상 제목:</span>
                        <p className="font-medium text-gray-800 mt-0.5">{ytResult.videoData?.title || '(추출 실패)'}</p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-semibold">영상 길이:</span>
                        <p className="font-medium text-gray-800 mt-0.5">{ytResult.videoData?.duration ? `${ytResult.videoData.duration}초` : '(알 수 없음)'}</p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-semibold">분석 방법:</span>
                        <p className={`font-medium mt-0.5 ${ytResult.videoData?.hasTranscript ? 'text-green-700' : 'text-red-600'}`}>
                          {(() => {
                            const method = ytResult.videoData?.captionMethod || ''
                            if (method.startsWith('gemini_direct') || method === 'gemini_file_api' || method === 'gemini_inline_audio')
                              return `Gemini AI 영상 직접 분석 (${method === 'gemini_direct_url' ? 'YouTube URL' : method === 'gemini_file_api' ? 'File API' : '오디오 분석'})`
                            if (method.startsWith('manual'))
                              return '직접 입력 자막 사용'
                            if (ytResult.videoData?.hasTranscript)
                              return `자막 추출 성공 (${ytResult.videoData.transcriptSegments || 0}개 구간, 언어: ${ytResult.videoData.captionLang || '자동'}, 방법: ${method || '-'})`
                            return '실패 — 자막 없음 (위의 자막 직접 입력을 사용해보세요)'
                          })()}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-semibold">Video ID:</span>
                        <p className="font-medium text-gray-800 mt-0.5 font-mono">{ytResult.videoData?.videoId || '-'}</p>
                      </div>
                    </div>

                    {/* 영상 설명 */}
                    {ytResult.videoData?.description && (
                      <div>
                        <span className="text-blue-600 font-semibold">영상 설명:</span>
                        <div className="mt-1 p-2 bg-white rounded-lg border border-blue-100 max-h-24 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{ytResult.videoData.description}</pre>
                        </div>
                      </div>
                    )}

                    {/* 타임스탬프 자막 */}
                    {ytResult.videoData?.timeline ? (
                      <div>
                        <span className="text-blue-600 font-semibold">추출된 자막 (타임스탬프):</span>
                        <div className="mt-1 p-2 bg-white rounded-lg border border-blue-100 max-h-48 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{ytResult.videoData.timeline}</pre>
                        </div>
                      </div>
                    ) : ytResult.videoData?.transcript ? (
                      <div>
                        <span className="text-blue-600 font-semibold">추출된 자막 (텍스트):</span>
                        <div className="mt-1 p-2 bg-white rounded-lg border border-blue-100 max-h-48 overflow-y-auto">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{ytResult.videoData.transcript}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700 font-semibold">자막을 추출하지 못했습니다. 영상 제목과 설명만으로 분석합니다.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI 분석 요약 */}
                {ytResult.guideData.video_analysis && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      AI 분석 결과
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">스타일:</span>
                        <p className="font-medium">{ytResult.guideData.video_analysis.style}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">톤앤매너:</span>
                        <p className="font-medium">{ytResult.guideData.video_analysis.tone}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">구조:</span>
                        <p className="font-medium">{ytResult.guideData.video_analysis.structure}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">길이:</span>
                        <p className="font-medium">{ytResult.guideData.video_analysis.estimated_duration}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">분석 요약:</span>
                        <p className="font-medium">{ytResult.guideData.video_analysis.summary}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 생성된 가이드 */}
                {ytResult.guideData.guide && (
                  <div className="p-4 bg-white rounded-xl border-2 border-purple-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-purple-800 text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        {ytResult.guideData.guide.title}
                      </h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={copyYtGuideToClipboard}>
                          <Copy className="w-4 h-4 mr-1" />
                          복사
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">{ytResult.guideData.guide.concept}</p>

                    {/* 촬영 장면 */}
                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        촬영 장면 ({ytResult.guideData.guide.scenes?.length || 0}개)
                      </h5>
                      <div className="space-y-3">
                        {ytResult.guideData.guide.scenes?.map((scene, idx) => (
                          <div key={idx} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-600 text-white text-xs">{scene.order || idx + 1}</Badge>
                              <span className="font-semibold text-blue-800">{scene.name}</span>
                              <span className="text-xs text-blue-500 ml-auto">{scene.duration}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{scene.description}</p>
                            <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                              <span>📹 {scene.camera}</span>
                              {scene.dialogue && <span>💬 "{scene.dialogue}"</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 필수 대사 */}
                    {ytResult.guideData.guide.required_dialogues?.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">💬 필수 대사</h5>
                        <div className="space-y-1">
                          {ytResult.guideData.guide.required_dialogues.map((d, i) => (
                            <div key={i} className="p-2 bg-orange-50 rounded-lg border border-orange-200 text-sm">
                              <span className="font-bold text-orange-600 mr-2">{i + 1}.</span>
                              <span className="text-orange-800">"{d}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 해시태그 */}
                    {ytResult.guideData.guide.hashtags?.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">#️⃣ 추천 해시태그</h5>
                        <div className="flex flex-wrap gap-2">
                          {ytResult.guideData.guide.hashtags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-sm">
                              #{tag.replace(/^#/, '')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 촬영 팁 */}
                    {ytResult.guideData.guide.filming_tips?.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-800 mb-2">💡 촬영 팁</h5>
                        <ul className="space-y-1">
                          {ytResult.guideData.guide.filming_tips.map((tip, i) => (
                            <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 주의사항 */}
                    {ytResult.guideData.guide.cautions && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <h5 className="font-semibold text-red-800 mb-1">⚠️ 주의사항</h5>
                        <p className="text-sm text-red-700">{ytResult.guideData.guide.cautions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 상단: 국가 선택 & 제품 카테고리 */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              기본 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 국가 선택 */}
              <div>
                <Label className="text-sm font-medium mb-3 block">국가 선택 *</Label>
                <Tabs value={selectedCountry} onValueChange={(value) => {
                  setSelectedCountry(value)
                  setSelectedTemplate(null)
                  setGeneratedGuide(null)
                }}>
                  <TabsList className="grid grid-cols-3 w-full">
                    {Object.entries(countryLabels).map(([key, { flag, label, labelEn }]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="flex items-center gap-1"
                      >
                        {flag} {label} <span className="text-xs text-gray-400">{labelEn}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              {/* 제품 카테고리 */}
              <div>
                <Label className="text-sm font-medium mb-3 block">제품 카테고리 *</Label>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value)
                  setSelectedTemplate(null)
                  setGeneratedGuide(null)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label} ({cat.labelEn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 미국 주 선택 (미국인 경우만) */}
              {selectedCountry === 'us' && (
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    미국 주 (선택)
                  </Label>
                  <Select value={usState} onValueChange={setUsState}>
                    <SelectTrigger>
                      <SelectValue placeholder="주 선택 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안 함</SelectItem>
                      {Object.keys(US_STATE_CHARACTERISTICS).map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {stateRecommendations && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs">
                      <p className="font-medium text-blue-700">지역 특성:</p>
                      <p className="text-blue-600">
                        기후: {stateRecommendations.climate}, 스타일: {stateRecommendations.style}
                      </p>
                      <p className="text-blue-600">
                        추천: {stateRecommendations.focus.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 브랜드/제품 정보 (필수) */}
        <Card className="mb-6 border-2 border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              브랜드/제품 정보 (가이드에 반영됨)
            </CardTitle>
            <CardDescription>입력한 브랜드명과 제품명이 가이드 대사와 장면에 자동으로 반영됩니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">브랜드명</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="예: 아모레퍼시픽, Estee Lauder"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">제품명 *</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예: 설화수 윤조에센스"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">제품 설명 (선택)</Label>
                <Input
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="간단한 제품 특징"
                />
              </div>
            </div>
            {(brandName || productName) && (
              <div className="mt-3 p-2 bg-white rounded-lg border text-sm">
                <span className="text-gray-500">가이드에 반영될 내용: </span>
                <span className="font-medium text-orange-700">
                  {brandName && `${brandName}의 `}{productName || '제품'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 메인 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 템플릿 목록 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-purple-500" />
                      국가별 스타일 템플릿
                      <Badge variant="secondary" className="ml-2">
                        총 {getTotalTemplateCount()}개
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      각 국가의 문화와 트렌드를 반영한 다양한 뷰티 숏폼 스타일을 선택하세요
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className={isCustomMode ? 'bg-purple-50 border-purple-300' : ''}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    {isCustomMode ? '템플릿 선택' : '직접 작성하기'}
                  </Button>
                </div>

                {/* 검색 및 필터 */}
                {!isCustomMode && selectedCategory && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="템플릿 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={templateTypeFilter} onValueChange={setTemplateTypeFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="타입 필터" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 타입</SelectItem>
                        {getAvailableTypes().map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 현재 필터 상태 표시 */}
                {!isCustomMode && selectedCategory && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">현재 표시:</span>
                    <Badge variant="outline">
                      {countryLabels[selectedCountry].flag} {countryLabels[selectedCountry].label}
                    </Badge>
                    <Badge variant="outline">
                      {PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                    </Badge>
                    {templateTypeFilter !== 'all' && (
                      <Badge variant="secondary">{templateTypeFilter}</Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="secondary">"{searchQuery}"</Badge>
                    )}
                    <span className="text-sm font-medium text-purple-600">
                      {getTemplates().length}개 템플릿
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedCategory ? (
                  <div className="text-center py-12 text-gray-400">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>먼저 제품 카테고리를 선택해주세요</p>
                  </div>
                ) : isCustomMode ? (
                  // 커스텀 모드
                  <div className="space-y-4">
                    <div>
                      <Label>스타일 제목</Label>
                      <Input
                        value={customStyle.title}
                        onChange={(e) => setCustomStyle({...customStyle, title: e.target.value})}
                        placeholder="예: 나만의 리뷰 스타일"
                      />
                    </div>
                    <div>
                      <Label>설명</Label>
                      <Textarea
                        value={customStyle.description}
                        onChange={(e) => setCustomStyle({...customStyle, description: e.target.value})}
                        placeholder="이 스타일에 대한 설명을 입력하세요"
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>톤 & 매너 가이드</Label>
                      <Textarea
                        value={customStyle.toneGuide}
                        onChange={(e) => setCustomStyle({...customStyle, toneGuide: e.target.value})}
                        placeholder="영상의 톤과 매너에 대한 가이드를 입력하세요"
                        rows={2}
                      />
                    </div>
                  </div>
                ) : getTemplates().length === 0 ? (
                  // 검색 결과 없음
                  <div className="text-center py-12 text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">검색 결과가 없습니다</p>
                    <p className="text-sm mt-1">다른 검색어나 필터를 시도해보세요</p>
                    {(searchQuery || templateTypeFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setSearchQuery('')
                          setTemplateTypeFilter('all')
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        필터 초기화
                      </Button>
                    )}
                  </div>
                ) : (
                  // 템플릿 그리드
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTemplates().map((template) => (
                      <div
                        key={template.id}
                        className={`p-4 border rounded-xl transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">{template.type}</Badge>
                          {selectedTemplate?.id === template.id && (
                            <Check className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                        <p className="text-xs text-gray-500 mb-2">{template.subtitle}</p>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                        {/* 예시 촬영 장면 미리보기 */}
                        <div className="p-2 bg-green-50 rounded-lg mb-3 border border-green-200">
                          <p className="text-xs text-green-700 font-medium mb-1 flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            예시 촬영 장면 ({template.defaultScenes?.length || 0}개)
                          </p>
                          <ul className="text-xs text-green-600 list-disc list-inside">
                            {template.defaultScenes?.slice(0, 3).map((scene, i) => (
                              <li key={i} className="truncate">{scene}</li>
                            ))}
                            {template.defaultScenes?.length > 3 && (
                              <li className="text-green-500">... 외 {template.defaultScenes.length - 3}개</li>
                            )}
                          </ul>
                        </div>

                        {/* 예시 대사 미리보기 */}
                        <div className="p-2 bg-purple-50 rounded-lg mb-3 border border-purple-200">
                          <p className="text-xs text-purple-700 font-medium mb-1">💬 예시 대사 ({template.defaultDialogues?.length || 0}개)</p>
                          <ul className="text-xs text-purple-600 list-disc list-inside">
                            {template.defaultDialogues?.slice(0, 2).map((dialogue, i) => (
                              <li key={i} className="truncate italic">"{dialogue}"</li>
                            ))}
                            {template.defaultDialogues?.length > 2 && (
                              <li className="text-purple-500">... 외 {template.defaultDialogues.length - 2}개</li>
                            )}
                          </ul>
                        </div>

                        {/* 메타 정보 */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            {VIDEO_DURATIONS.find(d => d.id === template.duration)?.label}
                          </span>
                        </div>

                        {/* 플랫폼 */}
                        <div className="flex gap-1 mb-3">
                          {template.platforms.map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {PLATFORMS.find(pl => pl.id === p)?.icon}
                            </Badge>
                          ))}
                        </div>

                        {/* 버튼 그룹 */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewTemplate(template)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            상세보기
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTemplateSelect(template)
                            }}
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            선택
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 우측: 옵션 & 생성된 가이드 */}
          <div className="space-y-6">
            {/* 추가 옵션 */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="w-5 h-5 text-green-500" />
                  추가 옵션
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 매장 방문 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">매장 방문</Label>
                  <Select value={storeVisit} onValueChange={setStoreVisit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_VISIT_OPTIONS.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {storeVisit === 'other' && (
                    <Input
                      className="mt-2"
                      placeholder="매장명 입력"
                      value={customStore}
                      onChange={(e) => setCustomStore(e.target.value)}
                    />
                  )}
                </div>

                {/* 플랫폼 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">플랫폼</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border cursor-pointer text-sm ${
                          selectedPlatforms.includes(p.id)
                            ? 'bg-purple-100 border-purple-300 text-purple-700'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <Checkbox
                          checked={selectedPlatforms.includes(p.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlatforms([...selectedPlatforms, p.id])
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(id => id !== p.id))
                            }
                          }}
                          className="hidden"
                        />
                        {p.icon} {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 영상 길이 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">영상 길이</Label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_DURATIONS.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label} - {d.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 추가 촬영 장면 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">추가 촬영 장면</Label>
                  {additionalScenes.map((scene, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={scene}
                        onChange={(e) => updateArrayItem(setAdditionalScenes, additionalScenes, index, e.target.value)}
                        placeholder="장면 설명"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem(setAdditionalScenes, additionalScenes, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem(setAdditionalScenes, additionalScenes)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> 장면 추가
                  </Button>
                </div>

                {/* 추가 대사 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">추가 대사 (필수)</Label>
                  {additionalDialogues.map((dialogue, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={dialogue}
                        onChange={(e) => updateArrayItem(setAdditionalDialogues, additionalDialogues, index, e.target.value)}
                        placeholder="대사 입력"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem(setAdditionalDialogues, additionalDialogues, index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem(setAdditionalDialogues, additionalDialogues)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> 대사 추가
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={regenerateGuide}
                  disabled={!selectedTemplate}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  가이드 다시 생성
                </Button>
              </CardContent>
            </Card>

            {/* 생성된 해시태그 미리보기 */}
            {generatedGuide && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Hash className="w-4 h-4 text-pink-500" />
                    추천 해시태그
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {generatedGuide.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => copyToClipboard(generatedGuide.hashtags.join(' '))}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    복사
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 템플릿 상세보기 모달 */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              템플릿 상세보기
              {previewTemplate && (
                <Badge variant="outline" className="ml-2">{previewTemplate.type}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {previewTemplate?.description}
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 font-medium">템플릿명</p>
                  <p className="font-semibold text-purple-900">{previewTemplate.title}</p>
                  {previewTemplate.titleKr && (
                    <p className="text-xs text-purple-500">{previewTemplate.titleKr}</p>
                  )}
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">영상 길이</p>
                  <p className="font-semibold text-blue-900">
                    {VIDEO_DURATIONS.find(d => d.id === previewTemplate.duration)?.label || previewTemplate.duration}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">예상 촬영시간</p>
                  <p className="font-semibold text-green-900">{previewTemplate.estimatedTime}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">플랫폼</p>
                  <div className="flex gap-1 mt-1">
                    {previewTemplate.platforms.map(p => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {PLATFORMS.find(pl => pl.id === p)?.icon} {PLATFORMS.find(pl => pl.id === p)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 적용 가능 카테고리 */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium mb-2 text-sm text-gray-700">적용 가능 카테고리</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.applicableCategories?.map(catId => {
                    const cat = PRODUCT_CATEGORIES.find(c => c.id === catId)
                    return cat ? (
                      <Badge key={catId} variant="outline">{cat.label}</Badge>
                    ) : null
                  })}
                </div>
              </div>

              {/* 촬영 장면 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-500" />
                  기본 촬영 장면 ({previewTemplate.defaultScenes?.length || 0}개)
                </h4>
                <div className="space-y-2">
                  {previewTemplate.defaultScenes?.map((scene, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-blue-800">{scene}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 대사 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  💬 기본 대사 ({previewTemplate.defaultDialogues?.length || 0}개)
                </h4>
                <div className="space-y-2">
                  {previewTemplate.defaultDialogues?.map((dialogue, i) => (
                    <div key={i} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <p className="text-sm text-purple-800 italic">"{dialogue}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 해시태그 */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-pink-500" />
                  추천 해시태그
                </h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.hashtags?.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-pink-600 bg-pink-50">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* 문화적 특성 & 톤 가이드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium mb-2 text-amber-800 text-sm">톤 & 매너 가이드</h4>
                  <p className="text-sm text-amber-700">{previewTemplate.toneGuide}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-2 text-green-800 text-sm">문화적 특성</h4>
                  <p className="text-sm text-green-700">{previewTemplate.culturalNotes}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              닫기
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => {
                handleTemplateSelect(previewTemplate)
                setPreviewTemplate(null)
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              이 템플릿으로 가이드 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              생성된 가이드 미리보기
            </DialogTitle>
            <DialogDescription>
              이 가이드를 캠페인에 적용하기 전에 검토하세요
            </DialogDescription>
          </DialogHeader>

          {generatedGuide && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">템플릿 유형</p>
                  <p className="font-medium">{generatedGuide.templateType}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">제품 카테고리</p>
                  <p className="font-medium">
                    {PRODUCT_CATEGORIES.find(c => c.id === generatedGuide.productCategory)?.label || '-'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">영상 길이</p>
                  <p className="font-medium">
                    {VIDEO_DURATIONS.find(d => d.id === generatedGuide.duration)?.label}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">예상 촬영 시간</p>
                  <p className="font-medium">{generatedGuide.estimatedTime}</p>
                </div>
              </div>

              {/* 플랫폼 */}
              <div>
                <h4 className="font-medium mb-2">플랫폼</h4>
                <div className="flex gap-2">
                  {generatedGuide.platforms.map(p => (
                    <Badge key={p}>
                      {PLATFORMS.find(pl => pl.id === p)?.icon} {PLATFORMS.find(pl => pl.id === p)?.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 촬영 장면 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-500" />
                    촬영 장면 ({generatedGuide.scenes.length}개)
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedGuide.scenes.join('\n'))}>
                    <Copy className="w-3 h-3 mr-1" /> 복사
                  </Button>
                </div>
                <div className="space-y-2">
                  {generatedGuide.scenes.map((scene, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm">{scene}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 대사 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    💬 필수 대사 ({generatedGuide.dialogues.length}개)
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedGuide.dialogues.join('\n'))}>
                    <Copy className="w-3 h-3 mr-1" /> 복사
                  </Button>
                </div>
                <div className="space-y-2">
                  {generatedGuide.dialogues.map((dialogue, i) => (
                    <div key={i} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                      <p className="text-sm italic">"{dialogue}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 해시태그 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Hash className="w-4 h-4 text-pink-500" />
                    해시태그
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedGuide.hashtags.join(' '))}>
                    <Copy className="w-3 h-3 mr-1" /> 복사
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedGuide.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* 톤 가이드 */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h4 className="font-medium mb-2 text-amber-800">톤 & 매너 가이드</h4>
                <p className="text-sm text-amber-700">{generatedGuide.toneGuide}</p>
              </div>

              {/* 문화적 특성 */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium mb-2 text-green-800">문화적 특성</h4>
                <p className="text-sm text-green-700">{generatedGuide.culturalNotes}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              닫기
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              이 가이드 적용하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 생성 가이드 결과 모달 */}
      <Dialog open={showAIGuideModal} onOpenChange={setShowAIGuideModal}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-violet-500" />
              AI 생성 크리에이터 가이드
              <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white ml-2">AI Generated</Badge>
            </DialogTitle>
            <DialogDescription>
              AI가 템플릿과 제품 정보를 바탕으로 생성한 맞춤 촬영 가이드입니다
            </DialogDescription>
          </DialogHeader>

          {aiGeneratedGuide && (
            <div className="space-y-6">
              {/* 캠페인 기본 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-xs text-violet-600 font-medium">캠페인 타이틀</p>
                  <p className="font-semibold text-violet-900 text-sm">{aiGeneratedGuide.campaign_title || '-'}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">타겟 플랫폼</p>
                  <p className="font-semibold text-blue-900 text-sm">{aiGeneratedGuide.target_platform || '-'}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">영상 길이</p>
                  <p className="font-semibold text-green-900 text-sm">{aiGeneratedGuide.video_duration || '-'}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">촬영 컨셉</p>
                  <p className="font-semibold text-orange-900 text-sm truncate">{aiGeneratedGuide.shooting_concept || '-'}</p>
                </div>
              </div>

              {/* 콘텐츠 철학 */}
              {aiGeneratedGuide.content_philosophy && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold mb-2 text-purple-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    콘텐츠 철학
                  </h4>
                  <p className="text-sm text-purple-700 mb-2">{aiGeneratedGuide.content_philosophy.core_message}</p>
                  {aiGeneratedGuide.content_philosophy.authenticity_note && (
                    <p className="text-xs text-purple-600 italic">{aiGeneratedGuide.content_philosophy.authenticity_note}</p>
                  )}
                </div>
              )}

              {/* 스토리 흐름 */}
              {aiGeneratedGuide.story_flow && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold mb-2 text-amber-800">스토리 흐름</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-amber-600 font-medium">내러티브 유형</p>
                      <p className="text-sm text-amber-800">{aiGeneratedGuide.story_flow.narrative_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-amber-600 font-medium">감정적 흐름</p>
                      <p className="text-sm text-amber-800">{aiGeneratedGuide.story_flow.emotional_arc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 촬영 장면 */}
              {aiGeneratedGuide.shooting_scenes && aiGeneratedGuide.shooting_scenes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-500" />
                      촬영 장면 ({aiGeneratedGuide.shooting_scenes.length}개)
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(aiGeneratedGuide.shooting_scenes.map((s, i) => `${i+1}. ${s.scene_description}`).join('\n'))}
                    >
                      <Copy className="w-3 h-3 mr-1" /> 복사
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {aiGeneratedGuide.shooting_scenes.map((scene, i) => (
                      <div key={i} className="p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {scene.order || i + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{scene.scene_type}</Badge>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-2">{scene.scene_description}</p>
                            {scene.dialogue && (
                              <div className="p-2 bg-purple-50 rounded border-l-3 border-purple-400 mb-2">
                                <p className="text-xs text-purple-600 font-medium mb-1">대사:</p>
                                <p className="text-sm text-purple-800 italic">"{scene.dialogue}"</p>
                              </div>
                            )}
                            {scene.caption && (
                              <div className="p-2 bg-pink-50 rounded mb-2">
                                <p className="text-xs text-pink-600 font-medium mb-1">자막:</p>
                                <p className="text-sm text-pink-800">{scene.caption}</p>
                              </div>
                            )}
                            {scene.shooting_tip && (
                              <div className="p-2 bg-green-50 rounded">
                                <p className="text-xs text-green-600 font-medium mb-1">촬영 팁:</p>
                                <p className="text-sm text-green-800">{scene.shooting_tip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 해시태그 */}
              {aiGeneratedGuide.required_hashtags && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-pink-500" />
                    필수 해시태그
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiGeneratedGuide.required_hashtags.brand?.map((tag, i) => (
                      <Badge key={`brand-${i}`} className="bg-blue-100 text-blue-700">{tag}</Badge>
                    ))}
                    {aiGeneratedGuide.required_hashtags.real?.map((tag, i) => (
                      <Badge key={`real-${i}`} className="bg-green-100 text-green-700">{tag}</Badge>
                    ))}
                    {aiGeneratedGuide.required_hashtags.trend?.map((tag, i) => (
                      <Badge key={`trend-${i}`} className="bg-pink-100 text-pink-700">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 크리에이터 팁 */}
              {aiGeneratedGuide.creator_tips && aiGeneratedGuide.creator_tips.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold mb-2 text-yellow-800">크리에이터 팁</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {aiGeneratedGuide.creator_tips.map((tip, i) => (
                      <li key={i} className="text-sm text-yellow-700">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 진정성 가이드라인 */}
              {aiGeneratedGuide.authenticity_guidelines && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 text-green-800">DO (권장사항)</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiGeneratedGuide.authenticity_guidelines.do?.map((item, i) => (
                        <li key={i} className="text-sm text-green-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold mb-2 text-red-800">DON'T (주의사항)</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiGeneratedGuide.authenticity_guidelines.dont?.map((item, i) => (
                        <li key={i} className="text-sm text-red-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowAIGuideModal(false)}>
              닫기
            </Button>
            <Button variant="outline" onClick={copyAIGuideToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              JSON 복사
            </Button>
            <Button variant="outline" onClick={downloadAIGuide}>
              <Download className="w-4 h-4 mr-2" />
              JSON 다운로드
            </Button>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Save className="w-4 h-4 mr-2" />
              캠페인에 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
