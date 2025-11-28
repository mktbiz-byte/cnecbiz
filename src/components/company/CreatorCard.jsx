import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Star } from 'lucide-react'

export default function CreatorCard({ application, onVirtualSelect, onConfirm, onCancel, isConfirmed, isAlreadyParticipant, onViewProfile }) {
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
    additional_info
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

  // 지원한 채널 목록
  const appliedChannels = []
  if (instagram_url) appliedChannels.push({ name: 'instagram', label: 'Instagram', url: instagram_url, followers: application.instagram_followers || 0 })
  if (youtube_url) appliedChannels.push({ name: 'youtube', label: 'YouTube', url: youtube_url, followers: application.youtube_subscribers || 0 })
  if (tiktok_url) appliedChannels.push({ name: 'tiktok', label: 'TikTok', url: tiktok_url, followers: application.tiktok_followers || 0 })

  // 평균 별점 (임시로 비활성화 - rating 필드 없음)
  const averageRating = 0
  const isRecommended = false

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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-3">
        {/* 크넥 추천 배지 */}
        {isRecommended && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5">
            크넥 추천
          </Badge>
        )}

        {/* 프로필 사진 - 최상단에 크게 */}
        <div className="relative w-full aspect-square bg-gray-200 rounded-t-lg overflow-hidden mb-3">
          {application.profile_photo_url ? (
            <img
              src={application.profile_photo_url}
              alt={applicant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* 기본 정보 - 사진 아래 */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{applicant_name} ({age}세)</h3>
          <div className="text-base text-gray-600 space-y-0.5">
            {appliedChannels.map(channel => (
              <div key={channel.name}>
                {channel.label} {channel.followers.toLocaleString()}명
              </div>
            ))}
            {skinTypeKorean && (
              <div>피부타입: {skinTypeKorean}</div>
            )}
          </div>
        </div>

        {/* 메인 채널 선택 - 컴팩트 */}
        {appliedChannels.length > 0 && (
          <div className="mb-2">
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              메인 채널 선택 (1개)
            </label>
            <div className="space-y-1">
              {appliedChannels.map(channel => (
                <label key={channel.name} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="radio"
                    name={`channel-${application.id}`}
                    value={channel.name}
                    checked={selectedChannel === channel.name}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="w-3 h-3"
                  />
                  <span className="flex-1 truncate">
                    {channel.label} ({channel.followers.toLocaleString()}명)
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* 질문 답변 - 팝업 모달 */}
        {answers.length > 0 && (
          <div className="mb-2 p-2 bg-green-50 rounded relative cursor-pointer group">
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              캠페인 질문 답변
            </label>
            <div className="text-xs text-gray-800 line-clamp-1">
              {answers[0].substring(0, 30)}...
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              마우스를 올려 전체 보기
            </div>
            {/* 팝업 모달 */}
            <div className="hidden group-hover:block absolute left-0 top-0 z-50 w-full max-w-md p-3 bg-white border-2 border-green-500 rounded-lg shadow-2xl">
              <label className="block text-xs font-semibold mb-2 text-gray-700">
                캠페인 질문 답변
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {answers.map((answer, index) => (
                  <div key={index} className="text-xs pb-2 border-b border-gray-200 last:border-0">
                    <span className="font-medium text-gray-700">Q{index + 1}:</span>
                    <p className="text-gray-800 mt-0.5 whitespace-pre-wrap">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 지원자 한마디 - 팝업 모달 */}
        {additional_info && (
          <div className="mb-2 p-2 bg-yellow-50 rounded relative cursor-pointer group">
            <label className="block text-xs font-semibold mb-1 text-gray-700">
              지원자 한마디
            </label>
            <p className="text-xs text-gray-800 line-clamp-1">
              {additional_info.substring(0, 30)}...
            </p>
            <div className="text-[10px] text-gray-500 mt-0.5">
              마우스를 올려 전체 보기
            </div>
            {/* 팝업 모달 */}
            <div className="hidden group-hover:block absolute left-0 top-0 z-50 w-full max-w-md p-3 bg-white border-2 border-yellow-500 rounded-lg shadow-2xl">
              <label className="block text-xs font-semibold mb-2 text-gray-700">
                지원자 한마디
              </label>
              <p className="text-xs text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {additional_info}
              </p>
            </div>
          </div>
        )}

        {/* SNS 버튼 */}
        {appliedChannels.length > 0 && (
          <div className="flex gap-1 mb-2">
            {appliedChannels.map(channel => {
              // 채널별 아이콘 및 색상
              const channelStyles = {
                youtube: { label: 'YouTube', className: 'bg-red-50 text-red-700 hover:bg-red-100' },
                instagram: { label: 'Instagram', className: 'bg-pink-50 text-pink-700 hover:bg-pink-100' },
                tiktok: { label: 'TikTok', className: 'bg-gray-50 text-gray-700 hover:bg-gray-100' }
              }
              const style = channelStyles[channel.name] || { label: channel.label, className: '' }
              
              return (
                <Button
                  key={channel.name}
                  size="sm"
                  variant="ghost"
                  className={`flex-1 text-[10px] h-6 ${style.className}`}
                  onClick={() => window.open(channel.url, '_blank')}
                >
                  {style.label}
                </Button>
              )
            })}
          </div>
        )}

        {/* 액션 버튼 - 컴팩트 */}
        <div className="space-y-1.5">
          {isAlreadyParticipant || isConfirmed ? (
            <>
              <Badge className="w-full h-10 flex items-center justify-center bg-green-100 text-green-800 text-sm font-semibold">
                선정 완료
              </Badge>
              <Button
                onClick={() => onCancel && onCancel(application)}
                size="sm"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-8"
              >
                선정 취소
              </Button>
            </>
          ) : (
            <>
              {!virtual_selected && (
                <Button
                  onClick={handleVirtualSelect}
                  variant="outline"
                  size="sm"
                  className="w-full text-sm h-8"
                >
                  가상선택
                </Button>
              )}
              {virtual_selected && (
                <Button
                  onClick={handleVirtualSelect}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 text-sm h-8"
                >
                  가상선택 취소
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
              >
                크리에이터 확정
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
