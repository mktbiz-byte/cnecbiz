import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseBiz } from '../../supabaseClient'

export default function CreatorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCreatorProfile()
  }, [id])

  const loadCreatorProfile = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*, user_profiles(rating, company_review, review_updated_at)')
        .eq('id', id)
        .single()

      if (error) throw error
      setCreator(data)
    } catch (err) {
      console.error('Error loading creator profile:', err)
      alert('크리에이터 프로필을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">크리에이터를 찾을 수 없습니다.</div>
      </div>
    )
  }

  const capiAnalysis = creator.capi_analysis || {}
  const contentScores = capiAnalysis.content_scores || {}
  const activityScores = capiAnalysis.activity_scores || {}

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 돌아가기
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start gap-6">
              {creator.profile_image && (
                <img
                  src={creator.profile_image}
                  alt={creator.channel_name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{creator.channel_name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="capitalize">{creator.platform}</span>
                  <span>•</span>
                  <span>{creator.followers?.toLocaleString()} 구독자</span>
                  {creator.user_profiles?.rating > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        ⭐ {creator.user_profiles.rating.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
                <a
                  href={creator.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  채널 방문 →
                </a>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-purple-600 mb-1">
                  {creator.capi_score}점
                </div>
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  {creator.capi_grade}급
                </div>
                {creator.capi_reliability > 0 && (
                  <div className="text-sm text-gray-600">
                    신뢰도: {creator.capi_reliability}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CAPI Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Content Score */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">📊 콘텐츠 제작 역량</h2>
            <div className="text-3xl font-bold text-purple-600 mb-4">
              {creator.capi_content_score}/70점
            </div>
            <div className="space-y-3">
              {Object.entries(contentScores).map(([key, data]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{getScoreLabel(key)}</span>
                  <span className="font-semibold">
                    {data.score}/{data.max}점
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Score */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">📈 계정 활성도</h2>
            <div className="text-3xl font-bold text-purple-600 mb-4">
              {creator.capi_activity_score}/30점
            </div>
            <div className="space-y-3">
              {Object.entries(activityScores).map(([key, data]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{getActivityLabel(key)}</span>
                  <span className="font-semibold">
                    {data.score}/{data.max}점
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Evaluation */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💡 상세 평가</h2>
          <div className="space-y-4">
            {Object.entries(contentScores).map(([key, data]) => (
              <div key={key} className="border-b pb-4 last:border-b-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-800">{getScoreLabel(key)}</h3>
                  <span className="text-sm font-semibold text-purple-600">
                    {data.score}/{data.max}점
                  </span>
                </div>
                <p className="text-sm text-gray-600">{data.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-green-800">👍 강점</h2>
            <ul className="space-y-2">
              {(capiAnalysis.strengths || []).map((strength, idx) => (
                <li key={idx} className="text-sm text-green-900">• {strength}</li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-yellow-800">⚠️ 개선 필요</h2>
            <ul className="space-y-2">
              {(capiAnalysis.weaknesses || []).map((weakness, idx) => (
                <li key={idx} className="text-sm text-yellow-900">• {weakness}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Analyzed Videos */}
        {capiAnalysis.analyzed_videos && capiAnalysis.analyzed_videos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">🎬 분석된 영상 ({capiAnalysis.analyzed_videos.length}개)</h2>
            <div className="space-y-3">
              {capiAnalysis.analyzed_videos.map((video, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-3 last:border-b-0">
                  <div className="flex-1">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      {video.title || '영상 ' + (idx + 1)}
                    </a>
                    <div className="text-xs text-gray-500 mt-1">
                      조회수: {video.views?.toLocaleString()} | 좋아요: {video.likes?.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-purple-600">
                      {video.content_score}점
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Review (if exists) */}
        {creator.user_profiles?.company_review && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-blue-800">📝 기업 후기</h2>
            <p className="text-sm text-blue-900 whitespace-pre-wrap">
              {creator.user_profiles.company_review}
            </p>
            {creator.user_profiles.review_updated_at && (
              <p className="text-xs text-blue-700 mt-2">
                작성일: {new Date(creator.user_profiles.review_updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getScoreLabel(key) {
  const labels = {
    opening_hook: '오프닝 후킹력',
    credibility: '신뢰도 구축',
    product_demo: '제품 시연 효과성',
    audio_quality: '오디오 품질',
    editing: '편집 & 페이싱',
    storytelling: '스토리텔링 구조',
    cta_clarity: 'CTA 명확성',
    visual_quality: '비주얼 품질'
  }
  return labels[key] || key
}

function getActivityLabel(key) {
  const labels = {
    avg_views: '평균 조회수',
    engagement: '참여율',
    upload_frequency: '업로드 빈도'
  }
  return labels[key] || key
}
