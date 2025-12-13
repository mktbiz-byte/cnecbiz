import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown, Menu, X, Phone, Mail, Sparkles, BarChart3, Image, Calendar, MapPin, Tag } from 'lucide-react'
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
const VideoCard = ({ video, size = 'normal' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const cardRef = useRef(null)

  const youtubeId = getYouTubeVideoId(video.url || video.youtube_url)
  const thumbnailUrl = video.thumbnail_url || getYouTubeThumbnail(youtubeId)

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

  const sizeClasses = size === 'large' ? 'aspect-[9/16] min-h-[400px]' : 'aspect-[9/16]'

  return (
    <div
      ref={cardRef}
      className={`relative ${sizeClasses} rounded-2xl overflow-hidden bg-gray-900 group shadow-lg`}
    >
      {isVisible && youtubeId ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&playsinline=1&controls=0&showinfo=0&rel=0&modestbranding=1`}
          className="w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
        />
      ) : thumbnailUrl ? (
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
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <Play className="w-12 h-12 text-gray-600" />
        </div>
      )}

      {isVisible && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

// 비디오 카테고리 섹션 컴포넌트
const VideoCategorySection = ({ title, subtitle, videos, bgColor = 'bg-gray-900' }) => {
  if (!videos || videos.length === 0) return null

  return (
    <div className={`py-12 sm:py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm sm:text-base">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {videos.map((video, index) => (
            <VideoCard key={video.id || index} video={video} />
          ))}
        </div>
      </div>
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
    stats_campaigns: '4,562+',
    stats_creators: '21,580+',
    stats_countries: '4개국',
    stats_success: '1억+'
  })

  // 비디오 카테고리 정의 (DB 영상을 분배해서 사용)
  const videoCategories = [
    {
      id: 'before-after',
      title: 'Before & After',
      subtitle: '드라마틱한 사용후기',
    },
    {
      id: '4week-challenge',
      title: '4주 챌린지',
      subtitle: '4주간의 진정성 있는 후기',
    },
    {
      id: 'mood',
      title: '감성 & 무드',
      subtitle: '높은 영상미와 감도 높은 영상',
    },
    {
      id: 'visit',
      title: '방문형',
      subtitle: '올영, 팝업스토어 등 오프라인 방문',
    },
    {
      id: 'promotion',
      title: '프로모션',
      subtitle: '올영 세일, 쿠팡 골드박스 등 기획전 연계',
    },
  ]

  // DB에서 가져온 영상을 카테고리별로 분배
  const getVideosForCategory = (categoryIndex) => {
    if (!videos || videos.length === 0) return []
    const videosPerCategory = 5
    const startIndex = categoryIndex * videosPerCategory
    return videos.slice(startIndex, startIndex + videosPerCategory)
  }

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

  // 고객 성공 스토리 데이터
  const testimonials = [
    {
      name: '김민*',
      role: '뷰티 브랜드 마케팅 팀장',
      company: 'A사 화장품',
      content: '처음으로 인플루언서 마케팅을 진행했는데, CNEC 덕분에 어려움 없이 성공적인 캠페인을 진행할 수 있었습니다. 특히 크리에이터 매칭 시스템이 정말 편리했어요.',
    },
    {
      name: '이*호',
      role: '스타트업 대표',
      company: 'B사 스킨케어',
      content: '수출바우처를 활용해 일본 시장 진출을 준비했는데, 현지 크리에이터 섭외부터 콘텐츠 제작까지 원스톱으로 해결됐습니다. ROI가 기대 이상이었습니다.',
    },
    {
      name: '박서*',
      role: '이커머스 운영자',
      company: 'C사 헬스케어',
      content: '올리브영 세일 기간에 맞춰 집중 캠페인을 진행했는데, 매출이 전월 대비 320% 상승했습니다. 타이밍과 크리에이터 선정이 정말 중요하다는 걸 깨달았어요.',
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header - Dark Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">CNEC</span>
            </div>

            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#showcase" className="text-gray-400 hover:text-white transition-colors text-sm">포트폴리오</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm">요금제</a>
              <a href="#voucher" className="text-gray-400 hover:text-white transition-colors text-sm">수출바우처</a>
              <a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm">FAQ</a>
            </nav>

            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-5 py-2.5 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-gray-100 transition-all"
                >
                  대시보드
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-2.5 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-gray-100 transition-all"
                  >
                    회원 가입
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="sm:hidden py-4 border-t border-gray-800">
              <nav className="flex flex-col space-y-3">
                <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">포트폴리오</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">요금제</a>
                <a href="#voucher" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">수출바우처</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">FAQ</a>
              </nav>
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-800">
                {user ? (
                  <button
                    onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}
                    className="w-full py-3 bg-white text-gray-900 rounded-full font-medium"
                  >
                    대시보드
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                      className="w-full py-3 text-white border border-gray-700 rounded-full"
                    >
                      로그인
                    </button>
                    <button
                      onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                      className="w-full py-3 bg-white text-gray-900 rounded-full font-medium"
                    >
                      회원 가입
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Compact Hero Section */}
      <section className="relative pt-24 sm:pt-28 pb-8 sm:pb-12 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="text-white">뷰티 숏폼은 </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">역시 크넥</span>
            </h1>
            <p className="text-gray-400 text-base sm:text-lg mb-6">
              AI 데이터 기반 크리에이터 추천 | 평균 제작기간 7일 | 2차 활용 무료
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-6 py-3 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                캠페인 생성하기
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://pf.kakao.com/_xgNdxlG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 border border-gray-700 text-white rounded-full font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                카카오톡 상담
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Video Portfolio Sections - 카테고리별 (DB 영상 사용) */}
      <section id="showcase">
        {videoCategories.map((category, index) => (
          <VideoCategorySection
            key={category.id}
            title={category.title}
            subtitle={category.subtitle}
            videos={getVideosForCategory(index)}
            bgColor={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}
          />
        ))}
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{pageContent.stats_campaigns}</div>
              <div className="text-gray-400 text-sm">완료된 캠페인</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{pageContent.stats_creators}</div>
              <div className="text-gray-400 text-sm">파트너 크리에이터</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{pageContent.stats_countries}</div>
              <div className="text-gray-400 text-sm">진출 국가</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{pageContent.stats_success}</div>
              <div className="text-gray-400 text-sm">누적 조회수</div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Brands Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
              함께 하는 <span className="text-blue-600">브랜드</span>
            </h2>
            <p className="text-gray-600 text-lg">다양한 브랜드들이 CNEC과 함께 성장하고 있습니다</p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm">
            <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-4 sm:gap-6">
              {[
                'MEDIHEAL', 'SKINFOOD', 'REJURAN', 'Dr.G', 'CLIO',
                '동아제약', 'SNP', 'ESTHER', 'lemiu', 'TONYMOLY',
                'FATION', 'VELY VELY', 'kalo kul', 'LALA ROSE DAY', 'laundryou',
                'COSON', 'Minted', 'OSANG', 'KINTEX', '롯데홈쇼핑',
                'Nightingale', 'Dr.Bio', 'lala Chuu', 'samyang', 'Merry monde',
                'MBC', 'Morebella', '비니비니', '바이로담', 'Bubble Monkey',
                'BENTON', '씨앤씨인터내셔날', 'briel', 'SEDNA', 'SAI8',
                'celire', 'CELLRETURN', 'Cell:Monde', 'SELF BEAUTY', '세종대연합동문'
              ].map((brand, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center h-12 sm:h-16 px-2 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <span className="text-xs sm:text-sm text-gray-600 font-medium text-center truncate">{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">가장 합리적인 캠페인을 선택하세요</h2>
            <p className="text-gray-400 text-lg">복잡한 옵션은 빼고, 꼭 필요한 기능만 담았습니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* 올영세일 패키지 - 왼쪽 */}
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 hover:border-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-2">올영세일 패키지</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">₩400,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">세일 기간 집중 트래픽과 구매 전환을 유도하는 실속형 패키지</p>
              <button
                onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
                className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  티징 + 본편 (총 영상 2개 제작)
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  구매 전환 유도형 기획
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 3개
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  원본 영상 파일 제공
                </li>
              </ul>
            </div>

            {/* 기획형 캠페인 - 가운데 MOST POPULAR */}
            <div className="bg-gray-800 rounded-3xl p-8 border-2 border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-semibold text-white">
                MOST POPULAR
              </div>
              <h3 className="text-lg font-medium text-purple-400 mb-2">기획형 캠페인</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">₩200,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">합리적인 비용으로 전문적인 숏폼 기획을 시작하고 싶은 브랜드</p>
              <button
                onClick={() => window.open('/campaigns/intro/regular', '_blank')}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  브랜드 맞춤 시나리오 기획
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  촬영 가이드라인 제공
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 1개
                </li>
              </ul>
            </div>

            {/* 4주 챌린지 - 오른쪽 */}
            <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 hover:border-gray-600 transition-colors">
              <h3 className="text-lg font-medium text-gray-400 mb-2">4주 챌린지</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">₩600,000</span>
                <span className="text-gray-500">/건</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜</p>
              <button
                onClick={() => window.open('/campaigns/intro/4week', '_blank')}
                className="w-full py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  주차별 미션 (총 4편 제작)
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Before & After 변화 기록
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SNS 업로드 URL 무제한
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  2차 활용 라이선스 포함
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 고객 성공 스토리 섹션 */}
      <section id="testimonials" className="py-16 sm:py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">고객 성공 스토리</h2>
            <p className="text-gray-400 text-lg">CNEC과 함께 성장한 브랜드들의 이야기</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-800 rounded-3xl p-8 border border-gray-700">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 leading-relaxed mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role} | {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voucher Section */}
      <section id="voucher" className="py-16 sm:py-24 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm mb-6">
            <Award className="w-4 h-4" />
            수출바우처 공식 수행기관
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            수출바우처로 최대 <span className="text-yellow-400">80%</span> 지원
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            200만원 패키지 이용 시 실 부담금 40만원부터 시작
          </p>
          <a
            href="https://pf.kakao.com/_xgNdxlG"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            수출바우처 상담받기
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">자주 묻는 질문</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-gray-800 rounded-2xl border border-gray-700">
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <span className="font-medium pr-4 text-white">{faq.question || faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            첫 캠페인 등록 시 전담 매니저가 1:1로 안내해드립니다
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 rounded-full font-semibold text-lg hover:bg-gray-100 transition-all"
            >
              캠페인 생성하기
            </button>
            <a
              href="https://pf.kakao.com/_xgNdxlG"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 border border-gray-700 text-white rounded-full font-medium text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
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
