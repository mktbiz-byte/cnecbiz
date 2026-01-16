import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabaseBiz } from '../lib/supabaseClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Mail, ArrowLeft, Star, Calendar, Lock, LogIn, Share2, Send, Check, Loader2
} from 'lucide-react'

export default function NewsletterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [newsletter, setNewsletter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [relatedNewsletters, setRelatedNewsletters] = useState([])

  // 구독 폼 상태
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeResult, setSubscribeResult] = useState(null) // { success: bool, message: string }

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

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!subscribeEmail || subscribing) return

    setSubscribing(true)
    setSubscribeResult(null)

    try {
      const response = await fetch('/.netlify/functions/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail })
      })

      const result = await response.json()
      setSubscribeResult({
        success: result.success,
        message: result.message || result.error
      })

      if (result.success) {
        setSubscribeEmail('')
      }
    } catch (error) {
      setSubscribeResult({
        success: false,
        message: '구독 처리 중 오류가 발생했습니다.'
      })
    } finally {
      setSubscribing(false)
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

        {/* Canonical URL */}
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* 헤더 */}
        <header className="border-b sticky top-0 z-40 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/newsletters')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">목록</span>
              </button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* 본문 */}
        <main className="max-w-3xl mx-auto px-4 py-8">
          <article itemScope itemType="https://schema.org/Article">
            {/* 헤더 영역 */}
            <header className="mb-8 pb-6 border-b">
              {/* 카테고리 및 배지 */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm text-blue-600 font-medium">
                  {getCategoryLabel(newsletter.category)}
                </span>
                {newsletter.is_featured && (
                  <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                    <Star className="w-3 h-3" />
                  </span>
                )}
                {newsletter.is_members_only && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-600 text-white">
                    <Lock className="w-3 h-3" /> 회원전용
                  </span>
                )}
              </div>

              {/* 제목 */}
              <h1 itemProp="headline" className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                {newsletter.title}
              </h1>

              {/* 설명 */}
              {newsletter.description && (
                <p itemProp="description" className="text-gray-600 mb-4">
                  {newsletter.description}
                </p>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center gap-3 text-sm text-gray-500">
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
                  <span>#{newsletter.issue_number}</span>
                )}
              </div>
            </header>

            {/* 본문 콘텐츠 */}
            {canAccess ? (
              <div itemProp="articleBody" className="newsletter-content">
                {newsletter.html_content ? (
                  <div dangerouslySetInnerHTML={{ __html: newsletter.html_content }} />
                ) : newsletter.stibee_url ? (
                  <iframe
                    src={newsletter.stibee_url}
                    className="w-full border-0"
                    style={{ minHeight: '100vh' }}
                    title={newsletter.title}
                  />
                ) : (
                  <p className="text-gray-500 text-center py-12">
                    콘텐츠를 불러올 수 없습니다.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">회원 전용 콘텐츠</h2>
                <p className="text-gray-600 mb-6">
                  이 뉴스레터는 회원 전용입니다.<br />
                  로그인 후 이용해주세요.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인
                </Button>
              </div>
            )}
          </article>

          {/* 뉴스레터 구독 CTA */}
          <section className="mt-12 p-6 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                이런 콘텐츠, 더 받아보고 싶으신가요?
              </h3>
              <p className="text-gray-600">
                인플루언서 마케팅 인사이트를 이메일로 받아보세요.
              </p>
            </div>

            {subscribeResult?.success ? (
              <div className="flex items-center justify-center gap-2 py-4 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">{subscribeResult.message}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="이메일 주소를 입력하세요"
                    value={subscribeEmail}
                    onChange={(e) => setSubscribeEmail(e.target.value)}
                    className="flex-1 h-12 bg-white"
                    disabled={subscribing}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={subscribing || !subscribeEmail}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                  >
                    {subscribing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        구독
                      </>
                    )}
                  </Button>
                </div>
                {subscribeResult && !subscribeResult.success && (
                  <p className="text-red-500 text-sm mt-2 text-center">{subscribeResult.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-3 text-center">
                  구독은 언제든 취소할 수 있습니다.
                </p>
              </form>
            )}
          </section>

          {/* 관련 뉴스레터 */}
          {relatedNewsletters.length > 0 && (
            <section className="mt-16 pt-8 border-t">
              <h2 className="text-lg font-bold text-gray-900 mb-4">관련 뉴스레터</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedNewsletters.map((item) => (
                  <Link
                    key={item.id}
                    to={`/newsletter/${item.id}`}
                    className="group"
                  >
                    {item.thumbnail_url && (
                      <div className="aspect-video rounded-lg overflow-hidden mb-2 bg-gray-100">
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
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
        <footer className="border-t py-8 mt-12">
          <div className="max-w-3xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>© CNEC 뉴스레터</p>
          </div>
        </footer>
      </div>

      {/* 스타일 */}
      <style>{`
        .newsletter-content {
          font-size: 16px;
          line-height: 1.8;
          color: #333;
        }
        .newsletter-content img {
          max-width: 100%;
          height: auto;
          margin: 1.5em 0;
        }
        .newsletter-content a {
          color: #2563eb;
        }
        .newsletter-content p {
          margin: 1em 0;
        }
        .newsletter-content h1,
        .newsletter-content h2,
        .newsletter-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .newsletter-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .newsletter-content td,
        .newsletter-content th {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .newsletter-content ul,
        .newsletter-content ol {
          margin: 1em 0;
          padding-left: 1.5em;
        }
        .newsletter-content blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #666;
        }
      `}</style>
    </>
  )
}
