import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient, supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'

const CreateCampaignUS = () => {
  const supabase = getSupabaseClient('us')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id') || searchParams.get('edit')  // id 또는 edit 파라미터 모두 지원

  const [campaignForm, setCampaignForm] = useState({
    title: '',
    brand: '',
    description: '',
    requirements: '',
    category: 'beauty',
    image_url: '',
    reward_amount: 30,  // 초급 패키지 기본 보상 (달러)
    max_participants: 10,
    application_deadline: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    target_platforms: {
      instagram: true,  // 기본값으로 Instagram 선택
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
    // 결제 관련
    package_type: 'junior',
    total_slots: 10,
    remaining_slots: 10,
    estimated_cost: 220000  // VAT 포함 원화
  })

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const thumbnailInputRef = useRef(null)

  // 번역 시스템 state
  const [koreanText, setKoreanText] = useState('')
  const [useseText, setUSeseText] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')

  // 캠페인 로드 (editId가 있을 때)
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
          total_slots: data.total_slots || data.max_participants || 10,
          remaining_slots: data.remaining_slots || data.total_slots || 10,
          estimated_cost: data.estimated_cost || 0
        })
        
        // 비용 재계산 (데이터 로드 후)
        setTimeout(() => {
          const selectedPackage = packageOptions.find(p => p.value === (data.package_type || 'junior'))
          if (selectedPackage) {
            const slots = data.total_slots || data.max_participants || 10
            const finalCost = calculateFinalCost(selectedPackage.price, slots)
            setCampaignForm(prev => ({ ...prev, estimated_cost: finalCost }))
          }
        }, 100)
        
        console.log('캠페인 데이터 로드 성공:', data)
      }
    } catch (err) {
      console.error('캠페인 로드 실패:', err)
      setError('캠페인 데이터를 불러오는데 실패했습니다: ' + err.message)
    }
  }

  // 패키지 옵션 (원화 결제, 달러 보상)
  const packageOptions = [
    { 
      value: 'junior', 
      label: '초급 크리에이터 패키지', 
      price: 200000,  // 원화
      priceWithVat: 220000,
      rewardYen: 30,  // 달러 보상
      description: '팔로워 1만~5만 (인스타 기준)',
      expectedApplicants: { youtube: 5, instagram: 8, tiktok: 10 }
    },
    { 
      value: 'intermediate', 
      label: '중급 크리에이터 패키지', 
      price: 300000,
      priceWithVat: 330000,
      rewardYen: 45,
      description: '팔로워 5만~20만 (인스타 기준)',
      expectedApplicants: { youtube: 10, instagram: 15, tiktok: 15 }
    },
    { 
      value: 'senior', 
      label: '상급 크리에이터 패키지', 
      price: 400000,
      priceWithVat: 440000,
      rewardYen: 60,
      description: '팔로워 20만 이상 (인스타 기준)',
      expectedApplicants: { youtube: 15, instagram: 25, tiktok: 20 }
    },
    { 
      value: '4week_challenge', 
      label: '4주 챌린지 프로그램', 
      price: 600000,
      priceWithVat: 660000,
      rewardYen: 90,
      description: '4주간 지속적인 콘텐츠 제작',
      expectedApplicants: { youtube: 8, instagram: 15, tiktok: 12 }
    }
  ]

  // 할인율 계산
  const calculateDiscount = (amount) => {
    if (amount >= 10000000) return 5
    return 0
  }

  // 최종 결제 금액 계산
  const calculateFinalCost = (packagePrice, slots) => {
    const originalCost = packagePrice * slots
    const vat = Math.floor(originalCost * 0.1)
    const discountRate = calculateDiscount(originalCost)
    const discountAmount = Math.floor(originalCost * (discountRate / 100))
    return originalCost + vat - discountAmount
  }

  // 패키지 변경 핸들러
  const handlePackageChange = (value) => {
    const selectedPackage = packageOptions.find(p => p.value === value)
    if (selectedPackage) {
      setCampaignForm(prev => {
        const finalCost = calculateFinalCost(selectedPackage.price, prev.total_slots)
        return {
        ...prev,
        package_type: value,
        estimated_cost: finalCost,
        reward_amount: selectedPackage.rewardYen,  // 달러 보상 자동 설정
        max_participants: prev.total_slots
      }
      })
    }
  }

  // 모집 인원 변경 핸들러
  const handleSlotsChange = (value) => {
    const slots = parseInt(value) || 0
    const selectedPackage = packageOptions.find(p => p.value === campaignForm.package_type)
    const finalCost = selectedPackage ? calculateFinalCost(selectedPackage.price, slots) : 0
    
    setCampaignForm(prev => ({
      ...prev,
      total_slots: slots,
      remaining_slots: slots,
      max_participants: slots,
      estimated_cost: finalCost
    }))
  }

  // 번역 함수
  const translateText = async (text) => {
    if (!text.trim()) return

    setIsTranslating(true)
    setTranslationError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                text: `다음 한국어 텍스트를 미국어로 자연스럽게 번역해주세요. 번역 결과만 출력하세요:\n\n${text}` 
              }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'
      setUSeseText(translatedText.trim())
    } catch (error) {
      console.error('번역 오류:', error)
      setTranslationError(error.message || '번역 중 오류가 발생했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  // 일괄 번역 함수
  const translateAllFields = async () => {
    if (!campaignForm.title && !campaignForm.brand && !campaignForm.description && !campaignForm.requirements) {
      setTranslationError('번역할 내용이 없습니다.')
      return
    }

    setIsTranslating(true)
    setTranslationError('')

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다.')
      }

      const fieldsToTranslate = [
        { key: 'title', label: '제목', value: campaignForm.title },
        { key: 'brand', label: '브랜드', value: campaignForm.brand },
        { key: 'description', label: '설명', value: campaignForm.description },
        { key: 'requirements', label: '참가조건', value: campaignForm.requirements },
        { key: 'question1', label: '질문1', value: campaignForm.question1 },
        { key: 'question2', label: '질문2', value: campaignForm.question2 },
        { key: 'question3', label: '질문3', value: campaignForm.question3 },
        { key: 'question4', label: '질문4', value: campaignForm.question4 },
        { key: 'offline_visit_requirement', label: '오프라인방문', value: campaignForm.offline_visit_requirement }
      ].filter(f => f.value && f.value.trim())

      const textToTranslate = fieldsToTranslate.map(f => `[${f.label}]\n${f.value}`).join('\n\n')

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ 
                  text: `Please translate the following Korean campaign information into natural English. Maintain the format for each field like [Title], [Brand], [Description], [Requirements], [Question1], [Question2], [Question3], [Question4], [Offline Visit], and output only the translation results:

${textToTranslate}` 
              }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
          })
        }
      )

      if (!response.ok) throw new Error(`API 오류: ${response.status}`)

      const data = await response.json()
      const translatedText = data.candidates[0]?.content?.parts[0]?.text || '번역 실패'

      console.log('=== 일괄 번역 결과 ====')
      console.log('원본:', textToTranslate)
      console.log('번역:', translatedText)

      // Parse translation results (support Korean/English labels, remove bold markdown)
      const cleanText = translatedText.replace(/\*\*/g, '') // Remove bold markdown
      
      const titleMatch = cleanText.match(/\[(제목|Title)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const brandMatch = cleanText.match(/\[(브랜드|Brand)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const descMatch = cleanText.match(/\[(설명|Description)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const reqMatch = cleanText.match(/\[(참가조건|Requirements)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const q1Match = cleanText.match(/\[(질문1|Question1)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const q2Match = cleanText.match(/\[(질문2|Question2)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const q3Match = cleanText.match(/\[(질문3|Question3)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const q4Match = cleanText.match(/\[(질문4|Question4)\]\s*([\s\S]*?)(?=\n\[|$)/i)
      const offlineMatch = cleanText.match(/\[(오프라인방문|Offline Visit)\]\s*([\s\S]*?)(?=\n\[|$)/i)

      console.log('파싱 결과:')
      console.log('- 제목:', titleMatch ? titleMatch[2].trim() : 'null')
      console.log('- 브랜드:', brandMatch ? brandMatch[2].trim() : 'null')
      console.log('- 설명:', descMatch ? descMatch[2].trim() : 'null')
      console.log('- 참가조건:', reqMatch ? reqMatch[2].trim() : 'null')
      console.log('- 질문1:', q1Match ? q1Match[2].trim() : 'null')
      console.log('- 질문2:', q2Match ? q2Match[2].trim() : 'null')
      console.log('- 질문3:', q3Match ? q3Match[2].trim() : 'null')
      console.log('- 질문4:', q4Match ? q4Match[2].trim() : 'null')
      console.log('- 오프라인방문:', offlineMatch ? offlineMatch[2].trim() : 'null')

      const newForm = {
        ...campaignForm,
        title: titleMatch ? titleMatch[2].trim() : campaignForm.title,
        brand: brandMatch ? brandMatch[2].trim() : campaignForm.brand,
        description: descMatch ? descMatch[2].trim() : campaignForm.description,
        requirements: reqMatch ? reqMatch[2].trim() : campaignForm.requirements,
        question1: q1Match ? q1Match[2].trim() : campaignForm.question1,
        question2: q2Match ? q2Match[2].trim() : campaignForm.question2,
        question3: q3Match ? q3Match[2].trim() : campaignForm.question3,
        question4: q4Match ? q4Match[2].trim() : campaignForm.question4,
        offline_visit_requirement: offlineMatch ? offlineMatch[2].trim() : campaignForm.offline_visit_requirement
      }

      console.log('업데이트 후 폼:', newForm)
      setCampaignForm(newForm)

      setSuccess('일괄 번역이 완료되었습니다!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('일괄 번역 오류:', error)
      setTranslationError(error.message || '일괄 번역 중 오류가 발생했습니다.')
    } finally {
      setIsTranslating(false)
    }
  }

  // 클립보드 복사
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('클립보드에 복사되었습니다!')
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
    }
  }

  // 썸네일 이미지 업로드
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('이미지 파일은 5MB 이하여야 합니다.')
      return
    }

    // 파일 형식 체크
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, WEBP 형식만 업로드 가능합니다.')
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
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
      setError('이미지 업로드에 실패했습니다: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // 임시저장
  const handleSaveDraft = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      // 최소 필수 필드만 검증
      if (!campaignForm.title || !campaignForm.brand) {
        throw new Error('제목과 브랜드는 필수 입력 항목입니다.')
      }

      // 로그인 정보 가져오기
      let userEmail = null
      try {
        const { data: { user } } = await supabaseBiz.auth.getUser()
        if (user) userEmail = user.email
      } catch (authError) {
        console.warn('로그인 정보를 가져올 수 없습니다:', authError)
      }

      const campaignData = {
        title: updatedForm.title,
        brand: updatedForm.brand,
        description: campaignForm.description || '',
        requirements: campaignForm.requirements || '',
        category: campaignForm.category,
        image_url: campaignForm.image_url || '',
        reward_amount: campaignForm.reward_amount,
        max_participants: campaignForm.total_slots,
        total_slots: campaignForm.total_slots,
        remaining_slots: campaignForm.total_slots,
        estimated_cost: campaignForm.estimated_cost,
        application_deadline: campaignForm.application_deadline || null,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        status: 'draft',  // 임시저장 상태
        target_platforms: campaignForm.target_platforms,
        question1: campaignForm.question1 || '',
        question1_type: campaignForm.question1_type || 'short',
        question1_options: campaignForm.question1_options || '',
        question2: campaignForm.question2 || '',
        question2_type: campaignForm.question2_type || 'short',
        question2_options: campaignForm.question2_options || '',
        question3: campaignForm.question3 || '',
        question3_type: campaignForm.question3_type || 'short',
        question3_options: updatedForm.question3_options || '',
        question4: updatedForm.question4 || '',
        question4_type: updatedForm.question4_type || 'short',
        question4_options: updatedForm.question4_options || '',
        age_requirement: updatedForm.age_requirement || '',
        skin_type_requirement: updatedForm.skin_type_requirement || '',
        offline_visit_requirement: updatedForm.offline_visit_requirement || '',
        package_type: campaignForm.package_type || 'junior',  // 패키지 타입 저장
        estimated_cost: campaignForm.estimated_cost || 0,  // 예상 비용 저장
        company_id: null  // 생성 시 설정됨
        // company_email 제거: 미국 쫠페인 DB 스키마에 없음
      }

      if (editId) {
        // 수정 모드
        const { error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)

        if (error) throw error
        setSuccess('임시저장되었습니다!')
      } else {
        // 신규 생성
        const { data, error } = await supabase
          .from('campaigns')
          .insert([campaignData])
          .select()

        if (error) throw error
        setSuccess('임시저장되었습니다!')
        
        setTimeout(() => {
          navigate(`/company/campaigns/create/us?id=${data[0].id}`)
        }, 1500)
      }
    } catch (err) {
      console.error('임시저장 실패:', err)
      setError('임시저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  // 캐페인 저장
  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    setError('')
    setSuccess('')

    console.log('[DEBUG] handleSubmit 시작')

    try {
      // DOM에서 직접 날짜 값 읽기 (React state 동기화 문제 해결)
      const appDeadlineValue = document.getElementById('application_deadline')?.value || ''
      const startDateValue = document.getElementById('start_date')?.value || ''
      const endDateValue = document.getElementById('end_date')?.value || ''

      // 모든 필드를 DOM에서 직접 읽기
      // SNS 플랫폼 체크박스 상태를 DOM에서 직접 읽기
      const checkboxes = document.querySelectorAll('input[type="checkbox"]')
      const target_platforms = {
        instagram: checkboxes[0]?.checked || false,
        youtube: checkboxes[1]?.checked || false,
        tiktok: checkboxes[2]?.checked || false
      }

      // 필수 필드 검증
      if (!campaignForm.title || !campaignForm.brand || !campaignForm.requirements) {
        throw new Error('제목, 브랜드, 참가조건은 필수 입력 항목입니다.')
      }

      if (!campaignForm.application_deadline || !campaignForm.start_date || !campaignForm.end_date) {
        throw new Error('모집 마감일, 모집 발표일, 촬영 마감일을 모두 입력해주세요.')
      }

      // 날짜 논리 검증
      const applicationDeadline = new Date(campaignForm.application_deadline)
      const startDate = new Date(campaignForm.start_date)
      const endDate = new Date(campaignForm.end_date)

      if (applicationDeadline >= startDate) {
        throw new Error('모집 마감일은 모집 발표일보다 이전이어야 합니다.')
      }

      if (startDate >= endDate) {
        throw new Error('모집 발표일은 촬영 마감일보다 이전이어야 합니다.')
      }

      // SNS 플랫폼 검증
      const hasSelectedPlatform = Object.values(campaignForm.target_platforms).some(Boolean)
      if (!hasSelectedPlatform) {
        throw new Error('최소 하나의 SNS 플랫폼을 선택해주세요.')
      }

      // 로그인 정보 가져오기
      console.log('[DEBUG] 로그인 정보 가져오기 시작')
      let userEmail = null
      try {
        const { data: { user } } = await supabaseBiz.auth.getUser()
        console.log('[DEBUG] supabaseBiz.auth.getUser() 결과:', user)
        if (user) userEmail = user.email
      } catch (authError) {
        console.warn('로그인 정보를 가져올 수 없습니다:', authError)
      }

      const campaignData = {
        title: campaignForm.title,
        brand: campaignForm.brand,
        description: campaignForm.description || '',
        requirements: campaignForm.requirements || '',
        category: campaignForm.category,
        package_type: campaignForm.package_type,
        image_url: campaignForm.image_url || '',
        reward_amount: campaignForm.reward_amount,  // 달러 보상
        max_participants: campaignForm.total_slots,
        total_slots: campaignForm.total_slots,
        remaining_slots: campaignForm.total_slots,
        estimated_cost: campaignForm.estimated_cost,
        application_deadline: campaignForm.application_deadline,
        start_date: campaignForm.start_date,
        end_date: campaignForm.end_date,
        status: campaignForm.status,
        target_platforms: campaignForm.target_platforms,
        question1: campaignForm.question1 || '',
        question1_type: campaignForm.question1_type || 'short',
        question1_options: campaignForm.question1_options || '',
        question2: campaignForm.question2 || '',
        question2_type: campaignForm.question2_type || 'short',
        question2_options: campaignForm.question2_options || '',
        question3: campaignForm.question3 || '',
        question3_type: campaignForm.question3_type || 'short',
        question3_options: campaignForm.question3_options || '',
        question4: campaignForm.question4 || '',
        question4_type: campaignForm.question4_type || 'short',
        question4_options: campaignForm.question4_options || '',
        age_requirement: campaignForm.age_requirement || '',
        skin_type_requirement: campaignForm.skin_type_requirement || '',
        offline_visit_requirement: campaignForm.offline_visit_requirement || ''
        // company_email 제거: 미국 캐페인 DB 스키마에 없음
      }

      console.log('[DEBUG] campaignData 생성 완료')
      console.log('[DEBUG] campaignData:', JSON.stringify({title: campaignData.title, package_type: campaignData.package_type, total_slots: campaignData.total_slots}))
      console.log('[DEBUG] editId:', editId)

      if (editId) {
        // 수정 모드
        console.log('[DEBUG] 수정 모드 실행')
         const { data, error, count } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('id', editId)
          .select()
        console.log('[DEBUG] UPDATE 결과 - error:', error)
        console.log('[DEBUG] UPDATE 결과 - data:', data)
        console.log('[DEBUG] UPDATE 결과 - count:', count)
        if (error) throw error
        
        console.log('[DEBUG] 수정 성공, 가이드 페이지로 이동 예정')
        setSuccess('캠페인이 수정되었습니다!')
        
        setTimeout(() => {
          console.log('[DEBUG] navigate 실행:', `/company/campaigns/guide/us?id=${editId}`)
          navigate(`/company/campaigns/guide/us?id=${editId}`)
        }, 1500)
        return
      } else {
        // 신규 생성: 포인트 차감 또는 견적서 발행
        console.log('[DEBUG] 신규 캐페인 생성 분기')
        const finalCost = campaignForm.estimated_cost
        console.log('[DEBUG] finalCost:', finalCost)
        
        console.log('[DEBUG] supabaseBiz.auth.getUser() 호출')
        const { data: { user } } = await supabaseBiz.auth.getUser()
        console.log('[DEBUG] user:', user)
        if (!user) throw new Error('로그인이 필요합니다')

        console.log('[DEBUG] companyData 가져오기 시작, user.id:', user.id)
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single()
        console.log('[DEBUG] companyData 결과:', companyData)

        if (!companyData) throw new Error('회사 정보를 찾을 수 없습니다')

        // 포인트 시스템 제거 - 바로 캠페인 생성 후 결제 페이지로
        if (true) {
          // company_id에 user.id (UUID) 저장 (권한 체크와 일치)
          campaignData.company_id = user.id
          campaignData.status = 'draft' // 결제 전이므로 draft 상태
          
          console.log('[DEBUG] 캠페인 생성 시도')
          console.log('[DEBUG] campaignData:', JSON.stringify(campaignData, null, 2))
          
          const { data, error } = await supabase
            .from('campaigns')
            .insert([campaignData])
            .select()

          console.log('[DEBUG] INSERT 결과 - data:', data, 'error:', error)
          if (error) throw error

          const campaignId = data[0].id

          setSuccess(`캠페인이 생성되었습니다! 결제 페이지로 이동합니다.`)
          
          setTimeout(() => {
            navigate(`/company/campaigns/invoice/us?id=${campaignId}`)
          }, 1500)
          return
        }
      }
    } catch (err) {
      console.error('[DEBUG] catch 블록 - 오류 발생:', err)
      console.error('[DEBUG] 오류 메시지:', err.message)
      console.error('[DEBUG] 오류 스택:', err.stack)
      alert('오류 발생: ' + err.message)
      setError('캐페인 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🇺🇸 {editId ? '미국 캠페인 수정' : '미국 캠페인 생성'}</h1>
          <p className="text-gray-600 mt-2">왼쪽에서 캠페인 정보를 입력하고, 오른쪽 번역기를 활용하세요.</p>
        </div>

        {/* 알림 메시지 */}
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

        {/* 좌우 분할 레이아웃 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 왼쪽: 캠페인 생성 폼 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">📝 캠페인 정보</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 패키지 선택 */}
              <div>
                <Label htmlFor="package_type">패키지 선택 *</Label>
                <select
                  id="package_type"
                  value={campaignForm.package_type}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {packageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} - ₩{opt.priceWithVat.toLocaleString()} (VAT 포함)
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {packageOptions.find(p => p.value === campaignForm.package_type)?.description}
                </p>
              </div>

              {/* 모집 인원 */}
              <div>
                <Label htmlFor="total_slots">모집 인원 *</Label>
                <Input
                  id="total_slots"
                  type="number"
                  value={campaignForm.total_slots}
                  onChange={(e) => handleSlotsChange(e.target.value)}
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  총 비용: ₩{campaignForm.estimated_cost.toLocaleString()} (VAT 10% 포함)
                </p>
              </div>

              {/* 캠페인 제목 */}
              <div>
                <Label htmlFor="title">캠페인 제목 *</Label>
                <Input
                  id="title"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({...campaignForm, title: e.target.value})}
                  placeholder="캠페인 제목을 입력하세요"
                  required
                />
              </div>

              {/* 브랜드 */}
              <div>
                <Label htmlFor="brand">브랜드 *</Label>
                <Input
                  id="brand"
                  value={campaignForm.brand}
                  onChange={(e) => setCampaignForm({...campaignForm, brand: e.target.value})}
                  placeholder="브랜드명을 입력하세요"
                  required
                />
              </div>

              {/* 썸네일 이미지 */}
              <div>
                <Label htmlFor="thumbnail">썸네일 이미지</Label>
                <input
                  type="file"
                  ref={thumbnailInputRef}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingImage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {uploadingImage && (
                  <p className="text-sm text-blue-600 mt-1">이미지 업로드 중...</p>
                )}
                {campaignForm.image_url && (
                  <div className="mt-2">
                    <img 
                      src={campaignForm.image_url} 
                      alt="Campaign preview" 
                      className="h-32 w-auto object-cover rounded border"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">최대 5MB. 형식: JPG, PNG, WEBP</p>
              </div>

              {/* 캠페인 설명 */}
              <div>
                <Label htmlFor="description">캠페인 설명</Label>
                <Textarea
                  id="description"
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  rows={3}
                  placeholder="캠페인 설명을 입력하세요"
                />
              </div>

              {/* 참가조건 */}
              <div>
                <Label htmlFor="requirements">참가조건 *</Label>
                <Textarea
                  id="requirements"
                  value={campaignForm.requirements}
                  onChange={(e) => setCampaignForm({...campaignForm, requirements: e.target.value})}
                  rows={3}
                  placeholder="참가 조건을 입력하세요"
                  required
                />
              </div>

              {/* 일정 설정 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">📅 일정 설정</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="application_deadline">모집 마감일 *</Label>
                    <Input
                      type="date"
                      id="application_deadline"
                      value={campaignForm.application_deadline}
                      onChange={(e) => setCampaignForm({...campaignForm, application_deadline: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="start_date">모집 발표일 *</Label>
                    <Input
                      type="date"
                      id="start_date"
                      value={campaignForm.start_date}
                      onChange={(e) => setCampaignForm({...campaignForm, start_date: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">촬영 마감일 *</Label>
                    <Input
                      type="date"
                      id="end_date"
                      value={campaignForm.end_date}
                      onChange={(e) => setCampaignForm({...campaignForm, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    💡 <strong>일정 가이드:</strong> 모집 마감일 → 모집 발표일 → 촬영 마감일 순서로 설정해주세요.
                  </p>
                </div>
              </div>

              {/* SNS 플랫폼 선택 */}
              <div>
                <Label className="mb-3">대상 SNS 플랫폼 *</Label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={campaignForm.target_platforms.instagram}
                      onChange={(e) => setCampaignForm({
                        ...campaignForm,
                        target_platforms: {
                          ...campaignForm.target_platforms,
                          instagram: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    📷 Instagram
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={campaignForm.target_platforms.youtube}
                      onChange={(e) => setCampaignForm({
                        ...campaignForm,
                        target_platforms: {
                          ...campaignForm.target_platforms,
                          youtube: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    🎥 YouTube
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={campaignForm.target_platforms.tiktok}
                      onChange={(e) => setCampaignForm({
                        ...campaignForm,
                        target_platforms: {
                          ...campaignForm.target_platforms,
                          tiktok: e.target.checked
                        }
                      })}
                      className="mr-2"
                    />
                    🎵 TikTok
                  </label>
                </div>
              </div>

              {/* 연령 및 피부타입 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age_requirement">연령 조건</Label>
                  <Input
                    id="age_requirement"
                    value={campaignForm.age_requirement || ''}
                    onChange={(e) => setCampaignForm({...campaignForm, age_requirement: e.target.value})}
                    placeholder="예: 20-30세"
                  />
                </div>

                <div>
                  <Label htmlFor="skin_type_requirement">피부타입</Label>
                  <select
                    id="skin_type_requirement"
                    value={campaignForm.skin_type_requirement || ''}
                    onChange={(e) => setCampaignForm({...campaignForm, skin_type_requirement: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선택하세요</option>
                    <option value="건성">건성</option>
                    <option value="지성">지성</option>
                    <option value="복합성">복합성</option>
                    <option value="민감성">민감성</option>
                    <option value="모든타입">모든타입</option>
                  </select>
                </div>
              </div>

              {/* 오프라인 방문 조건 */}
              {campaignForm.offline_visit_requirement !== null && (
                <div>
                  <Label htmlFor="offline_visit_requirement">
                    오프라인 방문 조건
                    <button
                      type="button"
                      onClick={() => setCampaignForm({...campaignForm, offline_visit_requirement: null})}
                      className="ml-2 text-xs text-red-600 hover:text-red-800"
                    >
                      [조건 없애기]
                    </button>
                  </Label>
                  <Textarea
                    id="offline_visit_requirement"
                    value={campaignForm.offline_visit_requirement || ''}
                    onChange={(e) => setCampaignForm({...campaignForm, offline_visit_requirement: e.target.value})}
                    rows={3}
                    placeholder="예: 도쿄 시부야 오프라인 매장 방문 필수, 체험 후기 작성 등 (선택사항)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    오프라인 방문이 필요한 경우에만 작성하세요. 비워두면 온라인 전용 캠페인이 됩니다.
                  </p>
                </div>
              )}

              {campaignForm.offline_visit_requirement === null && (
                <div>
                  <button
                    type="button"
                    onClick={() => setCampaignForm({...campaignForm, offline_visit_requirement: ''})}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + 오프라인 방문 조건 추가
                  </button>
                </div>
              )}

              {/* 질문 4가지 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">질문</h3>
                
                <div className="space-y-6">
                  {/* 질문 1 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor="question1">질문 1</Label>
                        <Input
                          id="question1"
                          value={campaignForm.question1 || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question1: e.target.value})}
                          placeholder="질문 1을 입력하세요"
                        />
                      </div>

                      <div>
                        <Label htmlFor="question1_type">답변 형태</Label>
                        <select
                          id="question1_type"
                          value={campaignForm.question1_type || 'short'}
                          onChange={(e) => setCampaignForm({...campaignForm, question1_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="short">짧은답변</option>
                          <option value="long">긴답변</option>
                          <option value="checkbox">체크박스</option>
                        </select>
                      </div>
                    </div>

                    {campaignForm.question1_type === 'checkbox' && (
                      <div>
                        <Label htmlFor="question1_options">선택 옵션 (쉼표로 구분)</Label>
                        <Input
                          id="question1_options"
                          value={campaignForm.question1_options || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question1_options: e.target.value})}
                          placeholder="옵션1, 옵션2, 옵션3"
                        />
                      </div>
                    )}
                  </div>

                  {/* 질문 2 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor="question2">질문 2</Label>
                        <Input
                          id="question2"
                          value={campaignForm.question2 || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question2: e.target.value})}
                          placeholder="질문 2를 입력하세요"
                        />
                      </div>

                      <div>
                        <Label htmlFor="question2_type">답변 형태</Label>
                        <select
                          id="question2_type"
                          value={campaignForm.question2_type || 'short'}
                          onChange={(e) => setCampaignForm({...campaignForm, question2_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="short">짧은답변</option>
                          <option value="long">긴답변</option>
                          <option value="checkbox">체크박스</option>
                        </select>
                      </div>
                    </div>

                    {campaignForm.question2_type === 'checkbox' && (
                      <div>
                        <Label htmlFor="question2_options">선택 옵션 (쉼표로 구분)</Label>
                        <Input
                          id="question2_options"
                          value={campaignForm.question2_options || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question2_options: e.target.value})}
                          placeholder="옵션1, 옵션2, 옵션3"
                        />
                      </div>
                    )}
                  </div>

                  {/* 질문 3 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor="question3">질문 3</Label>
                        <Input
                          id="question3"
                          value={campaignForm.question3 || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question3: e.target.value})}
                          placeholder="질문 3을 입력하세요"
                        />
                      </div>

                      <div>
                        <Label htmlFor="question3_type">답변 형태</Label>
                        <select
                          id="question3_type"
                          value={campaignForm.question3_type || 'short'}
                          onChange={(e) => setCampaignForm({...campaignForm, question3_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="short">짧은답변</option>
                          <option value="long">긴답변</option>
                          <option value="checkbox">체크박스</option>
                        </select>
                      </div>
                    </div>

                    {campaignForm.question3_type === 'checkbox' && (
                      <div>
                        <Label htmlFor="question3_options">선택 옵션 (쉼표로 구분)</Label>
                        <Input
                          id="question3_options"
                          value={campaignForm.question3_options || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question3_options: e.target.value})}
                          placeholder="옵션1, 옵션2, 옵션3"
                        />
                      </div>
                    )}
                  </div>

                  {/* 질문 4 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor="question4">질문 4</Label>
                        <Input
                          id="question4"
                          value={campaignForm.question4 || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question4: e.target.value})}
                          placeholder="질문 4를 입력하세요"
                        />
                      </div>

                      <div>
                        <Label htmlFor="question4_type">답변 형태</Label>
                        <select
                          id="question4_type"
                          value={campaignForm.question4_type || 'short'}
                          onChange={(e) => setCampaignForm({...campaignForm, question4_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="short">짧은답변</option>
                          <option value="long">긴답변</option>
                          <option value="checkbox">체크박스</option>
                        </select>
                      </div>
                    </div>

                    {campaignForm.question4_type === 'checkbox' && (
                      <div>
                        <Label htmlFor="question4_options">선택 옵션 (쉼표로 구분)</Label>
                        <Input
                          id="question4_options"
                          value={campaignForm.question4_options || ''}
                          onChange={(e) => setCampaignForm({...campaignForm, question4_options: e.target.value})}
                          placeholder="옵션1, 옵션2, 옵션3"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={processing} className="flex-1">
                  {processing ? '처리 중...' : '임시저장'}
                </Button>
                <Button type="submit" disabled={processing} className="flex-1">
                  {processing ? '처리 중...' : (editId ? '수정' : '생성')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/company/campaigns')}>
                  취소
                </Button>
              </div>
            </form>
          </div>

          {/* 오른쪽: 번역기 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">🌐 한국어 → 미국어 번역기</h2>
            
            <div className="space-y-4">
              {/* 한국어 입력 */}
              <div>
                <Label htmlFor="koreanText">🇰🇷 한국어 입력</Label>
                <Textarea
                  id="koreanText"
                  value={koreanText}
                  onChange={(e) => setKoreanText(e.target.value)}
                  rows={6}
                  placeholder="번역할 한국어 텍스트를 입력하세요..."
                />
                <div className="text-sm text-gray-500 mt-1">
                  {koreanText.length} / 500자
                </div>
              </div>

              {/* 일괄 번역 버튼 */}
              <button
                type="button"
                onClick={translateAllFields}
                disabled={isTranslating}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isTranslating ? '번역 중...' : '🚀 제목/브랜드/설명/참가조건 일괄 번역'}
              </button>

              {/* 개별 번역 버튼 */}
              <button
                type="button"
                onClick={() => translateText(koreanText)}
                disabled={isTranslating || !koreanText.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isTranslating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    번역 중...
                  </>
                ) : (
                  '🔄 번역하기'
                )}
              </button>

              {/* 번역 오류 */}
              {translationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{translationError}</p>
                </div>
              )}

              {/* 미국어 결과 */}
              <div>
                <Label htmlFor="useseText">🇯🇵 미국어 번역 결과</Label>
                <div className="relative">
                  <Textarea
                    id="useseText"
                    value={useseText}
                    onChange={(e) => setUSeseText(e.target.value)}
                    rows={6}
                    className="bg-green-50 border-green-300"
                    placeholder="번역 결과가 여기에 표시됩니다..."
                  />
                  {useseText && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(useseText)}
                      className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      📋 복사
                    </button>
                  )}
                </div>
                {useseText && (
                  <div className="text-sm text-gray-500 mt-1">
                    {useseText.length}자
                  </div>
                )}
              </div>

              {/* 사용 팁 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="font-medium text-yellow-800 mb-2">💡 사용 팁</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 번역 결과는 수정 가능합니다</li>
                  <li>• 복사 버튼으로 쉽게 캠페인 폼에 붙여넣기 할 수 있습니다</li>
                  <li>• 마케팅 문구는 현지 감각에 맞게 자연스럽게 번역됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateCampaignUS
