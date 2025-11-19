import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Alert, AlertDescription } from '../ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { 
  Star, Plus, Edit, Trash2, Loader2, Mail, Send,
  TrendingUp, Users, Award, DollarSign, Sparkles, CheckCircle2
} from 'lucide-react'
import AdminNavigation from './AdminNavigation'
import { supabaseBiz } from '../../lib/supabaseClients'

export default function FeaturedCreatorManagementPageNew() {
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    platform: 'youtube',
    channel_name: '',
    channel_url: '',
    profile_image: '',
    video_urls: '', // 최근 영상 10개 URL (줄바꿈으로 구분)
    regions: [],
    basic_price: '',
    standard_price: '',
    premium_price: '',
    monthly_price: ''
  })
  
  const [capiResult, setCapiResult] = useState(null)
  const [regionFilter, setRegionFilter] = useState('all')
  
  const [featuredCreators, setFeaturedCreators] = useState([])
  const [loading, setLoading] = useState(true)

  // 리포트 발송 모달
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [reportEmail, setReportEmail] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [sendingReport, setSendingReport] = useState(false)

  useEffect(() => {
    loadFeaturedCreators()
  }, [])

  const loadFeaturedCreators = async () => {
    try {
      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .select('*')
        .order('capi_score', { ascending: false, nullsLast: true })

      if (error) throw error
      setFeaturedCreators(data || [])
    } catch (err) {
      console.error('Error loading featured creators:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePlatformChange = (value) => {
    setFormData(prev => ({ ...prev, platform: value }))
  }

  const handleRegionToggle = (region) => {
    setFormData(prev => {
      const regions = prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
      return { ...prev, regions }
    })
  }

  const getRegionName = (code) => {
    const names = { japan: '일본', us: '미국', taiwan: '대만', korea: '한국' }
    return names[code]
  }

  const getRegionFlag = (code) => {
    const flags = { japan: '🇯🇵', us: '🇺🇸', taiwan: '🇹🇼', korea: '🇰🇷' }
    return flags[code]
  }

  const getGradeColor = (grade) => {
    const colors = {
      'S': 'bg-purple-100 text-purple-800 border-purple-300',
      'A': 'bg-blue-100 text-blue-800 border-blue-300',
      'B': 'bg-green-100 text-green-800 border-green-300',
      'C': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'D': 'bg-orange-100 text-orange-800 border-orange-300',
      'F': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[grade] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const handleGenerateCapiProfile = async () => {
    if (!formData.channel_url) {
      alert('채널 URL을 입력해주세요.')
      return
    }

    if (!formData.video_urls.trim()) {
      alert('분석할 영상 URL을 최소 1개 이상 입력해주세요.')
      return
    }

    setAnalyzing(true)

    try {
      const videoUrls = formData.video_urls.split('\n').filter(url => url.trim())

      // Call CAPI generation API
      const response = await fetch('/.netlify/functions/generate-capi-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl: formData.channel_url,
          platform: formData.platform,
          videoUrls: videoUrls
        })
      })

      if (!response.ok) {
        throw new Error('CAPI 분석 실패')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'CAPI 분석 실패')
      }

      setCapiResult(result.analysis)
      alert('CAPI 분석이 완료되었습니다!')

    } catch (err) {
      console.error('Error generating CAPI profile:', err)
      alert('CAPI 분석 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const calculateCapiGrade = (score) => {
    if (score >= 90) return 'S'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const handleSave = async () => {
    if (!capiResult) {
      alert('먼저 CAPI 분석을 진행해주세요.')
      return
    }

    if (formData.regions.length === 0) {
      alert('최소 1개 이상의 활동 지역을 선택해주세요.')
      return
    }

    if (!formData.basic_price || !formData.standard_price || !formData.premium_price || !formData.monthly_price) {
      alert('모든 패키지 가격을 입력해주세요.')
      return
    }

    try {
      const contentScore = capiResult.total_content_score || 0
      const activityScore = 30 // Mock activity score (should be calculated from stats)
      const totalScore = contentScore + activityScore
      const grade = calculateCapiGrade(totalScore)

      const newCreator = {
        platform: formData.platform,
        channel_name: formData.channel_name,
        channel_url: formData.channel_url,
        profile_image: formData.profile_image,
        followers: 0, // Should be scraped
        avg_views: 0, // Should be scraped
        avg_likes: 0,
        avg_comments: 0,
        category: '',
        target_audience: '',
        content_style: '',
        regions: formData.regions,
        basic_price: parseInt(formData.basic_price.replace(/,/g, '')),
        standard_price: parseInt(formData.standard_price.replace(/,/g, '')),
        premium_price: parseInt(formData.premium_price.replace(/,/g, '')),
        monthly_price: parseInt(formData.monthly_price.replace(/,/g, '')),
        capi_score: totalScore,
        capi_grade: grade,
        capi_content_score: contentScore,
        capi_activity_score: activityScore,
        capi_analysis: capiResult,
        capi_generated_at: new Date().toISOString(),
        featured_type: 'capi',
        is_active: true
      }

      const { data, error } = await supabaseBiz
        .from('featured_creators')
        .insert([newCreator])
        .select()

      if (error) throw error

      alert('크리에이터가 저장되었습니다!')
      await loadFeaturedCreators()
      setShowForm(false)
      setFormData({
        platform: 'youtube',
        channel_name: '',
        channel_url: '',
        profile_image: '',
        video_urls: '',
        regions: [],
        basic_price: '',
        standard_price: '',
        premium_price: '',
        monthly_price: ''
      })
      setCapiResult(null)
    } catch (err) {
      console.error('Error saving creator:', err)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 이 크리에이터를 삭제하시겠습니까?')) {
      return
    }

    try {
      const { error } = await supabaseBiz
        .from('featured_creators')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('크리에이터가 삭제되었습니다.')
      setFeaturedCreators(featuredCreators.filter(c => c.id !== id))
    } catch (err) {
      console.error('삭제 실패:', err)
      alert('삭제 처리 중 오류가 발생했습니다.')
    }
  }

  const handleOpenReportModal = (creator) => {
    setSelectedCreator(creator)
    setReportEmail('') // Should load from user_profiles
    setCustomMessage('')
    setShowReportModal(true)
  }

  const handleSendReport = async () => {
    if (!reportEmail.trim()) {
      alert('이메일 주소를 입력해주세요.')
      return
    }

    setSendingReport(true)

    try {
      const response = await fetch('/.netlify/functions/send-growth-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator.id,
          creatorEmail: reportEmail,
          creatorName: selectedCreator.channel_name,
          channelName: selectedCreator.channel_name,
          platform: selectedCreator.platform,
          capiScore: selectedCreator.capi_score,
          capiGrade: selectedCreator.capi_grade,
          capiAnalysis: selectedCreator.capi_analysis,
          sentBy: null, // Should get from auth
          customMessage: customMessage
        })
      })

      if (!response.ok) {
        throw new Error('리포트 발송 실패')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '리포트 발송 실패')
      }

      alert('성장 가이드 리포트가 발송되었습니다!')
      setShowReportModal(false)

    } catch (err) {
      console.error('Error sending report:', err)
      alert('리포트 발송 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setSendingReport(false)
    }
  }

  const filteredCreators = regionFilter === 'all' 
    ? featuredCreators 
    : featuredCreators.filter(c => c.regions?.includes(regionFilter))

  return (
    <>
      <AdminNavigation />
      <div className="min-h-screen bg-gray-50 lg:ml-64">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500" />
                  추천 크리에이터 관리 (CAPI)
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  AI 기반 CAPI 분석으로 크리에이터를 평가하고 관리합니다
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  관리자 대시보드
                </Button>
                {!showForm && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    CAPI 프로필 생성
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {showForm ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Input Form */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      CAPI 프로필 생성
                    </CardTitle>
                    <CardDescription>
                      채널 정보와 영상 URL을 입력하여 AI 분석을 시작하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>플랫폼 *</Label>
                      <Select value={formData.platform} onValueChange={handlePlatformChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>채널/계정명 *</Label>
                      <Input
                        name="channel_name"
                        value={formData.channel_name}
                        onChange={handleInputChange}
                        placeholder="뷰티유튜버김지수"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>채널 URL *</Label>
                      <Input
                        name="channel_url"
                        value={formData.channel_url}
                        onChange={handleInputChange}
                        placeholder="https://youtube.com/@channel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>프로필 이미지 URL</Label>
                      <Input
                        name="profile_image"
                        value={formData.profile_image}
                        onChange={handleInputChange}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>분석할 영상 URL (최근 10개 권장) *</Label>
                      <Textarea
                        name="video_urls"
                        value={formData.video_urls}
                        onChange={handleInputChange}
                        placeholder="https://youtube.com/watch?v=..."
                        rows={6}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        각 URL을 줄바꿈으로 구분하여 입력하세요
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>활동 지역 (다중 선택) *</Label>
                      <div className="flex flex-wrap gap-2">
                        {['korea', 'japan', 'us', 'taiwan'].map(region => (
                          <Button
                            key={region}
                            type="button"
                            variant={formData.regions.includes(region) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRegionToggle(region)}
                          >
                            {getRegionFlag(region)} {getRegionName(region)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>가격 설정</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">기본 패키지</Label>
                          <Input
                            name="basic_price"
                            value={formData.basic_price}
                            onChange={handleInputChange}
                            placeholder="2,000,000"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">스탠다드 패키지</Label>
                          <Input
                            name="standard_price"
                            value={formData.standard_price}
                            onChange={handleInputChange}
                            placeholder="3,000,000"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">프리미엄 패키지</Label>
                          <Input
                            name="premium_price"
                            value={formData.premium_price}
                            onChange={handleInputChange}
                            placeholder="5,000,000"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">월간 패키지</Label>
                          <Input
                            name="monthly_price"
                            value={formData.monthly_price}
                            onChange={handleInputChange}
                            placeholder="10,000,000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleGenerateCapiProfile}
                        disabled={analyzing}
                        className="flex-1"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            CAPI 분석 중...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            CAPI 분석 시작
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowForm(false)
                          setCapiResult(null)
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: CAPI Result */}
              <div>
                {capiResult ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        CAPI 분석 결과
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-purple-600 mb-2">
                            {capiResult.total_content_score + 30}점
                          </div>
                          <div className="text-2xl font-bold text-gray-700">
                            {calculateCapiGrade(capiResult.total_content_score + 30)}급
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <div className="flex justify-between text-sm">
                            <span>콘텐츠 제작 역량</span>
                            <span className="font-bold">{capiResult.total_content_score}/70점</span>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span>계정 활성도</span>
                            <span className="font-bold">30/30점</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">💪 강점</h4>
                        {capiResult.strengths?.slice(0, 3).map((strength, i) => (
                          <div key={i} className="bg-green-50 border border-green-200 rounded p-3 mb-2">
                            <div className="font-medium text-sm">{strength.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{strength.description}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">🎯 개선 포인트</h4>
                        {capiResult.weaknesses?.slice(0, 2).map((weakness, i) => (
                          <div key={i} className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
                            <div className="font-medium text-sm">{weakness.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{weakness.current}</div>
                          </div>
                        ))}
                      </div>

                      <Button onClick={handleSave} className="w-full" size="lg">
                        저장하기
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>CAPI 분석을 시작하면 결과가 여기에 표시됩니다</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Filter */}
              <div className="mb-6 flex gap-2">
                <Button
                  variant={regionFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRegionFilter('all')}
                >
                  전체
                </Button>
                {['korea', 'japan', 'us', 'taiwan'].map(region => (
                  <Button
                    key={region}
                    variant={regionFilter === region ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegionFilter(region)}
                  >
                    {getRegionFlag(region)} {getRegionName(region)}
                  </Button>
                ))}
              </div>

              {/* Creators List */}
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
              ) : filteredCreators.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    등록된 크리에이터가 없습니다
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCreators.map(creator => (
                    <Card key={creator.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold">{creator.channel_name}</h3>
                              {creator.capi_grade && (
                                <Badge className={getGradeColor(creator.capi_grade)}>
                                  {creator.capi_grade}급 {creator.capi_score}점
                                </Badge>
                              )}
                              <Badge variant="outline">{creator.platform}</Badge>
                            </div>
                            <div className="flex gap-2 mb-3">
                              {creator.regions?.map(region => (
                                <span key={region} className="text-sm">
                                  {getRegionFlag(region)} {getRegionName(region)}
                                </span>
                              ))}
                            </div>
                            {creator.capi_analysis && (
                              <div className="text-sm text-gray-600 mb-3">
                                <div className="flex gap-4">
                                  <span>콘텐츠: {creator.capi_content_score}/70</span>
                                  <span>활성도: {creator.capi_activity_score}/30</span>
                                </div>
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              기본: {creator.basic_price?.toLocaleString()}원 • 
                              스탠다드: {creator.standard_price?.toLocaleString()}원 • 
                              프리미엄: {creator.premium_price?.toLocaleString()}원
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {creator.capi_analysis && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenReportModal(creator)}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                리포트 발송
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(creator.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Report Sending Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>성장 가이드 리포트 발송</DialogTitle>
            <DialogDescription>
              크리에이터에게 CAPI 분석 결과와 성장 가이드를 이메일로 발송합니다
            </DialogDescription>
          </DialogHeader>
          
          {selectedCreator && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">{selectedCreator.channel_name}</div>
                <div className="flex items-center gap-2">
                  <Badge className={getGradeColor(selectedCreator.capi_grade)}>
                    {selectedCreator.capi_grade}급 {selectedCreator.capi_score}점
                  </Badge>
                  <Badge variant="outline">{selectedCreator.platform}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>수신 이메일 *</Label>
                <Input
                  type="email"
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  placeholder="creator@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>담당자 메시지 (선택)</Label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="안녕하세요! CNEC에서 채널 분석 결과를 보내드립니다..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportModal(false)}>
              취소
            </Button>
            <Button onClick={handleSendReport} disabled={sendingReport}>
              {sendingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  리포트 발송
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
