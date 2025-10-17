import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Globe, TrendingUp, BarChart3, Users, CheckCircle, Play } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'

export default function LandingPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)

  useEffect(() => {
    fetchVideos()
  }, [])

  useEffect(() => {
    if (videos.length > 0) {
      const interval = setInterval(() => {
        setCurrentVideoIndex((prev) => (prev + 1) % videos.length)
      }, 5000) // 5초마다 변경
      return () => clearInterval(interval)
    }
  }, [videos])

  const fetchVideos = async () => {
    if (!supabaseBiz) {
      // 더미 데이터
      setVideos([
        { id: 1, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: '성공 사례 1' },
        { id: 2, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: '성공 사례 2' },
      ])
      return
    }

    try {
      const { data, error } = await supabaseBiz
        .from('reference_videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (!error && data) {
        setVideos(data)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  const getYouTubeThumbnail = (url) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1]
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CNEC BIZ
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              로그인
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-gradient-to-r from-blue-600 to-purple-600">
              시작하기
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            글로벌 인플루언서 마케팅
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              역시 CNEC
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            일본, 미국, 대만 등 전 세계 인플루언서 마케팅을
            <br />
            한 곳에서 간편하게 관리하세요
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')} className="bg-gradient-to-r from-blue-600 to-purple-600 text-lg px-8 py-6">
              무료로 시작하기
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              소개서 보기
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1,000+</div>
              <div className="text-gray-600">성공한 캠페인</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
              <div className="text-gray-600">파트너 기업</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">7개국</div>
              <div className="text-gray-600">글로벌 네트워크</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">98%</div>
              <div className="text-gray-600">고객 만족도</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            CNEC만의 <span className="text-blue-600">특별함</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">다중 지역 관리</h3>
                <p className="text-gray-600 leading-relaxed">
                  일본, 미국, 대만 등 여러 국가의 캠페인을 한 번에 생성하고 관리할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">AI 가이드 생성</h3>
                <p className="text-gray-600 leading-relaxed">
                  Gemini AI가 크리에이터 분석부터 촬영 가이드까지 자동으로 생성해드립니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <BarChart3 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">통합 보고서</h3>
                <p className="text-gray-600 leading-relaxed">
                  모든 지역의 성과를 한눈에 확인하고, 데이터 기반 의사결정을 내리세요.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Video Reference Section */}
      {videos.length > 0 && (
        <section className="py-20 bg-gray-50 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-16">
              성공 <span className="text-blue-600">레퍼런스</span>
            </h2>
            <div className="relative aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
              {videos[currentVideoIndex] && getYouTubeThumbnail(videos[currentVideoIndex].url) && (
                <img
                  src={getYouTubeThumbnail(videos[currentVideoIndex].url)}
                  alt={videos[currentVideoIndex].title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                  <Play className="w-10 h-10 text-blue-600 ml-1" />
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {videos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentVideoIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentVideoIndex ? 'bg-blue-600 w-8' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Packages Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            합리적인 <span className="text-blue-600">가격</span>
          </h2>
          <p className="text-center text-gray-600 mb-16">
            최소 20만원부터 시작하는 글로벌 인플루언서 마케팅
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { name: '기본형', price: '20만원', features: ['일반 퀄리티', '기본 보고서'] },
              { name: '스탠다드', price: '30만원', features: ['향상된 퀄리티', '영상 수정 1회', '상세 보고서'], popular: true },
              { name: '프리미엄', price: '40만원', features: ['최고 퀄리티', '영상 수정 1회', '전담 매니저'] },
              { name: '4주 연속', price: '60만원', features: ['매주 1건씩 4주', '프리미엄 퀄리티', '주간 리포트'] },
            ].map((pkg) => (
              <Card
                key={pkg.name}
                className={`relative ${
                  pkg.popular ? 'border-2 border-blue-600 shadow-xl' : 'border-gray-200'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    인기
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-6">{pkg.price}</div>
                  <ul className="space-y-3">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-6 ${
                      pkg.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                    onClick={() => navigate('/signup')}
                  >
                    시작하기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            전 세계 인플루언서 마케팅, CNEC BIZ와 함께라면 쉽습니다
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-12 py-6"
            onClick={() => navigate('/signup')}
          >
            무료로 시작하기
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-6 h-6" />
                <span className="text-xl font-bold">CNEC BIZ</span>
              </div>
              <p className="text-gray-400 text-sm">
                글로벌 인플루언서 마케팅 통합 관리 플랫폼
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">서비스</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>캠페인 관리</li>
                <li>AI 가이드 생성</li>
                <li>통합 보고서</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">지역</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>🇯🇵 일본</li>
                <li>🇺🇸 미국</li>
                <li>🇹🇼 대만</li>
                <li>🇰🇷 한국 (별도 문의)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">고객 지원</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>help@cnecbiz.com</li>
                <li>FAQ</li>
                <li>문의하기</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            © 2025 CNEC BIZ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

