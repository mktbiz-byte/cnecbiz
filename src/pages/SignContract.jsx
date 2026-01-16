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
  { id: 'circle', name: '원형 법인인감', type: 'circle' },
  { id: 'oval', name: '타원형 도장', type: 'oval' },
  { id: 'square', name: '사각 법인인감', type: 'square' },
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
    // Google Fonts 로드
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Gamja+Flower&family=Hi+Melody&family=Nanum+Pen+Script&display=swap'
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

  // 도장 스타일 자동 생성
  const generateStamps = (companyName, ceoName) => {
    const stamps = STAMP_STYLES.map(style => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (style.type === 'circle') {
        // 원형 법인인감 - 대표이사 + 회사명
        const radius = 85

        // 외곽 원
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 4
        ctx.stroke()

        // 내부 원
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius - 8, 0, Math.PI * 2)
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 2
        ctx.stroke()

        // 중앙 가로선
        ctx.beginPath()
        ctx.moveTo(centerX - 50, centerY)
        ctx.lineTo(centerX + 50, centerY)
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 2
        ctx.stroke()

        // 대표이사 텍스트 (중앙)
        ctx.font = "bold 22px '바탕', 'Batang', serif"
        ctx.fillStyle = '#c41e3a'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('대표이사', centerX, centerY)

        // 회사명을 원형으로 배치 (상단)
        const shortCompanyName = companyName.replace(/^주식회사\s*/, '').replace(/\s*주식회사$/, '').substring(0, 6)
        ctx.font = "bold 16px '바탕', 'Batang', serif"

        const textRadius = radius - 25
        const chars = shortCompanyName.split('')
        const startAngle = -Math.PI / 2 - (chars.length - 1) * 0.15

        chars.forEach((char, i) => {
          const angle = startAngle + i * 0.3
          const x = centerX + textRadius * Math.cos(angle)
          const y = centerY + textRadius * Math.sin(angle)
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle + Math.PI / 2)
          ctx.fillText(char, 0, 0)
          ctx.restore()
        })

      } else if (style.type === 'oval') {
        // 타원형 도장 - 이름만
        const radiusX = 45
        const radiusY = 80

        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 4
        ctx.stroke()

        // 내부 타원
        ctx.beginPath()
        ctx.ellipse(centerX, centerY, radiusX - 6, radiusY - 6, 0, 0, Math.PI * 2)
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 2
        ctx.stroke()

        // 이름을 세로로 배치
        const nameChars = ceoName.substring(0, 3).split('')
        ctx.font = "bold 32px '바탕', 'Batang', serif"
        ctx.fillStyle = '#c41e3a'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        nameChars.forEach((char, i) => {
          const y = centerY - 40 + i * 40
          ctx.fillText(char, centerX, y)
        })

      } else if (style.type === 'square') {
        // 사각 법인인감
        const size = 160
        const startX = centerX - size / 2
        const startY = centerY - size / 2

        // 외곽 사각형
        ctx.strokeStyle = '#c41e3a'
        ctx.lineWidth = 4
        ctx.strokeRect(startX, startY, size, size)

        // 내부 사각형
        ctx.lineWidth = 2
        ctx.strokeRect(startX + 6, startY + 6, size - 12, size - 12)

        // 십자선
        ctx.beginPath()
        ctx.moveTo(centerX, startY + 15)
        ctx.lineTo(centerX, startY + size - 15)
        ctx.moveTo(startX + 15, centerY)
        ctx.lineTo(startX + size - 15, centerY)
        ctx.stroke()

        // 4분할 텍스트 배치 (주식회사 회사명)
        ctx.font = "bold 20px '바탕', 'Batang', serif"
        ctx.fillStyle = '#c41e3a'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const shortName = companyName.replace(/^주식회사\s*/, '').replace(/\s*주식회사$/, '')
        const chars = shortName.substring(0, 4).padEnd(4, ' ').split('')

        // 주식회사 + 회사명 4글자 배치
        ctx.fillText('주', centerX - size/4, centerY - size/4)
        ctx.fillText(chars[0] || '', centerX + size/4, centerY - size/4)
        ctx.fillText('식', centerX - size/4, centerY + size/4)
        ctx.fillText(chars[1] || '', centerX + size/4, centerY + size/4)
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
                    <p className="text-sm text-gray-600">원하는 도장 스타일을 선택해주세요.</p>
                    <div className="grid grid-cols-3 gap-4">
                      {generatedStamps.map((stamp) => (
                        <div
                          key={stamp.id}
                          onClick={() => setSelectedGeneratedStamp(stamp.dataUrl)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all bg-white hover:shadow-md ${
                            selectedGeneratedStamp === stamp.dataUrl
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200'
                          }`}
                        >
                          <img src={stamp.dataUrl} alt={stamp.name} className="w-full h-28 object-contain" />
                          <p className="text-xs text-center text-gray-500 mt-2">{stamp.name}</p>
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
