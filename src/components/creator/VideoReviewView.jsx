import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Send, MessageSquare, Upload, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReviewView() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const videoContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const [submission, setSubmission] = useState(null)
  const [comments, setComments] = useState([])
  const [replies, setReplies] = useState({})
  const [loading, setLoading] = useState(true)
  const [signedVideoUrl, setSignedVideoUrl] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [selectedComment, setSelectedComment] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [useCrossOrigin, setUseCrossOrigin] = useState(true)

  useEffect(() => {
    loadSubmission()
    loadComments()
  }, [submissionId])

  // Video error handling for compatibility
  const handleVideoError = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // First retry: remove crossOrigin attribute (CORS issue fallback)
    if (useCrossOrigin) {
      console.log('[VideoReviewView] Video load failed with crossOrigin, retrying without it')
      setUseCrossOrigin(false)
      return
    }

    console.error('[VideoReviewView] Video failed to load:', signedVideoUrl || submission?.video_file_url)
    setVideoError(true)
  }, [useCrossOrigin, signedVideoUrl, submission])

  const handleVideoRetry = useCallback(() => {
    setVideoError(false)
    setUseCrossOrigin(true)
    const video = videoRef.current
    if (video) {
      video.load()
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !signedVideoUrl) return

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
              company_name,
              company_id
            )
          )
        `)
        .eq('id', submissionId)
        .single()

      if (error) throw error
      setSubmission(data)
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
      
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: repliesData, error: repliesError } = await supabaseKorea
          .from('video_review_comment_replies')
          .select('*')
          .in('comment_id', commentIds)
          .order('created_at', { ascending: true })

        if (!repliesError && repliesData) {
          const repliesByComment = {}
          repliesData.forEach(reply => {
            if (!repliesByComment[reply.comment_id]) {
              repliesByComment[reply.comment_id] = []
            }
            repliesByComment[reply.comment_id].push(reply)
          })
          setReplies(repliesByComment)
        }
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const addReply = async (commentId) => {
    if (!replyText.trim() || !authorName.trim()) {
      alert('이름과 댓글을 입력해주세요.')
      return
    }

    try {
      const { data, error } = await supabaseKorea
        .from('video_review_comment_replies')
        .insert({
          comment_id: commentId,
          author_name: authorName,
          reply_text: replyText,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      setReplies(prev => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), data]
      }))
      
      setReplyText('')
      setReplyingTo(null)
    } catch (error) {
      console.error('Error adding reply:', error)
      alert('댓글 추가에 실패했습니다.')
    }
  }

  const deleteReply = async (replyId, commentId) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseKorea
        .from('video_review_comment_replies')
        .delete()
        .eq('id', replyId)

      if (error) throw error

      setReplies(prev => ({
        ...prev,
        [commentId]: prev[commentId].filter(r => r.id !== replyId)
      }))
    } catch (error) {
      console.error('Error deleting reply:', error)
      alert('댓글 삭제에 실패했습니다.')
    }
  }

  const seekToTimestamp = (timestamp, commentId) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp
      videoRef.current.pause()
      setSelectedComment(commentId)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('비디오 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `video-submissions/${fileName}`

      const { error: uploadError } = await supabaseKorea.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabaseKorea.storage
        .from('videos')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabaseKorea
        .from('video_submissions')
        .update({
          video_file_url: publicUrl,
          status: 'resubmitted',
          resubmitted_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // 네이버 웍스 알림 발송 (영상 재제출 완료)
      try {
        const koreanDate = new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        const campaignTitle = submission?.applications?.campaigns?.title || '캠페인'
        const creatorName = submission?.applications?.applicant_name || '크리에이터'
        const naverWorksMessage = `[영상 재제출 완료]\n\n캠페인: ${campaignTitle}\n크리에이터: ${creatorName}\n\n${koreanDate}`

        await fetch('/.netlify/functions/send-naver-works-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isAdminNotification: true,
            message: naverWorksMessage,
            channelId: '75c24874-e370-afd5-9da3-72918ba15a3c'
          })
        })
        console.log('영상 재제출 네이버 웍스 알림 발송 성공')
      } catch (naverWorksError) {
        console.error('영상 재제출 네이버 웍스 알림 발송 실패:', naverWorksError)
      }

      alert('영상이 성공적으로 업로드되었습니다!')
      loadSubmission()
    } catch (error) {
      console.error('Error uploading video:', error)
      alert('영상 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const sendReviewCompleteNotification = async () => {
    if (!confirm('수정 완료 알림을 기업에게 전송하시겠습니까?')) return

    setSending(true)

    try {
      const response = await fetch('/.netlify/functions/send-resubmit-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId })
      })

      if (!response.ok) {
        throw new Error('알림 전송 실패')
      }

      alert('수정 완료 알림이 전송되었습니다!')
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('알림 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">영상을 찾을 수 없습니다.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            뒤로 가기
          </Button>
        </div>
      </div>
    )
  }

  const campaignTitle = submission.applications?.campaigns?.title || '캠페인'
  const companyName = submission.applications?.campaigns?.company_name || '기업'
  const creatorName = submission.applications?.applicant_name || '크리에이터'

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 md:py-8 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-3 md:mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로 가기
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">영상 수정 요청 사항</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            {campaignTitle} - {companyName}
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs md:text-sm text-blue-800">
              💡 수정 요청 사항을 확인하고 영상을 수정한 후 재업로드해 주세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card className="p-4 md:p-6">
              <div 
                ref={videoContainerRef}
                className="aspect-video bg-black rounded-lg overflow-hidden mb-4 relative"
              >
                <video
                  ref={videoRef}
                  controls
                  crossOrigin={useCrossOrigin ? "anonymous" : undefined}
                  className="w-full h-full"
                  src={signedVideoUrl || submission.video_file_url}
                  playsInline
                  preload="metadata"
                  onError={handleVideoError}
                >
                  브라우저가 비디오를 지원하지 않습니다.
                </video>

                {/* 영상 로드 에러 UI */}
                {videoError && (
                  <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
                    <div className="text-center text-white p-6 max-w-sm">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                      <p className="text-lg font-semibold mb-2">영상을 재생할 수 없습니다</p>
                      <p className="text-sm text-gray-300 mb-4">
                        브라우저에서 지원하지 않는 형식이거나 네트워크 오류일 수 있습니다.
                        다른 브라우저(Chrome, Safari)에서 시도해 보세요.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleVideoRetry}
                          variant="outline"
                          className="text-white border-white/50 hover:bg-white/20"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          다시 시도
                        </Button>
                        <a
                          href={signedVideoUrl || submission.video_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline py-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          새 탭에서 영상 열기
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback markers */}
                {comments.map((comment, index) => {
                  const x = comment.box_x || (20 + (comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60))
                  const y = comment.box_y || (20 + ((comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 7) % 60))
                  const width = comment.box_width || 120
                  const height = comment.box_height || 120
                  const isSelected = selectedComment === comment.id
                  
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
                      {comment.comment && (
                        <div className="absolute -bottom-2 left-1/2 transform translate-y-full -translate-x-1/2 z-30">
                          <div className="bg-white border-2 border-blue-500 rounded-lg p-2 shadow-lg min-w-[120px] max-w-[200px]">
                            <div className="text-xs text-gray-800 whitespace-normal break-words text-center">
                              {comment.comment}
                            </div>
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-blue-500"></div>
                            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[7px] border-b-white"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Timeline */}
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
                    />
                  )
                })}
              </div>

              {/* Re-upload Section */}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-base md:text-lg mb-2">수정 완료 후</h3>
                <p className="text-xs md:text-sm text-gray-600 mb-3">
                  수정 사항을 반영한 영상을 다시 업로드해 주세요.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="space-y-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? '업로드 중...' : '영상 재업로드하기'}
                  </Button>
                  <Button
                    onClick={sendReviewCompleteNotification}
                    disabled={sending}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {sending ? '전송 중...' : '수정 완료 알림 보내기'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Feedback List */}
          <div>
            <Card className="p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold mb-4">
                수정 요청 사항 ({comments.length})
              </h3>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  수정 요청 사항이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment, index) => {
                    const isSelected = selectedComment === comment.id
                    return (
                      <div
                        key={comment.id}
                        className={`border-2 rounded-lg p-3 md:p-4 transition-all ${
                          isSelected 
                            ? 'border-yellow-500 bg-yellow-50' 
                            : 'border-gray-200 hover:border-blue-400'
                        }`}
                      >
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
                              <span className={`text-xs md:text-sm font-semibold ${
                                isSelected ? 'text-yellow-700' : 'text-blue-600'
                              }`}>
                                {formatTime(comment.timestamp)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          
                          <p className="text-xs md:text-sm text-gray-700 mb-3 whitespace-pre-wrap font-medium">
                            {comment.comment}
                          </p>
                          
                          {comment.attachment_url && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  <span className="text-xs font-medium text-blue-700 truncate">
                                    {comment.attachment_name || '첨부파일'}
                                  </span>
                                </div>
                                <a
                                  href={comment.attachment_url}
                                  download={comment.attachment_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  다운로드
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-medium text-gray-600">
                              댓글 {replies[comment.id]?.length || 0}
                            </span>
                          </div>

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

                          {replyingTo === comment.id ? (
                            <div className="mt-2 space-y-2">
                              <input
                                type="text"
                                value={authorName}
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder="이름"
                                className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => addReply(comment.id)}
                                  className="flex-1 text-xs"
                                >
                                  <Send className="w-3 h-3 mr-1" />
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
                                  className="flex-1 text-xs"
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
                              className="w-full mt-2 text-xs"
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
