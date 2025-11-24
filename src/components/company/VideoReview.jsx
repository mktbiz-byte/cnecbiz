import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Send, MessageSquare, X, Trash2, Mail } from 'lucide-react'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReview() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const videoContainerRef = useRef(null)
  
  const [submission, setSubmission] = useState(null)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({}) // { commentId: [replies] }
  const [currentComment, setCurrentComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [signedVideoUrl, setSignedVideoUrl] = useState(null)
  const [activeMarker, setActiveMarker] = useState(null) // { x, y, timestamp, width, height }
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    loadSubmission()
    loadComments()
  }, [submissionId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [])

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
      
      // Use public URL directly since bucket is now public
      setSignedVideoUrl(data.video_file_url)
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
    
    // Pause video when clicking
    videoRef.current.pause()
    
    const rect = videoContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    const timestamp = videoRef.current.currentTime
    
    setActiveMarker({ x, y, timestamp, width: 120, height: 120 })
    setCurrentComment('')
  }

  const addComment = async () => {
    if (!currentComment.trim() || !activeMarker) {
      alert('수정 요청 사항을 작성해주세요.')
      return
    }

    try {
      const { data, error } = await supabaseKorea
        .from('video_review_comments')
        .insert({
          submission_id: submissionId,
          timestamp: activeMarker.timestamp,
          comment: currentComment,
          box_x: activeMarker.x,
          box_y: activeMarker.y,
          box_width: activeMarker.width,
          box_height: activeMarker.height
        })
        .select()
        .single()

      if (error) throw error

      setComments([...comments, data])
      setCurrentComment('')
      setActiveMarker(null)
      alert('피드백이 추가되었습니다.')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('피드백 추가 실패')
    }
  }

  const deleteComment = async (commentId) => {
    if (!confirm('이 피드백을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea
        .from('video_review_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(c => c.id !== commentId))
      alert('피드백이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('피드백 삭제 실패')
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
      videoRef.current.pause()
    }
  }

  const cancelMarker = () => {
    setActiveMarker(null)
    setCurrentComment('')
  }

  const sendReviewNotification = async () => {
    if (comments.length === 0) {
      alert('피드백을 먼저 추가해주세요.')
      return
    }

    if (!confirm(`${comments.length}개의 피드백을 크리에이터에게 전달하시겠습니까?`)) {
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/.netlify/functions/send-video-review-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          feedbackCount: comments.length
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '알림 전송 실패')
      }

      alert('수정 요청이 크리에이터에게 전달되었습니다. (알림톡 + 이메일)')
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('알림 전송 실패: ' + error.message)
    } finally {
      setIsSending(false)
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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <Button
              onClick={sendReviewNotification}
              disabled={isSending || comments.length === 0}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isSending ? '전송 중...' : `수정 요청 전달하기 (${comments.length})`}
            </Button>
          </div>
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
                className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative"
              >
                {/* Transparent overlay for click detection - exclude bottom 60px for controls */}
                <div 
                  className="absolute top-0 left-0 right-0 cursor-crosshair"
                  style={{ 
                    bottom: '60px',
                    pointerEvents: 'auto',
                    zIndex: 5
                  }}
                  onClick={handleVideoClick}
                />
                <video
                  ref={videoRef}
                  controls
                  crossOrigin="anonymous"
                  className="w-full h-full"
                  src={signedVideoUrl || submission.video_file_url}
                  onClick={(e) => e.stopPropagation()}
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
                
                {/* Active marker (being created) */}
                {activeMarker && (
                  <div
                    className="absolute border-4 border-yellow-500 cursor-move"
                    style={{
                      left: `${activeMarker.x}%`,
                      top: `${activeMarker.y}%`,
                      width: `${activeMarker.width}px`,
                      height: `${activeMarker.height}px`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'auto',
                      zIndex: 20
                    }}
                    onMouseDown={(e) => {
                      // Check if clicking on resize handle
                      if (e.target.closest('.resize-handle')) return
                      e.stopPropagation()
                      e.preventDefault()
                      const startX = e.clientX
                      const startY = e.clientY
                      const startMarkerX = activeMarker.x
                      const startMarkerY = activeMarker.y
                      
                      const handleMouseMove = (moveEvent) => {
                        moveEvent.preventDefault()
                        const rect = videoContainerRef.current.getBoundingClientRect()
                        const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100
                        const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100
                        const newX = Math.max(10, Math.min(90, startMarkerX + deltaX))
                        const newY = Math.max(10, Math.min(90, startMarkerY + deltaY))
                        setActiveMarker({ ...activeMarker, x: newX, y: newY })
                      }
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove)
                        document.removeEventListener('mouseup', handleMouseUp)
                      }
                      
                      document.addEventListener('mousemove', handleMouseMove)
                      document.addEventListener('mouseup', handleMouseUp)
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                      {formatTime(activeMarker.timestamp)}
                    </div>
                    {/* Resize handles */}
                    <div 
                      className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-500 rounded-full cursor-se-resize"
                      style={{ pointerEvents: 'auto' }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        const startX = e.clientX
                        const startY = e.clientY
                        const startWidth = activeMarker.width
                        const startHeight = activeMarker.height
                        
                        const handleMouseMove = (moveEvent) => {
                          const deltaX = moveEvent.clientX - startX
                          const deltaY = moveEvent.clientY - startY
                          const rect = videoContainerRef.current.getBoundingClientRect()
                          const newWidth = Math.max(40, startWidth + (deltaX / rect.width) * 100 * 10)
                          const newHeight = Math.max(40, startHeight + (deltaY / rect.height) * 100 * 10)
                          setActiveMarker({ ...activeMarker, width: newWidth, height: newHeight })
                        }
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove)
                          document.removeEventListener('mouseup', handleMouseUp)
                        }
                        
                        document.addEventListener('mousemove', handleMouseMove)
                        document.addEventListener('mouseup', handleMouseUp)
                      }}
                    />
                  </div>
                )}
                
                {/* Existing comment markers - only show when video is at that timestamp */}
                {comments.map((comment, index) => {
                  const x = comment.box_x || (20 + (comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60))
                  const y = comment.box_y || (20 + ((comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 7) % 60))
                  const width = comment.box_width || 120
                  const height = comment.box_height || 120
                  
                  // Only show marker when video is paused or within 0.5 seconds of the timestamp
                  const isVisible = videoRef.current?.paused || Math.abs(currentTime - comment.timestamp) < 0.5
                  
                  if (!isVisible) return null
                  
                  return (
                    <div
                      key={comment.id}
                      className="absolute border-4 border-blue-500 cursor-pointer hover:border-blue-600 transition-all"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        seekToTimestamp(comment.timestamp)
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                        #{index + 1} {formatTime(comment.timestamp)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Timeline with feedback markers */}
              <div className="relative h-2 bg-gray-300 rounded-full mb-4">
                {comments.map((comment, index) => {
                  const position = videoRef.current ? (comment.timestamp / videoRef.current.duration) * 100 : 0
                  return (
                    <div
                      key={comment.id}
                      className="absolute top-0 w-1 h-full bg-blue-500 cursor-pointer hover:bg-blue-700 transition-colors"
                      style={{ left: `${position}%` }}
                      onClick={() => seekToTimestamp(comment.timestamp)}
                      title={`#${index + 1} - ${formatTime(comment.timestamp)}`}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-1 rounded text-[10px] font-bold whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        #{index + 1}
                      </div>
                    </div>
                  )
                })}
                {activeMarker && videoRef.current && (
                  <div
                    className="absolute top-0 w-1 h-full bg-yellow-500"
                    style={{ left: `${(activeMarker.timestamp / videoRef.current.duration) * 100}%` }}
                  />
                )}
              </div>

              {/* 피드백 작성 폼 */}
              {activeMarker && (
                <div className="mt-4 p-4 border-2 border-yellow-500 rounded-lg bg-yellow-50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">수정 요청 작성 ({formatTime(activeMarker.timestamp)})</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelMarker}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <textarea
                    value={currentComment}
                    onChange={(e) => setCurrentComment(e.target.value)}
                    placeholder="이 위치에 대한 수정 요청 사항을 작성하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                    rows={4}
                    autoFocus
                  />
                  <Button
                    onClick={addComment}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    피드백 추가
                  </Button>
                </div>
              )}
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
                            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatTime(comment.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteComment(comment.id)
                              }}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{comment.comment}</p>
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
