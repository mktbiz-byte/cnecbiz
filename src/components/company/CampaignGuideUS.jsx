import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { X, Plus, Package, FileText, Video, Hash, Clock, Zap, Palette, Camera, Link, AlertCircle, CheckCircle2, Info, Calendar, Sparkles, Globe } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideUS = () => {
  const supabase = getSupabaseClient('us')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

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

  // 영어 번역 미리보기
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
    console.log('[DEBUG loadGuide] 캠페인 가이드 로드 시작')
    console.log('[DEBUG loadGuide] campaignId:', campaignId)
    console.log('[DEBUG loadGuide] supabase client:', supabase ? 'exists' : 'null')
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          title,
          brand_name,
          product_name,
          product_description,
          product_features,
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
          additional_shooting_requests,
          meta_ad_code_requested,
          brand_name_en,
          product_name_en,
          product_description_en,
          product_features_en,
          required_dialogues_en,
          required_scenes_en,
          required_hashtags_en,
          video_duration_en,
          video_tempo_en,
          video_tone_en,
          shooting_scenes_en,
          additional_shooting_requests_en,
          additional_details,
          additional_details_en
        `)
        .eq('id', campaignId)
        .single()

      console.log('[DEBUG loadGuide] SELECT 결과 - data:', data)
      console.log('[DEBUG loadGuide] SELECT 결과 - error:', error)

      if (error) throw error

      if (data) {
        console.log('[DEBUG loadGuide] 데이터 로드 성공, title:', data.title)
        console.log('[DEBUG loadGuide] brand_name:', data.brand_name)
        console.log('[DEBUG loadGuide] product_name:', data.product_name)
        setCampaignTitle(data.title || '')
        // 제품 정보 - 저장된 데이터가 있으면 로드, 없으면 빈 상태
        if (data.brand_name) setBrandName(data.brand_name)
        if (data.product_name) setProductName(data.product_name)
        if (data.product_description) setProductDescription(data.product_description)
        // Array.isArray로 배열 체크
        if (Array.isArray(data.product_features) && data.product_features.length > 0) {
          setProductFeatures(data.product_features)
        }
        setRequiredDialogues(Array.isArray(data.required_dialogues) && data.required_dialogues.length > 0 ? data.required_dialogues : [''])
        setRequiredScenes(Array.isArray(data.required_scenes) && data.required_scenes.length > 0 ? data.required_scenes : [''])
        setRequiredHashtags(Array.isArray(data.required_hashtags) && data.required_hashtags.length > 0 ? data.required_hashtags : [''])
        setVideoDuration(data.video_duration || '')
        setVideoTempo(data.video_tempo || '')
        setVideoTone(data.video_tone || '')
        // [object Object] 문자열 방어
        const safeAdditionalDetails = (typeof data.additional_details === 'string' && data.additional_details !== '[object Object]') ? data.additional_details : ''
        setAdditionalDetails(safeAdditionalDetails)
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

        // 영어 번역 데이터 로드 (저장된 경우에만) - Array.isArray로 배열 체크
        if (data.brand_name_en) setTranslatedBrandName(data.brand_name_en)
        if (data.product_name_en) setTranslatedProductName(data.product_name_en)
        if (data.product_description_en) setTranslatedProductDesc(data.product_description_en)
        if (Array.isArray(data.product_features_en) && data.product_features_en.length > 0) {
          setTranslatedProductFeatures(data.product_features_en)
        }
        setTranslatedDialogues(Array.isArray(data.required_dialogues_en) ? data.required_dialogues_en : [])
        setTranslatedScenes(Array.isArray(data.required_scenes_en) ? data.required_scenes_en : [])
        setTranslatedHashtags(Array.isArray(data.required_hashtags_en) ? data.required_hashtags_en : [])
        setTranslatedDuration(data.video_duration_en || '')
        setTranslatedTempo(data.video_tempo_en || '')
        setTranslatedTone(data.video_tone_en || '')
        setTranslatedShootingRequests(data.additional_shooting_requests_en || '')
        setTranslatedShootingScenes(Array.isArray(data.shooting_scenes_en) ? data.shooting_scenes_en : [])
        if (data.additional_details_en) setTranslatedAdditionalDetails(data.additional_details_en)

        // 데이터 로드 완료
        setDataLoaded(true)
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    }
  }

  const autoSaveGuide = async () => {
    if (!campaignId) {
      console.error('[DEBUG autoSave] campaignId가 없음')
      return
    }
    setAutoSaving(true)
    try {
      const updateData = {
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription,
        product_features: (productFeatures || []).filter(f => f && f.trim()),
        required_dialogues: (requiredDialogues || []).filter(d => d && d.trim()),
        required_scenes: (requiredScenes || []).filter(s => s && s.trim()),
        required_hashtags: (requiredHashtags || []).filter(h => h && h.trim()),
        video_duration: videoDuration,
        video_tempo: videoTempo,
        video_tone: videoTone,
        additional_details: additionalDetails,
        shooting_scenes_ba_photo: shootingScenes?.baPhoto || false,
        shooting_scenes_no_makeup: shootingScenes?.noMakeup || false,
        shooting_scenes_closeup: shootingScenes?.closeup || false,
        shooting_scenes_product_closeup: shootingScenes?.productCloseup || false,
        shooting_scenes_product_texture: shootingScenes?.productTexture || false,
        shooting_scenes_outdoor: shootingScenes?.outdoor || false,
        shooting_scenes_couple: shootingScenes?.couple || false,
        shooting_scenes_child: shootingScenes?.child || false,
        shooting_scenes_troubled_skin: shootingScenes?.troubledSkin || false,
        shooting_scenes_wrinkles: shootingScenes?.wrinkles || false,
        additional_shooting_requests: additionalShootingRequests,
        meta_ad_code_requested: metaAdCodeRequested
      }

      // 영어 번역이 있으면 추가 - null safety 체크
      if (translatedBrandName) updateData.brand_name_en = translatedBrandName
      if (translatedProductName) updateData.product_name_en = translatedProductName
      if (translatedProductDesc) updateData.product_description_en = translatedProductDesc
      if (Array.isArray(translatedProductFeatures) && translatedProductFeatures.length > 0) updateData.product_features_en = translatedProductFeatures.filter(f => f && f.trim())
      if (Array.isArray(translatedDialogues) && translatedDialogues.length > 0) updateData.required_dialogues_en = translatedDialogues.filter(d => d && d.trim())
      if (Array.isArray(translatedScenes) && translatedScenes.length > 0) updateData.required_scenes_en = translatedScenes.filter(s => s && s.trim())
      if (Array.isArray(translatedHashtags) && translatedHashtags.length > 0) updateData.required_hashtags_en = translatedHashtags.filter(h => h && h.trim())
      if (translatedDuration) updateData.video_duration_en = translatedDuration
      if (translatedTempo) updateData.video_tempo_en = translatedTempo
      if (translatedTone) updateData.video_tone_en = translatedTone
      if (Array.isArray(translatedShootingScenes) && translatedShootingScenes.length > 0) updateData.shooting_scenes_en = translatedShootingScenes.filter(s => s && s.trim())
      if (translatedShootingRequests) updateData.additional_shooting_requests_en = translatedShootingRequests
      if (translatedAdditionalDetails) updateData.additional_details_en = translatedAdditionalDetails

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
      const updateData = {
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription,
        product_features: (productFeatures || []).filter(f => f && f.trim()),
        required_dialogues: (requiredDialogues || []).filter(d => d && d.trim()),
        required_scenes: (requiredScenes || []).filter(s => s && s.trim()),
        required_hashtags: (requiredHashtags || []).filter(h => h && h.trim()),
        video_duration: videoDuration,
        video_tempo: videoTempo,
        video_tone: videoTone,
        additional_details: additionalDetails,
        shooting_scenes_ba_photo: shootingScenes?.baPhoto || false,
        shooting_scenes_no_makeup: shootingScenes?.noMakeup || false,
        shooting_scenes_closeup: shootingScenes?.closeup || false,
        shooting_scenes_product_closeup: shootingScenes?.productCloseup || false,
        shooting_scenes_product_texture: shootingScenes?.productTexture || false,
        shooting_scenes_outdoor: shootingScenes?.outdoor || false,
        shooting_scenes_couple: shootingScenes?.couple || false,
        shooting_scenes_child: shootingScenes?.child || false,
        shooting_scenes_troubled_skin: shootingScenes?.troubledSkin || false,
        shooting_scenes_wrinkles: shootingScenes?.wrinkles || false,
        additional_shooting_requests: additionalShootingRequests,
        meta_ad_code_requested: metaAdCodeRequested
      }

      // 영어 번역이 있으면 추가 - null safety 체크
      if (translatedBrandName) updateData.brand_name_en = translatedBrandName
      if (translatedProductName) updateData.product_name_en = translatedProductName
      if (translatedProductDesc) updateData.product_description_en = translatedProductDesc
      if (Array.isArray(translatedProductFeatures) && translatedProductFeatures.length > 0) updateData.product_features_en = translatedProductFeatures.filter(f => f && f.trim())
      if (Array.isArray(translatedDialogues) && translatedDialogues.length > 0) updateData.required_dialogues_en = translatedDialogues.filter(d => d && d.trim())
      if (Array.isArray(translatedScenes) && translatedScenes.length > 0) updateData.required_scenes_en = translatedScenes.filter(s => s && s.trim())
      if (Array.isArray(translatedHashtags) && translatedHashtags.length > 0) updateData.required_hashtags_en = translatedHashtags.filter(h => h && h.trim())
      if (translatedDuration) updateData.video_duration_en = translatedDuration
      if (translatedTempo) updateData.video_tempo_en = translatedTempo
      if (translatedTone) updateData.video_tone_en = translatedTone
      if (Array.isArray(translatedShootingScenes) && translatedShootingScenes.length > 0) updateData.shooting_scenes_en = translatedShootingScenes.filter(s => s && s.trim())
      if (translatedShootingRequests) updateData.additional_shooting_requests_en = translatedShootingRequests
      if (translatedAdditionalDetails) updateData.additional_details_en = translatedAdditionalDetails

      console.log('[DEBUG] 가이드 저장 시작')
      console.log('[DEBUG] campaignId:', campaignId)
      console.log('[DEBUG] updateData:', JSON.stringify(updateData, null, 2))

      // 먼저 현재 로그인한 사용자 확인
      const { data: { user } } = await supabaseBiz.auth.getUser()
      console.log('[DEBUG] 현재 사용자:', user?.id)

      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      // 캠페인이 존재하고 현재 사용자의 캠페인인지 확인
      const { data: campaignCheck, error: checkError } = await supabase
        .from('campaigns')
        .select('id, company_id, title')
        .eq('id', campaignId)
        .single()

      console.log('[DEBUG] 캠페인 확인 결과:', campaignCheck)
      console.log('[DEBUG] 캠페인 확인 오류:', checkError)

      if (checkError || !campaignCheck) {
        throw new Error('캠페인을 찾을 수 없습니다. 캠페인 ID: ' + campaignId)
      }

      // company_id가 현재 사용자와 일치하는지 확인
      if (campaignCheck.company_id && campaignCheck.company_id !== user.id) {
        console.error('[DEBUG] 권한 없음 - company_id:', campaignCheck.company_id, '현재 user.id:', user.id)
        throw new Error('이 캠페인을 수정할 권한이 없습니다.')
      }

      // RLS를 우회하기 위해 company_id 조건도 추가
      const { data, error, count } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .select()

      console.log('[DEBUG] 저장 결과 - data:', data)
      console.log('[DEBUG] 저장 결과 - error:', error)
      console.log('[DEBUG] 저장 결과 - count:', count)

      if (error) throw error

      if (!data || data.length === 0) {
        // RLS 문제일 가능성이 높음 - US DB의 RLS 정책 확인 필요
        console.error('[DEBUG] UPDATE가 어떤 행도 업데이트하지 못함 - RLS 정책 문제일 수 있음')
        console.error('[DEBUG] US DB에서 campaigns 테이블의 RLS UPDATE 정책을 확인하세요')
        throw new Error('캠페인 업데이트 실패. 데이터베이스 권한 설정을 확인해주세요. (RLS policy)')
      }

      setSuccess('크리에이터 가이드가 저장되었습니다!')
      setTimeout(() => {
        navigate(`/company/campaigns/payment?id=${campaignId}&region=us`)
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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `다음 한국어 캠페인 가이드 정보를 영어(미국)로 자연스럽게 번역해주세요.
중요: 각 필드의 한국어 라벨([브랜드명], [제품명], [제품설명], [제품특징1], [필수대사1], [필수장면1], [필수해시태그1], [영상시간], [영상템포], [영상톤], [추가전달사항], [추가촬영요청], [필수촬영장면] 등)은 반드시 그대로 유지하고, 라벨 다음의 내용만 영어로 번역하세요.
예시:
[브랜드명]
Apple

번역 결과만 출력하세요:\n\n${textToTranslate}`
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

      // 제품 정보 파싱 (한국어 라벨만 검색)
      const brandNameMatch = cleanText.match(/\[브랜드명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productNameMatch = cleanText.match(/\[제품명\]\s*([\s\S]*?)(?=\n\[|$)/)
      const productDescMatch = cleanText.match(/\[제품설명\]\s*([\s\S]*?)(?=\n\[|$)/)

      setTranslatedBrandName(brandNameMatch ? brandNameMatch[1].trim() : '')
      setTranslatedProductName(productNameMatch ? productNameMatch[1].trim() : '')
      setTranslatedProductDesc(productDescMatch ? productDescMatch[1].trim() : '')

      // 제품 특징 파싱
      const newTranslatedFeatures = []
      productFeatures.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[제품특징${idx + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedFeatures.push(match[1].trim())
      })
      setTranslatedProductFeatures(newTranslatedFeatures)

      // 필수 대사 파싱
      const newTranslatedDialogues = []
      requiredDialogues.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[필수대사${idx + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedDialogues.push(match[1].trim())
      })

      // 필수 장면 파싱
      const newTranslatedScenes = []
      requiredScenes.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[필수장면${idx + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedScenes.push(match[1].trim())
      })

      // 필수 해시태그 파싱
      const newTranslatedHashtags = []
      requiredHashtags.forEach((_, idx) => {
        const match = cleanText.match(new RegExp(`\\[필수해시태그${idx + 1}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`))
        if (match) newTranslatedHashtags.push(match[1].trim())
      })

      // 기타 필드 파싱
      const durationMatch = cleanText.match(/\[영상시간\]\s*([\s\S]*?)(?=\n\[|$)/)
      const tempoMatch = cleanText.match(/\[영상템포\]\s*([\s\S]*?)(?=\n\[|$)/)
      const toneMatch = cleanText.match(/\[영상톤\]\s*([\s\S]*?)(?=\n\[|$)/)
      const additionalMatch = cleanText.match(/\[추가전달사항\]\s*([\s\S]*?)(?=\n\[|$)/)
      const shootingMatch = cleanText.match(/\[추가촬영요청\]\s*([\s\S]*?)(?=\n\[|$)/)
      const shootingScenesMatch = cleanText.match(/\[필수촬영장면\]\s*([\s\S]*?)(?=\n\[|$)/)

      setTranslatedDialogues(newTranslatedDialogues)
      setTranslatedScenes(newTranslatedScenes)
      setTranslatedHashtags(newTranslatedHashtags)
      setTranslatedDuration(durationMatch ? durationMatch[1].trim() : '')
      setTranslatedTempo(tempoMatch ? tempoMatch[1].trim() : '')
      setTranslatedTone(toneMatch ? toneMatch[1].trim() : '')
      setTranslatedAdditionalDetails(additionalMatch ? additionalMatch[1].trim() : '')
      setTranslatedShootingRequests(shootingMatch ? shootingMatch[1].trim() : '')

      // 촬영 장면을 배열로 변환
      if (shootingScenesMatch) {
        const scenesText = shootingScenesMatch[1].trim()
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
                {(productFeatures || []).map((feature, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={feature || ''}
                      onChange={(e) => {
                        const newFeatures = [...(productFeatures || [])]
                        newFeatures[index] = e.target.value
                        setProductFeatures(newFeatures)
                      }}
                      placeholder={`특징 ${index + 1} (예: 저자극, 보습력 우수)`}
                      className="bg-white"
                    />
                    {(productFeatures || []).length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const newFeatures = (productFeatures || []).filter((_, i) => i !== index)
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
            {(requiredDialogues || []).map((dialogue, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={dialogue || ''}
                  onChange={(e) => updateDialogue(index, e.target.value)}
                  placeholder={`필수 대사 ${index + 1}`}
                  className="flex-1"
                />
                {(requiredDialogues || []).length > 1 && (
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
            {(requiredScenes || []).map((scene, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={scene || ''}
                  onChange={(e) => updateScene(index, e.target.value)}
                  placeholder={`필수 장면 ${index + 1} (예: 제품 클로즈업 촬영)`}
                  className="flex-1"
                />
                {(requiredScenes || []).length > 1 && (
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
            {(requiredHashtags || []).map((hashtag, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={hashtag || ''}
                  onChange={(e) => updateHashtag(index, e.target.value)}
                  placeholder={`#해시태그${index + 1}`}
                  className="flex-1"
                />
                {(requiredHashtags || []).length > 1 && (
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

          {/* 영어 번역 기능 */}
          <div className="border-t pt-6 mt-6">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Globe className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-blue-900">영어 번역 기능</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    위에서 작성한 한국어 가이드를 영어로 자동 번역합니다.
                    번역된 내용은 오른쪽 미리보기에 표시되며, 미국 크리에이터에게 전달됩니다.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleBatchTranslate}
                disabled={isTranslating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
              >
                {isTranslating ? '⏳ 번역 중...' : '🌐 영어로 번역하기'}
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

      {/* 오른쪽: 영어 번역 미리보기 */}
      <Card className="bg-white shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-2">
          <div className="flex items-center gap-2">
            <Globe className="h-7 w-7" />
            <CardTitle className="text-3xl font-bold">Creator Guide</CardTitle>
          </div>
          <p className="text-sm text-blue-100 mt-2">
            {campaignTitle || 'Campaign Title'} - English Preview
          </p>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* 제품 정보 미리보기 */}
          {(translatedBrandName || translatedProductName || translatedProductDesc || translatedProductFeatures.length > 0) && (
            <div className="border-l-4 border-indigo-500 pl-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📦</span>
                <Label className="text-xl font-bold text-gray-800">Product Information</Label>
              </div>
              <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 space-y-4">
                {translatedBrandName && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">Brand Name</Label>
                    <Input
                      value={translatedBrandName}
                      onChange={(e) => setTranslatedBrandName(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 font-bold"
                    />
                  </div>
                )}
                {translatedProductName && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">Product Name</Label>
                    <Input
                      value={translatedProductName}
                      onChange={(e) => setTranslatedProductName(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 font-bold"
                    />
                  </div>
                )}
                {translatedProductDesc && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-1">Product Description</Label>
                    <Textarea
                      value={translatedProductDesc}
                      onChange={(e) => setTranslatedProductDesc(e.target.value)}
                      className="mt-1 bg-white border-indigo-200 focus:border-indigo-400 resize-none"
                      rows={4}
                    />
                  </div>
                )}
                {Array.isArray(translatedProductFeatures) && translatedProductFeatures.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-indigo-600 mb-2">Product Features</Label>
                    <div className="space-y-2">
                      {translatedProductFeatures.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">✓</span>
                          <Input
                            value={feature || ''}
                            onChange={(e) => {
                              const newFeatures = [...(translatedProductFeatures || [])]
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
          {Array.isArray(translatedDialogues) && translatedDialogues.length > 0 && (
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💬</span>
                <Label className="text-xl font-bold text-gray-800">Required Lines</Label>
              </div>
              <div className="space-y-3">
                {translatedDialogues.map((dialogue, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <Textarea
                        value={dialogue || ''}
                        onChange={(e) => {
                          const newDialogues = [...(translatedDialogues || [])]
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
          {Array.isArray(translatedScenes) && translatedScenes.length > 0 && (
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎥</span>
                <Label className="text-xl font-bold text-gray-800">Required Scenes</Label>
              </div>
              <div className="space-y-3">
                {translatedScenes.map((scene, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                      <Textarea
                        value={scene || ''}
                        onChange={(e) => {
                          const newScenes = [...(translatedScenes || [])]
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
          {Array.isArray(translatedHashtags) && translatedHashtags.length > 0 && (
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">#️⃣</span>
                <Label className="text-xl font-bold text-gray-800">Required Hashtags</Label>
              </div>
              <div className="space-y-2">
                {translatedHashtags.map((hashtag, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-purple-500 font-bold">#</span>
                    <Input
                      value={hashtag || ''}
                      onChange={(e) => {
                        const newHashtags = [...(translatedHashtags || [])]
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
          {Array.isArray(translatedShootingScenes) && translatedShootingScenes.length > 0 && (
            <div className="border-l-4 border-teal-500 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📷</span>
                <Label className="text-xl font-bold text-gray-800">Required Shooting Scenes</Label>
              </div>
              <div className="space-y-2">
                {translatedShootingScenes.map((scene, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <Input
                      value={scene || ''}
                      onChange={(e) => {
                        const newScenes = [...(translatedShootingScenes || [])]
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
                <Label className="text-xl font-bold text-gray-800">Video Specifications</Label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {translatedDuration && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">Duration</Label>
                    <Input
                      value={translatedDuration}
                      onChange={(e) => setTranslatedDuration(e.target.value)}
                      className="bg-white border-orange-200 focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                )}
                {translatedTempo && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">Tempo</Label>
                    <Input
                      value={translatedTempo}
                      onChange={(e) => setTranslatedTempo(e.target.value)}
                      className="bg-white border-orange-200 focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                )}
                {translatedTone && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Label className="text-xs text-gray-600 mb-2">Tone</Label>
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
                <Label className="text-xl font-bold text-gray-800">Additional Notes</Label>
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
                <Label className="text-xl font-bold text-gray-800">Additional Shooting Requests</Label>
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
                    📱 Meta Ad Code Request
                  </label>
                </div>
                <p className="text-sm text-purple-700 mb-4 ml-8">
                  Meta (Facebook/Instagram) ad code will be issued.
                </p>

                {/* 발급 방법 안내 */}
                <div className="ml-8 mt-4 p-3 bg-white border border-purple-100 rounded-lg">
                  <p className="text-xs font-bold text-purple-900 mb-2">📝 How to Get the Code</p>
                  <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside">
                    <li>Go to Profile → "Professional Dashboard" → Enable "Branded Content"</li>
                    <li>On your post, tap "..." → Select "Partnership label and ads"</li>
                    <li>Toggle ON "Get partnership ad code"</li>
                    <li>Tap "Copy" to copy the code and share with the brand</li>
                  </ol>
                  <p className="text-xs text-red-600 mt-3 font-semibold">
                    ⚠️ Note: Do not use Instagram's built-in music (use royalty-free music in external editing)
                  </p>
                </div>
              </div>
            </div>
          )}

          {(!Array.isArray(translatedDialogues) || translatedDialogues.length === 0) &&
           (!Array.isArray(translatedScenes) || translatedScenes.length === 0) &&
           !translatedDuration && !translatedBrandName && !translatedProductName && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg text-gray-500 mb-2">영어 번역 미리보기</p>
              <p className="text-sm text-gray-400">왼쪽에서 가이드를 작성한 후, "영어로 번역하기" 버튼을 클릭하세요</p>
              <p className="text-xs text-gray-300 mt-2">The English translation will appear here after you click the translate button</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
    </>
  )
}

export default CampaignGuideUS
