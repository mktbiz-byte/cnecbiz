import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Video, Clock, Plus, Trash2, Send, CheckCircle } from 'lucide-react'

export default function VideoRevisionPage() {
  const { campaignId, videoId } = useParams()
  const navigate = useNavigate()
  
  const [videoUrl, setVideoUrl] = useState('')
  const [revisions, setRevisions] = useState([])
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [success, setSuccess] = useState('')

  // Mock video data
  const videoData = {
    creator_name: '뷰티유튜버김지수',
    submitted_at: '2025-10-17 14:30',
    video_url: 'https://youtube.com/watch?v=example',
    duration: '1:23'
  }

  const handleAddRevision = () => {
    setRevisions([
      ...revisions,
      {
        id: Date.now(),
        timestamp: '',
        description: ''
      }
    ])
  }

  const handleRemoveRevision = (id) => {
    setRevisions(revisions.filter(r => r.id !== id))
  }

  const handleRevisionChange = (id, field, value) => {
    setRevisions(revisions.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ))
  }

  const handleSubmit = () => {
    // Validate
    const invalidRevisions = revisions.filter(r => !r.timestamp || !r.description)
    if (invalidRevisions.length > 0) {
      alert('모든 수정 요청의 타임스탬프와 설명을 입력해주세요.')
      return
    }

    // Submit to Supabase
    console.log('Submitting revisions:', {
      revisions,
      generalFeedback
    })

    setSuccess('수정 요청이 크리에이터에게 전송되었습니다!')
    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)
  }

  const handleApprove = () => {
    // Approve video
    setSuccess('영상이 최종 승인되었습니다!')
    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)
  }

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTimestamp = (timestamp) => {
    // Parse MM:SS or M:SS format
    const parts = timestamp.split(':')
    if (parts.length !== 2) return null
    
    const mins = parseInt(parts[0])
    const secs = parseInt(parts[1])
    
    if (isNaN(mins) || isNaN(secs)) return null
    
    return mins * 60 + secs
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Video className="w-6 h-6 text-blue-600" />
                영상 검토 및 수정 요청
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                크리에이터: {videoData.creator_name} | 제출: {videoData.submitted_at}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Video Player */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">제출된 영상</CardTitle>
                <CardDescription>
                  영상 길이: {videoData.duration}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm opacity-75">영상 플레이어</p>
                    <p className="text-xs opacity-50 mt-2">{videoData.video_url}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-base font-semibold">영상 URL</Label>
                  <Input
                    value={videoData.video_url}
                    readOnly
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Timestamp Helper */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  타임스탬프 가이드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-900">형식: MM:SS</p>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div>• 0:15 = 15초</div>
                    <div>• 0:30 = 30초</div>
                    <div>• 1:00 = 1분</div>
                    <div>• 1:23 = 1분 23초</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Revision Form */}
          <div className="space-y-6">
            {/* Timestamp-based Revisions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">타임스탬프별 수정 요청</CardTitle>
                    <CardDescription>
                      수정이 필요한 구간의 시간과 내용을 입력하세요
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddRevision} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {revisions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>수정 요청을 추가해주세요</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {revisions.map((revision, index) => (
                      <div key={revision.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">
                            수정 요청 #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRevision(revision.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            타임스탬프 (MM:SS) *
                          </Label>
                          <Input
                            value={revision.timestamp}
                            onChange={(e) => handleRevisionChange(revision.id, 'timestamp', e.target.value)}
                            placeholder="예: 0:15"
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-500">
                            예: 0:15 (15초), 1:23 (1분 23초)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">
                            수정 내용 *
                          </Label>
                          <Textarea
                            value={revision.description}
                            onChange={(e) => handleRevisionChange(revision.id, 'description', e.target.value)}
                            placeholder="예: 제품 로고가 잘 보이지 않습니다. 더 크게 클로즈업해주세요."
                            rows={3}
                            className="text-base"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* General Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">전체 피드백</CardTitle>
                <CardDescription>
                  타임스탬프와 관계없는 전반적인 피드백을 작성하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generalFeedback}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  placeholder="예: 전반적으로 좋은 영상입니다. 다만 밝기를 조금 더 높이면 더 좋을 것 같습니다."
                  rows={6}
                  className="text-base leading-relaxed"
                />
              </CardContent>
            </Card>

            {/* Success Message */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleSubmit}
                variant="outline"
                className="h-12 text-base"
                size="lg"
                disabled={revisions.length === 0 && !generalFeedback}
              >
                <Send className="mr-2 h-5 w-5" />
                수정 요청 전송
              </Button>
              <Button
                onClick={handleApprove}
                className="h-12 text-base bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                최종 승인
              </Button>
            </div>

            {/* Revision History */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">수정 이력</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold">2025-10-17 14:30</p>
                      <p>초기 영상 제출</p>
                    </div>
                  </div>
                  <div className="text-center text-gray-400 py-4">
                    아직 수정 요청 이력이 없습니다
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

