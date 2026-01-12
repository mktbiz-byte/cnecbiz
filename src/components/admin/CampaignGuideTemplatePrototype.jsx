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
  Plus, X, Check, Copy, Eye, Edit3, Store, MapPin
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

  // 국가별 템플릿 가져오기
  const getTemplates = () => {
    switch (selectedCountry) {
      case 'kr': return KOREA_TEMPLATES
      case 'us': return US_TEMPLATES
      case 'jp': return JAPAN_TEMPLATES
      default: return KOREA_TEMPLATES
    }
  }

  // 미국 주 선택 시 추천 업데이트
  useEffect(() => {
    if (selectedCountry === 'us' && usState && US_STATE_CHARACTERISTICS[usState]) {
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
            <Button
              onClick={() => setShowPreview(true)}
              disabled={!generatedGuide}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
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
                      <SelectItem value="">선택 안 함</SelectItem>
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
                  <CardTitle className="text-lg">국가별 스타일 템플릿</CardTitle>
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
                <CardDescription>
                  각 국가의 문화와 트렌드를 반영한 다양한 뷰티 숏폼 스타일을 선택하세요
                </CardDescription>
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
                ) : (
                  // 템플릿 그리드
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getTemplates().map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
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

                        {/* 문화적 특성 */}
                        <div className="p-2 bg-amber-50 rounded-lg mb-3">
                          <p className="text-xs text-amber-700">
                            <strong>문화적 특성</strong><br />
                            {template.culturalNotes}
                          </p>
                        </div>

                        {/* 톤 가이드 */}
                        <div className="p-2 bg-blue-50 rounded-lg mb-3">
                          <p className="text-xs text-blue-700">
                            <strong>톤 가이드라인</strong><br />
                            {template.toneGuide}
                          </p>
                        </div>

                        {/* 메타 정보 */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
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
                        <div className="flex gap-1 mt-2">
                          {template.platforms.map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {PLATFORMS.find(pl => pl.id === p)?.icon}
                            </Badge>
                          ))}
                        </div>

                        {/* 버튼 */}
                        <Button
                          size="sm"
                          className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTemplateSelect(template)
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          이 스타일로 시작하기
                        </Button>
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
    </div>
  )
}
