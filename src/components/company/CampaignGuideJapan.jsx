import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import CompanyNavigation from './CompanyNavigation'

const CampaignGuideJapan = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')
  const supabase = getSupabaseClient('japan')

  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [translating, setTranslating] = useState(false)

  // 한국어/일본어 가이드
  const [guideKo, setGuideKo] = useState('')
  const [guideJa, setGuideJa] = useState('')

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
        .select('title, google_drive_url, google_slides_url')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      setCampaignTitle(data.title || '')
      setGuideKo(data.google_drive_url || '')  // 임시로 한국어 가이드 저장용
      setGuideJa(data.google_slides_url || '')  // 일본어 가이드 저장용
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러올 수 없습니다.')
    }
  }

  // 번역 함수
  const translateToJapanese = async () => {
    if (!guideKo.trim()) {
      setError('한국어 가이드를 먼저 작성해주세요.')
      return
    }

    setTranslating(true)
    setError('')

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + import.meta.env.VITE_GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `다음 한국어 크리에이터 가이드를 일본어로 번역해주세요. 자연스럽고 전문적인 일본어로 번역해주세요.\n\n${guideKo}`
            }]
          }]
        })
      })

      const data = await response.json()
      const translated = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      if (translated) {
        setGuideJa(translated)
        setSuccess('일본어로 번역되었습니다!')
      } else {
        throw new Error('번역 결과가 없습니다.')
      }
    } catch (err) {
      console.error('번역 실패:', err)
      setError('번역에 실패했습니다: ' + err.message)
    } finally {
      setTranslating(false)
    }
  }

  // 저장
  const handleSave = async () => {
    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          google_drive_url: guideKo,  // 한국어 가이드 (임시)
          google_slides_url: guideJa,  // 일본어 가이드
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('가이드가 저장되었습니다!')
      
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 1500)
    } catch (err) {
      console.error('저장 실패:', err)
      setError('저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">크리에이터 가이드 작성</h1>
          <p className="text-gray-600 mt-2">캠페인: {campaignTitle}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 한국어 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🇰🇷 한국어 가이드 (기업 참고용)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guide-ko">가이드 내용</Label>
                <Textarea
                  id="guide-ko"
                  value={guideKo}
                  onChange={(e) => setGuideKo(e.target.value)}
                  rows={20}
                  placeholder="크리에이터에게 전달할 가이드를 작성하세요&#10;&#10;예시:&#10;- 필수 대사&#10;- 필수 촬영 장면&#10;- 영상 길이&#10;- 톤앤매너&#10;- 해시태그"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* 오른쪽: 일본어 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🇯🇵 일본어 가이드 (크리에이터용)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guide-ja">가이드 내용</Label>
                <Textarea
                  id="guide-ja"
                  value={guideJa}
                  onChange={(e) => setGuideJa(e.target.value)}
                  rows={20}
                  placeholder="일본어 가이드 내용"
                  className="font-mono"
                />
              </div>

              <Button 
                onClick={translateToJapanese} 
                disabled={translating || !guideKo.trim()}
                className="w-full"
                variant="outline"
              >
                {translating ? '번역 중...' : '← 한국어 가이드 번역하기'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 저장 버튼 */}
        <div className="mt-6 flex gap-4 justify-end">
          <Button 
            variant="outline" 
            onClick={() => navigate('/company/campaigns')}
            disabled={processing}
          >
            취소
          </Button>
          <Button 
            onClick={handleSave}
            disabled={processing || !guideJa.trim()}
          >
            {processing ? '저장 중...' : '저장'}
          </Button>
        </div>

        {/* 안내 메시지 */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">📝 가이드 작성 팁</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 한국어로 가이드를 작성한 후 "번역하기" 버튼을 클릭하세요</li>
              <li>• 번역된 일본어 가이드를 검토하고 필요시 수정하세요</li>
              <li>• 저장 후 고도화 가이드 생성 페이지에서 더 상세한 가이드를 만들 수 있습니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CampaignGuideJapan
