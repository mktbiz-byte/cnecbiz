import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown, Menu, X, Phone, Mail, Sparkles, BarChart3, Image } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'
import Footer from './Footer'

// YouTube URL에서 Video ID 추출
const getYouTubeVideoId = (url) => {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// YouTube 썸네일 URL 생성 (고화질)
const getYouTubeThumbnail = (videoId) => {
  if (!videoId) return null
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

// 개별 비디오 카드 컴포넌트 (자동재생 지원)
const VideoCard = ({ video }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const cardRef = useRef(null)

  const youtubeId = getYouTubeVideoId(video.url || video.youtube_url)
  const thumbnailUrl = video.thumbnail_url || getYouTubeThumbnail(youtubeId)

  // Intersection Observer로 화면에 보일 때 감지
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.5 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-100 group shadow-lg"
    >
      {isVisible && youtubeId ? (
        // 화면에 보이면 YouTube 임베드 자동재생
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&playsinline=1&controls=0&showinfo=0&rel=0&modestbranding=1`}
          className="w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />
      ) : thumbnailUrl ? (
        // 화면 밖이면 썸네일만 표시 (빠른 로딩)
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            if (e.target.src.includes('maxresdefault')) {
              e.target.src = e.target.src.replace('maxresdefault', 'hqdefault')
            }
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <Play className="w-12 h-12 text-gray-400" />
        </div>
      )}

      {/* 로딩 중 오버레이 */}
      {isVisible && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [faqs, setFaqs] = useState([])
  const [pageContent, setPageContent] = useState({
    hero_title: 'K-뷰티를 세계로,',
    hero_subtitle: '14일 만에 완성하는 숏폼',
    about_text: '일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.\n검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.',
    cta_button_text: '캠페인 시작하기',
    stats_campaigns: '4,562+',
    stats_creators: '21,580+',
    stats_countries: '4개국',
    stats_success: '1억+'
  })

  useEffect(() => {
    fetchVideos()
    checkAuth()
    fetchFaqs()
    fetchPageContent()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabaseBiz.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      const { data: adminData } = await supabaseBiz
        .from('admin_users')
        .select('role')
        .eq('email', session.user.email)
        .maybeSingle()

      if (adminData) {
        setUserRole('admin')
      } else {
        const { data: companyData } = await supabaseBiz
          .from('companies')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (companyData) {
          setUserRole('company')
        } else {
          const { data: creatorData } = await supabaseBiz
            .from('creators')
            .select('id')
            .eq('user_id', session.user.id)
            .single()

          if (creatorData) {
            setUserRole('creator')
          }
        }
      }
    }
  }

  const handleDashboardClick = () => {
    if (userRole === 'admin') {
      navigate('/admin/dashboard')
    } else if (userRole === 'company') {
      navigate('/company/dashboard')
    } else if (userRole === 'creator') {
      navigate('/creator/dashboard')
    }
  }

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('faqs')
        .select('*')
        .order('display_order', { ascending: true })

      if (!error && data && data.length > 0) {
        setFaqs(data)
      } else {
        setFaqs([
          { question: '크리에이터는 어떻게 선발되나요?', answer: '팔로워 수, 콘텐츠 퀄리티, 참여율 등 엄격한 기준으로 선발됩니다. 모든 크리에이터는 실제 영향력을 검증받은 전문가들입니다.' },
          { question: '영상 제작 기간은 얼마나 걸리나요?', answer: '평균 7-14일 내 완성됩니다. 긴급 프로젝트는 별도 협의를 통해 빠른 진행이 가능합니다.' },
          { question: '수정 요청은 몇 번까지 가능한가요?', answer: '기본 2회의 수정 기회가 제공되며, 패키지에 따라 추가 수정이 포함됩니다.' },
          { question: '해외 크리에이터도 섭외 가능한가요?', answer: '네, 일본/미국/대만 현지 크리에이터 네트워크를 보유하고 있어 글로벌 캠페인 진행이 가능합니다.' },
        ])
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error)
    }
  }

  const fetchPageContent = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('page_contents')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setPageContent({
          hero_title: data.hero_title || 'K-뷰티를 세계로,',
          hero_subtitle: data.hero_subtitle || '14일 만에 완성하는 숏폼',
          about_text: data.about_text || '',
          cta_button_text: data.cta_button_text || '캠페인 시작하기',
          stats_campaigns: data.stats_campaigns || '4,562+',
          stats_creators: data.stats_creators || '21,580+',
          stats_countries: data.stats_countries || '4개국',
          stats_success: data.stats_success || '50만+'
        })
      }
    } catch (error) {
      console.error('페이지 콘텐츠 조회 오류:', error)
    }
  }

  const fetchVideos = async () => {
    if (!supabaseBiz) {
      setVideos([
        { id: 1, title: '피부 케어 리뷰', thumbnail_url: '/portfolio_1.webp', video_url: '' },
        { id: 2, title: '메이크업 튜토리얼', thumbnail_url: '/portfolio_2.webp', video_url: '' },
        { id: 3, title: '올리브영 방문', thumbnail_url: '/portfolio_3.webp', video_url: '' },
        { id: 4, title: '스킨케어 루틴', thumbnail_url: '/portfolio_4.webp', video_url: '' },
        { id: 5, title: '헤어 케어', thumbnail_url: '/portfolio_1.webp', video_url: '' },
      ])
      return
    }

    try {
      const { data, error } = await supabaseBiz
        .from('reference_videos')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (!error && data && data.length > 0) {
        setVideos(data)
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
    }
  }

  // 주요 기능 데이터
  const features = [
    {
      icon: Target,
      title: 'AI 기반 크리에이터 매칭',
      description: '브랜드 특성과 타겟 고객을 분석해 최적의 크리에이터를 자동으로 추천합니다.',
      image: '/screenshots/matching.png'
    },
    {
      icon: BarChart3,
      title: '실시간 캠페인 대시보드',
      description: '진행 상황, 성과 지표, 콘텐츠 현황을 한눈에 파악할 수 있습니다.',
      image: '/screenshots/dashboard.png'
    },
    {
      icon: Video,
      title: '자동화된 콘텐츠 관리',
      description: '제작된 콘텐츠의 검수, 피드백, 승인 프로세스를 자동화합니다.',
      image: '/screenshots/content.png'
    },
    {
      icon: Globe,
      title: '글로벌 마켓 진출 지원',
      description: '일본, 미국, 대만 현지 크리에이터 네트워크로 해외 진출을 돕습니다.',
      image: '/screenshots/global.png'
    }
  ]

  // 고객 성공 스토리 데이터
  const testimonials = [
    {
      name: '김민지',
      role: '뷰티 브랜드 마케팅 팀장',
      company: 'A사 화장품',
      content: '처음으로 인플루언서 마케팅을 진행했는데, CNEC 덕분에 어려움 없이 성공적인 캠페인을 진행할 수 있었습니다. 특히 크리에이터 매칭 시스템이 정말 편리했어요.',
      avatar: '/avatars/avatar1.jpg'
    },
    {
      name: '이준호',
      role: '스타트업 대표',
      company: 'B사 스킨케어',
      content: '수출바우처를 활용해 일본 시장 진출을 준비했는데, 현지 크리에이터 섭외부터 콘텐츠 제작까지 원스톱으로 해결됐습니다. ROI가 기대 이상이었습니다.',
      avatar: '/avatars/avatar2.jpg'
    },
    {
      name: '박서현',
      role: '이커머스 운영자',
      company: 'C사 헬스케어',
      content: '올리브영 세일 기간에 맞춰 집중 캠페인을 진행했는데, 매출이 전월 대비 320% 상승했습니다. 타이밍과 크리에이터 선정이 정말 중요하다는 걸 깨달았어요.',
      avatar: '/avatars/avatar3.jpg'
    }
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header - Light Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="text-gray-900">CNEC</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">주요 기능</a>
              <a href="#showcase" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">레퍼런스</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">고객 후기</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">요금제</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">FAQ</a>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all"
                >
                  대시보드
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-all"
                  >
                    무료 시작
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden py-4 border-t border-gray-100">
              <nav className="flex flex-col space-y-3">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">주요 기능</a>
                <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">레퍼런스</a>
                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">고객 후기</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">요금제</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-600 py-2">FAQ</a>
              </nav>
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-100">
                {user ? (
                  <button
                    onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}
                    className="w-full py-3 bg-blue-600 text-white rounded-full font-medium"
                  >
                    대시보드
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                      className="w-full py-3 text-gray-700 border border-gray-200 rounded-full"
                    >
                      로그인
                    </button>
                    <button
                      onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                      className="w-full py-3 bg-blue-600 text-white rounded-full font-medium"
                    >
                      무료 시작
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Text */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full text-blue-700 text-sm mb-6">
              <Award className="w-4 h-4" />
              수출바우처 공식 수행기관
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-gray-900">
              <span className="block">{pageContent.hero_title}</span>
              <span className="block mt-2 text-blue-600">
                {pageContent.hero_subtitle}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              검증된 크리에이터 21,000명+ | 평균 제작기간 7일 | 수정 무제한
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="group w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                무료로 시작하기
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#showcase"
                className="w-full sm:w-auto px-8 py-4 border border-gray-300 text-gray-700 rounded-full font-medium text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                레퍼런스 보기
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{pageContent.stats_campaigns}</div>
              <div className="text-gray-500 text-sm">완료된 캠페인</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{pageContent.stats_creators}</div>
              <div className="text-gray-500 text-sm">파트너 크리에이터</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{pageContent.stats_countries}</div>
              <div className="text-gray-500 text-sm">진출 국가</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{pageContent.stats_success}</div>
              <div className="text-gray-500 text-sm">누적 조회수</div>
            </div>
          </div>
        </div>
      </section>

      {/* 주요 기능 섹션 */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">주요 기능</h2>
            <p className="text-gray-600 text-lg">브랜드 성장을 위한 완벽한 솔루션을 제공합니다</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-3xl p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <feature.icon className="w-7 h-7 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">{feature.description}</p>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Image className="w-12 h-12 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Showcase Section - Dark background for contrast */}
      <section id="showcase" className="py-16 sm:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-white">감성형 릴스</h2>
            <p className="text-gray-400">브랜딩을 해치지 않으면서 감도 높게 제품을 소개</p>
          </div>

          {/* Video Grid - 자동재생 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {videos.slice(0, 5).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {/* Contact Form */}
          <div className="mt-12 sm:mt-16 max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-blue-400" />
                숏폼 제작 문의
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="브랜드명"
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                />
                <input
                  type="tel"
                  placeholder="010-"
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                />
                <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                  문의하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 고객 성공 스토리 섹션 */}
      <section id="testimonials" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">고객 성공 스토리</h2>
            <p className="text-gray-600 text-lg">CNEC과 함께 성장한 브랜드들의 이야기</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-blue-600">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role} | {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">왜 CNEC인가요?</h2>
            <p className="text-gray-600 text-lg">브랜드 성장을 위한 완벽한 솔루션</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-3xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">AI 기반 크리에이터 매칭</h3>
              <p className="text-gray-600 leading-relaxed">
                브랜드 특성과 타겟 고객을 분석해 최적의 크리에이터를 자동으로 추천합니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">7일 내 제작 완료</h3>
              <p className="text-gray-600 leading-relaxed">
                효율적인 프로세스로 고품질 콘텐츠를 빠르게 제작합니다. 급한 일정도 문제없습니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">검증된 퀄리티</h3>
              <p className="text-gray-600 leading-relaxed">
                모든 콘텐츠는 전문가 검수를 거쳐 브랜드 가이드라인에 맞게 제작됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">가장 합리적인 캠페인을 선택하세요</h2>
            <p className="text-gray-600 text-lg">복잡한 옵션은 빼고, 꼭 필요한 기능만 담았습니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-medium text-gray-600 mb-2">기획형 캠페인</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">₩200,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">합리적인 비용으로 전문적인 숏폼 기획을 시작하고 싶은 브랜드</p>
              <button
                onClick={() => window.open('/campaigns/intro/regular', '_blank')}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors mb-6"
              >
                선택하기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  브랜드 맞춤 시나리오 기획
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  촬영 가이드라인 제공
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 1개
                </li>
              </ul>
            </div>

            {/* Popular */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 rounded-full text-xs font-semibold text-white">
                MOST POPULAR
              </div>
              <h3 className="text-lg font-medium text-blue-600 mb-2">올영세일 패키지</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">₩400,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">세일 기간 집중 트래픽과 구매 전환을 유도하는 실속형 패키지</p>
              <button
                onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors mb-6"
              >
                선택하기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  티징 + 본편 (2단계 구성)
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  구매 전환 유도형 기획
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 3개
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  원본 영상 파일 제공
                </li>
              </ul>
            </div>

            {/* Premium */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-medium text-gray-600 mb-2">4주 챌린지</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">₩600,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜</p>
              <button
                onClick={() => window.open('/campaigns/intro/4week', '_blank')}
                className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-medium hover:bg-gray-200 transition-colors mb-6"
              >
                선택하기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  주차별 미션 (총 4편 제작)
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Before & After 변화 기록
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 무제한
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  2차 활용 라이선스 포함
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">간단한 진행 프로세스</h2>
            <p className="text-gray-600 text-lg">복잡한 과정 없이, 빠르게 시작하세요</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: '캠페인 등록', desc: '원하는 캠페인 유형을 선택하고 브랜드 정보를 입력하세요' },
              { step: '02', title: '크리에이터 매칭', desc: 'AI가 최적의 크리에이터를 추천하고 즉시 매칭됩니다' },
              { step: '03', title: '콘텐츠 제작', desc: '가이드에 따라 크리에이터가 고품질 영상을 제작합니다' },
              { step: '04', title: '검수 및 업로드', desc: '전문가 검수 후 최적 시간대에 맞춰 업로드됩니다' },
            ].map((item, index) => (
              <div key={index} className="relative bg-gray-50 rounded-2xl p-6">
                <div className="text-5xl font-bold text-gray-200 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voucher Section */}
      <section className="py-16 sm:py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-white text-sm mb-6">
            <Award className="w-4 h-4" />
            수출바우처 공식 수행기관
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            수출바우처로 최대 <span className="text-yellow-300">80%</span> 지원
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            200만원 패키지 이용 시 실 부담금 40만원부터 시작
          </p>
          <a
            href="https://pf.kakao.com/_xgNdxlG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            수출바우처 상담받기
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">자주 묻는 질문</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-gray-50 rounded-2xl">
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <span className="font-medium pr-4 text-gray-900">{faq.question || faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-gray-900">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            첫 캠페인 등록 시 전담 매니저가 1:1로 안내해드립니다
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
            >
              무료로 시작하기
            </button>
            <a
              href="https://pf.kakao.com/_xgNdxlG"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 border border-gray-300 text-gray-700 rounded-full font-medium text-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              카카오톡 상담
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
