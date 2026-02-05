import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  Loader2, Plus, Trash2, Save, RefreshCw, Users, Mail, MessageSquare,
  BarChart3, TrendingUp, Calendar, ChevronRight, ChevronDown, Sparkles, Settings,
  FileSpreadsheet, User, ArrowLeft, Target, AlertTriangle, CheckCircle2,
  Globe, Flag
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, Cell, ReferenceLine
} from 'recharts'
import { supabaseBiz } from '../../lib/supabaseClients'

// 국가 목록
const COUNTRIES = [
  { code: 'KR', name: '한국', flag: '🇰🇷' },
  { code: 'JP', name: '일본', flag: '🇯🇵' },
  { code: 'US', name: '미국', flag: '🇺🇸' },
  { code: 'TW', name: '대만', flag: '🇹🇼' },
  { code: 'OTHER', name: '기타', flag: '🌏' }
]

export default function DailyReportPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // 담당자 시트 설정
  const [staffSheets, setStaffSheets] = useState([])
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [newStaff, setNewStaff] = useState({
    name: '',
    sheets: [],
    kpi: { creators: 30, dm: 20, emails: 10 } // 일일 KPI 기본값
  })
  const [saving, setSaving] = useState(false)

  // 분석 데이터
  const [staffReports, setStaffReports] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffDetail, setStaffDetail] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [cachedReports, setCachedReports] = useState(null)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null)

  // 국가별 통계
  const [countryStats, setCountryStats] = useState({})

  // 월별 현황 펼침 상태
  const [expandedMonth, setExpandedMonth] = useState(null)

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

    // admin_users 체크
    const { data: admin } = await supabaseBiz
      .from('admin_users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (!admin) {
      navigate('/admin/login')
      return
    }

    await loadStaffSheets()
    await loadCachedReports()
    setLoading(false)
  }

  // 캐시된 분석 결과 로드
  const loadCachedReports = async () => {
    try {
      const response = await fetch('/.netlify/functions/daily-report-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load_cached_reports' })
      })

      const result = await response.json()
      if (result.success && result.cachedReports) {
        setStaffReports(result.cachedReports.staffReports || [])
        setCountryStats(result.cachedReports.countryStats || {})
        setLastAnalyzedAt(result.cachedReports.analyzedAt)
      }
    } catch (error) {
      console.error('Error loading cached reports:', error)
    }
  }

  // 담당자 시트 설정 로드
  const loadStaffSheets = async () => {
    try {
      const response = await fetch('/.netlify/functions/daily-report-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load_staff_sheets' })
      })

      const result = await response.json()
      if (result.success && result.staffSheets) {
        setStaffSheets(result.staffSheets)
      }
    } catch (error) {
      console.error('Error loading staff sheets:', error)
    }
  }

  // 담당자 시트 설정 저장
  const saveStaffSheets = async (data) => {
    setSaving(true)
    try {
      const response = await fetch('/.netlify/functions/daily-report-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_staff_sheets',
          staffSheets: data
        })
      })

      const result = await response.json()
      if (result.success) {
        setStaffSheets(data)
        alert('저장되었습니다.')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert(`저장 실패: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  // 전체 분석 실행
  const runAnalyzeAll = async () => {
    setAnalyzing(true)
    try {
      const response = await fetch('/.netlify/functions/daily-report-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze_all', saveResults: true })
      })

      const result = await response.json()
      if (result.success) {
        setStaffReports(result.staffReports)
        setCountryStats(result.countryStats || {})
        setLastAnalyzedAt(new Date().toISOString())
        alert('분석이 완료되어 저장되었습니다.')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error analyzing:', error)
      alert(`분석 실패: ${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // 오늘/어제 KPI 상태 계산
  const getKPIStatus = (report, staff) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // 어제 날짜 계산
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const todayData = report.recentDaily?.find(d => d.date === todayStr)
    const yesterdayData = report.recentDaily?.find(d => d.date === yesterdayStr)
    const kpi = staff?.kpi || { creators: 30, dm: 20, emails: 10 }

    // 어제 KPI 달성 여부
    const yesterdayCreatorsRate = yesterdayData ? Math.round((yesterdayData.creators / kpi.creators) * 100) : 0
    const yesterdayDmRate = yesterdayData ? Math.round((yesterdayData.dm / kpi.dm) * 100) : 0
    const yesterdayEmailsRate = yesterdayData ? Math.round((yesterdayData.emails / kpi.emails) * 100) : 0
    const yesterdayMet = yesterdayData && yesterdayCreatorsRate >= 100 && yesterdayDmRate >= 100 && yesterdayEmailsRate >= 100

    // 오늘 진행률
    const todayCreatorsRate = todayData ? Math.round((todayData.creators / kpi.creators) * 100) : 0
    const todayDmRate = todayData ? Math.round((todayData.dm / kpi.dm) * 100) : 0
    const todayEmailsRate = todayData ? Math.round((todayData.emails / kpi.emails) * 100) : 0

    return {
      // 오늘 데이터
      today: {
        creators: todayData?.creators || 0,
        dm: todayData?.dm || 0,
        emails: todayData?.emails || 0,
        creatorsRate: todayCreatorsRate,
        dmRate: todayDmRate,
        emailsRate: todayEmailsRate
      },
      // 어제 데이터
      yesterday: {
        creators: yesterdayData?.creators || 0,
        dm: yesterdayData?.dm || 0,
        emails: yesterdayData?.emails || 0,
        creatorsRate: yesterdayCreatorsRate,
        dmRate: yesterdayDmRate,
        emailsRate: yesterdayEmailsRate,
        met: yesterdayMet,
        hasData: !!yesterdayData
      },
      kpi
    }
  }

  // KPI 달성 여부에 따른 색상
  const getKPIColor = (rate) => {
    if (rate >= 100) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getKPIBgColor = (rate) => {
    if (rate >= 100) return 'bg-green-100'
    if (rate >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  // 담당자 상세 분석
  const analyzeStaff = async (staffId) => {
    setAnalyzing(true)
    setSelectedStaff(staffId)
    try {
      const response = await fetch('/.netlify/functions/daily-report-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_staff',
          staffId,
          includeAI: true
        })
      })

      const result = await response.json()
      if (result.success) {
        setStaffDetail(result)
        setActiveTab('detail')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error analyzing staff:', error)
      alert(`분석 실패: ${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // 담당자 추가/수정
  const handleAddStaff = () => {
    if (!newStaff.name.trim()) {
      alert('담당자 이름을 입력해주세요.')
      return
    }

    if (newStaff.sheets.length === 0) {
      alert('최소 1개의 시트를 등록해주세요.')
      return
    }

    let updatedStaffs
    if (editingStaff) {
      updatedStaffs = staffSheets.map(s =>
        s.id === editingStaff.id ? { ...newStaff, id: editingStaff.id } : s
      )
    } else {
      updatedStaffs = [...staffSheets, { ...newStaff, id: Date.now().toString() }]
    }

    saveStaffSheets(updatedStaffs)
    setShowAddStaffModal(false)
    setNewStaff({ name: '', sheets: [], kpi: { creators: 30, dm: 20, emails: 10 } })
    setEditingStaff(null)
  }

  // 담당자 삭제
  const handleDeleteStaff = (staffId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const updated = staffSheets.filter(s => s.id !== staffId)
    saveStaffSheets(updated)
  }

  // 시트 추가
  const addSheet = () => {
    setNewStaff(prev => ({
      ...prev,
      sheets: [...prev.sheets, {
        id: Date.now().toString(),
        name: '',
        url: '',
        sheetTab: '',
        country: 'KR', // 기본 국가
        columnConfig: {
          dateColumn: 'B',
          creatorColumn: 'D',
          dmColumn: 'I',
          emailColumn: 'H'
        }
      }]
    }))
  }

  // 시트 업데이트
  const updateSheet = (sheetId, field, value) => {
    setNewStaff(prev => ({
      ...prev,
      sheets: prev.sheets.map(s =>
        s.id === sheetId ? { ...s, [field]: value } : s
      )
    }))
  }

  // 시트 컬럼 설정 업데이트
  const updateSheetColumn = (sheetId, columnField, value) => {
    setNewStaff(prev => ({
      ...prev,
      sheets: prev.sheets.map(s => {
        if (s.id !== sheetId) return s
        // 기존 columnConfig가 없으면 기본값으로 초기화
        const currentConfig = s.columnConfig || {
          dateColumn: 'B',
          creatorColumn: 'D',
          dmColumn: 'I',
          emailColumn: 'H'
        }
        return {
          ...s,
          columnConfig: { ...currentConfig, [columnField]: value }
        }
      })
    }))
  }

  // 시트 삭제
  const removeSheet = (sheetId) => {
    setNewStaff(prev => ({
      ...prev,
      sheets: prev.sheets.filter(s => s.id !== sheetId)
    }))
  }

  // 수정 모드
  const openEditModal = (staff) => {
    setEditingStaff(staff)
    // 시트 데이터에 columnConfig가 없으면 기본값으로 초기화
    const sheetsWithConfig = staff.sheets.map(sheet => ({
      ...sheet,
      country: sheet.country || 'KR',
      columnConfig: {
        dateColumn: sheet.columnConfig?.dateColumn || 'B',
        creatorColumn: sheet.columnConfig?.creatorColumn || 'D',
        dmColumn: sheet.columnConfig?.dmColumn || 'I',
        emailColumn: sheet.columnConfig?.emailColumn || 'H'
      }
    }))
    setNewStaff({
      name: staff.name,
      sheets: sheetsWithConfig,
      kpi: staff.kpi || { creators: 30, dm: 20, emails: 10 }
    })
    setShowAddStaffModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/youtuber-search')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                유튜버 검색
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  일일 업무 보고서
                </h1>
                <p className="text-sm text-gray-500">담당자별 구글 시트 업무량 분석</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {lastAnalyzedAt && (
                <span className="text-xs text-gray-500">
                  마지막 분석: {new Date(lastAnalyzedAt).toLocaleString('ko-KR')}
                </span>
              )}
              <Button
                variant="outline"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="w-4 h-4 mr-1" />
                설정
              </Button>
              <Button
                onClick={runAnalyzeAll}
                disabled={analyzing || staffSheets.length === 0}
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                전체 분석
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-1" />
              전체 현황
            </TabsTrigger>
            <TabsTrigger value="detail" disabled={!staffDetail}>
              <User className="w-4 h-4 mr-1" />
              상세 분석
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-1" />
              담당자 설정
            </TabsTrigger>
          </TabsList>

          {/* 전체 현황 탭 */}
          <TabsContent value="overview">
            {staffSheets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    등록된 담당자가 없습니다
                  </h3>
                  <p className="text-gray-500 mb-4">
                    담당자와 구글 시트를 등록하여 일일 업무량을 분석하세요.
                  </p>
                  <Button onClick={() => setActiveTab('settings')}>
                    <Plus className="w-4 h-4 mr-1" />
                    담당자 등록하기
                  </Button>
                </CardContent>
              </Card>
            ) : staffReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    분석 결과가 없습니다
                  </h3>
                  <p className="text-gray-500 mb-4">
                    상단의 "전체 분석" 버튼을 클릭하여 분석을 실행하세요.
                  </p>
                  <Button onClick={runAnalyzeAll} disabled={analyzing}>
                    {analyzing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    전체 분석 실행
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* 요약 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">총 크리에이터</p>
                          <p className="text-2xl font-bold">
                            {staffReports.reduce((acc, r) => acc + r.totals.creators, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <MessageSquare className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">총 DM</p>
                          <p className="text-2xl font-bold">
                            {staffReports.reduce((acc, r) => acc + r.totals.dm, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Mail className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">총 메일수집</p>
                          <p className="text-2xl font-bold">
                            {staffReports.reduce((acc, r) => acc + r.totals.emails, 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <User className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">담당자 수</p>
                          <p className="text-2xl font-bold">{staffReports.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 국가별 현황 */}
                {Object.keys(countryStats).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        국가별 모집 현황
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {COUNTRIES.map(country => {
                          const stats = countryStats[country.code] || { creators: 0, dm: 0, emails: 0 }
                          return (
                            <div key={country.code} className="p-4 bg-gray-50 rounded-lg text-center">
                              <div className="text-2xl mb-1">{country.flag}</div>
                              <div className="font-medium text-sm mb-2">{country.name}</div>
                              <div className="text-2xl font-bold text-blue-600">{stats.creators}</div>
                              <div className="text-xs text-gray-500">크리에이터</div>
                              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                                <div className="text-green-600">DM {stats.dm}</div>
                                <div className="text-purple-600">메일 {stats.emails}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 담당자별 비교 차트 */}
                <Card>
                  <CardHeader>
                    <CardTitle>담당자별 업무량 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={staffReports.map(r => ({
                            name: r.staffName,
                            크리에이터: r.totals.creators,
                            DM: r.totals.dm,
                            메일수집: r.totals.emails
                          }))}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="크리에이터" fill="#3B82F6" />
                          <Bar dataKey="DM" fill="#22C55E" />
                          <Bar dataKey="메일수집" fill="#A855F7" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 담당자 카드 목록 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staffReports.map(report => {
                    // KPI 상태 계산 (오늘 + 어제)
                    const staff = staffSheets.find(s => s.id === report.staffId)
                    const kpiStatus = getKPIStatus(report, staff)
                    // 어제 미달 여부로 경고 표시
                    const hasYesterdayWarning = kpiStatus.yesterday.hasData && !kpiStatus.yesterday.met

                    return (
                      <Card
                        key={report.staffId}
                        className={`cursor-pointer hover:shadow-lg transition-shadow ${hasYesterdayWarning ? 'border-l-4 border-l-red-500' : ''}`}
                        onClick={() => analyzeStaff(report.staffId)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <User className="w-5 h-5 text-blue-600" />
                              {report.staffName}
                              {hasYesterdayWarning && (
                                <Badge variant="destructive" className="text-xs">어제 미달</Badge>
                              )}
                            </CardTitle>
                            <Badge variant="outline">{report.sheetCount}개 시트</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* 어제 KPI 미달 경고 */}
                          {hasYesterdayWarning && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-xs text-red-700 mb-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="font-medium">어제 KPI 미달</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className={`text-center p-1 rounded ${getKPIBgColor(kpiStatus.yesterday.creatorsRate)}`}>
                                  <div className={`font-bold ${getKPIColor(kpiStatus.yesterday.creatorsRate)}`}>
                                    {kpiStatus.yesterday.creators}/{kpiStatus.kpi.creators}
                                  </div>
                                  <div className="text-gray-500">크리에이터</div>
                                </div>
                                <div className={`text-center p-1 rounded ${getKPIBgColor(kpiStatus.yesterday.dmRate)}`}>
                                  <div className={`font-bold ${getKPIColor(kpiStatus.yesterday.dmRate)}`}>
                                    {kpiStatus.yesterday.dm}/{kpiStatus.kpi.dm}
                                  </div>
                                  <div className="text-gray-500">DM</div>
                                </div>
                                <div className={`text-center p-1 rounded ${getKPIBgColor(kpiStatus.yesterday.emailsRate)}`}>
                                  <div className={`font-bold ${getKPIColor(kpiStatus.yesterday.emailsRate)}`}>
                                    {kpiStatus.yesterday.emails}/{kpiStatus.kpi.emails}
                                  </div>
                                  <div className="text-gray-500">메일</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 오늘 진행률 */}
                          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-blue-700 font-medium">오늘 진행률</span>
                              <span className={getKPIColor(Math.min(kpiStatus.today.creatorsRate, kpiStatus.today.dmRate, kpiStatus.today.emailsRate))}>
                                {kpiStatus.today.creatorsRate >= 100 && kpiStatus.today.dmRate >= 100 && kpiStatus.today.emailsRate >= 100 ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> 달성
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-blue-600">
                                    진행중
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center p-1 rounded bg-white">
                                <div className={`font-bold ${getKPIColor(kpiStatus.today.creatorsRate)}`}>
                                  {kpiStatus.today.creators}/{kpiStatus.kpi.creators}
                                </div>
                                <div className="text-gray-500">크리에이터 ({kpiStatus.today.creatorsRate}%)</div>
                              </div>
                              <div className="text-center p-1 rounded bg-white">
                                <div className={`font-bold ${getKPIColor(kpiStatus.today.dmRate)}`}>
                                  {kpiStatus.today.dm}/{kpiStatus.kpi.dm}
                                </div>
                                <div className="text-gray-500">DM ({kpiStatus.today.dmRate}%)</div>
                              </div>
                              <div className="text-center p-1 rounded bg-white">
                                <div className={`font-bold ${getKPIColor(kpiStatus.today.emailsRate)}`}>
                                  {kpiStatus.today.emails}/{kpiStatus.kpi.emails}
                                </div>
                                <div className="text-gray-500">메일 ({kpiStatus.today.emailsRate}%)</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">{report.totals.creators}</p>
                              <p className="text-xs text-gray-500">총 크리에이터</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{report.totals.dm}</p>
                              <p className="text-xs text-gray-500">총 DM</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">{report.totals.emails}</p>
                              <p className="text-xs text-gray-500">총 메일수집</p>
                            </div>
                          </div>

                          {/* 최근 7일 미니 차트 */}
                          {report.recentDaily.length > 0 && (
                            <div className="h-20">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[...report.recentDaily].reverse()}>
                                  <defs>
                                    <linearGradient id={`gradient-${report.staffId}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <Area
                                    type="monotone"
                                    dataKey="creators"
                                    stroke="#3B82F6"
                                    fill={`url(#gradient-${report.staffId})`}
                                  />
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-white p-2 shadow rounded text-xs">
                                            <p>{payload[0].payload.date}</p>
                                            <p className="text-blue-600">{payload[0].value}명</p>
                                          </div>
                                        )
                                      }
                                      return null
                                    }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}

                          <div className="flex items-center justify-end mt-2 text-sm text-blue-600">
                            상세 보기 <ChevronRight className="w-4 h-4" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 상세 분석 탭 */}
          <TabsContent value="detail">
            <div className="space-y-6">
              {/* 담당자 선택 탭 */}
              {staffSheets.length > 0 && (
                <Card>
                  <CardContent className="pt-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {staffSheets.map(staff => (
                        <Button
                          key={staff.id}
                          variant={selectedStaff === staff.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => analyzeStaff(staff.id)}
                          disabled={analyzing}
                          className="flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          {staff.name}
                          {analyzing && selectedStaff === staff.id && (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          )}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!staffDetail && !analyzing && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>위에서 담당자를 선택하면 상세 분석이 표시됩니다.</p>
                  </CardContent>
                </Card>
              )}

              {analyzing && !staffDetail && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500">분석 중...</p>
                  </CardContent>
                </Card>
              )}

              {staffDetail && (
                <>
                  {/* 담당자 헤더 */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <User className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold">{staffDetail.staffInfo.name}</h2>
                            <p className="text-sm text-gray-500">
                              {staffDetail.staffInfo.sheets.length}개 시트 통합 분석
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => analyzeStaff(staffDetail.staffInfo.id)}
                          disabled={analyzing}
                        >
                          {analyzing ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-1" />
                          )}
                          새로고침
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                {/* AI 분석 결과 */}
                {staffDetail.aiAnalysis && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Sparkles className="w-5 h-5" />
                        AI 피드백
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-line">
                        {staffDetail.aiAnalysis}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                        <p className="text-3xl font-bold">{staffDetail.stats.totals.creators}</p>
                        <p className="text-sm text-gray-500">총 크리에이터</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <MessageSquare className="w-8 h-8 mx-auto text-green-600 mb-2" />
                        <p className="text-3xl font-bold">{staffDetail.stats.totals.dm}</p>
                        <p className="text-sm text-gray-500">총 DM</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Mail className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                        <p className="text-3xl font-bold">{staffDetail.stats.totals.emails}</p>
                        <p className="text-sm text-gray-500">총 메일수집</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <FileSpreadsheet className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                        <p className="text-3xl font-bold">{staffDetail.stats.totals.totalRows}</p>
                        <p className="text-sm text-gray-500">총 데이터 행</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 일별 추이 차트 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      일별 업무량 (막대 그래프)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...staffDetail.stats.daily].reverse().slice(-30)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(val) => val.slice(5)}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="creators" name="크리에이터" fill="#3B82F6" />
                          <Bar dataKey="dm" name="DM" fill="#22C55E" />
                          <Bar dataKey="emails" name="메일수집" fill="#A855F7" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 월별 현황 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      월별 현황
                      <span className="text-sm font-normal text-gray-500">(클릭하여 일별 상세 보기)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">월</th>
                            <th className="text-right py-2 px-4">크리에이터</th>
                            <th className="text-right py-2 px-4">DM</th>
                            <th className="text-right py-2 px-4">메일수집</th>
                            <th className="text-right py-2 px-4">작업일수</th>
                            <th className="text-right py-2 px-4">일평균</th>
                          </tr>
                        </thead>
                          {staffDetail.stats.monthly.map(month => {
                            const isExpanded = expandedMonth === month.month
                            // 해당 월의 일별 데이터 필터링
                            const monthDailyData = staffDetail.stats.daily
                              .filter(d => d.date.startsWith(month.month))
                              .sort((a, b) => b.date.localeCompare(a.date))

                            return (
                              <tbody key={month.month}>
                                <tr
                                  className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                                  onClick={() => setExpandedMonth(isExpanded ? null : month.month)}
                                >
                                  <td className="py-2 px-4 font-medium">
                                    <div className="flex items-center gap-2">
                                      {isExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-blue-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                      )}
                                      {month.month}
                                    </div>
                                  </td>
                                  <td className="text-right py-2 px-4">{month.creators}</td>
                                  <td className="text-right py-2 px-4">{month.dm}</td>
                                  <td className="text-right py-2 px-4">{month.emails}</td>
                                  <td className="text-right py-2 px-4">{month.workDays}일</td>
                                  <td className="text-right py-2 px-4 text-gray-500">
                                    {month.workDays > 0
                                      ? (month.creators / month.workDays).toFixed(1)
                                      : '-'
                                    }/일
                                  </td>
                                </tr>
                                {/* 일별 상세 데이터 (펼침 시) */}
                                {isExpanded && monthDailyData.length > 0 && (
                                  <tr>
                                    <td colSpan={6} className="p-0">
                                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                        <div className="text-sm font-medium text-blue-700 mb-3">
                                          {month.month} 일별 상세 ({monthDailyData.length}일)
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="border-b border-blue-200">
                                                <th className="text-left py-1 px-3">날짜</th>
                                                <th className="text-right py-1 px-3">크리에이터</th>
                                                <th className="text-right py-1 px-3">DM</th>
                                                <th className="text-right py-1 px-3">메일수집</th>
                                                <th className="text-right py-1 px-3">KPI</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {monthDailyData.map(day => {
                                                const staff = staffSheets.find(s => s.id === staffDetail.staffInfo.id)
                                                const kpi = staff?.kpi || { creators: 30, dm: 20, emails: 10 }
                                                const creatorsRate = Math.round((day.creators / kpi.creators) * 100)
                                                const dmRate = Math.round((day.dm / kpi.dm) * 100)
                                                const emailsRate = Math.round((day.emails / kpi.emails) * 100)
                                                const allMet = creatorsRate >= 100 && dmRate >= 100 && emailsRate >= 100

                                                return (
                                                  <tr key={day.date} className="border-b border-blue-100 hover:bg-blue-100">
                                                    <td className="py-1 px-3 font-medium">{day.date.slice(5)}</td>
                                                    <td className={`text-right py-1 px-3 ${creatorsRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                                      {day.creators} <span className="text-xs text-gray-400">({creatorsRate}%)</span>
                                                    </td>
                                                    <td className={`text-right py-1 px-3 ${dmRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                                      {day.dm} <span className="text-xs text-gray-400">({dmRate}%)</span>
                                                    </td>
                                                    <td className={`text-right py-1 px-3 ${emailsRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                                      {day.emails} <span className="text-xs text-gray-400">({emailsRate}%)</span>
                                                    </td>
                                                    <td className="text-right py-1 px-3">
                                                      {allMet ? (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">달성</Badge>
                                                      ) : (
                                                        <Badge variant="destructive" className="text-xs">미달</Badge>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            )
                          })}
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 시트별 결과 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      시트별 결과
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {staffDetail.sheetResults.map((sheet, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{sheet.sheetName}</h4>
                            {sheet.error ? (
                              <Badge variant="destructive">오류</Badge>
                            ) : (
                              <Badge variant="outline">정상</Badge>
                            )}
                          </div>
                          {sheet.error ? (
                            <p className="text-sm text-red-600">{sheet.error}</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">크리에이터:</span>{' '}
                                <span className="font-medium">{sheet.stats.totals.creators}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">DM:</span>{' '}
                                <span className="font-medium">{sheet.stats.totals.dm}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">메일:</span>{' '}
                                <span className="font-medium">{sheet.stats.totals.emails}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* 담당자 설정 탭 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>담당자 및 시트 설정</CardTitle>
                    <CardDescription>
                      각 담당자가 사용하는 구글 시트를 등록하세요. 1명이 여러 시트를 사용하면 합산 계산됩니다.
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingStaff(null)
                    setNewStaff({ name: '', sheets: [] })
                    setShowAddStaffModal(true)
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    담당자 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {staffSheets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>등록된 담당자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffSheets.map(staff => (
                      <div key={staff.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium">{staff.name}</h3>
                              <p className="text-sm text-gray-500">{staff.sheets.length}개 시트</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(staff)}
                            >
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStaff(staff.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* KPI 정보 */}
                        {staff.kpi && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 p-2 bg-blue-50 rounded">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span>KPI: 크리에이터 {staff.kpi.creators}/일</span>
                            <span>DM {staff.kpi.dm}/일</span>
                            <span>메일 {staff.kpi.emails}/일</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {staff.sheets.map(sheet => {
                            const country = COUNTRIES.find(c => c.code === sheet.country)
                            return (
                              <div key={sheet.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                {country && <span>{country.flag}</span>}
                                <span className="font-medium">{sheet.name || '이름 없음'}</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500 truncate max-w-xs">{sheet.url}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 담당자 추가/수정 모달 */}
      <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? '담당자 수정' : '담당자 추가'}
            </DialogTitle>
            <DialogDescription>
              담당자 이름과 구글 시트 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 담당자 이름 */}
            <div>
              <Label htmlFor="staffName">담당자 이름 *</Label>
              <Input
                id="staffName"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>

            {/* KPI 설정 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-600" />
                일일 KPI 설정
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-blue-700">크리에이터 목표</Label>
                  <Input
                    type="number"
                    value={newStaff.kpi?.creators || 30}
                    onChange={(e) => setNewStaff({
                      ...newStaff,
                      kpi: { ...newStaff.kpi, creators: parseInt(e.target.value) || 0 }
                    })}
                    className="h-9"
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-700">DM 목표</Label>
                  <Input
                    type="number"
                    value={newStaff.kpi?.dm || 20}
                    onChange={(e) => setNewStaff({
                      ...newStaff,
                      kpi: { ...newStaff.kpi, dm: parseInt(e.target.value) || 0 }
                    })}
                    className="h-9"
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-700">메일수집 목표</Label>
                  <Input
                    type="number"
                    value={newStaff.kpi?.emails || 10}
                    onChange={(e) => setNewStaff({
                      ...newStaff,
                      kpi: { ...newStaff.kpi, emails: parseInt(e.target.value) || 0 }
                    })}
                    className="h-9"
                    placeholder="10"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                KPI 미달 시 빨간색으로 표시됩니다.
              </p>
            </div>

            {/* 시트 목록 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>구글 시트</Label>
                <Button size="sm" variant="outline" onClick={addSheet}>
                  <Plus className="w-4 h-4 mr-1" />
                  시트 추가
                </Button>
              </div>

              {newStaff.sheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">시트를 추가해주세요</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {newStaff.sheets.map((sheet, index) => (
                    <div key={sheet.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">시트 #{index + 1}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSheet(sheet.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">시트 이름</Label>
                            <Input
                              value={sheet.name}
                              onChange={(e) => updateSheet(sheet.id, 'name', e.target.value)}
                              placeholder="일본 시트"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">시트 탭 (gid)</Label>
                            <Input
                              value={sheet.sheetTab}
                              onChange={(e) => updateSheet(sheet.id, 'sheetTab', e.target.value)}
                              placeholder="0"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">국가 (모집 대상)</Label>
                            <Select
                              value={sheet.country || 'KR'}
                              onValueChange={(value) => updateSheet(sheet.id, 'country', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="국가 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES.map(country => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.flag} {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">구글 시트 URL</Label>
                          <Input
                            value={sheet.url}
                            onChange={(e) => updateSheet(sheet.id, 'url', e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="h-9"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">날짜 컬럼</Label>
                            <Input
                              value={(sheet.columnConfig && sheet.columnConfig.dateColumn) || 'B'}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase()
                                updateSheetColumn(sheet.id, 'dateColumn', val)
                              }}
                              placeholder="B"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">크리에이터 컬럼</Label>
                            <Input
                              value={(sheet.columnConfig && sheet.columnConfig.creatorColumn) || 'D'}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase()
                                updateSheetColumn(sheet.id, 'creatorColumn', val)
                              }}
                              placeholder="D"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">DM 컬럼</Label>
                            <Input
                              value={(sheet.columnConfig && sheet.columnConfig.dmColumn) || 'I'}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase()
                                updateSheetColumn(sheet.id, 'dmColumn', val)
                              }}
                              placeholder="I"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">이메일 컬럼</Label>
                            <Input
                              value={(sheet.columnConfig && sheet.columnConfig.emailColumn) || 'H'}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase()
                                updateSheetColumn(sheet.id, 'emailColumn', val)
                              }}
                              placeholder="H"
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStaffModal(false)}>
              취소
            </Button>
            <Button onClick={handleAddStaff} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingStaff ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
