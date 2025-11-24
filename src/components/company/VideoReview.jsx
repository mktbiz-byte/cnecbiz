import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Camera, Send } from 'lucide-react'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReview() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  
  const [submission, setSubmission] = useState(null)
  const [comments, setComments] = useState([])
  const [currentComment, setCurrentComment] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [capturedFrame, setCapturedFrame] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubmission()
    loadComments()
  }, [submissionId])

  const loadSubmission = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('video_submissions')
        .select(`
          *,
          applications (
            applicant_name
          )
        `)
        .eq('id', submissionId)
        .single()

      if (error) throw error
      setSubmission(data)
    } catch (error) {
      console.error('Error loading submission:', error)
      alert('영상을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('video_review_comments')
        .select('*')
        .eq('submission_id', submissionId)
        .order('timestamp', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedFrame(dataUrl)
    setCurrentTimestamp(video.currentTime)
  }

  const addComment = async () => {
    if (!currentComment.trim() || !capturedFrame) {
      alert('캡처와 코멘트를 모두 작성해주세요.')
      return
    }

    try {
      const { data, error } = await supabaseKorea
        .from('video_review_comments')
        .insert({
          submission_id: submissionId,
          timestamp: currentTimestamp,
          comment: currentComment,
          frame_capture: capturedFrame
        })
        .select()
        .single()

      if (error) throw error

      setComments([...comments, data])
      setCurrentComment('')
      setCapturedFrame(null)
      alert('코멘트가 추가되었습니다.')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('코멘트 추가 실패')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const seekToTimestamp = (timestamp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>
  }

  if (!submission) {
    return <div className="flex items-center justify-center h-screen">영상을 찾을 수 없습니다.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로 가기
          </Button>
          <h1 className="text-3xl font-bold">영상 수정 요청</h1>
          <p className="text-gray-600 mt-2">
            {submission.applications?.applicant_name || '크리에이터'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 영상 플레이어 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-full"
                  src={submission.video_file_url}
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              </div>

              <Button
                onClick={captureFrame}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                현재 화면 캡처
              </Button>

              {/* 캡처된 프레임 */}
              {capturedFrame && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">캡처된 화면 ({formatTime(currentTimestamp)})</p>
                  <img src={capturedFrame} alt="Captured frame" className="w-full rounded-lg border" />
                  
                  <div className="mt-4">
                    <textarea
                      value={currentComment}
                      onChange={(e) => setCurrentComment(e.target.value)}
                      placeholder="이 시점에 대한 수정 요청 사항을 작성하세요..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                    />
                    <Button
                      onClick={addComment}
                      className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      코멘트 추가
                    </Button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </Card>
          </div>

          {/* 오른쪽: 코멘트 목록 */}
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">피드백 타임라인</h3>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  아직 피드백이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => seekToTimestamp(comment.timestamp)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-600">
                          {formatTime(comment.timestamp)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      
                      {comment.frame_capture && (
                        <img
                          src={comment.frame_capture}
                          alt="Frame"
                          className="w-full rounded mb-2"
                        />
                      )}
                      
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
