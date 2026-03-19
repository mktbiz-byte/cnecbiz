import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabaseClients'
import { supabaseBiz } from '../../lib/supabaseClients'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ArrowLeft, Play, Pause, Download, Trash2, Edit2, Send, X, MessageSquare, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'

export default function CampaignVideoFeedback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const participantId = searchParams.get('participantId')
  
  const [participant, setParticipant] = useState(null)
  const [campaign, setCampaign] = useState(null)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [currentBox, setCurrentBox] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [startPos, setStartPos] = useState(null)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [comment, setComment] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [userRole, setUserRole] = useState(null) // 'company' or 'creator'
  const [userEmail, setUserEmail] = useState(null)
  const [expandedFeedback, setExpandedFeedback] = useState(null)
  const [replyComment, setReplyComment] = useState('')
  const [editingFeedback, setEditingFeedback] = useState(null)
  const [editingComment, setEditingComment] = useState('')
  const [videoError, setVideoError] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (participantId) {
      loadParticipantData()
      checkUserRole()
    }
  }, [participantId])

  useEffect(() => {
    if (selectedVersion) {
      loadFeedbacks()
    }
  }, [selectedVersion])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [selectedVersion])

  // Video error handling for compatibility
  const handleVideoError = useCallback(() => {
    console.error('[CampaignVideoFeedback] Video failed to load:', selectedVersion?.url)
    setVideoError(true)
  }, [selectedVersion])

  const handleVideoRetry = useCallback(() => {
    setVideoError(false)
    const video = videoRef.current
    if (video) {
      video.load()
    }
  }, [])

  // Reset error state when version changes
  useEffect(() => {
    setVideoError(false)
  }, [selectedVersion])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) return

      setUserEmail(user.email)

      // Check if user is company (campaign owner)
      const { data: participantData } = await supabaseBiz
        .from('campaign_participants')
        .select('campaign_id, creator_email')
        .eq('id', participantId)
        .single()

      if (!participantData) return

      if (participantData.creator_email === user.email) {
        setUserRole('creator')
      } else {
        setUserRole('company')
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }

  const loadParticipantData = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('campaign_participants')
        .select('*, campaigns(*)')
        .eq('id', participantId)
        .single()

      if (error) throw error

      setParticipant(data)
      setCampaign(data.campaigns)

      // Set latest version as default (가장 높은 버전 번호)
      if (data.video_files && data.video_files.length > 0) {
        // 버전 번호 기준 내림차순 정렬 후 첫 번째 (최신) 선택
        const sortedFiles = [...data.video_files].sort((a, b) => (b.version || 0) - (a.version || 0))
        setSelectedVersion(sortedFiles[0])
      }
    } catch (error) {
      console.error('Error loading participant:', error)
    }
  }

  const loadFeedbacks = async () => {
    if (!selectedVersion) return

    try {
      const { data, error } = await supabaseBiz
        .from('video_feedbacks')
        .select('*')
        .eq('participant_id', participantId)
        .eq('video_version', selectedVersion.version)
        .order('timestamp', { ascending: true })

      if (error) throw error

      setFeedbacks(data || [])
    } catch (error) {
      console.error('Error loading feedbacks:', error)
    }
  }

  const handleCanvasMouseDown = (e) => {
    if (userRole !== 'company') return // Only company can draw
    if (isPlaying) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    // Check if clicking on existing box handle
    for (const feedback of feedbacks) {
      if (Math.abs(currentTime - feedback.timestamp) < 0.5) {
        const handle = getResizeHandle(x, y, feedback.box)
        if (handle) {
          setIsResizing(true)
          setResizeHandle(handle)
          setCurrentBox(feedback.box)
          setStartPos({ x, y })
          setEditingFeedback(feedback)
          return
        }
      }
    }

    // Start drawing new box
    setIsDrawing(true)
    setStartPos({ x, y })
    setCurrentBox({ x, y, width: 0, height: 0 })
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing && !isResizing) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    if (isDrawing) {
      setCurrentBox({
        x: Math.min(startPos.x, x),
        y: Math.min(startPos.y, y),
        width: Math.abs(x - startPos.x),
        height: Math.abs(y - startPos.y)
      })
    } else if (isResizing) {
      const newBox = resizeBox(currentBox, resizeHandle, x - startPos.x, y - startPos.y)
      setCurrentBox(newBox)
      setStartPos({ x, y })
    }
  }

  const handleCanvasMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 0.02 && currentBox.height > 0.02) {
      setShowCommentModal(true)
      videoRef.current?.pause()
    }
    
    if (isResizing && editingFeedback) {
      // Update feedback box
      updateFeedbackBox(editingFeedback.id, currentBox)
    }

    setIsDrawing(false)
    setIsResizing(false)
    setResizeHandle(null)
  }

  // Touch events for mobile
  const handleCanvasTouchStart = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    handleCanvasMouseDown(mouseEvent)
  }

  const handleCanvasTouchMove = (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    })
    handleCanvasMouseMove(mouseEvent)
  }

  const handleCanvasTouchEnd = (e) => {
    e.preventDefault()
    handleCanvasMouseUp()
  }

  const getResizeHandle = (x, y, box) => {
    const threshold = 0.02
    const handles = [
      { name: 'nw', x: box.x, y: box.y },
      { name: 'ne', x: box.x + box.width, y: box.y },
      { name: 'sw', x: box.x, y: box.y + box.height },
      { name: 'se', x: box.x + box.width, y: box.y + box.height }
    ]

    for (const handle of handles) {
      if (Math.abs(x - handle.x) < threshold && Math.abs(y - handle.y) < threshold) {
        return handle.name
      }
    }
    return null
  }

  const resizeBox = (box, handle, dx, dy) => {
    const newBox = { ...box }
    
    if (handle.includes('n')) {
      newBox.y += dy
      newBox.height -= dy
    }
    if (handle.includes('s')) {
      newBox.height += dy
    }
    if (handle.includes('w')) {
      newBox.x += dx
      newBox.width -= dx
    }
    if (handle.includes('e')) {
      newBox.width += dx
    }

    return newBox
  }

  const saveFeedback = async () => {
    if (!comment.trim() || !currentBox) return

    try {
      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .insert({
          participant_id: participantId,
          video_version: selectedVersion.version,
          timestamp: currentTime,
          box: currentBox,
          comment: comment,
          author: userEmail,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      setComment('')
      setCurrentBox(null)
      setShowCommentModal(false)
      loadFeedbacks()

      // Update participant status
      await supabaseBiz
        .from('campaign_participants')
        .update({ video_status: 'revision_requested' })
        .eq('id', participantId)

      alert('피드백이 저장되었습니다!')
    } catch (error) {
      console.error('Error saving feedback:', error)
      alert('피드백 저장에 실패했습니다.')
    }
  }

  const updateFeedbackBox = async (feedbackId, newBox) => {
    try {
      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .update({ box: newBox })
        .eq('id', feedbackId)

      if (error) throw error

      loadFeedbacks()
    } catch (error) {
      console.error('Error updating feedback box:', error)
    }
  }

  const deleteFeedback = async (feedbackId) => {
    if (userRole !== 'company') {
      alert('삭제 권한이 없습니다.')
      return
    }

    if (!confirm('이 피드백을 삭제하시겠습니까?')) return

    try {
      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .delete()
        .eq('id', feedbackId)

      if (error) throw error

      loadFeedbacks()
      alert('피드백이 삭제되었습니다.')
    } catch (error) {
      console.error('Error deleting feedback:', error)
      alert('피드백 삭제에 실패했습니다.')
    }
  }

  const addReply = async (feedbackId) => {
    if (!replyComment.trim()) return

    try {
      const feedback = feedbacks.find(f => f.id === feedbackId)
      const replies = feedback.replies || []

      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .update({
          replies: [...replies, {
            author: userEmail,
            comment: replyComment,
            created_at: new Date().toISOString()
          }]
        })
        .eq('id', feedbackId)

      if (error) throw error

      setReplyComment('')
      loadFeedbacks()
    } catch (error) {
      console.error('Error adding reply:', error)
      alert('댓글 작성에 실패했습니다.')
    }
  }

  const downloadVideo = () => {
    if (!selectedVersion) return

    const link = document.createElement('a')
    link.href = selectedVersion.url
    link.download = selectedVersion.name || `video_v${selectedVersion.version}.mp4`
    link.click()
  }

  const renderCanvas = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw current drawing box
    if (currentBox && (isDrawing || isResizing)) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 3
      ctx.strokeRect(
        currentBox.x * canvas.width,
        currentBox.y * canvas.height,
        currentBox.width * canvas.width,
        currentBox.height * canvas.height
      )

      // Draw resize handles
      if (isResizing || !isDrawing) {
        const handles = [
          { x: currentBox.x, y: currentBox.y },
          { x: currentBox.x + currentBox.width, y: currentBox.y },
          { x: currentBox.x, y: currentBox.y + currentBox.height },
          { x: currentBox.x + currentBox.width, y: currentBox.y + currentBox.height }
        ]

        ctx.fillStyle = '#3b82f6'
        handles.forEach(handle => {
          ctx.fillRect(
            handle.x * canvas.width - 5,
            handle.y * canvas.height - 5,
            10,
            10
          )
        })
      }
    }

    // Draw existing feedbacks at current time
    feedbacks.forEach(feedback => {
      if (Math.abs(currentTime - feedback.timestamp) < 0.5) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.strokeRect(
          feedback.box.x * canvas.width,
          feedback.box.y * canvas.height,
          feedback.box.width * canvas.width,
          feedback.box.height * canvas.height
        )

        // Draw comment indicator
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(
          feedback.box.x * canvas.width,
          feedback.box.y * canvas.height - 25,
          20,
          20
        )
        ctx.fillStyle = 'white'
        ctx.font = '14px Arial'
        ctx.fillText('💬', feedback.box.x * canvas.width + 3, feedback.box.y * canvas.height - 8)
      }
    })
  }

  useEffect(() => {
    renderCanvas()
  }, [currentBox, feedbacks, currentTime, isDrawing, isResizing])

  if (!participant || !campaign) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 pt-14 lg:pt-0">
      {/* Header */}
      <div className="bg-white border-b border-[#DFE6E9] sticky top-14 lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-[#1A1A2E]">{campaign.title}</h1>
                <p className="text-sm text-[#636E72]">{participant.creator_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={userRole === 'company' ? 'bg-[#F0EDFF] text-[#6C5CE7]' : 'bg-[rgba(0,184,148,0.1)] text-[#00B894]'}>
                {userRole === 'company' ? '기업' : '크리에이터'}
              </Badge>
              {selectedVersion && (
                <Button variant="outline" size="sm" onClick={downloadVideo}>
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Version Selector (최신 버전부터 표시) */}
        {participant.video_files && participant.video_files.length > 0 && (
          <div className="mb-4 flex gap-2 flex-wrap">
            {[...participant.video_files].sort((a, b) => (b.version || 0) - (a.version || 0)).map((video) => (
              <Button
                key={video.version}
                variant={selectedVersion?.version === video.version ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVersion(video)}
              >
                v{video.version}
              </Button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#DFE6E9] rounded-2xl overflow-hidden">
              <div ref={containerRef} className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  src={selectedVersion?.url}
                  className="w-full h-full"
                  playsInline
                  preload="metadata"
                  onError={handleVideoError}
                  onClick={() => {
                    if (isPlaying) {
                      videoRef.current?.pause()
                    } else {
                      videoRef.current?.play()
                    }
                  }}
                />
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
                        {selectedVersion?.url && (
                          <a
                            href={selectedVersion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 underline py-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            새 탭에서 영상 열기
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={1920}
                  height={1080}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  style={{ touchAction: 'none' }}
                />
              </div>

              {/* Video Controls */}
              <div className="p-4 bg-[#F8F9FA]">
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (isPlaying) {
                        videoRef.current?.pause()
                      } else {
                        videoRef.current?.play()
                      }
                    }}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const time = parseFloat(e.target.value)
                      if (videoRef.current) {
                        videoRef.current.currentTime = time
                      }
                    }}
                    className="flex-1"
                  />
                  <span className="text-sm text-[#636E72] min-w-[80px] text-right">
                    {Math.floor(currentTime)}s / {Math.floor(duration)}s
                  </span>
                </div>
                {userRole === 'company' && (
                  <p className="text-xs text-[#636E72] mt-2">
                    💡 영상을 일시정지한 후 드래그하여 피드백 영역을 지정하세요
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Feedback List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#DFE6E9] rounded-2xl p-4 max-h-[600px] overflow-y-auto">
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">피드백 목록 ({feedbacks.length})</h2>
              
              {feedbacks.length === 0 ? (
                <p className="text-[#636E72] text-sm text-center py-8">
                  아직 피드백이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="border border-[#DFE6E9] rounded-2xl p-3 hover:bg-[#F8F9FA]">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#1A1A2E]">{feedback.author}</p>
                          <p className="text-xs text-[#B2BEC3]">{Math.floor(feedback.timestamp)}초</p>
                        </div>
                        {userRole === 'company' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFeedback(feedback.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-sm text-[#636E72] mb-2">{feedback.comment}</p>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = feedback.timestamp
                            videoRef.current.pause()
                          }
                        }}
                        className="text-xs text-[#6C5CE7] hover:text-[#5A4BD1]"
                      >
                        해당 시간으로 이동
                      </Button>

                      {/* Replies */}
                      {feedback.replies && feedback.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[#DFE6E9] space-y-2">
                          {feedback.replies.map((reply, idx) => (
                            <div key={idx} className="text-sm">
                              <p className="font-medium text-xs text-[#636E72]">{reply.author}</p>
                              <p className="text-[#1A1A2E]">{reply.comment}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      {expandedFeedback === feedback.id ? (
                        <div className="mt-3">
                          <textarea
                            value={replyComment}
                            onChange={(e) => setReplyComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="w-full px-3 py-2 border border-[#DFE6E9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7]"
                            rows={2}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => addReply(feedback.id)}
                              className="flex-1 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              전송
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExpandedFeedback(null)
                                setReplyComment('')
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedFeedback(feedback.id)}
                          className="mt-2 text-xs"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          댓글 작성
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DFE6E9]">
            <h3 className="text-lg font-bold text-[#1A1A2E] mb-4">피드백 작성</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="수정이 필요한 부분을 설명해주세요..."
              className="w-full px-3 py-2 border border-[#DFE6E9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/30 focus:border-[#6C5CE7] mb-4"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentModal(false)
                  setComment('')
                  setCurrentBox(null)
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={saveFeedback}
                disabled={!comment.trim()}
                className="flex-1 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
