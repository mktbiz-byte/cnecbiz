import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Star, CheckCircle2, XCircle, MessageSquare, Sparkles, Droplets, ExternalLink, Award, FileText } from 'lucide-react'
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
  return num.toLocaleString()
}

export default function CreatorCard({ application, onVirtualSelect, onConfirm, onCancel, isConfirmed, isAlreadyParticipant, onViewProfile, featuredInfo: propFeaturedInfo }) {
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
    user_id
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

  // 질문 답변 배열
  const answers = [answer_1, answer_2, answer_3, answer_4].filter(a => a && a.trim())

  // 로컬 상태로 메인 채널 관리
  const [selectedChannel, setSelectedChannel] = useState(savedMainChannel || '')

  // 추천 크리에이터 상태
  const [featuredInfo, setFeaturedInfo] = useState(propFeaturedInfo || null)

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

  // 평균 별점 (임시로 비활성화 - rating 필드 없음)
  const averageRating = 0
  // 추천 크리에이터 여부 - featuredInfo에서 가져옴
  const isRecommended = featuredInfo?.isRecommended || featuredInfo?.isFeatured

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

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${virtual_selected ? 'ring-2 ring-blue-400 shadow-lg' : 'hover:shadow-lg'}`}>
      <CardContent className="p-0">
        {/* 프로필 사진 */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {application.profile_photo_url ? (
            <img
              src={application.profile_photo_url}
              alt={applicant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-20 h-20 text-gray-300" />
            </div>
          )}

          {/* 가상선택 배지 */}
          {virtual_selected && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-blue-500 text-white shadow-lg">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                가상선택
              </Badge>
            </div>
          )}

          {/* 크넥 추천 배지 */}
          {isRecommended && featuredInfo && (
            <div className="absolute top-2 left-2">
              <Badge
                className="text-white shadow-lg flex items-center gap-1"
                style={{ backgroundColor: featuredInfo.gradeInfo?.color || '#F59E0B' }}
              >
                <Award className="w-3 h-3" />
                <span className="font-bold">크넥 추천</span>
                {featuredInfo.gradeName && (
                  <span className="text-[10px] opacity-90 ml-0.5">
                    {featuredInfo.gradeName}
                  </span>
                )}
              </Badge>
            </div>
          )}
        </div>

        {/* 이미지 아래 지원서 보기 버튼 */}
        {onViewProfile && (
          <div className="px-4 pt-3">
            <Button
              onClick={() => onViewProfile(application)}
              variant="outline"
              size="sm"
              className="w-full h-9 text-sm border-green-300 text-green-600 hover:bg-green-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              지원서 보기
            </Button>
          </div>
        )}

        <div className="p-4 pt-2">
          {/* 기본 정보 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">{applicant_name}</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{age}세</span>
              {skinTypeKorean && (
                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {skinTypeKorean}
                </span>
              )}
            </div>

            {/* 채널별 팔로워 + 선택 + 링크 통합 */}
            <div className="space-y-1.5">
              {appliedChannels.map(channel => {
                const style = getChannelStyle(channel.name)
                const isSelected = selectedChannel === channel.name
                return (
                  <div key={channel.name} className="flex items-center gap-2">
                    {/* 라디오 선택 */}
                    <label
                      className={`flex items-center gap-2 flex-1 p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? `${style.light} border-2`
                          : 'bg-white border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`channel-${application.id}`}
                        value={channel.name}
                        checked={isSelected}
                        onChange={(e) => setSelectedChannel(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-full ${isSelected ? style.bg : 'bg-gray-200'} flex items-center justify-center flex-shrink-0`}>
                        <ChannelIcon name={channel.name} className={`w-3.5 h-3.5 ${isSelected ? style.text : 'text-gray-400'}`} />
                      </div>
                      <span className={`text-sm ${isSelected ? 'font-semibold' : 'text-gray-700'}`}>{channel.label}</span>
                      <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium text-gray-500'}`}>{formatFollowers(channel.followers)}명</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </label>
                    {/* SNS 링크 버튼 */}
                    <button
                      onClick={() => window.open(channel.url, '_blank')}
                      className={`p-2 rounded-lg ${style.light} hover:opacity-80 transition-opacity`}
                      title={`${channel.label} 프로필 보기`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-2">
            {isAlreadyParticipant || isConfirmed ? (
              <>
                <div className="flex items-center justify-center gap-2 h-10 bg-green-100 text-green-700 rounded-lg font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  선정 완료
                </div>
                <Button
                  onClick={() => onCancel && onCancel(application)}
                  size="sm"
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 h-9"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  선정 취소
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleVirtualSelect}
                  variant="outline"
                  size="sm"
                  className={`w-full h-9 ${virtual_selected ? 'border-blue-400 text-blue-600 bg-blue-50 font-semibold' : 'border-gray-200'}`}
                >
                  {virtual_selected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      가상선택됨
                    </>
                  ) : (
                    '가상선택'
                  )}
                </Button>
                <Button
                  onClick={handleConfirm}
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-10 font-semibold shadow-md"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  크리에이터 확정
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
