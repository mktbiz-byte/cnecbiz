import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown, Menu, X, Phone, Mail, Sparkles, BarChart3, Image, Calendar, MapPin, Tag, ExternalLink, ChevronLeft, ChevronRight, FileText, Download, Search, AlertTriangle, DollarSign, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBiz } from '../lib/supabaseClients'
import Footer from './Footer'

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
      className={`relative ${sizeClasses} rounded-2xl overflow-hidden bg-gray-900 shadow-lg cursor-pointer`}
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
      className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 group"
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
                page === i ? 'w-6 bg-white' : 'w-1.5 bg-gray-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 비디오 카테고리 섹션 컴포넌트
const VideoCategorySection = ({ title, subtitle, videos, bgColor = 'bg-gray-900' }) => {
  if (!videos || videos.length === 0) return null

  return (
    <div className={`py-8 sm:py-12 lg:py-16 ${bgColor}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4 sm:mb-6 lg:mb-8">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">{title}</h3>
          <p className="text-gray-400 text-xs sm:text-sm lg:text-base">{subtitle}</p>
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
  const [pageContent, setPageContent] = useState({
    hero_title: 'K-뷰티를 세계로,',
    hero_subtitle: '14일 만에 완성하는 숏폼',
    stats_campaigns: '4,562+',
    stats_creators: '21,580+',
    stats_countries: '4개국',
    stats_success: '5억회'
  })
  const [brochureUrl, setBrochureUrl] = useState('')

  // 비디오 카테고리 정의 (DB 영상을 분배해서 사용) - 3개 카테고리 x 5개 = 15개
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
    fetchPageContent()
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
      console.error('뉴스레터 조회 오류:', error)
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
      console.error('포트폴리오 숏폼 조회 오류:', error)
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
      console.error('브로슈어 URL 로드 오류:', error)
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
          stats_success: data.stats_success || '5억회'
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
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header - Dark Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>CNEC</span>
            </div>

            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#showcase" className="text-[#A0A0B0] hover:text-white transition-colors text-sm">포트폴리오</a>
              <a href="#pricing" className="text-[#A0A0B0] hover:text-white transition-colors text-sm">요금제</a>
              <a href="#voucher" className="text-[#A0A0B0] hover:text-white transition-colors text-sm">수출바우처</a>
              <button onClick={() => navigate('/newsletters')} className="text-[#A0A0B0] hover:text-white transition-colors text-sm">뉴스레터</button>
              <a href="#faq" className="text-[#A0A0B0] hover:text-white transition-colors text-sm">FAQ</a>
            </nav>

            <div className="hidden sm:flex items-center space-x-3">
              {user ? (
                <button
                  onClick={handleDashboardClick}
                  className="px-5 py-2.5 border border-white/20 text-white rounded-full text-sm font-medium hover:border-white/40 transition-all"
                >
                  대시보드
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 text-[#A0A0B0] hover:text-white transition-colors text-sm"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="px-5 py-2.5 border border-white/20 text-white rounded-full text-sm font-medium hover:border-white/40 transition-all"
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
            <div className="sm:hidden py-4 border-t border-white/5">
              <nav className="flex flex-col space-y-3">
                <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="text-[#A0A0B0] py-2">포트폴리오</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-[#A0A0B0] py-2">요금제</a>
                <a href="#voucher" onClick={() => setMobileMenuOpen(false)} className="text-[#A0A0B0] py-2">수출바우처</a>
                <button onClick={() => { navigate('/newsletters'); setMobileMenuOpen(false); }} className="text-[#A0A0B0] py-2 text-left">뉴스레터</button>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="text-[#A0A0B0] py-2">FAQ</a>
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
                      className="w-full py-3 border border-white/20 text-white rounded-full font-medium"
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

      {/* [섹션 1] Hero - 공감형 메인 카피 */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 bg-[#0A0A0F] overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-[rgba(192,132,252,0.06)] rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-[rgba(192,132,252,0.04)] rounded-full blur-[120px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-4 sm:mb-6"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              THE EASIEST SHORT-FORM PLATFORM
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-5 leading-tight sm:leading-tight lg:leading-tight"
            >
              <span className="text-white">숏폼 마케팅,</span><br />
              <span className="text-white">어디서부터 해야 할지 </span>
              <span className="text-[#C084FC]">막막하셨죠?</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4 sm:mb-5"
            >
              제품만 보내주세요. 나머지는 크넥이 다 합니다.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              크리에이터 매칭, 기획, 촬영, 편집까지.<br />
              K-뷰티 글로벌 숏폼 플랫폼, 크넥.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <button
                onClick={() => navigate(user ? '/company/campaigns' : '/signup')}
                className="w-full sm:w-auto px-8 py-4 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {user ? '캠페인 현황보기' : '지금 시작하기'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* [섹션 2] Trust Bar - 실적 수치 */}
      <section className="py-10 sm:py-14 bg-[#121218] border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { num: '500+', label: '협업 브랜드' },
              { num: '3,000+', label: '캠페인 진행' },
              { num: '1,000+', label: '미국 캠페인 돌파' },
              { num: '14일', label: '평균 완성 기간' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#C084FC] mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {item.num}
                </p>
                <p className="text-[#A0A0B0] text-xs sm:text-sm">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* [섹션 3] Problem - 페인포인트 자극 */}
      <section className="py-16 sm:py-20 lg:py-28 bg-[#0A0A0F]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              PAIN POINTS
            </p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
              "숏폼 해야 하는 건 아는데..."<br />
              <span className="text-[#A0A0B0] text-lg sm:text-2xl lg:text-3xl font-medium">지금 이런 고민 때문에 시작을 미루고 계신가요?</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {[
              {
                icon: Search,
                title: '크리에이터 섭외',
                desc: '"우리 제품에 딱 맞는 크리에이터, 대체 어디서 어떻게 찾지?"',
                color: '#C084FC'
              },
              {
                icon: AlertTriangle,
                title: '퀄리티 불안',
                desc: '"예산 썼는데 영상 퀄리티가 안 좋아서 돈만 날리면 어떡하지?"',
                color: '#C084FC'
              },
              {
                icon: Globe,
                title: '글로벌 마케팅',
                desc: '"미국이나 일본 틱톡에도 올리고 싶은데, 현지인은 어떻게 구하지?"',
                color: '#C084FC'
              },
              {
                icon: DollarSign,
                title: '한정된 예산',
                desc: '"마케팅 예산이 넉넉하지 않은데, 숏폼 제작이 가능할까?"',
                color: '#C084FC'
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#121218] rounded-[20px] p-6 sm:p-7 border border-white/[0.06] hover:border-white/15 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-[rgba(192,132,252,0.1)] border border-[rgba(192,132,252,0.15)] flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-[#C084FC]" />
                </div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">{item.title}</h3>
                <p className="text-[#A0A0B0] text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* [섹션 4] Solution - 크넥의 해결책 */}
      <section className="py-16 sm:py-20 lg:py-28 bg-[#121218]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              OUR SOLUTION
            </p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              복잡한 과정은 모두 지웠습니다.
            </h2>
            <p className="text-[#A0A0B0] text-sm sm:text-lg">
              오직 <span className="text-white font-semibold">'제품'</span>에만 집중하세요.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {[
              {
                num: '01',
                title: 'AI CleanScore 크리에이터 검증',
                subtitle: '섭외 & 퀄리티 해결',
                desc: 'AI가 크리에이터의 콘텐츠 퀄리티, 브랜드 적합도, 과거 성과를 분석하여 CleanScore로 검증합니다. 데이터 기반 매칭으로 돈 낭비 없는 확실한 퀄리티를 보장합니다.',
                icon: Shield
              },
              {
                num: '02',
                title: '클릭 몇 번으로 진출하는 해외 숏폼',
                subtitle: '글로벌 진출 해결',
                desc: '언어 장벽? 현지 네트워크? 걱정 마세요. 미국, 일본 등 타겟 국가의 현지 크리에이터를 국내에서 의뢰하듯 쉽고 빠르게 연결해 드립니다.',
                icon: Globe
              },
              {
                num: '03',
                title: '20만원부터 시작하는 숏폼 캠페인',
                subtitle: '예산 부담 해결',
                desc: '20만원부터 숏폼 캠페인을 시작할 수 있습니다. SNS 업로드 + 2차 활용 무료 + AI 가이드 무한 제공까지. 거품 없는 가격으로 최대의 효율을 냅니다.',
                icon: Target
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#0A0A0F] rounded-[20px] p-6 sm:p-8 border border-white/[0.06] hover:border-[rgba(192,132,252,0.2)] transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 sm:block">
                    <div className="w-12 h-12 rounded-xl bg-[rgba(192,132,252,0.1)] border border-[rgba(192,132,252,0.15)] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[#C084FC]" />
                    </div>
                    <span className="text-[#5A5A6E] text-xs font-medium tracking-wider uppercase sm:block sm:mt-3" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.num}</span>
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[rgba(192,132,252,0.08)] text-[#C084FC] text-xs font-medium mb-2">
                      {item.subtitle}
                    </div>
                    <h3 className="text-white font-bold text-lg sm:text-xl mb-2">{item.title}</h3>
                    <p className="text-[#A0A0B0] text-sm sm:text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* [섹션 5] How it works - 3단계 프로세스 */}
      <section className="py-16 sm:py-20 lg:py-28 bg-[#0A0A0F]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              HOW IT WORKS
            </p>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white">
              크넥에서는 이 모든 과정이<br className="sm:hidden" /> <span className="text-[#C084FC]">단 3단계</span>로 끝납니다.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                step: '01',
                title: '제품 정보 등록',
                desc: '회원가입 후 바로 캠페인을 개설할 수 있습니다. 제품 정보와 원하는 방향만 간단히 등록하세요.',
                badge: '가입 즉시 개설 가능',
                icon: Package
              },
              {
                step: '02',
                title: '크리에이터 매칭 & 기획',
                desc: '크넥이 딱 맞는 국내/해외 크리에이터를 매칭하고 기획합니다.',
                badge: '크넥이 합니다',
                icon: Users
              },
              {
                step: '03',
                title: '영상 납품',
                desc: '촬영 완료 후 고퀄리티 숏폼 영상이 납품됩니다.',
                badge: '대표님은 컨펌만',
                icon: Video
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-[#121218] rounded-[20px] p-6 sm:p-8 border border-white/[0.06] text-center relative overflow-hidden group hover:border-white/15 transition-all"
              >
                <div className="absolute top-4 right-4 text-[#1A1A24] text-6xl font-black" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {item.step}
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(192,132,252,0.1)] border border-[rgba(192,132,252,0.15)] flex items-center justify-center mx-auto mb-5">
                    <item.icon className="w-6 h-6 text-[#C084FC]" />
                  </div>
                  <span className="text-[#C084FC] text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    STEP {item.step}
                  </span>
                  <h3 className="text-white font-bold text-lg sm:text-xl mt-1.5 mb-2.5">{item.title}</h3>
                  <p className="text-[#A0A0B0] text-sm leading-relaxed mb-4">{item.desc}</p>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[rgba(192,132,252,0.08)] text-[#C084FC] text-xs font-medium">
                    {item.badge}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            <button
              onClick={() => navigate(user ? '/company/campaigns' : '/signup')}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
            >
              {user ? '캠페인 현황보기' : '지금 시작하기'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* [섹션 5] Portfolio Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]" id="showcase">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <p className="text-[#C084FC] text-xs font-medium tracking-[0.15em] uppercase mb-2 flex items-center gap-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <Zap className="w-3.5 h-3.5" />
                GLOBAL CREATOR NETWORK
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white" style={{ fontFamily: "'Outfit', 'Pretendard', sans-serif" }}>
                PORTFOLIO <span className="italic font-light opacity-80">Series.</span>
              </h2>
            </div>
            {/* Region tabs */}
            <div className="flex rounded-full p-1">
              {[
                { key: 'korea', label: 'KR' },
                { key: 'japan', label: 'JP' },
                { key: 'usa', label: 'US' }
              ].map(tab => {
                const FlagIcon = FLAGS[tab.key]
                return (
                <button
                  key={tab.key}
                  onClick={() => { setSelectedRegion(tab.key); setPortfolioPage(0) }}
                  className={`px-5 sm:px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedRegion === tab.key
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-[#5A5A6E] hover:text-white'
                  }`}
                >
                  <FlagIcon className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-sm" /> {tab.label}
                </button>
              )})}
            </div>
          </div>

          {/* Content */}
          {(() => {
            const channels = {
              korea: { region: 'South Korea', name: 'CNEC Korea', desc: '가장 빠른 트렌드 반영, K-뷰티 특화 숏폼 솔루션. 현지 크리에이터 네트워크를 통한 폭발적인 도달률을 보장합니다.', url: 'https://www.youtube.com/@bizcnec/shorts' },
              japan: { region: 'Japan', name: 'CNEC Japan', desc: '일본 현지 크리에이터와 함께 만드는 J-뷰티 숏폼 마케팅. 일본 시장의 섬세한 뷰티 트렌드를 정확히 포착합니다.', url: 'https://www.youtube.com/@CNEC_JP/shorts' },
              usa: { region: 'United States', name: 'CNEC USA', desc: '북미 시장을 타겟으로 한 글로벌 뷰티 콘텐츠. 다양한 인종과 피부 타입에 맞는 진정성 있는 리뷰를 제공합니다.', url: 'https://www.youtube.com/@CNEC_USA/shorts' }
            }
            const ch = channels[selectedRegion]
            const shorts = (portfolioShorts[selectedRegion] || []).slice(0, 12)
            const VISIBLE_COUNT_DESKTOP = 4
            const VISIBLE_COUNT_MOBILE = 2
            const totalPages = Math.max(1, Math.ceil(shorts.length / VISIBLE_COUNT_DESKTOP))
            const totalPagesMobile = Math.max(1, Math.ceil(shorts.length / VISIBLE_COUNT_MOBILE))

            return (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-5 lg:gap-6">
                {/* Left: Info card */}
                <div className="bg-[#121218] border border-white/[0.06] rounded-[20px] p-6 sm:p-8 flex flex-col justify-between min-h-[320px] lg:min-h-[400px]">
                  <div>
                    <p className="text-[#5A5A6E] text-[10px] font-medium tracking-[0.2em] uppercase mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Selected Region</p>
                    <div className="flex items-center gap-2.5 mb-6">
                      {(() => { const FlagIcon = FLAGS[selectedRegion]; return <FlagIcon className="w-7 h-5 rounded-[2px] shadow-sm" /> })()}
                      <p className="text-white text-base font-medium">{ch.region}</p>
                    </div>
                    <h3 className="text-white font-black text-3xl sm:text-4xl mb-4 italic" style={{ fontFamily: "'Outfit', sans-serif" }}>{ch.name}</h3>
                    <p className="text-[#A0A0B0] text-sm leading-relaxed">{ch.desc}</p>
                  </div>
                  <div className="mt-6 pt-5 border-t border-white/[0.08]">
                    <a
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center group-hover:border-white/15 transition-colors">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                      <span className="text-[#A0A0B0] text-xs font-medium tracking-wider uppercase group-hover:text-white transition-colors" style={{ fontFamily: "'Outfit', sans-serif" }}>Watch All Works</span>
                      {shorts.length > 0 && (
                        <div className="ml-auto flex items-center -space-x-2">
                          {shorts.slice(0, 3).map((s) => (
                            <div key={s.video_id} className="w-7 h-7 rounded-full border-2 border-gray-900 overflow-hidden">
                              <img src={s.thumbnail} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {shorts.length > 3 && (
                            <div className="w-7 h-7 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-400 text-[9px] font-medium">+{shorts.length - 3}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </a>
                    {/* Slider controls */}
                    {shorts.length > VISIBLE_COUNT_DESKTOP && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-1.5">
                          {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPortfolioPage(i)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                portfolioPage === i ? 'w-6 bg-white' : 'w-1.5 bg-[#24243A] hover:bg-[#5A5A6E]'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPortfolioPage(p => Math.max(0, p - 1))}
                            disabled={portfolioPage === 0}
                            className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-[#A0A0B0] hover:text-white hover:border-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPortfolioPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={portfolioPage === totalPages - 1}
                            className="w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center text-[#A0A0B0] hover:text-white hover:border-white/15 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Video slider */}
                <div className="relative overflow-hidden">
                  {shorts.length > 0 ? (
                    <PortfolioSlider
                      shorts={shorts}
                      page={portfolioPage}
                      setPage={setPortfolioPage}
                      totalPages={totalPages}
                      totalPagesMobile={totalPagesMobile}
                      visibleDesktop={VISIBLE_COUNT_DESKTOP}
                      visibleMobile={VISIBLE_COUNT_MOBILE}
                      selectedRegion={selectedRegion}
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gray-900 animate-pulse">
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-gray-900" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Video Portfolio Sections - 카테고리별 (DB 영상 사용) */}
      <section>
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
      <section className="py-10 sm:py-16 lg:py-20 bg-[#121218]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-0.5 sm:mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{pageContent.stats_campaigns}</div>
              <div className="text-[#A0A0B0] text-xs sm:text-sm">완료된 캠페인</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-0.5 sm:mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{pageContent.stats_creators}</div>
              <div className="text-[#A0A0B0] text-xs sm:text-sm">파트너 크리에이터</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-0.5 sm:mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{pageContent.stats_countries}</div>
              <div className="text-[#A0A0B0] text-xs sm:text-sm">진출 국가</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-0.5 sm:mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{pageContent.stats_success}</div>
              <div className="text-[#A0A0B0] text-xs sm:text-sm">누적 조회수</div>
            </div>
          </div>
        </div>
      </section>

      {/* 크넥 소개서 다운로드 배너 (상단) */}
      <section className="py-0 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <a
            href={brochureUrl || "https://docs.google.com/presentation/d/1PFEJi0gWZCWn9g9Vcx0bScZGf3W53_4n/export/pdf"}
            className="group block relative overflow-hidden rounded-[20px] border border-[rgba(192,132,252,0.3)] bg-[#121218] hover:border-[rgba(192,132,252,0.5)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(192,132,252,0.08),transparent_70%)]" />
            <div className="relative flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[rgba(192,132,252,0.15)] border border-[rgba(192,132,252,0.2)] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#C084FC]" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">CNEC 서비스 소개서</p>
                  <p className="text-[#A0A0B0] text-xs sm:text-sm">크넥의 크리에이터 마케팅 서비스를 한눈에 확인하세요</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#C084FC] group-hover:text-white transition-colors shrink-0">
                <span className="hidden sm:inline text-sm font-medium">PDF 다운로드</span>
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* Featured Newsletters Section */}
      {featuredNewsletters.length > 0 && (
        <section className="py-10 sm:py-16 lg:py-20 bg-[#121218]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8 lg:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-white">
                금주의 <span className="text-[#C084FC]">뉴스레터</span>
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
                  {/* 썸네일 */}
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

                  {/* 콘텐츠 */}
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

      {/* Partner Brands Section */}
      <section className="py-10 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
              함께 하는 <span className="text-[#C084FC]">브랜드</span>
            </h2>
            <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg">다양한 브랜드들이 CNEC과 함께 성장하고 있습니다</p>
          </div>

          <div className="bg-[#121218] rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 lg:p-12 border border-white/[0.06]">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2 sm:gap-4 lg:gap-6">
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
                  className="flex items-center justify-center h-10 sm:h-14 lg:h-16 px-1 sm:px-2 border border-white/[0.06] rounded-md sm:rounded-lg hover:border-white/15 transition-colors"
                >
                  <span className="text-[10px] sm:text-xs lg:text-sm text-[#A0A0B0] font-medium text-center truncate">{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">뷰티 브랜드를 위한 3가지 캠페인</h2>
            <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg">데이터 기반 AI 매칭으로 성과를 만들어드립니다.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {/* 올영세일 패키지 - 왼쪽 */}
            <div className="bg-[#121218] rounded-[20px] p-5 sm:p-6 lg:p-8 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h3 className="text-base sm:text-lg font-medium text-[#A0A0B0] mb-1.5 sm:mb-2">올영세일 패키지</h3>
              <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>₩400,000</span>
                <span className="text-[#5A5A6E] text-sm">/건</span>
              </div>
              <p className="text-[#5A5A6E] text-xs sm:text-sm mb-4 sm:mb-6">세일 기간 집중 트래픽과 구매 전환을 유도하는 실속형 패키지</p>
              <button
                onClick={() => window.open('/campaigns/intro/oliveyoung', '_blank')}
                className="w-full py-2.5 sm:py-3 border border-white/20 text-white rounded-xl font-medium text-sm sm:text-base hover:border-white/40 transition-colors mb-4 sm:mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  3단계 콘텐츠 (리뷰→홍보→당일)
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  구매 전환 유도형 기획
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  SNS 업로드 URL 3개
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  원본 영상 파일 제공
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  2차 활용 및 파트너코드
                </li>
              </ul>
            </div>

            {/* 기획형 캠페인 - 가운데 인기 */}
            <div className="bg-[#121218] rounded-[20px] p-5 sm:p-6 lg:p-8 border border-[#C084FC] relative" style={{ boxShadow: '0 0 30px rgba(192,132,252,0.1)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#C084FC] rounded-full text-xs font-semibold text-[#0A0A0F]">
                인기
              </div>
              <h3 className="text-base sm:text-lg font-medium text-[#C084FC] mb-1.5 sm:mb-2">기획형 캠페인</h3>
              <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>₩200,000</span>
                <span className="text-[#5A5A6E] text-sm">/건</span>
              </div>
              <p className="text-[#5A5A6E] text-xs sm:text-sm mb-4 sm:mb-6">합리적인 비용으로 전문적인 숏폼 기획을 시작하고 싶은 브랜드</p>
              <button
                onClick={() => window.open('/campaigns/intro/regular', '_blank')}
                className="w-full py-2.5 sm:py-3 bg-[#C084FC] text-[#0A0A0F] rounded-xl font-medium text-sm sm:text-base hover:brightness-110 transition-all mb-4 sm:mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  브랜드 맞춤 시나리오 기획
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  촬영 가이드라인 제공
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  AI 크리에이터 매칭
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  SNS 업로드 URL 1개
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  2차 활용 및 파트너코드
                </li>
              </ul>
            </div>

            {/* 4주 챌린지 - 오른쪽 */}
            <div className="bg-[#121218] rounded-[20px] p-5 sm:p-6 lg:p-8 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h3 className="text-base sm:text-lg font-medium text-[#A0A0B0] mb-1.5 sm:mb-2">4주 챌린지</h3>
              <div className="flex items-baseline gap-1 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>₩600,000</span>
                <span className="text-[#5A5A6E] text-sm">/건</span>
              </div>
              <p className="text-[#5A5A6E] text-xs sm:text-sm mb-4 sm:mb-6">진정성 있는 리뷰와 장기적인 바이럴 효과를 위한 프리미엄 플랜</p>
              <button
                onClick={() => window.open('/campaigns/intro/4week', '_blank')}
                className="w-full py-2.5 sm:py-3 border border-white/20 text-white rounded-xl font-medium text-sm sm:text-base hover:border-white/40 transition-colors mb-4 sm:mb-6"
              >
                가이드 보기
              </button>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  주차별 미션 (총 4편 제작)
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  Before & After 변화 기록
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  SNS 업로드 URL 4개
                </li>
                <li className="flex items-center gap-2 text-[#A0A0B0]">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C084FC] flex-shrink-0" />
                  2차 활용 및 파트너코드
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 고객 성공 스토리 섹션 */}
      <section id="testimonials" className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <p className="text-[#C084FC] text-xs sm:text-sm font-medium tracking-[0.15em] uppercase mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
              SOCIAL PROOF
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
              이미 수많은 브랜드가 크넥을 통해<br className="hidden sm:block" /> 성공적인 숏폼을 만들고 있습니다.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-[#121218] rounded-[20px] p-5 sm:p-6 lg:p-8 border border-white/[0.06]">
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

      {/* Voucher Section */}
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
            200만원 패키지 이용 시 실 부담금 40만원부터 시작
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

      {/* FAQ Section */}
      <section id="faq" className="py-12 sm:py-16 lg:py-24 bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">자주 묻는 질문</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-[#121218] rounded-xl sm:rounded-2xl border border-white/[0.06]">
                <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-6">
                  <span className="font-medium pr-3 sm:pr-4 text-white text-sm sm:text-base">{faq.question || faq.q}</span>
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#5A5A6E] group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-[#A0A0B0] text-sm sm:text-base leading-relaxed">
                  {faq.answer || faq.a}
                </div>
              </details>
            ))}
          </div>

          {/* 카카오톡 상담 안내 */}
          <div className="mt-8 sm:mt-10 text-center">
            <p className="text-[#A0A0B0] text-sm mb-3">더 궁금한 점이 있으신가요?</p>
            <a
              href="https://pf.kakao.com/_xgNdxlG"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white rounded-full font-medium text-sm hover:border-white/40 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              카카오톡으로 상담하기
            </a>
          </div>
        </div>
      </section>

      {/* Newsletter Banner */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#121218] relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-[rgba(192,132,252,0.06)] rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-[rgba(192,132,252,0.04)] rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[rgba(192,132,252,0.15)] rounded-xl sm:rounded-2xl mb-4 sm:mb-6">
            <Mail className="w-6 h-6 sm:w-8 sm:h-8 text-[#C084FC]" />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4 text-white">
            인플루언서 마케팅 인사이트
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
            K-뷰티 마케팅 트렌드, 크리에이터 협업 노하우, 성공 사례까지<br className="hidden sm:block" />
            매주 엄선된 콘텐츠를 무료로 받아보세요.
          </p>
          <button
            onClick={() => navigate('/newsletters')}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-base sm:text-lg hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
          >
            뉴스레터 보러가기
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </section>

      {/* 크넥 소개서 다운로드 배너 (하단) */}
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
            서비스 소개서에서 크리에이터 마케팅의 모든 것을 확인하세요.<br className="hidden sm:inline" />
            캠페인 프로세스, 성과 사례, 가격 안내까지 한 번에.
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

      {/* [섹션 6] Bottom CTA - 최종 행동 유도 */}
      <section className="py-16 sm:py-20 lg:py-28 bg-[#0A0A0F] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[rgba(192,132,252,0.05)] rounded-full blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-white leading-tight">
            크리에이터 찾고, 기획하고, 촬영 관리하고...<br />
            <span className="text-[#C084FC]">이거 다 하실 필요 없습니다.</span>
          </h2>
          <p className="text-[#A0A0B0] text-sm sm:text-base lg:text-lg mb-8 sm:mb-10 max-w-2xl mx-auto">
            지금 바로 제품만 등록하세요. 나머지는 크넥이 알아서 하겠습니다.
          </p>
          <button
            onClick={() => navigate(user ? '/company/campaigns' : '/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-base sm:text-lg hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
          >
            {user ? '캠페인 현황보기' : '지금 시작하기'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Sticky Bottom CTA Button */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/95 to-transparent pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3.5 bg-[#C084FC] text-[#0A0A0F] rounded-full font-semibold text-sm sm:text-base hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[rgba(192,132,252,0.3)]"
            >
              지금 시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
