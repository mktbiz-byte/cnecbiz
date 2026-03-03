import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield, Plus, Edit, Trash2, Loader2, ToggleLeft, ToggleRight,
  History, RotateCcw, AlertTriangle, Ban
} from 'lucide-react'

import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

const RULE_TYPE_LABELS = {
  allowed_topic: '허용 주제',
  blocked_topic: '금지 주제',
  escalation_trigger: '에스컬레이션 트리거',
  tone_rule: '톤/말투 규칙',
  response_limit: '응답 제한'
}

const RULE_TYPE_COLORS = {
  allowed_topic: 'bg-[#00B894]/10 text-[#00B894]',
  blocked_topic: 'bg-[#D63031]/10 text-[#D63031]',
  escalation_trigger: 'bg-[#FDCB6E]/10 text-[#E17055]',
  tone_rule: 'bg-[#6C5CE7]/10 text-[#6C5CE7]',
  response_limit: 'bg-[#636E72]/10 text-[#636E72]'
}

export default function ChatbotGuardrails() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [guardrails, setGuardrails] = useState([])
  const [blockedPatterns, setBlockedPatterns] = useState([])
  const [botType, setBotType] = useState('creator')
  const [activeTab, setActiveTab] = useState('guardrails') // guardrails | patterns | audit
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ rule_type: 'escalation_trigger', rule_value: '', description: '', priority: 0 })
  const [patternForm, setPatternForm] = useState({ pattern: '', pattern_type: 'keyword', reason: '' })
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) { navigate('/admin/login'); return }
      fetchAll()
    }
    checkAuth()
  }, [navigate])

  useEffect(() => { fetchAll() }, [botType])

  const fetchAll = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchGuardrails(), fetchPatterns(), fetchAuditLogs()])
    } finally {
      setLoading(false)
    }
  }

  const fetchGuardrails = async () => {
    const res = await fetch('/.netlify/functions/chatbot-manage-guardrails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', bot_type: botType })
    })
    const result = await res.json()
    if (result.success) setGuardrails(result.data || [])
  }

  const fetchPatterns = async () => {
    const res = await fetch('/.netlify/functions/chatbot-manage-blocked-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' })
    })
    const result = await res.json()
    if (result.success) setBlockedPatterns(result.data || [])
  }

  const fetchAuditLogs = async () => {
    const res = await fetch('/.netlify/functions/chatbot-audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_table: 'chatbot_guardrails', limit: 20 })
    })
    const result = await res.json()
    if (result.success) setAuditLogs(result.data.items || [])
  }

  const handleSaveGuardrail = async () => {
    if (!form.rule_value) return
    setSaving(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      await fetch('/.netlify/functions/chatbot-manage-guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editItem ? 'update' : 'create',
          adminEmail: user?.email,
          bot_type: botType,
          ...(editItem && { id: editItem.id }),
          ...form
        })
      })
      setShowModal(false)
      fetchAll()
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleGuardrail = async (id) => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    await fetch('/.netlify/functions/chatbot-manage-guardrails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id, adminEmail: user?.email })
    })
    fetchGuardrails()
  }

  const handleDeleteGuardrail = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { data: { user } } = await supabaseBiz.auth.getUser()
    await fetch('/.netlify/functions/chatbot-manage-guardrails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, adminEmail: user?.email })
    })
    fetchAll()
  }

  const handleSavePattern = async () => {
    if (!patternForm.pattern) return
    setSaving(true)
    try {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      await fetch('/.netlify/functions/chatbot-manage-blocked-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', adminEmail: user?.email, ...patternForm })
      })
      setShowPatternModal(false)
      setPatternForm({ pattern: '', pattern_type: 'keyword', reason: '' })
      fetchPatterns()
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePattern = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await fetch('/.netlify/functions/chatbot-manage-blocked-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id })
    })
    fetchPatterns()
  }

  // 규칙 유형별 그룹핑
  const groupedRules = {}
  guardrails.forEach(g => {
    if (!groupedRules[g.rule_type]) groupedRules[g.rule_type] = []
    groupedRules[g.rule_type].push(g)
  })

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8 lg:ml-60">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Outfit', sans-serif" }}>기준틀 관리</h1>
              <p className="text-sm text-[#636E72] mt-1">챗봇 응답 규칙 및 보안 패턴</p>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex bg-white rounded-xl border border-[#DFE6E9] p-1">
              {['creator', 'business'].map(t => (
                <button key={t} onClick={() => setBotType(t)}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-all ${botType === t ? 'bg-[#6C5CE7] text-white' : 'text-[#636E72] hover:bg-[#F0EDFF]'}`}>
                  {t === 'creator' ? '크리에이터' : '기업'}
                </button>
              ))}
            </div>

            <div className="flex bg-white rounded-xl border border-[#DFE6E9] p-1 ml-2">
              {[
                { key: 'guardrails', label: '기준틀', icon: Shield },
                { key: 'patterns', label: '차단 패턴', icon: Ban },
                { key: 'audit', label: '변경 이력', icon: History }
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-1 ${activeTab === tab.key ? 'bg-[#6C5CE7] text-white' : 'text-[#636E72] hover:bg-[#F0EDFF]'}`}>
                  <tab.icon className="w-3 h-3" /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" /></div>
          ) : activeTab === 'guardrails' ? (
            /* 기준틀 */
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => { setEditItem(null); setForm({ rule_type: 'escalation_trigger', rule_value: '', description: '', priority: 0 }); setShowModal(true) }}
                  className="gap-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                  <Plus className="w-4 h-4" /> 규칙 추가
                </Button>
              </div>

              {Object.entries(RULE_TYPE_LABELS).map(([type, label]) => (
                <Card key={type} className="border-[#DFE6E9] rounded-2xl shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2">
                      <Badge className={`text-xs ${RULE_TYPE_COLORS[type]}`}>{label}</Badge>
                      <span className="text-[#B2BEC3] font-normal">{(groupedRules[type] || []).length}개</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {!(groupedRules[type] || []).length ? (
                      <p className="text-sm text-[#B2BEC3]">등록된 규칙이 없습니다</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(groupedRules[type] || []).map(rule => (
                          <div key={rule.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${rule.is_active ? 'border-[#DFE6E9] bg-white' : 'border-[#DFE6E9] bg-[#F8F9FA] opacity-50'}`}>
                            <span>{rule.rule_value}</span>
                            <button onClick={() => handleToggleGuardrail(rule.id)} className="text-[#B2BEC3] hover:text-[#6C5CE7]">
                              {rule.is_active ? <ToggleRight className="w-4 h-4 text-[#00B894]" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => { setEditItem(rule); setForm({ rule_type: rule.rule_type, rule_value: rule.rule_value, description: rule.description || '', priority: rule.priority || 0 }); setShowModal(true) }}
                              className="text-[#B2BEC3] hover:text-[#6C5CE7]"><Edit className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteGuardrail(rule.id)}
                              className="text-[#B2BEC3] hover:text-[#D63031]"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeTab === 'patterns' ? (
            /* 차단 패턴 */
            <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-[#1A1A2E]">프롬프트 인젝션 차단 패턴</CardTitle>
                  <Button onClick={() => setShowPatternModal(true)} size="sm" className="gap-1 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                    <Plus className="w-3 h-3" /> 패턴 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#DFE6E9]">
                  {blockedPatterns.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs" variant="outline">{p.pattern_type}</Badge>
                        <code className="text-sm bg-[#F8F9FA] px-2 py-0.5 rounded">{p.pattern}</code>
                        {p.reason && <span className="text-xs text-[#B2BEC3]">— {p.reason}</span>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeletePattern(p.id)} className="h-7 w-7 p-0">
                        <Trash2 className="w-3 h-3 text-[#D63031]" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 감사 로그 */
            <Card className="border-[#DFE6E9] rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#1A1A2E]">변경 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[#B2BEC3] text-center py-8">변경 이력이 없습니다</p>
                ) : (
                  <div className="divide-y divide-[#DFE6E9]">
                    {auditLogs.map(log => (
                      <div key={log.id} className="py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge className="text-xs" variant="outline">{log.action}</Badge>
                          <span className="text-[#636E72]">{log.admin_email}</span>
                          <span className="text-[#B2BEC3] ml-auto text-xs">
                            {new Date(log.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                          </span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-xs text-[#B2BEC3] mt-1">{JSON.stringify(log.details)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 기준틀 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">{editItem ? '규칙 수정' : '규칙 추가'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#636E72]">규칙 유형</label>
                <select value={form.rule_type} onChange={e => setForm(p => ({ ...p, rule_type: e.target.value }))}
                  className="mt-1 w-full text-sm border border-[#DFE6E9] rounded-lg px-3 py-2 bg-white">
                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">규칙 값</label>
                <Input value={form.rule_value} onChange={e => setForm(p => ({ ...p, rule_value: e.target.value }))} className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">설명</label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowModal(false)} className="rounded-xl border-[#DFE6E9]">취소</Button>
              <Button onClick={handleSaveGuardrail} disabled={saving} className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 차단 패턴 모달 */}
      {showPatternModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPatternModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">차단 패턴 추가</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[#636E72]">패턴</label>
                <Input value={patternForm.pattern} onChange={e => setPatternForm(p => ({ ...p, pattern: e.target.value }))} placeholder="ignore previous instructions" className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">유형</label>
                <select value={patternForm.pattern_type} onChange={e => setPatternForm(p => ({ ...p, pattern_type: e.target.value }))}
                  className="mt-1 w-full text-sm border border-[#DFE6E9] rounded-lg px-3 py-2 bg-white">
                  <option value="keyword">키워드</option>
                  <option value="regex">정규식</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[#636E72]">사유</label>
                <Input value={patternForm.reason} onChange={e => setPatternForm(p => ({ ...p, reason: e.target.value }))} className="mt-1 rounded-lg border-[#DFE6E9]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setShowPatternModal(false)} className="rounded-xl border-[#DFE6E9]">취소</Button>
              <Button onClick={handleSavePattern} disabled={saving} className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD6]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
