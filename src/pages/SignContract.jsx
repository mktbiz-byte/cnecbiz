import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Edit3, Stamp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'

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

  useEffect(() => {
    loadContract()
  }, [contractId])

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
    } catch (error) {
      console.error('계약서 로드 실패:', error)
      alert(error.message || '계약서를 불러오는데 실패했습니다.')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  // 캔버스 그리기 시작
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    ctx.beginPath()
    ctx.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    )
    setIsDrawing(true)
  }

  // 캔버스 그리기
  const draw = (e) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()

    ctx.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    )
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
          ipAddress: '', // TODO: IP 주소 가져오기
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
              dangerouslySetInnerHTML={{ __html: contract.content }}
            />
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

