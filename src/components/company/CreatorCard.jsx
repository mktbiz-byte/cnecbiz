import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Star } from 'lucide-react'

export default function CreatorCard({ application, onVirtualSelect, onConfirm }) {
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

  // 평균 별점 (user_profiles에서 가져온 rating 사용)
  const averageRating = application.rating || 0
  const isRecommended = averageRating >= 4.5

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
      <CardContent className="p-4">
        {/* 프로필 이미지 */}
        <div className="relative mb-4">
          <div className="aspect-[3/2] bg-gray-200 rounded-lg overflow-hidden">
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
          
          {/* 크넥 추천 배지 */}
          {isRecommended && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              크넥 추천
            </Badge>
          )}
          
          {/* 작은 프로필 사진 */}
          <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-white border-2 border-white overflow-hidden">
            {application.profile_photo_url ? (
              <img
                src={application.profile_photo_url}
                alt={applicant_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* 이름 및 나이 */}
        <h3 className="text-lg font-bold mb-1">
          {applicant_name} ({age}세)
        </h3>

        {/* 지원한 채널 및 팔로워 */}
        <div className="space-y-2 mb-4">
          {appliedChannels.map(channel => (
            <div key={channel.name} className="flex items-center justify-between text-sm">
              <span className="font-medium">{channel.label}</span>
              <span className="text-gray-600">{channel.followers.toLocaleString()}명</span>
            </div>
          ))}
        </div>

        {/* 메인 채널 선택 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            메인 채널 선택 (1개만)
          </label>
          <div className="space-y-2">
            {appliedChannels.map(channel => (
              <label key={channel.name} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={`main-channel-${application.id}`}
                  value={channel.name}
                  checked={selectedChannel === channel.name}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm">
                  {channel.label} ({channel.followers.toLocaleString()}명)
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 지원한 채널 링크 버튼 */}
        <div className="space-y-2 mb-4">
          {appliedChannels.map(channel => (
            <Button
              key={channel.name}
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(channel.url, '_blank')}
            >
              {channel.label}
            </Button>
          ))}
        </div>

        {/* 피부타입 */}
        {skin_type && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              피부타입
            </label>
            <p className="text-sm text-gray-800">{skinTypeKorean}</p>
          </div>
        )}

        {/* 질문 답변 */}
        {answers.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg group relative cursor-pointer hover:shadow-md transition-all">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              캐페인 질문 답변
            </label>
            <div className="space-y-2 max-h-20 overflow-hidden group-hover:max-h-none group-hover:overflow-visible transition-all duration-300">
              {answers.map((answer, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium text-gray-700">Q{index + 1}:</span>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">{answer}</p>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1 group-hover:hidden">
              마우스를 올려 전체 보기
            </div>
          </div>
        )}

        {/* 지원자 한마디 */}
        {additional_info && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg group relative cursor-pointer hover:shadow-md transition-all">
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              지원자 한마디
            </label>
            <p className="text-sm text-gray-800 whitespace-pre-wrap max-h-12 overflow-hidden group-hover:max-h-none group-hover:overflow-visible transition-all duration-300">
              {additional_info}
            </p>
            <div className="text-xs text-gray-500 mt-1 group-hover:hidden">
              마우스를 올려 전체 보기
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-2">
          {!virtual_selected && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-black hover:bg-gray-800 text-white font-bold"
              onClick={handleVirtualSelect}
            >
              가상선정 하기
            </Button>
          )}
          
          {virtual_selected && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-red-500 text-red-500 hover:bg-red-50"
                onClick={() => onVirtualSelect(application.id, false, null)}
              >
                가상선정 취소
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={handleConfirm}
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
