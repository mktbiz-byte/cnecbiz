import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Save, Loader2, Plus, X, Settings, Shield, Send
} from 'lucide-react'
import { supabaseBiz } from '../../../lib/supabaseClients'
import AdminNavigation from '../AdminNavigation'
import { OpenCloNav } from './OpenCloDashboard'

const PLATFORMS = ['instagram', 'youtube', 'tiktok']
const PLATFORM_LABELS = { instagram: 'Instagram', youtube: 'YouTube', tiktok: 'TikTok' }

export default function OpenCloBotConfig() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('korea')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activePlatform, setActivePlatform] = useState('instagram')
  const [configs, setConfigs] = useState({})
  const [adminUser, setAdminUser] = useState(null)
  // IP 관리
  const [ips, setIps] = useState([])
  const [newIp, setNewIp] = useState('')
  const [newIpLabel, setNewIpLabel] = useState('')
  const [myIp, setMyIp] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabaseBiz
        .from('oc_bot_config')
        .select('*')
        .eq('region', region)

      const configMap = {}
      ;(data || []).forEach(c => { configMap[c.platform] = c })
      setConfigs(configMap)

      // IP 목록
      const { data: ipData } = await supabaseBiz.from('oc_allowed_ips').select('*').order('created_at', { ascending: false })
      setIps(ipData || [])
    } catch (err) {
      console.error('Config fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [region])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseBiz.auth.getUser()
      if (!user) { navigate('/admin/login'); return }
      const { data: admin } = await supabaseBiz.from('admin_users').select('*').eq('email', user.email).maybeSingle()
      if (!admin) { navigate('/admin/login'); return }
      setAdminUser(admin)
    }
    checkAuth()

    // 내 IP 확인
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => setMyIp(d.ip))
      .catch(() => {})
  }, [navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const currentConfig = configs[activePlatform] || {}

  const updateField = (field, value) => {
    setConfigs(prev => ({
      ...prev,
      [activePlatform]: { ...prev[activePlatform], [field]: value }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const config = configs[activePlatform]
      if (!config?.id) {
        alert('설정을 찾을 수 없습니다')
        return
      }

      const { error } = await supabaseBiz
        .from('oc_bot_config')
        .update({
          is_active: config.is_active,
          search_keywords: config.search_keywords || [],
          hashtags: config.hashtags || [],
          min_followers: config.min_followers || 1000,
          max_followers: config.max_followers || 1000000,
          target_categories: config.target_categories || [],
          speed_mode: config.speed_mode || 'normal',
          daily_limit: config.daily_limit || 500,
          email_template_1: config.email_template_1,
          email_template_2: config.email_template_2,
          email_template_3: config.email_template_3,
          email_interval_days: config.email_interval_days || 3,
          naver_works_webhook_url: config.naver_works_webhook_url,
          updated_by: adminUser?.id
        })
        .eq('id', config.id)

      if (error) throw error
      alert('저장 완료!')
    } catch (err) {
      alert('저장 실패: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const addTag = (field) => {
    const input = prompt(`추가할 ${field === 'search_keywords' ? '키워드' : field === 'hashtags' ? '해시태그' : '카테고리'}:`)
    if (!input) return
    const current = currentConfig[field] || []
    updateField(field, [...current, input.trim()])
  }

  const removeTag = (field, index) => {
    const current = [...(currentConfig[field] || [])]
    current.splice(index, 1)
    updateField(field, current)
  }

  // IP 관리
  const addIp = async () => {
    if (!newIp) return
    try {
      await supabaseBiz.from('oc_allowed_ips').insert({
        ip_address: newIp.trim(),
        label: newIpLabel || null,
        created_by: adminUser?.id
      })
      setNewIp('')
      setNewIpLabel('')
      fetchData()
    } catch (err) {
      alert('IP 추가 실패: ' + err.message)
    }
  }

  const addMyIp = async () => {
    if (!myIp) return
    try {
      await supabaseBiz.from('oc_allowed_ips').insert({
        ip_address: myIp,
        label: '내 IP (자동)',
        created_by: adminUser?.id
      })
      fetchData()
    } catch (err) {
      alert('IP 추가 실패: ' + err.message)
    }
  }

  const toggleIp = async (id, isActive) => {
    await supabaseBiz.from('oc_allowed_ips').update({ is_active: !isActive }).eq('id', id)
    fetchData()
  }

  const deleteIp = async (id) => {
    if (!confirm('이 IP를 삭제하시겠습니까?')) return
    await supabaseBiz.from('oc_allowed_ips').delete().eq('id', id)
    fetchData()
  }

  const testNaverWorks = async () => {
    const url = currentConfig.naver_works_webhook_url
    if (!url) { alert('웹훅 URL을 입력해주세요'); return }
    try {
      alert('네이버웍스 연동 테스트는 scheduled-openclo-report 함수를 수동 실행해주세요.')
    } catch (err) {
      alert('테스트 실패: ' + err.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNavigation />
      <div className="flex-1 ml-0 md:ml-56 p-6">
        <OpenCloNav currentRegion={region} onRegionChange={setRegion} />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
        ) : (
          <div className="space-y-6">
            {/* 플랫폼 탭 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setActivePlatform(p)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activePlatform === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>

            {/* 봇 설정 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" /> {PLATFORM_LABELS[activePlatform]} 봇 설정
                  </CardTitle>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm">{currentConfig.is_active ? '활성' : '비활성'}</span>
                    <button
                      onClick={() => updateField('is_active', !currentConfig.is_active)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${currentConfig.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${currentConfig.is_active ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 키워드 */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">검색 키워드</label>
                  <div className="flex flex-wrap gap-1">
                    {(currentConfig.search_keywords || []).map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {kw}
                        <button onClick={() => removeTag('search_keywords', i)} className="ml-1"><X className="w-2.5 h-2.5" /></button>
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addTag('search_keywords')}>
                      <Plus className="w-3 h-3 mr-1" /> 추가
                    </Button>
                  </div>
                </div>

                {/* 해시태그 */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">해시태그</label>
                  <div className="flex flex-wrap gap-1">
                    {(currentConfig.hashtags || []).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                        <button onClick={() => removeTag('hashtags', i)} className="ml-1"><X className="w-2.5 h-2.5" /></button>
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addTag('hashtags')}>
                      <Plus className="w-3 h-3 mr-1" /> 추가
                    </Button>
                  </div>
                </div>

                {/* 팔로워 범위 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">최소 팔로워</label>
                    <Input type="number" value={currentConfig.min_followers || 1000}
                      onChange={e => updateField('min_followers', parseInt(e.target.value))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">최대 팔로워</label>
                    <Input type="number" value={currentConfig.max_followers || 1000000}
                      onChange={e => updateField('max_followers', parseInt(e.target.value))} className="mt-1" />
                  </div>
                </div>

                {/* 속도/제한 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">속도 모드</label>
                    <select value={currentConfig.speed_mode || 'normal'} onChange={e => updateField('speed_mode', e.target.value)}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                      <option value="slow">느림 (안전)</option>
                      <option value="normal">보통</option>
                      <option value="fast">빠름</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">일일 제한</label>
                    <Input type="number" value={currentConfig.daily_limit || 500}
                      onChange={e => updateField('daily_limit', parseInt(e.target.value))} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 이메일 템플릿 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Send className="w-4 h-4" /> 이메일 템플릿
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">이메일 발송 간격 (일)</label>
                  <Input type="number" value={currentConfig.email_interval_days || 3}
                    onChange={e => updateField('email_interval_days', parseInt(e.target.value))} className="mt-1 w-24" />
                </div>
                {[1, 2, 3].map(n => (
                  <div key={n}>
                    <label className="text-xs font-medium text-gray-500">{n}차 이메일 템플릿</label>
                    <textarea
                      value={currentConfig[`email_template_${n}`] || ''}
                      onChange={e => updateField(`email_template_${n}`, e.target.value)}
                      rows={3}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm resize-y"
                      placeholder={`{{creator_name}}, {{platform}}, {{category}} 변수 사용 가능`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 네이버웍스 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">네이버웍스 연동</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">웹훅 URL</label>
                  <Input value={currentConfig.naver_works_webhook_url || ''}
                    onChange={e => updateField('naver_works_webhook_url', e.target.value)}
                    placeholder="https://..." className="mt-1" />
                </div>
                <Button variant="outline" size="sm" onClick={testNaverWorks}>테스트 발송</Button>
              </CardContent>
            </Card>

            {/* IP 관리 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" /> IP 화이트리스트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myIp && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-700">현재 접속 IP: <strong>{myIp}</strong></span>
                    <Button size="sm" variant="outline" onClick={addMyIp} className="border-blue-300">
                      <Plus className="w-3 h-3 mr-1" /> 내 IP 추가
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input placeholder="IP 주소" value={newIp} onChange={e => setNewIp(e.target.value)} className="w-40" />
                  <Input placeholder="라벨 (사무실 등)" value={newIpLabel} onChange={e => setNewIpLabel(e.target.value)} className="w-32" />
                  <Button size="sm" onClick={addIp}><Plus className="w-3 h-3 mr-1" /> 추가</Button>
                </div>

                <div className="space-y-1">
                  {ips.map(ip => (
                    <div key={ip.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ip.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className="font-mono">{ip.ip_address}</span>
                        {ip.label && <span className="text-gray-400 text-xs">({ip.label})</span>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleIp(ip.id, ip.is_active)}>
                          {ip.is_active ? '비활성화' : '활성화'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteIp(ip.id)} className="text-red-400">삭제</Button>
                      </div>
                    </div>
                  ))}
                  {ips.length === 0 && <p className="text-xs text-gray-400">등록된 IP 없음 (모든 접근 허용)</p>}
                </div>
              </CardContent>
            </Card>

            {/* 저장 버튼 */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                설정 저장
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
