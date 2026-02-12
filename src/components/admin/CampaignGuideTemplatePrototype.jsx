/**
 * 캠페인 가이드 템플릿 페이지 (리빌딩)
 *
 * === 실제 적용 시 참조할 코드 위치 ===
 * [한국] src/components/company/CreateCampaignKorea.jsx (제품정보 L21-68, URL크롤 L1854-1887, 패키지 L457-515)
 * [일본] src/components/company/CreateCampaignJapan.jsx (기본정보 L32-94, 일본어필드 L90-93)
 * [미국] src/components/company/CreateCampaignUS.jsx (기본정보 L32-90, 영어필드 L86-89)
 * [크리에이터] src/components/creator/CreatorProfileApplication.jsx (프로필 L18-37, DB: featured_creator_applications)
 * [템플릿] src/data/campaignGuideTemplates.js (KR L138, US L619, JP L1117)
 * [가이드] src/components/company/CampaignGuide.jsx (guide_delivery_mode: ai|external)
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
  Plus, X, Check, Copy, Eye, Edit3, Store, MapPin, Loader2, Wand2,
  Download, Save, Search, Filter, LayoutGrid, Flame, RefreshCw, Play,
  User, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  KOREA_TEMPLATES, US_TEMPLATES, JAPAN_TEMPLATES,
  PRODUCT_CATEGORIES, PLATFORMS, VIDEO_DURATIONS, STORE_VISIT_OPTIONS,
  US_STATE_CHARACTERISTICS, CATEGORY_SCENES_KR, CATEGORY_SCENES_US, CATEGORY_SCENES_JP,
  generateGuideFromTemplate,
} from '../../data/campaignGuideTemplates'

// SVG 국기
const FlagKR = ({ className = "w-5 h-3.5" }) => (
  <svg viewBox="0 0 900 600" className={className}><rect width="900" height="600" fill="white"/><circle cx="450" cy="300" r="150" fill="#C60C30"/><path d="M450,150 A150,150 0 0,1 450,300 A75,75 0 0,0 450,450 A150,150 0 0,1 450,150" fill="#003478"/><path d="M450,150 A150,150 0 0,0 450,300 A75,75 0 0,1 450,450 A150,150 0 0,0 450,150" fill="#C60C30"/></svg>
)
const FlagJP = ({ className = "w-5 h-3.5" }) => (
  <svg viewBox="0 0 900 600" className={className}><rect width="900" height="600" fill="white"/><circle cx="450" cy="300" r="180" fill="#BC002D"/></svg>
)
const FlagUS = ({ className = "w-5 h-3.5" }) => (
  <svg viewBox="0 0 1235 650" className={className}><rect width="1235" height="650" fill="#B22234"/><rect y="50" width="1235" height="50" fill="white"/><rect y="150" width="1235" height="50" fill="white"/><rect y="250" width="1235" height="50" fill="white"/><rect y="350" width="1235" height="50" fill="white"/><rect y="450" width="1235" height="50" fill="white"/><rect y="550" width="1235" height="50" fill="white"/><rect width="494" height="350" fill="#3C3B6E"/></svg>
)

const COUNTRY_CONFIG = {
  kr: { flag: FlagKR, label: '한국', labelEn: 'KR', templates: KOREA_TEMPLATES, categoryScenes: CATEGORY_SCENES_KR, hasStoreVisit: true, brandPh: '예: 아모레퍼시픽', productPh: '예: 설화수 윤조에센스', pricePh: '35000', descPh: '제품의 주요 특징', linkPh: 'https://www.oliveyoung.co.kr/...', campaignTypes: [{ id: 'planned', label: '기획형' }, { id: 'oliveyoung', label: '올리브영' }, { id: '4week_challenge', label: '4주 챌린지' }], packageTypes: [{ id: 'basic', label: 'Basic (150,000원)' }, { id: 'standard', label: 'Standard (200,000원)' }, { id: 'premium', label: 'Premium (280,000원)' }] },
  jp: { flag: FlagJP, label: '일본', labelEn: 'JP', templates: JAPAN_TEMPLATES, categoryScenes: CATEGORY_SCENES_JP, hasStoreVisit: false, brandPh: '例: 資生堂', productPh: '例: エリクシール', descPh: '商品の特徴', campaignTypes: [{ id: 'regular', label: 'レギュラー' }], packageTypes: [{ id: 'junior', label: 'Junior (18,000円)' }, { id: 'standard', label: 'Standard (30,000円)' }] },
  us: { flag: FlagUS, label: '미국', labelEn: 'US', templates: US_TEMPLATES, categoryScenes: CATEGORY_SCENES_US, hasStoreVisit: false, brandPh: 'e.g. Estee Lauder', productPh: 'e.g. Advanced Night Repair', descPh: 'Key product features', campaignTypes: [{ id: 'regular', label: 'Regular' }], packageTypes: [{ id: 'starter', label: 'Starter ($90)' }, { id: 'standard', label: 'Standard ($150)' }] },
}

export default function CampaignGuideTemplatePrototype() {
  const navigate = useNavigate()
  const [selectedCountry, setSelectedCountry] = useState('kr')
  const [guideMode, setGuideMode] = useState('youtube')

  // 크리에이터 프로필
  const [creator, setCreator] = useState({ name: '', instagram: '', youtube: '', tiktok: '', intro: '', strengths: '', audience: '', followers: '' })
  const [showCreator, setShowCreator] = useState(true)

  // 제품/캠페인
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productLink, setProductLink] = useState('')
  const [campaignType, setCampaignType] = useState('planned')
  const [packageType, setPackageType] = useState('standard')

  // 상세 옵션
  const [selectedCategory, setSelectedCategory] = useState('')
  const [storeVisit, setStoreVisit] = useState('none')
  const [customStore, setCustomStore] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok', 'instagram'])
  const [selectedDuration, setSelectedDuration] = useState('30s')
  const [additionalScenes, setAdditionalScenes] = useState([''])
  const [additionalDialogues, setAdditionalDialogues] = useState([''])
  const [showOptions, setShowOptions] = useState(false)
  const [usState, setUsState] = useState('')
  const [stateRec, setStateRec] = useState(null)

  // 템플릿
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [generatedGuide, setGeneratedGuide] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // AI 가이드
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)
  const [showAIModal, setShowAIModal] = useState(false)

  // 핫 숏폼
  const [hotShorts, setHotShorts] = useState([])
  const [loadingHot, setLoadingHot] = useState(false)
  const [playingId, setPlayingId] = useState(null)

  // YouTube 분석
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [similarity, setSimilarity] = useState(80)
  const [ytDialogues, setYtDialogues] = useState(['', '', ''])
  const [ytNotes, setYtNotes] = useState('')
  const [ytTranscript, setYtTranscript] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [ytResult, setYtResult] = useState(null)

  // 데이터 로딩
  const fetchHot = async () => {
    setLoadingHot(true)
    try {
      const r = await fetch('/.netlify/functions/fetch-hot-beauty-shorts')
      const j = await r.json()
      if (j.success && j.data) setHotShorts(j.data)
    } catch (e) { console.error(e) }
    finally { setLoadingHot(false) }
  }
  useEffect(() => { fetchHot() }, [])
  useEffect(() => {
    if (selectedCountry === 'us' && usState && usState !== 'none' && US_STATE_CHARACTERISTICS[usState]) setStateRec(US_STATE_CHARACTERISTICS[usState])
    else setStateRec(null)
  }, [selectedCountry, usState])

  // YouTube 분석
  const analyzeYT = async () => {
    if (!youtubeUrl.trim()) return alert('YouTube URL을 입력해주세요.')
    setAnalyzing(true); setYtResult(null)
    try {
      const res = await fetch('/.netlify/functions/analyze-youtube-shorts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(), similarityPercent: similarity,
          requiredDialogues: ytDialogues.filter(d => d.trim()),
          additionalNotes: ytNotes.trim(), manualTranscript: ytTranscript.trim(),
          creatorProfile: creator.name ? creator : undefined,
          productInfo: productName ? { brand: brandName, product_name: productName, description: productDescription } : undefined,
          country: selectedCountry,
        })
      })
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        const txt = await res.text()
        if (res.status === 502 || res.status === 504 || txt.includes('<HTML')) throw new Error('타임아웃. 자막 직접 입력을 사용해보세요.')
        throw new Error(`서버 오류 (${res.status})`)
      }
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || '분석 실패')
      setYtResult(result)
    } catch (e) { console.error(e); alert(`분석 실패: ${e.message}`) }
    finally { setAnalyzing(false) }
  }

  const copyYtGuide = async () => {
    if (!ytResult?.guideData?.guide) return
    const g = ytResult.guideData.guide
    const txt = `## ${g.title}\n\n**컨셉:** ${g.concept}\n\n### 촬영 장면\n${g.scenes?.map((s, i) => `${i+1}. [${s.duration}] ${s.name}\n   ${s.description}\n   카메라: ${s.camera}\n   대사: "${s.dialogue}"`).join('\n\n')}\n\n### 필수 대사\n${g.required_dialogues?.map((d, i) => `${i+1}. "${d}"`).join('\n')}\n\n### 해시태그\n${g.hashtags?.map(h => `#${h}`).join(' ')}\n\n### 촬영 팁\n${g.filming_tips?.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\n### 주의사항\n${g.cautions}`
    try { await navigator.clipboard.writeText(txt); alert('복사 완료!') } catch (e) { console.error(e) }
  }

  // AI 가이드 (템플릿 기반)
  const generateAI = async () => {
    if (!selectedTemplate || !productName) return alert('템플릿과 제품명을 먼저 선택/입력해주세요.')
    setIsGeneratingAI(true)
    try {
      const creatorAnalysis = {
        style: selectedTemplate.type, tone: selectedTemplate.toneGuide,
        culturalNotes: selectedTemplate.culturalNotes, country: selectedCountry,
        preferredPlatforms: selectedPlatforms,
        ...(creator.name && { creatorName: creator.name, creatorIntro: creator.intro, creatorStyle: creator.strengths, creatorAudience: creator.audience, creatorFollowers: creator.followers }),
      }
      const productInfo = { product_name: productName, brand: brandName, description: productDescription, price: productPrice, link: productLink, category: PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory }
      const templateGuide = {
        templateType: selectedTemplate.type, templateTitle: selectedTemplate.title,
        defaultScenes: selectedTemplate.defaultScenes, defaultDialogues: selectedTemplate.defaultDialogues,
        hashtags: selectedTemplate.hashtags, duration: selectedDuration, platforms: selectedPlatforms,
        storeVisit: storeVisit !== 'none' ? (storeVisit === 'other' ? customStore : STORE_VISIT_OPTIONS.find(s => s.id === storeVisit)?.label) : null,
      }
      const res = await fetch('/.netlify/functions/generate-personalized-guide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorAnalysis, productInfo, templateGuide, country: selectedCountry }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'AI 가이드 생성 실패')
      setAiGuide(result.personalizedGuide); setShowAIModal(true)
    } catch (e) { console.error(e); alert(`실패: ${e.message}`) }
    finally { setIsGeneratingAI(false) }
  }

  const downloadAI = () => {
    if (!aiGuide) return
    const uri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(aiGuide, null, 2))
    const a = document.createElement('a'); a.href = uri; a.download = `ai-guide-${productName || 'template'}-${Date.now()}.json`; a.click()
  }

  // 템플릿 관련
  const conf = COUNTRY_CONFIG[selectedCountry]
  const getTemplates = () => {
    let t = [...conf.templates]
    if (selectedCategory) t = t.filter(x => x.applicableCategories?.includes(selectedCategory))
    if (typeFilter !== 'all') t = t.filter(x => x.type.toLowerCase() === typeFilter.toLowerCase())
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); t = t.filter(x => x.title.toLowerCase().includes(q) || x.description.toLowerCase().includes(q) || x.type.toLowerCase().includes(q) || x.titleKr?.toLowerCase().includes(q)) }
    return t
  }
  const getTypes = () => [...new Set(conf.templates.map(t => t.type))].sort()
  const selectTemplate = (t) => {
    setSelectedTemplate(t); setSelectedPlatforms(t.platforms); setSelectedDuration(t.duration)
    setGeneratedGuide(generateGuideFromTemplate(t, selectedCategory, { storeVisit, customStore, platforms: t.platforms, duration: t.duration, country: selectedCountry, brandName, productName, productDescription }))
  }
  const regenGuide = () => {
    if (!selectedTemplate) return
    setGeneratedGuide(generateGuideFromTemplate(selectedTemplate, selectedCategory, { storeVisit, customStore, platforms: selectedPlatforms, duration: selectedDuration, additionalScenes: additionalScenes.filter(s => s.trim()), additionalDialogues: additionalDialogues.filter(d => d.trim()), country: selectedCountry, brandName, productName, productDescription }))
  }
  const addItem = (set, arr) => set([...arr, ''])
  const rmItem = (set, arr, i) => set(arr.filter((_, idx) => idx !== i))
  const upItem = (set, arr, i, v) => { const n = [...arr]; n[i] = v; set(n) }
  const fmtViews = (c) => c >= 1e6 ? (c/1e6).toFixed(1)+'M' : c >= 1e3 ? Math.round(c/1e3)+'K' : c

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />AI 촬영 가이드 생성기<Badge variant="secondary" className="text-[10px]">Beta</Badge>
              </h1>
              <p className="text-xs text-gray-500">크리에이터 맞춤 촬영 가이드를 AI로 생성합니다</p>
            </div>
          </div>
          <Button onClick={guideMode === 'youtube' ? analyzeYT : generateAI}
            disabled={guideMode === 'youtube' ? (!youtubeUrl.trim() || analyzing) : (!selectedTemplate || !productName || isGeneratingAI)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            {(analyzing || isGeneratingAI) ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />생성 중...</> : <><Wand2 className="w-4 h-4 mr-2" />AI 가이드 생성</>}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ========== STEP 1: 국가 탭 ========== */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex border-b">
            {Object.entries(COUNTRY_CONFIG).map(([k, c]) => {
              const F = c.flag; const active = selectedCountry === k
              return (
                <button key={k} onClick={() => { setSelectedCountry(k); setSelectedTemplate(null); setGeneratedGuide(null); setYtResult(null); setCampaignType(c.campaignTypes[0].id); setPackageType(c.packageTypes[0].id) }}
                  className={`flex-1 py-4 px-6 flex items-center justify-center gap-2.5 text-sm font-semibold transition-all ${active ? 'bg-white border-b-2 border-purple-600 text-purple-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                  <F className="w-6 h-4 rounded-[2px] shadow-sm" />{c.label}<span className="text-xs text-gray-400">{c.labelEn}</span>
                  <Badge variant="secondary" className="text-[10px] ml-1">{c.templates.length}</Badge>
                </button>
              )
            })}
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">캠페인 타입</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{conf.campaignTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">패키지</Label>
              <Select value={packageType} onValueChange={setPackageType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{conf.packageTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">제품 카테고리</Label>
              <Select value={selectedCategory} onValueChange={v => { setSelectedCategory(v); setSelectedTemplate(null); setGeneratedGuide(null) }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedCountry === 'us' && (
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">주(State)</Label>
                <Select value={usState} onValueChange={setUsState}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">선택 안 함</SelectItem>{Object.keys(US_STATE_CHARACTERISTICS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          {stateRec && <div className="px-5 pb-4 text-xs text-blue-700 bg-blue-50 mx-5 mb-4 rounded-lg p-2">기후: {stateRec.climate} | 스타일: {stateRec.style} | 추천: {stateRec.focus.join(', ')}</div>}
        </div>

        {/* ========== STEP 2: 크리에이터 + 제품 ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 크리에이터 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
            <CardHeader className="pb-2">
              <button onClick={() => setShowCreator(!showCreator)} className="flex items-center justify-between w-full">
                <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4 text-purple-500" />크리에이터 프로필{creator.name && <Badge className="bg-green-100 text-green-700 text-[10px]">입력됨</Badge>}</CardTitle>
                {showCreator ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              <CardDescription className="text-xs">크리에이터 특성에 맞는 맞춤 가이드 생성</CardDescription>
            </CardHeader>
            {showCreator && (
              <CardContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">크리에이터명</Label><Input className="h-8 text-sm" placeholder="홍길동" value={creator.name} onChange={e => setCreator({...creator, name: e.target.value})} /></div>
                  <div><Label className="text-xs mb-1 block">팔로워 수</Label><Input className="h-8 text-sm" placeholder="50000" value={creator.followers} onChange={e => setCreator({...creator, followers: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" placeholder="Instagram URL" value={creator.instagram} onChange={e => setCreator({...creator, instagram: e.target.value})} />
                  <Input className="h-8 text-xs" placeholder="YouTube URL" value={creator.youtube} onChange={e => setCreator({...creator, youtube: e.target.value})} />
                  <Input className="h-8 text-xs" placeholder="TikTok URL" value={creator.tiktok} onChange={e => setCreator({...creator, tiktok: e.target.value})} />
                </div>
                <div><Label className="text-xs mb-1 block">자기소개 / 콘텐츠 스타일</Label><Textarea className="text-sm" rows={2} placeholder="예: 20대 뷰티 유튜버, 솔직한 리뷰..." value={creator.intro} onChange={e => setCreator({...creator, intro: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">콘텐츠 강점</Label><Input className="h-8 text-sm" placeholder="높은 전환율, 트렌드 선도" value={creator.strengths} onChange={e => setCreator({...creator, strengths: e.target.value})} /></div>
                  <div><Label className="text-xs mb-1 block">타겟 오디언스</Label><Input className="h-8 text-sm" placeholder="20-30대 여성" value={creator.audience} onChange={e => setCreator({...creator, audience: e.target.value})} /></div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 제품 */}
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-500" />제품 / 캠페인 정보{productName && <Badge className="bg-green-100 text-green-700 text-[10px]">입력됨</Badge>}</CardTitle>
              <CardDescription className="text-xs">가이드에 반영될 제품 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">브랜드명</Label><Input className="h-8 text-sm" placeholder={conf.brandPh} value={brandName} onChange={e => setBrandName(e.target.value)} /></div>
                <div><Label className="text-xs mb-1 block">제품명 *</Label><Input className="h-8 text-sm" placeholder={conf.productPh} value={productName} onChange={e => setProductName(e.target.value)} /></div>
              </div>
              {selectedCountry === 'kr' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">제품 가격</Label><Input className="h-8 text-sm" placeholder={conf.pricePh} value={productPrice} onChange={e => setProductPrice(e.target.value)} /></div>
                  <div><Label className="text-xs mb-1 block">제품 링크</Label><Input className="h-8 text-sm" placeholder={conf.linkPh} value={productLink} onChange={e => setProductLink(e.target.value)} /></div>
                </div>
              )}
              <div><Label className="text-xs mb-1 block">제품 설명</Label><Textarea className="text-sm" rows={2} placeholder={conf.descPh} value={productDescription} onChange={e => setProductDescription(e.target.value)} /></div>
              {(brandName || productName) && <div className="p-2 bg-white rounded-lg border text-xs"><span className="text-gray-500">가이드 반영: </span><span className="font-medium text-orange-700">{brandName && `${brandName}의 `}{productName || '제품'}</span></div>}
            </CardContent>
          </Card>
        </div>

        {/* ========== STEP 3: 모드 선택 + 본문 ========== */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex border-b">
            <button onClick={() => setGuideMode('youtube')} className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${guideMode === 'youtube' ? 'bg-white border-b-2 border-red-500 text-red-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              <Video className="w-4 h-4" />YouTube 숏폼 따라하기
            </button>
            <button onClick={() => setGuideMode('template')} className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold transition-all ${guideMode === 'template' ? 'bg-white border-b-2 border-purple-500 text-purple-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              <LayoutGrid className="w-4 h-4" />템플릿 기반 가이드
            </button>
          </div>

          <div className="p-6">
            {/* ===== YouTube 모드 ===== */}
            {guideMode === 'youtube' && (
              <div className="space-y-6">
                {/* 핫 숏폼 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />HOT 뷰티 숏폼 TOP 10</h3>
                    <Button variant="outline" size="sm" onClick={fetchHot} disabled={loadingHot} className="text-xs h-7">
                      {loadingHot ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}<span className="ml-1">새로고침</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">한국 조회수 높은 뷰티 숏폼 (채널당 1개). 미리 보고 "URL 입력" 클릭</p>
                  {loadingHot ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-orange-500" /><span className="ml-2 text-sm text-gray-500">불러오는 중...</span></div>
                  ) : hotShorts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {hotShorts.map((s, idx) => (
                        <div key={s.video_id} className={`relative rounded-xl overflow-hidden border-2 transition-all ${playingId === s.video_id ? 'border-orange-400 shadow-lg' : 'border-transparent hover:border-orange-200'}`}>
                          <div className="aspect-[9/16] relative">
                            {playingId === s.video_id ? (
                              <iframe src={`https://www.youtube.com/embed/${s.video_id}?autoplay=1&mute=0&loop=1&playlist=${s.video_id}&playsinline=1&controls=1&rel=0`} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                            ) : (
                              <>
                                <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx < 3 ? 'bg-orange-500' : 'bg-gray-700/80'}`}>{idx+1}</div>
                                <button onClick={() => setPlayingId(s.video_id)} className="absolute inset-0 flex items-center justify-center group cursor-pointer">
                                  <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/50 transition-colors"><Play className="w-4 h-4 text-white ml-0.5" fill="white" /></div>
                                </button>
                                <div className="absolute bottom-1.5 left-1.5 right-1.5">
                                  <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight mb-1">{s.title}</p>
                                  <div className="flex items-center gap-1"><span className="text-white/80 text-[9px]">{fmtViews(s.view_count)} views</span><span className="text-white/50 text-[9px] ml-auto truncate max-w-[60px]">{s.channel_title}</span></div>
                                </div>
                              </>
                            )}
                          </div>
                          <button onClick={() => { setYoutubeUrl(s.url); setPlayingId(null); document.getElementById('yt-url')?.focus() }}
                            className="w-full py-1.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" />URL 입력
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-4 text-gray-400 text-sm">영상을 불러올 수 없습니다.</div>}
                </div>

                {/* URL 입력 & 분석 */}
                <div className="p-5 bg-gradient-to-br from-red-50 via-white to-orange-50 rounded-xl border-2 border-red-200 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><Video className="w-5 h-5 text-red-500" />YouTube Shorts 영상 분석</h3>
                  <div className="flex gap-2">
                    <Input id="yt-url" placeholder="https://youtube.com/shorts/..." value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} className="flex-1" />
                    {youtubeUrl && <Button variant="ghost" size="sm" onClick={() => setYoutubeUrl('')}><X className="w-4 h-4" /></Button>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">유사도: <span className="text-red-600 font-bold">{similarity}%</span></Label>
                    <input type="range" min="10" max="100" step="5" value={similarity} onChange={e => setSimilarity(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500" />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>10% 영감만</span><span>50% 참고</span><span>80% 유사</span><span>100% 동일</span></div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1 block">필수 대사 (최대 3개)</Label>
                    <div className="space-y-1.5">
                      {ytDialogues.map((d, i) => (
                        <div key={i} className="flex items-center gap-2"><span className="text-xs font-bold text-red-500 w-4">{i+1}.</span>
                          <Input className="h-8 text-sm" placeholder={`필수 대사 ${i+1}`} value={d} onChange={e => { const n=[...ytDialogues]; n[i]=e.target.value; setYtDialogues(n) }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div><Label className="text-sm font-medium mb-1 block">추가 요청사항</Label><Textarea rows={2} className="text-sm" placeholder="예: 클로즈업 필수, 밝은 톤..." value={ytNotes} onChange={e => setYtNotes(e.target.value)} /></div>
                  <details className="bg-amber-50 rounded-lg border border-amber-200 p-3">
                    <summary className="text-sm font-medium text-amber-800 cursor-pointer">자막 직접 입력 (자동 추출 실패 시)</summary>
                    <Textarea rows={4} className="bg-white text-sm mt-2" placeholder="[0:00] 안녕하세요..." value={ytTranscript} onChange={e => setYtTranscript(e.target.value)} />
                    {ytTranscript.trim() && <p className="text-xs text-green-600 mt-1">{ytTranscript.trim().split('\n').filter(l=>l.trim()).length}줄 입력됨</p>}
                  </details>
                  <Button onClick={analyzeYT} disabled={!youtubeUrl.trim() || analyzing} className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3">
                    {analyzing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />AI 분석 중... (15~30초)</> : <><Sparkles className="w-5 h-5 mr-2" />영상 분석 &amp; 가이드 생성</>}
                  </Button>

                  {/* 분석 결과 */}
                  {ytResult?.guideData && (
                    <div className="mt-4 space-y-4">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2"><Search className="w-4 h-4" />원본 데이터</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-blue-600 font-semibold">제목:</span> {ytResult.videoData?.title || '-'}</div>
                          <div><span className="text-blue-600 font-semibold">길이:</span> {ytResult.videoData?.duration ? `${ytResult.videoData.duration}초` : '-'}</div>
                          <div><span className="text-blue-600 font-semibold">분석:</span> <span className={ytResult.videoData?.hasTranscript ? 'text-green-700' : 'text-red-600'}>
                            {(() => { const m=ytResult.videoData?.captionMethod||''; if(m.startsWith('gemini')) return 'Gemini AI'; if(m.startsWith('manual')) return '직접입력'; if(ytResult.videoData?.hasTranscript) return `자막추출(${m||'auto'})`; return '자막없음' })()}
                          </span></div>
                          <div><span className="text-blue-600 font-semibold">ID:</span> <span className="font-mono">{ytResult.videoData?.videoId||'-'}</span></div>
                        </div>
                        {ytResult.videoData?.timeline && <details className="mt-2"><summary className="text-xs text-blue-600 cursor-pointer">자막 보기</summary><pre className="text-xs whitespace-pre-wrap font-mono mt-1 p-2 bg-white rounded max-h-32 overflow-y-auto">{ytResult.videoData.timeline}</pre></details>}
                      </div>
                      {ytResult.guideData.video_analysis && (
                        <div className="p-3 bg-gray-50 rounded-xl border text-xs">
                          <h4 className="font-bold mb-1 flex items-center gap-1"><Eye className="w-3 h-3" />AI 분석</h4>
                          <div className="grid grid-cols-2 gap-1">
                            <div>스타일: {ytResult.guideData.video_analysis.style}</div>
                            <div>톤: {ytResult.guideData.video_analysis.tone}</div>
                            <div>구조: {ytResult.guideData.video_analysis.structure}</div>
                            <div>길이: {ytResult.guideData.video_analysis.estimated_duration}</div>
                          </div>
                        </div>
                      )}
                      {ytResult.guideData.guide && (
                        <div className="p-4 bg-white rounded-xl border-2 border-purple-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-purple-800 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" />{ytResult.guideData.guide.title}</h4>
                            <Button variant="outline" size="sm" onClick={copyYtGuide}><Copy className="w-3 h-3 mr-1" />복사</Button>
                          </div>
                          <p className="text-sm text-gray-600 bg-purple-50 p-2.5 rounded-lg">{ytResult.guideData.guide.concept}</p>
                          <div className="space-y-2">
                            {ytResult.guideData.guide.scenes?.map((sc, i) => (
                              <div key={i} className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                                <div className="flex items-center gap-2 mb-1"><Badge className="bg-blue-600 text-white text-[10px]">{sc.order||i+1}</Badge><span className="font-semibold text-blue-800">{sc.name}</span><span className="text-xs text-blue-500 ml-auto">{sc.duration}</span></div>
                                <p className="text-xs text-gray-700">{sc.description}</p>
                                {sc.dialogue && <p className="text-xs text-purple-600 mt-1 italic">&quot;{sc.dialogue}&quot;</p>}
                              </div>
                            ))}
                          </div>
                          {ytResult.guideData.guide.required_dialogues?.length > 0 && <div>{ytResult.guideData.guide.required_dialogues.map((d,i) => <div key={i} className="p-2 bg-orange-50 rounded border border-orange-200 text-sm mb-1"><span className="font-bold text-orange-600 mr-1">{i+1}.</span>&quot;{d}&quot;</div>)}</div>}
                          {ytResult.guideData.guide.hashtags?.length > 0 && <div className="flex flex-wrap gap-1.5">{ytResult.guideData.guide.hashtags.map((t,i) => <Badge key={i} variant="secondary" className="text-xs">#{t.replace(/^#/,'')}</Badge>)}</div>}
                          {ytResult.guideData.guide.filming_tips?.length > 0 && <ul className="space-y-1">{ytResult.guideData.guide.filming_tips.map((t,i) => <li key={i} className="text-xs flex items-start gap-1"><Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />{t}</li>)}</ul>}
                          {ytResult.guideData.guide.cautions && <div className="p-2.5 bg-red-50 rounded-lg border border-red-200 text-xs text-red-700">{ytResult.guideData.guide.cautions}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== 템플릿 모드 ===== */}
            {guideMode === 'template' && (
              <div className="space-y-6">
                {selectedCategory && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="템플릿 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" /></div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="타입 필터" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">전체</SelectItem>{getTypes().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {!selectedCategory ? (
                  <div className="text-center py-12 text-gray-400"><LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="font-medium">먼저 제품 카테고리를 선택해주세요</p></div>
                ) : getTemplates().length === 0 ? (
                  <div className="text-center py-12 text-gray-400"><Search className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>검색 결과 없음</p>
                    {(searchQuery || typeFilter !== 'all') && <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchQuery(''); setTypeFilter('all') }}><X className="w-3 h-3 mr-1" />초기화</Button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getTemplates().map(t => (
                      <div key={t.id} onClick={() => selectTemplate(t)}
                        className={`p-4 border rounded-xl transition-all hover:shadow-md cursor-pointer ${selectedTemplate?.id === t.id ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200 hover:border-purple-300 bg-white'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-[10px]">{t.type}</Badge>
                          {selectedTemplate?.id === t.id && <Check className="w-4 h-4 text-purple-600" />}
                        </div>
                        <h3 className="font-semibold text-sm mb-0.5">{t.title}</h3>
                        <p className="text-[11px] text-gray-500 mb-1">{t.subtitle}</p>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{t.description}</p>
                        <div className="p-2 bg-green-50 rounded-lg mb-2 border border-green-200">
                          <p className="text-[10px] text-green-700 font-medium mb-0.5">장면 ({t.defaultScenes?.length||0}개)</p>
                          <ul className="text-[10px] text-green-600 list-disc list-inside">{t.defaultScenes?.slice(0,2).map((s,i) => <li key={i} className="truncate">{s}</li>)}{t.defaultScenes?.length > 2 && <li className="text-green-500">+{t.defaultScenes.length-2}개</li>}</ul>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{t.estimatedTime}</span>
                          <span className="flex items-center gap-0.5"><Video className="w-2.5 h-2.5" />{VIDEO_DURATIONS.find(d => d.id === t.duration)?.label}</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs" onClick={e => { e.stopPropagation(); setPreviewTemplate(t) }}><Eye className="w-3 h-3 mr-1" />상세보기</Button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTemplate && (
                  <div className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200 flex items-center justify-between">
                    <div><p className="text-xs text-purple-600">선택됨</p><h4 className="font-bold text-purple-800">{selectedTemplate.title}</h4></div>
                    <Button onClick={generateAI} disabled={!productName || isGeneratingAI} className="bg-gradient-to-r from-violet-600 to-purple-600">
                      {isGeneratingAI ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />생성 중...</> : <><Wand2 className="w-4 h-4 mr-2" />AI 가이드 생성</>}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== 상세 옵션 ========== */}
        <Card>
          <button onClick={() => setShowOptions(!showOptions)} className="w-full p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Store className="w-4 h-4 text-green-500" /><span className="font-semibold text-sm">상세 옵션</span><span className="text-[10px] text-gray-400">(플랫폼, 길이, 매장방문, 추가 장면/대사)</span></div>
            {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showOptions && (
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {conf.hasStoreVisit && (
                  <div>
                    <Label className="text-xs mb-1 block">매장 방문</Label>
                    <Select value={storeVisit} onValueChange={setStoreVisit}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{STORE_VISIT_OPTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}</SelectContent></Select>
                    {storeVisit === 'other' && <Input className="mt-2 h-8 text-sm" placeholder="매장명" value={customStore} onChange={e => setCustomStore(e.target.value)} />}
                  </div>
                )}
                <div>
                  <Label className="text-xs mb-1 block">플랫폼</Label>
                  <div className="flex flex-wrap gap-1.5">{PLATFORMS.map(p => (
                    <label key={p.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer text-xs ${selectedPlatforms.includes(p.id) ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200'}`}>
                      <Checkbox checked={selectedPlatforms.includes(p.id)} className="hidden" onCheckedChange={c => c ? setSelectedPlatforms([...selectedPlatforms, p.id]) : setSelectedPlatforms(selectedPlatforms.filter(x => x !== p.id))} />{p.icon} {p.label}
                    </label>
                  ))}</div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">영상 길이</Label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{VIDEO_DURATIONS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1 block">추가 장면</Label>
                  {additionalScenes.map((s,i) => <div key={i} className="flex gap-1.5 mb-1.5"><Input className="h-8 text-sm" value={s} onChange={e => upItem(setAdditionalScenes,additionalScenes,i,e.target.value)} placeholder="장면" /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rmItem(setAdditionalScenes,additionalScenes,i)}><X className="w-3 h-3" /></Button></div>)}
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addItem(setAdditionalScenes,additionalScenes)}><Plus className="w-3 h-3 mr-1" />추가</Button>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">추가 대사</Label>
                  {additionalDialogues.map((d,i) => <div key={i} className="flex gap-1.5 mb-1.5"><Input className="h-8 text-sm" value={d} onChange={e => upItem(setAdditionalDialogues,additionalDialogues,i,e.target.value)} placeholder="대사" /><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => rmItem(setAdditionalDialogues,additionalDialogues,i)}><X className="w-3 h-3" /></Button></div>)}
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addItem(setAdditionalDialogues,additionalDialogues)}><Plus className="w-3 h-3 mr-1" />추가</Button>
                </div>
              </div>
              {guideMode === 'template' && selectedTemplate && <Button className="w-full" onClick={regenGuide}><Sparkles className="w-4 h-4 mr-2" />가이드 다시 생성</Button>}
            </CardContent>
          )}
        </Card>

        {/* 개발자 참조 */}
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer">개발자 참조: 실제 적용 시 연동할 코드 위치</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border font-mono space-y-1">
            <p>한국: src/components/company/CreateCampaignKorea.jsx (제품 L21-68, URL크롤 L1854, 패키지 L457)</p>
            <p>일본: src/components/company/CreateCampaignJapan.jsx (기본정보 L32-94, 일본어 L90-93)</p>
            <p>미국: src/components/company/CreateCampaignUS.jsx (기본정보 L32-90, 영어 L86-89)</p>
            <p>크리에이터: src/components/creator/CreatorProfileApplication.jsx (L18-37)</p>
            <p>템플릿: src/data/campaignGuideTemplates.js (KR L138, US L619, JP L1117)</p>
          </div>
        </details>
      </div>

      {/* ===== 모달: 템플릿 상세 ===== */}
      <Dialog open={!!previewTemplate} onOpenChange={o => !o && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" />템플릿 상세{previewTemplate && <Badge variant="outline" className="ml-2">{previewTemplate.type}</Badge>}</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200"><p className="text-xs text-purple-600">이름</p><p className="font-semibold text-sm">{previewTemplate.title}</p></div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><p className="text-xs text-blue-600">길이</p><p className="font-semibold text-sm">{VIDEO_DURATIONS.find(d => d.id === previewTemplate.duration)?.label}</p></div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200"><p className="text-xs text-green-600">촬영시간</p><p className="font-semibold text-sm">{previewTemplate.estimatedTime}</p></div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200"><p className="text-xs text-orange-600">플랫폼</p><div className="flex gap-1 mt-0.5">{previewTemplate.platforms.map(p => <Badge key={p} variant="secondary" className="text-[10px]">{PLATFORMS.find(x=>x.id===p)?.label}</Badge>)}</div></div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm flex items-center gap-2"><Camera className="w-4 h-4 text-blue-500" />장면 ({previewTemplate.defaultScenes?.length||0}개)</h4>
                {previewTemplate.defaultScenes?.map((s,i) => <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-1"><span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span><p className="text-sm">{s}</p></div>)}
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">대사 ({previewTemplate.defaultDialogues?.length||0}개)</h4>
                {previewTemplate.defaultDialogues?.map((d,i) => <div key={i} className="p-2 bg-purple-50 rounded-lg border-l-4 border-purple-400 mb-1 text-sm italic">&quot;{d}&quot;</div>)}
              </div>
              <div className="flex flex-wrap gap-1">{previewTemplate.hashtags?.map((t,i) => <Badge key={i} variant="secondary" className="text-xs text-pink-600 bg-pink-50">{t}</Badge>)}</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200"><h4 className="text-xs font-medium text-amber-800 mb-1">톤 &amp; 매너</h4><p className="text-xs text-amber-700">{previewTemplate.toneGuide}</p></div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200"><h4 className="text-xs font-medium text-green-800 mb-1">문화적 특성</h4><p className="text-xs text-green-700">{previewTemplate.culturalNotes}</p></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>닫기</Button>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500" onClick={() => { selectTemplate(previewTemplate); setPreviewTemplate(null) }}><Sparkles className="w-4 h-4 mr-2" />선택</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 모달: AI 가이드 ===== */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-violet-500" />AI 크리에이터 가이드<Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white ml-2">AI</Badge></DialogTitle>
            <DialogDescription>크리에이터 프로필 + 제품 + 템플릿 기반 맞춤 가이드</DialogDescription>
          </DialogHeader>
          {aiGuide && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200"><p className="text-xs text-violet-600">타이틀</p><p className="font-semibold text-sm">{aiGuide.campaign_title||'-'}</p></div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><p className="text-xs text-blue-600">플랫폼</p><p className="font-semibold text-sm">{aiGuide.target_platform||'-'}</p></div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200"><p className="text-xs text-green-600">길이</p><p className="font-semibold text-sm">{aiGuide.video_duration||'-'}</p></div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200"><p className="text-xs text-orange-600">컨셉</p><p className="font-semibold text-sm truncate">{aiGuide.shooting_concept||'-'}</p></div>
              </div>
              {aiGuide.content_philosophy && <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"><h4 className="font-semibold text-sm text-purple-800 mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4" />콘텐츠 철학</h4><p className="text-sm text-purple-700">{aiGuide.content_philosophy.core_message}</p></div>}
              {aiGuide.shooting_scenes?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-2"><Camera className="w-4 h-4 text-blue-500" />촬영 장면 ({aiGuide.shooting_scenes.length}개)</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {aiGuide.shooting_scenes.map((sc,i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border shadow-sm flex items-start gap-2">
                        <span className="w-7 h-7 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{sc.order||i+1}</span>
                        <div className="flex-1">
                          <Badge variant="outline" className="text-[10px] mb-1">{sc.scene_type}</Badge>
                          <p className="text-sm mb-1">{sc.scene_description}</p>
                          {sc.dialogue && <p className="text-xs text-purple-600 italic bg-purple-50 p-1.5 rounded">&quot;{sc.dialogue}&quot;</p>}
                          {sc.shooting_tip && <p className="text-xs text-green-700 mt-1 bg-green-50 p-1.5 rounded">{sc.shooting_tip}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiGuide.required_hashtags && <div className="flex flex-wrap gap-1.5">{aiGuide.required_hashtags.brand?.map((t,i) => <Badge key={`b${i}`} className="bg-blue-100 text-blue-700 text-xs">{t}</Badge>)}{aiGuide.required_hashtags.real?.map((t,i) => <Badge key={`r${i}`} className="bg-green-100 text-green-700 text-xs">{t}</Badge>)}{aiGuide.required_hashtags.trend?.map((t,i) => <Badge key={`t${i}`} className="bg-pink-100 text-pink-700 text-xs">{t}</Badge>)}</div>}
              {aiGuide.creator_tips?.length > 0 && <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"><h4 className="font-semibold text-sm text-yellow-800 mb-1">크리에이터 팁</h4><ul className="list-disc list-inside">{aiGuide.creator_tips.map((t,i) => <li key={i} className="text-xs text-yellow-700">{t}</li>)}</ul></div>}
              {aiGuide.authenticity_guidelines && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200"><h4 className="text-xs font-semibold text-green-800 mb-1">DO</h4><ul className="list-disc list-inside">{aiGuide.authenticity_guidelines.do?.map((x,i) => <li key={i} className="text-xs text-green-700">{x}</li>)}</ul></div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200"><h4 className="text-xs font-semibold text-red-800 mb-1">DON&apos;T</h4><ul className="list-disc list-inside">{aiGuide.authenticity_guidelines.dont?.map((x,i) => <li key={i} className="text-xs text-red-700">{x}</li>)}</ul></div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAIModal(false)}>닫기</Button>
            <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(aiGuide,null,2)); alert('복사!') } catch(e){} }}><Copy className="w-4 h-4 mr-1" />JSON 복사</Button>
            <Button variant="outline" onClick={downloadAI}><Download className="w-4 h-4 mr-1" />다운로드</Button>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600"><Save className="w-4 h-4 mr-1" />캠페인 적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 모달: 미리보기 ===== */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle><Eye className="w-5 h-5 text-purple-500 inline mr-2" />가이드 미리보기</DialogTitle></DialogHeader>
          {generatedGuide && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">유형</p><p className="font-medium text-sm">{generatedGuide.templateType}</p></div>
                <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500">길이</p><p className="font-medium text-sm">{VIDEO_DURATIONS.find(d => d.id === generatedGuide.duration)?.label}</p></div>
              </div>
              {generatedGuide.scenes.map((s,i) => <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg"><span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span><p className="text-sm">{s}</p></div>)}
              {generatedGuide.dialogues.map((d,i) => <div key={i} className="p-2 bg-purple-50 rounded-lg border-l-4 border-purple-400 text-sm italic">&quot;{d}&quot;</div>)}
              <div className="flex flex-wrap gap-1">{generatedGuide.hashtags.map((t,i) => <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>)}</div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowPreview(false)}>닫기</Button><Button className="bg-purple-600">적용</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
