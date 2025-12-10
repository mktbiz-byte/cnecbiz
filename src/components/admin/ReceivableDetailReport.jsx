import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, Save, Plus, Trash2, ExternalLink, 
  DollarSign, TrendingUp, CheckCircle, Clock, FileText 
} from 'lucide-react'
import { supabaseBiz } from '../../lib/supabaseClients'
import AdminNavigation from './AdminNavigation'
import CreatePublicReportModal from './CreatePublicReportModal'

export default function ReceivableDetailReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  
  // 미수금 기본 정보
  const [financialRecord, setFinancialRecord] = useState(null)
  
  // 상세 정보
  const [detail, setDetail] = useState({
    company_name: '',
    campaign_name: '',
    total_amount: 0,
    price_200k: 0,
    price_300k: 0,
    price_400k: 0,
    price_600k: 0,
    price_700k: 0,
    completed_200k: 0,
    completed_300k: 0,
    completed_400k: 0,
    completed_600k: 0,
    completed_700k: 0,
    videos_200k: [],
    videos_300k: [],
    videos_400k: [],
    videos_600k: [],
    videos_700k: [],
    notes: ''
  })

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [id])

  const checkAuth = async () => {
    if (!supabaseBiz) {
      navigate('/login')
      return
    }

    const { data: { user } } = await supabaseBiz.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    const { data: adminData } = await supabaseBiz
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (!adminData) {
      navigate('/login')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // financial_records에서 미수금 정보 가져오기
      const { data: recordData, error: recordError } = await supabaseBiz
        .from('financial_records')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      
      if (recordError) throw recordError
      setFinancialRecord(recordData)
      
      // receivable_details에서 상세 정보 가져오기
      const { data: detailData, error: detailError } = await supabaseBiz
        .from('receivable_details')
        .select('*')
        .eq('financial_record_id', id)
        .maybeSingle()
      
      if (detailData) {
        setDetail({
          ...detailData,
          videos_200k: detailData.videos_200k || [],
          videos_300k: detailData.videos_300k || [],
          videos_400k: detailData.videos_400k || [],
          videos_600k: detailData.videos_600k || [],
          videos_700k: detailData.videos_700k || []
        })
      } else {
        // 상세 정보가 없으면 기본값으로 초기화
        setDetail(prev => ({
          ...prev,
          company_name: recordData.description || '',
          total_amount: recordData.amount || 0
        }))
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error)
      alert('데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // receivable_details에 저장 또는 업데이트
      const { data: existingDetail } = await supabaseBiz
        .from('receivable_details')
        .select('id')
        .eq('financial_record_id', id)
        .maybeSingle()
      
      const saveData = {
        financial_record_id: id,
        company_name: detail.company_name,
        campaign_name: detail.campaign_name,
        total_amount: detail.total_amount,
        price_200k: parseInt(detail.price_200k) || 0,
        price_300k: parseInt(detail.price_300k) || 0,
        price_400k: parseInt(detail.price_400k) || 0,
        price_600k: parseInt(detail.price_600k) || 0,
        price_700k: parseInt(detail.price_700k) || 0,
        completed_200k: parseInt(detail.completed_200k) || 0,
        completed_300k: parseInt(detail.completed_300k) || 0,
        completed_400k: parseInt(detail.completed_400k) || 0,
        completed_600k: parseInt(detail.completed_600k) || 0,
        completed_700k: parseInt(detail.completed_700k) || 0,
        videos_200k: detail.videos_200k,
        videos_300k: detail.videos_300k,
        videos_400k: detail.videos_400k,
        videos_600k: detail.videos_600k,
        videos_700k: detail.videos_700k,
        notes: detail.notes
      }
      
      if (existingDetail) {
        // 업데이트
        const { error } = await supabaseBiz
          .from('receivable_details')
          .update(saveData)
          .eq('id', existingDetail.id)
        
        if (error) throw error
      } else {
        // 새로 생성
        const { error } = await supabaseBiz
          .from('receivable_details')
          .insert([saveData])
        
        if (error) throw error
      }
      
      alert('저장되었습니다.')
      fetchData()
    } catch (error) {
      console.error('저장 오류:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 영상 링크 추가
  const addVideoLink = (priceType) => {
    const newVideo = {
      url: '',
      title: '',
      date: new Date().toISOString().split('T')[0]
    }
    
    setDetail(prev => ({
      ...prev,
      [`videos_${priceType}`]: [...prev[`videos_${priceType}`], newVideo]
    }))
  }

  // 영상 링크 삭제
  const removeVideoLink = (priceType, index) => {
    setDetail(prev => ({
      ...prev,
      [`videos_${priceType}`]: prev[`videos_${priceType}`].filter((_, i) => i !== index)
    }))
  }

  // 영상 링크 업데이트
  const updateVideoLink = (priceType, index, field, value) => {
    setDetail(prev => ({
      ...prev,
      [`videos_${priceType}`]: prev[`videos_${priceType}`].map((video, i) => 
        i === index ? { ...video, [field]: value } : video
      )
    }))
  }

  // 계산된 값
  const calculateStats = () => {
    const totalPlanned = 
      (parseInt(detail.price_200k) || 0) +
      (parseInt(detail.price_300k) || 0) +
      (parseInt(detail.price_400k) || 0) +
      (parseInt(detail.price_600k) || 0) +
      (parseInt(detail.price_700k) || 0)
    
    const totalCompleted = 
      (parseInt(detail.completed_200k) || 0) +
      (parseInt(detail.completed_300k) || 0) +
      (parseInt(detail.completed_400k) || 0) +
      (parseInt(detail.completed_600k) || 0) +
      (parseInt(detail.completed_700k) || 0)
    
    const completedAmount = 
      (parseInt(detail.completed_200k) || 0) * 200000 +
      (parseInt(detail.completed_300k) || 0) * 300000 +
      (parseInt(detail.completed_400k) || 0) * 400000 +
      (parseInt(detail.completed_600k) || 0) * 600000 +
      (parseInt(detail.completed_700k) || 0) * 700000
    
    const remainingAmount = 
      ((parseInt(detail.price_200k) || 0) - (parseInt(detail.completed_200k) || 0)) * 200000 +
      ((parseInt(detail.price_300k) || 0) - (parseInt(detail.completed_300k) || 0)) * 300000 +
      ((parseInt(detail.price_400k) || 0) - (parseInt(detail.completed_400k) || 0)) * 400000 +
      ((parseInt(detail.price_600k) || 0) - (parseInt(detail.completed_600k) || 0)) * 600000 +
      ((parseInt(detail.price_700k) || 0) - (parseInt(detail.completed_700k) || 0)) * 700000
    
    return {
      totalPlanned,
      totalCompleted,
      remainingCount: totalPlanned - totalCompleted,
      completedAmount,
      remainingAmount
    }
  }

  const stats = calculateStats()

  // 단가별 정보 배열
  const priceTypes = [
    { key: '200k', label: '20만원', price: 200000 },
    { key: '300k', label: '30만원', price: 300000 },
    { key: '400k', label: '40만원', price: 400000 },
    { key: '600k', label: '60만원', price: 600000 },
    { key: '700k', label: '70만원', price: 700000 }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/revenue-charts')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">미수금 상세 보고서</h1>
              <p className="text-sm text-gray-500 mt-1">
                {financialRecord?.month} - {financialRecord?.description}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              보고서 만들기
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 미수금</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₩{(detail.total_amount || 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">완료 금액</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₩{stats.completedAmount.toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">남은 금액</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ₩{stats.remainingAmount.toLocaleString()}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">진행률</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalPlanned > 0 
                      ? ((stats.totalCompleted / stats.totalPlanned) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.totalCompleted}/{stats.totalPlanned} 건
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 기본 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회사명
                </label>
                <Input
                  value={detail.company_name}
                  onChange={(e) => setDetail({ ...detail, company_name: e.target.value })}
                  placeholder="회사명 입력"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  캠페인명
                </label>
                <Input
                  value={detail.campaign_name}
                  onChange={(e) => setDetail({ ...detail, campaign_name: e.target.value })}
                  placeholder="캠페인명 입력"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 단가별 진행 현황 */}
        {priceTypes.map((priceType) => {
          const planned = parseInt(detail[`price_${priceType.key}`]) || 0
          const completed = parseInt(detail[`completed_${priceType.key}`]) || 0
          const remaining = planned - completed
          const videos = detail[`videos_${priceType.key}`] || []
          
          return (
            <Card key={priceType.key} className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{priceType.label} 단가</span>
                  <span className="text-sm font-normal text-gray-500">
                    완료: {completed}/{planned} 건 | 남은 건수: {remaining}건
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 건수 입력 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        예정 건수
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={detail[`price_${priceType.key}`]}
                        onChange={(e) => setDetail({ 
                          ...detail, 
                          [`price_${priceType.key}`]: e.target.value 
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        완료 건수
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={planned}
                        value={detail[`completed_${priceType.key}`]}
                        onChange={(e) => setDetail({ 
                          ...detail, 
                          [`completed_${priceType.key}`]: e.target.value 
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        완료 금액
                      </label>
                      <Input
                        value={`₩${(completed * priceType.price).toLocaleString()}`}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* 영상 링크 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        영상 링크 ({videos.length}개)
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addVideoLink(priceType.key)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        링크 추가
                      </Button>
                    </div>
                    
                    {videos.length > 0 && (
                      <div className="space-y-2">
                        {videos.map((video, index) => (
                          <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input
                                placeholder="영상 URL"
                                value={video.url}
                                onChange={(e) => updateVideoLink(priceType.key, index, 'url', e.target.value)}
                              />
                              <Input
                                placeholder="제목 (선택)"
                                value={video.title}
                                onChange={(e) => updateVideoLink(priceType.key, index, 'title', e.target.value)}
                              />
                              <Input
                                type="date"
                                value={video.date}
                                onChange={(e) => updateVideoLink(priceType.key, index, 'date', e.target.value)}
                              />
                            </div>
                            <div className="flex gap-1">
                              {video.url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(video.url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeVideoLink(priceType.key, index)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* 메모 */}
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={detail.notes}
              onChange={(e) => setDetail({ ...detail, notes: e.target.value })}
              placeholder="추가 메모를 입력하세요..."
            />
          </CardContent>
        </Card>
      </div>

      {/* 보고서 생성 모달 */}
      {showReportModal && (
        <CreatePublicReportModal
          receivableDetailId={detail.id}
          receivableDetail={detail}
          onClose={() => setShowReportModal(false)}
          onSuccess={(report) => {
            console.log('보고서 생성 성공:', report)
            setShowReportModal(false)
          }}
        />
      )}
    </div>
  )
}
