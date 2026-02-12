/**
 * AI 숏폼 가이드 리빌딩 (v2)
 *
 * 국가별(한국/일본/미국) 탭 형태로 AI 숏폼 가이드를 생성하는 페이지
 *
 * [코드 참조 - 실제 적용 시 연결할 곳]
 * ─────────────────────────────────────────────
 * 한국 기획형 캠페인 생성:
 *   - CreateCampaignKorea.jsx:1297-1355 (기획형 선택)
 *   - CreateCampaignKorea.jsx:1593-1675 (브랜드 정보)
 *   - CampaignGuide.jsx:464-556 (AI 가이드 입력 필드: 브랜드명, 제품명, 제품특징, 소구포인트)
 *   - CampaignGuide.jsx:187-311 (AI 가이드 생성 로직 - Gemini API)
 *
 * 일본 기획형 캠페인 생성:
 *   - CreateCampaignJapan.jsx:195-207 (기획형 정의: 企画型, ¥300,000)
 *   - CreateCampaignJapan.jsx:970-994 (기획형 스케줄 섹션)
 *   - CampaignGuideJapan.jsx:45-92 (가이드 필드: requiredDialogues, requiredScenes, hashtags, videoDuration, videoTempo, videoTone, shootingScenes 체크박스 10종)
 *   - CampaignGuideJapan.jsx:80-95 (일본어 번역 레이어)
 *
 * 미국 기획형 캠페인 생성:
 *   - CreateCampaignUS.jsx:187-212 (기획형 정의: Standard, $300,000)
 *   - CreateCampaignUS.jsx:899-923 (기획형 스케줄 섹션)
 *   - CampaignGuideUS.jsx:26-76 (가이드 필드: requiredDialogues, requiredScenes, hashtags, videoDuration, videoTempo, videoTone, shootingScenes 체크박스 10종)
 *   - CampaignGuideUS.jsx:61-76 (영어 번역 레이어)
 *
 * 크리에이터 프로필:
 *   - creators 테이블 (supabaseBiz)
 *   - CreatorMyPage.jsx (크리에이터 프로필 페이지)
 *
 * 템플릿 데이터:
 *   - src/data/campaignGuideTemplates.js (KOREA_TEMPLATES, US_TEMPLATES, JAPAN_TEMPLATES)
 * ─────────────────────────────────────────────
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
  Plus, X, Check, Copy, Eye, Loader2, Wand2, Download, Save,
  Search, LayoutGrid, User, Link2, FileText, Play, ChevronRight,
  Zap, Star, Info, Settings2, TrendingUp, RefreshCw, ThumbsUp,
  MessageCircle, Users, ShieldCheck, ExternalLink
} from 'lucide-react'
import {
  KOREA_TEMPLATES,
  US_TEMPLATES,
  JAPAN_TEMPLATES,
  PRODUCT_CATEGORIES,
  PLATFORMS,
  VIDEO_DURATIONS,
  STORE_VISIT_OPTIONS,
  generateGuideFromTemplate,
} from '../../data/campaignGuideTemplates'


// ─── 국가별 상세옵션 설정 (각 캠페인 생성 코드에서 가져온 필드 구조) ───

// 한국 기획형 상세옵션 (CampaignGuide.jsx 기반)
const KOREA_DETAIL_OPTIONS = {
  label: '한국 기획형 상세옵션',
  source: 'CampaignGuide.jsx:464-556',
  fields: {
    creatorAutonomy: { label: '촬영 장면 및 대사는 크리에이터 자율로 하겠습니다', type: 'checkbox', default: false },
    brandName: { label: '브랜드명', type: 'text', placeholder: '예: ABC Beauty', required: true },
    productName: { label: '제품명', type: 'text', placeholder: '예: 히알루론산 수분 크림', required: true },
    productFeatures: { label: '제품 특징 (주요 성분, 효능, 특징)', type: 'textarea', placeholder: '예: 히알루론산 함유, 48시간 보습, 자극 없는 순한 성분...', rows: 5, required: true },
    productSellingPoints: { label: '영상에 꼭 들어갈 제품 소구 포인트', type: 'textarea', placeholder: '예: 발림성이 좋고 흡수가 빠르다는 점을 강조해주세요...', rows: 5, required: true },
  },
  platforms: ['tiktok', 'youtube_shorts', 'instagram_reels'],
  videoDurations: ['15s', '30s', '60s', '90s+'],
}

// 일본 기획형 상세옵션 (CampaignGuideJapan.jsx 기반)
const JAPAN_DETAIL_OPTIONS = {
  label: '일본 기획형 상세옵션',
  source: 'CampaignGuideJapan.jsx:45-92',
  fields: {
    brandName: { label: 'ブランド名 (브랜드명)', type: 'text', placeholder: '例: ABC ビューティー', required: true },
    productName: { label: '商品名 (제품명)', type: 'text', placeholder: '例: ヒアルロン酸モイスチャークリーム', required: true },
    productDescription: { label: '商品説明 (제품 설명)', type: 'textarea', placeholder: '主な成分、効能、特徴を記入してください...', rows: 4, required: true },
    productFeatures: { label: '商品の特長 (제품 특장점, 최대 5개)', type: 'array', maxItems: 5, placeholder: '特長を入力' },
    requiredDialogues: { label: '必須セリフ (필수 대사)', type: 'array', maxItems: 5, placeholder: 'セリフを入力' },
    requiredScenes: { label: '必須撮影シーン (필수 촬영 장면)', type: 'textarea', placeholder: '例: 洗顔後の素肌、商品のテクスチャーアップ...', rows: 3 },
    requiredHashtags: { label: '必須ハッシュタグ (필수 해시태그)', type: 'text', placeholder: '例: #美容 #スキンケア #新商品' },
    videoDuration: { label: '動画の長さ (영상 길이)', type: 'select', options: ['15秒', '30秒', '60秒', '90秒以上'] },
    videoTempo: { label: 'テンポ (영상 템포)', type: 'select', options: ['速い (빠름)', '普通 (보통)', 'ゆっくり (느림)'] },
    videoTone: { label: 'トーン (영상 톤)', type: 'select', options: ['明るい (밝음)', '真面目 (진지함)', '柔らかい (부드러움)'] },
    additionalDetails: { label: '追加リクエスト (추가 요청사항)', type: 'textarea', placeholder: '追加のリクエストがあれば記入してください...', rows: 3 },
  },
  shootingScenes: [
    { id: 'baPhoto', label: 'BA写真 (비포/애프터)', labelKr: 'BA 사진' },
    { id: 'noMakeup', label: 'すっぴん (노메이크업)', labelKr: '노메이크업' },
    { id: 'closeup', label: 'クローズアップ (클로즈업)', labelKr: '클로즈업' },
    { id: 'productCloseup', label: '商品クローズアップ (제품 클로즈업)', labelKr: '제품 클로즈업' },
    { id: 'productTexture', label: 'テクスチャー (제품 텍스처)', labelKr: '제품 텍스처' },
    { id: 'outdoor', label: '屋外 (야외)', labelKr: '야외' },
    { id: 'couple', label: 'カップル (커플)', labelKr: '커플' },
    { id: 'child', label: '子供 (어린이)', labelKr: '어린이' },
    { id: 'troubledSkin', label: '肌トラブル (트러블 피부)', labelKr: '트러블 피부' },
    { id: 'wrinkles', label: 'しわ (주름)', labelKr: '주름' },
  ],
  platforms: ['tiktok', 'youtube_shorts', 'instagram_reels'],
}

// 미국 기획형 상세옵션 (CampaignGuideUS.jsx 기반)
const US_DETAIL_OPTIONS = {
  label: '미국 기획형 상세옵션',
  source: 'CampaignGuideUS.jsx:26-76',
  fields: {
    brandName: { label: 'Brand Name (브랜드명)', type: 'text', placeholder: 'e.g., ABC Beauty', required: true },
    productName: { label: 'Product Name (제품명)', type: 'text', placeholder: 'e.g., Hyaluronic Acid Moisture Cream', required: true },
    productDescription: { label: 'Product Description (제품 설명)', type: 'textarea', placeholder: 'Key ingredients, benefits, features...', rows: 4, required: true },
    productFeatures: { label: 'Product Key Features (제품 특장점, max 5)', type: 'array', maxItems: 5, placeholder: 'Enter feature' },
    requiredDialogues: { label: 'Required Dialogues (필수 대사)', type: 'array', maxItems: 5, placeholder: 'Enter dialogue' },
    requiredScenes: { label: 'Required Shooting Scenes (필수 촬영 장면)', type: 'textarea', placeholder: 'e.g., Clean face before application, Texture close-up...', rows: 3 },
    requiredHashtags: { label: 'Required Hashtags (필수 해시태그)', type: 'text', placeholder: 'e.g., #beauty #skincare #newproduct' },
    videoDuration: { label: 'Video Duration (영상 길이)', type: 'select', options: ['15s', '30s', '60s', '90s+'] },
    videoTempo: { label: 'Video Tempo (영상 템포)', type: 'select', options: ['Fast', 'Normal', 'Slow'] },
    videoTone: { label: 'Video Tone (영상 톤)', type: 'select', options: ['Bright & Fun', 'Serious & Informative', 'Soft & Gentle'] },
    additionalDetails: { label: 'Additional Requests (추가 요청사항)', type: 'textarea', placeholder: 'Any additional requests or notes...', rows: 3 },
  },
  shootingScenes: [
    { id: 'baPhoto', label: 'Before/After Photo', labelKr: 'BA 사진' },
    { id: 'noMakeup', label: 'No Makeup', labelKr: '노메이크업' },
    { id: 'closeup', label: 'Close-up Shot', labelKr: '클로즈업' },
    { id: 'productCloseup', label: 'Product Close-up', labelKr: '제품 클로즈업' },
    { id: 'productTexture', label: 'Product Texture', labelKr: '제품 텍스처' },
    { id: 'outdoor', label: 'Outdoor', labelKr: '야외' },
    { id: 'couple', label: 'Couple', labelKr: '커플' },
    { id: 'child', label: 'With Child', labelKr: '어린이' },
    { id: 'troubledSkin', label: 'Troubled Skin', labelKr: '트러블 피부' },
    { id: 'wrinkles', label: 'Wrinkles/Anti-aging', labelKr: '주름' },
  ],
  platforms: ['tiktok', 'youtube_shorts', 'instagram_reels'],
}

const DETAIL_OPTIONS_MAP = {
  kr: KOREA_DETAIL_OPTIONS,
  jp: JAPAN_DETAIL_OPTIONS,
  us: US_DETAIL_OPTIONS,
}


export default function CampaignGuideTemplatePrototype() {
  const navigate = useNavigate()

  // ─── 국가 탭 ───
  const [selectedCountry, setSelectedCountry] = useState('kr')

  // ─── Step 1: 브랜드/제품 정보 ───
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [productKeyPoint, setProductKeyPoint] = useState('')

  // ─── Step 2: 가이드 생성 방법 ───
  const [creationMethod, setCreationMethod] = useState('template') // 'template' | 'youtube'

  // 템플릿 선택
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState(null)

  // YouTube 영상 참조
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [similarityPercent, setSimilarityPercent] = useState(80)
  const [ytManualTranscript, setYtManualTranscript] = useState('')
  const [isAnalyzingYT, setIsAnalyzingYT] = useState(false)
  const [ytResult, setYtResult] = useState(null)

  // ─── 트렌딩 뷰티 숏폼 ───
  const [trendingShorts, setTrendingShorts] = useState([])
  const [isLoadingTrending, setIsLoadingTrending] = useState(false)
  const [trendingError, setTrendingError] = useState(null)
  const [previewingVideoId, setPreviewingVideoId] = useState(null)
  const [trendingCategory, setTrendingCategory] = useState('')

  // ─── Step 3: 상세옵션 ───
  const [selectedPlatforms, setSelectedPlatforms] = useState(['tiktok', 'instagram_reels'])
  const [selectedDuration, setSelectedDuration] = useState('30s')
  const [requiredDialogues, setRequiredDialogues] = useState(['', '', ''])
  const [additionalRequests, setAdditionalRequests] = useState('')
  const [storeVisit, setStoreVisit] = useState('none')
  const [customStore, setCustomStore] = useState('')

  // 일본/미국 전용 상세옵션
  const [detailFields, setDetailFields] = useState({})
  const [shootingSceneChecks, setShootingSceneChecks] = useState({})
  const [videoTempo, setVideoTempo] = useState('')
  const [videoTone, setVideoTone] = useState('')

  // ─── Step 4: 크리에이터 프로필 ───
  const [creatorChannelUrl, setCreatorChannelUrl] = useState('')
  const [creatorStyle, setCreatorStyle] = useState('')
  const [creatorContentArea, setCreatorContentArea] = useState('')
  const [creatorFollowerCount, setCreatorFollowerCount] = useState('')
  const [creatorStrengths, setCreatorStrengths] = useState('')

  // ─── 생성 관련 ───
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedGuide, setGeneratedGuide] = useState(null)
  const [showResultModal, setShowResultModal] = useState(false)

  // ─── 국가 변경 시 상세옵션 초기화 ───
  useEffect(() => {
    setSelectedTemplate(null)
    setSelectedCategory('')
    setTemplateSearch('')
    setDetailFields({})
    setShootingSceneChecks({})
    setVideoTempo('')
    setVideoTone('')
    setTrendingShorts([])
    setTrendingCategory('')
    setPreviewingVideoId(null)
  }, [selectedCountry])

  // ─── 트렌딩 뷰티 숏폼 가져오기 ───
  const fetchTrendingShorts = async (forceCategory) => {
    setIsLoadingTrending(true)
    setTrendingError(null)
    setPreviewingVideoId(null)

    try {
      const cat = forceCategory !== undefined ? forceCategory : trendingCategory
      const res = await fetch('/.netlify/functions/fetch-trending-beauty-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: selectedCountry,
          category: cat || '',
          limit: 12,
        })
      })

      const result = await res.json()
      if (result.success && result.data) {
        setTrendingShorts(result.data)
      } else {
        setTrendingError(result.error || '\uD2B8\uB80C\uB529 \uC601\uC0C1\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.')
      }
    } catch (err) {
      console.error('\uD2B8\uB80C\uB529 \uC601\uC0C1 \uB85C\uB529 \uC2E4\uD328:', err)
      setTrendingError(err.message)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  // 국가 변경 시 자동으로 트렌딩 영상 로드
  useEffect(() => {
    fetchTrendingShorts('')
  }, [selectedCountry])

  // 포맷 유틸
  const formatViewCount = (count) => {
    if (count >= 10000000) return (count / 10000000).toFixed(1) + '\uCC9C\uB9CC'
    if (count >= 10000) return (count / 10000).toFixed(1) + '\uB9CC'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  // ─── 국가별 템플릿 가져오기 ───
  const getTemplates = () => {
    let templates
    switch (selectedCountry) {
      case 'kr': templates = [...KOREA_TEMPLATES]; break
      case 'us': templates = [...US_TEMPLATES]; break
      case 'jp': templates = [...JAPAN_TEMPLATES]; break
      default: templates = [...KOREA_TEMPLATES]
    }

    if (selectedCategory) {
      templates = templates.filter(t => t.applicableCategories?.includes(selectedCategory))
    }

    if (templateSearch.trim()) {
      const q = templateSearch.toLowerCase()
      templates = templates.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.subtitle?.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.titleKr?.toLowerCase().includes(q)
      )
    }

    return templates
  }

  // ─── 국가 라벨 ───
  const countryConfig = {
    kr: { flag: '\uD83C\uDDF0\uD83C\uDDF7', label: '\uD55C\uAD6D', labelEn: 'Korea', color: 'red', gradient: 'from-red-500 to-rose-500' },
    jp: { flag: '\uD83C\uDDEF\uD83C\uDDF5', label: '\uC77C\uBCF8', labelEn: 'Japan', color: 'pink', gradient: 'from-pink-500 to-fuchsia-500' },
    us: { flag: '\uD83C\uDDFA\uD83C\uDDF8', label: '\uBBF8\uAD6D', labelEn: 'US', color: 'blue', gradient: 'from-blue-500 to-indigo-500' },
  }

  // ─── YouTube 분석 ───
  const analyzeYouTubeShorts = async () => {
    if (!youtubeUrl.trim()) {
      alert('YouTube URL\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.')
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
          requiredDialogues: requiredDialogues.filter(d => d.trim()),
          additionalNotes: additionalRequests.trim(),
          manualTranscript: ytManualTranscript.trim()
        })
      })

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        const text = await response.text()
        if (response.status === 502 || response.status === 504 || text.includes('<HTML') || text.includes('<!DOCTYPE')) {
          throw new Error('AI \uC601\uC0C1 \uBD84\uC11D\uC5D0 \uC2DC\uAC04\uC774 \uC624\uB798 \uAC78\uB824 \uD0C0\uC784\uC544\uC6C3\uC774 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.\n\n\uD574\uACB0 \uBC29\uBC95: \uC704\uC758 "\uC790\uB9C9 \uC9C1\uC811 \uC785\uB825" \uC601\uC5ED\uC5D0 YouTube \uC601\uC0C1\uC758 \uC790\uB9C9\uC744 \uBD99\uC5EC\uB123\uC73C\uBA74 \uBE60\uB974\uAC8C \uBD84\uC11D\uB429\uB2C8\uB2E4.')
        }
        throw new Error(`\uC11C\uBC84 \uC751\uB2F5 \uC624\uB958 (${response.status})`)
      }

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || '\uC601\uC0C1 \uBD84\uC11D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.')
      }
      setYtResult(result)
    } catch (error) {
      console.error('YouTube \uBD84\uC11D \uC624\uB958:', error)
      alert(`\uBD84\uC11D \uC2E4\uD328: ${error.message}`)
    } finally {
      setIsAnalyzingYT(false)
    }
  }

  // ─── AI 가이드 생성 (통합) ───
  const generateAIGuide = async () => {
    if (!productName.trim()) {
      alert('\uC81C\uD488\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.')
      return
    }

    if (creationMethod === 'template' && !selectedTemplate) {
      alert('\uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.')
      return
    }

    if (creationMethod === 'youtube' && !youtubeUrl.trim()) {
      alert('YouTube URL\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.')
      return
    }

    setIsGenerating(true)

    try {
      // 크리에이터 프로필 정보 구성
      const creatorProfile = {
        channelUrl: creatorChannelUrl,
        style: creatorStyle,
        contentArea: creatorContentArea,
        followerCount: creatorFollowerCount,
        strengths: creatorStrengths,
      }

      // 제품 정보
      const productInfo = {
        product_name: productName,
        brand: brandName,
        description: productKeyPoint,
        category: PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory,
      }

      if (creationMethod === 'template' && selectedTemplate) {
        // 템플릿 기반 AI 가이드 생성
        const response = await fetch('/.netlify/functions/generate-personalized-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatorAnalysis: {
              style: selectedTemplate.type,
              tone: selectedTemplate.toneGuide,
              culturalNotes: selectedTemplate.culturalNotes,
              country: selectedCountry,
              preferredPlatforms: selectedPlatforms,
              ...creatorProfile,
            },
            productInfo,
            templateGuide: {
              templateType: selectedTemplate.type,
              templateTitle: selectedTemplate.title,
              defaultScenes: selectedTemplate.defaultScenes,
              defaultDialogues: selectedTemplate.defaultDialogues,
              hashtags: selectedTemplate.hashtags,
              duration: selectedDuration,
              platforms: selectedPlatforms,
              storeVisit: storeVisit !== 'none' ? (storeVisit === 'other' ? customStore : STORE_VISIT_OPTIONS.find(s => s.id === storeVisit)?.label) : null,
            },
            country: selectedCountry,
            requiredDialogues: requiredDialogues.filter(d => d.trim()),
            additionalRequests: additionalRequests,
            creatorProfile,
            detailOptions: {
              videoTempo,
              videoTone,
              shootingScenes: shootingSceneChecks,
              ...detailFields,
            },
          }),
        })

        const result = await response.json()
        if (!response.ok || result.error) {
          throw new Error(result.error || 'AI \uAC00\uC774\uB4DC \uC0DD\uC131 \uC2E4\uD328')
        }

        setGeneratedGuide({
          type: 'template',
          data: result.personalizedGuide,
          template: selectedTemplate,
        })
        setShowResultModal(true)
      } else {
        // YouTube 분석이 아직 안 됐다면 먼저 분석
        if (!ytResult) {
          await analyzeYouTubeShorts()
        }
        // YouTube 결과가 있으면 바로 표시
        setGeneratedGuide({
          type: 'youtube',
          data: ytResult?.guideData,
        })
        setShowResultModal(true)
      }
    } catch (error) {
      console.error('AI \uAC00\uC774\uB4DC \uC0DD\uC131 \uC624\uB958:', error)
      alert(`AI \uAC00\uC774\uB4DC \uC0DD\uC131 \uC2E4\uD328: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── 복사 유틸 ───
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('\uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!')
    } catch (err) {
      console.error('\uBCF5\uC0AC \uC2E4\uD328:', err)
    }
  }

  // ─── 현재 국가의 상세옵션 설정 ───
  const currentDetailOptions = DETAIL_OPTIONS_MAP[selectedCountry]

  // ─── Render ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      {/* ─── 헤더 ─── */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                뒤로
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-violet-500" />
                  AI 숏폼 가이드 리빌딩
                  <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs ml-1">v2 Beta</Badge>
                </h1>
                <p className="text-sm text-gray-500">크리에이터 프로필 + 제품 정보 + 템플릿/영상 참조 = AI 맞춤 가이드</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ─── 국가 탭 ─── */}
        <Tabs value={selectedCountry} onValueChange={setSelectedCountry} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 bg-gray-100/80 p-1 rounded-xl">
            {Object.entries(countryConfig).map(([key, cfg]) => (
              <TabsTrigger
                key={key}
                value={key}
                className={`rounded-lg text-sm font-semibold transition-all data-[state=active]:shadow-md data-[state=active]:bg-white`}
              >
                <span className="mr-1.5">{cfg.flag}</span>
                {cfg.label}
                <span className="text-xs text-gray-400 ml-1">({cfg.labelEn})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 각 탭의 내용은 동일한 구조 (상태로 제어) */}
          {Object.keys(countryConfig).map(countryKey => (
            <TabsContent key={countryKey} value={countryKey} className="mt-6 space-y-6">
              {/* 국가 표시 배너 */}
              <div className={`p-4 rounded-xl bg-gradient-to-r ${countryConfig[countryKey].gradient} text-white`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{countryConfig[countryKey].flag}</span>
                  <div>
                    <h2 className="text-lg font-bold">{countryConfig[countryKey].label} AI 숏폼 가이드</h2>
                    <p className="text-sm opacity-90">
                      {countryKey === 'kr' && '한국 기획형 캠페인 가이드 생성 (CampaignGuide.jsx 기반)'}
                      {countryKey === 'jp' && '일본 기획형 캠페인 가이드 생성 (CampaignGuideJapan.jsx 기반)'}
                      {countryKey === 'us' && '미국 기획형 캠페인 가이드 생성 (CampaignGuideUS.jsx 기반)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ─── STEP 1: 브랜드/제품 정보 ─── */}
              <Card className="border-2 border-violet-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-600">1</div>
                    <FileText className="w-4 h-4 text-violet-500" />
                    브랜드 & 제품 정보
                  </CardTitle>
                  <CardDescription>
                    캠페인 생성 시 입력하는 제품 정보를 여기에 입력합니다
                    <span className="text-xs text-gray-400 ml-1">
                      ({countryKey === 'kr' ? 'CreateCampaignKorea.jsx:1593-1675' : countryKey === 'jp' ? 'CreateCampaignJapan.jsx' : 'CreateCampaignUS.jsx'})
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {countryKey === 'jp' ? 'ブランド名' : countryKey === 'us' ? 'Brand Name' : '브랜드명'} *
                      </Label>
                      <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder={countryKey === 'jp' ? '例: 資生堂' : countryKey === 'us' ? 'e.g., Estee Lauder' : '예: 아모레퍼시픽'}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        {countryKey === 'jp' ? '商品名' : countryKey === 'us' ? 'Product Name' : '제품명'} *
                      </Label>
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder={countryKey === 'jp' ? '例: アクアレーベル スペシャルジェルクリーム' : countryKey === 'us' ? 'e.g., Advanced Night Repair' : '예: 설화수 윤조에센스'}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {countryKey === 'jp' ? '商品の主なセールスポイント' : countryKey === 'us' ? 'Product Key Selling Points' : '제품 핵심 소구 포인트'} *
                    </Label>
                    <Textarea
                      value={productKeyPoint}
                      onChange={(e) => setProductKeyPoint(e.target.value)}
                      placeholder={
                        countryKey === 'jp'
                          ? '主な成分、効能、特徴を詳しく記入してください...\n例: ヒアルロン酸配合、48時間保湿、敏感肌にも安心...'
                          : countryKey === 'us'
                            ? 'Key ingredients, benefits, unique features...\ne.g., Contains hyaluronic acid, 48-hour moisture, gentle formula...'
                            : '주요 성분, 효능, 특징을 자세히 입력해주세요...\n예: 히알루론산 함유, 48시간 보습, 자극 없는 순한 성분...'
                      }
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  {/* 제품 카테고리 선택 */}
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">제품 카테고리</Label>
                    <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedTemplate(null) }}>
                      <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label} ({countryKey === 'jp' ? cat.labelJa : cat.labelEn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* ─── STEP 2: 가이드 생성 방법 ─── */}
              <Card className="border-2 border-orange-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">2</div>
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    가이드 생성 방법 선택
                  </CardTitle>
                  <CardDescription>추천 템플릿을 선택하거나, 참고할 숏폼 영상 URL을 입력하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 방법 선택 라디오 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreationMethod('template')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        creationMethod === 'template'
                          ? 'border-orange-400 bg-orange-50 shadow-md'
                          : 'border-gray-200 hover:border-orange-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          creationMethod === 'template' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">추천 템플릿 선택</p>
                          <p className="text-xs text-gray-500">국가별 인기 숏폼 스타일 중 선택</p>
                        </div>
                        {creationMethod === 'template' && (
                          <Check className="w-5 h-5 text-orange-500 ml-auto" />
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMethod('youtube')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        creationMethod === 'youtube'
                          ? 'border-red-400 bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-red-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          creationMethod === 'youtube' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Play className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">숏폼 영상 URL 유사도</p>
                          <p className="text-xs text-gray-500">YouTube 영상을 분석해서 유사 가이드 생성</p>
                        </div>
                        {creationMethod === 'youtube' && (
                          <Check className="w-5 h-5 text-red-500 ml-auto" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* ─── 방법 A: 추천 템플릿 선택 ─── */}
                  {creationMethod === 'template' && (
                    <div className="space-y-4 pt-2">
                      {/* 검색 */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="템플릿 검색... (예: GRWM, 리뷰, 언박싱)"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* 템플릿 그리드 */}
                      {!selectedCategory ? (
                        <div className="text-center py-8 text-gray-400">
                          <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm">먼저 위에서 제품 카테고리를 선택해주세요</p>
                        </div>
                      ) : getTemplates().length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p className="text-sm font-medium">검색 결과가 없습니다</p>
                          {templateSearch && (
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTemplateSearch('')}>
                              <X className="w-3 h-3 mr-1" /> 검색 초기화
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {getTemplates().map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => setSelectedTemplate(template)}
                              className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                                selectedTemplate?.id === template.id
                                  ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200'
                                  : 'border-gray-200 hover:border-orange-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{template.type}</Badge>
                                {selectedTemplate?.id === template.id && (
                                  <Check className="w-4 h-4 text-orange-500" />
                                )}
                              </div>
                              <h4 className="font-semibold text-sm text-gray-900 mb-0.5 line-clamp-1">{template.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{template.description}</p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {VIDEO_DURATIONS.find(d => d.id === template.duration)?.label}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Camera className="w-3 h-3" />
                                  {template.defaultScenes?.length || 0}개 장면
                                </span>
                              </div>
                              {/* 상세보기 링크 */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setPreviewTemplate(template) }}
                                className="mt-2 text-xs text-violet-500 hover:text-violet-700 flex items-center gap-0.5"
                              >
                                <Eye className="w-3 h-3" /> 상세보기
                              </button>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 선택된 템플릿 미리보기 */}
                      {selectedTemplate && (
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-orange-600" />
                            <span className="font-semibold text-sm text-orange-800">선택된 템플릿:</span>
                            <Badge className="bg-orange-500 text-white text-xs">{selectedTemplate.type}</Badge>
                            <span className="font-medium text-sm text-orange-900">{selectedTemplate.title}</span>
                          </div>
                          <p className="text-xs text-orange-600">{selectedTemplate.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── 방법 B: YouTube 영상 참조 ─── */}
                  {creationMethod === 'youtube' && (
                    <div className="space-y-4 pt-2">
                      {/* ─── 트렌딩 뷰티 숏폼 추천 ─── */}
                      <div className="p-4 bg-gradient-to-br from-rose-50 via-white to-orange-50 rounded-xl border-2 border-rose-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-rose-500" />
                            <h3 className="font-bold text-sm text-gray-900">
                              {countryConfig[countryKey].flag} {countryConfig[countryKey].label} 트렌딩 뷰티 숏폼
                            </h3>
                            <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-200">
                              30일 / 10만뷰+
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* 카테고리 필터 */}
                            <Select
                              value={trendingCategory}
                              onValueChange={(v) => {
                                const cat = v === '__all__' ? '' : v
                                setTrendingCategory(cat)
                                fetchTrendingShorts(cat)
                              }}
                            >
                              <SelectTrigger className="h-8 w-32 text-xs">
                                <SelectValue placeholder="전체 카테고리" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">전체</SelectItem>
                                {PRODUCT_CATEGORIES.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchTrendingShorts()}
                              disabled={isLoadingTrending}
                              className="h-8 text-xs px-2"
                            >
                              {isLoadingTrending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>

                        {/* 필터 안내 */}
                        <div className="flex items-center gap-3 mb-3 text-[10px] text-gray-500">
                          <span className="flex items-center gap-0.5"><ShieldCheck className="w-3 h-3 text-green-500" /> 광고 제외</span>
                          <span className="flex items-center gap-0.5"><ShieldCheck className="w-3 h-3 text-green-500" /> AI영상 제외</span>
                          <span className="flex items-center gap-0.5"><ShieldCheck className="w-3 h-3 text-green-500" /> 부스팅 제외</span>
                          <span className="flex items-center gap-0.5"><Users className="w-3 h-3 text-blue-500" /> 채널당 1개</span>
                        </div>

                        {/* 트렌딩 영상 그리드 */}
                        {isLoadingTrending ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                            <span className="ml-2 text-sm text-gray-500">트렌딩 영상 불러오는 중...</span>
                          </div>
                        ) : trendingError ? (
                          <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">{trendingError}</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchTrendingShorts()}>
                              <RefreshCw className="w-3 h-3 mr-1" /> 다시 시도
                            </Button>
                          </div>
                        ) : trendingShorts.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {trendingShorts.map((short, idx) => (
                              <div
                                key={short.video_id}
                                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                                  previewingVideoId === short.video_id
                                    ? 'border-rose-400 shadow-lg shadow-rose-100'
                                    : youtubeUrl.includes(short.video_id)
                                      ? 'border-green-400 shadow-md shadow-green-100'
                                      : 'border-transparent hover:border-rose-200'
                                }`}
                              >
                                {/* 비디오 썸네일 / 미리보기 */}
                                <div className="aspect-[9/16] relative bg-gray-100">
                                  {previewingVideoId === short.video_id ? (
                                    <iframe
                                      src={`https://www.youtube.com/embed/${short.video_id}?autoplay=1&mute=0&loop=1&playlist=${short.video_id}&playsinline=1&controls=1&rel=0&modestbranding=1`}
                                      className="absolute inset-0 w-full h-full"
                                      allow="autoplay; encrypted-media"
                                      allowFullScreen
                                    />
                                  ) : (
                                    <>
                                      <img
                                        src={short.thumbnail}
                                        alt={short.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                                      {/* 순위 */}
                                      <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                        idx < 3 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gray-700/80'
                                      }`}>
                                        {idx + 1}
                                      </div>

                                      {/* 오가닉 점수 뱃지 */}
                                      {short.organic_score >= 60 && (
                                        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-green-500/90 text-white text-[9px] font-bold flex items-center gap-0.5">
                                          <ShieldCheck className="w-2.5 h-2.5" /> HOT
                                        </div>
                                      )}

                                      {/* 재생 버튼 */}
                                      <button
                                        onClick={() => setPreviewingVideoId(short.video_id)}
                                        className="absolute inset-0 flex items-center justify-center group cursor-pointer"
                                      >
                                        <div className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/50 transition-colors">
                                          <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                                        </div>
                                      </button>

                                      {/* 하단 정보 */}
                                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                                        <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight mb-1">{short.title}</p>
                                        <div className="flex items-center gap-1.5 text-[9px]">
                                          <span className="text-white/90 font-bold flex items-center gap-0.5">
                                            <Eye className="w-2.5 h-2.5" />
                                            {formatViewCount(short.view_count)}
                                          </span>
                                          <span className="text-white/70 flex items-center gap-0.5">
                                            <ThumbsUp className="w-2.5 h-2.5" />
                                            {formatViewCount(short.like_count)}
                                          </span>
                                          {short.engagement_rate && (
                                            <span className="text-green-300 font-bold">
                                              {short.engagement_rate}%
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-white/60 text-[9px] truncate mt-0.5">{short.channel_title}</p>
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* URL 가져오기 버튼 */}
                                <button
                                  onClick={() => {
                                    setYoutubeUrl(short.url)
                                    setPreviewingVideoId(null)
                                  }}
                                  className={`w-full py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                                    youtubeUrl.includes(short.video_id)
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white'
                                  }`}
                                >
                                  {youtubeUrl.includes(short.video_id) ? (
                                    <><Check className="w-3 h-3" /> 선택됨</>
                                  ) : (
                                    <><Link2 className="w-3 h-3" /> URL 가져오기</>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">트렌딩 영상을 불러올 수 없습니다</p>
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => fetchTrendingShorts()}>
                              <RefreshCw className="w-3 h-3 mr-1" /> 새로고침
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* URL 입력 */}
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">YouTube Shorts URL *</Label>
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
                        {youtubeUrl && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            URL 입력됨 - 아래 유사도를 설정하고 분석하세요
                          </p>
                        )}
                      </div>

                      {/* 유사도 슬라이더 */}
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">
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
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>10% 영감만</span>
                          <span>50% 참고</span>
                          <span>80% 유사</span>
                          <span>100% 동일</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {similarityPercent >= 90 ? '원본과 거의 동일한 구조/스타일로 가이드를 생성합니다.'
                            : similarityPercent >= 70 ? '핵심 구조와 흐름을 유지하되 제품에 맞게 조정합니다.'
                            : similarityPercent >= 50 ? '컨셉과 톤만 참고하고 내용은 자유롭게 구성합니다.'
                            : '분위기만 참고하고 대부분 새롭게 기획합니다.'}
                        </p>
                      </div>

                      {/* 자막 직접 입력 */}
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <Label className="text-sm font-medium mb-1.5 block text-amber-800">
                          자막 직접 입력 (자동 추출 실패 시 사용)
                        </Label>
                        <p className="text-xs text-amber-600 mb-2">
                          YouTube 영상 &rarr; 더보기(&hellip;) &rarr; "스크립트 표시" &rarr; 텍스트 복사 후 붙여넣기
                        </p>
                        <Textarea
                          placeholder="[0:00] 안녕하세요 여러분..."
                          value={ytManualTranscript}
                          onChange={(e) => setYtManualTranscript(e.target.value)}
                          rows={4}
                          className="bg-white"
                        />
                        {ytManualTranscript.trim() && (
                          <p className="text-xs text-green-600 mt-1">
                            자막 입력됨 ({ytManualTranscript.trim().split('\n').filter(l => l.trim()).length}줄)
                          </p>
                        )}
                      </div>

                      {/* 분석 버튼 */}
                      <Button
                        onClick={analyzeYouTubeShorts}
                        disabled={!youtubeUrl.trim() || isAnalyzingYT}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                      >
                        {isAnalyzingYT ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            AI 영상 분석 중... (15~30초)
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            영상 분석하기
                          </>
                        )}
                      </Button>

                      {/* 분석 결과 미리보기 */}
                      {ytResult && ytResult.guideData && (
                        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-sm text-green-800">영상 분석 완료</span>
                          </div>
                          {ytResult.guideData.video_analysis && (
                            <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                              <span>스타일: {ytResult.guideData.video_analysis.style}</span>
                              <span>톤: {ytResult.guideData.video_analysis.tone}</span>
                              <span>구조: {ytResult.guideData.video_analysis.structure}</span>
                              <span>길이: {ytResult.guideData.video_analysis.estimated_duration}</span>
                            </div>
                          )}
                          {ytResult.guideData.guide && (
                            <p className="text-xs text-green-600 mt-2">
                              생성된 가이드: {ytResult.guideData.guide.title} ({ytResult.guideData.guide.scenes?.length || 0}개 장면)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ─── STEP 3: 상세옵션 설정 ─── */}
              <Card className="border-2 border-emerald-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-600">3</div>
                    <Settings2 className="w-4 h-4 text-emerald-500" />
                    상세옵션 설정
                    <Badge variant="outline" className="text-xs ml-1">
                      {countryConfig[countryKey].flag} {currentDetailOptions.label}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    캠페인 가이드 작성 시 사용되는 상세 옵션입니다
                    <span className="text-xs text-gray-400 ml-1">({currentDetailOptions.source})</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* 플랫폼 선택 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">플랫폼 선택</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                            selectedPlatforms.includes(p.id)
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-emerald-200'
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
                    <Label className="text-sm font-medium mb-2 block">
                      {countryKey === 'jp' ? '動画の長さ (영상 길이)' : countryKey === 'us' ? 'Video Duration (영상 길이)' : '영상 길이'}
                    </Label>
                    <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_DURATIONS.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.label} - {d.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 일본/미국 전용: 영상 템포 & 톤 */}
                  {(countryKey === 'jp' || countryKey === 'us') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          {countryKey === 'jp' ? 'テンポ (영상 템포)' : 'Video Tempo'}
                        </Label>
                        <Select value={videoTempo} onValueChange={setVideoTempo}>
                          <SelectTrigger>
                            <SelectValue placeholder={countryKey === 'jp' ? 'テンポを選択' : 'Select tempo'} />
                          </SelectTrigger>
                          <SelectContent>
                            {DETAIL_OPTIONS_MAP[countryKey].fields.videoTempo.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          {countryKey === 'jp' ? 'トーン (영상 톤)' : 'Video Tone'}
                        </Label>
                        <Select value={videoTone} onValueChange={setVideoTone}>
                          <SelectTrigger>
                            <SelectValue placeholder={countryKey === 'jp' ? 'トーンを選択' : 'Select tone'} />
                          </SelectTrigger>
                          <SelectContent>
                            {DETAIL_OPTIONS_MAP[countryKey].fields.videoTone.options.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* 필수 대사 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {countryKey === 'jp' ? '必須セリフ (필수 대사)' : countryKey === 'us' ? 'Required Dialogues (필수 대사)' : '필수 포함 대사'} (최대 3개)
                    </Label>
                    <div className="space-y-2">
                      {requiredDialogues.map((dialogue, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm font-bold text-emerald-500 w-5 shrink-0">{idx + 1}.</span>
                          <Input
                            placeholder={
                              countryKey === 'jp' ? `必須セリフ ${idx + 1}` : countryKey === 'us' ? `Required dialogue ${idx + 1}` : `필수 대사 ${idx + 1} (예: "이거 진짜 좋아요")`
                            }
                            value={dialogue}
                            onChange={(e) => {
                              const newArr = [...requiredDialogues]
                              newArr[idx] = e.target.value
                              setRequiredDialogues(newArr)
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 일본/미국 전용: 필수 촬영 장면 체크박스 */}
                  {(countryKey === 'jp' || countryKey === 'us') && DETAIL_OPTIONS_MAP[countryKey].shootingScenes && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        {countryKey === 'jp' ? '撮影シーン (촬영 장면 체크)' : 'Required Shooting Scenes'}
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {DETAIL_OPTIONS_MAP[countryKey].shootingScenes.map(scene => (
                          <label
                            key={scene.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                              shootingSceneChecks[scene.id]
                                ? 'bg-emerald-50 border-emerald-300'
                                : 'bg-white border-gray-200 hover:border-emerald-200'
                            }`}
                          >
                            <Checkbox
                              checked={!!shootingSceneChecks[scene.id]}
                              onCheckedChange={(checked) => {
                                setShootingSceneChecks(prev => ({ ...prev, [scene.id]: checked }))
                              }}
                            />
                            <span className="leading-tight">{scene.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 한국 전용: 매장 방문 */}
                  {countryKey === 'kr' && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">매장 방문</Label>
                      <Select value={storeVisit} onValueChange={setStoreVisit}>
                        <SelectTrigger className="w-full md:w-48">
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
                          className="mt-2 w-full md:w-48"
                          placeholder="매장명 입력"
                          value={customStore}
                          onChange={(e) => setCustomStore(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  {/* 추가 요청사항 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {countryKey === 'jp' ? '追加リクエスト (추가 요청사항)' : countryKey === 'us' ? 'Additional Requests (추가 요청사항)' : '추가 요청사항'}
                    </Label>
                    <Textarea
                      placeholder={
                        countryKey === 'jp'
                          ? '追加のリクエストがあれば記入してください...'
                          : countryKey === 'us'
                            ? 'Any additional requests or notes...'
                            : '예: 밝은 톤으로 촬영, 제품 클로즈업 꼭 포함...'
                      }
                      value={additionalRequests}
                      onChange={(e) => setAdditionalRequests(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ─── STEP 4: 크리에이터 프로필 ─── */}
              <Card className="border-2 border-blue-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">4</div>
                    <User className="w-4 h-4 text-blue-500" />
                    크리에이터 프로필
                    <Badge variant="outline" className="text-xs ml-1 text-blue-500 border-blue-200">AI 맞춤화에 활용</Badge>
                  </CardTitle>
                  <CardDescription>
                    크리에이터의 채널 정보와 특징을 입력하면 AI가 크리에이터 맞춤형 가이드를 생성합니다
                    <span className="text-xs text-gray-400 ml-1">(creators 테이블, CreatorMyPage.jsx 참조)</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        <Link2 className="w-3 h-3 inline mr-1" />
                        채널 URL / 핸들
                      </Label>
                      <Input
                        value={creatorChannelUrl}
                        onChange={(e) => setCreatorChannelUrl(e.target.value)}
                        placeholder="예: @beauty_creator 또는 https://youtube.com/..."
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        <Star className="w-3 h-3 inline mr-1" />
                        팔로워/구독자 수
                      </Label>
                      <Input
                        value={creatorFollowerCount}
                        onChange={(e) => setCreatorFollowerCount(e.target.value)}
                        placeholder="예: 50,000 또는 5만"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">크리에이터 콘텐츠 스타일</Label>
                    <Textarea
                      value={creatorStyle}
                      onChange={(e) => setCreatorStyle(e.target.value)}
                      placeholder="예: 밝고 에너지 넘치는 스타일, ASMR 위주, 차분한 설명형, 유머러스한 리뷰..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">주력 콘텐츠 분야</Label>
                    <Textarea
                      value={creatorContentArea}
                      onChange={(e) => setCreatorContentArea(e.target.value)}
                      placeholder="예: 스킨케어 리뷰, 데일리 메이크업, 드럭스토어 뷰티템, K-Beauty..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">크리에이터 강점/특징</Label>
                    <Textarea
                      value={creatorStrengths}
                      onChange={(e) => setCreatorStrengths(e.target.value)}
                      placeholder="예: 솔직한 리뷰로 신뢰도 높음, 피부 트러블 경험 공유, 전문적인 성분 분석..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* 프로필 요약 */}
                  {(creatorChannelUrl || creatorStyle || creatorContentArea) && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                        <Info className="w-3 h-3" /> AI가 이 정보를 활용하여 가이드를 맞춤화합니다
                      </p>
                      <div className="text-xs text-blue-600 space-y-0.5">
                        {creatorChannelUrl && <p>채널: {creatorChannelUrl}</p>}
                        {creatorStyle && <p>스타일: {creatorStyle}</p>}
                        {creatorContentArea && <p>분야: {creatorContentArea}</p>}
                        {creatorStrengths && <p>강점: {creatorStrengths}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ─── AI 가이드 생성 버튼 ─── */}
              <div className="pt-2 pb-8">
                <Button
                  onClick={generateAIGuide}
                  disabled={isGenerating || !productName.trim()}
                  className={`w-full h-14 text-base font-bold bg-gradient-to-r ${countryConfig[countryKey].gradient} hover:opacity-90 text-white shadow-lg rounded-xl transition-all`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      AI 가이드 생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      {countryConfig[countryKey].flag} {countryConfig[countryKey].label} AI 숏폼 가이드 생성
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-gray-400 mt-2">
                  크리에이터 프로필 + 제품 정보 + {creationMethod === 'template' ? '템플릿' : 'YouTube 영상'} 기반으로 AI가 맞춤 가이드를 생성합니다
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ─── 템플릿 상세보기 모달 ─── */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-500" />
              템플릿 상세보기
              {previewTemplate && <Badge variant="outline" className="ml-2">{previewTemplate.type}</Badge>}
            </DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-5">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                  <p className="text-xs text-violet-600 font-medium">템플릿명</p>
                  <p className="font-semibold text-violet-900 text-sm">{previewTemplate.title}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">영상 길이</p>
                  <p className="font-semibold text-blue-900 text-sm">
                    {VIDEO_DURATIONS.find(d => d.id === previewTemplate.duration)?.label}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">예상 촬영시간</p>
                  <p className="font-semibold text-green-900 text-sm">{previewTemplate.estimatedTime}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">플랫폼</p>
                  <div className="flex gap-1 mt-0.5">
                    {previewTemplate.platforms.map(p => (
                      <Badge key={p} variant="secondary" className="text-[10px]">
                        {PLATFORMS.find(pl => pl.id === p)?.icon}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 촬영 장면 */}
              <div>
                <h4 className="font-medium mb-2 text-sm flex items-center gap-1">
                  <Camera className="w-4 h-4 text-blue-500" />
                  기본 촬영 장면 ({previewTemplate.defaultScenes?.length || 0}개)
                </h4>
                <div className="space-y-1.5">
                  {previewTemplate.defaultScenes?.map((scene, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                      <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-blue-800">{scene}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 대사 */}
              <div>
                <h4 className="font-medium mb-2 text-sm">기본 대사 ({previewTemplate.defaultDialogues?.length || 0}개)</h4>
                <div className="space-y-1.5">
                  {previewTemplate.defaultDialogues?.map((dialogue, i) => (
                    <div key={i} className="p-2 bg-purple-50 rounded-lg border-l-3 border-purple-400">
                      <p className="text-sm text-purple-800 italic">"{dialogue}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 해시태그 */}
              <div>
                <h4 className="font-medium mb-2 text-sm flex items-center gap-1">
                  <Hash className="w-4 h-4 text-pink-500" /> 추천 해시태그
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {previewTemplate.hashtags?.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* 톤 & 문화적 특성 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium mb-1 text-amber-800 text-sm">톤 & 매너</h4>
                  <p className="text-xs text-amber-700">{previewTemplate.toneGuide}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-1 text-green-800 text-sm">문화적 특성</h4>
                  <p className="text-xs text-green-700">{previewTemplate.culturalNotes}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>닫기</Button>
            <Button
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              onClick={() => { setSelectedTemplate(previewTemplate); setPreviewTemplate(null) }}
            >
              <Check className="w-4 h-4 mr-1" /> 이 템플릿 선택
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── AI 생성 결과 모달 ─── */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-violet-500" />
              AI 생성 숏폼 가이드
              <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs ml-2">AI Generated</Badge>
            </DialogTitle>
            <DialogDescription>
              {generatedGuide?.type === 'template'
                ? 'AI가 템플릿과 제품 정보, 크리에이터 프로필을 바탕으로 생성한 맞춤 가이드입니다'
                : 'YouTube 영상 분석 기반으로 생성된 가이드입니다'}
            </DialogDescription>
          </DialogHeader>

          {generatedGuide && (
            <div className="space-y-5">
              {/* 템플릿 기반 결과 */}
              {generatedGuide.type === 'template' && generatedGuide.data && (
                <>
                  {/* 기본 정보 카드 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                      <p className="text-xs text-violet-600 font-medium">캠페인 타이틀</p>
                      <p className="font-semibold text-violet-900 text-sm">{generatedGuide.data.campaign_title || '-'}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">타겟 플랫폼</p>
                      <p className="font-semibold text-blue-900 text-sm">{generatedGuide.data.target_platform || '-'}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium">영상 길이</p>
                      <p className="font-semibold text-green-900 text-sm">{generatedGuide.data.video_duration || '-'}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs text-orange-600 font-medium">촬영 컨셉</p>
                      <p className="font-semibold text-orange-900 text-sm truncate">{generatedGuide.data.shooting_concept || '-'}</p>
                    </div>
                  </div>

                  {/* 촬영 장면 */}
                  {generatedGuide.data.shooting_scenes && generatedGuide.data.shooting_scenes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Camera className="w-4 h-4 text-blue-500" />
                        촬영 장면 ({generatedGuide.data.shooting_scenes.length}개)
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {generatedGuide.data.shooting_scenes.map((scene, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border shadow-sm">
                            <div className="flex items-start gap-2">
                              <span className="w-7 h-7 bg-gradient-to-r from-blue-500 to-violet-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                {scene.order || i + 1}
                              </span>
                              <div className="flex-1">
                                <Badge variant="outline" className="text-[10px] mb-1">{scene.scene_type}</Badge>
                                <p className="text-sm font-medium text-gray-900 mb-1">{scene.scene_description}</p>
                                {scene.dialogue && (
                                  <p className="text-xs text-purple-700 bg-purple-50 p-1.5 rounded italic mb-1">"{scene.dialogue}"</p>
                                )}
                                {scene.shooting_tip && (
                                  <p className="text-xs text-green-700 bg-green-50 p-1.5 rounded">{scene.shooting_tip}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 해시태그 */}
                  {generatedGuide.data.required_hashtags && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Hash className="w-4 h-4 text-pink-500" /> 해시태그
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedGuide.data.required_hashtags.brand?.map((tag, i) => (
                          <Badge key={`b-${i}`} className="bg-blue-100 text-blue-700 text-xs">{tag}</Badge>
                        ))}
                        {generatedGuide.data.required_hashtags.real?.map((tag, i) => (
                          <Badge key={`r-${i}`} className="bg-green-100 text-green-700 text-xs">{tag}</Badge>
                        ))}
                        {generatedGuide.data.required_hashtags.trend?.map((tag, i) => (
                          <Badge key={`t-${i}`} className="bg-pink-100 text-pink-700 text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 크리에이터 팁 */}
                  {generatedGuide.data.creator_tips && generatedGuide.data.creator_tips.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-sm mb-2 text-yellow-800">크리에이터 팁</h4>
                      <ul className="space-y-1">
                        {generatedGuide.data.creator_tips.map((tip, i) => (
                          <li key={i} className="text-xs text-yellow-700 flex items-start gap-1.5">
                            <Zap className="w-3 h-3 mt-0.5 shrink-0" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* YouTube 분석 기반 결과 */}
              {generatedGuide?.type === 'youtube' && generatedGuide.data?.guide && (
                <>
                  <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                    <h3 className="font-bold text-violet-900">{generatedGuide.data.guide.title}</h3>
                    <p className="text-sm text-violet-700 mt-1">{generatedGuide.data.guide.concept}</p>
                  </div>

                  {/* 촬영 장면 */}
                  {generatedGuide.data.guide.scenes && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Camera className="w-4 h-4 text-blue-500" />
                        촬영 장면 ({generatedGuide.data.guide.scenes.length}개)
                      </h4>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {generatedGuide.data.guide.scenes.map((scene, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-blue-600 text-white text-[10px]">{scene.order || idx + 1}</Badge>
                              <span className="font-semibold text-sm text-blue-800">{scene.name}</span>
                              <span className="text-xs text-blue-400 ml-auto">{scene.duration}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-1">{scene.description}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              {scene.camera && <span>camera: {scene.camera}</span>}
                              {scene.dialogue && <span>dialogue: "{scene.dialogue}"</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 필수 대사 */}
                  {generatedGuide.data.guide.required_dialogues?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">필수 대사</h4>
                      <div className="space-y-1">
                        {generatedGuide.data.guide.required_dialogues.map((d, i) => (
                          <div key={i} className="p-2 bg-orange-50 rounded border border-orange-200 text-sm">
                            <span className="font-bold text-orange-600 mr-1">{i + 1}.</span>
                            <span className="text-orange-800">"{d}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 해시태그 */}
                  {generatedGuide.data.guide.hashtags?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <Hash className="w-4 h-4 text-pink-500" /> 추천 해시태그
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedGuide.data.guide.hashtags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">#{tag.replace(/^#/, '')}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 촬영 팁 */}
                  {generatedGuide.data.guide.filming_tips?.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-sm mb-2 text-green-800">촬영 팁</h4>
                      <ul className="space-y-1">
                        {generatedGuide.data.guide.filming_tips.map((tip, i) => (
                          <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowResultModal(false)}>닫기</Button>
            <Button variant="outline" onClick={() => {
              if (generatedGuide?.data) {
                copyToClipboard(JSON.stringify(generatedGuide.data, null, 2))
              }
            }}>
              <Copy className="w-4 h-4 mr-1" /> JSON 복사
            </Button>
            <Button variant="outline" onClick={() => {
              if (!generatedGuide?.data) return
              const dataStr = JSON.stringify(generatedGuide.data, null, 2)
              const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
              const link = document.createElement('a')
              link.setAttribute('href', dataUri)
              link.setAttribute('download', `ai-guide-${productName || 'guide'}-${Date.now()}.json`)
              link.click()
            }}>
              <Download className="w-4 h-4 mr-1" /> 다운로드
            </Button>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white">
              <Save className="w-4 h-4 mr-1" /> 캠페인에 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
