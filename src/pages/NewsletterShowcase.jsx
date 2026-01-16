import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabaseBiz } from '../lib/supabaseClients'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Mail, Search, Calendar, Tag, ArrowLeft, Star, ExternalLink,
  Filter, ChevronLeft, ChevronRight, X, Lock, LogIn
} from 'lucide-react'

const CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: 'marketing', label: '마케팅 인사이트' },
  { value: 'insight', label: '산업 트렌드' },
  { value: 'case_study', label: '성공 사례' },
  { value: 'tips', label: '실용 팁' },
  { value: 'news', label: '업계 뉴스' },
  { value: 'other', label: '기타' }
]

const ITEMS_PER_PAGE = 12

export default function NewsletterShowcase() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [newsletters, setNewsletters] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all')
  const [currentPage, setCurrentPage] = useState(1)

  // 상세 보기 모달
  const [selectedNewsletter, setSelectedNewsletter] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 로그인 상태
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchNewsletters()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    // URL 파라미터 업데이트
    if (categoryFilter !== 'all') {
      setSearchParams({ category: categoryFilter })
    } else {
      setSearchParams({})
    }
    setCurrentPage(1)
  }, [categoryFilter])

  const fetchNewsletters = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseBiz
        .from('newsletters')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })

      if (error) throw error
      setNewsletters(data || [])
    } catch (error) {
      console.error('뉴스레터 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredNewsletters = newsletters.filter(newsletter => {
    const matchesSearch = !searchTerm ||
      newsletter.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newsletter.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      newsletter.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      categoryFilter === 'all' ||
      newsletter.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // 페이지네이션
  const totalPages = Math.ceil(filteredNewsletters.length / ITEMS_PER_PAGE)
  const paginatedNewsletters = filteredNewsletters.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const openDetail = async (newsletter) => {
    setSelectedNewsletter(newsletter)
    setShowDetailModal(true)

    // 회원 전용 콘텐츠가 아니거나 로그인한 경우에만 조회수 증가
    if (!newsletter.is_members_only || user) {
      try {
        await supabaseBiz
          .from('newsletters')
          .update({ view_count: (newsletter.view_count || 0) + 1 })
          .eq('id', newsletter.id)
      } catch (error) {
        console.error('조회수 업데이트 오류:', error)
      }
    }
  }

  // 회원 전용 콘텐츠 접근 가능 여부
  const canAccessContent = (newsletter) => {
    if (!newsletter.is_members_only) return true
    return !!user
  }

  const getCategoryLabel = (value) => {
    const cat = CATEGORIES.find(c => c.value === value)
    return cat ? cat.label : value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">뉴스레터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1)
                  } else {
                    navigate('/')
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">CNEC 뉴스레터</h1>
                  <p className="text-xs text-gray-500">인플루언서 마케팅 인사이트</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 검색 및 필터 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="제목, 설명, 태그로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={categoryFilter === cat.value ? 'bg-blue-600' : ''}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 추천 뉴스레터 (있는 경우) */}
        {categoryFilter === 'all' && filteredNewsletters.filter(n => n.is_featured).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              추천 뉴스레터
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNewsletters
                .filter(n => n.is_featured)
                .slice(0, 2)
                .map((newsletter) => (
                  <div
                    key={newsletter.id}
                    onClick={() => openDetail(newsletter)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white cursor-pointer hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      {newsletter.thumbnail_url ? (
                        <img
                          src={newsletter.thumbnail_url}
                          alt={newsletter.title}
                          className="w-24 h-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-white/20 rounded-xl flex items-center justify-center">
                          <Mail className="w-10 h-10 text-white/50" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                            <Star className="w-3 h-3" /> 추천
                          </span>
                          {newsletter.is_members_only && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/30 text-white">
                              <Lock className="w-3 h-3" /> 회원 전용
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1 group-hover:underline">
                          {newsletter.title}
                        </h3>
                        <p className="text-white/80 text-sm line-clamp-2">
                          {newsletter.description}
                        </p>
                        <div className="text-white/60 text-xs mt-2">
                          {newsletter.published_at
                            ? new Date(newsletter.published_at).toLocaleDateString('ko-KR')
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 뉴스레터 목록 */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {categoryFilter === 'all' ? '전체 뉴스레터' : getCategoryLabel(categoryFilter)}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredNewsletters.length}개)
            </span>
          </h2>

          {paginatedNewsletters.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">조건에 맞는 뉴스레터가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedNewsletters.map((newsletter) => (
                  <Card
                    key={newsletter.id}
                    onClick={() => openDetail(newsletter)}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group bg-white"
                  >
                    {/* 썸네일 */}
                    <div className="h-44 bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                      {newsletter.thumbnail_url ? (
                        <img
                          src={newsletter.thumbnail_url}
                          alt={newsletter.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mail className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        {newsletter.is_members_only && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white shadow">
                            <Lock className="w-3 h-3" /> 회원 전용
                          </span>
                        )}
                        {newsletter.is_featured && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900 shadow">
                            <Star className="w-3 h-3" /> 추천
                          </span>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-4">
                      {/* 카테고리 및 발행일 */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {getCategoryLabel(newsletter.category)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {newsletter.published_at
                            ? new Date(newsletter.published_at).toLocaleDateString('ko-KR')
                            : ''}
                        </span>
                      </div>

                      {/* 제목 */}
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {newsletter.title}
                      </h3>

                      {/* 설명 */}
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {newsletter.description || '인플루언서 마케팅에 대한 인사이트를 확인해보세요.'}
                      </p>

                      {/* 태그 */}
                      {newsletter.tags && newsletter.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {newsletter.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* SEO용 개별 페이지 링크 */}
                      <Link
                        to={`/newsletter/${newsletter.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 text-xs text-blue-600 hover:underline inline-block"
                      >
                        자세히 보기 →
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 상세 보기 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2 pr-8">
              {selectedNewsletter?.is_featured && (
                <Star className="w-5 h-5 text-yellow-500" />
              )}
              {selectedNewsletter?.is_members_only && (
                <Lock className="w-5 h-5 text-blue-600" />
              )}
              <span className="line-clamp-1">{selectedNewsletter?.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {selectedNewsletter?.is_members_only && !user ? (
              <div className="flex flex-col items-center justify-center h-[65vh] text-gray-500 p-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">회원 전용 콘텐츠</h3>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                  이 뉴스레터는 회원 전용 콘텐츠입니다.<br />
                  로그인 후 이용해주세요.
                </p>
                <Button
                  onClick={() => {
                    setShowDetailModal(false)
                    navigate('/login')
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인하기
                </Button>
              </div>
            ) : selectedNewsletter?.html_content ? (
              <div
                className="w-full h-[65vh] overflow-auto p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: selectedNewsletter.html_content }}
              />
            ) : selectedNewsletter?.stibee_url ? (
              <iframe
                src={selectedNewsletter.stibee_url}
                className="w-full h-[65vh] border-0"
                title={selectedNewsletter.title}
              />
            ) : (
              <div className="flex items-center justify-center h-[65vh] text-gray-500">
                콘텐츠를 불러올 수 없습니다.
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                {selectedNewsletter?.published_at && (
                  <>
                    발행일: {new Date(selectedNewsletter.published_at).toLocaleDateString('ko-KR')}
                  </>
                )}
                {selectedNewsletter?.issue_number && (
                  <> | {selectedNewsletter.issue_number}호</>
                )}
                {selectedNewsletter?.view_count !== undefined && (
                  <> | 조회 {selectedNewsletter.view_count}회</>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false)
                    navigate(`/newsletter/${selectedNewsletter?.id}`)
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  자세히 보기
                </Button>
                <Button onClick={() => setShowDetailModal(false)}>
                  닫기
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
