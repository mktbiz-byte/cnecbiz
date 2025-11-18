import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Instagram, Youtube, Music } from 'lucide-react'

export default function CreatorCard({ application, onVirtualSelect, onConfirm }) {
  const { 
    applicant_name, 
    age, 
    instagram_url, 
    youtube_url, 
    tiktok_url,
    virtual_selected,
    profile_image_url 
  } = application

  // 지원한 채널 확인
  const hasInstagram = instagram_url && instagram_url.trim()
  const hasYoutube = youtube_url && youtube_url.trim()
  const hasTiktok = tiktok_url && tiktok_url.trim()

  // 팔로워 수 (나중에 실제 API 연동)
  const instagramFollowers = 0
  const youtubeFollowers = 0
  const tiktokFollowers = 0

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* 프로필 이미지 - 3/2 비율로 축소 */}
        <div className="aspect-[3/2] bg-gray-200 relative">
          {profile_image_url ? (
            <img 
              src={profile_image_url} 
              alt={applicant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-4xl">👤</span>
            </div>
          )}

          {/* 작은 프로필 사진 (오른쪽 하단) */}
          <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white">
            {profile_image_url ? (
              <img 
                src={profile_image_url} 
                alt={applicant_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-xl">👤</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* 이름 (나이) */}
        <div>
          <h3 className="font-bold text-lg">
            {applicant_name} {age && `(${age}세)`}
          </h3>
        </div>

        {/* 지원한 채널별 팔로워 수 */}
        <div className="space-y-1 text-sm">
          {hasYoutube && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Youtube className="w-4 h-4" />
                유튜브
              </span>
              <span className="font-semibold">{youtubeFollowers.toLocaleString()}</span>
            </div>
          )}
          {hasInstagram && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Instagram className="w-4 h-4" />
                인스타
              </span>
              <span className="font-semibold">{instagramFollowers.toLocaleString()}</span>
            </div>
          )}
          {hasTiktok && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Music className="w-4 h-4" />
                틱톡
              </span>
              <span className="font-semibold">{tiktokFollowers.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* 지원한 채널 링크 버튼 */}
        <div className="space-y-2">
          {hasYoutube && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(youtube_url, '_blank')}
            >
              <Youtube className="w-4 h-4" />
              유튜브
            </Button>
          )}
          {hasInstagram && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(instagram_url, '_blank')}
            >
              <Instagram className="w-4 h-4" />
              인스타
            </Button>
          )}
          {hasTiktok && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(tiktok_url, '_blank')}
            >
              <Music className="w-4 h-4" />
              틱톡
            </Button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          {!virtual_selected && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-black hover:bg-gray-800 text-white font-bold"
              onClick={() => onVirtualSelect(application.id, true)}
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
                onClick={() => onVirtualSelect(application.id, false)}
              >
                가상선정 취소
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                onClick={() => onConfirm(application)}
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
