import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'

const CampaignGuideEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('id')

  const [guide, setGuide] = useState('')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)

  // 캠페인 정보 및 가이드 로드
  useEffect(() => {
    if (campaignId) {
      loadCampaignGuide()
    }
  }, [campaignId])

  // 자동 저장 (5초마다)
  useEffect(() => {
    if (!campaignId || !guide) return

    const timer = setTimeout(() => {
      autoSaveGuide()
    }, 5000)

    return () => clearTimeout(timer)
  }, [guide, campaignId])

  const loadCampaignGuide = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('title, creator_guide')
        .eq('id', campaignId)
        .single()

      if (error) throw error

      if (data) {
        setCampaignTitle(data.title)
        setGuide(data.creator_guide || '')
      }
    } catch (err) {
      console.error('캠페인 정보 로드 실패:', err)
      setError('캠페인 정보를 불러오는데 실패했습니다.')
    }
  }

  const autoSaveGuide = async () => {
    setAutoSaving(true)
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ creator_guide: guide })
        .eq('id', campaignId)

      if (error) throw error
    } catch (err) {
      console.error('자동 저장 실패:', err)
    } finally {
      setAutoSaving(false)
    }
  }

  const handleSave = async () => {
    if (!guide.trim()) {
      setError('크리에이터 가이드를 입력해주세요.')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ creator_guide: guide })
        .eq('id', campaignId)

      if (error) throw error

      setSuccess('크리에이터 가이드가 저장되었습니다!')
      setTimeout(() => {
        navigate('/company/campaigns')
      }, 1500)
    } catch (err) {
      console.error('가이드 저장 실패:', err)
      setError('가이드 저장에 실패했습니다: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = () => {
    if (confirm('크리에이터 가이드를 나중에 작성하시겠습니까?')) {
      navigate('/company/campaigns')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/company/campaigns')}>
            ← 캠페인 목록으로
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              📝 크리에이터 가이드 작성
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              캠페인: <strong>{campaignTitle}</strong>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              크리에이터가 확인할 기본 가이드를 작성하세요. 작성 중 자동으로 임시저장됩니다.
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="guide">크리에이터 가이드</Label>
                  {autoSaving && (
                    <span className="text-xs text-gray-500">💾 자동 저장 중...</span>
                  )}
                </div>
                <Textarea
                  id="guide"
                  value={guide}
                  onChange={(e) => setGuide(e.target.value)}
                  placeholder="예:&#10;&#10;1. 제품 사용 후 솔직한 리뷰를 작성해주세요&#10;2. 영상 길이는 1-3분 사이로 제작해주세요&#10;3. 필수 해시태그: #브랜드명 #제품명&#10;4. 영상 업로드 후 링크를 제출해주세요&#10;5. 제품 수령 후 7일 이내 콘텐츠 제작 완료"
                  rows={20}
                  className="font-mono"
                />
                <p className="text-sm text-gray-500 mt-2">
                  💡 팁: 촬영 가이드, 필수 멘트, 해시태그, 제출 방법 등을 상세히 작성하면 좋습니다.
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleSave} 
                  disabled={processing || !guide.trim()} 
                  className="flex-1"
                >
                  {processing ? '저장 중...' : '저장하고 완료'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSkip}
                >
                  나중에 작성
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CampaignGuideEditor

