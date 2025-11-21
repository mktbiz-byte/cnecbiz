import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileText,
  Calendar,
  Link as LinkIcon,
  Hash,
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

/**
 * PPT 스타일의 AI 가이드 뷰어 컴포넌트
 * 10개 씬을 탭으로 구분하여 가독성 좋게 표시
 */
export default function CampaignGuideViewer({ guide, onClose }) {
  const [currentScene, setCurrentScene] = useState(0)

  if (!guide) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">가이드 데이터가 없습니다.</p>
      </div>
    )
  }

  // JSON 형식인지 텍스트 형식인지 확인
  const isJsonGuide = typeof guide === 'object' && guide.shooting_scenes

  if (!isJsonGuide) {
    // 기존 텍스트 형식 가이드 표시
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              캠페인 가이드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm">{typeof guide === 'string' ? guide : JSON.stringify(guide, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scenes = guide.shooting_scenes || []
  const currentSceneData = scenes[currentScene]

  const handlePrevScene = () => {
    if (currentScene > 0) {
      setCurrentScene(currentScene - 1)
    }
  }

  const handleNextScene = () => {
    if (currentScene < scenes.length - 1) {
      setCurrentScene(currentScene + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더: 캠페인 타이틀 */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-gray-800">숏폼 콘텐츠 크리에이터</span>{' '}
            <span className="text-red-500">촬영 가이드</span>
          </h1>
          <p className="text-lg text-gray-600">
            브랜드 맞춤형 고퀄리티 숏폼 제작을 위한 10씬 가이드라인
          </p>
        </div>

        {/* 브랜드 정보 카드 */}
        <Card className="mb-6 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* 좌측: 기본 정보 */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  기본 브랜드 정보
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">브랜드명</Label>
                    <p className="text-lg font-semibold text-red-500">
                      {guide.brand_info?.brand || '브랜드명'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">제품명</Label>
                    <p className="text-base font-medium">
                      {guide.brand_info?.product || '제품명'}
                    </p>
                  </div>
                  {guide.brand_info?.product_url && (
                    <div>
                      <Label className="text-sm text-gray-600">제품 URL</Label>
                      <a 
                        href={guide.brand_info.product_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {guide.brand_info.product_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 촬영 관련 요구사항 */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-pink-600" />
                  촬영 관련 요구사항
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">영상 제출 마감일</Label>
                    <p className="text-base font-semibold text-red-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {guide.brand_info?.deadline || '협의'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">영상 길이</Label>
                    <p className="text-base">{guide.video_duration || '30-60초'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">타겟 플랫폼</Label>
                    <Badge variant="secondary" className="mt-1">
                      {guide.target_platform || 'Instagram'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 전체 영상 컨셉 */}
            {guide.shooting_concept && (
              <div className="mt-6 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h4 className="font-bold text-gray-800 mb-2">📌 성공적인 콘텐츠 제작을 위해 아래 사항을 반드시 숙지해주세요</h4>
                <p className="text-gray-700 leading-relaxed">{guide.shooting_concept}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 크리에이터 필수 확인 주의사항 */}
        <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              크리에이터 필수 확인 주의사항
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <Calendar className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-800">마감일 업수</p>
                  <p className="text-sm text-gray-600">
                    지정된 영상 제출 마감일을 <span className="font-bold text-red-600">반드시 지켜주세요</span>.
                    지연 시 패널티가 발생할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-800">정확한 제품 정보</p>
                  <p className="text-sm text-gray-600">
                    브랜드에서 제공한 제품 정보를 <span className="font-bold">100% 정확하게</span> 영상에 반영해야 합니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-bold text-gray-800">라벨 마감일은 그 날 사이트 내에서 검수 요청을 해주셔야 하는 마감일을 의미합니다</p>
                  <p className="text-sm text-gray-600">
                    제품 정보를 명확히 확인하고 반영해주세요.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 브랜드 정보 입력 */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600" />
              브랜드 정보 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="basic">기본 브랜드 정보</TabsTrigger>
                <TabsTrigger value="product">제품 상세 정보</TabsTrigger>
                <TabsTrigger value="shooting">촬영 관련 요구사항</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <InfoSection title="브랜드명" content={guide.brand_info?.brand} />
                <InfoSection title="제품명" content={guide.brand_info?.product} />
                {guide.brand_info?.product_url && (
                  <InfoSection 
                    title="제품 URL" 
                    content={
                      <a 
                        href={guide.brand_info.product_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {guide.brand_info.product_url}
                      </a>
                    } 
                  />
                )}
                <InfoSection title="제품 카테고리" content="건기식" />
              </TabsContent>

              <TabsContent value="product" className="space-y-4">
                <InfoSection 
                  title="제품 특징" 
                  content={guide.shooting_concept || "제품의 핵심 특징을 설명합니다."} 
                />
                {guide.shooting_requirements?.must_include && (
                  <div>
                    <Label className="text-sm font-bold text-gray-700 mb-2 block">핵심 어필 포인트</Label>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {guide.shooting_requirements.must_include.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shooting" className="space-y-4">
                <InfoSection 
                  title="필수 촬영 요청 사항" 
                  content={
                    guide.shooting_requirements?.must_include ? (
                      <ul className="list-disc list-inside space-y-1">
                        {guide.shooting_requirements.must_include.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : "촬영 요청 사항이 없습니다."
                  }
                />
                {guide.shooting_requirements?.video_style && (
                  <>
                    <InfoSection 
                      title="영상 템포" 
                      content={guide.shooting_requirements.video_style.tempo} 
                    />
                    <InfoSection 
                      title="영상 톤" 
                      content={guide.shooting_requirements.video_style.tone} 
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 숏폼 가이드 (10개 씬) */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-red-100 to-pink-100">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-red-600" />
                숏폼 가이드
              </span>
              <Badge variant="secondary" className="text-base">
                {currentScene + 1} / {scenes.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* 씬 네비게이션 탭 */}
            <div className="border-b overflow-x-auto">
              <div className="flex min-w-max">
                {scenes.map((scene, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentScene(idx)}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      currentScene === idx
                        ? 'bg-red-500 text-white border-b-2 border-red-600'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    씬 {scene.order}
                  </button>
                ))}
              </div>
            </div>

            {/* 현재 씬 내용 */}
            {currentSceneData && (
              <div className="p-6 md:p-8">
                <div className="mb-6">
                  <Badge className="mb-3 text-base px-4 py-1 bg-red-500">
                    순서 {currentSceneData.order}
                  </Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                    {currentSceneData.scene_type}
                  </h3>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* 촬영장면 */}
                  <div className="md:col-span-1 p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      촬영장면
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {currentSceneData.scene_description}
                    </p>
                  </div>

                  {/* 대사 및 자막 */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <h4 className="font-bold text-yellow-800 mb-2">
                        💬 대사 (자신의 스타일에 맞게 자연스럽게 변형 가능)
                      </h4>
                      <p className="text-gray-800 text-lg leading-relaxed">
                        "{currentSceneData.dialogue}"
                      </p>
                    </div>

                    {currentSceneData.caption && (
                      <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="font-bold text-blue-800 mb-2">
                          📝 자막
                        </h4>
                        <p className="text-gray-800 leading-relaxed">
                          {currentSceneData.caption}
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        촬영 팁
                      </h4>
                      <p className="text-gray-700 leading-relaxed">
                        {currentSceneData.shooting_tip}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 네비게이션 버튼 */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  <Button
                    onClick={handlePrevScene}
                    disabled={currentScene === 0}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전 씬
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentScene + 1} / {scenes.length}
                  </span>
                  <Button
                    onClick={handleNextScene}
                    disabled={currentScene === scenes.length - 1}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
                  >
                    다음 씬
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 요청 해시태그 */}
        {guide.required_hashtags && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-purple-100">
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-6 h-6 text-blue-600" />
                요청 해시태그
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {guide.required_hashtags.brand && (
                  <HashtagSection title="브랜드" tags={guide.required_hashtags.brand} color="red" />
                )}
                {guide.required_hashtags.real && (
                  <HashtagSection title="리얼" tags={guide.required_hashtags.real} color="blue" />
                )}
                {guide.required_hashtags.trend && (
                  <HashtagSection title="공통" tags={guide.required_hashtags.trend} color="purple" />
                )}
              </div>
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">💡 주의:</span> 반드시 변경 가능한 자신의 스타일로 해시태그를 사용하세요.
                  단, 가이드에 배치 호출을 바꾸지 마세요!
                  제품 정보 100% 반영, 마감일 업수 필수!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 메타 파트너십 광고 코드 발급 방법 */}
        {guide.meta_partnership_guide && (
          <Card className="mb-6 shadow-lg border-0 border-l-4 border-l-purple-500">
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center gap-2 text-purple-800">
                <Sparkles className="w-6 h-6" />
                {guide.meta_partnership_guide.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ol className="space-y-3 mb-4">
                {guide.meta_partnership_guide.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 pt-0.5">{step.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
              {guide.meta_partnership_guide.note && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <span className="font-bold">📌 주의:</span> {guide.meta_partnership_guide.note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 크리에이터 팁 */}
        {guide.creator_tips && guide.creator_tips.length > 0 && (
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-100 to-blue-100">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-green-600" />
                크리에이터 팁
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {guide.creator_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 하단 액션 버튼 */}
        <div className="flex justify-center gap-4 mt-8">
          {onClose && (
            <Button variant="outline" onClick={onClose} size="lg">
              닫기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// 보조 컴포넌트들
function Label({ children, className = '' }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{children}</label>
}

function InfoSection({ title, content }) {
  return (
    <div>
      <Label className="mb-2">{title}</Label>
      <div className="p-3 bg-gray-50 rounded-lg text-gray-800">
        {typeof content === 'string' ? content : content}
      </div>
    </div>
  )
}

function HashtagSection({ title, tags, color }) {
  const colorClasses = {
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    green: 'bg-green-100 text-green-800'
  }

  return (
    <div>
      <Label className="mb-2">{title}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <Badge key={idx} className={colorClasses[color] || colorClasses.blue}>
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}
