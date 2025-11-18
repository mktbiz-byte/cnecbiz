import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Instagram, Youtube, Music } from 'lucide-react'

export default function CreatorCard({ application, onVirtualSelect, onEvaluate }) {
  const { 
    applicant_name, 
    age, 
    instagram_url, 
    youtube_url, 
    tiktok_url,
    virtual_selected,
    profile_image_url 
  } = application

  // 팔로워 수 (임시로 0, 나중에 실제 데이터 연동)
  const followers = 0
  
  // 우리가 선정한 횟수 (임시로 0, 나중에 실제 데이터 연동)
  const selectionCount = 0
  
  // 기업 후기 별점 (임시로 0, 나중에 실제 데이터 연동)
  const rating = 0

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* 프로필 이미지 */}
        <div className="aspect-[3/4] bg-gray-200 relative">
          {profile_image_url ? (
            <img 
              src={profile_image_url} 
              alt={applicant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-6xl">👤</span>
            </div>
          )}
          
          {/* 클로즈업 추천 배지 (조건부) */}
          {rating >= 4.5 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white">
              클로즈업 추천
            </Badge>
          )}
        </div>

        {/* 작은 프로필 사진 (오른쪽 하단) */}
        <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-white">
          {profile_image_url ? (
            <img 
              src={profile_image_url} 
              alt={applicant_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-2xl">👤</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* 이름 (나이) */}
        <div>
          <h3 className="font-bold text-lg">{applicant_name}</h3>
          {instagram_url && (
            <p className="text-sm text-gray-600">
              @{instagram_url.split('/').pop() || 'instagram'}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {age ? `${age}세` : '나이 미등록'}
          </p>
        </div>

        {/* 통계 정보 */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-gray-600">팔로워</p>
            <p className="font-semibold">{followers.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">우리가 선정한 지원수</p>
            <p className="font-semibold">{selectionCount}</p>
          </div>
          <div>
            <p className="text-gray-600">우리 캠페인에 지원 승</p>
            <p className="font-semibold">{rating > 0 ? `${rating}점` : '0점'}</p>
          </div>
        </div>

        {/* SNS 링크 버튼 */}
        <div className="space-y-2">
          {instagram_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(instagram_url, '_blank')}
            >
              <Instagram className="w-4 h-4" />
              대표 링크 보기
            </Button>
          )}
          {youtube_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(youtube_url, '_blank')}
            >
              <Youtube className="w-4 h-4" />
              대표 링크 보기
            </Button>
          )}
          {tiktok_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2"
              onClick={() => window.open(tiktok_url, '_blank')}
            >
              <Music className="w-4 h-4" />
              대표 링크 보기
            </Button>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          <Button
            variant="default"
            size="sm"
            className="w-full bg-black hover:bg-gray-800"
            onClick={() => onEvaluate(application)}
          >
            이 캠페인에서만 평가기
          </Button>
          
          <Button
            variant={virtual_selected ? "secondary" : "outline"}
            size="sm"
            className="w-full"
            onClick={() => onVirtualSelect(application.id, !virtual_selected)}
          >
            {virtual_selected ? '저장됨' : '저장해두기'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
