import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Camera, Send, MessageSquare, X } from 'lucide-react'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReview() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const videoContainerRef = useRef(null)
  
  const [submission, setSubmission] = useState(null)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({}) // { commentId: [replies] }
  const [currentComment, setCurrentComment] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [capturedFrame, setCapturedFrame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signedVideoUrl, setSignedVideoUrl] = useState(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [clickPosition, setClickPosition] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [authorName, setAuthorName] = useState('')

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
      
      // Generate signed URL for video (5 hours validity)
      if (data && data.video_file_url) {
        try {
          const url = new URL(data.video_file_url)
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/campaign-videos\/(.+)$/)
          if (pathMatch) {
            const filePath = pathMatch[1]
            const { data: signedData, error: signedError } = await supabaseKorea.storage
              .from('campaign-videos')
              .createSignedUrl(filePath, 18000) // 5 hours = 18000 seconds
            
            if (signedError) {
              console.error('Error creating signed URL:', signedError)
              setSignedVideoUrl(data.video_file_url)
            } else {
              setSignedVideoUrl(signedData.signedUrl)
              console.log('Generated signed URL for video')
            }
          } else {
            setSignedVideoUrl(data.video_file_url)
          }
        } catch (err) {
          console.error('Error parsing video URL:', err)
          setSignedVideoUrl(data.video_file_url)
        }
      }
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
      
      // Load replies for all comments
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: repliesData, error: repliesError } = await supabaseKorea
          .from('video_review_comment_replies')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: true })
        
        if (!repliesError && repliesData) {
          const repliesByComment = repliesData.reduce((acc, reply) => {
            if (!acc[reply.comment_id]) acc[reply.comment_id] = []
            acc[reply.comment_id].push(reply)
            return acc
          }, {})
          setReplies(repliesByComment)
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const handleVideoClick = (e) => {
    if (!videoRef.current || !videoContainerRef.current) return
    
    const rect = videoContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setClickPosition({ x, y })
    captureFrame()
    setShowCommentForm(true)
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
      alert('코멘트를 작성해주세요.')
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
      setShowCommentForm(false)
      setClickPosition(null)
      alert('피드백이 추가되었습니다.')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('피드백 추가 실패')
    }
  }

  const addReply = async (commentId) => {
    if (!replyText.trim() || !authorName.trim()) {
      alert('이름과 댓글을 모두 입력해주세요.')
      return
    }

    try {
      const { data, error } = await supabaseKorea
        .from('video_review_comment_replies')
        .insert({
          comment_id: commentId,
          author_name: authorName,
          reply_text: replyText
        })
        .select()
        .single()

      if (error) throw error

      setReplies({
        ...replies,
        [commentId]: [...(replies[commentId] || []), data]
      })
      setReplyText('')
      setAuthorName('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Error adding reply:', error)
      alert('댓글 추가 실패')
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
      videoRef.current.play()
    }
  }

  const cancelCommentForm = () => {
    setShowCommentForm(false)
    setCurrentComment('')
    setCapturedFrame(null)
    setClickPosition(null)
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
          <p className="text-sm text-gray-500 mt-1">
            💡 영상을 클릭하여 해당 위치에 피드백을 추가하세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 영상 플레이어 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div 
                ref={videoContainerRef}
                className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative cursor-pointer"
                onClick={handleVideoClick}
              >
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-full"
                  src={signedVideoUrl || submission.video_file_url}
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
                
                {/* Click markers on video */}
                {comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className="absolute w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-red-600 transition-colors"
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      top: `${Math.random() * 80 + 10}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      seekToTimestamp(comment.timestamp)
                    }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>

              {/* 피드백 작성 폼 */}
              {showCommentForm && capturedFrame && (
                <div className="mt-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">피드백 작성 ({formatTime(currentTimestamp)})</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelCommentForm}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <img src={capturedFrame} alt="Captured frame" className="w-full rounded-lg border mb-3" />
                  
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
                    피드백 추가
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </Card>
          </div>

          {/* 오른쪽: 피드백 목록 */}
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                피드백 타임라인 ({comments.length})
              </h3>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  영상을 클릭하여 첫 피드백을 추가하세요!
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
                    >
                      {/* 피드백 헤더 */}
                      <div
                        className="cursor-pointer"
                        onClick={() => seekToTimestamp(comment.timestamp)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatTime(comment.timestamp)}
                            </span>
                          </div>
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
                        
                        <p className="text-sm text-gray-700 mb-3">{comment.comment}</p>
                      </div>

                      {/* 댓글 섹션 */}
                      <div className="border-t pt-3 mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">
                            댓글 {replies[comment.id]?.length || 0}
                          </span>
                        </div>

                        {/* 댓글 목록 */}
                        {replies[comment.id]?.map((reply) => (
                          <div key={reply.id} className="bg-gray-50 rounded p-2 mb-2 text-xs">
                            <div className="font-semibold text-gray-700">{reply.author_name}</div>
                            <div className="text-gray-600 mt-1">{reply.reply_text}</div>
                            <div className="text-gray-400 text-[10px] mt-1">
                              {new Date(reply.created_at).toLocaleString('ko-KR')}
                            </div>
                          </div>
                        ))}

                        {/* 댓글 작성 폼 */}
                        {replyingTo === comment.id ? (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={authorName}
                              onChange={(e) => setAuthorName(e.target.value)}
                              placeholder="이름"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs mb-1"
                            />
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="댓글을 입력하세요..."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              rows={2}
                            />
                            <div className="flex gap-1 mt-1">
                              <Button
                                size="sm"
                                onClick={() => addReply(comment.id)}
                                className="flex-1 h-7 text-xs"
                              >
                                작성
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyText('')
                                  setAuthorName('')
                                }}
                                className="h-7 text-xs"
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReplyingTo(comment.id)}
                            className="w-full mt-2 h-7 text-xs"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            댓글 달기
                          </Button>
                        )}
                      </div>
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
