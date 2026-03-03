import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FileCode, Loader2, Save, Play, History, CheckCircle2,
  Plus, RotateCcw, Zap
} from 'lucide-react'

import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotPromptManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [prompts, setPrompts] = useState([])
  const [botType, setBotType] = useState('creator')
  const [activePrompt, setActivePrompt] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [toneConfig, setToneConfig] = useState({ formality: 'polite', emoji_level: 'moderate' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testQuestion, setTestQuestion] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [showVersions, setShowVersions] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) { navigate('/admin/login'); return }
      fetchPrompts()
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchPrompts() }, [botType])

  const fetchPrompts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/chatbot-manage-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', bot_type: botType })
      })
      const result = await res.json()
      if (result.success) {
        setPrompts(result.data || [])
        const active = (result.data || []).find(p => p.is_active)
        if (active) {
          setActivePrompt(active)
          setEditContent(active.system_prompt)
          setToneConfig(active.tone_config || { formality: 'polite', emoji_level: 'moderate' })
        } else {
          setActivePrompt(null)
          setEditContent(botType === 'creator' ? DEFAULT_CREATOR_PROMPT : DEFAULT_BUSINESS_PROMPT)
        }
      }
    } catch (err) {
      console.error('Prompts fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editContent.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      await fetch('/.netlify/functions/chatbot-manage-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          adminEmail: user?.email,
          bot_type: botType,
          system_prompt: editContent,
          tone_config: toneConfig
        })
      })
      await fetchPrompts()
      setTestResult(null)
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testQuestion.trim() || !editContent.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/.netlify/functions/chatbot-test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_type: botType,
          system_prompt: editContent,
          test_question: testQuestion,
          tone_config: toneConfig
        })
      })
      const result = await res.json()
      if (result.success) {
        setTestResult(result.data)
      } else {
        setTestResult({ error: result.error })
      }
    } catch (err) {
      setTestResult({ error: err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleActivateVersion = async (id) => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    await fetch('/.netlify/functions/chatbot-manage-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate', id, bot_type: botType, adminEmail: user?.email })
    })
    await fetchPrompts()
    setShowVersions(false)
  }

  const loadVersion = (prompt) => {
    setEditContent(prompt.system_prompt)
    setToneConfig(prompt.tone_config || { formality: 'polite', emoji_level: 'moderate' })
    setShowVersions(false)
  }

  const VARIABLES = [
    { name: '{bot_type}', desc: '봇 유형 (creator/business)' },
    { name: '{faq_data}', desc: 'FAQ 데이터 (자동 주입)' },
    { name: '{guardrails}', desc: '기준틀 규칙 (자동 주입)' },
    { name: '{user_name}', desc: '사용자 이름 (연동 시)' },
    { name: '{current_date}', desc: '현재 날짜' }
  ]

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>프롬프트 관리</h1>
              <p className="text-sm text-[#636E72] mt-1">AI 챗봇 시스템 프롬프트 편집 및 테스트</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowVersions(!showVersions)} variant="outline" className="gap-2 rounded-xl border-[#DFE6E9]">
                <History className="w-4 h-4" /> 버전 이력 ({prompts.length})
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 새 버전 저장
              </Button>
            </div>
          </div>

          {/* 봇 유형 탭 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex bg-white rounded-xl border border-[#DFE6E9] p-1">
              {['creator', 'business'].map(t => (
                <button key={t} onClick={() => setBotType(t)}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-all ${botType === t ? 'bg-[#6C5CE7] text-white' : 'text-[#636E72] hover:bg-[#F0EDFF]'}`}>
                  {t === 'creator' ? '크리에이터' : '기업'}
                </button>
              ))}
            </div>
            {activePrompt && (
              <Badge className="text-xs bg-[#00B894]/10 text-[#00B894]">
                활성 v{activePrompt.version}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* 에디터 영역 */}
              <div className="lg:col-span-3 space-y-4">
                <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold text-[#1A1A2E]">시스템 프롬프트</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={16}
                      className="w-full rounded-lg border border-[#DFE6E9] px-4 py-3 text-sm font-mono leading-relaxed resize-y"
                      placeholder="시스템 프롬프트를 입력하세요..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-[#B2BEC3]">{editContent.length}자</span>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-[#636E72]">공손함:</label>
                        <select value={toneConfig.formality}
                          onChange={e => setToneConfig(p => ({ ...p, formality: e.target.value }))}
                          className="text-xs border border-[#DFE6E9] rounded px-2 py-1">
                          <option value="casual">캐주얼</option>
                          <option value="polite">정중</option>
                          <option value="formal">격식체</option>
                        </select>
                        <label className="text-xs text-[#636E72]">이모지:</label>
                        <select value={toneConfig.emoji_level}
                          onChange={e => setToneConfig(p => ({ ...p, emoji_level: e.target.value }))}
                          className="text-xs border border-[#DFE6E9] rounded px-2 py-1">
                          <option value="none">없음</option>
                          <option value="moderate">적당히</option>
                          <option value="frequent">자주</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 테스트 영역 */}
                <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#6C5CE7]" /> 프롬프트 테스트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={testQuestion}
                        onChange={e => setTestQuestion(e.target.value)}
                        placeholder="테스트 질문 입력..."
                        className="rounded-lg border-[#DFE6E9]"
                        onKeyDown={e => e.key === 'Enter' && handleTest()}
                      />
                      <Button onClick={handleTest} disabled={testing || !testQuestion}
                        className="gap-2 rounded-lg bg-[#6C5CE7] hover:bg-[#5A4BD6] whitespace-nowrap">
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 테스트
                      </Button>
                    </div>

                    {testResult && (
                      <div className="mt-3 bg-[#F8F9FA] rounded-xl p-4">
                        {testResult.error ? (
                          <p className="text-sm text-[#D63031]">{testResult.error}</p>
                        ) : (
                          <>
                            <p className="text-sm text-[#1A1A2E] whitespace-pre-wrap">{testResult.response}</p>
                            <div className="flex gap-3 mt-2 text-xs text-[#B2BEC3]">
                              <span>응답 시간: {testResult.responseTime}</span>
                              <span>모델: {testResult.model}</span>
                              <span>기준틀: {testResult.guardrailsApplied}개</span>
                              <span>FAQ 참조: {testResult.faqsIncluded}개</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 사이드바 */}
              <div className="space-y-4">
                {/* 변수 목록 */}
                <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold text-[#1A1A2E]">사용 가능 변수</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {VARIABLES.map(v => (
                      <button
                        key={v.name}
                        onClick={() => setEditContent(prev => prev + ' ' + v.name)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#F0EDFF] transition-colors"
                      >
                        <code className="text-xs text-[#6C5CE7]">{v.name}</code>
                        <p className="text-xs text-[#B2BEC3]">{v.desc}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* 버전 이력 */}
                {showVersions && (
                  <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-semibold text-[#1A1A2E]">버전 이력</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                      {prompts.map(p => (
                        <div key={p.id} className={`p-2.5 rounded-lg border ${p.is_active ? 'border-[#6C5CE7] bg-[#F0EDFF]' : 'border-[#DFE6E9]'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif" }}>v{p.version}</span>
                              {p.is_active && <CheckCircle2 className="w-3 h-3 text-[#00B894]" />}
                            </div>
                            <span className="text-xs text-[#B2BEC3]">
                              {new Date(p.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-xs text-[#636E72] line-clamp-2">{p.system_prompt.substring(0, 100)}...</p>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="ghost" onClick={() => loadVersion(p)} className="h-6 text-xs px-2">
                              불러오기
                            </Button>
                            {!p.is_active && (
                              <Button size="sm" variant="ghost" onClick={() => handleActivateVersion(p.id)} className="h-6 text-xs px-2 text-[#6C5CE7]">
                                활성화
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const DEFAULT_CREATOR_PROMPT = `당신은 CNEC(크넥) 크리에이터 마케팅 플랫폼의 AI 상담 도우미입니다.

[역할]
- 크리에이터들의 캠페인 참여, 정산, 등급, 계약 등에 관한 질문에 답변합니다.
- 친근하고 밝은 존댓말을 사용합니다.
- 확인된 정보만 제공하고, 불확실한 내용은 담당자 연결을 안내합니다.

[규칙]
- CNEC 서비스 관련 주제만 응답합니다.
- 가격/조건은 DB에 등록된 정보만 안내합니다.
- 개인정보(전화번호, 계좌번호 등)는 절대 요청하거나 표시하지 않습니다.
- 환불/출금/계약분쟁/클레임 관련 문의는 즉시 담당자 연결을 안내합니다.
- 정치/종교 등 서비스와 무관한 주제는 정중히 거절합니다.`

const DEFAULT_BUSINESS_PROMPT = `당신은 CNEC(크넥) 비즈니스 AI 상담 도우미입니다.

[역할]
- 브랜드/기업 고객의 크리에이터 마케팅 상담을 돕습니다.
- 전문적이고 신뢰감 있는 비즈니스 톤으로 응답합니다.
- 서비스 소개, 캠페인 상담, 크리에이터 매칭, 결제/포인트 안내를 제공합니다.

[규칙]
- CNEC 서비스 관련 주제만 응답합니다.
- 요금/조건은 DB에 등록된 최신 정보만 안내합니다.
- 개인정보를 요청하거나 노출하지 않습니다.
- 환불/결제 문제/계약 분쟁/세금계산서 문제는 즉시 담당자 연결을 안내합니다.
- 경쟁사 비방이나 서비스와 무관한 주제는 정중히 거절합니다.`
