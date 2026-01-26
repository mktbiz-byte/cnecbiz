import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Loader2, Globe, ChevronRight, Sparkles, Languages } from 'lucide-react'

const CreateCampaignJapan = () => {
  const supabase = getSupabaseClient('japan')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id') || searchParams.get('edit')

  // 현재 로그인한 사용자 정보
  const [currentUser, setCurrentUser] = useState(null)

  // 사용자 정보 로드
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (user) {
        setCurrentUser(user)
      } else {
        navigate('/login')
      }
    }
    fetchUser()
  }, [navigate])

  const [campaignForm, setCampaignForm] = useState({
    title: '',
    brand: '',
    description: '',
    requirements: '',
    category: 'beauty',
    image_url: '',
    reward_amount: 12000,
    max_participants: 10,
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    target_platforms: {
      instagram: true,
      youtube: false,
      tiktok: false
    },
    question1: '',
    question1_type: 'short',
    question1_options: '',
    question2: '',
    question2_type: 'short',
    question2_options: '',
    question3: '',
    question3_type: 'short',
    question3_options: '',
    question4: '',
    question4_type: 'short',
    question4_options: '',
    age_requirement: '',
    skin_type_requirement: '',
    offline_visit_requirement: '',
    package_type: 'junior',
    campaign_type: 'regular',
    total_slots: 10,
    remaining_slots: 10,
    estimated_cost: 220000,
    reward_points: 0,
    bonus_amount: 0,
    product_shipping_date: '',  // 제품 발송일
    week1_deadline: '',
    week2_deadline: '',
    week3_deadline: '',
    week4_deadline: '',
    week1_sns_deadline: '',  // 4주챌린지 SNS 업로드 마감일
    week2_sns_deadline: '',
    week3_sns_deadline: '',
    week4_sns_deadline: '',
    step1_deadline: '',
    step2_deadline: '',
    step1_sns_deadline: '',  // 메가와리 SNS 업로드 마감일
    step2_sns_deadline: '',
    video_deadline: '',
    sns_deadline: '',  // 기획형 SNS 업로드 마감일
    requires_ad_code: true,
    requires_clean_video: true,
    // 일본어 번역된 필드들
    title_ja: '',
    brand_ja: '',
    description_ja: '',
    requirements_ja: ''
  })

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const thumbnailInputRef = useRef(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationComplete, setTranslationComplete] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)

  useEffect(() => {
    if (editId) {
      loadCampaign()
    }
  }, [editId])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', editId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignForm({
          title: data.title || '',
          brand: data.brand || '',
          description: data.description || '',
          requirements: data.requirements || '',
          category: data.category || 'beauty',
          image_url: data.image_url || '',
          reward_amount: data.reward_amount || 0,
          max_participants: data.max_participants || 10,
          application_deadline: data.application_deadline ? data.application_deadline.split('T')[0] : '',
          start_date: data.start_date ? data.start_date.split('T')[0] : '',
          end_date: data.end_date ? data.end_date.split('T')[0] : '',
          status: data.status || 'draft',
          target_platforms: data.target_platforms || { instagram: true, youtube: false, tiktok: false },
          question1: data.question1 || '',
          question1_type: data.question1_type || 'short',
          question1_options: data.question1_options || '',
          question2: data.question2 || '',
          question2_type: data.question2_type || 'short',
          question2_options: data.question2_options || '',
          question3: data.question3 || '',
          question3_type: data.question3_type || 'short',
          question3_options: data.question3_options || '',
          question4: data.question4 || '',
          question4_type: data.question4_type || 'short',
          question4_options: data.question4_options || '',
          age_requirement: data.age_requirement || '',
          skin_type_requirement: data.skin_type_requirement || '',
          offline_visit_requirement: data.offline_visit_requirement || '',
          package_type: data.package_type || 'junior',
          campaign_type: data.campaign_type || 'regular',
          total_slots: data.max_participants || data.total_slots || 10,
          remaining_slots: data.max_participants || data.remaining_slots || 10,
          estimated_cost: data.estimated_cost || 0,
          bonus_amount: data.bonus_amount || 0,
          product_shipping_date: data.product_shipping_date ? data.product_shipping_date.split('T')[0] : '',
          week1_deadline: data.week1_deadline ? data.week1_deadline.split('T')[0] : '',
          week2_deadline: data.week2_deadline ? data.week2_deadline.split('T')[0] : '',
          week3_deadline: data.week3_deadline ? data.week3_deadline.split('T')[0] : '',
          week4_deadline: data.week4_deadline ? data.week4_deadline.split('T')[0] : '',
          week1_sns_deadline: data.week1_sns_deadline ? data.week1_sns_deadline.split('T')[0] : '',
          week2_sns_deadline: data.week2_sns_deadline ? data.week2_sns_deadline.split('T')[0] : '',
          week3_sns_deadline: data.week3_sns_deadline ? data.week3_sns_deadline.split('T')[0] : '',
          week4_sns_deadline: data.week4_sns_deadline ? data.week4_sns_deadline.split('T')[0] : '',
          step1_deadline: data.step1_deadline ? data.step1_deadline.split('T')[0] : '',
          step2_deadline: data.step2_deadline ? data.step2_deadline.split('T')[0] : '',
          step1_sns_deadline: data.step1_sns_deadline ? data.step1_sns_deadline.split('T')[0] : '',
          step2_sns_deadline: data.step2_sns_deadline ? data.step2_sns_deadline.split('T')[0] : '',
          video_deadline: data.video_deadline ? data.video_deadline.split('T')[0] : '',
          sns_deadline: data.sns_deadline ? data.sns_deadline.split('T')[0] : '',
          requires_ad_code: data.requires_ad_code !== false,
          requires_clean_video: data.requires_clean_video !== false,
          title_ja: data.title_ja || '',
          brand_ja: data.brand_ja || '',
          description_ja: data.description_ja || '',
          requirements_ja: data.requirements_ja || ''
        })
        // 이미 번역된 내용이 있으면 번역 완료 상태로 설정
        if (data.title_ja || data.description_ja) {
          setTranslationComplete(true)
        }
        // 질문 개수 설정
        const qCount = [data.question1, data.question2, data.question3, data.question4].filter(q => q && q.trim() !== '').length
        setQuestionCount(qCount)
      }
    } catch (err) {
      console.error('캠페인 로드 실패:', err)
      setError('캠페인 데이터를 불러오는데 실패했습니다: ' + err.message)
    }
  }

  // 캠페인 타입별 가격
  const campaignTypeOptions = [
    {
      value: 'regular',
      label: '기획형',
      labelJa: '企画型',
      price: 300000,
      description: '1개 영상 제작',
      descriptionJa: '1本の動画制作',
      features: ['맞춤 가이드라인', 'AI 크리에이터 매칭', 'SNS 업로드 URL', '2차 활용권'],
      featuresJa: ['カスタムガイド', 'AIマッチング', 'SNS URL', '二次利用権'],
      color: 'indigo',
      icon: '📹'
    },
    {
      value: 'megawari',
      label: '메가와리',
      labelJa: 'メガ割',
      price: 400000,
      description: '2개 영상 제작',
      descriptionJa: '2本の動画制作',
      features: ['2단계 콘텐츠', '세일 집중 기획', 'SNS 업로드 URL 2개', '2차 활용권'],
      featuresJa: ['2段階制作', 'セール集中企画', 'SNS URL 2個', '二次利用権'],
      color: 'orange',
      icon: '🎯'
    },
    {
      value: '4week_challenge',
      label: '4주 챌린지',
      labelJa: '4週チャレンジ',
      price: 600000,
      description: '4개 영상 제작',
      descriptionJa: '4本の動画制作',
      features: ['주차별 미션', 'Before & After', 'SNS 업로드 URL 4개', '높은 바이럴'],
      featuresJa: ['週別ミッション', 'Before & After', 'SNS URL 4個', '高バイラル'],
      color: 'purple',
      icon: '🗓️'
    }
  ]

  // 패키지 옵션 (크리에이터 등급) - 10만원씩 증가
  const packageOptions = [
    {
      value: 'junior',
      label: '초급',
      labelJa: '初級',
      priceAddon: 0,
      description: '팔로워 1만~5만',
      descriptionJa: 'フォロワー1万~5万',
      rewardYen: 12000
    },
    {
      value: 'intermediate',
      label: '중급',
      labelJa: '中級',
      priceAddon: 100000,
      description: '팔로워 5만~20만',
      descriptionJa: 'フォロワー5万~20万',
      rewardYen: 18000
    },
    {
      value: 'senior',
      label: '상급',
      labelJa: '上級',
      priceAddon: 200000,
      description: '팔로워 20만 이상',
      descriptionJa: 'フォロワー20万以上',
      rewardYen: 24000
    },
    {
      value: 'premium',
      label: '프리미엄',
      labelJa: 'プレミアム',
      priceAddon: 300000,
      description: '대형 인플루언서',
      descriptionJa: '大型インフルエンサー',
      rewardYen: 36000
    }
  ]

  // 가격 계산
  const calculatePrice = () => {
    const campaignType = campaignTypeOptions.find(t => t.value === campaignForm.campaign_type)
    const packageType = packageOptions.find(p => p.value === campaignForm.package_type)

    if (!campaignType || !packageType) return { base: 0, vat: 0, total: 0 }

    const basePrice = campaignType.price + packageType.priceAddon
    const subtotal = basePrice * campaignForm.total_slots
    const vat = Math.floor(subtotal * 0.1)
    const total = subtotal + vat

    return {
      unitPrice: basePrice,
      subtotal,
      vat,
      total
    }
  }

  const pricing = calculatePrice()

  // 예상 지원자 수 계산
  const getExpectedApplicants = () => {
    const base = 8
    const packageBonus = { junior: 0, intermediate: 3, senior: 6, premium: 10 }
    const min = base + (packageBonus[campaignForm.package_type] || 0)
    const max = min + 8
    return { min, max }
  }

  const expectedApplicants = getExpectedApplicants()

  // 핸들러
  const handleSlotsChange = (value) => {
    const slots = Math.max(1, parseInt(value) || 1)
    setCampaignForm(prev => ({
      ...prev,
      total_slots: slots,
      remaining_slots: slots,
      max_participants: slots
    }))
  }

  // 썸네일 업로드
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 파일은 5MB 이하로 업로드해주세요.')
      return
    }

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `campaign-${Date.now()}.${fileExt}`
      const filePath = `campaigns/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(filePath)

      setCampaignForm(prev => ({ ...prev, image_url: publicUrl }))
      setSuccess('썸네일 이미지가 업로드되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
      setError('이미지 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // AI 일괄 번역 (한국어 → 일본어)
  const translateAllFields = async () => {
    if (!campaignForm.title && !campaignForm.brand && !campaignForm.description && !campaignForm.requirements) {
      setError('번역할 내용이 없습니다. 캠페인 정보를 먼저 입력해주세요.')
      return
    }

    setIsTranslating(true)
    setError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) throw new Error('API 키가 설정되어 있지 않습니다.')

      const fieldsToTranslate = [
        { key: 'title', label: '제목', value: campaignForm.title },
        { key: 'brand', label: '브랜드', value: campaignForm.brand },
        { key: 'description', label: '설명', value: campaignForm.description },
        { key: 'requirements', label: '참가조건', value: campaignForm.requirements }
      ].filter(f => f.value && f.value.trim())

      if (fieldsToTranslate.length === 0) {
        setError('번역할 내용이 없습니다.')
        setIsTranslating(false)
        return
      }

      const textToTranslate = fieldsToTranslate.map(f => `[${f.label}]\n${f.value}`).join('\n\n')

      const prompt = `あなたは韓国語から日本語への翻訳専門家です。以下の韓国語テキストを日本語に翻訳してください。

