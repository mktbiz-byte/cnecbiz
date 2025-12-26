import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Star, CheckCircle2, XCircle, MessageSquare, Sparkles, Droplets, ExternalLink, Award, Calendar, TrendingUp, Users, Eye, Clock } from 'lucide-react'
import { checkIfFeaturedCreator, GRADE_LEVELS } from '../../services/creatorGradeService'

// 플랫폼 아이콘 컴포넌트
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
)

const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
)

// 팔로워 수 포맷팅 (10000 -> 1만)
const formatFollowers = (num) => {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}만`
  }
  return num?.toLocaleString() || '0'
}

// 날짜 포맷팅
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export default function CreatorCard({ application, campaignQuestions = [], onVirtualSelect, onConfirm, onCancel, isConfirmed, isAlreadyParticipant, onViewProfile, featuredInfo: propFeaturedInfo }) {
  const {
    applicant_name,
    age,
    instagram_url,
    youtube_url,
    tiktok_url,
    virtual_selected,
    main_channel: savedMainChannel,
    skin_type,
    answer_1,
    answer_2,
    answer_3,
    answer_4,
    additional_info,
    user_id,
    created_at,
    // 협업 관련 필드들
    collaboration_count,
    first_application,
    participation_rate,
    review_count,
    average_rating
  } = application

  // 피부타입 한글 변환
  const skinTypeMap = {
    'dry': '건성',
    'oily': '지성',
    'combination': '복합성',
    'sensitive': '민감성',
    'normal': '중성'
  }
  const skinTypeKorean = skinTypeMap[skin_type?.toLowerCase()] || skin_type

  // 질문과 답변 배열 (질문과 답변을 매칭)
  const rawAnswers = [answer_1, answer_2, answer_3, answer_4]

  // campaignQuestions가 있으면 질문과 매칭, 없으면 답변만 표시
  const questionsAndAnswers = rawAnswers
    .map((answer, index) => ({
      question: campaignQuestions[index] || null,
      answer: answer
    }))
    .filter(qa => qa.answer && qa.answer.trim())

  // 기존 answers 배열 (호환성 유지)
  const answers = rawAnswers.filter(a => a && a.trim())

  // 로컬 상태로 메인 채널 관리
  const [selectedChannel, setSelectedChannel] = useState(savedMainChannel || '')

  // 추천 크리에이터 상태
  const [featuredInfo, setFeaturedInfo] = useState(propFeaturedInfo || null)

  // 프로필 모달 상태
  const [showProfileModal, setShowProfileModal] = useState(false)

  // 추천 크리에이터 확인
  useEffect(() => {
    if (propFeaturedInfo) {
      setFeaturedInfo(propFeaturedInfo)
      return
    }

    const checkFeatured = async () => {
      if (user_id) {
        const info = await checkIfFeaturedCreator(user_id)
        if (info) {
          setFeaturedInfo(info)
        }
      }
    }
    checkFeatured()
  }, [user_id, propFeaturedInfo])

  // 지원한 채널 목록
  const appliedChannels = []
  if (instagram_url) appliedChannels.push({ name: 'instagram', label: 'Instagram', url: instagram_url, followers: application.instagram_followers || 0 })
  if (youtube_url) appliedChannels.push({ name: 'youtube', label: 'YouTube', url: youtube_url, followers: application.youtube_subscribers || 0 })
  if (tiktok_url) appliedChannels.push({ name: 'tiktok', label: 'TikTok', url: tiktok_url, followers: application.tiktok_followers || 0 })

  // 추천 크리에이터 여부
  const isRecommended = featuredInfo?.isRecommended || featuredInfo?.isFeatured

  // 협업 경험 판단
  const hasCollaborationExperience = collaboration_count && collaboration_count > 0
  const isFirstApplication = first_application === true || (!collaboration_count && !hasCollaborationExperience)

  const handleVirtualSelect = () => {
    if (!selectedChannel && !virtual_selected) {
      alert('메인 채널을 선택해주세요')
      return
    }
    onVirtualSelect(application.id, !virtual_selected, selectedChannel)
  }

  const handleConfirm = () => {
    if (!selectedChannel) {
      alert('메인 채널을 선택해주세요')
      return
    }
    onConfirm(application, selectedChannel)
  }

  // 채널 아이콘 컴포넌트
  const ChannelIcon = ({ name, className }) => {
    switch (name) {
      case 'instagram':
        return <InstagramIcon className={className} />
      case 'youtube':
        return <YouTubeIcon className={className} />
      case 'tiktok':
        return <TikTokIcon className={className} />
      default:
        return null
    }
  }

  // 채널별 스타일
  const getChannelStyle = (name) => {
    switch (name) {
      case 'instagram':
        return { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white', light: 'bg-pink-50 text-pink-600 border-pink-200' }
      case 'youtube':
        return { bg: 'bg-red-500', text: 'text-white', light: 'bg-red-50 text-red-600 border-red-200' }
      case 'tiktok':
        return { bg: 'bg-black', text: 'text-white', light: 'bg-gray-100 text-gray-700 border-gray-300' }
      default:
        return { bg: 'bg-gray-500', text: 'text-white', light: 'bg-gray-50 text-gray-600 border-gray-200' }
    }
  }

  // 메인 채널 찾기 (팔로워 가장 많은 채널)
  const mainChannel = appliedChannels.reduce((max, channel) =>
    channel.followers > (max?.followers || 0) ? channel : max
  , appliedChannels[0])

  return (
    <>
      {/* 가로형 카드 레이아웃 */}
      <Card className={`overflow-hidden transition-all duration-200 ${virtual_selected ? 'ring-2 ring-blue-400 shadow-lg bg-blue-50/30' : 'hover:shadow-md hover:border-gray-300'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* 왼쪽: 프로필 사진 */}
            <div className="relative w-full sm:w-32 h-32 sm:h-auto aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
              {application.profile_photo_url ? (
                <img
                  src={application.profile_photo_url}
                  alt={applicant_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-300" />
                </div>
              )}

              {/* 가상선택 배지 */}
              {virtual_selected && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-blue-500 text-white shadow-lg text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-0.5" />
                    선택
                  </Badge>
                </div>
              )}

              {/* 크넥 추천 배지 */}
              {isRecommended && featuredInfo && (
                <div className="absolute bottom-2 left-2">
                  <Badge
                    className="text-white shadow-lg flex items-center gap-0.5 text-xs"
                    style={{ backgroundColor: featuredInfo.gradeInfo?.color || '#F59E0B' }}
                  >
                    <Award className="w-3 h-3" />
                    추천
                  </Badge>
                </div>
              )}
            </div>

            {/* 오른쪽: 정보 영역 */}
            <div className="flex-1 p-4">
              {/* 상단: 이름, 나이, 배지들 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-900">{applicant_name}</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{age}세</span>

                  {/* 협업 경험 배지 */}
                  {hasCollaborationExperience ? (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      협업 {collaboration_count}회
                    </Badge>
                  ) : isFirstApplication && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      첫 지원
                    </Badge>
                  )}

                  {/* 피부타입 */}
                  {skinTypeKorean && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                      <Droplets className="w-3 h-3 mr-0.5" />
                      {skinTypeKorean}
                    </Badge>
                  )}
                </div>

                {/* 지원일 */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatDate(created_at)} 지원
                </div>
              </div>

              {/* SNS 채널 정보 */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {appliedChannels.map(channel => {
                  const style = getChannelStyle(channel.name)
                  const isSelected = selectedChannel === channel.name
                  return (
                    <button
                      key={channel.name}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedChannel(channel.name)
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-all border ${
                        isSelected
                          ? `${style.light} border-2 font-semibold`
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full ${isSelected ? style.bg : 'bg-gray-200'} flex items-center justify-center flex-shrink-0`}>
                        <ChannelIcon name={channel.name} className={`w-3 h-3 ${isSelected ? style.text : 'text-gray-400'}`} />
                      </div>
                      <span className="font-medium">{formatFollowers(channel.followers)}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(channel.url, '_blank')
                        }}
                        className="ml-1 p-0.5 hover:bg-white/50 rounded"
                      >
                        <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                    </button>
                  )
                })}
              </div>

              {/* 참여율/후기/별점 */}
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-600">
                {participation_rate !== undefined && participation_rate !== null && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>참여율</span>
                    <span className="font-semibold text-indigo-600">{participation_rate}%</span>
                  </div>
                )}
                {(review_count !== undefined && review_count > 0) && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4 text-green-500" />
                    <span>후기</span>
                    <span className="font-semibold text-green-600">{review_count}개</span>
                  </div>
                )}
                {(average_rating !== undefined && average_rating > 0) && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-yellow-600">{average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* 질문 답변 전체 표시 */}
              {questionsAndAnswers.length > 0 && (
                <div className="mb-3 space-y-2">
                  {questionsAndAnswers.map((qa, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded-lg text-xs border border-green-100">
                      <p className="text-green-700 font-semibold mb-1">
                        Q{index + 1}. {qa.question || '질문'}
                      </p>
                      <p className="text-gray-700 pl-2 border-l-2 border-green-300">{qa.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 지원자 한마디 */}
              {additional_info && (
                <div className="mb-3 p-2 bg-amber-50 rounded-lg text-xs border border-amber-100">
                  <p className="text-amber-700 font-semibold mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    지원자 한마디
                  </p>
                  <p className="text-gray-700">{additional_info}</p>
                </div>
              )}

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-2">
                {isAlreadyParticipant || isConfirmed ? (
                  <>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      선정 완료
                    </div>
                    <Button
                      onClick={() => onCancel && onCancel(application)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-sm"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleVirtualSelect}
                      variant="outline"
                      size="sm"
                      className={`h-8 text-sm ${virtual_selected ? 'border-blue-300 text-blue-600 bg-blue-50' : ''}`}
                    >
                      {virtual_selected ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          선택 취소
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          가상선택
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      size="sm"
                      className="h-8 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      확정
                    </Button>
                  </>
                )}

                {/* 프로필 보기 버튼 */}
                <Button
                  onClick={() => setShowProfileModal(true)}
                  variant="ghost"
                  size="sm"
                  className="h-8 text-sm text-gray-600 hover:text-gray-900 ml-auto"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  프로필 보기
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 프로필 모달 (개인정보 제외) */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">크리에이터 프로필</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6">
              {/* 프로필 정보 */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {application.profile_photo_url ? (
                    <img src={application.profile_photo_url} alt={applicant_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{applicant_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-gray-500">{age}세</span>
                    {skinTypeKorean && (
                      <Badge variant="outline" className="text-xs">{skinTypeKorean}</Badge>
                    )}
                    {hasCollaborationExperience && (
                      <Badge className="text-xs bg-green-100 text-green-700">협업 {collaboration_count}회</Badge>
                    )}
                    {isFirstApplication && (
                      <Badge className="text-xs bg-amber-100 text-amber-700">첫 지원</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* SNS 채널 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">SNS 채널</h4>
                <div className="space-y-2">
                  {appliedChannels.map(channel => {
                    const style = getChannelStyle(channel.name)
                    return (
                      <a
                        key={channel.name}
                        href={channel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center`}>
                          <ChannelIcon name={channel.name} className={`w-5 h-5 ${style.text}`} />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{channel.label}</span>
                          <div className="text-sm text-gray-500">{formatFollowers(channel.followers)}명 팔로워</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    )
                  })}
                </div>
              </div>

              {/* 활동 통계 */}
              {(participation_rate || review_count || average_rating) && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">활동 통계</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {participation_rate !== undefined && (
                      <div className="text-center p-3 bg-indigo-50 rounded-lg">
                        <div className="text-lg font-bold text-indigo-600">{participation_rate}%</div>
                        <div className="text-xs text-gray-500">참여율</div>
                      </div>
                    )}
                    {review_count !== undefined && review_count > 0 && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{review_count}개</div>
                        <div className="text-xs text-gray-500">후기</div>
                      </div>
                    )}
                    {average_rating !== undefined && average_rating > 0 && (
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-lg font-bold text-yellow-600">{average_rating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-gray-500">별점</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 캠페인 질문 답변 */}
              {questionsAndAnswers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">캠페인 질문 답변</h4>
                  <div className="space-y-3">
                    {questionsAndAnswers.map((qa, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          Q{index + 1}. {qa.question || '질문'}
                        </div>
                        <p className="text-sm text-gray-700 pl-1 border-l-2 border-green-300">{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 지원자 한마디 */}
              {additional_info && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">지원자 한마디</h4>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm text-gray-700">{additional_info}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
