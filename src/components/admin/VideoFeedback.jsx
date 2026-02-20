import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabaseBiz } from '../../lib/supabaseClients';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function VideoFeedback() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');
  const [referenceFile, setReferenceFile] = useState(null);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [comments, setComments] = useState({}); // { feedbackId: [comments] }
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [editingComment, setEditingComment] = useState(null); // 수정 중인 댓글 ID
  const [editingFeedback, setEditingFeedback] = useState(null); // 수정 중인 피드백
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // 영상 목록 로드
  useEffect(() => {
    loadVideos();
  }, []);

  // 선택된 영상의 피드백 로드
  useEffect(() => {
    if (selectedVideo) {
      loadFeedbacks(selectedVideo.id);
    }
  }, [selectedVideo]);

  // 영상 재생/일시정지 이벤트 감지
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      // 재생 시작 시 박스 숨기기
      setCurrentBox(null);
      setShowCommentModal(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [selectedVideo]);

  // Video error handling for compatibility
  const handleVideoError = useCallback(() => {
    console.error('[VideoFeedback] Video failed to load:', selectedVideo?.video_url);
    setVideoError(true);
  }, [selectedVideo]);

  const handleVideoRetry = useCallback(() => {
    setVideoError(false);
    const video = videoRef.current;
    if (video) {
      video.load();
    }
  }, []);

  // Reset error state when video changes
  useEffect(() => {
    setVideoError(false);
  }, [selectedVideo]);

  const loadVideos = async () => {
    const { data, error } = await supabaseBiz
      .from('video_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setVideos(data);
    }
  };

  const loadFeedbacks = async (videoId) => {
    const { data, error } = await supabaseBiz
      .from('video_feedbacks')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('피드백 로드 오류:', error);
      return;
    }

    setFeedbacks(data || []);
    
    // 각 피드백의 댓글 로드
    if (data && data.length > 0) {
      data.forEach(feedback => loadComments(feedback.id));
    }
  };
  
  // 댓글 로드
  const loadComments = async (feedbackId) => {
    const { data, error } = await supabaseBiz
      .from('video_feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('댓글 로드 오류:', error);
      return;
    }

    setComments(prev => ({ ...prev, [feedbackId]: data || [] }));
  };
  
  // 댓글 추가 또는 수정
  const addComment = async (feedbackId) => {
    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    if (editingComment) {
      // 댓글 수정
      const { error } = await supabaseBiz
        .from('video_feedback_comments')
        .update({
          author: commentAuthor.trim() || '익명',
          comment: newComment.trim()
        })
        .eq('id', editingComment);

      if (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 실패');
        return;
      }
      
      setEditingComment(null);
    } else {
      // 댓글 추가
      const { error } = await supabaseBiz
        .from('video_feedback_comments')
        .insert([{
          feedback_id: feedbackId,
          author: commentAuthor.trim() || '익명',
          comment: newComment.trim()
        }]);

      if (error) {
        console.error('댓글 추가 오류:', error);
        alert('댓글 추가 실패');
        return;
      }
    }

    setNewComment('');
    setCommentAuthor('');
    loadComments(feedbackId);
  };
  
  // 댓글 수정 모드 시작
  const startEditComment = (comment) => {
    setEditingComment(comment.id);
    setCommentAuthor(comment.author);
    setNewComment(comment.comment);
  };
  
  // 댓글 삭제
  const deleteComment = async (commentId, feedbackId) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    const { error } = await supabaseBiz
      .from('video_feedback_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 실패');
      return;
    }

    loadComments(feedbackId);
  };
  
  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // MP4/MOV만 허용
    if (!file.type.match(/video\/(mp4|quicktime)/)) {
      alert('MP4 또는 MOV 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    
    try {
      // 파일명 새니타이징 (한글/공백/특수문자 제거)
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const fileName = `${Date.now()}_${sanitizedName}`;
      const { data: uploadData, error: uploadError } = await supabaseBiz.storage
        .from('videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Public URL 가져오기
      const { data: { publicUrl } } = supabaseBiz.storage
        .from('videos')
        .getPublicUrl(fileName);

      // 데이터베이스에 저장
      const { data: videoData, error: dbError } = await supabaseBiz
        .from('video_reviews')
        .insert([{
          title: file.name,
          video_url: publicUrl
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      alert('영상 업로드 완료!');
      loadVideos();
      setSelectedVideo(videoData);
    } catch (error) {
      console.error('업로드 오류:', error);
      alert('업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 박스 내부 클릭 확인
  const isClickInsideBox = (x, y) => {
    if (!currentBox) return false;
    const { x: bx, y: by, width: bw, height: bh } = currentBox;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  };

  // 캔버스 클릭 - 박스 생성 또는 박스 클릭 시 모달 열기
  const handleCanvasClick = (e) => {
    if (!videoRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 기존 박스가 있으면 핸들 클릭 체크
    if (currentBox) {
      const handle = getResizeHandle(x, y);
      if (handle) return; // 핸들 클릭은 mousedown에서 처리
      
      // 박스 내부 클릭은 mouseup에서 처리하므로 여기서는 무시
      if (isClickInsideBox(x, y)) {
        return;
      }
    }

    // 새 박스 생성 (100x100 정사각형)
    const boxSize = 100;
    const newBox = {
      x: Math.max(0, Math.min(x - boxSize / 2, rect.width - boxSize)),
      y: Math.max(0, Math.min(y - boxSize / 2, rect.height - boxSize)),
      width: boxSize,
      height: boxSize
    };
    
    setCurrentBox(newBox);
    if (!videoRef.current.paused) {
      videoRef.current.pause();
    }
    
    // 새 박스 생성 시에는 모달을 열지 않고, 박스 클릭 시에만 열림
  };

  // 리사이징 핸들 위치 확인 (8개 핸들: 4개 모서리 + 4개 변)
  const getResizeHandle = (x, y) => {
    if (!currentBox) return null;
    
    const handleSize = 8;
    const { x: bx, y: by, width: bw, height: bh } = currentBox;
    
    // 모서리 핸들
    if (Math.abs(x - bx) < handleSize && Math.abs(y - by) < handleSize) return 'nw';
    if (Math.abs(x - (bx + bw)) < handleSize && Math.abs(y - by) < handleSize) return 'ne';
    if (Math.abs(x - bx) < handleSize && Math.abs(y - (by + bh)) < handleSize) return 'sw';
    if (Math.abs(x - (bx + bw)) < handleSize && Math.abs(y - (by + bh)) < handleSize) return 'se';
    
    // 변 핸들
    if (Math.abs(x - bx) < handleSize && y > by && y < by + bh) return 'w';
    if (Math.abs(x - (bx + bw)) < handleSize && y > by && y < by + bh) return 'e';
    if (Math.abs(y - by) < handleSize && x > bx && x < bx + bw) return 'n';
    if (Math.abs(y - (by + bh)) < handleSize && x > bx && x < bx + bw) return 's';
    
    return null;
  };

  // 리사이징 시작
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 마우스 다운 위치 기록
    setMouseDownPos({ x, y });
    
    if (!currentBox) return;

    const handle = getResizeHandle(x, y);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({ x, y, box: { ...currentBox } });
      e.preventDefault();
    }
  };

  // 리사이징 중
  const handleCanvasMouseMove = (e) => {
    if (!isResizing || !resizeStart || !resizeHandle) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const dx = x - resizeStart.x;
    const dy = y - resizeStart.y;
    const { box } = resizeStart;
    
    let newBox = { ...box };
    
    // 핸들에 따라 박스 크기 조정
    switch (resizeHandle) {
      case 'nw':
        newBox.x = box.x + dx;
        newBox.y = box.y + dy;
        newBox.width = box.width - dx;
        newBox.height = box.height - dy;
        break;
      case 'ne':
        newBox.y = box.y + dy;
        newBox.width = box.width + dx;
        newBox.height = box.height - dy;
        break;
      case 'sw':
        newBox.x = box.x + dx;
        newBox.width = box.width - dx;
        newBox.height = box.height + dy;
        break;
      case 'se':
        newBox.width = box.width + dx;
        newBox.height = box.height + dy;
        break;
      case 'n':
        newBox.y = box.y + dy;
        newBox.height = box.height - dy;
        break;
      case 's':
        newBox.height = box.height + dy;
        break;
      case 'w':
        newBox.x = box.x + dx;
        newBox.width = box.width - dx;
        break;
      case 'e':
        newBox.width = box.width + dx;
        break;
    }
    
    // 최소 크기 제한
    if (newBox.width < 20) newBox.width = 20;
    if (newBox.height < 20) newBox.height = 20;
    
    setCurrentBox(newBox);
  };

  // 리사이징 완료
  const handleCanvasMouseUp = (e) => {
    const wasResizing = isResizing;
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
    
    // 리사이징 중이었으면 모달 열지 않음
    if (wasResizing) {
      setMouseDownPos(null);
      return;
    }
    
    // 드래그 거리 확인 (5px 미만이면 클릭으로 간주)
    if (mouseDownPos && currentBox) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const distance = Math.sqrt(Math.pow(x - mouseDownPos.x, 2) + Math.pow(y - mouseDownPos.y, 2));
      
      if (distance < 5 && isClickInsideBox(mouseDownPos.x, mouseDownPos.y)) {
        // 박스 내부 클릭 시 모달 열기
        const modalWidth = 400;
        const modalHeight = 500;
        let modalX = currentBox.x + currentBox.width + 20;
        let modalY = currentBox.y;
        
        // 화면 밖으로 나가면 왼쪽에 표시
        if (modalX + modalWidth > rect.width) {
          modalX = currentBox.x - modalWidth - 20;
        }
        
        // 위쪽으로 나가면 조정
        if (modalY < 0) modalY = 0;
        if (modalY + modalHeight > rect.height) {
          modalY = rect.height - modalHeight;
        }
        
        setModalPosition({ x: modalX, y: modalY });
        setShowCommentModal(true);
      }
    }
    
    setMouseDownPos(null);
  };

  // 박스 삭제 (ESC 키)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && currentBox) {
        setCurrentBox(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentBox]);

  // 참고 파일 업로드
  const handleReferenceFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 체크 (50MB 제한)
    if (file.size > 50 * 1024 * 1024) {
      alert('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    setUploadingReference(true);

    try {
      // 파일명 생성 (한글 제거)
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `reference_${timestamp}_${sanitizedName}`;

      // Supabase Storage에 업로드
      const { data, error } = await supabaseBiz.storage
        .from('videos')
        .upload(fileName, file);

      if (error) throw error;

      // Public URL 가져오기
      const { data: { publicUrl } } = supabaseBiz.storage
        .from('videos')
        .getPublicUrl(fileName);

      setReferenceFile({ name: file.name, url: publicUrl });
      alert('참고 파일이 업로드되었습니다.');
    } catch (error) {
      console.error('참고 파일 업로드 오류:', error);
      alert('참고 파일 업로드 실패');
    } finally {
      setUploadingReference(false);
    }
  };

  // 피드백 저장 또는 수정
  const saveFeedback = async () => {
    if (!comment.trim()) {
      alert('피드백 내용을 입력해주세요.');
      return;
    }

    const timestamp = videoRef.current.currentTime;

    if (editingFeedback) {
      // 피드백 수정
      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .update({
          box_x: Math.round(currentBox.x),
          box_y: Math.round(currentBox.y),
          box_width: Math.round(currentBox.width),
          box_height: Math.round(currentBox.height),
          comment: comment.trim(),
          author: author.trim() || '익명',
          reference_file_url: referenceFile?.url || null
        })
        .eq('id', editingFeedback.id);

      if (error) {
        console.error('피드백 수정 오류:', error);
        alert('피드백 수정 실패');
        return;
      }
      
      setEditingFeedback(null);
    } else {
      // 피드백 추가
      const { error } = await supabaseBiz
        .from('video_feedbacks')
        .insert([{
          video_id: selectedVideo.id,
          timestamp,
          box_x: Math.round(currentBox.x),
          box_y: Math.round(currentBox.y),
          box_width: Math.round(currentBox.width),
          box_height: Math.round(currentBox.height),
          comment: comment.trim(),
          author: author.trim() || '익명',
          reference_file_url: referenceFile?.url || null
        }]);

      if (error) {
        console.error('피드백 저장 오류:', error);
        alert('피드백 저장 실패');
        return;
      }
    }

    // 초기화
    setComment('');
    setAuthor('');
    setReferenceFile(null);
    setShowCommentModal(false);
    setCurrentBox(null);
    loadFeedbacks(selectedVideo.id);
  };
  
  // 피드백 수정 모드 시작
  const editFeedback = (feedback) => {
    setEditingFeedback(feedback);
    setComment(feedback.comment);
    setAuthor(feedback.author);
    setCurrentBox({
      x: feedback.box_x,
      y: feedback.box_y,
      width: feedback.box_width,
      height: feedback.box_height
    });
    if (feedback.reference_file_url) {
      setReferenceFile({ url: feedback.reference_file_url, name: '기존 파일' });
    }
    
    // 모달 위치 계산
    const rect = canvasRef.current.getBoundingClientRect();
    const modalWidth = 400;
    const modalHeight = 500;
    let modalX = feedback.box_x + feedback.box_width + 20;
    let modalY = feedback.box_y;
    
    if (modalX + modalWidth > rect.width) {
      modalX = feedback.box_x - modalWidth - 20;
    }
    if (modalY < 0) modalY = 0;
    if (modalY + modalHeight > rect.height) {
      modalY = rect.height - modalHeight;
    }
    
    setModalPosition({ x: modalX, y: modalY });
    setShowCommentModal(true);
    
    // 일시정지 및 해당 시간으로 이동
    if (videoRef.current) {
      videoRef.current.currentTime = feedback.timestamp;
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  };
  
  // 피드백 삭제
  const deleteFeedback = async (feedbackId) => {
    if (!confirm('피드백을 삭제하시겠습니까?')) return;

    const { error } = await supabaseBiz
      .from('video_feedbacks')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      console.error('피드백 삭제 오류:', error);
      alert('피드백 삭제 실패');
      return;
    }

    loadFeedbacks(selectedVideo.id);
  };

  // 피드백 클릭 시 해당 시간으로 이동
  const jumpToFeedback = (feedback) => {
    if (videoRef.current) {
      videoRef.current.currentTime = feedback.timestamp;
      // 일시정지 상태 유지
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
      
      // 저장된 박스 좌표 표시
      setCurrentBox({
        x: feedback.box_x,
        y: feedback.box_y,
        width: feedback.box_width,
        height: feedback.box_height
      });
    }
  };

  // 캔버스에 박스 그리기
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentBox) {
      // 박스 그리기
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
      
      // 리사이징 핸들 그리기 (8개: 4개 모서리 + 4개 변)
      const handleSize = 8;
      const { x, y, width, height } = currentBox;
      
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      
      const handles = [
        { x: x, y: y }, // nw
        { x: x + width, y: y }, // ne
        { x: x, y: y + height }, // sw
        { x: x + width, y: y + height }, // se
        { x: x, y: y + height / 2 }, // w
        { x: x + width, y: y + height / 2 }, // e
        { x: x + width / 2, y: y }, // n
        { x: x + width / 2, y: y + height }, // s
      ];
      
      handles.forEach(handle => {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      });
      
      // 박스 번호 표시 제거 (혼란 방지)
    }
  }, [currentBox, feedbacks.length]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">영상 피드백 시스템</h1>

      {/* 영상 업로드 */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <label className="block mb-2 font-semibold">영상 업로드 (MP4/MOV)</label>
        <input
          type="file"
          accept="video/mp4,video/quicktime"
          onChange={handleVideoUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {uploading && <p className="mt-2 text-sm text-gray-600">업로드 중...</p>}
      </div>

      {/* 영상 목록 */}
      {videos.length > 0 && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">영상 목록</h2>
          <div className="space-y-2">
            {videos.map(video => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={`w-full text-left p-3 rounded ${
                  selectedVideo?.id === video.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="font-medium">{video.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(video.created_at).toLocaleString('ko-KR')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 영상 플레이어 */}
      {selectedVideo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden shadow-lg">
              {/* 비디오 영역 */}
              <div
                ref={containerRef}
                className="relative"
                style={{ aspectRatio: '16/9' }}
              >
                <video
                  ref={videoRef}
                  src={selectedVideo.video_url}
                  className="w-full h-full"
                  style={{ display: 'block' }}
                  playsInline
                  preload="metadata"
                  onError={handleVideoError}
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
                        <button
                          onClick={handleVideoRetry}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/50 rounded font-semibold text-sm"
                        >
                          <span className="inline-flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            다시 시도
                          </span>
                        </button>
                        <a
                          href={selectedVideo.video_url}
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
                <canvas
                  ref={canvasRef}
                  width={containerRef.current?.offsetWidth || 800}
                  height={containerRef.current?.offsetHeight || 450}
                  onClick={handleCanvasClick}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
              
              {/* 컨트롤 영역 */}
              <div className="p-4 bg-gray-800 text-white">
                {/* 재생 버튼 및 시간 */}
                <div className="flex items-center gap-4 mb-3">
                  <button
                    onClick={() => {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                      } else {
                        videoRef.current.pause();
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
                  >
                    {isPlaying ? '⏸️ 일시정지' : '▶️ 재생'}
                  </button>
                  <span className="text-sm">
                    {Math.floor(currentTime)}초 / {Math.floor(duration)}초
                  </span>
                  
                  {/* 재생 속도 조절 */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        videoRef.current.playbackRate = 0.5;
                        setPlaybackRate(0.5);
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        playbackRate === 0.5
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-500'
                      }`}
                    >
                      0.5x
                    </button>
                    <button
                      onClick={() => {
                        videoRef.current.playbackRate = 1;
                        setPlaybackRate(1);
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        playbackRate === 1
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-500'
                      }`}
                    >
                      1x
                    </button>
                    <button
                      onClick={() => {
                        videoRef.current.playbackRate = 2;
                        setPlaybackRate(2);
                      }}
                      className={`px-3 py-1 rounded text-sm ${
                        playbackRate === 2
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-white hover:bg-gray-500'
                      }`}
                    >
                      2x
                    </button>
                  </div>
                </div>
                
                {/* 진행 바 */}
                <div 
                  className="relative w-full h-2 bg-gray-600 rounded cursor-pointer mb-3"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    videoRef.current.currentTime = percentage * duration;
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-red-600 rounded"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                
                <p className="text-sm text-gray-300">
                  💡 화면 클릭: 박스 생성 | 핸들 드래그: 크기 조절 | 박스 클릭: 피드백 입력 | ESC: 박스 삭제
                </p>
              </div>
            </div>
          </div>

          {/* 피드백 목록 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">피드백 ({feedbacks.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {feedbacks.map(feedback => (
                <div
                  key={feedback.id}
                  className="p-3 bg-gray-50 rounded"
                >
                  {/* 피드백 내용 */}
                  <div 
                    onClick={() => jumpToFeedback(feedback)}
                    className="cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-600">
                        {Math.floor(feedback.timestamp / 60)}:{String(Math.floor(feedback.timestamp % 60)).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-gray-500">{feedback.author}</span>
                    </div>
                    <p className="text-sm text-gray-700">{feedback.comment}</p>
                  </div>
                  
                  {/* 참고 파일 및 버튼 */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {feedback.reference_file_url && (
                        <a
                          href={feedback.reference_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          📎 참고 파일
                        </a>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFeedback(expandedFeedback === feedback.id ? null : feedback.id);
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        💬 댓글 ({comments[feedback.id]?.length || 0})
                      </button>
                    </div>
                    
                    {/* 수정/삭제 버튼 */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editFeedback(feedback);
                        }}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        ✏️ 수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFeedback(feedback.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                  
                  {/* 댓글 섹션 */}
                  {expandedFeedback === feedback.id && (
                    <div className="mt-3 pt-3 border-t border-gray-300" onClick={(e) => e.stopPropagation()}>
                      {/* 기존 댓글 목록 */}
                      <div className="space-y-2 mb-3">
                        {comments[feedback.id]?.map(comment => (
                          <div key={comment.id} className="bg-white p-2 rounded text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-700">{comment.author}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEditComment(comment)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => deleteComment(comment.id, feedback.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-600">{comment.comment}</p>
                            <span className="text-gray-400 text-[10px]">
                              {new Date(comment.created_at).toLocaleString('ko-KR')}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* 댓글 입력 */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="작성자 (선택)"
                          value={expandedFeedback === feedback.id ? commentAuthor : ''}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                        <textarea
                          placeholder="댓글 내용"
                          value={expandedFeedback === feedback.id ? newComment : ''}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-xs h-16"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => addComment(feedback.id)}
                            className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            {editingComment ? '댓글 수정' : '댓글 작성'}
                          </button>
                          {editingComment && (
                            <button
                              onClick={() => {
                                setEditingComment(null);
                                setNewComment('');
                                setCommentAuthor('');
                              }}
                              className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {feedbacks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  아직 피드백이 없습니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 코멘트 입력 모달 */}
      {showCommentModal && currentBox && (
        <div className="fixed inset-0 z-50" onClick={() => {
          setShowCommentModal(false);
          setCurrentBox(null);
          setComment('');
          setAuthor('');
          setReferenceFile(null);
        }}>
          <div 
            className="absolute bg-white rounded-lg p-6 shadow-2xl border-2 border-gray-300"
            style={{
              left: `${containerRef.current?.getBoundingClientRect().left + modalPosition.x}px`,
              top: `${containerRef.current?.getBoundingClientRect().top + modalPosition.y}px`,
              width: '400px',
              maxHeight: '500px',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingFeedback ? '피드백 수정' : '피드백 작성'}</h3>
            <input
              type="text"
              placeholder="작성자 이름 (선택)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            />
            <textarea
              placeholder="피드백 내용을 입력하세요 (CTRL+ENTER로 저장)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                  saveFeedback();
                }
              }}
              className="w-full px-3 py-2 border rounded mb-4 h-32"
              autoFocus
            />
            
            {/* 참고 파일 첨부 */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">참고 파일 (선택)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleReferenceFileUpload}
                disabled={uploadingReference}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {uploadingReference && <p className="mt-1 text-xs text-gray-600">업로드 중...</p>}
              {referenceFile && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs text-green-700">✓ {referenceFile.name}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveFeedback}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCurrentBox(null);
                  setComment('');
                  setAuthor('');
                  setReferenceFile(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
