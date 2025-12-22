import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Send, MessageSquare, X, Trash2, Mail, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronLeft, ChevronRight, Keyboard, Clock, FileText, Menu, ChevronUp, ChevronDown } from 'lucide-react'
import { supabaseBiz, supabaseKorea } from '../../lib/supabaseClients'

export default function VideoReview() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const videoContainerRef = useRef(null)
  const timelineRef = useRef(null)

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
  const [isPaused, setIsPaused] = useState(true)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [subtitles, setSubtitles] = useState([]) // { start, end, text }
  const [currentSubtitle, setCurrentSubtitle] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileFeedback, setShowMobileFeedback] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadSubmission()
    loadComments()
  }, [submissionId])

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      // Update current subtitle
      const sub = subtitles.find(s => video.currentTime >= s.start && video.currentTime <= s.end)
      setCurrentSubtitle(sub?.text || '')
    }

    const handlePlay = () => setIsPaused(false)
    const handlePause = () => setIsPaused(true)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [signedVideoUrl, subtitles])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      const video = videoRef.current
      if (!video) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          if (video.paused) video.play()
          else video.pause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 10 : 5))
          break
        case 'ArrowRight':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + (e.shiftKey ? 10 : 5))
          break
        case 'j':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 10)
          break
        case 'l':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 10)
          break
        case ',':
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - (1/30)) // 1 frame back (assuming 30fps)
          break
        case '.':
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + (1/30)) // 1 frame forward
          break
        case 'm':
          e.preventDefault()
          video.muted = !video.muted
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case '?':
          e.preventDefault()
          setShowShortcuts(prev => !prev)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Parse subtitles from video track
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleCueChange = () => {
      const track = video.textTracks[0]
      if (track && track.activeCues && track.activeCues.length > 0) {
        setCurrentSubtitle(track.activeCues[0].text)
      } else {
        setCurrentSubtitle('')
      }
    }

    const handleTrackLoaded = () => {
      const track = video.textTracks[0]
      if (track) {
        track.mode = 'hidden' // Hide native subtitles, we'll show our own
        const cues = Array.from(track.cues || [])
        setSubtitles(cues.map(cue => ({
          start: cue.startTime,
          end: cue.endTime,
          text: cue.text
        })))
        track.addEventListener('cuechange', handleCueChange)
      }
    }

    video.addEventListener('loadedmetadata', handleTrackLoaded)
    return () => video.removeEventListener('loadedmetadata', handleTrackLoaded)
  }, [signedVideoUrl])

  const toggleFullscreen = useCallback(() => {
    const container = videoContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || container.webkitRequestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  const handleVolumeSlider = (e) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    video.muted = newVolume === 0
  }

  const skipTime = (seconds) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
  }

  const handleTimelineClick = (e) => {
    const video = videoRef.current
    const timeline = timelineRef.current
    if (!video || !timeline) return

    const rect = timeline.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    video.currentTime = percentage * video.duration
    video.pause()
  }

  const loadSubmission = async () => {
    try {
      // Get current user from supabaseBiz (authentication)
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) {
        alert('로그인이 필요합니다.')
        navigate('/company/login')
        return
      }

      // Get submission data from supabaseKorea (with null check)
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('video_submissions')
        .select(`
          *,
          applications (
            applicant_name,
            phone_number,
            campaign_id,
            campaigns (
              title,
              company_id
            )
          )
        `)
        .eq('id', submissionId)
        .single()

      if (error) throw error

      // Authorization check removed - handled by RLS policies
      // Company users can access videos for their campaigns

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
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('video_review_comments')
        .select('*')
        .eq('submission_id', submissionId)
        .order('timestamp', { ascending: true })

      if (error) throw error
      setComments(data || [])

      // Load replies for all comments
      if (data && data.length > 0) {
        const commentIds = data.map(c => c.id)
        const { data: repliesData, error: repliesError } = await client
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

    // Mobile uses smaller markers
    const markerSize = isMobile ? 80 : 120
    setActiveMarker({ x, y, timestamp, width: markerSize, height: markerSize })
    setCurrentComment('')

    // On mobile, auto-scroll to feedback form
    if (isMobile) {
      setShowMobileFeedback(true)
    }
  }

  // Touch event handler for mobile
  const handleVideoTouch = (e) => {
    if (!videoRef.current || !videoContainerRef.current) return
    e.preventDefault()

    const touch = e.touches[0] || e.changedTouches[0]
    if (!touch) return

    videoRef.current.pause()

    const rect = videoContainerRef.current.getBoundingClientRect()
    const x = ((touch.clientX - rect.left) / rect.width) * 100
    const y = ((touch.clientY - rect.top) / rect.height) * 100

    const timestamp = videoRef.current.currentTime

    setActiveMarker({ x, y, timestamp, width: 80, height: 80 })
    setCurrentComment('')
    setShowMobileFeedback(true)
  }

  const addComment = async () => {
    if (!currentComment.trim() || !activeMarker) {
      alert('수정 요청 사항을 작성해주세요.')
      return
    }

    try {
      setUploadingFile(true)
      let attachmentUrl = null
      let attachmentName = null

      // Upload file if attached
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop()
        const fileName = `video-review/${submissionId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabaseBiz.storage
          .from('campaign-images')
          .upload(fileName, attachmentFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabaseBiz.storage
          .from('campaign-images')
          .getPublicUrl(fileName)

        attachmentUrl = publicUrl
        attachmentName = attachmentFile.name
      }

      // Use same DB as video_submissions (Korea) to avoid FK constraint error
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
        .from('video_review_comments')
        .insert({
          submission_id: submissionId,
          timestamp: activeMarker.timestamp,
          comment: currentComment,
          box_x: activeMarker.x,
          box_y: activeMarker.y,
          box_width: activeMarker.width,
          box_height: activeMarker.height,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        })
        .select()
        .single()

      if (error) throw error

      setComments([...comments, data])
      setCurrentComment('')
      setActiveMarker(null)
      setAttachmentFile(null)
      alert('피드백이 추가되었습니다.')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('피드백 추가 실패: ' + error.message)
    } finally {
      setUploadingFile(false)
    }
  }

  const deleteComment = async (commentId) => {
    if (!confirm('이 피드백을 삭제하시겠습니까?')) return

    try {
      // Use same DB as video_submissions (Korea)
      const client = supabaseKorea || supabaseBiz
      const { error } = await client
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
      // Use same DB as video_submissions (Korea)
      const client = supabaseKorea || supabaseBiz
      const { data, error } = await client
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

  const formatTime = (seconds, precise = false) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (precise) {
      const ms = Math.floor((seconds % 1) * 100)
      return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 정밀 시간 포맷 (0.01초 단위)
  const formatTimePrecise = (seconds) => formatTime(seconds, true)

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
          creatorName: submission?.applications?.applicant_name || '크리에이터',
          creatorPhone: submission?.applications?.phone_number,
          campaignTitle: submission?.applications?.campaigns?.title || '캠페인',
          feedbackCount: comments.length,
          submissionId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '알림 전송 실패')
      }

      // 응답에 따른 메시지 표시
      if (result.skipped) {
        alert('수정 요청이 등록되었습니다.\n(알림 서비스 미설정으로 알림은 발송되지 않았습니다)')
      } else if (result.notificationFailed) {
        alert(`수정 요청이 등록되었습니다.\n${result.warning || '크리에이터에게 직접 연락해 주세요'}`)
      } else if (result.method === 'sms') {
        alert('수정 요청이 크리에이터에게 문자로 전달되었습니다.')
      } else {
        alert('수정 요청이 크리에이터에게 전달되었습니다.')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      alert('알림 전송 실패: ' + error.message)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300">영상을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-slate-300">영상을 찾을 수 없습니다.</p>
          <Button
            variant="ghost"
            className="mt-4 text-slate-400 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로 가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 키보드 단축키 모달 */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-400" />
                키보드 단축키
              </h3>
              <button onClick={() => setShowShortcuts(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">재생/일시정지</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">Space</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">5초 뒤로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">←</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">5초 앞으로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">→</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">10초 뒤로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">J</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">10초 앞으로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">L</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">프레임 뒤로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">,</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">프레임 앞으로</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">.</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">음소거</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">M</kbd>
                </div>
                <div className="flex justify-between bg-slate-700/50 px-3 py-2 rounded">
                  <span className="text-slate-300">전체화면</span>
                  <kbd className="bg-slate-600 px-2 py-0.5 rounded text-xs font-mono">F</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - Desktop */}
      {!isMobile && (
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-[1920px] mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate(-1)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  뒤로
                </Button>
                <div className="h-6 w-px bg-slate-700"></div>
                <div>
                  <h1 className="text-lg font-semibold">영상 수정 요청</h1>
                  <p className="text-sm text-slate-400">
                    {submission.applications?.applicant_name || '크리에이터'} • {submission.applications?.campaigns?.title || '캠페인'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowShortcuts(true)}
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="키보드 단축키 (? 키)"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                <Button
                  onClick={sendReviewNotification}
                  disabled={isSending || comments.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-5 py-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSending ? '전송 중...' : `수정 요청 전달 (${comments.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 - Mobile */}
      {isMobile && (
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
          <div className="px-3 py-2">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate(-1)}
                className="text-slate-400 hover:text-white p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center px-2">
                <h1 className="text-sm font-semibold truncate">영상 수정 요청</h1>
                <p className="text-xs text-slate-400 truncate">
                  {submission.applications?.applicant_name || '크리에이터'}
                </p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-400 hover:text-white p-2"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu dropdown */}
            {mobileMenuOpen && (
              <div className="absolute right-2 top-full mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 min-w-[200px]">
                <button
                  onClick={() => {
                    setShowMobileFeedback(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-600 flex items-center gap-3 rounded-t-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  피드백 목록 ({comments.length})
                </button>
                <button
                  onClick={() => {
                    sendReviewNotification()
                    setMobileMenuOpen(false)
                  }}
                  disabled={isSending || comments.length === 0}
                  className="w-full px-4 py-3 text-left text-sm text-white hover:bg-slate-600 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-b-lg"
                >
                  <Mail className="w-4 h-4" />
                  {isSending ? '전송 중...' : '수정 요청 전달'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <div className={`max-w-[1920px] mx-auto ${isMobile ? 'flex flex-col h-[calc(100vh-52px)]' : 'flex flex-col lg:flex-row gap-4 p-4 h-[calc(100vh-70px)]'}`}>
        {/* 왼쪽: 영상 플레이어 영역 */}
        <div className={`flex flex-col ${isMobile ? 'flex-1 min-h-0' : 'flex-1 min-h-0'}`}>
          {/* 영상 컨테이너 */}
          <div
            ref={videoContainerRef}
            className={`relative bg-black overflow-hidden ${isMobile ? 'w-full aspect-[9/16] max-h-[60vh]' : 'rounded-xl flex-1 min-h-0'}`}
          >
            {/* 클릭 영역 오버레이 */}
            <div
              className={`absolute inset-0 z-10 ${isMobile ? 'touch-none' : 'cursor-crosshair'}`}
              style={{ bottom: isMobile ? '60px' : '50px' }}
              onClick={!isMobile ? handleVideoClick : undefined}
              onTouchStart={isMobile ? handleVideoTouch : undefined}
            />

            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              src={signedVideoUrl || submission.video_file_url}
              onClick={(e) => e.stopPropagation()}
            >
              브라우저가 비디오를 지원하지 않습니다.
            </video>

            {/* 자막 표시 */}
            {currentSubtitle && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-lg font-medium text-center max-w-[80%]">
                  {currentSubtitle}
                </div>
              </div>
            )}

            {/* Active marker (being created) */}
            {activeMarker && isPaused && (
              <div
                className="absolute border-4 border-amber-400 cursor-move shadow-lg shadow-amber-400/30"
                style={{
                  left: `${activeMarker.x}%`,
                  top: `${activeMarker.y}%`,
                  width: `${activeMarker.width}px`,
                  height: `${activeMarker.height}px`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                  zIndex: 20,
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)'
                }}
                onMouseDown={(e) => {
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
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-amber-400 text-slate-900 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimePrecise(activeMarker.timestamp)}
                </div>
                <div
                  className="resize-handle absolute -bottom-2 -right-2 w-5 h-5 bg-amber-400 rounded-full cursor-se-resize flex items-center justify-center"
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
                >
                  <ChevronRight className="w-3 h-3 text-slate-900 rotate-45" />
                </div>
              </div>
            )}

            {/* Existing comment markers */}
            {comments.map((comment, index) => {
              const x = comment.box_x || (20 + (comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60))
              const y = comment.box_y || (20 + ((comment.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 7) % 60))
              const width = comment.box_width || 120
              const height = comment.box_height || 120

              const timeDiff = Math.abs(currentTime - comment.timestamp)
              const isVisible = isPaused && timeDiff <= 2
              const isSelected = selectedFeedback === comment.id

              if (!isVisible) return null

              return (
                <div
                  key={comment.id}
                  className={`absolute border-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                      : 'border-blue-500/70 hover:border-blue-400'
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isSelected ? 15 : 10,
                    boxShadow: isSelected ? '0 0 30px rgba(96, 165, 250, 0.6)' : 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFeedback(comment.id)
                    seekToTimestamp(comment.timestamp)
                  }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 shadow-lg">
                    <span className="w-4 h-4 bg-white text-blue-500 rounded-full flex items-center justify-center text-[10px]">{index + 1}</span>
                    {formatTimePrecise(comment.timestamp)}
                  </div>
                  {comment.comment && isSelected && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-30">
                      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[150px] max-w-[250px]">
                        <div className="text-xs text-slate-200 whitespace-normal break-words">
                          {comment.comment}
                        </div>
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-slate-800"></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 커스텀 비디오 컨트롤 */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 ${isMobile ? 'p-3' : 'p-4'}`}>
              {/* 프로그레스 바 */}
              <div
                ref={timelineRef}
                className={`relative bg-slate-600/50 rounded-full mb-3 cursor-pointer group ${isMobile ? 'h-3' : 'h-2'}`}
                onClick={handleTimelineClick}
              >
                {/* 버퍼 */}
                <div className="absolute top-0 left-0 h-full bg-slate-500/50 rounded-full" style={{ width: '100%' }}></div>
                {/* 진행 */}
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
                {/* 재생 헤드 */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg transition-transform ${isMobile ? 'w-5 h-5 scale-100' : 'w-4 h-4 scale-0 group-hover:scale-100'}`}
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
                ></div>

                {/* 피드백 마커들 */}
                {comments.map((comment, index) => {
                  const position = duration ? (comment.timestamp / duration) * 100 : 0
                  return (
                    <div
                      key={comment.id}
                      className={`absolute top-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-all ${
                        selectedFeedback === comment.id ? 'bg-blue-400 scale-150' : 'bg-blue-500'
                      } ${isMobile ? 'w-4 h-4' : 'w-3 h-3 hover:scale-150'}`}
                      style={{ left: `${position}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFeedback(comment.id)
                        seekToTimestamp(comment.timestamp)
                        if (isMobile) setShowMobileFeedback(true)
                      }}
                      title={`#${index + 1} - ${formatTimePrecise(comment.timestamp)}`}
                    />
                  )
                })}
                {activeMarker && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 bg-amber-400 rounded-full animate-pulse ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`}
                    style={{ left: `${duration ? (activeMarker.timestamp / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
                  />
                )}
              </div>

              {/* 컨트롤 버튼들 - Desktop */}
              {!isMobile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 재생/일시정지 */}
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    >
                      {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
                    </button>

                    {/* 건너뛰기 */}
                    <button onClick={() => skipTime(-10)} className="text-slate-400 hover:text-white transition-colors p-1">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button onClick={() => skipTime(10)} className="text-slate-400 hover:text-white transition-colors p-1">
                      <SkipForward className="w-5 h-5" />
                    </button>

                    {/* 볼륨 */}
                    <div className="flex items-center gap-2 group">
                      <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors p-1">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeSlider}
                        className="w-0 group-hover:w-20 transition-all duration-200 h-1 appearance-none bg-slate-600 rounded-full cursor-pointer"
                        style={{ accentColor: '#3b82f6' }}
                      />
                    </div>

                    {/* 시간 */}
                    <div className="text-sm font-mono text-slate-300 ml-2">
                      <span className="text-white">{formatTimePrecise(currentTime)}</span>
                    <span className="mx-1">/</span>
                    <span>{formatTimePrecise(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 프레임 이동 */}
                  <div className="flex items-center bg-slate-700/50 rounded-lg px-2 py-1 gap-1">
                    <button
                      onClick={() => skipTime(-1/30)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="이전 프레임 (,)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400">프레임</span>
                    <button
                      onClick={() => skipTime(1/30)}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="다음 프레임 (.)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 전체화면 */}
                  <button
                    onClick={toggleFullscreen}
                    className="text-slate-400 hover:text-white transition-colors p-2"
                    title="전체화면 (F)"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
              )}

              {/* 컨트롤 버튼들 - Mobile */}
              {isMobile && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* 10초 뒤로 */}
                    <button
                      onClick={() => skipTime(-10)}
                      className="text-white active:text-blue-400 transition-colors p-2"
                    >
                      <SkipBack className="w-6 h-6" />
                    </button>

                    {/* 재생/일시정지 */}
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 bg-white/20 active:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                      {isPaused ? <Play className="w-7 h-7 ml-1" /> : <Pause className="w-7 h-7" />}
                    </button>

                    {/* 10초 앞으로 */}
                    <button
                      onClick={() => skipTime(10)}
                      className="text-white active:text-blue-400 transition-colors p-2"
                    >
                      <SkipForward className="w-6 h-6" />
                    </button>
                  </div>

                  {/* 시간 + 전체화면 */}
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono text-slate-300">
                      <span className="text-white">{formatTime(currentTime)}</span>
                      <span className="mx-1">/</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <button
                      onClick={toggleFullscreen}
                      className="text-white active:text-blue-400 transition-colors p-2"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 피드백 입력 폼 - Desktop */}
          {activeMarker && !isMobile && (
            <div className="mt-4 p-4 bg-slate-800 border border-amber-400/50 rounded-xl shadow-lg shadow-amber-400/10">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">새 피드백 작성</p>
                    <p className="text-xs text-slate-400 font-mono">{formatTimePrecise(activeMarker.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={cancelMarker}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={currentComment}
                onChange={(e) => setCurrentComment(e.target.value)}
                placeholder="수정이 필요한 부분을 상세하게 작성해 주세요..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                rows={3}
                autoFocus
              />

              <div className="mt-3 flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
                      onChange={(e) => setAttachmentFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors">
                      📎 파일 첨부
                    </div>
                  </label>
                  {attachmentFile && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      ✓ {attachmentFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={addComment}
                  disabled={uploadingFile || !currentComment.trim()}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-900 font-semibold px-6 py-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {uploadingFile ? '업로드 중...' : '피드백 추가'}
                </Button>
              </div>
            </div>
          )}

          {/* 안내 문구 - Desktop */}
          {!activeMarker && !isMobile && (
            <div className="mt-4 text-center py-3 bg-slate-800/50 rounded-lg border border-dashed border-slate-600">
              <p className="text-slate-400 text-sm">
                💡 영상의 원하는 위치를 <span className="text-amber-400 font-medium">클릭</span>하여 피드백을 추가하세요
              </p>
            </div>
          )}

          {/* Mobile hint bar */}
          {isMobile && !activeMarker && (
            <div className="p-3 bg-slate-800 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">
                  👆 영상을 터치하여 피드백 추가
                </p>
                <button
                  onClick={() => setShowMobileFeedback(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg"
                >
                  <MessageSquare className="w-4 h-4" />
                  피드백 {comments.length}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 피드백 패널 - Desktop only */}
        {!isMobile && (
        <div className="w-full lg:w-[400px] flex flex-col min-h-0">
          <div className="bg-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
            {/* 패널 헤더 */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">피드백 타임라인</h3>
                  <p className="text-xs text-slate-400">{comments.length}개의 수정 요청</p>
                </div>
              </div>
            </div>

            {/* 피드백 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">아직 피드백이 없습니다</p>
                  <p className="text-slate-500 text-xs mt-1">영상을 클릭하여 첫 피드백을 추가하세요</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`rounded-xl p-4 transition-all cursor-pointer ${
                      selectedFeedback === comment.id
                        ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => {
                      setSelectedFeedback(comment.id)
                      seekToTimestamp(comment.timestamp)
                    }}
                  >
                    {/* 피드백 헤더 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedFeedback === comment.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-600 text-slate-300'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className={`text-sm font-mono font-semibold ${
                            selectedFeedback === comment.id ? 'text-blue-400' : 'text-slate-300'
                          }`}>
                            {formatTimePrecise(comment.timestamp)}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteComment(comment.id)
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 피드백 내용 */}
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {comment.comment}
                    </p>

                    {/* 첨부 파일 */}
                    {comment.attachment_url && (
                      <div className="mt-3 p-2 bg-slate-600/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="truncate max-w-[150px]">{comment.attachment_name || '첨부파일'}</span>
                          </div>
                          <a
                            href={comment.attachment_url}
                            download={comment.attachment_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            다운로드
                          </a>
                        </div>
                      </div>
                    )}

                    {/* 댓글 섹션 */}
                    <div className="mt-3 pt-3 border-t border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500">
                          댓글 {replies[comment.id]?.length || 0}
                        </span>
                      </div>

                      {/* 댓글 목록 */}
                      {replies[comment.id]?.map((reply) => (
                        <div key={reply.id} className="bg-slate-600/30 rounded-lg p-2 mb-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-300">{reply.author_name}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(reply.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1">{reply.reply_text}</p>
                        </div>
                      ))}

                      {/* 댓글 작성 폼 */}
                      {replyingTo === comment.id ? (
                        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            placeholder="이름"
                            className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => addReply(comment.id)}
                              className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              작성
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyText('')
                                setAuthorName('')
                              }}
                              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs rounded-lg transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setReplyingTo(comment.id)
                          }}
                          className="w-full mt-2 px-3 py-2 bg-slate-600/30 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300 text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          댓글 달기
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Mobile Bottom Sheet - Feedback Panel */}
      {isMobile && showMobileFeedback && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60"
            onClick={() => setShowMobileFeedback(false)}
          />

          {/* Bottom Sheet */}
          <div className="bg-slate-800 rounded-t-2xl h-[80vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center py-3 shrink-0">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-3 border-b border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">피드백 목록</h3>
                  <p className="text-xs text-slate-400">{comments.length}개의 수정 요청</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileFeedback(false)}
                className="p-2 text-slate-400"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Active Marker Form - Mobile */}
            {activeMarker && (
              <div className="p-4 border-b border-amber-400/30 bg-amber-400/10 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
                    <FileText className="w-3 h-3 text-slate-900" />
                  </div>
                  <span className="text-sm font-semibold text-white">새 피드백</span>
                  <span className="text-xs text-amber-400 font-mono">{formatTimePrecise(activeMarker.timestamp)}</span>
                  <button
                    onClick={cancelMarker}
                    className="ml-auto text-slate-400 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={currentComment}
                  onChange={(e) => setCurrentComment(e.target.value)}
                  placeholder="수정 요청 내용을 작성하세요..."
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
                  rows={2}
                  autoFocus
                />

                <div className="mt-2 flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*,.pdf,.ppt,.pptx,.doc,.docx"
                      onChange={(e) => setAttachmentFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div className="px-3 py-2 bg-slate-700 text-center rounded-lg text-xs text-slate-300">
                      {attachmentFile ? `📎 ${attachmentFile.name.slice(0, 15)}...` : '📎 파일 첨부'}
                    </div>
                  </label>
                  <Button
                    onClick={addComment}
                    disabled={uploadingFile || !currentComment.trim()}
                    className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-semibold text-sm py-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {uploadingFile ? '업로드...' : '추가'}
                  </Button>
                </div>
              </div>
            )}

            {/* Feedback List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-7 h-7 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm">아직 피드백이 없습니다</p>
                  <p className="text-slate-500 text-xs mt-1">영상을 터치하여 추가하세요</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`rounded-xl p-3 transition-all ${
                      selectedFeedback === comment.id
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : 'bg-slate-700/50 border border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedFeedback(comment.id)
                      seekToTimestamp(comment.timestamp)
                      setShowMobileFeedback(false)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedFeedback === comment.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-600 text-slate-300'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-xs font-mono text-blue-400">
                          {formatTimePrecise(comment.timestamp)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteComment(comment.id)
                        }}
                        className="text-slate-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {comment.comment}
                    </p>
                    {comment.attachment_url && (
                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                        📎 {comment.attachment_name || '첨부파일'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Send Button */}
            {comments.length > 0 && (
              <div className="p-4 border-t border-slate-700 shrink-0">
                <Button
                  onClick={() => {
                    sendReviewNotification()
                    setShowMobileFeedback(false)
                  }}
                  disabled={isSending}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSending ? '전송 중...' : `수정 요청 전달 (${comments.length})`}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
