import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, Bot, Loader2, ExternalLink, CheckCircle2,
  XCircle, Send, Link, UserPlus
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const REGIONS = [
  { value: 'korea', label: '한국', flag: '🇰🇷' },
  { value: 'japan', label: '일본', flag: '🇯🇵' },
  { value: 'us', label: '미국', flag: '🇺🇸' }
]

const NAV_ITEMS = [
  { path: '/admin/openclo', label: '계정 조회' },
  { path: '/admin/openclo/creators', label: '크리에이터 목록' },
  { path: '/admin/openclo/report', label: '오류 수정 요청' }
]

export function OpenCloNav({ currentRegion, onRegionChange }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">OpenClo</h1>
            <p className="text-xs text-gray-400">크리에이터 회원 조회</p>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {REGIONS.map(r => (
            <button
              key={r.value}
              onClick={() => onRegionChange(r.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentRegion === r.value
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.flag} {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 border-b">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              location.pathname === item.path
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function OpenCloDashboard() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState(null) // { found, registered, creator, registeredUser }
  const [sending, setSending] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [registeredCount, setRegisteredCount] = useState(0)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle()
      if (!admin) navigate('/admin/login')
    }
    checkAuth()
  }, [navigate])

  const fetchStats = useCallback(async () => {
    const { count: total } = await supabaseBiz
      .from('oc_creators')
      .select('*', { count: 'exact', head: true })
      .eq('region', region)
    setTotalCount(total || 0)

    const { count: reg } = await supabaseBiz
      .from('oc_creators')
      .select('*', { count: 'exact', head: true })
      .eq('region', region)
      .eq('is_registered', true)
    setRegisteredCount(reg || 0)
  }, [region])

  useEffect(() => { fetchStats() }, [fetchStats])

  // URL에서 플랫폼/유저네임 파싱
  const parseInput = (input) => {
    const trimmed = input.trim()
    let platform = ''
    let username = ''

    if (trimmed.includes('instagram.com')) {
      platform = 'instagram'
      const match = trimmed.match(/instagram\.com\/([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      platform = 'youtube'
      const match = trimmed.match(/youtube\.com\/(?:@|channel\/|c\/)?([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    } else if (trimmed.includes('tiktok.com')) {
      platform = 'tiktok'
      const match = trimmed.match(/tiktok\.com\/@?([^/?#]+)/)
      if (match) username = match[1].replace('@', '')
    } else {
      // URL이 아니면 유저네임으로 취급
      username = trimmed.replace('@', '')
    }

    return { platform, username }
  }

  const handleSearch = async () => {
    if (!searchInput.trim()) return
    setSearching(true)
    setResult(null)

    try {
      const { platform, username } = parseInput(searchInput)
      if (!username) {
        setResult({ found: false, message: '유저네임을 인식할 수 없습니다.' })
        setSearching(false)
        return
      }

      // 1. oc_creators 테이블에서 검색
      let query = supabaseBiz.from('oc_creators').select('*')
      if (platform) {
        query = query.eq('platform', platform).eq('region', region)
      }
      query = query.ilike('username', username)

      const { data: ocCreators } = await query
      const ocCreator = ocCreators?.[0]

      // 2. featured_creators 테이블에서도 검색
      let fcQuery = supabaseBiz.from('featured_creators').select('*')
      if (platform === 'instagram') {
        fcQuery = fcQuery.or(`instagram_handle.ilike.%${username}%,instagram_url.ilike.%${username}%`)
      } else if (platform === 'youtube') {
        fcQuery = fcQuery.or(`youtube_handle.ilike.%${username}%,youtube_url.ilike.%${username}%`)
      } else if (platform === 'tiktok') {
        fcQuery = fcQuery.or(`tiktok_handle.ilike.%${username}%,tiktok_url.ilike.%${username}%`)
      } else {
        // 플랫폼 모르면 전체 검색
        fcQuery = fcQuery.or(`instagram_handle.ilike.%${username}%,youtube_handle.ilike.%${username}%,tiktok_handle.ilike.%${username}%,name.ilike.%${username}%`)
      }

      const { data: fcResults } = await fcQuery
      const fcCreator = fcResults?.[0]

      // 3. companies 테이블에서도 검색 (SNS 정보)
      let compQuery = supabaseBiz.from('companies').select('*')
      compQuery = compQuery.or(`instagram_url.ilike.%${username}%,youtube_url.ilike.%${username}%,tiktok_url.ilike.%${username}%,company_name.ilike.%${username}%`)
      const { data: compResults } = await compQuery
      const company = compResults?.[0]

      if (fcCreator || company) {
        // CNEC에 가입된 회원
        setResult({
          found: true,
          registered: true,
          creator: ocCreator,
          registeredUser: fcCreator || company,
          type: fcCreator ? 'creator' : 'company',
          username,
          platform
        })
      } else if (ocCreator) {
        // oc_creators에는 있지만 CNEC 미가입
        setResult({
          found: true,
          registered: ocCreator.is_registered || false,
          creator: ocCreator,
          registeredUser: null,
          username,
          platform
        })
      } else {
        // 어디에도 없음
        setResult({
          found: false,
          username,
          platform,
          message: `@${username} 정보를 찾을 수 없습니다.`
        })
      }
    } catch (err) {
      console.error('Search error:', err)
      setResult({ found: false, message: '검색 중 오류가 발생했습니다.' })
    } finally {
      setSearching(false)
    }
  }

  // 크넥 소개 이메일 발송
  const handleSendIntroEmail = async (email, name) => {
    if (!email) {
      alert('이메일 주소가 없습니다.')
      return
    }
    if (!confirm(`${email}로 크넥 소개 이메일을 보내시겠습니까?`)) return

    setSending(true)
    try {
      const res = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: '크넥(CNEC) - 크리에이터 마케팅 플랫폼을 소개합니다',
          html: buildIntroEmailHtml(name || '크리에이터')
        })
      })

      const data = await res.json()
      if (data.success) {
        alert('크넥 소개 이메일이 발송되었습니다!')
        // oc_creators에 컨택 상태 업데이트
        if (result?.creator?.id) {
          await supabaseBiz
            .from('oc_creators')
            .update({ contact_status: 'email_1' })
            .eq('id', result.creator.id)
        }
      } else {
        alert('발송 실패: ' + (data.error || 'Unknown'))
      }
    } catch (err) {
      alert('발송 실패: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // 미등록 크리에이터를 oc_creators에 저장
  const handleRegisterCreator = async () => {
    if (!result || result.found) return
    const { platform, username } = result

    try {
      let platformUrl = ''
      if (platform === 'instagram') platformUrl = `https://instagram.com/${username}`
      else if (platform === 'youtube') platformUrl = `https://youtube.com/@${username}`
      else if (platform === 'tiktok') platformUrl = `https://tiktok.com/@${username}`

      const { error } = await supabaseBiz.from('oc_creators').insert({
        region,
        platform: platform || 'unknown',
        platform_url: platformUrl,
        username,
        discovered_by: 'manual',
        status: 'approved'
      })

      if (error) throw error
      alert('크리에이터가 등록되었습니다.')
      fetchStats()
      handleSearch() // 재검색
    } catch (err) {
      if (err.code === '23505') alert('이미 등록된 크리에이터입니다.')
      else alert('등록 실패: ' + err.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">전체 크리에이터</p>
                  <p className="text-2xl font-bold">{totalCount}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">CNEC 가입 확인</p>
                  <p className="text-2xl font-bold text-green-600">{registeredCount}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">미가입</p>
                  <p className="text-2xl font-bold text-gray-400">{totalCount - registeredCount}</p>
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SNS 계정 조회 */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search className="w-4 h-4" />
              SNS 계정으로 회원 조회
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              유튜브, 인스타그램, 틱톡 URL 또는 유저네임을 입력하면 CNEC 가입 여부를 확인합니다.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="https://instagram.com/username 또는 @username"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-11"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching || !searchInput.trim()} className="h-11 px-6">
                {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                조회
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 조회 결과 */}
        {result && (
          <Card>
            <CardContent className="p-6">
              {result.found && result.registered ? (
                // 가입된 회원
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-700">CNEC 가입 회원입니다</h3>
                      <p className="text-sm text-gray-500">@{result.username} ({result.platform || '전체'})</p>
                    </div>
                  </div>

                  {result.registeredUser && (
                    <div className="bg-green-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">이름</span>
                        <span className="font-medium">{result.registeredUser.name || result.registeredUser.company_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">이메일</span>
                        <span className="font-medium">{result.registeredUser.email || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">유형</span>
                        <span className="font-medium">{result.type === 'creator' ? '크리에이터' : '기업'}</span>
                      </div>
                      {result.registeredUser.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">연락처</span>
                          <span className="font-medium">{result.registeredUser.phone}</span>
                        </div>
                      )}
                      {result.registeredUser.followers && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">팔로워</span>
                          <span className="font-medium">{formatFollowers(result.registeredUser.followers)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : result.found && !result.registered ? (
                // oc_creators에는 있지만 CNEC 미가입
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-amber-700">CNEC 미가입 크리에이터</h3>
                      <p className="text-sm text-gray-500">@{result.username} - 크넥에 아직 가입하지 않았습니다</p>
                    </div>
                  </div>

                  {result.creator && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">플랫폼</span>
                        <span className="font-medium">{result.creator.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">이름</span>
                        <span className="font-medium">{result.creator.full_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">팔로워</span>
                        <span className="font-medium">{formatFollowers(result.creator.followers)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">이메일</span>
                        <span className="font-medium">{result.creator.email || '없음'}</span>
                      </div>
                      {result.creator.platform_url && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">프로필</span>
                          <a href={result.creator.platform_url} target="_blank" rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1">
                            바로가기 <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {result.creator?.email && (
                    <Button
                      onClick={() => handleSendIntroEmail(result.creator.email, result.creator.full_name)}
                      disabled={sending}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      크넥 소개 이메일 발송
                    </Button>
                  )}
                </div>
              ) : (
                // 어디에도 없음
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-600">{result.message || '찾을 수 없습니다'}</h3>
                      <p className="text-sm text-gray-400">CNEC 데이터베이스에 정보가 없습니다</p>
                    </div>
                  </div>

                  {result.username && result.platform && (
                    <Button variant="outline" onClick={handleRegisterCreator}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      @{result.username} 크리에이터 목록에 추가
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function formatFollowers(n) {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function buildIntroEmailHtml(name) {
  return `
    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7c3aed; font-size: 28px; margin: 0;">CNEC</h1>
        <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">크리에이터 마케팅 플랫폼</p>
      </div>

      <p style="font-size: 16px; color: #111827; line-height: 1.8;">
        안녕하세요 <strong>${name}</strong>님,<br><br>
        크넥(CNEC)은 크리에이터와 브랜드를 연결하는 마케팅 플랫폼입니다.
      </p>

      <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #7c3aed; margin-top: 0;">크넥과 함께하면</h3>
        <ul style="color: #374151; line-height: 2; padding-left: 20px;">
          <li>다양한 브랜드의 캠페인에 참여할 수 있습니다</li>
          <li>공정한 보상 시스템으로 수익을 창출할 수 있습니다</li>
          <li>전문적인 크리에이터 프로필을 만들 수 있습니다</li>
          <li>간편한 계약 및 정산 시스템을 이용할 수 있습니다</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://cnecbiz.com/signup"
          style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #9333ea); color: white; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
          크넥 가입하기
        </a>
      </div>

      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
        궁금한 점이 있으시면 언제든 문의해 주세요.<br>
        감사합니다.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        주식회사 하우파파 (HOWPAPA Inc.) | cnecbiz.com
      </p>
    </div>
  `
}
