import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, TrendingUp, Users, Video, CheckCircle2, ArrowRight, Play, Star, Award, Target, Zap, Shield, MessageCircle, ChevronDown } from 'lucide-react'
import { supabaseBiz } from '../lib/supabaseClients'

export default function LandingPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    if (!supabaseBiz) {
      // 더미 포트폴리오 데이터
      setVideos([
        { id: 1, title: '피부 케어 리뷰', thumbnail_url: '/portfolio_1.webp', youtube_url: 'https://youtube.com/shorts/example1' },
        { id: 2, title: '메이크업 튜토리얼', thumbnail_url: '/portfolio_2.webp', youtube_url: 'https://youtube.com/shorts/example2' },
        { id: 3, title: '올리브영 방문', thumbnail_url: '/portfolio_3.webp', youtube_url: 'https://youtube.com/shorts/example3' },
        { id: 4, title: '스킨케어 루틴', thumbnail_url: '/portfolio_4.webp', youtube_url: 'https://youtube.com/shorts/example4' },
        { id: 5, title: '헤어 케어', thumbnail_url: '/portfolio_1.webp', youtube_url: 'https://youtube.com/shorts/example5' },
        { id: 6, title: '색조 화장품', thumbnail_url: '/portfolio_2.webp', youtube_url: 'https://youtube.com/shorts/example6' },
        { id: 7, title: '선케어 추천', thumbnail_url: '/portfolio_3.webp', youtube_url: 'https://youtube.com/shorts/example7' },
        { id: 8, title: '바디 케어', thumbnail_url: '/portfolio_4.webp', youtube_url: 'https://youtube.com/shorts/example8' },
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

  const stats = [
    { icon: Video, label: '완료된 캠페인', value: '1,200+', color: 'from-blue-500 to-cyan-500' },
    { icon: Users, label: '파트너 크리에이터', value: '500+', color: 'from-purple-500 to-pink-500' },
    { icon: Globe, label: '진출 국가', value: '3개국', color: 'from-orange-500 to-red-500' },
    { icon: TrendingUp, label: '평균 조회수', value: '50만+', color: 'from-green-500 to-emerald-500' },
  ]

  const features = [
    {
      icon: Target,
      title: '정확한 타겟팅',
      description: '일본, 미국, 대만 시장별 맞춤형 인플루언서 매칭으로 정확한 타겟 고객에게 도달합니다.',
      color: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
    },
    {
      icon: Zap,
      title: '빠른 제작 프로세스',
      description: '평균 14일 이내 캠페인 완성. 신속한 스케줄 관리로 출시 일정에 맞춰 제작합니다.',
      color: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
    },
    {
      icon: Shield,
      title: '검증된 크리에이터',
      description: '면접을 통과한 검증된 크리에이터만 선별. 가짜 인플루언서 걱정 없이 진행합니다.',
      color: 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
    },
    {
      icon: Award,
      title: '전문 컨설팅',
      description: '전담 컨설턴트가 기획부터 제작, 업로드까지 전 과정을 관리하고 최적화합니다.',
      color: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
    },
  ]

  const process = [
    { step: '01', title: '상담 신청', description: '캠페인 목표와 예산을 상담합니다' },
    { step: '02', title: '크리에이터 매칭', description: '브랜드에 최적화된 인플루언서를 선정합니다' },
    { step: '03', title: '콘텐츠 제작', description: '가이드에 따라 고품질 영상을 제작합니다' },
    { step: '04', title: '검수 및 수정', description: '전문가가 영상을 검수하고 피드백합니다' },
    { step: '05', title: 'SNS 업로드', description: '최적 시간대에 맞춰 콘텐츠를 게시합니다' },
    { step: '06', title: '성과 분석', description: '조회수, 참여율 등 성과를 리포트합니다' },
  ]

  const testimonials = [
    {
      company: '뷰티 브랜드 A사',
      text: 'CNEC BIZ를 통해 일본 시장 진출에 성공했습니다. 현지 인플루언서들의 진정성 있는 리뷰로 브랜드 인지도가 3배 상승했어요.',
      rating: 5,
      result: '매출 250% 증가'
    },
    {
      company: '코스메틱 B사',
      text: '14일 만에 20개의 고품질 숏폼 영상을 받았습니다. 빠른 제작 속도와 전문적인 관리에 매우 만족합니다.',
      rating: 5,
      result: '조회수 100만+ 달성'
    },
    {
      company: '스킨케어 C사',
      text: '수출바우처를 활용해 비용 부담 없이 글로벌 마케팅을 시작할 수 있었습니다. 전담 컨설턴트의 세심한 관리가 인상적이었어요.',
      rating: 5,
      result: '해외 주문 300% 증가'
    },
  ]

  const faqs = [
    {
      q: '수출바우처란 무엇인가요?',
      a: '중소벤처기업부에서 지원하는 수출 지원 사업으로, 해외 마케팅 비용의 최대 80%를 지원받을 수 있습니다. CNEC BIZ는 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다.'
    },
    {
      q: '어떤 국가를 지원하나요?',
      a: '현재 일본, 미국, 대만 시장을 중점적으로 지원하고 있습니다. 각 국가별로 현지 언어와 문화에 맞는 크리에이터 네트워크를 보유하고 있습니다.'
    },
    {
      q: '캠페인 제작 기간은 얼마나 걸리나요?',
      a: '평균 14일 이내에 완성됩니다. 크리에이터 매칭 3일, 콘텐츠 제작 7일, 검수 및 수정 2일, 업로드 2일 정도 소요됩니다.'
    },
    {
      q: '최소 비용은 얼마인가요?',
      a: '베이직 패키지는 200만원부터 시작하며, 수출바우처 활용 시 실제 부담금은 40만원부터 가능합니다. 패키지별 상세 견적은 상담을 통해 안내해 드립니다.'
    },
    {
      q: '영상 수정이 가능한가요?',
      a: '네, 패키지별로 1~3회의 수정 기회가 제공됩니다. 전문 컨설턴트가 브랜드의 요구사항을 정확히 전달하여 만족도 높은 결과물을 보장합니다.'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                CNEC BIZ
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-blue-600 transition-colors">서비스</a>
              <a href="#portfolio" className="text-slate-600 hover:text-blue-600 transition-colors">포트폴리오</a>
              <a href="#process" className="text-slate-600 hover:text-blue-600 transition-colors">프로세스</a>
              <a href="#voucher" className="text-slate-600 hover:text-blue-600 transition-colors">수출바우처</a>
              <a href="#faq" className="text-slate-600 hover:text-blue-600 transition-colors">FAQ</a>
            </nav>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-slate-600 hover:text-blue-600 transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-8">
              <Star className="w-4 h-4" />
              <span className="text-sm font-medium">글로벌 인플루언서 마케팅 플랫폼</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              K-뷰티를 세계로,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                14일 만에 완성하는 숏폼
              </span>
            </h1>
            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
              일본, 미국, 대만 시장 진출을 위한 전문 인플루언서 마케팅 플랫폼.
              <br />
              검증된 크리에이터와 함께 진정성 있는 콘텐츠로 글로벌 성공을 만들어갑니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => navigate('/signup')}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-2xl transition-all flex items-center space-x-2 text-lg font-medium"
              >
                <span>무료로 시작하기</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white text-slate-700 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all flex items-center space-x-2 text-lg font-medium">
                <MessageCircle className="w-5 h-5" />
                <span>상담 신청</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              CNEC BIZ만의 <span className="text-blue-600">특별함</span>
            </h2>
            <p className="text-xl text-slate-600">
              검증된 시스템과 전문성으로 브랜드의 글로벌 성공을 지원합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${feature.color} border-2 rounded-2xl p-8 hover:shadow-xl transition-all group`}
              >
                <div className="inline-flex p-4 bg-white rounded-xl shadow-md mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              성공 사례 <span className="text-blue-600">포트폴리오</span>
            </h2>
            <p className="text-xl text-slate-600">
              실제 캠페인 영상을 확인하고 CNEC BIZ의 품질을 경험하세요
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {videos.map((video) => {
              // Extract YouTube video ID from URL
              const getYouTubeId = (url) => {
                if (!url) return null
                const match = url.match(/(?:youtube\.com\/(?:shorts\/|embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
                return match ? match[1] : null
              }
              
              const videoId = getYouTubeId(video.youtube_url)
              
              return (
                <div
                  key={video.id}
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
                >
                  {videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="text-center mt-12">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center space-x-2">
              <span>더 많은 포트폴리오 보기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              간단한 <span className="text-blue-600">6단계 프로세스</span>
            </h2>
            <p className="text-xl text-slate-600">
              상담부터 성과 분석까지, 체계적인 프로세스로 성공을 보장합니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {process.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-600 hover:shadow-xl transition-all">
                  <div className="text-6xl font-bold text-blue-100 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>
                {index < process.length - 1 && index % 3 !== 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voucher Section */}
      <section id="voucher" className="py-20 bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              수출바우처로 <span className="text-cyan-200">최대 80% 지원</span>
            </h2>
            <p className="text-xl text-blue-100">
              중소벤처기업부 공식 수행기관으로 등록되어 있어 바우처 활용이 가능합니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">80%</div>
              <div className="text-blue-100 mb-4">정부 지원금</div>
              <p className="text-sm text-blue-100">최대 5,000만원까지 지원 가능</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">20%</div>
              <div className="text-blue-100 mb-4">기업 부담금</div>
              <p className="text-sm text-blue-100">200만원 패키지 → 40만원 부담</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-100 mb-4">신청 지원</div>
              <p className="text-sm text-blue-100">서류 작성부터 정산까지 전담 지원</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">수출바우처 신청 절차</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">자격 확인</h4>
                <p className="text-sm text-slate-600">중소기업 확인서 발급</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">온라인 신청</h4>
                <p className="text-sm text-slate-600">수출바우처 홈페이지 접수</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">승인 대기</h4>
                <p className="text-sm text-slate-600">약 2주 소요</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">4</span>
                </div>
                <h4 className="font-bold text-slate-900 mb-2">서비스 이용</h4>
                <p className="text-sm text-slate-600">CNEC BIZ 캠페인 진행</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl transition-all inline-flex items-center space-x-2">
                <span>수출바우처 상담 신청</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              고객 <span className="text-blue-600">성공 스토리</span>
            </h2>
            <p className="text-xl text-slate-600">
              CNEC BIZ와 함께한 브랜드들의 실제 후기를 확인하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-8 hover:border-blue-600 hover:shadow-xl transition-all">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="border-t border-slate-200 pt-4">
                  <div className="font-bold text-slate-900 mb-1">{testimonial.company}</div>
                  <div className="text-sm text-blue-600 font-medium">{testimonial.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              자주 묻는 <span className="text-blue-600">질문</span>
            </h2>
            <p className="text-xl text-slate-600">
              궁금하신 점이 있으신가요? 여기서 답을 찾아보세요
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details key={index} className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-600 transition-all">
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <span className="text-lg font-bold text-slate-900">{faq.q}</span>
                  <ChevronDown className="w-6 h-6 text-blue-600 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      {/* Partner Brands Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              함께 하는 <span className="text-blue-600">브랜드</span>
            </h2>
            <p className="text-xl text-slate-600">
              다양한 브랜드들이 CNEC BIZ와 함께 성장하고 있습니다
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <img
              src="/brands.png"
              alt="함께 하는 브랜드"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">nt-to-br from-blue-600 to-cyan-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-12">
            14일 만에 완성되는 글로벌 마케팅, CNEC BIZ와 함께라면 가능합니다
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate('/signup')}
              className="px-10 py-5 bg-white text-blue-600 rounded-xl hover:shadow-2xl transition-all text-lg font-bold"
            >
              무료로 시작하기
            </button>
            <button className="px-10 py-5 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-xl hover:bg-white/20 transition-all text-lg font-bold">
              상담 신청하기
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="w-6 h-6 text-blue-500" />
                <span className="text-xl font-bold text-white">CNEC BIZ</span>
              </div>
              <p className="text-sm">
                글로벌 인플루언서 마케팅 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">서비스</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-500 transition-colors">캠페인 관리</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">크리에이터 매칭</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">성과 분석</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">지원</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-500 transition-colors">수출바우처</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">고객센터</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-500 transition-colors">회사 소개</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">개인정보처리방침</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            <p>&copy; 2025 CNEC BIZ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

