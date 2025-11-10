import React, { useState, useRef, useEffect } from 'react';
import { supabaseBiz } from '../../lib/supabase';

export default function VideoFeedback() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');
  const [uploading, setUploading] = useState(false);
  
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
    
    if (!error && data) {
      setFeedbacks(data);
    }
  };

  // 영상 업로드
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
      // Supabase Storage에 업로드
      const fileName = `${Date.now()}_${file.name}`;
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

  // 캔버스에 박스 그리기 시작
  const handleCanvasMouseDown = (e) => {
    if (!videoRef.current || videoRef.current.paused) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    videoRef.current.pause();
  };

  // 박스 그리는 중
  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentBox({
      x: Math.min(drawStart.x, x),
      y: Math.min(drawStart.y, y),
      width: Math.abs(x - drawStart.x),
      height: Math.abs(y - drawStart.y)
    });
  };

  // 박스 그리기 완료
  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentBox && currentBox.width > 10 && currentBox.height > 10) {
      setShowCommentModal(true);
    } else {
      setDrawStart(null);
      setCurrentBox(null);
    }
  };

  // 피드백 저장
  const saveFeedback = async () => {
    if (!comment.trim()) {
      alert('피드백 내용을 입력해주세요.');
      return;
    }

    const timestamp = videoRef.current.currentTime;

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
        author: author.trim() || '익명'
      }]);

    if (error) {
      console.error('피드백 저장 오류:', error);
      alert('피드백 저장 실패');
      return;
    }

    // 초기화
    setComment('');
    setAuthor('');
    setShowCommentModal(false);
    setDrawStart(null);
    setCurrentBox(null);
    loadFeedbacks(selectedVideo.id);
  };

  // 피드백 클릭 시 해당 시간으로 이동
  const jumpToFeedback = (feedback) => {
    if (videoRef.current) {
      videoRef.current.currentTime = feedback.timestamp;
      videoRef.current.play();
    }
  };

  // 캔버스에 박스 그리기
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentBox) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  }, [currentBox]);

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
              <div
                ref={containerRef}
                className="relative"
                style={{ aspectRatio: '16/9' }}
              >
                <video
                  ref={videoRef}
                  src={selectedVideo.video_url}
                  controls
                  className="w-full h-full"
                  style={{ display: 'block' }}
                />
                <canvas
                  ref={canvasRef}
                  width={containerRef.current?.offsetWidth || 800}
                  height={containerRef.current?.offsetHeight || 450}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
              <div className="p-4 bg-gray-800 text-white">
                <p className="text-sm">
                  💡 영상을 재생하고 원하는 순간에 화면을 클릭하여 박스를 그리세요
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
                  onClick={() => jumpToFeedback(feedback)}
                  className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-blue-600">
                      {Math.floor(feedback.timestamp / 60)}:{String(Math.floor(feedback.timestamp % 60)).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-500">{feedback.author}</span>
                  </div>
                  <p className="text-sm text-gray-700">{feedback.comment}</p>
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
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">피드백 작성</h3>
            <input
              type="text"
              placeholder="작성자 이름 (선택)"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            />
            <textarea
              placeholder="피드백 내용을 입력하세요"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4 h-32"
              autoFocus
            />
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
                  setDrawStart(null);
                  setCurrentBox(null);
                  setComment('');
                  setAuthor('');
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
