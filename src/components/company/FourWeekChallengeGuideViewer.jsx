import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseKorea'
import { Button } from '../ui/button'
import { ArrowLeft, Calendar, Edit, Save, X, Plus, Trash2 } from 'lucide-react'
import CompanyNavigation from './CompanyNavigation'

export default function FourWeekChallengeGuideViewer() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingWeek, setEditingWeek] = useState(null)
  const [editData, setEditData] = useState(null) // 구조화된 편집 데이터
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
    navigate(`/company/campaigns/${id}/invoice/4week`)
  }

  // 가이드 데이터를 정규화하는 헬퍼 함수
  const normalizeGuideData = (guideData) => {
    if (!guideData) {
      return {
        mission: '',
        required_dialogues: [],
        required_scenes: [],
        hashtags: [],
        cautions: '',
        product_info: '',
        reference_urls: []
      }
    }

    // 문자열인 경우 (이전 버전 호환)
    if (typeof guideData === 'string') {
      return {
        mission: guideData,
        required_dialogues: [],
        required_scenes: [],
        hashtags: [],
        cautions: '',
        product_info: '',
        reference_urls: []
      }
    }

    // 객체인 경우 정규화
    return {
      mission: guideData.mission || '',
      required_dialogues: Array.isArray(guideData.required_dialogues)
        ? guideData.required_dialogues
        : (guideData.required_dialogue ? guideData.required_dialogue.split('\n').filter(d => d.trim()) : []),
      required_scenes: Array.isArray(guideData.required_scenes)
        ? guideData.required_scenes
        : [],
      hashtags: Array.isArray(guideData.hashtags) ? guideData.hashtags : [],
      cautions: guideData.cautions || '',
      product_info: guideData.product_info || '',
      reference_urls: Array.isArray(guideData.reference_urls)
        ? guideData.reference_urls
        : (guideData.reference ? [guideData.reference] : [])
    }
  }

  const handleEdit = (week) => {
    setEditingWeek(week)
    const weekKey = `week${week}`
    const rawData = campaign.challenge_weekly_guides_ai?.[weekKey] ||
                    campaign.challenge_weekly_guides?.[weekKey] ||
                    campaign.challenge_guide_data?.[weekKey]
    setEditData(normalizeGuideData(rawData))
  }

  const handleSave = async () => {
    if (!editData.mission.trim()) {
      alert('미션 내용을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      const weekKey = `week${editingWeek}`

      // 기존 가이드 데이터 가져오기
      const existingGuides = campaign.challenge_weekly_guides_ai || {}

      // 수정된 데이터로 업데이트
      const updatedGuides = {
        ...existingGuides,
        [weekKey]: {
          mission: editData.mission.trim(),
          required_dialogues: editData.required_dialogues.filter(d => d.trim()),
          required_scenes: editData.required_scenes.filter(s => s.trim()),
          hashtags: editData.hashtags.filter(h => h.trim()),
          cautions: editData.cautions.trim(),
          product_info: editData.product_info.trim(),
          reference_urls: editData.reference_urls.filter(u => u.trim())
        }
      }

      const { error } = await supabase
        .from('campaigns')
        .update({ challenge_weekly_guides_ai: updatedGuides })
        .eq('id', id)

      if (error) throw error

      setCampaign({ ...campaign, challenge_weekly_guides_ai: updatedGuides })
      setEditingWeek(null)
      setEditData(null)
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
    setEditData(null)
  }

  // 배열 항목 추가/수정/삭제 헬퍼
  const addArrayItem = (field) => {
    setEditData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const updateArrayItem = (field, index, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const removeArrayItem = (field, index) => {
    setEditData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
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
              <span className="font-semibold w-32">모집 마감일:</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {campaign.application_deadline ? new Date(campaign.application_deadline).toLocaleDateString('ko-KR') : '미정'}
                </span>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-semibold w-32">주차별 마감일:</span>
              <div className="space-y-1">
                {campaign.week1_deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-600 font-medium">1주차:</span>
                    <span>{new Date(campaign.week1_deadline).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                {campaign.week2_deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-600 font-medium">2주차:</span>
                    <span>{new Date(campaign.week2_deadline).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                {campaign.week3_deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-600 font-medium">3주차:</span>
                    <span>{new Date(campaign.week3_deadline).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                {campaign.week4_deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-pink-600 font-medium">4주차:</span>
                    <span>{new Date(campaign.week4_deadline).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                {!campaign.week1_deadline && (
                  <span className="text-gray-400 italic">주차별 마감일이 설정되지 않았습니다.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 주차별 가이드 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📅 주차별 미션 가이드</h2>

          {[1, 2, 3, 4].map((week) => {
            const weekKey = `week${week}`
            const guideAI = campaign.challenge_weekly_guides_ai?.[weekKey]
            const guideOld = campaign.challenge_weekly_guides?.[weekKey]
            const guideData = campaign.challenge_guide_data?.[weekKey]
            const hasGuide = guideAI || guideOld || guideData
            const isEditing = editingWeek === week

            // 보기 모드용 정규화된 데이터
            const normalizedView = normalizeGuideData(guideAI || guideOld || guideData)

            return (
              <div key={week} className="mb-6 last:mb-0 border-b pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-pink-600">{week}주차</h3>
                  {!isEditing && hasGuide && (
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

                {isEditing && editData ? (
                  <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                    {/* 미션 */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        🎯 미션 *
                      </label>
                      <textarea
                        value={editData.mission}
                        onChange={(e) => setEditData(prev => ({ ...prev, mission: e.target.value }))}
                        className="w-full p-3 border rounded-lg min-h-[80px]"
                        placeholder="이번 주차 미션을 입력하세요..."
                      />
                    </div>

                    {/* 제품 정보 */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        📦 제품 정보
                      </label>
                      <textarea
                        value={editData.product_info}
                        onChange={(e) => setEditData(prev => ({ ...prev, product_info: e.target.value }))}
                        className="w-full p-3 border rounded-lg min-h-[60px]"
                        placeholder="제품 정보를 입력하세요..."
                      />
                    </div>

                    {/* 필수 대사 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-gray-700">💬 필수 대사</label>
                        <button
                          type="button"
                          onClick={() => addArrayItem('required_dialogues')}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 추가
                        </button>
                      </div>
                      {editData.required_dialogues.map((dialogue, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={dialogue}
                            onChange={(e) => updateArrayItem('required_dialogues', idx, e.target.value)}
                            className="flex-1 p-2 border rounded-lg text-sm"
                            placeholder={`필수 대사 ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayItem('required_dialogues', idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {editData.required_dialogues.length === 0 && (
                        <p className="text-sm text-gray-400 italic">필수 대사를 추가해주세요.</p>
                      )}
                    </div>

                    {/* 필수 장면 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-gray-700">🎥 필수 촬영 장면</label>
                        <button
                          type="button"
                          onClick={() => addArrayItem('required_scenes')}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 추가
                        </button>
                      </div>
                      {editData.required_scenes.map((scene, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={scene}
                            onChange={(e) => updateArrayItem('required_scenes', idx, e.target.value)}
                            className="flex-1 p-2 border rounded-lg text-sm"
                            placeholder={`필수 장면 ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayItem('required_scenes', idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {editData.required_scenes.length === 0 && (
                        <p className="text-sm text-gray-400 italic">필수 장면을 추가해주세요.</p>
                      )}
                    </div>

                    {/* 해시태그 */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-gray-700">#️⃣ 해시태그</label>
                        <button
                          type="button"
                          onClick={() => addArrayItem('hashtags')}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 추가
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editData.hashtags.map((tag, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-white border rounded-full px-3 py-1">
                            <span className="text-gray-500">#</span>
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) => updateArrayItem('hashtags', idx, e.target.value)}
                              className="w-24 text-sm border-none focus:outline-none"
                              placeholder="태그"
                            />
                            <button
                              type="button"
                              onClick={() => removeArrayItem('hashtags', idx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 주의사항 */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        ⚠️ 주의사항
                      </label>
                      <textarea
                        value={editData.cautions}
                        onChange={(e) => setEditData(prev => ({ ...prev, cautions: e.target.value }))}
                        className="w-full p-3 border rounded-lg min-h-[60px]"
                        placeholder="주의사항을 입력하세요..."
                      />
                    </div>

                    {/* 참고 URL */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-gray-700">🔗 참고 영상 URL</label>
                        <button
                          type="button"
                          onClick={() => addArrayItem('reference_urls')}
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> 추가
                        </button>
                      </div>
                      {editData.reference_urls.map((url, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) => updateArrayItem('reference_urls', idx, e.target.value)}
                            className="flex-1 p-2 border rounded-lg text-sm"
                            placeholder="https://..."
                          />
                          <button
                            type="button"
                            onClick={() => removeArrayItem('reference_urls', idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 저장/취소 버튼 */}
                    <div className="flex gap-2 pt-2 border-t">
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
                    {hasGuide ? (
                      <div className="space-y-3">
                        {/* 미션 */}
                        {normalizedView.mission && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">🎯 미션:</span>
                            <p className="mt-1 whitespace-pre-wrap">{normalizedView.mission}</p>
                          </div>
                        )}

                        {/* 제품 정보 */}
                        {normalizedView.product_info && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">📦 제품 정보:</span>
                            <p className="mt-1 whitespace-pre-wrap">{normalizedView.product_info}</p>
                          </div>
                        )}

                        {/* 필수 대사 */}
                        {normalizedView.required_dialogues.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">💬 필수 대사:</span>
                            <ul className="mt-1 list-disc list-inside space-y-1">
                              {normalizedView.required_dialogues.map((d, i) => (
                                <li key={i} className="text-gray-700">{d}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 필수 장면 */}
                        {normalizedView.required_scenes.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">🎥 필수 촬영 장면:</span>
                            <ul className="mt-1 list-disc list-inside space-y-1">
                              {normalizedView.required_scenes.map((s, i) => (
                                <li key={i} className="text-gray-700">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 해시태그 */}
                        {normalizedView.hashtags.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">#️⃣ 해시태그:</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {normalizedView.hashtags.map((tag, i) => (
                                <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 주의사항 */}
                        {normalizedView.cautions && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">⚠️ 주의사항:</span>
                            <p className="mt-1 whitespace-pre-wrap text-orange-700">{normalizedView.cautions}</p>
                          </div>
                        )}

                        {/* 참고 URL */}
                        {normalizedView.reference_urls.length > 0 && (
                          <div>
                            <span className="text-sm font-semibold text-gray-600">🔗 참고 영상:</span>
                            <div className="mt-1 space-y-1">
                              {normalizedView.reference_urls.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-blue-600 hover:underline truncate"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
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
