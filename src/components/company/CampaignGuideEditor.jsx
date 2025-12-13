import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent } from '../ui/card'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

  // 필수 입력 필드
  const [hookingPoint, setHookingPoint] = useState('')
  const [coreMessage, setCoreMessage] = useState('')

  // 영상 설정
  const [videoLength, setVideoLength] = useState('')
  const [videoTempo, setVideoTempo] = useState('')

  // 필수 미션 체크박스
  const [missions, setMissions] = useState({
    beforeAfter: false,
    productCloseup: false,
    productTexture: false,
    storeVisit: false,
    weeklyReview: false,
    priceInfo: false,
    purchaseLink: false
  })

  // 금지 사항 체크박스 (기본 3개 체크)
  const [prohibitions, setProhibitions] = useState({
    competitorMention: true,
    exaggeratedClaims: true,
    medicalMisrepresentation: true,
    priceOutOfSale: false,
    negativeExpression: false,
    other: false
  })
  const [prohibitionOtherText, setProhibitionOtherText] = useState('')

  // 해시태그 (자동 생성)
  const [hashtags, setHashtags] = useState(['', '', ''])

  // 추가 옵션
  const [referenceUrl, setReferenceUrl] = useState('')
  const [hasNarration, setHasNarration] = useState(null)
  const [needsPartnershipCode, setNeedsPartnershipCode] = useState(null)

  // 템플릿 저장 상태
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [savedTemplates, setSavedTemplates] = useState([])

  // 카테고리별 추천 설정
  const categoryPresets = {
    skincare: {
      name: '스킨케어',
      videoLength: '30sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: true, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: true
    },
    makeup: {
      name: '메이크업',
      videoLength: '45sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: false, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: false, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: true
    },
    haircare: {
      name: '헤어케어',
      videoLength: '30sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: true, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: true
    },
    cleansing: {
      name: '클렌징',
      videoLength: '30sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: false, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: false
    },
    maskpack: {
      name: '마스크팩',
      videoLength: '45sec',
      videoTempo: 'slow',
      missions: { beforeAfter: true, productCloseup: true, productTexture: false, storeVisit: false, weeklyReview: true, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: true
    },
    device: {
      name: '디바이스',
      videoLength: '60sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: false, storeVisit: false, weeklyReview: true, priceInfo: true, purchaseLink: true },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: true, negativeExpression: false, other: false },
      hasNarration: true
    },
    bodycare: {
      name: '바디케어',
      videoLength: '30sec',
      videoTempo: 'normal',
      missions: { beforeAfter: false, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: true, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: false
    },
    supplement: {
      name: '건기식',
      videoLength: '45sec',
      videoTempo: 'normal',
      missions: { beforeAfter: false, productCloseup: true, productTexture: false, storeVisit: false, weeklyReview: true, priceInfo: true, purchaseLink: true },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: true, negativeExpression: false, other: false },
      hasNarration: true
    },
    suncare: {
      name: '선케어',
      videoLength: '30sec',
      videoTempo: 'fast',
      missions: { beforeAfter: false, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: false, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: true, medicalMisrepresentation: true, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: false
    },
    nail: {
      name: '네일',
      videoLength: '45sec',
      videoTempo: 'normal',
      missions: { beforeAfter: true, productCloseup: true, productTexture: true, storeVisit: false, weeklyReview: false, priceInfo: false, purchaseLink: false },
      prohibitions: { competitorMention: true, exaggeratedClaims: false, medicalMisrepresentation: false, priceOutOfSale: false, negativeExpression: false, other: false },
      hasNarration: false
    }
  }

  // 캠페인 정보 로드
  useEffect(() => {
    if (campaignId) {
      loadCampaignGuide()
    }
    loadTemplates()
  }, [campaignId])

  // 자동 저장 (10초마다)
  useEffect(() => {
    if (!campaignId) return

    const timer = setTimeout(() => {
      autoSaveGuide()
    }, 10000)

    return () => clearTimeout(timer)
  }, [hookingPoint, coreMessage, missions, prohibitions, hashtags, videoLength, videoTempo, referenceUrl, hasNarration, needsPartnershipCode])

  // 해시태그 자동 생성 (hookingPoint, coreMessage 변경시)
  useEffect(() => {
    if (hookingPoint || coreMessage) {
      generateHashtags()
    }
  }, [hookingPoint, coreMessage])

  const loadCampaignGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('title, ai_generated_guide')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title)

        // ai_generated_guide JSON에서 데이터 로드
        const guide = data.ai_generated_guide || {}
        setHookingPoint(guide.hookingPoint || '')
        setCoreMessage(guide.coreMessage || '')
        if (guide.missions) setMissions(guide.missions)
        if (guide.prohibitions) setProhibitions(guide.prohibitions)
        if (guide.hashtags) setHashtags(guide.hashtags)
        setVideoLength(guide.videoLength || '')
        setVideoTempo(guide.videoTempo || '')
        setReferenceUrl(guide.referenceUrl || '')
        setHasNarration(guide.hasNarration ?? null)
        setNeedsPartnershipCode(guide.needsPartnershipCode ?? null)
        setProhibitionOtherText(guide.prohibitionOtherText || '')
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      // localStorage에서 백업 데이터 로드 시도
      const backup = localStorage.getItem(`guide_draft_${campaignId}`)
      if (backup) {
        const guide = JSON.parse(backup)
        setHookingPoint(guide.hookingPoint || '')
        setCoreMessage(guide.coreMessage || '')
        if (guide.missions) setMissions(guide.missions)
        if (guide.prohibitions) setProhibitions(guide.prohibitions)
        if (guide.hashtags) setHashtags(guide.hashtags)
        setVideoLength(guide.videoLength || '')
        setVideoTempo(guide.videoTempo || '')
        setReferenceUrl(guide.referenceUrl || '')
        setHasNarration(guide.hasNarration ?? null)
        setNeedsPartnershipCode(guide.needsPartnershipCode ?? null)
        setProhibitionOtherText(guide.prohibitionOtherText || '')
      }
    }
  }

  const loadTemplates = () => {
    const saved = localStorage.getItem('guide_templates')
    if (saved) {
      setSavedTemplates(JSON.parse(saved))
    }
  }

  const autoSaveGuide = async () => {
    if (!campaignId) return
    setAutoSaving(true)

    const guideData = {
      hookingPoint,
      coreMessage,
      missions,
      prohibitions,
      hashtags: hashtags.filter(h => h.trim()),
      videoLength,
      videoTempo,
      referenceUrl,
      hasNarration,
      needsPartnershipCode,
      prohibitionOtherText
    }

    // localStorage에 백업 저장
    localStorage.setItem(`guide_draft_${campaignId}`, JSON.stringify(guideData))

    try {
      await supabase
        .from('campaigns')
        .update({ ai_generated_guide: guideData })
        .eq('id', campaignId)
    } catch (err) {
      console.error('자동 저장 실패:', err)
    } finally {
      setAutoSaving(false)
    }
  }

  // 해시태그 자동 생성
  const generateHashtags = () => {
    const keywords = []

    if (hookingPoint) {
      const hookWords = hookingPoint.match(/[\uAC00-\uD7AF]+/g) || []
      hookWords.forEach(word => {
        if (word.length >= 2) keywords.push(word)
      })
    }

    if (coreMessage) {
      const coreWords = coreMessage.match(/[\uAC00-\uD7AF]+/g) || []
      coreWords.forEach(word => {
        if (word.length >= 2) keywords.push(word)
      })
    }

    const uniqueKeywords = [...new Set(keywords)].slice(0, 3)
    const newHashtags = uniqueKeywords.map(k => `#${k}`)

    while (newHashtags.length < 3) {
      newHashtags.push('')
    }

    setHashtags(newHashtags)
  }

  // 추천 설정 적용
  const applyPreset = (categoryKey) => {
    const preset = categoryPresets[categoryKey]
    if (!preset) return

    setVideoLength(preset.videoLength)
    setVideoTempo(preset.videoTempo)
    setMissions(preset.missions)
    setProhibitions(preset.prohibitions)
    setHasNarration(preset.hasNarration)

    setSuccess(`${preset.name} 카테고리 추천 설정이 적용되었습니다!`)
    setTimeout(() => setSuccess(''), 3000)
  }

  // 템플릿 저장
  const saveTemplate = () => {
    const template = {
      id: Date.now(),
      name: `템플릿 ${savedTemplates.length + 1}`,
      hookingPoint,
      coreMessage,
      missions,
      prohibitions,
      prohibitionOtherText,
      hashtags,
      videoLength,
      videoTempo,
      referenceUrl,
      hasNarration,
      needsPartnershipCode,
      createdAt: new Date().toISOString()
    }
    const newTemplates = [...savedTemplates, template]
    setSavedTemplates(newTemplates)
    localStorage.setItem('guide_templates', JSON.stringify(newTemplates))
    setSuccess('템플릿이 저장되었습니다!')
    setTimeout(() => setSuccess(''), 3000)
  }

  // 템플릿 불러오기
  const loadTemplate = (template) => {
    setHookingPoint(template.hookingPoint || '')
    setCoreMessage(template.coreMessage || '')
    setMissions(template.missions || missions)
    setProhibitions(template.prohibitions || prohibitions)
    setProhibitionOtherText(template.prohibitionOtherText || '')
    setHashtags(template.hashtags || ['', '', ''])
    setVideoLength(template.videoLength || '')
    setVideoTempo(template.videoTempo || '')
    setReferenceUrl(template.referenceUrl || '')
    setHasNarration(template.hasNarration)
    setNeedsPartnershipCode(template.needsPartnershipCode)
    setShowTemplateModal(false)
    setSuccess('템플릿을 불러왔습니다!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleMissionChange = (key, checked) => {
    setMissions(prev => ({ ...prev, [key]: checked }))
  }

  const handleProhibitionChange = (key, checked) => {
    setProhibitions(prev => ({ ...prev, [key]: checked }))
  }

  // 저장 및 다음 단계
  const handleSaveAndContinue = async () => {
    setProcessing(true)
    setError('')

    const guideData = {
      hookingPoint,
      coreMessage,
      missions,
      prohibitions,
      hashtags: hashtags.filter(h => h.trim()),
      videoLength,
      videoTempo,
      referenceUrl,
      hasNarration,
      needsPartnershipCode,
      prohibitionOtherText
    }

    // localStorage에 백업 저장
    localStorage.setItem(`guide_draft_${campaignId}`, JSON.stringify(guideData))

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ ai_generated_guide: guideData })
        .eq('id', campaignId)

      if (error) throw error

      navigate(`/company/campaigns/confirmation?id=${campaignId}&region=korea`)
    } catch (err) {
      console.error('저장 실패:', err)
      setError('저장에 실패했습니다: ' + err.message)
      setProcessing(false)
    }
  }

  const missionOptions = [
    { key: 'beforeAfter', label: 'Before & After 보여주기' },
    { key: 'productCloseup', label: '제품 사용 장면 클로즈업' },
    { key: 'productTexture', label: '제품 텍스처 보여주기' },
    { key: 'storeVisit', label: '올리브영 매장 방문 인증' },
    { key: 'weeklyReview', label: '7일 사용 후기 기록' },
    { key: 'priceInfo', label: '가격/혜택 정보 언급' },
    { key: 'purchaseLink', label: '구매 링크 유도' }
  ]

  const prohibitionOptions = [
    { key: 'competitorMention', label: '경쟁사 제품 언급 금지' },
    { key: 'exaggeratedClaims', label: '과장된 효능/효과 표현 금지' },
    { key: 'medicalMisrepresentation', label: '의약품 오인 표현 금지' },
    { key: 'priceOutOfSale', label: '세일 기간 외 가격 언급 금지' },
    { key: 'negativeExpression', label: '부정적 표현 사용 금지' }
  ]

  const videoLengthOptions = [
    { value: '15sec', label: '15초 이내' },
    { value: '30sec', label: '30초 내외' },
    { value: '45sec', label: '45초 내외' },
    { value: '60sec', label: '60초 내외' }
  ]

  const videoTempoOptions = [
    { value: 'fast', label: '빠른 전개' },
    { value: 'normal', label: '보통' },
    { value: 'slow', label: '느림' }
  ]

  return (
    <>
      <CompanyNavigation />
      <div className="min-h-screen bg-gray-50 py-8 pb-32">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">크리에이터 가이드 작성</h1>
              <p className="text-gray-600 mt-1">크리에이터가 영상 제작 시 참고할 가이드입니다</p>
              {campaignTitle && (
                <p className="text-sm text-gray-500 mt-2">{campaignTitle}</p>
              )}
            </div>
            <div className="flex gap-3">
              {/* 추천 설정 드롭다운 */}
              <Select onValueChange={applyPreset}>
                <SelectTrigger className="w-44 border-amber-300 text-amber-700 hover:bg-amber-50 bg-white">
                  <span className="flex items-center gap-2">
                    <span>🤖</span>
                    <SelectValue placeholder="추천 설정" />
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="skincare">스킨케어</SelectItem>
                  <SelectItem value="makeup">메이크업</SelectItem>
                  <SelectItem value="haircare">헤어케어</SelectItem>
                  <SelectItem value="cleansing">클렌징</SelectItem>
                  <SelectItem value="maskpack">마스크팩</SelectItem>
                  <SelectItem value="device">디바이스</SelectItem>
                  <SelectItem value="bodycare">바디케어</SelectItem>
                  <SelectItem value="supplement">건기식</SelectItem>
                  <SelectItem value="suncare">선케어</SelectItem>
                  <SelectItem value="nail">네일</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowTemplateModal(true)}
                className="border-gray-300"
              >
                <span className="mr-2">📋</span> 템플릿
              </Button>
            </div>
          </div>

          {autoSaving && (
            <div className="mb-4 text-sm text-blue-600">자동 저장 중...</div>
          )}

          {/* 필수 입력 섹션 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">🎯</span>
                <h2 className="text-lg font-semibold text-orange-600">필수 입력</h2>
              </div>

              {/* 1초 후킹 포인트 */}
              <div className="mb-6">
                <Label className="text-base font-semibold mb-2 flex items-center gap-2">
                  <span>⚡</span> 1초 후킹 포인트 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600 mb-3">영상 시작 1초 안에 시청자를 사로잡을 핵심 포인트</p>
                <Input
                  value={hookingPoint}
                  onChange={(e) => setHookingPoint(e.target.value.slice(0, 50))}
                  placeholder="이거 바르고 피부결 미쳤어요"
                  className="text-base"
                  maxLength={50}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    💡 예시: "3일만에 트러블 잡은 비결", "7일 후 피부가 달라졌다"
                  </p>
                  <span className="text-xs text-gray-400">{hookingPoint.length}/50자</span>
                </div>
              </div>

              {/* 핵심 메시지 */}
              <div>
                <Label className="text-base font-semibold mb-2 flex items-center gap-2">
                  <span>💬</span> 핵심 메시지 <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600 mb-3">이 영상을 통해 전달하고 싶은 핵심 메시지 한 줄</p>
                <Textarea
                  value={coreMessage}
                  onChange={(e) => setCoreMessage(e.target.value.slice(0, 100))}
                  placeholder="수분 부족한 겨울철, 히알루론산 7중 콤플렉스로 속부터 차오르는 깊은 보습을 경험하세요"
                  className="resize-none"
                  rows={3}
                  maxLength={100}
                />
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-400">{coreMessage.length}/100자</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 필수 미션 섹션 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎬</span>
                <h2 className="text-lg font-semibold">필수 미션 <span className="text-red-500">*</span></h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">크리에이터가 반드시 수행해야 할 미션을 선택하세요</p>

              <div className="space-y-3">
                {missionOptions.map((option) => (
                  <div
                    key={option.key}
                    className={`flex items-center p-4 rounded-lg border transition-colors cursor-pointer ${
                      missions[option.key]
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleMissionChange(option.key, !missions[option.key])}
                  >
                    <Checkbox
                      checked={missions[option.key]}
                      onCheckedChange={(checked) => handleMissionChange(option.key, checked)}
                      className="mr-3"
                    />
                    <span className="text-gray-800">{option.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 금지 사항 섹션 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🚫</span>
                <h2 className="text-lg font-semibold">금지 사항 <span className="text-red-500">*</span></h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">크리에이터가 절대 하면 안 되는 것들</p>

              <div className="space-y-3">
                {prohibitionOptions.map((option) => (
                  <div
                    key={option.key}
                    className={`flex items-center p-4 rounded-lg border transition-colors cursor-pointer ${
                      prohibitions[option.key]
                        ? 'bg-red-50 border-red-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleProhibitionChange(option.key, !prohibitions[option.key])}
                  >
                    <Checkbox
                      checked={prohibitions[option.key]}
                      onCheckedChange={(checked) => handleProhibitionChange(option.key, checked)}
                      className={`mr-3 ${prohibitions[option.key] ? 'border-red-500 data-[state=checked]:bg-red-500' : ''}`}
                    />
                    <span className={prohibitions[option.key] ? 'text-red-800 font-medium' : 'text-gray-800'}>
                      {option.label}
                    </span>
                  </div>
                ))}

                {/* 기타 금지사항 */}
                <div
                  className={`p-4 rounded-lg border transition-colors ${
                    prohibitions.other
                      ? 'bg-red-50 border-red-300'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div
                    className="flex items-center cursor-pointer"
                    onClick={() => handleProhibitionChange('other', !prohibitions.other)}
                  >
                    <Checkbox
                      checked={prohibitions.other}
                      onCheckedChange={(checked) => handleProhibitionChange('other', checked)}
                      className={`mr-3 ${prohibitions.other ? 'border-red-500 data-[state=checked]:bg-red-500' : ''}`}
                    />
                    <span className={prohibitions.other ? 'text-red-800 font-medium' : 'text-gray-800'}>
                      기타
                    </span>
                  </div>
                  {prohibitions.other && (
                    <Input
                      value={prohibitionOtherText}
                      onChange={(e) => setProhibitionOtherText(e.target.value)}
                      placeholder="기타 금지 사항을 입력하세요"
                      className="mt-3"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 자동 생성 해시태그 섹션 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">#️⃣</span>
                <h2 className="text-lg font-semibold">자동 생성 해시태그</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">1초 후킹 포인트와 핵심 메시지를 기반으로 자동 생성됩니다</p>

              <div className="flex gap-3 flex-wrap">
                {hashtags.map((tag, index) => (
                  <Input
                    key={index}
                    value={tag}
                    onChange={(e) => {
                      const newTags = [...hashtags]
                      newTags[index] = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                      setHashtags(newTags)
                    }}
                    placeholder={`#해시태그${index + 1}`}
                    className="w-40"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 추가 옵션 섹션 */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">⚙️</span>
                <h2 className="text-lg font-semibold">추가 옵션</h2>
              </div>

              {/* 영상 설정 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 영상 길이 */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">영상 길이</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {videoLengthOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVideoLength(option.value)}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          videoLength === option.value
                            ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 영상 속도 */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">영상 속도</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {videoTempoOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVideoTempo(option.value)}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          videoTempo === option.value
                            ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 나레이션 여부 & 파트너십 광고 코드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* 나레이션 여부 */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">나레이션 여부</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasNarration(true)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        hasNarration === true
                          ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      ⭕ 있음
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasNarration(false)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        hasNarration === false
                          ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      ❌ 없음
                    </button>
                  </div>
                </div>

                {/* 파트너십 광고 코드 발급 여부 */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">파트너십 광고 코드 발급 여부</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNeedsPartnershipCode(true)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        needsPartnershipCode === true
                          ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      ⭕ 필요
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeedsPartnershipCode(false)}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        needsPartnershipCode === false
                          ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      ❌ 불필요
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">체크하시면 메타(Facebook/Instagram) 광고 코드를 발급해드립니다</p>
                </div>
              </div>

              {/* 레퍼런스 URL */}
              <div>
                <Label className="text-base font-semibold mb-2 block">레퍼런스 URL</Label>
                <p className="text-sm text-gray-600 mb-3">크리에이터가 참고할 영상 링크를 입력하세요</p>
                <Input
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  type="url"
                />
              </div>
            </CardContent>
          </Card>

          {/* 에러/성공 메시지 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}
        </div>
      </div>

      {/* 우측 끝 도움말 플로팅 버튼 (문의하기 버튼 포함) */}
      <div className="fixed bottom-24 right-6 z-50">
        <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-full pl-4 pr-2 py-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 text-lg font-bold">?</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">도움이 필요하신가요?</p>
            <p className="text-xs text-gray-500">전문 매니저가 상담해드립니다.</p>
          </div>
          <button
            type="button"
            onClick={() => window.open('https://pf.kakao.com/_xnxfxhxj', '_blank')}
            className="ml-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full transition-colors"
          >
            문의하기
          </button>
        </div>
      </div>

      {/* 하단 고정 네비게이션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 왼쪽: 템플릿 저장 */}
            <Button
              variant="outline"
              onClick={saveTemplate}
              className="px-6 py-2.5"
            >
              템플릿으로 저장
            </Button>

            {/* 오른쪽: 이전 단계, 다음 단계 */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                이전 단계
              </Button>

              <Button
                onClick={handleSaveAndContinue}
                disabled={processing || !hookingPoint || !coreMessage}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {processing ? '저장 중...' : '다음 단계'}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 템플릿 모달 */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">저장된 템플릿</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            {savedTemplates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">저장된 템플릿이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {savedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-gray-500 truncate">{template.hookingPoint || '후킹 포인트 없음'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setShowTemplateModal(false)}
              className="w-full mt-4"
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default CampaignGuideEditor