要件:
- マーケティングコンテンツに適した自然な日本語で翻訳
- 各フィールドのラベルは日本語に変換: 제목→タイトル, 브랜드→ブランド, 설명→説明, 참가조건→参加条件
- ブランド名は翻訳せずそのまま維持
- 翻訳結果のみ出力（説明や補足は不要）

翻訳対象:
${textToTranslate}

出力形式:
[タイトル]
(翻訳結果)

[ブランド]
(翻訳結果)

[説明]
(翻訳結果)

[参加条件]
(翻訳結果)`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 에러: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || ''
      const cleanText = translatedText.replace(/\*\*/g, '').trim()

      console.log('번역 결과:', cleanText)

      // 번역 결과 파싱 (일본어 라벨로만 매칭)
      const titleMatch = cleanText.match(/\[タイトル\]\s*([\s\S]*?)(?=\n\[|$)/)
      const brandMatch = cleanText.match(/\[ブランド\]\s*([\s\S]*?)(?=\n\[|$)/)
      const descMatch = cleanText.match(/\[説明\]\s*([\s\S]*?)(?=\n\[|$)/)
      const reqMatch = cleanText.match(/\[参加条件\]\s*([\s\S]*?)(?=\n\[|$)/)

      const title_ja = titleMatch ? titleMatch[1].trim() : ''
      const brand_ja = brandMatch ? brandMatch[1].trim() : ''
      const description_ja = descMatch ? descMatch[1].trim() : ''
      const requirements_ja = reqMatch ? reqMatch[1].trim() : ''

      // 번역 결과가 없으면 에러
      if (!title_ja && !brand_ja && !description_ja && !requirements_ja) {
        throw new Error('번역 결과를 파싱할 수 없습니다. 다시 시도해주세요.')
      }

      setCampaignForm(prev => ({
        ...prev,
        title_ja: title_ja || prev.title_ja,
        brand_ja: brand_ja || prev.brand_ja,
        description_ja: description_ja || prev.description_ja,
        requirements_ja: requirements_ja || prev.requirements_ja
      }))

      setTranslationComplete(true)
      setSuccess('일본어 번역이 완료되었습니다! 이제 다음 단계로 진행할 수 있습니다.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      console.error('번역 오류:', err)
      setError('번역 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsTranslating(false)
    }
  }

  // 제출
  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      if (!campaignForm.title || !campaignForm.brand || !campaignForm.requirements) {
        throw new Error('제목, 브랜드, 참가조건은 필수 입력 항목입니다.')
      }

      if (!campaignForm.application_deadline || !campaignForm.start_date) {
        throw new Error('모집마감일, 선정발표일을 모두 입력해주세요.')
      }

      const hasSelectedPlatform = Object.values(campaignForm.target_platforms).some(Boolean)
      if (!hasSelectedPlatform) {
        throw new Error('하나 이상의 SNS 플랫폼을 선택해주세요.')
      }

      // 번역 확인
      if (!translationComplete && !campaignForm.title_ja) {
        const confirmWithoutTranslation = confirm('일본어 번역을 하지 않고 진행하시겠습니까?\n\n"AI 일본어 번역" 버튼을 눌러 번역을 먼저 진행하는 것을 권장합니다.')
        if (!confirmWithoutTranslation) {
          setProcessing(false)
          return
        }
      }

      const campaignType = campaignTypeOptions.find(t => t.value === campaignForm.campaign_type)
      const packageType = packageOptions.find(p => p.value === campaignForm.package_type)
      const price = pricing.total

      // 빈 문자열을 null로 변환하는 헬퍼 함수
      const toNullIfEmpty = (val) => (val && val.trim() !== '') ? val : null

      const campaignData = {
        title: campaignForm.title_ja || campaignForm.title,  // 일본어 번역 우선
        brand: campaignForm.brand_ja || campaignForm.brand,
        description: toNullIfEmpty(campaignForm.description_ja || campaignForm.description),
        requirements: campaignForm.requirements_ja || campaignForm.requirements,
        // 원본 한국어 필드 저장
        title_ko: toNullIfEmpty(campaignForm.title),
        brand_ko: toNullIfEmpty(campaignForm.brand),
        description_ko: toNullIfEmpty(campaignForm.description),
        requirements_ko: toNullIfEmpty(campaignForm.requirements),
        // 일본어 번역 필드 저장
        title_ja: toNullIfEmpty(campaignForm.title_ja),
        brand_ja: toNullIfEmpty(campaignForm.brand_ja),
        description_ja: toNullIfEmpty(campaignForm.description_ja),
        requirements_ja: toNullIfEmpty(campaignForm.requirements_ja),
        category: campaignForm.category,
        image_url: toNullIfEmpty(campaignForm.image_url),
        reward_amount: packageType?.rewardYen || 12000,
        max_participants: campaignForm.total_slots,
        application_deadline: toNullIfEmpty(campaignForm.application_deadline),
        start_date: toNullIfEmpty(campaignForm.start_date),
        status: 'draft',
        target_platforms: campaignForm.target_platforms,
        package_type: campaignForm.package_type,
        campaign_type: campaignForm.campaign_type,
        total_slots: campaignForm.total_slots,
        remaining_slots: campaignForm.total_slots,
        estimated_cost: price,
        requires_ad_code: campaignForm.requires_ad_code,
        requires_clean_video: campaignForm.requires_clean_video,
        question1: toNullIfEmpty(campaignForm.question1),
        question2: toNullIfEmpty(campaignForm.question2),
        question3: toNullIfEmpty(campaignForm.question3),
        question4: toNullIfEmpty(campaignForm.question4),
        product_shipping_date: toNullIfEmpty(campaignForm.product_shipping_date),
        // 기업 정보 - 캠페인 목록 조회에 필요
        company_email: currentUser?.email || null
      }

      // 캠페인 타입별 마감일
      if (campaignForm.campaign_type === '4week_challenge') {
        campaignData.week1_deadline = toNullIfEmpty(campaignForm.week1_deadline)
        campaignData.week2_deadline = toNullIfEmpty(campaignForm.week2_deadline)
        campaignData.week3_deadline = toNullIfEmpty(campaignForm.week3_deadline)
        campaignData.week4_deadline = toNullIfEmpty(campaignForm.week4_deadline)
        campaignData.week1_sns_deadline = toNullIfEmpty(campaignForm.week1_sns_deadline)
        campaignData.week2_sns_deadline = toNullIfEmpty(campaignForm.week2_sns_deadline)
        campaignData.week3_sns_deadline = toNullIfEmpty(campaignForm.week3_sns_deadline)
        campaignData.week4_sns_deadline = toNullIfEmpty(campaignForm.week4_sns_deadline)
      } else if (campaignForm.campaign_type === 'megawari') {
        campaignData.step1_deadline = toNullIfEmpty(campaignForm.step1_deadline)
        campaignData.step2_deadline = toNullIfEmpty(campaignForm.step2_deadline)
        campaignData.step1_sns_deadline = toNullIfEmpty(campaignForm.step1_sns_deadline)
        campaignData.step2_sns_deadline = toNullIfEmpty(campaignForm.step2_sns_deadline)
      } else {
        campaignData.video_deadline = toNullIfEmpty(campaignForm.video_deadline)
        campaignData.sns_deadline = toNullIfEmpty(campaignForm.sns_deadline)
      }

      if (editId) {
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (error) throw error

        setSuccess('캠페인이 업데이트되었습니다!')
        setTimeout(() => navigate(`/company/campaigns/guide/japan?id=${editId}`), 1500)
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert([campaignData])
          .select()

        if (error) throw error

        setSuccess('캠페인이 생성되었습니다!')
        setTimeout(() => navigate(`/company/campaigns/guide/japan?id=${data[0].id}`), 1500)
      }
    } catch (err) {
      console.error('캠페인 저장 실패:', err)
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const colorMap = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-100', btn: 'bg-indigo-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-600', ring: 'ring-orange-100', btn: 'bg-orange-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-600', ring: 'ring-purple-100', btn: 'bg-purple-600' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gray-50 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')} className="text-gray-500 hover:text-gray-700">
            ← 캠페인 목록으로
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">🇯🇵</span>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">일본 캠페인 생성</h1>
          </div>
          <p className="text-gray-500 text-sm lg:text-base">일본 시장 대상 인플루언서 마케팅 캠페인</p>
          <p className="text-indigo-600 text-sm mt-2 font-medium">💡 한국어로 작성 후 마지막에 AI 번역 버튼으로 일본어로 변환됩니다</p>
        </div>

        {/* 캠페인 타입 선택 */}
        <div className="px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto">
            {campaignTypeOptions.map((type) => {
              const colors = colorMap[type.color]
              const isSelected = campaignForm.campaign_type === type.value
              const packageAddon = packageOptions.find(p => p.value === campaignForm.package_type)?.priceAddon || 0
              const displayPrice = type.price + packageAddon

              return (
                <div
                  key={type.value}
                  onClick={() => setCampaignForm(prev => ({ ...prev, campaign_type: type.value }))}
                  className={`relative bg-white rounded-xl border-2 p-5 lg:p-6 transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? `${colors.border} shadow-lg ring-2 ${colors.ring}`
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {type.value === 'regular' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                        ✨ 인기
                      </span>
                    </div>
                  )}

                  <div className="mb-4 pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{type.icon}</span>
                      <h3 className={`text-base font-bold ${isSelected ? colors.text : 'text-gray-900'}`}>
                        {type.label}
                      </h3>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl lg:text-3xl font-bold text-gray-900">₩{displayPrice.toLocaleString()}</span>
                      <span className="text-gray-500 text-sm">/명</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">{type.description}</p>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-4 ${
                      isSelected
                        ? `${colors.btn} text-white shadow-md`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    선택하기
                  </button>

                  <ul className="space-y-2 text-sm flex-1">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <svg className={`w-4 h-4 ${colors.text} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 알림 메시지 */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠: 2컬럼 레이아웃 */}
      <div className="bg-gray-50 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 왼쪽: 폼 */}
              <div className="lg:col-span-2 space-y-8">
                {/* 크리에이터 등급 선택 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">크리에이터 등급 선택</h2>
                  <p className="text-gray-500 mb-6 text-sm">예산에 따라 크리에이터의 퀄리티가 달라집니다.</p>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {packageOptions.map((pkg) => {
                      const campaignType = campaignTypeOptions.find(t => t.value === campaignForm.campaign_type)
                      const displayPrice = (campaignType?.price || 300000) + pkg.priceAddon
                      const isSelected = campaignForm.package_type === pkg.value

                      return (
                        <div
                          key={pkg.value}
                          onClick={() => setCampaignForm(prev => ({ ...prev, package_type: pkg.value }))}
                          className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          {pkg.value === 'intermediate' && (
                            <span className="absolute -top-2.5 right-3 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded">추천</span>
                          )}
                          <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>
                            {pkg.label}
                          </div>
                          <div className="text-xl font-bold text-gray-900 mb-2">
                            ₩{displayPrice.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{pkg.description}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 모집 인원 슬라이더 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-gray-700">모집 인원</Label>
                      <span className="text-indigo-600 font-bold text-lg">{campaignForm.total_slots}명</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={campaignForm.total_slots}
                        onChange={(e) => handleSlotsChange(e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex items-center border rounded-lg bg-white">
                        <button
                          type="button"
                          onClick={() => handleSlotsChange(Math.max(1, campaignForm.total_slots - 1))}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg text-lg"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={campaignForm.total_slots}
                          onChange={(e) => handleSlotsChange(e.target.value)}
                          className="w-16 text-center border-x py-2"
                          min="1"
                        />
                        <button
                          type="button"
                          onClick={() => handleSlotsChange(campaignForm.total_slots + 1)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg text-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* AI 예상 지원자 */}
                    <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-indigo-600">AI 예측:</span>{' '}
                            현재 설정으로 약{' '}
                            <span className="font-bold text-indigo-700">{expectedApplicants.min}~{expectedApplicants.max}명</span>
                            의 크리에이터가 지원할 것으로 예상됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 캠페인 일정 통합 섹션 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">📅 캠페인 일정</h2>

                  {/* 기본 일정 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <Label className="text-sm font-semibold">모집 마감일 *</Label>
                      <Input
                        type="date"
                        value={campaignForm.application_deadline}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">선정 발표일 *</Label>
                      <Input
                        type="date"
                        value={campaignForm.start_date}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">제품 발송일</Label>
                      <Input
                        type="date"
                        value={campaignForm.product_shipping_date}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, product_shipping_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* 캠페인 타입별 마감일 설정 */}
                {campaignForm.campaign_type === '4week_challenge' && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border-2 border-purple-200">
                    <h3 className="font-bold text-purple-800 mb-4 flex items-center gap-2">
                      🗓️ 4주 챌린지 스케줄
                    </h3>
                    <div className="space-y-6">
                      {/* 영상 제출 마감일 */}
                      <div>
                        <Label className="text-sm font-semibold text-purple-700 mb-3 block">영상 제출 마감일</Label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map(week => (
                            <div key={week}>
                              <Label className="text-sm">{week}주차</Label>
                              <Input
                                type="date"
                                value={campaignForm[`week${week}_deadline`]}
                                onChange={(e) => setCampaignForm(prev => ({ ...prev, [`week${week}_deadline`]: e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* SNS 업로드 마감일 */}
                      <div>
                        <Label className="text-sm font-semibold text-purple-700 mb-3 block">SNS 업로드 마감일</Label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map(week => (
                            <div key={week}>
                              <Label className="text-sm">{week}주차</Label>
                              <Input
                                type="date"
                                value={campaignForm[`week${week}_sns_deadline`]}
                                onChange={(e) => setCampaignForm(prev => ({ ...prev, [`week${week}_sns_deadline`]: e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {campaignForm.campaign_type === 'megawari' && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border-2 border-orange-200">
                    <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                      🎯 메가와리 스케줄
                    </h3>
                    <div className="space-y-6">
                      {/* 영상 제출 마감일 */}
                      <div>
                        <Label className="text-sm font-semibold text-orange-700 mb-3 block">영상 제출 마감일</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">스텝1</Label>
                            <Input
                              type="date"
                              value={campaignForm.step1_deadline}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, step1_deadline: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">스텝2</Label>
                            <Input
                              type="date"
                              value={campaignForm.step2_deadline}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, step2_deadline: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                      {/* SNS 업로드 마감일 */}
                      <div>
                        <Label className="text-sm font-semibold text-orange-700 mb-3 block">SNS 업로드 마감일</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">스텝1</Label>
                            <Input
                              type="date"
                              value={campaignForm.step1_sns_deadline}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, step1_sns_deadline: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-sm">스텝2</Label>
                            <Input
                              type="date"
                              value={campaignForm.step2_sns_deadline}
                              onChange={(e) => setCampaignForm(prev => ({ ...prev, step2_sns_deadline: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {campaignForm.campaign_type === 'regular' && (
                  <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border-2 border-green-200">
                    <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                      📹 기획형 스케줄
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">영상 제출 마감일</Label>
                        <Input
                          type="date"
                          value={campaignForm.video_deadline}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, video_deadline: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SNS 업로드 마감일</Label>
                        <Input
                          type="date"
                          value={campaignForm.sns_deadline}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, sns_deadline: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 캠페인 기본 정보 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">캠페인 정보 (한국어로 작성)</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">캠페인 제목 *</Label>
                        <Input
                          id="title"
                          value={campaignForm.title}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="캠페인 제목을 입력하세요"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">브랜드 *</Label>
                        <Input
                          id="brand"
                          value={campaignForm.brand}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="브랜드명을 입력하세요"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">캠페인 설명</Label>
                      <Textarea
                        id="description"
                        value={campaignForm.description}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        placeholder="캠페인에 대한 설명을 입력하세요"
                      />
                    </div>

                    <div>
                      <Label htmlFor="requirements">참가 조건 *</Label>
                      <Textarea
                        id="requirements"
                        value={campaignForm.requirements}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, requirements: e.target.value }))}
                        rows={3}
                        placeholder="참가 조건을 입력하세요"
                        required
                      />
                    </div>

                    <div>
                      <Label>썸네일 이미지</Label>
                      <input
                        type="file"
                        ref={thumbnailInputRef}
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleThumbnailUpload}
                        disabled={uploadingImage}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      {uploadingImage && <p className="text-sm text-blue-600 mt-1">업로드 중...</p>}
                      {campaignForm.image_url && (
                        <img src={campaignForm.image_url} alt="Preview" className="h-24 w-auto mt-2 rounded border" />
                      )}
                    </div>
                  </div>
                </div>

                {/* SNS 플랫폼 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">📱 SNS 플랫폼</h2>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { key: 'instagram', label: '📷 Instagram' },
                      { key: 'youtube', label: '🎥 YouTube' },
                      { key: 'tiktok', label: '🎵 TikTok' }
                    ].map(platform => (
                      <label key={platform.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={campaignForm.target_platforms[platform.key]}
                          onChange={(e) => setCampaignForm(prev => ({
                            ...prev,
                            target_platforms: { ...prev.target_platforms, [platform.key]: e.target.checked }
                          }))}
                          className="w-5 h-5 text-indigo-600 rounded"
                        />
                        <span>{platform.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 추가 옵션 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">추가 옵션</h2>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignForm.requires_ad_code}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, requires_ad_code: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="font-medium">광고 코드 요청</span>
                        <p className="text-xs text-gray-500">크리에이터에게 광고 코드 제출을 요청합니다</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignForm.requires_clean_video}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, requires_clean_video: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 rounded"
                      />
                      <div>
                        <span className="font-medium">클린 영상 요청</span>
                        <p className="text-xs text-gray-500">자막 없는 버전의 영상도 함께 제출받습니다</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* 지원자 질문 섹션 */}
                <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </span>
                      지원자 질문
                      <span className="text-sm font-normal text-gray-400">(선택사항)</span>
                    </h3>
                    {questionCount < 4 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuestionCount(prev => Math.min(prev + 1, 4))}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        질문 추가
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-5 ml-10">지원자에게 물어볼 질문을 최대 4개까지 추가할 수 있습니다.</p>

                  <div className="space-y-4">
                    {questionCount >= 1 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <Label htmlFor="question1" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                          <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">1</span>
                          질문 1
                        </Label>
                        <Textarea
                          id="question1"
                          value={campaignForm.question1}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, question1: e.target.value }))}
                          placeholder="예: 본인의 피부 타입과 주요 피부 고민을 알려주세요."
                          rows={2}
                          className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                        />
                      </div>
                    )}
                    {questionCount >= 2 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <Label htmlFor="question2" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                          <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">2</span>
                          질문 2
                        </Label>
                        <Textarea
                          id="question2"
                          value={campaignForm.question2}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, question2: e.target.value }))}
                          placeholder="예: 해당 브랜드/제품을 사용해본 경험이 있나요?"
                          rows={2}
                          className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                        />
                      </div>
                    )}
                    {questionCount >= 3 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <Label htmlFor="question3" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                          <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">3</span>
                          질문 3
                        </Label>
                        <Textarea
                          id="question3"
                          value={campaignForm.question3}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, question3: e.target.value }))}
                          placeholder="예: 이 캠페인에 지원하신 동기는 무엇인가요?"
                          rows={2}
                          className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                        />
                      </div>
                    )}
                    {questionCount >= 4 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <Label htmlFor="question4" className="text-sm font-medium text-violet-700 mb-2 block flex items-center gap-2">
                          <span className="w-5 h-5 bg-violet-100 text-violet-600 rounded-full text-xs flex items-center justify-center font-bold">4</span>
                          질문 4
                        </Label>
                        <Textarea
                          id="question4"
                          value={campaignForm.question4}
                          onChange={(e) => setCampaignForm(prev => ({ ...prev, question4: e.target.value }))}
                          placeholder="예: 캠페인 관련하여 추가로 알려주실 내용이 있나요?"
                          rows={2}
                          className="border-gray-200 focus:border-violet-500 focus:ring-violet-500 resize-none bg-white"
                        />
                      </div>
                    )}
                    {questionCount === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-sm">위의 "질문 추가" 버튼을 클릭하여 질문을 추가하세요</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI 번역 섹션 */}
                <div className={`rounded-2xl p-6 lg:p-8 shadow-sm border-2 ${translationComplete ? 'bg-green-50 border-green-300' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${translationComplete ? 'bg-green-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        <Languages className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold ${translationComplete ? 'text-green-800' : 'text-blue-900'}`}>
                          {translationComplete ? '✅ 일본어 번역 완료!' : '🌏 AI 일본어 번역'}
                        </h3>
                        <p className={`text-sm ${translationComplete ? 'text-green-600' : 'text-blue-700'}`}>
                          {translationComplete
                            ? '한국어 내용이 일본어로 번역되었습니다'
                            : '작성한 한국어 내용을 일본어로 자동 번역합니다'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={translateAllFields}
                      disabled={isTranslating}
                      className={`flex items-center gap-2 ${translationComplete ? 'bg-green-600 hover:bg-green-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'} text-white px-6 py-3 text-base`}
                    >
                      {isTranslating ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> 번역 중...</>
                      ) : translationComplete ? (
                        <><Sparkles className="w-5 h-5" /> 다시 번역하기</>
                      ) : (
                        <><Sparkles className="w-5 h-5" /> AI 일본어 번역</>
                      )}
                    </Button>
                  </div>

                  {/* 번역 결과 미리보기 */}
                  {translationComplete && (campaignForm.title_ja || campaignForm.description_ja) && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <span>🇯🇵</span> 번역된 일본어 내용
                      </h4>
                      <div className="space-y-2 text-sm">
                        {campaignForm.title_ja && (
                          <div>
                            <span className="text-gray-500">제목:</span>{' '}
                            <span className="text-gray-800">{campaignForm.title_ja}</span>
                          </div>
                        )}
                        {campaignForm.brand_ja && (
                          <div>
                            <span className="text-gray-500">브랜드:</span>{' '}
                            <span className="text-gray-800">{campaignForm.brand_ja}</span>
                          </div>
                        )}
                        {campaignForm.description_ja && (
                          <div>
                            <span className="text-gray-500">설명:</span>{' '}
                            <span className="text-gray-800">{campaignForm.description_ja}</span>
                          </div>
                        )}
                        {campaignForm.requirements_ja && (
                          <div>
                            <span className="text-gray-500">참가조건:</span>{' '}
                            <span className="text-gray-800">{campaignForm.requirements_ja}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 오른쪽: 견적 + 미리보기 */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-4">
                  {/* 견적서 - 컴팩트 */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold flex items-center gap-2">📋 견적서</h3>
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>{expectedApplicants.min}~{expectedApplicants.max}명 예상</span>
                      </div>
                    </div>

                    {/* 상세 내역 - 컴팩트 */}
                    <div className="space-y-2 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{campaignTypeOptions.find(t => t.value === campaignForm.campaign_type)?.label} · {packageOptions.find(p => p.value === campaignForm.package_type)?.label}</span>
                        <span>₩{pricing.unitPrice?.toLocaleString()} × {campaignForm.total_slots}명</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>부가세 (10%)</span>
                        <span>₩{pricing.vat?.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 총액 */}
                    <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">총액</span>
                        <span className="text-2xl font-bold">₩{pricing.total?.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 번역 상태 */}
                    {!translationComplete ? (
                      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 mb-3">
                        <p className="text-yellow-300 text-xs text-center">⚠️ AI 일본어 번역을 완료해주세요</p>
                      </div>
                    ) : (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2 mb-3">
                        <p className="text-green-300 text-xs text-center">✅ 번역 완료</p>
                      </div>
                    )}

                    {/* 제출 버튼 */}
                    <Button
                      type="submit"
                      disabled={processing}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-2.5 rounded-xl font-semibold text-sm"
                    >
                      {processing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 처리 중...</>
                      ) : (
                        <>다음 단계로 <ChevronRight className="w-4 h-4 ml-1" /></>
                      )}
                    </Button>
                  </div>

                  {/* 캠페인 미리보기 - 컴팩트 */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gray-100 px-3 py-1.5 border-b">
                      <p className="text-xs text-gray-500 text-center font-medium">📱 크리에이터 노출 화면</p>
                    </div>

                    {/* 썸네일 */}
                    <div className="aspect-[16/9] bg-gray-200 relative">
                      {campaignForm.image_url ? (
                        <img src={campaignForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px]">썸네일 없음</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      {/* 플랫폼 & 리워드 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1">
                          {campaignForm.target_platforms.instagram && (
                            <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] rounded-full">IG</span>
                          )}
                          {campaignForm.target_platforms.youtube && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">YT</span>
                          )}
                          {campaignForm.target_platforms.tiktok && (
                            <span className="px-1.5 py-0.5 bg-black text-white text-[10px] rounded-full">TT</span>
                          )}
                        </div>
                        <span className="text-blue-600 font-bold text-xs">¥{(packageOptions.find(p => p.value === campaignForm.package_type)?.rewardYen || 12000).toLocaleString()}</span>
                      </div>

                      {/* 제목 */}
                      <h4 className="font-bold text-gray-900 mb-1 line-clamp-1 text-xs">
                        {campaignForm.title_ja || campaignForm.title || 'キャンペーンタイトル'}
                      </h4>

                      {/* 마감일 & 인원 */}
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                        <span>締切: {campaignForm.application_deadline ? new Date(campaignForm.application_deadline).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '未定'}</span>
                        <span>·</span>
                        <span>{campaignForm.total_slots}名募集</span>
                      </div>

                      {/* 지원 버튼 */}
                      <button className="w-full py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-lg">
                        今すぐ応募
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateCampaignJapan
