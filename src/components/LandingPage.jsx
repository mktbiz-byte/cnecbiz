import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, ArrowRight, Play, Star, Award, MessageCircle, ChevronDown, Menu, X, Mail, FileText, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBiz } from '../lib/supabaseClients'
import Footer from './Footer'
import HeroSection from './landing/HeroSection'
import SocialProofTicker from './landing/SocialProofTicker'
import PainSolutionSection from './landing/PainSolutionSection'
import PricingCompareSection from './landing/PricingCompareSection'
import ProcessSection from './landing/ProcessSection'
import ResultsSection from './landing/ResultsSection'
import GlobalSection from './landing/GlobalSection'
import ProductTiersSection from './landing/ProductTiersSection'
import FinalCTASection from './landing/FinalCTASection'

// 국기 이미지 컴포넌트
const FlagKR = ({ className = "w-5 h-3.5" }) => (
  <img src="/flags/kr.png" alt="KR" className={className} style={{ objectFit: 'contain' }} />
)

const FlagJP = ({ className = "w-5 h-3.5" }) => (
  <img src="/flags/jp.png" alt="JP" className={className} style={{ objectFit: 'contain' }} />
)

const FlagUS = ({ className = "w-5 h-3.5" }) => (
  <img src="/flags/us.png" alt="US" className={className} style={{ objectFit: 'contain' }} />
)

const FLAGS = {
  korea: FlagKR,
  japan: FlagJP,
  usa: FlagUS,
}

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

// 개별 비디오 카드 컴포넌트 (자동 재생)
const VideoCard = ({ video, size = 'normal', autoPlay = true }) => {
  const [isActive, setIsActive] = useState(autoPlay)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const cardRef = React.useRef(null)

  const youtubeId = getYouTubeVideoId(video.url || video.youtube_url)
  const thumbnailUrl = video.thumbnail_url || getYouTubeThumbnail(youtubeId)

  const sizeClasses = size === 'large' ? 'aspect-[9/16] min-h-[400px]' : 'aspect-[9/16]'

  // Intersection Observer로 뷰포트에 들어올 때만 재생
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.3 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const shouldPlay = autoPlay ? isInView : isActive

  return (
    <div
      ref={cardRef}
      className={`relative ${sizeClasses} rounded-2xl overflow-hidden bg-[#121218] shadow-lg cursor-pointer`}
      onMouseEnter={() => !autoPlay && setIsActive(true)}
      onMouseLeave={() => !autoPlay && setIsActive(false)}
      onClick={() => setIsActive(true)}
    >
      {/* 썸네일 */}
      <img
        src={thumbnailUrl || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
        alt={video.title || '영상'}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${shouldPlay && isLoaded ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        onError={(e) => {
          if (e.target.src.includes('maxresdefault')) {
            e.target.src = e.target.src.replace('maxresdefault', 'hqdefault')
          }
        }}
      />

      {/* YouTube iframe (뷰포트에 들어오면 자동 재생) */}
      {shouldPlay && youtubeId && (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&playsinline=1&controls=0&rel=0&modestbranding=1&showinfo=0`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          onLoad={() => setIsLoaded(true)}
        />
      )}

      {/* 로딩 스피너 */}
      {shouldPlay && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 재생 버튼 (자동재생 아닐 때만 표시) */}
      {!autoPlay && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
        </div>
      )}
    </div>
  )
}

// 포트폴리오 자동 재생 비디오 카드 (Intersection Observer 기반)
const PortfolioVideoCard = ({ short }) => {
  const cardRef = useRef(null)
  const [isInView, setIsInView] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.5 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#121218] group"
    >
      {/* 썸네일 (iframe 로드 전 또는 뷰포트 밖일 때) */}
      <img
        src={short.thumbnail}
        alt={short.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isInView && iframeLoaded ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
      />
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-500 ${isInView && iframeLoaded ? 'opacity-0' : 'opacity-100'}`} />

      {/* YouTube iframe 자동 재생 (뷰포트 진입 시) */}
      {isInView && (
        <iframe
          src={`https://www.youtube.com/embed/${short.video_id}?autoplay=1&mute=1&loop=1&playlist=${short.video_id}&playsinline=1&controls=0&rel=0&modestbranding=1&showinfo=0`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          allow="autoplay; encrypted-media"
          onLoad={() => setIframeLoaded(true)}
        />
      )}

      {/* 로딩 스피너 */}
      {isInView && !iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 재생 아이콘 (iframe 로드 전) */}
      {!iframeLoaded && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
    </div>
  )
}

// 포트폴리오 슬라이더 (자동 롤링 + 수동 네비게이션)
const PortfolioSlider = ({ shorts, page, setPage, totalPages, totalPagesMobile, visibleDesktop, visibleMobile, selectedRegion }) => {
  const [isMobile, setIsMobile] = useState(false)
  const autoPlayRef = useRef(null)
  const sliderRef = useRef(null)

  // 반응형 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const currentVisible = isMobile ? visibleMobile : visibleDesktop
  const currentTotalPages = isMobile ? totalPagesMobile : totalPages

  // 자동 슬라이드 (5초 간격)
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setPage(prev => (prev + 1) % currentTotalPages)
    }, 5000)

    return () => clearInterval(autoPlayRef.current)
  }, [currentTotalPages, selectedRegion])

  // 리전 변경 시 페이지 리셋
  useEffect(() => {
    setPage(0)
  }, [selectedRegion])

  // 마우스 호버 시 자동 슬라이드 일시정지
  const pauseAutoPlay = () => clearInterval(autoPlayRef.current)
  const resumeAutoPlay = () => {
    autoPlayRef.current = setInterval(() => {
      setPage(prev => (prev + 1) % currentTotalPages)
    }, 5000)
  }

  const startIdx = page * currentVisible
  const visibleShorts = shorts.slice(startIdx, startIdx + currentVisible)

  return (
    <div
      ref={sliderRef}
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedRegion}-${page}`}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {visibleShorts.map(short => (
            <PortfolioVideoCard key={short.video_id} short={short} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* 모바일용 dot indicators */}
      {isMobile && shorts.length > visibleMobile && (
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: currentTotalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                page === i ? 'w-6 bg-white' : 'w-1.5 bg-[#24243A]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 비디오 카테고리 섹션 컴포넌트
const VideoCategorySection = ({ title, subtitle, videos, bgColor = 'bg-[#121218]' }) => {
  if (!videos || videos.length === 0) return null

  return (
    <div className={`py-8 sm:py-12 lg:py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">{title}</h3>
          <p className="text-[#A0A0B0] text-xs sm:text-sm lg:text-base">{subtitle}</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
          {videos.map((video, index) => (
            <div key={video.id || index} className="flex-shrink-0 w-[40%] snap-center sm:w-auto">
              <VideoCard video={video} />
            </div>
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
  const [featuredNewsletters, setFeaturedNewsletters] = useState([])
  const [portfolioShorts, setPortfolioShorts] = useState({ korea: [], japan: [], usa: [] })
  const [selectedRegion, setSelectedRegion] = useState('korea')
  const [portfolioPage, setPortfolioPage] = useState(0)
  const [brochureUrl, setBrochureUrl] = useState('')

  // 비디오 카테고리 정의 (DB 영상을 분배해서 사용) - 3개 카테고리 x 5개 = 15개
  const videoCategories = [
    {
      id: 'before-after',
      title: 'Before & After',
      subtitle: '드라마틱한 사용 후기',
    },
    {
      id: '4week-challenge',
      title: '4주 챌린지',
      subtitle: '4주간의 진정성 있는 후기',
    },
    {
      id: 'visit',
      title: '방문형',
      subtitle: '올영, 팝업스토어 등 오프라인 방문',
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
    fetchFeaturedNewsletters()
    fetchPortfolioShorts()
    loadBrochureUrl()
  }, [])

  // 추천 뉴스레터 또는 최신 뉴스레터 가져오기
  const fetchFeaturedNewsletters = async () => {
    try {
      // 먼저 추천(is_featured) 뉴스레터 확인
      const { data: featured, error: featuredError } = await supabaseBiz
        .from('newsletters')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .limit(4)

      if (!featuredError && featured && featured.length > 0) {
        setFeaturedNewsletters(featured)
      } else {
        // 추천이 없으면 최신 4개
        const { data: recent, error: recentError } = await supabaseBiz
          .from('newsletters')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(4)

        if (!recentError && recent) {
          setFeaturedNewsletters(recent)
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('뉴스레터 조회 오류:', error)
    }
  }

  const fetchPortfolioShorts = async () => {
    try {
      const res = await fetch('/.netlify/functions/fetch-portfolio-shorts')
      const result = await res.json()
      if (result.success && result.data) {
        setPortfolioShorts(result.data)
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('포트폴리오 숏폼 조회 오류:', error)
    }
  }

  const loadBrochureUrl = async () => {
    try {
      const { data: files } = await supabaseBiz
        .storage
        .from('campaign-guides')
        .list('', { search: 'cnec_brochure' })

      if (files?.find(f => f.name === 'cnec_brochure.pdf')) {
        const { data: { publicUrl } } = supabaseBiz
          .storage
          .from('campaign-guides')
          .getPublicUrl('cnec_brochure.pdf')
        setBrochureUrl(publicUrl)
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('브로슈어 URL 로드 오류:', error)
    }
  }

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
          { question: '크리에이터는 어떻게 선발되나요?', answer: '팔로워 수, 콘텐츠 품질, 참여율 등을 기준으로 선발합니다. AI가 자동으로 최적의 크리에이터를 매칭합니다.' },
          { question: '영상 제작 기간은 얼마나 걸리나요?', answer: '평균 7-14일 내 완성됩니다. 긴급 프로젝트는 별도 협의를 통해 빠른 진행이 가능합니다.' },
          { question: '수정 요청은 몇 번까지 가능한가요?', answer: '기본 1회 수정이 포함되어 있습니다. 가이드 범위 내 수정은 무료이며, 기획 자체를 변경하는 경우 별도 상담이 필요합니다.' },
          { question: '해외 크리에이터도 섭외 가능한가요?', answer: '네, 일본/미국/대만 현지 크리에이터 네트워크를 보유하고 있어 글로벌 캠페인 진행이 가능합니다.' },
        ])
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching FAQs:', error)
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
      if (import.meta.env.DEV) console.error('Error fetching videos:', error)
    }
  }

  // 고객 성공 스토리 데이터
  const testimonials = [
    {
      name: '김 팀장',
      role: '마케팅 팀장',
      company: 'MEDIHEAL',
      content: '크리에이터 매칭부터 SNS 업로드까지 한 번에 해결. 대시보드에서 진행 상황을 실시간 확인할 수 있어 편했습니다.',
    },
    {
      name: '이 대표',
      role: '대표이사',
      company: 'B사 스킨케어',
      content: '수출바우처로 일본 시장 진출을 준비했는데, 현지 크리에이터 섭외부터 콘텐츠 제작까지 크넥 하나로 해결. ROI가 기대 이상이었습니다.',
    },
    {
      name: '박 매니저',
      role: '이커머스 매니저',
      company: 'C사 헬스케어',
      content: '올리브영 세일 기간 집중 캠페인으로 매출 전월 대비 320% 상승. 20만원부터 시작할 수 있어서 부담 없이 테스트했는데 결과가 좋았습니다.',
    }
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header - Dark Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-12">
              <span className="text-2xl sm:text-3xl font-bold tracking-tighter text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>CNEC</span>
              <nav className="hidden lg:flex items-center gap-8">
                <a href="#showcase" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">포트폴리오</a>
                <a href="#pricing" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">요금제</a>
                <a href="#voucher" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">수출바우처</a>
                <button onClick={() => navigate('/newsletters')} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">인사이트</button>
                <a href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">FAQ</a>
              </nav>
            </div>

            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-6 py-2.5 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all"
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
                    className="px-6 py-2.5 border border-white/20 text-white rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all"
                  >
                    무료로 시작하기
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
            <div className="sm:hidden py-4 border-t border-white/5">
              <nav className="flex flex-col space-y-3">
                <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">포트폴리오</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">요금제</a>
                <a href="#voucher" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">수출바우처</a>
                <button onClick={() => { navigate('/newsletters'); setMobileMenuOpen(false); }} className="text-gray-400 py-2 text-left">인사이트</button>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-gray-400 py-2">FAQ</a>
              </nav>
              <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-white/5">
                {user ? (
                  <button
                    onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}
                    className="w-full py-3 border border-white/20 text-white rounded-full font-medium"
                  >
                    대시보드
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                      className="w-full py-3 text-white border border-white/10 rounded-full"
                    >
                      로그인
                    </button>
                    <button
                      onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                      className="w-full py-3 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold hover:brightness-110 transition-all"
                    >
                      무료로 시작하기
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <HeroSection user={user} navigate={navigate} brochureUrl={brochureUrl} />
      <SocialProofTicker />


      <PainSolutionSection navigate={navigate} />
      <PricingCompareSection user={user} navigate={navigate} />
      <ProcessSection user={user} navigate={navigate} />

      <ResultsSection
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        portfolioShorts={portfolioShorts}
        portfolioPage={portfolioPage}
        setPortfolioPage={setPortfolioPage}
        FLAGS={FLAGS}
        PortfolioSlider={PortfolioSlider}
      />

      {/* Video Portfolio Sections - 카테고리별 (DB 영상 사용) */}
      <section>
        {videoCategories.map((category, index) => (
          <VideoCategorySection
            key={category.id}
            title={category.title}
            subtitle={category.subtitle}
            videos={getVideosForCategory(index)}
            bgColor={index % 2 === 0 ? 'bg-[#121218]' : 'bg-[#0A0A0F]'}
          />
        ))}
      </section>

      <GlobalSection navigate={navigate} />
      <ProductTiersSection user={user} navigate={navigate} />

      {/* [섹션 9] Partner Brands */}
      <section className="py-10 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
              <span className="text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>520+</span> 브랜드가 선택한 플랫폼
            </h2>
            <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg">클리오, 동아제약, 스킨푸드 등 다양한 브랜드가 직접 캠페인을 운영하고 있습니다.</p>
          </div>

          <div className="bg-[#121218] rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 lg:p-12 border border-white/[0.06]">
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4 lg:gap-6">
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
                  className={`flex items-center justify-center h-10 sm:h-14 lg:h-16 px-1 sm:px-2 border border-white/[0.06] rounded-md sm:rounded-lg hover:border-white/15 transition-colors ${index >= 21 ? 'hidden sm:flex' : ''}`}
                >
                  <span className="text-[10px] sm:text-xs lg:text-sm text-[#A0A0B0] font-medium text-center truncate">{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* [섹션 10] Testimonials */}
      <section id="testimonials" className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              SOCIAL PROOF
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
              브랜드 담당자들의 <span className="text-[#C084FC]">실제 후기</span>
            </h2>
          </div>

          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-[#121218] rounded-[20px] p-5 sm:p-6 lg:p-8 border border-white/[0.06] snap-center min-w-[280px] sm:min-w-0 flex-shrink-0 md:flex-shrink">
                <div className="flex items-center gap-1 mb-3 sm:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-[#C084FC] fill-current" />
                  ))}
                </div>
                <p className="text-[#A0A0B0] text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#24243A] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-base sm:text-lg font-semibold text-[#C084FC]">{testimonial.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-[#5A5A6E]">{testimonial.role} | {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* [섹션 11] Voucher */}
      <section id="voucher" className="py-12 sm:py-16 lg:py-24 bg-[#121218]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-[rgba(192,132,252,0.3)] bg-[rgba(192,132,252,0.05)] rounded-full text-white text-xs sm:text-sm mb-4 sm:mb-6">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC]" />
            수출바우처 공식 수행기관
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
            수출바우처로 최대 <span className="text-[#C084FC]" style={{ fontFamily: "'Outfit', sans-serif" }}>80%</span> 지원
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg mb-6 sm:mb-8">
            200만원 패키지 이용 시 실제 부담금 40만원부터
          </p>
          <a
            href="https://pf.kakao.com/_xgNdxlG"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-white/20 text-white rounded-full font-semibold text-sm sm:text-base hover:border-white/40 transition-colors"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            수출바우처 상담받기
          </a>
        </div>
      </section>

      {/* [섹션 12] FAQ */}
      <section id="faq" className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">자주 묻는 질문</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-[#121218] rounded-xl sm:rounded-2xl border border-white/[0.06]">
                <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-6 min-h-[48px]">
                  <span className="font-medium pr-3 sm:pr-4 text-white text-sm sm:text-base">{faq.question || faq.q}</span>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#5A5A6E] group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-[#A0A0B0] text-sm sm:text-base leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>

          {/* 카카오톡 + 시작하기 듀얼 CTA */}
          <div className="mt-8 sm:mt-10 text-center">
            <p className="text-[#A0A0B0] text-sm mb-3">더 궁금한 점이 있으신가요?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate(user ? '/company/campaigns/new' : '/signup')}
                className="w-full sm:w-auto px-6 py-3 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
              >
                무료로 캠페인 시작하기
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://pf.kakao.com/_xgNdxlG"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-white rounded-full font-medium text-sm hover:border-white/40 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                카카오톡 상담
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* [섹션 13] Featured Newsletters */}
      {featuredNewsletters.length > 0 && (
        <section className="py-10 sm:py-16 lg:py-20 bg-[#121218]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-white">
                최신 <span className="text-[#C084FC]">뉴스레터</span>
              </h2>
              <p className="text-[#A0A0B0] text-sm sm:text-base">인플루언서 마케팅 트렌드와 인사이트를 확인하세요</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {featuredNewsletters.map((newsletter) => (
                <div
                  key={newsletter.id}
                  onClick={() => navigate(`/newsletter/${newsletter.id}`)}
                  className="bg-[#1A1A24] rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group border border-white/[0.06]"
                >
                  <div className="h-28 sm:h-36 lg:h-40 bg-[#24243A] relative overflow-hidden">
                    {newsletter.thumbnail_url ? (
                      <img
                        src={newsletter.thumbnail_url}
                        alt={newsletter.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Mail className="w-8 h-8 sm:w-12 sm:h-12 text-white/30" />
                      </div>
                    )}
                    {newsletter.is_featured && (
                      <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#C084FC] text-[#0A0A0F] text-[10px] sm:text-xs font-medium rounded-full flex items-center gap-0.5 sm:gap-1">
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> 추천
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-bold text-white text-xs sm:text-sm lg:text-base mb-1 sm:mb-2 line-clamp-2 group-hover:text-[#C084FC] transition-colors">
                      {newsletter.title}
                    </h3>
                    {newsletter.description && (
                      <p className="text-[#5A5A6E] text-[11px] sm:text-sm line-clamp-2 mb-2 sm:mb-3 hidden sm:block">
                        {newsletter.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#5A5A6E]">
                      {newsletter.published_at && (
                        <span>{new Date(newsletter.published_at).toLocaleDateString('ko-KR')}</span>
                      )}
                      <span className="text-[#C084FC] font-medium group-hover:underline">읽기 →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-6 sm:mt-8">
              <button
                onClick={() => navigate('/newsletters')}
                className="w-full sm:w-auto px-6 py-3 border border-white/20 text-white rounded-full font-medium text-sm sm:text-base hover:border-white/40 transition-colors inline-flex items-center justify-center gap-2"
              >
                모든 뉴스레터 보기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* [섹션 14] 크넥 소개서 다운로드 */}
      <section className="py-10 sm:py-14 lg:py-16 bg-[#0A0A0F]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(192,132,252,0.1)] rounded-full text-[#C084FC] text-xs font-medium mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <FileText className="w-3.5 h-3.5" />
            Company Brochure
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3">
            크넥이 처음이신가요?
          </h3>
          <p className="text-[#A0A0B0] text-sm sm:text-base mb-5 sm:mb-6 max-w-lg mx-auto">
            소개서 한 장이면 크넥 서비스가 한눈에 보입니다.<br className="hidden sm:inline" />
            프로세스, 성과 사례, 가격 안내까지.
          </p>
          <a
            href={brochureUrl || "https://docs.google.com/presentation/d/1PFEJi0gWZCWn9g9Vcx0bScZGf3W53_4n/export/pdf"}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-[#C084FC] hover:brightness-110 text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base transition-all"
          >
            <Download className="w-4 h-4" />
            CNEC 소개서 다운로드
          </a>
        </div>
      </section>


      <FinalCTASection user={user} navigate={navigate} />

      {/* Footer */}
      <div className={!user ? 'pb-16 sm:pb-0' : ''}>
        <Footer />
      </div>

      {/* Sticky Bottom CTA Button */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/95 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3.5 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[rgba(192,132,252,0.3)]"
            >
              무료로 캠페인 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
