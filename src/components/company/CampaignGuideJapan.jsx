import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { X, Plus, Package, FileText, Video, Hash, Clock, Zap, Palette, Camera, Link, AlertCircle, CheckCircle2, Info, Calendar, Sparkles, Globe, Upload, Wand2, Send, Loader2 } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideJapan = () => {
  const supabase = getSupabaseClient('japan')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

  // 캠페인 타입 및 가이드 타입
  const [campaignType, setCampaignType] = useState('regular') // 'regular', 'megawari', '4week_challenge'
  const [guideType, setGuideType] = useState('manual') // 'manual', 'ai', 'pdf'
  const [currentStep, setCurrentStep] = useState(1) // 현재 선택된 스텝/주차

  // 스텝별 가이드 데이터
  const [stepGuides, setStepGuides] = useState({})

  // AI 가이드 생성 상태
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGuide, setAiGuide] = useState(null)

  // PDF 업로드 상태
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfUploading, setPdfUploading] = useState(false)

  // 가이드 발송 상태
  const [delivering, setDelivering] = useState(false)

  // 가이드 상세 필드
  const [requiredDialogues, setRequiredDialogues] = useState([''])
  const [requiredScenes, setRequiredScenes] = useState([''])
  const [requiredHashtags, setRequiredHashtags] = useState([''])
  const [videoDuration, setVideoDuration] = useState('')
  const [videoTempo, setVideoTempo] = useState('')
  const [videoTone, setVideoTone] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')

  // 제품 정보
  const [brandName, setBrandName] = useState('')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productFeatures, setProductFeatures] = useState([''])

  // 필수 촬영 장면 체크박스
  const [shootingScenes, setShootingScenes] = useState({
    baPhoto: false,
    noMakeup: false,
    closeup: false,
    productCloseup: false,
    productTexture: false,
    outdoor: false,
    couple: false,
    child: false,
    troubledSkin: false,
    wrinkles: false
  })

  // 추가 요청사항
  const [additionalShootingRequests, setAdditionalShootingRequests] = useState('')

  // 메타광고코드 발급 요청
  const [metaAdCodeRequested, setMetaAdCodeRequested] = useState(false)

  // 일본어 번역 미리보기
  const [translatedBrandName, setTranslatedBrandName] = useState('')
  const [translatedProductName, setTranslatedProductName] = useState('')
  const [translatedProductDesc, setTranslatedProductDesc] = useState('')
  const [translatedProductFeatures, setTranslatedProductFeatures] = useState([])
  const [translatedDialogues, setTranslatedDialogues] = useState([])
  const [translatedScenes, setTranslatedScenes] = useState([])
  const [translatedHashtags, setTranslatedHashtags] = useState([])
  const [translatedDuration, setTranslatedDuration] = useState('')
  const [translatedTempo, setTranslatedTempo] = useState('')
  const [translatedTone, setTranslatedTone] = useState('')
  const [translatedAdditionalDetails, setTranslatedAdditionalDetails] = useState('')
  const [translatedShootingRequests, setTranslatedShootingRequests] = useState('')
  const [translatedShootingScenes, setTranslatedShootingScenes] = useState([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // 캠페인 정보 및 가이드 로드
  useEffect(() => {
    if (campaignId) {
      loadCampaignGuide()
    }
  }, [campaignId])

  // 데이터 로드 완료 여부
  const [dataLoaded, setDataLoaded] = useState(false)

  // 자동 저장 (10초마다, 데이터 로드 후에만)
  useEffect(() => {
    if (!campaignId || !dataLoaded) return

    const timer = setTimeout(() => {
      autoSaveGuide()
    }, 10000)

    return () => clearTimeout(timer)
  }, [brandName, productName, productDescription, productFeatures, requiredDialogues, requiredScenes, requiredHashtags, videoDuration, videoTempo, videoTone, additionalDetails, shootingScenes, additionalShootingRequests, metaAdCodeRequested, campaignId, dataLoaded])

  const loadCampaignGuide = async () => {
    try {
      // 모든 가이드 관련 컬럼 조회 (마이그레이션 적용 후 모든 필드 지원)
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          title,
          campaign_type,
          brand_name,
          product_name,
          product_description,
          product_features,
          description,
          additional_details,
          additional_shooting_requests,
          required_dialogues,
          required_scenes,
          required_hashtags,
          video_duration,
          video_tempo,
          video_tone,
          shooting_scenes_ba_photo,
          shooting_scenes_no_makeup,
          shooting_scenes_closeup,
          shooting_scenes_product_closeup,
          shooting_scenes_product_texture,
          shooting_scenes_outdoor,
          shooting_scenes_couple,
          shooting_scenes_child,
          shooting_scenes_troubled_skin,
          shooting_scenes_wrinkles,
          meta_ad_code_requested,
          brand_name_ja,
          product_name_ja,
          product_description_ja,
          product_features_ja,
          required_dialogues_ja,
          required_scenes_ja,
          required_hashtags_ja,
          video_duration_ja,
          video_tempo_ja,
          video_tone_ja,
          additional_details_ja,
          additional_shooting_requests_ja,
          shooting_scenes_ja,
          guide_type,
          guide_pdf_url,
          ai_guide,
          step_guides,
          week1_deadline,
          week2_deadline,
          week3_deadline,
          week4_deadline,
          step1_deadline,
          step2_deadline,
          video_deadline
        `)
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title)

        // 캠페인 타입 및 가이드 타입
        if (data.campaign_type) setCampaignType(data.campaign_type)
        if (data.guide_type) setGuideType(data.guide_type)
        if (data.guide_pdf_url) setPdfUrl(data.guide_pdf_url)
        if (data.ai_guide) setAiGuide(data.ai_guide)
        if (data.step_guides) setStepGuides(data.step_guides)

        // 제품 정보
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.product_name) setProductName(data.product_name)
        if (data.product_description) setProductDescription(data.product_description)
        if (data.product_features && data.product_features.length > 0) setProductFeatures(data.product_features)

        // 가이드 필드
        setRequiredDialogues(data.required_dialogues || [''])
        setRequiredScenes(data.required_scenes || [''])
        setRequiredHashtags(data.required_hashtags || [''])
        setVideoDuration(data.video_duration || '')
        setVideoTempo(data.video_tempo || '')
        setVideoTone(data.video_tone || '')

        // [object Object] 문자열 방어
        const safeAdditionalDetails = (typeof data.additional_details === 'string' && data.additional_details !== '[object Object]') ? data.additional_details : ''
        setAdditionalDetails(safeAdditionalDetails)

        // 촬영 장면 체크박스
        setShootingScenes({
          baPhoto: data.shooting_scenes_ba_photo || false,
          noMakeup: data.shooting_scenes_no_makeup || false,
          closeup: data.shooting_scenes_closeup || false,
          productCloseup: data.shooting_scenes_product_closeup || false,
          productTexture: data.shooting_scenes_product_texture || false,
          outdoor: data.shooting_scenes_outdoor || false,
          couple: data.shooting_scenes_couple || false,
          child: data.shooting_scenes_child || false,
          troubledSkin: data.shooting_scenes_troubled_skin || false,
          wrinkles: data.shooting_scenes_wrinkles || false
        })

        // [object Object] 문자열 방어
        const safeShootingRequests = (typeof data.additional_shooting_requests === 'string' && data.additional_shooting_requests !== '[object Object]') ? data.additional_shooting_requests : ''
        setAdditionalShootingRequests(safeShootingRequests)
        setMetaAdCodeRequested(data.meta_ad_code_requested || false)

        // 일본어 번역 데이터 로드
        if (data.brand_name_ja) setTranslatedBrandName(data.brand_name_ja)
        if (data.product_name_ja) setTranslatedProductName(data.product_name_ja)
        if (data.product_description_ja) setTranslatedProductDesc(data.product_description_ja)
        if (data.product_features_ja && data.product_features_ja.length > 0) setTranslatedProductFeatures(data.product_features_ja)
        setTranslatedDialogues(data.required_dialogues_ja || [])
        setTranslatedScenes(data.required_scenes_ja || [])
        setTranslatedHashtags(data.required_hashtags_ja || [])
        setTranslatedDuration(data.video_duration_ja || '')
        setTranslatedTempo(data.video_tempo_ja || '')
        setTranslatedTone(data.video_tone_ja || '')
        setTranslatedAdditionalDetails(data.additional_details_ja || '')
        const safeTranslatedShootingRequests = (typeof data.additional_shooting_requests_ja === 'string' && data.additional_shooting_requests_ja !== '[object Object]') ? data.additional_shooting_requests_ja : ''
        setTranslatedShootingRequests(safeTranslatedShootingRequests)
        setTranslatedShootingScenes(data.shooting_scenes_ja || [])

        // 데이터 로드 완료
        setDataLoaded(true)
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    }
  }

  const autoSaveGuide = async () => {
    setAutoSaving(true)
    try {
      // 모든 가이드 필드 업데이트 (마이그레이션 적용 후 모든 필드 지원)
      const updateData = {
        // 제품 정보
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription,
        product_features: productFeatures.filter(f => f.trim()),
        // 가이드 필드
        required_dialogues: requiredDialogues.filter(d => d.trim()),
        required_scenes: requiredScenes.filter(s => s.trim()),
        required_hashtags: requiredHashtags.filter(h => h.trim()),
        video_duration: videoDuration,
        video_tempo: videoTempo,
        video_tone: videoTone,
        additional_details: additionalDetails,
        additional_shooting_requests: additionalShootingRequests,
        // 촬영 장면 체크박스
        shooting_scenes_ba_photo: shootingScenes.baPhoto,
        shooting_scenes_no_makeup: shootingScenes.noMakeup,
        shooting_scenes_closeup: shootingScenes.closeup,
        shooting_scenes_product_closeup: shootingScenes.productCloseup,
        shooting_scenes_product_texture: shootingScenes.productTexture,
        shooting_scenes_outdoor: shootingScenes.outdoor,
        shooting_scenes_couple: shootingScenes.couple,
        shooting_scenes_child: shootingScenes.child,
        shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
        shooting_scenes_wrinkles: shootingScenes.wrinkles,
        meta_ad_code_requested: metaAdCodeRequested
      }

      // 일본어 번역이 있으면 추가
      if (translatedBrandName) updateData.brand_name_ja = translatedBrandName
      if (translatedProductName) updateData.product_name_ja = translatedProductName
      if (translatedProductDesc) updateData.product_description_ja = translatedProductDesc
      if (translatedProductFeatures.length > 0) updateData.product_features_ja = translatedProductFeatures.filter(f => f.trim())
      if (translatedDialogues.length > 0) updateData.required_dialogues_ja = translatedDialogues.filter(d => d.trim())
      if (translatedScenes.length > 0) updateData.required_scenes_ja = translatedScenes.filter(s => s.trim())
      if (translatedHashtags.length > 0) updateData.required_hashtags_ja = translatedHashtags.filter(h => h.trim())
      if (translatedDuration) updateData.video_duration_ja = translatedDuration
      if (translatedTempo) updateData.video_tempo_ja = translatedTempo
      if (translatedTone) updateData.video_tone_ja = translatedTone
      if (translatedAdditionalDetails) updateData.additional_details_ja = translatedAdditionalDetails
      if (translatedShootingRequests) updateData.additional_shooting_requests_ja = translatedShootingRequests
      if (translatedShootingScenes.length > 0) updateData.shooting_scenes_ja = translatedShootingScenes.filter(s => s.trim())

      // 가이드 타입 및 관련 데이터 저장
      updateData.guide_type = guideType
      if (guideType === 'pdf' && pdfUrl) updateData.guide_pdf_url = pdfUrl
      if (guideType === 'ai' && aiGuide) updateData.ai_guide = aiGuide
      if (Object.keys(stepGuides).length > 0) updateData.step_guides = stepGuides

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)

      if (error) throw error
    } catch (err) {
      console.error('자동 저장 실패:', err)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      // 모든 가이드 필드 업데이트 (마이그레이션 적용 후 모든 필드 지원)
      const updateData = {
        // 제품 정보
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription,
        product_features: productFeatures.filter(f => f.trim()),
        // 가이드 필드
        required_dialogues: requiredDialogues.filter(d => d.trim()),
        required_scenes: requiredScenes.filter(s => s.trim()),
        required_hashtags: requiredHashtags.filter(h => h.trim()),
        video_duration: videoDuration,
        video_tempo: videoTempo,
        video_tone: videoTone,
        additional_details: additionalDetails,
        additional_shooting_requests: additionalShootingRequests,
        // 촬영 장면 체크박스
        shooting_scenes_ba_photo: shootingScenes.baPhoto,
        shooting_scenes_no_makeup: shootingScenes.noMakeup,
        shooting_scenes_closeup: shootingScenes.closeup,
        shooting_scenes_product_closeup: shootingScenes.productCloseup,
        shooting_scenes_product_texture: shootingScenes.productTexture,
        shooting_scenes_outdoor: shootingScenes.outdoor,
        shooting_scenes_couple: shootingScenes.couple,
        shooting_scenes_child: shootingScenes.child,
        shooting_scenes_troubled_skin: shootingScenes.troubledSkin,
        shooting_scenes_wrinkles: shootingScenes.wrinkles,
        meta_ad_code_requested: metaAdCodeRequested
      }

      // 일본어 번역이 있으면 추가
      if (translatedBrandName) updateData.brand_name_ja = translatedBrandName
      if (translatedProductName) updateData.product_name_ja = translatedProductName
      if (translatedProductDesc) updateData.product_description_ja = translatedProductDesc
      if (translatedProductFeatures.length > 0) updateData.product_features_ja = translatedProductFeatures.filter(f => f.trim())
      if (translatedDialogues.length > 0) updateData.required_dialogues_ja = translatedDialogues.filter(d => d.trim())
      if (translatedScenes.length > 0) updateData.required_scenes_ja = translatedScenes.filter(s => s.trim())
      if (translatedHashtags.length > 0) updateData.required_hashtags_ja = translatedHashtags.filter(h => h.trim())
      if (translatedDuration) updateData.video_duration_ja = translatedDuration
      if (translatedTempo) updateData.video_tempo_ja = translatedTempo
      if (translatedTone) updateData.video_tone_ja = translatedTone
      if (translatedAdditionalDetails) updateData.additional_details_ja = translatedAdditionalDetails
      if (translatedShootingRequests) updateData.additional_shooting_requests_ja = translatedShootingRequests
      if (translatedShootingScenes.length > 0) updateData.shooting_scenes_ja = translatedShootingScenes.filter(s => s.trim())

      // 가이드 타입 및 관련 데이터 저장
      updateData.guide_type = guideType
      if (guideType === 'pdf' && pdfUrl) updateData.guide_pdf_url = pdfUrl
      if (guideType === 'ai' && aiGuide) updateData.ai_guide = aiGuide
      if (Object.keys(stepGuides).length > 0) updateData.step_guides = stepGuides

      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('クリエイターガイドが保存されました!')
      setTimeout(() => {
        navigate(`/company/campaigns/payment?id=${campaignId}&region=japan`)
      }, 1500)
    } catch (err) {
      console.error('가이드 저장 실패:', err)
      setError('가이드 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = () => {
    navigate('/company/campaigns')
  }

  // 스텝 수 계산
  const getStepCount = () => {
    if (campaignType === '4week_challenge') return 4
    if (campaignType === 'megawari') return 2
    return 1
  }

  // 스텝 라벨 생성
  const getStepLabel = (stepNum) => {
    if (campaignType === '4week_challenge') return `第${stepNum}週`
    if (campaignType === 'megawari') return `ステップ${stepNum}`
    return 'メインガイド'
  }

  // AI 가이드 생성
  const handleGenerateAIGuide = async (stepNumber = null) => {
    setAiGenerating(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/generate-japan-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: stepNumber ? 'generate_step' : 'generate',
          campaign_type: campaignType,
          brand_name: brandName,
          product_name: productName,
          product_description: productDescription,
          category: 'beauty',
          platforms: ['Instagram', 'TikTok'],
          additional_requirements: additionalDetails,
          step_number: stepNumber
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'AI 가이드 생성 실패')
      }

      if (stepNumber) {
        // 스텝별 가이드 저장
        setStepGuides(prev => ({
          ...prev,
          [stepNumber]: result.step_guide || result.raw_text
        }))
      } else {
        setAiGuide(result.guide || result.raw_text)
      }

      setSuccess('AI 가이드가 생성되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('AI 가이드 생성 오류:', err)
      setError(err.message || 'AI 가이드 생성 중 오류가 발생했습니다.')
    } finally {
      setAiGenerating(false)
    }
  }

  // 모든 스텝 가이드 일괄 생성
  const handleGenerateAllSteps = async () => {
    setAiGenerating(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/generate-japan-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_all_steps',
          campaign_type: campaignType,
          brand_name: brandName,
          product_name: productName,
          product_description: productDescription
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'AI 가이드 일괄 생성 실패')
      }

      // 모든 스텝 가이드 저장
      const newStepGuides = {}
      result.guides.forEach(g => {
        newStepGuides[g.step_number] = g.guide || g.raw_text
      })
      setStepGuides(newStepGuides)

      setSuccess(`${result.total_steps}개의 가이드가 생성되었습니다!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('AI 가이드 일괄 생성 오류:', err)
      setError(err.message || 'AI 가이드 일괄 생성 중 오류가 발생했습니다.')
    } finally {
      setAiGenerating(false)
    }
  }

  // PDF 업로드
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPdfUploading(true)
    setError('')

    try {
      const fileName = `guides/${campaignId}/${Date.now()}_${file.name}`
      const { data, error: uploadError } = await supabase.storage
        .from('campaign-files')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-files')
        .getPublicUrl(fileName)

      setPdfUrl(publicUrl)
      setSuccess('PDF가 업로드되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('PDF 업로드 오류:', err)
      setError('PDF 업로드 중 오류가 발생했습니다.')
    } finally {
      setPdfUploading(false)
    }
  }

  // 가이드 발송
  const handleDeliverGuide = async (stepNumber = null) => {
    setDelivering(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/deliver-japan-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          campaign_type: campaignType,
          step_number: stepNumber || currentStep,
          guide_content: guideType === 'ai'
            ? (stepNumber ? stepGuides[stepNumber] : aiGuide)
            : null,
          guide_url: guideType === 'pdf' ? pdfUrl : null,
          send_line: true,
          send_email: true
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '가이드 발송 실패')
      }

      setSuccess(`가이드가 ${result.results?.total || 0}명에게 발송되었습니다!`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('가이드 발송 오류:', err)
      setError(err.message || '가이드 발송 중 오류가 발생했습니다.')
    } finally {
      setDelivering(false)
    }
  }

  // 일괄 번역 함수
  const handleBatchTranslate = async () => {
    setIsTranslating(true)
    setTranslationError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      // 번역할 필드 준비
      const fieldsToTranslate = []
      
      // 제품 정보
      if (brandName.trim()) fieldsToTranslate.push({ key: 'brandName', label: '브랜드명', value: brandName })
      if (productName.trim()) fieldsToTranslate.push({ key: 'productName', label: '제품명', value: productName })
      if (productDescription.trim()) fieldsToTranslate.push({ key: 'productDesc', label: '제품설명', value: productDescription })
      
      productFeatures.filter(f => f.trim()).forEach((feature, idx) => {
        fieldsToTranslate.push({ key: `feature${idx}`, label: `제품특징${idx + 1}`, value: feature })
      })
      
      // 필수 대사
      requiredDialogues.filter(d => d.trim()).forEach((dialogue, idx) => {
        fieldsToTranslate.push({ key: `dialogue${idx}`, label: `필수대사${idx + 1}`, value: dialogue })
      })
      
      // 필수 장면
      requiredScenes.filter(s => s.trim()).forEach((scene, idx) => {
        fieldsToTranslate.push({ key: `scene${idx}`, label: `필수장면${idx + 1}`, value: scene })
      })
      
      // 필수 해시태그
      requiredHashtags.filter(h => h.trim()).forEach((hashtag, idx) => {
        fieldsToTranslate.push({ key: `hashtag${idx}`, label: `필수해시태그${idx + 1}`, value: hashtag })
      })
      
      // 필수 촬영 장면 (체크된 항목만)
      const shootingSceneLabels = {
        baPhoto: '확실한 B&A 촬영',
        noMakeup: '노메이크업',
        closeup: '클로즈업',
        productCloseup: '제품 클로즈업',
        productTexture: '제품 제형 클로즈업',
        outdoor: '외부촬영(카페, 외출 등)',
        couple: '커플출연',
        child: '아이출연',
        troubledSkin: '트러블 피부 노출',
        wrinkles: '피부 주름 노출'
      }
      
      const checkedScenes = Object.entries(shootingScenes)
        .filter(([key, checked]) => checked)
        .map(([key]) => shootingSceneLabels[key])
      
      if (checkedScenes.length > 0) {
        fieldsToTranslate.push({ key: 'shootingScenes', label: '필수촬영장면', value: checkedScenes.join(', ') })
      }
      
      // 기타 필드
      if (videoDuration.trim()) fieldsToTranslate.push({ key: 'duration', label: '영상시간', value: videoDuration })
      if (videoTempo.trim()) fieldsToTranslate.push({ key: 'tempo', label: '영상템포', value: videoTempo })
      if (videoTone.trim()) fieldsToTranslate.push({ key: 'tone', label: '영상톤', value: videoTone })
      if (additionalDetails.trim()) fieldsToTranslate.push({ key: 'additional', label: '추가전달사항', value: additionalDetails })
      if (additionalShootingRequests.trim()) fieldsToTranslate.push({ key: 'shooting', label: '추가촬영요청', value: additionalShootingRequests })

      if (fieldsToTranslate.length === 0) {
        throw new Error('번역할 내용이 없습니다.')
      }

      const textToTranslate = fieldsToTranslate.map(f => `[${f.label}]\n${f.value}`).join('\n\n')

      // 번역: 단순, 대량 → gemini-2.5-flash-lite (4K RPM, 무제한 RPD)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `다음 한국어 캠페인 가이드 정보를 일본어로 자연스럽게 번역해주세요. 각 필드별로 [필수대사1], [필수장면1], [필수해시태그1] 등의 형식을 유지하고, 번역 결과만 출력하세요:\n\n${textToTranslate}`
              }]
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'

      console.log('=== 일괄 번역 결과 ====')
      console.log('원본:', textToTranslate)
      console.log('번역:', translatedText)

      // 번역 결과 파싱
      const cleanText = translatedText.replace(/\*\*/g, '')
      
      // 제품 정보 파싱
      const brandNameMatch = cleanText.match(/\[(브랜드명|ブランド名)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productNameMatch = cleanText.match(/\[(제품명|製品名)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productDescMatch = cleanText.match(/\[(제품설명|製品説明)\]\s*([\s\S]*?)(?=\n\[|$)/)
      
      setTranslatedBrandName(brandNameMatch ? brandNameMatch[2].trim() : '')
      setTranslatedProductName(productNameMatch ? productNameMatch[2].trim() : '')
      setTranslatedProductDesc(productDescMatch ? productDescMatch[2].trim() : '')
      
      // 제품 특징 파싱
      const newTranslatedFeatures = []
      productFeatures.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(제품특징${idx + 1}|製品特徴${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedFeatures.push(match[2].trim())
      })
      setTranslatedProductFeatures(newTranslatedFeatures)
      
      // 필수 대사 파싱
      const newTranslatedDialogues = []
      requiredDialogues.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수대사${idx + 1}|必須セリフ${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedDialogues.push(match[2].trim())
      })
      
      // 필수 장면 파싱
      const newTranslatedScenes = []
      requiredScenes.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수장면${idx + 1}|必須シーン${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedScenes.push(match[2].trim())
      })
      
      // 필수 해시태그 파싱
      const newTranslatedHashtags = []
      requiredHashtags.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[(필수해시태그${idx + 1}|必須ハッシュタグ${idx + 1})\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedHashtags.push(match[2].trim())
      })
      
      // 기타 필드 파싱
      const durationMatch = cleanText.match(/\[(영상시간|希望動画時間)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const tempoMatch = cleanText.match(/\[(영상템포|動画テンポ)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const toneMatch = cleanText.match(/\[(영상톤|動画トーン)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const additionalMatch = cleanText.match(/\[(추가전달사항|追加伝達事項)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const shootingMatch = cleanText.match(/\[(추가촬영요청|追加撮影リクエスト)\]\s*([\s\S]*?)(?=\n\[|$)/)
      const shootingScenesMatch = cleanText.match(/\[(필수촬영장면|必須撮影シーン)\]\s*([\s\S]*?)(?=\n\[|$)/)

      setTranslatedDialogues(newTranslatedDialogues)
      setTranslatedScenes(newTranslatedScenes)
      setTranslatedHashtags(newTranslatedHashtags)
      setTranslatedDuration(durationMatch ? durationMatch[2].trim() : '')
      setTranslatedTempo(tempoMatch ? tempoMatch[2].trim() : '')
      setTranslatedTone(toneMatch ? toneMatch[2].trim() : '')
      setTranslatedAdditionalDetails(additionalMatch ? additionalMatch[2].trim() : '')
      setTranslatedShootingRequests(shootingMatch ? shootingMatch[2].trim() : '')
      
      // 촬영 장면을 배열로 변환
      if (shootingScenesMatch) {
        const scenesText = shootingScenesMatch[2].trim()
        const scenesArray = scenesText.split(/[,、]/).map(s => s.trim()).filter(s => s)
        setTranslatedShootingScenes(scenesArray)
      } else {
        setTranslatedShootingScenes([])
      }

      setSuccess('일괄 번역이 완료되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('일괄 번역 오류:', error)
      setTranslationError(error.message || '일괄 번역 중 오류가 발생했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  // 배열 필드 추가/삭제 함수
  const addDialogue = () => setRequiredDialogues([...requiredDialogues, ''])
  const removeDialogue = (index) => setRequiredDialogues(requiredDialogues.filter((_, i) => i !== index))
  const updateDialogue = (index, value) => {
    const newDialogues = [...requiredDialogues]
    newDialogues[index] = value
    setRequiredDialogues(newDialogues)
  }

  const addScene = () => setRequiredScenes([...requiredScenes, ''])
  const removeScene = (index) => setRequiredScenes(requiredScenes.filter((_, i) => i !== index))
  const updateScene = (index, value) => {
    const newScenes = [...requiredScenes]
    newScenes[index] = value
    setRequiredScenes(newScenes)
  }

  const addHashtag = () => setRequiredHashtags([...requiredHashtags, ''])
  const removeHashtag = (index) => setRequiredHashtags(requiredHashtags.filter((_, i) => i !== index))
  const updateHashtag = (index, value) => {
    const newHashtags = [...requiredHashtags]
    newHashtags[index] = value
    setRequiredHashtags(newHashtags)
  }

  // 촬영 장면 체크박스 변경 함수
  const handleShootingSceneChange = (scene, checked) => {
    setShootingScenes(prev => ({
      ...prev,
      [scene]: checked
    }))
  }

  return (
    <>
      <CompanyNavigation />
      <div className="container mx-auto p-6 max-w-7xl">
        {translationError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {translationError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 한국어 입력 */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                    크리에이터 가이드 작성 (한국어)
                  </CardTitle>
                  <p className="text-sm text-gray-700 mt-2">
                    {campaignTitle && <span className="font-semibold text-blue-700">{campaignTitle}</span>}
                  </p>
                </div>
                {autoSaving && (
                  <div className="flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-full">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <p className="text-xs text-blue-700 font-medium">자동 저장 중...</p>
                  </div>
                )}
              </div>
            </CardHeader>

        <CardContent className="space-y-6">
          {/* 캠페인 타입 표시 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {campaignType === '4week_challenge' && '🗓️ 4週チャレンジ'}
              {campaignType === 'megawari' && '🎯 メガ割'}
              {campaignType === 'regular' && '📹 企画型'}
            </div>
          </div>

          {/* 가이드 타입 선택 */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <Label className="text-lg font-bold text-purple-900 mb-3 block">📋 ガイドタイプ選択</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setGuideType('manual')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  guideType === 'manual'
                    ? 'border-purple-500 bg-purple-100 text-purple-700'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">手動作成</div>
                <div className="text-xs text-gray-500">직접 입력</div>
              </button>
              <button
                type="button"
                onClick={() => setGuideType('ai')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  guideType === 'ai'
                    ? 'border-purple-500 bg-purple-100 text-purple-700'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <Wand2 className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">AI生成</div>
                <div className="text-xs text-gray-500">자동 생성</div>
              </button>
              <button
                type="button"
                onClick={() => setGuideType('pdf')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  guideType === 'pdf'
                    ? 'border-purple-500 bg-purple-100 text-purple-700'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <div className="text-sm font-medium">PDF Upload</div>
                <div className="text-xs text-gray-500">PDF 업로드</div>
              </button>
            </div>
          </div>

          {/* 멀티스텝 캠페인: 스텝/주차 탭 */}
          {(campaignType === '4week_challenge' || campaignType === 'megawari') && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Label className="text-lg font-bold text-orange-900 mb-3 block">
                {campaignType === '4week_challenge' ? '📅 週別ガイド' : '🎯 ステップ別ガイド'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: getStepCount() }, (_, i) => i + 1).map(stepNum => (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => setCurrentStep(stepNum)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentStep === stepNum
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-white border border-orange-300 text-orange-700 hover:bg-orange-100'
                    }`}
                  >
                    {getStepLabel(stepNum)}
                    {stepGuides[stepNum] && (
                      <CheckCircle2 className="w-4 h-4 inline ml-1 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
              {guideType === 'ai' && (
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => handleGenerateAIGuide(currentStep)}
                    disabled={aiGenerating}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-1" />
                        {getStepLabel(currentStep)} AI生成
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateAllSteps}
                    disabled={aiGenerating}
                    size="sm"
                    variant="outline"
                    className="border-orange-500 text-orange-700 hover:bg-orange-50"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    全て一括生成
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* AI 가이드 생성 버튼 (일반 캠페인용) */}
          {guideType === 'ai' && campaignType === 'regular' && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-lg font-bold text-indigo-900">🤖 AI ガイド生成</Label>
                  <p className="text-sm text-indigo-700 mt-1">
                    製品情報を元にAIがガイドを自動生成します
                  </p>
                </div>
                <Button
                  onClick={() => handleGenerateAIGuide()}
                  disabled={aiGenerating}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      AI ガイド生成
                    </>
                  )}
                </Button>
              </div>
              {aiGuide && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200 max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap text-gray-700">
                    {typeof aiGuide === 'object' ? JSON.stringify(aiGuide, null, 2) : aiGuide}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* PDF 업로드 (PDF 타입 선택시) */}
          {guideType === 'pdf' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <Label className="text-lg font-bold text-green-900 mb-3 block">📄 PDF ガイドアップロード</Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors"
                >
                  {pdfUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      PDFをアップロード
                    </>
                  )}
                </label>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline text-sm"
                  >
                    アップロード済みPDFを確認
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 가이드 발송 버튼 */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="text-lg font-bold flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  ガイド発送
                </div>
                <p className="text-sm text-blue-100 mt-1">
                  選定されたクリエイターにLINE/メールでガイドを発送します
                </p>
              </div>
              <Button
                onClick={() => handleDeliverGuide(campaignType !== 'regular' ? currentStep : null)}
                disabled={delivering}
                className="bg-white text-blue-700 hover:bg-blue-50"
              >
                {delivering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    発送中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {campaignType !== 'regular' ? `${getStepLabel(currentStep)} 発送` : 'ガイド発送'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 제품 정보 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="text-lg font-bold text-blue-900 mb-4 block">📦 제품 정보</Label>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">브랜드명</Label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="브랜드명 입력"
                    className="mt-1 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold">제품명</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="제품명 입력"
                    className="mt-1 bg-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">제품 설명</Label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="제품의 특징, 효능, 사용법 등을 상세히 설명해주세요"
                  rows={4}
                  className="mt-1 bg-white resize-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-sm font-semibold">제품 특징 (키 포인트)</Label>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={() => setProductFeatures([...productFeatures, ''])}
                  >
                    <Plus className="w-4 h-4 mr-1" /> 추가
                  </Button>
                </div>
                {productFeatures.map((feature, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...productFeatures]
                        newFeatures[index] = e.target.value
                        setProductFeatures(newFeatures)
                      }}
                      placeholder={`특징 ${index + 1} (예: 저자극, 보습력 우수)`}
                      className="bg-white"
                    />
                    {productFeatures.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newFeatures = productFeatures.filter((_, i) => i !== index)
                          setProductFeatures(newFeatures)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 필수 대사 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 대사</Label>
              <Button type="button" size="sm" variant="outline" onClick={addDialogue}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">크리에이터가 꼭 말해야 하는 대사를 입력하세요</p>
            {requiredDialogues.map((dialogue, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={dialogue}
                  onChange={(e) => updateDialogue(index, e.target.value)}
                  placeholder={`필수 대사 ${index + 1}`}
                  className="flex-1"
                />
                {requiredDialogues.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeDialogue(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 필수 장면 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 장면</Label>
              <Button type="button" size="sm" variant="outline" onClick={addScene}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">영상에 꼭 포함되어야 하는 장면을 설명하세요</p>
            {requiredScenes.map((scene, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={scene}
                  onChange={(e) => updateScene(index, e.target.value)}
                  placeholder={`필수 장면 ${index + 1} (예: 제품 클로즈업 촬영)`}
                  className="flex-1"
                />
                {requiredScenes.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeScene(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 필수 촬영 장면 체크박스 */}
          <div>
            <Label className="text-base font-semibold mb-3 block">필수 촬영 장면</Label>
            <p className="text-sm text-gray-600 mb-3">필요한 촬영 장면을 선택하세요</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="ba-photo" 
                  checked={shootingScenes.baPhoto}
                  onCheckedChange={(checked) => handleShootingSceneChange('baPhoto', checked)}
                />
                <label htmlFor="ba-photo" className="text-sm cursor-pointer">
                  확실한 B&A 촬영
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="no-makeup" 
                  checked={shootingScenes.noMakeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('noMakeup', checked)}
                />
                <label htmlFor="no-makeup" className="text-sm cursor-pointer">
                  노메이크업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="closeup" 
                  checked={shootingScenes.closeup}
                  onCheckedChange={(checked) => handleShootingSceneChange('closeup', checked)}
                />
                <label htmlFor="closeup" className="text-sm cursor-pointer">
                  클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-closeup" 
                  checked={shootingScenes.productCloseup}
                  onCheckedChange={(checked) => handleShootingSceneChange('productCloseup', checked)}
                />
                <label htmlFor="product-closeup" className="text-sm cursor-pointer">
                  제품 클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="product-texture" 
                  checked={shootingScenes.productTexture}
                  onCheckedChange={(checked) => handleShootingSceneChange('productTexture', checked)}
                />
                <label htmlFor="product-texture" className="text-sm cursor-pointer">
                  제품 제형 클로즈업
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="outdoor" 
                  checked={shootingScenes.outdoor}
                  onCheckedChange={(checked) => handleShootingSceneChange('outdoor', checked)}
                />
                <label htmlFor="outdoor" className="text-sm cursor-pointer">
                  외부촬영(카페, 외출 등)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="couple" 
                  checked={shootingScenes.couple}
                  onCheckedChange={(checked) => handleShootingSceneChange('couple', checked)}
                />
                <label htmlFor="couple" className="text-sm cursor-pointer">
                  커플출연
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="child" 
                  checked={shootingScenes.child}
                  onCheckedChange={(checked) => handleShootingSceneChange('child', checked)}
                />
                <label htmlFor="child" className="text-sm cursor-pointer">
                  아이출연
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="troubled-skin" 
                  checked={shootingScenes.troubledSkin}
                  onCheckedChange={(checked) => handleShootingSceneChange('troubledSkin', checked)}
                />
                <label htmlFor="troubled-skin" className="text-sm cursor-pointer">
                  트러블 피부 노출
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="wrinkles" 
                  checked={shootingScenes.wrinkles}
                  onCheckedChange={(checked) => handleShootingSceneChange('wrinkles', checked)}
                />
                <label htmlFor="wrinkles" className="text-sm cursor-pointer">
                  피부 주름 노출
                </label>
              </div>
            </div>
          </div>

          {/* 추가 촬영 요청사항 */}
          <div>
            <Label className="text-base font-semibold">추가 촬영 요청사항</Label>
            <p className="text-sm text-gray-600 mb-2">위 항목 외에 추가로 요청하고 싶은 촬영 장면이나 요구사항을 작성하세요</p>
            <Textarea
              value={additionalShootingRequests}
              onChange={(e) => setAdditionalShootingRequests(e.target.value)}
              placeholder="예: 자연광에서 촬영해주세요, 밝은 배경에서 촬영 부탁드립니다"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* 필수 해시태그 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-base font-semibold">필수 해시태그</Label>
              <Button type="button" size="sm" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4 mr-1" /> 추가
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-3">게시물에 꼭 포함해야 하는 해시태그를 입력하세요</p>
            {requiredHashtags.map((hashtag, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={hashtag}
                  onChange={(e) => updateHashtag(index, e.target.value)}
                  placeholder={`#해시태그${index + 1}`}
                  className="flex-1"
                />
                {requiredHashtags.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeHashtag(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 원하는 영상 시간 */}
          <div>
            <Label className="text-base font-semibold">원하는 영상 시간</Label>
            <Select value={videoDuration} onValueChange={setVideoDuration}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 시간을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="15sec">15초</SelectItem>
                <SelectItem value="30sec">30초</SelectItem>
                <SelectItem value="45sec">45초</SelectItem>
                <SelectItem value="1min">1분</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 영상 템포 */}
          <div>
            <Label className="text-base font-semibold">영상 템포</Label>
            <Select value={videoTempo} onValueChange={setVideoTempo}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 템포를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="fast">빠름 (역동적, 빠른 편집)</SelectItem>
                <SelectItem value="normal">보통 (자연스러운 속도)</SelectItem>
                <SelectItem value="slow">느림 (차분하고 여유로운)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 영상 톤앤매너 */}
          <div>
            <Label className="text-base font-semibold">영상 톤앤매너</Label>
            <Select value={videoTone} onValueChange={setVideoTone}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="영상 분위기를 선택하세요" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="bright">밝고 경쾌한</SelectItem>
                <SelectItem value="calm">차분하고 진지한</SelectItem>
                <SelectItem value="emotional">감성적인</SelectItem>
                <SelectItem value="humorous">유머러스한</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 기타 디테일 요청사항 */}
          <div>
            <Label className="text-base font-semibold">기타 디테일 요청사항</Label>
            <p className="text-sm text-gray-600 mb-2">추가로 요청하고 싶은 사항을 자유롭게 작성하세요</p>
            <Textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="예: 밝은 조명에서 촬영해주세요, 배경 음악은 경쾌한 느낌으로 부탁드립니다"
              rows={5}
              className="resize-none"
            />
          </div>

          {/* 메타광고코드 발급 요청 */}
          <div className="border-t pt-6 mt-6">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="meta-ad-code"
                  checked={metaAdCodeRequested}
                  onCheckedChange={setMetaAdCodeRequested}
                  className="w-5 h-5"
                />
                <label htmlFor="meta-ad-code" className="text-base font-bold text-purple-900 cursor-pointer">
                  📱 메타광고코드 발급 요청
                </label>
              </div>
              <p className="text-sm text-purple-700 mt-2 ml-8">
                체크하시면 메타(Facebook/Instagram) 광고 코드를 발급해드립니다
              </p>
            </div>
          </div>

          {/* 일본어 번역 기능 */}
          <div className="border-t pt-6 mt-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Globe className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-blue-900">일본어 번역 기능</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    위에서 작성한 한국어 가이드를 일본어로 자동 번역합니다.
                    번역된 내용은 오른쪽 미리보기에 표시되며, 일본 크리에이터에게 전달됩니다.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleBatchTranslate}
                disabled={isTranslating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
              >
                {isTranslating ? '⏳ 번역 중...' : '🌐 일본어로 번역하기'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={processing}
              className="flex-1"
            >
              {processing ? '저장 중...' : '저장하고 완료'}
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              disabled={processing}
            >
              나중에 작성
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            작성 중인 내용은 10초마다 자동으로 저장됩니다
          </p>
        </CardContent>
      </Card>

      {/* 오른쪽: 일본어 번역 미리보기 */}
      <Card className="bg-white shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-2">
          <div className="flex items-center gap-2">
            <Globe className="h-7 w-7" />
            <CardTitle className="text-3xl font-bold">クリエイターガイド</CardTitle>
          </div>
          <p className="text-sm text-blue-100 mt-2">
            {campaignTitle || 'キャンペーンタイトル'}
          </p>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* 제품 정보 미리보기 */}
          {(translatedBrandName || translatedProductName || translatedProductDesc || translatedProductFeatures.length > 0) && (
            <div className="border-l-4 border-indigo-500 pl-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📦</span>
                <Label className="text-xl font-bold text-gray-800">製品情報</Label>
              </div>
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 space-y-4">
                {translatedBrandName && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">ブランド名</Label>
                    <Input
                      value={translatedBrandName}
                      onChange={(e) => setTranslatedBrandName(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 font-bold"
                    />
                  </div>
                )}
                {translatedProductName && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">製品名</Label>
                    <Input
                      value={translatedProductName}
                      onChange={(e) => setTranslatedProductName(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 font-bold"
                    />
                  </div>
                )}
                {translatedProductDesc && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">製品説明</Label>
                    <Textarea
                      value={translatedProductDesc}
                      onChange={(e) => setTranslatedProductDesc(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 resize-none"
                      rows={4}
                    />
                  </div>
                )}
                {translatedProductFeatures.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-2">製品特徴</Label>
                    <div className="space-y-2">
                      {translatedProductFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
                          <Input
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...translatedProductFeatures]
                              newFeatures[index] = e.target.value
                              setTranslatedProductFeatures(newFeatures)
                            }}
                            className="flex-1 bg-white border-indigo-200 focus:border-indigo-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 필수 대사 미리보기 */}
          {translatedDialogues.length > 0 && (
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💬</span>
                <Label className="text-xl font-bold text-gray-800">必須セリフ</Label>
              </div>
              <div className="space-y-3">
                {translatedDialogues.map((dialogue, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <Textarea
                        value={dialogue}
                        onChange={(e) => {
                          const newDialogues = [...translatedDialogues]
                          newDialogues[index] = e.target.value
                          setTranslatedDialogues(newDialogues)
                        }}
                        className="flex-1 bg-white border-blue-200 focus:border-blue-400 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 장면 미리보기 */}
          {translatedScenes.length > 0 && (
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎥</span>
                <Label className="text-xl font-bold text-gray-800">必須シーン</Label>
              </div>
              <div className="space-y-3">
                {translatedScenes.map((scene, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <Textarea
                        value={scene}
                        onChange={(e) => {
                          const newScenes = [...translatedScenes]
                          newScenes[index] = e.target.value
                          setTranslatedScenes(newScenes)
                        }}
                        className="flex-1 bg-white border-green-200 focus:border-green-400 resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 해시태그 미리보기 */}
          {translatedHashtags.length > 0 && (
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">#️⃣</span>
                <Label className="text-xl font-bold text-gray-800">必須ハッシュタグ</Label>
              </div>
              <div className="space-y-2">
                {translatedHashtags.map((hashtag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-purple-500 font-bold">#</span>
                    <Input
                      value={hashtag}
                      onChange={(e) => {
                        const newHashtags = [...translatedHashtags]
                        newHashtags[index] = e.target.value
                        setTranslatedHashtags(newHashtags)
                      }}
                      className="flex-1 bg-white border-purple-200 focus:border-purple-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 필수 촬영 장면 미리보기 */}
          {translatedShootingScenes.length > 0 && (
            <div className="border-l-4 border-teal-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📷</span>
                <Label className="text-xl font-bold text-gray-800">必須撮影シーン</Label>
              </div>
              <div className="space-y-2">
                {translatedShootingScenes.map((scene, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <Input
                      value={scene}
                      onChange={(e) => {
                        const newScenes = [...translatedShootingScenes]
                        newScenes[index] = e.target.value
                        setTranslatedShootingScenes(newScenes)
                      }}
                      className="flex-1 bg-white border-teal-200 focus:border-teal-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 영상 정보 미리보기 */}
          {(translatedDuration || translatedTempo || translatedTone) && (
            <div className="border-l-4 border-orange-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎬</span>
                <Label className="text-xl font-bold text-gray-800">動画仕様</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {translatedDuration && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">希望時間</Label>
                    <Input
                      value={translatedDuration}
                      onChange={(e) => setTranslatedDuration(e.target.value)}
                      className="bg-white border-orange-200 focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                )}
                {translatedTempo && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">テンポ</Label>
                    <Input
                      value={translatedTempo}
                      onChange={(e) => setTranslatedTempo(e.target.value)}
                      className="bg-white border-orange-200 focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                )}
                {translatedTone && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">トーン</Label>
                    <Input
                      value={translatedTone}
                      onChange={(e) => setTranslatedTone(e.target.value)}
                      className="bg-white border-orange-200 focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 추가 전달사항 미리보기 */}
          {translatedAdditionalDetails && (
            <div className="border-l-4 border-yellow-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📝</span>
                <Label className="text-xl font-bold text-gray-800">追加伝達事項</Label>
              </div>
              <Textarea
                value={translatedAdditionalDetails}
                onChange={(e) => setTranslatedAdditionalDetails(e.target.value)}
                className="bg-yellow-50 border-yellow-200 focus:border-yellow-400 resize-none"
                rows={4}
              />
            </div>
          )}

          {/* 추가 촬영 요청 미리보기 */}
          {translatedShootingRequests && (
            <div className="border-l-4 border-red-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <Label className="text-xl font-bold text-gray-800">追加撮影リクエスト</Label>
              </div>
              <Textarea
                value={translatedShootingRequests}
                onChange={(e) => setTranslatedShootingRequests(e.target.value)}
                className="bg-red-50 border-red-200 focus:border-red-400 resize-none"
                rows={4}
              />
            </div>
          )}

          {/* 메타광고코드 발급 요청 미리보기 */}
          {metaAdCodeRequested && (
            <div className="border-t pt-6 mt-6">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <label className="text-base font-bold text-purple-900">
                    📱 Meta広告コード発行リクエスト
                  </label>
                </div>
                <p className="text-sm text-purple-700 mb-4 ml-8">
                  Meta(Facebook/Instagram)広告コードを発行いたします
                </p>
                
                {/* 발급 방법 안내 */}
                <div className="ml-8 mt-4 p-3 bg-white border border-purple-100 rounded-lg">
                  <p className="text-xs font-bold text-purple-900 mb-2">📝 発行方法</p>
                  <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside">
                    <li>プロフィール→「プロフェッショナルダッシュボード」→「ブランデッドコンテンツ」で使用設定</li>
                    <li>投稿の「…」ボタン→「パートナーシップラベルと広告」選択</li>
                    <li>「パートナーシップ広告コードを取得」トグルON</li>
                    <li>「コピー」ボタンでコードをコピーして企業に提供</li>
                  </ol>
                  <p className="text-xs text-red-600 mt-3 font-semibold">
                    ⚠️ 注意：Instagram内蔵音楽の使用は不可（外部編集で著作権フリー音源を使用）
                  </p>
                </div>
              </div>
            </div>
          )}

          {translatedDialogues.length === 0 && translatedScenes.length === 0 && !translatedDuration && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg text-gray-500 mb-2">ガイドを作成してください</p>
              <p className="text-sm text-gray-400">左側に韓国語で入力し、「今翻訳」ボタンをクリックしてください</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
    </>
  )
}

export default CampaignGuideJapan
