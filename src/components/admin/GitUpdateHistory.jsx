import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  GitCommit,
  GitBranch,
  Calendar,
  User,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bug,
  Wrench,
  FileText,
  Zap,
  Package,
  FlaskConical,
  Paintbrush,
  Clock
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'

// 커밋 타입별 아이콘 매핑
const TYPE_ICONS = {
  feat: Sparkles,
  fix: Bug,
  chore: Wrench,
  refactor: RefreshCw,
  docs: FileText,
  style: Paintbrush,
  test: FlaskConical,
  perf: Zap,
  ci: GitBranch,
  build: Package,
  other: GitCommit
}

// 커밋 타입별 색상 클래스
const TYPE_COLORS = {
  feat: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  fix: 'bg-red-100 text-red-700 border-red-300',
  chore: 'bg-gray-100 text-gray-700 border-gray-300',
  refactor: 'bg-blue-100 text-blue-700 border-blue-300',
  docs: 'bg-purple-100 text-purple-700 border-purple-300',
  style: 'bg-pink-100 text-pink-700 border-pink-300',
  test: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  perf: 'bg-orange-100 text-orange-700 border-orange-300',
  ci: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  build: 'bg-amber-100 text-amber-700 border-amber-300',
  other: 'bg-slate-100 text-slate-700 border-slate-300'
}

export default function GitUpdateHistory() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [commits, setCommits] = useState([])
  const [groupedByDate, setGroupedByDate] = useState({})
  const [typeStats, setTypeStats] = useState({})
  const [selectedType, setSelectedType] = useState('all')
  const [expandedDates, setExpandedDates] = useState({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)

  // 관리자 인증 체크
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/admin/login')
      return
    }
    fetchCommits()
  }

  // 커밋 데이터 가져오기
  const fetchCommits = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true)
      else setRefreshing(true)

      const response = await fetch(`/.netlify/functions/fetch-github-commits?page=${pageNum}&per_page=50`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '커밋 정보를 가져오는데 실패했습니다.')
      }

      const { commits: newCommits, groupedByDate: newGrouped, typeStats: newStats, pagination } = result.data

      if (append) {
        setCommits(prev => [...prev, ...newCommits])
        // 날짜별 그룹 병합
        setGroupedByDate(prev => {
          const merged = { ...prev }
          Object.entries(newGrouped).forEach(([date, dateCommits]) => {
            if (merged[date]) {
              merged[date] = [...merged[date], ...dateCommits]
            } else {
              merged[date] = dateCommits
            }
          })
          return merged
        })
        // 타입 통계 병합
        setTypeStats(prev => {
          const merged = { ...prev }
          Object.entries(newStats).forEach(([type, count]) => {
            merged[type] = (merged[type] || 0) + count
          })
          return merged
        })
      } else {
        setCommits(newCommits)
        setGroupedByDate(newGrouped)
        setTypeStats(newStats)
        // 첫 로드시 모든 날짜 펼치기
        const expanded = {}
        Object.keys(newGrouped).forEach(date => {
          expanded[date] = true
        })
        setExpandedDates(expanded)
      }

      setHasMore(pagination.hasMore)
      setPage(pageNum)
      setError(null)
    } catch (err) {
      console.error('Error fetching commits:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 새로고침
  const handleRefresh = () => {
    setPage(1)
    fetchCommits(1, false)
  }

  // 더 불러오기
  const loadMore = () => {
    if (!refreshing && hasMore) {
      fetchCommits(page + 1, true)
    }
  }

  // 날짜 토글
  const toggleDate = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // 필터링된 커밋
  const getFilteredCommits = (dateCommits) => {
    if (selectedType === 'all') return dateCommits
    return dateCommits.filter(c => c.type === selectedType)
  }

  // 날짜 포맷
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split('T')[0]) {
      return '오늘'
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '어제'
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  // 시간 포맷
  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 상대 시간
  const getRelativeTime = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return formatDate(dateStr)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">업데이트 히스토리를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                대시보드
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <GitCommit className="w-5 h-5 text-purple-600" />
                  업데이트 히스토리
                </h1>
                <p className="text-sm text-gray-500">GitHub 커밋 기록을 날짜별/기능별로 확인합니다</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <button
            onClick={() => setSelectedType('all')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedType === 'all'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <GitCommit className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-500">전체</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{commits.length}</p>
          </button>

          {Object.entries(typeStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => {
            const Icon = TYPE_ICONS[type] || GitCommit
            const colorClass = TYPE_COLORS[type] || TYPE_COLORS.other
            const labels = {
              feat: '새 기능',
              fix: '버그 수정',
              chore: '기타',
              refactor: '리팩토링',
              docs: '문서',
              style: '스타일',
              test: '테스트',
              perf: '성능',
              other: '기타'
            }

            return (
              <button
                key={type}
                onClick={() => setSelectedType(type === selectedType ? 'all' : type)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedType === type
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium text-gray-500">{labels[type] || type}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </button>
            )
          })}
        </div>

        {/* 필터 표시 */}
        {selectedType !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">필터:</span>
            <Badge className={TYPE_COLORS[selectedType]}>
              {selectedType}
            </Badge>
            <button
              onClick={() => setSelectedType('all')}
              className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
            >
              필터 해제
            </button>
          </div>
        )}

        {/* 날짜별 커밋 목록 */}
        <div className="space-y-4">
          {Object.entries(groupedByDate)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, dateCommits]) => {
              const filteredCommits = getFilteredCommits(dateCommits)
              if (filteredCommits.length === 0) return null

              const isExpanded = expandedDates[date]

              return (
                <Card key={date} className="overflow-hidden">
                  <button
                    onClick={() => toggleDate(date)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900">{formatDate(date)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {filteredCommits.length}개 커밋
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {filteredCommits.map((commit) => {
                          const Icon = TYPE_ICONS[commit.type] || GitCommit

                          return (
                            <div
                              key={commit.sha}
                              className="p-4 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                {/* 타입 아이콘 */}
                                <div className={`p-2 rounded-lg ${TYPE_COLORS[commit.type]} border`}>
                                  <Icon className="w-4 h-4" />
                                </div>

                                {/* 커밋 정보 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 break-words">
                                        {commit.message.subject}
                                      </p>
                                      {commit.message.description && (
                                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                                          {commit.message.description}
                                        </p>
                                      )}
                                    </div>
                                    <a
                                      href={commit.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                      title="GitHub에서 보기"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>

                                  {/* 메타 정보 */}
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <GitCommit className="w-3.5 h-3.5" />
                                      <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                        {commit.shortSha}
                                      </code>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="w-3.5 h-3.5" />
                                      {commit.author.name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {formatTime(commit.date)}
                                    </span>
                                    {commit.scope && (
                                      <Badge variant="outline" className="text-xs">
                                        {commit.scope}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
        </div>

        {/* 더 불러오기 */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  불러오는 중...
                </>
              ) : (
                <>
                  더 불러오기
                  <ChevronDown className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-600">
          <p>이 페이지는 GitHub API를 통해 실시간으로 커밋 기록을 가져옵니다.</p>
          <p className="mt-1">새로고침 버튼을 클릭하면 최신 업데이트를 확인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
