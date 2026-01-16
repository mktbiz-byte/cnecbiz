import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Edit3, Stamp, CheckCircle, Loader2, Type, RefreshCw } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import { CompanyContractTemplate } from '../templates/CompanyContractTemplate'

// 서명 스타일 정의
const SIGNATURE_STYLES = [
  { id: 'style1', name: '필기체 1', fontFamily: "'Nanum Pen Script', cursive", fontWeight: '400', slant: '-3deg' },
  { id: 'style2', name: '필기체 2', fontFamily: "'Gaegu', cursive", fontWeight: '700', slant: '2deg' },
  { id: 'style3', name: '필기체 3', fontFamily: "'Hi Melody', cursive", fontWeight: '400', slant: '-5deg' },
  { id: 'style4', name: '캘리그라피', fontFamily: "'Gamja Flower', cursive", fontWeight: '400', slant: '0deg' },
]

// 도장 스타일 정의
const STAMP_STYLES = [
  { id: 'circle1', name: '원형 법인인감 1', type: 'circle1' },
  { id: 'circle2', name: '원형 법인인감 2', type: 'circle2' },
  { id: 'square', name: '사각 법인인감', type: 'square' },
  { id: 'oval', name: '타원형 개인도장', type: 'oval' },
]

export default function SignContract() {
  const { contractId } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const signatureCanvasRef = useRef(null)
  const stampCanvasRef = useRef(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signatureType, setSignatureType] = useState('auto')
  const [signatureImage, setSignatureImage] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [signed, setSigned] = useState(false)
  const [renderedContent, setRenderedContent] = useState('')

  // 서명자 정보 (을)
  const [signerInfo, setSignerInfo] = useState({
    companyName: '',
    address: '',
    ceoName: ''
  })

  // 확인 사항 체크박스
  const [confirmations, setConfirmations] = useState({
    confirm1: false,
    confirm2: false
  })

  // 자동 서명 관련 상태
  const [selectedSignatureStyle, setSelectedSignatureStyle] = useState('style1')
  const [selectedStampStyle, setSelectedStampStyle] = useState('circle')
  const [generatedSignatures, setGeneratedSignatures] = useState([])
  const [generatedStamps, setGeneratedStamps] = useState([])
  const [selectedGeneratedSignature, setSelectedGeneratedSignature] = useState(null)
  const [selectedGeneratedStamp, setSelectedGeneratedStamp] = useState(null)

  useEffect(() => {
    loadContract()
    // Google Fonts 로드 (서명용 + 인장용 - Black Han Sans 추가)
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Gaegu:wght@400;700&family=Gamja+Flower&family=Hi+Melody&family=Nanum+Pen+Script&family=Noto+Serif+KR:wght@700;900&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }, [contractId])

  // 대표자명이 변경되면 서명 자동 생성
  useEffect(() => {
    if (signerInfo.ceoName.trim()) {
      generateSignatures(signerInfo.ceoName)
    }
  }, [signerInfo.ceoName])

  // 회사명이 변경되면 도장 자동 생성
  useEffect(() => {
    if (signerInfo.companyName.trim() && signerInfo.ceoName.trim()) {
      generateStamps(signerInfo.companyName, signerInfo.ceoName)
    }
  }, [signerInfo.companyName, signerInfo.ceoName])

  // 서명 스타일 자동 생성
  const generateSignatures = (name) => {
    const signatures = SIGNATURE_STYLES.map(style => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 150
      const ctx = canvas.getContext('2d')

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((parseFloat(style.slant) * Math.PI) / 180)

      ctx.font = `${style.fontWeight} 48px ${style.fontFamily}`
      ctx.fillStyle = '#1a1a1a'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, 0, 0)
      ctx.restore()

      return {
        id: style.id,
        name: style.name,
        dataUrl: canvas.toDataURL('image/png')
      }
    })
    setGeneratedSignatures(signatures)
    if (!selectedGeneratedSignature) {
      setSelectedGeneratedSignature(signatures[0]?.dataUrl)
    }
  }

  // 도장 스타일 자동 생성 (Black Han Sans + 강화된 인장 효과)
  const generateStamps = (companyName, ceoName) => {
    const stamps = STAMP_STYLES.map(style => {
      const canvas = document.createElement('canvas')
      const scale = 2
      canvas.width = 400 * scale
      canvas.height = 400 * scale
      const ctx = canvas.getContext('2d')
      ctx.scale(scale, scale)

      const centerX = 200
      const centerY = 200
      const stampColor = '#c23a3a' // 선명한 인주색

      ctx.clearRect(0, 0, 400, 400)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // 회사명 정리 (주식회사 제거)
      const cleanCompanyName = companyName.replace(/^주식회사\s*/, '').replace(/\s*주식회사$/, '').substring(0, 4)

      // 인장 스타일 텍스트 (Black Han Sans - 매우 굵은 고딕)
      const drawSealText = (text, x, y, fontSize, isVertical = false) => {
        ctx.font = `${fontSize}px 'Black Han Sans', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = stampColor

        if (isVertical) {
          const chars = text.split('')
          const charHeight = fontSize * 1.05
          const totalHeight = (chars.length - 1) * charHeight
          chars.forEach((char, i) => {
            const cy = y - totalHeight / 2 + i * charHeight
            ctx.fillText(char, x, cy)
          })
        } else {
          ctx.fillText(text, x, y)
        }
      }

      // 실제 도장 찍힌 느낌의 텍스처
      const addRealisticTexture = () => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            // 색상 미세 변화 (인주 불균일)
            const colorNoise = (Math.random() - 0.5) * 25
            data[i] = Math.min(255, Math.max(0, data[i] + colorNoise))
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + colorNoise * 0.3))
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + colorNoise * 0.3))

            // 5% 확률로 잉크 빠짐 효과
            if (Math.random() > 0.95) {
              data[i + 3] = Math.max(80, data[i + 3] - Math.random() * 100)
            }
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }

      if (style.type === 'circle1') {
        // 원형 법인인감 - 전통 스타일
        const outerRadius = 168
        const innerRadius = 58

        // 굵은 외곽 원
        ctx.strokeStyle = stampColor
        ctx.lineWidth = 12
        ctx.beginPath()
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
        ctx.stroke()

        // 내부 원
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
        ctx.stroke()

        // 중앙: 대표이사 (2줄)
        drawSealText('대표', centerX, centerY - 16, 38)
        drawSealText('이사', centerX, centerY + 22, 38)

        // 상단 호: 회사명 (균등 배치)
        const textRadius = (outerRadius + innerRadius) / 2 + 2
        const companyChars = cleanCompanyName.split('')
        ctx.font = "28px 'Black Han Sans', sans-serif"
        ctx.fillStyle = stampColor

        const arcSpan = Math.PI * 0.55
        const charCount = companyChars.length
        companyChars.forEach((char, i) => {
          const angle = charCount === 1
            ? -Math.PI / 2
            : -Math.PI / 2 - arcSpan / 2 + (arcSpan / (charCount - 1)) * i
          const x = centerX + textRadius * Math.cos(angle)
          const y = centerY + textRadius * Math.sin(angle)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle + Math.PI / 2)
          ctx.fillText(char, 0, 0)
          ctx.restore()
        })

        // 하단 호: 주식회사
        ctx.font = "24px 'Black Han Sans', sans-serif"
        const bottomChars = ['주', '식', '회', '사']
        const bottomArcSpan = Math.PI * 0.45
        bottomChars.forEach((char, i) => {
          const angle = Math.PI / 2 + bottomArcSpan / 2 - (bottomArcSpan / 3) * i
          const x = centerX + textRadius * Math.cos(angle)
          const y = centerY + textRadius * Math.sin(angle)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle - Math.PI / 2)
          ctx.fillText(char, 0, 0)
          ctx.restore()
        })

        // 좌우 별 장식
        ctx.font = "18px serif"
        ctx.fillText('★', centerX - textRadius - 3, centerY)
        ctx.fillText('★', centerX + textRadius + 3, centerY)

        addRealisticTexture()

      } else if (style.type === 'circle2') {
        // 원형 법인인감 2 - 모던 심플
        const outerRadius = 168
        const innerRadius = 52

        // 굵은 외곽 원
        ctx.strokeStyle = stampColor
        ctx.lineWidth = 14
        ctx.beginPath()
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2)
        ctx.stroke()

        // 내부 원
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2)
        ctx.stroke()

        // 중앙: 대표
        drawSealText('대표', centerX, centerY, 46)

        // 좌우 수평선
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(centerX - innerRadius - 10, centerY)
        ctx.lineTo(centerX - outerRadius + 18, centerY)
        ctx.moveTo(centerX + innerRadius + 10, centerY)
        ctx.lineTo(centerX + outerRadius - 18, centerY)
        ctx.stroke()

        // 회사명 (상단)
        const textRadius = (outerRadius + innerRadius) / 2 + 2
        const companyText = cleanCompanyName + '㈜'
        const companyChars = companyText.split('')
        ctx.font = "26px 'Black Han Sans', sans-serif"
        ctx.fillStyle = stampColor

        const arcSpan = Math.PI * 0.75
        companyChars.forEach((char, i) => {
          const angle = -Math.PI / 2 - arcSpan / 2 + (arcSpan / (companyChars.length - 1)) * i
          const x = centerX + textRadius * Math.cos(angle)
          const y = centerY + textRadius * Math.sin(angle)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle + Math.PI / 2)
          ctx.fillText(char, 0, 0)
          ctx.restore()
        })

        addRealisticTexture()

      } else if (style.type === 'oval') {
        // 타원형 개인도장
        const radiusX = 62
        const radiusY = 130

        // 굵은 외곽 타원
        ctx.strokeStyle = stampColor
        ctx.lineWidth = 10
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.stroke()

        // 이름 세로 배치
        drawSealText(ceoName.substring(0, 3), centerX, centerY, 52, true)

        addRealisticTexture()

      } else if (style.type === 'square') {
        // 사각 법인인감 - 전통 관인
        const size = 280
        const startX = centerX - size / 2
        const startY = centerY - size / 2

        // 굵은 외곽 사각형
        ctx.strokeStyle = stampColor
        ctx.lineWidth = 12
        ctx.strokeRect(startX, startY, size, size)

        // 십자 구분선
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(centerX, startY + 16)
        ctx.lineTo(centerX, startY + size - 16)
        ctx.moveTo(startX + 16, centerY)
        ctx.lineTo(startX + size - 16, centerY)
        ctx.stroke()

        // 4칸에 대표이사 (전통 읽기: 우→좌, 상→하)
        const qSize = size / 4
        drawSealText('대', centerX + qSize, centerY - qSize, 58)
        drawSealText('표', centerX + qSize, centerY + qSize, 58)
        drawSealText('이', centerX - qSize, centerY - qSize, 58)
        drawSealText('사', centerX - qSize, centerY + qSize, 58)

        addRealisticTexture()
      }

      return {
        id: style.id,
        name: style.name,
        dataUrl: canvas.toDataURL('image/png')
      }
    })
    setGeneratedStamps(stamps)
    if (!selectedGeneratedStamp) {
      setSelectedGeneratedStamp(stamps[0]?.dataUrl)
    }
  }

  // 계약서 내용 렌더링 (JSON → HTML)
  const renderContractContent = (content, contractData) => {
    if (typeof content === 'string' && content.trim().startsWith('<')) {
      return content
    }

    let contentData = content
    if (typeof content === 'string') {
      try {
        contentData = JSON.parse(content)
      } catch (e) {
        return content
      }
    }

    return CompanyContractTemplate({
      companyName: contentData.companyName || contractData.recipient_name || '',
      ceoName: contentData.ceoName || '',
      address: contentData.address || '',
      brandName: contentData.brandName || contentData.campaignName || '',
      contractDate: contractData.created_at
        ? new Date(contractData.created_at).toLocaleDateString('ko-KR')
        : new Date().toLocaleDateString('ko-KR')
    })
  }

  const loadContract = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabaseBiz
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single()

      if (error) throw error

      if (data.status === 'signed') {
        setSigned(true)
      } else if (data.status !== 'sent') {
        throw new Error('서명할 수 없는 계약서입니다.')
      }

      if (new Date(data.expires_at) < new Date()) {
        throw new Error('계약서가 만료되었습니다.')
      }

      setContract(data)
      const html = renderContractContent(data.content, data)
      setRenderedContent(html)
    } catch (error) {
      console.error('계약서 로드 실패:', error)
      alert(error.message || '계약서를 불러오는데 실패했습니다.')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  // 캔버스 좌표 계산
  const getCanvasCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasCoordinates(e, canvas)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setSignatureImage(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  // 서명 제출
  const handleSubmit = async () => {
    try {
      if (!signerInfo.companyName.trim()) {
        alert('회사명을 입력해주세요.')
        return
      }
      if (!signerInfo.address.trim()) {
        alert('주소를 입력해주세요.')
        return
      }
      if (!signerInfo.ceoName.trim()) {
        alert('대표자명을 입력해주세요.')
        return
      }

      if (!confirmations.confirm1 || !confirmations.confirm2) {
        alert('확인 사항을 모두 체크해주세요.')
        return
      }

      setSigning(true)

      let signatureData = null

      if (signatureType === 'draw') {
        const canvas = canvasRef.current
        signatureData = canvas.toDataURL('image/png')
      } else if (signatureType === 'auto') {
        if (!selectedGeneratedSignature) {
          alert('서명 스타일을 선택해주세요.')
          return
        }
        signatureData = selectedGeneratedSignature
      } else if (signatureType === 'stamp') {
        if (!selectedGeneratedStamp) {
          alert('도장 스타일을 선택해주세요.')
          return
        }
        signatureData = selectedGeneratedStamp
      } else if (signatureType === 'upload') {
        if (!signatureImage) {
          alert('서명 이미지를 업로드해주세요.')
          return
        }
        signatureData = signatureImage
      }

      if (!signatureData) {
        alert('서명을 작성해주세요.')
        return
      }

      const response = await fetch('/.netlify/functions/sign-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contractId,
          signatureType: signatureType,
          signatureData: signatureData,
          signerInfo: signerInfo,
          ipAddress: '',
          userAgent: navigator.userAgent
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      alert('계약서 서명이 완료되었습니다!')
      setSigned(true)

    } catch (error) {
      console.error('서명 실패:', error)
      alert(error.message || '서명에 실패했습니다.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">서명 완료</h2>
            <p className="text-gray-600">계약서 서명이 완료되었습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{contract.title}</CardTitle>
            <p className="text-sm text-gray-600">
              만료일: {new Date(contract.expires_at).toLocaleDateString('ko-KR')}
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none border rounded-lg p-6 bg-white"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </CardContent>
        </Card>

        {/* 서명자 정보 입력 (을) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>콘텐츠 사용자 정보 (을)</CardTitle>
            <p className="text-sm text-gray-600">계약서에 기재될 귀사의 정보를 입력해주세요.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">회사명 *</Label>
              <Input
                id="companyName"
                placeholder="예: 주식회사 OOO"
                value={signerInfo.companyName}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소 *</Label>
              <Input
                id="address"
                placeholder="예: 서울시 강남구 테헤란로 123"
                value={signerInfo.address}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceoName">대표자명 *</Label>
              <Input
                id="ceoName"
                placeholder="예: 홍길동"
                value={signerInfo.ceoName}
                onChange={(e) => setSignerInfo(prev => ({ ...prev, ceoName: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 확인 사항 체크 */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">확인 사항</CardTitle>
            <p className="text-sm text-amber-700">아래 내용을 확인하고 체크해주세요.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm1"
                checked={confirmations.confirm1}
                onCheckedChange={(checked) => setConfirmations(prev => ({ ...prev, confirm1: checked }))}
                className="mt-1"
              />
              <label htmlFor="confirm1" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                본 계약의 프리미엄 패키지 콘텐츠는 사전에 합의된 가이드 범위 내에서만 수정 가능하며, 1회 무료 수정을 초과하거나 기획 변경·추가 촬영이 필요한 경우 별도 비용이 발생한다는 점을 확인하였습니다.
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm2"
                checked={confirmations.confirm2}
                onCheckedChange={(checked) => setConfirmations(prev => ({ ...prev, confirm2: checked }))}
                className="mt-1"
              />
              <label htmlFor="confirm2" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                본 계약의 콘텐츠는 최종 업로드일로부터 1년간 사용 가능하며, 이후 활용은 별도의 계약 또는 비용 협의가 필요함을 확인하였습니다.
              </label>
            </div>
          </CardContent>
        </Card>

        {/* 전자 서명 */}
        <Card>
          <CardHeader>
            <CardTitle>전자 서명</CardTitle>
            <p className="text-sm text-gray-600">서명 방식을 선택하고 서명해주세요.</p>
          </CardHeader>
          <CardContent>
            <Tabs value={signatureType} onValueChange={setSignatureType}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="auto">
                  <Type className="w-4 h-4 mr-2" />
                  자동 서명
                </TabsTrigger>
                <TabsTrigger value="stamp">
                  <Stamp className="w-4 h-4 mr-2" />
                  도장
                </TabsTrigger>
                <TabsTrigger value="draw">
                  <Edit3 className="w-4 h-4 mr-2" />
                  직접 그리기
                </TabsTrigger>
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  업로드
                </TabsTrigger>
              </TabsList>

              {/* 자동 서명 탭 */}
              <TabsContent value="auto" className="space-y-4">
                {!signerInfo.ceoName.trim() ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                    <Type className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">대표자명을 입력하면 서명이 자동 생성됩니다.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">원하는 서명 스타일을 선택해주세요.</p>
                    <div className="grid grid-cols-2 gap-4">
                      {generatedSignatures.map((sig) => (
                        <div
                          key={sig.id}
                          onClick={() => setSelectedGeneratedSignature(sig.dataUrl)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all bg-white hover:shadow-md ${
                            selectedGeneratedSignature === sig.dataUrl
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200'
                          }`}
                        >
                          <img src={sig.dataUrl} alt={sig.name} className="w-full h-20 object-contain" />
                          <p className="text-xs text-center text-gray-500 mt-2">{sig.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* 도장 탭 */}
              <TabsContent value="stamp" className="space-y-4">
                {!signerInfo.companyName.trim() || !signerInfo.ceoName.trim() ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                    <Stamp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">회사명과 대표자명을 입력하면 도장이 자동 생성됩니다.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">원하는 도장 스타일을 선택해주세요.</p>
                    <div className="grid grid-cols-2 gap-6">
                      {generatedStamps.map((stamp) => (
                        <div
                          key={stamp.id}
                          onClick={() => setSelectedGeneratedStamp(stamp.dataUrl)}
                          className={`border-2 rounded-xl p-6 cursor-pointer transition-all bg-white hover:shadow-lg ${
                            selectedGeneratedStamp === stamp.dataUrl
                              ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img src={stamp.dataUrl} alt={stamp.name} className="w-full h-40 object-contain" />
                          <p className="text-sm text-center text-gray-600 mt-3 font-medium">{stamp.name}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* 직접 그리기 탭 */}
              <TabsContent value="draw" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair border border-gray-100 rounded"
                    style={{ touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      const touch = e.touches[0]
                      startDrawing({ clientX: touch.clientX, clientY: touch.clientY })
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault()
                      const touch = e.touches[0]
                      draw({ clientX: touch.clientX, clientY: touch.clientY })
                    }}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button variant="outline" onClick={clearCanvas}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  지우기
                </Button>
              </TabsContent>

              {/* 업로드 탭 */}
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                  {signatureImage ? (
                    <img src={signatureImage} alt="서명" className="max-h-48 mx-auto" />
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">서명 또는 도장 이미지를 업로드해주세요</p>
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex gap-4">
              <Button
                onClick={handleSubmit}
                disabled={signing}
                className="flex-1"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    서명 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    서명 완료
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
