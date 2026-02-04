import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import CompanyNavigation from './CompanyNavigation'

const AdvancedGuideJapan = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')
  const supabase = getSupabaseClient('japan')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generating, setGenerating] = useState(false)

  // 기본 가이드 정보
  const [basicGuide, setBasicGuide] = useState('')
  
  // 고도화 가이드 입력
  const [productInfo, setProductInfo] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [shootingStyle, setShootingStyle] = useState('')
  
  // 생성된 고도화 가이드
  const [advancedGuide, setAdvancedGuide] = useState('')
  const [guidePageUrl, setGuidePageUrl] = useState('')

  // 캠페인 정보 로드
  useEffect(() => {
    if (campaignId) {
      loadCampaignInfo()
    }
  }, [campaignId])

  const loadCampaignInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('title, description, google_slides_url')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      setCampaignTitle(data.title || '')
      setBasicGuide(data.google_slides_url || '')
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러올 수 없습니다.')
    }
  }

  // 고도화 가이드 생성 (Gemini AI)
  const generateAdvancedGuide = async () => {
    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      // TODO: Gemini AI로 고도화 가이드 생성
      // - 기본 가이드 + 추가 정보를 바탕으로
      // - 대사, 촬영 장면, 편집 가이드 등 상세 생성
      
      setSuccess('고도화 가이드 생성 기능은 추후 구현 예정입니다.')
    } catch (err) {
      console.error('가이드 생성 실패:', err)
      setError('가이드 생성에 실패했습니다: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // JP 페이지 생성 및 URL 발급
  const createGuidePage = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      // TODO: JP 페이지 생성
      // - 고도화 가이드를 JP 페이지로 변환
      // - URL 발급
      // - Supabase에 URL 저장
      
      setSuccess('가이드 페이지 생성 기능은 추후 구현 예정입니다.')
    } catch (err) {
      console.error('페이지 생성 실패:', err)
      setError('페이지 생성에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-20 lg:pt-8 lg:pb-8">
        <div className="mb-6">
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">고도화 가이드 생성</h1>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">캠페인: {campaignTitle}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* 기본 가이드 표시 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 가이드</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={basicGuide}
                readOnly
                rows={8}
                className="bg-gray-50"
              />
            </CardContent>
          </Card>

          {/* 추가 정보 입력 */}
          <Card>
            <CardHeader>
              <CardTitle>추가 정보 입력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="product-info">제품 상세 정보</Label>
                <Textarea
                  id="product-info"
                  value={productInfo}
                  onChange={(e) => setProductInfo(e.target.value)}
                  rows={4}
                  placeholder="제품의 특징, 성분, 효과 등을 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor="target-audience">타겟 오디언스</Label>
                <Input
                  id="target-audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="예: 20-30대 여성, 건성 피부"
                />
              </div>

              <div>
                <Label htmlFor="key-message">핵심 메시지</Label>
                <Textarea
                  id="key-message"
                  value={keyMessage}
                  onChange={(e) => setKeyMessage(e.target.value)}
                  rows={3}
                  placeholder="크리에이터가 전달해야 할 핵심 메시지"
                />
              </div>

              <div>
                <Label htmlFor="shooting-style">촬영 스타일</Label>
                <Input
                  id="shooting-style"
                  value={shootingStyle}
                  onChange={(e) => setShootingStyle(e.target.value)}
                  placeholder="예: 자연스러운 일상, 전문적인 리뷰"
                />
              </div>

              <Button 
                onClick={generateAdvancedGuide}
                disabled={generating}
                className="w-full"
              >
                {generating ? '생성 중...' : '🤖 AI로 고도화 가이드 생성'}
              </Button>
            </CardContent>
          </Card>

          {/* 생성된 고도화 가이드 */}
          {advancedGuide && (
            <Card>
              <CardHeader>
                <CardTitle>생성된 고도화 가이드</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={advancedGuide}
                  onChange={(e) => setAdvancedGuide(e.target.value)}
                  rows={15}
                  placeholder="AI가 생성한 고도화 가이드"
                />

                <Button 
                  onClick={createGuidePage}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? '생성 중...' : '📄 JP 페이지 생성 및 URL 발급'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 생성된 URL */}
          {guidePageUrl && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-900">✅ 가이드 페이지 생성 완료</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>가이드 페이지 URL</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={guidePageUrl}
                      readOnly
                      className="bg-white flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => window.open(guidePageUrl, '_blank')}
                    >
                      열기
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    이 URL은 캠페인 승인 후 자동으로 저장됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 버튼 */}
        <div className="mt-6 flex gap-4 justify-end">
          <Button 
            variant="outline" 
            onClick={() => navigate('/company/campaigns')}
          >
            완료
          </Button>
        </div>

        {/* 안내 메시지 */}
        <Card className="mt-6 bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ 개발 중</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 이 페이지는 현재 틀만 구현된 상태입니다</li>
              <li>• Gemini AI 연동 및 JP 페이지 생성 기능은 추후 구현 예정입니다</li>
              <li>• 기업 승인 프로세스도 함께 구현될 예정입니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdvancedGuideJapan
