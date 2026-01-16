import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Edit3, Stamp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import { CompanyContractTemplate } from '../templates/CompanyContractTemplate'

export default function SignContract() {
  const { contractId } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signatureType, setSignatureType] = useState('draw')
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

  useEffect(() => {
    loadContract()
  }, [contractId])

  // 계약서 내용 렌더링 (JSON → HTML)
  const renderContractContent = (content, contractData) => {
    // 이미 HTML인 경우 그대로 반환
    if (typeof content === 'string' && content.trim().startsWith('<')) {
      return content
    }

    // JSON 문자열인 경우 파싱
    let contentData = content
    if (typeof content === 'string') {
      try {
        contentData = JSON.parse(content)
      } catch (e) {
        // 파싱 실패시 원본 반환
        return content
      }
    }

    // CompanyContractTemplate으로 HTML 생성
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

      // 만료일 확인
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('계약서가 만료되었습니다.')
      }

      setContract(data)

      // 계약서 내용 렌더링
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

  // 캔버스 좌표 계산 (스케일링 적용)
  const getCanvasCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    // CSS 크기와 캔버스 내부 해상도의 비율 계산
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // 캔버스 그리기 시작
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasCoordinates(e, canvas)

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  // 캔버스 그리기
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

  // 캔버스 그리기 종료
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // 캔버스 초기화
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // 이미지 업로드
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
      // 서명자 정보 검증
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

      // 확인 사항 체크 검증
      if (!confirmations.confirm1 || !confirmations.confirm2) {
        alert('확인 사항을 모두 체크해주세요.')
        return
      }

      setSigning(true)

      let signatureData = null

      if (signatureType === 'draw') {
        const canvas = canvasRef.current
        signatureData = canvas.toDataURL('image/png')
      } else if (signatureType === 'image' || signatureType === 'stamp') {
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

      // 서명 제출
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

        <Card>
          <CardHeader>
            <CardTitle>전자 서명</CardTitle>
            <p className="text-sm text-gray-600">서명 방식을 선택하고 서명해주세요.</p>
          </CardHeader>
          <CardContent>
            <Tabs value={signatureType} onValueChange={setSignatureType}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="draw">
                  <Edit3 className="w-4 h-4 mr-2" />
                  직접 그리기
                </TabsTrigger>
                <TabsTrigger value="image">
                  <Upload className="w-4 h-4 mr-2" />
                  이미지 업로드
                </TabsTrigger>
                <TabsTrigger value="stamp">
                  <Stamp className="w-4 h-4 mr-2" />
                  도장
                </TabsTrigger>
              </TabsList>

              <TabsContent value="draw" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <Button variant="outline" onClick={clearCanvas}>
                  지우기
                </Button>
              </TabsContent>

              <TabsContent value="image" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                  {signatureImage ? (
                    <img src={signatureImage} alt="서명" className="max-h-48 mx-auto" />
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">서명 이미지를 업로드해주세요</p>
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </TabsContent>

              <TabsContent value="stamp" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
                  {signatureImage ? (
                    <img src={signatureImage} alt="도장" className="max-h-48 mx-auto" />
                  ) : (
                    <div>
                      <Stamp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">도장 이미지를 업로드해주세요</p>
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

