import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, Trash2, Loader2, AlertTriangle, FileText } from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'

export default function ChatbotGuardrails() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('escalation')
  const [botTypeFilter, setBotTypeFilter] = useState('')
  const [guardrails, setGuardrails] = useState([])
  const [blockedPatterns, setBlockedPatterns] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [addModal, setAddModal] = useState(null)

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) { navigate('/admin/login'); return false }
    const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
    if (!admin) { navigate('/admin/login'); return false }
    return true
  }, [navigate])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === 'escalation') {
        let query = supabaseBiz.from('chatbot_guardrails').select('*').eq('rule_type', 'escalation_trigger').order('created_at', { ascending: false })
        if (botTypeFilter) query = query.eq('bot_type', botTypeFilter)
        const { data } = await query
        setGuardrails(data || [])
      } else if (tab === 'blocked') {
        const { data } = await supabaseBiz.from('chatbot_blocked_patterns').select('*').order('created_at', { ascending: false })
        setBlockedPatterns(data || [])
      } else {
        const { data } = await supabaseBiz.from('chatbot_audit_logs').select('*').order('created_at', { ascending: false }).limit(50)
        setAuditLogs(data || [])
      }
    } catch (err) {
      console.error('데이터 로딩 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [tab, botTypeFilter])

  useEffect(() => {
    checkAuth().then(ok => ok && fetchData())
  }, [checkAuth, fetchData])

  const handleDeleteGuardrail = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabaseBiz.from('chatbot_guardrails').delete().eq('id', id)
      fetchData()
    } catch (err) { alert('삭제 실패: ' + err.message) }
  }

  const handleToggleGuardrail = async (item) => {
    try {
      await supabaseBiz.from('chatbot_guardrails').update({ is_active: !item.is_active }).eq('id', item.id)
      fetchData()
    } catch (err) { alert('변경 실패: ' + err.message) }
  }

  const handleDeleteBlocked = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await supabaseBiz.from('chatbot_blocked_patterns').delete().eq('id', id)
      fetchData()
    } catch (err) { alert('삭제 실패: ' + err.message) }
  }

  const tabs = [
    { id: 'escalation', label: '에스컬레이션 트리거', icon: AlertTriangle },
    { id: 'blocked', label: '차단 패턴', icon: Shield },
    { id: 'audit', label: '변경 이력', icon: FileText },
  ]

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <AdminNavigation />
      <main className="flex-1 ml-[240px] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-7 h-7 text-[#6C5CE7]" />
            <h1 className="text-2xl font-bold text-[#2D3436]" style={{ fontFamily: "'Outfit', sans-serif" }}>기준틀 관리</h1>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.id ? 'bg-[#6C5CE7] text-white' : 'border border-[#DFE6E9] text-[#636E72] hover:border-[#6C5CE7]'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#6C5CE7]" />
            </div>
          ) : (
            <>
              {/* 에스컬레이션 트리거 */}
              {tab === 'escalation' && (
                <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <select value={botTypeFilter} onChange={e => setBotTypeFilter(e.target.value)}
                      className="border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
                      <option value="">전체 봇 타입</option>
                      <option value="business">기업</option>
                      <option value="creator">크리에이터</option>
                    </select>
                    <button onClick={() => setAddModal('guardrail')}
                      className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6]">
                      <Plus className="w-4 h-4" /> 추가
                    </button>
                  </div>
                  {guardrails.length === 0 ? (
                    <p className="text-sm text-[#636E72] py-8 text-center">에스컬레이션 트리거가 없습니다.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#DFE6E9]">
                        <tr>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">봇 타입</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">규칙값</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">설명</th>
                          <th className="text-center px-4 py-3 text-[#636E72] font-medium">활성</th>
                          <th className="text-center px-4 py-3 text-[#636E72] font-medium">삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guardrails.map(item => (
                          <tr key={item.id} className="border-b border-[#DFE6E9] last:border-0 hover:bg-[#F8F9FA]">
                            <td className="px-4 py-3">
                              <span className="bg-[#F0EDFF] text-[#6C5CE7] px-2 py-0.5 rounded text-xs">{item.bot_type}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{item.rule_value}</td>
                            <td className="px-4 py-3 text-[#636E72]">{item.description || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleToggleGuardrail(item)}
                                className={`px-2 py-0.5 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {item.is_active ? '활성' : '비활성'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleDeleteGuardrail(item.id)} className="text-[#636E72] hover:text-red-500">
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* 차단 패턴 */}
              {tab === 'blocked' && (
                <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => setAddModal('blocked')}
                      className="flex items-center gap-2 px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6]">
                      <Plus className="w-4 h-4" /> 패턴 추가
                    </button>
                  </div>
                  {blockedPatterns.length === 0 ? (
                    <p className="text-sm text-[#636E72] py-8 text-center">차단 패턴이 없습니다.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#DFE6E9]">
                        <tr>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">패턴</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">유형</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">사유</th>
                          <th className="text-center px-4 py-3 text-[#636E72] font-medium">삭제</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blockedPatterns.map(item => (
                          <tr key={item.id} className="border-b border-[#DFE6E9] last:border-0 hover:bg-[#F8F9FA]">
                            <td className="px-4 py-3 font-mono text-xs">{item.pattern}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${item.pattern_type === 'regex' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                {item.pattern_type || 'keyword'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#636E72]">{item.reason || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleDeleteBlocked(item.id)} className="text-[#636E72] hover:text-red-500">
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* 변경 이력 */}
              {tab === 'audit' && (
                <div className="bg-white border border-[#DFE6E9] rounded-2xl shadow-sm p-6">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-[#636E72] py-8 text-center">변경 이력이 없습니다.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-[#DFE6E9]">
                        <tr>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">날짜</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">테이블</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">작업</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">관리자</th>
                          <th className="text-left px-4 py-3 text-[#636E72] font-medium">상세</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map(log => (
                          <tr key={log.id} className="border-b border-[#DFE6E9] last:border-0 hover:bg-[#F8F9FA]">
                            <td className="px-4 py-3 text-xs">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                            <td className="px-4 py-3">
                              <span className="bg-[#F0EDFF] text-[#6C5CE7] px-2 py-0.5 rounded text-xs">{log.table_name || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>{log.action}</span>
                            </td>
                            <td className="px-4 py-3 text-[#636E72] text-xs">{log.admin_email || '-'}</td>
                            <td className="px-4 py-3 text-[#636E72] text-xs max-w-[200px] truncate">{log.details ? JSON.stringify(log.details) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 추가 모달 */}
        {addModal === 'guardrail' && <AddGuardrailModal onClose={() => setAddModal(null)} onSaved={fetchData} />}
        {addModal === 'blocked' && <AddBlockedModal onClose={() => setAddModal(null)} onSaved={fetchData} />}
      </main>
    </div>
  )
}

function AddGuardrailModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ bot_type: 'business', rule_value: '', description: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.rule_value.trim()) { alert('규칙값을 입력하세요.'); return }
    setSaving(true)
    try {
      await supabaseBiz.from('chatbot_guardrails').insert({
        bot_type: form.bot_type, rule_type: 'escalation_trigger',
        rule_value: form.rule_value.trim(), description: form.description.trim(), is_active: true
      })
      onClose()
      onSaved()
    } catch (err) { alert('저장 실패: ' + err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#2D3436] mb-4">에스컬레이션 트리거 추가</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#636E72] block mb-1">봇 타입</label>
            <select value={form.bot_type} onChange={e => setForm({ ...form, bot_type: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
              <option value="business">기업</option>
              <option value="creator">크리에이터</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">규칙값</label>
            <input type="text" value={form.rule_value} onChange={e => setForm({ ...form, rule_value: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="예: 환불, 불만, 법적" />
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">설명</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="규칙에 대한 설명" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72]">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} 저장
          </button>
        </div>
      </div>
    </div>
  )
}

function AddBlockedModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ pattern: '', pattern_type: 'keyword', reason: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.pattern.trim()) { alert('패턴을 입력하세요.'); return }
    setSaving(true)
    try {
      await supabaseBiz.from('chatbot_blocked_patterns').insert({
        pattern: form.pattern.trim(), pattern_type: form.pattern_type, reason: form.reason.trim()
      })
      onClose()
      onSaved()
    } catch (err) { alert('저장 실패: ' + err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#2D3436] mb-4">차단 패턴 추가</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#636E72] block mb-1">패턴</label>
            <input type="text" value={form.pattern} onChange={e => setForm({ ...form, pattern: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="차단할 패턴 (키워드 또는 정규식)" />
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">유형</label>
            <select value={form.pattern_type} onChange={e => setForm({ ...form, pattern_type: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none">
              <option value="keyword">키워드</option>
              <option value="regex">정규식</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#636E72] block mb-1">사유</label>
            <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              className="w-full border border-[#DFE6E9] rounded-xl px-3 py-2 text-sm focus:border-[#6C5CE7] focus:outline-none"
              placeholder="차단 사유" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 border border-[#DFE6E9] rounded-xl text-sm text-[#636E72]">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-[#6C5CE7] text-white rounded-xl text-sm hover:bg-[#5A4BD6] disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} 저장
          </button>
        </div>
      </div>
    </div>
  )
}
