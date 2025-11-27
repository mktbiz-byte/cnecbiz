import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { ArrowLeft, Calendar, Edit, Save, X } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function FourWeekChallengeGuideViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingWeek, setEditingWeek] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCampaign(data)
    } catch (error) {
      console.error('Error loading campaign:', error)
      alert('캠페인을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToPayment = () => {
    navigate(`/company/campaigns/${id}/invoice/4week-challenge`)
  }

  const handleEdit = (week) => {
    setEditingWeek(week)
    const fieldName = `week${week}_guide_ai`
    setEditValue(campaign[fieldName] || '')
  }

  const handleSave = async () => {
    if (!editValue.trim()) {
      alert('내용을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const fieldName = `week${editingWeek}_guide_ai`
      const { error } = await supabase
        .from('campaigns')
        .update({ [fieldName]: editValue.trim() })
        .eq('id', id)

      if (error) throw error

      setCampaign({ ...campaign, [fieldName]: editValue.trim() })
      setEditingWeek(null)
      setEditValue('')
      alert('저장되었습니다.')
    } catch (error) {
      console.error('Error saving:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingWeek(null)
    setEditValue('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CompanyNavigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CompanyNavigation />
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">캠페인을 찾을 수 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyNavigation />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/company/campaigns')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            캠페인 목록으로
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">✨ AI 캠페인 지원 가이드</h1>
          <p className="text-gray-600">생성된 가이드를 확인하고 결제를 진행하세요.</p>
        </div>

        {/* 캠페인 기본 정보 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 캠페인 정보</h2>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="font-semibold w-32">캠페인명:</span>
              <span>{campaign.title}</span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold w-32">제품명:</span>
              <span>{campaign.product_name || '미입력'}</span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold w-32">모집 인원:</span>
              <span>{campaign.total_slots || 0}명</span>
            </div>
            <div className="flex items-start">
              <span className="font-semibold w-32">캠페인 기간:</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {campaign.start_date && new Date(campaign.start_date).toLocaleDateString('ko-KR')} ~ {campaign.end_date && new Date(campaign.end_date).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 주차별 가이드 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📅 주차별 미션 가이드</h2>
          
          {[1, 2, 3, 4].map((week) => {
            const guideAI = campaign[`week${week}_guide_ai`]
            const isEditing = editingWeek === week
            
            return (
              <div key={week} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-pink-600">{week}주차</h3>
                  {!isEditing && guideAI && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(week)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                  )}
                </div>
                
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-3 border rounded-lg min-h-[150px]"
                      placeholder="가이드 내용을 입력하세요..."
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? '저장 중...' : '저장'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={saving}
                        size="sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {guideAI ? (
                      <p className="whitespace-pre-wrap">{guideAI}</p>
                    ) : (
                      <p className="text-gray-400 italic">미정</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 주의사항 */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            ⚠️ 주의사항
          </h2>
          <div className="space-y-3 text-sm">
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-pink-600 mb-2">🎯 4주 챌린지의 목적</p>
              <p className="text-gray-700">
                이 캠페인은 <strong>4주간 제품 사용 후 변화된 모습</strong>을 보여주는 것이 핵심입니다. 
                매주 정해진 미션에 맞춰 촬영하여 <strong>Before & After</strong>를 명확하게 전달해주세요.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-pink-600 mb-2">📅 스케줄 준수 필수</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>매주 정해진 날짜에 콘텐츠를 업로드해야 합니다</li>
                <li>스케줄 미준수 시 리워드 지급이 불가할 수 있습니다</li>
                <li>부득이한 사정이 있을 경우 사전에 관리자에게 연락해주세요</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-4">
              <p className="font-semibold text-pink-600 mb-2">📸 촬영 가이드</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>각 주차별 미션에 맞는 내용을 촬영해주세요</li>
                <li>동일한 조명과 각도에서 촬영하면 변화가 더 명확합니다</li>
                <li>진정성 있는 후기가 가장 중요합니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 결제 진행 버튼 */}
        <div className="flex justify-center">
          <Button
            onClick={handleProceedToPayment}
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-12"
          >
            결제 진행하기
          </Button>
        </div>
      </div>
    </div>
  )
}
