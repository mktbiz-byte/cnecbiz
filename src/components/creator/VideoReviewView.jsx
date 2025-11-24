import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Send, MessageSquare, Upload } from 'lucide-react'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReviewView() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const videoContainerRef = useRef(null)
  
  const [submission, setSubmission] = useState(null)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({}) // { commentId: [replies] }
  const [loading, setLoading] = useState(true)
  const [signedVideoUrl, setSignedVideoUrl] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [selectedComment, setSelectedComment] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(true)

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

    const handlePlay = () => setIsPaused(false)
    const handlePause = () => setIsPaused(true)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [signedVideoUrl])

  const loadSubmission = async () => {
    try {
      const { data, error } = await supabaseKorea
        .from('video_submissions')
        .select(`
          *,
          applications (
            applicant_name,
            campaigns (
              title,
              company_name
            )
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
      alert('댓글이 추가되었습니다.')
    } catch (error) {
      console.error('Error adding reply:', error)
      alert('댓글 추가 실패')
    }
  }

  const deleteReply = async (replyId, commentId) => {
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea
        .from('video_review_comment_replies')
        .delete()
        .eq('id', replyId)

      if (error) throw error

      setReplies({
        ...replies,
        [commentId]: replies[commentId].filter(r => r.id !== replyId)
      })
      alert('댓글이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting reply:', error)
      alert('댓글 삭제 실패')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const seekToTimestamp = (timestamp, commentId) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
      videoRef.current.pause()
      setSelectedComment(commentId)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>
  }

  if (!submission) {
    return <div className="flex items-center justify-center h-screen">영상을 찾을 수 없습니다.</div>
  }

  const campaignTitle = submission.applications?.campaigns?.title || '캠페인'
  const companyName = submission.applications?.campaigns?.company_name || '기업'

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
          <h1 className="text-3xl font-bold">영상 수정 요청 사항</h1>
          <p className="text-gray-600 mt-2">
            {campaignTitle} - {companyName}
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 수정 요청 사항을 확인하고 영상을 수정한 후 재업로드해 주세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 영상 플레이어 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div 
                ref={videoContainerRef}
                className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative"
              >
                <video
                  ref={videoRef}
                  controls
                  crossOrigin="anonymous"
                  className="w-full h-full"
                  src={signedVideoUrl || submission.video_file_url}
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
                
                {/* Read-only comment markers - only show when video is at that timestamp */}
                {comments.map((comment, index) => {
                  const x = comment.box_x || (20 + (comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60))
                  const y = comment.box_y || (20 + ((comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 7) % 60))
                  const width = comment.box_width || 120
                  const height = comment.box_height || 120
                  const isSelected = selectedComment === comment.id
                  
                  // Only show marker when video is paused AND within ±2 seconds of current time
                  const timeDiff = Math.abs(currentTime - comment.timestamp)
                  const isVisible = isPaused && timeDiff <= 2
                  
                  if (!isVisible) return null
                  
                  return (
                    <div
                      key={comment.id}
                      className={`absolute cursor-pointer transition-all ${
                        isSelected ? 'border-4 border-yellow-500 z-20' : 'border-4 border-blue-500 z-10'
                      }`}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}px`,
                        height: `${height}px`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        seekToTimestamp(comment.timestamp, comment.id)
                      }}
                    >
                      <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                        isSelected ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'
                      }`}>
                        #{index + 1} {formatTime(comment.timestamp)}
                      </div>
                      {/* Comment text bubble */}
                      {comment.comment && (
                        <div className="absolute -bottom-2 left-1/2 transform translate-y-full -translate-x-1/2 z-30">
                          <div className="bg-white border-2 border-blue-500 rounded-lg p-2 shadow-lg min-w-[120px] max-w-[200px]">
                            <div className="text-xs text-gray-800 whitespace-normal break-words text-center">
                              {comment.comment}
                            </div>
                            {/* Arrow pointing up to the box */}
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-blue-500"></div>
                            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-white"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Timeline with feedback markers */}
              <div className="relative h-3 bg-gray-300 rounded-full mb-4">
                {comments.map((comment, index) => {
                  const position = videoRef.current ? (comment.timestamp / videoRef.current.duration) * 100 : 0
                  const isSelected = selectedComment === comment.id
                  return (
                    <div
                      key={comment.id}
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer hover:scale-125 transition-all shadow-md ${
                        isSelected ? 'bg-yellow-500' : 'bg-blue-500 hover:bg-blue-700'
                      }`}
                      style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={() => seekToTimestamp(comment.timestamp, comment.id)}
                      title={`#${index + 1} - ${formatTime(comment.timestamp)}`}
                    >
                       <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                        #{index + 1} {formatTime(comment.timestamp)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 영상 재업로드 버튼 */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">수정 완료 후</h3>
                <p className="text-sm text-gray-600 mb-3">
                  수정 사항을 반영한 영상을 다시 업로드해 주세요.
                </p>
                <Button
                  onClick={() => navigate(`/creator/campaigns`)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  영상 재업로드하기
                </Button>
              </div>
            </Card>
          </div>

          {/* 오른쪽: 피드백 목록 */}
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                수정 요청 사항 ({comments.length})
              </h3>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  수정 요청 사항이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment, index) => {
                    const isSelected = selectedComment === comment.id
                    return (
                      <div
                        key={comment.id}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          isSelected 
                            ? 'border-yellow-500 bg-yellow-50' 
                            : 'border-gray-200 hover:border-blue-400'
                        }`}
                      >
                        {/* 피드백 헤더 */}
                        <div
                          className="cursor-pointer"
                          onClick={() => seekToTimestamp(comment.timestamp, comment.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                isSelected ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'
                              }`}>
                                {index + 1}
                              </span>
                              <span className={`text-sm font-semibold ${
                                isSelected ? 'text-yellow-700' : 'text-blue-600'
                              }`}>
                                {formatTime(comment.timestamp)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap font-medium">
                            {comment.comment}
                          </p>
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
                            <div key={reply.id} className="bg-gray-50 rounded p-2 mb-2 text-xs relative group">
                              <div className="font-semibold text-gray-700">{reply.author_name}</div>
                              <div className="text-gray-600 mt-1">{reply.reply_text}</div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-gray-400 text-[10px]">
                                  {new Date(reply.created_at).toLocaleString('ko-KR')}
                                </div>
                                <button
                                  onClick={() => deleteReply(reply.id, comment.id)}
                                  className="text-red-500 hover:text-red-700 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  삭제
                                </button>
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
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
