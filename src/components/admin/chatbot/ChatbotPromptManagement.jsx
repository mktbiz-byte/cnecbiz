import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Save, Play, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotPromptManagement() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [botType, setBotType] = useState('business')
  const [promptText, setPromptText] = useState('')
  const [toneFormality, setToneFormality] = useState('polite')
  const [toneEmoji, setToneEmoji] = useState('moderate')
  const [versions, setVersions] = useState([])
  const [activeVersion, setActiveVersion] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) { navigate('/admin/login'); return false }
    const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
    if (!admin) { navigate('/admin/login'); return false }
    return true
  }, [navigate])

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabaseBiz.from('chatbot_prompts')
        .select('*')
        .eq('bot_type', botType)
        .order('created_at', { ascending: false })

      setVersions(data || [])
      const active = (data || []).find(p => p.is_active)
      if (active) {
        setActiveVersion(active)
        setPromptText(active.system_prompt || '')
        const tone = active.tone_config || {}
        setToneFormality(tone.formality || 'polite')
        setToneEmoji(tone.emoji_level || 'moderate')
      } else {
        setPromptText('')
        setActiveVersion(null)
      }
    } catch (err) {
      console.error('프롬프트 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [botType])

  useEffect(() => {
    checkAuth().then(ok => ok && fetchPrompts())
  }, [checkAuth, fetchPrompts])

  const handleSave = async () => {
    if (!promptText.trim()) { alert('프롬프트를 입력하세요.'); return }
    setSaving(true)
    try {
      // 기존 활성 프롬프트 비활성화
      await supabaseBiz.from('chatbot_prompts')
        .update({ is_active: false })
        .eq('bot_type', botType)
        .eq('is_active', true)

      // 새 버전 삽입
      const { error } = await supabaseBiz.from('chatbot_prompts').insert({
        bot_type: botType,
        system_prompt: promptText.trim(),
        tone_config: { formality: toneFormality, emoji_level: toneEmoji },
        is_active: true,
        version: (versions.length > 0 ? Math.max(...versions.map(v => v.version || 0)) + 1 : 1),
      })
      if (error) throw error
      fetchPrompts()
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async (id) => {
    try {
      await supabaseBiz.from('chatbot_prompts').update({ is_active: false }).eq('bot_type', botType).eq('is_active', true)
      await supabaseBiz.from('chatbot_prompts').update({ is_active: true }).eq('id', id)
      fetchPrompts()
    } catch (err) {
      alert('활성화 실패: ' + err.message)
    }
  }

  const handleLoadVersion = (ver) => {
    setPromptText(ver.system_prompt || '')
    const tone = ver.tone_config || {}
    setToneFormality(tone.formality || 'polite')
    setToneEmoji(tone.emoji_level || 'moderate')
  }

  const handleTest = async () => {
    if (!testInput.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/.netlify/functions/chatbot-test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_type: botType,
          system_prompt: promptText,
          test_question: testInput,
          tone_config: { formality: toneFormality, emoji_level: toneEmoji }
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

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-7 h-7 text-[#6C5CE7]" />
            <h1 className="text-2xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>프롬프트 관리</h1>
          </div>

          {/* 경고 배너 */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              여기서 저장한 프롬프트는 DB에만 저장됩니다.
              실제 봇 반영은 GCP VM(34.64.201.13)의 /opt/cnec-bot/kakao_bot.py를 수정해야 합니다.
              현재 봇 말투 규칙: 넵!/네네!/:) 이모지 사용, 100자 이내, AI 봇 표시 금지
            </p>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            {['business', 'creator'].map(t => (
              <button key={t} onClick={() => setBotType(t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${botType === t ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                {t === 'business' ? '기업 (business)' : '크리에이터 (creator)'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* 에디터 영역 */}
              <div className="col-span-2 space-y-4">
                {/* 현재 VM 적용 프롬프트 미리보기 */}
                {activeVersion && (
                  <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-4">
                    <h3 className="text-sm font-medium text-[#636E72] mb-2">현재 활성 프롬프트 (v{activeVersion.version})</h3>
                    <p className="text-xs text-[#636E72] bg-[#F8F9FA] rounded-xl p-3 max-h-24 overflow-y-auto whitespace-pre-wrap">{activeVersion.system_prompt}</p>
                  </div>
                )}

                {/* 시스템 프롬프트 에디터 */}
                <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-[#2D3436] mb-3">시스템 프롬프트</h3>
                  <textarea
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    rows={10}
                    className="w-full border border-[#DFE6E9] rounded-xl p-3 text-sm focus:border-[#6C5CE7] focus:outline-none font-mono"
                    placeholder="시스템 프롬프트를 입력하세요..."
                  />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="text-sm text-[#636E72] block mb-1">공식도</label>
                      <select value={toneFormality} onChange={e => setToneFormality(e.target.value)}
                        className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
                        <option value="casual">캐주얼</option>
                        <option value="polite">정중</option>
                        <option value="formal">격식</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#636E72] block mb-1">이모지 레벨</label>
                      <select value={toneEmoji} onChange={e => setToneEmoji(e.target.value)}
                        className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
                        <option value="none">없음</option>
                        <option value="moderate">적당히</option>
                        <option value="frequent">자주</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장 (새 버전)
                  </button>
                </div>

                {/* 테스트 영역 */}
                <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
                  <h3 className="text-sm font-semibold text-[#2D3436] mb-3">테스트</h3>
                  <div className="flex gap-3">
                    <input
                      type="text" value={testInput} onChange={e => setTestInput(e.target.value)}
                      className="flex-1 border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
                      placeholder="테스트 질문을 입력하세요..."
                      onKeyDown={e => e.key === 'Enter' && handleTest()}
                    />
                    <button onClick={handleTest} disabled={testing || !testInput.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50">
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 테스트
                    </button>
                  </div>
                  {testResult && (
                    <div className="mt-4 bg-[#F8F9FA] rounded-xl p-4">
                      {testResult.error ? (
                        <p className="text-sm text-red-600">{testResult.error}</p>
                      ) : (
                        <>
                          <p className="text-sm text-[#2D3436] whitespace-pre-wrap">{testResult.response}</p>
                          <div className="mt-3 flex gap-4 text-xs text-[#636E72]">
                            <span>응답시간: {testResult.responseTime}</span>
                            <span>모델: {testResult.model}</span>
                            <span>기준틀: {testResult.guardrailsApplied}개</span>
                            <span>FAQ: {testResult.faqsIncluded}개</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 버전 히스토리 사이드바 */}
              <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6 h-fit">
                <h3 className="text-sm font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> 버전 히스토리
                </h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-[#636E72]">저장된 프롬프트가 없습니다.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {versions.map(ver => (
                      <div key={ver.id} className={`border rounded-xl p-3 ${ver.is_active ? 'border-[#6C5CE7] bg-[#F0EDFF]' : 'border-[#DFE6E9]'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>v{ver.version || '-'}</span>
                          {ver.is_active && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px]">활성</span>}
                        </div>
                        <p className="text-[11px] text-[#636E72] mb-2">{new Date(ver.created_at).toLocaleString('ko-KR')}</p>
                        <p className="text-xs text-[#636E72] line-clamp-2 mb-2">{ver.system_prompt}</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleLoadVersion(ver)}
                            className="text-[10px] px-2 py-1 border border-[#DFE6E9] rounded-lg text-[#636E72] hover:border-[#6C5CE7]">
                            불러오기
                          </button>
                          {!ver.is_active && (
                            <button onClick={() => handleActivate(ver.id)}
                              className="text-[10px] px-2 py-1 bg-[#6C5CE7] text-white rounded-lg hover:bg-[#5A4BD6]">
                              활성화
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
