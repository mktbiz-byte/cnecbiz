import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabaseBiz } from '../lib/supabaseClients'
import { Button } from '@/components/ui/button'
import {
  Mail, ArrowLeft, Star, Calendar, Tag, Lock, LogIn, Share2, ExternalLink
} from 'lucide-react'

export default function NewsletterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [newsletter, setNewsletter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [relatedNewsletters, setRelatedNewsletters] = useState([])

  useEffect(() => {
    checkAuth()
    fetchNewsletter()
  }, [id])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Auth check error:', error)
    }
  }

  const fetchNewsletter = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('newsletters')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error) throw error
      setNewsletter(data)

      // 조회수 증가
      if (data && (!data.is_members_only || user)) {
        await supabaseBiz
          .from('newsletters')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id)
      }

      // 관련 뉴스레터 가져오기
      if (data?.category) {
        const { data: related } = await supabaseBiz
          .from('newsletters')
          .select('id, title, thumbnail_url, published_at')
          .eq('category', data.category)
          .eq('is_active', true)
          .neq('id', id)
          .order('published_at', { ascending: false })
          .limit(3)

        setRelatedNewsletters(related || [])
      }
    } catch (error) {
      console.error('뉴스레터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: newsletter.title,
          text: newsletter.description,
          url: url
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(url)
      alert('링크가 복사되었습니다.')
    }
  }

  const getCategoryLabel = (value) => {
    const categories = {
      marketing: '마케팅 인사이트',
      insight: '산업 트렌드',
      case_study: '성공 사례',
      tips: '실용 팁',
      news: '업계 뉴스',
      other: '기타'
    }
    return categories[value] || value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!newsletter) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">뉴스레터를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-4">존재하지 않거나 비활성화된 뉴스레터입니다.</p>
          <Button onClick={() => navigate('/newsletters')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뉴스레터 목록으로
          </Button>
        </div>
      </div>
    )
  }

  // 회원 전용 콘텐츠 접근 불가
  const canAccess = !newsletter.is_members_only || user

  return (
    <>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{newsletter.title} | CNEC 뉴스레터</title>
        <meta name="description" content={newsletter.description || `CNEC 뉴스레터 - ${newsletter.title}`} />
        <meta name="keywords" content={newsletter.tags?.join(', ') || '인플루언서 마케팅, 뉴스레터, CNEC'} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={newsletter.title} />
        <meta property="og:description" content={newsletter.description || ''} />
        <meta property="og:image" content={newsletter.thumbnail_url || ''} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:site_name" content="CNEC 뉴스레터" />
        <meta property="article:published_time" content={newsletter.published_at} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={newsletter.title} />
        <meta name="twitter:description" content={newsletter.description || ''} />
        <meta name="twitter:image" content={newsletter.thumbnail_url || ''} />

        {/* Naver */}
        <meta name="naver-site-verification" content="" />

        {/* Canonical URL */}
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* 헤더 */}
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/newsletters')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>뉴스레터 목록</span>
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-1" />
                  공유
                </Button>
                {newsletter.stibee_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(newsletter.stibee_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    원본
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 본문 */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* 아티클 헤더 */}
          <article itemScope itemType="https://schema.org/Article">
            <header className="mb-8">
              {/* 카테고리 및 배지 */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                  {getCategoryLabel(newsletter.category)}
                </span>
                {newsletter.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                    <Star className="w-4 h-4" /> 추천
                  </span>
                )}
                {newsletter.is_members_only && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                    <Lock className="w-4 h-4" /> 회원 전용
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h1 itemProp="headline" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {newsletter.title}
              </h1>

              {/* 설명 */}
              {newsletter.description && (
                <p itemProp="description" className="text-lg text-gray-600 mb-4">
                  {newsletter.description}
                </p>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                {newsletter.published_at && (
                  <time itemProp="datePublished" dateTime={newsletter.published_at} className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(newsletter.published_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                )}
                {newsletter.issue_number && (
                  <span>제 {newsletter.issue_number}호</span>
                )}
                {newsletter.view_count > 0 && (
                  <span>조회 {newsletter.view_count}회</span>
                )}
              </div>

              {/* 태그 */}
              {newsletter.tags && newsletter.tags.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {newsletter.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* 썸네일 이미지 */}
            {newsletter.thumbnail_url && (
              <figure className="mb-8">
                <img
                  itemProp="image"
                  src={newsletter.thumbnail_url}
                  alt={newsletter.title}
                  className="w-full rounded-xl shadow-lg"
                />
              </figure>
            )}

            {/* 본문 콘텐츠 */}
            {canAccess ? (
              <div
                itemProp="articleBody"
                className="bg-white rounded-xl shadow-sm border p-6 md:p-8 prose prose-lg max-w-none newsletter-content"
              >
                {newsletter.html_content ? (
                  <div dangerouslySetInnerHTML={{ __html: newsletter.html_content }} />
                ) : newsletter.stibee_url ? (
                  <iframe
                    src={newsletter.stibee_url}
                    className="w-full min-h-[80vh] border-0"
                    title={newsletter.title}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-12">
                    콘텐츠를 불러올 수 없습니다.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">회원 전용 콘텐츠</h2>
                <p className="text-gray-600 mb-6">
                  이 뉴스레터는 회원 전용 콘텐츠입니다.<br />
                  로그인 후 이용해주세요.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인하기
                </Button>
              </div>
            )}
          </article>

          {/* 관련 뉴스레터 */}
          {relatedNewsletters.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">관련 뉴스레터</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedNewsletters.map((item) => (
                  <Link
                    key={item.id}
                    to={`/newsletter/${item.id}`}
                    className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
                  >
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <h3 className="font-medium text-gray-900 line-clamp-2">{item.title}</h3>
                    {item.published_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.published_at).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* 푸터 */}
        <footer className="bg-white border-t py-8 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>CNEC 뉴스레터 - 인플루언서 마케팅 인사이트</p>
          </div>
        </footer>
      </div>

      {/* 스타일 */}
      <style>{`
        .newsletter-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
        }
        .newsletter-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .newsletter-content table {
          width: 100%;
        }
      `}</style>
    </>
  )
}
